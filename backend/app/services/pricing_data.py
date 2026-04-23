"""
Uganda District Pricing Data (2025-2026)
Based on research from UBOS, Knight Frank, and market analysis
"""

from typing import Dict, Tuple

UGANDA_DISTRICT_PRICING: Dict[str, dict] = {
    # Central Region - Highest prices
    "Kampala Central": {
        "per_sqm": 150000,
        "per_acre": 150000000,
        "growth_2025": 0.12,
        "category": "prime",
        "property_types": {"residential": 1.0, "commercial": 1.5, "industrial": 1.2, "agricultural": 0.6},
    },
    "Kampala North": {
        "per_sqm": 120000,
        "per_acre": 120000000,
        "growth_2025": 0.10,
        "category": "prime",
        "property_types": {"residential": 1.0, "commercial": 1.4, "industrial": 1.1, "agricultural": 0.5},
    },
    "Kampala East": {
        "per_sqm": 100000,
        "per_acre": 100000000,
        "growth_2025": 0.09,
        "category": "high",
        "property_types": {"residential": 1.0, "commercial": 1.3, "industrial": 1.1, "agricultural": 0.5},
    },
    "Kampala West": {
        "per_sqm": 110000,
        "per_acre": 110000000,
        "growth_2025": 0.11,
        "category": "prime",
        "property_types": {"residential": 1.0, "commercial": 1.4, "industrial": 1.1, "agricultural": 0.5},
    },
    
    # Wakiso District - Fastest growing (16.9% in 2025)
    "Wakiso": {
        "per_sqm": 85000,
        "per_acre": 85000000,
        "growth_2025": 0.17,
        "category": "high",
        "property_types": {"residential": 1.0, "commercial": 1.3, "industrial": 1.1, "agricultural": 0.5},
    },
    "Kira": {
        "per_sqm": 95000,
        "per_acre": 95000000,
        "growth_2025": 0.15,
        "category": "high",
        "property_types": {"residential": 1.0, "commercial": 1.3, "industrial": 1.0, "agricultural": 0.5},
    },
    "Najjera": {
        "per_sqm": 75000,
        "per_acre": 75000000,
        "growth_2025": 0.14,
        "category": "medium",
        "property_types": {"residential": 1.0, "commercial": 1.2, "industrial": 1.0, "agricultural": 0.5},
    },
    "Kyanja": {
        "per_sqm": 90000,
        "per_acre": 90000000,
        "growth_2025": 0.13,
        "category": "high",
        "property_types": {"residential": 1.0, "commercial": 1.3, "industrial": 1.0, "agricultural": 0.5},
    },
    "Namugongo": {
        "per_sqm": 70000,
        "per_acre": 70000000,
        "growth_2025": 0.12,
        "category": "medium",
        "property_types": {"residential": 1.0, "commercial": 1.2, "industrial": 1.0, "agricultural": 0.5},
    },
    "Gayaza": {
        "per_sqm": 65000,
        "per_acre": 65000000,
        "growth_2025": 0.11,
        "category": "medium",
        "property_types": {"residential": 1.0, "commercial": 1.1, "industrial": 0.9, "agricultural": 0.5},
    },
    "Seguku": {
        "per_sqm": 80000,
        "per_acre": 80000000,
        "growth_2025": 0.16,
        "category": "high",
        "property_types": {"residential": 1.0, "commercial": 1.2, "industrial": 1.0, "agricultural": 0.5},
    },
    "Lubowa": {
        "per_sqm": 60000,
        "per_acre": 60000000,
        "growth_2025": 0.10,
        "category": "medium",
        "property_types": {"residential": 1.0, "commercial": 1.1, "industrial": 0.9, "agricultural": 0.5},
    },
    
    # Entebbe area
    "Entebbe": {
        "per_sqm": 80000,
        "per_acre": 80000000,
        "growth_2025": 0.08,
        "category": "high",
        "property_types": {"residential": 1.0, "commercial": 1.4, "industrial": 1.2, "agricultural": 0.7},
    },
    "Kajjansi": {
        "per_sqm": 55000,
        "per_acre": 55000000,
        "growth_2025": 0.07,
        "category": "medium",
        "property_types": {"residential": 1.0, "commercial": 1.1, "industrial": 0.9, "agricultural": 0.6},
    },
    
    # Mukono District
    "Mukono": {
        "per_sqm": 40000,
        "per_acre": 40000000,
        "growth_2025": 0.09,
        "category": "medium",
        "property_types": {"residential": 1.0, "commercial": 1.2, "industrial": 1.0, "agricultural": 0.6},
    },
    "Seeta": {
        "per_sqm": 35000,
        "per_acre": 35000000,
        "growth_2025": 0.08,
        "category": "medium",
        "property_types": {"residential": 1.0, "commercial": 1.1, "industrial": 0.9, "agricultural": 0.6},
    },
    "Katosi": {
        "per_sqm": 25000,
        "per_acre": 25000000,
        "growth_2025": 0.06,
        "category": "low",
        "property_types": {"residential": 1.0, "commercial": 1.0, "industrial": 0.8, "agricultural": 0.7},
    },
    
    # Jinja Area - Eastern hub
    "Jinja": {
        "per_sqm": 35000,
        "per_acre": 35000000,
        "growth_2025": 0.07,
        "category": "medium",
        "property_types": {"residential": 1.0, "commercial": 1.3, "industrial": 1.1, "agricultural": 0.5},
    },
    "Bugiri": {
        "per_sqm": 18000,
        "per_acre": 18000000,
        "growth_2025": 0.05,
        "category": "low",
        "property_types": {"residential": 1.0, "commercial": 1.0, "industrial": 0.8, "agricultural": 0.6},
    },
    "Iganga": {
        "per_sqm": 15000,
        "per_acre": 15000000,
        "growth_2025": 0.04,
        "category": "low",
        "property_types": {"residential": 1.0, "commercial": 1.0, "industrial": 0.8, "agricultural": 0.6},
    },
    "Mayuge": {
        "per_sqm": 12000,
        "per_acre": 12000000,
        "growth_2025": 0.04,
        "category": "low",
        "property_types": {"residential": 1.0, "commercial": 0.9, "industrial": 0.7, "agricultural": 0.7},
    },
    
    # Mbale Area - Eastern
    "Mbale": {
        "per_sqm": 28000,
        "per_acre": 28000000,
        "growth_2025": 0.06,
        "category": "medium",
        "property_types": {"residential": 1.0, "commercial": 1.2, "industrial": 1.0, "agricultural": 0.5},
    },
    "Tororo": {
        "per_sqm": 20000,
        "per_acre": 20000000,
        "growth_2025": 0.05,
        "category": "low",
        "property_types": {"residential": 1.0, "commercial": 1.1, "industrial": 0.9, "agricultural": 0.5},
    },
    "Busia": {
        "per_sqm": 18000,
        "per_acre": 18000000,
        "growth_2025": 0.05,
        "category": "low",
        "property_types": {"residential": 1.0, "commercial": 1.0, "industrial": 0.8, "agricultural": 0.6},
    },
    "Sironko": {
        "per_sqm": 15000,
        "per_acre": 15000000,
        "growth_2025": 0.04,
        "category": "low",
        "property_types": {"residential": 1.0, "commercial": 0.9, "industrial": 0.7, "agricultural": 0.6},
    },
    
    # Mbarara - Western hub
    "Mbarara": {
        "per_sqm": 28000,
        "per_acre": 28000000,
        "growth_2025": 0.08,
        "category": "medium",
        "property_types": {"residential": 1.0, "commercial": 1.3, "industrial": 1.1, "agricultural": 0.5},
    },
    "Ishaka": {
        "per_sqm": 20000,
        "per_acre": 20000000,
        "growth_2025": 0.06,
        "category": "low",
        "property_types": {"residential": 1.0, "commercial": 1.1, "industrial": 0.9, "agricultural": 0.5},
    },
    "Lyantonde": {
        "per_sqm": 15000,
        "per_acre": 15000000,
        "growth_2025": 0.05,
        "category": "low",
        "property_types": {"residential": 1.0, "commercial": 1.0, "industrial": 0.8, "agricultural": 0.6},
    },
    "Kiruhura": {
        "per_sqm": 12000,
        "per_acre": 12000000,
        "growth_2025": 0.04,
        "category": "low",
        "property_types": {"residential": 1.0, "commercial": 0.9, "industrial": 0.7, "agricultural": 0.7},
    },
    
    # Gulu - Northern hub
    "Gulu": {
        "per_sqm": 22000,
        "per_acre": 22000000,
        "growth_2025": 0.06,
        "category": "medium",
        "property_types": {"residential": 1.0, "commercial": 1.2, "industrial": 1.0, "agricultural": 0.5},
    },
    "Kitgum": {
        "per_sqm": 12000,
        "per_acre": 12000000,
        "growth_2025": 0.04,
        "category": "low",
        "property_types": {"residential": 1.0, "commercial": 1.0, "industrial": 0.8, "agricultural": 0.6},
    },
    "Pader": {
        "per_sqm": 10000,
        "per_acre": 10000000,
        "growth_2025": 0.03,
        "category": "low",
        "property_types": {"residential": 1.0, "commercial": 0.9, "industrial": 0.7, "agricultural": 0.6},
    },
    "Agago": {
        "per_sqm": 8000,
        "per_acre": 8000000,
        "growth_2025": 0.03,
        "category": "low",
        "property_types": {"residential": 1.0, "commercial": 0.8, "industrial": 0.6, "agricultural": 0.7},
    },
    
    # Lira - Northern hub
    "Lira": {
        "per_sqm": 18000,
        "per_acre": 18000000,
        "growth_2025": 0.05,
        "category": "medium",
        "property_types": {"residential": 1.0, "commercial": 1.2, "industrial": 1.0, "agricultural": 0.5},
    },
    "Apac": {
        "per_sqm": 10000,
        "per_acre": 10000000,
        "growth_2025": 0.03,
        "category": "low",
        "property_types": {"residential": 1.0, "commercial": 0.9, "industrial": 0.7, "agricultural": 0.6},
    },
    "Oyam": {
        "per_sqm": 8000,
        "per_acre": 8000000,
        "growth_2025": 0.03,
        "category": "low",
        "property_types": {"residential": 1.0, "commercial": 0.8, "industrial": 0.6, "agricultural": 0.7},
    },
    "Kole": {
        "per_sqm": 7000,
        "per_acre": 7000000,
        "growth_2025": 0.02,
        "category": "low",
        "property_types": {"residential": 1.0, "commercial": 0.8, "industrial": 0.6, "agricultural": 0.7},
    },
    
    # Kasese - Western
    "Kasese": {
        "per_sqm": 15000,
        "per_acre": 15000000,
        "growth_2025": 0.05,
        "category": "low",
        "property_types": {"residential": 1.0, "commercial": 1.1, "industrial": 0.9, "agricultural": 0.5},
    },
    "Fort Portal": {
        "per_sqm": 20000,
        "per_acre": 20000000,
        "growth_2025": 0.06,
        "category": "medium",
        "property_types": {"residential": 1.0, "commercial": 1.2, "industrial": 1.0, "agricultural": 0.5},
    },
    "Bundibugyo": {
        "per_sqm": 10000,
        "per_acre": 10000000,
        "growth_2025": 0.04,
        "category": "low",
        "property_types": {"residential": 1.0, "commercial": 0.9, "industrial": 0.7, "agricultural": 0.6},
    },
    "Kyenjojo": {
        "per_sqm": 12000,
        "per_acre": 12000000,
        "growth_2025": 0.04,
        "category": "low",
        "property_types": {"residential": 1.0, "commercial": 0.9, "industrial": 0.7, "agricultural": 0.6},
    },
    
    # Masindi area
    "Masindi": {
        "per_sqm": 20000,
        "per_acre": 20000000,
        "growth_2025": 0.06,
        "category": "medium",
        "property_types": {"residential": 1.0, "commercial": 1.1, "industrial": 0.9, "agricultural": 0.5},
    },
    "Kiryandongo": {
        "per_sqm": 15000,
        "per_acre": 15000000,
        "growth_2025": 0.05,
        "category": "low",
        "property_types": {"residential": 1.0, "commercial": 1.0, "industrial": 0.8, "agricultural": 0.6},
    },
    "Buliisa": {
        "per_sqm": 10000,
        "per_acre": 10000000,
        "growth_2025": 0.04,
        "category": "low",
        "property_types": {"residential": 1.0, "commercial": 0.9, "industrial": 0.7, "agricultural": 0.6},
    },
    
    # Luweero area
    "Luweero": {
        "per_sqm": 30000,
        "per_acre": 30000000,
        "growth_2025": 0.07,
        "category": "medium",
        "property_types": {"residential": 1.0, "commercial": 1.1, "industrial": 0.9, "agricultural": 0.5},
    },
    "Wakiso Surrounds": {
        "per_sqm": 45000,
        "per_acre": 45000000,
        "growth_2025": 0.10,
        "category": "medium",
        "property_types": {"residential": 1.0, "commercial": 1.2, "industrial": 1.0, "agricultural": 0.5},
    },
    "Nakasongola": {
        "per_sqm": 12000,
        "per_acre": 12000000,
        "growth_2025": 0.04,
        "category": "low",
        "property_types": {"residential": 1.0, "commercial": 0.9, "industrial": 0.7, "agricultural": 0.7},
    },
    "Nakaseke": {
        "per_sqm": 18000,
        "per_acre": 18000000,
        "growth_2025": 0.05,
        "category": "low",
        "property_types": {"residential": 1.0, "commercial": 1.0, "industrial": 0.8, "agricultural": 0.6},
    },
    "Kayunga": {
        "per_sqm": 15000,
        "per_acre": 15000000,
        "growth_2025": 0.04,
        "category": "low",
        "property_types": {"residential": 1.0, "commercial": 0.9, "industrial": 0.7, "agricultural": 0.6},
    },
    
    # Other areas
    "Ssoroti": {
        "per_sqm": 12000,
        "per_acre": 12000000,
        "growth_2025": 0.04,
        "category": "low",
        "property_types": {"residential": 1.0, "commercial": 1.0, "industrial": 0.8, "agricultural": 0.5},
    },
    "Moroto": {
        "per_sqm": 10000,
        "per_acre": 10000000,
        "growth_2025": 0.03,
        "category": "low",
        "property_types": {"residential": 1.0, "commercial": 0.9, "industrial": 0.7, "agricultural": 0.5},
    },
    "Kotido": {
        "per_sqm": 6000,
        "per_acre": 6000000,
        "growth_2025": 0.02,
        "category": "very_low",
        "property_types": {"residential": 1.0, "commercial": 0.8, "industrial": 0.6, "agricultural": 0.6},
    },
    "Kaabong": {
        "per_sqm": 5000,
        "per_acre": 5000000,
        "growth_2025": 0.02,
        "category": "very_low",
        "property_types": {"residential": 1.0, "commercial": 0.7, "industrial": 0.5, "agricultural": 0.7},
    },
    
    # Default for unknown districts
    "default": {
        "per_sqm": 15000,
        "per_acre": 15000000,
        "growth_2025": 0.05,
        "category": "low",
        "property_types": {"residential": 1.0, "commercial": 1.0, "industrial": 0.8, "agricultural": 0.6},
    },
}

