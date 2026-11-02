"""
routers/promotions.py — Phase C: cross-portal promotional banners.

Endpoints:
  GET    /api/promotions/active        — public-ish (auth optional) list of
                                         active promotions filtered to the
                                         caller's role/portal.
  POST   /api/promotion-event          — public analytics beacon (impression / click), rate-limited
  POST   /api/promotions/ab/variant    — public: which A/B variant to show for this session
  GET    /api/admin/promotions         — admin only: list ALL.
  POST   /api/admin/promotions         — admin only: create.
  PATCH  /api/admin/promotions/{id}    — admin only: partial update.
  DELETE /api/admin/promotions/{id}    — admin only: delete.
  POST   /api/admin/promotions/{id}/duplicate   — PM5 copy with is_active=False
  POST   /api/admin/promotions/{id}/ab/settle   — PM3 manually pick/force the winner
  GET    /api/admin/promotions/{id}/analytics    — PM2 30-day trend
  GET    /api/admin/promotion-templates          — PM4 template library
  POST   /api/admin/promotion-templates          — PM4 save template
  POST   /api/admin/promotions/{id}/save-template — PM4 save current promo as template
  DELETE /api/admin/promotion-templates/{id}     — PM4 delete template

Schema (promotions collection):
  {
    _id, title, body, cta_label, cta_url,
    badge: str | None,           # "NEW", "BETA", "DEAL", etc.
    tone: "violet" | "blue" | "indigo" | "teal" | "amber" | "rose" | "emerald",
    audience: ["student","alumni","college","mentor","super_admin"] | ["all"],
    placement: "dashboard" | "inline" | "modal",       # for future
    dismissible: bool (default True),
    is_active: bool,
    starts_at: datetime | None,    # show only after this
    ends_at:   datetime | None,    # hide after this
    display_order: int,
    image_url: str | None,         # optional small base64 image
    recurrence: "none" | "daily" | "weekly" | "monthly",   # PM6
    recurrence_parent_id: str | None,                     # PM6
    ab_experiment: {a, b, impressions, clicks, winner, settled_at} | None,  # PM3
    analytics: {impressions, clicks},                        # PM2
    created_at, updated_at,
  }
"""
from __future__ import annotations
import random
from datetime import datetime, timezone, timedelta
from typing import List, Literal, Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, validator

from core.db import db
from core.deps import get_current_user, ensure_admin
from core.rate_limiter import SlidingWindowRateLimiter


router = APIRouter(prefix="/api", tags=["promotions"])

Audience = Literal["student", "alumni", "college", "mentor", "super_admin", "all"]
Tone = Literal["violet", "blue", "indigo", "teal", "amber", "rose", "emerald"]
Recurrence = Literal["none", "daily", "weekly", "monthly"]

# PM2 — public beacon: tiny fire-and-forget POSTs, generous but capped per IP
_promo_event_rate_limiter = SlidingWindowRateLimiter(max_requests=300, window_seconds=60)

# PM3 — A/B experiment stops being randomized once this many total impressions
# are collected (also auto-settled by the daily agent after 7 days).
_AB_MIN_IMPRESSIONS = 1000
_AB_SESSION_COOKIE = "promo_ab"
_AB_SESSION_TTL_DAYS = 30


def _require_admin(user: dict):
    ensure_admin(user)


