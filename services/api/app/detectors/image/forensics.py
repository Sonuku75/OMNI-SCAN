import io
import math
from typing import Any, Dict, List, Optional, Tuple
import cv2
import numpy as np
from PIL import Image, ImageChops, ImageOps, UnidentifiedImageError

from app.core.config import settings
from app.core.logging import logger

# Decompression bomb mitigation: cap max pixels
Image.MAX_IMAGE_PIXELS = settings.IMAGE_MAX_PIXELS

# Known generative / editing software signatures
AI_TOOL_SIGNATURES = [
    "stable diffusion",
    "midjourney",
    "dall-e",
    "comfyui",
    "automatic1111",
    "novelai",
    "adobe firefly",
    "bing image creator",
]

EDITING_TOOL_SIGNATURES = [
    "photoshop",
    "gimp",
    "lightroom",
    "affinity",
    "canva",
    "snapseed",
]


class ImageForensicExtractionError(Exception):
    """Raised when an image cannot be processed or violates security boundaries."""
    pass


def safe_open_image(image_bytes: bytes) -> Tuple[Image.Image, str]:
    """
    Safely decode raw image bytes with size, dimension, and decompression bomb protections.
    Returns the decoded PIL Image and the detected format.
    """
    if not image_bytes:
        raise ImageForensicExtractionError("Empty media byte payload received.")

    try:
        bio = io.BytesIO(image_bytes)
        img = Image.open(bio)
        img.load()  # Force decode to detect truncated or corrupted files
    except Image.DecompressionBombError as e:
        raise ImageForensicExtractionError(f"Decompression bomb detected: {e}")
    except (UnidentifiedImageError, OSError, SyntaxError) as e:
        raise ImageForensicExtractionError(f"Corrupt or unsupported image stream: {e}")

    width, height = img.size
    total_pixels = width * height

    if total_pixels > settings.IMAGE_MAX_PIXELS:
        raise ImageForensicExtractionError(
            f"Image resolution exceeds safety limit: {width}x{height} ({total_pixels} pixels > {settings.IMAGE_MAX_PIXELS} max)."
        )

    if width > settings.IMAGE_MAX_DIMENSION or height > settings.IMAGE_MAX_DIMENSION:
        raise ImageForensicExtractionError(
            f"Image dimensions exceed maximum allowed boundary: {width}x{height} (max {settings.IMAGE_MAX_DIMENSION}px)."
        )

    detected_format = (img.format or "UNKNOWN").upper()

    # Normalize EXIF orientation if present
    try:
        transposed = ImageOps.exif_transpose(img)
        if transposed is not None:
            img = transposed
            img.format = detected_format
    except Exception as e:
        logger.debug(f"Orientation transpose skipped: {e}")

    if not img.format:
        img.format = detected_format

    return img, detected_format


def extract_metadata_forensics(img: Image.Image) -> Dict[str, Any]:
    """
    Extract technical image attributes and privacy-sanitized metadata.
    Sensitive tags (GPS, device serial numbers) are deliberately excluded.
    """
    width, height = img.size
    mode = img.mode
    format_name = img.format or "UNKNOWN"

    exif_data = {}
    software_tag = None
    make_model = None
    has_exif = False

    try:
        raw_exif = img.getexif()
        if raw_exif:
            has_exif = True
            for tag_id, value in raw_exif.items():
                # Tag 305 = Software
                if tag_id == 305 and isinstance(value, str):
                    software_tag = value.strip()
                # Tag 271 = Make, Tag 272 = Model
                elif tag_id == 271 and isinstance(value, str):
                    make_model = value.strip()
                elif tag_id == 272 and isinstance(value, str):
                    make_model = f"{make_model} {value.strip()}" if make_model else value.strip()
    except Exception as e:
        logger.debug(f"Metadata parsing skipped: {e}")

    # Check for AI generator or editor indicators in software tag
    software_lower = (software_tag or "").lower()
    detected_ai_software = [sig for sig in AI_TOOL_SIGNATURES if sig in software_lower]
    detected_editor = [sig for sig in EDITING_TOOL_SIGNATURES if sig in software_lower]

    return {
        "dimensions": {"width": width, "height": height, "aspect_ratio": round(width / max(height, 1), 3)},
        "color_mode": mode,
        "format": format_name,
        "has_exif_metadata": has_exif,
        "software": software_tag,
        "camera_device": make_model,
        "ai_generator_tag_detected": bool(detected_ai_software),
        "editing_software_detected": bool(detected_editor),
        "software_flags": detected_ai_software + detected_editor,
        "exif_status": "present" if has_exif else "stripped_or_absent",
    }


