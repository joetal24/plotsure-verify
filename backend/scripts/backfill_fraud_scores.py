"""
One-time backfill: compute and save fraud_score, fraud_risk_level, anomaly_flags,
and ml_anomaly_score for existing searches where fraud_score IS NULL.

Usage:
    cd backend && python scripts/backfill_fraud_scores.py

Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.
"""
import os
import sys
import time
from datetime import datetime, timezone
from dotenv import load_dotenv

backend_dotenv = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(backend_dotenv)
root_dotenv = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
load_dotenv(root_dotenv)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from supabase import create_client
from app.services.fraud_detection import score_fraud

FETCH_BATCH = 1000
UPSERT_BATCH = 200


def compute_fraud(row: dict) -> dict:
    plot_size = row.get("plot_size") or 0
    price_min = row.get("price_min")
    price_max = row.get("price_max")
    asking_price = 0
    if price_min is not None and price_max is not None:
        asking_price = (float(price_min) + float(price_max)) / 2
    district = row.get("location") or ""
    land_type = row.get("land_type") or "Freehold"
    verification_count = row.get("transfer_count") or 0
    ltd = row.get("last_transfer_date")
    days_since = 365
    if ltd:
        try:
            last_dt = datetime.fromisoformat(ltd)
            days_since = max((datetime.now(timezone.utc) - last_dt).days, 0)
        except (ValueError, TypeError):
            pass

    fraud = score_fraud(
        plot_size=float(plot_size),
        asking_price=float(asking_price),
        district=district,
        land_type=land_type,
        verification_count=int(verification_count),
        days_since_last_transfer=days_since,
    )

    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "plot_reference": row.get("plot_reference", ""),
        "location": row.get("location"),
        "owner": row.get("owner"),
        "title_status": row.get("title_status"),
        "encumbrances": row.get("encumbrances", []),
        "transfer_count": row.get("transfer_count", 0),
        "last_transfer_date": row.get("last_transfer_date"),
        "risk_level": row.get("risk_level", "LOW"),
        "price_min": row.get("price_min"),
        "price_max": row.get("price_max"),
        "land_type": row.get("land_type"),
        "plot_size": row.get("plot_size"),
        "plot_size_unit": row.get("plot_size_unit", "Decimals"),
        "fraud_score": fraud.fraud_score,
        "fraud_risk_level": fraud.risk_level,
        "anomaly_flags": fraud.anomaly_flags,
        "ml_anomaly_score": fraud.ml_anomaly_score,
        "created_at": row.get("created_at"),
    }


def main():
    supabase_url = os.getenv("SUPABASE_URL", "")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if not supabase_url or not supabase_key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env", flush=True)
        sys.exit(1)

    db = create_client(supabase_url, supabase_key)

    # Phase 1: fetch ALL rows needing backfill (IDs only, then full rows)
    print("Fetching rows that need backfill...", flush=True)
    all_rows = []
    offset = 0
    while True:
        result = (
            db.table("searches")
            .select("*")
            .is_("fraud_score", "null")
            .range(offset, offset + FETCH_BATCH - 1)
            .order("id")
            .execute()
        )
        rows = result.data
        if not rows:
            break
        all_rows.extend(rows)
        offset += FETCH_BATCH
        print(f"  Fetched {len(all_rows)} rows so far...", flush=True)

    total = len(all_rows)
    print(f"Found {total} searches with NULL fraud_score", flush=True)

    if total == 0:
        print("Nothing to backfill.", flush=True)
        return

    # Phase 2: compute scores locally (fast, no API calls)
    print("Computing fraud scores...", flush=True)
    updates = []
    errors = 0
    for row in all_rows:
        try:
            updates.append(compute_fraud(row))
        except Exception as e:
            errors += 1
            print(f"  ERROR row {row.get('id', '?')}: {e}", flush=True)

    # Phase 3: batch upsert in groups
    print(f"Updating {len(updates)} rows in batches of {UPSERT_BATCH}...", flush=True)
    start = time.time()
    processed = 0
    for i in range(0, len(updates), UPSERT_BATCH):
        batch = updates[i : i + UPSERT_BATCH]
        db.table("searches").upsert(batch, on_conflict="id").execute()
        processed += len(batch)
        elapsed = time.time() - start
        rate = processed / elapsed if elapsed > 0 else 0
        remaining = len(updates) - processed
        eta_secs = remaining / rate if rate > 0 else 0
        print(
            f"Backfilled {processed} / {len(updates)} rows  "
            f"({errors} errors, {rate:.1f} rows/s, ETA {eta_secs:.0f}s)",
            flush=True,
        )

    elapsed = time.time() - start
    print(f"\nDone. {processed} rows backfilled, {errors} errors in {elapsed:.0f}s.", flush=True)


if __name__ == "__main__":
    main()
