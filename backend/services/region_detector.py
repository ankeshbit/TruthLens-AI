"""
TruthLens AI — Suspicious Region Detector

Combines ELA anomaly map, OCR bounding boxes, and (optionally) Grad-CAM
to produce labeled suspicious region candidates for display.

The detector does NOT make binary decisions. It identifies candidates
that scored high across multiple forensic signals.
"""
import logging
import numpy as np
from PIL import Image, ImageDraw
from typing import Optional

logger = logging.getLogger(__name__)


# Common field labels for payment/document context
AMOUNT_PATTERNS = {
    "₹", "$", "€", "£", "amount", "total", "balance", "paid", "payment",
    "price", "cost", "fee", "charge", "due", "sum"
}
DATE_PATTERNS = {
    "date", "time", "day", "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec", "2024", "2025", "2026",
    "2027", "2028"
}
ID_PATTERNS = {
    "txn", "transaction", "ref", "reference", "id", "order", "booking",
    "pnr", "invoice", "receipt", "no.", "number", "#"
}
NAME_PATTERNS = {"name", "to:", "from:", "payee", "payer", "recipient", "sender"}


def detect_suspicious_regions(
    img: Image.Image,
    ocr_results: list[dict],
    ela_array: Optional[np.ndarray],
    ela_score: float,
    gradcam_array: Optional[np.ndarray],
    text_score: float,
) -> list[dict]:
    """
    Detect and label suspicious regions in the image.

    Returns list of dicts:
    {
        label: str,
        bbox: [x1, y1, x2, y2],
        confidence: float (0-1),
        reason: str,
    }
    """
    candidates = []

    # --- Signal 1: ELA anomalies at text regions ---
    if ela_array is not None and ela_score > 0.20 and ocr_results:
        ela_candidates = _ela_ocr_fusion(ocr_results, ela_array, img.size)
        candidates.extend(ela_candidates)

    # --- Signal 2: High-ELA non-text regions ---
    if ela_array is not None and ela_score > 0.35:
        ela_region_candidates = _high_ela_regions(ela_array, img.size)
        candidates.extend(ela_region_candidates)

    # --- Signal 3: Grad-CAM high-attention regions ---
    if gradcam_array is not None:
        gradcam_candidates = _gradcam_regions(gradcam_array, img.size)
        candidates.extend(gradcam_candidates)

    # --- Merge overlapping candidates ---
    merged = _merge_overlapping(candidates, iou_threshold=0.30)

    # --- Label with document context ---
    labeled = _label_regions(merged, ocr_results)

    # Sort by confidence descending, take top 6
    labeled.sort(key=lambda r: r["confidence"], reverse=True)
    return labeled[:6]


def _ela_ocr_fusion(
    ocr_results: list[dict],
    ela_array: np.ndarray,
    img_size: tuple,
) -> list[dict]:
    """Find OCR regions where the ELA score is anomalously high."""
    candidates = []
    ela_gray = np.mean(ela_array, axis=2)  # (H, W)
    h, w = ela_gray.shape
    img_w, img_h = img_size

    # Scale factor if ela_array and img differ in size
    scale_x = w / img_w
    scale_y = h / img_h

    global_ela_mean = float(np.mean(ela_gray))
    global_ela_std = float(np.std(ela_gray))
    threshold = global_ela_mean + 1.5 * global_ela_std

    for item in ocr_results:
        x1, y1, x2, y2 = item["bbox"]
        # Scale to ELA array coords
        ex1 = int(x1 * scale_x)
        ey1 = int(y1 * scale_y)
        ex2 = int(x2 * scale_x)
        ey2 = int(y2 * scale_y)

        ex1, ey1 = max(0, ex1), max(0, ey1)
        ex2, ey2 = min(w, ex2), min(h, ey2)

        if ex2 <= ex1 or ey2 <= ey1:
            continue

        region_ela = ela_gray[ey1:ey2, ex1:ex2]
        region_mean = float(np.mean(region_ela))

        if region_mean > threshold and region_mean > global_ela_mean * 1.5:
            # Normalize confidence
            conf = min((region_mean - global_ela_mean) / (global_ela_std + 1e-8) / 3.0, 1.0)
            candidates.append({
                "label": _classify_text_label(item["text"]),
                "bbox": [x1, y1, x2, y2],
                "confidence": round(float(conf), 4),
                "reason": f"ELA anomaly detected (mean ELA {region_mean:.1f} vs global {global_ela_mean:.1f})",
                "source": "ela_ocr",
            })

    return candidates


