import os
from typing import Any, Dict, List, Optional

from app.core.logging import logger
from app.detectors.base import BaseDetector, DetectorOutput
from app.schemas.common import DetectorStatus
from .frame_sampler import (
    VideoInspectionError,
    safe_inspect_video_header,
    sample_video_frames,
)
from .frame_analyzer import analyze_sampled_video_frames
from .temporal import compute_temporal_consistency_metrics


class VideoForensicsDetector(BaseDetector):
    """
    Modular Video Forensics & Temporal Consistency Detector.

    Combines:
    1. Deterministic Frame Sampling across bounded duration
    2. Spatial-Frequency Forensics per sampled frame (2D FFT, ELA, Laplacian, channel noise)
    3. OpenCV-based Temporal Continuity Analysis (inter-frame diffs, HSV correlation, scene cuts, optical flow, sharpness jitter)

    Follows the OmniScan Zero-Fabrication Mandate:
    Outputs a calibrated heuristic anomaly index [0.0, 1.0] with score_semantics='anomaly_index'.
    """

    def __init__(self, name: str = "video_forensics_v1", version: str = "1.1.0"):
        super().__init__(name=name, version=version)

    def is_configured(self) -> bool:
        """
        Always configured when OpenCV and standard computer vision modules are installed.
        """
        return True

    async def predict(self, media_path: str, metadata: Dict[str, Any]) -> DetectorOutput:
        """
        Executes video forensic and temporal analysis pipeline.
        """
        try:
            if not os.path.exists(media_path):
                return DetectorOutput(
                    detector_name=self.name,
                    detector_version=self.version,
                    status=DetectorStatus.FAILED,
                    score=None,
                    score_semantics="not_applicable",
                    signals={},
                    limitations=[],
                    error=f"Video file not found at path: {media_path}",
                )

            # 1. Header inspection & resource limit validation
            video_meta = safe_inspect_video_header(media_path)

            # 2. Deterministic frame sampling
            sampled_frames = sample_video_frames(media_path, video_meta)

            # 3. Per-frame forensic analysis
            frame_analysis = analyze_sampled_video_frames(sampled_frames)

            # 4. Temporal consistency analysis
            temporal_analysis = compute_temporal_consistency_metrics(sampled_frames)

            # 5. Evidence-grounded anomaly calculation
            anomaly_signals: List[str] = []
            anomaly_score = 0.0

            if frame_analysis.get("grid_spikes_detected_in_any_frame"):
                anomaly_signals.append(
                    "Periodic frequency domain checkerboard spikes detected in sampled video frames (characteristic of convolutional/generative upsampling)."
                )
                anomaly_score += 0.35

            anom_count = frame_analysis.get("anomalous_frame_count", 0)
            total_f = frame_analysis.get("total_frames_analyzed", 1)
            anom_ratio = anom_count / max(1, total_f)

            if anom_ratio >= 0.25:
                anomaly_signals.append(
                    f"Substantial proportion ({anom_ratio * 100:.1f}%) of sampled frames exhibit statistical generative anomalies."
                )
                anomaly_score += 0.25

            if frame_analysis.get("mean_fft_high_freq_ratio", 0.0) > 0.38:
                anomaly_signals.append(
                    f"Elevated average high-frequency energy ratio ({frame_analysis['mean_fft_high_freq_ratio']:.3f}) across frames."
                )
                anomaly_score += 0.15

            if temporal_analysis.get("temporal_anomaly_detected"):
                for flag in temporal_analysis.get("temporal_anomaly_flags", []):
                    anomaly_signals.append(flag)
                anomaly_score += 0.20

            normalized_anomaly = min(1.0, round(anomaly_score, 3))

            limitations = [
                "Analysis is evaluated on sampled keyframes; inter-frame micro-flicker in non-sampled frames is not measured.",
                "Temporal variations may result from camera motion, lighting shifts, compression artifacts, or editing transitions.",
                "Facial identity tracking and audio-visual lip-synchronization are not configured in this pipeline.",
                "Absence of detectable artifacts does not guarantee video authenticity.",
            ]

            signals = {
                "container": video_meta.container,
                "fourcc": video_meta.fourcc,
                "width": video_meta.width,
                "height": video_meta.height,
                "fps": video_meta.fps,
                "total_frames": video_meta.total_frames,
                "duration_seconds": video_meta.duration_seconds,
                "sampled_frame_count": len(sampled_frames),
                "anomalous_frame_count": anom_count,
                "anomalous_frame_indices": frame_analysis.get("anomalous_frame_indices", []),
                "mean_fft_high_freq_ratio": frame_analysis.get("mean_fft_high_freq_ratio", 0.0),
                "mean_ela_block_variance": frame_analysis.get("mean_ela_block_variance", 0.0),
                "grid_spikes_detected": frame_analysis.get("grid_spikes_detected_in_any_frame", False),
                "mean_frame_difference": temporal_analysis.get("mean_frame_difference", 0.0),
                "max_frame_difference": temporal_analysis.get("max_frame_difference", 0.0),
                "mean_histogram_correlation": temporal_analysis.get("mean_histogram_correlation", 1.0),
                "scene_cut_count": temporal_analysis.get("scene_cut_count", 0),
                "scene_cut_timestamps": temporal_analysis.get("scene_cut_timestamps", []),
                "mean_optical_flow_magnitude": temporal_analysis.get("mean_optical_flow_magnitude", 0.0),
                "optical_flow_variance": temporal_analysis.get("optical_flow_variance", 0.0),
                "temporal_sharpness_jitter": temporal_analysis.get("temporal_sharpness_jitter", 0.0),
                "temporal_anomaly_detected": temporal_analysis.get("temporal_anomaly_detected", False),
                "anomaly_indicators": anomaly_signals,
                "frame_breakdown": frame_analysis.get("frame_breakdown", []),
            }

            return DetectorOutput(
                detector_name=self.name,
                detector_version=self.version,
                status=DetectorStatus.COMPLETED,
                score=normalized_anomaly,
                score_semantics="anomaly_index",
                signals=signals,
                limitations=limitations,
                error=None,
            )

        except VideoInspectionError as e:
            logger.warning(f"Video inspection validation error for {media_path}: {e}")
            return DetectorOutput(
                detector_name=self.name,
                detector_version=self.version,
                status=DetectorStatus.FAILED,
                score=None,
                score_semantics="not_applicable",
                signals={},
                limitations=[
                    "Video decoding or security boundary enforcement failed.",
                    "File may be corrupt, truncated, unsupported, or exceed configured limits.",
                ],
                error=str(e),
            )
        except Exception as e:
            logger.error(f"Unexpected error in VideoForensicsDetector: {e}", exc_info=True)
            return DetectorOutput(
                detector_name=self.name,
                detector_version=self.version,
                status=DetectorStatus.FAILED,
                score=None,
                score_semantics="not_applicable",
                signals={},
                limitations=["An unhandled runtime error occurred during video analysis."],
                error=f"Video analysis execution failure: {str(e)}",
            )
