"""OmniScan Real Video Deepfake Detection Adapter.

Replaces demonstration stubs with genuine learned frame-level deepfake inference
aggregated across uniformly sampled keyframes.
Conforms to the Zero-Fabrication Mandate:
- Never outputs hardcoded mock probabilities (0.5 stub removed)
- Decouples frame-level learned inference from OpenCV temporal consistency metrics
- Explicitly returns NOT_CONFIGURED when weights are not provisioned
"""

import os
from typing import Any, Dict, List, Optional
import cv2
import numpy as np
from PIL import Image
import torch
import torchvision.transforms as transforms

from app.core.config import settings
from app.core.logging import logger
from app.detectors.base import BaseDetector, DetectorOutput
from app.detectors.model_registry import model_registry, resolve_checkpoint_path
from app.schemas.common import DetectorStatus
from .frame_sampler import safe_inspect_video_header, sample_video_frames, VideoInspectionError
try:
    from services.api.training.image.model import SyntheticImageClassifier
except (ImportError, ModuleNotFoundError):
    try:
        from training.image.model import SyntheticImageClassifier
    except (ImportError, ModuleNotFoundError):
        import sys
        from pathlib import Path
        _pkg_root = Path(__file__).resolve().parents[3]
        if str(_pkg_root) not in sys.path:
            sys.path.insert(0, str(_pkg_root))
        from training.image.model import SyntheticImageClassifier


