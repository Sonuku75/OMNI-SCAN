import io
import math
import wave
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
from scipy import signal

from app.core.config import settings
from app.core.logging import logger


class AudioForensicExtractionError(Exception):
    """Raised when audio decoding fails or violates security and resource boundaries."""
    pass


def safe_decode_audio(audio_bytes: bytes) -> Tuple[np.ndarray, int, float, Dict[str, Any]]:
    """
    Safely decode raw audio bytes with format, sample-rate, channel, and duration checks.
    Supports PCM WAV files natively via standard library wave with strict boundary enforcement.

    Returns:
    - mono_samples: float32 NumPy array normalized to [-1.0, 1.0]
    - sample_rate: integer sampling frequency in Hz
    - duration_seconds: float duration in seconds
    - metadata: technical audio container attributes
    """
    if not audio_bytes:
        raise AudioForensicExtractionError("Empty audio media payload received.")

    if len(audio_bytes) < 44:
        raise AudioForensicExtractionError("Audio file is truncated or too small to contain a valid header.")

    # Validate RIFF / WAVE signature
    if audio_bytes[:4] != b"RIFF" or audio_bytes[8:12] != b"WAVE":
        raise AudioForensicExtractionError(
            "Unsupported or invalid audio container. Standard PCM WAV format is required for deterministic acoustic forensics."
        )

    try:
        bio = io.BytesIO(audio_bytes)
        with wave.open(bio, "rb") as wf:
            num_channels = wf.getnchannels()
            sampwidth = wf.getsampwidth()
            sample_rate = wf.getframerate()
            num_frames = wf.getnframes()

            # Boundary validation: Channels
            if num_channels not in (1, 2):
                raise AudioForensicExtractionError(
                    f"Unsupported audio channel count: {num_channels}. Only mono (1) and stereo (2) are permitted."
                )

            # Boundary validation: Sample rate
            if sample_rate < 8000 or sample_rate > settings.AUDIO_MAX_SAMPLE_RATE:
                raise AudioForensicExtractionError(
                    f"Sample rate {sample_rate} Hz is outside allowed boundaries [8000 Hz - {settings.AUDIO_MAX_SAMPLE_RATE} Hz]."
                )

            # Boundary validation: Duration
            duration_seconds = float(num_frames) / float(sample_rate)
            if duration_seconds > settings.AUDIO_MAX_DURATION_SECONDS:
                raise AudioForensicExtractionError(
                    f"Audio duration ({duration_seconds:.1f}s) exceeds maximum allowed limit ({settings.AUDIO_MAX_DURATION_SECONDS}s)."
                )

            if duration_seconds < 0.1:
                raise AudioForensicExtractionError(
                    f"Audio duration ({duration_seconds:.2f}s) is too short for acoustic forensics (minimum 0.1s)."
                )

            # Read raw frames
            raw_frames = wf.readframes(num_frames)

    except wave.Error as e:
        raise AudioForensicExtractionError(f"Corrupt or malformed WAV stream: {e}")
    except Exception as e:
        if isinstance(e, AudioForensicExtractionError):
            raise
        raise AudioForensicExtractionError(f"Audio decoding failure: {e}")

    # Convert binary frames to normalized float32 numpy array
    if sampwidth == 2:  # 16-bit PCM
        samples = np.frombuffer(raw_frames, dtype=np.int16).astype(np.float32) / 32768.0
    elif sampwidth == 1:  # 8-bit unsigned PCM
        samples = (np.frombuffer(raw_frames, dtype=np.uint8).astype(np.float32) - 128.0) / 128.0
    elif sampwidth == 3:  # 24-bit PCM
        # Unpack 24-bit 3-byte chunks to int32
        num_samples = len(raw_frames) // 3
        int_samples = np.zeros(num_samples, dtype=np.int32)
        raw_arr = np.frombuffer(raw_frames, dtype=np.uint8)
        int_samples = (
            raw_arr[0::3].astype(np.int32)
            | (raw_arr[1::3].astype(np.int32) << 8)
            | (raw_arr[2::3].astype(np.int32) << 16)
        )
        # Sign extension
        int_samples[int_samples >= 0x800000] -= 0x1000000
        samples = int_samples.astype(np.float32) / 8388608.0
    elif sampwidth == 4:  # 32-bit int PCM
        samples = np.frombuffer(raw_frames, dtype=np.int32).astype(np.float32) / 2147483648.0
    else:
        raise AudioForensicExtractionError(f"Unsupported bit depth: {sampwidth * 8}-bit.")

    # Downmix stereo to mono if necessary
    if num_channels == 2:
        samples = samples.reshape(-1, 2)
        mono_samples = np.mean(samples, axis=1)
    else:
        mono_samples = samples

    metadata = {
        "container": "WAV",
        "channels": num_channels,
        "sample_rate": sample_rate,
        "bit_depth": sampwidth * 8,
        "duration_seconds": round(duration_seconds, 3),
        "total_samples": len(mono_samples),
    }

    return mono_samples, sample_rate, duration_seconds, metadata


