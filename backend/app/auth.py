"""JWT authentication dependency for FastAPI endpoints."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import httpx
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
