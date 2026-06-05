"""
Seed 5 sample listings (3 clean, 2 flagged) for testing.

Usage:
    cd backend && python scripts/seed_listings.py

Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.
"""
import os
import sys
import uuid
from datetime import datetime, timezone
from dotenv import load_dotenv

backend_dotenv = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(backend_dotenv)
root_dotenv = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
load_dotenv(root_dotenv)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from supabase import create_client

SEARCHES = [
    # ── 3 CLEAN ──
    {
        "plot_reference": "VOL 250 FOL 88",
        "location": "Kampala Central",
        "owner": "Nantongo Sarah",
        "title_status": "CLEAN",
        "encumbrances": [],
        "transfer_count": 2,
        "last_transfer_date": "2024-08-15",
        "risk_level": "LOW",
        "price_min": 120_000_000,
        "price_max": 150_000_000,
        "land_type": "Freehold",
        "plot_size": 0.5,
        "plot_size_unit": "Acres",
        "fraud_score": 5.0,
        "fraud_risk_level": "LOW",
        "anomaly_flags": [],
        "ml_anomaly_score": 0.05,
        "listing": {
            "county": "Kampala",
            "village": "Kololo",
            "specific_area": "Kololo Hill Lane",
            "price_min": 120_000_000,
            "price_max": 150_000_000,
            "description": "Prime residential plot in Kololo with ready title. Great location near Acacia Mall.",
            "contact_preference": "both",
            "contact_phone": "0700123456",
            "district": "Kampala Central",
            "parish": "Kololo",
            "area_acres": 0.5,
            "latitude": 0.3350,
            "longitude": 32.5850,
        },
    },
    {
        "plot_reference": "VOL 312 FOL 18",
        "location": "Wakiso",
        "owner": "Mukasa John",
        "title_status": "CLEAN",
        "encumbrances": [],
        "transfer_count": 1,
        "last_transfer_date": "2025-01-20",
        "risk_level": "LOW",
        "price_min": 80_000_000,
        "price_max": 95_000_000,
        "land_type": "Mailo",
        "plot_size": 1.2,
        "plot_size_unit": "Acres",
        "fraud_score": 3.0,
        "fraud_risk_level": "LOW",
        "anomaly_flags": [],
        "ml_anomaly_score": 0.03,
        "listing": {
            "county": "Wakiso",
            "village": "Kira",
            "specific_area": "Kira Town, near Post Office",
            "price_min": 80_000_000,
            "price_max": 95_000_000,
            "description": "Well-located plot in Kira town. Road access, suitable for residential or commercial.",
            "contact_preference": "phone",
            "contact_phone": "0712123456",
            "district": "Wakiso",
            "parish": "Kira",
            "area_acres": 1.2,
            "latitude": 0.3750,
            "longitude": 32.6200,
        },
    },
    {
        "plot_reference": "VOL 498 FOL 5",
        "location": "Mukono",
        "owner": "Kintu David",
        "title_status": "CLEAN",
        "encumbrances": [],
        "transfer_count": 1,
        "last_transfer_date": "2025-03-10",
        "risk_level": "LOW",
        "price_min": 55_000_000,
        "price_max": 70_000_000,
        "land_type": "Freehold",
        "plot_size": 2.0,
        "plot_size_unit": "Acres",
        "fraud_score": 2.0,
        "fraud_risk_level": "LOW",
        "anomaly_flags": [],
        "ml_anomaly_score": 0.01,
        "listing": {
            "county": "Mukono",
            "village": "Seeta",
            "specific_area": "Seeta-Namilyango Road",
            "price_min": 55_000_000,
            "price_max": 70_000_000,
            "description": "Spacious farmland plot in Seeta. Good for agriculture or future development.",
            "contact_preference": "email",
            "contact_phone": "",
            "district": "Mukono",
            "parish": "Seeta",
            "area_acres": 2.0,
            "latitude": 0.4100,
            "longitude": 32.7100,
        },
    },
    # ── 2 FLAGGED ──
    {
        "plot_reference": "VOL 999 FOL 99",
        "location": "Kampala West",
        "owner": "Ssempijja Unknown",
        "title_status": "ENCUMBERED",
        "encumbrances": ["CAVEAT EMPTOR", "DISPUTE PENDING"],
        "transfer_count": 5,
        "last_transfer_date": "2026-01-04",
        "risk_level": "HIGH",
        "price_min": 50_000_000,
        "price_max": 200_000_000,
        "land_type": "Leasehold",
        "plot_size": 50,
        "plot_size_unit": "Decimals",
        "fraud_score": 85.0,
        "fraud_risk_level": "HIGH",
        "anomaly_flags": [
            "unusual_price_to_size_ratio",
            "rapid_ownership_changes",
            "high_risk_location",
        ],
        "ml_anomaly_score": 0.92,
        "listing": {
            "county": "Kampala",
            "village": "Lubiri",
            "specific_area": "Near Mengo Palace",
            "price_min": 50_000_000,
            "price_max": 200_000_000,
            "description": "Large plot near Mengo. Unusually wide price range — investigate before purchase.",
            "contact_preference": "phone",
            "contact_phone": "0780234567",
            "district": "Kampala West",
            "parish": "Lubiri",
            "area_acres": 0.25,
            "latitude": 0.3050,
            "longitude": 32.5650,
        },
    },
    {
        "plot_reference": "VOL 777 FOL 13",
        "location": "Kampala East",
        "owner": "Kayiira Fraudster",
        "title_status": "ENCUMBERED",
        "encumbrances": ["FORGERY_ALLEGATION", "MULTIPLE_CLAIMANTS"],
        "transfer_count": 8,
        "last_transfer_date": "2026-02-28",
        "risk_level": "HIGH",
        "price_min": 30_000_000,
        "price_max": 300_000_000,
        "land_type": "Mailo",
        "plot_size": 0.1,
        "plot_size_unit": "Acres",
        "fraud_score": 95.0,
        "fraud_risk_level": "HIGH",
        "anomaly_flags": [
            "unusual_price_to_size_ratio",
            "rapid_ownership_changes",
            "suspiciously_low_price",
        ],
        "ml_anomaly_score": 0.98,
        "listing": {
            "county": "Kampala",
            "village": "Bwaise",
            "specific_area": "Bwaise III",
            "price_min": 30_000_000,
            "price_max": 300_000_000,
            "description": "Suspicious listing with extreme price range and many owners. High fraud risk.",
            "contact_preference": "phone",
            "contact_phone": "0799234567",
            "district": "Kampala East",
            "parish": "Bwaise",
            "area_acres": 0.1,
            "latitude": 0.3450,
            "longitude": 32.5950,
        },
    },
]


