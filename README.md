# VeriShot AI 🔍

**AI-Powered Screenshot Manipulation Detection & Digital Forensics**

VeriShot AI is a hackathon-ready forensic analysis platform that helps identify whether screenshots — payment confirmations, bank transactions, invoices, receipts — are **potentially genuine or manipulated**, using independent computer vision and machine learning signals.

> ⚠️ **Important**: VeriShot AI provides a *forensic risk assessment*, not definitive proof of authenticity or fraud. Always use multiple factors when evaluating document authenticity.

---

## 🎯 Features

- **Multi-Signal Forensic Analysis** — ELA, noise analysis, OCR consistency, layout analysis
- **ML Manipulation Detection** — EfficientNet-B0 trained on genuine vs manipulated screenshots
- **Grad-CAM Visualization** — See where the model focuses its attention
- **Suspicious Region Detection** — Bounding box overlay on flagged areas
- **OCR Text Extraction** — Extracts and displays all detected text with confidence
- **Screenshot Type Classification** — Identifies payment, invoice, bank transaction, etc.
- **Risk Score 0–100** — Evidence-fused risk assessment across all signals
- **Analysis History** — Local SQLite database (no screenshots stored)
- **Beautiful Dashboard** — Dark-mode forensic UI with glassmorphism design

---

## 🏗️ Architecture

```
User Upload
    ↓
Image Validation & Preprocessing
    ↓
┌─────────┬──────────┬──────────┬──────────┬──────────┐
│   OCR   │   ELA    │  Noise   │ Metadata │  Layout  │
└────┬────┴────┬─────┴────┬─────┴────┬─────┴────┬─────┘
     │         │          │          │          │
     └─────────┴──────────┼──────────┴──────────┘
                          ↓
               ML Manipulation Model
                          ↓
               Evidence Fusion Engine
                          ↓
                   Risk Score 0–100
                          ↓
              Suspicious Region Detection
                          ↓
                 Forensic Report + UI
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + TypeScript + Tailwind CSS + Framer Motion |
| Backend | FastAPI + Uvicorn + Pydantic |
| ML | PyTorch + EfficientNet-B0 + torchvision |
| OCR | EasyOCR |
| Computer Vision | OpenCV + Pillow + NumPy |
| Storage | SQLite (history only) |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- 4GB+ RAM (EasyOCR loads English model on first run)

### 1. Clone and set up
```bash
cd verishot-ai/
```

### 2. Install Backend Dependencies
```bash
pip install -r backend/requirements.txt
```

### 3. Install Frontend Dependencies
```bash
cd frontend/
npm install
cd ..
```

### 4. Start the Backend
```bash
cd backend/
python main.py
```

Backend will start at: `http://localhost:8000`
API docs: `http://localhost:8000/docs`

### 5. Start the Frontend
```bash
cd frontend/
npm run dev
```

Frontend will start at: `http://localhost:5173`

---

## 🧬 Dataset & Model Training

### Step 1: Generate Synthetic Demo Data
```bash
# Generate 60 synthetic genuine + 180 manipulated screenshots
python scripts/generate_manipulated_data.py --generate_genuine 60

# Validate the dataset
python scripts/validate_dataset.py
```

### Step 2: Add Your Own Genuine Screenshots
Place genuine screenshots in:
```
ml/data/raw/genuine/
```

Then generate manipulated versions:
```bash
python scripts/generate_manipulated_data.py \
  --input_dir ml/data/raw/genuine \
  --output_dir ml/data/raw/manipulated \
  --manipulations_per_image 3
```

### Step 3: Train the Model
```bash
cd ml/
python train.py
# CPU training with default settings
# Add --batch_size 8 if memory is limited
```

Training output:
```
Epoch 1/5
  Train Loss: 0.6821  Train Acc: 0.5234
  Val Loss:   0.6543  Val Acc: 0.6123
  Precision:  0.5890  Recall: 0.6234  F1: 0.6058
```

### Step 4: Evaluate
```bash
cd ml/
python evaluate.py
```

The trained model is automatically saved to:
```
backend/models/trained_model.pth
```

---

## 📊 Forensic Modules

