"""
messaging.py — Real-time direct messaging (DM) system.

REST endpoints for conversation management + WebSocket for live delivery.

Collections:
    dm_conversations  {participants, created_at, updated_at, last_message}
    dm_messages       {conversation_id, sender_id, text, created_at, read_at}

REST routes (all under /api/messages):
    GET  /conversations              — list my conversations
    GET  /conversations/{id}         — messages in a conversation (paginated)
    POST /conversations              — create or get existing conversation
    POST /conversations/{id}/send    — send a message
    PUT  /conversations/{id}/read    — mark messages as read

WebSocket:
    WS /api/messages/ws?token=<jwt>  — real-time message push
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from core.db import db
from core.deps import get_current_user, decode_payload_silent

logger = logging.getLogger("messaging")
router = APIRouter(prefix="/messages", tags=["messaging"])


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class CreateConversationReq(BaseModel):
    participant_id: str  # the other user's _id as a hex string


class SendMessageReq(BaseModel):
    text: str


# ---------------------------------------------------------------------------
# WebSocket connection manager
# ---------------------------------------------------------------------------

class ConnectionManager:
    """Track active WebSocket connections per user."""

    def __init__(self) -> None:
        # user_id (str) -> list of active WebSocket connections
        self._active: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._active.setdefault(user_id, []).append(ws)

    def disconnect(self, user_id: str, ws: WebSocket) -> None:
        conns = self._active.get(user_id, [])
        if ws in conns:
            conns.remove(ws)
        if not conns:
            self._active.pop(user_id, None)

    async def send_to_user(self, user_id: str, data: dict) -> None:
        """Push a JSON payload to all of a user's open sockets."""
        for ws in self._active.get(user_id, []):
            try:
                await ws.send_json(data)
            except Exception:
                pass  # stale connection; next ping will clean it up

    @property
    def online_users(self) -> set:
        return set(self._active.keys())


manager = ConnectionManager()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _oid(hex_str: str) -> ObjectId:
    """Safe ObjectId conversion."""
    try:
        return ObjectId(hex_str)
    except Exception:
        raise HTTPException(400, "Invalid ID format")


async def _user_card(user_id: str) -> dict:
    """Minimal user info for conversation list."""
    user = await db.users.find_one(
        {"_id": _oid(user_id)},
        {"full_name": 1, "email": 1, "avatar": 1, "role": 1, "profile_picture": 1},
    )
    if not user:
        return {"id": user_id, "name": "Unknown", "avatar": None}
    return {
        "id": user_id,
        "name": user.get("full_name") or user.get("email", "Unknown"),
        "avatar": user.get("profile_picture") or user.get("avatar"),
        "role": user.get("role", "student"),
    }


# ---------------------------------------------------------------------------
# REST: list conversations
# ---------------------------------------------------------------------------

@router.get("/conversations")
async def list_conversations(
    limit: int = Query(20, le=50),
    user: dict = Depends(get_current_user),
):
    """Return the current user's conversations, newest first."""
    uid = str(user["_id"])
    cursor = (
        db.dm_conversations
        .find({"participants": uid})
        .sort("updated_at", -1)
        .limit(limit)
    )
    convs = await cursor.to_list(limit)

    result = []
    for c in convs:
        other_ids = [p for p in c["participants"] if p != uid]
        other = await _user_card(other_ids[0]) if other_ids else {"id": uid, "name": "You"}
        result.append({
            "id": str(c["_id"]),
            "participant": other,
            "last_message": c.get("last_message", ""),
            "updated_at": c.get("updated_at", c.get("created_at", "")),
            "unread": await db.dm_messages.count_documents({
                "conversation_id": str(c["_id"]),
                "sender_id": {"$ne": uid},
                "read_at": None,
            }),
        })
    return {"conversations": result}


# ---------------------------------------------------------------------------
# REST: get messages in a conversation
# ---------------------------------------------------------------------------

@router.get("/conversations/{conversation_id}")
async def get_messages(
    conversation_id: str,
    limit: int = Query(50, le=100),
    before: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """Paginated messages for a conversation (newest first)."""
    uid = str(user["_id"])
    conv = await db.dm_conversations.find_one({"_id": _oid(conversation_id)})
    if not conv or uid not in conv.get("participants", []):
        raise HTTPException(404, "Conversation not found")

    query: dict = {"conversation_id": conversation_id}
    if before:
        query["_id"] = {"$lt": _oid(before)}

    cursor = db.dm_messages.find(query).sort("_id", -1).limit(limit)
    msgs = await cursor.to_list(limit)

    return {
        "messages": [
            {
                "id": str(m["_id"]),
                "sender_id": m["sender_id"],
                "text": m["text"],
                "created_at": m.get("created_at", ""),
                "read_at": m.get("read_at"),
            }
            for m in reversed(msgs)  # return in chronological order
        ]
    }


# ---------------------------------------------------------------------------
# REST: create or get conversation
# ---------------------------------------------------------------------------

@router.post("/conversations")
async def create_conversation(
    req: CreateConversationReq,
    user: dict = Depends(get_current_user),
):
    """Create (or return existing) 1:1 conversation with another user."""
    uid = str(user["_id"])
    other_id = req.participant_id

    if uid == other_id:
        raise HTTPException(400, "Cannot message yourself")

    # Check the other user exists
    other_user = await db.users.find_one({"_id": _oid(other_id)})
    if not other_user:
        raise HTTPException(404, "User not found")

    # Find existing conversation between these two users
    participants = sorted([uid, other_id])
    existing = await db.dm_conversations.find_one({"participants": participants})
    if existing:
        return {
            "id": str(existing["_id"]),
            "created": False,
            "participant": await _user_card(other_id),
        }

    # Create new conversation
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "participants": participants,
        "created_at": now,
        "updated_at": now,
        "last_message": "",
    }
    result = await db.dm_conversations.insert_one(doc)
    return {
        "id": str(result.inserted_id),
        "created": True,
        "participant": await _user_card(other_id),
    }


