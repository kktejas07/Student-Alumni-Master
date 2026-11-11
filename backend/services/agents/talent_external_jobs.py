"""
talent_external_jobs.py — TP28/TP29: external job boards (Naukri + Internshala).

House pattern:
- `scrape_external_jobs(db, source)` first attempts a live fetch against the
  board's semi-public search endpoint when the board is enabled (an
  installed_tools credential row, or the NAUKRI_LIVE / INTERNSHALA_LIVE env
  opt-in). Without credentials it does NOT scrape — it stores a curated
  static catalog of realistic openings so the "External Jobs" tab is never
  empty. Every static doc carries source="static" and the note
  "curated fallback catalog — connect API key for live data".
- One source's failure never kills the other: `fetch_external_jobs` runs
  both sources in isolated try/excepts and returns per-source results.
- Each stored listing is auto-matched to the top-10 candidates, preferring
  `services.agents.talent_match_engine.match_candidates` (TP18) and falling
  back to direct skill-overlap ranking against talent_pool via the
  canonical skill taxonomy.
- Internshala listings carry a `deadline`; `deadline_alerts` surfaces the
  internships closing within N days.
- Listing status flips to "expired" once the deadline has passed.

Collection: db.external_job_listings — doc shape:
    {id: "ej_<board>_<item>", board: "naukri"|"internshala",
     source: "naukri"|"internshala"|"static", title, company, skills[],
     experience_min, experience_max, location, salary_text, url,
     posted_at: datetime(UTC), deadline?: datetime(UTC) (internshala),
     raw: <trimmed source payload>, fetched_at: datetime(UTC),
     matched: {candidates: [{id, name, score}, top-10], computed_at, method},
     status: "active"|"expired", note? (static docs)}

All timestamps written to Mongo are timezone-aware UTC datetimes.
"""
from __future__ import annotations

import json
import logging
import os
import re
import urllib.parse
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx

from services.agents.talent_common import agent_run_log, as_datetime, import_optional, log_activity, now_utc
from services.agents.talent_skill_taxonomy import canonicalize_skills, normalize_skill

logger = logging.getLogger("talent_external_jobs")

_UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
       "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")
_EXPERIENCE_RE = re.compile(r"(\d+)\s*(?:to|-|–)\s*(\d+)")


def _pick(d: Dict[str, Any], *keys: str) -> Any:
    """First non-empty value among `keys` (defensive — board APIs reshape often)."""
    if not isinstance(d, dict):
        return None
    for k in keys:
        v = d.get(k)
        if v not in (None, ""):
            return v
    return None


def _parse_experience(text: Any) -> Tuple[int, int]:
    s = str(text or "").strip()
    m = _EXPERIENCE_RE.search(s)
    if m:
        return int(m.group(1)), int(m.group(2))
    m2 = re.search(r"(\d+)", s)
    if m2:
        return int(m2.group(1)), int(m2.group(1))
    return 0, 0


def _slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (s or "job").lower()).strip("-")[:40] or "job"


def _parse_deadline(text: Any) -> Optional[datetime]:
    """Best-effort parse of board deadline strings ("Jul 10, 2026", ISO, epoch)."""
    if not text:
        return None
    s = str(text).strip()
    dp = import_optional("dateparser")
    if dp:
        try:
            d = dp.parse(s)
            if d:
                return d.astimezone(timezone.utc) if d.tzinfo else d.replace(tzinfo=timezone.utc)
        except Exception:
            pass
    try:
        d = datetime.fromisoformat(s.replace("Z", "+00:00"))
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except Exception:
        return as_datetime(s)


# ── static fallback catalogs (used only when a board is not credentialed) ─

