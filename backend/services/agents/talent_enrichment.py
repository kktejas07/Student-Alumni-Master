"""
talent_enrichment.py — TP15 (LinkedIn) + TP16 (GitHub) real enrichment agents.

TP15 wraps the existing Proxycurl / LinkedIn-OAuth client in
features/linkedin_sync.py (never rewrites it). Every successful fetch is
audited to talent_pool_raw_scrapes before the real fields are applied to the
talent_pool doc. A Mongo-backed hourly counter in api_rate_limits enforces
the 100/hr Proxycurl budget; when exhausted the call returns reason=
"rate_limit" (no blocking, no sleeps, no fabricated data).

TP16 pulls the real GitHub profile: user (name/location/bio/followers),
top-5 public repos by stars, language breakdown, and an EXPLAINABLE
developer-strength score 0-100 whose factor breakdown is stored so the UI
can show WHY a candidate scored the way they did. PyGithub is used when
available + a token exists; otherwise the public GitHub REST API via httpx
(authenticated if a token is present, 60/hr unauthenticated budget).

Honest-degradation contract: when credentials/network are absent every
public function returns an explicit `reason` — never fabricated profile data.
"""
from __future__ import annotations

import asyncio
import logging
import os
import re
from datetime import timedelta
from typing import Any, Dict, List, Optional

import httpx

from services.agents.talent_common import (
    agent_run_log,
    as_datetime,
    import_optional,
    log_activity,
    now_utc,
    normalize_text,
)
from services.agents.talent_skill_taxonomy import canonicalize_skills, ensure_taxonomy

logger = logging.getLogger("talent_enrichment")

PROXYCURL_LIMIT_PER_HOUR = 100
GITHUB_LIMIT_PER_HOUR = 60
GITHUB_TIMEOUT = 20


# ── helpers ─────────────────────────────────────────────────────────

async def _api_gate(db, key: str, limit: int) -> bool:
    """Per-hour Mongo counter gate. True = call allowed (slot reserved)."""
    window_start = now_utc().replace(minute=0, second=0, microsecond=0)
    doc = await db.api_rate_limits.find_one({"key": key, "window_start": window_start})
    if doc is None:
        try:
            await db.api_rate_limits.insert_one(
                {"key": key, "window_start": window_start, "count": 0}
            )
            doc = await db.api_rate_limits.find_one(
                {"key": key, "window_start": window_start}
            )
        except Exception:
            # lost the race on insert — the racing caller already owns a slot
            return True
    if doc and doc.get("count", 0) >= limit:
        return False
    await db.api_rate_limits.update_one(
        {"key": key, "window_start": window_start}, {"$inc": {"count": 1}}
    )
    return True


async def _github_token(db) -> Optional[str]:
    doc = await db.installed_tools.find_one(
        {"tool_id": "github", "status": "connected"}
    )
    creds = (doc or {}).get("credentials") or {}
    tok = (
        creds.get("token")
        or creds.get("api_key")
        or os.environ.get("GITHUB_TOKEN")
        or ""
    ).strip()
    return tok or None


async def _log_raw_scrape(
    db,
    profile_id: Optional[str],
    source: str,
    api: str,
    username: Optional[str],
    raw: Any,
) -> None:
    """Audit row. Never raises — the fetch already happened, the audit is
    best-effort but must not take the enrichment down."""
    try:
        await db.talent_pool_raw_scrapes.insert_one({
            "profile_id": profile_id,
            "source": source,
            "api": api,
            "username": username,
            "raw": raw,
            "fetched_at": now_utc(),
        })
    except Exception as e:
        logger.warning("raw-scrape audit write failed (%s/%s): %s", source, api, e)


def _find_profile(db, profile_id: str):
    """Returns an async closure that resolves a talent_pool doc by its
    business `id` first, falling back to a raw `_id` (ObjectId-safe)."""
    async def _lookup() -> Optional[Dict[str, Any]]:
        p = await db.talent_pool.find_one({"id": profile_id})
        if p:
            return p
        try:
            from bson import ObjectId, InvalidId
            return await db.talent_pool.find_one({"_id": ObjectId(profile_id)})
        except (InvalidId, TypeError):
            return None
    return _lookup


