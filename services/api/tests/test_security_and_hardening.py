import io
import uuid
import pytest
from PIL import Image

from app.core.config import settings
from app.core.rate_limit import limiter


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Ensure clean rate limiter state for each test."""
    limiter.reset()
    yield
    limiter.reset()


def test_rate_limiter_general_threshold(client):
    """Verify general endpoint rate limiting throttles excessive requests with HTTP 429."""
    original_limit = settings.RATE_LIMIT_REQUESTS_PER_MINUTE
    original_enabled = settings.RATE_LIMIT_ENABLED
    settings.RATE_LIMIT_ENABLED = True
    settings.RATE_LIMIT_REQUESTS_PER_MINUTE = 5

    try:
        # 5 allowed requests
        for _ in range(5):
            res = client.get("/api/v1/analyses")
            assert res.status_code == 200

        # 6th request triggers rate limit
        res_blocked = client.get("/api/v1/analyses")
        assert res_blocked.status_code == 429
        data = res_blocked.json()
        assert data["error"]["code"] == "RATE_LIMIT_EXCEEDED"
        assert "Retry-After" in res_blocked.headers
    finally:
        settings.RATE_LIMIT_REQUESTS_PER_MINUTE = original_limit
        settings.RATE_LIMIT_ENABLED = original_enabled


def test_rate_limiter_auth_strict_threshold(client):
    """Verify stricter rate limit on authentication endpoints to prevent brute-force attacks."""
    original_limit = settings.AUTH_RATE_LIMIT_PER_MINUTE
    original_enabled = settings.RATE_LIMIT_ENABLED
    settings.RATE_LIMIT_ENABLED = True
    settings.AUTH_RATE_LIMIT_PER_MINUTE = 3

    try:
        # 3 rapid login attempts
        for _ in range(3):
            res = client.post(
                "/api/v1/auth/login",
                json={"email": "analyst@omniscan.example.com", "password": "WrongPassword!"},
            )
            assert res.status_code == 401

        # 4th attempt is rate-limited before hitting auth logic
        blocked = client.post(
            "/api/v1/auth/login",
            json={"email": "analyst@omniscan.example.com", "password": "WrongPassword!"},
        )
        assert blocked.status_code == 429
        assert blocked.json()["error"]["code"] == "RATE_LIMIT_EXCEEDED"
    finally:
        settings.AUTH_RATE_LIMIT_PER_MINUTE = original_limit
        settings.RATE_LIMIT_ENABLED = original_enabled


def test_rate_limiter_health_exemption(client):
    """Verify /health and monitoring endpoints are exempt from rate limiting."""
    original_limit = settings.RATE_LIMIT_REQUESTS_PER_MINUTE
    original_enabled = settings.RATE_LIMIT_ENABLED
    settings.RATE_LIMIT_ENABLED = True
    settings.RATE_LIMIT_REQUESTS_PER_MINUTE = 2

    try:
        # Exhaust general rate limit on API
        client.get("/api/v1/analyses")
        client.get("/api/v1/analyses")
        blocked = client.get("/api/v1/analyses")
        assert blocked.status_code == 429

        # Health checks remain accessible and 200 OK
        for _ in range(5):
            health_res = client.get("/health")
            assert health_res.status_code == 200
            assert health_res.json()["status"] == "healthy"
    finally:
        settings.RATE_LIMIT_REQUESTS_PER_MINUTE = original_limit
        settings.RATE_LIMIT_ENABLED = original_enabled


@pytest.mark.asyncio
async def test_unconfigured_model_graceful_handling():
    """
    Verify zero-fabrication: unconfigured image, audio, and video models
    return detector_not_configured and never invent predictions.
    """
    from app.detectors.image.model_adapter import PretrainedImageModelAdapter
    from app.detectors.audio.model_adapter import PretrainedAudioModelAdapter
    from app.detectors.video.model_adapter import PretrainedVideoModelAdapter
    from app.schemas.common import DetectorStatus

    img_adapter = PretrainedImageModelAdapter()
    assert img_adapter.is_configured() is False
    img_res = await img_adapter.predict("dummy_path", {})
    assert img_res.status == DetectorStatus.NOT_CONFIGURED
    assert img_res.score is None

    aud_adapter = PretrainedAudioModelAdapter()
    assert aud_adapter.is_configured() is False
    aud_res = await aud_adapter.predict("dummy_path", {})
    assert aud_res.status == DetectorStatus.NOT_CONFIGURED
    assert aud_res.score is None

    vid_adapter = PretrainedVideoModelAdapter()
    assert vid_adapter.is_configured() is False
    vid_res = await vid_adapter.predict([], {})
    assert vid_res.status == DetectorStatus.NOT_CONFIGURED
    assert vid_res.score is None