def compute_2d_fft_spectrum(img: Image.Image) -> Dict[str, Any]:
    """
    Compute 2D Discrete Fourier Transform (FFT) power spectrum.
    Identifies high-frequency energy anomalies and periodic grid spikes typical
    of transposed convolutions in generative upsampling pipelines.
    """
    # Convert to grayscale array
    gray = np.array(img.convert("L"), dtype=np.float32)
    h, w = gray.shape

    if h < 16 or w < 16:
        return {
            "computed": False,
            "reason": "Image dimensions too small for meaningful 2D FFT spectral analysis.",
        }

    # 2D FFT & shift low-frequencies to center
    fft = np.fft.fft2(gray)
    fft_shift = np.fft.fftshift(fft)
    magnitude_spectrum = np.log(1.0 + np.abs(fft_shift))

    cy, cx = h // 2, w // 2
    max_radius = min(cx, cy)

    if max_radius < 4:
        return {"computed": False, "reason": "Insufficient radius for spectral sampling."}

    # Create coordinate grid for radial energy calculation
    y, x = np.ogrid[:h, :w]
    dist_from_center = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)

    # Low frequency mask (inner 20% radius) vs High frequency mask (outer 50-100% radius)
    low_freq_mask = dist_from_center <= (max_radius * 0.20)
    high_freq_mask = (dist_from_center >= (max_radius * 0.50)) & (dist_from_center <= max_radius)

    low_freq_energy = float(np.sum(magnitude_spectrum[low_freq_mask]))
    high_freq_energy = float(np.sum(magnitude_spectrum[high_freq_mask]))
    total_energy = float(np.sum(magnitude_spectrum[dist_from_center <= max_radius]))

    high_freq_ratio = round(high_freq_energy / max(total_energy, 1e-6), 4)

    # Periodic grid artifact detection: find peak outlier intensities in high-frequency zone
    high_freq_vals = magnitude_spectrum[high_freq_mask]
    if len(high_freq_vals) > 0:
        hf_mean = float(np.mean(high_freq_vals))
        hf_std = float(np.std(high_freq_vals))
        hf_max = float(np.max(high_freq_vals))
        peak_z_score = round((hf_max - hf_mean) / max(hf_std, 1e-6), 3)
    else:
        hf_mean, hf_std, peak_z_score = 0.0, 0.0, 0.0

    # Grid artifact anomaly heuristic (z-score > 5 in high-frequency band suggests periodic spikes)
    grid_spikes_detected = bool(peak_z_score > 5.5)

    return {
        "computed": True,
        "high_frequency_ratio": high_freq_ratio,
        "peak_frequency_z_score": peak_z_score,
        "grid_spikes_detected": grid_spikes_detected,
        "spectral_mean": round(float(np.mean(magnitude_spectrum)), 3),
        "spectral_std": round(float(np.std(magnitude_spectrum)), 3),
        "interpretation": (
            "Periodic spectral spikes detected in high-frequency Fourier band. Often indicates algorithmic upsampling or checkerboard artifacts."
            if grid_spikes_detected
            else "Natural frequency decay observed across radial frequency distribution."
        ),
    }


