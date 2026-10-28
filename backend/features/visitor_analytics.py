from __future__ import annotations
from core.deps import require_role
"""
Visitor Analytics & Telemetry Engine
===================================
Real-time tracking of all visitors (unregistered guests & registered users).
Captures:
  - Client IP & Server-side Geolocation (Country, City, Region, ISP, Lat/Long)
  - Hardware & Device Fingerprint (Canvas/WebGL, GPU, CPU cores, RAM, Screen res)
  - OS, Browser, Device Type (Desktop/Mobile/Tablet)
  - Inferred Identity / Lead Capture (Name, Email, Phone if provided in forms)
  - Modular platform telemetry (Welcome, Auth, Courses, Events, Deals, Portals, Mentorship)
  - Session Heartbeats, Dwell Time, Click Streams, Navigation Breadcrumbs

Collections used:
  - visitor_sessions : Unique sessions with full hardware, geo, and visitor metadata
  - visitor_events   : Fine-grained chronological event trail per session
"""
import os
import io
import csv
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from pathlib import Path

from bson import ObjectId
from core.query_helpers import nonempty
from fastapi import APIRouter, Depends, HTTPException, Request, Query, Response
from pydantic import BaseModel

from core.db import db as _db
from geo import resolve_ip

logger = logging.getLogger(__name__)
router = APIRouter(tags=["visitor-analytics"])


# ─── Pydantic Models ────────────────────────────────────────────────
class HardwareSpecs(BaseModel):
    screen_resolution: Optional[str] = None
    viewport: Optional[str] = None
    color_depth: Optional[int] = None
    pixel_ratio: Optional[float] = None
    cpu_cores: Optional[int] = None
    device_memory_gb: Optional[float] = None
    gpu_renderer: Optional[str] = None
    gpu_vendor: Optional[str] = None
    touch_support: Optional[bool] = None
    connection_type: Optional[str] = None
    downlink_mbps: Optional[float] = None
    rtt_ms: Optional[int] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    platform: Optional[str] = None


class VisitorHeartbeat(BaseModel):
    session_id: str
    visitor_id: str                  # Persistent client UUID / fingerprint
    device_fingerprint: str           # Unique hardware/canvas fingerprint hash
    current_path: str                 # e.g. /welcome, /courses, /events
    current_module: Optional[str] = None # e.g. landing, courses, events, deals, auth, college
    referrer: Optional[str] = None
    landing_page: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_content: Optional[str] = None
    utm_term: Optional[str] = None
    duration_seconds: Optional[int] = 0
    page_views_count: Optional[int] = 1
    clicks_count: Optional[int] = 0
    inferred_name: Optional[str] = None
    inferred_email: Optional[str] = None
    inferred_phone: Optional[str] = None
    user_id: Optional[str] = None     # If logged in
    user_role: Optional[str] = None   # student, alumni, mentor, college, admin, or guest
    hardware: Optional[HardwareSpecs] = None


class VisitorEventPayload(BaseModel):
    session_id: str
    visitor_id: str
    event_type: str                   # page_view, click, scroll, form_focus, lead_submit, modal_open
    module: Optional[str] = None      # landing, courses, events, deals, auth, etc.
    path: str
    element_id: Optional[str] = None
    element_text: Optional[str] = None
    target_url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class IdentifyPayload(BaseModel):
    visitor_id: str
    session_id: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    source_form: Optional[str] = None


# ─── UA Parser Helper ────────────────────────────────────────────────
def _parse_user_agent(ua: str) -> Dict[str, str]:
    ua_l = (ua or "").lower()
    if "ipad" in ua_l or ("android" in ua_l and "mobile" not in ua_l):
        kind = "tablet"
    elif "iphone" in ua_l or "mobile" in ua_l or "android" in ua_l:
        kind = "mobile"
    elif "bot" in ua_l or "crawler" in ua_l or "spider" in ua_l:
        kind = "bot"
    else:
        kind = "desktop"

    if "iphone" in ua_l or "ipad" in ua_l:
        os_name = "iOS"
    elif "android" in ua_l:
        os_name = "Android"
    elif "macintosh" in ua_l or "mac os" in ua_l:
        os_name = "macOS"
    elif "windows" in ua_l:
        os_name = "Windows"
    elif "linux" in ua_l:
        os_name = "Linux"
    elif "cros" in ua_l:
        os_name = "Chrome OS"
    else:
        os_name = "Unknown OS"

    if "edg" in ua_l:
        browser = "Edge"
    elif "chrome" in ua_l and "chromium" not in ua_l:
        browser = "Chrome"
    elif "firefox" in ua_l:
        browser = "Firefox"
    elif "safari" in ua_l and "chrome" not in ua_l:
        browser = "Safari"
    elif "opera" in ua_l or "opr" in ua_l:
        browser = "Opera"
    else:
        browser = "Other"

    return {"os": os_name, "browser": browser, "kind": kind}


