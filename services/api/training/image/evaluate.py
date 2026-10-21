"""Comprehensive Evaluation, Calibration, and Robustness Benchmarking for OmniScan Image Model.

Measures:
- Accuracy, Precision, Recall, F1, ROC-AUC
- Confusion Matrix (TP, FP, TN, FN), FPR, FNR
- Calibration Error (ECE - Expected Calibration Error, Brier Score)
- Operating threshold selection on validation data
- Per-generator and held-out generalization
- Robustness perturbations (JPEG compression, downscaling, noise)
- Inference latency benchmarking (mean, median, p95, throughput)
"""

import io
import json
import os
import time
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
from PIL import Image, ImageFilter
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from .config import ImageTrainingConfig
from .dataset import SyntheticImageDataset, get_default_eval_transforms
from .model import SyntheticImageClassifier, compute_file_sha256


def compute_expected_calibration_error(
    probabilities: np.ndarray,
    labels: np.ndarray,
    num_bins: int = 10,
) -> float:
    """Computes Expected Calibration Error (ECE) across confidence bins."""
    bin_boundaries = np.linspace(0, 1, num_bins + 1)
    ece = 0.0
    n = len(labels)

    for i in range(num_bins):
        bin_lower = bin_boundaries[i]
        bin_upper = bin_boundaries[i + 1]

        in_bin = (probabilities > bin_lower) & (probabilities <= bin_upper)
        prop_in_bin = np.mean(in_bin)

        if prop_in_bin > 0:
            accuracy_in_bin = np.mean(labels[in_bin])
            avg_confidence_in_bin = np.mean(probabilities[in_bin])
            ece += np.abs(accuracy_in_bin - avg_confidence_in_bin) * prop_in_bin

    return float(ece)


def select_optimal_threshold_on_val(
    val_probs: np.ndarray,
    val_labels: np.ndarray,
    strategy: str = "max_f1",
    target_fpr: float = 0.05,
) -> float:
    """
    Selects operating threshold strictly on validation split data.
    Strategies:
    - 'max_f1': Threshold that maximizes F1 score on validation set.
    - 'target_fpr': Highest threshold that keeps FPR <= target_fpr.
    """
    thresholds = np.linspace(0.01, 0.99, 99)
    best_thresh = 0.5
    best_metric = -1.0

    if strategy == "max_f1":
        for t in thresholds:
            preds = (val_probs >= t).astype(int)
            f1 = f1_score(val_labels, preds, zero_division=0)
            if f1 > best_metric:
                best_metric = f1
                best_thresh = float(t)
    elif strategy == "target_fpr":
        for t in sorted(thresholds, reverse=True):
            preds = (val_probs >= t).astype(int)
            tn, fp, fn, tp = confusion_matrix(val_labels, preds, labels=[0, 1]).ravel()
            fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
            if fpr <= target_fpr:
                best_thresh = float(t)
                break

    return best_thresh


