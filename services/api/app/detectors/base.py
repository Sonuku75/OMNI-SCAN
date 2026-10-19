from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from app.schemas.common import DetectorStatus


class DetectorOutput(BaseModel):
    detector_name: str
    detector_version: str
    status: DetectorStatus
    score: Optional[float] = None
    score_semantics: Optional[str] = "not_applicable"
    signals: Dict[str, Any] = {}
    limitations: List[str] = []
    error: Optional[str] = None


class BaseDetector(ABC):
    """
    Abstract interface for multi-modal synthetic media and deepfake detectors.
    Ensures modularity: models and weights can be substituted without rewriting the core app.
    """

    def __init__(self, name: str, version: str):
        self.name = name
        self.version = version

    @abstractmethod
    def is_configured(self) -> bool:
        """
        Check if required model weights, dependencies, and credentials are present.
        """
        pass

    @abstractmethod
    async def predict(self, media_path: str, metadata: Dict[str, Any]) -> DetectorOutput:
        """
        Execute forensic inference on a media asset.
        Must return DetectorOutput with honest status and zero fabricated scores.
        """
        pass