def _infer_module_from_path(path: str) -> str:
    p = (path or "").lower().strip()
    if p in ("/", "/welcome", "/landing", "/home") or p.startswith("/welcome") or p.startswith("/about") or p.startswith("/contact"):
        return "landing"
    if p.startswith("/login") or p.startswith("/register") or p.startswith("/auth") or p.startswith("/onboarding"):
        return "auth"
    if p.startswith("/courses") or p.startswith("/skills") or p.startswith("/certificates"):
        return "courses"
    if p.startswith("/events") or p.startswith("/hackathons") or p.startswith("/webinars"):
        return "events"
    if p.startswith("/deals") or p.startswith("/perks") or p.startswith("/discounts"):
        return "deals"
    if p.startswith("/mentors") or p.startswith("/mentor-ai") or p.startswith("/ai-studio"):
        return "mentorship"
    if p.startswith("/college") or p.startswith("/campus") or p.startswith("/university"):
        return "college"
    if p.startswith("/talent") or p.startswith("/jobs") or p.startswith("/career"):
        return "talent"
    if p.startswith("/bgv") or p.startswith("/verification") or p.startswith("/accounts"):
        return "bgv"
    if p.startswith("/echo") or p.startswith("/showcase"):
        return "echo"
    if p.startswith("/newsletter") or p.startswith("/articles") or p.startswith("/blog"):
        return "newsletter"
    if p.startswith("/admin") or p.startswith("/portal"):
        return "admin"
    return "general"


def _generate_visitor_alias(visitor_id: str, city: str, country_code: str) -> str:
    short_hash = (visitor_id or "0000")[:4].upper()
    loc = f"{city}, {country_code}" if city and city != "Unknown" else (country_code if country_code != "??" else "Global")
    return f"Guest #{short_hash} ({loc})"


# ─── Public Telemetry Endpoints ─────────────────────────────────────

