import os
from typing import Any, Dict, List, Optional
import aiofiles

from app.core.logging import logger
from app.detectors.base import BaseDetector, DetectorOutput
from app.detectors.image.forensics import (
    ImageForensicExtractionError,
    extract_full_image_forensics,
)
from app.schemas.common import DetectorStatus


class ImageForensicsDetector(BaseDetector):
    """
    Deterministic Computer Vision & Forensic Image Detector.

    Performs multi-signal forensic extraction including:
    - 2D Discrete Fourier Transform (FFT) periodic grid spike detection
    - Error Level Analysis (ELA) compression residual block variance
    - Computer Vision Laplacian focus variance & color-channel noise estimation
    - EXIF metadata inspection with privacy sanitization

    All findings are strictly evidence-grounded without fabricated deepfake probabilities.
    """

    def __init__(self, name: str = "image_forensics_v1", version: str = "1.1.0"):
        super().__init__(name=name, version=version)

    def is_configured(self) -> bool:
        """
        Deterministic image forensics is always configured when NumPy, Pillow,
        and OpenCV dependencies are installed.
        """
        return True

    async def predict(self, media_path: str, metadata: Dict[str, Any]) -> DetectorOutput:
        """
        Execute deterministic image forensics on the specified media file.
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
                    error=f"Media file not found at path: {media_path}",
                )

            async with aiofiles.open(media_path, "rb") as f:
                image_bytes = await f.read()

            forensic_report = extract_full_image_forensics(image_bytes)
            
            fft_data = forensic_report["fft_spectral"]
            ela_data = forensic_report["error_level_analysis"]
            cv_data = forensic_report["cv_signals"]
            meta_data = forensic_report["metadata"]

            # Compute transparent anomaly index based on observed forensic indicators
            anomaly_signals = []
            anomaly_score = 0.0

            if fft_data.get("grid_spikes_detected"):
                anomaly_signals.append("High-frequency periodic spectral spikes detected (FFT peak z-score > 5.5).")
                anomaly_score += 0.35

            if ela_data.get("high_discrepancy_detected"):
                anomaly_signals.append("Inconsistent block compression residuals detected (ELA block variance > 12.0).")
                anomaly_score += 0.30

            if cv_data.get("is_unusually_smooth"):
                anomaly_signals.append("Unnaturally low surface noise and soft gradients detected.")
                anomaly_score += 0.20

            if meta_data.get("ai_generator_tag_detected"):
                software = meta_data.get("software", "AI generator")
                anomaly_signals.append(f"AI generator software signature detected in metadata: '{software}'.")
                anomaly_score += 0.40
            elif meta_data.get("editing_software_detected"):
                software = meta_data.get("software", "Editing software")
                anomaly_signals.append(f"Image editing software signature present in metadata: '{software}'.")
                anomaly_score += 0.15

            # Bound anomaly score to [0.0, 1.0]
            normalized_anomaly = min(1.0, round(anomaly_score, 3))

            # Assemble clean signals payload
            signals = {
                "format": meta_data["format"],
                "resolution": f"{meta_data['dimensions']['width']}x{meta_data['dimensions']['height']}",
                "aspect_ratio": meta_data["dimensions"]["aspect_ratio"],
                "color_mode": meta_data["color_mode"],
                "has_exif": meta_data["has_exif_metadata"],
                "camera_device": meta_data["camera_device"] or "None detected",
                "software_signature": meta_data["software"] or "None detected",
                "fft_high_freq_ratio": fft_data.get("high_frequency_ratio", 0.0),
                "fft_grid_spikes": fft_data.get("grid_spikes_detected", False),
                "ela_mean_residual": ela_data.get("mean_error", 0.0),
                "ela_block_variance": ela_data.get("block_variance", 0.0),
                "ela_discrepancy_detected": ela_data.get("high_discrepancy_detected", False),
                "laplacian_focus_variance": cv_data.get("laplacian_variance", 0.0),
                "channel_noise_variance": cv_data.get("channel_noise_variance", 0.0),
                "surface_smoothness_anomaly": cv_data.get("is_unusually_smooth", False),
                "anomaly_indicators": anomaly_signals,
            }

            return DetectorOutput(
                detector_name=self.name,
                detector_version=self.version,
                status=DetectorStatus.COMPLETED,
                score=normalized_anomaly,
                score_semantics="anomaly_index",
                signals=signals,
                limitations=forensic_report["limitations"],
                error=None,
            )

        except ImageForensicExtractionError as e:
            logger.warning(f"Forensic validation error for {media_path}: {e}")
            return DetectorOutput(
                detector_name=self.name,
                detector_version=self.version,
                status=DetectorStatus.FAILED,
                score=None,
                score_semantics="not_applicable",
                signals={},
                limitations=[
                    "Image decoding or safety boundary validation failed.",
                    "File may be corrupt, truncated, or exceed maximum pixel boundaries.",
                ],
                error=str(e),
            )
        except Exception as e:
            logger.error(f"Unexpected error in ImageForensicsDetector: {e}", exc_info=True)
            return DetectorOutput(
                detector_name=self.name,
                detector_version=self.version,
                status=DetectorStatus.FAILED,
                score=None,
                score_semantics="not_applicable",
                signals={},
                limitations=["An unhandled runtime error occurred during image forensic extraction."],
                error=f"Internal extraction error: {str(e)}",
            )
