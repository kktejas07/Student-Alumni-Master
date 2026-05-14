"""
Super Admin — Colleges module.

Auto-onboards a college whenever an imported user mentions an institution
that doesn't exist yet, then enriches it from free public APIs:

  • Hipolabs Universities API   (http://universities.hipolabs.com/search?name=…)
      → website, country, state-province, domains
  • Wikipedia REST summary       (https://en.wikipedia.org/api/rest_v1/page/summary/…)
      → description, thumbnail (logo fallback), full URL
  • Wikipedia 'extract' API      (https://en.wikipedia.org/w/api.php?…extracts)
      → free-text extract used to heuristically pull NIRF rank / NAAC grade /
        AICTE-accredited mention / list of specialty departments

Status flow:
    pending  → admin reviews/edits → approved (active)
    active   → admin disables       → paused
    paused   → admin re-approves    → active
    any      → admin deletes        → soft-deleted (colleges_archive)
"""

import os
import re
import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import APIRouter, Header, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

load_dotenv()

router = APIRouter()

# ─── Mongo ─────────────────────────────────────────────────────────
_MONGO_URL = os.getenv("MONGO_URL") or "mongodb://localhost:27017"
_DB_NAME   = os.getenv("DB_NAME") or "career_platform"
_client    = AsyncIOMotorClient(_MONGO_URL)
_db        = _client[_DB_NAME]

# ─── Auth helpers ──────────────────────────────────────────────────
try:
    import jwt  # PyJWT
    _JWT_SECRET = os.getenv("JWT_SECRET", "")
except Exception:
    jwt = None  # type: ignore
    _JWT_SECRET = ""


async def _resolve_user(authorization: Optional[str]) -> Optional[dict]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    try:
        if jwt is None:
            return None
        payload = jwt.decode(token, _JWT_SECRET, algorithms=["HS256"])
    except Exception:
        return None
    uid = payload.get("sub") or payload.get("user_id") or payload.get("id")
    if not uid:
        return None
    try:
        u = await _db.users.find_one({"_id": ObjectId(uid)})
        if u:
            return u
    except Exception:
        pass
    return await _db.users.find_one({"_id": uid})


async def _require_admin(authorization: Optional[str]) -> dict:
    user = await _resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    role = (user.get("role") or "").lower()
    if role not in {"superadmin", "super_admin", "admin"}:
        raise HTTPException(403, "Super-admin role required")
    return user


# ─── Helpers ───────────────────────────────────────────────────────
def _normalize(name: str) -> str:
    """Lowercase + strip + drop common suffixes for dedupe."""
    if not name:
        return ""
    s = re.sub(r"[^a-z0-9]+", " ", name.lower()).strip()
    # collapse double spaces
    return re.sub(r"\s+", " ", s)


def _color_for(name: str) -> str:
    palette = ["#F97316", "#FB923C", "#F59E0B", "#D97706", "#EA580C", "#B45309"]
    idx = sum(ord(c) for c in (name or "")) % len(palette)
    return palette[idx]


def _initials(name: str) -> str:
    parts = [p for p in re.split(r"\s+", name or "") if p]
    if not parts:
        return "??"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return (parts[0][0] + parts[-1][0]).upper()


