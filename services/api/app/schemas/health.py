from datetime import datetime
from typing import Dict
from pydantic import BaseModel
from .common import DetectorStatus


class DetectorHealth(BaseModel):
    image: DetectorStatus
    audio: DetectorStatus
    video: DetectorStatus
    provenance: DetectorStatus


class ServiceHealth(BaseModel):
    database: str
    storage: str
    detectors: DetectorHealth


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime
    services: ServiceHealth
