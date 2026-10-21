# OmniScan — Synthetic Media Dataset Research, Licensing & Specifications

**Date**: October 2026  
**Auditor / Researcher**: OmniScan ML & Forensic Engineering Team  
**Document Status**: Official Specification & Data Governance Standard

---

## 1. Objectives & Data Governance Policy

To train, evaluate, and benchmark deep synthetic-media classifiers without legal, privacy, or ethical compromise, OmniScan adheres to strict data governance principles:

1. **Explicit Licensing**: No dataset may be downloaded or incorporated into training pipelines without recorded license terms, source provenance, and permissible commercial/research bounds.
2. **Biometric Privacy Protection**: Personal identifiable imagery (PII), unconsented biometric images, and private social media scraps are strictly prohibited.
3. **Transparent Manifest Tracking**: Every image used in training, validation, or benchmarking must be cataloged in a machine-readable manifest (`manifest.json` / `manifest.csv`) detailing:
   `filepath`, `label`, `source_dataset`, `generator_family`, `split`, and `sha256`.
4. **Explicit Labels**: Only two explicit labels are permitted: `"real"` and `"synthetic"`. Ambiguous, speculative, or multi-class fuzzy labels are rejected at ingestion time.
5. **No Data Leakage**: Identical or near-identical images (measured by SHA-256 and perceptual hash) must never cross split boundaries.

---

## 2. Comprehensive Survey of Public Detection Datasets

### 2.1 GenImage: A Million-Scale Benchmark for AI-Generated Image Detection
- **Paper**: Zhu et al., *GenImage: A Million-Scale Dataset for Detecting AI-Generated Images* (NeurIPS 2023).
- **Official Repository**: `https://github.com/GenImage-Dataset/GenImage`
- **Source Collections**:
  - Real: ImageNet-1K (ILSVRC 2012 validation and train subsets).
  - Synthetic Generators (8 distinct families):
    1. Stable Diffusion v1.4
    2. Stable Diffusion v1.5
    3. Midjourney (v5)
    4. ADM (Ablated Diffusion Models)
    5. Glide
    6. VQDM (Vector Quantized Diffusion Models)
    7. Wukong
    8. BigGAN
- **Scale**: ~1,331,167 images (665,583 real, 665,584 synthetic).
- **Storage Requirement**: ~105 GB compressed; ~240 GB uncompressed.
- **License**: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (**CC BY-NC-SA 4.0**).
- **Permissible Use**: Academic research, open-source benchmarking, and non-commercial model validation.
- **Limitations**:
  - ImageNet-centric semantic distribution (contains biased object classes matching ILSVRC categories).
  - Large storage footprint makes full-dataset local training impractical on resource-constrained development nodes.
- **Manual Download & Extraction Instructions**:
  ```bash
  # 1. Clone repository tooling
  git clone https://github.com/GenImage-Dataset/GenImage.git
  
  # 2. Download generator subsets via Baidu Netdisk or Hugging Face mirror
  # e.g., Hugging Face mirror: e8035669/GenImage
  huggingface-cli download e8035669/GenImage --local-dir ./genimage_raw
  
  # 3. Concatenate and extract multi-part zips
  zip -F imagenet_ai_0424_sdv5.zip --out sdv5_combined.zip
  unzip sdv5_combined.zip -d ./data/genimage/sdv5/
  ```

---

### 2.2 CIFAKE: Real and AI-Generated Synthetic Images
- **Paper**: Bird, J. J., & Lotfi, A., *CIFAKE: Image Classification and Explainable Identification of AI-Generated Synthetic Images* (IEEE Access, 2024).
- **Official Hosts**: Kaggle (`birdy654/cifake-real-and-ai-generated-synthetic-images`) and Hugging Face (`dragonintelligence/CIFAKE-image-dataset`).
- **Source Collections**:
  - Real: CIFAR-10 real photographic classes (airplanes, automobiles, birds, cats, deer, dogs, frogs, horses, ships, trucks) collected from natural photographic captures.
  - Synthetic: Generated using Stable Diffusion v1.4 conditioned on corresponding CIFAR-10 category text prompts.
