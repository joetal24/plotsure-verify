"""
Verification endpoints per ANTIGRAVITY.md API contract:
   POST /verify
   GET  /verify/{id}
"""
import uuid
import asyncio
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.auth import get_current_user
from app.database import get_supabase
from app.schemas import VerifyRequest, VerifyResponse
from app.services.verification import (
    fetch_land_data,
    compute_risk,
    estimate_price,
    build_plot_reference,
)
from app.services.fraud_detection import score_fraud
from app.services.graph import graph_service
from app.config import settings

router = APIRouter(prefix="/verify", tags=["Verification"])
limiter = Limiter(key_func=get_remote_address)


@router.post("", response_model=VerifyResponse)
@limiter.limit(settings.VERIFY_RATE_LIMIT)
async def verify_plot(
    request: Request,
    body: VerifyRequest,
    user: dict = Depends(get_current_user),
):
    """
    Full verification flow per ANTIGRAVITY.md:
    1. Authenticate user (via dependency)
    2. Validate input (via Pydantic)
    3. Check cache (existing recent search)
    4. Fetch data (UgNLIS or fallback mock)
    5. Compute risk score + price estimate
    6. Store result in DB
    7. Return response
    """
    db = get_supabase()
    user_id = user["id"]

    # Build plot reference
    plot_ref = build_plot_reference(body.model_dump())

    # 3. Check cache - recent search for same plot by this user
    cache_cutoff = (
        datetime.utcnow() - timedelta(seconds=settings.CACHE_TTL_SECONDS)
    ).isoformat()

    cached = (
        db.table("searches")
        .select("*")
        .eq("plot_reference", plot_ref)
        .gte("created_at", cache_cutoff)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if cached.data:
         row = cached.data[0]
         fraud_score = row.get("fraud_score", 0.0)
         fraud_risk_level = row.get("fraud_risk_level", "LOW")
         anomaly_flags = row.get("anomaly_flags") or []
         ml_anomaly_score = row.get("ml_anomaly_score", 0.0)
         return VerifyResponse(
             id=row["id"],
             plot_reference=row["plot_reference"],
             location=row["location"],
             owner=row["owner"],
             title_status=row["title_status"],
             encumbrances=row.get("encumbrances") or [],
             transfer_count=row["transfer_count"],
             last_transfer_date=row.get("last_transfer_date", ""),
             risk_level=row["risk_level"],
             price_min=row["price_min"],
             price_max=row["price_max"],
             land_type=body.land_type.value,
             plot_size=body.plot_size,
             plot_size_unit=body.plot_size_unit,
             created_at=row["created_at"],
             is_cached=True,
             fraud_score=fraud_score,
             fraud_risk_level=fraud_risk_level,
             anomaly_flags=anomaly_flags,
             ml_anomaly_score=ml_anomaly_score,
)

    # 4. Fetch data (UgNLIS or fallback)
    land_data = fetch_land_data(plot_ref)
    district = body.district or land_data["location"]

    # 5. Compute risk and price in parallel
    import asyncio
    risk_task = asyncio.to_thread(
        compute_risk,
        transfer_count=land_data["transfer_count"],
        encumbrances=land_data["encumbrances"],
        owner_data_missing=not land_data["data_complete"],
        last_transfer_date=land_data["last_transfer_date"],
    )
    price_task = asyncio.to_thread(
        estimate_price,
        district=district,
        land_type=body.land_type.value,
        plot_size=body.plot_size,
        plot_size_unit=body.plot_size_unit,
    )
    risk_level, (price_min, price_max, _) = await asyncio.gather(risk_task, price_task)

    days_since_last_transfer = 365
    if land_data.get("last_transfer_date"):
        try:
            last_transfer = datetime.fromisoformat(land_data["last_transfer_date"])
            days_since_last_transfer = max((datetime.utcnow() - last_transfer).days, 0)
        except ValueError:
            days_since_last_transfer = 365

    fraud = score_fraud(
        plot_size=body.plot_size,
        asking_price=body.asking_price or (price_min + price_max) / 2,
        district=district,
        land_type=body.land_type.value,
        verification_count=land_data["transfer_count"],
         days_since_last_transfer=days_since_last_transfer,
     )

    # 6. Store in DB
    search_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    search_record = {
        "id": search_id,
        "user_id": user_id,
        "plot_reference": plot_ref,
        "location": land_data["location"],
        "owner": land_data["owner"],
        "title_status": land_data["title_status"],
        "encumbrances": land_data["encumbrances"],
        "transfer_count": land_data["transfer_count"],
        "last_transfer_date": land_data["last_transfer_date"],
        "risk_level": risk_level.value,
        "price_min": price_min,
        "price_max": price_max,
        "created_at": now,
        "fraud_score": fraud.fraud_score,
        "fraud_risk_level": fraud.risk_level,
        "anomaly_flags": fraud.anomaly_flags,
        "ml_anomaly_score": fraud.ml_anomaly_score,
    }

    db.table("searches").insert(search_record).execute()

    # Sync to Neo4j (fire-and-forget — non-blocking)
    asyncio.ensure_future(
        graph_service.sync_verification(
            plot_ref=plot_ref,
            owner=land_data["owner"],
            district=district,
            land_type=body.land_type.value,
            created_at=now,
        )
    )

    # 7. Return response
    return VerifyResponse(
        id=search_id,
        plot_reference=plot_ref,
        location=land_data["location"],
        owner=land_data["owner"],
        title_status=land_data["title_status"],
        encumbrances=land_data["encumbrances"],
        transfer_count=land_data["transfer_count"],
        last_transfer_date=land_data["last_transfer_date"],
        risk_level=risk_level,
        price_min=price_min,
        price_max=price_max,
        land_type=body.land_type.value,
        plot_size=body.plot_size,
        plot_size_unit=body.plot_size_unit,
        created_at=now,
        fraud_score=fraud.fraud_score,
        fraud_risk_level=fraud.risk_level,
        anomaly_flags=fraud.anomaly_flags,
        ml_anomaly_score=fraud.ml_anomaly_score,
    )


@router.get("/{search_id}", response_model=VerifyResponse)
async def get_verification(
    search_id: str,
    user: dict = Depends(get_current_user),
):
    """GET /verify/{id} — retrieve a specific verification result."""
    db = get_supabase()

    result = (
        db.table("searches")
        .select("*")
        .eq("id", search_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Search not found")

    row = result.data
    fraud_score = row.get("fraud_score", 0.0)
    fraud_risk_level = row.get("fraud_risk_level", "LOW")
    anomaly_flags = row.get("anomaly_flags") or []
    ml_anomaly_score = row.get("ml_anomaly_score", 0.0)
    return VerifyResponse(
        id=row["id"],
        plot_reference=row["plot_reference"],
        location=row["location"],
        owner=row["owner"],
        title_status=row["title_status"],
        encumbrances=row.get("encumbrances") or [],
        transfer_count=row["transfer_count"],
        last_transfer_date=row.get("last_transfer_date", ""),
        risk_level=row["risk_level"],
        price_min=row["price_min"],
        price_max=row["price_max"],
        land_type=row.get("land_type", ""),
        plot_size=row.get("plot_size", 0),
        plot_size_unit=row.get("plot_size_unit", "Decimals"),
        created_at=row["created_at"],
        fraud_score=fraud_score,
        fraud_risk_level=fraud_risk_level,
        anomaly_flags=anomaly_flags,
        ml_anomaly_score=ml_anomaly_score,
    )