def _serialize(doc: dict, with_analytics: bool = False) -> dict:
    ab = doc.get("ab_experiment")
    out = {
        "id":            str(doc["_id"]),
        "title":         doc.get("title", ""),
        "body":          doc.get("body", ""),
        "cta_label":     doc.get("cta_label") or None,
        "cta_url":       doc.get("cta_url") or None,
        "badge":         doc.get("badge") or None,
        "tone":          doc.get("tone", "violet"),
        "audience":      doc.get("audience", ["all"]),
        "placement":     doc.get("placement", "dashboard"),
        "dismissible":   bool(doc.get("dismissible", True)),
        "is_active":     bool(doc.get("is_active", True)),
        "starts_at":     doc.get("starts_at").isoformat() if doc.get("starts_at") else None,
        "ends_at":       doc.get("ends_at").isoformat() if doc.get("ends_at") else None,
        "display_order": int(doc.get("display_order", 100)),
        "image_url":     doc.get("image_url") or None,
        "recurrence":    doc.get("recurrence") or "none",
        "recurrence_parent_id": doc.get("recurrence_parent_id") or None,
        "ab_experiment": None,
        "created_at":    doc.get("created_at").isoformat() if doc.get("created_at") else None,
        "updated_at":    doc.get("updated_at").isoformat() if doc.get("updated_at") else None,
    }
    if ab:
        out["ab_experiment"] = {
            "variant_a": {
                "title": ab.get("variant_a", {}).get("title", ""),
                "body": ab.get("variant_a", {}).get("body", ""),
                "cta_label": ab.get("variant_a", {}).get("cta_label") or None,
                "cta_url": ab.get("variant_a", {}).get("cta_url") or None,
                "badge": ab.get("variant_a", {}).get("badge") or None,
                "tone": ab.get("variant_a", {}).get("tone", "violet"),
            },
            "variant_b": {
                "title": ab.get("variant_b", {}).get("title", ""),
                "body": ab.get("variant_b", {}).get("body", ""),
                "cta_label": ab.get("variant_b", {}).get("cta_label") or None,
                "cta_url": ab.get("variant_b", {}).get("cta_url") or None,
                "badge": ab.get("variant_b", {}).get("badge") or None,
                "tone": ab.get("variant_b", {}).get("tone", "violet"),
            },
            "impressions": {"a": int(ab.get("impressions", {}).get("a", 0)),
                            "b": int(ab.get("impressions", {}).get("b", 0))},
            "clicks":      {"a": int(ab.get("clicks", {}).get("a", 0)),
                            "b": int(ab.get("clicks", {}).get("b", 0))},
            "started_at":  ab.get("started_at").isoformat() if ab.get("started_at") else None,
            "winner":      ab.get("winner"),
            "settled_at":  ab.get("settled_at").isoformat() if ab.get("settled_at") else None,
        }
    if with_analytics:
        a = doc.get("analytics") or {}
        out["analytics"] = {
            "impressions": int(a.get("impressions", 0)),
            "clicks": int(a.get("clicks", 0)),
        }
    return out


def _promo_view(doc: dict, variant: Optional[str] = None) -> dict:
    """Public-facing shape for a promo. When an open A/B experiment is present
    and `variant` is 'a' or 'b', that variant's copy overrides the base fields
    so variant B can differ in title/body/CTA/badge/tone. Once the experiment
    is settled, the base fields already hold the winner, so no override is needed."""
    out = _serialize(doc)
    ab = doc.get("ab_experiment")
    if ab and variant in ("a", "b") and not ab.get("settled_at"):
        v = ab.get(f"variant_{variant}") or {}
        if v.get("title"):
            out["title"] = v["title"]
        out["body"] = v.get("body", out.get("body", ""))
        out["cta_label"] = v.get("cta_label") or out.get("cta_label")
        out["cta_url"] = v.get("cta_url") or out.get("cta_url")
        out["badge"] = v.get("badge") or out.get("badge")
        out["tone"] = v.get("tone") or out.get("tone")
    return out


# ── Pydantic models ───────────────────────────────────────────────────
class AbVariant(BaseModel):
    title: str = Field("", max_length=140)
    body: str = Field("", max_length=500)
    cta_label: Optional[str] = Field(None, max_length=40)
    cta_url: Optional[str] = Field(None, max_length=500)
    badge: Optional[str] = Field(None, max_length=12)
    tone: Tone = "violet"


class AbExperimentIn(BaseModel):
    variant_a: AbVariant
    variant_b: AbVariant
    winner: Optional[Literal["a", "b"]] = None


