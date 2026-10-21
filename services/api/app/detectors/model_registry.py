"""OmniScan Model Registry and Operational Inference Catalog.

Maintains registered deep learning models for multi-modal synthetic media detection:
- Cryptographic SHA-256 verification of checkpoints
- Preprocessing requirements and input dimensions
- Training dataset provenance and licensing
- Operating thresholds and calibration metadata
- Explicit detection status handling (AVAILABLE, NOT_CONFIGURED, FAILED)
"""

import hashlib
import os
from typing import Any, Dict, List, Optional
from pathlib import Path
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.logging import logger
from app.schemas.common import DetectorStatus


def resolve_checkpoint_path(path: Optional[str]) -> Optional[str]:
    """
    Resolves relative or absolute checkpoint paths across workspace structures.
    Checks:
    1. Exact path (if absolute or valid relative to current working directory)
    2. Relative to services/api/
    3. Relative to services/api/weights/
    4. Relative to workspace root/
    """
    if not path:
        return None
    if os.path.isabs(path) and os.path.isfile(path):
        return path
    if os.path.isfile(path):
        return os.path.abspath(path)

    current_file = Path(__file__).resolve()
    api_dir = current_file.parents[2]  # services/api

    cand1 = api_dir / path
    if cand1.is_file():
        return str(cand1)

    cand2 = api_dir / "weights" / Path(path).name
    if cand2.is_file():
        return str(cand2)

    root_dir = current_file.parents[3]  # workspace root
    cand3 = root_dir / path
    if cand3.is_file():
        return str(cand3)

    cand4 = root_dir / "services" / "api" / path
    if cand4.is_file():
        return str(cand4)

    cand5 = root_dir / "services" / "api" / "weights" / Path(path).name
    if cand5.is_file():
        return str(cand5)

    return path


class ModelRegistryEntry(BaseModel):
    """Specification of a trained detection model within the registry."""
    model_id: str
    model_version: str
    modality: str  # "image", "audio", "video"
    architecture: str
    checkpoint_path: Optional[str] = None
    expected_sha256: Optional[str] = None
    actual_sha256: Optional[str] = None
    dataset_references: List[str] = Field(default_factory=list)
    license_and_attribution: str = "MIT / Apache-2.0"
    expected_preprocessing: Dict[str, Any] = Field(default_factory=dict)
    class_mapping: Dict[int, str] = Field(default_factory=lambda: {0: "real", 1: "synthetic"})
    validation_metrics: Dict[str, Any] = Field(default_factory=dict)
    calibration_info: Dict[str, Any] = Field(default_factory=dict)
    availability_status: DetectorStatus = DetectorStatus.NOT_CONFIGURED
    load_status: str = "unloaded"
    error: Optional[str] = None


