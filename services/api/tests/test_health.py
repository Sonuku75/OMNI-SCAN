def test_root_health_endpoint(client):
    """Verify GET /health returns healthy status, version, and unconfigured detector states."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "timestamp" in data
    assert "services" in data
    assert data["services"]["database"] == "connected"
    assert data["services"]["storage"] == "local"
    # In Milestone 5, image and audio detectors are available while video/provenance remain not_configured
    detectors = data["services"]["detectors"]
    assert detectors["image"] == "available"
    assert detectors["audio"] == "available"
    assert detectors["video"] == "not_configured"
    assert detectors["provenance"] == "not_configured"


def test_v1_health_endpoint(client):
    """Verify GET /api/v1/health responds with identical health schema."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
