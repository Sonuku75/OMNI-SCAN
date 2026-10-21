"""OmniScan Real Pretrained Image Synthetic-Media Detector Adapter.

Executes genuine learned inference using the trained PyTorch / EfficientNet-B0 checkpoint.
Validates checkpoint integrity via SHA-256 and conforms to the Zero-Fabrication Mandate:
returns NOT_CONFIGURED when weights are absent or unverified.
"""

import os
from typing import Any, Dict, List, Optional
import numpy as np
from PIL import Image
import torch
import torchvision.transforms as transforms

from app.core.config import settings
from app.core.logging import logger
from app.detectors.base import BaseDetector, DetectorOutput
from app.detectors.model_registry import model_registry, resolve_checkpoint_path
from app.schemas.common import DetectorStatus

try:
    from services.api.training.image.model import SyntheticImageClassifier, compute_file_sha256
except (ImportError, ModuleNotFoundError):
    try:
        from training.image.model import SyntheticImageClassifier, compute_file_sha256
    except (ImportError, ModuleNotFoundError):
        import sys
        from pathlib import Path
        _pkg_root = Path(__file__).resolve().parents[3]
        if str(_pkg_root) not in sys.path:
            sys.path.insert(0, str(_pkg_root))
        from training.image.model import SyntheticImageClassifier, compute_file_sha256