- **Scale**: 120,000 images total (60,000 Real, 60,000 Synthetic).
  - Standard split: 100,000 train (50k real / 50k synthetic), 20,000 test (10k real / 10k synthetic).
- **Storage Requirement**: ~49 MB compressed Parquet; ~110 MB raw PNG images.
- **License**: **MIT License** / **CC BY 4.0 Attribution**.
- **Permissible Use**: Commercial, academic, and open-source implementation.
- **Strengths**:
  - Perfectly balanced classes ($50\%$ real, $50\%$ synthetic).
  - Lightweight and highly reproducible; enables rapid, rigorous training and verification on CPU and GPU environments.
  - Consistent semantic pairing between real objects and synthetic counterparts prevents semantic shortcut learning.
- **Limitations**:
  - Native spatial resolution is $32 \times 32$ pixels upsampled for standard CNN backbones ($224 \times 224$), which tests the model's ability to identify structural and high-frequency latent diffusion artifacts rather than ultra-high-resolution boundary anomalies.

---

### 2.3 Synthbuster
- **Paper**: Bammey, Q., *Synthbuster: Towards Detection of Diffusion Model Artifacts* (IEEE Access, 2023).
- **Generators**: DALL-E 2, DALL-E 3, Midjourney v5, Stable Diffusion v1.3, v1.4, v2.0, Firefly, GLIDE.
- **Real Source**: Raise-1k uncompressed raw photographic dataset.
- **Scale**: ~10,000 synthetic images and 1,000 pristine real uncompressed images.
- **License**: **CC BY 4.0**.
- **Permissible Use**: Research and commercial evaluation with attribution.
- **Strengths**: Native high-resolution images evaluated against uncompressed camera sensor originals. Excellent for evaluating camera sensor noise vs algorithmic noise.

---

### 2.4 FaceForensics++ (Video & Face Manipulation Benchmark)
- **Paper**: Rössler et al., *FaceForensics++: Learning to Detect Manipulated Facial Images* (ICCV 2019).
- **Manipulations**: Deepfakes, Face2Face, FaceSwap, NeuralTextures, FaceShifter.
- **Scale**: 1,000 original video sequences with corresponding manipulated sequences under 3 compression rates (raw, HQ, LQ).
- **License**: Non-Commercial Research License (Requires university/institutional agreement sign-off).
- **Permissible Use**: Academic benchmarking only. Prohibited from commercial redistribution or direct weight embedding without authorization.

---

## 3. Dataset Manifest Specification

All datasets ingested for OmniScan training and evaluation must produce a standardized manifest with the following schema:

| Column | Type | Description | Permitted Values |
|---|---|---|---|
| `filepath` | string | Normalized relative path to image file on local filesystem | e.g. `data/train/real/real_0001.png` |
| `label` | string | Binary ground truth label | Strictly `"real"` or `"synthetic"` |
| `source_dataset` | string | Originating research collection | e.g. `"CIFAKE"`, `"GenImage"`, `"Synthbuster"` |
| `generator_family` | string | Underlying architecture or camera sensor | e.g. `"StableDiffusion_v1.4"`, `"Midjourney"`, `"Camera_Natural"` |
| `split` | string | Partition assignment | Strictly `"train"`, `"val"`, `"test"`, `"test_heldout"` |
| `sha256` | string | Cryptographic SHA-256 digest of raw file bytes | 64-character lowercase hexadecimal string |

---

## 4. Leakage Prevention Protocol

1. **Exact Deduplication**: SHA-256 digests are cross-referenced across all partitions. If any SHA-256 collision occurs between `train` and `test` or `val`, the duplicate is permanently purged.
2. **Perceptual Deduplication**: Difference Hash (`dHash`) and Average Hash (`aHash`) are computed. Any pair with Hamming distance $\le 2$ across splits is flagged and isolated to prevent transformed leaks.
3. **Generator-Held-Out Split**: To test genuine generalization rather than overfitting to specific generator noise fingerprints, one complete generator family (e.g. held-out test subset) is excluded from `train` and `val` and evaluated strictly on the final model.
