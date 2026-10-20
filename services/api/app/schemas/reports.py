from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from .common import MediaType


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
    disclaimer: str
