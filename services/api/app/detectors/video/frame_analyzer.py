from typing import Any, Dict, List, Tuple
from app.core.logging import logger
from app.detectors.image.forensics import extract_full_image_forensics
from .frame_sampler import SampledFrame


def analyze_sampled_video_frames(
    sampled_frames: List[Tuple[SampledFrame, bytes]]
) -> Dict[str, Any]:
    """
    Applies the core deterministic image forensic algorithms (2D FFT, ELA, Laplacian focus,
    and channel noise) to each extracted video frame.
    Reuses extract_full_image_forensics directly without duplicating image analysis logic.
    """
    frame_results: List[Dict[str, Any]] = []
    anomalous_indices: List[int] = []
    fft_ratios: List[float] = []
    ela_variances: List[float] = []
    has_grid_spikes = False

    for meta, png_bytes in sampled_frames:
        try:
            forensics = extract_full_image_forensics(png_bytes)
            fft_data = forensics["fft_spectral"]
            ela_data = forensics["error_level_analysis"]
            cv_data = forensics["cv_signals"]

            frame_fft_ratio = float(fft_data.get("high_freq_ratio", 0.0))
            frame_grid_spikes = bool(fft_data.get("grid_spikes_detected", False))
            frame_ela_var = float(ela_data.get("block_variance", 0.0))
            frame_laplacian = float(cv_data.get("laplacian_focus_variance", 0.0))
            frame_noise = float(cv_data.get("channel_noise_variance", 0.0))
            frame_smoothness = bool(cv_data.get("surface_smoothness_anomaly", False))

            fft_ratios.append(frame_fft_ratio)
            ela_variances.append(frame_ela_var)
            if frame_grid_spikes:
                has_grid_spikes = True

            frame_flags: List[str] = []
            if frame_grid_spikes:
                frame_flags.append("Periodic checkerboard/grid artifacts detected in frequency domain.")
            if frame_fft_ratio > 0.40:
                frame_flags.append(f"Elevated high-frequency spectral ratio ({frame_fft_ratio:.3f}).")
            if frame_smoothness:
                frame_flags.append("Unnatural surface gradient smoothness detected.")

            is_frame_anomalous = len(frame_flags) > 0
            if is_frame_anomalous:
                anomalous_indices.append(meta.frame_index)

            frame_results.append({
                "frame_index": meta.frame_index,
                "timestamp_seconds": meta.timestamp_seconds,
                "width": meta.width,
                "height": meta.height,
                "fft_high_freq_ratio": round(frame_fft_ratio, 3),
                "grid_spikes_detected": frame_grid_spikes,
                "ela_block_variance": round(frame_ela_var, 2),
                "laplacian_focus_variance": round(frame_laplacian, 1),
                "channel_noise_variance": round(frame_noise, 4),
                "surface_smoothness_anomaly": frame_smoothness,
                "anomalous": is_frame_anomalous,
                "indicators": frame_flags,
            })

        except Exception as e:
            logger.warning(f"Frame analysis failed for frame {meta.frame_index}: {e}")
            frame_results.append({
                "frame_index": meta.frame_index,
                "timestamp_seconds": meta.timestamp_seconds,
                "width": meta.width,
                "height": meta.height,
                "error": f"Frame forensic extraction error: {e}",
                "anomalous": False,
                "indicators": [],
            })

    total_frames = len(frame_results)
    mean_fft = float(sum(fft_ratios) / len(fft_ratios)) if fft_ratios else 0.0
    mean_ela = float(sum(ela_variances) / len(ela_variances)) if ela_variances else 0.0

    return {
        "total_frames_analyzed": total_frames,
        "anomalous_frame_count": len(anomalous_indices),
        "anomalous_frame_indices": anomalous_indices,
        "mean_fft_high_freq_ratio": round(mean_fft, 3),
        "mean_ela_block_variance": round(mean_ela, 2),
        "grid_spikes_detected_in_any_frame": has_grid_spikes,
        "frame_breakdown": frame_results,
    }
