from typing import Dict, List, Optional
from app.schemas.common import DetectorStatus
from .base import BaseDetector


class DetectorRegistry:
    """
    Central registry for forensic media detectors.
    """

    def __init__(self):
        self._detectors: Dict[str, BaseDetector] = {}

    def register(self, detector: BaseDetector) -> None:
        self._detectors[detector.name] = detector

    def get(self, name: str) -> Optional[BaseDetector]:
        return self._detectors.get(name)

    def list_detectors(self) -> List[str]:
        return list(self._detectors.keys())

    def get_statuses(self) -> Dict[str, DetectorStatus]:
        return {
            name: (
                DetectorStatus.AVAILABLE
                if det.is_configured()
                else DetectorStatus.NOT_CONFIGURED
            )
            for name, det in self._detectors.items()
        }


detector_registry = DetectorRegistry()

# Register core image forensic detectors (Milestone 4)
from app.detectors.image.detector import ImageForensicsDetector
from app.detectors.image.model_adapter import PretrainedImageModelAdapter

detector_registry.register(ImageForensicsDetector())
detector_registry.register(PretrainedImageModelAdapter())

# Register core audio forensic detectors (Milestone 5)
from app.detectors.audio.detector import AudioForensicsDetector
from app.detectors.audio.model_adapter import PretrainedAudioModelAdapter

detector_registry.register(AudioForensicsDetector())
detector_registry.register(PretrainedAudioModelAdapter())
