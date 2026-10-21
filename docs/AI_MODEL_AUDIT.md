# OmniScan AI Model & Forensic Architecture Audit

**Date**: October 2026  
**Auditor**: OmniScan ML, Forensics & Architecture Engineering Team  
**Scope**: In-depth audit of detector pipelines, model adapters, orchestration, dependencies, schemas, and zero-fabrication adherence across image, audio, and video modalities.

---

## 1. Executive Summary

OmniScan was established with a strict mandate: provide transparent, reproducible forensic media analysis without fabricating synthetic probabilities or masking unconfigured AI models.

This audit evaluates the repository before implementing real learned deep learning models and training pipelines. We examined:
- `services/api/app/detectors/image/`
- `services/api/app/detectors/audio/`
- `services/api/app/detectors/video/`
- `services/api/app/services/orchestrator.py`
- Schemas (`analyses.py`, `reports.py`, `common.py`)
- API endpoints (`analyses.py`, `reports.py`)
- Python dependencies (`requirements.txt`) and Docker/environment setups

---

## 2. Component Classification Matrix

Every analytical component in the codebase has been audited and classified into one of four operational categories:
1. **Deterministic forensic feature extraction** (mathematical/statistical algorithms on raw media signals)
2. **Genuine trained-model inference** (learned weights predicting on feature representations)
3. **Model-independent metadata/provenance inspection** (container markers, EXIF, C2PA/JUMBF)
4. **Demonstration-only output** (stubbed return values, hardcoded scores, or simulated responses)

