"""
VeriShot AI — Health Check Route
"""
from fastapi import APIRouter
from schemas.analysis import HealthResponse
from services import ocr_service, ml_detector

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="ok",
        ml_model_loaded=ml_detector.is_model_available(),
        ocr_available=ocr_service.is_ocr_available(),
        version="1.0.0",
    )
