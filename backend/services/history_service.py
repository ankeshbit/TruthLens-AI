"""
VeriShot AI — History Service (SQLite)

Stores analysis results without storing the original screenshots.
Only metadata is retained: filename, score, classification, timestamp.
"""
import sqlite3
import logging
from pathlib import Path
from typing import Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def get_db_connection(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: Path) -> None:
    """Create the history table if it doesn't exist."""
    with get_db_connection(db_path) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS analysis_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                filename TEXT NOT NULL,
                risk_score INTEGER NOT NULL,
                risk_level TEXT NOT NULL,
                screenshot_type TEXT NOT NULL,
                ml_score REAL,
                ela_score REAL,
                noise_score REAL,
                text_score REAL,
                layout_score REAL
            )
        """)
        conn.commit()
    logger.info(f"History database initialized at {db_path}")


def save_analysis(
    db_path: Path,
    filename: str,
    risk_score: int,
    risk_level: str,
    screenshot_type: str,
    ml_score: Optional[float] = None,
    ela_score: Optional[float] = None,
    noise_score: Optional[float] = None,
    text_score: Optional[float] = None,
    layout_score: Optional[float] = None,
    max_entries: int = 100,
) -> int:
    """Save an analysis result. Returns the new entry ID."""
    timestamp = datetime.now(timezone.utc).isoformat()

    with get_db_connection(db_path) as conn:
        cursor = conn.execute("""
            INSERT INTO analysis_history
            (timestamp, filename, risk_score, risk_level, screenshot_type,
             ml_score, ela_score, noise_score, text_score, layout_score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (timestamp, filename, risk_score, risk_level, screenshot_type,
              ml_score, ela_score, noise_score, text_score, layout_score))
        new_id = cursor.lastrowid

        # Enforce max entries
        conn.execute("""
            DELETE FROM analysis_history
            WHERE id NOT IN (
                SELECT id FROM analysis_history
                ORDER BY id DESC
                LIMIT ?
            )
        """, (max_entries,))

        conn.commit()

    logger.debug(f"Saved analysis #{new_id} for {filename}")
    return new_id


def get_history(db_path: Path, limit: int = 50) -> list[dict]:
    """Retrieve recent analysis history."""
    try:
        with get_db_connection(db_path) as conn:
            rows = conn.execute("""
                SELECT id, timestamp, filename, risk_score, risk_level,
                       screenshot_type, ml_score
                FROM analysis_history
                ORDER BY id DESC
                LIMIT ?
            """, (limit,)).fetchall()
        return [dict(row) for row in rows]
    except Exception as e:
        logger.error(f"Failed to retrieve history: {e}")
        return []


def delete_history(db_path: Path) -> None:
    """Clear all history entries."""
    with get_db_connection(db_path) as conn:
        conn.execute("DELETE FROM analysis_history")
        conn.commit()
    logger.info("History cleared")
