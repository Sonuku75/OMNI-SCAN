import io
import wave
import pytest
import numpy as np

from app.core.config import settings
from app.detectors.audio.detector import AudioForensicsDetector
from app.detectors.audio.forensics import (
    AudioForensicExtractionError,
    compute_spectral_features,
    compute_waveform_metrics,
    extract_full_audio_forensics,
    safe_decode_audio,
)
from app.detectors.audio.model_adapter import PretrainedAudioModelAdapter
from app.detectors.audio.service import AudioAnalysisService
from app.schemas.common import DetectorStatus


def _create_sample_wav(
    duration: float = 1.0,
    sample_rate: int = 16000,
    frequency: float = 440.0,
    channels: int = 1,
    amplitude: float = 0.5,
) -> bytes:
    """Generate a clean synthetic WAV audio fixture."""
    num_samples = int(sample_rate * duration)
    t = np.linspace(0, duration, num_samples, endpoint=False)
    samples = amplitude * np.sin(2 * np.pi * frequency * t)
    int16_samples = (samples * 32767).astype(np.int16)

    if channels == 2:
        stereo = np.column_stack((int16_samples, int16_samples)).flatten()
        raw_bytes = stereo.tobytes()
    else:
        raw_bytes = int16_samples.tobytes()

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(raw_bytes)
    return buf.getvalue()


def _create_bandlimited_audio(sample_rate: int = 32000, duration: float = 1.0) -> bytes:
    """
    Generate audio with high sample-rate but severe low-frequency cutoff (simulating vocoder ceiling).
    """
    num_samples = int(sample_rate * duration)
    t = np.linspace(0, duration, num_samples, endpoint=False)
    # Low frequency sine waves only (e.g. 500 Hz + 1000 Hz)
    samples = 0.4 * np.sin(2 * np.pi * 500 * t) + 0.3 * np.sin(2 * np.pi * 1000 * t)
    int16_samples = (samples * 32767).astype(np.int16)

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(int16_samples.tobytes())
    return buf.getvalue()


# -------------------------------------------------------------
# Unit Tests: Audio Decoding & Boundary Checks
# -------------------------------------------------------------

def test_safe_decode_audio_valid_mono_and_stereo():
    """Verify safe decoding of mono and stereo WAV audio."""
    mono_bytes = _create_sample_wav(duration=1.0, channels=1, sample_rate=16000)
    samples, sr, dur, meta = safe_decode_audio(mono_bytes)
    assert sr == 16000
    assert 0.99 <= dur <= 1.01
    assert meta["channels"] == 1
    assert len(samples) == 16000

    stereo_bytes = _create_sample_wav(duration=0.5, channels=2, sample_rate=22050)
    samples_st, sr_st, dur_st, meta_st = safe_decode_audio(stereo_bytes)
    assert sr_st == 22050
    assert meta_st["channels"] == 2
    assert len(samples_st) == int(0.5 * 22050)


def test_safe_decode_audio_corrupt_rejected():
    """Verify corrupt or truncated audio stream raises AudioForensicExtractionError."""
    corrupt_bytes = b"RIFF$\x00\x00\x00WAVEfmt CorruptedPayload"
    with pytest.raises(AudioForensicExtractionError) as exc_info:
        safe_decode_audio(corrupt_bytes)
    assert "corrupt or malformed" in str(exc_info.value).lower() or "truncated" in str(exc_info.value).lower()


def test_safe_decode_audio_empty_rejected():
    """Verify empty payload is rejected safely."""
    with pytest.raises(AudioForensicExtractionError) as exc_info:
        safe_decode_audio(b"")
    assert "empty" in str(exc_info.value).lower()


def test_safe_decode_audio_duration_boundaries():
    """Verify minimum and maximum duration constraints."""
    # Too short (< 0.1s)
    short_bytes = _create_sample_wav(duration=0.05, sample_rate=16000)
    with pytest.raises(AudioForensicExtractionError) as exc_info:
        safe_decode_audio(short_bytes)
    assert "too short" in str(exc_info.value)

    # Exceeds max duration limit
    orig_max = settings.AUDIO_MAX_DURATION_SECONDS
    try:
        settings.AUDIO_MAX_DURATION_SECONDS = 2  # temporarily 2 seconds
        long_bytes = _create_sample_wav(duration=3.0, sample_rate=16000)
        with pytest.raises(AudioForensicExtractionError) as exc_info:
            safe_decode_audio(long_bytes)
        assert "exceeds maximum allowed limit" in str(exc_info.value)
    finally:
        settings.AUDIO_MAX_DURATION_SECONDS = orig_max


# -------------------------------------------------------------
# Unit Tests: Acoustic & Spectrogram Feature Extraction
# -------------------------------------------------------------

def test_waveform_metrics_computation():
    """Verify waveform metrics (RMS, peak, crest factor, clipping, silence)."""
    wav_bytes = _create_sample_wav(duration=1.0, amplitude=0.8, frequency=440.0)
    samples, sr, _, _ = safe_decode_audio(wav_bytes)
    metrics = compute_waveform_metrics(samples, sr)

    assert "peak_amplitude" in metrics
    assert "rms_energy" in metrics
    assert "crest_factor" in metrics
    assert "clipping_ratio" in metrics
    assert "silence_ratio" in metrics
    assert 0.75 <= metrics["peak_amplitude"] <= 0.85
    assert metrics["crest_factor"] > 1.0
    assert metrics["clipping_ratio"] == 0.0


