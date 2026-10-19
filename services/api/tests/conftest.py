import os
import shutil
import sys
import tempfile
import pytest
import pytest_asyncio
from starlette.testclient import TestClient

# Ensure app is discoverable from tests
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.core.database import Base, get_db
from app.main import app as fastapi_app
from app.storage.local import LocalStorageAdapter
import app.storage as storage_module


@pytest.fixture(scope="session")
def test_temp_dir():
    temp_dir = tempfile.mkdtemp(prefix="omniscan_test_storage_")
    yield temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture(autouse=True)
def setup_test_environment(test_temp_dir):
    """
    Isolate test storage directory and ensure clean storage adapter instance.
    """
    settings.STORAGE_PROVIDER = "local"
    settings.LOCAL_STORAGE_DIR = test_temp_dir
    storage_module._adapter_instance = LocalStorageAdapter(base_dir=test_temp_dir)
    yield
    # Clean files in test storage dir
    for f in os.listdir(test_temp_dir):
        p = os.path.join(test_temp_dir, f)
        if os.path.isfile(p):
            os.remove(p)


@pytest.fixture
def client():
    """
    Synchronous TestClient for API endpoints.
    Uses database setup created during application lifecycle.
    """
    with TestClient(fastapi_app) as test_client:
        yield test_client
