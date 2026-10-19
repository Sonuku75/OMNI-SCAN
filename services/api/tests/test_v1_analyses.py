import io
from PIL import Image


def test_create_and_get_analysis(client):
    """Test full analysis lifecycle: upload media, create analysis, get detail, and delete."""
    # 1. Upload valid image asset
    bio = io.BytesIO()
    Image.new("RGB", (32, 32), (100, 150, 200)).save(bio, "PNG")
    png_bytes = bio.getvalue()
    upload_res = client.post(
        "/api/v1/uploads",
        files={"file": ("evidence.png", io.BytesIO(png_bytes), "image/png")},
    )
    assert upload_res.status_code == 201
    upload_id = upload_res.json()["upload_id"]

    # 2. Create analysis
    analysis_res = client.post(
        "/api/v1/analyses",
        json={"upload_id": upload_id, "requested_checks": ["synthetic_media"]},
    )
    assert analysis_res.status_code == 202
    analysis_data = analysis_res.json()
    analysis_id = analysis_data["analysis_id"]
    # State is created as queued, then processed by background orchestrator
    assert analysis_data["status"] == "queued"

    # 3. List analyses
    list_res = client.get("/api/v1/analyses")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert any(a["analysis_id"] == analysis_id for a in list_data["items"])

    # 4. Get detailed analysis findings
    detail_res = client.get(f"/api/v1/analyses/{analysis_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["analysis_id"] == analysis_id
    assert detail["status"] == "completed"
    assert detail["upload"]["filename"] == "evidence.png"
    assert len(detail["detector_results"]) > 0
    assert detail["detector_results"][0]["status"] == "completed"

    # 5. Get printable report
    report_res = client.get(f"/api/v1/analyses/{analysis_id}/report")
    assert report_res.status_code == 200
    report = report_res.json()
    assert report["analysis_id"] == analysis_id
    assert "disclaimer" in report
    assert report["media_metadata"]["filename"] == "evidence.png"

    # 6. Delete analysis
    del_res = client.delete(f"/api/v1/analyses/{analysis_id}")
    assert del_res.status_code == 204

    # 7. Verify 404 after deletion
    get_after_del = client.get(f"/api/v1/analyses/{analysis_id}")
    assert get_after_del.status_code == 404


def test_create_analysis_invalid_upload_id(client):
    """Test creating analysis with nonexistent upload ID returns 404."""
    response = client.post(
        "/api/v1/analyses",
        json={"upload_id": "nonexistent-upload-id"},
    )
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "NOT_FOUND"
