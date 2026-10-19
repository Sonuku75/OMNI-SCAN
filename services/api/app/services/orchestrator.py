import asyncio
import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.core.logging import logger
from app.core.state_machine import AnalysisStateMachine
from app.detectors.audio.service import AudioAnalysisService
from app.detectors.image.service import ImageAnalysisService
from app.detectors.registry import detector_registry
from app.models.analysis import Analysis
from app.models.detector_result import DetectorResult
from app.models.provenance import ProvenanceCheck
from app.schemas.common import AnalysisStatus, DetectorStatus
from app.storage import get_storage_adapter


class AnalysisOrchestrator:
    """
    Coordinates multi-modal media analysis pipeline, state transitions,
    and detector execution outside synchronous HTTP request threads.
    """

    def __init__(self):
        self.image_service = ImageAnalysisService()
        self.audio_service = AudioAnalysisService()

    async def run_pipeline(self, analysis_id: str) -> None:
        """
        Background task worker execution for a queued analysis.
        """
        logger.info(f"Orchestrator: picked up analysis {analysis_id}")
        async with AsyncSessionLocal() as session:
            try:
                # 1. Fetch analysis record
                stmt = (
                    select(Analysis)
                    .where(Analysis.id == analysis_id)
                    .options(
                        selectinload(Analysis.upload),
                        selectinload(Analysis.detector_results),
                        selectinload(Analysis.provenance_checks),
                    )
                )
                result = await session.execute(stmt)
                analysis = result.scalar_one_or_none()
                if not analysis:
                    logger.error(f"Orchestrator: Analysis {analysis_id} not found in database.")
                    return

                # 2. Transition state: QUEUED -> PROCESSING
                current_status = AnalysisStatus(analysis.status)
                AnalysisStateMachine.validate_transition(current_status, AnalysisStatus.PROCESSING)
                analysis.status = AnalysisStatus.PROCESSING.value
                analysis.started_at = datetime.now(timezone.utc)
                await session.commit()
                logger.info(f"Orchestrator: Analysis {analysis_id} transitioned to PROCESSING")

                # Cooperative yield
                await asyncio.sleep(0.05)

                upload = analysis.upload
                media_type = upload.media_type
                now = datetime.now(timezone.utc)

                # 3. Route to dedicated detector pipeline based on media type
                if media_type == "image":
                    logger.info(f"Orchestrator: executing Image Forensics pipeline for upload {upload.id}")
                    storage = get_storage_adapter()
                    image_bytes = await storage.get_file(upload.object_key)

                    analysis_output = await self.image_service.analyze_image_bytes(
                        image_bytes=image_bytes,
                        original_filename=upload.original_filename,
                        sha256=upload.sha256,
                    )

                    forensics_output = analysis_output["detector_results"][0]

                    if forensics_output.status == DetectorStatus.FAILED:
                        # Image was corrupt, truncated, or exceeded safety limits
                        AnalysisStateMachine.validate_transition(
                            AnalysisStatus.PROCESSING, AnalysisStatus.FAILED
                        )
                        analysis.status = AnalysisStatus.FAILED.value
                        analysis.completed_at = now
                        analysis.summary = (
                            f"Image analysis failed: {forensics_output.error or 'Invalid media stream'}."
                        )
                    else:
                        # Successful analysis execution
                        AnalysisStateMachine.validate_transition(
                            AnalysisStatus.PROCESSING, AnalysisStatus.COMPLETED
                        )
                        analysis.status = AnalysisStatus.COMPLETED.value
                        analysis.completed_at = now
                        analysis.assessment_label = analysis_output["assessment_label"]
                        analysis.assessment_score = analysis_output["assessment_score"]
                        analysis.score_semantics = analysis_output["score_semantics"]
                        analysis.summary = analysis_output["summary"]

                        # Enrich upload dimensions if available
                        if "resolution" in forensics_output.signals:
                            try:
                                res_parts = forensics_output.signals["resolution"].split("x")
                                upload.width = int(res_parts[0])
                                upload.height = int(res_parts[1])
                            except Exception:
                                pass

                    # Persist DetectorResult entities
                    # Clear existing results if retrying
                    analysis.detector_results.clear()
                    for det_out in analysis_output["detector_results"]:
                        det_res = DetectorResult(
                            id=str(uuid.uuid4()),
                            analysis_id=analysis.id,
                            detector_name=det_out.detector_name,
                            detector_version=det_out.detector_version,
                            status=det_out.status.value,
                            score=det_out.score,
                            score_semantics=det_out.score_semantics,
                            signals_json=det_out.signals,
                            limitations_json=det_out.limitations,
                            created_at=now,
                        )
                        session.add(det_res)

                    # Persist ProvenanceCheck entity
                    analysis.provenance_checks.clear()
                    prov_data = analysis_output["provenance"]
                    prov = ProvenanceCheck(
                        id=str(uuid.uuid4()),
                        analysis_id=analysis.id,
                        status=prov_data["status"],
                        metadata_json=prov_data["metadata"],
                        content_credentials_status=prov_data["content_credentials_status"],
                        created_at=now,
                    )
                    session.add(prov)

                    await session.commit()
                    logger.info(
                        f"Orchestrator: Analysis {analysis_id} finished as {analysis.status} (label: {analysis.assessment_label})"
                    )

                elif media_type == "audio":
                    logger.info(f"Orchestrator: executing Audio Forensics pipeline for upload {upload.id}")
                    storage = get_storage_adapter()
                    audio_bytes = await storage.get_file(upload.object_key)

                    analysis_output = await self.audio_service.analyze_audio_bytes(
                        audio_bytes=audio_bytes,
                        original_filename=upload.original_filename,
                        sha256=upload.sha256,
                    )

                    forensics_output = analysis_output["detector_results"][0]

                    if forensics_output.status == DetectorStatus.FAILED:
                        AnalysisStateMachine.validate_transition(
                            AnalysisStatus.PROCESSING, AnalysisStatus.FAILED
                        )
                        analysis.status = AnalysisStatus.FAILED.value
                        analysis.completed_at = now
                        analysis.summary = (
                            f"Audio analysis failed: {forensics_output.error or 'Invalid audio stream'}."
                        )
                    else:
                        AnalysisStateMachine.validate_transition(
                            AnalysisStatus.PROCESSING, AnalysisStatus.COMPLETED
                        )
                        analysis.status = AnalysisStatus.COMPLETED.value
                        analysis.completed_at = now
                        analysis.assessment_label = analysis_output["assessment_label"]
                        analysis.assessment_score = analysis_output["assessment_score"]
                        analysis.score_semantics = analysis_output["score_semantics"]
                        analysis.summary = analysis_output["summary"]

                        if analysis_output.get("duration_ms"):
                            upload.duration_ms = analysis_output["duration_ms"]

                    analysis.detector_results.clear()
                    for det_out in analysis_output["detector_results"]:
                        det_res = DetectorResult(
                            id=str(uuid.uuid4()),
                            analysis_id=analysis.id,
                            detector_name=det_out.detector_name,
                            detector_version=det_out.detector_version,
                            status=det_out.status.value,
                            score=det_out.score,
                            score_semantics=det_out.score_semantics,
                            signals_json=det_out.signals,
                            limitations_json=det_out.limitations,
                            created_at=now,
                        )
                        session.add(det_res)

                    analysis.provenance_checks.clear()
                    prov_data = analysis_output["provenance"]
                    prov = ProvenanceCheck(
                        id=str(uuid.uuid4()),
                        analysis_id=analysis.id,
                        status=prov_data["status"],
                        metadata_json=prov_data["metadata"],
                        content_credentials_status=prov_data["content_credentials_status"],
                        created_at=now,
                    )
                    session.add(prov)

                    await session.commit()
                    logger.info(
                        f"Orchestrator: Analysis {analysis_id} finished as {analysis.status} (label: {analysis.assessment_label})"
                    )

                else:
                    # Video: Scheduled for Milestone 6
                    # Honest state: DETECTOR_NOT_CONFIGURED
                    AnalysisStateMachine.validate_transition(
                        AnalysisStatus.PROCESSING, AnalysisStatus.DETECTOR_NOT_CONFIGURED
                    )
                    analysis.status = AnalysisStatus.DETECTOR_NOT_CONFIGURED.value
                    analysis.completed_at = now
                    analysis.assessment_label = None
                    analysis.assessment_score = None
                    analysis.score_semantics = "not_applicable"
                    analysis.summary = (
                        f"Analysis orchestration pipeline completed. The forensic detector adapter for '{media_type}' "
                        f"assets is not yet configured (Milestone 6 planned). No artificial scores or mock predictions generated."
                    )

                    analysis.detector_results.clear()
                    det_res = DetectorResult(
                        id=str(uuid.uuid4()),
                        analysis_id=analysis.id,
                        detector_name=f"{media_type}_forensic_adapter_v1",
                        detector_version="1.0.0",
                        status=DetectorStatus.NOT_CONFIGURED.value,
                        score=None,
                        score_semantics="not_applicable",
                        signals_json={},
                        limitations_json=[
                            f"Model weights and extraction pipeline for {media_type} scheduled for Milestone 6."
                        ],
                        created_at=now,
                    )
                    session.add(det_res)

                    analysis.provenance_checks.clear()
                    prov = ProvenanceCheck(
                        id=str(uuid.uuid4()),
                        analysis_id=analysis.id,
                        status="not_supported",
                        metadata_json={"file_sha256": upload.sha256},
                        content_credentials_status="unverified",
                        created_at=now,
                    )
                    session.add(prov)

                    await session.commit()
                    logger.info(f"Orchestrator: Analysis {analysis_id} finished as DETECTOR_NOT_CONFIGURED")

            except Exception as e:
                logger.error(f"Orchestrator: execution error on {analysis_id}: {e}", exc_info=True)
                try:
                    stmt = select(Analysis).where(Analysis.id == analysis_id)
                    res = await session.execute(stmt)
                    a = res.scalar_one_or_none()
                    if a:
                        a.status = AnalysisStatus.FAILED.value
                        a.completed_at = datetime.now(timezone.utc)
                        a.summary = f"Analysis pipeline encountered an internal execution error."
                        await session.commit()
                except Exception as inner_e:
                    logger.error(f"Failed to record failure state for {analysis_id}: {inner_e}")


orchestrator = AnalysisOrchestrator()
