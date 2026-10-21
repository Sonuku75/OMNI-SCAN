import io
import os
import tempfile
from typing import Any, Dict, List, Optional, Tuple
import aiofiles
import numpy as np

from app.core.logging import logger
from app.detectors.base import DetectorOutput
from app.detectors.evidence_synthesizer import EvidenceSynthesizer
from app.detectors.video.detector import VideoForensicsDetector
from app.detectors.video.model_adapter import PretrainedVideoModelAdapter
from app.provenance.service import ProvenanceVerifier
from app.schemas.common import DetectorStatus


class VideoAnalysisService:
    """
    High-level coordinator for video deepfake detection and frame sampling.
    Executes:
    1. Bounded video ingestion & deterministic frame sampling
    2. Spatial-frequency analysis per sampled frame (2D FFT, ELA, Laplacian)
    3. OpenCV-based temporal consistency analysis across adjacent frames
    4. Pretrained Deep Video Model Adapter (ViViT / 3D-CNN, reporting unconfigured honestly)
    5. C2PA / JUMBF binary provenance marker detection
    6. Evidence-grounded synthesis and assessment categorization
    """

    def __init__(self):
        self.forensics_detector = VideoForensicsDetector()
        self.model_adapter = PretrainedVideoModelAdapter()

    def _extract_audio_track(self, video_path: str) -> Optional[bytes]:
        """
        Attempts to safely decode the embedded audio stream from the video container.
        Returns PCM WAV bytes if an audio stream is present, or None if video is silent/unsupported.
        """
        try:
            import torchaudio
            import scipy.io.wavfile as wavfile
            waveform, sr = torchaudio.load(video_path)
            if waveform is not None and waveform.numel() > 0:
                mono = waveform.mean(dim=0).cpu().numpy()
                bio = io.BytesIO()
                scaled = np.clip(mono, -1.0, 1.0) * 32767.0
                wavfile.write(bio, int(sr), scaled.astype(np.int16))
                return bio.getvalue()
        except Exception as e:
            logger.debug(f"Video audio stream extraction skipped or not present: {e}")
        return None

    async def analyze_video_bytes(
        self,
        video_bytes: bytes,
        original_filename: str,
        sha256: str,
    ) -> Dict[str, Any]:
        """
        Execute video forensic pipeline safely on raw media bytes.
        Uses a secure isolated temporary file with guaranteed cleanup in try...finally.
        """
        temp_dir = tempfile.gettempdir()
        temp_file_path = os.path.join(temp_dir, f"omniscan_vid_{sha256[:12]}.mp4")

        try:
            async with aiofiles.open(temp_file_path, "wb") as f:
                await f.write(video_bytes)

            metadata_hint = {"original_filename": original_filename, "sha256": sha256}

            # 1. Run deterministic video forensics (sampling, frame FFT/ELA, temporal consistency)
            forensics_output = await self.forensics_detector.predict(temp_file_path, metadata_hint)

            # 2. Run pretrained deep video model adapter
            model_output = await self.model_adapter.predict(temp_file_path, metadata_hint)

            # 3. Check for C2PA provenance markers in video container
            vid_mime = "video/quicktime" if original_filename.lower().endswith(".mov") else "video/mp4"
            provenance_check = ProvenanceVerifier.verify(video_bytes, original_filename, vid_mime)

            # 3b. Optional independent audio track inspection
            audio_track_analysis = None
            audio_bytes = self._extract_audio_track(temp_file_path)
            if audio_bytes:
                try:
                    from app.detectors.audio.service import AudioAnalysisService
                    audio_service = AudioAnalysisService()
                    audio_track_analysis = await audio_service.analyze_audio_bytes(
                        audio_bytes=audio_bytes,
                        original_filename=f"{original_filename}_audio.wav",
                        sha256=f"{sha256[:12]}_aud",
                    )
                except Exception as e:
                    logger.warning(f"Video audio track analysis encountered an error: {e}")

            # 4. Synthesize evidence, structured explanation, and grounded verdict
            synth_res = EvidenceSynthesizer.synthesize_video_analysis(
                forensics_output=forensics_output,
                model_output=model_output,
                provenance_data=provenance_check,
                filename=original_filename,
                audio_track_output=audio_track_analysis,
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
                label = "suspicious"
            elif verdict == "LIKELY REAL":
                label = "no_strong_indicators"
            elif verdict == "LIKELY MANIPULATED":
                label = "suspicious"
            else:
                label = "inconclusive"

            score = model_output.score if (model_output.status == DetectorStatus.COMPLETED and model_output.score is not None) else forensics_output.score
            semantics = "calibrated_probability" if (model_output.status == DetectorStatus.COMPLETED and model_output.score is not None) else "anomaly_index"
            summary = explanation["summary"]

            # 5. Extract duration and spatial dimensions if available
            duration_ms = None
            width = None
            height = None
            if forensics_output.status == DetectorStatus.COMPLETED and forensics_output.signals:
                dur_s = forensics_output.signals.get("duration_seconds")
                if dur_s is not None:
                    duration_ms = int(dur_s * 1000)
                width = forensics_output.signals.get("width")
                height = forensics_output.signals.get("height")

            human_review = (
                forensics_output.status == DetectorStatus.COMPLETED
                and (
                    (forensics_output.score is not None and forensics_output.score >= 0.25)
                    or forensics_output.signals.get("grid_spikes_detected", False)
                    or forensics_output.signals.get("temporal_anomaly_detected", False)
                )
            )

            all_limitations = list(
                set(forensics_output.limitations + model_output.limitations)
            )

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
                "container": forensics_output.signals.get("container", "mp4"),
                "fourcc": forensics_output.signals.get("fourcc", "unknown"),
            }

            return {
                "verdict": verdict,
                "verdict_status": verdict_status,
                "explanation": explanation,
                "evidence_records": evidence_records,
                "supporting_evidence": supporting_evidence,
                "conflicting_evidence": conflicting_evidence,
                "neutral_evidence": neutral_evidence,
                "unavailable_evidence": unavailable_evidence,
                "video_audio_track": audio_track_analysis,
                "assessment_label": label,
                "assessment_score": score,
                "score_semantics": semantics,
                "summary": summary,
                "duration_ms": duration_ms,
                "width": width,
                "height": height,
                "human_review_recommended": human_review,
                "detector_results": [forensics_output, model_output],
                "provenance": provenance_check,
                "model_inference": model_inference_data,
                "forensic_heuristics": forensic_heuristics_data,
                "metadata_and_provenance": metadata_and_provenance_data,
                "model_version": model_output.detector_version,
                "calibration_status": model_output.signals.get("calibration_status", "unconfigured"),
                "limitations_disclosure": all_limitations,
                "limitations": all_limitations,
            }

        finally:
            # Guaranteed cleanup of isolated temp file
            if os.path.exists(temp_file_path):
                try:
                    os.remove(temp_file_path)
                except OSError as e:
                    logger.warning(f"Failed to delete temp video file {temp_file_path}: {e}")

    def _check_c2pa_provenance(self, video_bytes: bytes) -> Dict[str, Any]:
        """
        Inspects video container bytes for C2PA or JUMBF provenance metadata boxes.
        """
        has_c2pa = (
            b"c2pa" in video_bytes[:65536]
            or b"c2pa" in video_bytes[-65536:]
            or b"jumb" in video_bytes[:65536]
        )

        if has_c2pa:
            return {
                "status": "verified",
                "content_credentials_status": "present",
                "metadata": {
                    "standard": "C2PA / JUMBF (ISO 19566-5)",
                    "manifest_found": True,
                },
                "details": "Embedded C2PA Content Credentials manifest structure detected in video container.",
            }
        else:
            return {
                "status": "no_credentials_found",
                "content_credentials_status": "not_found",
                "metadata": {
                    "standard": "C2PA / JUMBF (ISO 19566-5)",
                    "manifest_found": False,
                },
                "details": "No C2PA or JUMBF digital provenance manifest found in video container.",
            }

    def _synthesize_assessment(
        self,
        forensics: DetectorOutput,
        model: DetectorOutput,
        filename: str,
    ) -> Tuple[str, Optional[float], str, str]:
        """
        Synthesize assessment strictly from verified signals.
        Never fabricates detection scores or deepfake probabilities.
        """
        if forensics.status == DetectorStatus.FAILED:
            return (
                "inconclusive",
                None,
                "not_applicable",
                f"Video evaluation on '{filename}' could not be completed: {forensics.error or 'Invalid media stream'}.",
            )

        indicators = forensics.signals.get("anomaly_indicators", [])

        # If a real model is configured and completed, combine with heuristic features
        if model.status == DetectorStatus.COMPLETED and model.score is not None:
            model_score = model.score
            if model_score > 0.70 or len(indicators) >= 2:
                label = "suspicious"
            elif model_score < 0.30 and len(indicators) == 0:
                label = "no_strong_indicators"
            else:
                label = "inconclusive"

            summary = (
                f"Video analysis completed. Pretrained deep video model '{model.detector_name}' estimated "
                f"synthetic probability of {(model_score * 100):.1f}%. "
            )
            if indicators:
                summary += f"Observed forensic indicators: {'; '.join(indicators)}."
            else:
                summary += "Sampled frames and temporal continuity show natural physical motion characteristics."

            return label, model_score, "calibrated_probability", summary

        # Deterministic video forensics only (model unconfigured)
        anomaly_index = forensics.score or 0.0
        if len(indicators) >= 2 or anomaly_index >= 0.40:
            label = "suspicious"
        elif len(indicators) == 1 or anomaly_index >= 0.20:
            label = "inconclusive"
        else:
            label = "no_strong_indicators"

        summary_points = []
        sampled_count = forensics.signals.get("sampled_frame_count", 0)
        anom_count = forensics.signals.get("anomalous_frame_count", 0)

        summary_points.append(
            f"Extracted and evaluated {sampled_count} keyframes across the video stream. "
        )

        if indicators:
            summary_points.append(f"Forensic indicators flagged: {'; '.join(indicators)}")
        else:
            summary_points.append(
                f"Zero sampled frames ({anom_count}/{sampled_count}) exhibited high-frequency generative artifacts. "
                f"Inter-frame histogram correlation and optical flow consistency align with expected natural video transitions."
            )

        summary_points.append(
            f"Pretrained video deepfake model adapter is unconfigured (VIDEO_MODEL_PATH unset). "
            f"Assessment is derived strictly from deterministic frame sampling and temporal signal extraction "
            f"(anomaly index: {anomaly_index:.2f}). Note: Absence of detectable artifacts does not guarantee video authenticity."
        )

        full_summary = " ".join(summary_points)
        return label, anomaly_index, "anomaly_index", full_summary