def _high_ela_regions(ela_array: np.ndarray, img_size: tuple) -> list[dict]:
    """Find high-ELA regions without OCR context."""
    try:
        import cv2

        ela_gray = np.mean(ela_array, axis=2).astype(np.uint8)
        threshold = int(np.percentile(ela_gray, 92))
        binary = (ela_gray >= threshold).astype(np.uint8) * 255

        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (20, 20))
        dilated = cv2.dilate(binary, kernel, iterations=1)

        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        candidates = []
        h, w = ela_gray.shape
        img_w, img_h = img_size
        scale_x = img_w / w
        scale_y = img_h / h

        for contour in contours:
            x, y, bw, bh = cv2.boundingRect(contour)
            area = bw * bh
            # Skip tiny regions or regions that are the whole image
            if area < 500 or area > (w * h * 0.5):
                continue

            region_ela = ela_gray[y:y + bh, x:x + bw]
            region_mean = float(np.mean(region_ela))
            global_mean = float(np.mean(ela_gray))

            if region_mean < global_mean * 1.8:
                continue

            conf = min((region_mean - global_mean) / (global_mean + 1e-8) / 2.0, 0.8)

            # Scale to image coords
            ix1 = int(x * scale_x)
            iy1 = int(y * scale_y)
            ix2 = int((x + bw) * scale_x)
            iy2 = int((y + bh) * scale_y)

            candidates.append({
                "label": "High ELA Region",
                "bbox": [ix1, iy1, ix2, iy2],
                "confidence": round(float(conf), 4),
                "reason": "Region shows anomalous ELA values suggesting different compression history",
                "source": "ela_region",
            })

        return candidates[:3]  # Top 3 ELA regions

    except ImportError:
        return []
    except Exception as e:
        logger.debug(f"ELA region detection failed: {e}")
        return []


def _gradcam_regions(gradcam_array: np.ndarray, img_size: tuple) -> list[dict]:
    """Extract high-attention regions from Grad-CAM."""
    try:
        import cv2

        # Convert to grayscale attention map
        if len(gradcam_array.shape) == 3:
            attention = np.mean(gradcam_array, axis=2).astype(np.float32)
        else:
            attention = gradcam_array.astype(np.float32)

        # Normalize to 0-255
        if attention.max() > attention.min():
            attention = (attention - attention.min()) / (attention.max() - attention.min()) * 255
        attention_uint8 = attention.astype(np.uint8)

        threshold = int(np.percentile(attention_uint8, 85))
        binary = (attention_uint8 >= threshold).astype(np.uint8) * 255

        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
        dilated = cv2.dilate(binary, kernel, iterations=1)

        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        candidates = []
        h, w = attention_uint8.shape
        img_w, img_h = img_size

        for contour in contours:
            x, y, bw, bh = cv2.boundingRect(contour)
            area = bw * bh
            if area < 300 or area > (w * h * 0.6):
                continue

            region_attn = attention_uint8[y:y + bh, x:x + bw]
            conf = float(np.mean(region_attn)) / 255.0

            scale_x = img_w / w
            scale_y = img_h / h
            ix1, iy1 = int(x * scale_x), int(y * scale_y)
            ix2, iy2 = int((x + bw) * scale_x), int((y + bh) * scale_y)

            candidates.append({
                "label": "Model Attention Region",
                "bbox": [ix1, iy1, ix2, iy2],
                "confidence": round(conf, 4),
                "reason": "ML model attention concentrated here (Grad-CAM)",
                "source": "gradcam",
            })

        return candidates[:2]

    except Exception as e:
        logger.debug(f"Grad-CAM region extraction failed: {e}")
        return []


