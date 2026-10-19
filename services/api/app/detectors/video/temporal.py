import cv2
import numpy as np
from typing import Any, Dict, List, Tuple
from app.core.logging import logger
from .frame_sampler import SampledFrame


def compute_temporal_consistency_metrics(
    sampled_frames: List[Tuple[SampledFrame, bytes]]
) -> Dict[str, Any]:
    """
    Evaluates temporal consistency and transition continuity across consecutive sampled frames.
    Uses bounded OpenCV algorithms (histogram correlation, normalized frame differencing,
    Laplacian sharpness variance, and Farneback optical flow).
    """
    if len(sampled_frames) < 2:
        return {
            "sampled_transitions": 0,
            "mean_frame_difference": 0.0,
            "max_frame_difference": 0.0,
            "mean_histogram_correlation": 1.0,
            "scene_cut_count": 0,
            "scene_cut_timestamps": [],
            "mean_optical_flow_magnitude": 0.0,
            "optical_flow_variance": 0.0,
            "temporal_sharpness_jitter": 0.0,
            "temporal_anomaly_detected": False,
            "temporal_anomaly_flags": [],
            "limitations": [
                "Less than 2 frames sampled; temporal consistency could not be evaluated."
            ],
        }

    # Decode and prepare downsampled representations for fast, bounded analysis
    processed_frames: List[Tuple[SampledFrame, np.ndarray, np.ndarray, float]] = []

    for meta, png_bytes in sampled_frames:
        buf = np.frombuffer(png_bytes, dtype=np.uint8)
        bgr = cv2.imdecode(buf, cv2.IMREAD_COLOR)
        if bgr is None:
            continue
        # Standardize working resolution to 320x240 for uniform comparison
        std_bgr = cv2.resize(bgr, (320, 240), interpolation=cv2.INTER_AREA)
        gray = cv2.cvtColor(std_bgr, cv2.COLOR_BGR2GRAY)
        lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        processed_frames.append((meta, std_bgr, gray, lap_var))

    if len(processed_frames) < 2:
        return {
            "sampled_transitions": 0,
            "mean_frame_difference": 0.0,
            "max_frame_difference": 0.0,
            "mean_histogram_correlation": 1.0,
            "scene_cut_count": 0,
            "scene_cut_timestamps": [],
            "mean_optical_flow_magnitude": 0.0,
            "optical_flow_variance": 0.0,
            "temporal_sharpness_jitter": 0.0,
            "temporal_anomaly_detected": False,
            "temporal_anomaly_flags": [],
            "limitations": [
                "Insufficient valid decoded frames for temporal consistency analysis."
            ],
        }

    frame_diffs: List[float] = []
    hist_corrs: List[float] = []
    flow_mags: List[float] = []
    flow_vars: List[float] = []
    sharpness_jitters: List[float] = []
    scene_cuts: List[float] = []

    for i in range(len(processed_frames) - 1):
        meta_prev, bgr_prev, gray_prev, lap_prev = processed_frames[i]
        meta_curr, bgr_curr, gray_curr, lap_curr = processed_frames[i + 1]

        # 1. Normalized Mean Absolute Difference
        diff = cv2.absdiff(gray_curr, gray_prev)
        diff_val = float(np.mean(diff) / 255.0)
        frame_diffs.append(diff_val)

        # 2. Color Histogram Correlation (HSV)
        hsv_prev = cv2.cvtColor(bgr_prev, cv2.COLOR_BGR2HSV)
        hsv_curr = cv2.cvtColor(bgr_curr, cv2.COLOR_BGR2HSV)
        hist_prev = cv2.calcHist([hsv_prev], [0, 1], None, [16, 16], [0, 180, 0, 256])
        hist_curr = cv2.calcHist([hsv_curr], [0, 1], None, [16, 16], [0, 180, 0, 256])
        cv2.normalize(hist_prev, hist_prev, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
        cv2.normalize(hist_curr, hist_curr, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
        corr = float(cv2.compareHist(hist_prev, hist_curr, cv2.HISTCMP_CORREL))
        # Clamp correlation to [-1.0, 1.0]
        corr = max(-1.0, min(1.0, corr))
        hist_corrs.append(corr)

        # 3. Scene Cut Detection
        # A legitimate camera cut exhibits high frame difference AND low histogram correlation
        is_scene_cut = (diff_val > 0.35) and (corr < 0.30)
        if is_scene_cut:
            scene_cuts.append(meta_curr.timestamp_seconds)
            continue  # Do not calculate temporal flicker across distinct scenes

        # 4. Intra-Scene Sharpness Jitter
        max_lap = max(lap_prev, lap_curr, 1.0)
        jitter = abs(lap_curr - lap_prev) / max_lap
        sharpness_jitters.append(jitter)

        # 5. Farneback Dense Optical Flow (downsampled to 160x120 for performance)
        small_prev = cv2.resize(gray_prev, (160, 120), interpolation=cv2.INTER_AREA)
        small_curr = cv2.resize(gray_curr, (160, 120), interpolation=cv2.INTER_AREA)
        try:
            flow = cv2.calcOpticalFlowFarneback(
                small_prev, small_curr, None, 0.5, 2, 10, 2, 5, 1.1, 0
            )
            mag, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
            flow_mags.append(float(np.mean(mag)))
            flow_vars.append(float(np.var(mag)))
        except Exception as e:
            logger.debug(f"Optical flow computation skipped for pair {i}: {e}")

    # Aggregations
    mean_diff = float(np.mean(frame_diffs)) if frame_diffs else 0.0
    max_diff = float(np.max(frame_diffs)) if frame_diffs else 0.0
    mean_corr = float(np.mean(hist_corrs)) if hist_corrs else 1.0
    mean_flow = float(np.mean(flow_mags)) if flow_mags else 0.0
    mean_flow_var = float(np.mean(flow_vars)) if flow_vars else 0.0
    mean_jitter = float(np.mean(sharpness_jitters)) if sharpness_jitters else 0.0

    # Anomaly flags
    anomaly_flags: List[str] = []
    if mean_jitter > 0.55:
        anomaly_flags.append(
            f"High intra-scene sharpness oscillation (jitter index: {mean_jitter:.2f}) suggesting generative temporal flicker."
        )

    if mean_flow_var > 6.0 and mean_flow < 2.0:
        anomaly_flags.append(
            f"Chaotic optical flow variance ({mean_flow_var:.2f}) under low overall motion, indicating local warping artifacts."
        )

    temporal_anomaly_detected = len(anomaly_flags) > 0

    return {
        "sampled_transitions": len(processed_frames) - 1,
        "mean_frame_difference": round(mean_diff, 4),
        "max_frame_difference": round(max_diff, 4),
        "mean_histogram_correlation": round(mean_corr, 4),
        "scene_cut_count": len(scene_cuts),
        "scene_cut_timestamps": scene_cuts,
        "mean_optical_flow_magnitude": round(mean_flow, 3),
        "optical_flow_variance": round(mean_flow_var, 3),
        "temporal_sharpness_jitter": round(mean_jitter, 3),
        "temporal_anomaly_detected": temporal_anomaly_detected,
        "temporal_anomaly_flags": anomaly_flags,
        "limitations": [
            "Temporal metrics are computed on sampled keyframes; micro-flicker between non-sampled frames is not captured.",
            "Scene cuts, lighting changes, and camera pans alter temporal continuity and are filtered where detected.",
            "Facial landmark tracking and audio-visual lip-synchronization are not configured in this pipeline.",
        ],
    }
