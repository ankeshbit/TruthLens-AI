"""
TruthLens AI — Evidence Fusion Engine

Combines independent forensic signals into a single risk score.

IMPORTANT DISCLAIMER:
The weights used here are initial heuristic values, NOT scientifically
validated parameters. They represent a reasonable starting point based on
the relative reliability of each signal for screenshot forensics.

Future calibration should use:
- Held-out labeled dataset of known genuine/manipulated screenshots
- Logistic regression or isotonic regression to learn optimal weights
- Cross-validation to avoid overfitting

Current weights:
- ML score:      40% (when available) — direct manipulation classification
- ELA:           20% — compression history inconsistencies
- Text/Layout:   15% — OCR-based anomalies
- Noise:         10% — spatial noise inconsistencies  
- Layout:        15% — structural/layout anomalies
"""
import logging
import numpy as np
from typing import Optional

logger = logging.getLogger(__name__)


# Risk classification thresholds
RISK_LOW_MAX = 30    # 0-30: Likely Genuine
RISK_MED_MAX = 60   # 31-60: Suspicious
# 61-100: Potentially Manipulated


def compute_risk_score(
    ml_score: Optional[float],
    ela_score: float,
    noise_score: float,
    text_score: float,
    layout_score: float,
    weights: Optional[dict] = None,
) -> tuple[int, str, dict]:
    """
    Fuse forensic signals into a single risk score.

    Args:
        ml_score: ML manipulation probability (0-1), or None if unavailable
        ela_score: ELA anomaly score (0-1)
        noise_score: Noise anomaly score (0-1)
        text_score: Text/OCR anomaly score (0-1)
        layout_score: Layout anomaly score (0-1)
        weights: Optional custom weights dict

    Returns:
        risk_score (int, 0-100): Overall risk score
        risk_level (str): "likely_genuine" | "suspicious" | "potentially_manipulated"
        breakdown (dict): Contribution of each signal
    """
    # Default weights
    if weights is None:
        if ml_score is not None:
            weights = {
                "ml": 0.40,
                "ela": 0.20,
                "text": 0.15,
                "noise": 0.10,
                "layout": 0.15,
            }
        else:
            # When ML is unavailable, redistribute ML weight
            weights = {
                "ml": 0.00,
                "ela": 0.35,
                "text": 0.25,
                "noise": 0.15,
                "layout": 0.25,
            }

    # Gather scores (replace missing ML with 0)
    ml_val = float(ml_score) if ml_score is not None else 0.0
    ela_val = float(ela_score)
    noise_val = float(noise_score)
    text_val = float(text_score)
    layout_val = float(layout_score)

    # Clip all to [0, 1]
    vals = {
        "ml": np.clip(ml_val, 0.0, 1.0),
        "ela": np.clip(ela_val, 0.0, 1.0),
        "text": np.clip(text_val, 0.0, 1.0),
        "noise": np.clip(noise_val, 0.0, 1.0),
        "layout": np.clip(layout_val, 0.0, 1.0),
    }

    # Weighted sum
    weighted_sum = sum(weights[k] * vals[k] for k in weights)

    # Normalize (in case weights don't sum to 1 due to ML absence)
    total_weight = sum(weights.values())
    if total_weight > 0:
        normalized = weighted_sum / total_weight
    else:
        normalized = 0.0

    # Convert to 0-100 integer
    risk_score = int(round(np.clip(normalized * 100, 0, 100)))

    # Classify
    if risk_score <= RISK_LOW_MAX:
        risk_level = "likely_genuine"
    elif risk_score <= RISK_MED_MAX:
        risk_level = "suspicious"
    else:
        risk_level = "potentially_manipulated"

    # Contribution breakdown
    breakdown = {
        "ml_contribution": round(weights["ml"] * vals["ml"] / total_weight * 100, 1),
        "ela_contribution": round(weights["ela"] * vals["ela"] / total_weight * 100, 1),
        "text_contribution": round(weights["text"] * vals["text"] / total_weight * 100, 1),
        "noise_contribution": round(weights["noise"] * vals["noise"] / total_weight * 100, 1),
        "layout_contribution": round(weights["layout"] * vals["layout"] / total_weight * 100, 1),
        "weights_used": weights,
        "ml_available": ml_score is not None,
    }

    logger.info(
        f"Risk score: {risk_score} ({risk_level}) | "
        f"ML={ml_val:.3f} ELA={ela_val:.3f} Noise={noise_val:.3f} "
        f"Text={text_val:.3f} Layout={layout_val:.3f}"
    )

    return risk_score, risk_level, breakdown


