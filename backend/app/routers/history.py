"""
History endpoint per ANTIGRAVITY.md API contract:
  GET /history
"""
from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.database import get_supabase
from app.schemas import SearchHistoryItem

router = APIRouter(tags=["History"])


@router.get("/history", response_model=list[SearchHistoryItem])
async def get_search_history(
    user: dict = Depends(get_current_user),
):
    """GET /history — returns all searches for the authenticated user."""
    db = get_supabase()

    results = (
        db.table("searches")
        .select("id, plot_reference, location, risk_level, price_min, price_max, created_at")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )

    return [
        SearchHistoryItem(
            id=row["id"],
            plot_reference=row["plot_reference"],
            location=row["location"],
            risk_level=row["risk_level"],
            price_min=row["price_min"],
            price_max=row["price_max"],
            created_at=row["created_at"],
        )
        for row in (results.data or [])
    ]