| Component | Path | Category | Status & Implementation Details |
|---|---|---|---|
| **Image Forensic Feature Extractor** | `services/api/app/detectors/image/forensics.py` | **1. Deterministic Forensic** | Real algorithmic signal extraction: 2D FFT azimuthal power spectrum, peak z-scores, Error Level Analysis (ELA at 90% quality), Laplacian focus variance, color channel noise estimation. |
| **Image Forensics Detector** | `services/api/app/detectors/image/detector.py` | **1. Deterministic Forensic** | Aggregates deterministic signals into a bounded heuristic anomaly index (`[0.0, 1.0]`, semantics `anomaly_index`). Grounded without fabricated neural probabilities. |
| **Pretrained Image Model Adapter** | `services/api/app/detectors/image/model_adapter.py` | **Adapter Scaffold (No Weights)** | Provides inference scaffold for ResNet-50 / EfficientNet. Correctly returns `DetectorStatus.NOT_CONFIGURED` when `IMAGE_MODEL_PATH` is unset. However, no trained weights are packaged, no checkpoint SHA-256 verification is performed, and no fine-tuning pipeline existed. |
| **Image Analysis Service** | `services/api/app/detectors/image/service.py` | **Orchestration & Heuristic Synthesis** | Coordinates deterministic forensics, model adapter, and provenance verifier. Synthesizes assessment labels (`suspicious`, `no_strong_indicators`, `inconclusive`). |
| **Audio Forensic Feature Extractor** | `services/api/app/detectors/audio/forensics.py` | **1. Deterministic Forensic** | Genuine signal processing: safe RIFF/WAV decoding, peak amplitude, RMS energy, crest factor, clipping ratio, silence ratio, ZCR, STFT spectrogram (Hann window, 1024 FFT), spectral centroid, rolloff (85%), Wiener flatness, and high-frequency vocoder cutoff detection. |
| **Audio Forensics Detector** | `services/api/app/detectors/audio/detector.py` | **1. Deterministic Forensic** | Aggregates acoustic indicators into a heuristic anomaly index (`anomaly_index`). Grounded and adheres to zero-fabrication mandate. |
| **Pretrained Audio Model Adapter** | `services/api/app/detectors/audio/model_adapter.py` | **Adapter Scaffold (No Weights)** | Scaffold intended for AASIST/RawNet2. Returns `NOT_CONFIGURED` when `AUDIO_MODEL_PATH` is unset. Resamples to 16kHz and formats to 64,000 samples. No trained checkpoint exists in repository. |
| **Audio Analysis Service** | `services/api/app/detectors/audio/service.py` | **Orchestration & Heuristic Synthesis** | Coordinates acoustic detector, model adapter, and C2PA verifier. |
| **Video Frame Sampler & Inspector** | `services/api/app/detectors/video/frame_sampler.py` | **1. Deterministic Forensic & Ingestion Defense** | Safe container header inspection using OpenCV (`cv2.VideoCapture`). Enforces bounds (duration 0.2s - 60s, max 1080p). Uniform temporal frame stride downscaled to max 720p. |
| **Video Temporal Consistency Analyzer** | `services/api/app/detectors/video/temporal.py` | **1. Deterministic Forensic** | Real mathematical CV: mean frame difference, HSV histogram correlation, scene cut isolation (discontinuity filtering), Farneback optical flow motion variance, sharpness jitter. |
| **Video Frame Analyzer** | `services/api/app/detectors/video/frame_analyzer.py` | **1. Deterministic Forensic** | Re-applies image 2D FFT, ELA, and Laplacian metrics per sampled video frame. |
| **Video Forensics Detector** | `services/api/app/detectors/video/detector.py` | **1. Deterministic Forensic** | Computes video anomaly index (`anomaly_index`) combining frame-level generative spikes with temporal motion and flicker anomalies. |
| **Pretrained Video Model Adapter** | `services/api/app/detectors/video/model_adapter.py` | **4. Demonstration-Only Output (DEFECT)** | **CRITICAL AUDIT FINDING**: In `_load_model()`, `self._model = "loaded"` (line 60) and in `predict()`, `score=0.5` (line 112) is returned when configured. This is a demonstration stub and must be eliminated in favor of genuine inference. |
| **Video Analysis Service** | `services/api/app/detectors/video/service.py` | **Orchestration & Heuristic Synthesis** | Coordinates video forensics, video model adapter, and provenance checks. |
| **Provenance Verifier** | `services/api/app/provenance/service.py` | **3. Model-Independent Metadata & Provenance** | Parses binary JUMBF boxes (`c2pa`, `jumb`), validates presence of Content Credentials manifests, sanitizes EXIF, inspects software headers (`Tag 305`). Completely model-independent. |
| **Analysis Orchestrator** | `services/api/app/services/orchestrator.py` | **Analysis Lifecycle & Storage Coordination** | Asynchronous task worker managing `QUEUED -> PROCESSING -> COMPLETED/FAILED/DETECTOR_NOT_CONFIGURED`. Pulls from storage, dispatches to media services, persists `DetectorResult` and `ProvenanceCheck` database records. |
| **Reports Endpoint** | `services/api/app/api/v1/endpoints/reports.py` | **Evidence-Grounded Reporting** | Generates JSON and printable HTML dossiers citing extracted signals and disclaimers. |

---

## 3. Detailed Audit Findings by Modality

### 3.1 Image Modality
1. **Deterministic Forensics**: Highly robust. Includes 2D FFT with azimuthal power distribution, ELA block variance calculation across $16 \times 16$ DCT blocks, Laplacian focus variance, and noise variance across RGB channels.
2. **Learned Inference**: Missing. The adapter code in `model_adapter.py` had basic loader code for ONNX and TorchScript, but:
   - No trained checkpoint or weights file was provided or referenced.
   - No cryptographic checksum (SHA-256) validation of weights existed.
   - No training pipeline existed in the repository.
   - No dataset loading or evaluation splits existed.
3. **Synthesis**: When `IMAGE_MODEL_PATH` is unset, the application correctly reports `DetectorStatus.NOT_CONFIGURED` with score `None`. When configured, it blended heuristic indicators with model scores without a formal fusion model.

### 3.2 Audio Modality
1. **Deterministic Forensics**: Comprehensive STFT and temporal metric extraction. Correctly computes Wiener flatness, spectral rolloff, spectral centroid, crest factor, and brick-wall vocoder cutoffs (<8.5 kHz).
2. **Learned Inference**: No trained model exists. The adapter assumes an AASIST graph neural network model accepting `(1, 64000)` waveforms, but no checkpoint is provided.
3. **Chunking & Aggregation**: The adapter only sliced or padded to the first 4 seconds (64,000 samples). Long audio files (>4s) were truncated, ignoring subsequent segments. A sliding-window chunking and pooling strategy (e.g. max/mean pooling across windows) is required.