_NAUKRI_STATIC: List[Dict[str, Any]] = [
    {"n": 1, "title": "Senior Python Engineer", "company": "Razorpay",
     "skills": ["Python", "FastAPI", "PostgreSQL", "Redis", "AWS", "Docker", "Kubernetes"],
     "experience_min": 3, "experience_max": 7, "location": "Bengaluru", "salary_text": "₹28-42 LPA"},
    {"n": 2, "title": "React Native Developer", "company": "Ubon Analytics",
     "skills": ["React Native", "Expo", "TypeScript", "Node.js", "GraphQL", "Firebase"],
     "experience_min": 2, "experience_max": 6, "location": "Bengaluru", "salary_text": "₹18-30 LPA"},
    {"n": 3, "title": "MERN Full Stack Developer", "company": "Freshworks",
     "skills": ["MongoDB", "Node.js", "React", "TypeScript", "REST API", "AWS"],
     "experience_min": 1, "experience_max": 4, "location": "Hyderabad", "salary_text": "₹10-18 LPA"},
    {"n": 4, "title": "DevOps Engineer", "company": "Netmagic",
     "skills": ["AWS", "Docker", "Kubernetes", "Terraform", "Jenkins", "GitHub Actions", "Linux"],
     "experience_min": 3, "experience_max": 8, "location": "Pune", "salary_text": "₹20-35 LPA"},
    {"n": 5, "title": "Data Engineer", "company": "Sprinklr",
     "skills": ["Python", "Spark", "Kafka", "Airflow", "PostgreSQL", "AWS S3"],
     "experience_min": 2, "experience_max": 6, "location": "Bengaluru", "salary_text": "₹16-26 LPA"},
    {"n": 6, "title": "Backend Engineer (FastAPI / Node)", "company": "CRED",
     "skills": ["Python", "FastAPI", "Node.js", "MongoDB", "Redis", "Kafka"],
     "experience_min": 2, "experience_max": 5, "location": "Bengaluru", "salary_text": "₹22-38 LPA"},
    {"n": 7, "title": "Frontend Engineer (React / Next.js)", "company": "Yubiko India",
     "skills": ["React", "Next.js", "TypeScript", "UI/UX Design", "GraphQL"],
     "experience_min": 1, "experience_max": 4, "location": "Remote", "salary_text": "₹12-24 LPA"},
    {"n": 8, "title": "Machine Learning Engineer", "company": "Sprinklr",
     "skills": ["Machine Learning", "PyTorch", "TensorFlow", "Pandas", "NumPy", "scikit-learn"],
     "experience_min": 2, "experience_max": 6, "location": "Bengaluru", "salary_text": "₹24-40 LPA"},
    {"n": 9, "title": "QA Automation Engineer", "company": "Zoho",
     "skills": ["Python", "Unit Testing", "CI/CD", "REST API", "Linux"],
     "experience_min": 2, "experience_max": 5, "location": "Chennai", "salary_text": "₹9-16 LPA"},
    {"n": 10, "title": "Android Developer", "company": "Ubon Analytics",
     "skills": ["Android Development", "Kotlin", "Java", "Firebase", "REST API"],
     "experience_min": 2, "experience_max": 6, "location": "Bengaluru", "salary_text": "₹14-26 LPA"},
    {"n": 11, "title": "Cloud Engineer", "company": "Netmagic",
     "skills": ["AWS EC2", "AWS S3", "Kubernetes", "Helm", "Docker", "Nginx"],
     "experience_min": 3, "experience_max": 7, "location": "Pune", "salary_text": "₹18-32 LPA"},
    {"n": 12, "title": "Full Stack Engineer (MERN)", "company": "CRED",
     "skills": ["MongoDB", "Node.js", "React", "Next.js", "TypeScript", "Redis"],
     "experience_min": 1, "experience_max": 3, "location": "Bengaluru", "salary_text": "₹15-28 LPA"},
]

