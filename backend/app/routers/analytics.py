"""
Market analytics endpoints for the buyer dashboard insights section.
Uses service_role key to bypass RLS for aggregated data.
"""
from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
from typing import Optional

from app.auth import get_current_user
from app.database import get_supabase
from app.schemas import RiskLevel

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/market-insights")
async def market_insights(user: dict = Depends(get_current_user)):
    """Return aggregated market analytics from the searches table."""
    db = get_supabase()
    now = datetime.utcnow()
    six_months_ago = (now - timedelta(days=180)).isoformat()

    # Top 5 most searched districts (based on location field)
    top_districts = (
        db.table("searches")
        .select("location")
        .execute()
    )
    location_counts: dict[str, int] = {}
    for row in top_districts.data:
        loc = row.get("location")
        if loc:
            location_counts[loc] = location_counts.get(loc, 0) + 1
    top5 = sorted(location_counts.items(), key=lambda x: -x[1])[:5]
    top_districts_result = [
        {"district": d, "search_count": c} for d, c in top5
    ]

    # Risk level distribution among verified (non-NULL fraud_risk_level)
    risk_dist = (
        db.table("searches")
        .select("fraud_risk_level", count="exact")
        .not_.is_("fraud_risk_level", "null")
        .execute()
    )
    risk_counts: dict[str, int] = {"LOW": 0, "MEDIUM": 0, "HIGH": 0}
    total_verified = 0
    for row in risk_dist.data:
        rl = row.get("fraud_risk_level")
        if rl in risk_counts:
            risk_counts[rl] += 1
            total_verified += 1

    # Search volume by month for the last 6 months
    monthly_data = (
        db.table("searches")
        .select("created_at")
        .gte("created_at", six_months_ago)
        .execute()
    )
    monthly_counts: dict[str, int] = {}
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    for row in monthly_data.data:
        ca = row.get("created_at")
        if ca:
            try:
                dt = datetime.fromisoformat(ca.replace("Z", "+00:00"))
                key = f"{dt.year}-{dt.month:02d}"
                monthly_counts[key] = monthly_counts.get(key, 0) + 1
            except (ValueError, TypeError):
                pass

    # Sort and format monthly results
    sorted_months = sorted(monthly_counts.items())
    monthly_result = [
        {
            "month": month_names[int(k.split("-")[1]) - 1],
            "count": c
        }
        for k, c in sorted_months
    ]

    # Most common plot_size_unit
    unit_data = (
        db.table("searches")
        .select("plot_size_unit")
        .execute()
    )
    unit_counts: dict[str, int] = {}
    for row in unit_data.data:
        unit = row.get("plot_size_unit") or "Unknown"
        unit_counts[unit] = unit_counts.get(unit, 0) + 1
    top_unit = sorted(unit_counts.items(), key=lambda x: -x[1])
    top_unit_result = [{"unit": u, "count": c} for u, c in top_unit[:5]]

    # Total search count
    total_result = (
        db.table("searches")
        .select("id", count="exact")
        .execute()
    )
    total_count = total_result.count or 0

    return {
        "total_searches": total_count,
        "top_districts": top_districts_result,
        "risk_distribution": {
            "LOW": risk_counts["LOW"],
            "MEDIUM": risk_counts["MEDIUM"],
            "HIGH": risk_counts["HIGH"],
            "total_verified": total_verified,
        },
        "monthly_volume": monthly_result,
        "top_plot_units": top_unit_result,
    }
