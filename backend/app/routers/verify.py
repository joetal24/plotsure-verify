"""
Verification endpoints — hybrid async fraud detection:
   POST /verify                      — fast-path + publish to Kafka (fallback to sync)
   GET  /verify/{id}                 — full verification detail
   GET  /verify/{id}/status          — fraud check status (processing/verified/flagged/failed)
"""
import uuid
import asyncio
import time
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.auth import get_current_user
from app.database import get_supabase
from app.schemas import (
    FraudStatus,
    VerifyRequest,
    PreliminaryVerifyResponse,
    VerifyResponse,
    VerificationStatusResponse,
)
from app.services.verification import (
    fetch_land_data,
    compute_risk,
    estimate_price,
    build_plot_reference,
)
from app.services.kafka_producer import publish_fraud_check
from app.services.certificate_service import generate_certificate_pdf, generate_certificate_hash
from app.config import settings
from fastapi.responses import StreamingResponse
import io

router = APIRouter(prefix="/verify", tags=["Verification"])
limiter = Limiter(key_func=get_remote_address)


@router.post("", response_model=PreliminaryVerifyResponse)
@limiter.limit(settings.VERIFY_RATE_LIMIT)
async def verify_plot(
    request: Request,
    body: VerifyRequest,
    user: dict = Depends(get_current_user),
):
    """
    Hybrid async verification:
    1. Authenticate + validate
    2. Check cache
    3. Fetch land data + compute risk/price (fast path)
    4. Write to Supabase with fraud_status='pending'
    5. Call publish_fraud_check() — Kafka or sync fallback
    6. Return immediately with preliminary_verified status (<500ms)
    """
    start = time.time()
    db = get_supabase()
    user_id = user["id"]

    plot_ref = build_plot_reference(body.model_dump())

    # ── Cache check ──
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
        elapsed = (time.time() - start) * 1000
        return PreliminaryVerifyResponse(
            verification_id=row["id"],
            plot_id=plot_ref,
            status="preliminary_verified",
            processing_time_ms=round(elapsed, 1),
        )

    # ── Fast path: fetch + risk + price ──
    land_data = fetch_land_data(plot_ref)
    district = body.district or land_data["location"]

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

    # ── Store in Supabase ──
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
        "fraud_status": FraudStatus.PENDING.value,
        "fraud_score": 0.0,
        "fraud_risk_level": "LOW",
        "anomaly_flags": [],
        "ml_anomaly_score": 0.0,
    }

    db.table("searches").insert(search_record).execute()

    # ── Publish fraud check (Kafka with sync fallback) ──
    # Wrapped in try/except — never breaks the API
    try:
        publish_fraud_check(
            verification_id=search_id,
            plot_id=plot_ref,
            owner_name=land_data["owner"],
            national_id=body.national_id or "",
            amount=body.asking_price or (price_min + price_max) / 2,
            date=now,
            source="plotsure",
        )
    except Exception as exc:
        # Last-resort safety net — log but never fail the response
        logger = __import__("logging").getLogger(__name__)
        logger.error("Fraud check publish failed for %s: %s", search_id, exc)

    elapsed = (time.time() - start) * 1000
    return PreliminaryVerifyResponse(
        verification_id=search_id,
        plot_id=plot_ref,
        status="preliminary_verified",
        processing_time_ms=round(elapsed, 1),
    )


@router.get("/certificate/{search_id}")
async def get_certificate_pdf(
    search_id: str,
    user: dict = Depends(get_current_user),
):
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
    pdf_bytes = generate_certificate_pdf(result.data)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=certificate-{search_id}.pdf"},
    )


@router.get("/certificate/check/{hash}")
async def check_certificate_hash(hash: str):
    db = get_supabase()
    result = db.table("searches").select("*").limit(1000).execute()
    for row in result.data or []:
        if generate_certificate_hash(row) == hash:
            created_raw = row.get("created_at", "")
            try:
                dt = datetime.fromisoformat(created_raw.replace("Z", "+00:00"))
                verified_at = dt.isoformat()
            except (ValueError, AttributeError):
                verified_at = str(created_raw)
            return {
                "valid": True,
                "plot_number": row.get("plot_reference"),
                "fraud_risk_label": row.get("fraud_risk_level") or row.get("risk_level"),
                "verified_at": verified_at,
            }
    return {"valid": False}


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
        fraud_score=row.get("fraud_score", 0.0),
        fraud_risk_level=row.get("fraud_risk_level", "LOW"),
        anomaly_flags=row.get("anomaly_flags") or [],
        ml_anomaly_score=row.get("ml_anomaly_score", 0.0),
        fraud_status=row.get("fraud_status", FraudStatus.PENDING),
    )


@router.get("/{search_id}/status", response_model=VerificationStatusResponse)
async def get_verification_status(
    search_id: str,
    user: dict = Depends(get_current_user),
):
    """
    GET /verify/{id}/status — lightweight fraud check status.

    Returns one of: processing, verified, flagged, failed
    Includes fraud_details when status is flagged.
    """
    db = get_supabase()

    result = (
        db.table("searches")
        .select("id,fraud_status,neo4j_result,created_at")
        .eq("id", search_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Search not found")

    row = result.data
    raw_status = row.get("fraud_status", "pending")

    # Map DB status to API response status
    status_map = {
        "pending": "processing",
        "processing": "processing",
        "verified": "verified",
        "flagged": "flagged",
        "failed": "failed",
    }
    api_status = status_map.get(raw_status, "processing")

    fraud_details = row.get("neo4j_result")
    if isinstance(fraud_details, str):
        import json
        fraud_details = json.loads(fraud_details)

    return VerificationStatusResponse(
        verification_id=row["id"],
        status=api_status,
        fraud_details=fraud_details if api_status == "flagged" else None,
        created_at=row["created_at"],
        updated_at=row.get("created_at"),
    )
