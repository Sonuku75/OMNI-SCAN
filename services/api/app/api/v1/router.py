from fastapi import APIRouter
from app.api.v1.endpoints import analyses, auth, health, reports, settings, uploads

api_v1_router = APIRouter()

api_v1_router.include_router(auth.router)
api_v1_router.include_router(health.router)
api_v1_router.include_router(uploads.router)
api_v1_router.include_router(analyses.router)
api_v1_router.include_router(reports.router)
api_v1_router.include_router(settings.router)