class PretrainedVideoModelAdapter(BaseDetector):
    """
    Genuine learned video deepfake classifier adapter.
    Evaluates trained neural network representations across deterministically sampled video keyframes.
    """

    def __init__(
        self,
        name: str = settings.VIDEO_MODEL_NAME,
        version: str = "1.1.0",
        model_path: Optional[str] = None,
        device: Optional[str] = None,
    ):
        super().__init__(name=name, version=version)
        # Use VIDEO_MODEL_PATH if configured; fallback to IMAGE_MODEL_PATH for frame-level classification
        raw_path = model_path or settings.VIDEO_MODEL_PATH or settings.IMAGE_MODEL_PATH
        self.model_path = resolve_checkpoint_path(raw_path)
        self.device = device or settings.VIDEO_MODEL_DEVICE
        if self.device == "cuda" and not torch.cuda.is_available():
            self.device = "cpu"

        self._model: Optional[SyntheticImageClassifier] = None
        self._model_metadata: Dict[str, Any] = {}
        self._load_attempted = False

        self._transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ])

    def is_configured(self) -> bool:
        """Returns True only if weights file exists and is accessible."""
        if not settings.VIDEO_DETECTOR_ENABLED:
            return False
        if not self.model_path:
            return False
        return os.path.isfile(self.model_path) and os.access(self.model_path, os.R_OK)

    def _load_model(self) -> bool:
        if self._load_attempted:
            return self._model is not None
        self._load_attempted = True

        if not self.is_configured():
            logger.info(f"{self.name}: Video model weights not configured. Reporting NOT_CONFIGURED.")
            return False

        try:
            logger.info(f"{self.name}: Loading trained checkpoint from {self.model_path} on {self.device}...")
            model, meta = SyntheticImageClassifier.load_from_checkpoint(
                filepath=self.model_path,
                device=self.device,
            )
            self._model = model
            self._model_metadata = meta

            reg_entry = model_registry.get_active_model("video")
            if reg_entry:
                reg_entry.actual_sha256 = meta.get("sha256")
                reg_entry.availability_status = DetectorStatus.AVAILABLE
                reg_entry.load_status = "loaded"

            logger.info(f"{self.name}: Video frame classifier initialized successfully.")
            return True

        except Exception as e:
            logger.error(f"{self.name}: Failed to load video classifier weights: {e}", exc_info=True)
            self._model = None
            reg_entry = model_registry.get_active_model("video")
            if reg_entry:
                reg_entry.availability_status = DetectorStatus.FAILED
                reg_entry.load_status = "failed"
                reg_entry.error = str(e)
            return False

    async def predict(self, media_path: str, metadata: Dict[str, Any]) -> DetectorOutput:
        """
        Executes real frame-level deep learning inference across sampled video frames.
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
                    "target_architecture": "Frame-Level Learned Classifier + Temporal Continuity",
                    "model_path": None,
                    "model_version": self.version,
                    "reason": "VIDEO_MODEL_PATH and IMAGE_MODEL_PATH not configured in environment.",
                },
                limitations=[
                    "Pretrained deep video classification weights are not configured.",
                    "Video analysis relies strictly on deterministic computer vision and temporal consistency signals.",
                ],
                error=None,
            )

        if self._model is None and not self._load_attempted:
            if not self._load_model():
                return DetectorOutput(
                    detector_name=self.name,
                    detector_version=self.version,
                    status=DetectorStatus.FAILED,
                    score=None,
                    score_semantics="not_applicable",
                    signals={"configured": True, "loaded": False},
                    limitations=["Failed to initialize video model checkpoint."],
                    error="Video model initialization failed.",
                )

        try:
            # 1. Inspect header and sample frames deterministically
            video_meta = safe_inspect_video_header(media_path)
            sampled_frames = sample_video_frames(media_path, video_meta)

            if not sampled_frames:
                raise VideoInspectionError("No valid video frames could be decoded from container.")

            # 2. Run learned inference across each sampled frame
            frame_scores: List[Dict[str, Any]] = []
            frame_probs: List[float] = []

            for frame_info, png_bytes in sampled_frames:
                # Decode PNG bytes to RGB PIL Image
                from io import BytesIO
                with Image.open(BytesIO(png_bytes)) as pil_img:
                    tensor = self._transform(pil_img.convert("RGB")).unsqueeze(0).to(self.device)

                with torch.inference_mode():
                    logits = self._model(tensor)
                    probs = torch.softmax(logits, dim=1)[0].cpu().numpy()

                synth_prob = float(probs[1]) if len(probs) > 1 else float(probs[0])
                frame_probs.append(synth_prob)
                frame_scores.append({
                    "frame_index": frame_info.frame_index,
                    "timestamp_seconds": frame_info.timestamp_seconds,
                    "synthetic_probability": round(synth_prob, 4),
                })

            # 3. Documented Frame Aggregation:
            # 50% Mean frame score + 50% 90th-percentile frame score
            mean_score = float(np.mean(frame_probs))
            max_score = float(np.max(frame_probs))
            p90_score = float(np.percentile(frame_probs, 90))
            calibrated_threshold = 0.37  # operating threshold
            anomalous_frames = int(np.sum(np.array(frame_probs) >= calibrated_threshold))
            aggregated_score = round(0.5 * mean_score + 0.5 * p90_score, 4)

            is_synthetic_pred = bool(aggregated_score >= calibrated_threshold)

            signals = {
                "configured": True,
                "model_architecture": self._model_metadata.get("architecture", "efficientnet_b0"),
                "model_version": self.version,
                "inference_modality": "frame_level_learned_inference",
                "checkpoint_sha256": self._model_metadata.get("sha256", ""),
                "frames_analyzed": len(sampled_frames),
                "anomalous_frames_detected": anomalous_frames,
                "anomalous_frame_ratio": round(anomalous_frames / max(1, len(sampled_frames)), 4),
                "mean_frame_probability": round(mean_score, 4),
                "max_frame_probability": round(max_score, 4),
                "p90_frame_probability": round(p90_score, 4),
                "aggregated_synthetic_probability": aggregated_score,
                "calibrated_threshold": calibrated_threshold,
                "prediction_label": "synthetic_video" if is_synthetic_pred else "authentic_video",
                "frame_breakdown": frame_scores[:25],  # capped for response payload size
                "model_inference": {
                    "architecture": self._model_metadata.get("architecture", "efficientnet_b0"),
                    "synthetic_probability": aggregated_score,
                    "calibrated_threshold": calibrated_threshold,
                    "prediction": "synthetic_video" if is_synthetic_pred else "authentic_video",
                    "frames_analyzed": len(sampled_frames),
                },
            }

            return DetectorOutput(
                detector_name=self.name,
                detector_version=self.version,
                status=DetectorStatus.COMPLETED,
                score=aggregated_score,
                score_semantics="calibrated_probability",
                signals=signals,
                limitations=[
                    "Frame classification evaluates spatial artifacts per sampled keyframe; "
                    "frame scores alone do not constitute proof of video deepfakes and must be corroborated by temporal motion and optical flow.",
                    "Inter-frame temporal flicker in non-sampled frames is evaluated by the video forensics detector.",
                    "Video re-encoding and high compression ratios can attenuate subtle high-frequency generative artifacts.",
                ],
                error=None,
            )

        except VideoInspectionError as e:
            logger.warning(f"{self.name}: Video inspection error on {media_path}: {e}")
            return DetectorOutput(
                detector_name=self.name,
                detector_version=self.version,
                status=DetectorStatus.FAILED,
                score=None,
                score_semantics="not_applicable",
                signals={},
                limitations=["Video decoding failed or exceeded allowed boundaries."],
                error=str(e),
            )
        except Exception as e:
            logger.error(f"{self.name}: Unexpected video inference error on {media_path}: {e}", exc_info=True)
            return DetectorOutput(
                detector_name=self.name,
                detector_version=self.version,
                status=DetectorStatus.FAILED,
                score=None,
                score_semantics="not_applicable",
                signals={"configured": True},
                limitations=["An unhandled runtime error occurred during video inference."],
                error=f"Video model execution error: {str(e)}",
            )
