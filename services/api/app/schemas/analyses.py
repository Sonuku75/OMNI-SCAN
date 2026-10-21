from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from .common import AnalysisStatus, DetectorStatus, MediaType
from .evidence import AnalysisExplanationSchema, EvidenceRecordSchema


class AnalysisCreateRequest(BaseModel):
    upload_id: str
    requested_checks: List[str] = Field(default_factory=lambda: ["synthetic_media", "provenance"])


class AnalysisCreateResponse(BaseModel):
    analysis_id: str
    upload_id: str
    status: AnalysisStatus
    created_at: datetime


class DetectorResultSchema(BaseModel):
    detector_name: str
    detector_version: str
    status: DetectorStatus
    score: Optional[float] = None
    score_semantics: Optional[str] = None
    signals: Dict[str, Any] = Field(default_factory=dict)
    limitations: List[str] = Field(default_factory=list)
    error: Optional[str] = None


class ProvenanceResultSchema(BaseModel):
    status: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    content_credentials_status: str
    details: Optional[str] = None


class AnalysisSummarySchema(BaseModel):
    analysis_id: str
    upload_id: str
    filename: str
    media_type: MediaType
    status: AnalysisStatus
    verdict: Optional[str] = None
    assessment_label: Optional[str] = None
    assessment_score: Optional[float] = None
    score_semantics: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class UploadDetailSchema(BaseModel):
    upload_id: str
    filename: str
    media_type: MediaType
    mime_type: str
    size_bytes: int
    sha256: str
    duration_ms: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    created_at: datetime


class AnalysisDetailResponse(BaseModel):
    analysis_id: str
    status: AnalysisStatus
    verdict: Optional[str] = None
    verdict_status: Optional[str] = None
    explanation: Optional[AnalysisExplanationSchema] = None
    evidence_records: List[EvidenceRecordSchema] = Field(default_factory=list)
    supporting_evidence: List[EvidenceRecordSchema] = Field(default_factory=list)
    conflicting_evidence: List[EvidenceRecordSchema] = Field(default_factory=list)
    neutral_evidence: List[EvidenceRecordSchema] = Field(default_factory=list)
    unavailable_evidence: List[EvidenceRecordSchema] = Field(default_factory=list)
    video_audio_track: Optional[Dict[str, Any]] = None
    assessment_label: Optional[str] = None
    assessment_score: Optional[float] = None
    score_semantics: Optional[str] = None
    summary: Optional[str] = None
    upload: UploadDetailSchema
    detector_results: List[DetectorResultSchema] = Field(default_factory=list)
    provenance: ProvenanceResultSchema
    human_review_recommended: bool = True
    limitations_disclosure: List[str] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
    model_inference: Optional[Dict[str, Any]] = None
    forensic_heuristics: Optional[Dict[str, Any]] = None
    metadata_and_provenance: Optional[Dict[str, Any]] = None
    model_version: Optional[str] = None
    calibration_status: Optional[str] = None
    evaluation_reference: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class AnalysisListResponse(BaseModel):
    items: List[AnalysisSummarySchema]
    total: int
    page: int
    page_size: int