def _extract_github_username(url: Optional[str]) -> Optional[str]:
    m = re.search(r"github\.com/([a-zA-Z0-9_-]+)", url or "", re.IGNORECASE)
    return m.group(1) if m else None


# ── TP15: LinkedIn (Proxycurl / LinkedIn API) ───────────────────────

async def fetch_linkedin(db, linkedin_url: str) -> Dict[str, Any]:
    """Fetch real LinkedIn profile data.

    Returns:
      {"enriched": bool,
       "reason": None|"no_username"|"no_credentials"|"rate_limit"|"fetch_failed",
       "username": str|None,
       "data": {...}|None,
       "via": "proxycurl"|"linkedin_api"|None}
    """
    # Lazy imports keep module import crash-free and avoid import cycles.
    from features.linkedin_sync import (
        _extract_username,
        _get_linkedin_api_creds,
        _get_proxycurl_key,
        enrich_profile_via_linkedin_api,
        enrich_profile_via_proxycurl,
    )

    username = _extract_username(normalize_text(linkedin_url))
    if not username:
        return {"enriched": False, "reason": "no_username",
                "username": None, "data": None, "via": None}

    pc_key = await _get_proxycurl_key()
    if pc_key:
        if not await _api_gate(db, "proxycurl", PROXYCURL_LIMIT_PER_HOUR):
            return {"enriched": False, "reason": "rate_limit",
                    "username": username, "data": None, "via": "proxycurl"}
        data = await enrich_profile_via_proxycurl(linkedin_url, pc_key)
        if data:
            await _log_raw_scrape(db, None, "proxycurl", "proxycurl", username, data)
            return {"enriched": True, "reason": None,
                    "username": username, "data": data, "via": "proxycurl"}

    creds = await _get_linkedin_api_creds()
    if creds.get("client_id"):
        data = await enrich_profile_via_linkedin_api(
            linkedin_url, creds["client_id"], creds["client_secret"]
        )
        if data:
            await _log_raw_scrape(db, None, "linkedin_api", "linkedin_oauth", username, data)
            return {"enriched": True, "reason": None,
                    "username": username, "data": data, "via": "linkedin_api"}

    if not pc_key and not creds.get("client_id"):
        return {"enriched": False, "reason": "no_credentials",
                "username": username, "data": None, "via": None}
    return {"enriched": False, "reason": "fetch_failed",
            "username": username, "data": None, "via": None}