def compute_error_level_analysis(
    img: Image.Image,
    original_format: str,
    resave_quality: int = 90,
) -> Dict[str, Any]:
    """
    Error Level Analysis (ELA) for lossy compressed images.
    Resaves the image at a known lossy quality level and measures the pixel-level difference.
    In lossy formats (JPEG), uniformly compressed regions degrade at similar rates,
    while spliced or re-saved regions often display contrasting error levels.
    """
    # ELA is meaningful primarily on lossy-compressed images (JPEG / lossy WebP)
    is_lossy_format = original_format.upper() in ("JPEG", "JPG", "WEBP")

    rgb_img = img.convert("RGB")
    buf = io.BytesIO()
    
    try:
        rgb_img.save(buf, format="JPEG", quality=resave_quality)
        buf.seek(0)
        resaved_img = Image.open(buf)
        resaved_img.load()
    except Exception as e:
        return {
            "applicable": False,
            "reason": f"Could not perform lossy recompression: {e}",
            "mean_error": 0.0,
            "max_error": 0.0,
        }

    orig_arr = np.array(rgb_img, dtype=np.float32)
    resaved_arr = np.array(resaved_img, dtype=np.float32)

    # Compute absolute difference
    diff = np.abs(orig_arr - resaved_arr)
    mean_error = float(np.mean(diff))
    max_error = float(np.max(diff))
    error_std = float(np.std(diff))

    # Analyze 16x16 block variance to detect local compression rate inconsistency
    h, w, _ = diff.shape
    block_size = 16
    block_means = []
    for y in range(0, h - block_size + 1, block_size):
        for x in range(0, w - block_size + 1, block_size):
            block = diff[y : y + block_size, x : x + block_size]
            block_means.append(float(np.mean(block)))

    block_variance = float(np.var(block_means)) if block_means else 0.0
    high_discrepancy = bool(is_lossy_format and block_variance > 12.0)

    return {
        "applicable": is_lossy_format,
        "format_tested": original_format,
        "resave_quality": resave_quality,
        "mean_error": round(mean_error, 3),
        "max_error": round(max_error, 3),
        "error_std": round(error_std, 3),
        "block_variance": round(block_variance, 3),
        "high_discrepancy_detected": high_discrepancy,
        "interpretation": (
            "Significant compression discrepancy across image blocks detected. May indicate spliced elements or multi-generation saves."
            if high_discrepancy
            else (
                "Compression residuals appear relatively uniform across the analyzed lossy surface."
                if is_lossy_format
                else "Image is stored in a lossless or non-JPEG format; ELA variance reflects uniform baseline quantization."
            )
        ),
    }


def compute_cv_edge_and_noise_signals(img: Image.Image) -> Dict[str, Any]:
    """
    Extract computer vision forensic indicators:
    - Laplacian variance (focus / unnatural sharpness or smoothness)
    - High-pass color channel residual noise estimation
    """
    rgb = np.array(img.convert("RGB"))
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)

    # 1. Laplacian focus / blur variance
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    laplacian_var = float(laplacian.var())

    # 2. Residual noise variance across R, G, B channels
    # Fast noise estimate via difference from 3x3 median filter
    noise_stds = []
    for c in range(3):
        channel = rgb[:, :, c]
        smoothed = cv2.medianBlur(channel, 3)
        diff = channel.astype(np.float32) - smoothed.astype(np.float32)
        noise_stds.append(float(np.std(diff)))

    channel_noise_variance = float(np.var(noise_stds))
    avg_noise_level = float(np.mean(noise_stds))

    # Unnatural smoothness check: extremely low noise + low Laplacian variance in photographic images
    is_unusually_smooth = bool(avg_noise_level < 0.6 and laplacian_var < 50.0)

    return {
        "laplacian_variance": round(laplacian_var, 2),
        "average_noise_level": round(avg_noise_level, 3),
        "channel_noise_variance": round(channel_noise_variance, 4),
        "is_unusually_smooth": is_unusually_smooth,
        "interpretation": (
            "Unusually low surface noise and soft gradients detected. Characteristic of synthetic generator post-smoothing."
            if is_unusually_smooth
            else "Natural high-frequency edge variance and sensor noise characteristics present."
        ),
    }


def extract_full_image_forensics(image_bytes: bytes) -> Dict[str, Any]:
    """
    Execute complete deterministic forensic feature extraction on image bytes.
    Enforces security boundaries, resource limits, and privacy sanitization.
    """
    img, detected_format = safe_open_image(image_bytes)

    metadata = extract_metadata_forensics(img)
    fft_signals = compute_2d_fft_spectrum(img)
    ela_signals = compute_error_level_analysis(img, detected_format)
    cv_signals = compute_cv_edge_and_noise_signals(img)

    return {
        "metadata": metadata,
        "fft_spectral": fft_signals,
        "error_level_analysis": ela_signals,
        "cv_signals": cv_signals,
        "limitations": [
            "ELA, FFT spectral analysis, and noise variance are deterministic heuristic indicators, not absolute proof of AI generation.",
            "Compression algorithms (e.g. social media re-encoding) can introduce or erase high-frequency and ELA artifacts.",
            "Absence of EXIF metadata is common on online platforms and does not independently prove synthetic provenance.",
            "Heuristic indicators must be interpreted in conjunction with genuine model inference and expert human review.",
        ],
    }
