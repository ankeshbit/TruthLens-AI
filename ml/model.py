"""
VeriShot AI — ML Model Definition

Supports:
- EfficientNet-B0 (default)
- ResNet50

The architecture uses transfer learning:
- Stage 1: Frozen backbone, only train the classification head
- Stage 2: Unfreeze upper layers, fine-tune with lower learning rate
"""
import torch
import torch.nn as nn
import torchvision.models as models
import logging

logger = logging.getLogger(__name__)


def build_model(arch: str = "efficientnet_b0", dropout: float = 0.3) -> nn.Module:
    """
    Build a binary classification model using transfer learning.

    Args:
        arch: Model architecture name
        dropout: Dropout probability before final layer

    Returns:
        PyTorch model with custom classification head
    """
    if arch == "efficientnet_b0":
        model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)
        in_features = model.classifier[1].in_features
        # Replace classifier
        model.classifier = nn.Sequential(
            nn.Dropout(p=dropout, inplace=True),
            nn.Linear(in_features, 1),
        )
        logger.info(f"Built EfficientNet-B0, in_features={in_features}")

    elif arch == "resnet50":
        model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V1)
        in_features = model.fc.in_features
        model.fc = nn.Sequential(
            nn.Dropout(p=dropout),
            nn.Linear(in_features, 1),
        )
        logger.info(f"Built ResNet50, in_features={in_features}")

    else:
        raise ValueError(f"Unknown architecture: {arch}. Supported: efficientnet_b0, resnet50")

    return model


def freeze_backbone(model: nn.Module, arch: str) -> None:
    """Freeze all backbone layers (Stage 1 training)."""
    if arch == "efficientnet_b0":
        for param in model.features.parameters():
            param.requires_grad = False
    elif arch == "resnet50":
        for name, param in model.named_parameters():
            if not name.startswith("fc"):
                param.requires_grad = False

    frozen_count = sum(1 for p in model.parameters() if not p.requires_grad)
    trainable_count = sum(1 for p in model.parameters() if p.requires_grad)
    logger.info(f"Backbone frozen. Frozen params: {frozen_count}, Trainable: {trainable_count}")


def unfreeze_upper_layers(model: nn.Module, arch: str) -> None:
    """
    Unfreeze upper layers for Stage 2 fine-tuning.
    Only unfreezes the last few blocks to preserve lower-level features.
    """
    if arch == "efficientnet_b0":
        # EfficientNet-B0 has features[0] to features[8]
        # Unfreeze last 3 blocks + classifier
        blocks_to_unfreeze = [
            model.features[6],
            model.features[7],
            model.features[8],
            model.classifier,
        ]
        for block in blocks_to_unfreeze:
            for param in block.parameters():
                param.requires_grad = True

    elif arch == "resnet50":
        # Unfreeze layer4 + fc
        for name, param in model.named_parameters():
            if name.startswith("layer4") or name.startswith("fc"):
                param.requires_grad = True

    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total = sum(p.numel() for p in model.parameters())
    logger.info(
        f"Upper layers unfrozen. Trainable: {trainable:,} / {total:,} "
        f"({100 * trainable / total:.1f}%)"
    )


def count_parameters(model: nn.Module) -> dict:
    """Return parameter counts."""
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total = sum(p.numel() for p in model.parameters())
    return {
        "trainable": trainable,
        "frozen": total - trainable,
        "total": total,
    }


def save_checkpoint(
    model: nn.Module,
    optimizer: torch.optim.Optimizer,
    epoch: int,
    val_f1: float,
    threshold: float,
    arch: str,
    path: str,
) -> None:
    """Save model checkpoint with metadata."""
    torch.save({
        "epoch": epoch,
        "arch": arch,
        "model_state_dict": model.state_dict(),
        "optimizer_state_dict": optimizer.state_dict(),
        "val_f1": val_f1,
        "threshold": threshold,
    }, path)
    logger.info(f"Checkpoint saved: {path} (epoch={epoch}, val_f1={val_f1:.4f})")


def load_checkpoint(path: str, arch: str, device: torch.device) -> tuple:
    """
    Load checkpoint from disk.
    Returns (model, checkpoint_dict)
    """
    checkpoint = torch.load(path, map_location=device, weights_only=False)
    arch = checkpoint.get("arch", arch)

    model = build_model(arch)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device)
    model.eval()

    logger.info(
        f"Loaded checkpoint from {path}: "
        f"epoch={checkpoint.get('epoch')}, "
        f"val_f1={checkpoint.get('val_f1', 'N/A'):.4f}"
    )

    return model, checkpoint
