# OmniScan — Video Deepfake Detection & Frame Sampling Guide

## 1. Overview & Forensic Architecture

The **OmniScan Video Forensics Pipeline** provides evidence-grounded, multi-tiered analysis of digital video assets. Unlike simplistic approaches that claim to detect video manipulation from a handful of uncoordinated frames, OmniScan strictly decouples:

1. **Deterministic Frame Sampling**: Bounded temporal keyframe extraction preserving accurate container timestamps.
2. **Spatial-Frequency Frame Forensics**: Per-frame 2D FFT power spectrum analysis, Error Level Analysis (ELA), and focus/noise estimation.
3. **OpenCV Temporal Continuity Analysis**: Frame-to-frame visual differences, color histogram correlation, camera cut isolation, optical flow motion turbulence, and intra-scene sharpness jitter.
4. **Pretrained Deep Video Model Adapter**: Standardized interface for architectures like Video Vision Transformer (ViViT), TimeSformer, or 3D-CNNs (I3D, X3D).

```
                             [ Video Upload ]
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │  Bounded Container Inspector  │
                    │  - Max Duration: 60s          │
                    │  - Max Resolution: 1080p      │
                    │  - Max Upload: 150MB          │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │  Deterministic Frame Sampler  │
                    │  - Uniform Temporal Stride    │
                    │  - Max Sampled Frames: 100    │
                    │  - Timestamp Preservation     │
                    └───────────────┬───────────────┘
                                    │
            ┌───────────────────────┴───────────────────────┐
            ▼                                               ▼
┌───────────────────────────┐                   ┌───────────────────────────┐
│ Per-Frame Image Forensics │                   │ OpenCV Temporal Metrics   │
│ - 2D FFT Grid Spikes      │                   │ - Mean Frame Difference   │
│ - High-Freq Ratio         │                   │ - HSV Hist Correlation    │
│ - ELA Block Variance      │                   │ - Scene Cut Isolation     │
│ - Laplacian Focus & Noise │                   │ - Farneback Optical Flow  │
│ - Surface Smoothness      │                   │ - Sharpness Jitter Index  │
└─────────────┬─────────────┘                   └─────────────┬─────────────┘
              │                                               │
              └───────────────────────┬───────────────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │    VideoForensicsDetector     │
                      │  - Evidence-grounded anomaly  │
                      │  - Transparent anomaly_index  │
                      │  - Mandatory limitations note │
                      └───────────────┬───────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │  PretrainedVideoModelAdapter  │
                      │  - Checks VIDEO_MODEL_PATH    │
                      │  - Returns 'not_configured'   │
                      │    if weights unmounted       │
                      └───────────────────────────────┘
```

---

## 2. Ingestion Defense & Security Boundaries

Video containers represent complex, variable-rate media formats prone to parser vulnerabilities, memory exhaustion, and CPU denial-of-service. OmniScan enforces strict ingestion barriers:

| Parameter | Default Limit | Purpose |
|---|---|---|
| `MAX_UPLOAD_SIZE_VIDEO_MB` | 150 MB | Ingress HTTP payload ceiling |
| `VIDEO_MAX_DURATION_SECONDS` | 60 s | Temporal processing ceiling |
| `VIDEO_MIN_DURATION_SECONDS` | 0.2 s | Rejects empty or corrupt snippets |
| `VIDEO_MAX_RESOLUTION_WIDTH` | 1920 px | Spatial width boundary |
| `VIDEO_MAX_RESOLUTION_HEIGHT` | 1080 px | Spatial height boundary |
| `VIDEO_MAX_FRAMES_SAMPLED` | 100 frames | Upper bound on extracted keyframe count |
| `VIDEO_FRAME_SAMPLE_FPS` | 1.0 fps | Baseline sampling frequency |

Supported container formats: `video/mp4`, `video/quicktime` (MOV), `video/webm`, `video/x-matroska` (MKV), and `video/avi`.

---

## 3. Frame Sampling Engine

### 3.1 Sampling Methodology

The engine employs a **uniform deterministic temporal stride** across the video timeline:
$$idx_i = \left\lfloor i \cdot \frac{N - 1}{K - 1} \right\rfloor \quad \text{for } i \in [0, K-1]$$
where $N$ is total frames and $K = \min(\text{MAX\_FRAMES}, \max(2, \lfloor\text{duration} \times \text{FPS}\rfloor))$.