# ---------------------------------------------------------------------------
# REST: send message
# ---------------------------------------------------------------------------

@router.post("/conversations/{conversation_id}/send")
async def send_message(
    conversation_id: str,
    req: SendMessageReq,
    user: dict = Depends(get_current_user),
):
    """Send a message in a conversation."""
    uid = str(user["_id"])
    text = req.text.strip()
    if not text:
        raise HTTPException(400, "Message cannot be empty")

    conv = await db.dm_conversations.find_one({"_id": _oid(conversation_id)})
    if not conv or uid not in conv.get("participants", []):
        raise HTTPException(404, "Conversation not found")

    now = datetime.now(timezone.utc).isoformat()
    msg_doc = {
        "conversation_id": conversation_id,
        "sender_id": uid,
        "text": text,
        "created_at": now,
        "read_at": None,
    }
    result = await db.dm_messages.insert_one(msg_doc)
    msg_id = str(result.inserted_id)

    # Update conversation metadata
    await db.dm_conversations.update_one(
        {"_id": _oid(conversation_id)},
        {"$set": {"updated_at": now, "last_message": text[:100]}},
    )

    # Build the outbound payload
    payload = {
        "type": "new_message",
        "conversation_id": conversation_id,
        "message": {
            "id": msg_id,
            "sender_id": uid,
            "text": text,
            "created_at": now,
        },
    }

    # Push via WebSocket to all participants (including sender for multi-device)
    for pid in conv["participants"]:
        asyncio.create_task(manager.send_to_user(pid, payload))

    return {"id": msg_id, "created_at": now}


# ---------------------------------------------------------------------------
# REST: mark conversation as read
# ---------------------------------------------------------------------------

@router.put("/conversations/{conversation_id}/read")
async def mark_read(
    conversation_id: str,
    user: dict = Depends(get_current_user),
):
    """Mark all messages in a conversation as read for this user."""
    uid = str(user["_id"])
    conv = await db.dm_conversations.find_one({"_id": _oid(conversation_id)})
    if not conv or uid not in conv.get("participants", []):
        raise HTTPException(404, "Conversation not found")

    now = datetime.now(timezone.utc).isoformat()
    result = await db.dm_messages.update_many(
        {
            "conversation_id": conversation_id,
            "sender_id": {"$ne": uid},
            "read_at": None,
        },
        {"$set": {"read_at": now}},
    )

    # Notify the other participant that messages were read
    for pid in conv["participants"]:
        if pid != uid:
            asyncio.create_task(manager.send_to_user(pid, {
                "type": "messages_read",
                "conversation_id": conversation_id,
                "reader_id": uid,
                "read_at": now,
            }))

    return {"marked": result.modified_count}


# ---------------------------------------------------------------------------
# WebSocket: real-time connection
# ---------------------------------------------------------------------------

@router.websocket("/ws")
async def ws_endpoint(ws: WebSocket, token: str = Query("")):
    """
    Authenticated WebSocket for real-time message delivery.
    Connect with: ws://<host>/api/messages/ws?token=<jwt_access_token>
    """
    if not token:
        await ws.close(code=4001, reason="Missing token")
        return

    payload = decode_payload_silent(token, token_type="access")
    if not payload or "sub" not in payload:
        await ws.close(code=4001, reason="Invalid or expired token")
        return

    user_id = payload["sub"]

    # Verify user exists
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        await ws.close(code=4001, reason="Invalid user")
        return
    if not user:
        await ws.close(code=4001, reason="User not found")
        return

    uid = str(user["_id"])
    await manager.connect(uid, ws)
    logger.info("WS connected: user=%s", uid)

    try:
        while True:
            # Client can send pings or typing indicators
            data = await ws.receive_json()
            msg_type = data.get("type", "")

            if msg_type == "ping":
                await ws.send_json({"type": "pong"})

            elif msg_type == "typing":
                # Broadcast typing indicator to conversation participants
                conv_id = data.get("conversation_id")
                if conv_id:
                    conv = await db.dm_conversations.find_one({"_id": _oid(conv_id)})
                    if conv and uid in conv.get("participants", []):
                        for pid in conv["participants"]:
                            if pid != uid:
                                await manager.send_to_user(pid, {
                                    "type": "typing",
                                    "conversation_id": conv_id,
                                    "user_id": uid,
                                })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.debug("WS error for user=%s: %s", uid, e)
    finally:
        manager.disconnect(uid, ws)
        logger.info("WS disconnected: user=%s", uid)
