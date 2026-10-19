import io
import os
import tempfile
import cv2
import numpy as np
import pytest

from app.core.config import settings
from app.detectors.video.frame_sampler import (
    SampledFrame,
    VideoInspectionError,
    VideoMetadata,
    safe_inspect_video_header,
    sample_video_frames,
)
from app.detectors.video.frame_analyzer import analyze_sampled_video_frames
from app.detectors.video.temporal import compute_temporal_consistency_metrics
from app.detectors.video.model_adapter import PretrainedVideoModelAdapter
from app.detectors.video.detector import VideoForensicsDetector
from app.detectors.video.service import VideoAnalysisService
from app.schemas.common import DetectorStatus


def create_synthetic_test_video(
    duration_sec: float = 2.0,
    fps: float = 10.0,
    width: int = 160,
    height: int = 120,
    add_scene_cut: bool = False,
) -> bytes:
    """Helper to generate a small, valid, self-contained MP4 file in memory."""
    total_frames = max(2, int(duration_sec * fps))
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(tmp_path, fourcc, fps, (width, height))
        for i in range(total_frames):
            if add_scene_cut and i >= total_frames // 2:
                frame = np.full((height, width, 3), (230, 30, 40), dtype=np.uint8)
            else:
                val = int((i / max(1, total_frames)) * 180)
                frame = np.full((height, width, 3), (val, 120, 80), dtype=np.uint8)
            out.write(frame)
        out.release()

        with open(tmp_path, "rb") as f:
            return f.read()
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def test_safe_inspect_video_header_valid():
    """Verify video container inspection extracts correct metadata."""
    video_bytes = create_synthetic_test_video(duration_sec=2.0, fps=10.0, width=160, height=120)
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    try:
        meta = safe_inspect_video_header(tmp_path)
        assert meta.width == 160
        assert meta.height == 120
        assert meta.fps == 10.0
        assert meta.total_frames == 20
        assert meta.duration_seconds >= 1.9
        assert meta.duration_ms >= 1900
        assert meta.container == "mp4"
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def test_safe_inspect_video_corrupt_rejected():
    """Verify truncated or corrupt video is rejected with VideoInspectionError."""
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(b"\x00\x00\x00\x18ftypmp42corruptdata")
        tmp_path = tmp.name

    try:
        with pytest.raises(VideoInspectionError) as exc_info:
            safe_inspect_video_header(tmp_path)
        assert "container" in str(exc_info.value).lower() or "dimensions" in str(exc_info.value).lower()
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def test_safe_inspect_video_empty_rejected():
    """Verify empty video file (0 bytes) is rejected."""
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        with pytest.raises(VideoInspectionError) as exc_info:
            safe_inspect_video_header(tmp_path)
        assert "empty" in str(exc_info.value).lower()
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def test_safe_inspect_video_duration_boundaries(monkeypatch):
    """Verify minimum and maximum video duration bounds are strictly enforced."""
    video_bytes = create_synthetic_test_video(duration_sec=2.0, fps=10.0)
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    try:
        # Enforce max duration lower than 2s
        monkeypatch.setattr(settings, "VIDEO_MAX_DURATION_SECONDS", 1)
        with pytest.raises(VideoInspectionError) as exc_info:
            safe_inspect_video_header(tmp_path)
        assert "exceeds maximum allowed limit" in str(exc_info.value)

        # Enforce min duration higher than 2s
        monkeypatch.setattr(settings, "VIDEO_MAX_DURATION_SECONDS", 60)
        monkeypatch.setattr(settings, "VIDEO_MIN_DURATION_SECONDS", 5.0)
        with pytest.raises(VideoInspectionError) as exc_info:
            safe_inspect_video_header(tmp_path)
        assert "shorter than minimum allowed" in str(exc_info.value)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def test_deterministic_frame_sampling():
    """Verify deterministic frame sampling yields correct count and valid timestamps."""
    video_bytes = create_synthetic_test_video(duration_sec=3.0, fps=10.0, width=160, height=120)
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    try:
        meta = safe_inspect_video_header(tmp_path)
        samples = sample_video_frames(tmp_path, meta, max_frames=5)
        assert len(samples) >= 2
        assert len(samples) <= 5

        # Check monotonically increasing timestamps
        timestamps = [s[0].timestamp_seconds for s in samples]
        assert timestamps == sorted(timestamps)
        assert timestamps[0] == 0.0

        # Check valid PNG bytes for each frame
        for s_meta, png_bytes in samples:
            assert png_bytes.startswith(b"\x89PNG")
            assert s_meta.width == 160
            assert s_meta.height == 120
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def test_opencv_temporal_consistency_metrics():
    """Verify OpenCV temporal metrics compute inter-frame differences and scene cuts."""
    # Video with an abrupt scene cut in the middle
    video_bytes = create_synthetic_test_video(duration_sec=2.0, fps=10.0, add_scene_cut=True)
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    try:
        meta = safe_inspect_video_header(tmp_path)
        samples = sample_video_frames(tmp_path, meta, max_frames=6)
        temporal = compute_temporal_consistency_metrics(samples)

        assert "mean_frame_difference" in temporal
        assert "mean_histogram_correlation" in temporal
        assert "scene_cut_count" in temporal
        assert "mean_optical_flow_magnitude" in temporal
        assert "temporal_sharpness_jitter" in temporal
        assert len(temporal["limitations"]) > 0
        assert temporal["sampled_transitions"] == len(samples) - 1
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def test_per_frame_image_forensics_reuse():
    """Verify per-frame forensic analyzer reuses image forensics (FFT, ELA, Laplacian)."""
    video_bytes = create_synthetic_test_video(duration_sec=1.0, fps=10.0)
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    try:
        meta = safe_inspect_video_header(tmp_path)
        samples = sample_video_frames(tmp_path, meta, max_frames=3)
        frame_res = analyze_sampled_video_frames(samples)

        assert frame_res["total_frames_analyzed"] == len(samples)
        assert "mean_fft_high_freq_ratio" in frame_res
        assert "mean_ela_block_variance" in frame_res
        assert isinstance(frame_res["frame_breakdown"], list)

        first_frame = frame_res["frame_breakdown"][0]
        assert "fft_high_freq_ratio" in first_frame
        assert "ela_block_variance" in first_frame
        assert "laplacian_focus_variance" in first_frame
        assert "timestamp_seconds" in first_frame
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def test_video_model_adapter_unconfigured_behavior():
    """Verify PretrainedVideoModelAdapter returns status='not_configured' and score=None."""
    adapter = PretrainedVideoModelAdapter()
    assert adapter.name == "vivit_deepfake_detector_v1"
    assert not adapter.is_configured()


