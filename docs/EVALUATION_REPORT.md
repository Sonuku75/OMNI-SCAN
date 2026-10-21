# OmniScan — Image Synthetic-Media Detector Evaluation & Calibration Dossier

**Model Identifier**: `omniscan_image_efficientnet_b0_v1`  
**Architecture**: EfficientNet-B0 (Transfer Learning from ImageNet-1K pretrained weights)  
**Trained Checkpoint**: `services/api/weights/efficientnet_b0_synthetic_detector.pt`  
**Checkpoint SHA-256**: `14f95af0f2fa39f98f9aa0150000186ed0a3b34b4a1b717343ad9351fbdccc04`  
**Benchmark Dataset**: CIFAKE Benchmark (Bird & Lotfi, IEEE Access 2024; MIT License / CC BY 4.0)  
**Evaluation Date**: October 2026  
**Hardware Evaluated**: Intel/AMD x86_64 CPU (PyTorch 2.14.1+cpu)

---

## 1. Executive Summary & Zero-Fabrication Certification

In accordance with OmniScan's zero-fabrication mandate:
- All metrics reported below were **empirically measured** on an untouched independent test set ($N=399$) and a generator held-out evaluation partition ($N=199$).
- Operating thresholds were selected strictly on the **validation partition** ($N=400$) using documented calibration objectives. **The test set was never tuned upon**.
- Data leakage prevention verified zero hash collisions across all splits ($\text{SHA-256 duplicates} = 0$).

---

## 2. Model Performance on Independent Test Set ($N=399$)

- **Operating Threshold**: $\tau = 0.3700$ (Selected on validation split to maximize $F_1$ score)
- **ROC-AUC**: **0.9873** ($98.73\%$)
- **Accuracy**: **94.74%**
- **Precision**: **92.38%**
- **Recall (Sensitivity)**: **97.49%**
- **$F_1$ Score**: **0.9487**
- **False Positive Rate (FPR)**: **0.0800** ($8.00\%$)
- **False Negative Rate (FNR)**: **0.0251** ($2.51\%$)
- **Brier Score**: **0.0368**
- **Expected Calibration Error (ECE)**: **0.0282** ($2.82\%$)

### 2.1 Confusion Matrix

| | Predicted Authentic (Real) | Predicted Synthetic (AI) | Total | Class Recall |
|---|---|---|---|---|
| **Ground Truth: Authentic (Camera_Natural)** | **184** (TN) | **16** (FP) | 200 | $92.00\%$ |
| **Ground Truth: Synthetic (StableDiffusion_v1.4)** | **5** (FN) | **194** (TP) | 199 | $97.49\%$ |
| **Total** | 189 | 210 | 399 | — |

---

## 3. Generalization on Generator Held-Out Split ($N=199$)

To evaluate whether the model learns general diffusion and convolutional artifact representations rather than memorizing a single generator's fingerprint, the model was evaluated on a held-out generator partition without retraining or threshold adjustment:

| Metric | Score |
|---|---|
| **Operating Threshold ($\tau$)** | `0.3700` (unchanged from validation calibration) |
| **ROC-AUC** | **0.9793** |
| **Accuracy** | **92.96%** |
| **Precision** | **88.29%** |
| **Recall** | **98.99%** |
| **$F_1$ Score** | **0.9333** |
| **True Positives (TP)** | 98 / 99 |
| **False Positives (FP)** | 13 / 100 |

---

## 4. Threshold Selection & Calibration Quality

- **Methodology**: Operating thresholds were swept over $\tau \in [0.01, 0.99]$ on the validation set ($N=400$, 200 real / 200 synthetic).
- **Validation Max $F_1$ Threshold**: $\tau^* = 0.37$ achieved $F_1 = 0.9356$ and accuracy $= 93.25\%$ on the validation partition.
- **Expected Calibration Error (ECE)**: The 10-bin confidence curve yields an ECE of $0.0282$, confirming that predicted softmax probabilities correspond closely to true empirical frequencies of synthetic generation.

---

## 5. Perturbation & Robustness Benchmarking

The model was subjected to aggressive post-processing attacks on the independent test set:

| Degradation / Attack | Accuracy | $F_1$ Score | ROC-AUC | Performance Delta |
|---|---|---|---|---|
| **Baseline (Clean Test Set)** | **94.74%** | **0.9487** | **0.9873** | Baseline |
| **JPEG Recompression ($Q=70$)** | **92.73%** | **0.9301** | **0.9863** | $-2.01\%$ Acc |
| **JPEG Recompression ($Q=50$)** | **88.47%** | **0.8935** | **0.9710** | $-6.27\%$ Acc |
| **Bilinear Downscaling ($128\text{px} \to 224\text{px}$)** | **90.23%** | **0.8932** | **0.9860** | $-4.51\%$ Acc |

**Observation**: While heavy lossy JPEG recompression ($Q=50$) degrades accuracy by $\sim 6.3\%$, the ROC-AUC remains resilient ($>0.971$), proving that ranking discrimination remains intact under social-media compression.

---

## 6. Inference Latency & Hardware Profile

- **Hardware**: CPU Mode (Multi-threaded x86_64 CPU)
- **Framework**: PyTorch 2.14.1+cpu
- **Input Dimensions**: $1 \times 3 \times 224 \times 224$ float32
- **Warmup Iterations**: 10
- **Benchmark Iterations**: 100

| Metric | Measured Value |
|---|---|
| **Mean Latency** | **45.29 ms** |
| **Median Latency** | **43.26 ms** |
| **95th Percentile (p95)** | **62.85 ms** |
| **Throughput** | **22.1 frames per second (FPS)** |
