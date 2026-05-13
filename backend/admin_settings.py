"""
admin_settings.py — Super-Admin Settings (Roles & Permissions + Marketplace).

Provides CRUD for:
  - /api/admin/roles       (admin_roles collection)
  - /api/admin/permissions (read-only catalog of available perms)
  - /api/marketplace/tools (read-only catalog of installable tools)
  - /api/marketplace/installed (per-user/per-org installed tool list)
  - /api/marketplace/install + /api/marketplace/uninstall

Marketplace installs are MOCKED — they create an `installed_tools` row
with status='mock_connected' so the UI can show Connected/Disconnect
states. Wiring real OAuth flows can plug into this same row schema.
"""
from __future__ import annotations
import os
from datetime import datetime, timezone
from typing import Optional, Any, Dict, List

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Header, Body
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from pydantic import BaseModel
import jwt as _jwt

load_dotenv(Path(__file__).parent / ".env")

_mongo = AsyncIOMotorClient(os.environ["MONGO_URL"])
_db = _mongo[os.environ["DB_NAME"]]

router = APIRouter(tags=["admin-settings"])

_JWT_SECRET = os.environ.get("JWT_SECRET", "")
_JWT_ALG = os.environ.get("JWT_ALGORITHM", "HS256")


async def _resolve_user(authorization: Optional[str]) -> Optional[dict]:
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


async def _require_admin(authorization: Optional[str]) -> dict:
    user = await _resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    if user.get("role") not in {"superadmin", "super_admin", "admin"}:
        raise HTTPException(403, "Super-admin only")
    return user


# ─── Permission catalog (read-only) ───────────────────────────────
PERMISSIONS_CATALOG = [
    {"id": "users.view",       "group": "Users",       "label": "View users"},
    {"id": "users.edit",       "group": "Users",       "label": "Edit users"},
    {"id": "users.delete",     "group": "Users",       "label": "Delete users"},
    {"id": "users.export",     "group": "Users",       "label": "Export users to CSV"},
    {"id": "colleges.view",    "group": "Colleges",    "label": "View colleges"},
    {"id": "colleges.manage",  "group": "Colleges",    "label": "Add / edit colleges"},
    {"id": "mentors.approve",  "group": "Mentors",     "label": "Approve mentor signups"},
    {"id": "events.create",    "group": "Events",      "label": "Create events"},
    {"id": "events.delete",    "group": "Events",      "label": "Delete events"},
    {"id": "payments.view",    "group": "Payments",    "label": "View payments + transactions"},
    {"id": "payments.refund",  "group": "Payments",    "label": "Issue refunds"},
    {"id": "analytics.view",   "group": "Analytics",   "label": "View analytics dashboards"},
    {"id": "settings.manage",  "group": "Settings",    "label": "Edit platform settings"},
    {"id": "roles.manage",     "group": "Settings",    "label": "Create / edit roles"},
    {"id": "marketplace.install", "group": "Settings", "label": "Install marketplace tools"},
    {"id": "ai.run",           "group": "AI",          "label": "Run Agent K + AI tools"},
]


# Built-in (system) roles seeded on first read
SYSTEM_ROLES = [
    {"key": "super_admin", "name": "Super Admin",   "description": "Full platform access. Cannot be edited.", "is_system": True, "permissions": [p["id"] for p in PERMISSIONS_CATALOG]},
    {"key": "college_admin","name": "College Admin", "description": "Manages students and events for one college.", "is_system": True, "permissions": ["users.view","users.edit","colleges.view","events.create","events.delete","analytics.view"]},
    {"key": "mentor",      "name": "Mentor",        "description": "Provides mentorship + workshops.",       "is_system": True, "permissions": ["users.view","events.create","analytics.view"]},
    {"key": "support",     "name": "Support Agent", "description": "Read-only with limited mutate rights.",  "is_system": True, "permissions": ["users.view","payments.view","analytics.view"]},
]


async def _ensure_system_roles():
    for r in SYSTEM_ROLES:
        await _db.admin_roles.update_one(
            {"key": r["key"]},
            {"$setOnInsert": {**r, "created_at": datetime.now(timezone.utc), "user_count": 0}},
            upsert=True,
        )


