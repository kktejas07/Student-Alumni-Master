"""
routers/partners.py — Collaboration Partners management.

Public endpoints:
  GET    /api/landing/partners        — active partners ordered by tier rank, then display_order
  POST   /api/partner-event           — public analytics beacon (impression / click), rate-limited

Admin endpoints (require super_admin / admin role):
  GET    /api/admin/partners          — list ALL (incl. inactive), with analytics counters
  POST   /api/admin/partners          — create
  PATCH  /api/admin/partners/{id}     — update (partial)
  DELETE /api/admin/partners/{id}     — hard delete
  POST   /api/admin/partners/reorder  — bulk reorder via list of ids
  POST   /api/admin/partners/import/preview — CSV parse + duplicate detection (no writes)
  POST   /api/admin/partners/import/commit  — insert parsed rows; external logos → base64

Logos are stored inline as base64 data URIs (consistent with the rest of the
project). Max payload: 2 MB per logo.
"""
from __future__ import annotations

import base64
import csv
import io
from datetime import datetime, timezone, date
from typing import Optional, Literal

import httpx
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field, field_validator

from core.db import db
from core.deps import get_current_user, ensure_admin
from core.rate_limiter import SlidingWindowRateLimiter


router = APIRouter(prefix="/api", tags=["partners"])

# Cap base64-encoded logo size at ~2.7MB (≈ 2MB binary after base64 overhead)
MAX_LOGO_LEN = 2_800_000

PartnerCategory = Literal["college", "company", "sponsor"]
PartnerTier = Literal["gold", "silver", "bronze", "standard"]

# Public analytics beacon: generous but capped — these are tiny telemetry POSTs.
_event_rate_limiter = SlidingWindowRateLimiter(max_requests=300, window_seconds=60)

_TIER_RANK = {"gold": 0, "silver": 1, "bronze": 2, "standard": 3}

# Accept a few spellings from CSV / admin UI, normalize to PartnerCategory
_CATEGORY_ALIASES = {
    "college": "college", "academic": "college", "university": "college",
    "company": "company", "collaboration": "company", "collaborator": "company",
    "sponsor": "sponsor",
}


# ───────────────────────── Pydantic models ────────────────────────────
class PartnerIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=140)
    category: PartnerCategory
    logo_url: str = Field(..., description="base64 data URI for color logo")
    logo_white_url: Optional[str] = Field(default=None, description="optional white/inverted variant")
    website_url: Optional[str] = Field(default=None, max_length=500)
    tier: PartnerTier = "standard"
    contract_start: Optional[date] = None
    contract_end: Optional[date] = None
    display_order: int = Field(default=100, ge=0, le=10_000)
    is_active: bool = True

    @field_validator("logo_url", "logo_white_url")
    @classmethod
    def _check_logo_size(cls, v):
        if v and len(v) > MAX_LOGO_LEN:
            raise ValueError("Logo too large (max ~2MB binary)")
        return v

    @field_validator("tier")
    @classmethod
    def _norm_tier(cls, v):
        v = (v or "standard").lower()
        return v if v in _TIER_RANK else "standard"

    @field_validator("category")
    @classmethod
    def _norm_category(cls, v):
        return _CATEGORY_ALIASES.get((v or "").strip().lower(), "company")


class PartnerUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=140)
    category: Optional[PartnerCategory] = None
    logo_url: Optional[str] = None
    logo_white_url: Optional[str] = None
    website_url: Optional[str] = None
    tier: Optional[PartnerTier] = None
    contract_start: Optional[date] = None
    contract_end: Optional[date] = None
    display_order: Optional[int] = Field(default=None, ge=0, le=10_000)
    is_active: Optional[bool] = None

    @field_validator("logo_url", "logo_white_url")
    @classmethod
    def _check_logo_size(cls, v):
        if v is not None and len(v) > MAX_LOGO_LEN:
            raise ValueError("Logo too large (max ~2MB binary)")
        return v


class ReorderIn(BaseModel):
    ordered_ids: list[str]


class PartnerEventIn(BaseModel):
    partner_id: str
    event: Literal["impression", "click"]


