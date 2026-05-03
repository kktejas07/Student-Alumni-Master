"""
jobs_feed.py — Multi-source live job/internship aggregator.

Fetches real job listings in parallel from 5 free, no-key APIs:
   1. RemoteOK         (https://remoteok.com/api)
   2. ArbeitNow        (https://www.arbeitnow.com/api/job-board-api)
   3. The Muse         (https://www.themuse.com/api/public/jobs)
   4. Remotive         (https://remotive.com/api/remote-jobs)
   5. Jobicy           (https://jobicy.com/api/v2/remote-jobs)

Pipeline:
   - Async parallel fetch via asyncio.gather (with per-API timeout)
   - Per-source normalizer → unified schema
   - MD5 dedup hash on (title|company|location_country) → keeps source_urls[]
   - MongoDB TTL cache (30 min) so repeat hits skip the network
   - Year-tier filter applied at endpoint level:
        Year 1, Year 2  → internship-only
        Year 3, Year 4  → internship + full-time
        Alumni / Mentor → all (full-time + senior)

Public API:
   GET  /api/jobs/feed?type=&work_mode=&q=&location=&page=&per_page=
   POST /api/jobs/save   { job_id }
   POST /api/jobs/unsave { job_id }
   GET  /api/jobs/saved
   POST /api/jobs/track-apply { job_id, source_url }
"""
from __future__ import annotations

import os
import re
import asyncio
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

import httpx
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

_mongo = AsyncIOMotorClient(os.environ["MONGO_URL"])
_db = _mongo[os.environ["DB_NAME"]]

logger = logging.getLogger("jobs_feed")
router = APIRouter()

# ─── Config ──────────────────────────────────────────────────────────────
CACHE_TTL_MIN = 30
PER_API_TIMEOUT_S = 8.0
USER_AGENT = "StudentAlumniBot/1.0 (+https://studentalumni.in)"

# ─── Lightweight normalised job schema ───────────────────────────────────
def _make_dedup_hash(title: str, company: str, location: str) -> str:
    raw = f"{(title or '').strip().lower()}|{(company or '').strip().lower()}|{(location or '').strip().lower()[:30]}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()

def _classify_type(title: str, raw_type: str = "") -> str:
    t = f"{title or ''} {raw_type or ''}".lower()
    if any(w in t for w in ("intern", "internship", "trainee", "co-op")):
        return "Internship"
    if any(w in t for w in ("contract", "freelance", "gig")):
        return "Contract"
    return "Full-time"

def _classify_work_mode(loc: str, raw: str = "") -> str:
    s = f"{loc or ''} {raw or ''}".lower()
    if "remote" in s or "anywhere" in s or "worldwide" in s:
        return "Remote"
    if "hybrid" in s:
        return "Hybrid"
    return "Onsite"

def _company_logo(company: str) -> str:
    """Use favicon-style logo URL via Clearbit/Google as a fallback."""
    if not company:
        return ""
    slug = re.sub(r'[^a-z0-9]+', '', company.lower())[:30]
    return f"https://logo.clearbit.com/{slug}.com"

def _short(text: str, max_len: int = 240) -> str:
    if not text:
        return ""
    text = re.sub(r'<[^>]+>', '', text)  # strip HTML
    text = re.sub(r'\s+', ' ', text).strip()
    return text[:max_len] + ("…" if len(text) > max_len else "")