# ─── Free-API enrichment ───────────────────────────────────────────
NAAC_RE  = re.compile(r"NAAC[^A-Za-z0-9]*(?:accredited[^A-Za-z0-9]*)?(?:grade[^A-Za-z0-9]*)?([A-D]\+{0,2})", re.I)
NIRF_RE  = re.compile(r"NIRF[^0-9]{0,40}(\d{1,3})", re.I)
AICTE_RE = re.compile(r"\bAICTE\b", re.I)
UGC_RE   = re.compile(r"\bUGC\b", re.I)
IIT_RE   = re.compile(r"\bIIT\b|Indian Institute of Technology", re.I)
NIT_RE   = re.compile(r"\bNIT\b|National Institute of Technology", re.I)
IIM_RE   = re.compile(r"\bIIM\b|Indian Institute of Management", re.I)
DEPARTMENT_KEYWORDS = [
    ("Computer Science",  re.compile(r"computer science|CSE\b|computing", re.I)),
    ("Electronics",       re.compile(r"electronics|ECE\b", re.I)),
    ("Mechanical",        re.compile(r"mechanical engineering|mechE", re.I)),
    ("Civil",             re.compile(r"civil engineering", re.I)),
    ("Electrical",        re.compile(r"electrical engineering|EEE\b", re.I)),
    ("Chemical",          re.compile(r"chemical engineering", re.I)),
    ("Business / MBA",    re.compile(r"management|MBA|business school", re.I)),
    ("Medicine",          re.compile(r"medic(?:ine|al)|MBBS", re.I)),
    ("Law",               re.compile(r"\blaw\b|legal studies", re.I)),
    ("Architecture",      re.compile(r"architecture", re.I)),
    ("Arts & Humanities", re.compile(r"humanities|liberal arts|arts faculty", re.I)),
    ("Sciences",          re.compile(r"natural sciences|physical sciences|life sciences", re.I)),
]


WIKI_UA = "NexusOS/1.0 (https://studentalumni.in; admin@studentalumni.in)"


async def _hipolabs_lookup(name: str) -> Optional[dict]:
    if not name:
        return None
    try:
        async with httpx.AsyncClient(timeout=8.0) as c:
            r = await c.get("http://universities.hipolabs.com/search", params={"name": name})
            if r.status_code != 200:
                return None
            arr = r.json() or []
            if not arr:
                return None
            # Prefer Indian colleges if any match, else first
            indian = [u for u in arr if (u.get("country") or "").lower() == "india"]
            return (indian[0] if indian else arr[0])
    except Exception:
        return None


async def _wikipedia_summary(title: str) -> Optional[dict]:
    if not title:
        return None
    safe = title.replace(" ", "_")
    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as c:
            r = await c.get(f"https://en.wikipedia.org/api/rest_v1/page/summary/{safe}",
                            headers={"User-Agent": WIKI_UA, "Accept": "application/json"})
            if r.status_code != 200:
                return None
            return r.json()
    except Exception:
        return None


async def _wikipedia_extract(title: str) -> str:
    """Fetch longer plain-text extract used to mine NIRF / NAAC / departments."""
    if not title:
        return ""
    try:
        async with httpx.AsyncClient(timeout=10.0) as c:
            r = await c.get(
                "https://en.wikipedia.org/w/api.php",
                params={
                    "action": "query", "format": "json",
                    "prop": "extracts", "explaintext": "1", "redirects": "1",
                    "titles": title,
                },
                headers={"User-Agent": WIKI_UA, "Accept": "application/json"},
            )
            if r.status_code != 200:
                return ""
            data = r.json() or {}
            pages = (data.get("query") or {}).get("pages") or {}
            for _, p in pages.items():
                return p.get("extract") or ""
            return ""
    except Exception:
        return ""


def _heuristic_accreditation(extract: str) -> List[str]:
    out: List[str] = []
    m = NAAC_RE.search(extract or "")
    if m:
        out.append(f"NAAC {m.group(1).upper()}")
    if AICTE_RE.search(extract or ""):
        out.append("AICTE-approved")
    if UGC_RE.search(extract or ""):
        out.append("UGC-recognised")
    return out


def _heuristic_ranking(name: str, extract: str) -> List[str]:
    out: List[str] = []
    m = NIRF_RE.search(extract or "")
    if m:
        out.append(f"NIRF #{m.group(1)}")
    # tier badges based on the name
    if IIT_RE.search(name) or IIT_RE.search(extract or ""):
        if not any(r.startswith("NIRF") for r in out):
            out.append("Tier-1 (IIT)")
    if NIT_RE.search(name) or NIT_RE.search(extract or ""):
        out.append("Tier-1 (NIT)")
    if IIM_RE.search(name) or IIM_RE.search(extract or ""):
        out.append("Tier-1 (IIM)")
    return out


def _heuristic_specialties(extract: str) -> List[str]:
    if not extract:
        return []
    found = []
    for label, pat in DEPARTMENT_KEYWORDS:
        if pat.search(extract):
            found.append(label)
    return found[:6]


