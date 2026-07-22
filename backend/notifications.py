"""
Push Notifications via Expo Push API
=====================================
- Stores device push tokens per user (push_tokens collection)
- Sends notifications via Expo's free Push service
- Triggers: booking events, mentor approval, event registration, deadline reminders
- Also sends email via configured provider (Postal/SMTP/Gmail)

Flow:
  1. Client (mobile) calls Notifications.getExpoPushTokenAsync() and POSTs to /api/notifications/register
  2. Backend stores the token in push_tokens collection
  3. When a booking/event happens, server.py calls send_push(user_id, ...) which dispatches to all
     registered devices for that user via httpx https://exp.host/--/api/v2/push/send
  4. Email is sent using the same user's email address with the appropriate template

Note: actual delivery only happens on a real device (iOS/Android with a development build or production).
On Expo Go web preview, the token registration is mocked via a fake string, but no notification fires.
"""
from __future__ import annotations
import os
import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, cast
import httpx
from bson import ObjectId

from core.email import send_email
from core.email_templates import preview_template


EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def _get_user_email(db, user_id: str) -> str | None:
    """Fetch the email address for a user."""
    try:
        uid = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
        user = await db.users.find_one({"_id": uid}, {"email": 1})
        if user and user.get("email"):
            return str(user["email"])
    except Exception:
        pass
    return None


async def _try_send_email(
    db, user_id: str, template_name: str,
    subject_prefix: str = "", sample_data: dict | None = None,
) -> bool:
    """Best-effort email send using the named template.
    Fetches the user's email from the database automatically.
    Returns True if the email was sent, False otherwise.
    """
    try:
        email = await _get_user_email(db, user_id)
        if not email:
            return False
        result = preview_template(template_name, sample_data)
        subject = result["subject"]
        if subject_prefix:
            subject = f"{subject_prefix} {subject}"
        await send_email(email, subject, result["html"])
        return True
    except Exception:
        return False


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
        "type": (data or {}).get("type"),
        "read": False,
        "created_at": datetime.now(timezone.utc),
    })


async def list_inbox(db, user_id: str, limit: int = 30) -> List[Dict[str, Any]]:
    cursor = (
        db.notifications.find({"user_id": str(user_id)})
        .sort("created_at", -1)
        .limit(limit)
    )
    items = await cursor.to_list(limit)
    for it in items:
        if "_id" in it:
            it["id"] = str(it["_id"])
            del it["_id"]
        if isinstance(it.get("created_at"), datetime):
            it["created_at"] = it["created_at"].isoformat()
        if "body" in it and "message" not in it:
            it["message"] = it["body"]
        if "data" in it and isinstance(it["data"], dict) and "type" in it["data"] and "type" not in it:
            it["type"] = it["data"]["type"]
    return items


async def mark_inbox_read(db, user_id: str, ids: Optional[List[str]] = None) -> int:
    q: Dict[str, Any] = {"user_id": str(user_id)}
    if ids:
        objs = []
        for i in ids:
            try:
                objs.append(ObjectId(i))
            except Exception:
                pass
        q["$or"] = [
            {"id": {"$in": ids}},
            {"_id": {"$in": objs}}
        ]
    res = await db.notifications.update_many(q, {"$set": {"read": True}})
    return res.modified_count


async def dismiss_inbox(db, user_id: str, ids: Optional[List[str]] = None) -> int:
    q: Dict[str, Any] = {"user_id": str(user_id)}
    if ids:
        objs = []
        for i in ids:
            try:
                objs.append(ObjectId(i))
            except Exception:
                pass
        q["$or"] = [
            {"id": {"$in": ids}},
            {"_id": {"$in": objs}}
        ]
    res = await db.notifications.delete_many(q)
    return res.deleted_count


async def unread_count(db, user_id: str) -> int:
    return await db.notifications.count_documents({"user_id": str(user_id), "read": False})


# ---------------------------------------------------------------------------
# Trigger helpers — call these from server.py business logic
# Each sends push + in-app notification AND email via the configured provider
# ---------------------------------------------------------------------------
async def notify_booking_created(db, *, mentor_id: str, student_name: str, topic: str, when: str):
    result = await send_push(
        db, user_id=mentor_id,
        title="New booking request",
        body=f"{student_name} has requested a session on '{topic}' for {when}.",
        data={"type": "booking_request", "mentor_id": mentor_id},
    )
    await _try_send_email(
        db, mentor_id, "booking_created",
        sample_data={"student_name": student_name, "topic": topic, "when": when},
    )
    return result


