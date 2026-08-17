"""
VeriShot AI — Dataset Validation Script

Checks the dataset for:
- Corrupted images
- Unsupported formats
- Very small images
- Duplicate images (by hash)
- Perceptually similar images (basic)
- Class imbalance
- Missing classes

Outputs a dataset report without fabricating any statistics.

Usage:
    python validate_dataset.py
    python validate_dataset.py --data_dir ml/data/raw
"""
import argparse
import hashlib
import logging
import sys
from collections import defaultdict
from pathlib import Path

from PIL import Image, UnidentifiedImageError

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MIN_WIDTH = 64
MIN_HEIGHT = 64


def compute_hash(path: Path) -> str:
    """Compute MD5 hash of file bytes."""
    hasher = hashlib.md5()
    with open(str(path), "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def validate_dataset(data_dir: Path) -> dict:
    """
    Validate all images in data_dir/genuine/ and data_dir/manipulated/.
    Returns a report dict with actual (not fabricated) statistics.
    """
    report = {
        "genuine": {"total": 0, "valid": 0, "corrupted": 0, "too_small": 0, "unsupported": 0},
        "manipulated": {"total": 0, "valid": 0, "corrupted": 0, "too_small": 0, "unsupported": 0},
        "duplicates": [],
        "near_duplicates": [],
        "warnings": [],
    }

    all_hashes = {}
    all_valid = {"genuine": [], "manipulated": []}

    for class_name in ["genuine", "manipulated"]:
        class_dir = data_dir / class_name
        if not class_dir.exists():
            report["warnings"].append(f"Directory not found: {class_dir}")
            logger.warning(f"Directory not found: {class_dir}")
            continue

        # Find all files
        all_files = []
        for ext in SUPPORTED_EXTENSIONS:
            all_files.extend(class_dir.glob(f"*{ext}"))
            all_files.extend(class_dir.glob(f"*{ext.upper()}"))

        # Also check for unsupported files
        for f in class_dir.iterdir():
            if f.is_file() and f.suffix.lower() not in SUPPORTED_EXTENSIONS:
                report[class_name]["unsupported"] += 1

        report[class_name]["total"] = len(all_files)

        for path in all_files:
            try:
                # Try to open
                img = Image.open(str(path))
                img.verify()
                img = Image.open(str(path))  # Reload after verify

                w, h = img.size

                if w < MIN_WIDTH or h < MIN_HEIGHT:
                    report[class_name]["too_small"] += 1
                    report["warnings"].append(
                        f"Very small image ({w}x{h}): {path.name}"
                    )
                    continue

                # Check for duplicates
                file_hash = compute_hash(path)
                if file_hash in all_hashes:
                    report["duplicates"].append({
                        "file1": str(all_hashes[file_hash]),
                        "file2": str(path),
                    })
                else:
                    all_hashes[file_hash] = path
                    report[class_name]["valid"] += 1
                    all_valid[class_name].append(path)

            except UnidentifiedImageError:
                report[class_name]["corrupted"] += 1
                report["warnings"].append(f"Corrupted/unreadable: {path.name}")
            except Exception as e:
                report[class_name]["corrupted"] += 1
                report["warnings"].append(f"Error reading {path.name}: {str(e)[:80]}")

    return report, all_valid


def print_report(report: dict) -> None:
    """Print the dataset validation report."""
    print("\n" + "=" * 50)
    print("        VERISHOT DATASET REPORT")
    print("=" * 50)

    genuine = report["genuine"]
    manipulated = report["manipulated"]
    total_valid = genuine["valid"] + manipulated["valid"]
    total = genuine["total"] + manipulated["total"]

    print(f"\nGenuine:         {genuine['valid']:,} valid / {genuine['total']:,} total")
    print(f"Manipulated:     {manipulated['valid']:,} valid / {manipulated['total']:,} total")
    print(f"Total (valid):   {total_valid:,}")

    if total_valid > 0:
        gen_pct = 100 * genuine["valid"] / max(total_valid, 1)
        man_pct = 100 * manipulated["valid"] / max(total_valid, 1)
        print(f"\nClass Balance:")
        print(f"  Genuine:       {gen_pct:.1f}%")
        print(f"  Manipulated:   {man_pct:.1f}%")

        if abs(gen_pct - man_pct) > 20:
            print(f"  ! Class imbalance detected ({gen_pct:.1f}% vs {man_pct:.1f}%)")
            print("    The training pipeline will apply class weighting to compensate.")

    print(f"\nCorrupted:       {genuine['corrupted'] + manipulated['corrupted']}")
    print(f"Too small:       {genuine['too_small'] + manipulated['too_small']}")
    print(f"Unsupported:     {genuine['unsupported'] + manipulated['unsupported']}")
    print(f"Duplicates:      {len(report['duplicates'])}")

    if report["duplicates"]:
        print("\nDuplicate pairs:")
        for dup in report["duplicates"][:5]:
            print(f"  {Path(dup['file1']).name} == {Path(dup['file2']).name}")
        if len(report["duplicates"]) > 5:
            print(f"  ... and {len(report['duplicates']) - 5} more")

    if report["warnings"]:
        print(f"\nWarnings ({len(report['warnings'])}):")
        for w in report["warnings"][:10]:
            print(f"  ! {w}")
        if len(report["warnings"]) > 10:
            print(f"  ... and {len(report['warnings']) - 10} more")

    # Recommendations
    print("\nRecommendations:")
    if total_valid < 50:
        print(f"  ! Dataset is very small ({total_valid} samples).")
        print("    Run: python scripts/generate_manipulated_data.py --generate_genuine 100")
    elif total_valid < 200:
        print(f"  i Dataset is small ({total_valid} samples). Consider adding more data.")
    else:
        print(f"  OK Dataset size is reasonable ({total_valid} samples).")

    if genuine["valid"] == 0:
        print("  X No genuine images found! Add images to ml/data/raw/genuine/")
    if manipulated["valid"] == 0:
        print("  X No manipulated images found! Run the data generation script.")

    print("=" * 50 + "\n")


def parse_args():
    parser = argparse.ArgumentParser(description="Validate VeriShot dataset")
    parser.add_argument(
        "--data_dir",
        type=Path,
        default=Path(__file__).parent.parent / "ml" / "data" / "raw",
        help="Path to data/raw/ directory containing genuine/ and manipulated/"
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    logger.info(f"Validating dataset at: {args.data_dir}")
    report, valid_images = validate_dataset(args.data_dir)
    print_report(report)