def compute_waveform_metrics(samples: np.ndarray, sample_rate: int) -> Dict[str, Any]:
    """
    Extract waveform acoustic and energy properties:
    - Peak amplitude, RMS energy, and Crest factor
    - Clipping ratio (samples hitting absolute ceiling)
    - Silence ratio (unnatural gaps or zero-signal pauses)
    """
    if len(samples) == 0:
        return {}

    abs_samples = np.abs(samples)
    peak_amp = float(np.max(abs_samples))
    rms_energy = float(np.sqrt(np.mean(samples ** 2)))

    # Crest factor = Peak / RMS (low crest factor indicates severe dynamic compression)
    crest_factor = round(peak_amp / max(rms_energy, 1e-6), 2)

    # Clipping detection: sample values at or above 0.999
    clipped_count = int(np.sum(abs_samples >= 0.999))
    clipping_ratio = round(float(clipped_count) / float(len(samples)), 5)

    # Silence ratio: calculate frame-by-frame RMS in 50ms windows
    frame_len = max(1, int(0.050 * sample_rate))
    num_frames = len(samples) // frame_len
    if num_frames > 0:
        frames = samples[: num_frames * frame_len].reshape(num_frames, frame_len)
        frame_rms = np.sqrt(np.mean(frames ** 2, axis=1))
        silence_frames = np.sum(frame_rms < 0.005)
        silence_ratio = round(float(silence_frames) / float(num_frames), 4)
    else:
        silence_ratio = 0.0

    # Zero-crossing rate
    zero_crossings = np.sum(np.diff(np.sign(samples)) != 0)
    zcr = round(float(zero_crossings) / float(max(len(samples), 1)), 4)

    return {
        "peak_amplitude": round(peak_amp, 4),
        "rms_energy": round(rms_energy, 4),
        "crest_factor": crest_factor,
        "clipping_ratio": clipping_ratio,
        "silence_ratio": silence_ratio,
        "zero_crossing_rate": zcr,
    }


