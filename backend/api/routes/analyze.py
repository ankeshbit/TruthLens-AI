"""
VeriShot AI — Main Analysis Route

POST /api/analyze

Accepts a multipart/form-data image upload, runs the complete
forensic analysis pipeline, and returns structured results.

Pipeline:
1. Image validation & preprocessing
2. OCR text extraction
3. ELA analysis
4. Noise analysis
5. Metadata analysis
6. Layout/text consistency analysis
7. Screenshot type classification
8. ML manipulation detection (if model available)
9. Grad-CAM visualization (if model available)
10. Suspicious region detection
11. Evidence fusion → risk score
12. Report generation
13. History persistence
14. Response
"""
import logging
import uuid
import os
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException, status

from config import settings
from schemas.analysis import (
    AnalysisResponse, ForensicSignals, MetadataInfo,
    ModuleStatus, OCRItem, RiskLevel, ScreenshotType, SuspiciousRegion
)
from services import (
    preprocessing,
    ela_analysis,
    noise_analysis,
    metadata_analysis,
    ocr_service,
    layout_analysis,
    ml_detector,
    fusion_engine,
    region_detector,
    history_service,
)

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_screenshot(file: UploadFile = File(...)):
    """
    Main analysis endpoint. Accepts a screenshot image and returns
    a complete forensic risk assessment.
    """
    # ── 1. Read & validate file ──────────────────────────────────────────────
    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file uploaded."
        )

    if len(file_bytes) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {settings.MAX_FILE_SIZE_MB} MB."
        )

    # Validate MIME type
    content_type = file.content_type or ""
    if content_type and content_type not in settings.ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {content_type}. Allowed: {settings.ALLOWED_MIME_TYPES}"
        )

    safe_filename = file.filename or f"upload_{uuid.uuid4().hex}"

    try:
        preprocessing.validate_image(file_bytes, safe_filename, settings.MAX_FILE_SIZE_MB)
    except preprocessing.PreprocessingError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # ── 2. Load & preprocess ─────────────────────────────────────────────────
    try:
        img = preprocessing.load_image(file_bytes)
        img = preprocessing.resize_for_analysis(img, max_side=2048)
    except preprocessing.PreprocessingError as e:
        raise HTTPException(status_code=400, detail=str(e))

    warnings = []

    # ── 3. OCR ───────────────────────────────────────────────────────────────
    ocr_results_raw = []
    ocr_status = ModuleStatus.UNAVAILABLE
    try:
        if ocr_service.is_ocr_available():
            ocr_results_raw = ocr_service.extract_text(img)
            ocr_status = ModuleStatus.OK
            logger.info(f"OCR: {len(ocr_results_raw)} text regions found")
        else:
            warnings.append("OCR unavailable. Text analysis was skipped.")
    except Exception as e:
        logger.error(f"OCR failed: {e}")
        ocr_status = ModuleStatus.ERROR
        warnings.append(f"OCR error: {str(e)[:100]}")

    # ── 4. ELA ───────────────────────────────────────────────────────────────
    ela_arr = None
    ela_score = 0.0
    ela_status = ModuleStatus.OK
    ela_image_b64 = None
    try:
        ela_arr, ela_stats = ela_analysis.compute_ela(img, quality=90)
        ela_score = ela_stats["ela_score"]
        ela_image_b64 = preprocessing.numpy_to_base64(ela_arr)
        logger.info(f"ELA score: {ela_score:.3f}")
    except Exception as e:
        logger.error(f"ELA failed: {e}")
        ela_status = ModuleStatus.ERROR
        warnings.append(f"ELA error: {str(e)[:100]}")

    # ── 5. Noise analysis ────────────────────────────────────────────────────
    noise_score = 0.0
    noise_status = ModuleStatus.OK
    try:
        noise_score, noise_stats = noise_analysis.analyze_noise(img)
        logger.info(f"Noise score: {noise_score:.3f}")
    except Exception as e:
        logger.error(f"Noise analysis failed: {e}")
        noise_status = ModuleStatus.ERROR
        warnings.append(f"Noise analysis error: {str(e)[:100]}")

    # ── 6. Metadata ──────────────────────────────────────────────────────────
    metadata_dict, metadata_warnings = {}, []
    try:
        metadata_dict, metadata_warnings = metadata_analysis.analyze_metadata(
            file_bytes, safe_filename
        )
        if metadata_warnings:
            warnings.extend(metadata_warnings)
    except Exception as e:
        logger.error(f"Metadata analysis failed: {e}")
        metadata_dict = {"has_exif": False, "warnings": [str(e)]}

    # ── 7. Layout / text consistency ─────────────────────────────────────────
    text_score = 0.0
    layout_score = 0.0
    text_status = ModuleStatus.OK
    layout_status = ModuleStatus.OK
    screenshot_type_str = "unknown"
    try:
        text_score, text_stats = layout_analysis.analyze_text_consistency(img, ocr_results_raw)
        screenshot_type_str = layout_analysis.classify_screenshot_type(ocr_results_raw)
        layout_score = text_score * 0.6  # Layout derives from text analysis for now
        logger.info(f"Text score: {text_score:.3f}, Type: {screenshot_type_str}")
    except Exception as e:
        logger.error(f"Layout analysis failed: {e}")
        text_status = ModuleStatus.ERROR
        layout_status = ModuleStatus.ERROR
        warnings.append(f"Layout analysis error: {str(e)[:100]}")

    # ── 8. ML detection ──────────────────────────────────────────────────────
    ml_score = None
    ml_status = ModuleStatus.OK
    ml_available = ml_detector.is_model_available()
    try:
        if ml_available:
            ml_score, ml_meta = ml_detector.predict(img)
            logger.info(f"ML score: {ml_score:.3f}")
        else:
            ml_status = ModuleStatus.UNAVAILABLE
    except Exception as e:
        logger.error(f"ML inference failed: {e}")
        ml_status = ModuleStatus.ERROR
        ml_score = None
        warnings.append(f"ML inference error: {str(e)[:100]}")

    # ── 9. Grad-CAM ──────────────────────────────────────────────────────────
    gradcam_arr = None
    gradcam_b64 = None
    if ml_available and ml_score is not None:
        try:
            gradcam_arr = ml_detector.get_gradcam(img)
            if gradcam_arr is not None:
                gradcam_b64 = preprocessing.numpy_to_base64(gradcam_arr)
        except Exception as e:
            logger.warning(f"Grad-CAM failed: {e}")

    # ── 10. Suspicious regions ───────────────────────────────────────────────
    suspicious_regions_raw = []
    try:
        suspicious_regions_raw = region_detector.detect_suspicious_regions(
            img=img,
            ocr_results=ocr_results_raw,
            ela_array=ela_arr,
            ela_score=ela_score,
            gradcam_array=gradcam_arr,
            text_score=text_score,
        )
    except Exception as e:
        logger.error(f"Region detection failed: {e}")

    # ── 11. Annotated image ──────────────────────────────────────────────────
    annotated_b64 = None
    try:
        if suspicious_regions_raw:
            risk_level_str = "suspicious"  # Will be updated after fusion
            annotated = region_detector.draw_suspicious_regions(
                img, suspicious_regions_raw, risk_level_str
            )
            annotated_b64 = preprocessing.image_to_base64(annotated)
        else:
            annotated_b64 = preprocessing.image_to_base64(img)
    except Exception as e:
        logger.warning(f"Annotation failed: {e}")
        try:
            annotated_b64 = preprocessing.image_to_base64(img)
        except Exception:
            pass

    # ── 12. Evidence fusion ──────────────────────────────────────────────────
    risk_score, risk_level_str, breakdown = fusion_engine.compute_risk_score(
        ml_score=ml_score,
        ela_score=ela_score,
        noise_score=noise_score,
        text_score=text_score,
        layout_score=layout_score,
    )

    # ── 13. Update annotated image with correct risk level ──────────────────
    if suspicious_regions_raw:
        try:
            annotated = region_detector.draw_suspicious_regions(
                img, suspicious_regions_raw, risk_level_str
            )
            annotated_b64 = preprocessing.image_to_base64(annotated)
        except Exception:
            pass

    # ── 14. Explanation ──────────────────────────────────────────────────────
    explanation = fusion_engine.generate_explanation(
        risk_score=risk_score,
        risk_level=risk_level_str,
        ml_score=ml_score,
        ml_available=ml_available,
        ela_score=ela_score,
        noise_score=noise_score,
        text_score=text_score,
        layout_score=layout_score,
        metadata_warnings=metadata_warnings,
        suspicious_regions=suspicious_regions_raw,
        screenshot_type=screenshot_type_str,
    )

    # ── 15. Save to history ──────────────────────────────────────────────────
    try:
        history_service.save_analysis(
            db_path=settings.DB_PATH,
            filename=safe_filename,
            risk_score=risk_score,
            risk_level=risk_level_str,
            screenshot_type=screenshot_type_str,
            ml_score=ml_score,
            ela_score=ela_score,
            noise_score=noise_score,
            text_score=text_score,
            layout_score=layout_score,
        )
    except Exception as e:
        logger.warning(f"Failed to save history: {e}")

    # ── 16. Build response ───────────────────────────────────────────────────
    risk_level_enum = RiskLevel(risk_level_str)
    screenshot_type_enum = _map_screenshot_type(screenshot_type_str)

    forensic_signals = ForensicSignals(
        ela_score=round(ela_score, 4),
        ela_status=ela_status,
        noise_score=round(noise_score, 4),
        noise_status=noise_status,
        text_score=round(text_score, 4),
        text_status=text_status,
        layout_score=round(layout_score, 4),
        layout_status=layout_status,
    )

    ocr_items = [
        OCRItem(
            text=item["text"],
            confidence=item["confidence"],
            bbox=item["bbox"],
        )
        for item in ocr_results_raw
    ]

    suspicious_region_items = [
        SuspiciousRegion(
            label=r.get("label", "Unknown"),
            bbox=r["bbox"],
            confidence=r.get("confidence", 0.5),
            reason=r.get("reason", ""),
        )
        for r in suspicious_regions_raw
    ]

    metadata_info = MetadataInfo(
        has_exif=metadata_dict.get("has_exif", False),
        software=metadata_dict.get("software"),
        creation_date=metadata_dict.get("creation_date"),
        modification_date=metadata_dict.get("modification_date"),
        camera_make=metadata_dict.get("camera_make"),
        camera_model=metadata_dict.get("camera_model"),
        image_width=metadata_dict.get("image_width"),
        image_height=metadata_dict.get("image_height"),
        color_profile=metadata_dict.get("color_profile"),
        warnings=metadata_dict.get("warnings", []),
    )

    return AnalysisResponse(
        risk_score=risk_score,
        risk_level=risk_level_enum,
        screenshot_type=screenshot_type_enum,
        ml_score=round(ml_score, 4) if ml_score is not None else None,
        ml_status=ml_status,
        ml_available=ml_available,
        forensic_signals=forensic_signals,
        suspicious_regions=suspicious_region_items,
        ocr_results=ocr_items,
        metadata=metadata_info,
        ela_image_b64=ela_image_b64,
        gradcam_image_b64=gradcam_b64,
        annotated_image_b64=annotated_b64,
        explanation=explanation,
        warnings=warnings,
    )


def _map_screenshot_type(type_str: str) -> ScreenshotType:
    """Map string to ScreenshotType enum."""
    mapping = {
        "payment": ScreenshotType.PAYMENT,
        "bank_transaction": ScreenshotType.BANK_TRANSACTION,
        "invoice": ScreenshotType.INVOICE,
        "receipt": ScreenshotType.RECEIPT,
        "notification": ScreenshotType.NOTIFICATION,
        "ticket": ScreenshotType.TICKET,
        "generic_document": ScreenshotType.GENERIC_DOCUMENT,
        "unknown": ScreenshotType.UNKNOWN,
    }
    return mapping.get(type_str, ScreenshotType.UNKNOWN)
