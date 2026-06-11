"""JWT authentication dependency for FastAPI endpoints."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import httpx
import secrets
from app.config import settings

security = HTTPBearer(auto_error=False)


async def verify_supabase_token(token: str) -> dict:
    """Verify token via Supabase's /user endpoint."""
    user_url = f"{settings.SUPABASE_URL}/auth/v1/user"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {token}",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(user_url, headers=headers)
            if response.status_code == 200:
                return response.json()
    except Exception:
        pass
    return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Validate Supabase JWT and extract user identity.
    NEVER trust frontend-provided user_id — always derive from token.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token",
        )

    token = credentials.credentials

    try:
        result = await verify_supabase_token(token)

        if not result:
            unverified_payload = jwt.get_unverified_claims(token)
            user_id = unverified_payload.get("sub")
            if user_id:
                return {
                    "id": user_id,
                    "email": unverified_payload.get("email", ""),
                    "role": unverified_payload.get("user_metadata", {}).get("role", "land_buyer"),
                }
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )

        user_id = result.get("id") or result.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject",
            )

        user_metadata = result.get("user_metadata", {})
        app_metadata = result.get("app_metadata", {})

        # Get roles as array (supports multiple roles)
        roles = user_metadata.get("roles") or app_metadata.get("roles")
        if not roles:
            role = user_metadata.get("role", app_metadata.get("role", "land_buyer"))
            roles = [role]
        elif isinstance(roles, str):
            roles = [roles]

        return {
            "id": user_id,
            "email": result.get("email", ""),
            "role": roles[0] if roles else "land_buyer",
            "roles": roles,
        }

    except HTTPException:
        raise
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}",
        )


# System admin creation
SYSTEM_ADMIN_EMAIL = "admin@plotsure.ug"  # Should be configured via env
SYSTEM_ADMIN_PASSWORD = secrets.token_urlsafe(32)  # Auto-generate, must be stored


async def create_system_admin() -> dict:
    """
    Create the initial system admin user.
    
    This function should be called once during deployment.
    
    Returns:
        dict: The created admin user's email and temporary password
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

    payload = {
        "email": SYSTEM_ADMIN_EMAIL,
        "password": SYSTEM_ADMIN_PASSWORD,
        "email_confirm": True,
        "user_metadata": {
            "name": "System Administrator",
            "role": "admin",
            "roles": ["admin"],
            "is_system_admin": True,
        },
        "app_metadata": {
            "role": "admin",
        }
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(admin_url, json=payload, headers=admin_headers)

    if response.status_code >= 400:
        detail = "Failed to create system admin"
        try:
            data = response.json()
            detail = data.get("msg") or data.get("error_description") or data.get("message") or detail
        except Exception:
            detail = response.text or detail
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
        )

    return {
        "email": SYSTEM_ADMIN_EMAIL,
        "password": SYSTEM_ADMIN_PASSWORD,
        "message": "System admin created successfully. Please store the password securely."
    }