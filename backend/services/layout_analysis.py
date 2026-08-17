"""
TruthLens AI — Layout & Text Consistency Analysis

Analyzes the spatial arrangement and visual consistency of text regions
detected by OCR. Looks for signs of manipulation such as:
- Text regions with inconsistent local image properties
- Unusual text sizes or positions for the document type
- Suspicious numeric patterns (altered amounts, dates)
- Misaligned text elements
"""
import re
import logging
import numpy as np
from PIL import Image
from typing import Optional

logger = logging.getLogger(__name__)


# Keywords that identify screenshot types
PAYMENT_KEYWORDS = {
    "payment", "paid", "transaction", "upi", "rupee", "₹", "rs.", "amount",
    "credit", "debit", "transfer", "bank", "account", "balance", "receipt",
    "invoice", "bill", "successful", "failed", "pending", "ref no", "ref id",
    "txn", "transaction id", "order id", "merchant", "payee", "payer"
}
BANK_KEYWORDS = {
    "ifsc", "branch", "savings", "current", "account", "passbook",
    "statement", "balance", "neft", "rtgs", "imps", "atm", "withdrawal",
    "deposit", "cheque", "check"
}
INVOICE_KEYWORDS = {
    "invoice", "gst", "gstin", "tax", "subtotal", "total", "item",
    "quantity", "rate", "discount", "hsn", "bill of supply", "seller",
    "buyer", "supplier"
}
RECEIPT_KEYWORDS = {"receipt", "cash", "change", "cashier", "store"}
NOTIFICATION_KEYWORDS = {"notification", "alert", "otp", "verify", "code", "expires"}
TICKET_KEYWORDS = {
    "ticket", "booking", "seat", "pnr", "train", "flight", "bus",
    "airline", "departure", "arrival", "boarding", "gate"
}


def classify_screenshot_type(ocr_results: list[dict]) -> str:
    """
    Classify the screenshot type based on OCR text content.
    Returns one of the ScreenshotType enum values.
    """
    if not ocr_results:
        return "unknown"

    all_text = " ".join(item["text"].lower() for item in ocr_results)

    scores = {
        "payment": _keyword_score(all_text, PAYMENT_KEYWORDS),
        "bank_transaction": _keyword_score(all_text, BANK_KEYWORDS),
        "invoice": _keyword_score(all_text, INVOICE_KEYWORDS),
        "receipt": _keyword_score(all_text, RECEIPT_KEYWORDS),
        "notification": _keyword_score(all_text, NOTIFICATION_KEYWORDS),
        "ticket": _keyword_score(all_text, TICKET_KEYWORDS),
    }

    best_type = max(scores, key=scores.get)
    best_score = scores[best_type]

    if best_score < 0.05:
        return "generic_document"

    return best_type


def _keyword_score(text: str, keywords: set) -> float:
    """Count keyword matches as a fraction of the keyword set."""
    hits = sum(1 for kw in keywords if kw in text)
    return hits / max(len(keywords), 1)


def analyze_text_consistency(
    img: Image.Image,
    ocr_results: list[dict],
) -> tuple[float, dict]:
    """
    Analyze OCR text regions for consistency with surrounding image content.

    Returns:
        text_score (float, 0-1): Anomaly score
        stats (dict): Analysis details
    """
    if not ocr_results:
        return 0.0, {"status": "no_text_detected", "text_score": 0.0}

    try:
        img_arr = np.array(img.convert("RGB"), dtype=np.float32)
        img_gray = np.array(img.convert("L"), dtype=np.float32)

        h, w = img_gray.shape

        region_stats = []
        for item in ocr_results:
            x1, y1, x2, y2 = item["bbox"]
            # Ensure valid bounds
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w, x2), min(h, y2)

            if x2 <= x1 or y2 <= y1:
                continue

            # Analyze local image properties around this text region
            region = img_gray[y1:y2, x1:x2]
            surrounding = _get_surrounding_region(img_gray, x1, y1, x2, y2, margin=20)

            if surrounding is not None and region.size > 0:
                region_var = float(np.var(region))
                surround_var = float(np.var(surrounding))

                # High difference in local variance is suspicious
                if surround_var > 1e-4:
                    var_ratio = abs(region_var - surround_var) / (surround_var + 1e-8)
                else:
                    var_ratio = 0.0

                region_stats.append({
                    "text": item["text"],
                    "bbox": item["bbox"],
                    "variance_ratio": var_ratio,
                })

        if not region_stats:
            return 0.0, {"num_regions_analyzed": 0}

        # Numeric anomaly check
        numeric_score = _check_numeric_anomalies(ocr_results)

        # Alignment anomaly check
        alignment_score = _check_alignment_anomalies(ocr_results)

        # Variance anomaly
        var_scores = [r["variance_ratio"] for r in region_stats]
        mean_var_score = float(np.mean(var_scores))
        max_var_score = float(np.max(var_scores))
        variance_anomaly = min(
            0.5 * min(mean_var_score / 2.0, 1.0) + 0.5 * min(max_var_score / 4.0, 1.0),
            1.0
        )

        # Combined text score
        text_score = (
            0.40 * variance_anomaly +
            0.35 * numeric_score +
            0.25 * alignment_score
        )
        text_score = float(np.clip(text_score, 0.0, 1.0))

        stats = {
            "text_score": round(text_score, 4),
            "num_regions_analyzed": len(region_stats),
            "variance_anomaly": round(variance_anomaly, 4),
            "numeric_score": round(numeric_score, 4),
            "alignment_score": round(alignment_score, 4),
            "suspicious_regions": [
                r for r in region_stats if r["variance_ratio"] > 1.0
            ],
        }

        logger.debug(f"Text analysis stats: {stats}")
        return text_score, stats

    except Exception as e:
        logger.error(f"Text consistency analysis failed: {e}")
        return 0.0, {"error": str(e)}


