"""
core.deps — FastAPI dependencies: JWT auth (`get_current_user`), shared token
helpers, and role checks.

All hand-rolled `jwt.decode` / Bearer-header parsing in the app goes through
`decode_payload` (strict) or `resolve_token_user` (permissive) so the
algorithm + secret come from exactly one place.
"""
import jwt
from bson import ObjectId
from fastapi import HTTPException, Request, Depends
from typing import Optional

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


def bearer_token(authorization: Optional[str]) -> Optional[str]:
    """Extract the raw token from an `Authorization: Bearer <token>` header, else None."""
    if not authorization:
        return None
    prefix = "Bearer "
    head = authorization.lstrip()
    if head.lower().startswith(prefix.lower()):
        return head[len(prefix):].strip()
    return None


def decode_payload(token: str, *, token_type: Optional[str] = None) -> dict:
    """Strict JWT decode. Raises HTTPException(401) on missing/invalid/expired.

    The algorithm and secret come from ``core.security`` (single source of truth;
    raises at import if ``JWT_SECRET`` is unset). Modules that previously
    hand-rolled ``jwt.decode`` with an empty-string secret fallback should call
    this instead.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    if token_type is not None and payload.get("type") != token_type:
        raise HTTPException(401, "Invalid token type")
    return payload


def decode_payload_silent(token: str, *, token_type: Optional[str] = None) -> Optional[dict]:
    """Permissive JWT decode: returns the payload dict, or None on any failure.

    Use for optional-auth sites that fall back to another identity when the
    header is absent or the token is bad (public endpoints that bind a caller
    when one is present).
    """
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        return None
    if token_type is not None and payload.get("type") != token_type:
        return None
    return payload


def ensure_admin(payload: dict, *, roles=("admin", "super_admin", "superadmin")) -> dict:
    """Raise 403 unless the decoded payload's role is one of ``roles``. Returns the payload."""
    role = (payload.get("role") or "").lower()
    if role not in roles:
        raise HTTPException(403, "Admin role required")
    return payload


__all__ = [
    'get_current_user', 'require_role', 'require_admin_role',
    'bearer_token', 'decode_payload', 'decode_payload_silent', 'ensure_admin',
]
