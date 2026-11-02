"""LA5 — Real-Time Lead Notifications (WebSocket + Push).

WebSocket live feed per brand, notification preferences,
read receipts, and templated notifications.

Leverages the platform's existing websocket_hub.py pattern and
Firebase Cloud Messaging for push.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import WebSocket, WebSocketDisconnect

from db import db
from .database import brands_col, leads_col

logger = logging.getLogger(__name__)

# Collection for notification preferences and read receipts
notif_prefs_col = db.la_notification_prefs
notif_inbox_col = db.la_notifications
notif_tokens_col = db.la_push_tokens

# Active WebSocket connections: brand_id -> set of WebSocket
_connections: dict[str, set[WebSocket]] = {}
_heartbeat_interval = 30  # seconds


# ---------------------------------------------------------------------------
# WebSocket Connection Manager
# ---------------------------------------------------------------------------
async def connect_brand(brand_id: str, ws: WebSocket) -> None:
    """Register a WebSocket connection for a brand's live feed."""
    await ws.accept()
    if brand_id not in _connections:
        _connections[brand_id] = set()
    _connections[brand_id].add(ws)
    logger.info("[LA-WS] Brand %s connected (total: %d)", brand_id, len(_connections[brand_id]))


def disconnect_brand(brand_id: str, ws: WebSocket) -> None:
    """Remove a WebSocket connection."""
    if brand_id in _connections:
        _connections[brand_id].discard(ws)
        if not _connections[brand_id]:
            del _connections[brand_id]
    logger.info("[LA-WS] Brand %s disconnected", brand_id)


async def broadcast_to_brand(brand_id: str, message: dict) -> int:
    """Send a message to all connected WebSockets for a brand.
    Returns the number of successful sends.
    """
    if brand_id not in _connections:
        return 0

    payload = json.dumps(message, default=str)
    sent = 0
    dead: list[WebSocket] = []

    for ws in _connections[brand_id]:
        try:
            await ws.send_text(payload)
            sent += 1
        except Exception:
            dead.append(ws)

    for ws in dead:
        _connections[brand_id].discard(ws)

    return sent


async def ws_heartbeat(ws: WebSocket, brand_id: str) -> None:
    """Run heartbeat pings to keep the connection alive."""
    try:
        while True:
            await asyncio.sleep(_heartbeat_interval)
            await ws.send_json({"type": "heartbeat", "ts": datetime.now(timezone.utc).isoformat()})
    except Exception:
        disconnect_brand(brand_id, ws)


# ---------------------------------------------------------------------------
# Notification Templates
# ---------------------------------------------------------------------------
_TEMPLATES = {
    "new_lead": {
        "title": "New Lead Received",
        "body": "New lead from {lead_name} ({city}) — Score: {score} ({temperature})",
        "icon": "user-plus",
    },
    "score_update": {
        "title": "Lead Score Updated",
        "body": "{lead_name}'s score changed to {score} ({temperature})",
        "icon": "trending-up",
    },
    "offer_expiring": {
        "title": "Offer Expiring Soon",
        "body": "'{offer_title}' expires in {hours_left} hours",
        "icon": "clock",
    },
    "weekly_summary": {
        "title": "Weekly Lead Summary",
        "body": "{new_leads} new leads, {converted} converted, {conversion_rate}% conversion rate",
        "icon": "bar-chart",
    },
    "claim_received": {
        "title": "New Offer Claim",
        "body": "{lead_name} claimed '{offer_title}'",
        "icon": "gift",
    },
}


def render_template(template_key: str, data: dict) -> dict:
    """Render a notification template with data."""
    tmpl = _TEMPLATES.get(template_key)
    if not tmpl:
        return {"title": template_key, "body": json.dumps(data), "icon": "bell"}

    return {
        "title": tmpl["title"],
        "body": tmpl["body"].format_map({**{k: "" for k in tmpl["body"].split("{")}, **data}),
        "icon": tmpl["icon"],
    }


# ---------------------------------------------------------------------------
# Notification Dispatch
# ---------------------------------------------------------------------------
async def notify_brand(
    brand_id: str,
    template_key: str,
    data: dict,
    *,
    lead_id: Optional[str] = None,
) -> dict:
    """Send a notification to a brand via WebSocket, push, and inbox.

    Respects brand notification preferences (instant / digest / daily).
    """
    now = datetime.now(timezone.utc)
    notif_id = f"NTF-{secrets.token_hex(6)}"

    rendered = render_template(template_key, data)

    # Store in inbox
    notif_doc = {
        "notif_id": notif_id,
        "brand_id": brand_id,
        "lead_id": lead_id,
        "template": template_key,
        "title": rendered["title"],
        "body": rendered["body"],
        "icon": rendered["icon"],
        "data": data,
        "read": False,
        "created_at": now,
    }
    await notif_inbox_col.insert_one(notif_doc)

    # Check preferences
    prefs = await notif_prefs_col.find_one({"brand_id": brand_id})
    mode = (prefs or {}).get("mode", "instant")

    ws_sent = 0
    push_sent = False

    if mode == "instant":
        # WebSocket
        ws_sent = await broadcast_to_brand(brand_id, {
            "type": "notification",
            **notif_doc,
            "_id": notif_id,
        })

        # FCM Push
        push_sent = await _send_fcm_push(brand_id, rendered)

    return {
        "notif_id": notif_id,
        "ws_sent": ws_sent,
        "push_sent": push_sent,
        "mode": mode,
    }


