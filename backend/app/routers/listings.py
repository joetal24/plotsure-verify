"""
Land Listings endpoints:
  GET  /listings       - Get all ACTIVE listings (for buyers)
  GET  /listings/my    - Get seller's own listings
  POST /listings       - Create new listing (seller)
  PUT  /listings/{id}  - Update listing (seller)
  PATCH /listings/{id}/status - Update listing status (seller)
  POST /listings/{id}/views - Increment view count
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.auth import get_current_user
from app.database import get_supabase
from app.schemas import (
    ListingCreate,
    ListingUpdate,
    ListingStatusUpdate,
    ListingResponse,
    ListingsResponse,
    ListingStatus,
)

router = APIRouter(prefix="/listings", tags=["Listings"])

LISTINGS_PER_PAGE = 20


def row_to_listing_response(row: dict) -> ListingResponse:
    """Convert database row to ListingResponse."""
    return ListingResponse(
        id=row.get("id", ""),
        user_id=row.get("user_id", ""),
        search_id=row.get("search_id"),
        listing_status=row.get("listing_status", "PENDING"),
        county=row.get("county"),
        village=row.get("village"),
        specific_area=row.get("specific_area"),
        price_min=row.get("price_min"),
        price_max=row.get("price_max"),
        description=row.get("description"),
        contact_preference=row.get("contact_preference", "both"),
        views_count=row.get("views_count", 0),
        created_at=row.get("created_at", ""),
        updated_at=row.get("updated_at", ""),
        latitude=row.get("latitude"),
        longitude=row.get("longitude"),
        district=row.get("district"),
        parish=row.get("parish"),
        area_acres=row.get("area_acres"),
        plot_reference=row.get("plot_reference"),
        location=row.get("location"),
        owner=row.get("owner"),
        title_status=row.get("title_status"),
        land_type=row.get("land_type"),
        plot_size=row.get("plot_size"),
        plot_size_unit=row.get("plot_size_unit"),
        risk_level=row.get("risk_level"),
        fraud_score=row.get("fraud_score"),
    )


@router.get("", response_model=ListingsResponse)
async def get_listings(
    page: int = Query(1, ge=1),
    limit: int = Query(LISTINGS_PER_PAGE, ge=1, le=100),
):
    """
    Get all ACTIVE listings (for buyers).
    Includes joined data from verification if available.
    """
    db = get_supabase()
    offset = (page - 1) * limit

    result = (
        db.table("land_listings")
        .select("*, searches(plot_reference, location, owner, title_status, land_type, plot_size, plot_size_unit, risk_level, fraud_score)")
        .eq("listing_status", "ACTIVE")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    count_result = (
        db.table("land_listings")
        .select("id", count="exact")
        .eq("listing_status", "ACTIVE")
        .execute()
    )

    listings = []
    for row in result.data:
        search = row.pop("searches", None)
        if search:
            row["plot_reference"] = search.get("plot_reference")
            row["location"] = search.get("location")
            row["owner"] = search.get("owner")
            row["title_status"] = search.get("title_status")
            row["land_type"] = search.get("land_type")
            row["plot_size"] = search.get("plot_size")
            row["plot_size_unit"] = search.get("plot_size_unit")
            row["risk_level"] = search.get("risk_level")
            row["fraud_score"] = search.get("fraud_score")
        listings.append(row_to_listing_response(row))

    return ListingsResponse(
        listings=listings,
        total=count_result.count or 0,
        page=page,
    )


@router.get("/my", response_model=ListingsResponse)
async def get_my_listings(
    user: dict = Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(LISTINGS_PER_PAGE, ge=1, le=100),
    status: Optional[ListingStatus] = None,
):
    """
    Get seller's own listings.
    """
    db = get_supabase()
    user_id = user["id"]
    offset = (page - 1) * limit

    query = (
        db.table("land_listings")
        .select("*, searches(plot_reference, location, owner, title_status, land_type, plot_size, plot_size_unit, risk_level, fraud_score)")
        .eq("user_id", user_id)
    )

    if status:
        query = query.eq("listing_status", status.value)

    result = (
        query.order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    count_query = (
        db.table("land_listings")
        .select("id", count="exact")
        .eq("user_id", user_id)
    )
    if status:
        count_query = count_query.eq("listing_status", status.value)

    count_result = count_query.execute()

    listings = []
    for row in result.data:
        search = row.pop("searches", None)
        if search:
            row["plot_reference"] = search.get("plot_reference")
            row["location"] = search.get("location")
            row["owner"] = search.get("owner")
            row["title_status"] = search.get("title_status")
            row["land_type"] = search.get("land_type")
            row["plot_size"] = search.get("plot_size")
            row["plot_size_unit"] = search.get("plot_size_unit")
            row["risk_level"] = search.get("risk_level")
            row["fraud_score"] = search.get("fraud_score")
        listings.append(row_to_listing_response(row))

    return ListingsResponse(
        listings=listings,
        total=count_result.count or 0,
        page=page,
    )


@router.post("", response_model=ListingResponse, status_code=201)
async def create_listing(
    body: ListingCreate,
    user: dict = Depends(get_current_user),
):
    """
    Create a new listing (seller).
    """
    db = get_supabase()
    user_id = user["id"]

    listing_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    listing_record = {
        "id": listing_id,
        "user_id": user_id,
        "search_id": body.search_id,
        "listing_status": body.listing_status.value,
        "county": body.county,
        "village": body.village,
        "specific_area": body.specific_area,
        "price_min": body.price_min,
        "price_max": body.price_max,
        "description": body.description,
        "contact_preference": body.contact_preference.value,
        "latitude": body.latitude,
        "longitude": body.longitude,
        "district": body.district,
        "parish": body.parish,
        "area_acres": body.area_acres,
        "created_at": now,
        "updated_at": now,
    }

    result = db.table("land_listings").insert(listing_record).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create listing")

    row = result.data[0]
    return row_to_listing_response(row)


@router.put("/{listing_id}", response_model=ListingResponse)
async def update_listing(
    listing_id: str,
    body: ListingUpdate,
    user: dict = Depends(get_current_user),
):
    """
    Update a listing (seller).
    """
    db = get_supabase()
    user_id = user["id"]

    existing = (
        db.table("land_listings")
        .select("*")
        .eq("id", listing_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not existing.data:
        raise HTTPException(status_code=404, detail="Listing not found")

    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow().isoformat()

    result = (
        db.table("land_listings")
        .update(update_data)
        .eq("id", listing_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update listing")

    row = result.data[0]
    return row_to_listing_response(row)


@router.patch("/{listing_id}/status", response_model=ListingResponse)
async def update_listing_status(
    listing_id: str,
    body: ListingStatusUpdate,
    user: dict = Depends(get_current_user),
):
    """
    Update listing status (e.g., mark as SOLD).
    """
    db = get_supabase()
    user_id = user["id"]

    existing = (
        db.table("land_listings")
        .select("*")
        .eq("id", listing_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not existing.data:
        raise HTTPException(status_code=404, detail="Listing not found")

    result = (
        db.table("land_listings")
        .update({
            "listing_status": body.listing_status.value,
            "updated_at": datetime.utcnow().isoformat(),
        })
        .eq("id", listing_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update status")

    row = result.data[0]
    return row_to_listing_response(row)


@router.post("/{listing_id}/views", response_model=ListingResponse)
async def increment_views(
    listing_id: str,
):
    """
    Increment view count for a listing (public endpoint).
    """
    db = get_supabase()

    existing = (
        db.table("land_listings")
        .select("*")
        .eq("id", listing_id)
        .single()
        .execute()
    )

    if not existing.data:
        raise HTTPException(status_code=404, detail="Listing not found")

    current_views = existing.data[0].get("views_count", 0)

    result = (
        db.table("land_listings")
        .update({
            "views_count": current_views + 1,
            "updated_at": datetime.utcnow().isoformat(),
        })
        .eq("id", listing_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update views")

    row = result.data[0]
    return row_to_listing_response(row)


@router.get("/{listing_id}", response_model=ListingResponse)
async def get_listing(listing_id: str):
    """
    Get a single listing by ID (public).
    """
    db = get_supabase()

    result = (
        db.table("land_listings")
        .select("*, searches(plot_reference, location, owner, title_status, land_type, plot_size, plot_size_unit, risk_level, fraud_score)")
        .eq("id", listing_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Listing not found")

    row = result.data
    search = row.pop("searches", None)
    if search:
        row["plot_reference"] = search.get("plot_reference")
        row["location"] = search.get("location")
        row["owner"] = search.get("owner")
        row["title_status"] = search.get("title_status")
        row["land_type"] = search.get("land_type")
        row["plot_size"] = search.get("plot_size")
        row["plot_size_unit"] = search.get("plot_size_unit")
        row["risk_level"] = search.get("risk_level")
        row["fraud_score"] = search.get("fraud_score")

    return row_to_listing_response(row)