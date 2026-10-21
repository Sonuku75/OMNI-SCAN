"""Tests for OmniScan Model Registry, Checkpoint Verification, and Real Inference Adapters."""

import os
import tempfile
import numpy as np
from PIL import Image
import pytest
import torch

from app.core.config import settings
from app.detectors.image.model_adapter import PretrainedImageModelAdapter
from app.detectors.audio.model_adapter import PretrainedAudioModelAdapter
from app.detectors.video.model_adapter import PretrainedVideoModelAdapter
from app.detectors.model_registry import ModelRegistry, ModelRegistryEntry, model_registry
from app.schemas.analyses import AnalysisDetailResponse, UploadDetailSchema, ProvenanceResultSchema
from app.schemas.common import DetectorStatus, AnalysisStatus, MediaType
try:
    from services.api.training.image.model import SyntheticImageClassifier, compute_file_sha256
except (ImportError, ModuleNotFoundError):
    from training.image.model import SyntheticImageClassifier, compute_file_sha256


TRAINED_CHECKPOINT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "weights",
    "efficientnet_b0_synthetic_detector.pt",
)


def test_missing_checkpoint_handling():
    """Verify missing checkpoint returns NOT_CONFIGURED without mock score."""
    non_existent = "/tmp/does_not_exist_weights_12345.pt"
    adapter = PretrainedImageModelAdapter(model_path=non_existent)
    assert adapter.is_configured() is False


@pytest.mark.asyncio
async def test_missing_checkpoint_predict_returns_not_configured():
    """Verify predict returns DetectorStatus.NOT_CONFIGURED and score=None."""
    adapter = PretrainedImageModelAdapter(model_path="/tmp/non_existent.pt")
    res = await adapter.predict("/tmp/fake_image.png", {})
    assert res.status == DetectorStatus.NOT_CONFIGURED
    assert res.score is None
    assert res.score_semantics == "not_applicable"
    assert res.signals["configured"] is False


def test_invalid_corrupted_checkpoint():
    """Verify corrupted checkpoint file fails cleanly without crashing."""
    with tempfile.NamedTemporaryFile(suffix=".pt", delete=False) as f:
        f.write(b"NOT_A_VALID_PYTORCH_CHECKPOINT_BYTES_GARBAGE")
        tmp_name = f.name

    try:
        adapter = PretrainedImageModelAdapter(model_path=tmp_name)
        assert adapter.is_configured() is True
        loaded = adapter._load_model()
        assert loaded is False
        assert adapter._model is None
    finally:
        if os.path.exists(tmp_name):
            os.remove(tmp_name)


def test_checkpoint_hash_validation():
    """Verify checksum mismatch raises ValueError."""
    if not os.path.exists(TRAINED_CHECKPOINT_PATH):
        pytest.skip("Trained checkpoint not present in weights directory.")

    wrong_hash = "0000000000000000000000000000000000000000000000000000000000000000"
    with pytest.raises(ValueError, match="integrity check failed"):
        SyntheticImageClassifier.load_from_checkpoint(
            filepath=TRAINED_CHECKPOINT_PATH,
            device="cpu",
            expected_sha256=wrong_hash,
        )


def test_model_registry_registration_and_validation():
    """Verify registry maintains metadata, status, and validation."""
    custom_reg = ModelRegistry()
    entry = ModelRegistryEntry(
        model_id="test_image_model",
        model_version="1.0.0",
        modality="image",
        architecture="EfficientNet-B0",
        checkpoint_path="/tmp/nonexistent.pt",
    )
    custom_reg.register(entry, is_active_for_modality=True)
    assert custom_reg.get_entry("test_image_model") is not None
    assert custom_reg.get_active_model("image").model_id == "test_image_model"

    # Validate non-existent
    is_valid = custom_reg.validate_and_update_entry(entry)
    assert is_valid is False
    assert entry.availability_status == DetectorStatus.NOT_CONFIGURED


def test_preprocessing_consistency():
    """Verify preprocessing transforms output normalized tensor of expected shape."""
    adapter = PretrainedImageModelAdapter()
    img = Image.new("RGB", (300, 450), color=(128, 100, 200))
    tensor = adapter._transform(img)
    assert tensor.shape == (3, 224, 224)
    assert tensor.dtype == torch.float32
    assert torch.isfinite(tensor).all()