### 3.3 Video Modality
1. **Deterministic Forensics**: Bounded OpenCV decoding and deterministic frame stride sampling. Temporal continuity analysis handles scene cut isolation correctly.
2. **Learned Inference Defect**:
   - `services/api/app/detectors/video/model_adapter.py` contained stubbed code:
     ```python
     self._model = "loaded" # line 60
     ...
     return DetectorOutput(
         ...
         score=0.5, # line 112: demonstration placeholder!
     )
     ```
   - This stub violates the zero-fabrication mandate and will be replaced with genuine frame-level aggregation using our trained image detector or temporal video classifier.

### 3.4 API Schemas and Response Contracts
- Current schemas (`AnalysisDetailResponse`, `DetectorResultSchema`) do not explicitly segregate the response into the 7 formal forensic sections requested:
  - `model_inference`
  - `forensic_heuristics`
  - `metadata_and_provenance`
  - `limitations`
  - `model_version`
  - `calibration_status`
  - `evaluation_reference`
- We will augment `AnalysisDetailResponse` and `DetectorResultSchema` to include these structured fields while maintaining backward compatibility with the existing web dashboard.

---

## 4. Dependencies and Environment Audit

1. **Installed Python Packages (`requirements.txt`)**:
   - Currently includes: `fastapi`, `uvicorn`, `pydantic`, `sqlalchemy`, `pillow`, `numpy`, `opencv-python-headless`, `scipy`.
   - **Missing ML/DL libraries**: `torch`, `torchvision`, `torchaudio`, `scikit-learn`.
2. **Python Environment**:
   - Environment: Python 3.13.2 64-bit on Windows 11.
   - Wheel availability: PyTorch 2.14+ CPU wheels and scikit-learn are available for Python 3.13 on AMD64.
3. **Hardware Acceleration**:
   - No NVIDIA GPU detected (`nvidia-smi` unavailable). All training and inference routines must support optimized CPU execution with optional CUDA/MPS configuration.
4. **FFmpeg**:
   - System PATH lacks standalone `ffmpeg.exe`. OpenCV (`cv2.VideoCapture`) is linked with FFmpeg internally and handles video container decoding reliably. In Docker, `ffmpeg` is installed via `apt-get`. We will ensure both OpenCV decoding and FFmpeg subprocess fallbacks are cleanly handled.

---

## 5. Remediation Plan

1. **Stage 1**: Complete this Audit (`docs/AI_MODEL_AUDIT.md`) — [Done].
2. **Stage 2 & 3**: Image Detector Architecture, Dataset Verification & Manifest:
   - Establish legitimate dataset sources (GenImage, FaceForensics++, Synthetic vs Real collections).
   - Create dataset manifest with `filepath`, `label`, `source_dataset`, `generator_family`, `split`, `sha256`.
3. **Stage 4 & 5**: Reproducible Image Training & Evaluation Pipeline:
   - Place training code in `services/api/training/image/`.
   - Implement transfer learning using a standard backbone (EfficientNet-B0 / ResNet-50).
   - Prevent data leakage: grouping by generator and source identity, clean train/val/test splits.
   - Comprehensive evaluation: Accuracy, Precision, Recall, F1, ROC-AUC, Confusion Matrix, FPR/FNR, latency.
   - Produce real checkpoint and evaluation report.
4. **Stage 6**: Real Audio Detection Pipeline:
   - Support chunk-level sliding window inference and aggregation.
   - Acoustic learned detection with explicit fallback to unconfigured state when weights are not present.
5. **Stage 7**: Video Deepfake Pipeline:
   - Remove demonstration-only stub in `video/model_adapter.py`.
   - Implement frame-level learned inference aggregation across sampled keyframes.
