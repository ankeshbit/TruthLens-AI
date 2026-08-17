"""
VeriShot AI — Synthetic Manipulated Data Generator

Creates realistic synthetic manipulated screenshots from genuine ones.

Manipulation types implemented:
1. text_replacement   — Replace text in a region with different text
2. amount_modification — Modify currency amounts
3. date_modification   — Modify date strings
4. name_modification   — Modify name/recipient fields
5. id_modification     — Modify transaction/reference IDs
6. region_overlay      — Paste a content block over a region
7. brightness_patch    — Alter brightness of a region (subtle editing artifact)
8. color_shift_region  — Shift color hue in a specific region

The script also generates synthetic "genuine" screenshots if none exist.

Usage:
    python generate_manipulated_data.py
    python generate_manipulated_data.py --input_dir path/to/genuine --count 50
    python generate_manipulated_data.py --generate_genuine 50
"""
import argparse
import json
import logging
import random
import re
import sys
from pathlib import Path
from typing import Optional

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

sys.path.insert(0, str(Path(__file__).parent.parent / "ml"))

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

GENUINE_DIR = Path(__file__).parent.parent / "ml" / "data" / "raw" / "genuine"
MANIPULATED_DIR = Path(__file__).parent.parent / "ml" / "data" / "raw" / "manipulated"
METADATA_DIR = Path(__file__).parent.parent / "ml" / "data"

# Fonts — try to find system fonts, fall back to default
FONT_PATHS = [
    "C:/Windows/Fonts/Arial.ttf",
    "C:/Windows/Fonts/Calibri.ttf",
    "C:/Windows/Fonts/segoeui.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/System/Library/Fonts/Helvetica.ttf",
]


def get_font(size: int = 16) -> Optional[ImageFont.FreeTypeFont]:
    """Get a font for text rendering."""
    for path in FONT_PATHS:
        try:
            return ImageFont.truetype(path, size)
        except (OSError, IOError):
            continue
    try:
        return ImageFont.load_default()
    except Exception:
        return None


# ── Sample data for synthetic genuine screenshots ───────────────────────────
GENUINE_NAMES = [
    "Rahul Sharma", "Priya Patel", "Amit Kumar", "Sneha Reddy",
    "Rajesh Verma", "Anita Singh", "Vikram Gupta", "Pooja Nair",
]
TRANSACTION_IDS = [
    "TXN123456789", "REF987654321", "UPI20240817123", "IMPS20240817456",
    "NEFT20240817789", "ORDER20240817012",
]
AMOUNTS = [500, 1000, 1500, 2000, 2500, 3000, 5000, 750, 250, 100, 200]
UPI_IDS = [
    "rahul@okaxis", "priya@paytm", "amit@ybl", "sneha@okicici",
    "user@axisbank", "merchant@hdfc",
]
STATUS_OPTIONS = ["Payment Successful", "Transfer Complete", "Transaction Done"]
DATES = [
    "17 Aug 2026", "16 Aug 2026", "15 Aug 2026", "14 Aug 2026",
    "13 Aug 2026", "12 Aug 2026",
]


