import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_optional_user, verify_ownership
from app.core.database import get_db
from app.core.errors import NotFoundError, OmniScanException
from app.core.state_machine import AnalysisStateMachine
from app.detectors.base import DetectorOutput
from app.detectors.evidence_synthesizer import EvidenceSynthesizer
from app.models.analysis import Analysis
from app.models.detector_result import DetectorResult
from app.models.provenance import ProvenanceCheck
from app.models.upload import Upload
from app.models.user import User
from app.schemas.analyses import (
    AnalysisCreateRequest,
    AnalysisCreateResponse,
    AnalysisDetailResponse,
    AnalysisListResponse,
    AnalysisSummarySchema,
    DetectorResultSchema,
    ProvenanceResultSchema,
    UploadDetailSchema,
)
from app.schemas.evidence import AnalysisExplanationSchema, EvidenceRecordSchema
from app.schemas.common import AnalysisStatus, DetectorStatus, MediaType
from app.services.orchestrator import orchestrator
from app.storage import get_storage_adapter

router = APIRouter()


def synthesize_analysis_records(
    analysis: Analysis, upload: Upload, prov: Optional[ProvenanceCheck]
) -> Dict[str, Any]:
    forensics_out = DetectorOutput(
        detector_name=f"{upload.media_type}_forensics_v1",
        detector_version="1.0.0",
        status=DetectorStatus.NOT_CONFIGURED,
        score=None,
        score_semantics="not_applicable",
    )
    model_out = DetectorOutput(
        detector_name=f"{upload.media_type}_model_adapter_v1",
        detector_version="1.0.0",
        status=DetectorStatus.NOT_CONFIGURED,
        score=None,
        score_semantics="not_applicable",
    )

    for dr in analysis.detector_results:
        d_out = DetectorOutput(
            detector_name=dr.detector_name,
            detector_version=dr.detector_version,
            status=DetectorStatus(dr.status),
            score=dr.score,
            score_semantics=dr.score_semantics or "not_applicable",
            signals=dr.signals_json or {},
            limitations=dr.limitations_json or [],
        )
        if "forensic" in dr.detector_name:
            forensics_out = d_out
        elif "model" in dr.detector_name or "adapter" in dr.detector_name:
            model_out = d_out

    prov_data = {
        "status": prov.status if prov else "no_credentials_found",
        "metadata": prov.metadata_json if prov else {},
        "content_credentials_status": prov.content_credentials_status if prov else "unverified",
    }

    if upload.media_type == "image":
        return EvidenceSynthesizer.synthesize_image_analysis(
            forensics_output=forensics_out,
            model_output=model_out,
            provenance_data=prov_data,
            filename=upload.original_filename,
        )
    elif upload.media_type == "video":
        return EvidenceSynthesizer.synthesize_video_analysis(
            forensics_output=forensics_out,
            model_output=model_out,
            provenance_data=prov_data,
            filename=upload.original_filename,
        )
    elif upload.media_type == "audio":
        return EvidenceSynthesizer.synthesize_audio_analysis(
            forensics_output=forensics_out,
            model_output=model_out,
            provenance_data=prov_data,
            filename=upload.original_filename,
        )
    return {}


