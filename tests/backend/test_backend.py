"""
TruthLens AI — Backend Tests

Tests for health endpoint, analysis route, validation, and forensic modules.
Run: pytest tests/backend/ -v
"""
import io
import sys
import pytest
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "backend"))

from PIL import Image
import numpy as np


# ── Fixtures ──────────────────────────────────────────────────────────────────

def create_test_image(width: int = 400, height: int = 600, color: tuple = (255, 255, 255)) -> bytes:
    """Create a simple test image and return bytes."""
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def create_test_jpeg(width: int = 400, height: int = 600) -> bytes:
    """Create a test JPEG image."""
    img = Image.new("RGB", (width, height), color=(200, 180, 160))
    # Add some variation
    arr = np.array(img)
    arr[100:200, 100:300] = [100, 150, 200]
    arr[300:400, 50:350] = [50, 100, 50]
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


# ── Preprocessing tests ───────────────────────────────────────────────────────

class TestPreprocessing:
    def test_validate_valid_image(self):
        from services.preprocessing import validate_image
        img_bytes = create_test_image()
        # Should not raise
        validate_image(img_bytes, "test.png", max_mb=20)

    def test_validate_oversized_image(self):
        from services.preprocessing import validate_image, PreprocessingError
        # Create fake oversized data
        fake_bytes = b"x" * (21 * 1024 * 1024)
        with pytest.raises(PreprocessingError, match="too large"):
            validate_image(fake_bytes, "test.png", max_mb=20)

    def test_validate_corrupted_image(self):
        from services.preprocessing import validate_image, PreprocessingError
        with pytest.raises(PreprocessingError):
            validate_image(b"not an image at all", "test.png")

    def test_load_image(self):
        from services.preprocessing import load_image
        img_bytes = create_test_image()
        img = load_image(img_bytes)
        assert img.mode == "RGB"
        assert img.size == (400, 600)

    def test_resize_for_analysis(self):
        from services.preprocessing import resize_for_analysis
        from PIL import Image
        img = Image.new("RGB", (4000, 3000))
        resized = resize_for_analysis(img, max_side=2048)
        assert max(resized.size) <= 2048

    def test_normalize_for_ml(self):
        from services.preprocessing import normalize_for_ml
        from PIL import Image
        img = Image.new("RGB", (224, 224))
        arr = normalize_for_ml(img, size=224)
        assert arr.shape == (1, 3, 224, 224)

    def test_image_to_base64(self):
        from services.preprocessing import image_to_base64
        from PIL import Image
        import base64
        img = Image.new("RGB", (100, 100))
        b64 = image_to_base64(img)
        assert isinstance(b64, str)
        # Verify it's valid base64
        base64.b64decode(b64)


# ── ELA tests ─────────────────────────────────────────────────────────────────

class TestELA:
    def test_compute_ela_returns_array_and_stats(self):
        from services.ela_analysis import compute_ela
        from PIL import Image
        img = Image.new("RGB", (400, 300), color=(200, 200, 200))
        ela_arr, stats = compute_ela(img)
        
        assert ela_arr.shape[:2] == (300, 400)  # (H, W, 3)
        assert 0.0 <= stats["ela_score"] <= 1.0
        assert "mean_ela" in stats
        assert "max_ela" in stats

    def test_ela_score_range(self):
        from services.ela_analysis import compute_ela
        from PIL import Image
        img = Image.new("RGB", (200, 200))
        _, stats = compute_ela(img)
        assert 0.0 <= stats["ela_score"] <= 1.0

    def test_ela_suspicious_regions(self):
        from services.ela_analysis import get_ela_suspicious_regions, compute_ela
        from PIL import Image
        img = Image.new("RGB", (400, 400))
        ela_arr, _ = compute_ela(img)
        regions = get_ela_suspicious_regions(ela_arr)
        assert isinstance(regions, list)


# ── Noise analysis tests ───────────────────────────────────────────────────────

class TestNoiseAnalysis:
    def test_analyze_noise_returns_score(self):
        from services.noise_analysis import analyze_noise
        from PIL import Image
        img = Image.new("RGB", (300, 300), color=(128, 128, 128))
        score, stats = analyze_noise(img)
        assert 0.0 <= score <= 1.0
        assert "noise_score" in stats

    def test_noise_score_range(self):
        from services.noise_analysis import analyze_noise
        import numpy as np
        from PIL import Image
        # Image with high noise
        arr = np.random.randint(0, 255, (300, 300, 3), dtype=np.uint8)
        img = Image.fromarray(arr)
        score, _ = analyze_noise(img)
        assert 0.0 <= score <= 1.0


# ── Metadata tests ────────────────────────────────────────────────────────────

class TestMetadata:
    def test_analyze_metadata_returns_dict(self):
        from services.metadata_analysis import analyze_metadata
        img_bytes = create_test_image()
        metadata, warnings = analyze_metadata(img_bytes, "test.png")
        
        assert "has_exif" in metadata
        assert "image_width" in metadata
        assert "image_height" in metadata
        assert isinstance(warnings, list)

    def test_metadata_png_no_exif(self):
        from services.metadata_analysis import analyze_metadata
        img_bytes = create_test_image()
        metadata, _ = analyze_metadata(img_bytes, "test.png")
        # PNG typically has no EXIF
        assert metadata["has_exif"] == False

    def test_metadata_suspicious_filename(self):
        from services.metadata_analysis import analyze_metadata
        img_bytes = create_test_image()
        _, warnings = analyze_metadata(img_bytes, "receipt_photoshop_edit.png")
        # Should flag suspicious term
        assert any("photoshop" in w.lower() for w in warnings)


# ── Layout analysis tests ─────────────────────────────────────────────────────

