import asyncio
import io
from typing import Optional
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from app.core.config import settings
from app.core.errors import OmniScanException
from app.core.logging import logger
from .base import StorageAdapter


class S3StorageAdapter(StorageAdapter):
    """
    Private S3 & MinIO object storage adapter.
    Enforces private ACLs, never creates public bucket policies,
    and grants ephemeral access via expiring pre-signed URLs.
    """

    def __init__(
        self,
        bucket_name: str = settings.STORAGE_BUCKET,
        endpoint_url: Optional[str] = settings.S3_ENDPOINT_URL,
        access_key: Optional[str] = settings.S3_ACCESS_KEY,
        secret_key: Optional[str] = settings.S3_SECRET_KEY,
        region_name: str = settings.S3_REGION,
    ):
        self.bucket_name = bucket_name
        self.endpoint_url = endpoint_url
        self.access_key = access_key
        self.secret_key = secret_key
        self.region_name = region_name

        self._client = None
        if self.is_configured():
            self._client = boto3.client(
                "s3",
                endpoint_url=self.endpoint_url,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=self.region_name,
                config=Config(signature_version="s3v4"),
            )

    def is_configured(self) -> bool:
        return bool(self.access_key and self.secret_key and self.bucket_name)

    async def store_file(self, object_key: str, data: bytes, content_type: str) -> str:
        if not self._client:
            raise OmniScanException(
                message="S3 / MinIO storage adapter is not configured.",
                code="STORAGE_NOT_CONFIGURED",
                status_code=503,
            )

        def _upload():
            self._client.put_object(
                Bucket=self.bucket_name,
                Key=object_key,
                Body=data,
                ContentType=content_type,
                ServerSideEncryption="AES256" if not self.endpoint_url else None,
            )

        try:
            await asyncio.to_thread(_upload)
            return object_key
        except ClientError as e:
            logger.error(f"S3 upload failed for key {object_key}: {e}")
            raise OmniScanException(
                message="Failed to store media object in private storage.",
                code="STORAGE_WRITE_ERROR",
                status_code=500,
            )

    async def get_file(self, object_key: str) -> bytes:
        if not self._client:
            raise OmniScanException(
                message="S3 / MinIO storage adapter is not configured.",
                code="STORAGE_NOT_CONFIGURED",
                status_code=503,
            )

        def _download():
            bio = io.BytesIO()
            self._client.download_fileobj(self.bucket_name, object_key, bio)
            return bio.getvalue()

        try:
            return await asyncio.to_thread(_download)
        except ClientError as e:
            logger.error(f"S3 download failed for key {object_key}: {e}")
            raise OmniScanException(
                message="Failed to read media object from private storage.",
                code="STORAGE_READ_ERROR",
                status_code=404,
            )

    async def delete_file(self, object_key: str) -> bool:
        if not self._client:
            return False

        def _delete():
            self._client.delete_object(Bucket=self.bucket_name, Key=object_key)
            return True

        try:
            return await asyncio.to_thread(_delete)
        except ClientError as e:
            logger.error(f"S3 deletion failed for key {object_key}: {e}")
            return False

    async def get_presigned_url(self, object_key: str, expires_in: int = 900) -> str:
        if not self._client:
            raise OmniScanException(
                message="S3 / MinIO storage adapter is not configured.",
                code="STORAGE_NOT_CONFIGURED",
                status_code=503,
            )

        def _presign():
            return self._client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket_name, "Key": object_key},
                ExpiresIn=expires_in,
            )

        try:
            return await asyncio.to_thread(_presign)
        except ClientError as e:
            logger.error(f"Presigned URL generation failed: {e}")
            raise OmniScanException(
                message="Could not generate pre-signed access URL.",
                code="STORAGE_PRESIGN_ERROR",
                status_code=500,
            )
