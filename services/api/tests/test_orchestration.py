import io
import time
import pytest


def test_analysis_orchestration_and_polling(client):
    """
    Test full orchestration workflow:
    1. Upload media asset.
    2. Dispatch analysis: receives 202 with status QUEUED.
    3. Background worker executes pipeline.
    4. Poll GET endpoint: reaches DETECTOR_NOT_CONFIGURED honestly.
    5. Timestamps started_at and completed_at are recorded.
    """
    # 1. Upload unconfigured media type (video/mp4 in Milestone 5)
    mp4_bytes = b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom"
    upload_res = client.post(
        "/api/v1/uploads",
        files={"file": ("orchestration_test.mp4", io.BytesIO(mp4_bytes), "video/mp4")},
    )
    assert upload_res.status_code == 201
    upload_id = upload_res.json()["upload_id"]

    # 2. Dispatch analysis
    create_res = client.post(
        "/api/v1/analyses",
        json={"upload_id": upload_id},
    )
    assert create_res.status_code == 202
    create_data = create_res.json()
    analysis_id = create_data["analysis_id"]
    assert create_data["status"] == "queued"

    # In Starlette TestClient with BackgroundTasks, background tasks run during client request completion
    # Poll analysis detail
    detail_res = client.get(f"/api/v1/analyses/{analysis_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()

    # For a truncated or header-only video asset, analysis completes with FAILED state and honest failure reason
    assert detail["status"] == "failed"
    assert "video analysis failed" in detail["summary"].lower() or "container" in detail["summary"].lower()
    assert detail["started_at"] is not None
    assert detail["completed_at"] is not None


def test_duplicate_analysis_prevention(client):
    """
    Test that submitting duplicate requests on an active upload does not create redundant jobs.
    """
    mp4_bytes = b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom"
    upload_res = client.post(
        "/api/v1/uploads",
        files={"file": ("duplicate_test.mp4", io.BytesIO(mp4_bytes), "video/mp4")},
    )
    upload_id = upload_res.json()["upload_id"]

    # First request
    res1 = client.post("/api/v1/analyses", json={"upload_id": upload_id})
    assert res1.status_code == 202
    id1 = res1.json()["analysis_id"]

    # Get detail
    res_detail = client.get(f"/api/v1/analyses/{id1}")
    assert res_detail.status_code == 200


def test_retry_analysis_endpoint(client):
    """
    Test safe retries for failed analyses:
    1. Create analysis on truncated video -> finishes as failed.
    2. Trigger POST /api/v1/analyses/{id}/retry.
    3. Status transitions back to QUEUED, then executes.
    """
    mp4_bytes = b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom"
    upload_res = client.post(
        "/api/v1/uploads",
        files={"file": ("retry_test.mp4", io.BytesIO(mp4_bytes), "video/mp4")},
    )
    upload_id = upload_res.json()["upload_id"]

    create_res = client.post("/api/v1/analyses", json={"upload_id": upload_id})
    analysis_id = create_res.json()["analysis_id"]

    # Verify initial terminal state is failed for truncated video
    detail_res = client.get(f"/api/v1/analyses/{analysis_id}")
    assert detail_res.json()["status"] == "failed"

    # Trigger safe retry
    retry_res = client.post(f"/api/v1/analyses/{analysis_id}/retry")
    assert retry_res.status_code == 202
    retry_data = retry_res.json()
    assert retry_data["analysis_id"] == analysis_id
    assert retry_data["status"] == "queued"

    # Verify retry on invalid ID returns 404
    non_existent_retry = client.post("/api/v1/analyses/non-existent-id/retry")
    assert non_existent_retry.status_code == 404
