def test_404_not_found_format(client):
    """Verify non-existent endpoints return structured RFC 7807 error format."""
    response = client.get("/api/v1/analyses/non-existent-uuid-12345")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "NOT_FOUND"
    assert "not found" in data["error"]["message"].lower()


def test_422_validation_error_format(client):
    """Verify malformed requests return structured validation error."""
    # POST /api/v1/analyses requires 'upload_id'
    response = client.post("/api/v1/analyses", json={})
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert "details" in data["error"]