# ─── Per-source fetchers (each returns list of normalised dicts) ─────────
async def _fetch_remoteok(client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    """RemoteOK — returns array, first element is metadata, skip it."""
    try:
        r = await client.get("https://remoteok.com/api", headers={"User-Agent": USER_AGENT}, timeout=PER_API_TIMEOUT_S)
        r.raise_for_status()
        data = r.json()
        items = data[1:] if data and isinstance(data[0], dict) and "legal" in data[0] else data
        out = []
        for it in items[:60]:
            title = it.get("position") or it.get("title") or ""
            company = it.get("company") or ""
            loc = it.get("location") or "Remote"
            url = it.get("url") or it.get("apply_url") or ""
            out.append({
                "title": title,
                "company": company,
                "location": loc,
                "work_mode": "Remote",
                "job_type": _classify_type(title, ""),
                "salary_min": it.get("salary_min"),
                "salary_max": it.get("salary_max"),
                "currency": "USD",
                "description": _short(it.get("description") or ""),
                "tags": (it.get("tags") or [])[:6],
                "posted_date": it.get("date"),
                "source": "RemoteOK",
                "source_url": url,
                "logo_url": it.get("company_logo") or _company_logo(company),
            })
        return out
    except Exception as e:
        logger.warning(f"[jobs_feed] RemoteOK fetch failed: {e}")
        return []

async def _fetch_arbeitnow(client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    """ArbeitNow — Europe-focused, free, no key."""
    try:
        r = await client.get("https://www.arbeitnow.com/api/job-board-api", timeout=PER_API_TIMEOUT_S)
        r.raise_for_status()
        items = (r.json() or {}).get("data") or []
        out = []
        for it in items[:60]:
            title = it.get("title") or ""
            company = it.get("company_name") or ""
            loc = it.get("location") or "—"
            tags = it.get("tags") or []
            remote_flag = bool(it.get("remote"))
            out.append({
                "title": title,
                "company": company,
                "location": loc,
                "work_mode": "Remote" if remote_flag else _classify_work_mode(loc),
                "job_type": _classify_type(title, ",".join(tags)),
                "salary_min": None,
                "salary_max": None,
                "currency": "EUR",
                "description": _short(it.get("description") or ""),
                "tags": tags[:6],
                "posted_date": it.get("created_at"),
                "source": "ArbeitNow",
                "source_url": it.get("url") or "",
                "logo_url": _company_logo(company),
            })
        return out
    except Exception as e:
        logger.warning(f"[jobs_feed] ArbeitNow fetch failed: {e}")
        return []

async def _fetch_the_muse(client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    """The Muse — pulls a regular page + an internship-targeted page."""
    out: List[Dict[str, Any]] = []
    urls = [
        "https://www.themuse.com/api/public/jobs?page=0",
        "https://www.themuse.com/api/public/jobs?level=Internship&page=0",
        "https://www.themuse.com/api/public/jobs?level=Entry%20Level&page=0",
    ]
    for u in urls:
        try:
            r = await client.get(u, timeout=PER_API_TIMEOUT_S)
            r.raise_for_status()
            items = (r.json() or {}).get("results") or []
            for it in items[:30]:
                title = it.get("name") or ""
                company = (it.get("company") or {}).get("name") or ""
                locations = it.get("locations") or []
                loc = locations[0]["name"] if locations else "—"
                levels = (it.get("levels") or [])
                level_name = (levels[0] or {}).get("name", "") if levels else ""
                is_intern = "intern" in (level_name or "").lower() or "intern" in title.lower()
                out.append({
                    "title": title,
                    "company": company,
                    "location": loc,
                    "work_mode": _classify_work_mode(loc),
                    "job_type": "Internship" if is_intern else _classify_type(title, level_name),
                    "salary_min": None,
                    "salary_max": None,
                    "currency": "USD",
                    "description": _short(it.get("contents") or ""),
                    "tags": [c.get("name") for c in (it.get("categories") or [])[:5]],
                    "posted_date": it.get("publication_date"),
                    "source": "The Muse",
                    "source_url": (it.get("refs") or {}).get("landing_page") or "",
                    "logo_url": _company_logo(company),
                })
        except Exception as e:
            logger.warning(f"[jobs_feed] The Muse fetch failed for {u}: {e}")
    return out


async def _fetch_remoteok_interns(client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    """RemoteOK supports tag-based filtering — pull intern roles explicitly."""
    try:
        r = await client.get(
            "https://remoteok.com/api?tags=intern",
            headers={"User-Agent": USER_AGENT}, timeout=PER_API_TIMEOUT_S,
        )
        r.raise_for_status()
        data = r.json()
        items = data[1:] if data and isinstance(data[0], dict) and "legal" in data[0] else data
        out = []
        for it in items[:30]:
            title = it.get("position") or it.get("title") or ""
            company = it.get("company") or ""
            loc = it.get("location") or "Remote"
            url = it.get("url") or it.get("apply_url") or ""
            out.append({
                "title": title,
                "company": company,
                "location": loc,
                "work_mode": "Remote",
                "job_type": "Internship" if "intern" in title.lower() else _classify_type(title),
                "salary_min": it.get("salary_min"),
                "salary_max": it.get("salary_max"),
                "currency": "USD",
                "description": _short(it.get("description") or ""),
                "tags": (it.get("tags") or [])[:6],
                "posted_date": it.get("date"),
                "source": "RemoteOK",
                "source_url": url,
                "logo_url": it.get("company_logo") or _company_logo(company),
            })
        return out
    except Exception as e:
        logger.warning(f"[jobs_feed] RemoteOK intern fetch failed: {e}")
        return []

async def _fetch_remotive(client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    """Remotive — fully remote jobs, free, no key."""
    try:
        r = await client.get("https://remotive.com/api/remote-jobs?limit=40", timeout=PER_API_TIMEOUT_S)
        r.raise_for_status()
        items = (r.json() or {}).get("jobs") or []
        out = []
        for it in items[:40]:
            title = it.get("title") or ""
            company = it.get("company_name") or ""
            loc = it.get("candidate_required_location") or "Remote"
            jtype = it.get("job_type") or ""
            out.append({
                "title": title,
                "company": company,
                "location": loc,
                "work_mode": "Remote",
                "job_type": _classify_type(title, jtype),
                "salary_min": None,
                "salary_max": None,
                "currency": "USD",
                "description": _short(it.get("description") or ""),
                "tags": (it.get("tags") or [])[:6],
                "posted_date": it.get("publication_date"),
                "source": "Remotive",
                "source_url": it.get("url") or "",
                "logo_url": it.get("company_logo_url") or _company_logo(company),
            })
        return out
    except Exception as e:
        logger.warning(f"[jobs_feed] Remotive fetch failed: {e}")
        return []

async def _fetch_jobicy(client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    """Jobicy — remote + global, free, no key."""
    try:
        r = await client.get("https://jobicy.com/api/v2/remote-jobs?count=40", timeout=PER_API_TIMEOUT_S)
        r.raise_for_status()
        items = (r.json() or {}).get("jobs") or []
        out = []
        for it in items[:40]:
            title = it.get("jobTitle") or ""
            company = it.get("companyName") or ""
            loc = it.get("jobGeo") or "Remote"
            jtype = it.get("jobType") or ""
            out.append({
                "title": title,
                "company": company,
                "location": loc,
                "work_mode": "Remote",
                "job_type": _classify_type(title, str(jtype)),
                "salary_min": it.get("annualSalaryMin"),
                "salary_max": it.get("annualSalaryMax"),
                "currency": (it.get("salaryCurrency") or "USD"),
                "description": _short(it.get("jobDescription") or ""),
                "tags": (it.get("jobIndustry") or [])[:6],
                "posted_date": it.get("pubDate"),
                "source": "Jobicy",
                "source_url": it.get("url") or "",
                "logo_url": it.get("companyLogo") or _company_logo(company),
            })
        return out
    except Exception as e:
        logger.warning(f"[jobs_feed] Jobicy fetch failed: {e}")
        return []

# ─── Aggregator with cache + dedup ───────────────────────────────────────
async def _ensure_cache_indexes():
    try:
        await _db.jobs_cache.create_index("dedup_hash", unique=True)
        await _db.jobs_cache.create_index("expires_at", expireAfterSeconds=0)
        await _db.jobs_cache.create_index([("posted_date", -1)])
        await _db.jobs_cache.create_index([("job_type", 1), ("work_mode", 1)])
    except Exception as e:
        logger.warning(f"[jobs_feed] index ensure failed: {e}")

_indexes_ready = False

async def fetch_and_cache_all() -> Dict[str, Any]:
    """Calls all 5 APIs in parallel, dedupes, persists with TTL.

    Returns a stats dict for observability.
    """
    global _indexes_ready
    if not _indexes_ready:
        await _ensure_cache_indexes()
        _indexes_ready = True

    expires = datetime.now(timezone.utc) + timedelta(minutes=CACHE_TTL_MIN)

    async with httpx.AsyncClient(timeout=PER_API_TIMEOUT_S, follow_redirects=True) as client:
        results = await asyncio.gather(
            _fetch_remoteok(client),
            _fetch_remoteok_interns(client),
            _fetch_arbeitnow(client),
            _fetch_the_muse(client),
            _fetch_remotive(client),
            _fetch_jobicy(client),
            return_exceptions=False,
        )

    sources_count = {
        "RemoteOK": len(results[0]) + len(results[1]),
        "ArbeitNow": len(results[2]),
        "The Muse": len(results[3]),
        "Remotive": len(results[4]),
        "Jobicy": len(results[5]),
    }

    # Flatten + dedupe
    seen: Dict[str, Dict[str, Any]] = {}
    for batch in results:
        for it in batch:
            if not it.get("title") or not it.get("company"):
                continue
            h = _make_dedup_hash(it["title"], it["company"], it.get("location", ""))
            if h in seen:
                # Append source_url to existing job
                existing = seen[h]
                src = it.get("source_url") or ""
                if src and src not in existing["source_urls"]:
                    existing["source_urls"].append(src)
                if it.get("source") and it["source"] not in existing.get("sources", []):
                    existing.setdefault("sources", []).append(it["source"])
            else:
                primary_url = it.get("source_url") or ""
                seen[h] = {
                    **it,
                    "dedup_hash": h,
                    "source_urls": [primary_url] if primary_url else [],
                    "sources": [it.get("source")] if it.get("source") else [],
                    "expires_at": expires,
                    "cached_at": datetime.now(timezone.utc),
                }
                # Drop scalar source_url (list now in source_urls)
                seen[h].pop("source_url", None)

    # Bulk upsert
    try:
        ops = []
        from pymongo import UpdateOne
        for h, doc in seen.items():
            ops.append(UpdateOne({"dedup_hash": h}, {"$set": doc}, upsert=True))
        if ops:
            await _db.jobs_cache.bulk_write(ops, ordered=False)
    except Exception as e:
        logger.warning(f"[jobs_feed] cache bulk_write failed: {e}")

    return {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "sources": sources_count,
        "total_unique": len(seen),
        "ttl_minutes": CACHE_TTL_MIN,
    }


async def _has_fresh_cache() -> bool:
    """Are there enough non-expired records in cache to serve a page?"""
    cnt = await _db.jobs_cache.count_documents({"expires_at": {"$gt": datetime.now(timezone.utc)}})
    return cnt >= 50


# ─── Year-tier visibility rules ──────────────────────────────────────────
def _allowed_job_types_for_user(user: Dict[str, Any]) -> List[str]:
    """Per spec:
       - Year 1, 2 → internship only
       - Year 3, 4 → internship + full-time
       - Alumni / mentor → all
    """
    role = (user or {}).get("role", "student")
    if role in ("alumni", "mentor", "admin", "college"):
        return ["Full-time", "Internship", "Contract"]

    # Try to read year from various profile shapes
    yr = None
    si = (user or {}).get("school_info") or {}
    candidates = [
        user.get("year"),
        user.get("current_year"),
        si.get("year"),
        si.get("current_year"),
        user.get("academic_year"),
    ]
    for c in candidates:
        if c is None:
            continue
        if isinstance(c, (int, float)):
            yr = int(c); break
        s = str(c).lower()
        m = re.search(r'(\d)', s)
        if m:
            yr = int(m.group(1)); break
        if "first" in s: yr = 1; break
        if "second" in s: yr = 2; break
        if "third" in s: yr = 3; break
        if "fourth" in s or "final" in s: yr = 4; break

    # Fallback: derive from graduation_year (assumes a 4-year course).
    if yr is None:
        gy = user.get("graduation_year") or si.get("graduation_year")
        try:
            if gy:
                gy_int = int(str(gy)[:4])
                cur_year = datetime.now(timezone.utc).year
                # diff = years until graduation. 0 → final, 1 → 3rd, 2 → 2nd, 3 → 1st
                diff = gy_int - cur_year
                if diff <= 0:   yr = 4
                elif diff == 1: yr = 3
                elif diff == 2: yr = 2
                else:           yr = 1
        except Exception:
            yr = None

    if yr is None or yr <= 2:
        return ["Internship"]
    return ["Internship", "Full-time", "Contract"]


def _enforce_year_tier(items: List[Dict[str, Any]], user: Dict[str, Any]) -> List[Dict[str, Any]]:
    allowed = _allowed_job_types_for_user(user)
    return [it for it in items if it.get("job_type") in allowed]


# ─── Public endpoints ────────────────────────────────────────────────────
def _serialize(doc: Dict[str, Any]) -> Dict[str, Any]:
    out = {k: v for k, v in doc.items() if k not in ("_id", "expires_at", "cached_at")}
    out["job_id"] = doc.get("dedup_hash")
    if isinstance(out.get("posted_date"), datetime):
        out["posted_date"] = out["posted_date"].isoformat()
    return out


def _get_current_user_dependency():
    """Lazy import to avoid circular import at module init."""
    from server import get_current_user  # noqa
    return get_current_user


@router.get("/jobs/feed")
async def jobs_feed(
    type: Optional[str] = Query(None, description="Internship | Full-time | Contract"),
    work_mode: Optional[str] = Query(None, description="Remote | Hybrid | Onsite"),
    q: Optional[str] = Query(None, description="Search title/company/tags"),
    location: Optional[str] = Query(None),
    source: Optional[str] = Query(None, description="RemoteOK | ArbeitNow | The Muse | Remotive | Jobicy"),
    page: int = Query(1, ge=1),
    per_page: int = Query(15, ge=1, le=50),
    refresh: bool = Query(False, description="Force re-fetch from upstream APIs"),
    user: dict = Depends(_get_current_user_dependency()),
):
    """Aggregated live job feed. Tier-filtered by user's year automatically."""
    refresh_stats = None
    if refresh or not await _has_fresh_cache():
        refresh_stats = await fetch_and_cache_all()

    # Build Mongo query
    q_match: Dict[str, Any] = {"expires_at": {"$gt": datetime.now(timezone.utc)}}

    # Year-tier filter (always applied unless type override is explicitly given)
    allowed = _allowed_job_types_for_user(user)
    if type:
        # Respect user's explicit filter, but only intersect with allowed
        if type in allowed:
            q_match["job_type"] = type
        else:
            # Out of tier — return empty
            return {
                "items": [], "total": 0, "page": page, "per_page": per_page,
                "allowed_types": allowed, "user_tier_locked": True,
                "message": f"Your tier doesn't include {type}. Try one of: {', '.join(allowed)}.",
                "refresh_stats": refresh_stats,
            }
    else:
        q_match["job_type"] = {"$in": allowed}

    if work_mode:
        q_match["work_mode"] = work_mode
    if location:
        q_match["location"] = {"$regex": location, "$options": "i"}
    if source:
        q_match["sources"] = source
    if q:
        q_match["$or"] = [
            {"title":   {"$regex": q, "$options": "i"}},
            {"company": {"$regex": q, "$options": "i"}},
            {"tags":    {"$regex": q, "$options": "i"}},
        ]

    total = await _db.jobs_cache.count_documents(q_match)
    skip = (page - 1) * per_page
    cur = (
        _db.jobs_cache.find(q_match)
        .sort([("posted_date", -1), ("cached_at", -1)])
        .skip(skip).limit(per_page)
    )
    items = [_serialize(d) async for d in cur]

    # Mark saved/applied state
    saved_ids = set((user or {}).get("saved_jobs") or [])
    applied_ids = set((user or {}).get("applied_jobs") or [])
    for it in items:
        it["saved"] = it["job_id"] in saved_ids
        it["applied"] = it["job_id"] in applied_ids

    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "allowed_types": allowed,
        "user_tier_locked": False,
        "available_sources": ["RemoteOK", "ArbeitNow", "The Muse", "Remotive", "Jobicy"],
        "refresh_stats": refresh_stats,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/jobs/save")
async def save_job(body: Dict[str, Any], user: dict = Depends(_get_current_user_dependency())):
    job_id = (body or {}).get("job_id")
    if not job_id:
        raise HTTPException(400, "job_id required")
    await _db.users.update_one(
        {"_id": user["_id"]},
        {"$addToSet": {"saved_jobs": job_id}},
    )
    return {"ok": True, "saved": True, "job_id": job_id}


@router.post("/jobs/unsave")
async def unsave_job(body: Dict[str, Any], user: dict = Depends(_get_current_user_dependency())):
    job_id = (body or {}).get("job_id")
    if not job_id:
        raise HTTPException(400, "job_id required")
    await _db.users.update_one(
        {"_id": user["_id"]},
        {"$pull": {"saved_jobs": job_id}},
    )
    return {"ok": True, "saved": False, "job_id": job_id}


@router.get("/jobs/saved")
async def list_saved(user: dict = Depends(_get_current_user_dependency())):
    saved_ids = (user or {}).get("saved_jobs") or []
    if not saved_ids:
        return {"items": []}
    cur = _db.jobs_cache.find({"dedup_hash": {"$in": saved_ids}})
    items = [_serialize(d) async for d in cur]
    for it in items:
        it["saved"] = True
    return {"items": items, "total": len(items)}


@router.post("/jobs/track-apply")
async def track_apply(body: Dict[str, Any], user: dict = Depends(_get_current_user_dependency())):
    job_id = (body or {}).get("job_id")
    if not job_id:
        raise HTTPException(400, "job_id required")
    await _db.users.update_one(
        {"_id": user["_id"]},
        {"$addToSet": {"applied_jobs": job_id}},
    )
    # Audit log
    try:
        await _db.job_apply_audit.insert_one({
            "user_id": str(user["_id"]),
            "job_id": job_id,
            "source_url": (body or {}).get("source_url"),
            "ts": datetime.now(timezone.utc),
        })
    except Exception:
        pass
    return {"ok": True, "applied": True, "job_id": job_id}


@router.post("/jobs/refresh")
async def admin_refresh(user: dict = Depends(_get_current_user_dependency())):
    """Force a re-fetch (any auth'd user can trigger; cheap because of TTL cache)."""
    stats = await fetch_and_cache_all()
    return stats


@router.get("/jobs/trending-companies")
async def trending_companies(
    limit: int = Query(8, ge=1, le=20),
    user: dict = Depends(_get_current_user_dependency()),
):
    """Top hiring companies in the last 7 days, derived from the live cache.

    Filters by year-tier so a Year-1 student only sees companies hiring
    interns. Returns logo + open job count + dominant source per company.
    """
    allowed = _allowed_job_types_for_user(user)
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)

    pipeline = [
        {"$match": {
            "expires_at": {"$gt": datetime.now(timezone.utc)},
            "job_type":   {"$in": allowed},
            "cached_at":  {"$gte": seven_days_ago},
            "company":    {"$ne": ""},
        }},
        {"$group": {
            "_id": "$company",
            "open_jobs": {"$sum": 1},
            "any_logo":  {"$first": "$logo_url"},
            "any_source": {"$first": "$sources"},
            "any_location": {"$first": "$location"},
            "any_type": {"$first": "$job_type"},
            "latest_posted": {"$max": "$cached_at"},
        }},
        {"$sort": {"open_jobs": -1, "latest_posted": -1}},
        {"$limit": limit},
    ]
    out = []
    async for doc in _db.jobs_cache.aggregate(pipeline):
        out.append({
            "company":     doc["_id"],
            "open_jobs":   doc["open_jobs"],
            "logo_url":    doc.get("any_logo") or "",
            "primary_source": (doc.get("any_source") or [None])[0] if isinstance(doc.get("any_source"), list) else (doc.get("any_source") or ""),
            "primary_location": doc.get("any_location") or "—",
            "dominant_type": doc.get("any_type") or "Full-time",
        })
    return {"items": out, "total": len(out), "window_days": 7, "tier_filter": allowed}


@router.get("/jobs/new-since-last-visit")
async def new_since_last_visit(user: dict = Depends(_get_current_user_dependency())):
    """How many new jobs landed in the cache since the user last opened the
    Internships & Jobs view. Updates `last_jobs_visit` to "now" as a side
    effect so subsequent calls return 0 until new data arrives.
    """
    allowed = _allowed_job_types_for_user(user)
    last_visit = user.get("last_jobs_visit")
    if not isinstance(last_visit, datetime):
        # First-ever visit — peg to 24h ago so we surface fresh content
        last_visit = datetime.now(timezone.utc) - timedelta(hours=24)
    elif last_visit.tzinfo is None:
        last_visit = last_visit.replace(tzinfo=timezone.utc)

    cnt = await _db.jobs_cache.count_documents({
        "expires_at": {"$gt": datetime.now(timezone.utc)},
        "job_type":   {"$in": allowed},
        "cached_at":  {"$gt": last_visit},
    })
    # Touch the timestamp
    now = datetime.now(timezone.utc)
    await _db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_jobs_visit": now}},
    )
    return {
        "new_count": cnt,
        "since": last_visit.isoformat(),
        "checked_at": now.isoformat(),
    }
