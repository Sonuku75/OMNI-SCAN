from datetime import datetime, timezone
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.core.errors import (
    OmniScanException,
    generic_exception_handler,
    omniscan_exception_handler,
)
from app.core.logging import logger
from app.schemas.common import DetectorStatus
from app.schemas.health import DetectorHealth, HealthResponse, ServiceHealth

from contextlib import asynccontextmanager
from app.core.database import Base, check_db_connection, engine
import app.models

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION} [{settings.ENVIRONMENT}]")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="OmniScan Multi-Modal Deepfake & Synthetic Media Forensics API",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Safe CORS configuration - strict origins allowlist
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "X-Requested-With"],
)

# Exception handlers
app.add_exception_handler(OmniScanException, omniscan_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "The request payload failed schema validation.",
                "details": exc.errors(),
            }
        },
    )


from app.storage import get_storage_adapter

# Root Health Check (orchestrators and load balancers)
@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def root_health() -> HealthResponse:
    """
    Root health check endpoint for monitoring, Docker, and frontend status checks.
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


# Mount versioned v1 router
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)


