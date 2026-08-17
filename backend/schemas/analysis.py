"""
TruthLens AI — Analysis Schemas
Pydantic models for request/response validation.
"""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional, Any
from enum import Enum


class RiskLevel(str, Enum):
    LIKELY_GENUINE = "likely_genuine"
    SUSPICIOUS = "suspicious"
    POTENTIALLY_MANIPULATED = "potentially_manipulated"


class ScreenshotType(str, Enum):
    PAYMENT = "payment"
    BANK_TRANSACTION = "bank_transaction"
    INVOICE = "invoice"
    RECEIPT = "receipt"
    NOTIFICATION = "notification"
    TICKET = "ticket"
    GENERIC_DOCUMENT = "generic_document"
    UNKNOWN = "unknown"


class ModuleStatus(str, Enum):
    OK = "ok"
    UNAVAILABLE = "unavailable"
    ERROR = "error"


class OCRItem(BaseModel):
    text: str
    confidence: float
    bbox: list[int] = Field(description="[x1, y1, x2, y2]")


class ForensicSignals(BaseModel):
    ela_score: float = Field(ge=0.0, le=1.0, description="ELA anomaly score (0=normal, 1=highly anomalous)")
    ela_status: ModuleStatus = ModuleStatus.OK
    noise_score: float = Field(ge=0.0, le=1.0, description="Noise anomaly score")
    noise_status: ModuleStatus = ModuleStatus.OK
    text_score: float = Field(ge=0.0, le=1.0, description="Text/OCR anomaly score")
    text_status: ModuleStatus = ModuleStatus.OK
    layout_score: float = Field(ge=0.0, le=1.0, description="Layout anomaly score")
    layout_status: ModuleStatus = ModuleStatus.OK


class SuspiciousRegion(BaseModel):
    label: str
    bbox: list[int] = Field(description="[x1, y1, x2, y2]")
    confidence: float = Field(ge=0.0, le=1.0)
    reason: str


class MetadataInfo(BaseModel):
    has_exif: bool
    software: Optional[str] = None
    creation_date: Optional[str] = None
    modification_date: Optional[str] = None
    camera_make: Optional[str] = None
    camera_model: Optional[str] = None
    image_width: Optional[int] = None
    image_height: Optional[int] = None
    color_profile: Optional[str] = None
    warnings: list[str] = []


class AnalysisResponse(BaseModel):
    # Core result
    risk_score: int = Field(ge=0, le=100, description="Overall risk score 0-100")
    risk_level: RiskLevel
    screenshot_type: ScreenshotType

    # ML module
    ml_score: Optional[float] = Field(None, ge=0.0, le=1.0, description="ML manipulation probability")
    ml_status: ModuleStatus = ModuleStatus.OK
    ml_available: bool = True

    # Forensic signals
    forensic_signals: ForensicSignals

    # Evidence
    suspicious_regions: list[SuspiciousRegion] = []
    ocr_results: list[OCRItem] = []
    metadata: MetadataInfo

    # Images (base64-encoded)
    ela_image_b64: Optional[str] = None
    gradcam_image_b64: Optional[str] = None
    annotated_image_b64: Optional[str] = None

    # Explanation
    explanation: list[str] = Field(description="Human-readable forensic findings")
    warnings: list[str] = []


class HistoryEntry(BaseModel):
    id: int
    timestamp: str
    filename: str
    risk_score: int
    risk_level: str
    screenshot_type: str
    ml_score: Optional[float] = None


class HealthResponse(BaseModel):
    status: str
    ml_model_loaded: bool
    ocr_available: bool
    version: str
