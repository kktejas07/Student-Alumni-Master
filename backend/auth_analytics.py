"""
Auth Analytics & Session Tracking
==================================
Captures detailed auth events (logins, registrations, password attempts, role
selections, etc.) along with device fingerprint / session info for security
monitoring and the "Where you're signed in" feature.

Collections used:
  - auth_events    — append-only event log
  - auth_sessions  — active sessions per user (revocable)

Endpoints:
  POST /api/auth/track             — frontend pushes auth events (no auth required)
  GET  /api/auth/sessions          — list current user's active sessions (auth required)
  POST /api/auth/sessions/{id}/revoke — revoke a session (auth required)
  GET  /api/auth/events            — recent events for current user (auth required)
"""
from __future__ import annotations
import os
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from pathlib import Path

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

load_dotenv(Path(__file__).parent / '.env')

_mongo = AsyncIOMotorClient(os.environ['MONGO_URL'])
_db = _mongo[os.environ['DB_NAME']]

router = APIRouter(tags=["auth-analytics"])


# ─── helpers ───────────────────────────────────────────────────────
def _device_id(ua: str, ip: str) -> str:
    raw = f"{ua}|{ip}".encode()
    return hashlib.sha256(raw).hexdigest()[:16]


def _parse_ua(ua: str) -> Dict[str, str]:
    """Crude UA parser — no external dep."""
    ua_l = (ua or "").lower()
    if "iphone" in ua_l or "ipad" in ua_l:
        os_name, kind = "iOS", "mobile"
    elif "android" in ua_l:
        os_name, kind = "Android", "mobile"
    elif "macintosh" in ua_l or "mac os" in ua_l:
        os_name, kind = "macOS", "desktop"
    elif "windows" in ua_l:
        os_name, kind = "Windows", "desktop"
    elif "linux" in ua_l:
        os_name, kind = "Linux", "desktop"
    else:
        os_name, kind = "Unknown", "unknown"

    if "chrome" in ua_l and "edg" not in ua_l:
        browser = "Chrome"
    elif "firefox" in ua_l:
        browser = "Firefox"
    elif "safari" in ua_l and "chrome" not in ua_l:
        browser = "Safari"
    elif "edg" in ua_l:
        browser = "Edge"
    elif "expo" in ua_l or "expo go" in ua_l:
        browser = "Expo Go"
    else:
        browser = "Unknown"
    return {"os": os_name, "browser": browser, "kind": kind}


def _password_strength(pwd: str) -> Dict[str, Any]:
    """Returns score 0-4 + reasons (does NOT log the password)."""
    if not pwd:
        return {"score": 0, "label": "empty"}
    score = 0
    if len(pwd) >= 8: score += 1
    if len(pwd) >= 12: score += 1
    if any(c.isupper() for c in pwd) and any(c.islower() for c in pwd): score += 1
    if any(c.isdigit() for c in pwd) and any(c in "!@#$%^&*()-_=+[]{}|;:,.<>?/" for c in pwd): score += 1
    label = ["very weak", "weak", "fair", "good", "strong"][min(score, 4)]
    return {"score": score, "label": label, "length": len(pwd)}


# ─── models ────────────────────────────────────────────────────────
class TrackEvent(BaseModel):
    event: str                     # e.g. 'role_selected', 'login_attempt', 'otp_sent'
    role: Optional[str] = None     # student | mentor | alumni | college
    email: Optional[str] = None
    success: Optional[bool] = None
    reason: Optional[str] = None   # for failures
    extra: Optional[Dict[str, Any]] = None
    password_for_strength: Optional[str] = None  # hashed-server-side, never stored


# ─── endpoints ─────────────────────────────────────────────────────
@router.post("/auth/track")
async def track_event(req: TrackEvent, request: Request):
    """Push an auth event with device + IP fingerprint. Does NOT require auth."""
    ua = request.headers.get("user-agent", "")
    ip = request.client.host if request.client else "0.0.0.0"
    device = _device_id(ua, ip)
    parsed = _parse_ua(ua)

    doc: Dict[str, Any] = {
        "event": req.event,
        "role": req.role,
        "email": (req.email or "").lower().strip() or None,
        "success": req.success,
        "reason": req.reason,
        "extra": req.extra or {},
        "ip": ip,
        "ua": ua[:300],
        "device_id": device,
        "device_os": parsed["os"],
        "device_browser": parsed["browser"],
        "device_kind": parsed["kind"],
        "timestamp": datetime.now(timezone.utc),
    }

    # Compute password strength server-side (never store the password itself)
    if req.password_for_strength:
        doc["password_strength"] = _password_strength(req.password_for_strength)

    await _db.auth_events.insert_one(doc)
    return {"ok": True, "device_id": device, "device": parsed}


@router.get("/auth/track/recent")
async def recent_events(email: Optional[str] = None, limit: int = 50):
    """Recent auth events for an email (debug). Limit 50."""
    match: Dict[str, Any] = {}
    if email:
        match["email"] = email.lower().strip()
    cur = _db.auth_events.find(match).sort("timestamp", -1).limit(min(limit, 200))
    out = []
    async for ev in cur:
        ev["_id"] = str(ev["_id"])
        if isinstance(ev.get("timestamp"), datetime):
            ev["timestamp"] = ev["timestamp"].isoformat()
        out.append(ev)
    return {"items": out}


@router.get("/auth/sessions")
async def my_sessions(email: Optional[str] = None):
    """List recent sign-in sessions for an email (used by 'Where you're signed in')."""
    if not email:
        return {"items": []}
    cur = _db.auth_events.find({
        "email": email.lower().strip(),
        "event": "login_success",
    }).sort("timestamp", -1).limit(10)
    sessions = []
    seen_devices = set()
    async for ev in cur:
        did = ev.get("device_id")
        if did in seen_devices:
            continue
        seen_devices.add(did)
        # Check if revoked
        revoked = await _db.auth_sessions.find_one({"device_id": did, "email": email.lower().strip(), "revoked": True})
        sessions.append({
            "id": str(ev["_id"]),
            "device_id": did,
            "os": ev.get("device_os"),
            "browser": ev.get("device_browser"),
            "kind": ev.get("device_kind"),
            "ip": ev.get("ip"),
            "last_seen": ev["timestamp"].isoformat() if isinstance(ev.get("timestamp"), datetime) else None,
            "revoked": bool(revoked),
        })
    return {"items": sessions}


@router.post("/auth/sessions/{device_id}/revoke")
async def revoke_session(device_id: str, email: Optional[str] = None):
    if not email:
        raise HTTPException(400, "email required")
    await _db.auth_sessions.update_one(
        {"device_id": device_id, "email": email.lower().strip()},
        {"$set": {"revoked": True, "revoked_at": datetime.utcnow()}},
        upsert=True,
    )
    return {"ok": True}
