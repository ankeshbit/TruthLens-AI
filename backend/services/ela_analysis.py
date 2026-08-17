"""
TruthLens AI — Error Level Analysis (ELA) Service

ELA works by re-saving the image at a lower JPEG quality and measuring
the pixel-level difference between original and re-saved versions.

Areas that were previously modified and re-saved tend to show LESS
error (lower difference) compared to unmodified regions, because JPEG
compression has already been applied there. This creates distinctive
patterns. However, ELA results depend heavily on the original compression
history and should not be used as sole evidence.

IMPORTANT: Screenshots are often PNG (lossless) or already-compressed JPEG.
Applying ELA to PNG screenshots converts them to JPEG, so the baseline
is the first-ever JPEG compression. This is useful for detecting regions
pasted from different sources (different compression histories).
"""
import io
import logging
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


def compute_ela(img: Image.Image, quality: int = 90) -> tuple[np.ndarray, dict]:
    """
    Compute Error Level Analysis map.

    Args:
        img: PIL Image (RGB)
        quality: JPEG recompression quality (70-95 typical)

    Returns:
        ela_array: uint8 numpy array (H, W, 3) — amplified difference map
        stats: dict with ELA statistics
    """
    try:
        # Save to JPEG at specified quality
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=quality)
        buffer.seek(0)
        recompressed = Image.open(buffer).convert("RGB")

        # Compute pixel-level difference
        orig_arr = np.array(img, dtype=np.float32)
        recomp_arr = np.array(recompressed, dtype=np.float32)

        diff = np.abs(orig_arr - recomp_arr)

        # Amplify for visualization (scale to 0-255)
        amplification_factor = 15.0
        ela_amplified = np.clip(diff * amplification_factor, 0, 255).astype(np.uint8)

        # Compute anomaly statistics
        mean_ela = float(np.mean(diff))
        max_ela = float(np.max(diff))
        std_ela = float(np.std(diff))

        # Compute local variance to find suspicious regions
        # High local ELA variance suggests inconsistent compression history
        gray_diff = np.mean(diff, axis=2)  # (H, W)
        local_anomaly = _compute_local_anomaly(gray_diff)

        # Normalize score to 0-1
        # Higher score = more anomalous
        ela_score = _compute_ela_score(mean_ela, std_ela, max_ela, local_anomaly)

        stats = {
            "mean_ela": round(mean_ela, 4),
            "max_ela": round(max_ela, 4),
            "std_ela": round(std_ela, 4),
            "local_anomaly": round(float(local_anomaly), 4),
            "ela_score": round(ela_score, 4),
            "quality_used": quality,
        }

        logger.debug(f"ELA stats: {stats}")
        return ela_amplified, stats

    except Exception as e:
        logger.error(f"ELA computation failed: {e}")
        raise


def _compute_local_anomaly(gray_diff: np.ndarray, block_size: int = 32) -> float:
    """
    Compute the coefficient of variation of block-level mean ELA values.
    High variance between blocks suggests inconsistent compression history
    (e.g., one region was edited and re-saved separately).
    """
    h, w = gray_diff.shape
    block_means = []

    for y in range(0, h - block_size, block_size):
        for x in range(0, w - block_size, block_size):
            block = gray_diff[y:y + block_size, x:x + block_size]
            block_means.append(float(np.mean(block)))

    if len(block_means) < 4:
        return 0.0

    block_means = np.array(block_means)
    mean = np.mean(block_means)
    if mean < 1e-8:
        return 0.0

    # Coefficient of variation — high value = suspicious
    cv = float(np.std(block_means) / mean)
    return cv


def _compute_ela_score(
    mean_ela: float,
    std_ela: float,
    max_ela: float,
    local_anomaly: float,
) -> float:
    """
    Combine ELA statistics into a single anomaly score (0-1).

    Calibration notes:
    - Screenshots are typically uniform; high mean_ela or high local_anomaly
      suggests regions with different compression histories.
    - These thresholds are heuristic and may require calibration.
    """
    # Normalize each signal
    # Typical screenshot ELA mean: 0-5 for genuine, >10 for manipulated
    mean_score = min(mean_ela / 20.0, 1.0)

    # Std score
    std_score = min(std_ela / 25.0, 1.0)

    # Local anomaly (coefficient of variation)
    local_score = min(local_anomaly / 2.0, 1.0)

    # Max score
    max_score = min(max_ela / 100.0, 1.0)

    # Weighted combination
    combined = (
        0.30 * mean_score +
        0.25 * std_score +
        0.35 * local_score +
        0.10 * max_score
    )

    return float(np.clip(combined, 0.0, 1.0))


def get_ela_suspicious_regions(
    ela_array: np.ndarray,
    threshold_percentile: float = 95,
    min_area: int = 400,
) -> list[dict]:
    """
    Find high-ELA regions (potentially manipulated areas).

    Returns list of dicts: {bbox: [x1,y1,x2,y2], mean_ela: float}
    """
    try:
        import cv2

        gray = cv2.cvtColor(ela_array, cv2.COLOR_RGB2GRAY)
        threshold = np.percentile(gray, threshold_percentile)
        binary = (gray >= threshold).astype(np.uint8) * 255

        # Dilate to merge nearby regions
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
        dilated = cv2.dilate(binary, kernel, iterations=1)

        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        regions = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            area = w * h
            if area < min_area:
                continue
            region_ela = gray[y:y + h, x:x + w]
            regions.append({
                "bbox": [int(x), int(y), int(x + w), int(y + h)],
                "mean_ela": float(np.mean(region_ela)),
            })

        # Sort by mean ELA descending
        regions.sort(key=lambda r: r["mean_ela"], reverse=True)
        return regions[:5]  # Top 5 suspicious regions

    except ImportError:
        logger.warning("OpenCV not available for ELA region detection")
        return []
    except Exception as e:
        logger.error(f"ELA region detection failed: {e}")
        return []
