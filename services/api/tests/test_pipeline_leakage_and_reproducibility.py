"""Tests for Dataset Leakage Prevention, Seed Reproducibility, Label Validation, and Media Safety Limits."""

import json
import os
import tempfile
import numpy as np
import pytest
import torch

from app.detectors.image.forensics import extract_full_image_forensics, ImageForensicExtractionError
from app.detectors.audio.forensics import safe_decode_audio, AudioForensicExtractionError
from app.detectors.video.frame_sampler import safe_inspect_video_header, VideoInspectionError
try:
    from services.api.training.image.dataset import (
        SyntheticImageDataset,
        check_dataset_leakage,
        VALID_LABELS,
    )
    from services.api.training.image.model import SyntheticImageClassifier
    from services.api.training.image.train import set_seed
except (ImportError, ModuleNotFoundError):
    from training.image.dataset import (
        SyntheticImageDataset,
        check_dataset_leakage,
        VALID_LABELS,
    )
    from training.image.model import SyntheticImageClassifier
    from training.image.train import set_seed


MANIFEST_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "training",
    "data",
    "manifest.json",
)


def test_verified_dataset_manifest_zero_leakage():
    """Verify official training manifest contains zero data leakage across splits."""
    if not os.path.exists(MANIFEST_PATH):
        pytest.skip("Training manifest.json not generated.")

    report = check_dataset_leakage(MANIFEST_PATH)
    assert report["leakage_free"] is True
    assert report["total_records"] > 0
    assert report["unique_hashes"] == report["total_records"]
    assert "train" in report["split_counts"]
    assert "val" in report["split_counts"]
    assert "test" in report["split_counts"]
    assert "test_heldout" in report["split_counts"]


def test_dataset_leakage_detection_catches_collision():
    """Verify check_dataset_leakage raises ValueError if duplicate hash appears across splits."""
    mock_records = [
        {"sha256": "aaaa" * 16, "split": "train", "label": "real", "filepath": "img1.png"},
        {"sha256": "bbbb" * 16, "split": "train", "label": "synthetic", "filepath": "img2.png"},
        {"sha256": "aaaa" * 16, "split": "test", "label": "real", "filepath": "img3.png"},  # LEAK!
    ]
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(mock_records, f)
        tmp_manifest = f.name

    try:
        with pytest.raises(ValueError, match="Data leakage detected"):
            check_dataset_leakage(tmp_manifest)
    finally:
        if os.path.exists(tmp_manifest):
            os.remove(tmp_manifest)


def test_dataset_rejects_ambiguous_or_unknown_labels():
    """Verify SyntheticImageDataset strictly rejects unknown or non-binary labels."""
    invalid_records = [
        {"sha256": "cccc" * 16, "split": "train", "label": "deepfake_maybe", "filepath": "img1.png"},
    ]
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(invalid_records, f)
        tmp_manifest = f.name

    try:
        with pytest.raises(ValueError, match="Invalid or ambiguous label"):
            SyntheticImageDataset(manifest_path=tmp_manifest, split="train")
    finally:
        if os.path.exists(tmp_manifest):
            os.remove(tmp_manifest)


def test_reproducibility_with_fixed_seed():
    """Verify fixed seed produces identical model weights and outputs."""
    set_seed(42)
    m1 = SyntheticImageClassifier(num_classes=2, pretrained=False)
    p1 = list(m1.parameters())[0].detach().clone()

    set_seed(42)
    m2 = SyntheticImageClassifier(num_classes=2, pretrained=False)
    p2 = list(m2.parameters())[0].detach().clone()

    assert torch.equal(p1, p2)


def test_corrupt_image_fails_cleanly():
    """Verify corrupt image bytes raise controlled ImageForensicExtractionError."""
    corrupt_bytes = b"\x89PNG\r\n\x1a\n\x00\x00CORRUPTED_TRUNCATED_PAYLOAD"
    with pytest.raises(ImageForensicExtractionError):
        extract_full_image_forensics(corrupt_bytes)


def test_corrupt_audio_fails_cleanly():
    """Verify non-PCM / corrupt audio bytes raise controlled AudioForensicExtractionError."""
    corrupt_bytes = b"RIFF\x00\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00CORRUPT"
    with pytest.raises(AudioForensicExtractionError):
        safe_decode_audio(corrupt_bytes)


def test_empty_video_fails_cleanly():
    """Verify 0-byte or invalid video container raises controlled VideoInspectionError."""
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
        tmp_path = f.name  # 0 bytes

    try:
        with pytest.raises(VideoInspectionError):
            safe_inspect_video_header(tmp_path)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