@router.get("/admin/permissions")
async def list_permissions(authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    # group by group label
    groups: Dict[str, List[dict]] = {}
    for p in PERMISSIONS_CATALOG:
        groups.setdefault(p["group"], []).append(p)
    return {"groups": [{"group": g, "items": items} for g, items in groups.items()]}


@router.get("/admin/roles")
async def list_roles(authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    await _ensure_system_roles()
    cur = _db.admin_roles.find().sort([("is_system", -1), ("created_at", 1)])
    out = []
    async for r in cur:
        # user_count: how many users currently have this role
        uc = await _db.users.count_documents({"role": r.get("key")}) if r.get("key") else 0
        out.append({
            "id":           str(r["_id"]),
            "key":          r.get("key"),
            "name":         r.get("name"),
            "description":  r.get("description", ""),
            "is_system":    bool(r.get("is_system")),
            "permissions":  r.get("permissions", []),
            "user_count":   uc,
            "created_at":   (r.get("created_at") or datetime.now(timezone.utc)).isoformat(),
        })
    return {"roles": out}


class RoleBody(BaseModel):
    name: str
    description: Optional[str] = ""
    permissions: List[str] = []


@router.post("/admin/roles")
async def create_role(body: RoleBody, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    name = body.name.strip()
    if not name:
        raise HTTPException(400, "Role name required")
    key = "_".join(name.lower().split())
    if await _db.admin_roles.find_one({"key": key}):
        raise HTTPException(409, "A role with this name already exists")
    # Validate every permission id is real
    valid_ids = {p["id"] for p in PERMISSIONS_CATALOG}
    perms = [p for p in body.permissions if p in valid_ids]
    doc = {
        "key": key, "name": name, "description": body.description or "",
        "is_system": False, "permissions": perms,
        "created_at": datetime.now(timezone.utc),
    }
    res = await _db.admin_roles.insert_one(doc)
    return {
        "id": str(res.inserted_id),
        "key": doc["key"], "name": doc["name"], "description": doc["description"],
        "is_system": False, "permissions": doc["permissions"],
        "user_count": 0,
        "created_at": doc["created_at"].isoformat(),
    }


@router.patch("/admin/roles/{role_id}")
async def update_role(role_id: str, body: Dict[str, Any] = Body(...), authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from bson import ObjectId
    r = await _db.admin_roles.find_one({"_id": ObjectId(role_id)})
    if not r:
        raise HTTPException(404, "Role not found")
    if r.get("is_system"):
        raise HTTPException(403, "System roles cannot be edited")
    update: Dict[str, Any] = {}
    if "name" in body:        update["name"] = body["name"]
    if "description" in body: update["description"] = body["description"]
    if "permissions" in body:
        valid_ids = {p["id"] for p in PERMISSIONS_CATALOG}
        update["permissions"] = [p for p in body["permissions"] if p in valid_ids]
    if update:
        update["updated_at"] = datetime.now(timezone.utc)
        await _db.admin_roles.update_one({"_id": ObjectId(role_id)}, {"$set": update})
    return {"ok": True}


@router.delete("/admin/roles/{role_id}")
async def delete_role(role_id: str, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from bson import ObjectId
    r = await _db.admin_roles.find_one({"_id": ObjectId(role_id)})
    if not r:
        raise HTTPException(404, "Role not found")
    if r.get("is_system"):
        raise HTTPException(403, "System roles cannot be deleted")
    await _db.admin_roles.delete_one({"_id": ObjectId(role_id)})
    return {"ok": True}


# ─── MARKETPLACE ─────────────────────────────────────────────────
# Static catalog of integratable tools. Each tool gets installed into
# `installed_tools` (user-scoped) with status='mock_connected'.
MARKETPLACE = [
    {"id": "google-calendar", "name": "Google Calendar", "category": "Calendar",  "icon": "calendar-month-outline", "tint": "#4285F4", "description": "Sync mentor sessions + events into Google Calendar.", "auth_type": "oauth", "popular": True},
    {"id": "outlook",         "name": "Outlook Calendar","category": "Calendar",  "icon": "microsoft-outlook",       "tint": "#0072C6", "description": "Two-way sync with Outlook Calendar.",            "auth_type": "oauth"},
    {"id": "slack",           "name": "Slack",           "category": "Comms",     "icon": "slack",                   "tint": "#4A154B", "description": "Notify channels on approvals + new sign-ups.",  "auth_type": "oauth", "popular": True},
    {"id": "zoom",            "name": "Zoom",            "category": "Comms",     "icon": "video-outline",           "tint": "#2D8CFF", "description": "Generate Zoom links for mentor sessions.",       "auth_type": "oauth"},
    {"id": "whatsapp",        "name": "WhatsApp Business","category": "Comms",    "icon": "whatsapp",                "tint": "#25D366", "description": "Send transactional messages over WhatsApp.",      "auth_type": "api_key"},
    {"id": "gmail",           "name": "Gmail",           "category": "Email",     "icon": "gmail",                   "tint": "#EA4335", "description": "Send transactional + drip email via Gmail.",     "auth_type": "oauth"},
    {"id": "sendgrid",        "name": "SendGrid",        "category": "Email",     "icon": "email-fast-outline",      "tint": "#1A82E2", "description": "High-volume transactional email.",               "auth_type": "api_key", "popular": True},
    {"id": "hubspot",         "name": "HubSpot",         "category": "CRM",       "icon": "briefcase-outline",       "tint": "#FF7A59", "description": "Mirror users + bookings into HubSpot CRM.",      "auth_type": "oauth"},
    {"id": "salesforce",      "name": "Salesforce",      "category": "CRM",       "icon": "cloud-outline",           "tint": "#00A1E0", "description": "Enterprise CRM sync.",                            "auth_type": "oauth"},
    {"id": "zoho",            "name": "Zoho CRM",        "category": "CRM",       "icon": "account-group-outline",   "tint": "#E42527", "description": "CRM sync (popular in India).",                    "auth_type": "oauth"},
    {"id": "notion",          "name": "Notion",          "category": "Productivity","icon": "notebook-outline",      "tint": "#000000", "description": "Mirror knowledge base + meeting notes.",          "auth_type": "oauth"},
    {"id": "linear",          "name": "Linear",          "category": "Productivity","icon": "lightning-bolt-outline","tint": "#5E6AD2", "description": "Create Linear issues from support tickets.",      "auth_type": "oauth"},
    {"id": "stripe",          "name": "Stripe",          "category": "Payments",  "icon": "credit-card-outline",     "tint": "#635BFF", "description": "Process card payments for courses + sessions.",   "auth_type": "oauth", "popular": True},
    {"id": "razorpay",        "name": "Razorpay",        "category": "Payments",  "icon": "wallet-outline",          "tint": "#0C2451", "description": "UPI + card payments (India).",                    "auth_type": "api_key"},
    {"id": "linkedin",        "name": "LinkedIn",        "category": "Sourcing",  "icon": "linkedin",                "tint": "#0A66C2", "description": "Pull mentor + alumni profiles from LinkedIn.",    "auth_type": "oauth"},
    {"id": "twilio",          "name": "Twilio",          "category": "Comms",     "icon": "phone-outline",           "tint": "#F22F46", "description": "SMS OTP + voice call delivery.",                  "auth_type": "api_key"},
    {"id": "claude",          "name": "Anthropic Claude","category": "AI",        "icon": "robot-outline",           "tint": "#D4A373", "description": "Powers Agent K + AI Daily Brief.",                "auth_type": "api_key", "popular": True},
    {"id": "openai",          "name": "OpenAI",          "category": "AI",        "icon": "creation",                "tint": "#10A37F", "description": "Alternative LLM backend for AI features.",        "auth_type": "api_key"},
]


@router.get("/marketplace/tools")
async def list_tools(authorization: Optional[str] = Header(None)):
    user = await _resolve_user(authorization)
    sid = str(user["_id"]) if user else None
    installed_map: Dict[str, dict] = {}
    if sid:
        cur = _db.installed_tools.find({"user_id": sid})
        async for it in cur:
            installed_map[it["tool_id"]] = it
    out = []
    for t in MARKETPLACE:
        i = installed_map.get(t["id"])
        out.append({
            **t,
            "installed":   bool(i),
            "status":      i.get("status") if i else None,
            "installed_at": (i.get("installed_at").isoformat() if i and i.get("installed_at") else None),
        })
    # group by category
    groups: Dict[str, List[dict]] = {}
    for t in out:
        groups.setdefault(t["category"], []).append(t)
    return {
        "groups": [{"category": g, "items": items} for g, items in groups.items()],
        "all": out,
        "installed_count": sum(1 for t in out if t["installed"]),
        "available_count": len(out),
    }


class InstallBody(BaseModel):
    tool_id: str


@router.post("/marketplace/install")
async def install_tool(body: InstallBody, authorization: Optional[str] = Header(None)):
    user = await _resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    tool = next((t for t in MARKETPLACE if t["id"] == body.tool_id), None)
    if not tool:
        raise HTTPException(404, "Tool not found")
    # Mock install — just upsert a row. Real OAuth would happen here.
    await _db.installed_tools.update_one(
        {"user_id": str(user["_id"]), "tool_id": body.tool_id},
        {"$set": {
            "user_id": str(user["_id"]),
            "tool_id": body.tool_id,
            "tool_name": tool["name"],
            "status": "mock_connected",
            "installed_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    return {"ok": True, "tool_id": body.tool_id, "status": "mock_connected",
            "note": "MOCKED — real OAuth/API-key flow not wired in this build."}


@router.delete("/marketplace/tools/{tool_id}")
async def uninstall_tool(tool_id: str, authorization: Optional[str] = Header(None)):
    user = await _resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    res = await _db.installed_tools.delete_one({"user_id": str(user["_id"]), "tool_id": tool_id})
    return {"ok": True, "removed": res.deleted_count}
