import io
import uuid
import pytest
from PIL import Image

from app.core.auth import hash_password, verify_password, create_access_token, decode_access_token
from app.provenance.service import ProvenanceVerifier, ProvenanceOutcome


def test_password_hashing_and_verification():
    """Verify bcrypt hashing and verification behavior."""
    raw = "SecurePassword123!"
    hashed = hash_password(raw)
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_jwt_token_generation_and_decoding():
    """Verify JWT access token generation and payload decoding."""
    user_id = str(uuid.uuid4())
    email = "analyst@omniscan.example.com"
    token = create_access_token(user_id=user_id, email=email)
    payload = decode_access_token(token)
    assert payload["sub"] == user_id
    assert payload["email"] == email
    assert "exp" in payload


def test_user_registration_and_login_lifecycle(client):
    """Test user registration, duplicate handling, login, and profile retrieval."""
    unique_email = f"analyst_{uuid.uuid4().hex[:8]}@omniscan.example.com"
    password = "CorrectHorseBatteryStaple99!"

    # 1. Register new user
    reg_res = client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": password, "full_name": "Test Analyst"},
    )
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == unique_email
    assert "password" not in reg_data["user"]
    assert "password_hash" not in reg_data["user"]

    # 2. Duplicate registration returns 409
    dup_res = client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": password},
    )
    assert dup_res.status_code == 409

    # 3. Login with correct credentials
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": password},
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    token = login_data["access_token"]
    assert token

    # 4. Login with incorrect password returns 401
    bad_login = client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": "WrongPassword123!"},
    )
    assert bad_login.status_code == 401

    # 5. Fetch current user via /me
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == unique_email

    # 6. Fetch /me without auth returns 401
    unauth_me = client.get("/api/v1/auth/me")
    assert unauth_me.status_code == 401


