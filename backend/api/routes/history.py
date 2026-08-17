"""
TruthLens AI — History Route
"""
from fastapi import APIRouter, Request
from schemas.analysis import HistoryEntry
from services import history_service
from config import settings

router = APIRouter()


@router.get("/history", response_model=list[HistoryEntry])
async def get_history():
    """Return recent analysis history (no screenshots stored)."""
    entries = history_service.get_history(settings.DB_PATH)
    return [HistoryEntry(**entry) for entry in entries]


@router.delete("/history")
async def clear_history():
    """Clear all stored history."""
    history_service.init_db(settings.DB_PATH)  # Ensure table exists
    history_service.delete_history(settings.DB_PATH)
    return {"status": "cleared"}
