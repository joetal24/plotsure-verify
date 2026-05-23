"""Tests for ML anomaly detection."""
from app.services.anomaly_detection import ml_anomaly_score, _get_model


def test_ml_score_low_for_normal_plot():
    """A typical Kampala plot should score low (appears normal)."""
    score = ml_anomaly_score(
        plot_size=30, asking_price=200_000_000,
        district="Kampala", land_type="Freehold",
        verification_count=1, days_since_last_transfer=365,
    )
    assert 0.0 <= score <= 1.0
    assert score < 0.6, f"Expected low anomaly score, got {score}"


def test_ml_score_higher_for_outlier():
    """A clearly anomalous plot should score higher than a normal one."""
    score = ml_anomaly_score(
        plot_size=0.5, asking_price=10_000_000_000,
        district="Unknown", land_type="UnknownType",
        verification_count=10, days_since_last_transfer=1,
    )
    assert 0.0 <= score <= 1.0
    assert score > 0.5, f"Expected higher anomaly score, got {score}"


def test_ml_outlier_scores_higher_than_normal():
    """Outlier should score strictly higher than a normal plot."""
    normal = ml_anomaly_score(
        plot_size=30, asking_price=200_000_000,
        district="Kampala", land_type="Freehold",
        verification_count=1, days_since_last_transfer=365,
    )
    outlier = ml_anomaly_score(
        plot_size=0.5, asking_price=10_000_000_000,
        district="Unknown", land_type="UnknownType",
        verification_count=10, days_since_last_transfer=1,
    )
    assert outlier > normal, f"Expected outlier ({outlier}) > normal ({normal})"


def test_ml_model_is_cached():
    """The model should be reused (not retrained) on subsequent calls."""
    model1 = _get_model()
    model2 = _get_model()
    assert model1 is model2


def test_ml_score_in_fraud_result():
    """ml_anomaly_score should be included in the fraud score result."""
    from app.services.fraud_detection import score_fraud
    result = score_fraud(
        plot_size=30, asking_price=200_000_000,
        district="Kampala", land_type="Freehold",
        verification_count=1, days_since_last_transfer=365,
    )
    assert 0.0 <= result.ml_anomaly_score <= 1.0
