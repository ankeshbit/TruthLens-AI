"""
TruthLens AI — ML Pipeline Tests
"""
import sys
import io
import pytest
import numpy as np
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "ml"))

from PIL import Image


class TestMLConfig:
    def test_config_imports(self):
        from config import (
            IMAGE_SIZE, MODEL_ARCH, BATCH_SIZE, SEED,
            STAGE1_EPOCHS, STAGE2_EPOCHS, DEFAULT_THRESHOLD
        )
        assert IMAGE_SIZE == 224
        assert MODEL_ARCH == "efficientnet_b0"
        assert SEED == 42
        assert 0.0 < DEFAULT_THRESHOLD < 1.0


class TestMLModel:
    def test_build_efficientnet(self):
        from model import build_model
        model = build_model("efficientnet_b0")
        assert model is not None

    def test_build_resnet50(self):
        from model import build_model
        model = build_model("resnet50")
        assert model is not None

    def test_unknown_arch_raises(self):
        from model import build_model
        with pytest.raises(ValueError):
            build_model("unknown_arch")

    def test_count_parameters(self):
        from model import build_model, count_parameters
        model = build_model("efficientnet_b0")
        params = count_parameters(model)
        assert params["total"] > 0
        assert params["trainable"] > 0

    def test_freeze_backbone(self):
        from model import build_model, freeze_backbone, count_parameters
        model = build_model("efficientnet_b0")
        freeze_backbone(model, "efficientnet_b0")
        params = count_parameters(model)
        assert params["frozen"] > 0
        assert params["trainable"] < params["total"]

    def test_unfreeze_upper_layers(self):
        from model import build_model, freeze_backbone, unfreeze_upper_layers, count_parameters
        model = build_model("efficientnet_b0")
        freeze_backbone(model, "efficientnet_b0")
        frozen_trainable = count_parameters(model)["trainable"]
        unfreeze_upper_layers(model, "efficientnet_b0")
        unfrozen_trainable = count_parameters(model)["trainable"]
        # Should have more trainable params after unfreezing
        assert unfrozen_trainable > frozen_trainable

    def test_model_forward_pass(self):
        import torch
        from model import build_model
        model = build_model("efficientnet_b0")
        model.eval()
        
        dummy_input = torch.zeros(1, 3, 224, 224)
        with torch.no_grad():
            output = model(dummy_input)
        
        assert output.shape == (1, 1)  # Binary logit

    def test_sigmoid_output_range(self):
        import torch
        from model import build_model
        model = build_model("efficientnet_b0")
        model.eval()
        
        dummy_input = torch.zeros(1, 3, 224, 224)
        with torch.no_grad():
            logit = model(dummy_input)
            prob = torch.sigmoid(logit)
        
        assert 0.0 <= prob.item() <= 1.0


class TestDataset:
    def test_transforms_train(self):
        from dataset import get_transforms
        from PIL import Image
        
        transform = get_transforms(is_train=True)
        img = Image.new("RGB", (400, 300))
        result = transform(img)
        assert result.shape == (3, 224, 224)

    def test_transforms_val(self):
        from dataset import get_transforms
        from PIL import Image
        
        transform = get_transforms(is_train=False)
        img = Image.new("RGB", (400, 300))
        result = transform(img)
        assert result.shape == (3, 224, 224)


class TestThreshold:
    def test_threshold_defaults(self):
        from config import THRESHOLDS_TO_EVALUATE, DEFAULT_THRESHOLD
        assert 0.3 in THRESHOLDS_TO_EVALUATE
        assert 0.5 in THRESHOLDS_TO_EVALUATE
        assert 0.0 < DEFAULT_THRESHOLD < 1.0