_INTERNSHALA_STATIC: List[Dict[str, Any]] = [
    {"n": 1, "title": "Frontend Intern (React)", "company": "Ubon Analytics",
     "skills": ["React", "JavaScript", "UI/UX Design"],
     "location": "Bengaluru", "salary_text": "₹15,000/month", "deadline_days": 34},
    {"n": 2, "title": "Python Backend Intern", "company": "Sprinklr",
     "skills": ["Python", "FastAPI", "MongoDB", "Docker"],
     "location": "Bengaluru", "salary_text": "₹20,000/month", "deadline_days": 21},
    {"n": 3, "title": "Data Science Intern", "company": "Freshworks",
     "skills": ["Python", "Pandas", "Machine Learning", "Tableau"],
     "location": "Hyderabad", "salary_text": "₹18,000/month", "deadline_days": 45},
    {"n": 4, "title": "Android App Development Intern", "company": "Yubiko India",
     "skills": ["Android Development", "Kotlin", "Firebase"],
     "location": "Bengaluru", "salary_text": "₹20,000/month", "deadline_days": 12},
    {"n": 5, "title": "UI/UX Design Intern", "company": "Zoho",
     "skills": ["Figma", "UI/UX Design"],
     "location": "Chennai", "salary_text": "₹15,000/month", "deadline_days": 28},
    {"n": 6, "title": "Full Stack Intern (MERN)", "company": "CRED",
     "skills": ["MongoDB", "Node.js", "React", "Express.js"],
     "location": "Bengaluru", "salary_text": "₹25,000/month", "deadline_days": 9},
    {"n": 7, "title": "DevOps / Cloud Intern", "company": "Netmagic",
     "skills": ["AWS", "Docker", "Kubernetes", "Linux"],
     "location": "Pune", "salary_text": "₹18,000/month", "deadline_days": 40},
    {"n": 8, "title": "Machine Learning Intern", "company": "Sprinklr",
     "skills": ["Machine Learning", "PyTorch", "scikit-learn", "NumPy"],
     "location": "Bengaluru", "salary_text": "₹30,000/month", "deadline_days": 55},
    {"n": 9, "title": "QA Testing Intern", "company": "Razorpay",
     "skills": ["Unit Testing", "Python", "REST API"],
     "location": "Bengaluru", "salary_text": "₹15,000/month", "deadline_days": 6},
    {"n": 10, "title": "Content & SEO Marketing Intern", "company": "Freshworks",
     "skills": ["Agile", "REST API"],
     "location": "Remote", "salary_text": "₹12,000/month", "deadline_days": 60},
    {"n": 11, "title": "Mobile App Intern (Flutter)", "company": "Ubon Analytics",
     "skills": ["Dart", "Android Development", "Firebase"],
     "location": "Bengaluru", "salary_text": "₹16,000/month", "deadline_days": 17},
    {"n": 12, "title": "LLM / GenAI Intern", "company": "CRED",
     "skills": ["LLM Engineering", "Python", "RAG", "Prompt Engineering"],
     "location": "Bengaluru", "salary_text": "₹35,000/month", "deadline_days": 5},
]


def _static_items(board: str, now: datetime) -> List[Dict[str, Any]]:
    """Materialize the static catalog into storage-shaped items (deadlines relative to now)."""
    out: List[Dict[str, Any]] = []
    for row in (_NAUKRI_STATIC if board == "naukri" else _INTERNSHALA_STATIC):
        item: Dict[str, Any] = {
            "id": f"ej_{board}_static_{row['n']:02d}",
            "board": board,
            "static": True,
            "title": row["title"],
            "company": row["company"],
            "skills_raw": row["skills"],
            "experience_min": row.get("experience_min", 0),
            "experience_max": row.get("experience_max", 0),
            "location": row.get("location"),
            "salary_text": row.get("salary_text"),
            "url": None,
            "posted_at": now,
            "raw": {"catalog": "curated", "curated_opening": row["title"]},
        }
        if board == "internshala":
            item["deadline"] = now + timedelta(days=int(row.get("deadline_days", 30)))
        out.append(item)
    return out


# ── credential / enablement resolution ────────────────────────────

async def _board_credentials(db, board: str) -> Optional[Dict[str, Any]]:
    """installed_tools row for the board; env NAUKRI_LIVE / INTERNSHALA_LIVE forces live."""
    if os.getenv(f"{board.upper()}_LIVE") == "1":
        return {"enabled": True, "api_key": os.getenv(f"{board.upper()}_API_KEY"),
                "default_query": os.getenv(f"{board.upper()}_DEFAULT_QUERY") or ("python developer" if board == "naukri" else "internship")}
    doc = await db.installed_tools.find_one({"tool_id": board, "status": "connected"})
    if not doc:
        return None
    creds = doc.get("credentials") or {}
    return {
        "enabled": True,
        "api_key": creds.get("api_key"),
        "base_url": creds.get("base_url"),
        "default_query": creds.get("default_query"),
    }


# ── live spiders (defensive — both boards' APIs reshape without notice) ─