@router.post("/analytics/visitor/heartbeat")
async def record_heartbeat(hb: VisitorHeartbeat, request: Request):
    """
    Ingest visitor heartbeat & update visitor session data.
    Open endpoint — does NOT require auth.
    """
    ua = request.headers.get("user-agent", "")
    ip = request.client.host if request.client else "0.0.0.0"
    
    # Check for forwarded headers if behind reverse proxy
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
    elif request.headers.get("x-real-ip"):
        ip = request.headers.get("x-real-ip").strip()

    parsed_ua = _parse_user_agent(ua)
    geo = await resolve_ip(ip)

    now = datetime.now(timezone.utc)
    module = hb.current_module or _infer_module_from_path(hb.current_path)

    # Check if session exists
    session = await _db.visitor_sessions.find_one({"session_id": hb.session_id})

    # Prepare document update
    is_registered = bool(hb.user_id and hb.user_role and hb.user_role != "guest")
    
    inferred_name = hb.inferred_name or (session.get("inferred_name") if session else None)
    inferred_email = hb.inferred_email or (session.get("inferred_email") if session else None)
    inferred_phone = hb.inferred_phone or (session.get("inferred_phone") if session else None)

    alias = inferred_name or _generate_visitor_alias(hb.visitor_id, geo.get("city", ""), geo.get("country_code", "??"))

    hw_dict = hb.hardware.dict() if hb.hardware else {}

    session_doc = {
        "session_id": hb.session_id,
        "visitor_id": hb.visitor_id,
        "device_fingerprint": hb.device_fingerprint or hashlib.sha256(f"{ua}|{ip}|{hw_dict.get('screen_resolution')}".encode()).hexdigest()[:16],
        "ip": ip,
        "geo": {
            "country": geo.get("country", "Unknown"),
            "country_code": geo.get("country_code", "??"),
            "city": geo.get("city", "Unknown"),
            "region": geo.get("region", geo.get("regionName", "")),
            "isp": geo.get("isp", ""),
            "lat": geo.get("lat"),
            "lon": geo.get("lon"),
        },
        "device": {
            "os": parsed_ua["os"],
            "browser": parsed_ua["browser"],
            "kind": parsed_ua["kind"],
            "user_agent": ua[:300],
            **hw_dict,
        },
        "current_path": hb.current_path,
        "current_module": module,
        "referrer": hb.referrer or (session.get("referrer") if session else ""),
        "landing_page": hb.landing_page or (session.get("landing_page") if session else hb.current_path),
        "utm": {
            "source": hb.utm_source or (session.get("utm", {}).get("source") if session else None),
            "medium": hb.utm_medium or (session.get("utm", {}).get("medium") if session else None),
            "campaign": hb.utm_campaign or (session.get("utm", {}).get("campaign") if session else None),
            "content": hb.utm_content or (session.get("utm", {}).get("content") if session else None),
            "term": hb.utm_term or (session.get("utm", {}).get("term") if session else None),
        },
        "is_registered": is_registered,
        "user_id": hb.user_id,
        "user_role": hb.user_role or ("registered" if is_registered else "guest"),
        "inferred_name": inferred_name,
        "inferred_email": inferred_email,
        "inferred_phone": inferred_phone,
        "alias": alias,
        "duration_seconds": max(hb.duration_seconds or 0, session.get("duration_seconds", 0) if session else 0),
        "page_views_count": max(hb.page_views_count or 1, session.get("page_views_count", 1) if session else 1),
        "clicks_count": max(hb.clicks_count or 0, session.get("clicks_count", 0) if session else 0),
        "last_heartbeat": now,
        "is_active": True,
    }

    if not session:
        session_doc["created_at"] = now
        session_doc["first_seen"] = now
        await _db.visitor_sessions.insert_one(session_doc)
    else:
        await _db.visitor_sessions.update_one(
            {"session_id": hb.session_id},
            {"$set": session_doc}
        )

    return {
        "ok": True,
        "session_id": hb.session_id,
        "ip": ip,
        "country": geo.get("country"),
        "city": geo.get("city"),
        "alias": alias,
    }


@router.post("/analytics/visitor/event")
async def record_visitor_event(ev: VisitorEventPayload, request: Request):
    """
    Log fine-grained visitor interaction event (page change, click, scroll, lead interaction).
    """
    now = datetime.now(timezone.utc)
    module = ev.module or _infer_module_from_path(ev.path)

    doc = {
        "session_id": ev.session_id,
        "visitor_id": ev.visitor_id,
        "event_type": ev.event_type,
        "module": module,
        "path": ev.path,
        "element_id": ev.element_id,
        "element_text": ev.element_text,
        "target_url": ev.target_url,
        "metadata": ev.metadata or {},
        "timestamp": now,
    }

    await _db.visitor_events.insert_one(doc)

    # Increment session counters
    update_fields: Dict[str, Any] = {"last_heartbeat": now, "current_path": ev.path, "current_module": module}
    if ev.event_type == "page_view":
        await _db.visitor_sessions.update_one(
            {"session_id": ev.session_id},
            {"$inc": {"page_views_count": 1}, "$set": update_fields}
        )
    elif ev.event_type == "click":
        await _db.visitor_sessions.update_one(
            {"session_id": ev.session_id},
            {"$inc": {"clicks_count": 1}, "$set": update_fields}
        )

    return {"ok": True}


@router.post("/analytics/visitor/identify")
async def identify_visitor(payload: IdentifyPayload):
    """
    Attach an identified name/email/phone to a visitor and their sessions.
    Useful when a guest fills out a form, inquiry, or newsletter without logging in.
    """
    update: Dict[str, Any] = {}
    if payload.name: update["inferred_name"] = payload.name.strip()
    if payload.email: update["inferred_email"] = payload.email.strip().lower()
    if payload.phone: update["inferred_phone"] = payload.phone.strip()
    if payload.role: update["user_role"] = payload.role

    if not update:
        return {"ok": True, "updated": 0}

    # Update all sessions for this visitor
    res = await _db.visitor_sessions.update_many(
        {"$or": [{"visitor_id": payload.visitor_id}, {"session_id": payload.session_id}]},
        {"$set": update}
    )

    return {"ok": True, "matched_sessions": res.matched_count}