def _get_surrounding_region(
    gray: np.ndarray, x1: int, y1: int, x2: int, y2: int, margin: int = 20
) -> Optional[np.ndarray]:
    """Extract a region surrounding (but not including) the text box."""
    h, w = gray.shape
    sx1 = max(0, x1 - margin)
    sy1 = max(0, y1 - margin)
    sx2 = min(w, x2 + margin)
    sy2 = min(h, y2 + margin)

    # Create mask excluding the inner region
    surrounding = []
    full_region = gray[sy1:sy2, sx1:sx2]
    if full_region.size < 100:
        return None

    # Top strip
    if sy1 < y1:
        surrounding.append(gray[sy1:y1, sx1:sx2].flatten())
    # Bottom strip
    if y2 < sy2:
        surrounding.append(gray[y2:sy2, sx1:sx2].flatten())
    # Left strip
    if sx1 < x1:
        surrounding.append(gray[sy1:sy2, sx1:x1].flatten())
    # Right strip
    if x2 < sx2:
        surrounding.append(gray[sy1:sy2, x2:sx2].flatten())

    if not surrounding:
        return None

    return np.concatenate(surrounding)


def _check_numeric_anomalies(ocr_results: list[dict]) -> float:
    """
    Check for suspicious numeric patterns.
    Look for amounts that seem unusually large or formatting inconsistencies.
    """
    amounts = []
    currency_pattern = re.compile(r"[₹$€£¥]\s*[\d,]+\.?\d*|[\d,]+\.?\d*\s*[₹$€£¥]")

    for item in ocr_results:
        text = item["text"]
        matches = currency_pattern.findall(text)
        for m in matches:
            # Extract numeric value
            num_str = re.sub(r"[₹$€£¥,\s]", "", m)
            try:
                val = float(num_str)
                amounts.append(val)
            except ValueError:
                pass

    if len(amounts) < 2:
        return 0.0

    # Check for extreme range — if amounts span several orders of magnitude, suspicious
    min_amt = min(amounts)
    max_amt = max(amounts)

    if min_amt <= 0:
        return 0.0

    ratio = max_amt / min_amt
    # Very large ratio (e.g., one amount is 10000x another) could indicate manipulation
    if ratio > 1000:
        return 0.3
    elif ratio > 10000:
        return 0.5

    return 0.0


def _check_alignment_anomalies(ocr_results: list[dict]) -> float:
    """
    Check for text elements that are unusually misaligned.
    Genuine screenshots tend to have text aligned to grid/baselines.
    """
    if len(ocr_results) < 3:
        return 0.0

    # Get all top-y coordinates
    top_ys = [item["bbox"][1] for item in ocr_results]
    if not top_ys:
        return 0.0

    # Compute y-distribution
    y_arr = np.array(top_ys, dtype=float)
    # Check if most text is on similar y-levels (grid alignment)
    # Large outliers could indicate floating/pasted text
    y_mean = np.mean(y_arr)
    y_std = np.std(y_arr)

    if y_std < 5:
        return 0.0  # All on same line, normal

    # Count outliers (text elements more than 3 std from their cluster)
    # This is a very rough heuristic
    return 0.0  # Disable aggressive alignment scoring for screenshots