async def _live_naukri(creds: Dict[str, Any], query: str, limit: int) -> List[Dict[str, Any]]:
    headers = {"User-Agent": _UA, "Accept": "application/json"}
    if creds.get("api_key"):
        headers["Authorization"] = f"Bearer {creds['api_key']}"
    base = creds.get("base_url") or "https://internals.naukri.com/api/jsearchsearch/get"
    params = {"txt": query, "q": query, "keyword": query, "pg": 1, "page": 1}
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(base, params=params, headers=headers)
        r.raise_for_status()
        payload = r.json()

    cards = payload
    if isinstance(payload, dict):
        for key in ("data", "jobs", "jobCards"):
            v = payload.get(key)
            if isinstance(v, list):
                cards = v
                break
            if isinstance(v, dict) and isinstance(v.get("jobs"), list):
                cards = v["jobs"]
                break
    items: List[Dict[str, Any]] = []
    for j in (cards or [])[:limit]:
        if not isinstance(j, dict):
            continue
        title = str(_pick(j, "title", "jobTitle") or "").strip() or "Job opening"
        company = _pick(j, "companyDisplayName", "orgDisplayName", "companyName", "company")
        if isinstance(company, dict):
            company = company.get("name")
        skills_raw = _pick(j, "skillSet", "skills", "requiredSkills")
        if isinstance(skills_raw, str):
            s = skills_raw.strip()
            if s.startswith("["):
                try:
                    skills_raw = json.loads(s)
                except Exception:
                    skills_raw = [x.strip() for x in s.replace(";", ",").split(",") if x.strip()]
            else:
                skills_raw = [x.strip() for x in s.replace(";", ",").split(",") if x.strip()]
        exp_min, exp_max = _parse_experience(_pick(j, "avgExperience", "experience"))
        url = str(_pick(j, "url", "jobUrl") or "").strip() or \
            f"https://www.naukri.com/search?txt={urllib.parse.quote(title[:60])}"
        job_id = str(_pick(j, "jobId", "id", "_id") or _slugify(title))
        items.append({
            "id": f"ej_naukri_{job_id}",
            "board": "naukri",
            "title": title,
            "company": str(company or "Unknown"),
            "skills_raw": skills_raw or [],
            "experience_min": exp_min,
            "experience_max": exp_max,
            "location": str(_pick(j, "city", "location", "workLocation") or "").strip() or None,
            "salary_text": str(_pick(j, "salary", "ctc") or "").strip() or None,
            "url": url,
            "posted_at": as_datetime(_pick(j, "date", "postedAt", "created_at")) or now_utc(),
            "raw": json.dumps(j)[:2000],
        })
    return items


async def _live_internshala(creds: Dict[str, Any], query: str, limit: int) -> List[Dict[str, Any]]:
    headers = {"User-Agent": _UA, "Accept": "application/json", "Referer": "https://internshala.com"}
    base = creds.get("base_url") or "https://internshala.com/company/api/search-internships/"
    params = {"keyword": query, "page": 1}
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(base, params=params, headers=headers)
        r.raise_for_status()
        payload = r.json()

    data = payload.get("data") if isinstance(payload, dict) else payload
    cards = data if isinstance(data, list) else (data.get("results") if isinstance(data, dict) else [])
    items: List[Dict[str, Any]] = []
    for j in (cards or [])[:limit]:
        if not isinstance(j, dict):
            continue
        title = str(_pick(j, "title", "internshipTitle") or "").strip() or "Internship"
        company = _pick(j, "company", "companyName")
        if isinstance(company, dict):
            company = company.get("name")
        url = str(_pick(j, "internshala_link", "url") or "").strip() or \
            f"https://internshala.com/search-internships.php?q={urllib.parse.quote(title[:40])}"
        item_id = str(_pick(j, "id", "_id") or _slugify(title))
        items.append({
            "id": f"ej_internshala_{item_id}",
            "board": "internshala",
            "title": title,
            "company": str(company or "Unknown"),
            "skills_raw": _pick(j, "skills", "required_skills") or [],
            "experience_min": 0,
            "experience_max": 1,
            "location": str(_pick(j, "location", "city") or "").strip() or None,
            "salary_text": str(_pick(j, "stipend", "salary_text") or "").strip() or None,
            "url": url,
            "posted_at": as_datetime(_pick(j, "created_at", "date")) or now_utc(),
            "deadline": _parse_deadline(_pick(j, "deadline", "apply_deadline", "last_date_to_apply")),
            "raw": json.dumps(j)[:2000],
        })
    return items


# ── auto-match: TP18 engine first, direct skill overlap as the real fallback ─

