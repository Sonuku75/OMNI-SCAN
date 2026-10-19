import os
import cv2
import numpy as np
from typing import Dict, List, Optional, Tuple
from pydantic import BaseModel

from app.core.config import settings
from app.core.errors import OmniScanException
from app.core.logging import logger


class VideoInspectionError(OmniScanException):
    """Raised when video container inspection, header parsing, or decoding fails."""
    def __init__(self, message: str, code: str = "VIDEO_INSPECTION_ERROR"):
        super().__init__(message=message, code=code, status_code=400)


class SampledFrame(BaseModel):
    """Metadata and raw RGB array for an individual sampled video frame."""
    frame_index: int
    timestamp_seconds: float
    width: int
    height: int
    # Note: image_bytes or image_bgr handled separately to avoid large Pydantic serialization overhead

    class Config:
        arbitrary_types_allowed = True


class VideoMetadata(BaseModel):
    """Decoded video container properties."""
    container: str
    fourcc: str
    width: int
    height: int
    fps: float
    total_frames: int
    duration_seconds: float
    duration_ms: int


def safe_inspect_video_header(video_path: str) -> VideoMetadata:
    """
    Safely opens video container and reads stream parameters without decoding all frames.
    Enforces duration and resolution boundaries.
    """
    if not os.path.exists(video_path):
        raise VideoInspectionError(f"Video file does not exist: {video_path}")

    file_size = os.path.getsize(video_path)
    if file_size == 0:
        raise VideoInspectionError("Video file is empty (0 bytes).", code="EMPTY_VIDEO")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise VideoInspectionError("Failed to open video container. File may be corrupt, truncated, or use an unsupported codec.")

    try:
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = float(cap.get(cv2.CAP_PROP_FPS))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fourcc_int = int(cap.get(cv2.CAP_PROP_FOURCC))
        fourcc_str = "".join([chr((fourcc_int >> 8 * i) & 0xFF) for i in range(4)]).strip()

        # Sanity validation
        if width <= 0 or height <= 0:
            raise VideoInspectionError("Video has invalid spatial dimensions (width or height <= 0).")

        if fps <= 0 or np.isnan(fps):
            # Fallback for streams with missing fps header
            fps = 25.0

        if total_frames <= 0:
            # Fallback frame count estimation
            total_frames = max(1, int(fps * 2))

        duration_seconds = float(total_frames / fps)
        duration_ms = int(duration_seconds * 1000)

        # Enforce security and resource limits
        if duration_seconds < settings.VIDEO_MIN_DURATION_SECONDS:
            raise VideoInspectionError(
                f"Video duration ({duration_seconds:.2f}s) is shorter than minimum allowed ({settings.VIDEO_MIN_DURATION_SECONDS:.2f}s)."
            )

        if duration_seconds > settings.VIDEO_MAX_DURATION_SECONDS:
            raise VideoInspectionError(
                f"Video duration ({duration_seconds:.1f}s) exceeds maximum allowed limit ({settings.VIDEO_MAX_DURATION_SECONDS}s)."
            )

        if width > settings.VIDEO_MAX_RESOLUTION_WIDTH or height > settings.VIDEO_MAX_RESOLUTION_HEIGHT:
            raise VideoInspectionError(
                f"Video resolution ({width}x{height}) exceeds maximum allowed ({settings.VIDEO_MAX_RESOLUTION_WIDTH}x{settings.VIDEO_MAX_RESOLUTION_HEIGHT})."
            )

        container_ext = os.path.splitext(video_path)[1].lstrip(".").lower() or "mp4"

        return VideoMetadata(
            container=container_ext,
            fourcc=fourcc_str or "unknown",
            width=width,
            height=height,
            fps=round(fps, 2),
            total_frames=total_frames,
            duration_seconds=round(duration_seconds, 3),
            duration_ms=duration_ms,
        )

    finally:
        cap.release()


def sample_video_frames(
    video_path: str,
    meta: VideoMetadata,
    max_frames: Optional[int] = None,
    max_dimension: int = 720,
) -> List[Tuple[SampledFrame, bytes]]:
    """
    Deterministically samples video frames across the video duration.
    Resizes extracted frames to a bounded resolution (e.g. max dimension 720)
    to protect CPU and memory while preserving forensic signal fidelity.

    Returns a list of tuples: (SampledFrame metadata, PNG-encoded frame bytes).
    """
    target_count = max_frames or settings.VIDEO_MAX_FRAMES_SAMPLED

    # Compute number of frames to extract: at least 2 frames (if available), up to target_count
    if meta.total_frames <= 1:
        sample_indices = [0]
    else:
        num_samples = min(target_count, max(2, int(meta.duration_seconds * settings.VIDEO_FRAME_SAMPLE_FPS)))
        num_samples = min(num_samples, meta.total_frames)
        # Uniform deterministic stride
        sample_indices = [
            int(i * (meta.total_frames - 1) / (num_samples - 1))
            for i in range(num_samples)
        ]
        # Deduplicate
        sample_indices = sorted(list(set(sample_indices)))

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise VideoInspectionError("Failed to open video container for frame sampling.")

    extracted_samples: List[Tuple[SampledFrame, bytes]] = []

    try:
        current_pos = 0
        for target_idx in sample_indices:
            # Seek if necessary
            if current_pos != target_idx:
                cap.set(cv2.CAP_PROP_POS_FRAMES, target_idx)
                current_pos = target_idx

            ret, frame_bgr = cap.read()
            current_pos += 1

            if not ret or frame_bgr is None:
                logger.warning(f"Failed to read frame at index {target_idx} in {video_path}")
                continue

            h, w = frame_bgr.shape[:2]

            # Bounded downscaling if resolution exceeds max_dimension
            if max(h, w) > max_dimension:
                scale = max_dimension / max(h, w)
                new_w, new_h = int(w * scale), int(h * scale)
                frame_bgr = cv2.resize(frame_bgr, (new_w, new_h), interpolation=cv2.INTER_AREA)
                h, w = new_h, new_w

            # Encode frame to PNG bytes for image detector ingestion
            success, enc_buf = cv2.imencode(".png", frame_bgr)
            if not success:
                logger.warning(f"Failed to encode sampled frame {target_idx} to PNG.")
                continue

            png_bytes = enc_buf.tobytes()
            timestamp = float(target_idx / meta.fps) if meta.fps > 0 else 0.0

            sampled_meta = SampledFrame(
                frame_index=target_idx,
                timestamp_seconds=round(timestamp, 3),
                width=w,
                height=h,
            )
            extracted_samples.append((sampled_meta, png_bytes))

        if not extracted_samples:
            raise VideoInspectionError("No valid video frames could be decoded from container.")

        return extracted_samples

    finally:
        cap.release()
