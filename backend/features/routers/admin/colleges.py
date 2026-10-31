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

from pydantic import BaseModel
import os
import re
import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import APIRouter, Header, HTTPException

load_dotenv()

router = APIRouter()

# ─── Mongo ─────────────────────────────────────────────────────────
# DB name is module-specific ("career_platform") on the shared app connection.
# core.db raises at import if MONGO_URL is unset — no localhost fallback.
from core.db import client as _client
from core.query_helpers import nonempty
_DB_NAME   = os.getenv("DB_NAME") or "career_platform"
_db        = _client[_DB_NAME]

# ─── Auth helpers ──────────────────────────────────────────────────
from core.deps import bearer_token, decode_payload_silent


async def _resolve_user(authorization: Optional[str]) -> Optional[dict]:
    payload = decode_payload_silent(bearer_token(authorization))
    if not payload:
        return None
    uid = payload.get("sub") or payload.get("user_id") or payload.get("id")
    if not uid:
        return None
    u = None
    try:
        u = await _db.users.find_one({"_id": ObjectId(uid)})
    except Exception:
        pass
    if not u:
        u = await _db.users.find_one({"_id": uid})
    if not u and payload.get("email"):
        u = await _db.users.find_one({"email": payload.get("email")})
    return u


async def _require_admin(authorization: Optional[str]) -> dict:
    user = await _resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    role = (user.get("role") or "").lower()
    if role not in {"admin", "super_admin"}:
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

# ─── Name normalization & alias expansion ─────────────────────────
COLLEGE_ALIASES = {
    # IITs
    "iit bombay": ["Indian Institute of Technology Bombay", "IIT Bombay"],
    "iit delhi":  ["Indian Institute of Technology Delhi",  "IIT Delhi"],
    "iit madras": ["Indian Institute of Technology Madras", "IIT Madras"],
    "iit kanpur": ["Indian Institute of Technology Kanpur", "IIT Kanpur"],
    "iit kharagpur": ["Indian Institute of Technology Kharagpur", "IIT Kharagpur"],
    "iit roorkee":   ["Indian Institute of Technology Roorkee",   "IIT Roorkee"],
    "iit guwahati":  ["Indian Institute of Technology Guwahati",  "IIT Guwahati"],
    "iit hyderabad": ["Indian Institute of Technology Hyderabad", "IIT Hyderabad"],
    "iit indore":    ["Indian Institute of Technology Indore",    "IIT Indore"],
    "iit bhu":       ["Indian Institute of Technology (BHU) Varanasi", "IIT BHU"],
    # IIMs
    "iim ahmedabad": ["Indian Institute of Management Ahmedabad", "IIM Ahmedabad"],
    "iim bangalore": ["Indian Institute of Management Bangalore", "IIM Bangalore"],
    "iim calcutta":  ["Indian Institute of Management Calcutta",  "IIM Calcutta"],
    "iim lucknow":   ["Indian Institute of Management Lucknow",   "IIM Lucknow"],
    "iim kozhikode": ["Indian Institute of Management Kozhikode", "IIM Kozhikode"],
    "iim indore":    ["Indian Institute of Management Indore",    "IIM Indore"],
    # NITs
    "nit trichy":    ["National Institute of Technology, Tiruchirappalli", "NIT Trichy"],
    "nit warangal":  ["National Institute of Technology, Warangal", "NIT Warangal"],
    "nit surathkal": ["National Institute of Technology Karnataka", "NIT Surathkal"],
    "nit calicut":   ["National Institute of Technology Calicut",   "NIT Calicut"],
    "nit rourkela":  ["National Institute of Technology Rourkela",  "NIT Rourkela"],
    "nit silchar":   ["National Institute of Technology Silchar",   "NIT Silchar"],
    # IIITs
    "iiit hyderabad": ["International Institute of Information Technology, Hyderabad", "IIIT Hyderabad"],
    "iiit bangalore": ["International Institute of Information Technology, Bangalore", "IIIT Bangalore"],
    "iiit delhi":     ["Indraprastha Institute of Information Technology, Delhi", "IIIT Delhi"],
    # Other top
    "iisc":           ["Indian Institute of Science",             "Indian Institute of Science Bangalore"],
    "bits pilani":    ["Birla Institute of Technology and Science, Pilani", "BITS Pilani"],
    "bits hyderabad": ["BITS Pilani Hyderabad Campus"],
    "bits goa":       ["BITS Pilani Goa Campus"],
    "vit vellore":    ["Vellore Institute of Technology"],
    "vit chennai":    ["Vellore Institute of Technology Chennai"],
    "srm chennai":    ["SRM Institute of Science and Technology"],
    "manipal":        ["Manipal Academy of Higher Education", "Manipal Institute of Technology"],
    "anna university":["Anna University"],
    "du":             ["University of Delhi", "Delhi University"],
    "ju":             ["Jadavpur University"],
    "ip university":  ["Guru Gobind Singh Indraprastha University"],
    "bhu":            ["Banaras Hindu University"],
    "amu":            ["Aligarh Muslim University"],
    "jamia":          ["Jamia Millia Islamia"],
    "jnu":            ["Jawaharlal Nehru University"],
    "iisc bangalore": ["Indian Institute of Science"],
    "xlri":           ["XLRI - Xavier School of Management"],
    "fms":            ["Faculty of Management Studies, University of Delhi"],
    "mdi gurgaon":    ["Management Development Institute, Gurgaon"],
    "sp jain":        ["S P Jain Institute of Management and Research"],
    "iift":           ["Indian Institute of Foreign Trade"],
    "isb":            ["Indian School of Business"],
    "nift":           ["National Institute of Fashion Technology"],
    "nid":            ["National Institute of Design"],
    "aiims delhi":    ["All India Institute of Medical Sciences, Delhi", "AIIMS Delhi"],
    "aiims":          ["All India Institute of Medical Sciences, New Delhi"],
    "cmc vellore":    ["Christian Medical College, Vellore"],
    "afmc":           ["Armed Forces Medical College, Pune"],
    "nlsiu":          ["National Law School of India University"],
    "nls bangalore":  ["National Law School of India University"],
    "nlu delhi":      ["National Law University, Delhi"],
    "nalsar":         ["NALSAR University of Law"],
    "iict":           ["Indian Institute of Chemical Technology"],
}

