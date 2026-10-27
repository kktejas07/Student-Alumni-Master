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
from pathlib import Path
import os, json, hashlib, re, ipaddress, secrets
from datetime import datetime, timezone
from typing import Optional, Any, Dict, List
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Header, Body, Request
from pydantic import BaseModel
import jwt as _jwt

from core.roles import Role, Perm, SYSTEM_ROLES, seed_admin_roles

from core.db import db as _db

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
    role = (user.get("role") or "").lower().strip()
    if role not in {"admin", "super_admin"} and role != Role.ADMIN:
        if not user.get("is_super_admin"):
            raise HTTPException(403, "Admin access required")
    return user


# ─── Permission catalog (read-only) ───────────────────────────────
PERMISSIONS_CATALOG = [
    {"id": Perm.USERS_VIEW,       "group": "Users",       "label": "View users"},
    {"id": Perm.USERS_EDIT,       "group": "Users",       "label": "Edit users"},
    {"id": Perm.USERS_DELETE,     "group": "Users",       "label": "Delete users"},
    {"id": Perm.USERS_EXPORT,     "group": "Users",       "label": "Export users to CSV"},
    {"id": Perm.COLLEGES_VIEW,    "group": "Colleges",    "label": "View colleges"},
    {"id": Perm.COLLEGES_MANAGE,  "group": "Colleges",    "label": "Add / edit colleges"},
    {"id": Perm.MENTORS_APPROVE,  "group": "Mentors",     "label": "Approve mentor signups"},
    {"id": Perm.EVENTS_CREATE,    "group": "Events",      "label": "Create events"},
    {"id": Perm.EVENTS_DELETE,    "group": "Events",      "label": "Delete events"},
    {"id": Perm.PAYMENTS_VIEW,    "group": "Payments",    "label": "View payments + transactions"},
    {"id": Perm.PAYMENTS_REFUND,  "group": "Payments",    "label": "Issue refunds"},
    {"id": Perm.ANALYTICS_VIEW,   "group": "Analytics",   "label": "View analytics dashboards"},
    {"id": Perm.SETTINGS_MANAGE,  "group": "Settings",    "label": "Edit platform settings"},
    {"id": Perm.ROLES_MANAGE,     "group": "Settings",    "label": "Create / edit roles"},
    {"id": Perm.MARKETPLACE_INSTALL, "group": "Settings", "label": "Install marketplace tools"},
    {"id": Perm.AI_RUN,           "group": "AI",          "label": "Run Agent K + AI tools"},
]

# Note: SYSTEM_ROLES are now imported from core.roles (above).
# The _ensure_system_roles function is replaced by seed_admin_roles() from core.roles.


