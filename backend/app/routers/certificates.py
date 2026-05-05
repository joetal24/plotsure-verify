"""
Certificate endpoints per ANTIGRAVITY.md API contract:
  POST /certificates/{search_id}
  GET  /certificates/{id}
  GET  /certificates/verify/{hash}
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.config import settings
from app.database import get_supabase
from app.schemas import CertificateResponse, CertificateVerifyResponse, VerifyResponse
from app.services.certificate import generate_certificate_hash, generate_certificate_pdf

router = APIRouter(prefix="/certificates", tags=["Certificates"])


@router.post("/{search_id}", response_model=CertificateResponse)
async def create_certificate(
    search_id: str,
    user: dict = Depends(get_current_user),
):
    """
    Generate certificate per ANTIGRAVITY.md:
    1. Take verification result (structured JSON)
    2. Normalize into canonical format
    3. Generate SHA-256 hash
    4. Store hash in DB
    5. Generate PDF
    6. Upload to Supabase Storage
    """
    db = get_supabase()
    user_id = user["id"]

    # Get the search result
    search = (
        db.table("searches")
        .select("*")
        .eq("id", search_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not search.data:
        raise HTTPException(status_code=404, detail="Search not found")

    # Check if certificate already exists for this search
    existing = (
        db.table("certificates")
        .select("*")
        .eq("search_id", search_id)
        .limit(1)
        .execute()
    )

    if existing.data:
        row = existing.data[0]
        return CertificateResponse(
            id=row["id"],
            search_id=row["search_id"],
            user_id=row["user_id"],
            hash=row["hash"],
            file_url=row.get("file_url"),
            created_at=row["created_at"],
        )

    # 2-3. Normalize + generate hash
    cert_hash = generate_certificate_hash(search.data)

    # 4. Store in DB
    cert_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    # 5. Generate PDF
    pdf_bytes = generate_certificate_pdf(
        certificate_id=cert_id,
        search_data=search.data,
        verification_url=settings.BACKEND_PUBLIC_URL,
    )

    # 6. Upload PDF to Supabase Storage
    file_path = f"certificates/{user_id}/{cert_id}.pdf"
    file_url = None
    try:
        db.storage.from_("certificates").upload(
            file_path, pdf_bytes, {"content-type": "application/pdf"}
        )
        file_url = db.storage.from_("certificates").get_public_url(file_path)
    except Exception:
        # Storage upload failed — continue without file_url
        pass

    cert_record = {
        "id": cert_id,
        "search_id": search_id,
        "user_id": user_id,
        "hash": cert_hash,
        "file_url": file_url,
        "created_at": now,
    }
    db.table("certificates").insert(cert_record).execute()

    return CertificateResponse(**cert_record)


@router.get("/verify/{cert_hash}", response_model=CertificateVerifyResponse)
async def verify_certificate(cert_hash: str):
    """
    GET /certificates/verify/{hash}
    Public endpoint — no auth required.
    Returns validity (true/false) + associated search data.
    """
    db = get_supabase()

    cert = (
        db.table("certificates")
        .select("*")
        .eq("hash", cert_hash)
        .limit(1)
        .execute()
    )

    if not cert.data:
        return CertificateVerifyResponse(valid=False)

    row = cert.data[0]
    cert_response = CertificateResponse(
        id=row["id"],
        search_id=row["search_id"],
        user_id=row["user_id"],
        hash=row["hash"],
        file_url=row.get("file_url"),
        created_at=row["created_at"],
    )

    # Get associated search
    search = (
        db.table("searches")
        .select("*")
        .eq("id", row["search_id"])
        .single()
        .execute()
    )

    search_response = None
    if search.data:
        s = search.data
        search_response = VerifyResponse(
            id=s["id"],
            plot_reference=s["plot_reference"],
            location=s["location"],
            owner=s["owner"],
            title_status=s["title_status"],
            encumbrances=s.get("encumbrances") or [],
            transfer_count=s["transfer_count"],
            last_transfer_date=s.get("last_transfer_date", ""),
            risk_level=s["risk_level"],
            price_min=s["price_min"],
            price_max=s["price_max"],
            land_type=s.get("land_type", ""),
            plot_size=s.get("plot_size", 0),
            plot_size_unit=s.get("plot_size_unit", "Decimals"),
            created_at=s["created_at"],
        )

    return CertificateVerifyResponse(
        valid=True,
        certificate=cert_response,
        search=search_response,
    )


@router.get("/{cert_id}", response_model=CertificateResponse)
async def get_certificate(
    cert_id: str,
    user: dict = Depends(get_current_user),
):
    """GET /certificates/{id} — retrieve a specific certificate."""
    db = get_supabase()

    result = (
        db.table("certificates")
        .select("*")
        .eq("id", cert_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Certificate not found")

    row = result.data
    return CertificateResponse(
        id=row["id"],
        search_id=row["search_id"],
        user_id=row["user_id"],
        hash=row["hash"],
        file_url=row.get("file_url"),
        created_at=row["created_at"],
    )
