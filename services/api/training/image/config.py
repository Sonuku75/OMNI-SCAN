"""Training configuration specification for OmniScan synthetic image detector."""

import json
import os
from dataclasses import asdict, dataclass, field
from typing import Dict, Optional


@dataclass
class ImageTrainingConfig:
    # Model architecture and backbone
    architecture: str = "efficientnet_b0"
    num_classes: int = 2
    pretrained_backbone: bool = True
    dropout_rate: float = 0.3
    image_size: int = 224

    # Hyperparameters
    seed: int = 42
    batch_size: int = 32
    learning_rate: float = 1e-4
    weight_decay: float = 1e-4
    max_epochs: int = 6
    early_stopping_patience: int = 3
    lr_scheduler_type: str = "cosine"  # "cosine" or "plateau"
    num_workers: int = 0  # 0 for Windows safety

    # Label semantics
    class_to_idx: Dict[str, int] = field(
        default_factory=lambda: {"real": 0, "synthetic": 1}
    )
    idx_to_class: Dict[int, str] = field(
        default_factory=lambda: {0: "real", 1: "synthetic"}
    )

    # Paths
    data_dir: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data"
    )
    manifest_path: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "manifest.json"
    )
    output_dir: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "checkpoints"
    )
    evaluation_output_path: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "evaluation_report.json"
    )

    # Device
    device: str = "auto"  # "auto", "cpu", "cuda", "mps"

    def get_device(self) -> str:
        if self.device != "auto":
            return self.device
        import torch
        if torch.cuda.is_available():
            return "cuda"
        return "cpu"

    def to_dict(self) -> Dict:
        return asdict(self)

    def save(self, filepath: str) -> None:
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, indent=2)

    @classmethod
    def load(cls, filepath: str) -> "ImageTrainingConfig":
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        # Convert keys of idx_to_class back to int if loaded from JSON
        if "idx_to_class" in data:
            data["idx_to_class"] = {int(k): v for k, v in data["idx_to_class"].items()}
        return cls(**data)