- **Timestamp Mapping**: Preserves precise floating-point container timestamps ($t_i = idx_i / \text{fps}$).
- **Spatial Normalization**: Frames exceeding $720\text{p}$ are downscaled via area interpolation (`cv2.INTER_AREA`) to preserve frequency fidelity while restricting memory consumption.
- **Resource Sandboxing**: Raw video bytes and extracted temporary buffers are isolated in temporary scratch space with guaranteed unlinking in `finally` blocks.

### 3.2 Sampling Coverage Trade-offs

- **High-Frequency Temporal Sampling (3-10 fps)**: Increases coverage of micro-expressions and quick scene flickers, but requires linear growth in compute.
- **Keyframe Stride (1 fps)**: Sufficient for detecting pervasive generative frequency artifacts (grid spikes, global ELA discrepancies) and scene transitions.
- **Limitation Disclosure**: A video must never be classified as authentic solely because no anomalous artifacts were found across sampled frames.

---

## 4. Computer Vision Temporal Consistency Metrics

### 4.1 Inter-Frame Difference (Discontinuity)
Measures normalized mean absolute luminance difference across adjacent sampled frames:
$$\Delta(F_t, F_{t+1}) = \frac{1}{H \cdot W} \sum_{x,y} \frac{|F_{t+1}(x,y) - F_t(x,y)|}{255}$$

### 4.2 HSV Color Histogram Correlation
Quantifies lighting and color distribution consistency:
$$\text{Corr}(H_t, H_{t+1}) = \frac{\sum (H_t - \bar{H}_t)(H_{t+1} - \bar{H}_{t+1})}{\sqrt{\sum(H_t - \bar{H}_t)^2 \sum(H_{t+1} - \bar{H}_{t+1})^2}}$$

### 4.3 Scene Cut Isolation
Standard video editing introduces camera transitions that naturally cause sharp drops in histogram correlation ($\text{Corr} < 0.30$) and high visual differences ($\Delta > 0.35$). OmniScan explicitly identifies and isolates **scene cuts**, excluding them from temporal flicker calculations so legitimate cuts are not misclassified as generative glitches.

### 4.4 Intra-Scene Sharpness Jitter
Generative AI models often produce temporal flickering where every second frame oscillates between sharp focus and artificial blur. OmniScan computes the intra-scene relative Laplacian variance delta:
$$\text{Jitter} = \frac{|\text{Var}_{t+1} - \text{Var}_t|}{\max(\text{Var}_t, \text{Var}_{t+1}) + 1.0}$$
Values $>0.55$ indicate unnatural temporal instability.

### 4.5 Farneback Dense Optical Flow
Computes frame-to-frame pixel motion vector fields $(u, v)$ on standardized downsampled representations ($160 \times 120$):
$$\text{Magnitude} = \sqrt{u^2 + v^2}$$
High motion vector variance ($>6.0$) paired with low overall displacement indicates local pixel warping and boundary distortions typical of face-swapping algorithms.

---

## 5. Pretrained Video Model Adapter Contract

```python
class PretrainedVideoModelAdapter(BaseDetector):
    name = "vivit_deepfake_detector_v1"
    version = "1.0.0"
```

- **Target Architecture**: Video Vision Transformer (ViViT), TimeSformer, or 3D-CNNs (I3D, X3D).
- **Zero-Fabrication Contract**: If `VIDEO_MODEL_PATH` is unconfigured, the adapter immediately returns:
  ```json
  {
    "detector_name": "vivit_deepfake_detector_v1",
    "status": "not_configured",
    "score": null,
    "score_semantics": "not_applicable",
    "signals": {
      "configured": false,
      "reason": "VIDEO_MODEL_PATH not configured in environment"
    }
  }
  ```

---

## 6. Configuration & Environment Variables

| Variable | Type | Default | Description |
|---|---|---|---|
| `VIDEO_DETECTOR_ENABLED` | bool | `true` | Enable or disable video forensic processing |
| `VIDEO_MAX_DURATION_SECONDS` | int | `60` | Maximum video duration in seconds |
| `VIDEO_MAX_FRAMES_SAMPLED` | int | `100` | Upper limit on sampled keyframes |
| `VIDEO_FRAME_SAMPLE_FPS` | float | `1.0` | Target frame sampling rate (frames/sec) |
| `VIDEO_MODEL_PATH` | str | `null` | Path to PyTorch/TorchScript/ONNX model weights |
| `VIDEO_MODEL_NAME` | str | `vivit_deepfake_detector_v1` | Reported video model identifier |
| `VIDEO_MODEL_DEVICE` | str | `cpu` | PyTorch execution device (`cpu` or `cuda`) |
