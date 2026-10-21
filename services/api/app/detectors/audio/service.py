import os
import tempfile
from typing import Any, Dict, List, Optional, Tuple
import aiofiles

from app.core.logging import logger
from app.detectors.base import DetectorOutput
from app.detectors.evidence_synthesizer import EvidenceSynthesizer
from app.detectors.audio.detector import AudioForensicsDetector
from app.detectors.audio.model_adapter import PretrainedAudioModelAdapter
from app.provenance.service import ProvenanceVerifier
from app.schemas.common import DetectorStatus


class AudioAnalysisService:
    """
    High-level coordinator for voice clone and synthetic audio detection.
    Executes:
    1. Deterministic Acoustic & Spectrogram Forensics
    2. Pretrained Audio Spoofing / AASIST Model Inference (if configured)
    3. C2PA / JUMBF binary provenance marker detection
    4. Evidence-grounded synthesis and assessment categorization
    """

    def __init__(self):
        self.forensics_detector = AudioForensicsDetector()
        self.model_adapter = PretrainedAudioModelAdapter()

    async def analyze_audio_bytes(
        self,
        audio_bytes: bytes,
        original_filename: str,
        sha256: str,
    ) -> Dict[str, Any]:
        """
        Execute audio forensic pipeline safely on raw media bytes.
        Uses a temporary file with guaranteed cleanup.
        """
        temp_dir = tempfile.gettempdir()
        temp_file_path = os.path.join(temp_dir, f"omniscan_aud_{sha256[:12]}.tmp")

        try:
            async with aiofiles.open(temp_file_path, "wb") as f:
                await f.write(audio_bytes)

            metadata_hint = {"original_filename": original_filename, "sha256": sha256}

            # 1. Run deterministic acoustic forensics
            forensics_output: DetectorOutput = await self.forensics_detector.predict(
                temp_file_path, metadata_hint
            )

            # 2. Run pretrained model adapter
            model_output: DetectorOutput = await self.model_adapter.predict(
                temp_file_path, metadata_hint
            )

            # 3. Check for C2PA / JUMBF binary box & provenance integrity
            aud_mime = "audio/wav" if original_filename.lower().endswith(".wav") else "audio/mpeg"
            provenance_check = ProvenanceVerifier.verify(audio_bytes, original_filename, aud_mime)

            # 4. Synthesize evidence, structured explanation, and grounded verdict
            synth_res = EvidenceSynthesizer.synthesize_audio_analysis(
                forensics_output=forensics_output,
                model_output=model_output,
                provenance_data=provenance_check,
                filename=original_filename,
            )

            verdict = synth_res["verdict"]
            verdict_status = synth_res["verdict_status"]
            explanation = synth_res["explanation"]
            evidence_records = synth_res["evidence_records"]
            supporting_evidence = synth_res["supporting_evidence"]
            conflicting_evidence = synth_res["conflicting_evidence"]
            neutral_evidence = synth_res["neutral_evidence"]
            unavailable_evidence = synth_res["unavailable_evidence"]

            # Backward-compatible assessment_label mapping
            if verdict == "LIKELY AI-GENERATED":
                assessment_label = "suspicious"
            elif verdict == "LIKELY REAL":
                assessment_label = "no_strong_indicators"
            elif verdict == "LIKELY MANIPULATED":
                assessment_label = "suspicious"
            else:
                assessment_label = "inconclusive"

            assessment_score = model_output.score if (model_output.status == DetectorStatus.COMPLETED and model_output.score is not None) else forensics_output.score
            score_semantics = "calibrated_probability" if (model_output.status == DetectorStatus.COMPLETED and model_output.score is not None) else "anomaly_index"
            summary = explanation["summary"]

            # Calculate duration in ms if available
            duration_ms = None
            if forensics_output.status == DetectorStatus.COMPLETED:
                dur_sec = forensics_output.signals.get("duration_seconds", 0.0)
                duration_ms = int(dur_sec * 1000)

            # Extract structured blocks
            model_inference_data = (
                model_output.signals.get("model_inference")
                if model_output.status == DetectorStatus.COMPLETED
                else None
            )
            forensic_heuristics_data = {
                "detector_name": forensics_output.detector_name,
                "score": forensics_output.score,
                "score_semantics": forensics_output.score_semantics,
                "signals": forensics_output.signals,
            }
            metadata_and_provenance_data = {
                "provenance_check": provenance_check,
                "container_format": forensics_output.signals.get("container", "WAV"),
                "sample_rate_hz": forensics_output.signals.get("sample_rate_hz"),
            }
            all_limitations = list(set(forensics_output.limitations + model_output.limitations))

            return {
                "verdict": verdict,
                "verdict_status": verdict_status,
                "explanation": explanation,
                "evidence_records": evidence_records,
                "supporting_evidence": supporting_evidence,
                "conflicting_evidence": conflicting_evidence,
                "neutral_evidence": neutral_evidence,
                "unavailable_evidence": unavailable_evidence,
                "assessment_label": assessment_label,
                "assessment_score": assessment_score,
                "score_semantics": score_semantics,
                "summary": summary,
                "duration_ms": duration_ms,
                "detector_results": [forensics_output, model_output],
                "provenance": provenance_check,
                "model_inference": model_inference_data,
                "forensic_heuristics": forensic_heuristics_data,
                "metadata_and_provenance": metadata_and_provenance_data,
                "model_version": model_output.detector_version,
                "calibration_status": model_output.signals.get("calibration_status", "unconfigured"),
                "limitations": all_limitations,
                "human_review_recommended": bool(assessment_label in ("suspicious", "inconclusive")),
            }

        finally:
            if os.path.exists(temp_file_path):
                try:
                    os.remove(temp_file_path)
                except Exception as e:
                    logger.debug(f"Temporary audio cleanup exception: {e}")

    def _synthesize_assessment(
        self,
        forensics: DetectorOutput,
        model: DetectorOutput,
        filename: str,
    ) -> Tuple[str, Optional[float], str, str]:
        """
        Synthesize assessment strictly from verified acoustic signals.
        Never fabricates scores or voice-cloning probabilities.
        """
        if forensics.status == DetectorStatus.FAILED:
            return (
                "inconclusive",
                None,
                "not_applicable",
                f"Acoustic evaluation on '{filename}' could not be completed: {forensics.error or 'Invalid media stream'}.",
            )

        indicators = forensics.signals.get("anomaly_indicators", [])

        # If a real model is configured and completed, combine with acoustic features
        if model.status == DetectorStatus.COMPLETED and model.score is not None:
            model_score = model.score
            if model_score > 0.70 or len(indicators) >= 2:
                label = "suspicious"
            elif model_score < 0.30 and len(indicators) == 0:
                label = "no_strong_indicators"
            else:
                label = "inconclusive"

            summary = (
                f"Audio analysis completed. Pretrained model '{model.detector_name}' estimated a synthetic speech probability of "
                f"{(model_score * 100):.1f}%. "
            )
            if indicators:
                summary += f"Observed acoustic indicators: {'; '.join(indicators)}."
            else:
                summary += "Acoustic frequency spectrum and dynamics show natural continuous vocal tract characteristics."

            return label, model_score, "calibrated_probability", summary

        # Deterministic acoustic forensics only (model unconfigured)
        anomaly_index = forensics.score or 0.0
        if len(indicators) >= 2 or anomaly_index >= 0.40:
            label = "suspicious"
        elif len(indicators) == 1:
            label = "inconclusive"
        else:
            label = "no_strong_indicators"

        summary_points = []
        if indicators:
            summary_points.append(f"Acoustic indicators flagged: {'; '.join(indicators)}")
        else:
            summary_points.append(
                "Spectrogram demonstrates natural harmonic decay and continuous vocal tract frequency rolloff. "
                "Waveform energy dynamics and crest factor are consistent with natural human speech recordings."
            )

        summary_points.append(
            f"Pretrained voice clone model adapter is unconfigured (AUDIO_MODEL_PATH unset). "
            f"Assessment is derived strictly from deterministic signal extraction (anomaly index: {anomaly_index:.2f})."
        )

        full_summary = " ".join(summary_points)
        return label, anomaly_index, "anomaly_index", full_summary