# ─── Super Admin Analytics Queries ──────────────────────────────────

@router.get("/admin/analytics/visitors/live")
async def get_live_visitors(user: dict = Depends(require_role("admin", "superadmin", "college"))):
    """
    Real-time active visitors on the site within the last 5 minutes.
    """
    now = datetime.now(timezone.utc)
    five_min_ago = now - timedelta(minutes=5)
    one_day_ago = now - timedelta(hours=24)

    # Online right now (< 5 min heartbeat)
    live_cursor = _db.visitor_sessions.find(
        {"last_heartbeat": {"$gte": five_min_ago}}
    ).sort("last_heartbeat", -1).limit(100)

    live_visitors = []
    async for s in live_cursor:
        s["_id"] = str(s["_id"])
        if isinstance(s.get("last_heartbeat"), datetime):
            s["last_heartbeat"] = s["last_heartbeat"].isoformat()
        if isinstance(s.get("first_seen"), datetime):
            s["first_seen"] = s["first_seen"].isoformat()
        if isinstance(s.get("created_at"), datetime):
            s["created_at"] = s["created_at"].isoformat()
        live_visitors.append(s)

    # Real-time summaries
    total_live = len(live_visitors)
    guests_live = sum(1 for v in live_visitors if not v.get("is_registered"))
    registered_live = total_live - guests_live

    # Active modules right now
    module_counts: Dict[str, int] = {}
    for v in live_visitors:
        m = v.get("current_module", "landing")
        module_counts[m] = module_counts.get(m, 0) + 1

    total_visitors_24h = await _db.visitor_sessions.count_documents({"last_heartbeat": {"$gte": one_day_ago}})
    total_pageviews_24h_pipeline = [
        {"$match": {"last_heartbeat": {"$gte": one_day_ago}}},
        {"$group": {"_id": None, "total": {"$sum": "$page_views_count"}}}
    ]
    pv_res = await _db.visitor_sessions.aggregate(total_pageviews_24h_pipeline).to_list(1)
    total_pageviews_24h = pv_res[0]["total"] if pv_res else 0

    return {
        "timestamp": now.isoformat(),
        "summary": {
            "total_live": total_live,
            "guests_live": guests_live,
            "registered_live": registered_live,
            "total_visitors_24h": total_visitors_24h,
            "total_pageviews_24h": total_pageviews_24h,
            "module_distribution": module_counts,
        },
        "live_visitors": live_visitors,
    }


@router.get("/admin/analytics/visitors")
async def list_visitors(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    status: Optional[str] = Query(None), # live, idle, all
    visitor_type: Optional[str] = Query(None), # guest, registered, all
    module: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    user: dict = Depends(require_role("admin", "superadmin", "college"))
):
    """
    Paginated, filterable visitor list with search by IP, Inferred Name, Fingerprint, or Path.
    """
    match: Dict[str, Any] = {}
    now = datetime.now(timezone.utc)

    if status == "live":
        match["last_heartbeat"] = {"$gte": now - timedelta(minutes=5)}
    elif status == "idle":
        match["last_heartbeat"] = {"$gte": now - timedelta(hours=1), "$lt": now - timedelta(minutes=5)}

    if visitor_type == "guest":
        match["is_registered"] = {"$ne": True}
    elif visitor_type == "registered":
        match["is_registered"] = True

    if module and module != "all":
        match["current_module"] = module

    if country and country != "all":
        match["geo.country_code"] = country.upper()

    if search:
        s = search.strip()
        match["$or"] = [
            {"ip": {"$regex": s, "$options": "i"}},
            {"inferred_name": {"$regex": s, "$options": "i"}},
            {"inferred_email": {"$regex": s, "$options": "i"}},
            {"alias": {"$regex": s, "$options": "i"}},
            {"device_fingerprint": {"$regex": s, "$options": "i"}},
            {"current_path": {"$regex": s, "$options": "i"}},
            {"geo.city": {"$regex": s, "$options": "i"}},
            {"geo.country": {"$regex": s, "$options": "i"}},
        ]

    total = await _db.visitor_sessions.count_documents(match)
    skip = (page - 1) * limit

    cursor = _db.visitor_sessions.find(match).sort("last_heartbeat", -1).skip(skip).limit(limit)
    items = []
    async for s in cursor:
        s["_id"] = str(s["_id"])
        # Format dates
        for date_key in ("last_heartbeat", "first_seen", "created_at"):
            if isinstance(s.get(date_key), datetime):
                s[date_key] = s[date_key].isoformat()
        
        # Determine status
        lb = s.get("last_heartbeat")
        if lb:
            try:
                dt = datetime.fromisoformat(lb.replace("Z", "+00:00")) if isinstance(lb, str) else lb
                if hasattr(dt, 'tzinfo') and dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                if (now - dt).total_seconds() < 300:
                    s["status"] = "online"
                elif (now - dt).total_seconds() < 3600:
                    s["status"] = "idle"
                else:
                    s["status"] = "offline"
            except Exception:
                s["status"] = "offline"
        else:
            s["status"] = "offline"

        items.append(s)

    return {
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": (total + limit - 1) // limit,
        "items": items,
    }