def test_spectral_features_computation():
    """Verify STFT spectrogram spectral feature extraction."""
    wav_bytes = _create_sample_wav(duration=1.0, sample_rate=16000, frequency=1000.0)
    samples, sr, _, _ = safe_decode_audio(wav_bytes)
    spectral = compute_spectral_features(samples, sr)

    assert spectral["computed"] is True
    assert "spectral_centroid_hz" in spectral
    assert "spectral_rolloff_hz" in spectral
    assert "spectral_flatness" in spectral
    assert spectral["spectral_centroid_hz"] > 0
    assert spectral["spectral_rolloff_hz"] > 0


def test_vocoder_cutoff_detection():
    """Verify bandlimited audio triggers the neural vocoder cutoff heuristic."""
    bandlimited_bytes = _create_bandlimited_audio(sample_rate=32000, duration=1.0)
    samples, sr, _, _ = safe_decode_audio(bandlimited_bytes)
    spectral = compute_spectral_features(samples, sr)

    assert spectral["computed"] is True
    assert spectral["sharp_vocoder_cutoff_detected"] is True
    assert "vocoder" in spectral["interpretation"].lower()


# -------------------------------------------------------------
# Unit Tests: Pretrained Audio Model Adapter
# -------------------------------------------------------------

def test_audio_model_adapter_unconfigured_behavior():
    """Verify PretrainedAudioModelAdapter honestly reports NOT_CONFIGURED when weights unset."""
    adapter = PretrainedAudioModelAdapter(model_path=None)
    assert adapter.is_configured() is False


@pytest.mark.asyncio
async def test_audio_model_adapter_unconfigured_predict(tmp_path):
    """Verify predict on unconfigured model produces score=None and zero mock predictions."""
    test_wav = tmp_path / "test.wav"
    test_wav.write_bytes(_create_sample_wav(duration=0.5))

    adapter = PretrainedAudioModelAdapter(model_path="nonexistent_aasist.onnx")
    output = await adapter.predict(str(test_wav), {})
    assert output.status == DetectorStatus.NOT_CONFIGURED
    assert output.score is None
    assert output.score_semantics == "not_applicable"
    assert len(output.limitations) > 0


# -------------------------------------------------------------
# End-to-End Orchestration & API Integration Tests
# -------------------------------------------------------------

def test_end_to_end_audio_analysis_orchestration(client):
    """
    Test full Milestone 5 audio forensics workflow:
    1. Upload valid WAV audio asset.
    2. Dispatch analysis.
    3. Background worker executes AudioAnalysisService.
    4. Polling GET /api/v1/analyses/{analysis_id} returns COMPLETED status with real acoustic signals.
    5. Duration ms is populated on the upload record.
    6. Verify printable forensic report includes acoustic findings.
    """
    wav_bytes = _create_sample_wav(duration=1.5, sample_rate=16000, frequency=440.0)
    upload_res = client.post(
        "/api/v1/uploads",
        files={"file": ("speech_sample.wav", io.BytesIO(wav_bytes), "audio/wav")},
    )
    assert upload_res.status_code == 201
    upload_id = upload_res.json()["upload_id"]

    create_res = client.post("/api/v1/analyses", json={"upload_id": upload_id})
    assert create_res.status_code == 202
    analysis_id = create_res.json()["analysis_id"]

    detail_res = client.get(f"/api/v1/analyses/{analysis_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()

    assert detail["status"] == "completed"
    assert detail["assessment_label"] in ("suspicious", "no_strong_indicators", "inconclusive")
    assert detail["score_semantics"] == "anomaly_index"
    assert detail["assessment_score"] is not None
    assert 0.0 <= detail["assessment_score"] <= 1.0

    # Ensure duration_ms was populated
    assert detail["upload"]["duration_ms"] is not None
    assert 1400 <= detail["upload"]["duration_ms"] <= 1600

    # Verify detector results
    names = [d["detector_name"] for d in detail["detector_results"]]
    assert "audio_forensics_v1" in names
    assert "audio_model_adapter_v1" in names

    audio_det = next(d for d in detail["detector_results"] if d["detector_name"] == "audio_forensics_v1")
    assert audio_det["status"] == "completed"
    assert "spectral_centroid_hz" in audio_det["signals"]
    assert "crest_factor" in audio_det["signals"]
    assert "rms_energy" in audio_det["signals"]

    # Model adapter must be honestly marked not_configured
    model_det = next(d for d in detail["detector_results"] if d["detector_name"] == "audio_model_adapter_v1")
    assert model_det["status"] == "not_configured"
    assert model_det["score"] is None

    # Check printable forensic report
    report_res = client.get(f"/api/v1/analyses/{analysis_id}/report")
    assert report_res.status_code == 200
    report = report_res.json()
    assert report["analysis_id"] == analysis_id
    assert len(report["evidence_points"]) >= 2


def test_corrupt_audio_orchestration_handling(client):
    """Verify corrupt audio payload fails gracefully in the orchestrator without crashing."""
    corrupt_wav = b"RIFF$\x00\x00\x00WAVEfmt CorruptStreamWithoutValidChunks"
    upload_res = client.post(
        "/api/v1/uploads",
        files={"file": ("corrupt_speech.wav", io.BytesIO(corrupt_wav), "audio/wav")},
    )
    assert upload_res.status_code == 201
    upload_id = upload_res.json()["upload_id"]

    create_res = client.post("/api/v1/analyses", json={"upload_id": upload_id})
    assert create_res.status_code == 202
    analysis_id = create_res.json()["analysis_id"]

    detail_res = client.get(f"/api/v1/analyses/{analysis_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()

    assert detail["status"] == "failed"
    assert "failed" in detail["summary"].lower()
