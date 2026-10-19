import io
import pytest
import numpy as np
from PIL import Image

from app.core.config import settings
from app.detectors.image.detector import ImageForensicsDetector
from app.detectors.image.forensics import (
    ImageForensicExtractionError,
    compute_2d_fft_spectrum,
    compute_cv_edge_and_noise_signals,
    compute_error_level_analysis,
    extract_full_image_forensics,
    extract_metadata_forensics,
    safe_open_image,
)
from app.detectors.image.model_adapter import PretrainedImageModelAdapter
from app.detectors.image.service import ImageAnalysisService
from app.schemas.common import DetectorStatus


def _create_sample_png(width=128, height=128, color=(100, 150, 200)) -> bytes:
    img = Image.new("RGB", (width, height), color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _create_sample_jpeg(width=128, height=128) -> bytes:
    # Create image with texture to evaluate ELA and FFT
    arr = np.zeros((height, width, 3), dtype=np.uint8)
    arr[:, :] = [120, 140, 160]
    # Add a rectangle
    arr[30:70, 30:70] = [220, 40, 40]
    img = Image.fromarray(arr, "RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def _create_grid_artifact_image(width=128, height=128) -> bytes:
    # High frequency checkerboard pattern to trigger FFT periodic grid detection
    arr = np.zeros((height, width), dtype=np.uint8)
    arr[::4, :] = 255
    arr[:, ::4] = 255
    img = Image.fromarray(arr, "L")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# -------------------------------------------------------------
# Unit Tests: Feature Extraction & Safety Boundaries
# -------------------------------------------------------------

def test_safe_open_image_valid_formats():
    """Verify PNG, JPEG and WEBP format decoding."""
    png_bytes = _create_sample_png(64, 64)
    img_png, fmt_png = safe_open_image(png_bytes)
    assert fmt_png == "PNG"
    assert img_png.size == (64, 64)

    jpg_bytes = _create_sample_jpeg(64, 64)
    img_jpg, fmt_jpg = safe_open_image(jpg_bytes)
    assert fmt_jpg == "JPEG"
    assert img_jpg.size == (64, 64)


def test_safe_open_image_corrupt_rejected():
    """Verify corrupt or truncated media bytes raise ImageForensicExtractionError."""
    corrupt_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDRcorruptedcontent"
    with pytest.raises(ImageForensicExtractionError) as exc_info:
        safe_open_image(corrupt_bytes)
    assert "corrupt or unsupported" in str(exc_info.value).lower()


def test_safe_open_image_empty_rejected():
    """Verify empty byte payload is safely rejected."""
    with pytest.raises(ImageForensicExtractionError) as exc_info:
        safe_open_image(b"")
    assert "empty" in str(exc_info.value).lower()


def test_safe_open_image_dimension_limits():
    """Verify oversized image dimension limit is enforced."""
    # Create tiny payload that pretends to have illegal dimensions
    img = Image.new("RGB", (100, 100), (0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    valid_bytes = buf.getvalue()

    # Temporarily set max dimension to 50 for boundary testing
    original_limit = settings.IMAGE_MAX_DIMENSION
    try:
        settings.IMAGE_MAX_DIMENSION = 50
        with pytest.raises(ImageForensicExtractionError) as exc_info:
            safe_open_image(valid_bytes)
        assert "exceed maximum allowed boundary" in str(exc_info.value)
    finally:
        settings.IMAGE_MAX_DIMENSION = original_limit


def test_2d_fft_spectrum_extraction():
    """Verify 2D FFT extraction on standard and checkerboard patterns."""
    std_img = Image.new("RGB", (128, 128), (120, 120, 120))
    std_fft = compute_2d_fft_spectrum(std_img)
    assert std_fft["computed"] is True
    assert "high_frequency_ratio" in std_fft
    assert std_fft["grid_spikes_detected"] is False

    # Periodic checkerboard image should exhibit strong spectral peaks
    grid_bytes = _create_grid_artifact_image(128, 128)
    grid_img, _ = safe_open_image(grid_bytes)
    grid_fft = compute_2d_fft_spectrum(grid_img)
    assert grid_fft["computed"] is True
    assert grid_fft["peak_frequency_z_score"] > 2.0


def test_error_level_analysis():
    """Verify ELA on lossy JPEG vs lossless PNG."""
    jpg_bytes = _create_sample_jpeg(128, 128)
    jpg_img, _ = safe_open_image(jpg_bytes)
    jpg_ela = compute_error_level_analysis(jpg_img, "JPEG", resave_quality=90)
    assert jpg_ela["applicable"] is True
    assert "mean_error" in jpg_ela
    assert "block_variance" in jpg_ela

    png_bytes = _create_sample_png(64, 64)
    png_img, _ = safe_open_image(png_bytes)
    png_ela = compute_error_level_analysis(png_img, "PNG")
    assert jpg_ela["applicable"] is True
    assert png_ela["applicable"] is False


def test_cv_edge_and_noise_signals():
    """Verify Laplacian focus and residual noise variance computation."""
    img = Image.new("RGB", (64, 64), (100, 100, 100))
    cv_signals = compute_cv_edge_and_noise_signals(img)
    assert "laplacian_variance" in cv_signals
    assert "average_noise_level" in cv_signals
    assert "channel_noise_variance" in cv_signals
    assert cv_signals["laplacian_variance"] >= 0.0


def test_metadata_extraction_privacy():
    """Verify EXIF extraction excludes sensitive personal telemetry."""
    img = Image.new("RGB", (64, 64), (50, 50, 50))
    meta = extract_metadata_forensics(img)
    assert "dimensions" in meta
    assert meta["dimensions"]["width"] == 64
    assert meta["dimensions"]["height"] == 64
    assert "gps" not in meta
    assert "device_serial" not in meta


# -------------------------------------------------------------
# Unit Tests: Model Adapter
# -------------------------------------------------------------

def test_model_adapter_unconfigured_behavior():
    """Verify PretrainedImageModelAdapter honestly returns NOT_CONFIGURED when weights missing."""
    adapter = PretrainedImageModelAdapter(model_path=None)
    assert adapter.is_configured() is False


@pytest.mark.asyncio
async def test_model_adapter_unconfigured_predict(tmp_path):
    """Verify predict on unconfigured model produces score=None and zero fabricated metrics."""
    test_file = tmp_path / "test.png"
    test_file.write_bytes(_create_sample_png(64, 64))

    adapter = PretrainedImageModelAdapter(model_path="nonexistent_weights.onnx")
    output = await adapter.predict(str(test_file), {})
    assert output.status == DetectorStatus.NOT_CONFIGURED
    assert output.score is None
    assert output.score_semantics == "not_applicable"
    assert len(output.limitations) > 0


# -------------------------------------------------------------
# End-to-End Orchestration & API Integration Tests
# -------------------------------------------------------------

def test_end_to_end_image_analysis_orchestration(client):
    """
    Test full Milestone 4 workflow:
    1. Upload valid image asset.
    2. Dispatch analysis.
    3. Background worker executes ImageAnalysisService with real CV & FFT algorithms.
    4. Polling GET /api/v1/analyses/{analysis_id} returns COMPLETED status with real signals.
    5. Verify printable forensic report is populated with grounded evidence.
    """
    # 1. Upload
    jpg_bytes = _create_sample_jpeg(128, 128)
    upload_res = client.post(
        "/api/v1/uploads",
        files={"file": ("evidence_camera.jpg", io.BytesIO(jpg_bytes), "image/jpeg")},
    )
    assert upload_res.status_code == 201
    upload_id = upload_res.json()["upload_id"]

    # 2. Dispatch analysis
    create_res = client.post("/api/v1/analyses", json={"upload_id": upload_id})
    assert create_res.status_code == 202
    analysis_id = create_res.json()["analysis_id"]

    # 3. Poll analysis detail (in Starlette TestClient background tasks run synchronously)
    detail_res = client.get(f"/api/v1/analyses/{analysis_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()

    # Status must be COMPLETED for supported image
    assert detail["status"] == "completed"
    assert detail["assessment_label"] in ("suspicious", "no_strong_indicators", "inconclusive")
    assert detail["score_semantics"] == "anomaly_index"
    assert detail["assessment_score"] is not None
    assert 0.0 <= detail["assessment_score"] <= 1.0

    # Ensure detector results contain both image_forensics_v1 and image_model_adapter_v1
    detector_names = [d["detector_name"] for d in detail["detector_results"]]
    assert "image_forensics_v1" in detector_names
    assert "image_model_adapter_v1" in detector_names

    forensics_det = next(d for d in detail["detector_results"] if d["detector_name"] == "image_forensics_v1")
    assert forensics_det["status"] == "completed"
    assert "fft_high_freq_ratio" in forensics_det["signals"]
    assert "ela_mean_residual" in forensics_det["signals"]
    assert "laplacian_focus_variance" in forensics_det["signals"]

    # Model adapter must be honestly marked not_configured
    model_det = next(d for d in detail["detector_results"] if d["detector_name"] == "image_model_adapter_v1")
    assert model_det["status"] == "not_configured"
    assert model_det["score"] is None

    # Check printable forensic report
    report_res = client.get(f"/api/v1/analyses/{analysis_id}/report")
    assert report_res.status_code == 200
    report = report_res.json()
    assert report["analysis_id"] == analysis_id
    assert len(report["evidence_points"]) >= 2
    assert len(report["limitations_and_uncertainty"]) >= 1


def test_corrupt_image_orchestration_handling(client):
    """Verify submitting a corrupt image fails gracefully in the orchestrator without crashing."""
    corrupt_png = b"\x89PNG\r\n\x1a\nCorruptPayloadNotAnImage"
    upload_res = client.post(
        "/api/v1/uploads",
        files={"file": ("corrupt.png", io.BytesIO(corrupt_png), "image/png")},
    )
    assert upload_res.status_code == 201
    upload_id = upload_res.json()["upload_id"]

    create_res = client.post("/api/v1/analyses", json={"upload_id": upload_id})
    assert create_res.status_code == 202
    analysis_id = create_res.json()["analysis_id"]

    detail_res = client.get(f"/api/v1/analyses/{analysis_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()

    # Corrupt stream must be safely caught and marked FAILED
    assert detail["status"] == "failed"
    assert "failed" in detail["summary"].lower()