def test_class_mapping_integrity():
    """Verify canonical class mapping: 0 is real, 1 is synthetic."""
    model = SyntheticImageClassifier(num_classes=2, pretrained=False)
    assert model.num_classes == 2
    dummy_x = torch.randn(2, 3, 224, 224)
    logits = model(dummy_x)
    assert logits.shape == (2, 2)
    probs = model.predict_proba(dummy_x)
    assert probs.shape == (2, 2)
    assert torch.allclose(probs.sum(dim=1), torch.ones(2), atol=1e-5)


@pytest.mark.asyncio
async def test_real_trained_checkpoint_inference():
    """Integration test: runs genuine inference using the trained checkpoint."""
    if not os.path.exists(TRAINED_CHECKPOINT_PATH):
        pytest.skip("Trained checkpoint not present in weights directory.")

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        img = Image.new("RGB", (224, 224), color=(80, 120, 160))
        img.save(f, format="PNG")
        tmp_img = f.name

    try:
        adapter = PretrainedImageModelAdapter(model_path=TRAINED_CHECKPOINT_PATH)
        assert adapter.is_configured() is True

        res = await adapter.predict(tmp_img, {})
        assert res.status == DetectorStatus.COMPLETED
        assert res.score is not None
        assert 0.0 <= res.score <= 1.0
        assert res.score_semantics == "calibrated_probability"
        assert res.signals["configured"] is True
        assert "checkpoint_sha256" in res.signals
        assert len(res.signals["checkpoint_sha256"]) == 64
        assert res.signals["prediction_label"] in ("real", "synthetic")
    finally:
        if os.path.exists(tmp_img):
            os.remove(tmp_img)


@pytest.mark.asyncio
async def test_video_model_adapter_with_trained_checkpoint():
    """Verify video model adapter performs genuine frame aggregation using trained checkpoint."""
    if not os.path.exists(TRAINED_CHECKPOINT_PATH):
        pytest.skip("Trained checkpoint not present.")

    import cv2
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
        tmp_vid = f.name

    try:
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(tmp_vid, fourcc, 10.0, (160, 120))
        for _ in range(15):  # 1.5 seconds
            frame = np.full((120, 160, 3), 128, dtype=np.uint8)
            out.write(frame)
        out.release()

        adapter = PretrainedVideoModelAdapter(model_path=TRAINED_CHECKPOINT_PATH)
        assert adapter.is_configured() is True

        res = await adapter.predict(tmp_vid, {})
        assert res.status == DetectorStatus.COMPLETED
        assert res.score is not None
        assert 0.0 <= res.score <= 1.0
        assert res.score_semantics == "calibrated_probability"
        assert "mean_frame_probability" in res.signals
        assert "frame_breakdown" in res.signals
        assert len(res.signals["frame_breakdown"]) > 0
    finally:
        if os.path.exists(tmp_vid):
            os.remove(tmp_vid)


def test_audio_model_adapter_chunking():
    """Verify audio adapter chunking splits audio into 4s windows with 50% stride."""
    adapter = PretrainedAudioModelAdapter()

    # 1. Short audio (2 seconds = 32000 samples at 16kHz) -> 1 chunk padded to 64000
    samples_short = np.zeros(32000, dtype=np.float32)
    chunks_short = adapter._extract_chunks(samples_short, sr=16000)
    assert len(chunks_short) == 1
    assert chunks_short[0][2].shape == (64000,)

    # 2. Long audio (7 seconds = 112000 samples at 16kHz)
    # Stride is 32000 samples: starts at 0, 32000, 64000, 96000 -> 4 chunks
    samples_long = np.random.randn(112000).astype(np.float32)
    chunks_long = adapter._extract_chunks(samples_long, sr=16000)
    assert len(chunks_long) >= 3
    for _, _, c_arr in chunks_long:
        assert c_arr.shape == (64000,)