6. **Stage 8 & 9**: Model Registry, Configuration, API Integration:
   - Create unified Model Registry with SHA-256 validation, metadata, licenses, calibration status.
   - Expose explicit `model_inference`, `forensic_heuristics`, `metadata_and_provenance`, `limitations`, `model_version`, `calibration_status`, `evaluation_reference`.
7. **Stage 10 & 11**: Security, Hardening & Tests:
   - Unit and integration tests covering missing weights, hash verification, corrupt inputs, finite probabilities, leakage prevention.

---

## 6. Implementation & Multimodal Verification Status

### 6.1 Status Summary Matrix

| Modality / Subsystem | Pre-Remediation State | Current Implementation State | Verification Evidence |
|---|---|---|---|
| **Image Model Inference** | Adapter scaffold without weights or provenance | **Genuinely Trained EfficientNet-B0** (`image_model_adapter_v1`). Checkpoint SHA-256 verified at startup. Platt calibrated. CPU & CUDA compatible. | SHA-256 verification in `model_registry.py`, 13 tests in `test_model_registry_and_inference.py`. |
| **Video Deepfake Inference** | **DEFECT**: Hardcoded `score=0.5` placeholder | **REPLACED**: Frame-level inference over sampled keyframes; returns honest `NOT_CONFIGURED` when video model is unconfigured; temporal aggregation with motion/flicker weighting. | Defect removed from `video/model_adapter.py`. Tested in `test_video_forensics.py`. |
| **Video Container Audio Stream Extraction** | Ignored audio track entirely | **Multi-Track Forensic Separation**: Audio stream extracted via `torchaudio.load()` / `scipy.io.wavfile` into standard PCM WAV bytes and routed to `AudioAnalysisService`. | `_extract_audio_track` in `video/service.py`; tested in `test_evidence_and_verdicts.py`. |
| **Audio Voice Cloning Inference** | Unconfigured AASIST scaffold (truncated to 4s) | **Sliding Window Chunking**: Multi-window analysis; strict adherence to zero-fabrication mandate (returns `NOT_CONFIGURED` when unconfigured). STFT vocoder cutoff detection. | Tested in `test_audio_forensics.py`. Biometric non-identification disclaimers enforced. |
| **Evidence Synthesis Engine** | Blended heuristic score; no explanations | **Evidence-Based Synthesis**: Deterministic heuristics decoupled from neural model inference. Generates 5 primary verdicts, "Why this result?", supporting/conflicting/unavailable evidence records, and false positive/negative risk factors. | `services/api/app/detectors/evidence_synthesizer.py`; covered by `test_evidence_and_verdicts.py`. |
| **Frontend Presentation** | `[object Object]` crash; heuristic percentages only | **Rich Forensic Dossier**: 3-category media selector; 10 prioritized sections (Verdict Plate, "Why this result?", Supporting/Conflicting, Multi-track comparison, Model telemetry, Physical forensics, C2PA, Raw telemetry). Zero `[object Object]` bugs. | Next.js production build succeeded (`11/11` routes compiled). Tested in browser integration. |

### 6.2 Zero-Fabrication Mandate Compliance
1. **Never Invented Weights**: No synthetic weights were generated or hardcoded. The image checkpoint is genuinely trained with traceable dataset provenance (`services/api/training/manifests/dataset_manifest.csv`).
2. **Honest Unconfigured States**: When `AUDIO_MODEL_PATH` or `VIDEO_MODEL_PATH` is omitted, the API outputs `ANALYSIS UNAVAILABLE` with explicit instructions on requirements to train/provision weights, rather than fabricating confidence scores.
3. **Decoupling Edits from AI Generation**: Photoshop crops, metadata stripping, compression artifacts, and high-frequency edge anomalies are labeled as `LIKELY MANIPULATED` or noted as physical compression noise, explicitly isolated from `LIKELY AI-GENERATED` model predictions.
4. **Biometric Privacy Adherence**: Voice cloning detectors disclaim individual speaker biometric identification, restricting scope to acoustic synthesis artifacts.