async def _enrich(name: str) -> Dict[str, Any]:
    """Run all enrichment in parallel and merge.  Never raises."""
    out: Dict[str, Any] = {
        "name":          name,
        "country":       "",
        "state":         "",
        "city":          "",
        "website":       "",
        "domains":       [],
        "description":   "",
        "logo_url":      "",
        "wiki_url":      "",
        "accreditation": [],
        "ranking":       [],
        "specialties":   [],
        "type":          "",     # to be derived (Public/Private/Autonomous)
        "enrichment_status": "failed",
        "enrichment_sources": [],
    }
    if not name or len(name.strip()) < 3:
        return out
    try:
        hipo, wiki, extract = await asyncio.gather(
            _hipolabs_lookup(name),
            _wikipedia_summary(name),
            _wikipedia_extract(name),
            return_exceptions=False,
        )
    except Exception:
        hipo, wiki, extract = None, None, ""

    if hipo:
        out["country"] = hipo.get("country") or ""
        out["state"]   = (hipo.get("state-province") or hipo.get("stateProvince") or "") or ""
        web_pages = hipo.get("web_pages") or []
        if web_pages:
            out["website"] = web_pages[0]
        out["domains"] = hipo.get("domains") or []
        out["enrichment_sources"].append("hipolabs")

    if wiki:
        out["description"] = wiki.get("extract") or out["description"]
        out["wiki_url"] = (wiki.get("content_urls") or {}).get("desktop", {}).get("page") or ""
        # Thumbnail makes a great fallback logo
        thumb = (wiki.get("thumbnail") or {}).get("source") or \
                (wiki.get("originalimage") or {}).get("source") or ""
        if thumb:
            out["logo_url"] = thumb
        out["enrichment_sources"].append("wikipedia")

    out["accreditation"] = _heuristic_accreditation(extract or out["description"])
    out["ranking"]       = _heuristic_ranking(name, extract or out["description"])
    out["specialties"]   = _heuristic_specialties(extract or out["description"])

    # Type guess
    lower_blob = (name + " " + (out["description"] or "")).lower()
    if IIT_RE.search(name) or NIT_RE.search(name) or IIM_RE.search(name) or "central university" in lower_blob:
        out["type"] = "Public · Autonomous"
    elif "private university" in lower_blob or "deemed university" in lower_blob:
        out["type"] = "Private"
    elif "government" in lower_blob or "state university" in lower_blob:
        out["type"] = "Public"
    else:
        out["type"] = ""

    out["enrichment_status"] = (
        "enriched" if (hipo and wiki) else
        ("partial" if (hipo or wiki) else "failed")
    )
    return out


# ─── Auto-onboard: called from the import pipeline ─────────────────
async def ensure_college(name: str, created_by: str = "import") -> Optional[str]:
    """Idempotent — returns the college _id (string) or None for empty names.
    Status starts as 'pending' for admin verification."""
    if not name or not name.strip():
        return None
    norm = _normalize(name)
    # try exact match by normalized name first
    existing = await _db.colleges.find_one({"normalized_name": norm})
    if existing:
        return str(existing["_id"])

    # fire & forget: enrich asynchronously, but write a stub immediately so the
    # college shows up in the colleges directory even if enrichment fails.
    doc = {
        "name": name.strip(),
        "normalized_name": norm,
        "status": "pending",
        "created_by": created_by,
        "created_at": datetime.now(timezone.utc),
        "enrichment_status": "pending",
        "enrichment_sources": [],
        "accreditation": [],
        "ranking": [],
        "specialties": [],
    }
    res = await _db.colleges.insert_one(doc)
    cid = res.inserted_id

    # Kick off enrichment in the background — non-blocking
    try:
        asyncio.create_task(_enrich_and_save(cid, name.strip()))
    except Exception:
        # fallback synchronous attempt
        try:
            data = await _enrich(name.strip())
            await _db.colleges.update_one({"_id": cid}, {"$set": data})
        except Exception:
            pass
    return str(cid)


