import hashlib
import os
import re
from typing import Tuple


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename against directory traversal and control characters.
    """
    # Strip paths
    clean = os.path.basename(filename)
    # Strip null bytes and control chars
    clean = re.sub(r"[\x00-\x1f\x7f-\x9f]", "", clean)
    # Strip path separators
    clean = clean.replace("/", "_").replace("\\", "_")
    return clean.strip() or "unnamed_media"


def compute_sha256(data: bytes) -> str:
    """
    Compute cryptographic SHA-256 digest over byte stream.
    """
    hasher = hashlib.sha256()
    hasher.update(data)
    return hasher.hexdigest()


def validate_file_signature(data: bytes, filename: str) -> Tuple[bool, str]:
    """
    Validate magic bytes for common forensic media formats.
    Returns (is_valid, detected_mime_type).
    """
    if len(data) < 4:
        return False, "application/octet-stream"

    # PNG: 89 50 4E 47
    if data[:4] == b"\x89PNG":
        return True, "image/png"

    # JPEG: FF D8 FF
    if data[:3] == b"\xff\xd8\xff":
        return True, "image/jpeg"

    # RIFF container (WAV or WEBP)
    if data[:4] == b"RIFF" and len(data) >= 12:
        tag = data[8:12]
        if tag == b"WEBP":
            return True, "image/webp"
        if tag == b"WAVE":
            return True, "audio/wav"

    # MP3: ID3 tag or MPEG sync word
    if data[:3] == b"ID3" or (len(data) >= 2 and data[0] == 0xFF and (data[1] & 0xE0) == 0xE0):
        return True, "audio/mpeg"

    # MP4 / MOV: ftyp box
    if len(data) >= 8 and data[4:8] == b"ftyp":
        return True, "video/mp4"

    # Fallback to extension check if format is compliant
    ext = os.path.splitext(filename)[1].lower()
    ext_map = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".wav": "audio/wav",
        ".mp3": "audio/mpeg",
        ".m4a": "audio/mp4",
        ".mp4": "video/mp4",
        ".mov": "video/quicktime",
    }
    if ext in ext_map:
        return True, ext_map[ext]

    return False, "application/octet-stream"
