from abc import ABC, abstractmethod
from typing import Optional


class StorageAdapter(ABC):
    """
    Abstract contract for private media object storage.
    Supports S3, MinIO, and isolated local filesystem storage.
    """

    @abstractmethod
    async def store_file(self, object_key: str, data: bytes, content_type: str) -> str:
        """
        Store raw media bytes privately under the designated object key.
        Returns the object key.
        """
        pass

    @abstractmethod
    async def get_file(self, object_key: str) -> bytes:
        """
        Retrieve raw media bytes for internal forensic processing.
        """
        pass

    @abstractmethod
    async def delete_file(self, object_key: str) -> bool:
        """
        Permanently delete the media object from storage.
        """
        pass

    @abstractmethod
    async def get_presigned_url(self, object_key: str, expires_in: int = 900) -> str:
        """
        Generate a short-lived private access URL. Never returns a permanent public URL.
        """
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        """
        Verify whether the storage adapter is ready and configured.
        """
        pass