@router.post(
    "/analyses",
    response_model=AnalysisCreateResponse,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["Analyses"],
)
async def create_analysis(
    payload: AnalysisCreateRequest,
    background_tasks: BackgroundTasks,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> AnalysisCreateResponse:
    """
    Queue an asynchronous forensic analysis task on an uploaded media asset.
    Prevents duplicate concurrent jobs on the same asset.
    """
    # 1. Verify upload asset exists and is not soft-deleted
    stmt = select(Upload).where(Upload.id == payload.upload_id, Upload.deleted_at.is_(None))
    result = await db.execute(stmt)
    upload = result.scalar_one_or_none()
    if not upload:
        raise NotFoundError(f"Upload asset with ID '{payload.upload_id}' not found.")

    # 1b. Verify caller ownership of upload if owned
    verify_ownership(current_user, upload.owner_id)

    # 2. Check for existing active analysis on this upload (prevent duplicate processing)
    active_stmt = (
        select(Analysis)
        .where(
            Analysis.upload_id == payload.upload_id,
            Analysis.status.in_([AnalysisStatus.QUEUED.value, AnalysisStatus.PROCESSING.value]),
        )
    )
    active_result = await db.execute(active_stmt)
    existing_active = active_result.scalar_one_or_none()
    if existing_active:
        return AnalysisCreateResponse(
            analysis_id=existing_active.id,
            upload_id=existing_active.upload_id,
            status=AnalysisStatus(existing_active.status),
            created_at=existing_active.created_at,
        )

    # 3. Create persistent Analysis record in QUEUED state
    analysis_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    analysis = Analysis(
        id=analysis_id,
        upload_id=upload.id,
        owner_id=current_user.id if current_user else None,
        status=AnalysisStatus.QUEUED.value,
        assessment_label=None,
        assessment_score=None,
        score_semantics="not_applicable",
        summary="Analysis queued for background forensic processing.",
        created_at=now,
        started_at=None,
        completed_at=None,
    )
    db.add(analysis)
    await db.flush()

    # 4. Dispatch to background worker
    background_tasks.add_task(orchestrator.run_pipeline, analysis.id)

    return AnalysisCreateResponse(
        analysis_id=analysis.id,
        upload_id=upload.id,
        status=AnalysisStatus.QUEUED,
        created_at=analysis.created_at,
    )


@router.post(
    "/analyses/{analysis_id}/retry",
    response_model=AnalysisCreateResponse,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["Analyses"],
)
async def retry_analysis(
    analysis_id: str,
    background_tasks: BackgroundTasks,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> AnalysisCreateResponse:
    """
    Safely retry a failed or unconfigured analysis run.
    Validates state machine transitions to prevent corrupting state.
    """
    stmt = (
        select(Analysis)
        .where(Analysis.id == analysis_id)
        .options(selectinload(Analysis.upload))
    )
    result = await db.execute(stmt)
    analysis = result.scalar_one_or_none()
    if not analysis or analysis.upload.deleted_at is not None:
        raise NotFoundError(f"Analysis with ID '{analysis_id}' not found.")

    verify_ownership(current_user, analysis.owner_id)

    current_status = AnalysisStatus(analysis.status)
    if current_status in (AnalysisStatus.QUEUED, AnalysisStatus.PROCESSING):
        raise OmniScanException(
            message="Analysis is already in progress.",
            code="ANALYSIS_ALREADY_RUNNING",
            status_code=409,
        )
    if current_status == AnalysisStatus.COMPLETED:
        raise OmniScanException(
            message="Completed analyses are immutable and cannot be retried.",
            code="CANNOT_RETRY_COMPLETED",
            status_code=409,
        )

    # Validate transition: target is QUEUED
    AnalysisStateMachine.validate_transition(current_status, AnalysisStatus.QUEUED)
    analysis.status = AnalysisStatus.QUEUED.value
    analysis.started_at = None
    analysis.completed_at = None
    analysis.summary = "Analysis retry queued for background processing."
    await db.commit()

    background_tasks.add_task(orchestrator.run_pipeline, analysis.id)

    return AnalysisCreateResponse(
        analysis_id=analysis.id,
        upload_id=analysis.upload_id,
        status=AnalysisStatus.QUEUED,
        created_at=analysis.created_at,
    )


@router.get(
    "/analyses",
    response_model=AnalysisListResponse,
    tags=["Analyses"],
)
async def list_analyses(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    media_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> AnalysisListResponse:
    """
    List forensic analyses from database with pagination and filtering.
    """
    query = (
        select(Analysis)
        .join(Analysis.upload)
        .where(Upload.deleted_at.is_(None))
        .options(selectinload(Analysis.upload))
        .order_by(Analysis.created_at.desc())
    )

    if current_user:
        query = query.where((Analysis.owner_id == current_user.id) | (Analysis.owner_id.is_(None)))
    else:
        query = query.where(Analysis.owner_id.is_(None))

    if media_type and media_type != "all":
        query = query.where(Upload.media_type == media_type)
    if status and status != "all":
        query = query.where(Analysis.status == status)

    count_query = (
        select(func.count(Analysis.id))
        .join(Analysis.upload)
        .where(Upload.deleted_at.is_(None))
    )
    if current_user:
        count_query = count_query.where((Analysis.owner_id == current_user.id) | (Analysis.owner_id.is_(None)))
    else:
        count_query = count_query.where(Analysis.owner_id.is_(None))

    if media_type and media_type != "all":
        count_query = count_query.where(Upload.media_type == media_type)
    if status and status != "all":
        count_query = count_query.where(Analysis.status == status)

    total_count_res = await db.execute(count_query)
    total = total_count_res.scalar_one()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    analyses = result.scalars().all()

    items = [
        AnalysisSummarySchema(
            analysis_id=a.id,
            upload_id=a.upload_id,
            filename=a.upload.original_filename,
            media_type=MediaType(a.upload.media_type),
            status=AnalysisStatus(a.status),
            assessment_label=a.assessment_label,
            assessment_score=a.assessment_score,
            score_semantics=a.score_semantics,
            created_at=a.created_at,
            completed_at=a.completed_at,
        )
        for a in analyses
    ]

    return AnalysisListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/analyses/{analysis_id}",
    response_model=AnalysisDetailResponse,
    tags=["Analyses"],
)
async def get_analysis_detail(
    analysis_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> AnalysisDetailResponse:
    """
    Retrieve deep forensic inspection findings, detector results, and provenance from database.
    """
    stmt = (
        select(Analysis)
        .where(Analysis.id == analysis_id)
        .options(
            selectinload(Analysis.upload),
            selectinload(Analysis.detector_results),
            selectinload(Analysis.provenance_checks),
        )
    )
    result = await db.execute(stmt)
    analysis = result.scalar_one_or_none()

    if not analysis or analysis.upload.deleted_at is not None:
        raise NotFoundError(f"Analysis with ID '{analysis_id}' not found.")

    verify_ownership(current_user, analysis.owner_id)

    up = analysis.upload
    prov = analysis.provenance_checks[0] if analysis.provenance_checks else None

    prov_details = "Provenance check completed."
    if prov:
        if prov.metadata_json and "details" in prov.metadata_json:
            prov_details = str(prov.metadata_json["details"])
        elif prov.status == "verified":
            prov_details = "Cryptographic C2PA / JUMBF Content Credentials verified. Signing authority certified."
        elif prov.status == "invalid":
            prov_details = "C2PA / JUMBF provenance manifest failed cryptographic signature verification."
        elif prov.status == "no_credentials_found":
            prov_details = "No C2PA Content Credentials or digital signatures found. Standard container metadata inspected."
        elif prov.status == "not_supported":
            prov_details = "Media container format does not support standardized JUMBF/C2PA inspection."

    dynamic_limitations = []
    model_inference_data = None
    forensic_heuristics_data = None
    model_ver = None
    cal_status = None
    eval_ref = None

    for dr in analysis.detector_results:
        sig = dr.signals_json or {}
        if "model_adapter" in dr.detector_name or "model" in dr.detector_name:
            model_ver = dr.detector_version
            cal_status = sig.get("calibration_status")
            eval_ref = sig.get("evaluation_reference")
            if dr.status == "completed" and dr.score is not None:
                model_inference_data = sig.get("model_inference") or {
                    "architecture": sig.get("model_architecture"),
                    "synthetic_probability": dr.score,
                    "calibrated_threshold": sig.get("calibrated_threshold", 0.37),
                    "prediction": sig.get("prediction_label"),
                }
            elif dr.status == "not_configured":
                cal_status = "unconfigured"
        elif "forensic" in dr.detector_name:
            forensic_heuristics_data = {
                "detector_name": dr.detector_name,
                "score": dr.score,
                "score_semantics": dr.score_semantics,
                "signals": sig,
            }

        if dr.limitations_json:
            for lim in dr.limitations_json:
                if lim not in dynamic_limitations:
                    dynamic_limitations.append(lim)

    if not dynamic_limitations:
        dynamic_limitations = [
            "Forensic analysis produces probabilistic observations of statistical artifacts rather than mathematical certainty.",
            "Compression algorithms (e.g., social media re-encoding) can attenuate high-frequency forensic features.",
        ]

    metadata_and_provenance_data = {
        "provenance_status": prov.status if prov else "not_supported",
        "content_credentials": prov.content_credentials_status if prov else "unverified",
        "metadata": prov.metadata_json if prov else {},
        "details": prov_details,
    }

    # Synthesize evidence records, explanation, and verdict
    synth = synthesize_analysis_records(analysis, up, prov)
    verdict = synth.get("verdict")
    verdict_status = synth.get("verdict_status")
    explanation_raw = synth.get("explanation")
    explanation_obj = AnalysisExplanationSchema(**explanation_raw) if explanation_raw else None
    evidence_records_objs = [EvidenceRecordSchema(**r) for r in synth.get("evidence_records", [])]
    supporting_evidence_objs = [EvidenceRecordSchema(**r) for r in synth.get("supporting_evidence", [])]
    conflicting_evidence_objs = [EvidenceRecordSchema(**r) for r in synth.get("conflicting_evidence", [])]
    neutral_evidence_objs = [EvidenceRecordSchema(**r) for r in synth.get("neutral_evidence", [])]
    unavailable_evidence_objs = [EvidenceRecordSchema(**r) for r in synth.get("unavailable_evidence", [])]
    video_audio_track_data = synth.get("video_audio_track")

    return AnalysisDetailResponse(
        analysis_id=analysis.id,
        status=AnalysisStatus(analysis.status),
        verdict=verdict,
        verdict_status=verdict_status,
        explanation=explanation_obj,
        evidence_records=evidence_records_objs,
        supporting_evidence=supporting_evidence_objs,
        conflicting_evidence=conflicting_evidence_objs,
        neutral_evidence=neutral_evidence_objs,
        unavailable_evidence=unavailable_evidence_objs,
        video_audio_track=video_audio_track_data,
        assessment_label=analysis.assessment_label,
        assessment_score=analysis.assessment_score,
        score_semantics=analysis.score_semantics,
        summary=(
            analysis.summary
            if (analysis.status == "failed" and analysis.summary)
            else (explanation_raw.get("summary") if explanation_raw else analysis.summary)
        ),
        upload=UploadDetailSchema(
            upload_id=up.id,
            filename=up.original_filename,
            media_type=MediaType(up.media_type),
            mime_type=up.mime_type,
            size_bytes=up.size_bytes,
            sha256=up.sha256,
            duration_ms=up.duration_ms,
            width=up.width,
            height=up.height,
            created_at=up.created_at,
        ),
        detector_results=[
            DetectorResultSchema(
                detector_name=dr.detector_name,
                detector_version=dr.detector_version,
                status=DetectorStatus(dr.status),
                score=dr.score,
                score_semantics=dr.score_semantics,
                signals=dr.signals_json,
                limitations=dr.limitations_json,
            )
            for dr in analysis.detector_results
        ],
        provenance=ProvenanceResultSchema(
            status=prov.status if prov else "not_supported",
            metadata=prov.metadata_json if prov else {},
            content_credentials_status=prov.content_credentials_status if prov else "unverified",
            details=prov_details,
        ),
        human_review_recommended=True,
        limitations_disclosure=dynamic_limitations,
        limitations=dynamic_limitations,
        model_inference=model_inference_data,
        forensic_heuristics=forensic_heuristics_data,
        metadata_and_provenance=metadata_and_provenance_data,
        model_version=model_ver,
        calibration_status=cal_status,
        evaluation_reference=eval_ref,
        created_at=analysis.created_at,
        started_at=analysis.started_at,
        completed_at=analysis.completed_at,
    )


@router.delete(
    "/analyses/{analysis_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Analyses"],
)
async def delete_analysis(
    analysis_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Delete an analysis session, delete the media object from private storage,
    and update deletion retention history.
    """
    stmt = (
        select(Analysis)
        .where(Analysis.id == analysis_id)
        .options(selectinload(Analysis.upload))
    )
    result = await db.execute(stmt)
    analysis = result.scalar_one_or_none()

    if not analysis:
        raise NotFoundError(f"Analysis with ID '{analysis_id}' not found.")

    verify_ownership(current_user, analysis.owner_id)

    upload = analysis.upload
    now = datetime.now(timezone.utc)

    # 1. Permanently delete media file from private object storage
    storage = get_storage_adapter()
    await storage.delete_file(upload.object_key)

    # 2. Mark upload soft-deleted in retention history
    upload.deleted_at = now
    upload.status = "deleted"

    # 3. Remove analysis and cascading detector records
    await db.delete(analysis)
    await db.flush()

    return None
