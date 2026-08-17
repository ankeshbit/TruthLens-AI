"""
VeriShot AI — Metadata Analysis Service

Extracts and analyzes image metadata (EXIF and file properties).

IMPORTANT CAVEAT:
Screenshots commonly have little or no EXIF data. The absence of EXIF
is NOT evidence of manipulation for screenshots. This module only flags
anomalies that are genuinely suspicious when present (e.g., editing
software signatures in metadata of an allegedly original screenshot).
"""
import io
import logging
from typing import Optional
from PIL import Image
from PIL.ExifTags import TAGS

logger = logging.getLogger(__name__)

# Known editing software signatures that suggest post-processing
EDITING_SOFTWARE_KEYWORDS = [
    "photoshop", "gimp", "paint.net", "affinity", "lightroom",
    "snapseed", "pixelmator", "corel", "inkscape", "acdsee",
    "photoscape", "fotor", "canva", "picsart", "befunky",
]


def analyze_metadata(file_bytes: bytes, filename: str) -> tuple[dict, list[str]]:
    """
    Extract and analyze image metadata.

    Returns:
        metadata (dict): Extracted metadata fields
        warnings (list[str]): Forensic observations about metadata
    """
    metadata = {
        "has_exif": False,
        "software": None,
        "creation_date": None,
        "modification_date": None,
        "camera_make": None,
        "camera_model": None,
        "image_width": None,
        "image_height": None,
        "color_profile": None,
        "warnings": [],
    }
    warnings = []

    try:
        img = Image.open(io.BytesIO(file_bytes))
        metadata["image_width"] = img.width
        metadata["image_height"] = img.height
        metadata["color_profile"] = img.mode

        # Try EXIF
        exif_data = _extract_exif(img)
        if exif_data:
            metadata["has_exif"] = True
            metadata.update(exif_data)
            warnings.extend(_analyze_exif_anomalies(exif_data))
        else:
            metadata["has_exif"] = False
            # NOTE: No warning for missing EXIF — screenshots normally have none

        # Check filename for anomalies
        fname_warnings = _check_filename(filename)
        warnings.extend(fname_warnings)

        metadata["warnings"] = warnings
        return metadata, warnings

    except Exception as e:
        logger.error(f"Metadata extraction failed: {e}")
        metadata["warnings"] = [f"Metadata extraction error: {str(e)}"]
        return metadata, metadata["warnings"]


def _extract_exif(img: Image.Image) -> Optional[dict]:
    """Extract EXIF data from PIL image."""
    try:
        exif_raw = img._getexif()  # type: ignore
        if not exif_raw:
            return None

        decoded = {}
        for tag_id, value in exif_raw.items():
            tag_name = TAGS.get(tag_id, str(tag_id))
            # Skip binary/large data
            if isinstance(value, bytes) and len(value) > 256:
                continue
            try:
                decoded[tag_name] = str(value)[:500]  # Limit length
            except Exception:
                pass

        result = {}

        # Software
        if "Software" in decoded:
            result["software"] = decoded["Software"]

        # Dates
        for date_field in ["DateTime", "DateTimeOriginal", "DateTimeDigitized"]:
            if date_field in decoded:
                result["creation_date"] = decoded[date_field]
                break
        if "DateTime" in decoded:
            result["modification_date"] = decoded["DateTime"]

        # Camera info
        result["camera_make"] = decoded.get("Make")
        result["camera_model"] = decoded.get("Model")

        return result if result else None

    except Exception as e:
        logger.debug(f"EXIF extraction error: {e}")
        return None


def _analyze_exif_anomalies(exif: dict) -> list[str]:
    """
    Identify EXIF anomalies that may suggest editing.
    Only report genuinely suspicious findings.
    """
    observations = []

    # Check software field
    software = exif.get("software", "")
    if software:
        software_lower = software.lower()
        for keyword in EDITING_SOFTWARE_KEYWORDS:
            if keyword in software_lower:
                observations.append(
                    f"Editing software detected in metadata: '{software}'"
                )
                break

    # Check for date inconsistencies
    creation = exif.get("creation_date")
    modification = exif.get("modification_date")
    if creation and modification and creation != modification:
        observations.append(
            "Image creation and modification timestamps differ, suggesting post-processing."
        )

    return observations


def _check_filename(filename: str) -> list[str]:
    """Check filename for common manipulation indicators."""
    observations = []
    lower = filename.lower()

    suspicious_terms = ["edited", "modified", "fake", "photoshop", "ps_", "_ps",
                        "manipulated", "altered"]
    for term in suspicious_terms:
        if term in lower:
            observations.append(f"Filename contains potentially suspicious term: '{term}'")

    return observations
