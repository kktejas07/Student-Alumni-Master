import os
from typing import Optional
from fastapi import HTTPException
import jwt as _jwt
from core.db import db as _db

_JWT_SECRET = os.environ.get("JWT_SECRET", "")
_JWT_ALG = os.environ.get("JWT_ALGORITHM", "HS256")

async def resolve_user(authorization: Optional[str]) -> Optional[dict]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    try:
        payload = _jwt.decode(token, _JWT_SECRET, algorithms=[_JWT_ALG])
        if payload.get("type") != "access":
            return None
    except Exception:
        return None
    from bson import ObjectId
    try:
        return await _db.users.find_one({"_id": ObjectId(payload["sub"])})
    except Exception:
        return await _db.users.find_one({"_id": payload["sub"]})