class PromoIn(BaseModel):
    title: str = Field(..., min_length=2, max_length=140)
    body:  str = Field("", max_length=500)
    cta_label: Optional[str] = Field(None, max_length=40)
    cta_url:   Optional[str] = Field(None, max_length=500)
    badge:     Optional[str] = Field(None, max_length=12)
    tone: Tone = "violet"
    audience: List[Audience] = Field(default_factory=lambda: ["all"])
    placement: Literal["dashboard", "inline", "modal"] = "dashboard"
    dismissible: bool = True
    is_active: bool = True
    starts_at: Optional[datetime] = None
    ends_at:   Optional[datetime] = None
    display_order: int = 100
    image_url: Optional[str] = Field(None, max_length=2_700_000)  # ~2 MB base64
    recurrence: Recurrence = "none"
    ab_experiment: Optional[AbExperimentIn] = None

    @validator("audience")
    def _dedup_audience(cls, v):
        return list(dict.fromkeys(v)) or ["all"]


class PromoPatch(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    cta_label: Optional[str] = None
    cta_url: Optional[str] = None
    badge: Optional[str] = None
    tone: Optional[Tone] = None
    audience: Optional[List[Audience]] = None
    placement: Optional[Literal["dashboard", "inline", "modal"]] = None
    dismissible: Optional[bool] = None
    is_active: Optional[bool] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    display_order: Optional[int] = None
    image_url: Optional[str] = Field(None, max_length=2_700_000)
    recurrence: Optional[Recurrence] = None
    ab_experiment: Optional[AbExperimentIn] = None

    @validator("audience")
    def _dedup_audience(cls, v):
        return list(dict.fromkeys(v)) or ["all"]


class PromoEventIn(BaseModel):
    promo_id: str
    event: Literal["impression", "click"]
    variant: Optional[Literal["a", "b"]] = None


class TemplateIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)


class SaveTemplateIn(BaseModel):
    name: Optional[str] = Field(None, max_length=80)


def _resolve_id(raw: str) -> ObjectId:
    try:
        return ObjectId(raw)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Invalid id")


def _ab_doc(body: AbExperimentIn) -> dict:
    now = datetime.now(timezone.utc)
    return {
        "variant_a": body.variant_a.dict(),
        "variant_b": body.variant_b.dict(),
        "impressions": {"a": 0, "b": 0},
        "clicks": {"a": 0, "b": 0},
        "started_at": now,
        "winner": body.winner,
        "settled_at": now if body.winner else None,
    }


# ── Public-ish: list active promotions for the caller's portal ──────────
@router.get("/promotions/active")
async def list_active_for_me(user: dict = Depends(get_current_user)):
    """
    Returns the promotions visible to the current user, filtered by:
      - is_active = True
      - audience contains user.role OR "all"
      - now() between starts_at (if set) and ends_at (if set)
    Sorted by display_order ASC.
    """
    now = datetime.now(timezone.utc)
    role = (user.get("role") or "student").lower()
    # Normalize legacy role spellings
    role_map = {"superadmin": "super_admin", "admin": "super_admin"}
    role = role_map.get(role, role)

    q: dict = {
        "is_active": True,
        "$and": [
            {"$or": [{"starts_at": None}, {"starts_at": {"$lte": now}}]},
            {"$or": [{"ends_at": None}, {"ends_at": {"$gte": now}}]},
            {"$or": [{"audience": "all"}, {"audience": role}]},
        ],
    }
    cur = db.promotions.find(q).sort("display_order", 1)
    items = [_promo_view(d, variant=None) async for d in cur]
    return {"items": items, "role": role, "as_of": now.isoformat()}


