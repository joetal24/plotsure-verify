"""Auth endpoints for local development registration."""
import httpx
from fastapi import APIRouter, HTTPException, status

from app.config import settings
from app.schemas import AuthRegisterRequest, AuthRegisterResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=AuthRegisterResponse)
async def register_user(body: AuthRegisterRequest):
    """
    Create a confirmed Supabase auth user using the service role key.

    This is intended for local development so users can register without
    relying on email confirmation quotas.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase admin auth is not configured",
        )

    url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/admin/users"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    user_roles = body.roles if body.roles else [body.role]
    payload = {
        "email": body.email,
        "password": body.password,
        "email_confirm": True,
        "user_metadata": {
            "name": body.name,
            "role": body.role,
            "roles": user_roles,
        },
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(url, json=payload, headers=headers)

    if response.status_code >= 400:
        detail = "Unable to create user"
        try:
            data = response.json()
            detail = data.get("msg") or data.get("error_description") or data.get("message") or detail
        except Exception:
            detail = response.text or detail

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )

    data = response.json()
    user = data.get("user") or data

    return AuthRegisterResponse(
        user_id=user.get("id", ""),
        email=user.get("email", body.email),
        confirmed=True,
    )