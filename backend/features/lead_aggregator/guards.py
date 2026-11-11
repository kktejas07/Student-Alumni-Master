"""Lead Aggregator — Auth guards & role-based access control."""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import HTTPException, Request

from db import db

logger = logging.getLogger(__name__)

SECRET_KEY = "lead-aggregator-secret"
ALGORITHM = "HS256"

ADMIN = "admin"
BRAND = "brand"
CAMPUS = "campus"
VIEWER = "viewer"

admins_col = db.la_admins


def _extract_token(request: Request) -> Optional[str]:
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:].strip()
    return None


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


def create_access_token(data: dict, expires_hours: int = 24) -> str:
    payload = {
        **data,
        "exp": datetime.now(timezone.utc) + timedelta(hours=expires_hours),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


async def require_admin(request: Request) -> dict:
    token = _extract_token(request)
    if not token:
        raise HTTPException(401, "Authorization header required")
    user = _decode_token(token)
    if user.get("role") != ADMIN:
        raise HTTPException(403, "Admin access required")
    return user


async def require_brand_owner(request: Request, brand_id: str) -> dict:
    token = _extract_token(request)
    if not token:
        raise HTTPException(401, "Authorization header required")
    user = _decode_token(token)
    if user.get("role") == ADMIN:
        return user
    if user.get("role") == BRAND and user.get("brand_id") == brand_id:
        return user
    raise HTTPException(403, "You do not have access to this brand")


async def require_authenticated(request: Request) -> dict:
    token = _extract_token(request)
    if not token:
        raise HTTPException(401, "Authorization header required")
    return _decode_token(token)


async def optional_auth(request: Request) -> Optional[dict]:
    token = _extract_token(request)
    if not token:
        return None
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.InvalidTokenError:
        return None


async def authenticate_admin(email: str, password: str) -> Optional[dict]:
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    admin = await admins_col.find_one({"email": email, "password_hash": password_hash})
    if not admin:
        return None
    return {
        "admin_id": admin.get("admin_id", str(admin["_id"])),
        "email": admin["email"],
        "name": admin.get("name", ""),
        "role": ADMIN,
    }
