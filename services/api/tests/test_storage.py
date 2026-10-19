import pytest
from app.core.errors import NotFoundError, OmniScanException
from app.storage.local import LocalStorageAdapter
from app.storage.s3 import S3StorageAdapter


@pytest.mark.asyncio
async def test_local_storage_store_and_retrieve(tmp_path):
    """Test LocalStorageAdapter stores bytes privately and retrieves identical content."""
    adapter = LocalStorageAdapter(base_dir=str(tmp_path))
    assert adapter.is_configured() is True

    test_data = b"Forensic sample content bytes 1234567890"
    key = "evidence_01.png"

    stored_key = await adapter.store_file(key, test_data, "image/png")
    assert stored_key == key

    retrieved = await adapter.get_file(key)
    assert retrieved == test_data

    # Test presigned / private access reference URL
    url = await adapter.get_presigned_url(key, expires_in=300)
    assert key in url
    assert "expires=300" in url

    # Test deletion
    deleted = await adapter.delete_file(key)
    assert deleted is True

    # After deletion, retrieve should raise NotFoundError
    with pytest.raises(NotFoundError):
        await adapter.get_file(key)


@pytest.mark.asyncio
async def test_local_storage_path_traversal_prevention(tmp_path):
    """Test that path traversal attempts in storage keys are safely neutralized."""
    adapter = LocalStorageAdapter(base_dir=str(tmp_path))
    test_data = b"malicious traversal attempt"

    # Key containing traversal characters
    traversal_key = "../../../outside_evidence.png"
    stored_key = await adapter.store_file(traversal_key, test_data, "image/png")
    assert stored_key == traversal_key

    # File should be confined inside adapter.base_dir
    retrieved = await adapter.get_file(traversal_key)
    assert retrieved == test_data


def test_s3_storage_unconfigured_error():
    """Test S3StorageAdapter cleanly handles missing cloud credentials without crashing."""
    adapter = S3StorageAdapter(
        bucket_name="",
        access_key=None,
        secret_key=None,
    )
    assert adapter.is_configured() is False
