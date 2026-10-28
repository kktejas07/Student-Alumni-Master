from datetime import datetime, timezone, timedelta
from typing import Optional, Literal
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field

from core.db import db as _db
from core.security import encrypt_value
from features.agent_k.api.auth import resolve_user

router = APIRouter(tags=["agent-k-providers"])

class BYOKRequest(BaseModel):
    provider: Literal["openai", "claude", "gemini", "groq", "featherless"]
    api_key: str = Field(..., min_length=10)
    model: str = Field(...)

@router.post("/agent-k/providers/trial")
async def activate_trial(authorization: Optional[str] = Header(None)):
    user = await resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
        
    user_id = str(user["_id"])
    now = datetime.now(timezone.utc)
    end = now + timedelta(days=30)
    
    doc = {
        "user_id": user_id,
        "provider_type": "trial",
        "provider": "featherless",
        "encrypted_api_key": None,
        "model": "featherless-default-model",
        "trial_start": now,
        "trial_end": end,
        "trial_status": "active",
        "usage": {"requests": 0, "tokens": 0},
        "created_at": now,
        "updated_at": now
    }
    
    await _db.user_ai_settings.update_one(
        {"user_id": user_id},
        {"$set": doc},
        upsert=True
    )
    
    return {"ok": True, "provider": "featherless", "trial_end": end.isoformat()}

@router.post("/agent-k/providers/byok")
async def save_byok(body: BYOKRequest, authorization: Optional[str] = Header(None)):
    user = await resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
        
    user_id = str(user["_id"])
    now = datetime.now(timezone.utc)
    
    encrypted_key = encrypt_value(body.api_key)
    
    doc = {
        "user_id": user_id,
        "provider_type": "byok",
        "provider": body.provider,
        "encrypted_api_key": encrypted_key,
        "model": body.model,
        "trial_start": None,
        "trial_end": None,
        "trial_status": None,
        "usage": {"requests": 0, "tokens": 0},
        "created_at": now,
        "updated_at": now
    }
    
    # Preserve created_at if it exists
    existing = await _db.user_ai_settings.find_one({"user_id": user_id})
    if existing:
        doc["created_at"] = existing.get("created_at", now)
        
    await _db.user_ai_settings.update_one(
        {"user_id": user_id},
        {"$set": doc},
        upsert=True
    )
    
    return {"ok": True, "provider": body.provider, "model": body.model}
