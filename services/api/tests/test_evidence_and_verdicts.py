"""Unit and Integration Tests for Shared Multi-Modal Evidence & Verdict Synthesis.

Verifies:
1. Grounded verdict determination across Image, Video, and Audio modalities
2. Strict Zero-Fabrication Mandate: no invented findings or simulated probabilities
3. Structured 'Why this result?' explanation serialization
4. Supporting, conflicting, neutral, and unavailable evidence categorization
5. Video frame-level vs temporal continuity decoupling
6. Video independent audio track analysis handling
7. Audio synthetic speech vs speaker verification boundary enforcement
"""

import pytest
from app.detectors.base import DetectorOutput
from app.detectors.evidence_synthesizer import EvidenceSynthesizer
from app.schemas.common import DetectorStatus
from app.schemas.evidence import VerdictType, EvidenceRelationship


def test_image_evidence_synthesis_ai_generated():
    """Verify high-probability model inference yields LIKELY AI-GENERATED with supporting evidence."""
    forensics = DetectorOutput(
        detector_name="image_forensics_v1",
        detector_version="1.0.0",
        status=DetectorStatus.COMPLETED,
        score=0.45,
        score_semantics="anomaly_index",
        signals={
            "fft_high_freq_ratio": 0.42,
            "fft_grid_spikes": True,
            "ela_block_variance": 14.5,
            "ela_discrepancy_detected": True,
            "laplacian_focus_variance": 38.0,
            "surface_smoothness_anomaly": True,
            "has_exif": False,
        },
    )
    model = DetectorOutput(
        detector_name="image_model_adapter_v1",
        detector_version="1.1.0",
        status=DetectorStatus.COMPLETED,
        score=0.884,
        score_semantics="calibrated_probability",
        signals={
            "model_architecture": "EfficientNet-B0",
            "synthetic_probability": 0.884,
            "calibrated_threshold": 0.370,
            "prediction_label": "synthetic",
        },
    )
    prov = {"status": "no_credentials_found"}

    result = EvidenceSynthesizer.synthesize_image_analysis(
        forensics_output=forensics,
        model_output=model,
        provenance_data=prov,
        filename="test_ai_image.png",
    )

    assert result["verdict"] == VerdictType.LIKELY_AI_GENERATED.value
    assert result["verdict_status"] == "model_confident_synthetic"
    assert len(result["supporting_evidence"]) >= 2
    assert len(result["evidence_records"]) >= 4

    explanation = result["explanation"]
    assert "LIKELY AI-GENERATED" in explanation["summary"]
    assert len(explanation["supporting_points"]) >= 2
    assert "88.4%" in explanation["model_prediction_summary"]


def test_image_evidence_synthesis_authentic():
    """Verify authentic media signals yield LIKELY REAL with conflicting/neutral evidence."""
    forensics = DetectorOutput(
        detector_name="image_forensics_v1",
        detector_version="1.0.0",
        status=DetectorStatus.COMPLETED,
        score=0.08,
        score_semantics="anomaly_index",
        signals={
            "fft_high_freq_ratio": 0.18,
            "fft_grid_spikes": False,
            "ela_block_variance": 4.2,
            "ela_discrepancy_detected": False,
            "laplacian_focus_variance": 185.0,
            "surface_smoothness_anomaly": False,
            "has_exif": True,
            "camera_device": "Sony ILCE-7RM4",
        },
    )
    model = DetectorOutput(
        detector_name="image_model_adapter_v1",
        detector_version="1.1.0",
        status=DetectorStatus.COMPLETED,
        score=0.042,
        score_semantics="calibrated_probability",
        signals={
            "model_architecture": "EfficientNet-B0",
            "synthetic_probability": 0.042,
            "calibrated_threshold": 0.370,
            "prediction_label": "real",
        },
    )
    prov = {"status": "verified"}

    result = EvidenceSynthesizer.synthesize_image_analysis(
        forensics_output=forensics,
        model_output=model,
        provenance_data=prov,
        filename="test_dslr_photo.jpg",
    )

    assert result["verdict"] == VerdictType.LIKELY_REAL.value
    assert result["verdict_status"] == "model_confident_real"
    assert "LIKELY REAL" in result["explanation"]["summary"]


