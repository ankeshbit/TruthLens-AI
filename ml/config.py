"""
VeriShot AI — ML Pipeline Configuration

All hyperparameters are defined here for easy tuning.
"""
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────
ML_ROOT = Path(__file__).parent
DATA_DIR = ML_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
GENUINE_DIR = RAW_DIR / "genuine"
MANIPULATED_DIR = RAW_DIR / "manipulated"
PROCESSED_DIR = DATA_DIR / "processed"
CHECKPOINTS_DIR = ML_ROOT / "checkpoints"
RESULTS_DIR = ML_ROOT / "results"

# Where backend model goes
BACKEND_MODEL_PATH = ML_ROOT.parent / "backend" / "models" / "trained_model.pth"

# ── Image ──────────────────────────────────────────────────────────────────
IMAGE_SIZE = 224
CHANNELS = 3

# ImageNet normalization (used for pretrained models)
NORMALIZE_MEAN = [0.485, 0.456, 0.406]
NORMALIZE_STD = [0.229, 0.224, 0.225]

# ── Model ──────────────────────────────────────────────────────────────────
MODEL_ARCH = "efficientnet_b0"  # "efficientnet_b0" or "resnet50"
DROPOUT_RATE = 0.3

# ── Training ───────────────────────────────────────────────────────────────
SEED = 42

# Stage 1: Train classifier head only (backbone frozen)
STAGE1_EPOCHS = 5
STAGE1_LR = 1e-3
STAGE1_WEIGHT_DECAY = 1e-4

# Stage 2: Fine-tune upper layers
STAGE2_EPOCHS = 15
STAGE2_LR = 1e-5
STAGE2_WEIGHT_DECAY = 1e-5

# CPU-optimized defaults (lower batch size to avoid memory pressure)
BATCH_SIZE = 16  # Reduce further if OOM
NUM_WORKERS = 0  # Set to 0 on Windows to avoid multiprocessing issues

# Early stopping
PATIENCE = 5  # Stop if val_f1 doesn't improve for PATIENCE epochs

# Dataset splits (used when creating from raw/)
TRAIN_SPLIT = 0.70
VAL_SPLIT = 0.15
TEST_SPLIT = 0.15

# ── Threshold optimization ─────────────────────────────────────────────────
THRESHOLDS_TO_EVALUATE = [0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70]
# The threshold is selected to maximize F1 on the validation set
# and then frozen before test evaluation.
DEFAULT_THRESHOLD = 0.45  # Fallback if not optimized

# ── Augmentation ───────────────────────────────────────────────────────────
# Conservative augmentation — avoid destroying forensic information
# No: aggressive rotation, perspective, color jitter (these hide manipulation artifacts)
# Yes: mild horizontal flip, mild brightness/contrast
USE_HORIZONTAL_FLIP = True
BRIGHTNESS_FACTOR = 0.1
CONTRAST_FACTOR = 0.1

# ── Classes ────────────────────────────────────────────────────────────────
CLASS_NAMES = ["genuine", "manipulated"]
GENUINE_LABEL = 0
MANIPULATED_LABEL = 1