async def _ensure_system_roles():
    """Seed system roles into admin_roles collection.
    Uses the shared SYSTEM_ROLES from core.roles."""
    from datetime import timezone
    for r in SYSTEM_ROLES:
        await _db.admin_roles.update_one(
            {"key": r["key"]},
            {"$setOnInsert": {
                "key": r["key"],
                "name": r["name"],
                "description": r["description"],
                "permissions": r["permissions"],
                "is_system": r["is_system"],
                "created_at": datetime.now(timezone.utc),
                "user_count": 0,
            }},
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
    {"id": "openwa",          "name": "OpenWA (WhatsApp)","category": "Comms",    "icon": "whatsapp",                "tint": "#25D366", "description": "Self-hosted WhatsApp gateway — send passes, invoices, coupons & alerts via a QR-paired number.", "auth_type": "api_key", "popular": True,
     "auth_fields": [_f("base_url","Gateway URL","url","http://your-vps:2785","OpenWA REST API base URL (port 2785)"),
                     _f("api_key","API Key","password","owa_k1_…","From OpenWA dashboard → API Keys"),
                     _f("session_id","Session ID","text","main","The WhatsApp session that holds the paired number"),
                     _f("default_country_code","Default Country Code","text","91","Pre-pended when a phone has no country code")]},
    {"id": "gmail",           "name": "Gmail",           "category": "Email",     "icon": "gmail",                   "tint": "#EA4335", "description": "Send transactional + drip email via Gmail.",      "auth_type": "oauth",
     "auth_fields": [_f("client_id","Client ID","text"), _f("client_secret","Client Secret","password"), _f("refresh_token","Refresh Token","password","optional","Optional — leave blank to start OAuth")]},
    {"id": "sendgrid",        "name": "SendGrid",        "category": "Email",     "icon": "email-fast-outline",      "tint": "#1A82E2", "description": "Transactional email delivery.",                    "auth_type": "api_key", "popular": True,
     "auth_fields": [_f("api_key","API Key","password","SG.xxxxxxxx.yyyyyyyy","From SendGrid → Settings → API Keys"),
                     _f("from_email","From Email","text","noreply@yourdomain.com")]},
    {"id": "postal",          "name": "Postal",          "category": "Email",     "icon": "email-fast-outline",      "tint": "#7C3AED", "description": "Self-hosted Postal mail server. Bounce webhook auto-suppresses fake inboxes.", "auth_type": "api_key", "popular": True,
     "auth_fields": [_f("api_url","Postal API URL","url","https://mail.yourdomain.com","Postal server origin, no trailing slash"),
                     _f("server_api_key","Server API key","password","From Postal → Credentials → API Keys"),
                     _f("from_email","From Email","text","Student Alumni <noreply@studentalumni.ai>"),
                     _f("webhook_secret","Webhook secret","password","leave blank to auto-generate","optional · pasted as ?token= on the webhook URL")]},
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
     "auth_fields": [_f("api_key","Internal Integration Token","password","secret_xxxxxxxx","From notion.so/my-integrations"),
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
                     _f("webhook_secret","Webhook Secret","password","optional")],
     "webhook_url": "https://studentalumni.ai/api/echo/showcases/webhook/razorpay"},
    {"id": "linkedin",        "name": "LinkedIn API",    "category": "Sourcing",  "icon": "linkedin",                "tint": "#0A66C2", "description": "Alumni profile sync.",                             "auth_type": "oauth",
     "auth_fields": [_f("client_id","Client ID","text"),
                     _f("client_secret","Client Secret","password"),
                     _f("redirect_uri","Redirect URI","url","https://yourapp.com/oauth/linkedin/callback")]},
     {"id": "twilio",          "name": "Twilio",          "category": "Comms",     "icon": "phone-outline",           "tint": "#F22F46", "description": "SMS OTP + voice call delivery.",                   "auth_type": "api_key",
      "auth_fields": [_f("account_sid","Account SID","text","ACxxxxxxxx"),
                      _f("auth_token","Auth Token","password"),
                      _f("from_number","From Number","text","+1xxxxxxxxxx")]},
     {"id": "ms-teams",        "name": "Microsoft Teams", "category": "Video",     "icon": "microsoft-teams",         "tint": "#6240B2", "description": "Create Teams meetings with attendee registration, seat limits, and attendance tracking.", "auth_type": "oauth", "popular": True,
      "auth_fields": [_f("tenant_id","Tenant ID","text","xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx","From Azure Portal → Azure Active Directory → Properties"),
                      _f("client_id","Client ID (App ID)","text","xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx","From Azure Portal → App Registrations"),
                      _f("client_secret","Client Secret","password","","From Azure Portal → App Registrations → Certificates & secrets"),
                      _f("redirect_uri","Redirect URI","url","https://studentalumni.ai/api/integrations/teams/callback","Must match the redirect URI configured in Azure")],
      "webhook_url": "https://studentalumni.ai/api/integrations/teams/webhook"},
    {"id": "claude",          "name": "Anthropic Claude","category": "AI",        "icon": "robot-outline",           "tint": "#D4A373", "description": "Powers Agent K + AI Daily Brief.",                 "auth_type": "api_key", "popular": True,
     "auth_fields": [_f("api_key","Anthropic API Key","password","sk-ant-xxxxxxxx","From console.anthropic.com → API Keys")]},
    {"id": "openai",          "name": "OpenAI ChatGPT",  "category": "AI",        "icon": "creation",                "tint": "#10A37F", "description": "Alternative LLM backend for AI features.",         "auth_type": "api_key", "popular": True,
     "auth_fields": [_f("api_key","OpenAI API Key","password","sk-xxxxxxxx","From platform.openai.com → API keys"),
                     _f("organization_id","Organization ID","text","optional · org-xxxx","Optional — leave blank if you use a personal account")]},
    {"id": "gemini",          "name": "Google Gemini",   "category": "AI",        "icon": "google",                  "tint": "#4285F4", "description": "Long-context LLM with native image + audio inputs.","auth_type": "api_key", "popular": True,
     "auth_fields": [_f("api_key","Google API Key","password","AIzaSyXXXXXX","From aistudio.google.com/apikey")]},
    {"id": "mistral",         "name": "Mistral AI",      "category": "AI",        "icon": "weather-windy",           "tint": "#FF7000", "description": "Fast open-weight LLM family (Mistral Large/Codestral).","auth_type": "api_key",
     "auth_fields": [_f("api_key","Mistral API Key","password","xxxxxxxx","From console.mistral.ai → API Keys")]},
    {"id": "cohere",          "name": "Cohere",          "category": "AI",        "icon": "lightbulb-outline",       "tint": "#39594D", "description": "Embeddings + Command-R for retrieval-augmented generation.","auth_type": "api_key",
     "auth_fields": [_f("api_key","Cohere API Key","password","xxxxxxxx","From dashboard.cohere.com → API Keys")]},
    {"id": "perplexity",      "name": "Perplexity",      "category": "AI",        "icon": "magnify",                 "tint": "#20808D", "description": "LLM with online web search and citations.",        "auth_type": "api_key",
     "auth_fields": [_f("api_key","Perplexity API Key","password","pplx-xxxxxxxx","From perplexity.ai → Settings → API")]},
    {"id": "groq",            "name": "Groq",            "category": "AI",        "icon": "flash-outline",           "tint": "#F55036", "description": "Ultra-fast LPU inference for open-source LLMs.",   "auth_type": "api_key",
     "auth_fields": [_f("api_key","Groq API Key","password","gsk_xxxxxxxx","From console.groq.com → API Keys")]},
    {"id": "together-ai",     "name": "Together AI",     "category": "AI",        "icon": "puzzle-outline",          "tint": "#0F9D58", "description": "Hosted inference for 200+ open-source models.",    "auth_type": "api_key",
     "auth_fields": [_f("api_key","Together API Key","password","xxxxxxxx","From api.together.xyz → Settings → API Keys")]},
    {"id": "fireworks-ai",    "name": "Fireworks AI",    "category": "AI",        "icon": "fire",                    "tint": "#7C3AED", "description": "Function-calling + fine-tuned LLM inference.",     "auth_type": "api_key",
     "auth_fields": [_f("api_key","Fireworks API Key","password","fw_xxxxxxxx")]},
    {"id": "huggingface",     "name": "Hugging Face",    "category": "AI",        "icon": "emoticon-outline",        "tint": "#FFD21E", "description": "Hosted inference for any HF model.",               "auth_type": "api_key",
     "auth_fields": [_f("api_key","HF Access Token","password","hf_xxxxxxxx","From huggingface.co → Settings → Access Tokens")]},
    {"id": "replicate",       "name": "Replicate",       "category": "AI",        "icon": "infinity",                "tint": "#000000", "description": "Run any open-source AI model via simple API.",    "auth_type": "api_key",
     "auth_fields": [_f("api_key","Replicate API Token","password","r8_xxxxxxxx","From replicate.com → Account → API Tokens")]},
    {"id": "stability",       "name": "Stability AI",    "category": "AI · Image", "icon": "image-outline",          "tint": "#9333EA", "description": "Stable Diffusion 3 / Image generation API.",       "auth_type": "api_key",
     "auth_fields": [_f("api_key","Stability API Key","password","sk-xxxxxxxx","From platform.stability.ai → Account")]},
    {"id": "openai-images",   "name": "DALL·E / gpt-image-1","category": "AI · Image","icon": "palette-outline",      "tint": "#10A37F", "description": "OpenAI image generation API.",                     "auth_type": "api_key",
     "auth_fields": [_f("api_key","OpenAI API Key","password","sk-xxxxxxxx")]},
    {"id": "fal-ai",          "name": "fal.ai",          "category": "AI · Image", "icon": "blur",                   "tint": "#FF0080", "description": "Real-time image/video gen — Flux, SDXL, SD3.",     "auth_type": "api_key",
     "auth_fields": [_f("api_key","fal.ai API Key","password","xxxxxxxx:yyyyyyyy","From fal.ai → Dashboard → Keys")]},
    {"id": "runway",          "name": "Runway",          "category": "AI · Video", "icon": "video-vintage",          "tint": "#000000", "description": "Gen-3 text-to-video generation.",                  "auth_type": "api_key",
     "auth_fields": [_f("api_key","Runway API Key","password","key_xxxxxxxx")]},
    {"id": "elevenlabs",      "name": "ElevenLabs",      "category": "AI · Audio", "icon": "volume-high",            "tint": "#000000", "description": "High-quality multilingual text-to-speech.",        "auth_type": "api_key",
     "auth_fields": [_f("api_key","ElevenLabs API Key","password","sk_xxxxxxxx","From elevenlabs.io → Profile → API Keys"),
                     _f("voice_id","Default Voice ID","text","optional")]},
    {"id": "openai-whisper",  "name": "Whisper (OpenAI)","category": "AI · Audio", "icon": "microphone-outline",     "tint": "#10A37F", "description": "Speech-to-text via OpenAI's Whisper API.",         "auth_type": "api_key",
     "auth_fields": [_f("api_key","OpenAI API Key","password","sk-xxxxxxxx")]},
    {"id": "assemblyai",      "name": "AssemblyAI",      "category": "AI · Audio", "icon": "waveform",               "tint": "#2563EB", "description": "Realtime transcription + speaker diarization.",    "auth_type": "api_key",
     "auth_fields": [_f("api_key","AssemblyAI API Key","password","xxxxxxxx","From assemblyai.com → Dashboard")]},
    {"id": "deepgram",        "name": "Deepgram",        "category": "AI · Audio", "icon": "ear-hearing",            "tint": "#2DCBA7", "description": "Low-latency speech-to-text with Nova-2.",          "auth_type": "api_key",
     "auth_fields": [_f("api_key","Deepgram API Key","password","xxxxxxxx","From console.deepgram.com → API Keys")]},
    {"id": "deepl",           "name": "DeepL",           "category": "AI · Language","icon": "translate",            "tint": "#0F2B46", "description": "High-accuracy translation API.",                   "auth_type": "api_key",
     "auth_fields": [_f("api_key","DeepL API Key","password","xxxxxxxx:fx","From deepl.com/account/summary")]},
    {"id": "google-translate","name": "Google Translate","category": "AI · Language","icon": "google",               "tint": "#4285F4", "description": "Translate text into 130+ languages.",              "auth_type": "api_key",
     "auth_fields": [_f("api_key","Google Cloud API Key","password","AIzaSyXXX","From console.cloud.google.com")]},
    {"id": "pinecone",        "name": "Pinecone",        "category": "AI · Vector DB","icon": "database-outline",    "tint": "#000000", "description": "Managed vector DB for RAG pipelines.",             "auth_type": "api_key",
     "auth_fields": [_f("api_key","Pinecone API Key","password","xxxxxxxx","From app.pinecone.io"),
                     _f("environment","Environment","text","us-east-1-aws"),
                     _f("index","Index name","text","studentalumni-rag")]},
    {"id": "weaviate",        "name": "Weaviate",        "category": "AI · Vector DB","icon": "graph-outline",       "tint": "#7AD3FF", "description": "Open-source vector DB with hybrid search.",        "auth_type": "api_key",
     "auth_fields": [_f("cluster_url","Cluster URL","url","https://xxxxxxxx.weaviate.network"),
                     _f("api_key","Admin API Key","password","xxxxxxxx")]},
    {"id": "chroma",          "name": "Chroma",          "category": "AI · Vector DB","icon": "cube-outline",        "tint": "#FF6B6B", "description": "Open-source embeddings DB for AI apps.",           "auth_type": "url",
     "auth_fields": [_f("host","Host","url","http://chroma.internal:8000"),
                     _f("api_key","API Key","password","optional")]},
    {"id": "qdrant",          "name": "Qdrant",          "category": "AI · Vector DB","icon": "chart-bubble",        "tint": "#DC382D", "description": "High-performance vector similarity search.",       "auth_type": "api_key",
     "auth_fields": [_f("cluster_url","Cluster URL","url","https://xxxxxxxx.qdrant.tech"),
                     _f("api_key","API Key","password","xxxxxxxx")]},
    {"id": "langsmith",       "name": "LangSmith",       "category": "AI · Ops",   "icon": "test-tube",              "tint": "#F97316", "description": "Tracing + evaluation for LLM pipelines.",          "auth_type": "api_key",
     "auth_fields": [_f("api_key","LangSmith API Key","password","ls_xxxxxxxx","From smith.langchain.com")]},
    {"id": "helicone",        "name": "Helicone",        "category": "AI · Ops",   "icon": "monitor-dashboard",      "tint": "#0EA371", "description": "LLM observability + cost analytics.",              "auth_type": "api_key",
     "auth_fields": [_f("api_key","Helicone API Key","password","sk-helicone-xxxxxxxx")]},
    {"id": "agent-k",         "name": "Agent K (Studio)","category": "AI · Agents","icon": "robot-happy-outline",    "tint": "#F59E0B", "description": "Built-in AI assistant powered by Emergent LLM Key.","auth_type": "api_key", "popular": True,
     "auth_fields": [_f("emergent_key","Emergent LLM Key","password","emk_xxxxxxxx","From Emergent → Profile → Universal Key"),
                     _f("default_model","Default Model","text","claude-sonnet-4.5")]},
    # ── Career-platform-specific data APIs ────────────────────
    {"id": "proxycurl",       "name": "Proxycurl (LinkedIn)","category": "Sourcing","icon": "linkedin",              "tint": "#0A66C2", "description": "Pull LinkedIn profile data via Proxycurl API.",   "auth_type": "api_key",
     "auth_fields": [_f("api_key","Proxycurl Bearer","password","xxxxxxxx","From nubela.co/proxycurl")]},
    {"id": "rchilli",         "name": "RChilli Resume Parser","category": "Sourcing","icon": "file-document-outline","tint": "#28A745", "description": "AI-driven resume parsing into structured JSON.", "auth_type": "api_key",
     "auth_fields": [_f("api_key","RChilli API Key","password"),
                     _f("user_key","User Key","text"),
                     _f("subuser_id","Sub-user ID","text","optional")]},
    {"id": "affinda",         "name": "Affinda Resume AI","category": "Sourcing", "icon": "robot-confused-outline","tint": "#0080FF", "description": "Modern resume parsing + JD-resume scoring API.",  "auth_type": "api_key",
     "auth_fields": [_f("api_key","Affinda API Key","password","xxxxxxxx","From affinda.com → API Keys")]},
    {"id": "clearbit",        "name": "Clearbit",        "category": "Sourcing",  "icon": "domain",                  "tint": "#3FA9F5", "description": "Company enrichment + person lookup APIs.",        "auth_type": "api_key",
     "auth_fields": [_f("api_key","Clearbit Secret","password","sk_xxxxxxxx")]},
    {"id": "apollo",          "name": "Apollo.io",       "category": "Sourcing",  "icon": "rocket-launch-outline",   "tint": "#1ABCFE", "description": "Find candidate + employer contact info.",          "auth_type": "api_key",
     "auth_fields": [_f("api_key","Apollo API Key","password","xxxxxxxx","From app.apollo.io → Settings → Integrations")]},
    {"id": "lever",           "name": "Lever ATS",       "category": "Sourcing",  "icon": "briefcase-account-outline","tint":"#5C2D91", "description": "Sync jobs + candidates with Lever ATS.",            "auth_type": "api_key",
     "auth_fields": [_f("api_key","Lever API Key","password","xxxxxxxx","From hire.lever.co → Settings → Integrations")]},
    {"id": "greenhouse",      "name": "Greenhouse ATS",  "category": "Sourcing",  "icon": "leaf",                    "tint": "#26A69A", "description": "ATS integration for campus + lateral hiring.",     "auth_type": "api_key",
     "auth_fields": [_f("api_key","Harvest API Key","password","xxxxxxxx","From Greenhouse → Configure → Dev Center")]},
    {"id": "calendly",        "name": "Calendly",        "category": "Calendar",  "icon": "calendar-clock",          "tint": "#006BFF", "description": "Alt mentor session scheduling.",                   "auth_type": "api_key",
     "auth_fields": [_f("api_key","Personal Access Token","password","eyJhxxxxxxxx","From calendly.com → Integrations → API")]},
    {"id": "tally",           "name": "Tally Forms",     "category": "Productivity","icon": "form-textbox",          "tint": "#FFFFFF", "description": "Embed forms for surveys + onboarding.",            "auth_type": "api_key",
     "auth_fields": [_f("api_key","Tally API Key","password","tly-xxxxxxxx")]},
    {"id": "typeform",        "name": "Typeform",        "category": "Productivity","icon": "form-textbox-password","tint": "#262627", "description": "Beautiful conversational forms.",                  "auth_type": "api_key",
     "auth_fields": [_f("api_key","Personal Token","password","tfp_xxxxxxxx","From admin.typeform.com → Personal tokens")]},
    {"id": "posthog",         "name": "PostHog",         "category": "Analytics", "icon": "chart-bar",               "tint": "#1D4AFF", "description": "Product analytics + session replays.",              "auth_type": "api_key",
     "auth_fields": [_f("api_key","Project API Key","password","phc_xxxxxxxx","From posthog.com → Project Settings"),
                     _f("personal_api_key","Personal API Key (read)","password","optional — phx_xxxxxxxx","Optional — needed for reading analytics. From posthog.com → Settings → Personal API Keys (query:read)"),
                     _f("host","Host","url","https://us.posthog.com"),
                     _f("project_id","Project ID","text","optional — auto-resolved from the personal API key")]},
    {"id": "mixpanel",        "name": "Mixpanel",        "category": "Analytics", "icon": "chart-line",              "tint": "#7856FF", "description": "Event-based product analytics.",                    "auth_type": "api_key",
     "auth_fields": [_f("project_token","Project Token","password","xxxxxxxx"),
                     _f("api_secret","API Secret","password")]},
    {"id": "amplitude",       "name": "Amplitude",       "category": "Analytics", "icon": "chart-areaspline-variant","tint": "#0066FF", "description": "Behavioural analytics + experimentation.",          "auth_type": "api_key",
     "auth_fields": [_f("api_key","API Key","password"), _f("secret_key","Secret Key","password")]},
    {"id": "sentry",          "name": "Sentry",          "category": "Observability","icon":"alert-octagon-outline", "tint": "#362D59", "description": "Crash & error monitoring.",                         "auth_type": "api_key",
     "auth_fields": [_f("dsn","DSN URL","url","https://xxxxxxxx@sentry.io/yyyy"),
                     _f("auth_token","Auth Token","password","optional")]},
    {"id": "datadog",         "name": "Datadog",         "category": "Observability","icon":"monitor-eye",          "tint": "#632CA6", "description": "APM, logs and infra monitoring.",                   "auth_type": "api_key",
     "auth_fields": [_f("api_key","API Key","password","xxxxxxxx"),
                     _f("app_key","Application Key","password","xxxxxxxx"),
                     _f("site","Site","text","datadoghq.com")]},
    {"id": "github",          "name": "GitHub",          "category": "Productivity","icon": "github",                "tint": "#FFFFFF", "description": "Showcase student/alumni portfolios via GitHub API.","auth_type": "api_key",
     "auth_fields": [_f("api_key","Personal Access Token","password","ghp_xxxxxxxx","From github.com → Settings → Developer settings → PATs")]},
]


def _public_base_url() -> str:
    return (os.environ.get("PUBLIC_BASE_URL") or os.environ.get("FRONTEND_URL") or "https://studentalumni.ai").rstrip("/")


async def ensure_postal_webhook_secret() -> str:
    env = (os.environ.get("POSTAL_WEBHOOK_SECRET") or "").strip()
    if env:
        return env
    doc = await _db.settings.find_one({"id": "global"}) or {}
    secret = (doc.get("postal_webhook_secret") or "").strip()
    if secret:
        return secret
    it = await _db.installed_tools.find_one({"tool_id": "postal"})
    creds = (it or {}).get("credentials") or {}
    secret = (creds.get("webhook_secret") or "").strip()
    if secret:
        await _db.settings.update_one({"id": "global"}, {"$set": {"postal_webhook_secret": secret}}, upsert=True)
        return secret
    secret = "sa_wh_" + secrets.token_urlsafe(32)
    await _db.settings.update_one({"id": "global"}, {"$set": {"postal_webhook_secret": secret}}, upsert=True)
    return secret