@router.get("/admin/analytics/visitors/{session_or_visitor_id}")
async def get_visitor_dossier(session_or_visitor_id: str, user: dict = Depends(require_role("admin", "superadmin", "college"))):
    """
    Detailed dossier for a single visitor session including full journey event trail.
    """
    session = await _db.visitor_sessions.find_one({
        "$or": [
            {"session_id": session_or_visitor_id},
            {"visitor_id": session_or_visitor_id},
            {"_id": ObjectId(session_or_visitor_id) if ObjectId.is_valid(session_or_visitor_id) else None}
        ]
    })

    if not session:
        raise HTTPException(404, "Visitor session not found")

    session["_id"] = str(session["_id"])
    for k in ("last_heartbeat", "first_seen", "created_at"):
        if isinstance(session.get(k), datetime):
            session[k] = session[k].isoformat()

    # Get chronological event journey for this session
    events_cur = _db.visitor_events.find({"session_id": session["session_id"]}).sort("timestamp", 1).limit(200)
    events = []
    async for ev in events_cur:
        ev["_id"] = str(ev["_id"])
        if isinstance(ev.get("timestamp"), datetime):
            ev["timestamp"] = ev["timestamp"].isoformat()
        events.append(ev)

    # Get all other historical sessions from same device/visitor ID
    past_sessions_cur = _db.visitor_sessions.find(
        {"visitor_id": session["visitor_id"], "session_id": {"$ne": session["session_id"]}}
    ).sort("last_heartbeat", -1).limit(10)
    past_sessions = []
    async for ps in past_sessions_cur:
        ps["_id"] = str(ps["_id"])
        if isinstance(ps.get("last_heartbeat"), datetime):
            ps["last_heartbeat"] = ps["last_heartbeat"].isoformat()
        past_sessions.append(ps)

    return {
        "session": session,
        "events": events,
        "past_sessions": past_sessions,
        "total_historical_sessions": len(past_sessions) + 1,
    }


