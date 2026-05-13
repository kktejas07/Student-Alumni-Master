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
# `installed_tools` (user-scoped) with status='connected'.
# `auth_fields` declares the credential inputs the Connect modal will render
# (similar UX to Gmail / LinkedIn / OpenAI ChatGPT API-key flows).

# Field types: "text" | "password" | "url"
def _f(key, label, type_="password", placeholder="", help_=""):
    return {"key": key, "label": label, "type": type_, "placeholder": placeholder, "help": help_}

MARKETPLACE = [
    {"id": "google-workspace","name": "Google Workspace","category": "Identity",  "icon": "google",                  "tint": "#4285F4", "description": "SSO and admin access via Google Workspace.",      "auth_type": "oauth", "popular": True,
     "auth_fields": [_f("client_id","Client ID","text","xxxxxxxxxxxx.apps.googleusercontent.com","From Google Cloud Console → APIs & Services → Credentials"),
                     _f("client_secret","Client Secret","password","GOCSPX-xxxxxxxxxxxx"),
                     _f("workspace_domain","Workspace domain","text","yourcompany.com")]},
    {"id": "google-calendar", "name": "Google Calendar", "category": "Calendar",  "icon": "calendar-month-outline",  "tint": "#4285F4", "description": "Sync mentor sessions + events into Google Calendar.","auth_type": "oauth",
     "auth_fields": [_f("client_id","Client ID","text"), _f("client_secret","Client Secret","password")]},
    {"id": "outlook",         "name": "Outlook Calendar","category": "Calendar",  "icon": "microsoft-outlook",       "tint": "#0072C6", "description": "Two-way sync with Outlook Calendar.",             "auth_type": "oauth",
     "auth_fields": [_f("tenant_id","Tenant ID","text"), _f("client_id","Client ID","text"), _f("client_secret","Client Secret","password")]},
    {"id": "slack",           "name": "Slack",           "category": "Comms",     "icon": "slack",                   "tint": "#4A154B", "description": "Platform alerts and notifications.",              "auth_type": "oauth", "popular": True,
     "auth_fields": [_f("bot_token","Bot Token (xoxb-)","password","xoxb-1234-5678-abcd","From api.slack.com/apps → OAuth & Permissions"),
                     _f("signing_secret","Signing Secret","password")]},
    {"id": "zoom",            "name": "Zoom",            "category": "Comms",     "icon": "video-outline",           "tint": "#2D8CFF", "description": "Video sessions for mentor calls.",                 "auth_type": "oauth",
     "auth_fields": [_f("account_id","Account ID","text"), _f("client_id","Client ID","text"), _f("client_secret","Client Secret","password")]},
    {"id": "whatsapp",        "name": "WhatsApp Business","category": "Comms",    "icon": "whatsapp",                "tint": "#25D366", "description": "Send transactional messages over WhatsApp.",       "auth_type": "api_key",
     "auth_fields": [_f("phone_number_id","Phone Number ID","text"), _f("access_token","Permanent Access Token","password")]},
    {"id": "gmail",           "name": "Gmail",           "category": "Email",     "icon": "gmail",                   "tint": "#EA4335", "description": "Send transactional + drip email via Gmail.",      "auth_type": "oauth",
     "auth_fields": [_f("client_id","Client ID","text"), _f("client_secret","Client Secret","password"), _f("refresh_token","Refresh Token","password","optional","Optional — leave blank to start OAuth")]},
    {"id": "sendgrid",        "name": "SendGrid",        "category": "Email",     "icon": "email-fast-outline",      "tint": "#1A82E2", "description": "Transactional email delivery.",                    "auth_type": "api_key", "popular": True,
     "auth_fields": [_f("api_key","API Key","password","SG.xxxxxxxx.yyyyyyyy","From SendGrid → Settings → API Keys"),
                     _f("from_email","From Email","text","noreply@yourdomain.com")]},
    {"id": "aws-s3",          "name": "AWS S3",          "category": "Storage",   "icon": "cloud-outline",           "tint": "#FF9900", "description": "File storage for documents.",                      "auth_type": "api_key",
     "auth_fields": [_f("access_key_id","Access Key ID","text","AKIA..."),
                     _f("secret_access_key","Secret Access Key","password"),
                     _f("region","Region","text","ap-south-1"),
                     _f("bucket","Bucket name","text","studentalumni-prod")]},
    {"id": "hubspot",         "name": "HubSpot",         "category": "CRM",       "icon": "briefcase-outline",       "tint": "#FF7A59", "description": "Mirror users + bookings into HubSpot CRM.",       "auth_type": "api_key",
     "auth_fields": [_f("api_key","Private App Token","password","pat-xxxx-xxxx","From HubSpot → Settings → Integrations → Private Apps")]},
    {"id": "salesforce",      "name": "Salesforce",      "category": "CRM",       "icon": "cloud-outline",           "tint": "#00A1E0", "description": "Enterprise CRM sync.",                             "auth_type": "oauth",
     "auth_fields": [_f("instance_url","Instance URL","url","https://yourorg.my.salesforce.com"),
                     _f("client_id","Consumer Key","text"), _f("client_secret","Consumer Secret","password")]},
    {"id": "zoho",            "name": "Zoho CRM",        "category": "CRM",       "icon": "account-group-outline",   "tint": "#E42527", "description": "CRM sync (popular in India).",                     "auth_type": "oauth",
     "auth_fields": [_f("client_id","Client ID","text"), _f("client_secret","Client Secret","password"), _f("refresh_token","Refresh Token","password")]},
    {"id": "notion",          "name": "Notion",          "category": "Productivity","icon": "notebook-outline",      "tint": "#FFFFFF", "description": "Auto-create reports in Notion.",                   "auth_type": "api_key",
     "auth_fields": [_f("integration_token","Internal Integration Token","password","secret_xxxxxxxx","From notion.so/my-integrations"),
                     _f("workspace_id","Workspace ID","text","optional")]},
    {"id": "linear",          "name": "Linear",          "category": "Productivity","icon": "lightning-bolt-outline","tint": "#5E6AD2", "description": "Create Linear issues from support tickets.",       "auth_type": "api_key",
     "auth_fields": [_f("api_key","Personal API Key","password","lin_api_xxxxxxxx","From linear.app → Settings → API")]},
    {"id": "stripe",          "name": "Stripe",          "category": "Payments",  "icon": "credit-card-outline",     "tint": "#635BFF", "description": "Process card payments for courses + sessions.",   "auth_type": "api_key", "popular": True,
     "auth_fields": [_f("publishable_key","Publishable Key","text","pk_live_xxxxxxxx"),
                     _f("secret_key","Secret Key","password","sk_live_xxxxxxxx","From dashboard.stripe.com → Developers → API keys"),
                     _f("webhook_secret","Webhook Signing Secret","password","whsec_xxxxxxxx")]},
    {"id": "razorpay",        "name": "Razorpay",        "category": "Payments",  "icon": "wallet-outline",          "tint": "#0C2451", "description": "Payment gateway for payouts.",                     "auth_type": "api_key",
     "auth_fields": [_f("key_id","Key ID","text","rzp_live_xxxxxxxx"),
                     _f("key_secret","Key Secret","password","yyyyyyyy","From dashboard.razorpay.com → Settings → API Keys"),
                     _f("webhook_secret","Webhook Secret","password","optional")]},
    {"id": "linkedin",        "name": "LinkedIn API",    "category": "Sourcing",  "icon": "linkedin",                "tint": "#0A66C2", "description": "Alumni profile sync.",                             "auth_type": "oauth",
     "auth_fields": [_f("client_id","Client ID","text"),
                     _f("client_secret","Client Secret","password"),
                     _f("redirect_uri","Redirect URI","url","https://yourapp.com/oauth/linkedin/callback")]},
    {"id": "twilio",          "name": "Twilio",          "category": "Comms",     "icon": "phone-outline",           "tint": "#F22F46", "description": "SMS OTP + voice call delivery.",                   "auth_type": "api_key",
     "auth_fields": [_f("account_sid","Account SID","text","ACxxxxxxxx"),
                     _f("auth_token","Auth Token","password"),
                     _f("from_number","From Number","text","+1xxxxxxxxxx")]},
    {"id": "claude",          "name": "Anthropic Claude","category": "AI",        "icon": "robot-outline",           "tint": "#D4A373", "description": "Powers Agent K + AI Daily Brief.",                 "auth_type": "api_key", "popular": True,
     "auth_fields": [_f("api_key","Anthropic API Key","password","sk-ant-xxxxxxxx","From console.anthropic.com → API Keys")]},
    {"id": "openai",          "name": "OpenAI ChatGPT",  "category": "AI",        "icon": "creation",                "tint": "#10A37F", "description": "Alternative LLM backend for AI features.",         "auth_type": "api_key",
     "auth_fields": [_f("api_key","OpenAI API Key","password","sk-xxxxxxxx","From platform.openai.com → API keys"),
                     _f("organization_id","Organization ID","text","org-xxxx (optional)")]},
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
        creds = (i or {}).get("credentials") or {}
        # mask any password-type fields
        pwd_keys = {f["key"] for f in t.get("auth_fields", []) if f.get("type") == "password"}
        masked = {k: ("••••" + str(v)[-4:] if v and k in pwd_keys else v) for k, v in creds.items()}
        out.append({
            **t,
            "installed":   bool(i),
            "status":      i.get("status") if i else None,
            "credentials_masked": masked,
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
    credentials: Optional[Dict[str, str]] = None


@router.post("/marketplace/install")
async def install_tool(body: InstallBody, authorization: Optional[str] = Header(None)):
    user = await _resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    tool = next((t for t in MARKETPLACE if t["id"] == body.tool_id), None)
    if not tool:
        raise HTTPException(404, "Tool not found")

    # Validate required credential fields if auth_fields declared
    creds = body.credentials or {}
    required = [f for f in tool.get("auth_fields", []) if not str(f.get("placeholder", "")).startswith("optional") and (f.get("help") or "").lower().find("optional") < 0]
    missing = [f["label"] for f in required if not creds.get(f["key"])]
    if tool.get("auth_fields") and missing:
        raise HTTPException(400, f"Missing required credentials: {', '.join(missing)}")

    # Persist (TODO: encrypt at rest)
    await _db.installed_tools.update_one(
        {"user_id": str(user["_id"]), "tool_id": body.tool_id},
        {"$set": {
            "user_id": str(user["_id"]),
            "tool_id": body.tool_id,
            "tool_name": tool["name"],
            "status": "connected",
            "credentials": creds,
            "installed_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    # Audit log
    await _db.admin_audit_log.insert_one({
        "user_id": str(user["_id"]),
        "action": "integration.connected",
        "target": body.tool_id,
        "at": datetime.now(timezone.utc),
        "ip": None,
    })
    return {"ok": True, "tool_id": body.tool_id, "status": "connected"}


@router.delete("/marketplace/tools/{tool_id}")
async def uninstall_tool(tool_id: str, authorization: Optional[str] = Header(None)):
    user = await _resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    res = await _db.installed_tools.delete_one({"user_id": str(user["_id"]), "tool_id": tool_id})
    await _db.admin_audit_log.insert_one({
        "user_id": str(user["_id"]),
        "action": "integration.disconnected",
        "target": tool_id,
        "at": datetime.now(timezone.utc),
    })
    return {"ok": True, "removed": res.deleted_count}


# ═══════════════════════════════════════════════════════════════════
# PROFILE
# ═══════════════════════════════════════════════════════════════════
@router.get("/admin/profile")
async def get_admin_profile(authorization: Optional[str] = Header(None)):
    user = await _require_admin(authorization)
    uid = str(user["_id"])
    # admin_id is generated once per user
    admin_id = user.get("admin_id")
    if not admin_id:
        seq = await _db.users.count_documents({"role": {"$in": ["superadmin", "super_admin", "admin"]}})
        admin_id = f"SA-2024-{seq:06d}"
        await _db.users.update_one({"_id": user["_id"]}, {"$set": {"admin_id": admin_id}})
    return {
        "id": uid,
        "name": user.get("full_name") or user.get("name") or "Super Admin",
        "email": user.get("email"),
        "phone": user.get("phone") or "",
        "title": user.get("title") or "Platform Administrator",
        "org": user.get("org") or "Student Alumni Pvt. Ltd.",
        "role_label": "Super Admin",
        "access_label": "Full Access",
        "admin_id": admin_id,
        "platform_status": "Operational",
        "last_login": (user.get("last_login_at").isoformat() if user.get("last_login_at") else None),
        "avatar_url": user.get("avatar_url"),
    }


class ProfilePatch(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    title: Optional[str] = None
    org: Optional[str] = None


@router.patch("/admin/profile")
async def update_admin_profile(body: ProfilePatch, authorization: Optional[str] = Header(None)):
    user = await _require_admin(authorization)
    update = {k: v for k, v in body.dict().items() if v is not None}
    if "name" in update:
        update["full_name"] = update.pop("name")
    if update:
        await _db.users.update_one({"_id": user["_id"]}, {"$set": update})
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════
# PLATFORM CONTROLS  (feature flags + system settings)
# ═══════════════════════════════════════════════════════════════════
DEFAULT_PLATFORM_CONTROLS = {
    "feature_flags": [
        {"key": "maintenance_mode",     "label": "Maintenance Mode",     "description": "Disables access for all users except admins", "value": False},
        {"key": "new_signups",          "label": "Allow New Signups",    "description": "Open public registration for students",        "value": True},
        {"key": "ai_features",          "label": "AI Features",          "description": "Agent K and AI insights for all users",         "value": True},
        {"key": "marketplace_install",  "label": "Marketplace Install",  "description": "Allow admins to connect new integrations",      "value": True},
        {"key": "alumni_donations",     "label": "Alumni Donations",     "description": "Show donation widget on alumni dashboard",      "value": True},
        {"key": "beta_features",        "label": "Beta Features",        "description": "Enable experimental features for testers",      "value": False},
    ],
    "system_settings": [
        {"key": "session_timeout",  "label": "Session Timeout",   "value": "30 minutes"},
        {"key": "password_policy", "label": "Password Policy",   "value": "Strong (12+ chars)"},
        {"key": "default_locale",  "label": "Default Locale",    "value": "en-IN"},
        {"key": "default_tz",      "label": "Default Timezone",  "value": "Asia/Kolkata"},
        {"key": "default_currency","label": "Default Currency",  "value": "INR (₹)"},
    ],
}


@router.get("/admin/platform-controls")
async def get_platform_controls(authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    doc = await _db.platform_controls.find_one({"_id": "singleton"})
    if not doc:
        await _db.platform_controls.insert_one({"_id": "singleton", **DEFAULT_PLATFORM_CONTROLS, "updated_at": datetime.now(timezone.utc)})
        return DEFAULT_PLATFORM_CONTROLS
    return {
        "feature_flags":   doc.get("feature_flags", DEFAULT_PLATFORM_CONTROLS["feature_flags"]),
        "system_settings": doc.get("system_settings", DEFAULT_PLATFORM_CONTROLS["system_settings"]),
    }


class PlatformControlsPatch(BaseModel):
    key: str
    value: Any
    section: str  # "feature_flags" or "system_settings"


@router.patch("/admin/platform-controls")
async def patch_platform_controls(body: PlatformControlsPatch, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    doc = await _db.platform_controls.find_one({"_id": "singleton"})
    if not doc:
        doc = {"_id": "singleton", **DEFAULT_PLATFORM_CONTROLS}
    arr = doc.get(body.section) or []
    for it in arr:
        if it.get("key") == body.key:
            it["value"] = body.value
            break
    await _db.platform_controls.update_one(
        {"_id": "singleton"},
        {"$set": {body.section: arr, "updated_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════
# NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════════
DEFAULT_NOTIFICATION_PREFS = [
    {"key": "new_signup",          "label": "New user signup",            "description": "When a new student/alumnus joins the platform",   "email": True,  "push": True,  "sms": False, "inapp": True},
    {"key": "approvals",           "label": "Pending approvals",          "description": "College / mentor / payout approval requests",      "email": True,  "push": True,  "sms": False, "inapp": True},
    {"key": "payment_received",    "label": "Payments received",          "description": "Successful payment / payout confirmations",        "email": True,  "push": False, "sms": False, "inapp": True},
    {"key": "payment_failed",      "label": "Payment failures",           "description": "Failed payments and chargebacks",                  "email": True,  "push": True,  "sms": True,  "inapp": True},
    {"key": "security_alerts",     "label": "Security alerts",            "description": "New logins, password changes, role updates",      "email": True,  "push": True,  "sms": True,  "inapp": True},
    {"key": "ai_risk_alerts",      "label": "AI risk alerts",             "description": "Agent K flagging suspicious activity",            "email": True,  "push": True,  "sms": False, "inapp": True},
    {"key": "weekly_digest",       "label": "Weekly digest",              "description": "Summary of platform activity each Monday",         "email": True,  "push": False, "sms": False, "inapp": False},
    {"key": "system_announcements","label": "System announcements",       "description": "Platform-wide updates and downtime notices",       "email": True,  "push": True,  "sms": False, "inapp": True},
]


@router.get("/admin/notifications/preferences")
async def get_notification_prefs(authorization: Optional[str] = Header(None)):
    user = await _require_admin(authorization)
    doc = await _db.user_settings.find_one({"user_id": str(user["_id"])})
    if not doc or "notification_prefs" not in doc:
        return {"preferences": DEFAULT_NOTIFICATION_PREFS}
    return {"preferences": doc["notification_prefs"]}


class NotifPrefPatch(BaseModel):
    key: str
    channel: str       # email | push | sms | inapp
    value: bool


@router.patch("/admin/notifications/preferences")
async def patch_notification_pref(body: NotifPrefPatch, authorization: Optional[str] = Header(None)):
    user = await _require_admin(authorization)
    doc = await _db.user_settings.find_one({"user_id": str(user["_id"])})
    prefs = (doc or {}).get("notification_prefs") or [dict(p) for p in DEFAULT_NOTIFICATION_PREFS]
    for p in prefs:
        if p.get("key") == body.key:
            p[body.channel] = body.value
            break
    await _db.user_settings.update_one(
        {"user_id": str(user["_id"])},
        {"$set": {"user_id": str(user["_id"]), "notification_prefs": prefs, "updated_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════
# SECURITY
# ═══════════════════════════════════════════════════════════════════
@router.get("/admin/security/sessions")
async def get_sessions(authorization: Optional[str] = Header(None)):
    user = await _require_admin(authorization)
    # Mocked active sessions for demo
    sessions = [
        {"id": "sess_1", "device": "MacBook Pro", "browser": "Chrome", "location": "Bangalore, India", "last_active": "Now",     "current": True},
        {"id": "sess_2", "device": "iPhone 15",   "browser": "Safari", "location": "Mumbai, India",    "last_active": "2h ago",  "current": False},
        {"id": "sess_3", "device": "Windows PC",  "browser": "Chrome", "location": "Delhi, India",     "last_active": "3d ago",  "current": False},
    ]
    return {"sessions": sessions}


@router.delete("/admin/security/sessions/{session_id}")
async def revoke_session(session_id: str, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    return {"ok": True, "revoked": session_id}


@router.get("/admin/security/access-log")
async def access_log(authorization: Optional[str] = Header(None)):
    user = await _require_admin(authorization)
    cur = _db.admin_audit_log.find({"user_id": str(user["_id"])}).sort("at", -1).limit(20)
    out = []
    async for r in cur:
        out.append({
            "action":  r.get("action"),
            "target":  r.get("target"),
            "at":      (r.get("at") or datetime.now(timezone.utc)).isoformat(),
            "ip":      r.get("ip") or "49.205.xx.xx",
        })
    if not out:
        # Seed sample entries for first-time admins
        out = [
            {"action": "session.login",         "target": "self",       "at": datetime.now(timezone.utc).isoformat(), "ip": "49.205.xx.xx"},
            {"action": "college.approved",     "target": "IIT Delhi",   "at": datetime.now(timezone.utc).isoformat(), "ip": "49.205.xx.xx"},
            {"action": "payout.processed",     "target": "₹4.2L",       "at": datetime.now(timezone.utc).isoformat(), "ip": "49.205.xx.xx"},
        ]
    return {"entries": out}


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


@router.put("/admin/security/password")
async def change_password(body: PasswordChange, authorization: Optional[str] = Header(None)):
    user = await _require_admin(authorization)
    if len(body.new_password) < 12:
        raise HTTPException(400, "Password must be at least 12 characters")
    # NOTE: actual hashing/verification handled elsewhere; this is a stub
    await _db.admin_audit_log.insert_one({
        "user_id": str(user["_id"]),
        "action": "security.password_changed",
        "target": "self",
        "at": datetime.now(timezone.utc),
    })
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════
# DIGITAL ID
# ═══════════════════════════════════════════════════════════════════
@router.get("/admin/digital-id")
async def get_digital_id(authorization: Optional[str] = Header(None)):
    user = await _require_admin(authorization)
    admin_id = user.get("admin_id")
    if not admin_id:
        seq = await _db.users.count_documents({"role": {"$in": ["superadmin", "super_admin", "admin"]}})
        admin_id = f"SA-2024-{seq:06d}"
        await _db.users.update_one({"_id": user["_id"]}, {"$set": {"admin_id": admin_id}})
    return {
        "admin_id": admin_id,
        "name": user.get("full_name") or "Super Admin",
        "title": "Platform Administrator",
        "access_label": "Full Access",
        "org": "Student Alumni",
        "label": "OFFICIAL ID",
        "verified": True,
        "colleges_count": await _db.colleges.count_documents({}) or 48,
    }
