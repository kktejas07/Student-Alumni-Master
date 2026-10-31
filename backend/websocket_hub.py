"""
websocket_hub.py — Visitor Radar real-time hub (VR7).

Single in-process hub. Admins open one WebSocket at
``/api/ws/visitor-radar?token=<jwt>`` and receive:

  {"type": "radar_connected", "viewers": N}   — on connect
  {"type": "visitor_heartbeat", "data": {...}} — every new/upd visitor
  {"type": "summary_update", "data": {...}}    — live 5-min + 24h counts
  {"type": "visitor_alert", "data": {...}}     — anomaly detector alerts
  {"type": "pong"}                             — keepalive reply to "ping"

Auth: JWT via query param (browser WebSockets cannot set headers),
validated with the same helpers as the REST layer; admin role required.

Best-effort by design: on multi-worker deployments only the worker that
holds the admin's socket sees heartbeats from its own workers — acceptable
for an admin radar view; the client falls back to 30s polling anyway.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Set

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState

from core.db import db as _db
from core.deps import decode_payload_silent, ensure_admin

logger = logging.getLogger("visitor_radar_ws")
router = APIRouter(tags=["visitor-radar-ws"])

_connected: Set[WebSocket] = set()


@router.websocket("/ws/visitor-radar")
async def ws_visitor_radar(
    websocket: WebSocket,
    token: Optional[str] = Query(None, description="Admin JWT access token"),
):
    payload = decode_payload_silent(token or "", token_type="access")
    authorized = bool(payload)
    if payload:
        try:
            ensure_admin(payload)
        except HTTPException:
            authorized = False
    if not authorized:
        await websocket.close(code=4403, reason="Forbidden")
        return

    await websocket.accept()
    _connected.add(websocket)
    try:
        await websocket.send_json({
            "type": "radar_connected",
            "viewers": len(_connected),
            "ts": datetime.now(timezone.utc).isoformat(),
        })
        while True:
            msg = await websocket.receive_text()
            if msg.strip() == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        _connected.discard(websocket)


async def broadcast_radar(payload: Dict[str, Any]) -> int:
    """Send a radar event to every connected admin; drop dead sockets."""
    if not _connected:
        return 0
    dead = []
    for ws in list(_connected):
        if ws.client_state != WebSocketState.CONNECTED:
            dead.append(ws)
            continue
        try:
            await ws.send_json(payload)
        except Exception:  # noqa: BLE001
            dead.append(ws)
    for ws in dead:
        _connected.discard(ws)
    return len(_connected)


def radar_viewer_count() -> int:
    return len(_connected)


async def radar_summary_snapshot() -> Dict[str, Any]:
    """Same shape the live endpoint reports: live now (5m) + last 24h totals."""
    now = datetime.now(timezone.utc)
    since5 = now - timedelta(minutes=5)
    since24 = now - timedelta(hours=24)

    async def _count(match: Dict[str, Any]) -> Dict[str, int]:
        rows = await _db.visitor_sessions.aggregate(
            [
                {"$match": match},
                {"$group": {
                    "_id": None,
                    "n": {"$sum": 1},
                    "reg": {"$sum": {"$cond": [
                        {"$eq": ["$is_registered", True]}, 1, 0]}},
                }},
            ],
        ).to_list(1)
        doc = rows[0] if rows else {}
        return {"visitors": int(doc.get("n", 0)),
                "registered": int(doc.get("reg", 0))}

    live5 = await _count({"last_heartbeat": {"$gte": since5}})
    last24 = await _count({"last_heartbeat": {"$gte": since24}})
    return {
        "live_last_5min": live5,
        "last_24h": last24,
        "radar_viewers": radar_viewer_count(),
        "ts": now.isoformat(),
    }


async def push_heartbeat_radar(summary: Dict[str, Any]) -> None:
    """Fire-and-forget hook called from the heartbeat endpoint."""
    try:
        await broadcast_radar({"type": "visitor_heartbeat", "data": summary})
        snap = await radar_summary_snapshot()
        await broadcast_radar({"type": "summary_update", "data": snap})
    except Exception as e:  # noqa: BLE001
        logger.debug("radar heartbeat push failed: %s", e)
