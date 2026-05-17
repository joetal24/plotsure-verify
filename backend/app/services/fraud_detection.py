"""Deterministic fraud detection using heuristic scoring."""
from __future__ import annotations

from dataclasses import dataclass
from typing import List


@dataclass(frozen=True)
class FraudScoreResult:
    fraud_score: float
    risk_level: str
    anomaly_flags: List[str]


DISTRICT_CODES = {
    "kampala": 1,
    "wakiso": 2,
    "mukono": 3,
    "jinja": 4,
}


LAND_TYPE_CODES = {
    "freehold": 1,
    "leasehold": 2,
    "mailo": 3,
}


def _district_code(district: str) -> int:
    key = (district or "").strip().lower()
    return DISTRICT_CODES.get(key, 0)


def _land_type_code(land_type: str) -> int:
    key = (land_type or "").strip().lower()
    return LAND_TYPE_CODES.get(key, 0)


def _anomaly_flags(
    plot_size: float,
    asking_price: float,
    district: str,
    land_type: str,
    verification_count: int,
    days_since_last_transfer: int,
) -> List[str]:
    flags: List[str] = []

    if asking_price > 2_000_000_000:
        flags.append("asking_price_extremely_high")
    if plot_size < 5 and asking_price > 300_000_000:
        flags.append("high_price_for_small_plot")
    if verification_count > 4:
        flags.append("frequent_verifications")
    if days_since_last_transfer < 90:
        flags.append("recent_transfer_activity")
    if _district_code(district) == 0:
        flags.append("unknown_district")
    if _land_type_code(land_type) == 0:
        flags.append("unknown_land_type")

    return flags


def score_fraud(
    plot_size: float,
    asking_price: float,
    district: str,
    land_type: str,
    verification_count: int,
    days_since_last_transfer: int,
) -> FraudScoreResult:
    """
    Deterministic fraud scoring based on heuristic rules.
    Returns a score between 0.0 and 1.0 where higher indicates more fraud risk.
    """
    score = 0.0
    flags = []

    # Base risk from transfer count and encumbrances (similar to compute_risk)
    if verification_count > 2:
        score += 0.3
        flags.append("high_transfer_count")
    elif verification_count >= 1 and days_since_last_transfer < 365:
        score += 0.15
        flags.append("recent_transfer")

    # Price-based heuristics
    # Extremely high asking price
    if asking_price > 2_000_000_000:
        score += 0.2
        flags.append("asking_price_extremely_high")
    
    # High price for small plot
    if plot_size < 5 and asking_price > 300_000_000:
        score += 0.15
        flags.append("high_price_for_small_plot")
    
    # Recent transfer activity
    if days_since_last_transfer < 90:
        score += 0.1
        flags.append("recent_transfer_activity")
    
    # Unknown district or land type
    if _district_code(district) == 0:
        score += 0.1
        flags.append("unknown_district")
    if _land_type_code(land_type) == 0:
        score += 0.1
        flags.append("unknown_land_type")
    
    # Frequent verifications
    if verification_count > 4:
        score += 0.1
        flags.append("frequent_verifications")

    # Cap score at 1.0
    score = min(score, 1.0)

    # Determine risk level based on score
    if score >= 0.7:
        risk_level = "HIGH"
    elif score >= 0.4:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    return FraudScoreResult(
        fraud_score=score,
        risk_level=risk_level,
        anomaly_flags=flags,
    )