async def _match_candidates(db, skills: List[str], limit: int = 10) -> Dict[str, Any]:
    listing = set(skills or [])
    try:
        from services.agents.talent_match_engine import match_candidates
        res = await match_candidates(db, required_skills=list(skills or []), limit=limit)
        cands = []
        for c in (res.get("candidates") or [])[:limit]:
            cands.append({
                "id": str(c.get("id") or c.get("candidate_id") or ""),
                "name": c.get("full_name") or c.get("name"),
                "score": c.get("score") or c.get("match_score_pct") or c.get("match_score") or 0,
            })
        return {"candidates": cands, "computed_at": now_utc().isoformat(), "method": "match_engine"}
    except Exception:
        pass
    # Fallback: rank active talent_pool docs by canonical skill overlap.
    docs = await db.talent_pool.find(
        {"is_active": True}, {"id": 1, "full_name": 1, "skills": 1}
    ).to_list(5000)
    scored: List[Dict[str, Any]] = []
    for p in docs:
        cset = set()
        for s in p.get("skills") or []:
            c, _m = normalize_skill(s)
            if c:
                cset.add(c.lower())
        inter = len(cset & listing)
        if inter:
            scored.append({
                "id": str(p.get("id") or p["_id"]),
                "name": p.get("full_name"),
                "score": round(inter / max(1, len(listing)), 2),
            })
    scored.sort(key=lambda x: x["score"], reverse=True)
    return {"candidates": scored[:limit], "computed_at": now_utc().isoformat(), "method": "skill_overlap"}


# ── public API ────────────────────────────────────────────────────

async def scrape_external_jobs(db, source: str, query: Optional[str] = None, limit: int = 20) -> Dict[str, Any]:
    """Fetch + store + auto-match one board. One source's failure is self-contained.

    Returns {"source", "fetched", "stored", "live": bool, "error": str|None}.
    Without credentials (and without the *_LIVE env opt-in) it stores the
    curated static catalog instead of scraping; `live` is False in that case.
    """
    if source not in ("naukri", "internshala"):
        return {"source": source, "fetched": 0, "stored": 0, "live": False,
                "error": "unknown source (expected 'naukri' or 'internshala')"}
    started = now_utc()
    t0 = started.timestamp()
    creds = await _board_credentials(db, source)
    q = query or (creds or {}).get("default_query") or ("python developer" if source == "naukri" else "internship")

    error: Optional[str] = None
    items: List[Dict[str, Any]] = []
    live = False
    if creds:
        try:
            items = await (_live_naukri(creds, q, limit) if source == "naukri"
                          else _live_internshala(creds, q, limit))
            live = True
        except Exception as e:
            error = f"live fetch failed: {str(e)[:300]}"
            items = []
    if not items:
        items = _static_items(source, started)
        live = False
        if not error:
            error = "no credentials — curated static catalog stored"

    stored = 0
    for it in items:
        skills = await canonicalize_skills(db, it.get("skills_raw") or [], source=f"external:{source}")
        deadline = it.get("deadline")
        matched = await _match_candidates(db, skills, limit=10)
        doc: Dict[str, Any] = {
            "id": it["id"],
            "board": source,
            "source": "static" if it.get("static") else source,
            "title": it["title"],
            "company": it.get("company"),
            "skills": skills,
            "experience_min": it.get("experience_min", 0),
            "experience_max": it.get("experience_max", 0),
            "location": it.get("location"),
            "salary_text": it.get("salary_text"),
            "url": it.get("url"),
            "posted_at": it.get("posted_at") or started,
            "raw": it.get("raw") or {},
            "fetched_at": started,
            "matched": matched,
            "status": "expired" if (deadline and deadline < started) else "active",
        }
        if deadline:
            doc["deadline"] = deadline
        if it.get("static"):
            doc["note"] = "curated fallback catalog — connect API key for live data"
        await db.external_job_listings.update_one({"id": doc["id"]}, {"$set": doc}, upsert=True)
        stored += 1

    status = "SUCCESS" if stored else "FAILED"
    await agent_run_log(db, "external_jobs", f"scrape:{source}", status=status,
                        detail={"fetched": len(items), "stored": stored, "live": live},
                        duration_ms=int((now_utc().timestamp() - t0) * 1000),
                        error=error)
    if stored:
        await log_activity(db, f"agent:external_jobs", "Sync",
                           object_id=f"board:{source}", object_type="JobBoard",
                           summary=f"{source}: stored {stored} listings ({'live' if live else 'static catalog'})",
                           collection="external_job_listings")
    return {"source": source, "fetched": len(items), "stored": stored, "live": live, "error": error}


