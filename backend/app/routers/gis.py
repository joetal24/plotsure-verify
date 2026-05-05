"""GIS geocoding endpoints using OpenStreetMap Nominatim."""
from typing import Optional

import httpx
from fastapi import APIRouter

from app.schemas import GeocodeResponse

router = APIRouter(prefix="/api/v1/gis", tags=["GIS"])


@router.get("/geocode", response_model=GeocodeResponse)
async def geocode(district: str, county: Optional[str] = None):
    query = ", ".join([part for part in [county, district, "Uganda"] if part])
    params = {
        "q": query,
        "format": "json",
        "limit": 1,
        "polygon_geojson": 1,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(
            "https://nominatim.openstreetmap.org/search",
            params=params,
            headers={"User-Agent": "PlotSure/1.0"},
        )
        res.raise_for_status()
        data = res.json()

    if not data:
        return GeocodeResponse(lat=1.3733, lng=32.2903, display_name="Uganda")

    top = data[0]
    polygon = top.get("geojson") if top.get("geojson") else None
    return GeocodeResponse(
        lat=float(top["lat"]),
        lng=float(top["lon"]),
        display_name=top.get("display_name", query),
        polygon_geojson=polygon,
    )
