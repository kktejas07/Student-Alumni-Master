"""
Push Notifications via Expo Push API
=====================================
- Stores device push tokens per user (push_tokens collection)
- Sends notifications via Expo's free Push service
- Triggers: booking events, mentor approval, event registration, deadline reminders

Flow:
  1. Client (mobile) calls Notifications.getExpoPushTokenAsync() and POSTs to /api/notifications/register
  2. Backend stores the token in push_tokens collection
  3. When a booking/event happens, server.py calls send_push(user_id, ...) which dispatches to all
     registered devices for that user via httpx → https://exp.host/--/api/v2/push/send

Note: actual delivery only happens on a real device (iOS/Android with a development build or production).
On Expo Go web preview, the token registration is mocked via a fake string, but no notification fires.
"""
from __future__ import annotations
import os
import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx


EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def register_push_token(db, user_id: str, token: str, platform: str = "unknown") -> Dict[str, Any]:
    """Idempotent — one document per (user_id, token). Updates last_seen on each call."""
    if not token:
        raise ValueError("token is required")
    now = datetime.now(timezone.utc)
    await db.push_tokens.update_one(
        {"user_id": str(user_id), "token": token},
        {
            "$set": {"platform": platform, "last_seen": now},
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )
    return {"status": "registered", "user_id": str(user_id), "token_preview": token[-12:]}


async def deregister_push_token(db, token: str) -> int:
    """Removes a token (e.g. on logout)."""
    res = await db.push_tokens.delete_many({"token": token})
    return res.deleted_count


async def list_user_tokens(db, user_id: str) -> List[str]:
    docs = await db.push_tokens.find({"user_id": str(user_id)}, {"_id": 0, "token": 1}).to_list(50)
    return [d["token"] for d in docs if d.get("token")]


async def send_push(db, *, user_id: str, title: str, body: str,
                    data: Optional[Dict[str, Any]] = None,
                    channel_id: str = "default") -> Dict[str, Any]:
    """Sends a push to all of a user's registered devices. Returns the Expo response."""
    tokens = await list_user_tokens(db, user_id)
    if not tokens:
        # Still log to inbox so user sees it next time they open the app
        await _log_inbox(db, user_id, title, body, data)
        return {"status": "no_tokens", "message": "logged to in-app inbox"}

    messages = [
        {
            "to": t,
            "title": title,
            "body": body,
            "data": data or {},
            "sound": "default",
            "channelId": channel_id,
            "priority": "high",
        }
        for t in tokens
        if t.startswith("ExponentPushToken[") or t.startswith("ExpoPushToken[")
    ]
    # Always log to inbox so it's persisted even if the push fails
    await _log_inbox(db, user_id, title, body, data)
    if not messages:
        return {"status": "no_valid_tokens"}

    try:
        async with httpx.AsyncClient(timeout=8) as c:
            r = await c.post(
                EXPO_PUSH_URL,
                json=messages,
                headers={"Accept": "application/json", "Content-Type": "application/json"},
            )
            return {"status": "sent", "expo_response": r.json() if r.is_success else r.text}
    except Exception as e:  # noqa: BLE001
        return {"status": "send_failed", "error": str(e)}


async def _log_inbox(db, user_id: str, title: str, body: str, data: Optional[Dict[str, Any]]):
    """Persist notification to in-app inbox so users see it when they open the app."""
    await db.notifications.insert_one({
        "user_id": str(user_id),
        "title": title,
        "body": body,
        "data": data or {},
        "read": False,
        "created_at": datetime.now(timezone.utc),
    })


async def list_inbox(db, user_id: str, limit: int = 30) -> List[Dict[str, Any]]:
    cursor = (
        db.notifications.find({"user_id": str(user_id)}, {"_id": 0})
        .sort("created_at", -1)
        .limit(limit)
    )
    items = await cursor.to_list(limit)
    for it in items:
        if isinstance(it.get("created_at"), datetime):
            it["created_at"] = it["created_at"].isoformat()
    return items


async def mark_inbox_read(db, user_id: str, ids: Optional[List[str]] = None) -> int:
    q: Dict[str, Any] = {"user_id": str(user_id)}
    if ids:
        q["id"] = {"$in": ids}
    res = await db.notifications.update_many(q, {"$set": {"read": True}})
    return res.modified_count


async def unread_count(db, user_id: str) -> int:
    return await db.notifications.count_documents({"user_id": str(user_id), "read": False})


# ---------------------------------------------------------------------------
# Trigger helpers — call these from server.py business logic
# ---------------------------------------------------------------------------
async def notify_booking_created(db, *, mentor_id: str, student_name: str, topic: str, when: str):
    return await send_push(
        db, user_id=mentor_id,
        title="New booking request",
        body=f"{student_name} has requested a session on '{topic}' for {when}.",
        data={"type": "booking_request", "mentor_id": mentor_id},
    )


async def notify_booking_confirmed(db, *, student_id: str, mentor_name: str, when: str):
    return await send_push(
        db, user_id=student_id,
        title="Session confirmed!",
        body=f"Your session with {mentor_name} on {when} is confirmed.",
        data={"type": "booking_confirmed", "student_id": student_id},
    )


async def notify_event_registered(db, *, user_id: str, event_title: str):
    return await send_push(
        db, user_id=user_id,
        title="You're registered!",
        body=f"You're in for {event_title}. We'll remind you 24h before.",
        data={"type": "event_registered"},
    )


async def notify_mentor_approved(db, *, mentor_id: str):
    return await send_push(
        db, user_id=mentor_id,
        title="🎉 You're now a mentor!",
        body="Your profile is live. Students can now book sessions with you.",
        data={"type": "mentor_approved"},
    )


async def notify_review_received(db, *, mentor_id: str, rating: int, student_name: str):
    return await send_push(
        db, user_id=mentor_id,
        title=f"⭐ New {rating}-star review",
        body=f"{student_name} just left a review on your profile.",
        data={"type": "review_received"},
    )