def test_image_evidence_synthesis_unconfigured_model():
    """Verify unconfigured checkpoint results in ANALYSIS UNAVAILABLE without fabricated score."""
    forensics = DetectorOutput(
        detector_name="image_forensics_v1",
        detector_version="1.0.0",
        status=DetectorStatus.COMPLETED,
        score=0.12,
        score_semantics="anomaly_index",
        signals={
            "fft_high_freq_ratio": 0.22,
            "fft_grid_spikes": False,
            "ela_block_variance": 5.1,
            "ela_discrepancy_detected": False,
            "laplacian_focus_variance": 110.0,
            "has_exif": False,
        },
    )
    model = DetectorOutput(
        detector_name="image_model_adapter_v1",
        detector_version="1.1.0",
        status=DetectorStatus.NOT_CONFIGURED,
        score=None,
        score_semantics="not_applicable",
        signals={"configured": False},
    )
    prov = {"status": "no_credentials_found"}

    result = EvidenceSynthesizer.synthesize_image_analysis(
        forensics_output=forensics,
        model_output=model,
        provenance_data=prov,
        filename="unconfigured_sample.png",
    )

    assert result["verdict"] == VerdictType.ANALYSIS_UNAVAILABLE.value
    assert result["verdict_status"] == "model_unconfigured"
    assert len(result["unavailable_evidence"]) >= 1
    assert any("not configured" in p.lower() for p in result["explanation"]["unavailable_points"])


def test_video_evidence_synthesis_with_audio_track():
    """Verify video analysis integrates and reports separate audio track findings."""
    forensics = DetectorOutput(
        detector_name="video_forensics_v1",
        detector_version="1.0.0",
        status=DetectorStatus.COMPLETED,
        score=0.15,
        score_semantics="anomaly_index",
        signals={
            "optical_flow_variance": 1.8,
            "temporal_sharpness_jitter": 0.22,
            "temporal_anomaly_detected": False,
            "sampled_frame_count": 10,
        },
    )
    model = DetectorOutput(
        detector_name="video_model_adapter_v1",
        detector_version="1.1.0",
        status=DetectorStatus.COMPLETED,
        score=0.82,
        score_semantics="calibrated_probability",
        signals={
            "frames_analyzed": 10,
            "anomalous_frames_detected": 8,
            "calibrated_threshold": 0.370,
        },
    )
    prov = {"status": "no_credentials_found"}
    audio_track = {
        "assessment_label": "no_strong_indicators",
        "assessment_score": 0.12,
        "score_semantics": "calibrated_probability",
    }

    result = EvidenceSynthesizer.synthesize_video_analysis(
        forensics_output=forensics,
        model_output=model,
        provenance_data=prov,
        filename="interview_deepfake.mp4",
        audio_track_output=audio_track,
    )

    assert result["verdict"] == VerdictType.LIKELY_AI_GENERATED.value
    # Audio track should be recorded as a distinct evidence record
    aud_recs = [r for r in result["evidence_records"] if "audio" in r["method"].lower()]
    assert len(aud_recs) == 1
    assert aud_recs[0]["source"] == "acoustic_forensic"


def test_audio_evidence_synthesis_unconfigured_model():
    """Verify unconfigured audio spoof detector reports ANALYSIS UNAVAILABLE honestly."""
    forensics = DetectorOutput(
        detector_name="audio_forensics_v1",
        detector_version="1.0.0",
        status=DetectorStatus.COMPLETED,
        score=0.14,
        score_semantics="anomaly_index",
        signals={
            "spectral_flatness": 0.18,
            "crest_factor": 3.4,
            "sharp_vocoder_cutoff": False,
        },
    )
    model = DetectorOutput(
        detector_name="audio_model_adapter_v1",
        detector_version="1.1.0",
        status=DetectorStatus.NOT_CONFIGURED,
        score=None,
        score_semantics="not_applicable",
        signals={"configured": False},
    )
    prov = {"status": "no_credentials_found"}

    result = EvidenceSynthesizer.synthesize_audio_analysis(
        forensics_output=forensics,
        model_output=model,
        provenance_data=prov,
        filename="speech_sample.wav",
    )

    assert result["verdict"] == VerdictType.ANALYSIS_UNAVAILABLE.value
    assert result["verdict_status"] == "audio_model_unconfigured"
    assert len(result["unavailable_evidence"]) >= 1
    assert "not verify speaker" in result["explanation"]["limitations_summary"].lower()
