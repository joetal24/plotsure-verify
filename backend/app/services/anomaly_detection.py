"""Unsupervised anomaly detection using IsolationForest."""
from __future__ import annotations

import numpy as np
from sklearn.ensemble import IsolationForest


DISTRICT_CODES = {
    "kampala": 1, "wakiso": 2, "mukono": 3, "jinja": 4,
}

LAND_TYPE_CODES = {
    "freehold": 1, "leasehold": 2, "mailo": 3,
}


def _district_code(district: str) -> int:
    return DISTRICT_CODES.get((district or "").strip().lower(), 0)


def _land_type_code(land_type: str) -> int:
    return LAND_TYPE_CODES.get((land_type or "").strip().lower(), 0)

# Synthetic reference dataset representing typical Ugandan land plots.
# The IsolationForest learns what "normal" looks like so it can flag outliers.
_NORMAL_PLOTS: list[list[float]] = [
    # [plot_size, asking_price_million, district_code, land_type_code, transfer_count, days_since_last_transfer]

    # Small urban plots (Kampala / Wakiso)
    [5,    250, 1, 1, 1, 800],
    [8,    350, 1, 2, 0, 1200],
    [10,   400, 2, 1, 1, 600],
    [6,    300, 2, 3, 0, 1500],
    [12,   500, 1, 1, 2, 400],
    [7,    280, 1, 2, 0, 900],
    [15,   600, 2, 1, 1, 700],
    [4,    200, 1, 1, 0, 2000],

    # Medium suburban plots
    [20,   350, 3, 1, 1, 500],
    [25,   400, 3, 2, 2, 300],
    [30,   500, 1, 1, 0, 1000],
    [18,   300, 2, 3, 1, 600],
    [22,   450, 1, 1, 1, 800],
    [35,   550, 3, 1, 2, 400],
    [28,   380, 2, 2, 0, 1100],

    # Large rural plots
    [50,   400, 4, 1, 0, 2000],
    [60,   500, 4, 2, 1, 1500],
    [45,   350, 3, 1, 0, 1800],
    [70,   600, 4, 1, 1, 1200],
    [80,   700, 3, 3, 2, 900],
    [55,   450, 2, 1, 0, 1600],
    [100,  800, 4, 2, 0, 2500],

    # High-value plots
    [10,   800, 1, 1, 1, 500],
    [15,   1000, 1, 2, 2, 300],
    [8,    700,  2, 1, 0, 700],
    [12,   900,  1, 1, 1, 400],
    [6,    600,  1, 3, 0, 1000],

    # Moderate transfers
    [10,   300, 2, 1, 2, 200],
    [25,   400, 3, 2, 1, 150],
    [30,   500, 1, 1, 3, 100],
]

_model: IsolationForest | None = None


def _get_model() -> IsolationForest:
    global _model
    if _model is not None:
        return _model
    X = np.array(_NORMAL_PLOTS, dtype=np.float64)
    _model = IsolationForest(
        n_estimators=100,
        contamination=0.1,
        random_state=42,
        n_jobs=1,
    )
    _model.fit(X)
    return _model


def ml_anomaly_score(
    plot_size: float,
    asking_price: float,
    district: str,
    land_type: str,
    verification_count: int,
    days_since_last_transfer: int,
) -> float:
    """
    Returns an anomaly score between 0.0 (normal) and 1.0 (highly anomalous).
    Uses an IsolationForest trained on synthetic typical Ugandan land plots.
    """
    model = _get_model()
    features = np.array([[
        plot_size,
        asking_price / 1_000_000,
        _district_code(district),
        _land_type_code(land_type),
        verification_count,
        days_since_last_transfer,
    ]], dtype=np.float64)

    # IsolationForest.decision_function returns negative for anomalies, positive for inliers.
    # We normalise to 0-1 where higher = more anomalous.
    raw = model.decision_function(features)[0]
    score = 1.0 - (raw + 0.5)
    return float(np.clip(score, 0.0, 1.0))
