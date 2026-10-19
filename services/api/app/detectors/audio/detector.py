import os
from typing import Any, Dict, List, Optional
import aiofiles

from app.core.logging import logger
from app.detectors.base import BaseDetector, DetectorOutput
from app.detectors.audio.forensics import (
    AudioForensicExtractionError,
    extract_full_audio_forensics,
)
from app.schemas.common import DetectorStatus


class AudioForensicsDetector(BaseDetector):
    """
    Deterministic Acoustic & Spectrogram Forensic Audio Detector.

    Evaluates:
    - Spectrogram frequency rolloff and high-frequency vocoder ceilings
    - Spectral centroid and Wiener flatness (tonal vs noise balance)
    - Waveform dynamics, RMS energy, crest factor, and clipping ratios
    - Silence ratio and unnatural pause boundaries

    Strictly evidence-grounded without fabricated voice-cloning probabilities.
    """

    def __init__(self, name: str = "audio_forensics_v1", version: str = "1.1.0"):
        super().__init__(name=name, version=version)

    def is_configured(self) -> bool:
        """
        Deterministic audio forensics is always configured when NumPy and SciPy
        signal processing libraries are installed.
        """
        return True

    async def predict(self, media_path: str, metadata: Dict[str, Any]) -> DetectorOutput:
        """
        Execute deterministic acoustic and spectrogram forensics on the specified audio file.
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
                audio_bytes = await f.read()

            forensic_report = extract_full_audio_forensics(audio_bytes)
            
            meta_data = forensic_report["metadata"]
            wave_data = forensic_report["waveform"]
            spec_data = forensic_report["spectral"]

            # Compute transparent anomaly index based on observed acoustic indicators
            anomaly_signals = []
            anomaly_score = 0.0

            if spec_data.get("sharp_vocoder_cutoff_detected"):
                cutoff_f = spec_data.get("spectral_rolloff_hz", 0)
                anomaly_signals.append(
                    f"Sharp high-frequency energy cutoff detected at {cutoff_f:.0f} Hz (characteristic of bandlimited vocoders)."
                )
                anomaly_score += 0.35

            if wave_data.get("silence_ratio", 0) > 0.40:
                s_pct = wave_data["silence_ratio"] * 100
                anomaly_signals.append(f"High proportion of zero-energy silence frames detected ({s_pct:.1f}%).")
                anomaly_score += 0.20

            if wave_data.get("clipping_ratio", 0) > 0.05:
                clip_pct = wave_data["clipping_ratio"] * 100
                anomaly_signals.append(f"Elevated waveform sample clipping detected ({clip_pct:.2f}%).")
                anomaly_score += 0.15

            if wave_data.get("crest_factor", 0) < 2.2 and wave_data.get("crest_factor", 0) > 0:
                anomaly_signals.append("Abnormally low dynamic range (crest factor < 2.2 indicates extreme compression).")
                anomaly_score += 0.15

            if spec_data.get("spectral_flatness", 0) > 0.35:
                anomaly_signals.append("Elevated spectral flatness detected (indicates robotic or noisy vocoder artifacts).")
                anomaly_score += 0.25

            normalized_anomaly = min(1.0, round(anomaly_score, 3))

            signals = {
                "container": meta_data["container"],
                "channels": meta_data["channels"],
                "sample_rate_hz": meta_data["sample_rate"],
                "bit_depth": meta_data["bit_depth"],
                "duration_seconds": meta_data["duration_seconds"],
                "peak_amplitude": wave_data.get("peak_amplitude", 0.0),
                "rms_energy": wave_data.get("rms_energy", 0.0),
                "crest_factor": wave_data.get("crest_factor", 0.0),
                "clipping_ratio": wave_data.get("clipping_ratio", 0.0),
                "silence_ratio": wave_data.get("silence_ratio", 0.0),
                "zero_crossing_rate": wave_data.get("zero_crossing_rate", 0.0),
                "spectral_centroid_hz": spec_data.get("spectral_centroid_hz", 0.0),
                "spectral_rolloff_hz": spec_data.get("spectral_rolloff_hz", 0.0),
                "spectral_flatness": spec_data.get("spectral_flatness", 0.0),
                "sharp_vocoder_cutoff": spec_data.get("sharp_vocoder_cutoff_detected", False),
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

        except AudioForensicExtractionError as e:
            logger.warning(f"Audio forensic validation error for {media_path}: {e}")
            return DetectorOutput(
                detector_name=self.name,
                detector_version=self.version,
                status=DetectorStatus.FAILED,
                score=None,
                score_semantics="not_applicable",
                signals={},
                limitations=[
                    "Audio decoding or security boundary enforcement failed.",
                    "File may be corrupt, truncated, non-PCM, or exceed duration limits.",
                ],
                error=str(e),
            )
        except Exception as e:
            logger.error(f"Unexpected error in AudioForensicsDetector: {e}", exc_info=True)
            return DetectorOutput(
                detector_name=self.name,
                detector_version=self.version,
                status=DetectorStatus.FAILED,
                score=None,
                score_semantics="not_applicable",
                signals={},
                limitations=["An unhandled runtime error occurred during acoustic forensic extraction."],
                error=f"Internal extraction error: {str(e)}",
            )
