from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from .common import MediaType
from .evidence import AnalysisExplanationSchema, EvidenceRecordSchema


class MediaMetadataSchema(BaseModel):
    filename: str
    sha256: str
    media_type: MediaType
    size_bytes: int


class DetectorBreakdownSchema(BaseModel):
    name: str
    version: str
    status: str
    score: Optional[float] = None
    semantics: Optional[str] = None


class ForensicReportResponse(BaseModel):
    report_id: str
    analysis_id: str
    generated_at: datetime
    media_metadata: MediaMetadataSchema
    verdict: Optional[str] = None
    verdict_status: Optional[str] = None
    explanation: Optional[AnalysisExplanationSchema] = None
    evidence_records: List[EvidenceRecordSchema] = Field(default_factory=list)
    supporting_evidence: List[EvidenceRecordSchema] = Field(default_factory=list)
    conflicting_evidence: List[EvidenceRecordSchema] = Field(default_factory=list)
    neutral_evidence: List[EvidenceRecordSchema] = Field(default_factory=list)
    unavailable_evidence: List[EvidenceRecordSchema] = Field(default_factory=list)
    video_audio_track: Optional[Dict[str, Any]] = None
    summary_statement: str
    evidence_points: List[str] = Field(default_factory=list)
    detector_breakdown: List[DetectorBreakdownSchema] = Field(default_factory=list)
    provenance_summary: str
    provenance_status: Optional[str] = None
    provenance_details: Optional[Dict[str, Any]] = None
    assessment_label: Optional[str] = None
    assessment_score: Optional[float] = None
    score_semantics: Optional[str] = None
    limitations_and_uncertainty: List[str] = Field(default_factory=list)
    human_review_recommended: bool = True
    model_inference: Optional[Dict[str, Any]] = None
    model_version: Optional[str] = None
    calibration_status: Optional[str] = None
    evaluation_reference: Optional[str] = None
    disclaimer: str
