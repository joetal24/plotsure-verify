"""
Inquiries endpoints:
  POST  /listings/{listing_id}/inquiries      - Buyer submits inquiry (public)
  GET   /listings/{listing_id}/inquiries       - Get inquiries for a listing (seller)
  GET   /inquiries/my                          - Get all inquiries for seller's listings
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.auth import get_current_user
from app.database import get_supabase

router = APIRouter(tags=["Inquiries"])


class InquiryCreate(BaseModel):
    buyer_name: str
    buyer_email: str
    buyer_phone: Optional[str] = None
    message: Optional[str] = None


class InquiryResponse(BaseModel):
    id: str
    listing_id: str
    buyer_name: str
    buyer_email: str
    buyer_phone: Optional[str] = None
    message: Optional[str] = None
    created_at: str


class InquiriesResponse(BaseModel):
    inquiries: list[InquiryResponse]
    total: int


def row_to_inquiry(row: dict) -> InquiryResponse:
    return InquiryResponse(
        id=row.get("id", ""),
        listing_id=row.get("listing_id", ""),
        buyer_name=row.get("buyer_name", ""),
        buyer_email=row.get("buyer_email", ""),
        buyer_phone=row.get("buyer_phone"),
        message=row.get("message"),
        created_at=row.get("created_at", ""),
    )


@router.post("/listings/{listing_id}/inquiries", response_model=InquiryResponse, status_code=201)
async def create_inquiry(listing_id: str, body: InquiryCreate):
    """Submit an inquiry on a listing (public — no auth required so buyers can inquire)."""
    db = get_supabase()

    listing = db.table("land_listings").select("id").eq("id", listing_id).single().execute()
    if not listing.data:
        raise HTTPException(status_code=404, detail="Listing not found")

    inquiry_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    result = db.table("inquiries").insert({
        "id": inquiry_id,
        "listing_id": listing_id,
        "buyer_name": body.buyer_name,
        "buyer_email": body.buyer_email,
        "buyer_phone": body.buyer_phone,
        "message": body.message,
        "created_at": now,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to submit inquiry")

    return row_to_inquiry(result.data[0])


@router.get("/listings/{listing_id}/inquiries", response_model=InquiriesResponse)
async def get_listing_inquiries(
    listing_id: str,
    user: dict = Depends(get_current_user),
):
    """Get inquiries for a specific listing (seller only)."""
    db = get_supabase()
    user_id = user["id"]

    listing = db.table("land_listings").select("user_id").eq("id", listing_id).single().execute()
    if not listing.data:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.data[0].get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Not your listing")

    result = (
        db.table("inquiries")
        .select("*")
        .eq("listing_id", listing_id)
        .order("created_at", desc=True)
        .execute()
    )

    inquiries = [row_to_inquiry(r) for r in (result.data or [])]
    return InquiriesResponse(inquiries=inquiries, total=len(inquiries))


@router.get("/inquiries/my", response_model=InquiriesResponse)
async def get_my_inquiries(
    user: dict = Depends(get_current_user),
):
    """Get all inquiries across the seller's listings."""
    db = get_supabase()
    user_id = user["id"]

    result = (
        db.table("inquiries")
        .select("*, land_listings!inner(user_id, county, village, specific_area)")
        .eq("land_listings.user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )

    inquiries = []
    for row in result.data or []:
        listing = row.pop("land_listings", {})
        inquiries.append(row_to_inquiry(row))

    return InquiriesResponse(inquiries=inquiries, total=len(inquiries))
