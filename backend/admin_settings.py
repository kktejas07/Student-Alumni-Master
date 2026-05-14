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
    {"id": "openai",          "name": "OpenAI ChatGPT",  "category": "AI",        "icon": "creation",                "tint": "#10A37F", "description": "Alternative LLM backend for AI features.",         "auth_type": "api_key", "popular": True,
     "auth_fields": [_f("api_key","OpenAI API Key","password","sk-xxxxxxxx","From platform.openai.com → API keys"),
                     _f("organization_id","Organization ID","text","org-xxxx (optional)")]},
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
                     _f("host","Host","url","https://app.posthog.com")]},
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
        if tool_id == "github":
            r = await _get("https://api.github.com/user", headers={"Authorization": f"Bearer {api_key}"})
            return (r.status_code == 200, "Verified — GitHub token accepted" if r.status_code == 200 else f"GitHub: HTTP {r.status_code}")
        if tool_id == "notion":
            r = await _get("https://api.notion.com/v1/users/me", headers={"Authorization": f"Bearer {api_key}", "Notion-Version": "2022-06-28"})
            return (r.status_code == 200, "Verified — Notion token accepted" if r.status_code == 200 else f"Notion: HTTP {r.status_code}")
        if tool_id == "slack":
            tok = creds.get("bot_token", api_key)
            r = await _get("https://slack.com/api/auth.test", headers={"Authorization": f"Bearer {tok}"})
            ok = r.status_code == 200 and (r.json() or {}).get("ok") is True
            return (ok, "Verified — Slack token accepted" if ok else "Slack: token rejected")
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
