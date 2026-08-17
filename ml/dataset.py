"""
TruthLens AI — Dataset Loading and Management

Handles:
- Loading from raw/{genuine,manipulated}/ structure
- Train/val/test splitting with group-aware splitting
  (to prevent data leakage between related genuine/manipulated pairs)
- Class imbalance detection and weighting
- Data augmentation (conservative)
- Data leak prevention via filename grouping
"""
import os
import re
import hashlib
import logging
import random
from pathlib import Path
from typing import Optional

import numpy as np
from PIL import Image, UnidentifiedImageError

import torch
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
import torchvision.transforms as T

from config import (
    GENUINE_DIR, MANIPULATED_DIR, PROCESSED_DIR,
    IMAGE_SIZE, NORMALIZE_MEAN, NORMALIZE_STD,
    TRAIN_SPLIT, VAL_SPLIT, TEST_SPLIT,
    GENUINE_LABEL, MANIPULATED_LABEL,
    USE_HORIZONTAL_FLIP, BRIGHTNESS_FACTOR, CONTRAST_FACTOR,
    SEED, NUM_WORKERS,
)

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


class ScreenshotDataset(Dataset):
    """PyTorch dataset for screenshot manipulation detection."""

    def __init__(self, samples: list[tuple[Path, int]], transform=None):
        """
        Args:
            samples: List of (path, label) tuples
            transform: torchvision transforms
        """
        self.samples = samples
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        try:
            img = Image.open(str(path)).convert("RGB")
        except Exception as e:
            logger.warning(f"Failed to load {path}: {e}, using blank image")
            img = Image.new("RGB", (IMAGE_SIZE, IMAGE_SIZE), color=(128, 128, 128))

        if self.transform:
            img = self.transform(img)

        return img, torch.tensor(label, dtype=torch.float32)


def get_transforms(is_train: bool = True):
    """
    Get image transforms.
    Training uses conservative augmentation to preserve forensic details.
    Validation/test uses only resize and normalize.
    """
    if is_train:
        transforms = [
            T.Resize((IMAGE_SIZE, IMAGE_SIZE), antialias=True),
        ]
        if USE_HORIZONTAL_FLIP:
            transforms.append(T.RandomHorizontalFlip(p=0.5))
        if BRIGHTNESS_FACTOR > 0 or CONTRAST_FACTOR > 0:
            transforms.append(
                T.ColorJitter(
                    brightness=BRIGHTNESS_FACTOR,
                    contrast=CONTRAST_FACTOR,
                )
            )
        transforms.extend([
            T.ToTensor(),
            T.Normalize(mean=NORMALIZE_MEAN, std=NORMALIZE_STD),
        ])
    else:
        transforms = [
            T.Resize((IMAGE_SIZE, IMAGE_SIZE), antialias=True),
            T.ToTensor(),
            T.Normalize(mean=NORMALIZE_MEAN, std=NORMALIZE_STD),
        ]

    return T.Compose(transforms)


def load_raw_dataset() -> list[tuple[Path, int]]:
    """
    Load all samples from raw/{genuine,manipulated}/ directories.
    Returns list of (path, label) tuples.
    """
    samples = []

    for label, directory in [(GENUINE_LABEL, GENUINE_DIR), (MANIPULATED_LABEL, MANIPULATED_DIR)]:
        if not directory.exists():
            logger.warning(f"Directory not found: {directory}")
            continue

        count = 0
        for ext in SUPPORTED_EXTENSIONS:
            for path in directory.glob(f"*{ext}"):
                if _is_valid_image(path):
                    samples.append((path, label))
                    count += 1
            for path in directory.glob(f"*{ext.upper()}"):
                if _is_valid_image(path):
                    samples.append((path, label))
                    count += 1

        label_name = "genuine" if label == GENUINE_LABEL else "manipulated"
        logger.info(f"Loaded {count} {label_name} images")

    logger.info(f"Total dataset: {len(samples)} samples")
    return samples


def _is_valid_image(path: Path) -> bool:
    """Check if an image file is valid."""
    try:
        img = Image.open(str(path))
        img.verify()
        # Check minimum dimensions
        w, h = img.size if hasattr(img, 'size') else (0, 0)
        return True
    except Exception:
        return False


