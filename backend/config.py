"""
TruthLens AI — Backend Configuration
All settings are configurable via environment variables.
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings


BASE_DIR = Path(__file__).parent


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "TruthLens AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]

    # File limits
    MAX_FILE_SIZE_MB: int = 20
    ALLOWED_MIME_TYPES: list[str] = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
    ALLOWED_EXTENSIONS: list[str] = [".jpg", ".jpeg", ".png", ".webp"]

    # Paths
    MODELS_DIR: Path = BASE_DIR / "models"
    TEMP_DIR: Path = BASE_DIR / "temp"
    DB_PATH: Path = BASE_DIR / "history.db"
    ML_MODEL_PATH: Path = BASE_DIR / "models" / "trained_model.pth"

    # ML
    ML_IMAGE_SIZE: int = 224
    ML_MODEL_ARCH: str = "efficientnet_b0"
    ML_THRESHOLD: float = 0.45  # Optimized during training; see ml/threshold.py
    ML_DEVICE: str = "auto"  # "auto", "cpu", "cuda"

    # Forensic module weights (must sum to 1.0)
    WEIGHT_ML: float = 0.40
    WEIGHT_ELA: float = 0.20
    WEIGHT_TEXT: float = 0.15
    WEIGHT_NOISE: float = 0.10
    WEIGHT_LAYOUT: float = 0.15

    # Risk thresholds
    RISK_LOW_MAX: int = 30    # 0-30 = Likely Genuine
    RISK_MED_MAX: int = 60    # 31-60 = Suspicious
    # 61-100 = Potentially Manipulated

    # History
    MAX_HISTORY_ENTRIES: int = 100

    # OCR
    OCR_LANGUAGES: list[str] = ["en"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

# Ensure directories exist
settings.MODELS_DIR.mkdir(parents=True, exist_ok=True)
settings.TEMP_DIR.mkdir(parents=True, exist_ok=True)
