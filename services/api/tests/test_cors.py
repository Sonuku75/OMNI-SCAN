def test_cors_allowed_origin(client):
    """Verify that requests from allowed frontend origins receive proper CORS response headers."""
    response = client.get("/health", headers={"Origin": "http://localhost:3000"})
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"
    assert response.headers.get("access-control-allow-credentials") == "true"


def test_cors_disallowed_origin(client):
    """Verify that requests from untrusted origins do not receive CORS allow-origin header."""
    response = client.get("/health", headers={"Origin": "http://untrusted-malicious-site.com"})
    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers
