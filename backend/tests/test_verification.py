from app.services.verification import compute_risk, build_plot_reference, normalize_size_to_decimals
from app.schemas import RiskLevel


def test_compute_risk_low():
    assert compute_risk(transfer_count=0, encumbrances=[], owner_data_missing=False) == RiskLevel.LOW


def test_compute_risk_high_transfer_count():
    assert compute_risk(transfer_count=3, encumbrances=[], owner_data_missing=False) == RiskLevel.HIGH


def test_compute_risk_high_encumbrances():
    assert compute_risk(transfer_count=0, encumbrances=["mortgage"], owner_data_missing=False) == RiskLevel.HIGH


def test_compute_risk_high_missing_owner():
    assert compute_risk(transfer_count=0, encumbrances=[], owner_data_missing=True) == RiskLevel.HIGH


def test_build_plot_reference_title():
    ref = build_plot_reference({"search_method": "title", "volume": "312", "folio": "4"})
    assert ref == "VOL 312 FOL 4"


def test_build_plot_reference_parcel():
    ref = build_plot_reference({"search_method": "parcel", "district": "Kampala", "block_number": "12", "plot_number": "45"})
    assert ref == "Kampala/12/45"


def test_normalize_size_acres_to_decimals():
    result = normalize_size_to_decimals(1, "Acres")
    assert result == 10


def test_normalize_size_sqm_to_decimals():
    result = normalize_size_to_decimals(405, "Square Metres")
    assert result == 1
