"""
VeriShot AI — ML Manipulation Detector

Uses a pretrained EfficientNet-B0 (transfer learning) for binary
classification: genuine (0) vs manipulated (1).

The model operates in two modes:
1. TRAINED: Uses backend/models/trained_model.pth
2. FALLBACK: Returns None (no fake scores generated)

IMPORTANT: Never generate fake probabilities. If the model is not
trained, report status as "unavailable" and continue with forensic
signals only.
"""
import io
import logging
import numpy as np
from pathlib import Path
from typing import Optional, Tuple
from PIL import Image

logger = logging.getLogger(__name__)

_model = None
_model_loaded = False
_model_available = False
_model_path = None
_device = None


def init_model(model_path: Path, device: str = "auto") -> bool:
    """
    Load the trained model from disk. Called once at startup.
    Returns True if model loaded successfully.
    """
    global _model, _model_loaded, _model_available, _model_path, _device

    _model_path = model_path

    if not model_path.exists():
        logger.warning(
            f"ML model not found at {model_path}. "
            "Running in forensic-only mode. "
            "Train the model and place it at the above path to enable ML detection."
        )
        _model_available = False
        return False

    try:
        import torch
        import torch.nn as nn

        # Resolve device
        if device == "auto":
            _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            _device = torch.device(device)

        logger.info(f"Loading ML model from {model_path} on {_device}")

        # Load checkpoint
        checkpoint = torch.load(str(model_path), map_location=_device, weights_only=False)

        # Reconstruct model
        arch = checkpoint.get("arch", "efficientnet_b0")
        _model = _build_model(arch)
        _model.load_state_dict(checkpoint["model_state_dict"])
        _model.to(_device)
        _model.eval()

        _model_loaded = True
        _model_available = True

        logger.info(
            f"ML model loaded. Arch: {arch}, "
            f"threshold: {checkpoint.get('threshold', 0.45)}, "
            f"val_f1: {checkpoint.get('val_f1', 'N/A')}"
        )
        return True

    except Exception as e:
        logger.error(f"Failed to load ML model: {e}")
        _model_available = False
        return False


def is_model_available() -> bool:
    return _model_available


def _build_model(arch: str = "efficientnet_b0"):
    """Build model architecture (must match training code in ml/model.py)."""
    import torch.nn as nn
    import torchvision.models as models

    if arch == "efficientnet_b0":
        model = models.efficientnet_b0(weights=None)
        in_features = model.classifier[1].in_features
        model.classifier = nn.Sequential(
            nn.Dropout(p=0.3, inplace=True),
            nn.Linear(in_features, 1),
        )
    elif arch == "resnet50":
        model = models.resnet50(weights=None)
        in_features = model.fc.in_features
        model.fc = nn.Sequential(
            nn.Dropout(p=0.3),
            nn.Linear(in_features, 1),
        )
    else:
        raise ValueError(f"Unknown architecture: {arch}")

    return model


def predict(img: Image.Image) -> Tuple[Optional[float], dict]:
    """
    Run ML inference on image.

    Returns:
        probability (Optional[float]): Manipulation probability 0-1, or None if unavailable
        meta (dict): Inference metadata
    """
    if not _model_available:
        return None, {"status": "unavailable", "reason": "Model not trained"}

    try:
        import torch

        # Preprocess
        tensor = _preprocess(img)
        tensor = tensor.to(_device)

        # Inference
        with torch.no_grad():
            logit = _model(tensor)
            prob = torch.sigmoid(logit).item()

        return float(prob), {
            "status": "ok",
            "probability": round(float(prob), 4),
            "device": str(_device),
        }

    except Exception as e:
        logger.error(f"ML inference failed: {e}")
        return None, {"status": "error", "reason": str(e)}