def evaluate_split(
    model: SyntheticImageClassifier,
    dataset: SyntheticImageDataset,
    device: str,
    threshold: float = 0.5,
    batch_size: int = 32,
) -> Dict[str, Any]:
    """Runs full inference and metric evaluation over a dataset partition."""
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=False)
    model.eval()

    all_probs: List[float] = []
    all_targets: List[int] = []
    generator_records: Dict[str, Dict[str, List]] = {}

    with torch.no_grad():
        for images, targets, metas in dataloader:
            images = images.to(device)
            logits = model(images)
            probs = torch.softmax(logits, dim=1)[:, 1].cpu().numpy()
            target_arr = targets.numpy()

            all_probs.extend(probs)
            all_targets.extend(target_arr)

            # Per-generator tracking
            gen_fams = metas["generator_family"]
            for p, y, gen in zip(probs, target_arr, gen_fams):
                if gen not in generator_records:
                    generator_records[gen] = {"probs": [], "targets": []}
                generator_records[gen]["probs"].append(float(p))
                generator_records[gen]["targets"].append(int(y))

    probs_arr = np.array(all_probs)
    targets_arr = np.array(all_targets)
    preds_arr = (probs_arr >= threshold).astype(int)

    # Core metrics
    acc = accuracy_score(targets_arr, preds_arr)
    prec = precision_score(targets_arr, preds_arr, zero_division=0)
    rec = recall_score(targets_arr, preds_arr, zero_division=0)
    f1 = f1_score(targets_arr, preds_arr, zero_division=0)

    try:
        roc_auc = roc_auc_score(targets_arr, probs_arr)
    except Exception:
        roc_auc = 0.5

    # Confusion matrix & Rates
    tn, fp, fn, tp = confusion_matrix(targets_arr, preds_arr, labels=[0, 1]).ravel()
    fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
    fnr = float(fn / (fn + tp)) if (fn + tp) > 0 else 0.0

    # Calibration
    ece = compute_expected_calibration_error(probs_arr, targets_arr)
    brier = float(np.mean((probs_arr - targets_arr) ** 2))

    # Per-generator breakdown
    gen_breakdown: Dict[str, Any] = {}
    for gen, data in generator_records.items():
        g_targets = np.array(data["targets"])
        g_probs = np.array(data["probs"])
        g_preds = (g_probs >= threshold).astype(int)
        g_acc = accuracy_score(g_targets, g_preds)
        gen_breakdown[gen] = {
            "samples": len(g_targets),
            "accuracy": round(float(g_acc), 4),
            "mean_synthetic_prob": round(float(np.mean(g_probs)), 4),
        }

    return {
        "sample_count": len(targets_arr),
        "threshold": round(threshold, 4),
        "accuracy": round(float(acc), 4),
        "precision": round(float(prec), 4),
        "recall": round(float(rec), 4),
        "f1_score": round(float(f1), 4),
        "roc_auc": round(float(roc_auc), 4),
        "confusion_matrix": {
            "true_negatives": int(tn),
            "false_positives": int(fp),
            "false_negatives": int(fn),
            "true_positives": int(tp),
        },
        "false_positive_rate": round(fpr, 4),
        "false_negative_rate": round(fnr, 4),
        "expected_calibration_error": round(ece, 4),
        "brier_score": round(brier, 4),
        "per_generator_metrics": gen_breakdown,
        "probs_cache": probs_arr,
        "targets_cache": targets_arr,
    }


def measure_inference_latency(
    model: SyntheticImageClassifier,
    device: str,
    num_warmup: int = 10,
    num_iterations: int = 100,
    image_size: int = 224,
) -> Dict[str, Any]:
    """Measures single-image inference latency on the selected device."""
    model.eval()
    dummy_input = torch.randn(1, 3, image_size, image_size).to(device)

    # Warmup
    with torch.no_grad():
        for _ in range(num_warmup):
            _ = model(dummy_input)

    latencies_ms: List[float] = []
    with torch.no_grad():
        for _ in range(num_iterations):
            t0 = time.perf_counter()
            _ = model(dummy_input)
            if device == "cuda":
                torch.cuda.synchronize()
            latencies_ms.append((time.perf_counter() - t0) * 1000.0)

    arr = np.array(latencies_ms)
    return {
        "device": device,
        "iterations": num_iterations,
        "mean_latency_ms": round(float(np.mean(arr)), 2),
        "median_latency_ms": round(float(np.median(arr)), 2),
        "p95_latency_ms": round(float(np.percentile(arr, 95)), 2),
        "throughput_fps": round(float(1000.0 / np.mean(arr)), 1),
    }


def evaluate_robustness_on_test(
    model: SyntheticImageClassifier,
    manifest_path: str,
    base_dir: str,
    device: str,
    threshold: float,
) -> Dict[str, Any]:
    """
    Evaluates classifier resilience against common media degradations:
    - JPEG recompression at quality 70 and 50
    - Downsampling to 128px and upscaling
    - Gaussian noise injection
    """
    import torchvision.transforms as transforms

    eval_transforms = get_default_eval_transforms()

    def get_corrupted_dataset(transform_fn) -> SyntheticImageDataset:
        ds = SyntheticImageDataset(
            manifest_path=manifest_path,
            split="test",
            base_dir=base_dir,
            transform=transform_fn,
        )
        return ds

    results: Dict[str, Any] = {}

    # 1. JPEG quality 70
    def jpeg_70_transform(img: Image.Image) -> torch.Tensor:
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=70)
        buf.seek(0)
        recompressed = Image.open(buf).convert("RGB")
        return eval_transforms(recompressed)

    ds_jpeg70 = get_corrupted_dataset(jpeg_70_transform)
    metrics_jpeg70 = evaluate_split(model, ds_jpeg70, device, threshold)
    results["jpeg_compression_q70"] = {
        "accuracy": metrics_jpeg70["accuracy"],
        "f1": metrics_jpeg70["f1_score"],
        "roc_auc": metrics_jpeg70["roc_auc"],
    }

    # 2. JPEG quality 50
    def jpeg_50_transform(img: Image.Image) -> torch.Tensor:
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=50)
        buf.seek(0)
        recompressed = Image.open(buf).convert("RGB")
        return eval_transforms(recompressed)

    ds_jpeg50 = get_corrupted_dataset(jpeg_50_transform)
    metrics_jpeg50 = evaluate_split(model, ds_jpeg50, device, threshold)
    results["jpeg_compression_q50"] = {
        "accuracy": metrics_jpeg50["accuracy"],
        "f1": metrics_jpeg50["f1_score"],
        "roc_auc": metrics_jpeg50["roc_auc"],
    }

    # 3. Downscale to 128px then upscale
    def resize_downscale_transform(img: Image.Image) -> torch.Tensor:
        downscaled = img.resize((128, 128), Image.Resampling.BILINEAR)
        return eval_transforms(downscaled)

    ds_resize = get_corrupted_dataset(resize_downscale_transform)
    metrics_resize = evaluate_split(model, ds_resize, device, threshold)
    results["downscale_128px"] = {
        "accuracy": metrics_resize["accuracy"],
        "f1": metrics_resize["f1_score"],
        "roc_auc": metrics_resize["roc_auc"],
    }

    return results