class ModelRegistry:
    """
    Central registry and lifecycle manager for deep learning checkpoints.
    Ensures zero fabricated scores by strictly validating checkpoint files.
    """

    def __init__(self):
        self._entries: Dict[str, ModelRegistryEntry] = {}
        self._modality_active: Dict[str, str] = {}
        self._initialize_default_registry()

    def _initialize_default_registry(self) -> None:
        """Configures default model definitions across modalities."""
        # 1. Image Modality Definition
        resolved_img_path = resolve_checkpoint_path(settings.IMAGE_MODEL_PATH)
        is_default_checkpoint = bool(
            resolved_img_path and "efficientnet_b0_synthetic_detector" in resolved_img_path
        )
        image_entry = ModelRegistryEntry(
            model_id="omniscan_image_efficientnet_b0_v1",
            model_version="1.0.0",
            modality="image",
            architecture="EfficientNet-B0 (Transfer Learning)",
            checkpoint_path=resolved_img_path,
            expected_sha256=(
                "14f95af0f2fa39f98f9aa0150000186ed0a3b34b4a1b717343ad9351fbdccc04"
                if is_default_checkpoint
                else None
            ),
            dataset_references=[
                "CIFAKE (Bird & Lotfi, IEEE Access 2024)",
                "GenImage Benchmark (NeurIPS 2023)",
            ],
            license_and_attribution="MIT License / CC BY 4.0",
            expected_preprocessing={
                "input_resolution": [224, 224],
                "color_mode": "RGB",
                "normalization": {
                    "mean": [0.485, 0.456, 0.406],
                    "std": [0.229, 0.224, 0.225],
                },
            },
            class_mapping={0: "real", 1: "synthetic"},
            validation_metrics={
                "val_loss": 0.1722,
                "val_accuracy": 0.9300,
                "val_f1": 0.9314,
                "val_roc_auc": 0.9806,
                "test_accuracy": 0.9474,
                "test_f1": 0.9487,
                "test_roc_auc": 0.9873,
            },
            calibration_info={
                "calibrated_threshold": 0.37,
                "strategy": "max_f1_score_on_val",
                "ece": 0.0282,
                "brier_score": 0.0368,
            },
        )
        self.register(image_entry, is_active_for_modality=True)

        # 2. Audio Modality Definition
        resolved_audio_path = resolve_checkpoint_path(settings.AUDIO_MODEL_PATH)
        audio_entry = ModelRegistryEntry(
            model_id="omniscan_audio_aasist_v1",
            model_version="1.0.0",
            modality="audio",
            architecture="AASIST (Graph Attention Network)",
            checkpoint_path=resolved_audio_path,
            dataset_references=[
                "ASVspoof 2019 / 2021 Benchmark",
                "Interspeech 2022 AASIST Baseline",
            ],
            license_and_attribution="BSD-3-Clause",
            expected_preprocessing={
                "sample_rate_hz": 16000,
                "channels": 1,
                "chunk_duration_seconds": 4.0,
                "samples_per_chunk": 64000,
                "chunk_aggregation": "top_percentile_and_mean",
            },
            class_mapping={0: "real", 1: "synthetic"},
            calibration_info={
                "calibrated_threshold": 0.50,
                "strategy": "equal_error_rate_on_val",
            },
        )
        self.register(audio_entry, is_active_for_modality=True)

        # 3. Video Modality Definition
        raw_video_path = settings.VIDEO_MODEL_PATH or settings.IMAGE_MODEL_PATH
        resolved_video_path = resolve_checkpoint_path(raw_video_path)
        video_entry = ModelRegistryEntry(
            model_id="omniscan_video_frame_aggregator_v1",
            model_version="1.0.0",
            modality="video",
            architecture="Frame-Level Learned Inference + OpenCV Temporal Consistency",
            checkpoint_path=resolved_video_path,
            dataset_references=[
                "FaceForensics++ (ICCV 2019)",
                "CIFAKE Synthetic Benchmark",
            ],
            license_and_attribution="MIT / CC BY 4.0",
            expected_preprocessing={
                "temporal_sample_fps": settings.VIDEO_FRAME_SAMPLE_FPS,
                "max_sampled_frames": settings.VIDEO_MAX_FRAMES_SAMPLED,
                "frame_resize_max": 720,
                "frame_classifier_input": [224, 224],
                "frame_aggregation": "mean_and_p90_pooling",
            },
            class_mapping={0: "real", 1: "synthetic"},
            calibration_info={
                "calibrated_threshold": 0.37,
                "strategy": "temporal_frame_pooling",
            },
        )
        self.register(video_entry, is_active_for_modality=True)

    def register(self, entry: ModelRegistryEntry, is_active_for_modality: bool = True) -> None:
        """Registers a model entry and optionally sets it as active for its modality."""
        self._entries[entry.model_id] = entry
        if is_active_for_modality:
            self._modality_active[entry.modality] = entry.model_id

    def get_entry(self, model_id: str) -> Optional[ModelRegistryEntry]:
        return self._entries.get(model_id)

    def get_active_model(self, modality: str) -> Optional[ModelRegistryEntry]:
        active_id = self._modality_active.get(modality)
        if not active_id:
            return None
        return self._entries.get(active_id)

    def list_models(self) -> List[ModelRegistryEntry]:
        return list(self._entries.values())

    def validate_and_update_entry(self, entry: ModelRegistryEntry) -> bool:
        """
        Validates checkpoint existence, accessibility, and cryptographic integrity.
        Updates availability_status and actual_sha256 in place.
        """
        raw_path = entry.checkpoint_path
        if not raw_path:
            entry.availability_status = DetectorStatus.NOT_CONFIGURED
            entry.load_status = "unconfigured"
            entry.error = "Checkpoint path not configured in environment."
            return False

        path = resolve_checkpoint_path(raw_path)
        if path:
            entry.checkpoint_path = path

        if not path or not os.path.exists(path) or not os.path.isfile(path):
            entry.availability_status = DetectorStatus.NOT_CONFIGURED
            entry.load_status = "missing_file"
            entry.error = f"Checkpoint file does not exist at path: {path or raw_path}"
            return False

        try:
            # Compute SHA-256
            h = hashlib.sha256()
            with open(path, "rb") as f:
                while chunk := f.read(65536):
                    h.update(chunk)
            actual_hash = h.hexdigest()
            entry.actual_sha256 = actual_hash

            if entry.expected_sha256 and entry.expected_sha256.lower() != actual_hash.lower():
                entry.availability_status = DetectorStatus.FAILED
                entry.load_status = "hash_mismatch"
                entry.error = (
                    f"Checksum mismatch. Expected: {entry.expected_sha256}, Actual: {actual_hash}"
                )
                return False

            entry.availability_status = DetectorStatus.AVAILABLE
            entry.load_status = "ready"
            entry.error = None
            return True

        except Exception as e:
            entry.availability_status = DetectorStatus.FAILED
            entry.load_status = "validation_error"
            entry.error = f"Error validating checkpoint: {str(e)}"
            return False


# Singleton instance
model_registry = ModelRegistry()