# Static fallback dataset for top Indian colleges (used when Wikipedia
# extract doesn't yield specific accreditation/rank info)
STATIC_FALLBACK: Dict[str, Dict[str, Any]] = {
    "indian institute of technology bombay":  {"type": "Public · Autonomous", "ranking": ["NIRF #3", "Tier-1 (IIT)"], "accreditation": ["UGC-recognised", "MoE Institute of Eminence"]},
    "indian institute of technology delhi":   {"type": "Public · Autonomous", "ranking": ["NIRF #2", "Tier-1 (IIT)"], "accreditation": ["UGC-recognised", "MoE Institute of Eminence"]},
    "indian institute of technology madras":  {"type": "Public · Autonomous", "ranking": ["NIRF #1", "Tier-1 (IIT)"], "accreditation": ["UGC-recognised", "MoE Institute of Eminence"]},
    "indian institute of technology kanpur":  {"type": "Public · Autonomous", "ranking": ["NIRF #4", "Tier-1 (IIT)"], "accreditation": ["UGC-recognised"]},
    "indian institute of technology kharagpur":{"type":"Public · Autonomous","ranking": ["NIRF #5", "Tier-1 (IIT)"], "accreditation": ["UGC-recognised"]},
    "indian institute of technology roorkee": {"type": "Public · Autonomous", "ranking": ["NIRF #6", "Tier-1 (IIT)"], "accreditation": ["UGC-recognised"]},
    "indian institute of technology guwahati":{"type": "Public · Autonomous", "ranking": ["NIRF #7", "Tier-1 (IIT)"], "accreditation": ["UGC-recognised"]},
    "indian institute of science":            {"type": "Public · Autonomous", "ranking": ["NIRF #1 (Research)", "Top Research Institute"], "accreditation": ["MoE Institute of Eminence", "NAAC A++"]},
    "indian institute of management ahmedabad":{"type":"Public · Autonomous","ranking": ["NIRF #1 (Management)", "Tier-1 (IIM)"], "accreditation": ["EQUIS", "AACSB"]},
    "indian institute of management bangalore":{"type":"Public · Autonomous","ranking": ["NIRF #2 (Management)", "Tier-1 (IIM)"], "accreditation": ["EQUIS", "AACSB", "AMBA"]},
    "indian institute of management calcutta": {"type":"Public · Autonomous","ranking": ["NIRF #3 (Management)", "Tier-1 (IIM)"], "accreditation": ["EQUIS", "AACSB", "AMBA"]},
    "birla institute of technology and science, pilani": {"type": "Private", "ranking": ["NIRF #25", "Tier-1 (Private)"], "accreditation": ["NAAC A", "UGC-recognised"]},
    "vellore institute of technology":        {"type": "Private", "ranking": ["NIRF #11", "Tier-1 (Private)"], "accreditation": ["NAAC A++", "UGC-recognised"]},
    "manipal academy of higher education":    {"type": "Private", "ranking": ["NIRF #15", "Tier-1 (Private)"], "accreditation": ["NAAC A+"]},
    "srm institute of science and technology":{"type": "Private", "ranking": ["NIRF #28"], "accreditation": ["NAAC A++"]},
    "anna university":                        {"type": "Public",  "ranking": ["NIRF #18", "Affiliating"], "accreditation": ["NAAC A++", "UGC-recognised"]},
    "university of delhi":                    {"type": "Public",  "ranking": ["NIRF #11 (University)"], "accreditation": ["MoE Institute of Eminence", "NAAC A+", "UGC-recognised"]},
    "banaras hindu university":               {"type": "Public",  "ranking": ["NIRF #5 (University)"], "accreditation": ["MoE Institute of Eminence", "NAAC A+"]},
    "jawaharlal nehru university":            {"type": "Public",  "ranking": ["NIRF #2 (University)"], "accreditation": ["NAAC A++", "UGC-recognised"]},
    "all india institute of medical sciences, delhi": {"type": "Public", "ranking": ["NIRF #1 (Medical)"], "accreditation": ["Institute of National Importance"]},
}