def get_district_pricing(district: str) -> dict:
    """Get pricing for a specific district"""
    return UGANDA_DISTRICT_PRICING.get(district, UGANDA_DISTRICT_PRICING["default"])

def get_price_per_acre(district: str) -> int:
    """Get price per acre for a district"""
    return get_district_pricing(district)["per_acre"]

def get_growth_rate(district: str) -> float:
    """Get annual growth rate for a district"""
    return get_district_pricing(district)["growth_2025"]

def get_district_category(district: str) -> str:
    """Get district category"""
    return get_district_pricing(district)["category"]

def get_property_multiplier(district: str, property_type: str) -> float:
    """Get property type multiplier"""
    props = get_district_pricing(district)["property_types"]
    return props.get(property_type, 1.0)

def calculate_price(
    district: str,
    property_type: str,
    size_decimals: float,
) -> Tuple[int, int]:
    """
    Calculate price range for a property
    Returns (min_price, max_price) in UGX
    """
    pricing = get_district_pricing(district)
    per_sqm = pricing["per_sqm"]
    multiplier = pricing["property_types"].get(property_type, 1.0)
    
    size_sqm = size_decimals * 405
    
    base_price = per_sqm * multiplier * size_sqm
    
    variance = 0.15
    min_price = int(base_price * (1 - variance))
    max_price = int(base_price * (1 + variance))
    
    return min_price, max_price