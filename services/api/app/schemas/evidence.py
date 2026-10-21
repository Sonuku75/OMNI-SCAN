"""Shared Evidence Schema for Multi-Modal Forensic Detection.

Defines standardized evidence records across Image, Video, and Audio modalities.
Conforms strictly to the Zero-Fabrication Mandate:
- Findings must represent genuine measured physical signals or validated model predictions
- Relationships to verdict (supporting, conflicting, neutral, unavailable) are mathematically grounded
- Correlated signals are not falsely counted as independent proof
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class VerdictType(str, Enum):
    LIKELY_AI_GENERATED = "LIKELY AI-GENERATED"
    LIKELY_REAL = "LIKELY REAL"
    LIKELY_MANIPULATED = "LIKELY MANIPULATED"
    INCONCLUSIVE = "INCONCLUSIVE"
    ANALYSIS_UNAVAILABLE = "ANALYSIS UNAVAILABLE"


class EvidenceRelationship(str, Enum):
    SUPPORTING = "supporting"
    CONFLICTING = "conflicting"
    NEUTRAL = "neutral"
    UNAVAILABLE = "unavailable"


class EvidenceSource(str, Enum):
    LEARNED_MODEL = "learned_model"
    DETERMINISTIC_FORENSIC = "deterministic_forensic"
    METADATA_PROVENANCE = "metadata_provenance"
    TEMPORAL_CONSISTENCY = "temporal_consistency"
    ACOUSTIC_FORENSIC = "acoustic_forensic"


class EvidenceRecordSchema(BaseModel):
    """Atomic evidence observation generated during multi-modal inspection."""
    evidence_id: str
    source: str
    method: str
    finding: str
    measured_value: str
    interpretation: str
    relationship_to_verdict: str  # "supporting" | "conflicting" | "neutral" | "unavailable"
    timestamp_start: Optional[float] = None
    timestamp_end: Optional[float] = None
    frame_number: Optional[int] = None
    image_region: Optional[Dict[str, Any]] = None
    limitations: Optional[str] = None
    availability_status: str = "available"  # "available" | "not_configured" | "failed" | "not_applicable"


class AnalysisExplanationSchema(BaseModel):
    """Structured explanation detailing 'Why this result?' for non-technical users."""
    summary: str
    model_prediction_summary: str
    forensic_observations_summary: str
    supporting_points: List[str] = Field(default_factory=list)
    conflicting_points: List[str] = Field(default_factory=list)
    unavailable_points: List[str] = Field(default_factory=list)
    limitations_summary: str