def compute_spectral_features(samples: np.ndarray, sample_rate: int) -> Dict[str, Any]:
    """
    Compute Short-Time Fourier Transform (STFT) spectrogram features:
    - Spectral Centroid: center of mass of spectrum over time
    - Spectral Rolloff: frequency below which 85% of total spectral energy lies
    - Spectral Flatness: Wiener entropy measuring tonal vs noisy balance
    - Vocoder Cutoff Detection: checks for artificial high-frequency ceiling
    """
    nperseg = min(1024, len(samples))
    if nperseg < 64:
        return {
            "computed": False,
            "reason": "Sample length too short for spectrogram analysis.",
        }

    # STFT computation
    freqs, times, Zxx = signal.stft(samples, fs=sample_rate, nperseg=nperseg, noverlap=nperseg // 2)
    mag = np.abs(Zxx)
    power = mag ** 2

    # 1. Spectral Centroid
    # Weighted mean of frequencies: sum(f * mag) / sum(mag)
    freq_weights = freqs[:, np.newaxis]
    mag_sum = np.sum(mag, axis=0)
    centroids = np.sum(freq_weights * mag, axis=0) / np.maximum(mag_sum, 1e-6)
    mean_centroid = round(float(np.mean(centroids)), 1)
    std_centroid = round(float(np.std(centroids)), 1)

    # 2. Spectral Rolloff (85% energy frequency)
    total_energy_per_time = np.sum(power, axis=0)
    cum_energy = np.cumsum(power, axis=0)
    rolloff_threshold = 0.85 * total_energy_per_time
    # Find index of first frequency bin where cumulative energy >= 85%
    rolloff_bins = np.argmax(cum_energy >= rolloff_threshold[np.newaxis, :], axis=0)
    rolloff_freqs = freqs[rolloff_bins]
    mean_rolloff = round(float(np.mean(rolloff_freqs)), 1)

    # 3. Spectral Flatness (Wiener entropy): geometric mean / arithmetic mean
    # Prevent zeros with small epsilon
    power_safe = np.maximum(power, 1e-10)
    geom_mean = np.exp(np.mean(np.log(power_safe), axis=0))
    arith_mean = np.mean(power_safe, axis=0)
    flatness = geom_mean / np.maximum(arith_mean, 1e-10)
    mean_flatness = round(float(np.mean(flatness)), 4)

    # 4. Neural Vocoder Frequency Ceiling / Cutoff heuristic
    # Many common neural speech synthesizers (e.g., HiFi-GAN or MelGAN) are trained on 16kHz
    # or 22.05kHz datasets, producing a hard brick-wall cutoff at 8kHz or 11kHz even when
    # exported into higher sample-rate containers.
    sharp_cutoff_detected = bool(
        sample_rate >= 24000
        and mean_rolloff < 8500
        and mean_centroid < 2200
    )

    return {
        "computed": True,
        "spectral_centroid_hz": mean_centroid,
        "spectral_centroid_std": std_centroid,
        "spectral_rolloff_hz": mean_rolloff,
        "spectral_flatness": mean_flatness,
        "sharp_vocoder_cutoff_detected": sharp_cutoff_detected,
        "interpretation": (
            f"Spectrogram reveals an abrupt acoustic energy drop-off at {mean_rolloff:.0f} Hz despite a {sample_rate} Hz container. Characteristic of low-bandwidth neural vocoders."
            if sharp_cutoff_detected
            else "Spectral frequency distribution exhibits continuous harmonic decay without artificial bandwidth ceilings."
        ),
    }


def extract_full_audio_forensics(audio_bytes: bytes) -> Dict[str, Any]:
    """
    Execute complete deterministic acoustic and spectrogram forensic analysis.
    Enforces memory safety, bounded duration, and privacy preservation.
    """
    samples, sample_rate, duration_seconds, metadata = safe_decode_audio(audio_bytes)

    waveform_metrics = compute_waveform_metrics(samples, sample_rate)
    spectral_metrics = compute_spectral_features(samples, sample_rate)

    return {
        "metadata": metadata,
        "waveform": waveform_metrics,
        "spectral": spectral_metrics,
        "limitations": [
            "Acoustic metrics (rolloff, spectral centroid, silence gaps) are deterministic heuristics, not conclusive proof of speech cloning.",
            "Microphone quality, aggressive noise-cancellation codecs, and VoIP recompression (e.g. GSM/AMR) naturally alter frequency rolloff.",
            "Silence and clipping metrics reflect recording environment parameters and do not establish synthetic origin independently.",
            "Speaker identity verification is deliberately not performed to maintain biometric data minimization.",
        ],
    }