@router.get("/admin/analytics/modules")
async def get_modular_analytics(days: int = Query(30, ge=1, le=180), user: dict = Depends(require_role("admin", "superadmin", "college"))):
    """
    Module-based analytics matrix across platform components.
    """
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days)

    # Pipeline for module aggregations
    pipeline = [
        {"$match": {"last_heartbeat": {"$gte": cutoff}}},
        {"$group": {
            "_id": "$current_module",
            "total_sessions": {"$sum": 1},
            "total_pageviews": {"$sum": "$page_views_count"},
            "total_clicks": {"$sum": "$clicks_count"},
            "avg_duration": {"$avg": "$duration_seconds"},
            "unregistered_count": {"$sum": {"$cond": [{"$eq": ["$is_registered", True]}, 0, 1]}},
            "registered_count": {"$sum": {"$cond": [{"$eq": ["$is_registered", True]}, 1, 0]}},
            "unique_visitors": {"$addToSet": "$visitor_id"},
        }},
        {"$project": {
            "module": "$_id",
            "total_sessions": 1,
            "total_pageviews": 1,
            "total_clicks": 1,
            "avg_duration_sec": {"$round": ["$avg_duration", 0]},
            "unregistered_count": 1,
            "registered_count": 1,
            "unique_visitors_count": {"$size": "$unique_visitors"},
        }},
        {"$sort": {"total_sessions": -1}}
    ]

    module_docs = await _db.visitor_sessions.aggregate(pipeline).to_list(50)

    # Default platform modules catalogue
    PLATFORM_MODULES = [
        {"id": "landing", "name": "Welcome & Landing Portal", "icon": "Sparkles", "desc": "Public home, about, vision & guest hero pages"},
        {"id": "auth", "name": "Auth & Onboarding Hub", "icon": "KeyRound", "desc": "Role selector, login, registration & OTP flow"},
        {"id": "courses", "name": "Courses & Certifications", "icon": "GraduationCap", "desc": "Skill marketplace, course catalogs & cert claim"},
        {"id": "events", "name": "Events & Hackathons", "icon": "Calendar", "desc": "Campus events, competitions, webinars & RSVPs"},
        {"id": "deals", "name": "Deals & Student Perks", "icon": "Gift", "desc": "Student discounts, brand offers & voucher claims"},
        {"id": "mentorship", "name": "Mentorship & AI Studio", "icon": "Bot", "desc": "Mentor search, 1:1 sessions & AI mentor studio"},
        {"id": "college", "name": "College & Campus Portals", "icon": "Building2", "desc": "Institutional directories, alumni departments & stats"},
        {"id": "talent", "name": "Talent Pool & Job Feed", "icon": "Briefcase", "desc": "Career match, verified talent search & candidate cards"},
        {"id": "bgv", "name": "BGV & Account Verification", "icon": "ShieldCheck", "desc": "Background verification & automated claim invites"},
        {"id": "echo", "name": "Echo Showcase", "icon": "Tv", "desc": "Live showcase, streaming presentations & pitch room"},
        {"id": "newsletter", "name": "Newsletter & Knowledge Base", "icon": "Mail", "desc": "Curated editorial, student briefs & email digests"},
    ]

    stats_map = {d["module"]: d for d in module_docs if d.get("module")}

    enriched_modules = []
    for mod in PLATFORM_MODULES:
        stat = stats_map.get(mod["id"], {
            "total_sessions": 0,
            "total_pageviews": 0,
            "total_clicks": 0,
            "avg_duration_sec": 0,
            "unregistered_count": 0,
            "registered_count": 0,
            "unique_visitors_count": 0,
        })
        tot = stat.get("total_sessions") or 1
        guest_pct = round((stat.get("unregistered_count", 0) / tot) * 100, 1) if tot > 0 else 0
        enriched_modules.append({
            **mod,
            **stat,
            "guest_percentage": guest_pct,
        })

    # Include any custom modules not in standard list
    for mod_id, stat in stats_map.items():
        if not any(m["id"] == mod_id for m in PLATFORM_MODULES):
            tot = stat.get("total_sessions") or 1
            enriched_modules.append({
                "id": mod_id,
                "name": mod_id.title() + " Module",
                "icon": "Layers",
                "desc": "Custom platform area",
                **stat,
                "guest_percentage": round((stat.get("unregistered_count", 0) / tot) * 100, 1) if tot > 0 else 0,
            })

    return {
        "days": days,
        "modules": enriched_modules,
    }


