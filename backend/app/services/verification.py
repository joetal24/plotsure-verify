"""
Verification service — deterministic risk scoring & price estimation.
Follows ANTIGRAVITY.md rules: NO ML, NO Neo4j, NO GIS pipelines.
"""
import random
from datetime import datetime, timedelta
from typing import Optional
from app.schemas import RiskLevel


# --- District base prices (UGX per decimal) ---
DISTRICT_PRICES = {
    "Kampala": 15_000_000,
    "Wakiso": 10_000_000,
    "Mukono": 7_000_000,
    "Jinja": 5_000_000,
    "Entebbe": 12_000_000,
    "Mbarara": 4_000_000,
    "Gulu": 2_500_000,
    "Lira": 2_000_000,
    "default": 3_000_000,
}

# --- Land type multipliers ---
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
    plot_size_unit: str,
) -> tuple[float, float]:
    """
    Heuristic price estimation per ANTIGRAVITY.md:
    base_price (by district) × land_type_multiplier × simple_adjustments
    """
    base = DISTRICT_PRICES.get(district, DISTRICT_PRICES["default"])
    multiplier = LAND_TYPE_MULTIPLIERS.get(land_type, 1.0)
    size_in_decimals = normalize_size_to_decimals(plot_size, plot_size_unit)

    total = base * multiplier * size_in_decimals
    variance = 0.15
    price_min = round(total * (1 - variance))
    price_max = round(total * (1 + variance))
    return price_min, price_max


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
    In MVP, this always returns mock data since UgNLIS integration
    is not yet available. Structured to be easily swapped later.
    """
    # TODO: Replace with real UgNLIS API call when available
    # For now, return deterministic mock data based on plot reference

    owners = [
        "Nakato Joyce Namukasa",
        "Okello David Mukasa",
        "Auma Grace Nalubega",
        "Ssemwogerere John Baptist",
    ]
    locations = [
        "Kampala Central",
        "Nakawa Division",
        "Makindye",
        "Rubaga",
        "Kawempe",
        "Entebbe",
        "Wakiso",
    ]

    # Use hash of plot_reference for deterministic selection
    ref_hash = hash(plot_reference)
    owner = owners[abs(ref_hash) % len(owners)]
    location = locations[abs(ref_hash) % len(locations)]
    transfer_count = abs(ref_hash) % 5
    has_encumbrance = (abs(ref_hash) % 7) == 0

    # Deterministic date within last 2 years
    days_ago = abs(ref_hash) % 730
    last_transfer = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d")

    encumbrances = []
    if has_encumbrance:
        encumbrances = ["Existing mortgage with Centenary Bank"]

    return {
        "owner": owner,
        "location": location,
        "title_status": "ENCUMBERED" if has_encumbrance else "CLEAN",
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