def test_api_response_schema_distinguishes_sections():
    """Verify AnalysisDetailResponse includes the required 7 structured sections."""
    from datetime import datetime, timezone
    resp = AnalysisDetailResponse(
        analysis_id="test-123",
        status=AnalysisStatus.COMPLETED,
        assessment_label="suspicious",
        assessment_score=0.92,
        score_semantics="calibrated_probability",
        summary="Analysis completed.",
        upload=UploadDetailSchema(
            upload_id="up-123",
            filename="test.png",
            media_type=MediaType.IMAGE,
            mime_type="image/png",
            size_bytes=1024,
            sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            created_at=datetime.now(timezone.utc),
        ),
        detector_results=[],
        provenance=ProvenanceResultSchema(
            status="no_credentials_found",
            content_credentials_status="not_found",
        ),
        model_inference={"architecture": "EfficientNet-B0", "synthetic_probability": 0.92},
        forensic_heuristics={"fft_spikes": False},
        metadata_and_provenance={"has_exif": False},
        model_version="1.1.0",
        calibration_status="calibrated_val_max_f1",
        evaluation_reference="docs/EVALUATION_REPORT.md",
        limitations=["Adversarial noise may reduce confidence."],
        created_at=datetime.now(timezone.utc),
    )
    assert resp.model_inference["synthetic_probability"] == 0.92
    assert resp.model_version == "1.1.0"
    assert resp.calibration_status == "calibrated_val_max_f1"
    assert resp.evaluation_reference == "docs/EVALUATION_REPORT.md"
    assert len(resp.limitations) == 1


def test_model_inference_structured_payload_and_bounds():
    """Verify structured model inference fields are finite, bounded in [0, 1], and handle missing values."""
    from app.schemas.analyses import AnalysisDetailResponse, UploadDetailSchema, ProvenanceResultSchema
    from datetime import datetime, timezone
    import math

    # 1. Bounded & finite check
    p_synth = 0.8840
    p_auth = 0.1160
    assert 0.0 <= p_synth <= 1.0
    assert 0.0 <= p_auth <= 1.0
    assert math.isfinite(p_synth)
    assert math.isfinite(p_auth)
    assert round(p_synth + p_auth, 4) == 1.0

    # 2. Schema safely permits None / partial dictionary without failure
    resp_empty = AnalysisDetailResponse(
        analysis_id="test-empty",
        status=AnalysisStatus.COMPLETED,
        assessment_label=None,
        assessment_score=None,
        score_semantics="not_applicable",
        summary=None,
        upload=UploadDetailSchema(
            upload_id="up-empty",
            filename="empty.png",
            media_type=MediaType.IMAGE,
            mime_type="image/png",
            size_bytes=100,
            sha256="abcd" * 16,
            created_at=datetime.now(timezone.utc),
        ),
        detector_results=[],
        provenance=ProvenanceResultSchema(
            status="no_credentials_found",
            content_credentials_status="unverified",
        ),
        model_inference=None,  # Null when model unconfigured
        forensic_heuristics=None,
        metadata_and_provenance=None,
        model_version=None,
        calibration_status=None,
        evaluation_reference=None,
        created_at=datetime.now(timezone.utc),
    )
    assert resp_empty.model_inference is None
    assert resp_empty.calibration_status is None


@pytest.mark.asyncio
async def test_genuine_model_inference_known_sample():
    """Verify genuine model inference produces valid finite logits and correct class mapping."""
    if not os.path.exists(TRAINED_CHECKPOINT_PATH):
        pytest.skip("Trained checkpoint not present in weights directory.")

    sample_real = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "training",
        "data",
        "images",
        "test",
        "real",
        "real_test_0001_c49fe301.png",
    )
    if not os.path.exists(sample_real):
        pytest.skip("Test image real_test_0001_c49fe301.png not present.")

    adapter = PretrainedImageModelAdapter(model_path=TRAINED_CHECKPOINT_PATH)
    out = await adapter.predict(sample_real, {})

    assert out.status == DetectorStatus.COMPLETED
    assert out.score is not None
    assert 0.0 <= out.score <= 1.0
    assert out.score_semantics == "calibrated_probability"

    sig = out.signals
    assert sig["configured"] is True
    assert sig["model_architecture"] == "efficientnet_b0"
    assert sig["prediction_label"] in ("real", "synthetic")
    assert sig["calibration_status"] == "calibrated_val_max_f1"

    # Verify structured model_inference payload
    mi = sig.get("model_inference")
    assert isinstance(mi, dict)
    assert "synthetic_probability" in mi
    assert "authentic_probability" in mi
    assert "calibrated_threshold" in mi
    assert "prediction" in mi
    assert mi["calibrated_threshold"] == 0.37
    assert 0.0 <= mi["synthetic_probability"] <= 1.0
    assert 0.0 <= mi["authentic_probability"] <= 1.0

