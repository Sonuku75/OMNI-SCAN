# OmniScan — Voice Clone & Synthetic Audio Detection Guide

## 1. Overview & Forensic Architecture

The **OmniScan Audio Forensics Pipeline** provides evidence-grounded detection of synthetic speech, neural vocoder artifacts, and voice clones. Following forensic standards and the OmniScan zero-fabrication mandate:

- **No Fabricated Confidence**: The system never outputs artificial probabilities or random mock scores.
- **Biometric Minimization**: Voice biometric vectors, speaker embeddings, and personal identity profiles are strictly prohibited from extraction or persistence.
- **Transparent Anomaly Index**: Algorithmic heuristic analysis outputs a calibrated anomaly index ($[0.0, 1.0]$) explicitly labeled with `score_semantics="anomaly_index"`.
- **Honest Degradation**: Pretrained deep learning model adapters (e.g. AASIST, RawNet2) report `status="not_configured"` and `score=None` unless authorized model weights are explicitly mounted.

```
                              [ WAV Audio Input ]
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │  Bounded Header & PCM Parser   │
                      │  - Duration Check (<= 180s)   │
                      │  - Rate Check (8k - 48k Hz)   │
                      │  - Max Raw Memory Cap (100MB) │
                      └───────────────┬───────────────┘
                                      │ Normalized Mono [-1.0, 1.0]
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
┌───────────────────────────┐                   ┌───────────────────────────┐
│     Waveform Metrics      │                   │     STFT Spectrogram      │
│ - RMS Energy & Peak       │                   │ - Spectral Centroid (Hz)  │
│ - Crest Factor (Dyn Range)│                   │ - Spectral Rolloff (85%)  │
│ - Clipping Ratio (>0.05)  │                   │ - Spectral Flatness       │
│ - Silence Ratio (>0.40)   │                   │ - Vocoder Cutoff Analysis │
│ - Zero Crossing Rate      │                   │   (<8.5kHz brick-wall)    │
└─────────────┬─────────────┘                   └─────────────┬─────────────┘
              │                                               │
              └───────────────────────┬───────────────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │    AudioForensicsDetector     │
                      │  - Aggregates acoustic signals│
                      │  - Computes anomaly_index     │
                      │  - Attaches limitation notice │
                      └───────────────┬───────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │ PretrainedAudioModelAdapter   │
                      │ - Checks AUDIO_MODEL_PATH     │
                      │ - Returns 'not_configured'    │
                      │   if weights not loaded       │
                      └───────────────────────────────┘
```

---

## 2. Bounded Audio Ingestion & Security Controls

Audio decoders can be vulnerable to resource exhaustion (e.g., zip bombs, decompressed PCM memory bombs, or infinite streams). OmniScan enforces strict ingestion barriers:

| Parameter | Default Limit | Purpose |
|---|---|---|
| `MAX_UPLOAD_SIZE_AUDIO_MB` | 50 MB | Ingress HTTP upload ceiling |
| `AUDIO_MAX_DURATION_SECONDS` | 180 s (3 min) | Upper bound on parsed temporal duration |
| `AUDIO_MIN_DURATION_SECONDS` | 0.1 s (100 ms) | Rejects truncated or empty audio snippets |
| `AUDIO_MIN_SAMPLE_RATE` | 8,000 Hz | Lower bound ensuring speech intelligibility |
| `AUDIO_MAX_SAMPLE_RATE` | 48,000 Hz | Prevents processing unneeded ultrasonic bandwidth |
| Decoded Buffer Memory Cap | 100 MB | Hard cutoff preventing uncompressed memory exhaustion |

Supported containers include standard PCM RIFF/WAVE (8-bit unsigned, 16-bit signed, 24-bit packed, and 32-bit float). Multi-channel recordings are downmixed to a normalized single-channel floating-point array in range $[-1.0, 1.0]$.

---

## 3. Acoustic Signal Analysis & Anomaly Indicators

### 3.1 Waveform Metrics

- **Peak Amplitude & RMS Energy**: Identifies overall dynamic level and recording headroom ($[-1.0, 1.0]$).
- **Crest Factor**:
  $$\text{Crest Factor} = \frac{\text{Peak Amplitude}}{\text{RMS Energy} + \epsilon}$$
  Natural uncompressed human speech exhibits dynamic fluctuations yielding crest factors typically between $3.0$ and $6.0$. Values $< 2.2$ indicate extreme synthetic brick-wall limiting or synthetic voice dynamic flattening.
- **Sample Clipping Ratio**:
  Calculates the proportion of audio samples within $0.001$ of absolute rail saturation ($1.0$). Clipping $> 5\%$ indicates aggressive gain staging or synthesis artifacts.
