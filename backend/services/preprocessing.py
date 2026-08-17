"""
TruthLens AI — Image Preprocessing Service
Validates, resizes, and normalizes uploaded images.
"""
import io
import uuid
import logging
from pathlib import Path
from typing import Optional
import numpy as np
from PIL import Image, UnidentifiedImageError

logger = logging.getLogger(__name__)


class PreprocessingError(Exception):
    pass


def validate_image(file_bytes: bytes, filename: str, max_mb: int = 20) -> None:
    """Validate image bytes for size, format, and integrity."""
    # Size check
    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > max_mb:
        raise PreprocessingError(f"File too large: {size_mb:.1f} MB (max {max_mb} MB)")

    # Integrity check
    try:
        img = Image.open(io.BytesIO(file_bytes))
        img.verify()  # Detects corruption
    except UnidentifiedImageError:
        raise PreprocessingError("Unsupported or corrupted image format")
    except Exception as e:
        raise PreprocessingError(f"Image validation failed: {str(e)}")

    # Extension check
    allowed_ext = {".jpg", ".jpeg", ".png", ".webp"}
    ext = Path(filename).suffix.lower()
    if ext not in allowed_ext:
        raise PreprocessingError(f"Unsupported extension: {ext}")


def load_image(file_bytes: bytes) -> Image.Image:
    """Load image from bytes and convert to RGB."""
    try:
        img = Image.open(io.BytesIO(file_bytes))
        # Handle EXIF orientation
        try:
            from PIL import ImageOps
            img = ImageOps.exif_transpose(img)
        except Exception:
            pass
        img = img.convert("RGB")
        return img
    except Exception as e:
        raise PreprocessingError(f"Failed to load image: {str(e)}")


def resize_for_analysis(img: Image.Image, max_side: int = 2048) -> Image.Image:
    """
    Resize very large images to a manageable size for forensic analysis
    while preserving aspect ratio and forensic detail.
    """
    w, h = img.size
    if max(w, h) <= max_side:
        return img
    scale = max_side / max(w, h)
    new_size = (int(w * scale), int(h * scale))
    logger.info(f"Resizing from {img.size} to {new_size} for analysis")
    return img.resize(new_size, Image.LANCZOS)


def image_to_numpy(img: Image.Image) -> np.ndarray:
    """Convert PIL Image to uint8 numpy array (H, W, 3)."""
    return np.array(img, dtype=np.uint8)


def normalize_for_ml(img: Image.Image, size: int = 224) -> np.ndarray:
    """
    Resize + normalize image for EfficientNet-B0 inference.
    Returns float32 array normalized with ImageNet mean/std.
    Shape: (1, 3, H, W) — ready for torch.
    """
    img_resized = img.resize((size, size), Image.BICUBIC)
    arr = np.array(img_resized, dtype=np.float32) / 255.0

    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    arr = (arr - mean) / std

    # (H, W, C) -> (1, C, H, W)
    arr = arr.transpose(2, 0, 1)[np.newaxis, ...]
    return arr


def save_temp_image(img: Image.Image, temp_dir: Path, suffix: str = ".jpg") -> Path:
    """Save image to a temporary file with a random name."""
    temp_dir.mkdir(parents=True, exist_ok=True)
    filename = f"tmp_{uuid.uuid4().hex}{suffix}"
    path = temp_dir / filename
    if suffix in (".jpg", ".jpeg"):
        img.save(str(path), "JPEG", quality=95)
    else:
        img.save(str(path), "PNG")
    return path


def image_to_base64(img: Image.Image, format: str = "JPEG", quality: int = 85) -> str:
    """Convert PIL image to base64-encoded string."""
    import base64
    buffer = io.BytesIO()
    if format == "JPEG":
        img.save(buffer, format=format, quality=quality)
    else:
        img.save(buffer, format=format)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def numpy_to_base64(arr: np.ndarray, format: str = "JPEG") -> str:
    """Convert numpy array (H, W, 3) uint8 to base64."""
    img = Image.fromarray(arr.astype(np.uint8))
    return image_to_base64(img, format=format)
