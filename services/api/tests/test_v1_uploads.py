import io
import hashlib


def test_upload_valid_png_image(client):
    """Test valid PNG upload computes SHA-256 and persists metadata."""
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    expected_sha256 = hashlib.sha256(png_bytes).hexdigest()

    response = client.post(
        "/api/v1/uploads",
        files={"file": ("sample.png", io.BytesIO(png_bytes), "image/png")},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["original_filename"] == "sample.png"
    assert data["media_type"] == "image"
    assert data["mime_type"] == "image/png"
    assert data["size_bytes"] == len(png_bytes)
    assert data["sha256"] == expected_sha256
    assert data["status"] == "uploaded"


def test_upload_empty_file_rejected(client):
    """Test empty (0-byte) upload is rejected with 422 validation error."""
    response = client.post(
        "/api/v1/uploads",
        files={"file": ("empty.jpg", io.BytesIO(b""), "image/jpeg")},
    )
    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "VALIDATION_ERROR"


def test_upload_unsupported_executable_rejected(client):
    """Test unsupported binary payload is rejected with 415."""
    exe_bytes = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff"
    response = client.post(
        "/api/v1/uploads",
        files={"file": ("malicious.exe", io.BytesIO(exe_bytes), "application/x-dosexec")},
    )
    assert response.status_code == 415
    data = response.json()
    assert data["error"]["code"] == "UNSUPPORTED_MEDIA_TYPE"


def test_upload_filename_sanitization(client):
    """Test path traversal characters in filename are sanitized."""
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    response = client.post(
        "/api/v1/uploads",
        files={"file": ("../../etc/passwd.png", io.BytesIO(png_bytes), "image/png")},
    )
    assert response.status_code == 201
    data = response.json()
    assert ".." not in data["original_filename"]
    assert "/" not in data["original_filename"]
    assert data["original_filename"] == "passwd.png"
