"""
VeriShot AI — ML Training Script

Two-stage training:
Stage 1: Freeze backbone, train classification head
Stage 2: Unfreeze upper layers, fine-tune

Usage:
    python train.py
    python train.py --arch resnet50 --batch_size 8
    python train.py --stage1_epochs 3 --stage2_epochs 10
"""
import argparse
import logging
import random
import sys
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR

sys.path.insert(0, str(Path(__file__).parent))

from config import (
    MODEL_ARCH, DROPOUT_RATE,
    STAGE1_EPOCHS, STAGE1_LR, STAGE1_WEIGHT_DECAY,
    STAGE2_EPOCHS, STAGE2_LR, STAGE2_WEIGHT_DECAY,
    BATCH_SIZE, PATIENCE, SEED,
    CHECKPOINTS_DIR, RESULTS_DIR, BACKEND_MODEL_PATH,
    DEFAULT_THRESHOLD,
)
from dataset import (
    load_raw_dataset, split_dataset, compute_class_weights,
    create_dataloaders,
)
from model import (
    build_model, freeze_backbone, unfreeze_upper_layers,
    save_checkpoint, count_parameters,
)
from evaluate import evaluate_epoch, print_epoch_results
from threshold import find_optimal_threshold

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


def set_seed(seed: int):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def train_epoch(
    model: nn.Module,
    loader,
    optimizer: torch.optim.Optimizer,
    criterion: nn.Module,
    device: torch.device,
) -> tuple[float, float]:
    """Train for one epoch. Returns (loss, accuracy)."""
    model.train()
    total_loss = 0.0
    correct = 0
    total = 0

    try:
        from tqdm import tqdm
        pbar = tqdm(loader, desc="  Training", leave=False, ncols=80)
    except ImportError:
        pbar = loader

    for images, labels in pbar:
        images = images.to(device, non_blocking=True)
        labels = labels.to(device, non_blocking=True).unsqueeze(1)

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()

        # Gradient clipping for stability
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)

        optimizer.step()

        total_loss += loss.item() * images.size(0)
        preds = (torch.sigmoid(outputs) >= 0.5).float()
        correct += (preds == labels).sum().item()
        total += images.size(0)

    avg_loss = total_loss / max(total, 1)
    accuracy = correct / max(total, 1)
    return avg_loss, accuracy