# ─────────────── CSV import models (PT7) ─────────────────────────────
class ImportPreviewIn(BaseModel):
    csv_text: str = Field(..., max_length=500_000)


class ImportRowIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=140)
    category: Optional[str] = "company"
    website_url: Optional[str] = None
    tier: Optional[str] = "standard"
    logo_url: Optional[str] = None


class ImportCommitIn(BaseModel):
    rows: list[ImportRowIn]
    skip_duplicates: bool = True


# ────────────────────────── Helpers ─────────────────────────────────
def _serialize(doc: dict, with_analytics: bool = False) -> dict:
    if not doc:
        return doc
    out = {
        "id": str(doc["_id"]),
        "name": doc.get("name", ""),
        "category": doc.get("category", "company"),
        "logo_url": doc.get("logo_url", ""),
        "logo_white_url": doc.get("logo_white_url"),
        "website_url": doc.get("website_url") or None,
        "tier": doc.get("tier") or "standard",
        "contract_start": doc.get("contract_start").isoformat() if doc.get("contract_start") else None,
        "contract_end": doc.get("contract_end").isoformat() if doc.get("contract_end") else None,
        "display_order": doc.get("display_order", 100),
        "is_active": bool(doc.get("is_active", True)),
        "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
        "updated_at": doc.get("updated_at").isoformat() if doc.get("updated_at") else None,
    }
    if with_analytics:
        a = doc.get("analytics") or {}
        out["analytics"] = {
            "impressions": int(a.get("impressions", 0)),
            "clicks": int(a.get("clicks", 0)),
        }
    return out


def _require_admin(user: dict):
    ensure_admin(user)


async def _logo_url_to_data_uri(url: str) -> Optional[str]:
    """PT7: download an external logo and return a base64 data URI.
    Data URIs pass through unchanged; oversized / failed downloads return None."""
    url = (url or "").strip()
    if not url:
        return None
    if url.startswith("data:"):
        return url if len(url) <= MAX_LOGO_LEN else None
    if not url.lower().startswith(("http://", "https://")):
        return None
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            r = await client.get(url)
            r.raise_for_status()
            content = r.content
        if not content:
            return None
        ct = (r.headers.get("content-type") or "image/png").split(";")[0].strip()
        if not ct.startswith("image/"):
            ct = "image/png"
        b64 = base64.b64encode(content).decode("ascii")
        if len(b64) > MAX_LOGO_LEN:
            return None
        return f"data:{ct};base64,{b64}"
    except Exception:
        return None


def _parse_import_csv(text: str) -> list[dict]:
    """Parse CSV with header: name,category,website_url,tier,logo_url[,logo_white_url].
    Returns clean row dicts; malformed rows carry an `error` note."""
    reader = csv.DictReader(io.StringIO(text or ""))
    rows: list[dict] = []
    for i, raw in enumerate(reader, start=2):  # line 1 is the header
        name = (raw.get("name") or "").strip()
        if not name:
            continue
        cat = _CATEGORY_ALIASES.get((raw.get("category") or "company").strip().lower(), "company")
        tier = (raw.get("tier") or "standard").strip().lower()
        if tier not in _TIER_RANK:
            tier = "standard"
        rows.append({
            "line": i,
            "name": name,
            "category": cat,
            "website_url": (raw.get("website_url") or "").strip() or None,
            "tier": tier,
            "logo_url": (raw.get("logo_url") or "").strip() or None,
            "logo_white_url": (raw.get("logo_white_url") or "").strip() or None,
        })
    return rows


# ────────────────────────── Public endpoints ────────────────────────
@router.get("/landing/partners")
async def list_active_partners(
    category: Optional[PartnerCategory] = Query(default=None),
):
    """Public — used by the landing page Sponsored Collaboration Partners strip
    and the dashboard footer sponsor row. Returns ONLY active partners ordered
    by tier rank (gold first) then display_order ASC. Gold partners render larger
    in the public UI (see SponsorStrip)."""
    q: dict = {"is_active": True}
    if category:
        q["category"] = category
    cursor = db.collaboration_partners.find(q)
    items = []
    async for d in cursor:
        items.append((d.get("tier") or "standard", int(d.get("display_order", 100)), _serialize(d)))
    items.sort(key=lambda t: (_TIER_RANK.get(t[0], 3), t[1]))
    ordered = [t[2] for t in items]
    return {"items": ordered, "total": len(ordered)}


