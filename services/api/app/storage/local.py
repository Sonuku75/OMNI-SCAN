import os
import aiofiles
from app.core.config import settings
from app.core.errors import NotFoundError, OmniScanException
from .base import StorageAdapter


class LocalStorageAdapter(StorageAdapter):
    """
    Isolated local filesystem storage adapter.
    Enforces private storage isolation for development, test, and air-gapped environments.
    """

    def __init__(self, base_dir: str = settings.LOCAL_STORAGE_DIR):
        self.base_dir = os.path.abspath(base_dir)
        os.makedirs(self.base_dir, exist_ok=True)

    def is_configured(self) -> bool:
        return os.path.exists(self.base_dir) and os.access(self.base_dir, os.W_OK)

    def _get_path(self, object_key: str) -> str:
        # Prevent directory traversal in storage key
        safe_key = os.path.basename(object_key)
        return os.path.join(self.base_dir, safe_key)

    async def store_file(self, object_key: str, data: bytes, content_type: str) -> str:
        path = self._get_path(object_key)
        try:
            async with aiofiles.open(path, "wb") as f:
                await f.write(data)
            return object_key
        except Exception as e:
            raise OmniScanException(
                message=f"Local storage write failed: {e}",
                code="STORAGE_WRITE_ERROR",
                status_code=500,
            )

    async def get_file(self, object_key: str) -> bytes:
        path = self._get_path(object_key)
        if not os.path.exists(path):
            raise NotFoundError(f"Media object '{object_key}' not found in local storage.")
        try:
            async with aiofiles.open(path, "rb") as f:
                return await f.read()
        except Exception as e:
            raise OmniScanException(
                message=f"Local storage read failed: {e}",
                code="STORAGE_READ_ERROR",
                status_code=500,
            )

    async def delete_file(self, object_key: str) -> bool:
        path = self._get_path(object_key)
        if os.path.exists(path):
            try:
                os.remove(path)
                return True
            except OSError:
                return False
        return False

    async def get_presigned_url(self, object_key: str, expires_in: int = 900) -> str:
        # For local storage, returns an internal token-protected media route reference
        return f"/api/v1/media/{object_key}?expires={expires_in}"
