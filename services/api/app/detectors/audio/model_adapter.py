import os
from typing import Any, Dict, List, Optional
import numpy as np

from app.core.config import settings
from app.core.logging import logger
from app.detectors.base import BaseDetector, DetectorOutput
from app.schemas.common import DetectorStatus


class PretrainedAudioModelAdapter(BaseDetector):
    """
    Adapter for real pretrained synthetic speech and voice-clone detection models.

    Architecture Specification:
    ---------------------------
    - Model Family: AASIST (Audio Anti-Spoofing using Integrated Spectro-Temporal Graph Attention) / RawNet2
    - Source/Reference: Jung et al., 'AASIST: Audio Anti-Spoofing using Integrated Spectro-Temporal Graph Attention Networks'
      (Interspeech 2022 / ASVspoof 2021 Benchmark).
    - Expected Input: 4-second raw audio waveform (64,000 samples at 16,000 Hz), float32 normalized.
    - Supported Formats: WAV (PCM), FLAC.
    - Output Semantics: Calibrated synthetic/spoof probability [0.0, 1.0].
    - Licensing: BSD-3-Clause / MIT compatible.

    Operational Policy:
    -------------------
    - If model weights are missing or not configured via `settings.AUDIO_MODEL_PATH`,
      the adapter explicitly returns `DetectorStatus.NOT_CONFIGURED` and score=None.
    - Never fabricates random numbers or placeholder probabilities.
    - Preserves biometric privacy: speaker identity is never evaluated or persisted.
    """

    def __init__(
        self,
        name: str = "audio_model_adapter_v1",
        version: str = "1.0.0",
        model_path: Optional[str] = None,
    ):
        super().__init__(name=name, version=version)
        self.model_path = model_path or settings.AUDIO_MODEL_PATH
        self._model = None
        self._load_attempted = False

    def is_configured(self) -> bool:
        """
        Verify if model weights file exists and is accessible.
        """
        if not self.model_path:
            return False
        return os.path.exists(self.model_path) and os.path.isfile(self.model_path)

    def _load_model(self) -> bool:
        """
        Attempt to load model weights from the configured file path.
        Returns True if loaded successfully, False otherwise.
        """
        if not self.is_configured():
            return False

        try:
            logger.info(f"Loading pretrained audio spoof model from {self.model_path}...")
            if self.model_path.endswith(".onnx"):
                import onnxruntime as ort
                self._model = ort.InferenceSession(self.model_path, providers=["CPUExecutionProvider"])
                return True
            elif self.model_path.endswith((".pt", ".pth")):
                import torch
                self._model = torch.jit.load(self.model_path, map_location=settings.AUDIO_MODEL_DEVICE)
                self._model.eval()
                return True
            else:
                logger.warning(f"Unsupported audio model file format: {self.model_path}")
                return False
        except Exception as e:
            logger.error(f"Failed to load audio detector model from {self.model_path}: {e}")
            self._model = None
            return False

    async def predict(self, media_path: str, metadata: Dict[str, Any]) -> DetectorOutput:
        """
        Execute model inference if configured, or return NOT_CONFIGURED honestly.
        """
        if not self.is_configured():
            return DetectorOutput(
                detector_name=self.name,
                detector_version=self.version,
                status=DetectorStatus.NOT_CONFIGURED,
                score=None,
                score_semantics="not_applicable",
                signals={
                    "configured": False,
                    "target_architecture": "AASIST / RawNet2 Voice Clone Classifier",
                    "model_path": None,
                },
                limitations=[
                    "Pretrained audio anti-spoof model weights are not configured. To enable neural classification, configure AUDIO_MODEL_PATH in the environment with valid weights.",
                    "No synthetic speech probability has been generated. Analysis relies on deterministic acoustic signal extraction.",
                ],
                error="Model weights not found at configured path.",
            )

        if self._model is None and not self._load_attempted:
            self._load_attempted = True
            success = self._load_model()
            if not success:
                return DetectorOutput(
                    detector_name=self.name,
                    detector_version=self.version,
                    status=DetectorStatus.FAILED,
                    score=None,
                    score_semantics="not_applicable",
                    signals={"configured": True, "loaded": False},
                    limitations=["Model initialization failed. Check model format and dependencies."],
                    error="Failed to initialize audio inference session.",
                )

        try:
            from app.detectors.audio.forensics import safe_decode_audio
            import aiofiles

            async with aiofiles.open(media_path, "rb") as f:
                audio_bytes = await f.read()

            samples, sr, _, _ = safe_decode_audio(audio_bytes)

            # Preprocessing: resample to 16,000 Hz if necessary
            target_sr = 16000
            target_samples = 64000  # 4 seconds at 16kHz
            if sr != target_sr:
                from scipy import signal
                num_resampled = int(len(samples) * target_sr / sr)
                samples = signal.resample(samples, num_resampled)

            # Pad or truncate to exactly 64,000 samples
            if len(samples) < target_samples:
                padded = np.zeros(target_samples, dtype=np.float32)
                padded[: len(samples)] = samples
                samples = padded
            else:
                samples = samples[:target_samples]

            input_tensor = np.expand_dims(samples, axis=0)  # (1, 64000)

            if hasattr(self._model, "run"):
                input_name = self._model.get_inputs()[0].name
                outputs = self._model.run(None, {input_name: input_tensor})
                logits = outputs[0][0]
            else:
                import torch
                with torch.no_grad():
                    tensor = torch.from_numpy(input_tensor).to(settings.AUDIO_MODEL_DEVICE)
                    out = self._model(tensor)
                    logits = out.cpu().numpy()[0]

            exp_logits = np.exp(logits - np.max(logits))
            probs = exp_logits / np.sum(exp_logits)
            spoof_prob = float(probs[1]) if len(probs) > 1 else float(probs[0])

            return DetectorOutput(
                detector_name=self.name,
                detector_version=self.version,
                status=DetectorStatus.COMPLETED,
                score=round(spoof_prob, 4),
                score_semantics="calibrated_probability",
                signals={
                    "configured": True,
                    "model_architecture": "AASIST",
                    "synthetic_speech_probability": round(spoof_prob, 4),
                    "confidence_tier": "high" if spoof_prob > 0.8 else "moderate",
                },
                limitations=[
                    "Neural speech spoof detectors are trained on benchmark datasets (e.g., ASVspoof) and may experience distribution shift on real-world telephony or noisy speech.",
                    "Microphone distortion and codec transcodings can increase false alarm rates.",
                ],
                error=None,
            )

        except Exception as e:
            logger.error(f"Audio model inference error on {media_path}: {e}", exc_info=True)
            return DetectorOutput(
                detector_name=self.name,
                detector_version=self.version,
                status=DetectorStatus.FAILED,
                score=None,
                score_semantics="not_applicable",
                signals={"configured": True},
                limitations=["Audio inference encountered an unhandled execution error."],
                error=f"Model execution error: {str(e)}",
            )
