"""Training Pipeline for OmniScan Synthetic Image Detector.

Executes transfer learning from legitimate pretrained checkpoint (EfficientNet-B0),
evaluates validation metrics (Accuracy, ROC-AUC, F1, Loss) after each epoch,
applies early stopping, and saves the best validated checkpoint with SHA-256 digest.
"""

import argparse
import json
import os
import random
import sys
import time
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score

from .config import ImageTrainingConfig
from .dataset import SyntheticImageDataset, check_dataset_leakage
from .model import SyntheticImageClassifier, compute_file_sha256


def set_seed(seed: int = 42) -> None:
    """Sets random seeds across python, numpy, and pytorch for strict reproducibility."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False


def train_one_epoch(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer,
    device: str,
) -> Tuple[float, float]:
    """Runs one training epoch, returns (mean_loss, accuracy)."""
    model.train()
    total_loss = 0.0
    all_preds: List[int] = []
    all_targets: List[int] = []

    for batch_idx, (images, targets, _) in enumerate(dataloader):
        images = images.to(device)
        targets = targets.to(device)

        optimizer.zero_grad()
        logits = model(images)
        loss = criterion(logits, targets)
        loss.backward()
        optimizer.step()

        total_loss += loss.item() * images.size(0)
        preds = torch.argmax(logits, dim=1).detach().cpu().numpy()
        all_preds.extend(preds)
        all_targets.extend(targets.detach().cpu().numpy())

    avg_loss = total_loss / len(dataloader.dataset)
    acc = accuracy_score(all_targets, all_preds)
    return avg_loss, float(acc)


def validate(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    device: str,
) -> Dict[str, float]:
    """Runs evaluation on validation split without gradient tracking."""
    model.eval()
    total_loss = 0.0
    all_probs: List[float] = []
    all_preds: List[int] = []
    all_targets: List[int] = []

    with torch.no_grad():
        for images, targets, _ in dataloader:
            images = images.to(device)
            targets = targets.to(device)

            logits = model(images)
            loss = criterion(logits, targets)
            total_loss += loss.item() * images.size(0)

            probs = torch.softmax(logits, dim=1)[:, 1].cpu().numpy()
            preds = torch.argmax(logits, dim=1).cpu().numpy()

            all_probs.extend(probs)
            all_preds.extend(preds)
            all_targets.extend(targets.cpu().numpy())

    avg_loss = total_loss / len(dataloader.dataset)
    acc = accuracy_score(all_targets, all_preds)
    f1 = f1_score(all_targets, all_preds, zero_division=0)
    try:
        auc = roc_auc_score(all_targets, all_probs)
    except Exception:
        auc = 0.5

    return {
        "val_loss": float(avg_loss),
        "val_accuracy": float(acc),
        "val_f1": float(f1),
        "val_roc_auc": float(auc),
    }


def run_training(config: Optional[ImageTrainingConfig] = None) -> Dict[str, Any]:
    """Executes full training pipeline and returns summary dictionary."""
    cfg = config or ImageTrainingConfig()
    set_seed(cfg.seed)
    device = cfg.get_device()

    print(f"==================================================")
    print(f" OmniScan Image Detector Training Pipeline")
    print(f" Architecture : {cfg.architecture}")
    print(f" Execution Device : {device}")
    print(f" Manifest Path: {cfg.manifest_path}")
    print(f" Max Epochs   : {cfg.max_epochs}")
    print(f" Batch Size   : {cfg.batch_size}")
    print(f" Learning Rate: {cfg.learning_rate}")
    print(f"==================================================")

    # 1. Verify zero data leakage
    leakage_report = check_dataset_leakage(cfg.manifest_path)
    print(f"[Verification] Dataset verified leakage-free across {leakage_report['total_records']} images.")

    # 2. Build Datasets & Loaders
    train_dataset = SyntheticImageDataset(
        manifest_path=cfg.manifest_path,
        split="train",
        base_dir=cfg.data_dir,
    )
    val_dataset = SyntheticImageDataset(
        manifest_path=cfg.manifest_path,
        split="val",
        base_dir=cfg.data_dir,
    )

    print(f"[Data] Train samples: {len(train_dataset)} {train_dataset.get_class_counts()}")
    print(f"[Data] Val samples  : {len(val_dataset)} {val_dataset.get_class_counts()}")

    train_loader = DataLoader(
        train_dataset,
        batch_size=cfg.batch_size,
        shuffle=True,
        num_workers=cfg.num_workers,
        pin_memory=(device == "cuda"),
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=cfg.batch_size,
        shuffle=False,
        num_workers=cfg.num_workers,
        pin_memory=(device == "cuda"),
    )

    # 3. Model, Criterion, Optimizer, Scheduler
    model = SyntheticImageClassifier(
        architecture=cfg.architecture,
        num_classes=cfg.num_classes,
        pretrained=cfg.pretrained_backbone,
        dropout_rate=cfg.dropout_rate,
    ).to(device)

    # Compute class weights for loss balance
    class_counts = train_dataset.get_class_counts()
    n_real = max(1, class_counts["real"])
    n_synth = max(1, class_counts["synthetic"])
    total_samples = n_real + n_synth
    class_weights = torch.tensor(
        [total_samples / (2.0 * n_real), total_samples / (2.0 * n_synth)],
        dtype=torch.float32,
    ).to(device)

    criterion = nn.CrossEntropyLoss(weight=class_weights)
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=cfg.learning_rate,
        weight_decay=cfg.weight_decay,
    )
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer,
        T_max=cfg.max_epochs,
        eta_min=1e-6,
    )

    # 4. Training Loop
    os.makedirs(cfg.output_dir, exist_ok=True)
    best_checkpoint_path = os.path.join(cfg.output_dir, "best_model.pt")
    history: List[Dict[str, Any]] = []

    best_val_auc = 0.0
    best_epoch = 0
    epochs_no_improve = 0
    start_time = time.time()

    for epoch in range(1, cfg.max_epochs + 1):
        t0 = time.time()
        train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer, device)
        val_metrics = validate(model, val_loader, criterion, device)
        scheduler.step()
        epoch_dur = time.time() - t0

        val_auc = val_metrics["val_roc_auc"]
        val_acc = val_metrics["val_accuracy"]
        val_loss = val_metrics["val_loss"]

        epoch_record = {
            "epoch": epoch,
            "train_loss": round(train_loss, 4),
            "train_acc": round(train_acc, 4),
            "val_loss": round(val_loss, 4),
            "val_acc": round(val_acc, 4),
            "val_f1": round(val_metrics["val_f1"], 4),
            "val_roc_auc": round(val_auc, 4),
            "lr": optimizer.param_groups[0]["lr"],
            "epoch_duration_s": round(epoch_dur, 2),
        }
        history.append(epoch_record)

        print(
            f"Epoch {epoch:02d}/{cfg.max_epochs:02d} [{epoch_dur:.1f}s] - "
            f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.4f} | "
            f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.4f}, Val AUC: {val_auc:.4f}"
        )

        # Track best model based on validation ROC-AUC
        if val_auc > best_val_auc:
            best_val_auc = val_auc
            best_epoch = epoch
            epochs_no_improve = 0

            sha256 = model.save_checkpoint(
                filepath=best_checkpoint_path,
                epoch=epoch,
                val_metrics=val_metrics,
                config=cfg.to_dict(),
                optimizer=optimizer,
            )
            print(f"  --> Saved new best checkpoint at Epoch {epoch} (Val AUC: {val_auc:.4f}, SHA-256: {sha256[:16]}...)")
        else:
            epochs_no_improve += 1
            if epochs_no_improve >= cfg.early_stopping_patience:
                print(f"[Early Stopping] Validation metric did not improve for {epochs_no_improve} epochs. Stopping.")
                break

    total_training_time = time.time() - start_time
    best_sha256 = compute_file_sha256(best_checkpoint_path)

    # Save training history JSON
    history_path = os.path.join(cfg.output_dir, "training_history.json")
    with open(history_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "architecture": cfg.architecture,
                "best_epoch": best_epoch,
                "best_val_auc": round(best_val_auc, 4),
                "total_training_time_seconds": round(total_training_time, 2),
                "checkpoint_path": best_checkpoint_path,
                "checkpoint_sha256": best_sha256,
                "epochs": history,
            },
            f,
            indent=2,
        )

    summary = {
        "status": "completed",
        "best_epoch": best_epoch,
        "best_val_auc": best_val_auc,
        "checkpoint_path": best_checkpoint_path,
        "checkpoint_sha256": best_sha256,
        "total_training_time_seconds": round(total_training_time, 2),
    }
    print(f"\n[Training Complete] Best Checkpoint: {best_checkpoint_path}")
    print(f"SHA-256 Checksum: {best_sha256}")
    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=5, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-4, help="Learning rate")
    args = parser.parse_args()

    cfg = ImageTrainingConfig(
        max_epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr,
    )
    run_training(cfg)
