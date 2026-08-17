"""
TruthLens AI — OCR Service

Uses EasyOCR for text extraction. If EasyOCR is unavailable,
falls back to a basic OpenCV-based text region detector that
returns bounding boxes without text content.
"""
import logging
import numpy as np
from PIL import Image
from typing import Optional

logger = logging.getLogger(__name__)

_reader = None
_ocr_available = False
_ocr_engine = "none"


def init_ocr(languages: list[str] = None) -> bool:
    """
    Initialize the OCR engine. Called once at app startup.
    Returns True if OCR is available.
    """
    global _reader, _ocr_available, _ocr_engine

    if languages is None:
        languages = ["en"]

    # Try EasyOCR first
    try:
        import easyocr
        logger.info("Initializing EasyOCR...")
        _reader = easyocr.Reader(languages, gpu=False, verbose=False)
        _ocr_available = True
        _ocr_engine = "easyocr"
        logger.info("EasyOCR initialized successfully")
        return True
    except ImportError:
        logger.warning("EasyOCR not installed, trying Tesseract fallback")
    except Exception as e:
        logger.warning(f"EasyOCR initialization failed: {e}")

    # Try pytesseract as fallback
    try:
        import pytesseract
        pytesseract.get_tesseract_version()
        _ocr_available = True
        _ocr_engine = "tesseract"
        logger.info("Tesseract OCR available as fallback")
        return True
    except Exception as e:
        logger.warning(f"Tesseract not available: {e}")

    _ocr_available = False
    _ocr_engine = "none"
    logger.warning("No OCR engine available. Text analysis will be skipped.")
    return False


def is_ocr_available() -> bool:
    return _ocr_available


def get_ocr_engine() -> str:
    return _ocr_engine


def extract_text(img: Image.Image) -> list[dict]:
    """
    Extract text and bounding boxes from image.

    Returns:
        List of dicts: {text, confidence, bbox: [x1, y1, x2, y2]}
    """
    if not _ocr_available:
        return []

    try:
        arr = np.array(img.convert("RGB"))

        if _ocr_engine == "easyocr":
            return _extract_easyocr(arr)
        elif _ocr_engine == "tesseract":
            return _extract_tesseract(img)
        else:
            return []

    except Exception as e:
        logger.error(f"OCR extraction failed: {e}")
        return []


def _extract_easyocr(arr: np.ndarray) -> list[dict]:
    """Extract text using EasyOCR."""
    global _reader
    results = _reader.readtext(arr, detail=1, paragraph=False)

    items = []
    for result in results:
        bbox_raw, text, confidence = result
        if confidence < 0.3 or not text.strip():
            continue

        # EasyOCR returns [[x1,y1],[x2,y1],[x2,y2],[x1,y2]]
        xs = [int(p[0]) for p in bbox_raw]
        ys = [int(p[1]) for p in bbox_raw]
        bbox = [min(xs), min(ys), max(xs), max(ys)]

        items.append({
            "text": text.strip(),
            "confidence": round(float(confidence), 4),
            "bbox": bbox,
        })

    return items


def _extract_tesseract(img: Image.Image) -> list[dict]:
    """Extract text using pytesseract as fallback."""
    import pytesseract

    data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)

    items = []
    for i, text in enumerate(data["text"]):
        text = str(text).strip()
        conf = int(data["conf"][i])
        if conf < 30 or not text:
            continue

        x, y, w, h = data["left"][i], data["top"][i], data["width"][i], data["height"][i]
        items.append({
            "text": text,
            "confidence": round(conf / 100.0, 4),
            "bbox": [int(x), int(y), int(x + w), int(y + h)],
        })

    return items
