"""
Admin endpoints — system management.
Protected by admin role check.
Admin is a pre-created system role, not available in user registration.
"""
import asyncio
import json
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Optional

from app.auth import get_current_user, create_system_admin
from app.database import get_supabase
from app.schemas import AdminRetryResponse
from app.services.fraud_detection import score_fraud
from app.services.graph import graph_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])


def _require_admin(user: dict) -> None:
    """Reject non-admin users."""
    roles = user.get("roles", [user.get("role", "")])
    if isinstance(roles, str):
        roles = [roles]
    if "admin" not in [r.lower() for r in roles]:
        raise HTTPException(status_code=403, detail="Admin access required")


# System admin creation request
SYSTEM_ADMIN_EMAIL = "admin@plotsure.ug"  # Change this to your preferred admin email


@router.post("/system-admin/create", response_model=dict)
async def create_system_admin_endpoint(
    user: dict = Depends(get_current_user),
    background_tasks: BackgroundTasks = None
):
    """
    POST /admin/system-admin/create

    Creates the initial system admin user. Should be run once during deployment.
    Requires the currently authenticated user to be a system admin.
    """
    _require_admin(user)
    return await create_system_admin()


@router.post("/retry/{verification_id}", response_model=AdminRetryResponse)
async def admin_retry_fraud_check(
    verification_id: str,
    user: dict = Depends(get_current_user),
):
    """
    POST /admin/retry/{verification_id}

    Manually retry a failed fraud check. Requires admin role.
    Re-runs Neo4j + ML checks and updates the searches table.
    """
    _require_admin(user)
    db = get_supabase()

    # Fetch the search record
    result = (
        db.table("searches")
        .select("*")
        .eq("id", verification_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Verification not found")

    row = result.data
    plot_ref = row.get("plot_reference", "")
    owner = row.get("owner", "")

    # Run checks
    neo4j_flagged = False
    ml_flagged = False
    fraud_details = {}

    try:
        chain = await graph_service.get_ownership_chain(plot_ref)
        ownership = chain.get("ownership", [])
        persons_seen = {}
        circular_owners = []
        for record in ownership:
            person = record.get("person", "")
            if person in persons_seen:
                circular_owners.append(person)
            persons_seen[person] = record.get("from_date", "")
        neo4j_flagged = len(circular_owners) > 0
        fraud_details["neo4j"] = {
            "ownership_count": len(ownership),
            "circular_owners": list(set(circular_owners)),
        }
        if neo4j_flagged:
            fraud_details["neo4j"]["flagged"] = True
    except Exception as exc:
        fraud_details["neo4j"] = {"error": str(exc)}
        raise HTTPException(status_code=500, detail=f"Neo4j check failed: {exc}")

    fraud = score_fraud(
        plot_size=row.get("plot_size", 0),
        asking_price=(row.get("price_min", 0) + row.get("price_max", 0)) / 2,
        district=row.get("location", ""),
        land_type=row.get("land_type", ""),
        verification_count=row.get("transfer_count", 0),
        days_since_last_transfer=365,
    )
    ml_flagged = fraud.fraud_score >= 0.4
    fraud_details["ml"] = {
        "score": fraud.fraud_score,
        "risk_level": fraud.risk_level,
        "anomaly_flags": fraud.anomaly_flags,
    }

    if neo4j_flagged and ml_flagged:
        risk_level = "HIGH"
        fraud_status = "flagged"
    elif neo4j_flagged or ml_flagged:
        risk_level = "MEDIUM"
        fraud_status = "flagged"
    else:
        risk_level = "LOW"
        fraud_status = "verified"

    db.table("searches").update({
        "fraud_status": fraud_status,
        "neo4j_result": json.dumps(fraud_details),
        "fraud_risk_level": risk_level,
        "fraud_score": fraud.fraud_score,
        "anomaly_flags": fraud.anomaly_flags,
        "ml_anomaly_score": fraud.ml_anomaly_score,
    }).eq("id", verification_id).execute()

    # Update DLQ record (best-effort — table may not exist)
    try:
        existing_failure = (
            db.table("fraud_check_failures")
            .select("retry_count")
            .eq("verification_id", verification_id)
            .single()
            .execute()
        )
        current_retry_count = existing_failure.data.get("retry_count", 0) if existing_failure.data else 0
        db.table("fraud_check_failures").update({
            "retried_at": datetime.utcnow().isoformat(),
            "retry_count": current_retry_count + 1,
        }).eq("verification_id", verification_id).execute()
    except Exception:
        logger.warning("DLQ record update skipped for %s", verification_id)

    logger.info(
        "Admin retry complete — verification_id=%s status=%s risk=%s",
        verification_id,
        fraud_status,
        risk_level,
    )

    return AdminRetryResponse(
        verification_id=verification_id,
        status=fraud_status,
        message=f"Fraud check retry complete. Status: {fraud_status}",
    )