| Module | What it Detects | Weight |
|--------|----------------|--------|
| ML Detection | Image manipulation patterns | 40% |
| ELA Analysis | JPEG compression inconsistencies | 20% |
| Text Analysis | OCR region anomalies | 15% |
| Noise Analysis | Spatial noise inconsistencies | 10% |
| Layout Analysis | Structural anomalies | 15% |

> **Note**: Weights are initial heuristics, not scientifically validated values. They can be calibrated using a held-out labeled dataset.

---

## 🔌 API Documentation

### POST /api/analyze
Analyze a screenshot for manipulation.

**Request**: `multipart/form-data` with `file` field

**Response**:
```json
{
  "risk_score": 87,
  "risk_level": "potentially_manipulated",
  "screenshot_type": "payment",
  "ml_score": 0.91,
  "ml_available": true,
  "forensic_signals": {
    "ela_score": 0.78,
    "noise_score": 0.62,
    "text_score": 0.84,
    "layout_score": 0.71
  },
  "suspicious_regions": [...],
  "ocr_results": [...],
  "metadata": {...},
  "explanation": [...],
  "ela_image_b64": "...",
  "gradcam_image_b64": "...",
  "annotated_image_b64": "..."
}
```

### GET /api/health
```json
{
  "status": "ok",
  "ml_model_loaded": false,
  "ocr_available": true,
  "version": "1.0.0"
}
```

### GET /api/history
Returns list of recent analyses (no screenshots).

### DELETE /api/history
Clears all history.

---

## ⚙️ Configuration

Copy `.env.example` to `.env` and customize:
```bash
cp .env.example .env
```

Key settings in `backend/config.py`:
```python
MAX_FILE_SIZE_MB = 20
ML_THRESHOLD = 0.45     # Optimized during training
WEIGHT_ML = 0.40        # Fusion engine weights
WEIGHT_ELA = 0.20
WEIGHT_TEXT = 0.15
WEIGHT_NOISE = 0.10
WEIGHT_LAYOUT = 0.15
```

---

## 🧪 Testing

```bash
# Backend tests
pytest tests/backend/test_backend.py -v

# ML tests
pytest tests/ml/test_ml.py -v

# All tests
pytest tests/ -v
```

---

## ⚠️ Known Limitations

1. **Synthetic manipulations** may not represent real-world editing tools
2. **ELA** is not reliable for all image types (PNG screenshots are first JPEG compression)
3. **OCR** can make mistakes, especially on stylized fonts
4. **No EXIF** in screenshots is normal, not evidence of manipulation
5. **ML model bias** — the model learns patterns from the training dataset
6. **High score ≠ fraud** and **low score ≠ authentic**
7. **CPU training** is slow; use GPU for production training

---

## 🔮 Future Improvements

- [ ] GPU training support (CUDA/MPS)
- [ ] Copy-move forgery detection
- [ ] Clone detection
- [ ] Steganography detection
- [ ] Real-world dataset collection
- [ ] Calibrated uncertainty estimates
- [ ] API authentication
- [ ] Batch analysis support

---

## 🏆 Hackathon Demo

1. Start backend: `cd backend && python main.py`
2. Start frontend: `cd frontend && npm run dev`
3. Open `http://localhost:5173`
4. Upload any payment/bank screenshot
5. View forensic analysis results

The system works even without a trained ML model — forensic signals (ELA, noise, OCR) will still provide risk assessment.

---

## 📁 Project Structure

```
verishot-ai/
├── backend/          # FastAPI backend
│   ├── main.py       # Entry point
│   ├── config.py     # Configuration
│   ├── api/routes/   # API endpoints
│   ├── services/     # Forensic modules
│   ├── schemas/      # Pydantic models
│   └── models/       # Trained model (trained_model.pth)
├── frontend/         # React + Vite UI
│   └── src/
│       ├── pages/    # Upload, Results, History
│       ├── components/
│       ├── services/ # API calls
│       └── types/
├── ml/               # ML pipeline
│   ├── train.py      # Training script
│   ├── evaluate.py   # Evaluation
│   ├── model.py      # Model architecture
│   ├── dataset.py    # Data loading
│   └── data/raw/     # Training data
├── scripts/          # Utilities
│   ├── generate_manipulated_data.py
│   └── validate_dataset.py
├── tests/            # Unit tests
└── docs/             # Documentation
```

---

*Built for hackathon demonstration. Not intended for production use without further validation.*