def test_cross_user_data_isolation(client):
    """
    Verify that analyses owned by User A cannot be inspected, retrieved,
    or deleted by User B.
    """
    # Create User A
    email_a = f"user_a_{uuid.uuid4().hex[:8]}@omniscan.example.com"
    res_a = client.post(
        "/api/v1/auth/register",
        json={"email": email_a, "password": "PasswordA123!"},
    )
    assert res_a.status_code == 201
    token_a = res_a.json()["access_token"]

    # Create User B
    email_b = f"user_b_{uuid.uuid4().hex[:8]}@omniscan.example.com"
    res_b = client.post(
        "/api/v1/auth/register",
        json={"email": email_b, "password": "PasswordB123!"},
    )
    assert res_b.status_code == 201
    token_b = res_b.json()["access_token"]

    # User A uploads a file
    bio = io.BytesIO()
    Image.new("RGB", (32, 32), (50, 100, 150)).save(bio, "PNG")
    png_bytes = bio.getvalue()

    upload_res = client.post(
        "/api/v1/uploads",
        files={"file": ("private_asset.png", io.BytesIO(png_bytes), "image/png")},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert upload_res.status_code == 201
    upload_id = upload_res.json()["upload_id"]

    # User A creates an analysis
    analysis_res = client.post(
        "/api/v1/analyses",
        json={"upload_id": upload_id},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert analysis_res.status_code == 202
    analysis_id = analysis_res.json()["analysis_id"]

    # User A can get their analysis
    get_res_a = client.get(
        f"/api/v1/analyses/{analysis_id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert get_res_a.status_code == 200
    assert get_res_a.json()["analysis_id"] == analysis_id

    # User B CANNOT get User A's analysis (returns 404 to avoid ID probing)
    get_res_b = client.get(
        f"/api/v1/analyses/{analysis_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert get_res_b.status_code in (403, 404)

    # User B CANNOT get User A's report
    report_res_b = client.get(
        f"/api/v1/analyses/{analysis_id}/report",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert report_res_b.status_code in (403, 404)

    # User B CANNOT delete User A's analysis
    del_res_b = client.delete(
        f"/api/v1/analyses/{analysis_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert del_res_b.status_code in (403, 404)

    # User A CAN delete their analysis
    del_res_a = client.delete(
        f"/api/v1/analyses/{analysis_id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert del_res_a.status_code == 204


def test_provenance_verifier_outcomes():
    """Verify ProvenanceVerifier categorizes outcomes accurately without fabrication."""
    # 1. Standard PNG image with no JUMBF/C2PA credentials
    bio = io.BytesIO()
    Image.new("RGB", (64, 64), (10, 20, 30)).save(bio, "PNG")
    res = ProvenanceVerifier.verify(bio.getvalue(), "plain.png", "image/png")
    assert res["status"] == ProvenanceOutcome.NO_CREDENTIALS_FOUND.value
    assert res["content_credentials_status"] == "no_credentials"
    assert "manifest_found" in res["metadata"]
    assert res["metadata"]["manifest_found"] is False

    # 2. Unsupported MIME format
    res_unsupported = ProvenanceVerifier.verify(b"dummy pdf content", "doc.pdf", "application/pdf")
    assert res_unsupported["status"] == ProvenanceOutcome.NOT_SUPPORTED.value
    assert res_unsupported["content_credentials_status"] == "not_supported"

    # 3. Synthetic C2PA manifest marker
    # Simulated media containing JUMBF box marker
    c2pa_simulated = b"\x00" * 20 + b"c2pa" + b"\x00" * 50
    res_c2pa = ProvenanceVerifier.verify(c2pa_simulated, "signed.jpg", "image/jpeg")
    assert res_c2pa["status"] in (ProvenanceOutcome.VERIFIED.value, ProvenanceOutcome.INVALID.value)
    assert res_c2pa["metadata"]["manifest_found"] is True


def test_report_json_html_and_export_endpoints(client):
    """
    Test generating reports in JSON, printable HTML, and downloadable export formats.
    """
    # 1. Upload media and create analysis
    bio = io.BytesIO()
    Image.new("RGB", (32, 32), (120, 140, 160)).save(bio, "PNG")
    png_bytes = bio.getvalue()

    upload_res = client.post(
        "/api/v1/uploads",
        files={"file": ("report_test.png", io.BytesIO(png_bytes), "image/png")},
    )
    assert upload_res.status_code == 201
    upload_id = upload_res.json()["upload_id"]

    analysis_res = client.post(
        "/api/v1/analyses",
        json={"upload_id": upload_id},
    )
    assert analysis_res.status_code == 202
    analysis_id = analysis_res.json()["analysis_id"]

    # 2. JSON Report
    json_report_res = client.get(f"/api/v1/analyses/{analysis_id}/report")
    assert json_report_res.status_code == 200
    report_json = json_report_res.json()
    assert report_json["analysis_id"] == analysis_id
    assert report_json["report_id"].startswith("REP-")
    assert "evidence_points" in report_json
    assert "provenance_summary" in report_json
    assert "limitations_and_uncertainty" in report_json
    assert "disclaimer" in report_json

    # 3. HTML Report
    html_report_res = client.get(f"/api/v1/analyses/{analysis_id}/report/html")
    assert html_report_res.status_code == 200
    assert "text/html" in html_report_res.headers.get("content-type", "")
    html_text = html_report_res.text
    assert "OmniScan" in html_text
    assert report_json["report_id"] in html_text
    assert "report_test.png" in html_text
    assert "@media print" in html_text

    # 4. Export JSON
    export_json_res = client.get(f"/api/v1/analyses/{analysis_id}/report/export?format=json")
    assert export_json_res.status_code == 200
    assert "application/json" in export_json_res.headers.get("content-type", "")
    assert "attachment;" in export_json_res.headers.get("content-disposition", "")
    assert f"omniscan-report-{analysis_id[:8]}.json" in export_json_res.headers.get("content-disposition", "")

    # 5. Export HTML
    export_html_res = client.get(f"/api/v1/analyses/{analysis_id}/report/export?format=html")
    assert export_html_res.status_code == 200
    assert "text/html" in export_html_res.headers.get("content-type", "")
    assert "attachment;" in export_html_res.headers.get("content-disposition", "")
    assert f"omniscan-report-{analysis_id[:8]}.html" in export_html_res.headers.get("content-disposition", "")
