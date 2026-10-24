"""
core.deps — FastAPI dependencies (currently: JWT auth `get_current_user`).
"""
import jwt
from bson import ObjectId
from fastapi import HTTPException, Request, Depends

from .db import db
from .security import JWT_SECRET, JWT_ALGORITHM


async def get_current_user(request: Request) -> dict:
    """JWT auth dependency. Reads `Authorization: Bearer <token>` header."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    token_str = auth[7:].strip()
    try:
        payload = jwt.decode(token_str, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")

        # Token revocation check via blacklist (logout / session invalidation)
        jti = payload.get("jti")
        if jti:
            blacklisted = await db.token_blacklist.find_one({"jti": jti})
            if blacklisted:
                raise HTTPException(401, "Token has been revoked")

        # Exclude large binary/base64 fields to minimize payload size & latency on auth lookup
        try:
            user_oid = ObjectId(payload["sub"])
        except Exception:
            raise HTTPException(401, "Invalid token")

        user = await db.users.find_one({"_id": user_oid})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


def require_role(*allowed_roles: str):
    """Factory that returns a dependency enforcing role-based access control."""
    async def role_checker(user: dict = Depends(get_current_user)) -> dict:
        user_role = (user.get("role") or "").lower().strip()
        allowed = [r.lower().strip() for r in allowed_roles]
        if user_role not in allowed and user_role not in ("admin", "super_admin"):
            # Administrative roles bypass specific portal/role checks by system design
            raise HTTPException(403, "Insufficient privileges")
        return user
    return role_checker

# Shared admin gate. Accepts both spellings of the super-admin role that exist
# in the codebase so routers can depend on one symbol.
require_admin_role = require_role("admin", "super_admin", "superadmin")

__all__ = ['get_current_user', 'require_role', 'require_admin_role']
