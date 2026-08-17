"""
VeriShot AI — FastAPI Application Entry Point

Startup sequence:
1. Initialize database
2. Load ML model (non-blocking if not available)
3. Initialize OCR engine (non-blocking if not available)
4. Register routes
5. Start server
"""
import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Make sure backend/ is in sys.path
sys.path.insert(0, str(Path(__file__).parent))

from config import settings
from api.routes import analyze, health, history
from services import ocr_service, ml_detector, history_service

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    logger.info("=" * 60)
    logger.info("  VeriShot AI — Backend Starting")
    logger.info("=" * 60)

    # Initialize history database
    try:
        history_service.init_db(settings.DB_PATH)
        logger.info("✓ Database initialized")
    except Exception as e:
        logger.error(f"✗ Database initialization failed: {e}")

    # Load ML model
    model_loaded = ml_detector.init_model(
        model_path=settings.ML_MODEL_PATH,
        device=settings.ML_DEVICE,
    )
    if model_loaded:
        logger.info("✓ ML model loaded")
    else:
        logger.warning(
            "⚠ ML model NOT loaded. Forensic-only mode active.\n"
            f"  To enable ML: Train model and place at {settings.ML_MODEL_PATH}"
        )

    # Initialize OCR
    ocr_ok = ocr_service.init_ocr(languages=settings.OCR_LANGUAGES)
    if ocr_ok:
        logger.info(f"✓ OCR initialized ({ocr_service.get_ocr_engine()})")
    else:
        logger.warning("⚠ OCR unavailable. Text analysis disabled.")

    logger.info("=" * 60)
    logger.info("  VeriShot AI ready")
    logger.info(f"  ML Model: {'✓ Loaded' if model_loaded else '✗ Not available'}")
    logger.info(f"  OCR: {'✓ ' + ocr_service.get_ocr_engine() if ocr_ok else '✗ Unavailable'}")
    logger.info("=" * 60)

    yield

    # Cleanup on shutdown
    logger.info("VeriShot AI shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Powered Screenshot Manipulation Detection & Digital Forensics",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(analyze.router, prefix="/api", tags=["Analysis"])
app.include_router(history.router, prefix="/api", tags=["History"])


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG,
        log_level="info",
    )
