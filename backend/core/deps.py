"""
core.deps — FastAPI dependencies.

Provides three dependency factories:
  - get_current_user   : authenticate any logged-in user
  - require_role(role) : authenticate + enforce a single role
  - require_permission(perm) : authenticate + enforce a fine-grained permission

Usage in routes:
    from core.deps import get_current_user, require_role, require_permission
    from core.roles import Role, Perm

    # Any authenticated user:
    user = Depends(get_current_user)

    # Admin only (simple role gate):
    user = Depends(require_role(Role.ADMIN))

    # Fine-grained permission (admin auto-passes; other roles checked via SYSTEM_ROLES):
    user = Depends(require_permission(Perm.MENTORS_APPROVE))
"""
import jwt
from bson import ObjectId
from fastapi import Depends, HTTPException, Request
from typing import Callable

from .db import db
from .security import JWT_SECRET, JWT_ALGORITHM


async def get_current_user(request: Request) -> dict:
    """JWT auth dependency. Reads `Authorization: Bearer <token>` header."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(auth[7:], JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


def require_role(*roles: str) -> Callable:
    """
    FastAPI dependency factory — enforce that the authenticated user has one
    of the given roles. Raises 403 if the role does not match.

    Example:
        from core.roles import Role
        user = Depends(require_role(Role.ADMIN))
        user = Depends(require_role(Role.COLLEGE, Role.ADMIN))
    """
    async def _dep(user: dict = Depends(get_current_user)) -> dict:
        user_role = (user.get("role") or "").lower().strip()
        if user_role not in roles:
            raise HTTPException(
                403,
                f"Access denied. Required role: {' or '.join(roles)}. "
                f"Your role: {user_role}",
            )
        return user
    return _dep


def require_permission(permission: str) -> Callable:
    """
    FastAPI dependency factory — enforce a fine-grained permission using the
    SYSTEM_ROLES constant (fast path) or the admin_roles DB collection (custom roles).

    Admins always pass. Other roles are checked against their SYSTEM_ROLES entry.

    Example:
        from core.roles import Perm
        user = Depends(require_permission(Perm.MENTORS_APPROVE))
        user = Depends(require_permission(Perm.ANALYTICS_VIEW))
    """
    async def _dep(user: dict = Depends(get_current_user)) -> dict:
        # Import here to avoid circular import at module load time
        from .roles import has_permission
        if not await has_permission(user, permission):
            user_role = (user.get("role") or "unknown").lower()
            raise HTTPException(
                403,
                f"Permission denied: '{permission}' is not granted to role '{user_role}'.",
            )
        return user
    return _dep


__all__ = ['get_current_user', 'require_role', 'require_permission']