def train(args):
    """Main training function."""
    set_seed(SEED)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Device: {device}")

    # Ensure output dirs
    CHECKPOINTS_DIR.mkdir(parents=True, exist_ok=True)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    # ── Load dataset ────────────────────────────────────────────────────────
    logger.info("Loading dataset...")
    all_samples = load_raw_dataset()

    if len(all_samples) < 10:
        logger.error(
            f"Dataset too small ({len(all_samples)} samples). "
            "Please add images to ml/data/raw/genuine/ and ml/data/raw/manipulated/ "
            "before training. Run: python ../scripts/generate_manipulated_data.py"
        )
        sys.exit(1)

    train_samples, val_samples, test_samples = split_dataset(all_samples)

    if len(train_samples) < 4:
        logger.error("Training set too small. Add more data.")
        sys.exit(1)

    class_weights = compute_class_weights(train_samples)

    # ── Create dataloaders ──────────────────────────────────────────────────
    batch_size = args.batch_size
    train_loader, val_loader, test_loader = create_dataloaders(
        train_samples, val_samples, test_samples, batch_size=batch_size
    )

    logger.info(f"Train: {len(train_samples)}, Val: {len(val_samples)}, Test: {len(test_samples)}")

    # ── Build model ─────────────────────────────────────────────────────────
    model = build_model(args.arch, dropout=DROPOUT_RATE)
    model = model.to(device)

    params = count_parameters(model)
    logger.info(f"Model: {args.arch}, Total params: {params['total']:,}")

    # ── Loss function with class weighting ──────────────────────────────────
    # pos_weight is for manipulated class (label=1)
    pos_weight = class_weights[1].to(device)
    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
    logger.info(f"BCEWithLogitsLoss, pos_weight={pos_weight.item():.3f}")

    # ═══════════════════════════════════════════════════════════════════════
    # STAGE 1: Train classification head only
    # ═══════════════════════════════════════════════════════════════════════
    logger.info("\n" + "=" * 60)
    logger.info("STAGE 1: Training classification head (backbone frozen)")
    logger.info("=" * 60)

    freeze_backbone(model, args.arch)

    optimizer = AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=args.stage1_lr,
        weight_decay=STAGE1_WEIGHT_DECAY,
    )
    scheduler = CosineAnnealingLR(optimizer, T_max=args.stage1_epochs, eta_min=1e-6)

    best_val_f1 = 0.0
    best_checkpoint = str(CHECKPOINTS_DIR / "best_stage1.pth")
    patience_counter = 0

    for epoch in range(1, args.stage1_epochs + 1):
        t0 = time.time()
        train_loss, train_acc = train_epoch(model, train_loader, optimizer, criterion, device)
        val_metrics = evaluate_epoch(model, val_loader, device, threshold=0.5)
        scheduler.step()

        elapsed = time.time() - t0
        print_epoch_results(epoch, args.stage1_epochs, train_loss, train_acc, val_metrics, elapsed)

        if val_metrics["f1"] > best_val_f1:
            best_val_f1 = val_metrics["f1"]
            save_checkpoint(
                model, optimizer, epoch,
                val_f1=best_val_f1,
                threshold=DEFAULT_THRESHOLD,
                arch=args.arch,
                path=best_checkpoint,
            )
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= PATIENCE:
                logger.info(f"Early stopping at epoch {epoch} (Stage 1)")
                break

    # Load best Stage 1 checkpoint for Stage 2
    if Path(best_checkpoint).exists():
        checkpoint = torch.load(best_checkpoint, map_location=device, weights_only=False)
        model.load_state_dict(checkpoint["model_state_dict"])
        logger.info(f"Loaded best Stage 1 checkpoint (val_f1={best_val_f1:.4f})")

    # ═══════════════════════════════════════════════════════════════════════
    # STAGE 2: Fine-tune upper layers
    # ═══════════════════════════════════════════════════════════════════════
    logger.info("\n" + "=" * 60)
    logger.info("STAGE 2: Fine-tuning upper layers")
    logger.info("=" * 60)

    unfreeze_upper_layers(model, args.arch)

    optimizer = AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=args.stage2_lr,
        weight_decay=STAGE2_WEIGHT_DECAY,
    )
    scheduler = CosineAnnealingLR(optimizer, T_max=args.stage2_epochs, eta_min=1e-7)

    best_val_f1_s2 = best_val_f1
    best_checkpoint_s2 = str(CHECKPOINTS_DIR / "best_stage2.pth")
    patience_counter = 0

    for epoch in range(1, args.stage2_epochs + 1):
        t0 = time.time()
        train_loss, train_acc = train_epoch(model, train_loader, optimizer, criterion, device)
        val_metrics = evaluate_epoch(model, val_loader, device, threshold=0.5)
        scheduler.step()

        elapsed = time.time() - t0
        print_epoch_results(epoch, args.stage2_epochs, train_loss, train_acc, val_metrics, elapsed)

        if val_metrics["f1"] > best_val_f1_s2:
            best_val_f1_s2 = val_metrics["f1"]
            save_checkpoint(
                model, optimizer, epoch,
                val_f1=best_val_f1_s2,
                threshold=DEFAULT_THRESHOLD,
                arch=args.arch,
                path=best_checkpoint_s2,
            )
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= PATIENCE:
                logger.info(f"Early stopping at epoch {epoch} (Stage 2)")
                break

    # ── Threshold optimization on validation set ────────────────────────────
    logger.info("\nOptimizing classification threshold...")

    # Load best Stage 2 model
    best_path = best_checkpoint_s2 if Path(best_checkpoint_s2).exists() else best_checkpoint
    if Path(best_path).exists():
        checkpoint = torch.load(best_path, map_location=device, weights_only=False)
        model.load_state_dict(checkpoint["model_state_dict"])
        logger.info(f"Loaded best model from {best_path}")

    optimal_threshold, threshold_results = find_optimal_threshold(
        model, val_loader, device
    )
    logger.info(f"Optimal threshold: {optimal_threshold:.2f}")

    # ── Final evaluation on test set ────────────────────────────────────────
    logger.info("\n" + "=" * 60)
    logger.info("FINAL EVALUATION ON TEST SET")
    logger.info("=" * 60)

    test_metrics = evaluate_epoch(model, test_loader, device, threshold=optimal_threshold)
    logger.info(f"Test Accuracy:  {test_metrics['accuracy']:.4f}")
    logger.info(f"Test Precision: {test_metrics['precision']:.4f}")
    logger.info(f"Test Recall:    {test_metrics['recall']:.4f}")
    logger.info(f"Test F1:        {test_metrics['f1']:.4f}")
    if test_metrics.get('roc_auc') is not None:
        logger.info(f"Test ROC-AUC:   {test_metrics['roc_auc']:.4f}")

    # ── Save final model to backend ─────────────────────────────────────────
    BACKEND_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    save_checkpoint(
        model, optimizer,
        epoch=0,  # Final model
        val_f1=best_val_f1_s2,
        threshold=optimal_threshold,
        arch=args.arch,
        path=str(BACKEND_MODEL_PATH),
    )
    logger.info(f"\n✓ Final model saved to: {BACKEND_MODEL_PATH}")
    logger.info("Training complete!")


def parse_args():
    parser = argparse.ArgumentParser(description="Train VeriShot AI manipulation detector")
    parser.add_argument("--arch", default=MODEL_ARCH, choices=["efficientnet_b0", "resnet50"])
    parser.add_argument("--batch_size", type=int, default=BATCH_SIZE)
    parser.add_argument("--stage1_epochs", type=int, default=STAGE1_EPOCHS)
    parser.add_argument("--stage2_epochs", type=int, default=STAGE2_EPOCHS)
    parser.add_argument("--stage1_lr", type=float, default=STAGE1_LR)
    parser.add_argument("--stage2_lr", type=float, default=STAGE2_LR)
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    train(args)