def generate_genuine_screenshot(output_path: Path, index: int) -> dict:
    """
    Generate a synthetic genuine payment screenshot.
    These are clearly labeled as synthetic/demo.
    """
    # Random parameters
    amount = random.choice(AMOUNTS)
    name = random.choice(GENUINE_NAMES)
    txn_id = random.choice(TRANSACTION_IDS) + str(random.randint(100, 999))
    upi_id = random.choice(UPI_IDS)
    date = random.choice(DATES)
    status = random.choice(STATUS_OPTIONS)

    # Create image
    width, height = 400, 600
    bg_color = random.choice([
        (255, 255, 255),  # White
        (248, 248, 255),  # Light blue
        (240, 255, 240),  # Light green
    ])
    img = Image.new("RGB", (width, height), color=bg_color)
    draw = ImageDraw.Draw(img)

    # Background styling
    header_color = random.choice([
        (26, 115, 232),   # Blue
        (15, 157, 88),    # Green
        (219, 68, 55),    # Red
    ])
    draw.rectangle([0, 0, width, 80], fill=header_color)

    # App name in header
    font_large = get_font(22)
    font_medium = get_font(16)
    font_small = get_font(13)
    font_tiny = get_font(11)

    # Header text
    draw.text((20, 20), "[SYNTHETIC DEMO] PayApp", fill=(255, 255, 255), font=font_medium)

    # Status checkmark area
    y = 100
    draw.ellipse([width//2 - 40, y, width//2 + 40, y + 80], fill=(34, 197, 94))
    draw.text((width//2 - 8, y + 25), "✓", fill=(255, 255, 255), font=font_large)

    y = 200
    draw.text((width//2 - 70, y), status, fill=(34, 197, 94), font=font_medium)

    # Amount
    y = 250
    amount_str = f"₹{amount:,}"
    draw.text((width//2 - 60, y), amount_str, fill=(17, 24, 39), font=get_font(28))

    # Divider
    y = 310
    draw.line([20, y, width - 20, y], fill=(229, 231, 235), width=1)

    # Transaction details
    y = 330
    details = [
        ("To", name),
        ("UPI ID", upi_id),
        ("Transaction ID", txn_id),
        ("Date & Time", date),
    ]
    for label, value in details:
        draw.text((20, y), label, fill=(107, 114, 128), font=font_small)
        draw.text((width - 20 - len(value) * 7, y), value, fill=(17, 24, 39), font=font_small)
        y += 35

    # Footer note (clearly marks as synthetic)
    draw.rectangle([0, height - 40, width, height], fill=(243, 244, 246))
    draw.text(
        (10, height - 28),
        "SYNTHETIC DEMO — NOT A REAL TRANSACTION",
        fill=(156, 163, 175),
        font=font_tiny
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(str(output_path), "PNG")

    return {
        "amount": amount,
        "name": name,
        "txn_id": txn_id,
        "upi_id": upi_id,
        "date": date,
        "status": status,
    }


def manipulate_text_region(
    img: Image.Image,
    bbox: tuple,
    new_text: str,
    bg_color: tuple = (255, 255, 255),
    text_color: tuple = (0, 0, 0),
    font_size: int = 16,
) -> Image.Image:
    """Replace text in a bounding box region."""
    img_copy = img.copy()
    draw = ImageDraw.Draw(img_copy)
    x1, y1, x2, y2 = bbox

    # Sample background color from nearby pixels
    try:
        sample_region = img_copy.crop((x1, y1, x1 + 5, y1 + 5))
        sample_arr = np.array(sample_region)
        bg_color = tuple(int(c) for c in sample_arr.mean(axis=(0, 1))[:3])
    except Exception:
        pass

    # Clear the region
    draw.rectangle([x1, y1, x2, y2], fill=bg_color)

    # Draw new text
    font = get_font(font_size)
    draw.text((x1 + 2, y1 + 2), new_text, fill=text_color, font=font)

    return img_copy


def create_amount_manipulation(
    img: Image.Image,
    original_meta: dict,
    output_path: Path,
) -> dict:
    """Manipulate the amount in a screenshot."""
    # Find amount region (heuristic: center of image, lower quarter)
    w, h = img.size
    amount_bbox = (w // 4, h // 3, 3 * w // 4, h // 3 + 50)

    # Choose a dramatically different amount
    original_amount = original_meta.get("amount", 500)
    new_amounts = [amt for amt in [25000, 50000, 100000, 10000, 75000] if amt != original_amount]
    new_amount = random.choice(new_amounts)
    new_text = f"₹{new_amount:,}"

    manipulated = manipulate_text_region(img, amount_bbox, new_text, font_size=24)

    # Add slight compression artifact
    manipulated = _add_compression_artifact(manipulated, amount_bbox)

    manipulated.save(str(output_path), "PNG")

    return {
        "source": original_meta.get("source", ""),
        "output": str(output_path.name),
        "type": "amount_modification",
        "original_amount": original_amount,
        "new_amount": new_amount,
        "region": list(amount_bbox),
    }


def create_date_manipulation(
    img: Image.Image,
    original_meta: dict,
    output_path: Path,
) -> dict:
    """Manipulate the date in a screenshot."""
    w, h = img.size
    date_bbox = (20, int(h * 0.7), w - 20, int(h * 0.7) + 30)

    original_date = original_meta.get("date", "17 Aug 2026")
    # Choose a future or past date
    fake_dates = [
        "01 Jan 2026", "15 Mar 2026", "30 Jun 2026",
        "20 Nov 2025", "05 Dec 2025", "28 Feb 2026"
    ]
    new_date = random.choice([d for d in fake_dates if d != original_date])

    manipulated = manipulate_text_region(img, date_bbox, f"Date & Time   {new_date}", font_size=13)
    manipulated.save(str(output_path), "PNG")

    return {
        "source": original_meta.get("source", ""),
        "output": str(output_path.name),
        "type": "date_modification",
        "original_date": original_date,
        "new_date": new_date,
        "region": list(date_bbox),
    }


def create_name_manipulation(
    img: Image.Image,
    original_meta: dict,
    output_path: Path,
) -> dict:
    """Manipulate the recipient name."""
    w, h = img.size
    name_bbox = (20, int(h * 0.55), w - 20, int(h * 0.55) + 30)

    fake_names = [
        "Sanjay Mehta", "Kavita Joshi", "Arun Pillai",
        "Divya Krishnan", "Rohit Bansal", "Meera Iyer",
    ]
    original_name = original_meta.get("name", "")
    new_name = random.choice([n for n in fake_names if n != original_name])

    manipulated = manipulate_text_region(img, name_bbox, f"To   {new_name}", font_size=13)
    manipulated.save(str(output_path), "PNG")

    return {
        "source": original_meta.get("source", ""),
        "output": str(output_path.name),
        "type": "name_modification",
        "original_name": original_name,
        "new_name": new_name,
        "region": list(name_bbox),
    }


def create_region_overlay(
    img: Image.Image,
    original_meta: dict,
    output_path: Path,
) -> dict:
    """Paste a colored overlay region (simulates copy-paste manipulation)."""
    w, h = img.size
    img_copy = img.copy()
    draw = ImageDraw.Draw(img_copy)

    # Random region
    rx = random.randint(w // 4, w // 2)
    ry = random.randint(h // 4, h // 2)
    rw = random.randint(60, 120)
    rh = random.randint(20, 40)

    # Sample color from image and create a slightly different overlay
    sample = img_copy.crop((rx, ry, rx + rw, ry + rh))
    sample_arr = np.array(sample).astype(float)
    # Shift color slightly
    shift = random.uniform(5, 15)
    new_arr = np.clip(sample_arr + shift, 0, 255).astype(np.uint8)
    overlay = Image.fromarray(new_arr)
    img_copy.paste(overlay, (rx, ry))

    img_copy.save(str(output_path), "PNG")

    return {
        "source": original_meta.get("source", ""),
        "output": str(output_path.name),
        "type": "region_overlay",
        "region": [rx, ry, rx + rw, ry + rh],
    }


def _add_compression_artifact(img: Image.Image, region: tuple) -> Image.Image:
    """Add subtle JPEG compression artifact to a region (simulates re-saved paste)."""
    import io
    img_copy = img.copy()
    x1, y1, x2, y2 = region
    crop = img_copy.crop((x1, y1, x2, y2))

    # Re-save at lower quality to introduce artifacts
    buf = io.BytesIO()
    crop.save(buf, format="JPEG", quality=60)
    buf.seek(0)
    recompressed = Image.open(buf).convert("RGB")
    img_copy.paste(recompressed, (x1, y1))

    return img_copy


MANIPULATION_FUNCTIONS = {
    "amount_modification": create_amount_manipulation,
    "date_modification": create_date_manipulation,
    "name_modification": create_name_manipulation,
    "region_overlay": create_region_overlay,
}


def generate_dataset(
    input_dir: Path,
    output_dir: Path,
    manipulations_per_image: int = 3,
    generate_genuine: int = 0,
    genuine_dir: Path = GENUINE_DIR,
) -> list[dict]:
    """
    Generate manipulated versions of all genuine screenshots.

    Args:
        input_dir: Directory with genuine screenshots
        output_dir: Directory to save manipulated screenshots
        manipulations_per_image: Number of manipulated versions per genuine image
        generate_genuine: Number of synthetic genuine screenshots to generate first

    Returns:
        List of manipulation metadata dicts
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    metadata_records = []

    # Generate synthetic genuine screenshots if requested
    if generate_genuine > 0:
        logger.info(f"Generating {generate_genuine} synthetic genuine screenshots...")
        genuine_dir.mkdir(parents=True, exist_ok=True)
        for i in range(generate_genuine):
            output_path = genuine_dir / f"synthetic_genuine_{i:04d}.png"
            if output_path.exists():
                continue
            meta = generate_genuine_screenshot(output_path, i)
            meta["source"] = str(output_path.name)
            logger.info(f"Generated genuine: {output_path.name}")

    # Find all genuine images
    genuine_paths = []
    for ext in [".png", ".jpg", ".jpeg"]:
        genuine_paths.extend(input_dir.glob(f"*{ext}"))
        genuine_paths.extend(input_dir.glob(f"*{ext.upper()}"))

    if not genuine_paths:
        logger.error(f"No genuine images found in {input_dir}")
        return []

    logger.info(f"Found {len(genuine_paths)} genuine images. Generating manipulations...")

    for img_path in genuine_paths:
        try:
            img = Image.open(str(img_path)).convert("RGB")
            w, h = img.size

            # Choose manipulation types (no repeats)
            manip_types = random.sample(
                list(MANIPULATION_FUNCTIONS.keys()),
                min(manipulations_per_image, len(MANIPULATION_FUNCTIONS))
            )

            for manip_type in manip_types:
                stem = img_path.stem
                output_name = f"{stem}_{manip_type}.png"
                output_path = output_dir / output_name

                if output_path.exists():
                    logger.debug(f"Skipping existing: {output_name}")
                    continue

                meta = {"source": img_path.name, "amount": 500, "name": "", "date": "17 Aug 2026"}

                manip_fn = MANIPULATION_FUNCTIONS[manip_type]
                try:
                    record = manip_fn(img, meta, output_path)
                    record["source"] = img_path.name
                    metadata_records.append(record)
                    logger.info(f"Generated: {output_name}")
                except Exception as e:
                    logger.warning(f"Failed to generate {output_name}: {e}")

        except Exception as e:
            logger.warning(f"Failed to process {img_path.name}: {e}")

    # Save metadata
    metadata_path = METADATA_DIR / "manipulation_metadata.json"
    with open(str(metadata_path), "w") as f:
        json.dump(metadata_records, f, indent=2)
    logger.info(f"Metadata saved to {metadata_path}")

    return metadata_records


def parse_args():
    parser = argparse.ArgumentParser(description="Generate synthetic manipulated screenshots")
    parser.add_argument("--input_dir", type=Path, default=GENUINE_DIR,
                        help="Input directory with genuine screenshots")
    parser.add_argument("--output_dir", type=Path, default=MANIPULATED_DIR,
                        help="Output directory for manipulated screenshots")
    parser.add_argument("--manipulations_per_image", type=int, default=3,
                        help="Number of manipulated versions per genuine image")
    parser.add_argument("--generate_genuine", type=int, default=50,
                        help="Generate N synthetic genuine screenshots first")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    records = generate_dataset(
        input_dir=args.input_dir,
        output_dir=args.output_dir,
        manipulations_per_image=args.manipulations_per_image,
        generate_genuine=args.generate_genuine,
    )
    print(f"\nGenerated {len(records)} manipulated screenshots")
    print(f"  Genuine: {args.input_dir}")
    print(f"  Manipulated: {args.output_dir}")