async def fetch_external_jobs(db, query: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
    """Run both boards isolated from each other — one failure never kills the other."""
    results = []
    for board in ("naukri", "internshala"):
        try:
            results.append(await scrape_external_jobs(db, board, query=query, limit=limit))
        except Exception as e:  # self-contained per board
            results.append({"source": board, "fetched": 0, "stored": 0, "live": False,
                           "error": f"unexpected: {str(e)[:300]}"})
    return results


async def list_external_jobs(db, board: Optional[str] = None, include_expired: bool = True, limit: int = 100) -> Dict[str, Any]:
    """Admin 'External Jobs' tab listing, newest first."""
    q: Dict[str, Any] = {}
    if board:
        q["board"] = board
    if not include_expired:
        q["status"] = "active"
    docs = await db.external_job_listings.find(q).sort("fetched_at", -1).limit(limit).to_list(limit)
    items = []
    for d in docs:
        items.append({
            "id": d.get("id"),
            "board": d.get("board"),
            "source": d.get("source"),
            "title": d.get("title"),
            "company": d.get("company"),
            "skills": d.get("skills", []),
            "experience_min": d.get("experience_min"),
            "experience_max": d.get("experience_max"),
            "location": d.get("location"),
            "salary_text": d.get("salary_text"),
            "url": d.get("url"),
            "deadline": d.get("deadline").isoformat() if d.get("deadline") else None,
            "status": d.get("status"),
            "note": d.get("note"),
            "fetched_at": d.get("fetched_at").isoformat() if d.get("fetched_at") else None,
            "matched": d.get("matched") or {},
        })
    return {"board": board, "count": len(items), "listings": items}


async def deadline_alerts(db, days: int = 7) -> Dict[str, Any]:
    """Internships closing within `days` days (deadline >= now)."""
    now = now_utc()
    docs = await db.external_job_listings.find({
        "board": "internshala",
        "status": "active",
        "deadline": {"$gte": now, "$lte": now + timedelta(days=days)},
    }).sort("deadline", 1).to_list(200)
    alerts = []
    for d in docs:
        dl = d.get("deadline")
        days_left = (dl - now).days if dl else None
        alerts.append({
            "id": d.get("id"),
            "title": d.get("title"),
            "company": d.get("company"),
            "location": d.get("location"),
            "salary_text": d.get("salary_text"),
            "url": d.get("url"),
            "deadline": dl.isoformat() if dl else None,
            "days_left": days_left,
        })
    return {"window_days": days, "count": len(alerts), "alerts": alerts}


async def agent_status(db) -> Dict[str, Any]:
    """Dashboard 'Agents' card entries for TP28 + TP29 (all OSS → $0/mo)."""
    entries = []
    for board, label in (("naukri", "TP28 Naukri Board"), ("internshala", "TP29 Internshala Board")):
        live_last = await db.external_job_listings.find_one(
            {"board": board, "source": board}, sort=[("fetched_at", -1)])
        static_last = await db.external_job_listings.find_one(
            {"board": board, "source": "static"}, sort=[("fetched_at", -1)])
        active = await db.external_job_listings.count_documents({"board": board, "status": "active"})
        if live_last:
            status, live, last = "ok", True, live_last.get("fetched_at")
        elif static_last:
            status, live, last = "fallback_catalog", False, static_last.get("fetched_at")
        else:
            status, live, last = "idle", False, None
        entries.append({
            "name": label,
            "group": "integrations",
            "priority": "P2",
            "status": status,
            "live": live,
            "last_fetch_at": last.isoformat() if last else None,
            "active_listings": active,
            "est_cost_per_month": "$0",
        })
    return {"agents": entries}


class ExternalJobsAgent:
    """House singleton so the scheduler/router can hold one instance."""
    agent_id = "external_jobs"

    def __init__(self) -> None:
        self.db = None

    async def run(self, db, query: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        self.db = db
        return await fetch_external_jobs(db, query=query, limit=limit)


external_jobs_agent = ExternalJobsAgent()