def _name_candidates(name: str) -> List[str]:
    """Generate up to ~4 alias candidates to query free APIs with."""
    if not name: return []
    norm = _normalize(name)
    candidates = [name.strip()]
    # alias lookup
    for key, aliases in COLLEGE_ALIASES.items():
        if key == norm or key in norm or norm in key:
            for a in aliases:
                if a not in candidates: candidates.append(a)
            break
    # Compact abbrev: "Indian Institute of Technology Bombay" → "IIT Bombay"
    abbrev_pattern = re.compile(r"^(indian|national|international) institute of (technology|management|science|information technology)\s*[,]?\s*(.+)$", re.I)
    m = abbrev_pattern.match(name.strip())
    if m:
        word = m.group(2).lower()
        abbr = {"technology":"IIT","management":"IIM","science":"IISc","information technology":"IIIT"}.get(word, "")
        if abbr:
            cand = f"{abbr} {m.group(3).strip()}"
            if cand not in candidates: candidates.append(cand)
    # Drop trailing comma-suffix
    if "," in name:
        head = name.split(",", 1)[0].strip()
        if head and head not in candidates: candidates.append(head)
    return candidates[:5]


async def _wikipedia_search(query: str) -> Optional[str]:
    """Use Wikipedia's full-text search to find the best matching page title."""
    if not query: return None
    try:
        async with httpx.AsyncClient(timeout=8.0) as c:
            r = await c.get("https://en.wikipedia.org/w/api.php",
                params={"action":"query","list":"search","srsearch":query,"srlimit":3,"format":"json"},
                headers={"User-Agent": WIKI_UA, "Accept": "application/json"})
            if r.status_code != 200: return None
            hits = ((r.json() or {}).get("query") or {}).get("search") or []
            if not hits: return None
            # Prefer titles that mention "Institute"/"University"/"College"
            for h in hits:
                t = h.get("title") or ""
                if re.search(r"institute|university|college|school", t, re.I):
                    return t
            return hits[0].get("title")
    except Exception:
        return None


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
    """Run all enrichment in parallel and merge.  Never raises.
    Tries multiple name aliases (full name, abbrev like 'IIT Bombay') to
    maximise hit rate on Hipolabs + Wikipedia.  Falls back to a static
    dataset of top Indian colleges if the free APIs return nothing useful.
    """
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
        "type":          "",
        "enrichment_status": "failed",
        "enrichment_sources": [],
    }
    if not name or len(name.strip()) < 3:
        return out

    candidates = _name_candidates(name)

    # ── 1) Hipolabs: try each alias, take first that returns results
    hipo = None
    for cand in candidates:
        hipo = await _hipolabs_lookup(cand)
        if hipo:
            break

    # ── 2) Wikipedia summary + extract: same alias loop
    wiki = None
    extract = ""
    chosen_title = ""
    for cand in candidates:
        w = await _wikipedia_summary(cand)
        if w and (w.get("extract") or w.get("title")):
            wiki = w
            chosen_title = w.get("title") or cand
            break
    # If summary still empty, use search API to find a likely page
    if not wiki:
        for cand in candidates:
            best = await _wikipedia_search(cand)
            if best:
                w = await _wikipedia_summary(best)
                if w and w.get("extract"):
                    wiki = w
                    chosen_title = best
                    break
    if chosen_title:
        extract = await _wikipedia_extract(chosen_title)

    # ── 3) Merge results
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

    # ── 4) Static fallback for top Indian colleges — fills in any missing fields
    static = STATIC_FALLBACK.get(_normalize(name)) or STATIC_FALLBACK.get(_normalize(chosen_title or "")) or {}
    if static:
        if not out["type"]:           out["type"] = static.get("type", "")
        # accreditation: merge & dedupe
        merged_acc = list(dict.fromkeys((out["accreditation"] or []) + static.get("accreditation", [])))
        out["accreditation"] = merged_acc
        # ranking: prefer static (curated) over heuristic
        if static.get("ranking"):
            out["ranking"] = list(dict.fromkeys(static["ranking"] + (out["ranking"] or [])))
        out["enrichment_sources"].append("curated")

    # Country fallback
    if not out["country"] and (IIT_RE.search(name) or NIT_RE.search(name) or IIM_RE.search(name) or "india" in lower_blob):
        out["country"] = "India"

    out["enrichment_status"] = (
        "enriched" if (hipo and wiki) else
        ("partial" if (hipo or wiki or static) else "failed")
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


@router.get("/colleges/search")
async def search_colleges_public(q: str = "", limit: int = 8):
    """Public college autocomplete for registration / onboarding forms.

    Matches by name substring AND common acronyms (e.g. "IIT" hits
    "Indian Institute of Technology Bombay", "NIT" hits National
    Institutes of Technology). Approved (active) colleges sort first;
    pending ones still appear so a user can register under a real
    institution awaiting admin verification. No auth required.
    """
    limit = max(1, min(int(limit or 8), 50))
    query = re.sub(r"[^a-z0-9]+", "", (q or "").lower())
    seen: Dict[str, Any] = {}

    def add(c: dict):
        if c.get("_id") and str(c["_id"]) not in seen:
            seen[str(c["_id"])] = c

    async def fetch_and_filter(match: Dict[str, Any], only_active: bool = False, cap: int = 500):
        m: Dict[str, Any] = dict(match)
        if only_active:
            m["status"] = "active"
        cur = _db.colleges.find(m).limit(cap)
        hits = 0
        async for c in cur:
            hits += 1
            name = c.get("name") or ""
            norm = c.get("normalized_name") or _normalize(name)
            flat = re.sub(r"[^a-z0-9]+", "", name.lower())
            initials = "".join(
                w[0] for w in re.findall(r"[a-z0-9]+", norm)
                if w not in {"of", "the", "and", "for", "a", "an", "in", "at", "on", "&"}
            )
            if (query in name.lower() or query in norm
                    or query in initials or query in flat):
                add(c)
        return hits

    if query:
        # 1) Direct name substring matches (any status)
        await fetch_and_filter({"name": {"$regex": re.escape(query), "$options": "i"}})
        # 2) Acronym / initials matches against active colleges
        await fetch_and_filter({}, only_active=True)
    else:
        # Empty query → curated pick of active colleges
        await fetch_and_filter({}, only_active=True, cap=limit)

    ranked = sorted(seen.values(), key=lambda c: ((c.get("status") != "active"), (c.get("name") or "").lower()))
    results = [{
        "id": str(c["_id"]),
        "name": c.get("name") or "",
        "city": c.get("city") or "",
        "state": c.get("state") or "",
        "country": c.get("country") or "",
        "status": c.get("status") or "pending",
    } for c in ranked[:limit]]
    return {"results": results, "count": len(results)}


@router.get("/admin/colleges/list")
async def list_colleges(
    status: Optional[str] = None,
    q: Optional[str] = None,
    page: int = 1,
    limit: int = 24,
    authorization: Optional[str] = Header(None),
):
    await _require_admin(authorization)

    match: Dict[str, Any] = {}
    if status and status != "all":
        match["status"] = status
    if q:
        match["name"] = {"$regex": re.escape(q), "$options": "i"}

    skip = (page - 1) * limit
    total = await _db.colleges.count_documents(match)
    cur = _db.colleges.find(match).sort([("created_at", -1), ("_id", -1)]).skip(skip).limit(limit)

    # Aggregate student counts by normalized college name
    name_to_id: Dict[str, str] = {}
    docs: List[dict] = []
    async for c in cur:
        docs.append(c)
        nn = c.get("normalized_name") or _normalize(c.get("name", ""))
        if nn:
            name_to_id[nn] = str(c["_id"])

    counts_pipeline = [
        {"$match": {"college": nonempty()}},
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
    return {"items": items, "total": total, "page": page, "limit": limit, "pages": max(1, (total + limit - 1) // limit), "counts": counts}


# ─── DEDUP: fuzzy duplicate detection & merge ─────────────────────
# Students are linked to colleges by the `users.college` string (matched
# case-insensitively against the college name), so a merge must also
# re-point those rows onto the surviving (primary) name.

_MERGE_FILL_FIELDS = (
    "city", "state", "country", "type", "website", "linkedin_url",
    "logo_url", "wiki_url", "description", "enrichment_status",
)
_MERGE_LIST_FIELDS = ("accreditation", "ranking", "specialties", "domains", "enrichment_sources")


def _levenshtein_capped(a: str, b: str, cap: int = 3) -> int:
    """Bounded Levenshtein distance. Returns cap+1 when the distance is
    known to exceed `cap` (early exit keeps it cheap on long names)."""
    if a == b:
        return 0
    if abs(len(a) - len(b)) > cap:
        return cap + 1
    if not a:
        return len(b)
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        row_min = i
        for j, cb in enumerate(b, 1):
            cost = 0 if ca == cb else 1
            v = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
            cur.append(v)
            row_min = min(row_min, v)
        if row_min > cap:
            return cap + 1
        prev = cur
    return prev[-1] if prev[-1] <= cap else cap + 1


def _jaro_winkler(a: str, b: str) -> float:
    """Jaro-Winkler similarity on lowercased strings (0..1)."""
    a, b = (a or "").lower(), (b or "").lower()
    if a == b:
        return 1.0
    la, lb = len(a), len(b)
    if la < 2 or lb < 2:
        return 1.0 if a == b else 0.0
    match_dist = max(la, lb) // 2 - 1
    match_dist = max(match_dist, 0)
    a_match = [False] * la
    b_match = [False] * lb
    matches = 0
    for i in range(la):
        lo = max(0, i - match_dist)
        hi = min(i + match_dist + 1, lb)
        for j in range(lo, hi):
            if b[j] == a[i] and not b_match[j]:
                a_match[i] = True
                b_match[j] = True
                matches += 1
                break
    if matches < 2:
        return 0.0
    trans = 0
    k = 0
    for i in range(la):
        if a_match[i]:
            while k < lb and not b_match[k]:
                k += 1
            if k < lb and a[i] != b[k]:
                trans += 1
            k += 1
    jaro = (matches / la + matches / lb + (matches - trans / 2) / matches) / 3
    prefix = 0
    for i in range(min(4, la, lb)):
        if a[i] == b[i]:
            prefix += 1
        else:
            break
    return jaro + 0.1 * prefix * (1 - jaro)


def _pair_confidence(a: str, b: str) -> float:
    """Score a pair of college names: 1.0 for exact normalized matches,
    else the Jaro-Winkler similarity, with a Levenshtein ≤ 3 floor so
    short typo-variants still qualify."""
    na, nb = _normalize(a), _normalize(b)
    if na and na == nb:
        return 1.0
    sim = _jaro_winkler(na, nb)
    lev = _levenshtein_capped(na, nb, cap=3)
    if lev <= 3 and sim < 0.92:
        sim = max(sim, 0.85 + (3 - lev) * 0.02)
    return round(sim, 4)


@router.get("/admin/colleges/duplicates")
async def find_duplicate_colleges(authorization: Optional[str] = Header(None)):
    """Group colleges whose names fuzzy-match (Jaro-Winkler ≥ 0.85 or
    Levenshtein ≤ 3 on the normalized name). Groups are returned sorted
    by confidence (highest first) so the likeliest duplicates lead.

    Pairwise comparison is bucketed by the first 4 normalized
    characters (with a full pass for names ≤ 6 chars) to keep it fast on
    large collections.
    """
    await _require_admin(authorization)

    docs: List[dict] = []
    async for c in _db.colleges.find({}):
        docs.append(c)

    parent: Dict[str, str] = {}

    def union(x: str, y: str) -> None:
        rx, ry = x, y
        while parent.get(rx, rx) != rx:
            rx = parent[rx]
        while parent.get(ry, ry) != ry:
            ry = parent[ry]
        if rx != ry:
            parent[rx] = ry

    by_id: Dict[str, dict] = {}
    for c in docs:
        cid = str(c["_id"])
        by_id[cid] = c

    def same_group(a: str, b: str) -> None:
        if _pair_confidence(by_id[a].get("name") or "", by_id[b].get("name") or "") >= 0.85:
            union(a, b)

    # Small collections: exact O(n²) pass so no candidate pair is missed.
    # Large collections: bucket by 4-char normalized prefix (+ cross pass
    # for short names ≤ 6 chars) to keep runtime bounded.
    ids_all = [str(c["_id"]) for c in docs]
    if len(docs) <= 1500:
        for i in range(len(ids_all)):
            for j in range(i + 1, len(ids_all)):
                same_group(ids_all[i], ids_all[j])
    else:
        buckets: Dict[str, List[str]] = {}
        short_norm: Dict[str, str] = {}
        for c in docs:
            cid = str(c["_id"])
            n = _normalize(c.get("name") or "")
            if len(n) > 6:
                buckets.setdefault(n[:4], []).append(cid)
            elif n:
                short_norm[cid] = n
        for ids in buckets.values():
            for i in range(len(ids)):
                for j in range(i + 1, len(ids)):
                    same_group(ids[i], ids[j])
        sids = list(short_norm)
        for i in range(len(sids)):
            for j in range(i + 1, len(sids)):
                same_group(sids[i], sids[j])
        for cid, n in short_norm.items():
            for key, b in buckets.items():
                if key.startswith(n):
                    for other in b:
                        same_group(cid, other)

    groups: List[Dict[str, Any]] = []
    grouped: Dict[str, List[str]] = {}
    for cid, root in parent.items():
        grouped.setdefault(root, []).append(cid)

    # student counts for every college in every group
    all_ids = [cid for cids in grouped.values() if len(cids) >= 2 for cid in cids]
    counts_map: Dict[str, int] = {}
    if all_ids:
        name_to_id: Dict[str, str] = {}
        for cid in all_ids:
            c = by_id[cid]
            nn = c.get("normalized_name") or _normalize(c.get("name", ""))
            if nn:
                name_to_id[nn] = cid
        try:
            cur = _db.users.aggregate([
                {"$match": {"college": nonempty()}},
                {"$group": {"_id": {"$toLower": "$college"}, "n": {"$sum": 1}}},
            ])
            async for r in cur:
                n = _normalize(r.get("_id") or "")
                if n in name_to_id:
                    counts_map[name_to_id[n]] = counts_map.get(name_to_id[n], 0) + int(r.get("n", 0))
        except Exception:
            counts_map = {}

    for cids in grouped.values():
        if len(cids) < 2:
            continue
        members = [by_id[i] for i in cids]
        # group confidence = weakest pair link
        confs = [
            _pair_confidence(m1.get("name") or "", m2.get("name") or "")
            for i, m1 in enumerate(members) for m2 in members[i + 1:]
        ]
        groups.append({
            "confidence": round(min(confs), 2),
            "colleges": [
                {**_serialize(m, counts_map.get(str(m["_id"]), 0)), "in_group": len(cids)}
                for m in members
            ],
        })
    groups.sort(key=lambda g: -g["confidence"])
    total = len(groups)
    groups = groups[:50]
    return {"ok": True, "total_groups": total, "groups": groups, "truncated": total > 50}


class MergeColleges(BaseModel):
    primary_id: str
    secondary_ids: List[str]


@router.post("/admin/colleges/merge")
async def merge_colleges(body: MergeColleges, authorization: Optional[str] = Header(None)):
    """Merge secondary college entries into a primary one.

    - Field fill: empty primary fields are backfilled from the
      secondaries (primary wins on conflicts); list fields
      (accreditation, ranking, specialties, domains, sources) are
      unioned, keeping the primary's order.
    - Students: users.college rows pointing at a secondary name are
      re-pointed at the primary name.
    - Secondaries are soft-archived to colleges_archive tagged
      `merged_into`, then removed from colleges.
    - Every merge is recorded in colleges_merge_audit.
    """
    user = await _require_admin(authorization)
    primary_id = (body.primary_id or "").strip()
    secondary_ids = [i for i in dict.fromkeys(body.secondary_ids or []) if i and i != primary_id][:25]
    if not primary_id or not secondary_ids:
        raise HTTPException(400, "primary_id and at least one secondary_id required")
    try:
        primary_oid = ObjectId(primary_id)
        oids = [ObjectId(i) for i in secondary_ids]
    except Exception:
        raise HTTPException(400, "Invalid id")
    primary = await _db.colleges.find_one({"_id": primary_oid})
    if not primary:
        raise HTTPException(404, "Primary college not found")

    now = datetime.now(timezone.utc)
    archived: List[Dict[str, str]] = []
    moved_students = 0
    for oid in oids:
        sec = await _db.colleges.find_one({"_id": oid})
        if not sec:
            continue
        fill: Dict[str, Any] = {}
        for f in _MERGE_FILL_FIELDS:
            if not primary.get(f) and sec.get(f):
                fill[f] = sec[f]
        for f in _MERGE_LIST_FIELDS:
            if not isinstance(sec.get(f), list):
                continue
            merged = list(dict.fromkeys((primary.get(f) or []) + [x for x in sec[f] if x]))
            if len(merged) > len(primary.get(f) or []):
                fill[f] = merged
        if fill:
            await _db.colleges.update_one({"_id": primary_oid}, {"$set": fill})
        variants = [v for v in (sec.get("name"), sec.get("normalized_name")) if v]
        if variants:
            try:
                res = await _db.users.update_many(
                    {"college": {"$in": variants}},
                    {"$set": {"college": primary.get("name") or ""}},
                )
                moved_students += int(res.get("modified_count") or 0)
            except Exception:
                pass
        sec["archived_at"] = now
        sec["archived_by"] = str(user["_id"])
        sec["merged_into"] = primary_id
        await _db.colleges_archive.insert_one(sec)
        await _db.colleges.delete_one({"_id": oid})
        archived.append({"id": str(oid), "name": sec.get("name") or ""})

    try:
        await _db.colleges_merge_audit.insert_one({
            "merged_at": now,
            "merged_by": str(user["_id"]),
            "primary_id": primary_id,
            "primary_name": primary.get("name") or "",
            "secondary": archived,
            "students_reassigned": moved_students,
        })
    except Exception:
        pass

    return {
        "ok": True,
        "primary_id": primary_id,
        "archived": archived,
        "students_reassigned": moved_students,
    }


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


class BulkColleges(BaseModel):
    action: str
    ids: List[str]


@router.post("/admin/colleges/bulk")
async def bulk_colleges(body: BulkColleges, authorization: Optional[str] = Header(None)):
    """Batch-apply a single action to many colleges at once.

    Actions: 'approve' (→ active), 'disable' (→ paused), 'delete'
    (soft-archive), or 'reenrich' (re-run enrichment). Processes ids
    sequentially and reports per-id outcomes so the UI can surface
    partial failures without aborting the whole batch.
    """
    user = await _require_admin(authorization)
    action = (body.action or "").strip()
    if action not in {"approve", "disable", "delete", "reenrich"}:
        raise HTTPException(400, "Unknown action")
    ids = [i for i in (body.ids or []) if i][:200]
    if not ids:
        raise HTTPException(400, "No college ids supplied")

    succeeded: List[str] = []
    failed: List[Dict[str, str]] = []
    now = datetime.now(timezone.utc)
    for cid in ids:
        try:
            oid = ObjectId(cid)
        except Exception:
            failed.append({"id": cid, "error": "Invalid id"})
            continue
        try:
            c = await _db.colleges.find_one({"_id": oid})
            if not c:
                failed.append({"id": cid, "error": "Not found"})
                continue
            if action == "approve":
                await _db.colleges.update_one(
                    {"_id": oid},
                    {"$set": {"status": "active", "approved_by": str(user["_id"]), "approved_at": now}},
                )
            elif action == "disable":
                await _db.colleges.update_one(
                    {"_id": oid},
                    {"$set": {"status": "paused", "disabled_at": now}},
                )
            elif action == "delete":
                c["archived_at"] = now
                c["archived_by"] = str(user["_id"])
                await _db.colleges_archive.insert_one(c)
                await _db.colleges.delete_one({"_id": oid})
            else:  # reenrich
                data = await _enrich(c.get("name") or "")
                for skip_field in ("status", "approved_by", "approved_at", "created_by", "created_at"):
                    data.pop(skip_field, None)
                await _db.colleges.update_one({"_id": oid}, {"$set": data})
            succeeded.append(cid)
        except Exception as e:
            failed.append({"id": cid, "error": str(e)})

    return {"ok": True, "action": action, "succeeded": succeeded, "failed": failed}


# ─── BACKFILL: onboard colleges for every existing imported user ──
@router.post("/admin/colleges/backfill")
async def backfill_colleges(authorization: Optional[str] = Header(None)):
    """
    Scan `users` collection for every distinct college name and ensure
    a matching `colleges` document exists.  Idempotent — only creates
    rows that don't already exist.  Returns a summary report.

    Also re-enriches any pre-existing college rows whose `enrichment_status`
    is 'failed' or 'pending' so the data fields catch up.
    """
    await _require_admin(authorization)

    # 1) Collect distinct college names from users (case-insensitive)
    pipeline = [
        {"$match": {"college": nonempty()}},
        {"$group": {"_id": {"$trim": {"input": "$college"}}}},
    ]
    distinct_names: List[str] = []
    async for row in _db.users.aggregate(pipeline):
        nm = (row.get("_id") or "").strip()
        if nm:
            distinct_names.append(nm)

    created_ids: List[str] = []
    skipped = 0
    reenriched = 0
    failed: List[str] = []

    # 2) For each name, ensure a colleges row exists
    for nm in distinct_names:
        try:
            cid = await ensure_college(nm, created_by="backfill")
            if not cid:
                continue
            existing = await _db.colleges.find_one({"_id": ObjectId(cid)})
            if not existing:
                continue
            # newly inserted ones will already have a background enrichment task
            if existing.get("created_by") == "backfill" and existing.get("enrichment_status") == "pending":
                created_ids.append(cid)
            else:
                # already existed: re-enrich if previously failed
                status_ = existing.get("enrichment_status")
                if status_ in (None, "failed", "pending"):
                    data = await _enrich(existing.get("name") or "")
                    for skip_field in ("status", "approved_by", "approved_at", "created_by", "created_at"):
                        data.pop(skip_field, None)
                    await _db.colleges.update_one({"_id": ObjectId(cid)}, {"$set": data})
                    reenriched += 1
                else:
                    skipped += 1
        except Exception as e:
            failed.append(f"{nm}: {e}")

    # 3) Also re-enrich any colleges in the DB whose status is still failed
    cur = _db.colleges.find({"enrichment_status": {"$in": [None, "failed"]}})
    async for c in cur:
        try:
            data = await _enrich(c.get("name") or "")
            for skip_field in ("status", "approved_by", "approved_at", "created_by", "created_at"):
                data.pop(skip_field, None)
            await _db.colleges.update_one({"_id": c["_id"]}, {"$set": data})
            reenriched += 1
        except Exception:
            pass

    return {
        "ok": True,
        "distinct_names_in_users": len(distinct_names),
        "newly_created":           len(created_ids),
        "reenriched_existing":     reenriched,
        "already_complete":        skipped,
        "failed":                  failed[:10],
    }