class TestLayoutAnalysis:
    def test_classify_screenshot_type_empty(self):
        from services.layout_analysis import classify_screenshot_type
        result = classify_screenshot_type([])
        assert result == "unknown"

    def test_classify_screenshot_payment(self):
        from services.layout_analysis import classify_screenshot_type
        ocr_results = [
            {"text": "Payment Successful", "confidence": 0.99, "bbox": [0, 0, 100, 30]},
            {"text": "₹5000", "confidence": 0.98, "bbox": [0, 100, 100, 130]},
            {"text": "Transaction ID", "confidence": 0.97, "bbox": [0, 200, 100, 230]},
        ]
        result = classify_screenshot_type(ocr_results)
        assert result == "payment"

    def test_analyze_text_consistency_empty(self):
        from services.layout_analysis import analyze_text_consistency
        from PIL import Image
        img = Image.new("RGB", (400, 600))
        score, stats = analyze_text_consistency(img, [])
        assert score == 0.0
        assert stats.get("status") == "no_text_detected"


# ── Fusion engine tests ────────────────────────────────────────────────────────

class TestFusionEngine:
    def test_risk_score_range(self):
        from services.fusion_engine import compute_risk_score
        score, level, breakdown = compute_risk_score(
            ml_score=0.8, ela_score=0.7, noise_score=0.5,
            text_score=0.6, layout_score=0.5
        )
        assert 0 <= score <= 100
        assert level in ["likely_genuine", "suspicious", "potentially_manipulated"]

    def test_risk_score_without_ml(self):
        from services.fusion_engine import compute_risk_score
        score, level, breakdown = compute_risk_score(
            ml_score=None, ela_score=0.0, noise_score=0.0,
            text_score=0.0, layout_score=0.0
        )
        assert level == "likely_genuine"
        assert score <= 30

    def test_risk_level_genuie(self):
        from services.fusion_engine import compute_risk_score
        score, level, _ = compute_risk_score(
            ml_score=0.05, ela_score=0.05, noise_score=0.05,
            text_score=0.05, layout_score=0.05
        )
        assert level == "likely_genuine"

    def test_risk_level_manipulated(self):
        from services.fusion_engine import compute_risk_score
        score, level, _ = compute_risk_score(
            ml_score=0.95, ela_score=0.90, noise_score=0.85,
            text_score=0.80, layout_score=0.75
        )
        assert level == "potentially_manipulated"
        assert score >= 61

    def test_explanation_generated(self):
        from services.fusion_engine import generate_explanation
        findings = generate_explanation(
            risk_score=75, risk_level="potentially_manipulated",
            ml_score=0.8, ml_available=True,
            ela_score=0.7, noise_score=0.5, text_score=0.6, layout_score=0.5,
            metadata_warnings=[], suspicious_regions=[], screenshot_type="payment"
        )
        assert isinstance(findings, list)
        assert len(findings) > 0
        # All findings should be non-empty strings
        for f in findings:
            assert isinstance(f, str)
            assert len(f) > 10


# ── API endpoint tests (using TestClient) ─────────────────────────────────────

@pytest.fixture
def client():
    """Create test client for FastAPI app."""
    try:
        from fastapi.testclient import TestClient
        import main
        return TestClient(main.app)
    except Exception as e:
        pytest.skip(f"Could not create test client: {e}")


class TestHealthEndpoint:
    def test_health_returns_ok(self, client):
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "ml_model_loaded" in data
        assert "ocr_available" in data
        assert "version" in data


class TestAnalyzeEndpoint:
    def test_analyze_valid_image(self, client):
        img_bytes = create_test_jpeg()
        response = client.post(
            "/api/analyze",
            files={"file": ("test.jpg", img_bytes, "image/jpeg")},
        )
        assert response.status_code == 200
        data = response.json()
        assert "risk_score" in data
        assert 0 <= data["risk_score"] <= 100
        assert data["risk_level"] in ["likely_genuine", "suspicious", "potentially_manipulated"]
        assert "forensic_signals" in data
        assert "explanation" in data
        assert isinstance(data["explanation"], list)

    def test_analyze_empty_file(self, client):
        response = client.post(
            "/api/analyze",
            files={"file": ("empty.jpg", b"", "image/jpeg")},
        )
        assert response.status_code == 400

    def test_analyze_invalid_file(self, client):
        response = client.post(
            "/api/analyze",
            files={"file": ("fake.jpg", b"not an image", "image/jpeg")},
        )
        assert response.status_code in [400, 422]

    def test_analyze_oversized_file(self, client):
        # Create oversized fake file
        big_bytes = b"x" * (21 * 1024 * 1024)
        response = client.post(
            "/api/analyze",
            files={"file": ("big.jpg", big_bytes, "image/jpeg")},
        )
        assert response.status_code in [400, 413]

    def test_analyze_response_schema(self, client):
        img_bytes = create_test_jpeg()
        response = client.post(
            "/api/analyze",
            files={"file": ("test.jpg", img_bytes, "image/jpeg")},
        )
        assert response.status_code == 200
        data = response.json()

        # Check required fields
        required_fields = [
            "risk_score", "risk_level", "screenshot_type",
            "ml_available", "forensic_signals", "ocr_results",
            "metadata", "explanation", "warnings", "suspicious_regions"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"

        # forensic_signals structure
        fs = data["forensic_signals"]
        assert "ela_score" in fs
        assert "noise_score" in fs
        assert "text_score" in fs
        assert "layout_score" in fs

        # metadata structure
        meta = data["metadata"]
        assert "has_exif" in meta


class TestHistoryEndpoint:
    def test_get_history(self, client):
        response = client.get("/api/history")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_clear_history(self, client):
        response = client.delete("/api/history")
        assert response.status_code == 200