async def _enrich_and_save(cid: ObjectId, name: str):
    try:
        data = await _enrich(name)
        await _db.colleges.update_one({"_id": cid}, {"$set": data})
    except Exception:
        await _db.colleges.update_one({"_id": cid}, {"$set": {"enrichment_status": "failed"}})


# ─── Public API ────────────────────────────────────────────────────
def _serialize(c: dict, student_count: int = 0) -> dict:
    return {
        "id":              str(c["_id"]),
        "name":            c.get("name") or "",
        "city":            c.get("city") or "",
        "state":           c.get("state") or "",
        "country":         c.get("country") or "",
        "website":         c.get("website") or "",
        "domains":         c.get("domains") or [],
        "description":     c.get("description") or "",
        "logo_url":        c.get("logo_url") or "",
        "wiki_url":        c.get("wiki_url") or "",
        "accreditation":   c.get("accreditation") or [],
        "ranking":         c.get("ranking") or [],
        "specialties":     c.get("specialties") or [],
        "type":            c.get("type") or "",
        "status":          c.get("status") or "pending",
        "linkedin_url":    c.get("linkedin_url") or "",
        "enrichment_status": c.get("enrichment_status") or "failed",
        "enrichment_sources": c.get("enrichment_sources") or [],
        "color":           _color_for(c.get("name") or ""),
        "initials":        _initials(c.get("name") or ""),
        "student_count":   student_count,
        "created_at":      (c.get("created_at").isoformat() if isinstance(c.get("created_at"), datetime) else None),
    }


@router.get("/admin/colleges/list")
async def list_colleges(
    status: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
    authorization: Optional[str] = Header(None),
):
    await _require_admin(authorization)

    match: Dict[str, Any] = {}
    if status and status != "all":
        match["status"] = status
    if q:
        match["name"] = {"$regex": q, "$options": "i"}

    total = await _db.colleges.count_documents(match)
    cur = _db.colleges.find(match).sort([("created_at", -1), ("_id", -1)]).skip(offset).limit(limit)

    # Aggregate student counts by normalized college name
    name_to_id: Dict[str, str] = {}
    docs: List[dict] = []
    async for c in cur:
        docs.append(c)
        nn = c.get("normalized_name") or _normalize(c.get("name", ""))
        if nn:
            name_to_id[nn] = str(c["_id"])

    counts_pipeline = [
        {"$match": {"college": {"$exists": True, "$nin": [None, ""]}}},
        {"$group": {"_id": {"$toLower": "$college"}, "n": {"$sum": 1}}},
    ]
    counts_map: Dict[str, int] = {}
    try:
        async for r in _db.users.aggregate(counts_pipeline):
            n = _normalize(r.get("_id") or "")
            if n:
                counts_map[n] = counts_map.get(n, 0) + int(r.get("n", 0))
    except Exception:
        counts_map = {}

    items = [_serialize(c, counts_map.get(c.get("normalized_name") or _normalize(c.get("name", "")), 0)) for c in docs]

    counts = {
        "all":      await _db.colleges.count_documents({}),
        "pending":  await _db.colleges.count_documents({"status": "pending"}),
        "active":   await _db.colleges.count_documents({"status": "active"}),
        "paused":   await _db.colleges.count_documents({"status": "paused"}),
    }
    return {"items": items, "total": total, "counts": counts}