@router.post("/partner-event")
async def partner_event(body: PartnerEventIn, request: Request):
    """PT5 — public analytics beacon. Rate-limited per IP. Fire-and-forget from
    the client: returns 200 even for unknown partners (avoids info leaks,
    clients don't need the answer)."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    limited, _ = _event_rate_limiter.is_rate_limited(client_ip)
    if limited:
        raise HTTPException(429, "Rate limit exceeded")

    try:
        oid = ObjectId(body.partner_id)
    except Exception:
        return {"ok": True}

    doc = await db.collaboration_partners.find_one({"_id": oid}, {"name": 1, "is_active": 1})
    if not doc:
        return {"ok": True}

    field = "impressions" if body.event == "impression" else "clicks"
    await db.collaboration_partners.update_one(
        {"_id": oid}, {"$inc": {f"analytics.{field}": 1}},
    )
    # Daily bucket for the trend chart (compacted by the nightly agent)
    day = datetime.now(timezone.utc).date().isoformat()
    await db.partner_event_daily.update_one(
        {"partner_id": oid, "day": day},
        {"$inc": {field: 1}},
        upsert=True,
    )
    return {"ok": True}


# ────────────────────────── Admin endpoints ─────────────────────────
@router.get("/admin/partners")
async def admin_list_partners(user: dict = Depends(get_current_user)):
    _require_admin(user)
    cursor = db.collaboration_partners.find({}).sort([("display_order", 1), ("created_at", 1)])
    items = [_serialize(d, with_analytics=True) async for d in cursor]
    return {"items": items, "total": len(items)}


@router.get("/admin/partners/{partner_id}/analytics")
async def admin_partner_analytics(partner_id: str, user: dict = Depends(get_current_user)):
    """PT5 — per-partner 30-day daily impressions/clicks for the trend bar."""
    _require_admin(user)
    try:
        oid = ObjectId(partner_id)
    except Exception:
        raise HTTPException(400, "Invalid partner id")
    since = datetime.now(timezone.utc).date()
    cursor = db.partner_event_daily.find(
        {"partner_id": oid, "day": {"$gte": str(since)}},
    ).sort("day", 1)
    series = [{"day": d.get("day"), "impressions": int(d.get("impressions", 0)),
               "clicks": int(d.get("clicks", 0))} async for d in cursor]
    doc = await db.collaboration_partners.find_one({"_id": oid}, {"analytics": 1})
    a = (doc or {}).get("analytics") or {}
    return {"series": series, "impressions": int(a.get("impressions", 0)), "clicks": int(a.get("clicks", 0))}


@router.post("/admin/partners")
async def admin_create_partner(
    body: PartnerIn,
    user: dict = Depends(get_current_user),
):
    _require_admin(user)
    now = datetime.now(timezone.utc)
    doc = body.model_dump()
    doc.update({"created_at": now, "updated_at": now,
                "analytics": {"impressions": 0, "clicks": 0}})
    res = await db.collaboration_partners.insert_one(doc)
    saved = await db.collaboration_partners.find_one({"_id": res.inserted_id})
    return _serialize(saved, with_analytics=True)


@router.patch("/admin/partners/{partner_id}")
async def admin_update_partner(
    partner_id: str,
    body: PartnerUpdate,
    user: dict = Depends(get_current_user),
):
    _require_admin(user)
    try:
        oid = ObjectId(partner_id)
    except Exception:
        raise HTTPException(400, "Invalid partner id")
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(400, "No fields to update")
    updates["updated_at"] = datetime.now(timezone.utc)
    res = await db.collaboration_partners.find_one_and_update(
        {"_id": oid},
        {"$set": updates},
        return_document=True,
    )
    if not res:
        raise HTTPException(404, "Partner not found")
    return _serialize(res, with_analytics=True)


@router.delete("/admin/partners/{partner_id}")
async def admin_delete_partner(
    partner_id: str,
    user: dict = Depends(get_current_user),
):
    _require_admin(user)
    try:
        oid = ObjectId(partner_id)
    except Exception:
        raise HTTPException(400, "Invalid partner id")
    res = await db.collaboration_partners.delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Partner not found")
    # Clean up analytics buckets
    await db.partner_event_daily.delete_many({"partner_id": oid})
    return {"ok": True, "deleted_id": partner_id}


@router.post("/admin/partners/reorder")
async def admin_reorder_partners(
    body: ReorderIn,
    user: dict = Depends(get_current_user),
):
    """Bulk reorder. Pass an ordered list of partner ids; their display_order
    becomes the position in the array * 10 (so admin can squeeze inserts later)."""
    _require_admin(user)
    now = datetime.now(timezone.utc)
    bulk_ops = []
    for idx, pid in enumerate(body.ordered_ids):
        try:
            oid = ObjectId(pid)
        except Exception:
            continue
        bulk_ops.append((oid, {"display_order": (idx + 1) * 10, "updated_at": now}))
    for oid, upd in bulk_ops:
        await db.collaboration_partners.update_one({"_id": oid}, {"$set": upd})
    return {"ok": True, "reordered": len(bulk_ops)}


# ─────────────────── PT7: CSV import (preview → commit) ───────────────
@router.post("/admin/partners/import/preview")
async def admin_import_preview(
    body: ImportPreviewIn,
    user: dict = Depends(get_current_user),
):
    """Parse the CSV, detect duplicates by name against the DB. No writes."""
    _require_admin(user)
    rows = _parse_import_csv(body.csv_text)
    known = {d.get("name", "").lower() async for d in db.collaboration_partners.find({}, {"name": 1})}
    for r in rows:
        r["duplicate"] = r["name"].lower() in known
        r["error"] = None
        if not r["logo_url"]:
            r["error"] = "missing logo_url"
    new_rows = sum(1 for r in rows if not r["duplicate"])
    dup_rows = sum(1 for r in rows if r["duplicate"])
    return {"rows": rows, "total": len(rows), "new": new_rows, "duplicates": dup_rows}


@router.post("/admin/partners/import/commit")
async def admin_import_commit(
    body: ImportCommitIn,
    user: dict = Depends(get_current_user),
):
    """Insert the selected rows. External http(s) logos are downloaded and
    stored as base64 data URIs (matches the platform convention). Duplicates by
    name are skipped when `skip_duplicates` is set. Returns per-row results."""
    _require_admin(user)
    known = {d.get("name", "").lower() async for d in db.collaboration_partners.find({}, {"name": 1})}
    now = datetime.now(timezone.utc)
    results: list[dict] = []
    imported = 0
    for i, row in enumerate(body.rows):
        entry = {"index": i, "name": row.name}
        if row.name.lower() in known:
            entry.update(status="skipped", reason="duplicate name")
            if not body.skip_duplicates:
                results.append(entry)
                continue
            results.append(entry)
            continue
        logo = await _logo_url_to_data_uri(row.logo_url or "")
        if not logo:
            entry.update(status="error", reason="logo missing or could not be downloaded")
            results.append(entry)
            continue
        cat = _CATEGORY_ALIASES.get((row.category or "company").strip().lower(), "company")
        tier = row.tier.strip().lower() if row.tier else "standard"
        if tier not in _TIER_RANK:
            tier = "standard"
        doc = {
            "name": row.name.strip(),
            "category": cat,
            "logo_url": logo,
            "website_url": row.website_url or None,
            "tier": tier,
            "display_order": 10000,  # appended last; admin can reorder
            "is_active": True,
            "created_at": now,
            "updated_at": now,
            "analytics": {"impressions": 0, "clicks": 0},
        }
        res = await db.collaboration_partners.insert_one(doc)
        known.add(row.name.strip().lower())
        entry.update(status="imported", id=str(res.inserted_id))
        imported += 1
        results.append(entry)
    return {"ok": True, "imported": imported, "results": results}


__all__ = ["router"]