@pytest.mark.asyncio
async def test_video_model_adapter_unconfigured_predict():
    """Verify predict returns DetectorOutput with score=None and zero fabricated scores."""
    adapter = PretrainedVideoModelAdapter()
    res = await adapter.predict("/non/existent/path.mp4", {})
    assert res.status == DetectorStatus.NOT_CONFIGURED
    assert res.score is None
    assert res.score_semantics == "not_applicable"
    assert res.signals["configured"] is False


@pytest.mark.asyncio
async def test_video_forensics_detector_end_to_end():
    """Verify VideoForensicsDetector executes full pipeline on valid synthetic video."""
    video_bytes = create_synthetic_test_video(duration_sec=2.0, fps=10.0)
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    try:
        detector = VideoForensicsDetector()
        assert detector.is_configured()

        output = await detector.predict(tmp_path, {"filename": "test.mp4"})
        assert output.status == DetectorStatus.COMPLETED
        assert output.score_semantics == "anomaly_index"
        assert 0.0 <= output.score <= 1.0
        assert "sampled_frame_count" in output.signals
        assert output.signals["sampled_frame_count"] >= 2
        assert "mean_frame_difference" in output.signals
        assert "mean_fft_high_freq_ratio" in output.signals
        assert len(output.limitations) > 0
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@pytest.mark.asyncio
async def test_video_analysis_service_orchestration():
    """Verify VideoAnalysisService manages temp files, provenance, and grounded summaries."""
    video_bytes = create_synthetic_test_video(duration_sec=2.0, fps=10.0)
    service = VideoAnalysisService()

    result = await service.analyze_video_bytes(
        video_bytes=video_bytes,
        original_filename="orchestration_test.mp4",
        sha256="1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    )

    assert result["assessment_label"] in ["no_strong_indicators", "inconclusive", "suspicious"]
    assert result["score_semantics"] == "anomaly_index"
    assert result["duration_ms"] is not None
    assert result["width"] == 160
    assert result["height"] == 120
    assert len(result["detector_results"]) == 2
    assert "summary" in result
    assert "provenance" in result


def test_video_orchestration_full_lifecycle(client):
    """Verify end-to-end video upload, analysis creation, execution, and polling."""
    video_bytes = create_synthetic_test_video(duration_sec=2.0, fps=10.0, width=160, height=120)

    # 1. Upload valid video
    upload_res = client.post(
        "/api/v1/uploads",
        files={"file": ("live_video.mp4", io.BytesIO(video_bytes), "video/mp4")},
    )
    assert upload_res.status_code == 201
    upload_data = upload_res.json()
    upload_id = upload_data["upload_id"]
    assert upload_data["media_type"] == "video"

    # 2. Dispatch analysis
    create_res = client.post(
        "/api/v1/analyses",
        json={"upload_id": upload_id},
    )
    assert create_res.status_code == 202
    analysis_id = create_res.json()["analysis_id"]

    # 3. Poll analysis detail
    detail_res = client.get(f"/api/v1/analyses/{analysis_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()

    assert detail["status"] == "completed"
    assert detail["assessment_label"] in ["no_strong_indicators", "inconclusive", "suspicious"]
    assert detail["score_semantics"] == "anomaly_index"
    assert detail["upload"]["duration_ms"] is not None
    assert detail["upload"]["width"] == 160
    assert detail["upload"]["height"] == 120
    assert len(detail["detector_results"]) == 2
    assert detail["detector_results"][0]["detector_name"] == "video_forensics_v1"
    assert detail["detector_results"][1]["status"] == "not_configured"
