from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from bson import ObjectId

from core.db import db
from core.deps import get_current_user
from notifications import register_push_token, deregister_push_token, list_inbox, unread_count, mark_inbox_read, dismiss_inbox, send_push

router = APIRouter()

class PushTokenRegister(BaseModel):
    token: str
    platform: Optional[str] = "unknown"


@router.post("/notifications/register")
async def notifications_register(req: PushTokenRegister, user: dict = Depends(get_current_user)):
    """Save the device's Expo push token. Called from client on first launch."""
    return await register_push_token(db, str(user["_id"]), req.token, req.platform or "unknown")


@router.delete("/notifications/register")
async def notifications_deregister(req: PushTokenRegister, user: dict = Depends(get_current_user)):
    """Remove a push token (e.g. on logout)."""
    n = await deregister_push_token(db, req.token)
    return {"removed": n}


@router.get("/notifications")
async def notifications_inbox(user: dict = Depends(get_current_user), limit: int = 30):
    """Returns the in-app notification inbox + unread count."""
    items = await list_inbox(db, str(user["_id"]), limit)
    unread = await unread_count(db, str(user["_id"]))
    return {"items": items, "unread": unread}


@router.post("/notifications/mark-read")
async def notifications_mark_read(payload: Optional[dict] = None,
                                   user: dict = Depends(get_current_user)):
    ids = (payload or {}).get("ids") if payload else None
    n = await mark_inbox_read(db, str(user["_id"]), ids)
    return {"updated": n}


@router.post("/notifications/dismiss")
async def notifications_dismiss(payload: Optional[dict] = None,
                                user: dict = Depends(get_current_user)):
    ids = (payload or {}).get("ids") if payload else None
    n = await dismiss_inbox(db, str(user["_id"]), ids)
    return {"deleted": n}


# Admin-only: send a manual broadcast (for announcements)
class ManualPushIn(BaseModel):
    user_id: str
    title: str
    body: str
    data: Optional[Dict[str, Any]] = None


@router.post("/notifications/send")
async def notifications_send_manual(req: ManualPushIn, user: dict = Depends(get_current_user)):
    if user["role"] not in ("admin", "super_admin"):
        raise HTTPException(403, "Admin only")
    return await send_push(db, user_id=req.user_id, title=req.title, body=req.body, data=req.data)
