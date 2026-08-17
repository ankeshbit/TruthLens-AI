"""
VeriShot AI — Noise Analysis Service

Analyzes local noise patterns to detect manipulation.
Genuine screenshots have spatially consistent noise characteristics.
Cut-and-paste forgeries or region replacements often introduce
noise inconsistencies at region boundaries.

Methods used:
1. Local variance analysis — block-level noise estimation
2. High-frequency residual analysis — capture sensor/compression noise
3. Block discontinuity detection — edge inconsistencies at potential splice boundaries
"""
import logging
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


def analyze_noise(img: Image.Image) -> tuple[float, dict]:
    """
    Perform noise consistency analysis.

    Returns:
        noise_score (float, 0-1): Anomaly score. Higher = more suspicious.
        stats (dict): Detailed noise statistics.
    """
    try:
        arr = np.array(img.convert("RGB"), dtype=np.float32)
        gray = np.array(img.convert("L"), dtype=np.float32)

        # 1. Local variance analysis
        variance_score, variance_stats = _local_variance_analysis(gray)

        # 2. High-frequency residual analysis
        hf_score, hf_stats = _high_frequency_analysis(gray)

        # 3. Block discontinuity
        disc_score, disc_stats = _block_discontinuity(gray)

        # Combine scores
        combined = (
            0.40 * variance_score +
            0.40 * hf_score +
            0.20 * disc_score
        )
        noise_score = float(np.clip(combined, 0.0, 1.0))

        stats = {
            "noise_score": round(noise_score, 4),
            "variance_score": round(variance_score, 4),
            "hf_score": round(hf_score, 4),
            "discontinuity_score": round(disc_score, 4),
            **variance_stats,
            **hf_stats,
            **disc_stats,
        }

        logger.debug(f"Noise analysis stats: {stats}")
        return noise_score, stats

    except Exception as e:
        logger.error(f"Noise analysis failed: {e}")
        raise


def _local_variance_analysis(
    gray: np.ndarray, block_size: int = 32
) -> tuple[float, dict]:
    """
    Compute block-level local variance.
    Inconsistent variance across blocks is suspicious.
    """
    h, w = gray.shape
    block_variances = []

    for y in range(0, h - block_size, block_size):
        for x in range(0, w - block_size, block_size):
            block = gray[y:y + block_size, x:x + block_size]
            block_variances.append(float(np.var(block)))

    if len(block_variances) < 4:
        return 0.0, {"num_blocks": 0}

    variances = np.array(block_variances)
    mean_var = float(np.mean(variances))
    std_var = float(np.std(variances))

    # Coefficient of variation of variance — measures spatial inconsistency
    if mean_var < 1e-8:
        cv = 0.0
    else:
        cv = std_var / mean_var

    # Typical screenshots: cv < 0.5 for genuine, > 1.5 for manipulated
    score = min(cv / 2.0, 1.0)

    return score, {
        "num_blocks": len(block_variances),
        "mean_block_variance": round(mean_var, 2),
        "variance_cv": round(cv, 4),
    }


def _high_frequency_analysis(gray: np.ndarray) -> tuple[float, dict]:
    """
    Estimate noise using high-frequency residuals.
    Median filter removes content, leaving noise residual.
    """
    try:
        from scipy.ndimage import median_filter

        # Noise residual via median filter subtraction
        denoised = median_filter(gray, size=3).astype(np.float32)
        residual = gray - denoised

        # Block-level analysis of residual
        h, w = residual.shape
        block_size = 32
        block_stds = []

        for y in range(0, h - block_size, block_size):
            for x in range(0, w - block_size, block_size):
                block = residual[y:y + block_size, x:x + block_size]
                block_stds.append(float(np.std(block)))

        if len(block_stds) < 4:
            return 0.0, {}

        stds = np.array(block_stds)
        mean_std = float(np.mean(stds))
        if mean_std < 1e-8:
            return 0.0, {"mean_noise_std": 0.0}

        cv = float(np.std(stds) / mean_std)
        score = min(cv / 1.5, 1.0)

        return score, {"mean_noise_std": round(mean_std, 4), "noise_std_cv": round(cv, 4)}

    except ImportError:
        # Fallback without scipy
        residual = gray - _simple_blur(gray)
        global_std = float(np.std(residual))
        score = min(global_std / 20.0, 1.0)
        return score, {"global_noise_std": round(global_std, 4)}


def _simple_blur(gray: np.ndarray) -> np.ndarray:
    """Simple box blur for noise estimation without scipy."""
    kernel = np.ones((3, 3), dtype=np.float32) / 9.0
    # Manual convolution for small kernel
    result = np.copy(gray)
    result[1:-1, 1:-1] = (
        gray[:-2, :-2] + gray[:-2, 1:-1] + gray[:-2, 2:] +
        gray[1:-1, :-2] + gray[1:-1, 1:-1] + gray[1:-1, 2:] +
        gray[2:, :-2] + gray[2:, 1:-1] + gray[2:, 2:]
    ) / 9.0
    return result


def _block_discontinuity(
    gray: np.ndarray, block_size: int = 32
) -> tuple[float, dict]:
    """
    Detect sharp discontinuities at block boundaries.
    These can indicate where a region was pasted.
    """
    h, w = gray.shape
    horizontal_jumps = []
    vertical_jumps = []

    # Horizontal boundary jumps
    for y in range(block_size, h - block_size, block_size):
        row_above = gray[y - 1, :]
        row_below = gray[y, :]
        jump = float(np.mean(np.abs(row_below.astype(float) - row_above.astype(float))))
        horizontal_jumps.append(jump)

    # Vertical boundary jumps
    for x in range(block_size, w - block_size, block_size):
        col_left = gray[:, x - 1]
        col_right = gray[:, x]
        jump = float(np.mean(np.abs(col_right.astype(float) - col_left.astype(float))))
        vertical_jumps.append(jump)

    all_jumps = horizontal_jumps + vertical_jumps
    if not all_jumps:
        return 0.0, {}

    mean_jump = float(np.mean(all_jumps))
    max_jump = float(np.max(all_jumps))

    # Normalize: typical screenshots have jumps < 5; large jumps = suspicious
    score = min(max_jump / 50.0, 1.0) * 0.5 + min(mean_jump / 20.0, 1.0) * 0.5

    return score, {
        "mean_boundary_jump": round(mean_jump, 4),
        "max_boundary_jump": round(max_jump, 4),
    }