@router.get("/admin/colleges/{cid}")
async def get_college(cid: str, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    try: oid = ObjectId(cid)
    except Exception: raise HTTPException(400, "Invalid id")
    c = await _db.colleges.find_one({"_id": oid})
    if not c:
        raise HTTPException(404, "College not found")
    # Compute live student count
    norm = c.get("normalized_name") or _normalize(c.get("name", ""))
    sc = 0
    if norm:
        sc = await _db.users.count_documents({"college": {"$regex": f"^{re.escape(c.get('name', ''))}$", "$options": "i"}})
    return _serialize(c, sc)


class PatchCollege(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    type: Optional[str] = None
    linkedin_url: Optional[str] = None
    accreditation: Optional[List[str]] = None
    ranking: Optional[List[str]] = None
    specialties: Optional[List[str]] = None


@router.patch("/admin/colleges/{cid}")
async def patch_college(cid: str, body: PatchCollege, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    try: oid = ObjectId(cid)
    except Exception: raise HTTPException(400, "Invalid id")
    upd = {k: v for k, v in body.dict().items() if v is not None}
    if "name" in upd:
        upd["normalized_name"] = _normalize(upd["name"])
    upd["updated_at"] = datetime.now(timezone.utc)
    await _db.colleges.update_one({"_id": oid}, {"$set": upd})
    return {"ok": True}


class CreateCollege(BaseModel):
    name: str
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "India"


@router.post("/admin/colleges")
async def create_college(body: CreateCollege, authorization: Optional[str] = Header(None)):
    user = await _require_admin(authorization)
    cid = await ensure_college(body.name, created_by=str(user["_id"]))
    if body.city or body.state or body.country:
        await _db.colleges.update_one(
            {"_id": ObjectId(cid)},
            {"$set": {k: v for k, v in {
                "city": body.city, "state": body.state, "country": body.country
            }.items() if v is not None}},
        )
    return {"ok": True, "id": cid}


@router.post("/admin/colleges/{cid}/approve")
async def approve_college(cid: str, authorization: Optional[str] = Header(None)):
    user = await _require_admin(authorization)
    try: oid = ObjectId(cid)
    except Exception: raise HTTPException(400, "Invalid id")
    await _db.colleges.update_one({"_id": oid}, {"$set": {
        "status": "active",
        "approved_by": str(user["_id"]),
        "approved_at": datetime.now(timezone.utc),
    }})
    return {"ok": True, "status": "active"}


@router.post("/admin/colleges/{cid}/disable")
async def disable_college(cid: str, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    try: oid = ObjectId(cid)
    except Exception: raise HTTPException(400, "Invalid id")
    await _db.colleges.update_one({"_id": oid}, {"$set": {
        "status": "paused", "disabled_at": datetime.now(timezone.utc),
    }})
    return {"ok": True, "status": "paused"}


@router.post("/admin/colleges/{cid}/restore")
async def restore_college(cid: str, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    try: oid = ObjectId(cid)
    except Exception: raise HTTPException(400, "Invalid id")
    # If it was soft-deleted, pull it from archive
    arch = await _db.colleges_archive.find_one({"_id": oid})
    if arch:
        arch.pop("_id", None)
        arch["restored_at"] = datetime.now(timezone.utc)
        arch["status"] = "active"
        await _db.colleges.insert_one({**arch, "_id": oid})
        await _db.colleges_archive.delete_one({"_id": oid})
        return {"ok": True, "status": "active", "restored_from": "archive"}
    # Otherwise re-activate
    await _db.colleges.update_one({"_id": oid}, {"$set": {"status": "active"}})
    return {"ok": True, "status": "active"}


@router.delete("/admin/colleges/{cid}")
async def delete_college(cid: str, authorization: Optional[str] = Header(None)):
    user = await _require_admin(authorization)
    try: oid = ObjectId(cid)
    except Exception: raise HTTPException(400, "Invalid id")
    c = await _db.colleges.find_one({"_id": oid})
    if not c:
        return {"ok": True, "removed": 0}
    c["archived_at"] = datetime.now(timezone.utc)
    c["archived_by"] = str(user["_id"])
    await _db.colleges_archive.insert_one(c)
    await _db.colleges.delete_one({"_id": oid})
    return {"ok": True, "removed": 1, "archived": True}


@router.post("/admin/colleges/{cid}/reenrich")
async def reenrich_college(cid: str, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    try: oid = ObjectId(cid)
    except Exception: raise HTTPException(400, "Invalid id")
    c = await _db.colleges.find_one({"_id": oid})
    if not c:
        raise HTTPException(404, "College not found")
    data = await _enrich(c.get("name") or "")
    # Don't overwrite admin-edited fields if they exist
    for skip_field in ("status", "approved_by", "approved_at", "created_by", "created_at"):
        data.pop(skip_field, None)
    await _db.colleges.update_one({"_id": oid}, {"$set": data})
    fresh = await _db.colleges.find_one({"_id": oid})
    return _serialize(fresh, 0)
