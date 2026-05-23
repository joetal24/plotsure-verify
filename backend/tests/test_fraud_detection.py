from app.services.fraud_detection import score_fraud


def test_score_fraud_low_risk():
    result = score_fraud(
        plot_size=30, asking_price=200_000_000,
        district="Kampala", land_type="Freehold",
        verification_count=1, days_since_last_transfer=365,
    )
    assert result.risk_level == "LOW"
    assert result.fraud_score < 0.4


def test_score_fraud_medium_risk():
    result = score_fraud(
        plot_size=2, asking_price=500_000_000,
        district="Kampala", land_type="Freehold",
        verification_count=3, days_since_last_transfer=30,
    )
    assert result.risk_level == "MEDIUM"
    assert 0.4 <= result.fraud_score < 0.7


def test_score_fraud_high_risk():
    result = score_fraud(
        plot_size=1, asking_price=3_000_000_000,
        district="Unknown", land_type="Freehold",
        verification_count=6, days_since_last_transfer=10,
    )
    assert result.risk_level == "HIGH"
    assert result.fraud_score >= 0.7


def test_score_fraud_anomaly_flags():
    result = score_fraud(
        plot_size=1, asking_price=3_000_000_000,
        district="Unknown", land_type="UnknownType",
        verification_count=6, days_since_last_transfer=10,
    )
    assert "asking_price_extremely_high" in result.anomaly_flags
    assert "high_price_for_small_plot" in result.anomaly_flags
    assert "frequent_verifications" in result.anomaly_flags
    assert "recent_transfer_activity" in result.anomaly_flags
    assert "unknown_district" in result.anomaly_flags
    assert "unknown_land_type" in result.anomaly_flags


def test_score_fraud_caps_at_one():
    result = score_fraud(
        plot_size=0.5, asking_price=10_000_000_000,
        district="Unknown", land_type="UnknownType",
        verification_count=10, days_since_last_transfer=1,
    )
    assert result.fraud_score <= 1.0
