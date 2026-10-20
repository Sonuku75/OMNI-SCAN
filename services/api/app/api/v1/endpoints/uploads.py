import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_optional_user
from app.core.config import settings
from app.core.database import get_db
from app.core.errors import (
    PayloadTooLargeError,
    UnsupportedMediaTypeError,
    ValidationError,
)
from app.core.security import compute_sha256, sanitize_filename, validate_file_signature
from app.models.upload import Upload
from app.models.user import User
from app.schemas.common import MediaType
from app.schemas.uploads import UploadResponse
from app.storage import get_storage_adapter

router = APIRouter()


@router.post(
    "/uploads",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Uploads"],
)
async def upload_media(
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> UploadResponse:
    """
    Ingest, validate, fingerprint (SHA-256), store privately in object storage,
    and persist media asset metadata in PostgreSQL.
    """
    if not file.filename:
        raise ValidationError("Missing filename in upload request.")

    cleaned_name = sanitize_filename(file.filename)
    contents = await file.read()
    size_bytes = len(contents)

    if size_bytes == 0:
        raise ValidationError("Uploaded file is empty (0 bytes).")

    # 1. Server-side validation of file signature and MIME type (never trust client headers)
    is_valid, detected_mime = validate_file_signature(contents, cleaned_name)
    if not is_valid:
        raise UnsupportedMediaTypeError(
            f"File '{cleaned_name}' does not match permitted media signatures."
        )

    # 2. Determine media category and enforce size limits
    if detected_mime.startswith("image/"):
        media_type = MediaType.IMAGE
        max_bytes = settings.MAX_UPLOAD_SIZE_IMAGE_MB * 1024 * 1024
    elif detected_mime.startswith("audio/"):
        media_type = MediaType.AUDIO
        max_bytes = settings.MAX_UPLOAD_SIZE_AUDIO_MB * 1024 * 1024
    elif detected_mime.startswith("video/"):
        media_type = MediaType.VIDEO
        max_bytes = settings.MAX_UPLOAD_SIZE_VIDEO_MB * 1024 * 1024
    else:
        raise UnsupportedMediaTypeError(f"Unsupported media format: {detected_mime}")

    if size_bytes > max_bytes:
        raise PayloadTooLargeError(
            f"File exceeds maximum allowed size for {media_type.value} assets."
        )

    # 3. Compute SHA-256 fingerprint
    digest = compute_sha256(contents)
    upload_id = str(uuid.uuid4())
    object_key = f"{upload_id}_{cleaned_name}"

    # 4. Store media privately via StorageAdapter (S3 / MinIO / Local)
    storage = get_storage_adapter()
    await storage.store_file(object_key, contents, detected_mime)

    # 5. Persist upload metadata to database
    now = datetime.now(timezone.utc)
    upload_record = Upload(
        id=upload_id,
        owner_id=current_user.id if current_user else None,
        object_key=object_key,
        original_filename=cleaned_name,
        media_type=media_type.value,
        mime_type=detected_mime,
        size_bytes=size_bytes,
        sha256=digest,
        status="uploaded",
        created_at=now,
    )
    db.add(upload_record)
    await db.flush()

    return UploadResponse(
        upload_id=upload_record.id,
        original_filename=upload_record.original_filename,
        media_type=MediaType(upload_record.media_type),
        mime_type=upload_record.mime_type,
        size_bytes=upload_record.size_bytes,
        sha256=upload_record.sha256,
        status=upload_record.status,
        created_at=upload_record.created_at,
    )