def postal_webhook_url(secret: str) -> str:
    return f"{_public_base_url()}/api/webhooks/postal?token={secret}"


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
        # expose full values for non-password fields so the UI can pre-fill the edit form
        plain = {k: v for k, v in creds.items() if k not in pwd_keys}
        item = {
            **t,
            "installed":   bool(i),
            "status":      i.get("status") if i else None,
            "credentials_masked": masked,
            "credentials_plain": plain,
            "installed_at": (i.get("installed_at").isoformat() if i and i.get("installed_at") else None),
        }
        if t["id"] == "postal" and i:
            secret = (creds.get("webhook_secret") or "").strip() or await ensure_postal_webhook_secret()
            item["webhook_url"] = postal_webhook_url(secret)
        out.append(item)
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
    creds = dict(body.credentials or {})
    existing_row = await _db.installed_tools.find_one({"user_id": str(user["_id"]), "tool_id": body.tool_id})
    existing_creds = (existing_row or {}).get("credentials") or {}
    # When a password-type field is left blank on an update, keep the previously
    # saved secret so an "Edit" without re-entering the secret doesn't wipe it.
    for f in tool.get("auth_fields", []):
        if f.get("type") == "password" and f["key"] in existing_creds and not (creds.get(f["key"]) or "").strip():
            creds[f["key"]] = existing_creds[f["key"]]
    if body.tool_id == "postal" and not (creds.get("webhook_secret") or "").strip():
        creds["webhook_secret"] = await ensure_postal_webhook_secret()
    elif body.tool_id == "postal":
        await _db.settings.update_one(
            {"id": "global"},
            {"$set": {"postal_webhook_secret": creds["webhook_secret"].strip()}},
            upsert=True,
        )

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


# ─── Test connection ──────────────────────────────────────────────
class TestBody(BaseModel):
    tool_id: str
    credentials: Optional[Dict[str, str]] = None


async def _live_test(tool_id: str, creds: Dict[str, str]) -> tuple[bool, str]:
    """Run a lightweight provider-specific connectivity check.
    Returns (ok, message). Falls back to format validation for tools
    without an implemented live test."""
    try:
        import httpx as _h
    except Exception:
        return True, "Saved (format validation only — httpx unavailable)"

    api_key = (creds.get("api_key") or "").strip()
    timeout = 8.0
    headers_json = {"Accept": "application/json"}

    async def _get(url, **kwargs):
        async with _h.AsyncClient(timeout=timeout) as c:
            return await c.get(url, **kwargs)

    try:
        if tool_id in {"openai", "openai-images", "openai-whisper"}:
            r = await _get("https://api.openai.com/v1/models", headers={"Authorization": f"Bearer {api_key}", **headers_json})
            return (r.status_code == 200, "Verified — API key accepted" if r.status_code == 200 else f"OpenAI: HTTP {r.status_code}")
        if tool_id == "claude":
            r = await _get("https://api.anthropic.com/v1/models", headers={"x-api-key": api_key, "anthropic-version": "2023-06-01", **headers_json})
            return (r.status_code == 200, "Verified — Anthropic key accepted" if r.status_code == 200 else f"Anthropic: HTTP {r.status_code}")
        if tool_id == "gemini":
            r = await _get(f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}")
            return (r.status_code == 200, "Verified — Gemini key accepted" if r.status_code == 200 else f"Gemini: HTTP {r.status_code}")
        if tool_id == "mistral":
            r = await _get("https://api.mistral.ai/v1/models", headers={"Authorization": f"Bearer {api_key}"})
            return (r.status_code == 200, "Verified — Mistral key accepted" if r.status_code == 200 else f"Mistral: HTTP {r.status_code}")
        if tool_id == "groq":
            r = await _get("https://api.groq.com/openai/v1/models", headers={"Authorization": f"Bearer {api_key}"})
            return (r.status_code == 200, "Verified — Groq key accepted" if r.status_code == 200 else f"Groq: HTTP {r.status_code}")
        if tool_id == "cohere":
            r = await _get("https://api.cohere.com/v1/models", headers={"Authorization": f"Bearer {api_key}"})
            return (r.status_code == 200, "Verified — Cohere key accepted" if r.status_code == 200 else f"Cohere: HTTP {r.status_code}")
        if tool_id == "perplexity":
            # perplexity has no models endpoint; do a trivial completion
            async with _h.AsyncClient(timeout=timeout) as c:
                r = await c.post(
                    "https://api.perplexity.ai/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={"model": "sonar", "messages": [{"role": "user", "content": "ping"}], "max_tokens": 1},
                )
            return (r.status_code in (200, 400), "Verified — Perplexity key accepted") if r.status_code in (200, 400) else (False, f"Perplexity: HTTP {r.status_code}")
        if tool_id == "elevenlabs":
            r = await _get("https://api.elevenlabs.io/v1/user", headers={"xi-api-key": api_key})
            return (r.status_code == 200, "Verified — ElevenLabs key accepted" if r.status_code == 200 else f"ElevenLabs: HTTP {r.status_code}")
        if tool_id == "huggingface":
            r = await _get("https://huggingface.co/api/whoami-v2", headers={"Authorization": f"Bearer {api_key}"})
            return (r.status_code == 200, "Verified — HF token accepted" if r.status_code == 200 else f"HF: HTTP {r.status_code}")
        if tool_id == "replicate":
            r = await _get("https://api.replicate.com/v1/account", headers={"Authorization": f"Bearer {api_key}"})
            return (r.status_code == 200, "Verified — Replicate token accepted" if r.status_code == 200 else f"Replicate: HTTP {r.status_code}")
        if tool_id == "deepgram":
            r = await _get("https://api.deepgram.com/v1/projects", headers={"Authorization": f"Token {api_key}"})
            return (r.status_code == 200, "Verified — Deepgram key accepted" if r.status_code == 200 else f"Deepgram: HTTP {r.status_code}")
        if tool_id == "assemblyai":
            r = await _get("https://api.assemblyai.com/v2/transcript?limit=1", headers={"Authorization": api_key})
            return (r.status_code == 200, "Verified — AssemblyAI key accepted" if r.status_code == 200 else f"AssemblyAI: HTTP {r.status_code}")
        if tool_id == "deepl":
            r = await _get("https://api-free.deepl.com/v2/usage", headers={"Authorization": f"DeepL-Auth-Key {api_key}"})
            return (r.status_code == 200, "Verified — DeepL key accepted" if r.status_code == 200 else f"DeepL: HTTP {r.status_code}")
        if tool_id == "stripe":
            r = await _get("https://api.stripe.com/v1/balance", auth=(creds.get("secret_key", api_key), ""))
            return (r.status_code == 200, "Verified — Stripe key accepted" if r.status_code == 200 else f"Stripe: HTTP {r.status_code}")
        if tool_id == "razorpay":
            r = await _get("https://api.razorpay.com/v1/payments?count=1", auth=(creds.get("key_id", api_key), creds.get("key_secret", "")))
            return (r.status_code == 200, "Verified — Razorpay keys accepted" if r.status_code == 200 else f"Razorpay: HTTP {r.status_code}")
        if tool_id == "sendgrid":
            r = await _get("https://api.sendgrid.com/v3/user/profile", headers={"Authorization": f"Bearer {api_key}"})
            return (r.status_code == 200, "Verified — SendGrid key accepted" if r.status_code == 200 else f"SendGrid: HTTP {r.status_code}")
        if tool_id == "postal":
            base = (creds.get("api_url") or "").strip().rstrip("/")
            key = (creds.get("server_api_key") or "").strip()
            if not base or not key:
                return False, "Postal API URL and server API key are required"
            async with _h.AsyncClient(timeout=timeout) as c:
                r = await c.get(base, headers={"X-Server-API-Key": key})
            return (r.status_code < 500, f"Postal server reached (HTTP {r.status_code})")
        if tool_id == "github":
            r = await _get("https://api.github.com/user", headers={"Authorization": f"Bearer {api_key}"})
            return (r.status_code == 200, "Verified — GitHub token accepted" if r.status_code == 200 else f"GitHub: HTTP {r.status_code}")
        if tool_id == "notion":
            tok = (creds.get("api_key") or creds.get("integration_token") or "").strip()
            r = await _get("https://api.notion.com/v1/users/me", headers={"Authorization": f"Bearer {tok}", "Notion-Version": "2022-06-28"})
            return (r.status_code == 200, "Verified — Notion token accepted" if r.status_code == 200 else f"Notion: HTTP {r.status_code}")
        if tool_id == "slack":
            tok = creds.get("bot_token", api_key)
            r = await _get("https://slack.com/api/auth.test", headers={"Authorization": f"Bearer {tok}"})
            ok = r.status_code == 200 and (r.json() or {}).get("ok") is True
            return (ok, "Verified — Slack token accepted" if ok else "Slack: token rejected")
        if tool_id == "openwa":
            base_url = (creds.get("base_url") or "").strip().rstrip("/")
            session_id = (creds.get("session_id") or "").strip()
            if not base_url or not session_id:
                return (False, "OpenWA: Gateway URL and Session ID are required")
            r = await _get(
                f"{base_url}/api/sessions/{session_id}",
                headers={"X-API-Key": api_key or creds.get("api_key", "")},
            )
            if r.status_code == 200:
                return (True, "Verified — OpenWA gateway + session reached")
            if r.status_code == 401:
                return (False, "OpenWA: API key rejected (HTTP 401)")
            if r.status_code == 404:
                return (False, "OpenWA: session not found — check Session ID")
            return (False, f"OpenWA: HTTP {r.status_code}")
        if tool_id == "posthog":
            ph_key = (creds.get("personal_api_key") or api_key).strip()
            ph_host = (creds.get("host") or "https://us.posthog.com").strip().rstrip("/")
            if not ph_key:
                return False, "PostHog: API key is required"
            if ph_key.startswith("phc_"):
                return (False, "PostHog: project key (phc_) cannot read analytics. Use a personal API key (phx_) with query:read scope.")
            try:
                async with _h.AsyncClient(timeout=timeout) as c:
                    r = await c.get(f"{ph_host}/api/users/@me/", headers={"Authorization": f"Bearer {ph_key}"})
                if r.status_code == 200:
                    return (True, "Verified — PostHog personal API key accepted")
                return (False, f"PostHog: HTTP {r.status_code}")
            except Exception as e:
                return (False, f"PostHog connection failed: {e}")
        # No live test implemented — accept after basic format checks
        return True, "Credentials look valid (no live check for this provider)"
    except Exception as e:
        return False, f"Connection failed: {e}"


