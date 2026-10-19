import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "OmniScan Forensics API"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"

    # CORS configuration - strict origins list
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    SECRET_KEY: str = "dev-insecure-secret-key-32chars-min-change-in-prod"

    # Database configuration (PostgreSQL production / aiosqlite for isolated test & dev)
    DATABASE_URL: str = "sqlite+aiosqlite:///./omniscan.db"
    DATABASE_SYNC_URL: str = "sqlite:///./omniscan.db"

    # Private Object Storage (S3 / MinIO / Local)
    STORAGE_PROVIDER: str = "local"  # options: local, minio, s3
    STORAGE_BUCKET: str = "omniscan-media"
    LOCAL_STORAGE_DIR: str = "./local_storage"
    S3_ENDPOINT_URL: Optional[str] = None
    S3_ACCESS_KEY: Optional[str] = None
    S3_SECRET_KEY: Optional[str] = None
    S3_REGION: str = "us-east-1"
    PRESIGNED_URL_EXPIRES_SECONDS: int = 900  # 15 minutes

    # Media Processing Limits
    MAX_UPLOAD_SIZE_IMAGE_MB: int = 25
    MAX_UPLOAD_SIZE_AUDIO_MB: int = 50
    MAX_UPLOAD_SIZE_VIDEO_MB: int = 150

    # Image Forensic & Model Limits
    IMAGE_MAX_PIXELS: int = 50_000_000  # 50 Megapixels max (decompression bomb protection)
    IMAGE_MAX_DIMENSION: int = 8192      # 8192px width/height max
    IMAGE_DETECTOR_ENABLED: bool = True
    IMAGE_MODEL_PATH: Optional[str] = None
    IMAGE_MODEL_NAME: str = "resnet50_deepfake_v1"
    IMAGE_MODEL_DEVICE: str = "cpu"

    # Audio Forensic & Voice Clone Model Limits
    AUDIO_MAX_DURATION_SECONDS: int = 180  # 3 minutes max duration
    AUDIO_MAX_SAMPLE_RATE: int = 48000     # 48kHz standard max
    AUDIO_DETECTOR_ENABLED: bool = True
    AUDIO_MODEL_PATH: Optional[str] = None
    AUDIO_MODEL_NAME: str = "aasist_spoof_detector_v1"
    AUDIO_MODEL_DEVICE: str = "cpu"

    VIDEO_MAX_DURATION_SECONDS: int = 60
    VIDEO_MAX_FRAMES_SAMPLED: int = 100

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
