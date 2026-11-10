from typing import Optional
from bson import ObjectId
from core.db import db as _db
from core.deps import bearer_token, decode_payload_silent

async def resolve_user(authorization: Optional[str]) -> Optional[dict]:
    payload = decode_payload_silent(bearer_token(authorization), token_type="access")
    if not payload:
        return None
    try:
        return await _db.users.find_one({"_id": ObjectId(payload["sub"])})
    except Exception:
        return await _db.users.find_one({"_id": payload["sub"]})
