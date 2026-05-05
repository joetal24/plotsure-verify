"""Fraud detection using Isolation Forest over land features."""
from __future__ import annotations

from dataclasses import dataclass
from typing import List

import numpy as np
from sklearn.ensemble import IsolationForest


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


def _build_features(
    plot_size: float,
    asking_price: float,
    district: str,
    land_type: str,
    verification_count: int,
    days_since_last_transfer: int,
) -> np.ndarray:
    return np.array(
        [
            plot_size,
            asking_price,
            _district_code(district),
            _land_type_code(land_type),
            float(verification_count),
            float(days_since_last_transfer),
        ],
        dtype=float,
    )


def _synthetic_dataset(seed: int = 42) -> np.ndarray:
    rng = np.random.default_rng(seed)
    districts = np.array(list(DISTRICT_CODES.values()))
    land_types = np.array(list(LAND_TYPE_CODES.values()))

    samples = 650
    plot_sizes = rng.normal(35, 18, size=samples).clip(3, 200)
    land_type = rng.choice(land_types, size=samples)
    district = rng.choice(districts, size=samples, p=[0.35, 0.35, 0.2, 0.1])

    base_prices = rng.normal(12_000_000, 5_000_000, size=samples).clip(2_000_000, 40_000_000)
    price_multiplier = 1 + (land_type == LAND_TYPE_CODES["mailo"]) * 0.2
    price_multiplier += (district == DISTRICT_CODES["kampala"]) * 0.25
    asking_price = (base_prices * plot_sizes / 10) * price_multiplier
    asking_price = asking_price.clip(5_000_000, 4_500_000_000)

    verification_count = rng.integers(0, 6, size=samples)
    days_since_last_transfer = rng.integers(30, 3650, size=samples)

    data = np.column_stack(
        [
            plot_sizes,
            asking_price,
            district.astype(float),
            land_type.astype(float),
            verification_count.astype(float),
            days_since_last_transfer.astype(float),
        ]
    )

    return data


MODEL = IsolationForest(
    n_estimators=200,
    contamination=0.12,
    random_state=42,
)
MODEL.fit(_synthetic_dataset())


def _risk_from_score(score: float) -> str:
    if score >= 0.7:
        return "HIGH"
    if score >= 0.4:
        return "MEDIUM"
    return "LOW"


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
    features = _build_features(
        plot_size=plot_size,
        asking_price=asking_price,
        district=district,
        land_type=land_type,
        verification_count=verification_count,
        days_since_last_transfer=days_since_last_transfer,
    )
    raw_score = MODEL.decision_function(features.reshape(1, -1))[0]
    fraud_score = float(np.clip(0.5 - raw_score, 0.0, 1.0))
    risk_level = _risk_from_score(fraud_score)
    flags = _anomaly_flags(
        plot_size,
        asking_price,
        district,
        land_type,
        verification_count,
        days_since_last_transfer,
    )

    return FraudScoreResult(
        fraud_score=fraud_score,
        risk_level=risk_level,
        anomaly_flags=flags,
    )