def _preprocess(img: Image.Image, size: int = 224):
    """Preprocess image for model inference."""
    import torch

    img_rgb = img.convert("RGB").resize((size, size), Image.BICUBIC)
    arr = np.array(img_rgb, dtype=np.float32) / 255.0

    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    arr = (arr - mean) / std

    # (H, W, C) -> (1, C, H, W)
    tensor = torch.from_numpy(arr.transpose(2, 0, 1)).unsqueeze(0)
    return tensor


def get_gradcam(img: Image.Image) -> Optional[np.ndarray]:
    """
    Compute Grad-CAM heatmap for the given image.
    Returns an RGBA numpy array (same size as input), or None if unavailable.
    """
    if not _model_available:
        return None

    try:
        import torch
        import torch.nn as nn
        import torchvision.models as models

        # Get the last conv layer
        target_layer = _get_target_layer()
        if target_layer is None:
            return None

        img_size = img.size  # (W, H)
        tensor = _preprocess(img).to(_device)
        tensor.requires_grad_(False)

        # Register hooks
        activations = {}
        gradients = {}

        def forward_hook(module, input, output):
            activations["value"] = output.detach()

        def backward_hook(module, grad_input, grad_output):
            gradients["value"] = grad_output[0].detach()

        fwd_handle = target_layer.register_forward_hook(forward_hook)
        bwd_handle = target_layer.register_full_backward_hook(backward_hook)

        # Forward pass
        _model.zero_grad()
        tensor_with_grad = tensor.clone().requires_grad_(True)
        output = _model(tensor_with_grad)
        score = output[:, 0]

        # Backward pass
        score.backward()

        fwd_handle.remove()
        bwd_handle.remove()

        # Compute Grad-CAM
        acts = activations.get("value")
        grads = gradients.get("value")

        if acts is None or grads is None:
            return None

        weights = grads.mean(dim=[2, 3], keepdim=True)
        cam = torch.relu((weights * acts).sum(dim=1, keepdim=True))
        cam = cam.squeeze().cpu().numpy()

        # Normalize
        if cam.max() - cam.min() > 1e-8:
            cam = (cam - cam.min()) / (cam.max() - cam.min())
        else:
            cam = np.zeros_like(cam)

        # Resize to original image size
        from PIL import Image as PILImage
        cam_img = PILImage.fromarray((cam * 255).astype(np.uint8))
        cam_resized = cam_img.resize(img_size, PILImage.BILINEAR)
        cam_arr = np.array(cam_resized, dtype=np.float32) / 255.0

        return _cam_to_heatmap(cam_arr, img)

    except Exception as e:
        logger.error(f"Grad-CAM computation failed: {e}")
        return None


def _get_target_layer():
    """Get the target convolutional layer for Grad-CAM."""
    global _model
    if _model is None:
        return None
    try:
        import torchvision.models as models
        if hasattr(_model, 'features'):
            # EfficientNet
            return _model.features[-1]
        elif hasattr(_model, 'layer4'):
            # ResNet
            return _model.layer4[-1]
        else:
            return None
    except Exception:
        return None


def _cam_to_heatmap(cam: np.ndarray, original_img: Image.Image) -> np.ndarray:
    """Convert Grad-CAM values to a colored heatmap overlay."""
    import cv2

    # Apply colormap
    cam_uint8 = (cam * 255).astype(np.uint8)
    heatmap = cv2.applyColorMap(cam_uint8, cv2.COLORMAP_JET)
    heatmap_rgb = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)

    # Blend with original
    orig_arr = np.array(original_img.convert("RGB"), dtype=np.uint8)

    # Resize heatmap to match original
    if heatmap_rgb.shape[:2] != orig_arr.shape[:2]:
        heatmap_pil = Image.fromarray(heatmap_rgb)
        heatmap_pil = heatmap_pil.resize(
            (orig_arr.shape[1], orig_arr.shape[0]), Image.BILINEAR
        )
        heatmap_rgb = np.array(heatmap_pil)

    overlay = (0.5 * orig_arr.astype(np.float32) + 0.5 * heatmap_rgb.astype(np.float32))
    return np.clip(overlay, 0, 255).astype(np.uint8)