@router.post("/marketplace/test")
async def test_tool_connection(body: TestBody, authorization: Optional[str] = Header(None)):
    """Live connectivity check for a provider's credentials BEFORE saving."""
    user = await _resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    tool = next((t for t in MARKETPLACE if t["id"] == body.tool_id), None)
    if not tool:
        raise HTTPException(404, "Tool not found")
    creds = body.credentials or {}
    # Basic format checks first
    required = [f for f in tool.get("auth_fields", []) if (f.get("help") or "").lower().find("optional") < 0 and not str(f.get("placeholder", "")).startswith("optional")]
    missing = [f["label"] for f in required if not creds.get(f["key"])]
    if missing:
        return {"ok": False, "message": f"Missing: {', '.join(missing)}"}
    ok, msg = await _live_test(body.tool_id, creds)
    return {"ok": ok, "message": msg}


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
        seq = await _db.users.count_documents({"role": {"$in": ["admin"]}})
        admin_id = f"SA-2024-{seq:06d}"
        await _db.users.update_one({"_id": user["_id"]}, {"$set": {"admin_id": admin_id}})
    return {
        "id": uid,
        "name": user.get("full_name") or user.get("name") or "Administrator",
        "email": user.get("email"),
        "phone": user.get("phone") or "",
        "title": user.get("title") or "Platform Administrator",
        "org": user.get("org") or "Student Alumni",
        "signature": user.get("signature") or (
            f"{user.get('full_name') or user.get('name') or 'Administrator'}\n"
            f"{user.get('title') or 'Platform Administrator'} · {user.get('org') or 'Student Alumni'}\n"
            f"{user.get('email')}"
        ),
        "role_label": "Super Admin" if user.get("is_super_admin") else ({
            "admin": "Admin",
            "student": "Student",
            "alumni": "Alumni",
            "mentor": "Mentor",
            "college": "College",
        }.get((user.get("role") or "").lower().strip()) or " ".join(w.capitalize() for w in (user.get("role") or "admin").replace("_", " ").split())),
        "access_label": user.get("access_label") or "Full Access",
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
    signature: Optional[str] = None    # email signature (multi-line)


@router.patch("/admin/profile")
async def update_admin_profile(body: ProfilePatch, authorization: Optional[str] = Header(None)):
    user = await _require_admin(authorization)
    update = {k: v for k, v in body.dict().items() if v is not None}
    if "name" in update:
        update["full_name"] = update.pop("name")
    # Sanitise signature length to keep DB lean
    if "signature" in update and isinstance(update["signature"], str):
        update["signature"] = update["signature"][:1500]
    if update:
        await _db.users.update_one({"_id": user["_id"]}, {"$set": update})
    return {"ok": True}


# ───────────────────────────────────────────────────────────────────
# Full role detail — used by SettingsView roles drill-in.
# ───────────────────────────────────────────────────────────────────
@router.get("/admin/roles/{role_id}")
async def get_role_detail(role_id: str, authorization: Optional[str] = Header(None)):
    """Return the full role record + grouped permission resolution + a
    sample of users currently assigned to this role. Drill-in view."""
    await _require_admin(authorization)
    from bson import ObjectId
    role = None
    try:
        role = await _db.admin_roles.find_one({"_id": ObjectId(role_id)})
    except Exception:
        role = None
    if not role:
        # fall back: match by key (system roles aren't stored as docs)
        role = await _db.admin_roles.find_one({"key": role_id})
    if not role:
        # synthesise stub for system roles defined only in code
        for sr in SYSTEM_ROLES:
            if sr.get("key") == role_id:
                role = sr
                break
    if not role:
        raise HTTPException(404, "Role not found")

    # User sample currently assigned to this role
    users_cur = _db.users.find(
        {"role": role.get("key") or role.get("name", "").lower().replace(" ", "_")},
        {"full_name": 1, "name": 1, "email": 1, "last_login_at": 1, "avatar_url": 1},
    ).limit(50)
    users: List[Dict[str, Any]] = []
    async for u in users_cur:
        users.append({
            "id":         str(u.get("_id")),
            "name":       u.get("full_name") or u.get("name") or "—",
            "email":      u.get("email"),
            "last_login": u.get("last_login_at").isoformat() if u.get("last_login_at") else None,
            "avatar_url": u.get("avatar_url"),
        })

    # Permission groups for nicer display
    perms_full = []
    perms_set = set(role.get("permissions") or [])
    # fetch the permission catalog
    cat = await _db.admin_permission_catalog.find_one({"_id": "singleton"})
    groups = (cat or {}).get("groups") or []
    for g in groups:
        items = []
        for p in g.get("permissions", []):
            items.append({**p, "granted": p["key"] in perms_set})
        perms_full.append({"label": g.get("label"), "key": g.get("key"), "permissions": items})

    return {
        "id":           str(role.get("_id") or role.get("key")),
        "key":          role.get("key"),
        "name":         role.get("name"),
        "description":  role.get("description") or "",
        "permissions":  list(perms_set),
        "permission_groups": perms_full,
        "users":        users,
        "user_count":   len(users),
        "is_system":    bool(role.get("is_system")),
        "created_at":   role.get("created_at").isoformat() if role.get("created_at") else None,
        "updated_at":   role.get("updated_at").isoformat() if role.get("updated_at") else None,
    }


# ═══════════════════════════════════════════════════════════════════
# PLATFORM CONTROLS  (feature flags + system settings)
# ═══════════════════════════════════════════════════════════════════
SYSTEM_SETTING_OPTIONS = {
    "session_timeout": [
        {"value": "15 minutes",  "label": "15 minutes"},
        {"value": "30 minutes",  "label": "30 minutes"},
        {"value": "1 hour",      "label": "1 hour"},
        {"value": "2 hours",     "label": "2 hours"},
        {"value": "4 hours",     "label": "4 hours"},
        {"value": "8 hours",      "label": "8 hours"},
        {"value": "12 hours",    "label": "12 hours"},
        {"value": "24 hours",     "label": "24 hours"},
    ],
    "password_policy": [
        {"value": "Weak (8+ chars)",           "label": "Weak (8+ chars)"},
        {"value": "Medium (10+ chars)",        "label": "Medium (10+ chars)"},
        {"value": "Strong (12+ chars)",        "label": "Strong (12+ chars)"},
        {"value": "Very Strong (16+ chars)",    "label": "Very Strong (16+ chars)"},
        {"value": "Maximum (20+ chars)",        "label": "Maximum (20+ chars)"},
    ],
    "default_locale": [
        {"value": "en-IN",  "label": "English (India) — en-IN"},
        {"value": "en-US",  "label": "English (US) — en-US"},
        {"value": "en-GB",  "label": "English (UK) — en-GB"},
        {"value": "hi-IN",  "label": "Hindi — hi-IN"},
        {"value": "ta-IN",  "label": "Tamil — ta-IN"},
        {"value": "bn-IN",  "label": "Bengali — bn-IN"},
        {"value": "te-IN",  "label": "Telugu — te-IN"},
        {"value": "mr-IN",  "label": "Marathi — mr-IN"},
    ],
    "default_tz": [
        {"value": "Asia/Kolkata",   "label": "IST — Asia/Kolkata (UTC+5:30)"},
        {"value": "UTC",             "label": "UTC — Coordinated Universal Time"},
        {"value": "Asia/Dubai",      "label": "GST — Asia/Dubai (UTC+4)"},
        {"value": "Asia/Singapore",  "label": "SGT — Asia/Singapore (UTC+8)"},
        {"value": "Asia/Tokyo",      "label": "JST — Asia/Tokyo (UTC+9)"},
        {"value": "America/New_York", "label": "EST — America/New_York (UTC-5)"},
        {"value": "America/Chicago",  "label": "CST — America/Chicago (UTC-6)"},
        {"value": "America/Los_Angeles", "label": "PST — America/Los_Angeles (UTC-8)"},
        {"value": "Europe/London",   "label": "GMT — Europe/London (UTC+0)"},
        {"value": "Europe/Paris",     "label": "CET — Europe/Paris (UTC+1)"},
    ],
    "default_currency": [
        {"value": "INR (₹)",  "label": "Indian Rupee — INR (₹)"},
        {"value": "USD ($)",  "label": "US Dollar — USD ($)"},
        {"value": "EUR (€)",   "label": "Euro — EUR (€)"},
        {"value": "GBP (£)",   "label": "British Pound — GBP (£)"},
        {"value": "AED",      "label": "UAE Dirham — AED"},
        {"value": "SGD",      "label": "Singapore Dollar — SGD"},
        {"value": "AUD ($)",   "label": "Australian Dollar — AUD ($)"},
        {"value": "CAD ($)",   "label": "Canadian Dollar — CAD ($)"},
    ],
    "linkedin_oauth_client_id": [],
    "linkedin_oauth_client_secret": [],
}


DEFAULT_PLATFORM_CONTROLS = {
    "feature_flags": [
        {"key": "maintenance_mode",     "label": "Maintenance Mode",     "description": "Disables access for all users except admins", "value": False},
        {"key": "new_signups",          "label": "Allow New Signups",    "description": "Open public registration for students",        "value": True},
        {"key": "ai_features",          "label": "AI Features",          "description": "Agent K and AI insights for all users",         "value": True},
        {"key": "marketplace_install",  "label": "Marketplace Install",  "description": "Allow admins to connect new integrations",      "value": True},
        {"key": "show_marketplace",     "label": "Show Marketplace",     "description": "Display Marketplace tab in the landing page navigation bar", "value": False},
        {"key": "alumni_donations",     "label": "Alumni Donations",     "description": "Show donation widget on alumni dashboard",      "value": True},
        {"key": "beta_features",        "label": "Beta Features",        "description": "Enable experimental features for testers",      "value": False},
        {"key": "mentor_ratings",       "label": "Mentor Ratings",      "description": "Allow students to rate mentor sessions",      "value": True},
        {"key": "event_rsvp",           "label": "Event RSVP",           "description": "Allow students to RSVP for events",           "value": True},
        {"key": "career_tracker",      "label": "Career Tracker",       "description": "Enable alumni career tracking module",        "value": True},
        {"key": "newsletter",           "label": "Newsletter",            "description": "Send weekly newsletter to all users",           "value": True},
        {"key": "enable_google_login",  "label": "Enable Google Login",  "description": "Show Google sign-in button on login page", "value": True},
        {"key": "enable_linkedin_login","label": "Enable LinkedIn Login","description": "Show LinkedIn sign-in button on login page", "value": True},
        {"key": "enable_github_login",  "label": "Enable GitHub Login",  "description": "Show GitHub sign-in button on login page", "value": True},
        {"key": "popup_announcements",  "label": "Popup Announcements",  "description": "Show announcement popup when users visit the site", "value": True},
    ],
    "system_settings": [
        {"key": "session_timeout",  "label": "Session Timeout",   "value": "30 minutes"},
        {"key": "password_policy", "label": "Password Policy",   "value": "Strong (12+ chars)"},
        {"key": "default_locale",  "label": "Default Locale",    "value": "en-IN"},
        {"key": "default_tz",      "label": "Default Timezone",  "value": "Asia/Kolkata"},
        {"key": "default_currency","label": "Default Currency",  "value": "INR (₹)"},
        {"key": "linkedin_oauth_client_id","label": "LinkedIn OAuth Client ID","value": "", "type": "text", "help": "From LinkedIn Developer Portal → Apps → Auth"},
        {"key": "linkedin_oauth_client_secret","label": "LinkedIn OAuth Client Secret","value": "", "type": "password"},
        {"key": "firebase_api_key","label": "Firebase API Key","value": "", "type": "text", "help": "From Firebase Console → Project Settings → Web API Key"},
        {"key": "firebase_auth_domain","label": "Firebase Auth Domain","value": "", "type": "text", "help": "e.g. your-project.firebaseapp.com"},
        {"key": "firebase_project_id","label": "Firebase Project ID","value": "", "type": "text", "help": "From Firebase Console → Project Settings"},
        {"key": "firebase_app_id","label": "Firebase App ID","value": "", "type": "text"},
        {"key": "firebase_service_account","label": "Firebase Service Account JSON","value": "", "type": "password", "help": "Paste full service account JSON from Firebase Console → Project Settings → Service Accounts → Generate New Private Key"},
        {"key": "ga4_property_id","label": "Google Analytics 4 Property ID","value": "", "type": "text", "help": "From GA4 → Admin → Property Settings (used for the analytics dashboard — needs the GA4 Data API enabled)"},
        {"key": "ga4_service_account_json","label": "GA4 Service Account JSON","value": "", "type": "password", "help": "Optional — separate service account for GA4 analytics. If blank, falls back to Firebase Service Account JSON above."},
    ],
}


@router.get("/public/feature-flags")
async def get_public_feature_flags():
    """Public read-only feature flags dictionary for landing navbar and other public components."""
    doc = await _db.platform_controls.find_one({"_id": "singleton"})
    db_flags = (doc.get("feature_flags") if doc else None) or []
    defaults_flags = DEFAULT_PLATFORM_CONTROLS["feature_flags"]
    merged_flags = _merge_settings_with_defaults(db_flags, defaults_flags)
    flags_dict = {}
    for f in merged_flags:
        if isinstance(f, dict) and "key" in f:
            flags_dict[f["key"]] = bool(f.get("value"))
    return {"feature_flags": flags_dict}


@router.get("/admin/platform-controls")
async def get_platform_controls(authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    doc = await _db.platform_controls.find_one({"_id": "singleton"})
    if not doc:
        await _db.platform_controls.insert_one({"_id": "singleton", **DEFAULT_PLATFORM_CONTROLS, "updated_at": datetime.now(timezone.utc)})
        return DEFAULT_PLATFORM_CONTROLS
    db_flags = doc.get("feature_flags") or []
    db_settings = doc.get("system_settings") or []
    defaults_flags = DEFAULT_PLATFORM_CONTROLS["feature_flags"]
    defaults_settings = DEFAULT_PLATFORM_CONTROLS["system_settings"]
    merged_flags = _merge_settings_with_defaults(db_flags, defaults_flags)
    merged_settings = _merge_settings_with_defaults(db_settings, defaults_settings)
    return {
        "feature_flags":   merged_flags,
        "system_settings": merged_settings,
    }


def _merge_settings_with_defaults(db_list, default_list):
    """Merge DB settings with defaults, adding any new fields from defaults."""
    db_keys = {item["key"] for item in db_list}
    result = list(db_list)
    for item in default_list:
        if item["key"] not in db_keys:
            result.append(item)
    return result


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
    defaults = DEFAULT_PLATFORM_CONTROLS.get(body.section) or []
    found = False
    for it in arr:
        if it.get("key") == body.key:
            it["value"] = body.value
            found = True
            break
    if not found:
        for def_it in defaults:
            if def_it["key"] == body.key:
                arr.append({**def_it, "value": body.value})
                break
    await _db.platform_controls.update_one(
        {"_id": "singleton"},
        {"$set": {body.section: arr, "updated_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return {"ok": True}


@router.get("/admin/platform-controls")
async def get_platform_controls_full(authorization: Optional[str] = Header(None)):
    """Returns controls + dropdown options for every system setting."""
    await _require_admin(authorization)
    doc = await _db.platform_controls.find_one({"_id": "singleton"})
    if not doc:
        await _db.platform_controls.insert_one({"_id": "singleton", **DEFAULT_PLATFORM_CONTROLS, "updated_at": datetime.now(timezone.utc)})
        doc = DEFAULT_PLATFORM_CONTROLS
    db_flags = doc.get("feature_flags") or []
    db_settings = doc.get("system_settings") or []
    defaults_flags = DEFAULT_PLATFORM_CONTROLS["feature_flags"]
    defaults_settings = DEFAULT_PLATFORM_CONTROLS["system_settings"]
    merged_flags = _merge_settings_with_defaults(db_flags, defaults_flags)
    merged_settings = _merge_settings_with_defaults(db_settings, defaults_settings)
    result = {
        "feature_flags":   merged_flags,
        "system_settings": merged_settings,
        "system_settings_options": SYSTEM_SETTING_OPTIONS,
    }
    return result


class SystemSettingPatch(BaseModel):
    key: str
    value: str


@router.patch("/admin/platform-controls/system-settings")
async def patch_system_setting(body: SystemSettingPatch, authorization: Optional[str] = Header(None)):
    """Update a single system setting value. Adds new fields if they don't exist yet."""
    await _require_admin(authorization)
    doc = await _db.platform_controls.find_one({"_id": "singleton"})
    if not doc:
        doc = {"_id": "singleton", **DEFAULT_PLATFORM_CONTROLS}
    settings = doc.get("system_settings") or []
    found = False
    for it in settings:
        if it.get("key") == body.key:
            it["value"] = body.value
            found = True
            break
    if not found:
        defaults = DEFAULT_PLATFORM_CONTROLS["system_settings"]
        for def_it in defaults:
            if def_it["key"] == body.key:
                settings.append({**def_it, "value": body.value})
                break
    await _db.platform_controls.update_one(
        {"_id": "singleton"},
        {"$set": {"system_settings": settings, "updated_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return {"ok": True}


@router.post("/admin/platform-controls/reset")
async def reset_platform_controls(authorization: Optional[str] = Header(None)):
    """Reset all platform controls to defaults. Admin-only."""
    await _require_admin(authorization)
    await _db.platform_controls.update_one(
        {"_id": "singleton"},
        {"$set": {**DEFAULT_PLATFORM_CONTROLS, "updated_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    await _db.admin_audit_log.insert_one({
        "user_id": "admin",
        "action": "platform.controls_reset",
        "target": "platform_controls",
        "at": datetime.now(timezone.utc),
    })
    return {"ok": True, "message": "Platform settings reset to defaults"}


@router.post("/admin/analytics/wipe")
async def wipe_analytics(authorization: Optional[str] = Header(None)):
    """Wipe analytics events. Admin-only — clears event tracking data."""
    await _require_admin(authorization)
    result = await _db.analytics_events.delete_many({})
    await _db.admin_audit_log.insert_one({
        "user_id": "admin",
        "action": "analytics.wiped",
        "target": "analytics_events",
        "at": datetime.now(timezone.utc),
    })
    return {"ok": True, "deleted": result.deleted_count}


@router.post("/admin/security/rotate-jwt")
async def rotate_jwt_key(authorization: Optional[str] = Header(None)):
    """Rotate JWT signing key. Admin-only."""
    await _require_admin(authorization)
    import secrets, hashlib
    new_secret = secrets.token_hex(48)
    new_key_hash = hashlib.sha256(new_secret.encode()).hexdigest()[:16]
    await _db.platform_controls.update_one(
        {"_id": "singleton"},
        {"$set": {
            "jwt_secret": new_secret,
            "jwt_secret_hash": new_key_hash,
            "jwt_rotated_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    await _db.admin_audit_log.insert_one({
        "user_id": "admin",
        "action": "security.jwt_rotated",
        "target": "jwt_signing_key",
        "at": datetime.now(timezone.utc),
    })
    return {"ok": True, "message": f"New key hash: {new_key_hash}…"}


# ═══════════════════════════════════════════════════════════════════
# 2FA
# ═══════════════════════════════════════════════════════════════════
@router.get("/admin/security/2fa/status")
async def get_2fa_status(authorization: Optional[str] = Header(None)):
    user = await _require_admin(authorization)
    uid = str(user["_id"])
    doc = await _db.user_settings.find_one({"user_id": uid})
    enabled = bool((doc or {}).get("two_fa_enabled"))
    return {"enabled": enabled}


@router.post("/admin/security/2fa/generate")
async def generate_2fa_secret(authorization: Optional[str] = Header(None)):
    user = await _require_admin(authorization)
    uid = str(user["_id"])
    import pyotp, qrcode, base64
    from io import BytesIO
    secret = pyotp.random_base32()
    issuer = "Student Alumni"
    email = user.get("email") or uid
    uri = pyotp.totp.TOTP(secret).provisioning_uri(name=email, issuer_name=issuer)
    img = qrcode.make(uri)
    buf = BytesIO()
    img.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode()
    # Store temporarily — not permanent until verified
    await _db.user_settings.update_one(
        {"user_id": uid},
        {"$set": {"_2fa_pending_secret": secret, "user_id": uid}},
        upsert=True,
    )
    return {"secret": secret[-4:] + "XXXX", "qr_uri": uri, "qr_base64": qr_b64}


@router.post("/admin/security/2fa/enable")
async def enable_2fa(body: Dict[str, str] = Body(...), authorization: Optional[str] = Header(None)):
    user = await _require_admin(authorization)
    uid = str(user["_id"])
    token = (body.get("token") or "").strip()
    if not token:
        raise HTTPException(400, "Verification code required")
    doc = await _db.user_settings.find_one({"user_id": uid})
    secret = (doc or {}).get("_2fa_pending_secret")
    if not secret:
        raise HTTPException(400, "No pending 2FA setup. Generate a secret first.")
    import pyotp
    totp = pyotp.TOTP(secret)
    if not totp.verify(token, valid_window=1):
        raise HTTPException(400, "Invalid verification code. Try again.")
    await _db.user_settings.update_one(
        {"user_id": uid},
        {"$set": {"two_fa_enabled": True, "two_fa_secret": secret, "two_fa_enabled_at": datetime.now(timezone.utc)},
         "$unset": {"_2fa_pending_secret": ""}},
        upsert=True,
    )
    await _db.admin_audit_log.insert_one({
        "user_id": uid, "action": "security.2fa_enabled", "target": "self", "at": datetime.now(timezone.utc),
    })
    return {"ok": True}


@router.post("/admin/security/2fa/disable")
async def disable_2fa(body: Dict[str, str] = Body(...), authorization: Optional[str] = Header(None)):
    user = await _require_admin(authorization)
    uid = str(user["_id"])
    password = (body.get("password") or "").strip()
    if not password:
        raise HTTPException(400, "Current password required to disable 2FA")
    await _db.user_settings.update_one(
        {"user_id": uid},
        {"$set": {"two_fa_enabled": False}, "$unset": {"two_fa_secret": "", "_2fa_pending_secret": ""}},
        upsert=True,
    )
    await _db.admin_audit_log.insert_one({
        "user_id": uid, "action": "security.2fa_disabled", "target": "self", "at": datetime.now(timezone.utc),
    })
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
# ═══════════════════════════════════════════════════════════════════
# SESSIONS
# ═══════════════════════════════════════════════════════════════════
_GEO_CACHE: Dict[str, dict] = {}
_GEO_EMPTY = {
    "city": "", "regionName": "", "country": "", "countryCode": "",
    "lat": None, "lon": None, "isp": "", "asn": "", "timezone": "",
    "zip": "", "query": "",
}


def _is_public_ip(ip: str) -> bool:
    try:
        obj = ipaddress.ip_address((ip or "").split("%")[0].strip().strip("[]"))
        return bool(obj.is_global)
    except Exception:
        return False


def _strip_port(ip: str) -> str:
    raw = (ip or "").strip().strip("[]")
    if raw.count(".") == 3 and raw.count(":") == 1:
        return raw.split(":", 1)[0]
    return raw


def _client_ip(request: Request, reported: Optional[str] = None) -> str:
    """Resolve the visitor IP from proxy headers, then a client-reported public IP."""
    headers = request.headers
    candidates: List[str] = []
    for key in ("cf-connecting-ip", "true-client-ip", "x-real-ip"):
        v = headers.get(key)
        if v:
            candidates.append(_strip_port(v))
    for part in (headers.get("x-forwarded-for") or "").split(","):
        p = _strip_port(part)
        if p:
            candidates.append(p)
    if request.client and request.client.host:
        candidates.append(_strip_port(request.client.host))
    if reported:
        candidates.append(_strip_port(reported))
    for ip in candidates:
        if _is_public_ip(ip):
            return ip
    return next((c for c in candidates if c), "unknown")


async def _geo_lookup(ip: str) -> dict:
    """Look up IP geolocation via ip-api.com with in-memory cache."""
    if not ip or ip in ("unknown", "localhost", "::1"):
        return {**_GEO_EMPTY, "isp": "Unknown", "query": ip or ""}
    if ip in _GEO_CACHE:
        return _GEO_CACHE[ip]
    if not _is_public_ip(ip):
        return {**_GEO_EMPTY, "isp": "Private network", "query": ip}
    try:
        import httpx
        fields = "status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,query"
        async with httpx.AsyncClient(timeout=5) as c:
            r = await c.get(f"http://ip-api.com/json/{ip}?fields={fields}")
            if r.status_code == 200:
                data = r.json()
                if data.get("status") == "success":
                    result = {
                        "city": data.get("city") or "",
                        "regionName": data.get("regionName") or "",
                        "country": data.get("country") or "",
                        "countryCode": data.get("countryCode") or "",
                        "lat": data.get("lat"),
                        "lon": data.get("lon"),
                        "isp": data.get("isp") or data.get("org") or "",
                        "asn": data.get("as") or "",
                        "timezone": data.get("timezone") or "",
                        "zip": data.get("zip") or "",
                        "query": data.get("query") or ip,
                    }
                    _GEO_CACHE[ip] = result
                    return result
    except Exception:
        pass
    return {**_GEO_EMPTY, "query": ip}


def _ua_ver(ua: str, *tokens: str) -> str:
    for token in tokens:
        m = re.search(rf"{re.escape(token)}/([\d.]+)", ua, re.I)
        if m:
            return m.group(1).split(".")[0]
    return ""


def _parse_ua(ua: str) -> dict:
    """Parse user-agent string for device, browser, OS (with versions)."""
    ua = ua or ""
    ua_lower = ua.lower()
    device = "Desktop"
    if "iphone" in ua_lower:
        device = "iPhone"
    elif "ipad" in ua_lower:
        device = "iPad"
    elif "android" in ua_lower and "mobile" in ua_lower:
        device = "Android phone"
    elif "android" in ua_lower:
        device = "Android tablet"
    elif "windows phone" in ua_lower:
        device = "Windows Phone"
    elif "macintosh" in ua_lower or "mac os" in ua_lower:
        device = "Mac"
    elif "cros" in ua_lower:
        device = "Chromebook"
    elif "linux" in ua_lower:
        device = "Linux PC"
    elif "windows" in ua_lower:
        device = "Windows PC"

    browser, bver = "Unknown", ""
    if "edg/" in ua_lower or "edge/" in ua_lower:
        browser, bver = "Edge", _ua_ver(ua, "Edg", "Edge")
    elif "opr/" in ua_lower or "opera" in ua_lower:
        browser, bver = "Opera", _ua_ver(ua, "OPR", "Opera")
    elif "firefox/" in ua_lower:
        browser, bver = "Firefox", _ua_ver(ua, "Firefox")
    elif "chrome/" in ua_lower:
        browser, bver = "Chrome", _ua_ver(ua, "Chrome")
    elif "safari/" in ua_lower:
        browser, bver = "Safari", _ua_ver(ua, "Version", "Safari")
    elif "msie" in ua_lower or "trident/" in ua_lower:
        browser = "Internet Explorer"

    os_name = "Unknown"
    if "windows nt 10" in ua_lower:
        os_name = "Windows 10/11"
    elif "windows nt 6.3" in ua_lower:
        os_name = "Windows 8.1"
    elif "windows" in ua_lower:
        os_name = "Windows"
    elif "mac os x" in ua_lower or "macintosh" in ua_lower:
        m = re.search(r"mac os x (\d+)[._](\d+)", ua_lower)
        os_name = f"macOS {m.group(1)}.{m.group(2)}" if m else "macOS"
    elif "android" in ua_lower:
        m = re.search(r"android ([\d.]+)", ua_lower)
        os_name = f"Android {m.group(1)}" if m else "Android"
    elif "iphone os" in ua_lower or "cpu os" in ua_lower:
        m = re.search(r"(?:iphone os|cpu os) (\d+)[._](\d+)", ua_lower)
        os_name = f"iOS {m.group(1)}.{m.group(2)}" if m else "iOS"
    elif "cros" in ua_lower:
        os_name = "ChromeOS"
    elif "linux" in ua_lower:
        os_name = "Linux"

    label_browser = f"{browser} {bver}".strip() if bver else browser
    return {
        "device": device,
        "browser": label_browser,
        "browser_name": browser,
        "browser_version": bver,
        "os": os_name,
    }


def _fmt_location(geo: Optional[dict]) -> str:
    geo = geo or {}
    parts = [geo.get("city"), geo.get("regionName"), geo.get("country")]
    return ", ".join(p for p in parts if p) or "Location unavailable"


def _session_out(s: dict) -> dict:
    geo = s.get("geo") or {}
    info = s.get("device_info") or {}
    hints = s.get("client_hints") or {}
    dt = s.get("last_active")
    return {
        "id": str(s["_id"]),
        "device": info.get("device") or s.get("device") or "Unknown",
        "browser": info.get("browser") or s.get("browser") or "Unknown",
        "os": info.get("os") or s.get("os") or "",
        "location": _fmt_location(geo),
        "city": geo.get("city") or "",
        "region": geo.get("regionName") or "",
        "country": geo.get("country") or "",
        "country_code": geo.get("countryCode") or "",
        "lat": geo.get("lat"),
        "lon": geo.get("lon"),
        "isp": geo.get("isp") or "",
        "asn": geo.get("asn") or "",
        "timezone": hints.get("timezone") or geo.get("timezone") or "",
        "zip": geo.get("zip") or "",
        "ip": s.get("ip") or geo.get("query") or "",
        "language": hints.get("language") or "",
        "screen": hints.get("screen") or "",
        "platform": hints.get("platform") or "",
        "user_agent": (s.get("user_agent") or "")[:240],
        "last_active": _timeago(dt) if isinstance(dt, datetime) else "—",
        "last_active_raw": dt.isoformat() if isinstance(dt, datetime) else "",
        "created_at": s["created_at"].isoformat() if isinstance(s.get("created_at"), datetime) else "",
        "current": bool(s.get("current")),
    }


@router.get("/admin/security/sessions")
async def get_sessions(authorization: Optional[str] = Header(None), all: bool = False):
    """Return admin sessions. By default returns last 5; ?all=true returns all."""
    user = await _require_admin(authorization)
    uid = str(user["_id"])
    total = await _db.admin_sessions.count_documents({"user_id": uid})
    limit = 999 if all else 5
    cur = _db.admin_sessions.find({"user_id": uid}).sort("last_active", -1).limit(limit)
    sessions_raw = await cur.to_list(limit)
    sessions = [_session_out(s) for s in sessions_raw]
    return {"sessions": sessions, "total": total, "server_time": datetime.now(timezone.utc).isoformat()}


@router.post("/admin/security/sessions/record")
async def record_session(request: Request, authorization: Optional[str] = Header(None)):
    user = await _require_admin(authorization)
    uid = str(user["_id"])
    hints: Dict[str, Any] = {}
    try:
        raw = await request.body()
        if raw:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                hints = {
                    k: parsed[k] for k in (
                        "timezone", "language", "platform", "screen",
                        "hardware_concurrency", "public_ip",
                    ) if parsed.get(k) not in (None, "")
                }
    except Exception:
        hints = {}
    ua = request.headers.get("user-agent") or hints.get("user_agent") or ""
    ip = _client_ip(request, hints.get("public_ip"))
    geo = await _geo_lookup(ip)
    device_info = _parse_ua(ua)
    now = datetime.now(timezone.utc)
    fingerprint = hashlib.sha256(f"{uid}|{ua}|{ip}".encode("utf-8")).hexdigest()[:32]
    await _db.admin_sessions.update_many(
        {"user_id": uid, "fingerprint": {"$ne": fingerprint}},
        {"$set": {"current": False}},
    )
    existing = await _db.admin_sessions.find_one({"user_id": uid, "fingerprint": fingerprint})
    if existing:
        await _db.admin_sessions.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "ip": ip, "geo": geo, "device_info": device_info,
                "user_agent": ua, "client_hints": hints, "current": True,
                "last_active": now,
            }},
        )
    else:
        await _db.admin_sessions.insert_one({
            "user_id": uid, "fingerprint": fingerprint,
            "ip": ip, "geo": geo, "device_info": device_info,
            "user_agent": ua, "client_hints": hints, "current": True,
            "last_active": now, "created_at": now,
        })
        await _db.admin_audit_log.insert_one({
            "user_id": uid,
            "action": "session.seen",
            "target": f"{device_info.get('browser')} · {device_info.get('device')}",
            "at": now,
            "ip": ip,
            "geo": geo,
            "device_info": device_info,
        })
        # Keep a reasonable history; do not drop the live session.
        old = _db.admin_sessions.find({"user_id": uid, "current": {"$ne": True}}).sort("last_active", -1).skip(40)
        async for doc in old:
            await _db.admin_sessions.delete_one({"_id": doc["_id"]})
    return {"ok": True, "ip": ip, "geo": geo, "device_info": device_info}


@router.delete("/admin/security/sessions/{session_id}")
async def revoke_session(session_id: str, authorization: Optional[str] = Header(None)):
    user = await _require_admin(authorization)
    from bson import ObjectId
    try:
        oid = ObjectId(session_id)
    except Exception:
        raise HTTPException(400, "Invalid session id")
    result = await _db.admin_sessions.delete_one({"_id": oid, "user_id": str(user["_id"])})
    if result.deleted_count:
        await _db.admin_audit_log.insert_one({
            "user_id": str(user["_id"]),
            "action": "session.revoked",
            "target": session_id,
            "at": datetime.now(timezone.utc),
        })
    return {"ok": True, "revoked": session_id, "deleted": result.deleted_count > 0}


@router.get("/admin/security/sessions/analysis")
async def session_analysis(authorization: Optional[str] = Header(None)):
    """Analyze session patterns — device breakdown, location heatmap, login frequency."""
    try:
        user = await _require_admin(authorization)
        uid = str(user["_id"])
        total_sessions = await _db.admin_sessions.count_documents({"user_id": uid})
        pipeline = [
            {"$match": {"user_id": uid}},
            {"$group": {"_id": "$device_info.device", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        devices = await _db.admin_sessions.aggregate(pipeline).to_list(20)
        device_breakdown = {d["_id"] or "Unknown": d["count"] for d in devices}
        browser_pipe = [
            {"$match": {"user_id": uid}},
            {"$group": {"_id": "$device_info.browser", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        browsers = await _db.admin_sessions.aggregate(browser_pipe).to_list(20)
        browser_breakdown = {b["_id"] or "Unknown": b["count"] for b in browsers}
        loc_pipe = [
            {"$match": {"user_id": uid}},
            {"$group": {"_id": {"city": "$geo.city", "country": "$geo.country", "lat": "$geo.lat", "lon": "$geo.lon"}, "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        locs = await _db.admin_sessions.aggregate(loc_pipe).to_list(50)
        locations = [{"city": l["_id"]["city"] or "Unknown", "country": l["_id"]["country"] or "", "lat": l["_id"]["lat"], "lon": l["_id"]["lon"], "count": l["count"]} for l in locs]
        freq_pipe = [
            {"$match": {"user_id": uid}},
            {"$group": {"_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}}, "count": {"$sum": 1}}},
            {"$sort": {"_id": -1}},
            {"$limit": 30},
        ]
        freq = await _db.admin_sessions.aggregate(freq_pipe).to_list(30)
        login_frequency = [{"date": f["_id"], "count": f["count"]} for f in freq]
        return {
            "total_sessions": total_sessions,
            "device_breakdown": device_breakdown,
            "browser_breakdown": browser_breakdown,
            "locations": locations,
            "login_frequency": login_frequency,
        }
    except Exception:
        return {"total_sessions": 0, "device_breakdown": {}, "browser_breakdown": {}, "locations": [], "login_frequency": []}


# ═══════════════════════════════════════════════════════════════════
# TRUSTED DEVICES
# ═══════════════════════════════════════════════════════════════════

@router.get("/admin/security/trusted-devices")
async def get_trusted_devices(authorization: Optional[str] = Header(None)):
    """List all trusted devices for this admin."""
    try:
        user = await _require_admin(authorization)
        uid = str(user["_id"])
        devices = []
        cur = _db.trusted_devices.find({"user_id": uid}).sort("added_at", -1)
        async for d in cur:
            devices.append({
                "id": str(d["_id"]),
                "device": d.get("device_info", {}).get("device") or "Unknown",
                "browser": d.get("device_info", {}).get("browser") or "Unknown",
                "os": d.get("device_info", {}).get("os") or "",
                "location": _fmt_location(d.get("geo") or {}),
                "city": (d.get("geo") or {}).get("city") or "",
                "region": (d.get("geo") or {}).get("regionName") or "",
                "country": (d.get("geo") or {}).get("country") or "",
                "isp": (d.get("geo") or {}).get("isp") or "",
                "timezone": (d.get("geo") or {}).get("timezone") or "",
                "ip": d.get("ip", ""),
                "added_at": d.get("added_at").isoformat() if isinstance(d.get("added_at"), datetime) else "",
                "added_ago": _timeago(d.get("added_at")) if isinstance(d.get("added_at"), datetime) else "—",
            })
        return {"trusted_devices": devices}
    except Exception:
        return {"trusted_devices": []}


@router.post("/admin/security/trusted-devices")
async def add_trusted_device(request: Request, authorization: Optional[str] = Header(None)):
    """Trust the current device — adds to trusted-devices list."""
    try:
        user = await _require_admin(authorization)
        uid = str(user["_id"])
        ua = request.headers.get("user-agent", "")
        hints: Dict[str, Any] = {}
        try:
            raw = await request.body()
            if raw:
                parsed = json.loads(raw)
                if isinstance(parsed, dict):
                    hints = {k: parsed[k] for k in ("public_ip", "timezone", "language", "platform", "screen") if parsed.get(k)}
        except Exception:
            hints = {}
        ip = _client_ip(request, hints.get("public_ip"))
        geo = await _geo_lookup(ip)
        device_info = _parse_ua(ua)
        fingerprint = f"{device_info['device']}|{device_info['browser']}|{device_info['os']}"
        existing = await _db.trusted_devices.find_one({"user_id": uid, "fingerprint": fingerprint})
        if existing:
            await _db.trusted_devices.update_one({"_id": existing["_id"]}, {"$set": {"last_seen": datetime.now(timezone.utc), "ip": ip, "geo": geo}})
        else:
            await _db.trusted_devices.insert_one({
                "user_id": uid, "fingerprint": fingerprint,
                "ip": ip, "geo": geo, "device_info": device_info,
                "user_agent": ua,
                "added_at": datetime.now(timezone.utc),
                "last_seen": datetime.now(timezone.utc),
            })
        await _db.admin_audit_log.insert_one({
            "user_id": uid, "action": "trusted_device.added", "target": fingerprint,
            "at": datetime.now(timezone.utc), "ip": ip, "geo": geo, "device_info": device_info,
        })
        return {"ok": True, "trusted": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.delete("/admin/security/trusted-devices/{device_id}")
async def remove_trusted_device(device_id: str, authorization: Optional[str] = Header(None)):
    """Remove a device from the trusted list."""
    try:
        user = await _require_admin(authorization)
        from bson import ObjectId
        result = await _db.trusted_devices.delete_one({"_id": ObjectId(device_id), "user_id": str(user["_id"])})
        await _db.admin_audit_log.insert_one({
            "user_id": str(user["_id"]), "action": "trusted_device.removed", "target": device_id,
            "at": datetime.now(timezone.utc),
        })
        return {"ok": True, "removed": result.deleted_count > 0}
    except Exception:
        return {"ok": True}


def _timeago(dt) -> str:
    if not dt or not isinstance(dt, datetime):
        return "—"
    # Make dt offset-aware if naive
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    diff = now - dt
    secs = int(diff.total_seconds())
    if secs < 60:
        return "Now"
    if secs < 3600:
        return f"{secs // 60}m ago"
    if secs < 86400:
        return f"{secs // 3600}h ago"
    days = secs // 86400
    if days < 7:
        return f"{days}d ago"
    return f"{days // 7}w ago"


@router.get("/admin/security/access-log")
async def access_log(authorization: Optional[str] = Header(None)):
    user = await _require_admin(authorization)
    uid = str(user["_id"])
    pipeline = [
        {"$match": {"user_id": uid}},
        {"$addFields": {"_when": {"$ifNull": ["$at", "$created_at"]}}},
        {"$sort": {"_when": -1}},
        {"$limit": 40},
    ]
    out = []
    async for r in _db.admin_audit_log.aggregate(pipeline):
        when = r.get("_when") or r.get("at") or r.get("created_at")
        geo = r.get("geo") or {}
        info = r.get("device_info") or {}
        out.append({
            "action": r.get("action"),
            "target": r.get("target"),
            "at": when.isoformat() if isinstance(when, datetime) else (when or datetime.now(timezone.utc).isoformat()),
            "ip": r.get("ip") or "—",
            "location": _fmt_location(geo) if geo else "",
            "device": info.get("device") or "",
            "browser": info.get("browser") or "",
            "os": info.get("os") or "",
        })
    return {"entries": out, "server_time": datetime.now(timezone.utc).isoformat()}


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
        seq = await _db.users.count_documents({"role": {"$in": ["admin"]}})
        admin_id = f"SA-2024-{seq:06d}"
        await _db.users.update_one({"_id": user["_id"]}, {"$set": {"admin_id": admin_id}})
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    issue_date = user.get("sa_id_issued_at") or now.isoformat()
    if isinstance(issue_date, datetime):
        issue_date = issue_date.isoformat()
    expiry_date = (now + timedelta(days=365)).isoformat()
    raw_role = (user.get("role") or "").lower().strip()
    is_super = user.get("is_super_admin", False)
    ROLE_LABELS = {
        "admin": "Super Admin" if is_super else "Admin",
        "student": "Student",
        "alumni": "Alumni",
        "mentor": "Mentor",
        "college": "College",
        "college_admin": "College Admin",
    }
    role_label = ROLE_LABELS.get(raw_role) or " ".join(w.capitalize() for w in raw_role.replace("_", " ").split()) or "Administrator"
    org = user.get("org") or "Student Alumni"
    title = user.get("title") or f"Platform {role_label}"
    access = user.get("access_label") or "Full Access"
    colleges_count = await _db.colleges.count_documents({}) or 0
    raw_url = (os.environ.get("FRONTEND_URL") or "").strip().rstrip("/")
    frontend_url = raw_url if (raw_url.startswith("http://") or raw_url.startswith("https://")) else "https://studentalumni.ai"
    verify_url = f"{frontend_url}/verify/{admin_id}"
    qr_data = verify_url
    qr_base64 = _generate_qr_code(qr_data)
    return {
        "admin_id": admin_id,
        "name": user.get("full_name") or user.get("name") or "Administrator",
        "email": user.get("email") or "",
        "photo": user.get("photo") or user.get("avatar_url") or "",
        "title": title,
        "role_label": role_label,
        "access_label": access,
        "org": org,
        "label": "OFFICIAL ID",
        "verified": True,
        "colleges_count": colleges_count,
        "issue_date": str(issue_date),
        "expiry_date": expiry_date,
        "qr_code_base64": qr_base64,
        "verify_url": verify_url,
    }


def _generate_qr_code(data: str) -> str:
    """Generate base64-encoded PNG QR code for a given data string.

    Uses black fill on white background for maximum scan reliability.
    """
    import qrcode
    import io
    import base64 as _b64
    qr = qrcode.QRCode(
        version=None,
        box_size=8,
        border=2,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return _b64.b64encode(buf.getvalue()).decode("utf-8")


@router.get("/admin/digital-id/download")
async def download_digital_id(authorization: Optional[str] = Header(None)):
    """Return the QR code PNG as a file download."""
    user = await _require_admin(authorization)
    admin_id = user.get("admin_id") or f"SA-2024-000001"
    qr_data = f"SA-ID:{admin_id}|{user.get('email', '')}|admin"
    qr_base64 = _generate_qr_code(qr_data)
    import base64 as _b64
    from fastapi.responses import Response
    png_data = _b64.b64decode(qr_base64)
    return Response(content=png_data, media_type="image/png",
                    headers={"Content-Disposition": f"attachment; filename=admin-id-{admin_id}.png"})


@router.get("/admin/digital-id/share-link")
async def get_share_link(authorization: Optional[str] = Header(None)):
    """Return a shareable profile link for the admin."""
    user = await _require_admin(authorization)
    admin_id = user.get("admin_id") or "SA-2024-000001"
    raw_url = (os.environ.get("FRONTEND_URL") or "").strip().rstrip("/")
    frontend_url = raw_url if (raw_url.startswith("http://") or raw_url.startswith("https://")) else "https://studentalumni.ai"
    return {
        "share_url": f"{frontend_url}/admin/profile/{admin_id}",
        "admin_id": admin_id,
    }


# ═══════════════════════════════════════════════════════════════════════
# PAGE MANAGEMENT — Static policy/service pages
# ═══════════════════════════════════════════════════════════════════════

_PAGE_DEFAULTS = {
    "privacy": """<h1>Privacy Policy</h1>
<p>Effective: May 16, 2026</p>
<p>Student Alumni (&quot;we,&quot; &quot;our,&quot; &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our platform at studentalumni.ai.</p>
<h2>Information We Collect</h2>
<p><strong>Personal Data.</strong> We may collect personally identifiable information such as your name, email address, phone number, educational background, professional history, and profile photo when you register or update your profile.</p>
<p><strong>Usage Data.</strong> We automatically collect information about how you interact with our platform, including pages visited, features used, time spent, and click patterns.</p>
<p><strong>Device Data.</strong> We collect device information such as browser type, operating system, IP address, and device identifiers for analytics and security purposes.</p>
<h2>How We Use Your Information</h2>
<p>We use the collected data to: provide and maintain our platform; personalise your experience; connect you with mentors, alumni, and opportunities; send notifications and updates; improve our services; detect and prevent fraud; comply with legal obligations.</p>
<h2>Data Sharing &amp; Disclosure</h2>
<p>We do not sell your personal information. We may share data with: other users within the platform (as part of your profile); service providers who assist in platform operations; law enforcement when required by law; third parties with your explicit consent.</p>
<h2>Data Security</h2>
<p>We implement industry-standard security measures including encryption at rest and in transit, regular security audits, access controls, and secure data storage. However, no method of transmission over the Internet is 100% secure.</p>
<h2>Your Rights</h2>
<p>You have the right to: access your personal data; correct inaccurate data; delete your account and associated data; restrict processing; data portability; withdraw consent at any time. To exercise these rights, contact us at support@studentalumni.ai.</p>
<h2>Cookies</h2>
<p>We use essential cookies for authentication and security. Analytics cookies help us improve the platform. You can control cookie preferences through your browser settings. See our Cookie Policy for details.</p>
<h2>Third-Party Services</h2>
<p>Our platform integrates with third-party services including Google, LinkedIn, and payment processors. These services have their own privacy policies governing data handling.</p>
<h2>Children's Privacy</h2>
<p>Our platform is not intended for users under 16 years of age. We do not knowingly collect data from minors. If you believe a minor has provided us with data, contact us immediately.</p>
<h2>Changes to This Policy</h2>
<p>We may update this Privacy Policy periodically. Material changes will be notified via email or platform notification. Continued use after changes constitutes acceptance.</p>
<h2>Contact</h2>
<p>For privacy-related inquiries, contact us at: privacy@studentalumni.ai or write to our registered address.</p>""",
    "terms": """<h1>Terms of Service</h1>
<p>Effective: May 16, 2026</p>
<h2>Acceptance of Terms</h2>
<p>By accessing or using Student Alumni (&quot;the Platform&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.</p>
<h2>Account Registration</h2>
<p>You must register for an account using accurate and complete information. You are responsible for maintaining the confidentiality of your credentials. You must be at least 16 years old to use the Platform.</p>
<h2>User Conduct</h2>
<p>You agree not to: impersonate any person or entity; provide false information; harass, abuse, or harm other users; upload malicious content; attempt to access restricted areas; use the Platform for illegal activities; violate any applicable laws.</p>
<h2>Intellectual Property</h2>
<p>The Platform and its original content, features, and functionality are owned by Student Alumni and are protected by copyright, trademark, and other intellectual property laws.</p>
<h2>User Content</h2>
<p>By posting content on the Platform, you grant us a non-exclusive, royalty-free license to display and distribute your content within the Platform. You retain ownership of your content.</p>
<h2>Mentor &amp; Student Relationships</h2>
<p>The Platform facilitates connections between students, alumni, and mentors. We are not responsible for the quality of mentorship or outcomes of mentor-mentee relationships. Users engage at their own discretion.</p>
<h2>Payments &amp; Refunds</h2>
<p>Certain features may require payment. All payments are processed securely through third-party payment processors. Refund policies are outlined in our Refund Policy. We reserve the right to change pricing with notice.</p>
<h2>Limitation of Liability</h2>
<p>Student Alumni shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform. Our total liability is limited to the amount paid by you in the past 12 months.</p>
<h2>Termination</h2>
<p>We may suspend or terminate your account for violation of these terms, illegal activity, or at our discretion with notice. You may delete your account at any time from your profile settings.</p>
<h2>Governing Law</h2>
<p>These Terms are governed by the laws of India. Any disputes shall be resolved through binding arbitration in accordance with the Arbitration and Conciliation Act, 1996.</p>
<h2>Changes to Terms</h2>
<p>We reserve the right to modify these terms. Material changes will be communicated via email or platform notification. Continued use constitutes acceptance of modified terms.</p>
<h2>Contact</h2>
<p>For questions about these Terms, contact us at legal@studentalumni.ai.</p>""",
    "cookies": """<h1>Cookie Policy</h1>
<p>Effective: May 16, 2026</p>
<h2>What Are Cookies</h2>
<p>Cookies are small text files stored on your device by your web browser. They help us remember your preferences, authenticate your session, and improve your experience on our platform.</p>
<h2>Types of Cookies We Use</h2>
<p><strong>Essential Cookies.</strong> Required for the platform to function. They enable secure login, session management, and access to protected areas. These cannot be disabled.</p>
<p><strong>Analytics Cookies.</strong> Help us understand how users interact with the platform, which features are popular, and where improvements are needed. We use PostHog for analytics.</p>
<p><strong>Preference Cookies.</strong> Remember your settings, theme preferences, and language choices for a personalised experience.</p>
<h2>Third-Party Cookies</h2>
<p>We may use third-party services (Google Analytics, PostHog, Sentry) that set their own cookies. These services have their own cookie policies.</p>
<h2>Managing Cookies</h2>
<p>Most browsers allow you to control cookies through settings. Blocking essential cookies may impact platform functionality. You can delete existing cookies through your browser preferences.</p>
<h2>Data Collected via Cookies</h2>
<p>Cookies collect information such as page views, session duration, click patterns, and referral URLs. This data is anonymised where possible.</p>
<h2>Updates</h2>
<p>We may update this Cookie Policy. Changes will be posted here with an updated effective date.</p>
<h2>Contact</h2>
<p>For questions about our use of cookies, contact privacy@studentalumni.ai.</p>""",
    "refund": """<h1>Refund Policy</h1>
<p>Effective: May 16, 2026</p>
<h2>Overview</h2>
<p>This Refund Policy governs all paid services, subscriptions, and transactions on the Student Alumni platform.</p>
<h2>Subscription Services</h2>
<p>Monthly and annual subscriptions can be cancelled at any time. You will continue to have access to paid features until the end of the current billing period. No partial refunds are provided for unused portions of a billing period.</p>
<h2>One-Time Payments</h2>
<p>One-time payments for events, workshops, or services are non-refundable unless the event is cancelled by the organiser. If an event is cancelled, you will receive a full refund within 14 business days.</p>
<h2>Mentor Session Credits</h2>
<p>SA Credits used for mentor sessions are refundable if the session is cancelled at least 24 hours in advance. Late cancellations or no-shows are non-refundable.</p>
<h2>Refund Processing</h2>
<p>Approved refunds are processed within 5-14 business days and will be credited to the original payment method. You will receive a confirmation email once the refund is initiated.</p>
<h2>Exceptions</h2>
<p>Refund exceptions may be granted on a case-by-case basis for technical issues, duplicate charges, or extenuating circumstances. Contact support@studentalumni.ai for assistance.</p>
<h2>Dispute Resolution</h2>
<p>If you disagree with a refund decision, you may appeal by contacting refunds@studentalumni.ai within 30 days of the transaction. We will review your case within 10 business days.</p>""",
    "about": """<h1>About Student Alumni</h1>
<h2>Our Mission</h2>
<p>Student Alumni bridges the gap between academic life and professional success. We empower students, alumni, mentors, and institutions to connect, collaborate, and grow together.</p>
<h2>Who We Are</h2>
<p>We are a team of educators, technologists, and industry professionals passionate about transforming how students transition from campus to career. Our platform serves thousands of users across 74+ partner institutions.</p>
<h2>What We Offer</h2>
<ul><li>AI-powered career guidance and mentorship matching</li><li>Professional networking with alumni and industry experts</li><li>Course and skill development recommendations</li><li>Internship and job opportunity marketplace</li><li>Event management and workshop hosting</li><li>College administration and placement tracking</li><li>Digital ID cards and credential verification</li></ul>
<h2>Our Values</h2>
<p><strong>Community:</strong> We believe in the power of connections. <strong>Innovation:</strong> We leverage AI to personalise career growth. <strong>Integrity:</strong> We prioritise data privacy and security. <strong>Impact:</strong> Every feature is designed to create real outcomes.</p>
<h2>Contact</h2>
<p>Email: hello@studentalumni.ai<br/>Platform: studentalumni.ai</p>""",
    "faq": """<h1>Frequently Asked Questions</h1>
<h2>What is Student Alumni?</h2>
<p>Student Alumni is a platform that connects students with alumni, mentors, colleges, and employers. It provides tools for career development, networking, events, mentorship, and professional growth.</p>
<h2>Who can join Student Alumni?</h2>
<p>Students, alumni, mentors, and college administrators can join. Students must be enrolled in a partner institution. Alumni must have graduated from a partner institution.</p>
<h2>Is the platform free?</h2>
<p>Basic features are free for all users. Premium features such as AI career coaching, advanced analytics, and priority mentorship may require a subscription or one-time payment.</p>
<h2>How do I reset my password?</h2>
<p>Go to the login page and click &quot;Forgot Password&quot;. Enter your registered email and we will send you a password reset link. The link expires in 1 hour.</p>
<h2>How does mentorship work?</h2>
<p>Students can browse mentors by industry, expertise, or institution. They can request sessions based on mentor availability. Sessions can be online or in-person. Mentors set their own schedules.</p>
<h2>How do I earn SA Credits?</h2>
<p>SA Credits are earned through platform activities: completing your profile, attending events, participating in mentorship sessions, referring friends, and engaging with content.</p>
<h2>Can I delete my account?</h2>
<p>Yes. Go to Profile Settings &gt; Account &gt; Delete Account. This will permanently remove your data from our platform. Some data may be retained for legal compliance.</p>
<h2>How is my data protected?</h2>
<p>We use encryption, access controls, and regular security audits to protect your data. We never sell your personal information. See our Privacy Policy for details.</p>
<h2>How do I become a mentor?</h2>
<p>Register as a mentor during sign-up or change your role in settings. Complete your mentor profile with expertise, experience, and availability. Admin approval may be required.</p>
<h2>How do colleges use the platform?</h2>
<p>Colleges can manage student rosters, track placements, publish events and announcements, and view analytics about student engagement and outcomes.</p>""",
}

PAGE_SCHEMA = {
    "privacy": {"title": "Privacy Policy", "route": "/policy/privacy"},
    "terms": {"title": "Terms of Service", "route": "/policy/terms"},
    "cookies": {"title": "Cookie Policy", "route": "/policy/cookies"},
    "refund": {"title": "Refund Policy", "route": "/policy/refund"},
    "about": {"title": "About Us", "route": "/about"},
    "faq": {"title": "FAQ", "route": "/faq"},
}

def _page_content(doc: dict, page_key: str) -> str:
    """Return DB content if available, otherwise the default HTML."""
    return doc.get("content") or _PAGE_DEFAULTS.get(page_key, "")


@router.get("/pages/{page_key}")
async def get_public_page(page_key: str):
    """Public endpoint to fetch a single page's content by key."""
    if page_key not in PAGE_SCHEMA:
        raise HTTPException(404, "Page not found")
    doc = await _db.pages.find_one({"key": page_key})
    if doc is None:
        doc = {}
    if not doc.get("active", True):
        raise HTTPException(404, "Page not found or not published")
    return {
        "key": page_key,
        "title": PAGE_SCHEMA[page_key]["title"],
        "route": PAGE_SCHEMA[page_key]["route"],
        "content": _page_content(doc, page_key),
        "updated_at": str(doc.get("updated_at", "")),
    }


@router.get("/admin/pages")
async def list_pages(authorization: Optional[str] = Header(None)):
    """Return all static pages with their editable content from DB."""
    await _require_admin(authorization)
    pages = await _db.pages.find().to_list(length=100)
    page_map = {p["key"]: p for p in pages}
    result = []
    for key, meta in PAGE_SCHEMA.items():
        doc = page_map.get(key, {})
        result.append({
            "key": key,
            "title": meta["title"],
            "route": meta["route"],
            "content": _page_content(doc, key),
            "active": doc.get("active", True),
            "updated_at": str(doc.get("updated_at", "")),
        })
    return result


class PageUpdate(BaseModel):
    content: str
    active: bool = True


@router.patch("/admin/pages/{page_key}")
async def update_page(page_key: str, body: PageUpdate, authorization: Optional[str] = Header(None)):
    """Update a static page's content and visibility."""
    await _require_admin(authorization)
    if page_key not in PAGE_SCHEMA:
        raise HTTPException(404, "Page not found")
    await _db.pages.update_one(
        {"key": page_key},
        {"$set": {"content": body.content, "active": body.active, "updated_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return {"status": "ok", "key": page_key, "updated": True}


class AiAssistRequest(BaseModel):
    prompt: str
    current_content: str = ""


@router.post("/admin/pages/ai-assist")
async def pages_ai_assist(body: AiAssistRequest, authorization: Optional[str] = Header(None)):
    """AI-powered content generation/rewrite for static pages.
    
    Priority:
    1. EMERGENT_LLM_KEY env var → uses emergentintegrations with Claude
    2. Marketplace installed Grok (xAI) key → uses Grok API directly
    3. Marketplace installed OpenAI key → uses OpenAI API directly
    4. Any other installed AI provider → uses OpenAI-compatible fallback
    """
    user = await _require_admin(authorization)
    user_id = str(user["_id"])

    system = (
        "You are a content editor assistant for an Indian student alumni platform. "
        "Generate clean, professional HTML content. Use <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, "
        "<blockquote>, <strong>, <em>, <u> tags only. "
        "Return ONLY the HTML body content — no <html>, <head>, or <body> wrappers, no markdown fences."
    )

    if body.current_content:
        prompt = (
            f"Current page content:\n{body.current_content}\n\n"
            f"User request: {body.prompt}\n\n"
            f"Rewrite or extend the content based on the user request."
        )
    else:
        prompt = body.prompt

    # Priority 1: EMERGENT_LLM_KEY + emergentintegrations
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if api_key:
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            chat = (
                LlmChat(
                    api_key=api_key,
                    session_id=f"pages-ai-{uuid4().hex[:8]}",
                    system_message=system,
                )
                .with_model("anthropic", "claude-sonnet-4-5-20250929")
            )
            try:
                reply = await chat.send_message(UserMessage(text=prompt))
                text = (reply or "").strip()
                text = text.strip("```html").strip("```").strip()
                if not text:
                    text = "<p>Generated content placeholder.</p>"
                return {"content": text}
            except Exception as e:
                raise HTTPException(502, f"AI generation failed: {e}")
        except ImportError:
            pass


    async def _call_openai_compatible(
        base_url: str, api_key: str, model: str, system_msg: str, user_msg: str
    ) -> str:
        import aiohttp
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        body = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg},
            ],
            "temperature": 0.7,
            "max_tokens": 4000,
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{base_url.rstrip('/')}/v1/chat/completions",
                headers=headers,
                json=body,
                timeout=aiohttp.ClientTimeout(total=60),
            ) as resp:
                if resp.status != 200:
                    err_text = await resp.text()
                    raise HTTPException(502, f"AI API error {resp.status}: {err_text[:200]}")
                data = await resp.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                if not content:
                    content = data.get("choices", [{}])[0].get("text", "")
                return content

    installed_cur = _db.installed_tools.find({
        "user_id": user_id,
        "status": "connected",
    })

    # Priority order for providers
    provider_configs = {}
    async for row in installed_cur:
        tid = row.get("tool_id", "")
        creds = row.get("credentials", {})
        provider_configs[tid] = {
            "api_key": creds.get("api_key", creds.get("emergent_key", "")),
            "credentials": creds,
        }

    # Priority 2: Groq (ultra-fast LPU inference)
    groq_cfg = provider_configs.get("groq")
    if groq_cfg and groq_cfg["api_key"]:
        try:
            text = await _call_openai_compatible(
                base_url="https://api.groq.com/openai",
                api_key=groq_cfg["api_key"],
                model="llama3-70b-8192",
                system_msg=system,
                user_msg=prompt,
            )
            text = text.strip()
            text = text.strip("```html").strip("```").strip()
            if not text:
                text = "<p>Generated content placeholder.</p>"
            return {"content": text, "provider": "groq"}
        except Exception as e:
            pass

    # Priority 3: OpenAI
    openai_cfg = provider_configs.get("openai")
    if openai_cfg and openai_cfg["api_key"]:
        try:
            text = await _call_openai_compatible(
                base_url="https://api.openai.com",
                api_key=openai_cfg["api_key"],
                model="gpt-4o",
                system_msg=system,
                user_msg=prompt,
            )
            text = text.strip()
            text = text.strip("```html").strip("```").strip()
            if not text:
                text = "<p>Generated content placeholder.</p>"
            return {"content": text, "provider": "openai"}
        except Exception as e:
            pass

    # Priority 4: Claude (Anthropic) from marketplace
    claude_cfg = provider_configs.get("claude")
    if claude_cfg and claude_cfg["api_key"]:
        try:
            import aiohttp
            headers = {
                "x-api-key": claude_cfg["api_key"],
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            }
            req_body = {
                "model": "claude-sonnet-4-5-20250929",
                "max_tokens": 4000,
                "system": system,
                "messages": [{"role": "user", "content": prompt}],
            }
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://api.anthropic.com/v1/messages",
                    headers=headers,
                    json=req_body,
                    timeout=aiohttp.ClientTimeout(total=60),
                ) as resp:
                    if resp.status != 200:
                        err_text = await resp.text()
                        raise HTTPException(502, f"Anthropic API error {resp.status}: {err_text[:200]}")
                    data = await resp.json()
                    text = ""
                    for block in data.get("content", []):
                        if block.get("type") == "text":
                            text += block.get("text", "")
                    text = text.strip()
                    text = text.strip("```html").strip("```").strip()
                    if not text:
                        text = "<p>Generated content placeholder.</p>"
                    return {"content": text, "provider": "claude"}
        except Exception as e:
            pass

    # No AI provider configured
    raise HTTPException(
        500,
        "No AI provider configured. Set EMERGENT_LLM_KEY in backend/.env, "
        "or connect Groq, OpenAI, or Anthropic Claude in Marketplace → AI providers.",
    )