@router.get("/admin/analytics/hardware")
async def get_hardware_analytics(days: int = Query(60, ge=1, le=180), user: dict = Depends(require_role("admin", "superadmin", "college"))):
    """
    Hardware, device & environment distribution of visitors.
    """
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days)
    match = {"last_heartbeat": {"$gte": cutoff}}

    # OS Distribution
    os_pipeline = [
        {"$match": match},
        {"$group": {"_id": "$device.os", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    os_docs = await _db.visitor_sessions.aggregate(os_pipeline).to_list(10)
    total_os = sum(d["count"] for d in os_docs) or 1
    os_data = [{"label": d["_id"] or "Unknown", "count": d["count"], "pct": round(d["count"] / total_os * 100, 1)} for d in os_docs]

    # Browser Distribution
    br_pipeline = [
        {"$match": match},
        {"$group": {"_id": "$device.browser", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    br_docs = await _db.visitor_sessions.aggregate(br_pipeline).to_list(10)
    total_br = sum(d["count"] for d in br_docs) or 1
    br_data = [{"label": d["_id"] or "Unknown", "count": d["count"], "pct": round(d["count"] / total_br * 100, 1)} for d in br_docs]

    # Device Kind
    kind_pipeline = [
        {"$match": match},
        {"$group": {"_id": "$device.kind", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    kind_docs = await _db.visitor_sessions.aggregate(kind_pipeline).to_list(5)
    total_kind = sum(d["count"] for d in kind_docs) or 1
    kind_data = [{"label": (d["_id"] or "Unknown").title(), "count": d["count"], "pct": round(d["count"] / total_kind * 100, 1)} for d in kind_docs]

    # Screen Resolutions
    res_pipeline = [
        {"$match": {**match, "device.screen_resolution": {"$exists": True, "$ne": None}}},
        {"$group": {"_id": "$device.screen_resolution", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 8},
    ]
    res_docs = await _db.visitor_sessions.aggregate(res_pipeline).to_list(8)
    res_data = [{"resolution": d["_id"], "count": d["count"]} for d in res_docs if d["_id"]]

    # GPU Renderers
    gpu_pipeline = [
        {"$match": {**match, "device.gpu_renderer": nonempty()}},
        {"$group": {"_id": "$device.gpu_renderer", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 8},
    ]
    gpu_docs = await _db.visitor_sessions.aggregate(gpu_pipeline).to_list(8)
    gpu_data = [{"renderer": d["_id"], "count": d["count"]} for d in gpu_docs if d["_id"]]

    # CPU Cores Distribution
    cpu_pipeline = [
        {"$match": {**match, "device.cpu_cores": {"$exists": True, "$ne": None}}},
        {"$group": {"_id": "$device.cpu_cores", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]
    cpu_docs = await _db.visitor_sessions.aggregate(cpu_pipeline).to_list(10)
    cpu_data = [{"cores": f"{d['_id']} Cores", "count": d["count"]} for d in cpu_docs if d["_id"]]

    return {
        "os_distribution": os_data,
        "browser_distribution": br_data,
        "device_kinds": kind_data,
        "screen_resolutions": res_data,
        "gpu_renderers": gpu_data,
        "cpu_cores": cpu_data,
    }


@router.get("/admin/analytics/export")
async def export_visitors_csv(
    days: int = Query(30, ge=1, le=365),
    visitor_type: Optional[str] = Query("all"),
    user: dict = Depends(require_role("admin", "superadmin", "college"))
):
    """
    Download visitor telemetry data as CSV.
    """
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days)
    match: Dict[str, Any] = {"last_heartbeat": {"$gte": cutoff}}

    if visitor_type == "guest":
        match["is_registered"] = {"$ne": True}
    elif visitor_type == "registered":
        match["is_registered"] = True

    cursor = _db.visitor_sessions.find(match).sort("last_heartbeat", -1).limit(5000)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Session ID", "Visitor ID", "Alias / Name", "Email", "Registration Status",
        "IP Address", "Country", "City", "OS", "Browser", "Device Kind",
        "Screen Resolution", "CPU Cores", "RAM (GB)", "GPU Renderer",
        "Current Module", "Landing Page", "Duration (s)", "Pageviews", "Clicks",
        "Referrer", "UTM Source", "UTM Medium", "UTM Campaign", "Last Active"
    ])

    async for s in cursor:
        geo = s.get("geo", {})
        dev = s.get("device", {})
        utm = s.get("utm", {})
        last_act = s.get("last_heartbeat")
        if isinstance(last_act, datetime):
            last_act = last_act.isoformat()

        writer.writerow([
            s.get("session_id", ""),
            s.get("visitor_id", ""),
            s.get("alias", s.get("inferred_name", "Anonymous")),
            s.get("inferred_email", ""),
            "Registered" if s.get("is_registered") else "Guest (Unregistered)",
            s.get("ip", ""),
            geo.get("country", ""),
            geo.get("city", ""),
            dev.get("os", ""),
            dev.get("browser", ""),
            dev.get("kind", ""),
            dev.get("screen_resolution", ""),
            dev.get("cpu_cores", ""),
            dev.get("device_memory_gb", ""),
            dev.get("gpu_renderer", ""),
            s.get("current_module", ""),
            s.get("landing_page", ""),
            s.get("duration_seconds", 0),
            s.get("page_views_count", 1),
            s.get("clicks_count", 0),
            s.get("referrer", ""),
            utm.get("source", ""),
            utm.get("medium", ""),
            utm.get("campaign", ""),
            last_act or "",
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=visitors_export_{now.strftime('%Y%m%d_%H%M%S')}.csv"}
    )


@router.get("/admin/analytics/heatmap")
async def get_visitor_click_heatmap(
    module: Optional[str] = Query("all"),
    days: int = Query(30, ge=1, le=365),
    user: dict = Depends(require_role("admin", "superadmin", "college"))
):
    """
    Returns visual click heatmap density rankings and element interaction counts.
    Aggregates element clicks, click percentages, heat intensity, and target URL routes.
    """
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days)
    match: Dict[str, Any] = {"timestamp": {"$gte": cutoff}, "event_type": "click"}
    
    if module and module != "all":
        match["module"] = module
        
    pipeline = [
        {"$match": match},
        {"$group": {
            "_id": {"element_id": "$element_id", "element_text": "$element_text"},
            "click_count": {"$sum": 1},
            "last_clicked": {"$max": "$timestamp"},
            "sample_path": {"$first": "$path"}
        }},
        {"$sort": {"click_count": -1}},
        {"$limit": 30}
    ]
    
    docs = await _db.visitor_events.aggregate(pipeline).to_list(30)
    total_clicks = sum(d.get("click_count", 0) for d in docs) or 1

    elements = []
    if docs and len(docs) > 2:
        for idx, d in enumerate(docs):
            cnt = d.get("click_count", 0)
            share = round((cnt / total_clicks) * 100, 1)
            intensity = "hot" if idx < 3 else ("warm" if idx < 8 else "cool")
            elements.append({
                "rank": idx + 1,
                "element_id": d["_id"].get("element_id") or f"element_{idx}",
                "element_text": d["_id"].get("element_text") or "Card Component",
                "click_count": cnt,
                "click_share_pct": share,
                "intensity": intensity,
                "path": d.get("sample_path") or "",
                "last_clicked": d.get("last_clicked").isoformat() if isinstance(d.get("last_clicked"), datetime) else None
            })

    return {
        "module_filter": module,
        "timeframe_days": days,
        "total_clicks_analyzed": sum(e["click_count"] for e in elements),
        "hotspots": elements
    }


# ── Super Admin Real-Time Announcement Broadcast Center ───────────────────────
class BroadcastPushRequest(BaseModel):
    title: str
    message: str
    target_module: Optional[str] = "all"
    urgency: Optional[str] = "info"  # "info" | "urgent" | "winner"
    banner_url: Optional[str] = None
    duration_minutes: Optional[int] = 120

@router.post("/admin/broadcast/push")
async def push_announcement_broadcast(
    body: BroadcastPushRequest,
    user: dict = Depends(require_role("admin", "superadmin", "college"))
):
    """Super Admin endpoint to publish a real-time broadcast alert across web sessions."""
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=body.duration_minutes or 120)
    
    doc = {
        "title": body.title,
        "message": body.message,
        "target_module": body.target_module or "all",
        "urgency": body.urgency or "info",
        "banner_url": body.banner_url,
        "pushed_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
        "pushed_by": user.get("email") or "Super Admin",
        "is_active": True
    }
    
    # Deactivate previous broadcasts
    await _db.announcement_broadcasts.update_many({}, {"$set": {"is_active": False}})
    res = await _db.announcement_broadcasts.insert_one(doc)
    doc["_id"] = str(res.inserted_id)
    return {"status": "broadcast_active", "announcement": doc}


@router.get("/admin/broadcast/active")
async def get_active_announcement(module: Optional[str] = "all"):
    """Public / Client endpoint to fetch the active broadcast banner."""
    now_iso = datetime.now(timezone.utc).isoformat()
    doc = await _db.announcement_broadcasts.find_one({
        "is_active": True,
        "expires_at": {"$gt": now_iso}
    })
    
    if not doc:
        # Default active broadcast banner for HackWave 3.0
        return {
            "active": True,
            "announcement": {
                "title": "HackWave 3.0 Registration Update",
                "message": "₹17,50,000+ Total Prize Pool Live! WeHive 2 Business Visas & Germany Study Abroad Sponsorship active.",
                "urgency": "urgent",
                "target_module": "all",
                "cta_label": "Claim Ticket",
                "cta_url": "/echo/snist/register"
            }
        }
    doc["_id"] = str(doc["_id"])
    return {"active": True, "announcement": doc}


@router.post("/admin/broadcast/clear")
async def clear_active_announcement(user: dict = Depends(require_role("admin", "superadmin", "college"))):
    """Clears the active broadcast banner."""
    await _db.announcement_broadcasts.update_many({}, {"$set": {"is_active": False}})
    return {"status": "cleared"}