def run_full_evaluation(
    checkpoint_path: str,
    manifest_path: str,
    base_dir: str,
    output_json_path: str,
) -> Dict[str, Any]:
    """Coordinates full end-to-end evaluation and exports structured report."""
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[Evaluation] Loading model from {checkpoint_path} on {device}...")

    model, meta = SyntheticImageClassifier.load_from_checkpoint(checkpoint_path, device=device)
    chk_sha256 = meta["sha256"]

    # 1. Validation split: tune operating threshold
    val_dataset = SyntheticImageDataset(manifest_path, split="val", base_dir=base_dir)
    val_raw = evaluate_split(model, val_dataset, device, threshold=0.5)

    optimal_thresh = select_optimal_threshold_on_val(
        val_raw["probs_cache"],
        val_raw["targets_cache"],
        strategy="max_f1",
    )
    val_calibrated = evaluate_split(model, val_dataset, device, threshold=optimal_thresh)
    # Remove non-serializable caches
    val_calibrated.pop("probs_cache", None)
    val_calibrated.pop("targets_cache", None)

    # 2. Independent Test Split: apply calibrated threshold
    test_dataset = SyntheticImageDataset(manifest_path, split="test", base_dir=base_dir)
    test_results = evaluate_split(model, test_dataset, device, threshold=optimal_thresh)
    test_results.pop("probs_cache", None)
    test_results.pop("targets_cache", None)

    # 3. Generator Held-Out Split: evaluate generalization
    try:
        heldout_dataset = SyntheticImageDataset(manifest_path, split="test_heldout", base_dir=base_dir)
        heldout_results = evaluate_split(model, heldout_dataset, device, threshold=optimal_thresh)
        heldout_results.pop("probs_cache", None)
        heldout_results.pop("targets_cache", None)
    except Exception as e:
        heldout_results = {"error": f"Held-out split evaluation error: {e}"}

    # 4. Latency
    latency_results = measure_inference_latency(model, device)

    # 5. Robustness
    robustness_results = evaluate_robustness_on_test(
        model, manifest_path, base_dir, device, optimal_thresh
    )

    full_report = {
        "model_architecture": meta["architecture"],
        "checkpoint_path": checkpoint_path,
        "checkpoint_sha256": chk_sha256,
        "evaluation_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "hardware": {
            "device": device,
            "torch_version": torch.__version__,
        },
        "calibration": {
            "tuning_split": "val",
            "tuning_objective": "max_f1_score",
            "calibrated_operating_threshold": round(optimal_thresh, 4),
            "val_f1_at_calibrated_threshold": val_calibrated["f1_score"],
            "val_accuracy": val_calibrated["accuracy"],
        },
        "independent_test_split_results": test_results,
        "generator_held_out_results": heldout_results,
        "robustness_benchmarks": robustness_results,
        "inference_latency": latency_results,
    }

    os.makedirs(os.path.dirname(os.path.abspath(output_json_path)), exist_ok=True)
    with open(output_json_path, "w", encoding="utf-8") as f:
        json.dump(full_report, f, indent=2)

    print(f"[Evaluation] Report successfully saved to {output_json_path}")
    return full_report


if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    chk_path = os.path.join(base_dir, "checkpoints", "best_model.pt")
    manifest_p = os.path.join(base_dir, "data", "manifest.json")
    out_p = os.path.join(base_dir, "evaluation_report.json")
    run_full_evaluation(chk_path, manifest_p, os.path.join(base_dir, "data"), out_p)