async def enrich_linkedin(
    db,
    profile_id: Optional[str] = None,
    linkedin_url: Optional[str] = None,
) -> Dict[str, Any]:
    """Fetch real LinkedIn data and apply it to a talent_pool doc.

    Response:
      {"enriched": bool,
       "reason": None|<fetch reason>|"profile_not_found",
       "profile_id": str|None,
       "fields_applied": [..]}
    Only fills a field when the live API provided it; never invents values.
    """
    res = await fetch_linkedin(db, linkedin_url or "")
    if not res["enriched"]:
        await agent_run_log(
            db, "TP15", "enrich_linkedin", status="SKIPPED",
            detail={"reason": res["reason"], "profile_id": profile_id,
                    "username": res["username"]},
        )
        if profile_id:
            await log_activity(
                db, "agent:TP15", "Enrich", object_id=profile_id,
                summary=f"LinkedIn enrichment skipped ({res['reason']})",
                data={"username": res["username"]},
            )
        return {"enriched": False, "reason": res["reason"],
                "profile_id": profile_id, "fields_applied": []}

    data = res["data"] or {}
    await ensure_taxonomy(db)
    skills = await canonicalize_skills(db, data.get("skills") or [], "linkedin")

    profile_doc: Dict[str, Any] = {}
    if profile_id:
        profile_doc = await _find_profile(db, profile_id)() or {}

    patch: Dict[str, Any] = {
        "enriched_via": res["via"],
        "enriched_at": now_utc(),
        "last_synced_at": now_utc(),
    }
    filled: List[str] = []

    def _fill(key: str, val: Any, *, override: bool = False) -> None:
        if val in (None, ""):
            return
        if not override and profile_doc.get(key):
            return
        patch[key] = val
        filled.append(key)

    _fill("full_name", data.get("full_name"), override=True)
    _fill("headline", data.get("headline"))
    _fill("location", data.get("location"))
    _fill("current_company", data.get("current_company"))
    _fill("current_role", data.get("current_role"))
    _fill("education", data.get("education"))
    _fill("photo_url", data.get("photo_url"))
    _fill("bio", data.get("bio"))
    if data.get("experience_years") is not None:
        _fill("experience_years", data.get("experience_years"), override=True)
    if skills:
        patch["skills"] = skills
        filled.append("skills")
    patch["linkedin_url"] = linkedin_url

    if profile_id:
        if profile_doc.get("_id") is None:
            await agent_run_log(db, "TP15", "enrich_linkedin", status="FAILED",
                                detail={"profile_id": profile_id,
                                        "error": "profile not found"})
            return {"enriched": False, "reason": "profile_not_found",
                    "profile_id": profile_id, "fields_applied": []}
        await db.talent_pool.update_one({"_id": profile_doc["_id"]}, {"$set": patch})
        await log_activity(
            db, "agent:TP15", "Enrich", object_id=profile_id,
            summary=f"LinkedIn enriched via {res['via']}: "
                    f"{', '.join(filled) or 'no new fields'}",
            data={"username": res["username"], "via": res["via"]},
        )

    await agent_run_log(
        db, "TP15", "enrich_linkedin", status="SUCCESS",
        detail={"profile_id": profile_id, "username": res["username"],
                "via": res["via"], "fields": filled},
    )
    return {"enriched": True, "reason": None, "profile_id": profile_id,
            "fields_applied": filled, "data": data}


# ── TP16: GitHub (PyGithub / public REST) ───────────────────────────

def _repo_view(name: str, url: Optional[str], stars, language, pushed_at,
               description) -> Dict[str, Any]:
    return {
        "name": name,
        "url": url,
        "stargazers_count": int(stars or 0),
        "language": language,
        "pushed_at": pushed_at,
        "description": normalize_text(description)[:200],
    }


async def _github_profile_http(username: str, token: Optional[str]) -> Optional[Dict[str, Any]]:
    """Public GitHub REST (authenticated when a token is present).

    Returns {"profile", "repos", "languages"} or None. All timestamps come
    back as ISO-8601 strings — strength math parses them via as_datetime.
    """
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "studentalumni-talent-pool",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        async with httpx.AsyncClient(timeout=GITHUB_TIMEOUT) as client:
            user_r = await client.get(f"https://api.github.com/users/{username}",
                                      headers=headers)
            if user_r.status_code == 404:
                return None
            if user_r.status_code == 403:
                logger.warning("GitHub API rate-limited/abuse-blocked for %s",
                               username)
                return None
            user_r.raise_for_status()
            user = user_r.json()

            repos_r = await client.get(
                f"https://api.github.com/users/{username}/repos",
                headers=headers,
                params={"sort": "stars", "direction": "desc",
                        "per_page": 5, "type": "owner"},
            )
            repos_raw = (repos_r.json() or []) if repos_r.is_success else []
            repos = [
                _repo_view(
                    r.get("full_name"), r.get("html_url"), r.get("stargazers_count"),
                    r.get("language"),
                    str(r.get("pushed_at")) if r.get("pushed_at") else None,
                    r.get("description"),
                )
                for r in repos_raw[:5]
            ]

            languages: Dict[str, Any] = {}
            for r in repos:
                if r["language"]:
                    languages[r["language"]] = languages.get(r["language"], 0) + 1
            if repos and repos[0]["url"]:
                lang_r = await client.get(
                    f"https://api.github.com/repos/{repos[0]['name']}/languages",
                    headers=headers,
                )
                if lang_r.is_success:
                    for lang, bts in lang_r.json().items():
                        languages[lang] = languages.get(lang, 0) + int(bts or 0)

            return {
                "profile": {
                    "login": user.get("login"),
                    "name": normalize_text(user.get("name")) or user.get("login"),
                    "location": normalize_text(user.get("location")) or None,
                    "bio": normalize_text(user.get("bio")) or None,
                    "public_repos": int(user.get("public_repos") or 0),
                    "followers": int(user.get("followers") or 0),
                },
                "repos": repos,
                "languages": languages,
            }
    except Exception as e:
        logger.warning("GitHub fetch failed for %s: %s", username, e)
    return None


