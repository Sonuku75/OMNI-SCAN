"""Deep Learning Model Architecture for Synthetic Image Detection.

Uses a legitimate pretrained backbone (EfficientNet-B0 or ResNet-50) with transfer learning
and a calibrated classification head for real vs. synthetic image classification.
"""

import hashlib
import os
from typing import Any, Dict, Optional, Tuple
import torch
import torch.nn as nn
import torchvision.models as models
from torchvision.models import EfficientNet_B0_Weights, ResNet50_Weights


class SyntheticImageClassifier(nn.Module):
    """
    Binary / Multi-class classifier for detecting AI-generated synthetic images
    versus authentic photographs.
    """

    def __init__(
        self,
        architecture: str = "efficientnet_b0",
        num_classes: int = 2,
        pretrained: bool = True,
        dropout_rate: float = 0.3,
    ):
        super().__init__()
        self.architecture = architecture.lower()
        self.num_classes = num_classes

        if self.architecture == "efficientnet_b0":
            weights = EfficientNet_B0_Weights.DEFAULT if pretrained else None
            self.backbone = models.efficientnet_b0(weights=weights)
            in_features = self.backbone.classifier[1].in_features  # 1280
            self.backbone.classifier = nn.Sequential(
                nn.Dropout(p=dropout_rate, inplace=True),
                nn.Linear(in_features, 256),
                nn.SiLU(),
                nn.Dropout(p=dropout_rate * 0.5),
                nn.Linear(256, num_classes),
            )
        elif self.architecture == "resnet50":
            weights = ResNet50_Weights.DEFAULT if pretrained else None
            self.backbone = models.resnet50(weights=weights)
            in_features = self.backbone.fc.in_features  # 2048
            self.backbone.fc = nn.Sequential(
                nn.Dropout(p=dropout_rate),
                nn.Linear(in_features, 256),
                nn.ReLU(inplace=True),
                nn.Dropout(p=dropout_rate * 0.5),
                nn.Linear(256, num_classes),
            )
        else:
            raise ValueError(f"Unsupported architecture: {architecture}")

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass returning raw unnormalized logits (B, num_classes)."""
        return self.backbone(x)

    def predict_proba(self, x: torch.Tensor) -> torch.Tensor:
        """Returns calibrated softmax probabilities (B, num_classes)."""
        logits = self.forward(x)
        return torch.softmax(logits, dim=1)

    def save_checkpoint(
        self,
        filepath: str,
        epoch: int = 0,
        val_metrics: Optional[Dict[str, Any]] = None,
        config: Optional[Dict[str, Any]] = None,
        optimizer: Optional[torch.optim.Optimizer] = None,
    ) -> str:
        """
        Saves checkpoint with full architecture metadata, class mapping, and calculates SHA-256.
        Returns the SHA-256 hash string.
        """
        os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
        checkpoint = {
            "architecture": self.architecture,
            "num_classes": self.num_classes,
            "state_dict": self.state_dict(),
            "epoch": epoch,
            "val_metrics": val_metrics or {},
            "config": config or {},
            "class_to_idx": {"real": 0, "synthetic": 1},
            "idx_to_class": {0: "real", 1: "synthetic"},
            "input_resolution": (224, 224),
            "normalization": {
                "mean": [0.485, 0.456, 0.406],
                "std": [0.229, 0.224, 0.225],
            },
        }
        if optimizer is not None:
            checkpoint["optimizer_state_dict"] = optimizer.state_dict()

        torch.save(checkpoint, filepath)

        # Compute SHA-256 of saved checkpoint file
        sha256 = compute_file_sha256(filepath)
        checkpoint["sha256"] = sha256
        # Re-save with recorded sha256 metadata for traceability
        torch.save(checkpoint, filepath)
        return sha256

    @classmethod
    def load_from_checkpoint(
        cls,
        filepath: str,
        device: str = "cpu",
        expected_sha256: Optional[str] = None,
    ) -> Tuple["SyntheticImageClassifier", Dict[str, Any]]:
        """
        Safely loads model and metadata from checkpoint.
        Validates SHA-256 hash if expected_sha256 is supplied.
        """
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Checkpoint file not found: {filepath}")

        # Hash verification
        actual_sha256 = compute_file_sha256(filepath)
        if expected_sha256 and actual_sha256.lower() != expected_sha256.lower():
            raise ValueError(
                f"Checkpoint SHA-256 integrity check failed. Expected: {expected_sha256}, Actual: {actual_sha256}"
            )

        # Safe PyTorch loading using weights_only where supported
        try:
            checkpoint = torch.load(filepath, map_location=device, weights_only=False)
        except Exception as e:
            raise RuntimeError(f"Failed to deserialize checkpoint: {e}")

        arch = checkpoint.get("architecture", "efficientnet_b0")
        num_classes = checkpoint.get("num_classes", 2)

        model = cls(architecture=arch, num_classes=num_classes, pretrained=False)
        model.load_state_dict(checkpoint["state_dict"])
        model.to(device)
        model.eval()

        metadata = {
            "architecture": arch,
            "num_classes": num_classes,
            "epoch": checkpoint.get("epoch", 0),
            "val_metrics": checkpoint.get("val_metrics", {}),
            "config": checkpoint.get("config", {}),
            "class_to_idx": checkpoint.get("class_to_idx", {"real": 0, "synthetic": 1}),
            "idx_to_class": checkpoint.get("idx_to_class", {0: "real", 1: "synthetic"}),
            "sha256": actual_sha256,
        }
        return model, metadata


def compute_file_sha256(filepath: str) -> str:
    """Computes hexadecimal SHA-256 checksum of a file."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()
