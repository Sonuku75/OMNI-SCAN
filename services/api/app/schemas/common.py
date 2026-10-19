from enum import Enum
from typing import Any, Generic, List, Optional, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class MediaType(str, Enum):
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"


class AnalysisStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    DETECTOR_NOT_CONFIGURED = "detector_not_configured"


class DetectorStatus(str, Enum):
    AVAILABLE = "available"
    COMPLETED = "completed"
    FAILED = "failed"
    NOT_CONFIGURED = "not_configured"
    DISABLED = "disabled"


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None


class ErrorResponse(BaseModel):
    error: ErrorDetail
