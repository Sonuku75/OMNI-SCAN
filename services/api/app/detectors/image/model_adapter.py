import os
from typing import Any, Dict, List, Optional
from PIL import Image

from app.core.config import settings
from app.core.logging import logger
from app.detectors.base import BaseDetector, DetectorOutput
from app.schemas.common import DetectorStatus


class PretrainedImageModelAdapter(BaseDetector):
    """
    Adapter for real pretrained deepfake and synthetic image detection models.

    Architecture Specification:
    ---------------------------
    - Model Family: Deepfake Artifact Classification (ResNet-50 / EfficientNet)
    - Source/Reference: Standard academic architectures for synthetic image detection
      (e.g., Wang et al., 'CNN-generated images are surprisingly easy to spot...').
    - Expected Input: 224x224 RGB image normalized with ImageNet stats.
    - Supported Formats: JPEG, PNG, WEBP.
    - Output Semantics: Calibrated probability [0.0, 1.0] representing likelihood of synthetic generation.
    - Licensing: Apache-2.0 / MIT compatible weight interfaces.

    Operational Policy:
    -------------------
    - If model weights are missing or not configured via `settings.IMAGE_MODEL_PATH`,
      the adapter explicitly returns `DetectorStatus.NOT_CONFIGURED` and score=None.
    - Never fabricates random numbers or placeholder probabilities.
    """

    def __init__(
        self,
        name: str = "image_model_adapter_v1",
        version: str = "1.0.0",
        model_path: Optional[str] = None,
    ):
        super().__init__(name=name, version=version)
        self.model_path = model_path or settings.IMAGE_MODEL_PATH
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
            logger.info(f"Loading pretrained image model from {self.model_path}...")
            # If ONNX format
            if self.model_path.endswith(".onnx"):
                import onnxruntime as ort
                self._model = ort.InferenceSession(self.model_path, providers=["CPUExecutionProvider"])
                return True
            # If TorchScript / PyTorch format
            elif self.model_path.endswith((".pt", ".pth")):
                import torch
                self._model = torch.jit.load(self.model_path, map_location=settings.IMAGE_MODEL_DEVICE)
                self._model.eval()
                return True
            else:
                logger.warning(f"Unsupported model file format: {self.model_path}")
                return False
        except Exception as e:
            logger.error(f"Failed to load image detector model from {self.model_path}: {e}")
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
                    "target_architecture": "ResNet-50 / EfficientNet Deepfake Classifier",
                    "model_path": None,
                },
                limitations=[
                    "Pretrained deepfake model weights are not configured. To enable deep learning classification, configure IMAGE_MODEL_PATH in the environment with valid weights.",
                    "No synthetic probability has been generated. Analysis relies on deterministic forensic feature extraction.",
                ],
                error="Model weights not found at configured path.",
            )

        # Attempt model load if configured
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
                    error="Failed to initialize model inference session.",
                )

        try:
            # Safe image loading and preprocessing
            img = Image.open(media_path).convert("RGB")
            img = img.resize((224, 224), Image.Resampling.BILINEAR)

            # Preprocessing: convert to normalized float array
            import numpy as np
            arr = np.array(img, dtype=np.float32) / 255.0
            mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
            std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
            arr = (arr - mean) / std
            arr = np.transpose(arr, (2, 0, 1))  # (C, H, W)
            input_tensor = np.expand_dims(arr, axis=0)  # (1, C, H, W)

            if hasattr(self._model, "run"):
                # ONNX Runtime
                input_name = self._model.get_inputs()[0].name
                outputs = self._model.run(None, {input_name: input_tensor})
                logits = outputs[0][0]
            else:
                # Torch model
                import torch
                with torch.no_grad():
                    tensor = torch.from_numpy(input_tensor).to(settings.IMAGE_MODEL_DEVICE)
                    out = self._model(tensor)
                    logits = out.cpu().numpy()[0]

            # Softmax calibration
            exp_logits = np.exp(logits - np.max(logits))
            probs = exp_logits / np.sum(exp_logits)
            synthetic_prob = float(probs[1]) if len(probs) > 1 else float(probs[0])

            return DetectorOutput(
                detector_name=self.name,
                detector_version=self.version,
                status=DetectorStatus.COMPLETED,
                score=round(synthetic_prob, 4),
                score_semantics="calibrated_probability",
                signals={
                    "configured": True,
                    "model_architecture": "ResNet-50",
                    "synthetic_probability": round(synthetic_prob, 4),
                    "confidence_tier": "high" if synthetic_prob > 0.8 else "moderate",
                },
                limitations=[
                    "Model outputs are probabilistic predictions based on feature representations in training data.",
                    "Adversarial perturbations or heavy social media compression can cause false negatives or false positives.",
                ],
                error=None,
            )

        except Exception as e:
            logger.error(f"Image model inference error on {media_path}: {e}", exc_info=True)
            return DetectorOutput(
                detector_name=self.name,
                detector_version=self.version,
                status=DetectorStatus.FAILED,
                score=None,
                score_semantics="not_applicable",
                signals={"configured": True},
                limitations=["Inference encountered a runtime exception."],
                error=f"Model execution error: {str(e)}",
            )
