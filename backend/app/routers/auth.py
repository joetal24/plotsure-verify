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
    The DB trigger handle_new_user inserts the role into public.users,
    but the column has a CHECK constraint that only allows land_buyer/admin.
    We work around this by creating the user with land_buyer (trigger OK),
    then updating the auth user metadata to the desired role.
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

    # Step 1: Create auth user with land_buyer role so the DB trigger succeeds
    admin_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/admin/users"
    user_roles = body.roles if body.roles else [body.role]
    payload = {
        "email": body.email,
        "password": body.password,
        "email_confirm": True,
        "user_metadata": {
            "name": body.name,
            "role": "land_buyer",
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

    # Step 2: Update auth user metadata to the actual desired role
    if body.role != "land_buyer":
        update_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/admin/users/{user_id}"
        update_payload = {
            "user_metadata": {
                "name": body.name,
                "role": body.role,
                "roles": user_roles,
            }
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.put(update_url, json=update_payload, headers=admin_headers)

    return AuthRegisterResponse(
        user_id=user_id,
        email=user.get("email", body.email),
        confirmed=True,
    )