def _github_profile_pygithub(username: str, token: Optional[str]) -> Optional[Dict[str, Any]]:
    """PyGithub (sync) — called via asyncio.to_thread so it never blocks the loop."""
    gh = import_optional("github")
    if gh is None:
        return None
    try:
        g = gh.Github(auth=gh.Auth.Token(token)) if token else gh.Github()
        user = g.get_user(username)
        it = user.get_repos(sort="stars", direction="desc", per_page=5, type="owner")
        repos = [
            _repo_view(
                r.full_name, r.html_url, r.stargazers_count, r.language,
                str(r.pushed_at) if r.pushed_at else None, r.description,
            )
            for r in list(it)[:5]
        ]
        languages: Dict[str, Any] = {}
        for rp in repos:
            if rp["language"]:
                languages[rp["language"]] = languages.get(rp["language"], 0) + 1
        if repos:
            top = user.get_repo(repos[0]["name"])
            try:
                for lang, bts in top.get_languages().items():
                    languages[lang] = languages.get(lang, 0) + int(bts or 0)
            except Exception:
                pass
        return {
            "profile": {
                "login": user.login,
                "name": normalize_text(user.name) or user.login,
                "location": normalize_text(user.location) or None,
                "bio": normalize_text(user.bio) or None,
                "public_repos": int(user.public_repos or 0),
                "followers": int(user.followers or 0),
            },
            "repos": repos,
            "languages": languages,
        }
    except Exception as e:
        logger.warning("PyGithub fetch failed for %s: %s", username, e)
        return None