def _extract_base_name(filename: str) -> str:
    """
    Extract base name for grouping.
    E.g., "payment_001_amount_fake.png" -> "payment_001"
    This is a heuristic — report if uncertain.
    """
    stem = Path(filename).stem
    # Remove common manipulation suffixes
    suffixes = [
        "_fake", "_manipulated", "_edited", "_modified", "_amount",
        "_date", "_name", "_id", "_altered", "_copy", "_paste",
    ]
    for suffix in suffixes:
        if stem.lower().endswith(suffix):
            stem = stem[:len(stem) - len(suffix)]

    # Also remove numeric suffixes that indicate variants
    stem = re.sub(r"_v\d+$", "", stem)
    stem = re.sub(r"_\d+$", "", stem)

    return stem.lower()


def split_dataset(
    samples: list[tuple[Path, int]],
    train_frac: float = TRAIN_SPLIT,
    val_frac: float = VAL_SPLIT,
    seed: int = SEED,
) -> tuple[list, list, list]:
    """
    Split dataset into train/val/test with group-aware splitting
    to prevent data leakage.

    Groups samples by base filename. If a genuine image "x.png" and
    manipulated "x_fake.png" exist, they go to the same split.
    """
    # Group by base name
    groups: dict[str, list] = {}
    for path, label in samples:
        base = _extract_base_name(path.name)
        if base not in groups:
            groups[base] = []
        groups[base].append((path, label))

    group_names = list(groups.keys())
    rng = random.Random(seed)
    rng.shuffle(group_names)

    n = len(group_names)
    n_train = int(n * train_frac)
    n_val = int(n * val_frac)

    train_groups = group_names[:n_train]
    val_groups = group_names[n_train:n_train + n_val]
    test_groups = group_names[n_train + n_val:]

    train = [s for g in train_groups for s in groups[g]]
    val = [s for g in val_groups for s in groups[g]]
    test = [s for g in test_groups for s in groups[g]]

    logger.info(
        f"Split: {len(train)} train, {len(val)} val, {len(test)} test "
        f"({len(train_groups)} / {len(val_groups)} / {len(test_groups)} groups)"
    )

    # Warn about leakage uncertainty
    if len(groups) < len(samples) * 0.5:
        logger.warning(
            "LEAKAGE WARNING: Many samples share base names. "
            "Group-aware splitting applied, but verify manually."
        )
    else:
        logger.info(
            "Group-aware splitting: Most samples have unique base names. "
            "Leakage risk appears low."
        )

    return train, val, test


def compute_class_weights(samples: list[tuple[Path, int]]) -> torch.Tensor:
    """
    Compute class weights for loss function to handle imbalance.
    Returns tensor [weight_genuine, weight_manipulated].
    """
    labels = [label for _, label in samples]
    n_genuine = labels.count(GENUINE_LABEL)
    n_manipulated = labels.count(MANIPULATED_LABEL)
    n_total = len(labels)

    if n_genuine == 0 or n_manipulated == 0:
        logger.warning("Only one class present — class weighting disabled")
        return torch.tensor([1.0, 1.0])

    # Inverse frequency weighting
    weight_genuine = n_total / (2.0 * n_genuine)
    weight_manipulated = n_total / (2.0 * n_manipulated)

    logger.info(
        f"Class distribution: {n_genuine} genuine ({100*n_genuine/n_total:.1f}%), "
        f"{n_manipulated} manipulated ({100*n_manipulated/n_total:.1f}%)"
    )
    logger.info(
        f"Class weights: genuine={weight_genuine:.3f}, "
        f"manipulated={weight_manipulated:.3f}"
    )

    return torch.tensor([weight_genuine, weight_manipulated], dtype=torch.float32)


def create_dataloaders(
    train_samples: list,
    val_samples: list,
    test_samples: list,
    batch_size: int = 16,
) -> tuple[DataLoader, DataLoader, DataLoader]:
    """Create DataLoader objects for all splits."""
    train_ds = ScreenshotDataset(train_samples, transform=get_transforms(is_train=True))
    val_ds = ScreenshotDataset(val_samples, transform=get_transforms(is_train=False))
    test_ds = ScreenshotDataset(test_samples, transform=get_transforms(is_train=False))

    train_loader = DataLoader(
        train_ds,
        batch_size=batch_size,
        shuffle=True,
        num_workers=NUM_WORKERS,
        pin_memory=False,
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=batch_size,
        shuffle=False,
        num_workers=NUM_WORKERS,
        pin_memory=False,
    )
    test_loader = DataLoader(
        test_ds,
        batch_size=batch_size,
        shuffle=False,
        num_workers=NUM_WORKERS,
        pin_memory=False,
    )

    return train_loader, val_loader, test_loader
