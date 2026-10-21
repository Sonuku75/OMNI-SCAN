import os
import tempfile
from typing import Any, Dict, List, Optional, Tuple
import aiofiles

from app.core.logging import logger
from app.detectors.base import DetectorOutput
from app.detectors.evidence_synthesizer import EvidenceSynthesizer
from app.detectors.image.detector import ImageForensicsDetector
from app.detectors.image.model_adapter import PretrainedImageModelAdapter
from app.provenance.service import ProvenanceVerifier
from app.schemas.common import DetectorStatus


class ImageAnalysisService:
    """
    High-level orchestrator for image forensic detection and model inference.
    Executes:
    1. Deterministic Image Forensics (ELA, FFT, CV signals, EXIF)
    2. Pretrained Deepfake Model Inference (if weights configured)
    3. C2PA / JUMBF binary provenance marker detection
    4. Evidence-grounded synthesis and assessment categorization
    """

    def __init__(self):
        self.forensics_detector = ImageForensicsDetector()
        self.model_adapter = PretrainedImageModelAdapter()

    async def analyze_image_bytes(
        self,
        image_bytes: bytes,
        original_filename: str,
        sha256: str,
    ) -> Dict[str, Any]:
        """
        Execute image analysis pipeline safely on raw media bytes.
        Uses a secure isolated temporary file with guaranteed cleanup.
        """
        # Write to isolated temporary file with auto cleanup
        temp_dir = tempfile.gettempdir()
        temp_file_path = os.path.join(temp_dir, f"omniscan_img_{sha256[:12]}.tmp")

        try:
            async with aiofiles.open(temp_file_path, "wb") as f:
                await f.write(image_bytes)

            # 1. Run deterministic forensics
            metadata_hint = {"original_filename": original_filename, "sha256": sha256}
            forensics_output: DetectorOutput = await self.forensics_detector.predict(
                temp_file_path, metadata_hint
            )

            # 2. Run pretrained model adapter
            model_output: DetectorOutput = await self.model_adapter.predict(
                temp_file_path, metadata_hint
            )

            # 3. Check for C2PA / JUMBF binary box & provenance integrity
            img_mime = "image/jpeg" if original_filename.lower().endswith((".jpg", ".jpeg")) else "image/png"
            provenance_check = ProvenanceVerifier.verify(image_bytes, original_filename, img_mime)

            # 4. Synthesize evidence, structured explanation, and grounded verdict
            synth_res = EvidenceSynthesizer.synthesize_image_analysis(
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

            # 5. Extract structured forensic blocks
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
                "exif_metadata": forensics_output.signals.get("has_exif", False),
                "software_signature": forensics_output.signals.get("software_signature", "None detected"),
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
                "detector_results": [forensics_output, model_output],
                "provenance": provenance_check,
                "model_inference": model_inference_data,
                "forensic_heuristics": forensic_heuristics_data,
                "metadata_and_provenance": metadata_and_provenance_data,
                "model_version": model_output.detector_version,
                "calibration_status": model_output.signals.get("calibration_status", "unconfigured"),
                "evaluation_reference": model_output.signals.get("evaluation_reference", "docs/EVALUATION_REPORT.md"),
                "limitations": all_limitations,
                "human_review_recommended": bool(assessment_label in ("suspicious", "inconclusive")),
            }

        finally:
            # Safe temporary file cleanup
            if os.path.exists(temp_file_path):
                try:
                    os.remove(temp_file_path)
                except Exception as e:
                    logger.debug(f"Temporary file cleanup exception: {e}")

    def _synthesize_assessment(
        self,
        forensics: DetectorOutput,
        model: DetectorOutput,
        filename: str,
    ) -> Tuple[str, Optional[float], str, str]:
        """
        Synthesize assessment label, score, semantics, and readable summary strictly from extracted signals.
        Never fabricates probabilities.
        """
        if forensics.status == DetectorStatus.FAILED:
            return (
                "inconclusive",
                None,
                "not_applicable",
                f"Forensic evaluation on '{filename}' could not be completed: {forensics.error or 'Invalid media stream'}.",
            )

        indicators = forensics.signals.get("anomaly_indicators", [])
        signals = forensics.signals

        # If a real model is configured and completed, combine model output with forensic features
        if model.status == DetectorStatus.COMPLETED and model.score is not None:
            model_score = model.score
            cal_threshold = model.signals.get("calibrated_threshold", 0.37)
            if model_score >= cal_threshold or len(indicators) >= 2:
                label = "suspicious"
            elif model_score < (cal_threshold * 0.6) and len(indicators) == 0:
                label = "no_strong_indicators"
            else:
                label = "inconclusive"

            summary = (
                f"Image analysis completed. Pretrained model '{model.detector_name}' estimated a synthetic probability of "
                f"{(model_score * 100):.1f}%. "
            )
            if indicators:
                summary += f"Observed forensic indicators: {'; '.join(indicators)}."
            else:
                summary += "Deterministic frequency and compression checks showed no abnormal periodic patterns."

            return label, model_score, "calibrated_probability", summary

        # Deterministic forensics only (model not configured)
        anomaly_index = forensics.score or 0.0
        if len(indicators) >= 2 or anomaly_index >= 0.40:
            label = "suspicious"
        elif len(indicators) == 1:
            label = "inconclusive"
        else:
            label = "no_strong_indicators"

        summary_points = []
        if indicators:
            summary_points.append(f"Forensic indicators flagged: {'; '.join(indicators)}")
        else:
            summary_points.append(
                "2D Fourier frequency spectrum shows natural radial decay with no anomalous grid spikes. "
                "Error Level Analysis (ELA) and surface noise levels are consistent with natural image characteristics."
            )

        summary_points.append(
            f"Pretrained deepfake model adapter is unconfigured (weights not configured at IMAGE_MODEL_PATH). "
            f"Assessment is derived strictly from deterministic signal extraction (anomaly index: {anomaly_index:.2f})."
        )

        full_summary = " ".join(summary_points)
        return label, anomaly_index, "anomaly_index", full_summary