class PretrainedImageModelAdapter(BaseDetector):
    """
    Adapter for genuine trained synthetic-image classifiers (e.g. EfficientNet-B0 / ResNet-50).

    Operational Policy:
    -------------------
    - When weights are missing or not configured, explicitly returns DetectorStatus.NOT_CONFIGURED with score=None.
    - Zero fabrication: never generates random probabilities or placeholder numbers.
    - Uses eval() and torch.inference_mode() during prediction.
    """

    def __init__(
        self,
        name: str = "image_model_adapter_v1",
        version: str = "1.1.0",
        model_path: Optional[str] = None,
        device: Optional[str] = None,
    ):
        super().__init__(name=name, version=version)
        self.model_path = resolve_checkpoint_path(model_path or settings.IMAGE_MODEL_PATH)
        self.device = device or settings.IMAGE_MODEL_DEVICE
        if self.device == "cuda" and not torch.cuda.is_available():
            self.device = "cpu"

        self._model: Optional[SyntheticImageClassifier] = None
        self._model_metadata: Dict[str, Any] = {}
        self._load_attempted = False

        # Input transform: standard 224x224 ImageNet normalization
        self._transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ])

    def is_configured(self) -> bool:
        """Returns True only if weights file exists and is accessible on the filesystem."""
        if not self.model_path:
            return False
        return os.path.isfile(self.model_path) and os.access(self.model_path, os.R_OK)

    def _load_model(self) -> bool:
        if self._load_attempted:
            return self._model is not None
        self._load_attempted = True

        if not self.is_configured():
            logger.info(f"{self.name}: Weights not configured at '{self.model_path}'. Returning NOT_CONFIGURED.")
            return False

        try:
            logger.info(f"{self.name}: Loading genuine trained model from {self.model_path} on {self.device}...")
            reg_entry = model_registry.get_active_model("image")
            expected_sha = reg_entry.expected_sha256 if reg_entry else None

            model, meta = SyntheticImageClassifier.load_from_checkpoint(
                filepath=self.model_path,
                device=self.device,
                expected_sha256=expected_sha,
            )
            self._model = model
            self._model_metadata = meta

            # Update registry status
            if reg_entry:
                reg_entry.actual_sha256 = meta.get("sha256")
                reg_entry.availability_status = DetectorStatus.AVAILABLE
                reg_entry.load_status = "loaded"

            logger.info(
                f"{self.name}: Successfully initialized {meta.get('architecture')} "
                f"(SHA-256: {meta.get('sha256', '')[:16]}...)"
            )
            return True

        except Exception as e:
            logger.error(f"{self.name}: Failed to load model checkpoint from {self.model_path}: {e}", exc_info=True)
            self._model = None
            reg_entry = model_registry.get_active_model("image")
            if reg_entry:
                reg_entry.availability_status = DetectorStatus.FAILED
                reg_entry.load_status = "failed"
                reg_entry.error = str(e)
            return False

    async def predict(self, media_path: str, metadata: Dict[str, Any]) -> DetectorOutput:
        """Executes model inference on the media file if configured."""
        if not self.is_configured():
            return DetectorOutput(
                detector_name=self.name,
                detector_version=self.version,
                status=DetectorStatus.NOT_CONFIGURED,
                score=None,
                score_semantics="not_applicable",
                signals={
                    "configured": False,
                    "target_architecture": "EfficientNet-B0 Deepfake Classifier",
                    "model_path": None,
                    "model_version": self.version,
                    "calibration_status": "unconfigured",
                    "evaluation_reference": "docs/EVALUATION_REPORT.md",
                },
                limitations=[
                    "Pretrained deepfake model weights are not configured at IMAGE_MODEL_PATH.",
                    "No synthetic probability has been generated. Analysis relies on deterministic forensic feature extraction.",
                ],
                error="Model weights not found at configured path.",
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
                    limitations=["Model initialization failed. Check model format and dependencies."],
                    error="Failed to initialize model inference session.",
                )

        try:
            # 1. Safe image loading and verification
            with Image.open(media_path) as img:
                img_rgb = img.convert("RGB")
                tensor = self._transform(img_rgb).unsqueeze(0).to(self.device)

            # 2. Genuine inference mode execution
            with torch.inference_mode():
                logits = self._model(tensor)
                probs = torch.softmax(logits, dim=1)[0].cpu().numpy()

            # Class 0: real, Class 1: synthetic
            synthetic_prob = float(probs[1]) if len(probs) > 1 else float(probs[0])
            calibrated_threshold = 0.37  # empirically calibrated on validation split

            is_synthetic_pred = bool(synthetic_prob >= calibrated_threshold)
            confidence_tier = (
                "high" if (synthetic_prob > 0.80 or synthetic_prob < 0.20)
                else "moderate"
            )

            signals = {
                "configured": True,
                "model_architecture": self._model_metadata.get("architecture", "efficientnet_b0"),
                "model_version": self.version,
                "checkpoint_sha256": self._model_metadata.get("sha256", ""),
                "synthetic_probability": round(synthetic_prob, 4),
                "authentic_probability": round(float(probs[0]), 4) if len(probs) > 1 else round(1.0 - synthetic_prob, 4),
                "calibrated_threshold": calibrated_threshold,
                "prediction_label": "synthetic" if is_synthetic_pred else "real",
                "confidence_tier": confidence_tier,
                "calibration_status": "calibrated_val_max_f1",
                "evaluation_reference": "docs/EVALUATION_REPORT.md",
                "model_inference": {
                    "architecture": self._model_metadata.get("architecture", "efficientnet_b0"),
                    "synthetic_probability": round(synthetic_prob, 4),
                    "authentic_probability": round(float(probs[0]), 4) if len(probs) > 1 else round(1.0 - synthetic_prob, 4),
                    "calibrated_threshold": calibrated_threshold,
                    "prediction": "synthetic" if is_synthetic_pred else "real",
                },
            }

            return DetectorOutput(
                detector_name=self.name,
                detector_version=self.version,
                status=DetectorStatus.COMPLETED,
                score=round(synthetic_prob, 4),
                score_semantics="calibrated_probability",
                signals=signals,
                limitations=[
                    "Model outputs are probabilistic predictions based on feature representations in training data.",
                    "Adversarial perturbations or severe re-compression (JPEG quality < 50) may degrade confidence.",
                    "Findings should be corroborated with deterministic spectral and compression residual evidence.",
                ],
                error=None,
            )

        except Exception as e:
            logger.error(f"{self.name}: Image inference error on {media_path}: {e}", exc_info=True)
            return DetectorOutput(
                detector_name=self.name,
                detector_version=self.version,
                status=DetectorStatus.FAILED,
                score=None,
                score_semantics="not_applicable",
                signals={"configured": True},
                limitations=["Inference encountered a runtime exception during forward pass."],
                error=f"Model execution error: {str(e)}",
            )
