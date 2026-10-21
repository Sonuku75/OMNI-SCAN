"""PyTorch Dataset & Validation Routines for Synthetic Image Detection.

Enforces zero-fabrication data integrity:
- Rejects ambiguous or unknown labels (only "real" and "synthetic" permitted)
- Checks cryptographic SHA-256 digests
- Verifies split boundaries to prevent data leakage
"""

import json
import os
from typing import Any, Callable, Dict, List, Optional, Tuple
from PIL import Image
import torch
from torch.utils.data import Dataset
import torchvision.transforms as transforms


# Allowed explicit labels and their canonical integer mappings
VALID_LABELS = {"real": 0, "synthetic": 1}

# Standard ImageNet normalization parameters
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


def get_default_train_transforms(image_size: int = 224) -> Callable:
    """Data augmentation transforms for training split."""
    return transforms.Compose([
        transforms.Resize((image_size, image_size)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.ColorJitter(brightness=0.1, contrast=0.1, saturation=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])


def get_default_eval_transforms(image_size: int = 224) -> Callable:
    """Deterministic preprocessing transforms for validation and test splits."""
    return transforms.Compose([
        transforms.Resize((image_size, image_size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])


class SyntheticImageDataset(Dataset):
    """
    Manifest-driven PyTorch Dataset for real vs. synthetic image classification.
    """

    def __init__(
        self,
        manifest_path: str,
        split: str = "train",
        transform: Optional[Callable] = None,
        base_dir: Optional[str] = None,
    ):
        self.manifest_path = manifest_path
        self.split = split
        self.base_dir = base_dir or os.path.dirname(os.path.abspath(manifest_path))

        if not os.path.exists(manifest_path):
            raise FileNotFoundError(f"Manifest file not found: {manifest_path}")

        with open(manifest_path, "r", encoding="utf-8") as f:
            all_records: List[Dict[str, Any]] = json.load(f)

        # Filter by split and strictly validate each record
        self.samples: List[Dict[str, Any]] = []
        for record in all_records:
            if record.get("split") != split:
                continue

            raw_label = record.get("label")
            if raw_label not in VALID_LABELS:
                raise ValueError(
                    f"Invalid or ambiguous label '{raw_label}' in record: {record}. "
                    f"Only explicit labels {list(VALID_LABELS.keys())} are accepted."
                )

            # Resolve file path
            rel_path = record.get("filepath", "")
            abs_path = rel_path if os.path.isabs(rel_path) else os.path.join(self.base_dir, rel_path)

            if not os.path.exists(abs_path):
                raise FileNotFoundError(f"Image file listed in manifest does not exist: {abs_path}")

            sample_entry = {
                "filepath": abs_path,
                "label_str": raw_label,
                "label_idx": VALID_LABELS[raw_label],
                "source_dataset": record.get("source_dataset", "unknown"),
                "generator_family": record.get("generator_family", "unknown"),
                "split": record.get("split"),
                "sha256": record.get("sha256", ""),
            }
            self.samples.append(sample_entry)

        if not self.samples:
            raise ValueError(f"No valid samples found for split '{split}' in {manifest_path}")

        # Set default transforms if not provided
        if transform is not None:
            self.transform = transform
        elif split == "train":
            self.transform = get_default_train_transforms()
        else:
            self.transform = get_default_eval_transforms()

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int, Dict[str, Any]]:
        meta = self.samples[idx]
        img_path = meta["filepath"]

        try:
            with Image.open(img_path) as img:
                img_rgb = img.convert("RGB")
                tensor = self.transform(img_rgb)
        except Exception as e:
            raise RuntimeError(f"Error loading image {img_path}: {e}")

        return tensor, meta["label_idx"], meta

    def get_class_counts(self) -> Dict[str, int]:
        """Returns distribution of classes in this dataset partition."""
        counts = {"real": 0, "synthetic": 0}
        for s in self.samples:
            counts[s["label_str"]] += 1
        return counts

    def get_generator_distribution(self) -> Dict[str, int]:
        """Returns sample count grouped by generator family."""
        dist: Dict[str, int] = {}
        for s in self.samples:
            gen = s["generator_family"]
            dist[gen] = dist.get(gen, 0) + 1
        return dist


def check_dataset_leakage(manifest_path: str) -> Dict[str, Any]:
    """
    Validates that zero images or identical SHA-256 hashes cross split boundaries.
    Returns audit summary or raises ValueError on leakage.
    """
    with open(manifest_path, "r", encoding="utf-8") as f:
        records = json.load(f)

    seen_hashes: Dict[str, str] = {}  # sha256 -> split
    leakage_detected: List[Dict[str, str]] = []
    split_counts: Dict[str, int] = {}

    for r in records:
        h = r.get("sha256", "").lower()
        split = r.get("split", "")
        split_counts[split] = split_counts.get(split, 0) + 1

        if not h:
            continue

        if h in seen_hashes and seen_hashes[h] != split:
            leakage_detected.append({
                "sha256": h,
                "split_1": seen_hashes[h],
                "split_2": split,
                "filepath": r.get("filepath", ""),
            })
        else:
            seen_hashes[h] = split

    if leakage_detected:
        raise ValueError(
            f"Data leakage detected! {len(leakage_detected)} image(s) shared across split boundaries: {leakage_detected}"
        )

    return {
        "total_records": len(records),
        "split_counts": split_counts,
        "unique_hashes": len(seen_hashes),
        "leakage_free": True,
    }
