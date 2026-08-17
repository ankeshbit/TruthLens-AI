"""
TruthLens AI — Model Evaluation Utilities

Provides metrics computation for training and final evaluation.
"""
import logging
import numpy as np
import torch
import torch.nn as nn
from pathlib import Path

logger = logging.getLogger(__name__)


def evaluate_epoch(
    model: nn.Module,
    loader,
    device: torch.device,
    threshold: float = 0.5,
) -> dict:
    """
    Evaluate model on a dataloader.
    Returns dict with accuracy, precision, recall, f1, roc_auc.
    """
    model.eval()
    all_probs = []
    all_labels = []
    total_loss = 0.0
    criterion = nn.BCEWithLogitsLoss()

    with torch.no_grad():
        for images, labels in loader:
            images = images.to(device, non_blocking=True)
            labels_dev = labels.to(device).unsqueeze(1)

            outputs = model(images)
            loss = criterion(outputs, labels_dev)
            total_loss += loss.item() * images.size(0)

            probs = torch.sigmoid(outputs).squeeze(1).cpu().numpy()
            all_probs.extend(probs.tolist())
            all_labels.extend(labels.numpy().tolist())

    all_probs = np.array(all_probs)
    all_labels = np.array(all_labels)

    if len(all_probs) == 0:
        return {"accuracy": 0, "precision": 0, "recall": 0, "f1": 0, "loss": 0}

    preds = (all_probs >= threshold).astype(int)

    # Metrics
    tp = int(((preds == 1) & (all_labels == 1)).sum())
    tn = int(((preds == 0) & (all_labels == 0)).sum())
    fp = int(((preds == 1) & (all_labels == 0)).sum())
    fn = int(((preds == 0) & (all_labels == 1)).sum())

    accuracy = (tp + tn) / max(len(all_labels), 1)
    precision = tp / max(tp + fp, 1)
    recall = tp / max(tp + fn, 1)
    f1 = 2 * precision * recall / max(precision + recall, 1e-8)

    avg_loss = total_loss / max(len(all_labels), 1)

    metrics = {
        "accuracy": round(float(accuracy), 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1": round(float(f1), 4),
        "loss": round(float(avg_loss), 6),
        "tp": tp, "tn": tn, "fp": fp, "fn": fn,
    }

    # ROC-AUC
    try:
        from sklearn.metrics import roc_auc_score
        if len(np.unique(all_labels)) > 1:
            auc = roc_auc_score(all_labels, all_probs)
            metrics["roc_auc"] = round(float(auc), 4)
    except Exception:
        pass

    return metrics


def print_epoch_results(
    epoch: int,
    total_epochs: int,
    train_loss: float,
    train_acc: float,
    val_metrics: dict,
    elapsed: float,
):
    """Print formatted epoch results."""
    print(f"\nEpoch {epoch}/{total_epochs} ({elapsed:.1f}s)")
    print(f"  Train Loss: {train_loss:.4f}  Train Acc: {train_acc:.4f}")
    print(f"  Val Loss:   {val_metrics['loss']:.4f}  Val Acc: {val_metrics['accuracy']:.4f}")
    print(f"  Precision:  {val_metrics['precision']:.4f}  Recall: {val_metrics['recall']:.4f}  F1: {val_metrics['f1']:.4f}")
    if "roc_auc" in val_metrics:
        print(f"  ROC-AUC:    {val_metrics['roc_auc']:.4f}")


def save_training_plots(
    train_losses: list,
    val_losses: list,
    train_accs: list,
    val_accs: list,
    val_f1s: list,
    lrs: list,
    results_dir: Path,
):
    """Save training metric plots to results_dir."""
    try:
        import matplotlib
        matplotlib.use("Agg")  # Non-interactive backend
        import matplotlib.pyplot as plt

        epochs = range(1, len(train_losses) + 1)

        # Loss plot
        fig, ax = plt.subplots(figsize=(8, 5))
        ax.plot(epochs, train_losses, "b-o", label="Train Loss", markersize=4)
        ax.plot(epochs, val_losses, "r-o", label="Val Loss", markersize=4)
        ax.set_xlabel("Epoch")
        ax.set_ylabel("Loss")
        ax.set_title("Training vs Validation Loss")
        ax.legend()
        ax.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.savefig(str(results_dir / "loss_curve.png"), dpi=150)
        plt.close()

        # Accuracy plot
        fig, ax = plt.subplots(figsize=(8, 5))
        ax.plot(epochs, train_accs, "b-o", label="Train Accuracy", markersize=4)
        ax.plot(epochs, val_accs, "r-o", label="Val Accuracy", markersize=4)
        ax.set_xlabel("Epoch")
        ax.set_ylabel("Accuracy")
        ax.set_title("Training vs Validation Accuracy")
        ax.legend()
        ax.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.savefig(str(results_dir / "accuracy_curve.png"), dpi=150)
        plt.close()

        # F1 plot
        fig, ax = plt.subplots(figsize=(8, 5))
        ax.plot(epochs, val_f1s, "g-o", label="Val F1", markersize=4)
        ax.set_xlabel("Epoch")
        ax.set_ylabel("F1 Score")
        ax.set_title("Validation F1 Score")
        ax.legend()
        ax.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.savefig(str(results_dir / "f1_curve.png"), dpi=150)
        plt.close()

        logger.info(f"Training plots saved to {results_dir}")

    except ImportError:
        logger.warning("matplotlib not available, skipping plots")
    except Exception as e:
        logger.warning(f"Failed to save plots: {e}")


def generate_evaluation_report(
    model,
    test_loader,
    device: torch.device,
    threshold: float,
    results_dir: Path,
) -> dict:
    """
    Run full evaluation on test set and generate report artifacts.
    """
    metrics = evaluate_epoch(model, test_loader, device, threshold=threshold)

    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        from sklearn.metrics import (
            confusion_matrix, roc_curve, auc,
            precision_recall_curve, classification_report
        )

        # Collect probabilities
        model.eval()
        all_probs, all_labels = [], []
        with torch.no_grad():
            for images, labels in test_loader:
                images = images.to(device)
                outputs = model(images)
                probs = torch.sigmoid(outputs).squeeze(1).cpu().numpy()
                all_probs.extend(probs.tolist())
                all_labels.extend(labels.numpy().tolist())

        all_probs = np.array(all_probs)
        all_labels = np.array(all_labels)
        preds = (all_probs >= threshold).astype(int)

        # Confusion matrix
        cm = confusion_matrix(all_labels, preds)
        fig, ax = plt.subplots(figsize=(6, 5))
        im = ax.imshow(cm, cmap="Blues")
        ax.set_xticks([0, 1])
        ax.set_yticks([0, 1])
        ax.set_xticklabels(["Genuine", "Manipulated"])
        ax.set_yticklabels(["Genuine", "Manipulated"])
        for i in range(2):
            for j in range(2):
                ax.text(j, i, str(cm[i, j]), ha="center", va="center", fontsize=14)
        plt.colorbar(im, ax=ax)
        ax.set_title("Confusion Matrix (Test Set)")
        ax.set_xlabel("Predicted")
        ax.set_ylabel("True")
        plt.tight_layout()
        plt.savefig(str(results_dir / "confusion_matrix.png"), dpi=150)
        plt.close()

        # ROC curve
        if len(np.unique(all_labels)) > 1:
            fpr, tpr, _ = roc_curve(all_labels, all_probs)
            roc_auc = auc(fpr, tpr)
            fig, ax = plt.subplots(figsize=(7, 6))
            ax.plot(fpr, tpr, "b-", label=f"ROC (AUC = {roc_auc:.3f})")
            ax.plot([0, 1], [0, 1], "k--", label="Random")
            ax.set_xlabel("False Positive Rate")
            ax.set_ylabel("True Positive Rate")
            ax.set_title("ROC Curve (Test Set)")
            ax.legend()
            ax.grid(True, alpha=0.3)
            plt.tight_layout()
            plt.savefig(str(results_dir / "roc_curve.png"), dpi=150)
            plt.close()

        # Classification report
        report = classification_report(
            all_labels, preds,
            target_names=["genuine", "manipulated"]
        )
        with open(str(results_dir / "classification_report.txt"), "w") as f:
            f.write(report)
        print("\nClassification Report:")
        print(report)

        logger.info(f"Evaluation report saved to {results_dir}")

    except ImportError as e:
        logger.warning(f"Evaluation report generation skipped: {e}")
    except Exception as e:
        logger.warning(f"Evaluation report error: {e}")

    return metrics