def main():
    supabase_url = os.getenv("SUPABASE_URL", "")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if not supabase_url or not supabase_key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env", flush=True)
        sys.exit(1)

    db = create_client(supabase_url, supabase_key)

    # Pick the first user from public.users
    user_result = db.table("users").select("id").limit(1).execute()
    if not user_result.data:
        print("ERROR: No users found in public.users. Create a user first.", flush=True)
        sys.exit(1)
    user_id = user_result.data[0]["id"]
    print(f"Using user_id: {user_id}", flush=True)

    now = datetime.now(timezone.utc).isoformat()
    created_ids = []

    for i, s in enumerate(SEARCHES):
        search_id = str(uuid.uuid4())
        listing_data = s["listing"]

        search_record = {
            "id": search_id,
            "user_id": user_id,
            "plot_reference": s["plot_reference"],
            "location": s["location"],
            "owner": s["owner"],
            "title_status": s["title_status"],
            "encumbrances": s["encumbrances"],
            "transfer_count": s["transfer_count"],
            "last_transfer_date": s["last_transfer_date"],
            "risk_level": s["risk_level"],
            "price_min": s["price_min"],
            "price_max": s["price_max"],
            "land_type": s["land_type"],
            "plot_size": s["plot_size"],
            "plot_size_unit": s["plot_size_unit"],
            "fraud_score": s["fraud_score"],
            "fraud_risk_level": s["fraud_risk_level"],
            "anomaly_flags": s["anomaly_flags"],
            "ml_anomaly_score": s["ml_anomaly_score"],
            "created_at": now,
        }

        listing_id = str(uuid.uuid4())
        listing_record = {
            "id": listing_id,
            "user_id": user_id,
            "search_id": search_id,
            "listing_status": "ACTIVE",
            "county": listing_data["county"],
            "village": listing_data["village"],
            "specific_area": listing_data["specific_area"],
            "price_min": listing_data["price_min"],
            "price_max": listing_data["price_max"],
            "description": listing_data["description"],
            "contact_preference": listing_data["contact_preference"],
            "contact_phone": listing_data["contact_phone"] or None,
            "latitude": listing_data["latitude"],
            "longitude": listing_data["longitude"],
            "district": listing_data["district"],
            "parish": listing_data["parish"],
            "area_acres": listing_data["area_acres"],
            "views_count": 0,
            "created_at": now,
            "updated_at": now,
        }

        tag = "FLAGGED" if i >= 3 else "CLEAN"
        print(f"  [{tag}] Creating search {search_id} + listing {listing_id} ...", flush=True)

        db.table("searches").insert(search_record).execute()
        db.table("land_listings").insert(listing_record).execute()
        created_ids.append(listing_id)

    print(f"\nDone. Created {len(created_ids)} listings:", flush=True)
    for i, lid in enumerate(created_ids):
        tag = "FLAGGED" if i >= 3 else "CLEAN"
        print(f"  [{tag}] {lid}", flush=True)

    print(f"\nSuccess! Now restart your backend so the new listings appear.", flush=True)


if __name__ == "__main__":
    main()
