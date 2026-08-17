"""
TruthLens AI — Classification Threshold Optimization

Evaluates multiple thresholds on the validation set and selects the one
that maximizes F1 score for the manipulated class.

IMPORTANT:
- Threshold is selected using ONLY validation data
- The selected threshold is frozen BEFORE test evaluation
- Using test set for threshold selection would be data leakage
"""
import logging
import numpy as np
import torch
import torch.nn as nn
from pathlib import Path

from config import THRESHOLDS_TO_EVALUATE

logger = logging.getLogger(__name__)


def find_optimal_threshold(
    model: nn.Module,
    val_loader,
    device: torch.device,
    thresholds: list = None,
) -> tuple[float, list]:
    """
    Find threshold that maximizes F1 on validation set.

    Returns:
        optimal_threshold (float)
        results (list of dicts): {threshold, f1, precision, recall, accuracy}
    """
    if thresholds is None:
        thresholds = THRESHOLDS_TO_EVALUATE

    # Collect all probabilities from validation set
    model.eval()
    all_probs = []
    all_labels = []

    with torch.no_grad():
        for images, labels in val_loader:
            images = images.to(device)
            outputs = model(images)
            probs = torch.sigmoid(outputs).squeeze(1).cpu().numpy()
            all_probs.extend(probs.tolist())
            all_labels.extend(labels.numpy().tolist())

    all_probs = np.array(all_probs)
    all_labels = np.array(all_labels)

    if len(all_probs) == 0:
        logger.warning("Empty validation set, using default threshold 0.45")
        return 0.45, []

    results = []
    print("\nThreshold Optimization (Validation Set):")
    print(f"{'Threshold':>10} {'F1':>8} {'Precision':>10} {'Recall':>8} {'Accuracy':>10}")
    print("-" * 50)

    for t in thresholds:
        preds = (all_probs >= t).astype(int)

        tp = int(((preds == 1) & (all_labels == 1)).sum())
        fp = int(((preds == 1) & (all_labels == 0)).sum())
        fn = int(((preds == 0) & (all_labels == 1)).sum())
        tn = int(((preds == 0) & (all_labels == 0)).sum())

        precision = tp / max(tp + fp, 1)
        recall = tp / max(tp + fn, 1)
        f1 = 2 * precision * recall / max(precision + recall, 1e-8)
        accuracy = (tp + tn) / max(len(all_labels), 1)

        results.append({
            "threshold": t,
            "f1": f1,
            "precision": precision,
            "recall": recall,
            "accuracy": accuracy,
        })

        print(f"{t:>10.2f} {f1:>8.4f} {precision:>10.4f} {recall:>8.4f} {accuracy:>10.4f}")

    # Select threshold with highest F1
    best = max(results, key=lambda x: x["f1"])
    optimal_threshold = best["threshold"]

    print(f"\n→ Optimal threshold: {optimal_threshold:.2f} (F1={best['f1']:.4f})")
    logger.info(f"Optimal threshold: {optimal_threshold:.2f}")

    return optimal_threshold, results