async def notify_new_lead(brand_id: str, lead: dict) -> dict:
    """Convenience: notify brand about a new lead."""
    return await notify_brand(
        brand_id,
        "new_lead",
        {
            "lead_name": lead.get("full_name", "Unknown"),
            "city": lead.get("city", "N/A"),
            "score": str(lead.get("score", 0)),
            "temperature": lead.get("temperature", "cold"),
            "lead_id": lead.get("lead_id"),
        },
        lead_id=lead.get("lead_id"),
    )


# ---------------------------------------------------------------------------
# Notification Preferences
# ---------------------------------------------------------------------------
async def set_preferences(brand_id: str, mode: str) -> dict:
    """Set notification mode: instant, digest (hourly), daily."""
    valid = {"instant", "digest", "daily"}
    if mode not in valid:
        return {"status": "error", "message": f"Mode must be one of: {', '.join(valid)}"}

    await notif_prefs_col.update_one(
        {"brand_id": brand_id},
        {"$set": {"brand_id": brand_id, "mode": mode, "updated_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return {"status": "ok", "mode": mode}


# ---------------------------------------------------------------------------
# Read Receipts & Inbox
# ---------------------------------------------------------------------------
async def mark_read(brand_id: str, notif_ids: list[str]) -> int:
    """Mark notifications as read. Returns count updated."""
    result = await notif_inbox_col.update_many(
        {"brand_id": brand_id, "notif_id": {"$in": notif_ids}},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc)}},
    )
    return result.modified_count


async def get_unread_count(brand_id: str) -> int:
    return await notif_inbox_col.count_documents({"brand_id": brand_id, "read": False})


async def get_inbox(
    brand_id: str,
    skip: int = 0,
    limit: int = 20,
    unread_only: bool = False,
) -> dict:
    query: dict = {"brand_id": brand_id}
    if unread_only:
        query["read"] = False

    cursor = notif_inbox_col.find(query).sort("created_at", -1).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    total = await notif_inbox_col.count_documents(query)
    unread = await get_unread_count(brand_id)

    for item in items:
        item["_id"] = str(item["_id"])

    return {"notifications": items, "total": total, "unread": unread}


# ---------------------------------------------------------------------------
# Digest / Daily Summary
# ---------------------------------------------------------------------------
async def send_pending_digests() -> dict:
    """Process hourly digests and daily summaries. Called by the bot cron."""
    now = datetime.now(timezone.utc)
    sent = 0

    # Find brands with digest or daily mode that have unread notifications
    prefs_cursor = notif_prefs_col.find({"mode": {"$in": ["digest", "daily"]}})

    async for pref in prefs_cursor:
        brand_id = pref["brand_id"]
        mode = pref["mode"]

        # Check if it's time to send
        last_digest = pref.get("last_digest_at")
        if last_digest:
            if last_digest.tzinfo is None:
                last_digest = last_digest.replace(tzinfo=timezone.utc)
            interval = timedelta(hours=1) if mode == "digest" else timedelta(hours=24)
            if (now - last_digest) < interval:
                continue

        unread = await notif_inbox_col.count_documents({"brand_id": brand_id, "read": False})
        if unread == 0:
            continue

        # Build digest and send via WebSocket
        recent = await notif_inbox_col.find(
            {"brand_id": brand_id, "read": False}
        ).sort("created_at", -1).limit(20).to_list(20)

        digest_msg = {
            "type": "digest",
            "count": unread,
            "items": [{"title": n["title"], "body": n["body"], "notif_id": n["notif_id"]} for n in recent],
            "ts": now.isoformat(),
        }

        await broadcast_to_brand(brand_id, digest_msg)

        # Also send push
        await _send_fcm_push(brand_id, {
            "title": f"{unread} new notifications",
            "body": f"You have {unread} unread lead notifications",
            "icon": "bell",
        })

        await notif_prefs_col.update_one(
            {"brand_id": brand_id},
            {"$set": {"last_digest_at": now}},
        )
        sent += 1

    return {"digests_sent": sent}


# ---------------------------------------------------------------------------
# FCM Push
# ---------------------------------------------------------------------------
async def register_push_token(brand_id: str, token: str, device_id: str) -> dict:
    """Register an FCM push token for a brand."""
    await notif_tokens_col.update_one(
        {"brand_id": brand_id, "device_id": device_id},
        {"$set": {
            "brand_id": brand_id,
            "token": token,
            "device_id": device_id,
            "updated_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    return {"status": "ok"}


async def _send_fcm_push(brand_id: str, notification: dict) -> bool:
    """Send push notification via Firebase Cloud Messaging."""
    fcm_key = os.environ.get("FCM_SERVER_KEY")
    if not fcm_key:
        return False

    tokens_cursor = notif_tokens_col.find({"brand_id": brand_id})
    tokens = [doc["token"] async for doc in tokens_cursor]

    if not tokens:
        return False

    try:
        import httpx
        async with httpx.AsyncClient(timeout=10) as client:
            for token in tokens:
                await client.post(
                    "https://fcm.googleapis.com/fcm/send",
                    headers={
                        "Authorization": f"key={fcm_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "to": token,
                        "notification": {
                            "title": notification.get("title"),
                            "body": notification.get("body"),
                            "icon": notification.get("icon", "bell"),
                        },
                        "data": {"brand_id": brand_id},
                    },
                )
        return True
    except Exception as e:
        logger.warning("[LA-FCM] Push error: %s", e)
        return False
