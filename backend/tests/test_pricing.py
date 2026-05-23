from app.services.pricing_data import (
    get_district_pricing,
    calculate_price,
    get_growth_rate,
    get_district_category,
)


def test_kampala_central_pricing():
    pricing = get_district_pricing("Kampala Central")
    assert pricing["per_sqm"] == 150000
    assert pricing["category"] == "prime"


def test_unknown_district_falls_back_to_default():
    pricing = get_district_pricing("NonExistentDistrict")
    assert pricing["per_sqm"] == 15000
    assert pricing["category"] == "low"


def test_calculate_price_returns_range():
    min_p, max_p = calculate_price("Kampala Central", "residential", 1)
    assert min_p > 0
    assert max_p > min_p


def test_growth_rate():
    assert get_growth_rate("Kampala Central") == 0.12


def test_district_category():
    assert get_district_category("Wakiso") == "high"
    assert get_district_category("Gulu") == "medium"
    assert get_district_category("Kaabong") == "very_low"
