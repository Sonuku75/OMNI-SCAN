from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field
from .common import MediaType


class UploadResponse(BaseModel):
    upload_id: str
    original_filename: str
    media_type: MediaType
    mime_type: str
    size_bytes: int
    sha256: str
    status: str
    created_at: datetime