async def notify_booking_confirmed(db, *, student_id: str, mentor_name: str, when: str):
    result = await send_push(
        db, user_id=student_id,
        title="Session confirmed!",
        body=f"Your session with {mentor_name} on {when} is confirmed.",
        data={"type": "booking_confirmed", "student_id": student_id},
    )
    await _try_send_email(
        db, student_id, "booking_confirmed",
        sample_data={"mentor_name": mentor_name, "when": when, "topic": "mentorship"},
    )
    return result


async def notify_booking_cancelled(db, *, student_id: str, mentor_name: str, reason: str, topic: str = "mentorship"):
    result = await send_push(
        db, user_id=student_id,
        title="Session cancelled",
        body=f"{mentor_name} has cancelled your session. Reason: {reason}",
        data={"type": "booking_cancelled"},
    )
    await _try_send_email(
        db, student_id, "booking_cancelled",
        sample_data={"mentor_name": mentor_name, "reason": reason},
    )
    return result


async def notify_booking_rescheduled(db, *, user_id: str, other_name: str, old_time: str, new_time: str):
    result = await send_push(
        db, user_id=user_id,
        title="Session rescheduled",
        body=f"{other_name} rescheduled the session from {old_time} to {new_time}.",
        data={"type": "booking_rescheduled"},
    )
    await _try_send_email(
        db, user_id, "booking_rescheduled",
        sample_data={"other_name": other_name, "old_time": old_time, "new_time": new_time},
    )
    return result


async def notify_event_registered(db, *, user_id: str, event_title: str, event_date: str = ""):
    result = await send_push(
        db, user_id=user_id,
        title="You're registered!",
        body=f"You're in for {event_title}. We'll remind you 24h before.",
        data={"type": "event_registered"},
    )
    await _try_send_email(
        db, user_id, "event_registration",
        sample_data={"event_title": event_title, "event_date": event_date},
    )
    return result


async def notify_mentor_approved(db, *, mentor_id: str, mentor_name: str = ""):
    result = await send_push(
        db, user_id=mentor_id,
        title="You're now a mentor!",
        body="Your profile is live. Students can now book sessions with you.",
        data={"type": "mentor_approved"},
    )
    await _try_send_email(
        db, mentor_id, "mentor_approved",
        sample_data={"name": mentor_name or "Mentor"},
    )
    return result


async def notify_mentor_rejected(db, *, mentor_id: str, mentor_name: str = "", reason: str = ""):
    result = await send_push(
        db, user_id=mentor_id,
        title="Mentor application update",
        body=reason or "Your mentor application was not approved at this time.",
        data={"type": "mentor_rejected"},
    )
    await _try_send_email(
        db, mentor_id, "mentor_rejected",
        sample_data={"name": mentor_name or "Mentor", "reason": reason},
    )
    return result


async def notify_review_received(db, *, mentor_id: str, rating: int, student_name: str):
    result = await send_push(
        db, user_id=mentor_id,
        title=f"New {rating}-star review",
        body=f"{student_name} just left a review on your profile.",
        data={"type": "review_received"},
    )
    await _try_send_email(
        db, mentor_id, "review_received",
        sample_data={"student_name": student_name, "rating": str(rating)},
    )
    return result


async def notify_connection_request(db, *, user_id: str, requester_name: str, message: str = ""):
    body = f"{requester_name} wants to connect with you."
    if message:
        body += f' Note: "{message}"'
    result = await send_push(
        db, user_id=user_id,
        title="New connection request",
        body=body,
        data={"type": "connection_request"},
    )
    await _try_send_email(
        db, user_id, "connection_request",
        sample_data={"requester_name": requester_name},
    )
    return result


async def notify_connection_accepted(db, *, other_id: str, accepter_name: str):
    result = await send_push(
        db, user_id=other_id,
        title="Connection accepted",
        body=f"{accepter_name} accepted your connection request.",
        data={"type": "connection_accepted"},
    )
    await _try_send_email(
        db, other_id, "connection_accepted",
        sample_data={"accepter_name": accepter_name},
    )
    return result