def generate_explanation(
    risk_score: int,
    risk_level: str,
    ml_score: Optional[float],
    ml_available: bool,
    ela_score: float,
    noise_score: float,
    text_score: float,
    layout_score: float,
    metadata_warnings: list[str],
    suspicious_regions: list[dict],
    screenshot_type: str,
) -> list[str]:
    """
    Generate human-readable forensic explanation from computed evidence.
    
    IMPORTANT: This function only summarizes actually computed signals.
    It never invents evidence. Every statement corresponds to a computed value.
    """
    findings = []

    # ML finding
    if not ml_available:
        findings.append(
            "ML manipulation classifier is not available (model not trained). "
            "Analysis relies entirely on forensic signal analysis."
        )
    elif ml_score is not None:
        if ml_score >= 0.70:
            findings.append(
                f"The ML classifier assigned a HIGH manipulation probability ({ml_score:.0%}), "
                "indicating features strongly associated with manipulated images."
            )
        elif ml_score >= 0.45:
            findings.append(
                f"The ML classifier assigned a MODERATE manipulation probability ({ml_score:.0%})."
            )
        else:
            findings.append(
                f"The ML classifier assigned a LOW manipulation probability ({ml_score:.0%}), "
                "suggesting features consistent with genuine images."
            )

    # ELA finding
    if ela_score >= 0.70:
        findings.append(
            f"Error Level Analysis (ELA) detected HIGH compression inconsistencies (score: {ela_score:.2f}). "
            "Different regions may have different compression histories, which can indicate editing."
        )
    elif ela_score >= 0.40:
        findings.append(
            f"ELA detected MODERATE compression anomalies (score: {ela_score:.2f}). "
            "Some regions show slightly different compression characteristics."
        )
    else:
        findings.append(
            f"ELA found relatively uniform compression patterns (score: {ela_score:.2f}), "
            "consistent with unedited screenshots."
        )

    # Noise finding
    if noise_score >= 0.60:
        findings.append(
            f"Noise analysis detected SIGNIFICANT spatial inconsistencies (score: {noise_score:.2f}). "
            "Different image regions show notably different noise characteristics."
        )
    elif noise_score >= 0.35:
        findings.append(
            f"Noise analysis detected MINOR spatial variations (score: {noise_score:.2f})."
        )

    # Text finding
    if text_score >= 0.60:
        findings.append(
            f"Text consistency analysis flagged HIGH anomalies (score: {text_score:.2f}). "
            "Text regions show unusual local image properties compared to surrounding areas."
        )
    elif text_score >= 0.30:
        findings.append(
            f"Text analysis detected MODERATE inconsistencies around text regions (score: {text_score:.2f})."
        )

    # Layout finding
    if layout_score >= 0.50:
        findings.append(
            f"Layout analysis detected structural anomalies (score: {layout_score:.2f})."
        )

    # Metadata warnings
    for warning in metadata_warnings:
        findings.append(f"Metadata observation: {warning}")

    # Suspicious regions
    if suspicious_regions:
        region_labels = [r.get("label", "unknown") for r in suspicious_regions[:3]]
        findings.append(
            f"Suspicious regions detected around: {', '.join(region_labels)}. "
            "These areas showed the highest forensic anomaly signals."
        )

    # Screenshot type
    if screenshot_type not in ("unknown", "generic_document"):
        findings.append(f"Document classified as: {screenshot_type.replace('_', ' ').title()}.")

    if not findings:
        findings.append("No specific forensic anomalies were detected.")

    return findings