async def _compute_strength(
    profile: Dict[str, Any],
    repos: List[Dict[str, Any]],
    languages: Dict[str, Any],
) -> Dict[str, Any]:
    """Explainable 0-100 developer-strength score. Factor weights sum to 100:
    repo count/stars 40 · language breadth 20 · activity 20 · followers 10 ·
    recency 10. Every factor is returned so the UI can explain the score."""
    total_repos = int(profile.get("public_repos") or 0)
    total_stars = sum(r.get("stargazers_count", 0) for r in repos)
    distinct_langs = (
        len([k for k in languages if k])
        + len({r["language"] for r in repos if r.get("language")})
    )
    followers = int(profile.get("followers") or 0)

    latest_push = None
    for r in repos:
        ts = as_datetime(r.get("pushed_at"))
        if ts and (latest_push is None or ts > latest_push):
            latest_push = ts
    age_days = (now_utc() - latest_push).days if latest_push else None

    repo_score = min(40.0, min(total_repos, 20) * 1.0 + min(total_stars, 100) * 0.2)
    breadth_score = min(20.0, distinct_langs * 5.0)
    if age_days is None:
        activity_base = 0.0
    elif age_days <= 30:
        activity_base = 12.0
    elif age_days <= 90:
        activity_base = 8.0
    else:
        activity_base = 0.0
    activity_score = min(20.0, activity_base + min(total_stars // 25, 8))
    follower_score = min(10.0, followers // 20)
    if age_days is None:
        recency_score = 0.0
    elif age_days <= 30:
        recency_score = 10.0
    elif age_days <= 90:
        recency_score = 7.0
    elif age_days <= 365:
        recency_score = 4.0
    else:
        recency_score = 1.0

    score = int(round(repo_score + breadth_score + activity_score
                      + follower_score + recency_score))
    factors = {
        "repo_count_stars": round(repo_score, 1),
        "language_breadth": round(breadth_score, 1),
        "activity": round(activity_score, 1),
        "followers": round(follower_score, 1),
        "recency": round(recency_score, 1),
    }
    basis = (
        f"{total_repos} public repos, {total_stars} combined stars in top-5, "
        f"{distinct_langs} distinct languages, latest push "
        + ("no data" if age_days is None else f"{age_days}d ago")
        + f", {followers} followers."
    )
    return {"score": score, "factors": factors, "basis": basis}


async def fetch_github(db, username: str) -> Dict[str, Any]:
    """Fetch real GitHub data for a username.

    Returns:
      {"enriched": bool,
       "reason": None|"no_username"|"rate_limit"|"fetch_failed",
       "username": str|None,
       "profile": {...}|None,
       "top_repos": [...],
       "languages": {...},
       "skills": [canonicalized languages],
       "strength": {"score","factors","basis"}|None}
    """
    username = normalize_text(username).strip()
    if not username:
        return {"enriched": False, "reason": "no_username", "username": None,
                "profile": None, "top_repos": [], "languages": {},
                "skills": [], "strength": None}

    token = await _github_token(db)
    if not await _api_gate(db, "github", GITHUB_LIMIT_PER_HOUR):
        return {"enriched": False, "reason": "rate_limit", "username": username,
                "profile": None, "top_repos": [], "languages": {},
                "skills": [], "strength": None}

    if token and import_optional("github") is not None:
        data = await asyncio.to_thread(_github_profile_pygithub, username, token)
        api = "pygithub"
    else:
        data = await _github_profile_http(username, token)
        api = "github_rest"

    if data is None:
        await agent_run_log(db, "TP16", "fetch_github", status="SKIPPED",
                            detail={"reason": "fetch_failed",
                                   "username": username, "api": api})
        return {"enriched": False, "reason": "fetch_failed", "username": username,
                "profile": None, "top_repos": [], "languages": {},
                "skills": [], "strength": None}

    skills = await canonicalize_skills(db, list(data.get("languages", {}).keys()),
                                       "github")
    strength = await _compute_strength(
        data.get("profile") or {}, data.get("repos") or [],
        data.get("languages") or {},
    )
    await _log_raw_scrape(db, None, "github", api, username, {
        "profile": data.get("profile"),
        "repos": data.get("repos"),
        "languages": data.get("languages"),
    })
    return {"enriched": True, "reason": None, "username": username,
            "profile": data.get("profile"), "top_repos": data.get("repos") or [],
            "languages": data.get("languages") or {}, "skills": skills,
            "strength": strength}


async def enrich_github(
    db,
    profile_id: Optional[str] = None,
    github_url: Optional[str] = None,
    username: Optional[str] = None,
) -> Dict[str, Any]:
    """Fetch real GitHub data and apply it to a talent_pool doc.

    Response:
      {"enriched": bool,
       "reason": None|<fetch reason>|"profile_not_found",
       "profile_id": str|None,
       "username": str|None,
       "dev_strength": {"score","factors","basis"}|None,
       "fields_applied": [..]}
    """
    username = username or _extract_github_username(github_url)
    res = await fetch_github(db, username or "")
    out: Dict[str, Any] = {
        "enriched": res["enriched"],
        "reason": res["reason"],
        "profile_id": profile_id,
        "username": res.get("username"),
        "dev_strength": res.get("strength") if res["enriched"] else None,
        "fields_applied": [],
    }
    if not res["enriched"]:
        if profile_id:
            await log_activity(
                db, "agent:TP16", "Enrich", object_id=profile_id,
                summary=f"GitHub enrichment skipped ({res['reason']})",
                data={"username": res.get("username")},
            )
        await agent_run_log(db, "TP16", "enrich_github", status="SKIPPED",
                            detail={"reason": res["reason"],
                                   "username": res.get("username")})
        return out

    prof = res.get("profile") or {}
    skills = res.get("skills") or []
    strength = res.get("strength") or {}

    patch: Dict[str, Any] = {
        "github_username": res.get("username"),
        "last_synced_at": now_utc(),
        "github_enriched_at": now_utc(),
        "github_followers": prof.get("followers"),
        "dev_strength_score": strength.get("score"),
        "dev_strength_factors": strength.get("factors"),
        "dev_strength_basis": strength.get("basis"),
        "github_top_repos": res.get("top_repos") or [],
        "enriched_via": "github",
    }
    if github_url:
        patch["github_url"] = github_url
    filled = ["github_username", "dev_strength", "github_top_repos"]

    if prof.get("location"):
        patch["location"] = prof.get("location")
        filled.append("location")
    if prof.get("name"):
        patch["full_name"] = prof.get("name")
        filled.append("full_name")
    if prof.get("bio"):
        patch["bio"] = prof.get("bio")
        filled.append("bio")
    if skills:
        existing: List[str] = []
        if profile_id:
            p = await _find_profile(db, profile_id)()
            existing = (p or {}).get("skills") or []
        patch["skills"] = list(dict.fromkeys([s for s in existing if s] + skills))
        filled.append("skills")

    if profile_id:
        p = await _find_profile(db, profile_id)()
        if p is None:
            out["reason"] = "profile_not_found"
            await agent_run_log(db, "TP16", "enrich_github", status="FAILED",
                                detail={"profile_id": profile_id,
                                        "error": "profile not found"})
            return out
        await db.talent_pool.update_one({"_id": p["_id"]}, {"$set": patch})
        out["fields_applied"] = filled
        await log_activity(
            db, "agent:TP16", "Enrich", object_id=profile_id,
            summary=f"GitHub enriched: strength {strength.get('score')}/100 "
                    f"({strength.get('basis', '')[:160]})",
            data={"username": res.get("username"),
                  "factors": strength.get("factors")},
        )
    await agent_run_log(db, "TP16", "enrich_github", status="SUCCESS",
                        detail={"profile_id": profile_id,
                                "username": res.get("username"),
                                "strength": strength.get("score")})
    return out


# ── scheduler entry points (TP23) ──────────────────────────────────

async def stale_profiles(db, hours: int = 24, limit: int = 500) -> List[Dict[str, Any]]:
    """Profiles never synced or synced more than `hours` ago. Tolerant of a
    missing/None field; legacy ISO-string stamps count as stale here."""
    cutoff = now_utc() - timedelta(hours=hours)
    q = {
        "is_active": True,
        "$or": [
            {"last_synced_at": {"$exists": False}},
            {"last_synced_at": None},
            {"last_synced_at": {"$lt": cutoff}},
        ],
    }
    return await db.talent_pool.find(q).limit(limit).to_list(limit)


async def stale_github_candidates(db, days: int = 7, limit: int = 200) -> List[Dict[str, Any]]:
    """Candidates with a github_url that need (re-)enrichment: never enriched
    or enriched more than `days` ago."""
    cutoff = now_utc() - timedelta(days=days)
    q = {
        "is_active": True,
        "github_url": {"$type": "string"},
        "$or": [
            {"github_enriched_at": {"$exists": False}},
            {"github_enriched_at": None},
            {"github_enriched_at": {"$lt": cutoff}},
        ],
    }
    return await db.talent_pool.find(q).limit(limit).to_list(limit)


async def batch_reenrich(db, source: str, limit: int = 50) -> Dict[str, Any]:
    """Weekly re-enrichment pass for the scheduler. source: 'linkedin'|'github'.
    Stops early on the hourly rate limit and reports how far it got."""
    src = (source or "").lower()
    agent_tag = "TP15" if src in ("linkedin", "linked") else "TP16"
    rate_limited = False
    enriched = failed = skipped = 0

    if src == "github":
        docs = await stale_github_candidates(db, days=7, limit=limit)
        for d in docs:
            url = d.get("github_url")
            if not url:
                skipped += 1
                continue
            r = await enrich_github(db,
                                    profile_id=str(d.get("id") or d.get("_id")),
                                    github_url=url)
            if r["enriched"]:
                enriched += 1
            elif r["reason"] == "rate_limit":
                rate_limited = True
                break
            else:
                failed += 1
    elif src in ("linkedin", "linked"):
        docs = [d for d in await stale_profiles(db, hours=24, limit=limit)
                if d.get("linkedin_url")]
        for d in docs:
            r = await enrich_linkedin(db,
                                      profile_id=str(d.get("id") or d.get("_id")),
                                      linkedin_url=d.get("linkedin_url"))
            if r["enriched"]:
                enriched += 1
            elif r["reason"] == "rate_limit":
                rate_limited = True
                break
            else:
                failed += 1
    else:
        return {"requested": 0, "processed": 0, "enriched": 0, "failed": 0,
                "skipped": 0, "rate_limited": False,
                "reason": f"unknown source {source!r}"}

    out = {"requested": limit, "processed": enriched + failed + skipped,
           "enriched": enriched, "failed": failed, "skipped": skipped,
           "rate_limited": rate_limited}
    await agent_run_log(db, agent_tag, f"batch_reenrich:{src}",
                        status="SUCCESS" if not rate_limited else "PARTIAL",
                        detail=out)
    return out


# ── service + status ────────────────────────────────────────────────

class TalentEnrichmentAgentService:
    """Module-level facade kept for symmetry with the house agent singletons."""

    async def enrich_linkedin(self, db, profile_id=None, linkedin_url=None):
        return await enrich_linkedin(db, profile_id=profile_id,
                                     linkedin_url=linkedin_url)

    async def enrich_github(self, db, profile_id=None, github_url=None,
                            username=None):
        return await enrich_github(db, profile_id=profile_id,
                                   github_url=github_url, username=username)


talent_enrichment_agent = TalentEnrichmentAgentService()


async def agent_status(db) -> Dict[str, Any]:
    """Core-group agent card. 'degraded' = URL-extraction-only fallback in use
    (no live API credentials). last_run_at comes from the most recent
    TP15/TP16 scheduler_logs row."""
    last = await db.scheduler_logs.find(
        {"agent": {"$in": ["TP15", "TP16"]}}
    ).sort("completed_at", -1).limit(1).to_list(1)
    last_run_at = last[0].get("completed_at") if last else None
    last_run_iso = last_run_at.isoformat() if last_run_at else None

    from features.linkedin_sync import _get_proxycurl_key
    try:
        has_pc = bool(await _get_proxycurl_key())
    except Exception:
        has_pc = False
    has_gh = bool(await _github_token(db))

    if last and last[0].get("status") == "FAILED":
        status = "error"
    elif last_run_iso is None:
        status = "idle"
    elif has_pc and has_gh:
        status = "ok"
    else:
        status = "degraded"

    missing = []
    if not has_pc:
        missing.append("Proxycurl key (LinkedIn)")
    if not has_gh:
        missing.append("GitHub token (falls back to public REST)")
    if status in ("ok", "idle") and not missing:
        notes = "Live enrichment active."
    else:
        notes = (f"Honest URL-extraction fallback in use — configure: "
                 f"{', '.join(missing)}.")

    return {
        "name": "TP15/TP16 Talent Enrichment (LinkedIn + GitHub)",
        "group": "core",
        "priority": "P0",
        "status": status,
        "last_run_at": last_run_iso,
        "est_cost_per_month":
            "~$30 @ 3,000 profiles/mo (Proxycurl $0.01/lookup); "
            "GitHub free (public REST / PyGithub)",
        "notes": notes,
    }
