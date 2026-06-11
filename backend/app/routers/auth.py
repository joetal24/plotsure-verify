"""Auth endpoints for local development registration and login."""
import httpx
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.config import settings
from app.schemas import AuthRegisterRequest, AuthRegisterResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


class AuthLoginRequest(BaseModel):
    email: str
    password: str


class AuthLoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    user_id: str
    email: str


@router.post("/login", response_model=AuthLoginResponse)
async def login_user(body: AuthLoginRequest):
    """
    Authenticate a user via Supabase and return session tokens.
    Proxies through the backend so the browser never hits Supabase directly.
    """
    url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    }
    payload = {"email": body.email, "password": body.password}

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(url, json=payload, headers=headers)

    if response.status_code >= 400:
        detail = "Invalid email or password"
        try:
            data = response.json()
            detail = data.get("msg") or data.get("error_description") or data.get("message") or detail
        except Exception:
            detail = response.text or detail
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)

    data = response.json()
    return AuthLoginResponse(
        access_token=data["access_token"],
        refresh_token=data["refresh_token"],
        user_id=data["user"]["id"],
        email=data["user"]["email"],
    )


@router.post("/register", response_model=AuthRegisterResponse)
async def register_user(body: AuthRegisterRequest):
    """
    Create a confirmed Supabase auth user using the service role key.
    Admin role is no longer available via registration - only system admin exists.
    The DB trigger handle_new_user inserts the role into public.users.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase admin auth is not configured",
        )

    admin_headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }

    admin_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/admin/users"

    # Admin role is no longer available via registration - only system admin exists
    # Remove admin from available roles
    if "admin" in body.roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin role can only be assigned via system admin creation",
        )

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
        response = await client.post(admin_url, json=payload, headers=admin_headers)

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
    user_id = user.get("id", "")

    return AuthRegisterResponse(
        user_id=user_id,
        email=user.get("email", body.email),
        confirmed=True,
    )