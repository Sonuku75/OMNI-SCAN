from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()


@router.get("/settings", tags=["Settings"])
def get_system_settings() -> dict:
    """
    Retrieve application settings and environment boundaries (secrets redacted).
    """
    return {
        "project_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "storage_provider": settings.STORAGE_PROVIDER,
        "limits": {
            "image_max_mb": settings.MAX_UPLOAD_SIZE_IMAGE_MB,
            "audio_max_mb": settings.MAX_UPLOAD_SIZE_AUDIO_MB,
            "video_max_mb": settings.MAX_UPLOAD_SIZE_VIDEO_MB,
            "video_max_duration_seconds": settings.VIDEO_MAX_DURATION_SECONDS,
            "video_max_frames": settings.VIDEO_MAX_FRAMES_SAMPLED,
        },
    }