# ── PM3: public A/B variant picker (per-session, cookie-sticky) ─────────
@router.post("/promotions/ab/variant")
async def ab_variant(promo_id: str, request: Request, response: Response):
    """Returns which variant this session should see for the given promo.
    A new session gets a random pick; it's written to a sticky `promo_ab`
    cookie so the same visitor keeps the variant across page loads. Clicks
    are attributed to that variant via /promotion-event?variant=..."""
    try:
        oid = ObjectId(promo_id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Invalid id")
    doc = await db.promotions.find_one({"_id": oid, "is_active": True},
                                      {"ab_experiment": 1})
    if not doc:
        return {"variant": "a"}
    ab = doc.get("ab_experiment")
    if not ab:
        return {"variant": None}
    if ab.get("winner"):
        return {"variant": ab["winner"]}

    stored: dict = {}
    for k, v in (request.cookies or {}).items():
        stored[k.strip()] = v.strip()
    existing = stored.get(promo_id)
    if existing in ("a", "b"):
        return {"variant": existing}

    pick = random.choice(["a", "b"])
    await db.promotion_ab_sessions.insert_one({
        "promo_id": promo_id,
        "client_key": f"{request.client.host if request.client else 'unknown'}:{pick}",
        "variant": pick,
        "created_at": datetime.now(timezone.utc),
    })
    exp = datetime.now(timezone.utc) + timedelta(days=_AB_SESSION_TTL_DAYS)
    response.set_cookie(
        _AB_SESSION_COOKIE,
        f"{promo_id}={pick}",
        max_age=_AB_SESSION_TTL_DAYS * 86400,
        expires=exp,
        httponly=False,
        samesite="Lax",
    )
    return {"variant": pick}


# ── PM2: public analytics beacon ───────────────────────────────────────
@router.post("/promotion-event")
async def promotion_event(body: PromoEventIn, request: Request):
    """Rate-limited per IP. Fire-and-forget: unknown promos return 200 too."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    limited, _ = _promo_event_rate_limiter.is_rate_limited(client_ip)
    if limited:
        raise HTTPException(429, "Rate limit exceeded")

    try:
        oid = ObjectId(body.promo_id)
    except (InvalidId, TypeError):
        return {"ok": True}
    doc = await db.promotions.find_one({"_id": oid}, {"title": 1, "is_active": 1, "ab_experiment": 1})
    if not doc:
        return {"ok": True}

    counter = "impressions" if body.event == "impression" else "clicks"
    inc = {"analytics.%s" % counter: 1}
    # PM3: attribute to the variant when provided
    if body.variant in ("a", "b") and doc.get("ab_experiment"):
        inc["ab_experiment.%s.%s" % (counter, body.variant)] = 1
    await db.promotions.update_one({"_id": oid}, {"$inc": inc})

    day = datetime.now(timezone.utc).date().isoformat()
    await db.promotion_event_daily.update_one(
        {"promo_id": oid, "day": day},
        {"$setOnInsert": {"promo_id": oid, "day": day, "impressions": 0, "clicks": 0},
         "$inc": {counter: 1}},
        upsert=True,
    )
    return {"ok": True}


# ── Public: popup announcements (modal promos + upcoming events) ─────────
@router.get("/promotions/popup")
async def get_popup_announcements():
    """
    Returns active promotions with placement='modal' plus upcoming published
    Echo showcases. No auth required — works for logged-out visitors too.
    Respects the 'popup_announcements' feature flag in platform_controls.
    """
    now = datetime.now(timezone.utc)

    # Check feature flag
    controls = await db.platform_controls.find_one({"_id": "singleton"})
    flags = controls.get("feature_flags", []) if controls else []
    popup_flag = next((f for f in flags if f.get("key") == "popup_announcements"), None)
    if popup_flag and popup_flag.get("value") is False:
        return {"promos": [], "events": []}

    # 1. Active modal promotions
    promo_q: dict = {
        "is_active": True,
        "placement": "modal",
        "$and": [
            {"$or": [{"starts_at": None}, {"starts_at": {"$lte": now}}]},
            {"$or": [{"ends_at": None}, {"ends_at": {"$gte": now}}]},
        ],
    }
    promo_cur = db.promotions.find(promo_q).sort("display_order", 1).limit(3)
    promos = [_promo_view(d) async for d in promo_cur]

    # 2. Upcoming published Echo shows only (date >= today, sorted ascending)
    today = datetime.now(timezone.utc).date()
    event_cur = db.echo_showcases.find(
        {"status": "published"},
        {"title": 1, "slug": 1, "date": 1, "time": 1, "venue": 1, "hero_image_url": 1, "subtitle": 1}
    ).sort("date", 1).limit(20)
    events = []
    async for d in event_cur:
        raw = (d.get("date") or "").strip()
        if not raw:
            continue
        ev_date = None
        for fmt in ("%B %d, %Y", "%b %d, %Y", "%Y-%m-%d", "%d %B %Y", "%d/%m/%Y", "%m/%d/%Y"):
            try:
                ev_date = datetime.strptime(raw, fmt).date()
                break
            except ValueError:
                continue
        if ev_date is None or ev_date < today:
            continue
        events.append({
            "id": str(d["_id"]),
            "title": d.get("title", ""),
            "slug": d.get("slug", ""),
            "date": d.get("date", ""),
            "time": d.get("time", ""),
            "venue": d.get("venue", ""),
            "hero_image_url": d.get("hero_image_url"),
            "subtitle": d.get("subtitle", ""),
        })
        if len(events) >= 5:
            break

    return {"promos": promos, "events": events}


# ── Admin CRUD ───────────────────────────────────────────────────────────
@router.get("/admin/promotions")
async def list_all(user: dict = Depends(get_current_user)):
    _require_admin(user)
    cur = db.promotions.find({}).sort("display_order", 1)
    items = [_serialize(d, with_analytics=True) async for d in cur]
    # PM7: server "now" so the UI can compute "Expiring Soon" (<48h) reliably
    return {"items": items, "now": datetime.now(timezone.utc).isoformat()}


@router.post("/admin/promotions")
async def create_promo(body: PromoIn, user: dict = Depends(get_current_user)):
    _require_admin(user)
    now = datetime.now(timezone.utc)
    doc = body.dict()
    ab = doc.pop("ab_experiment", None)
    rec = doc.get("recurrence") or "none"
    doc.update({
        "created_at": now, "updated_at": now,
        "recurrence": rec,
        "recurrence_parent_id": None,
        "analytics": {"impressions": 0, "clicks": 0},
    })
    if ab:
        doc["ab_experiment"] = _ab_doc(ab)
    else:
        doc["ab_experiment"] = None
    res = await db.promotions.insert_one(doc)
    saved = await db.promotions.find_one({"_id": res.inserted_id})
    return _serialize(saved or doc, with_analytics=True)


@router.patch("/admin/promotions/{promo_id}")
async def update_promo(promo_id: str, body: PromoPatch, user: dict = Depends(get_current_user)):
    _require_admin(user)
    oid = _resolve_id(promo_id)
    payload = {k: v for k, v in body.dict(exclude_unset=True).items()}
    if not payload:
        existing = await db.promotions.find_one({"_id": oid})
        if not existing:
            raise HTTPException(404, "Promotion not found")
        return _serialize(existing)
    ab = payload.pop("ab_experiment", None)
    if ab is not None:
        payload["ab_experiment"] = _ab_doc(ab)  # winner → settled immediately
    payload["updated_at"] = datetime.now(timezone.utc)
    res = await db.promotions.find_one_and_update(
        {"_id": oid}, {"$set": payload}, return_document=True,
    )
    if not res:
        raise HTTPException(404, "Promotion not found")
    return _serialize(res, with_analytics=True)


@router.delete("/admin/promotions/{promo_id}")
async def delete_promo(promo_id: str, user: dict = Depends(get_current_user)):
    _require_admin(user)
    oid = _resolve_id(promo_id)
    res = await db.promotions.delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Promotion not found")
    await db.promotion_event_daily.delete_many({"promo_id": oid})
    await db.promotion_ab_sessions.delete_many({"promo_id": promo_id})
    return {"ok": True}


# ── PM5: duplicate ──────────────────────────────────────────────────────
@router.post("/admin/promotions/{promo_id}/duplicate")
async def duplicate_promo(promo_id: str, user: dict = Depends(get_current_user)):
    """Copy every field of the promo; the copy starts inactive with a
    "Copy of" title so an admin can review + schedule it without touching
    the original."""
    _require_admin(user)
    oid = _resolve_id(promo_id)
    src = await db.promotions.find_one({"_id": oid})
    if not src:
        raise HTTPException(404, "Promotion not found")
    now = datetime.now(timezone.utc)
    doc = {
        k: v for k, v in src.items() if k not in ("_id", "created_at", "updated_at",
                                                  "analytics", "ab_experiment")
    }
    doc["title"] = ("Copy of " + (src.get("title") or "")).strip()[:140] or "Copy"
    doc["is_active"] = False
    doc["starts_at"] = None
    doc["ends_at"] = None
    doc["recurrence_parent_id"] = None
    doc["analytics"] = {"impressions": 0, "clicks": 0}
    doc["created_at"] = now
    doc["updated_at"] = now
    res = await db.promotions.insert_one(doc)
    saved = await db.promotions.find_one({"_id": res.inserted_id})
    return _serialize(saved or doc, with_analytics=True)


# ── PM3: settle an A/B experiment ───────────────────────────────────────
def _pick_winner(ab: dict) -> str:
    def ctr(side: str) -> float:
        imp = int(ab.get("impressions", {}).get(side, 0) or 0)
        clk = int(ab.get("clicks", {}).get(side, 0) or 0)
        return clk / imp if imp else 0.0
    return "b" if ctr("b") > ctr("a") else "a"


@router.post("/admin/promotions/{promo_id}/ab/settle")
async def settle_ab(promo_id: str, user: dict = Depends(get_current_user)):
    """Force-settle an open experiment by CTR and apply the winning variant's
    copy to the base promo fields so it continues showing winner-only."""
    _require_admin(user)
    oid = _resolve_id(promo_id)
    doc = await db.promotions.find_one({"_id": oid})
    if not doc:
        raise HTTPException(404, "Promotion not found")
    ab = doc.get("ab_experiment")
    if not ab:
        raise HTTPException(400, "This promotion has no A/B experiment")
    if ab.get("settled_at"):
        return {"ok": True, "winner": ab.get("winner"), "already_settled": True}
    winner = _pick_winner(ab)
    now = datetime.now(timezone.utc)
    v = ab.get(f"variant_{winner}", {})
    upd = {"updated_at": now, "ab_experiment.winner": winner, "ab_experiment.settled_at": now}
    if v.get("title"):
        upd["title"] = v["title"]
    if v.get("body") is not None:
        upd["body"] = v.get("body", "")
    upd["cta_label"] = v.get("cta_label") or doc.get("cta_label")
    upd["cta_url"] = v.get("cta_url") or doc.get("cta_url")
    upd["badge"] = v.get("badge") or doc.get("badge")
    upd["tone"] = v.get("tone") or doc.get("tone")
    await db.promotions.update_one({"_id": oid}, {"$set": upd})
    return {"ok": True, "winner": winner}


# ── PM2: per-promo 30-day trend ─────────────────────────────────────────
@router.get("/admin/promotions/{promo_id}/analytics")
async def promo_analytics(promo_id: str, user: dict = Depends(get_current_user)):
    _require_admin(user)
    try:
        oid = ObjectId(promo_id)
    except (InvalidId, TypeError):
        raise HTTPException(400, "Invalid promo id")
    since = (datetime.now(timezone.utc).date() - timedelta(days=29)).isoformat()
    cur = db.promotion_event_daily.find(
        {"promo_id": oid, "day": {"$gte": since}},
    ).sort("day", 1)
    series = [{"day": d.get("day"), "impressions": int(d.get("impressions", 0)),
               "clicks": int(d.get("clicks", 0))} async for d in cur]
    doc = await db.promotions.find_one({"_id": oid}, {"analytics": 1, "ab_experiment": 1})
    a = (doc or {}).get("analytics") or {}
    ab = (doc or {}).get("ab_experiment")
    out = {"series": series, "impressions": int(a.get("impressions", 0)),
           "clicks": int(a.get("clicks", 0))}
    if ab:
        out["ab"] = {
            "impressions": {"a": int(ab.get("impressions", {}).get("a", 0)),
                            "b": int(ab.get("impressions", {}).get("b", 0))},
            "clicks": {"a": int(ab.get("clicks", {}).get("a", 0)),
                       "b": int(ab.get("clicks", {}).get("b", 0))},
            "winner": ab.get("winner"),
            "settled_at": ab.get("settled_at").isoformat() if ab.get("settled_at") else None,
        }
    return out


# ── PM4: template library ────────────────────────────────────────────────
_TEMPLATE_FIELDS = ["title", "body", "cta_label", "cta_url", "badge", "tone",
                    "audience", "placement", "dismissible", "display_order"]


def _template_doc(t: dict) -> dict:
    return {
        "id": str(t["_id"]),
        "name": t.get("name", "Template"),
        "payload": {k: t.get(k) for k in _TEMPLATE_FIELDS},
        "created_at": t.get("created_at").isoformat() if t.get("created_at") else None,
    }


@router.get("/admin/promotion-templates")
async def list_templates(user: dict = Depends(get_current_user)):
    _require_admin(user)
    cur = db.promotion_templates.find({}).sort("created_at", -1)
    items = [_template_doc(d) async for d in cur]
    return {"items": items, "total": len(items)}


@router.post("/admin/promotion-templates")
async def create_template(body: TemplateIn, user: dict = Depends(get_current_user)):
    """Create an empty named template shell (payload filled in via UI presets)."""
    _require_admin(user)
    now = datetime.now(timezone.utc)
    res = await db.promotion_templates.insert_one({
        "name": body.name.strip(), "payload": {}, "created_at": now,
    })
    saved = await db.promotion_templates.find_one({"_id": res.inserted_id})
    return _template_doc(saved or {"_id": res.inserted_id, "name": body.name, "payload": {}, "created_at": now})


@router.post("/admin/promotions/{promo_id}/save-template")
async def save_as_template(promo_id: str, body: SaveTemplateIn, user: dict = Depends(get_current_user)):
    """Snapshot the current promo into the template library."""
    _require_admin(user)
    oid = _resolve_id(promo_id)
    doc = await db.promotions.find_one({"_id": oid})
    if not doc:
        raise HTTPException(404, "Promotion not found")
    name = (body.name or f"{doc.get('title') or 'Promo'} — template").strip()[:80]
    now = datetime.now(timezone.utc)
    res = await db.promotion_templates.insert_one({
        "name": name,
        "payload": {k: doc.get(k) for k in _TEMPLATE_FIELDS},
        "source_promo_id": str(oid),
        "created_at": now,
    })
    saved = await db.promotion_templates.find_one({"_id": res.inserted_id})
    return _template_doc(saved or {"_id": res.inserted_id, "name": name, "payload": {}, "created_at": now})


@router.delete("/admin/promotion-templates/{template_id}")
async def delete_template(template_id: str, user: dict = Depends(get_current_user)):
    _require_admin(user)
    try:
        oid = ObjectId(template_id)
    except (InvalidId, TypeError):
        raise HTTPException(400, "Invalid template id")
    res = await db.promotion_templates.delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Template not found")
    return {"ok": True}


__all__ = ["router", "_pick_winner", "_AB_MIN_IMPRESSIONS", "_promo_view"]