- **Silence Ratio**:
  Computes the fraction of non-overlapping $30\text{ms}$ frames with $\text{RMS} < 0.005$. A silence ratio $> 40\%$ frequently characterizes stitched audio, aggressive digital gating, or automated text-to-speech insertion.
- **Zero-Crossing Rate (ZCR)**:
  Quantifies high-frequency unvoiced fricatives and tonal transitions across consecutive samples.

### 3.2 Spectral & Frequency Forensics (STFT)

OmniScan computes short-time Fourier transforms using a Hann window ($N_{\text{FFT}} = 1024$, hop size $= 512$):

- **Spectral Centroid (Hz)**:
  $$\text{Centroid} = \frac{\sum f \cdot S(f)}{\sum S(f)}$$
  Measures the center of mass of the frequency spectrum, tracking perceptual brightness and unnatural spectral tilt.
- **Spectral Rolloff ($85\%$)**:
  The frequency $f_{85}$ below which $85\%$ of the total audio energy resides.
- **Spectral Flatness (Wiener Entropy)**:
  $$\text{Flatness} = \frac{\exp\left(\frac{1}{N}\sum \ln(S(f) + \epsilon)\right)}{\frac{1}{N}\sum S(f) + \epsilon}$$
  Ratios close to $1.0$ indicate white noise; ratios close to $0.0$ indicate pure harmonic tones. Elevated flatness ($>0.35$) in speech segments indicates synthetic vocoder artifacts or robotic buzz.
- **Vocoder Bandwidth Brick-Wall Cutoff**:
  Most neural vocoders (HiFi-GAN, WaveGlow, MelGAN) and TTS systems are trained on audio downsampled to $16\text{kHz}$ (Nyquist $8\text{kHz}$) or $22.05\text{kHz}$ (Nyquist $11\text{kHz}$). When upsampled or encapsulated in a $44.1\text{kHz}$ or $48\text{kHz}$ container, synthetic voices exhibit an unnatural precipitous energy drop above $8.5\text{kHz}$. OmniScan detects this cutoff as a key synthetic indicator.

---

## 4. Pretrained Model Adapter Architecture

OmniScan defines a standardized inference adapter contract for specialized audio deepfake architectures:

```python
class PretrainedAudioModelAdapter(BaseDetector):
    name = "aasist_spoof_detector_v1"
    version = "1.0.0"
```

- **Target Architecture**: AASIST (Audio Anti-Spoofing using Integrated Spectro-Temporal Graph Attention Networks) or RawNet2.
- **Sample Rate Normalization**: Standardizes input to $16,000\text{Hz}$ mono.
- **Zero-Fabrication Contract**: If `AUDIO_MODEL_PATH` is unconfigured, the adapter immediately returns:
  ```json
  {
    "detector_name": "aasist_spoof_detector_v1",
    "status": "not_configured",
    "score": null,
    "score_semantics": "not_applicable",
    "signals": {
      "configured": false,
      "reason": "AUDIO_MODEL_PATH not set or file does not exist"
    }
  }
  ```

---

## 5. Biometric Data Minimization & Privacy Protection

In compliance with forensic guidelines, GDPR Article 9 (biometric data processing restrictions), and ethical AI principles:

1. **No Speaker Embeddings**: OmniScan never generates, extracts, or persists d-vectors, x-vectors, ECAPA-TDNN embeddings, or biometric voiceprints.
2. **No Speaker Identification**: The platform analyzes whether the signal possesses synthetic acoustics, not *whose* voice it resembles.
3. **Zero Retention of Raw Feature Tensors**: Intermediate spectrograms and STFT coefficients are discarded immediately after heuristic aggregation.
4. **Ephemerality**: Decoded temporary PCM buffers are unlinked and destroyed upon analysis completion.

---

## 6. Configuration & Environment Variables

| Variable | Type | Default | Description |
|---|---|---|---|
| `AUDIO_DETECTOR_ENABLED` | bool | `true` | Enable or disable audio forensics module |
| `AUDIO_MAX_DURATION_SECONDS` | int | `180` | Maximum allowed audio duration in seconds |
| `AUDIO_MAX_SAMPLE_RATE` | int | `48000` | Maximum acceptable sampling rate in Hertz |
| `AUDIO_MODEL_PATH` | str | `null` | Local filesystem path to PyTorch/ONNX model weights |
| `AUDIO_MODEL_NAME` | str | `aasist_spoof_detector_v1` | Identifier reported in audit and analysis logs |
| `AUDIO_MODEL_DEVICE` | str | `cpu` | PyTorch execution device (`cpu` or `cuda`) |
