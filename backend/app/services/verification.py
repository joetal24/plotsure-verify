"""
Verification service — deterministic risk scoring & price estimation.
Follows ANTIGRAVITY.md rules: NO ML, NO Neo4j, NO GIS pipelines.
Uses 2025-2026 pricing data from market research.
"""
import random
from datetime import datetime, timedelta
from typing import Optional
from app.schemas import RiskLevel
from app.services.pricing_data import (
    get_district_pricing,
    calculate_price as calc_price,
    UGANDA_DISTRICT_PRICING,
)


# --- Land type multipliers (for title type) ---
LAND_TYPE_MULTIPLIERS = {
    "Freehold": 1.0,
    "Leasehold": 0.85,
    "Mailo": 1.1,
}


def normalize_size_to_decimals(size: float, unit: str) -> float:
    """Convert any size unit to decimals."""
    if unit == "Acres":
        return size * 10
    elif unit == "Square Metres":
        return size / 405
    return size


def estimate_price(
    district: str,
    land_type: str,
    plot_size: float,
    plot_size_unit: str = "Decimals",
    property_type: str = "residential",
) -> tuple[float, float, dict]:
    """
    Enhanced price estimation using 2025-2026 district pricing data.
    Returns (min_price, max_price, price_details)
    """
    size_in_decimals = normalize_size_to_decimals(plot_size, plot_size_unit)

    min_price, max_price = calc_price(district, property_type, size_in_decimals)

    pricing_data = get_district_pricing(district)

    price_details = {
        "district": district,
        "base_price_per_sqm": pricing_data["per_sqm"],
        "annual_growth": pricing_data["growth_2025"],
        "category": pricing_data["category"],
        "property_type": property_type,
        "plot_size_decimals": size_in_decimals,
        "land_type": land_type,
    }

    return min_price, max_price, price_details


def compute_risk(
    transfer_count: int,
    encumbrances: list[str],
    owner_data_missing: bool,
    last_transfer_date: Optional[str] = None,
) -> RiskLevel:
    """
    Deterministic risk scoring per ANTIGRAVITY.md:
    - HIGH if transfer_count > 2 in short period, or encumbrances exist, or missing ownership
    - MEDIUM if transfer_count == 1 recent, or partial data
    - LOW otherwise
    """
    # HIGH risk conditions
    if transfer_count > 2:
        return RiskLevel.HIGH
    if len(encumbrances) > 0:
        return RiskLevel.HIGH
    if owner_data_missing:
        return RiskLevel.HIGH

    # MEDIUM risk conditions
    if transfer_count >= 1 and last_transfer_date:
        try:
            last_date = datetime.strptime(last_transfer_date, "%Y-%m-%d")
            if (datetime.now() - last_date) < timedelta(days=365):
                return RiskLevel.MEDIUM
        except ValueError:
            return RiskLevel.MEDIUM

    return RiskLevel.LOW


def fetch_land_data(plot_reference: str) -> dict:
    """
    Fetch land data from UgNLIS (or fallback mock).
    Simulates realistic land registry data based on plot reference.
    """
    ref_hash = hash(plot_reference)

    owners = [
        "Nakato Joyce Namukasa",
        "Okello David Mukasa",
        "Auma Grace Nalubega",
        "Ssemwogerere John Baptist",
        "Muwonge Ronald Ssempijja",
        "Nampiima Flavia",
        "Kaguta William",
        "Nabukeera Mary",
    ]

    locations = [
        "Kampala Central",
        "Nakawa Division",
        "Makindye",
        "Rubaga",
        "Kawempe",
        "Entebbe",
        "Wakiso",
        "Mukono",
        "Luweero",
        "Jinja",
    ]

    title_types = ["Freehold", "Leasehold", "Mailo"]

    encumbrance_types = [
        "Existing mortgage with Centenary Bank",
        "Leasehold transfer pending",
        "Court injunction on property",
        "Boundary dispute - Plot 45",
        "Utility easement - UWEA",
        "Loan collateral - Stanbic Bank",
    ]

    owner = owners[abs(ref_hash) % len(owners)]
    location = locations[abs(ref_hash) % len(locations)]
    transfer_count = abs(ref_hash) % 8

    has_encumbrance = (abs(ref_hash) % 3) == 0
    encumbrances = []
    if has_encumbrance:
        encumbrance_count = (abs(ref_hash) % 2) + 1
        encumbrances = encumbrance_types[
            (abs(ref_hash) // 10) % len(encumbrance_types)
            : (abs(ref_hash) // 10) % len(encumbrance_types) + encumbrance_count
        ]
        encumbrances = encumbrances[:encumbrance_count]

    days_ago = abs(ref_hash) % 1825
    last_transfer = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d")

    title_status = "ENCUMBERED" if encumbrances else "CLEAN"
    title_type = title_types[abs(ref_hash) % len(title_types)]

    return {
        "owner": owner,
        "location": location,
        "title_status": title_status,
        "title_type": title_type,
        "encumbrances": encumbrances,
        "transfer_count": transfer_count,
        "last_transfer_date": last_transfer,
        "data_complete": True,
    }


def build_plot_reference(data: dict) -> str:
    """Build a canonical plot reference string from search parameters."""
    if data.get("search_method") == "title":
        return f"VOL {data.get('volume', '?')} FOL {data.get('folio', '?')}"
    else:
        return f"{data.get('district', '?')}/{data.get('block_number', '?')}/{data.get('plot_number', '?')}"