def _merge_overlapping(candidates: list[dict], iou_threshold: float = 0.30) -> list[dict]:
    """Merge overlapping candidate regions using simple NMS-like approach."""
    if not candidates:
        return []

    # Sort by confidence
    candidates = sorted(candidates, key=lambda x: x["confidence"], reverse=True)
    kept = []

    for candidate in candidates:
        overlap = False
        for kept_cand in kept:
            if _iou(candidate["bbox"], kept_cand["bbox"]) > iou_threshold:
                # Merge: update kept with higher confidence wins, expand bbox
                kept_cand["bbox"] = _union_bbox(kept_cand["bbox"], candidate["bbox"])
                if candidate.get("source") != kept_cand.get("source"):
                    kept_cand["reason"] += f"; {candidate['reason']}"
                overlap = True
                break
        if not overlap:
            kept.append(dict(candidate))

    return kept


def _iou(bbox1: list, bbox2: list) -> float:
    """Compute Intersection over Union of two bounding boxes."""
    x1 = max(bbox1[0], bbox2[0])
    y1 = max(bbox1[1], bbox2[1])
    x2 = min(bbox1[2], bbox2[2])
    y2 = min(bbox1[3], bbox2[3])

    inter_area = max(0, x2 - x1) * max(0, y2 - y1)
    if inter_area == 0:
        return 0.0

    area1 = (bbox1[2] - bbox1[0]) * (bbox1[3] - bbox1[1])
    area2 = (bbox2[2] - bbox2[0]) * (bbox2[3] - bbox2[1])
    union_area = area1 + area2 - inter_area

    return inter_area / (union_area + 1e-8)


def _union_bbox(bbox1: list, bbox2: list) -> list:
    """Return the bounding box enclosing both inputs."""
    return [
        min(bbox1[0], bbox2[0]),
        min(bbox1[1], bbox2[1]),
        max(bbox1[2], bbox2[2]),
        max(bbox1[3], bbox2[3]),
    ]


def _classify_text_label(text: str) -> str:
    """Classify the type of field based on text content."""
    text_lower = text.lower()

    for kw in AMOUNT_PATTERNS:
        if kw in text_lower or any(c in text for c in "₹$€£"):
            return "Amount/Value"

    for kw in DATE_PATTERNS:
        if kw in text_lower:
            return "Date/Time"

    for kw in ID_PATTERNS:
        if kw in text_lower:
            return "Transaction ID"

    for kw in NAME_PATTERNS:
        if kw in text_lower:
            return "Name/Recipient"

    return "Text Region"


def _label_regions(regions: list[dict], ocr_results: list[dict]) -> list[dict]:
    """
    Try to assign meaningful labels to suspicious regions
    based on overlapping OCR text.
    """
    for region in regions:
        if region["label"] in ("High ELA Region", "Model Attention Region"):
            # Try to find overlapping OCR text
            for ocr in ocr_results:
                if _iou(region["bbox"], ocr["bbox"]) > 0.10:
                    region["label"] = _classify_text_label(ocr["text"])
                    break

    return regions


def draw_suspicious_regions(
    img: Image.Image,
    regions: list[dict],
    risk_level: str,
) -> Image.Image:
    """
    Draw bounding boxes on image for suspicious regions.
    Returns annotated PIL image.
    """
    annotated = img.copy().convert("RGBA")
    overlay = Image.new("RGBA", annotated.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Color by risk level
    color_map = {
        "likely_genuine": (0, 200, 100),
        "suspicious": (255, 165, 0),
        "potentially_manipulated": (220, 50, 50),
    }
    color = color_map.get(risk_level, (220, 50, 50))

    for region in regions:
        x1, y1, x2, y2 = region["bbox"]
        # Draw semi-transparent fill
        draw.rectangle([x1, y1, x2, y2], fill=(*color, 40))
        # Draw border
        draw.rectangle([x1, y1, x2, y2], outline=(*color, 220), width=3)

    # Composite
    result = Image.alpha_composite(annotated, overlay).convert("RGB")
    return result
