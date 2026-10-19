from app.core.config import settings
from .base import StorageAdapter
from .local import LocalStorageAdapter
from .s3 import S3StorageAdapter

_adapter_instance = None


def get_storage_adapter() -> StorageAdapter:
    global _adapter_instance
    if _adapter_instance is None:
        if settings.STORAGE_PROVIDER.lower() in ("s3", "minio"):
            _adapter_instance = S3StorageAdapter()
        else:
            _adapter_instance = LocalStorageAdapter()
    return _adapter_instance


__all__ = ["StorageAdapter", "LocalStorageAdapter", "S3StorageAdapter", "get_storage_adapter"]
