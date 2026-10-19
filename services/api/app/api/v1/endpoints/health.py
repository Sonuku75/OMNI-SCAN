from datetime import datetime, timezone
from fastapi import APIRouter
from app.core.config import settings
from app.core.database import check_db_connection
from app.schemas.health import DetectorHealth, HealthResponse, ServiceHealth
from app.schemas.common import DetectorStatus
from app.storage import get_storage_adapter

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def get_v1_health() -> HealthResponse:
    """
    Returns API v1 system health, database connectivity, and detector readiness.
    """
    db_connected = await check_db_connection()
    storage = get_storage_adapter()
    storage_ok = storage.is_configured()

    from app.detectors.registry import detector_registry
    img_det = detector_registry.get("image_forensics_v1")
    image_status = (
        DetectorStatus.AVAILABLE
        if (img_det and img_det.is_configured())
        else DetectorStatus.NOT_CONFIGURED
    )

    aud_det = detector_registry.get("audio_forensics_v1")
    audio_status = (
        DetectorStatus.AVAILABLE
        if (aud_det and aud_det.is_configured())
        else DetectorStatus.NOT_CONFIGURED
    )

    vid_det = detector_registry.get("video_forensics_v1")
    video_status = (
        DetectorStatus.AVAILABLE
        if (vid_det and vid_det.is_configured())
        else DetectorStatus.NOT_CONFIGURED
    )

    return HealthResponse(
        status="healthy" if (db_connected and storage_ok) else "degraded",
        version=settings.VERSION,
        timestamp=datetime.now(timezone.utc),
        services=ServiceHealth(
            database="connected" if db_connected else "disconnected",
            storage=settings.STORAGE_PROVIDER if storage_ok else "disconnected",
            detectors=DetectorHealth(
                image=image_status,
                audio=audio_status,
                video=video_status,
                provenance=DetectorStatus.NOT_CONFIGURED,
            ),
        ),
    )
