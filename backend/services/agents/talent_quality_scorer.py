"""
talent_quality_scorer.py — TP24: 100-point data quality rubric for talent_pool.

Each profile gets a deterministic, explainable score in [0, 100] across ten
weighted dimensions. The score is cached on the document
(`doc["quality_score"]` + `doc["quality_breakdown"]`) so the admin list can
filter by "Needs Attention" (< 30) without recomputing.

Rubric (weights sum to 100):
    email_present      15   — valid, non-placeholder email
    phone_present       5   — 10+ digit phone
    linkedin_or_github  10   — at least one source URL
    skills_3+           10   — three or more distinct canonical skills
    education           10   — degree/grad_year present
    experience          10   — experience_years > 0 and/or current_role
    location             5   — free-text location
    photo               10   — photo_url or photo_data
    enriched             5   — last_synced_at within 30 days
    fresh                5   — last_synced_at within 24h OR imported_at within 24h
    bio_or_headline     10   — non-default, non-empty headline/bio

Profiles scoring < 30 are flagged `needs_attention=True`.

`quality_report(db)` aggregates the whole pool for the admin dashboard:
mean score, distribution buckets, per-dimension average, and the top
low-scoring profiles for the "Needs Attention" queue.
"""
from __future__ import annotations

import re
from datetime import timedelta
from typing import Any, Dict, List, Optional

from services.agents.talent_common import now_utc, as_datetime

_WEIGHTS: Dict[str, int] = {
    "email_present": 20,
    "phone_present": 5,
    "source_url": 10,
    "skills_3": 10,
    "education": 10,
    "experience": 10,
    "location": 5,
    "photo": 10,
    "enriched": 5,
    "fresh": 5,
    "bio_or_headline": 10,
}
assert sum(_WEIGHTS.values()) == 100

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_PHONE_MIN_DIGITS = 10
_PLACEHOLDER_EMAILS = {"email@example.com", "test@example.com", "no-reply@example.com"}


def _score_email(p: Dict[str, Any]) -> bool:
    e = (p.get("email") or "").strip().lower()
    if not e or e in _PLACEHOLDER_EMAILS:
        return False
    return bool(_EMAIL_RE.match(e))


def _score_phone(p: Dict[str, Any]) -> bool:
    ph = str(p.get("phone") or "")
    return sum(c.isdigit() for c in ph) >= _PHONE_MIN_DIGITS


def _score_source_url(p: Dict[str, Any]) -> bool:
    return bool((p.get("linkedin_url") or "").strip() or (p.get("github_url") or "").strip())


def _score_skills_3(p: Dict[str, Any]) -> bool:
    return len(p.get("skills") or []) >= 3


def _score_education(p: Dict[str, Any]) -> bool:
    return bool((p.get("education") or "").strip() or p.get("graduation_year"))


def _score_experience(p: Dict[str, Any]) -> bool:
    try:
        yrs = float(p.get("experience_years") or 0)
    except Exception:
        yrs = 0
    return yrs > 0 or bool((p.get("current_role") or "").strip())


def _score_location(p: Dict[str, Any]) -> bool:
    loc = (p.get("location") or "").strip()
    return len(loc) >= 2 and loc.lower() not in {"tbd", "unknown", "n/a", "remote"}


def _score_photo(p: Dict[str, Any]) -> bool:
    return bool((p.get("photo_url") or "").strip() or (p.get("photo_data") or "").strip())


def _score_enriched(p: Dict[str, Any]) -> bool:
    ls = as_datetime(p.get("last_synced_at"))
    if not ls:
        return False
    return (now_utc() - ls) < _ENRICHED_WINDOW


def _score_fresh(p: Dict[str, Any]) -> bool:
    ls = as_datetime(p.get("last_synced_at")) or as_datetime(p.get("imported_at"))
    if not ls:
        return False
    return (now_utc() - ls) < _FRESH_WINDOW


_ENRICHED_WINDOW = timedelta(days=30)
_FRESH_WINDOW = timedelta(hours=24)


def _score_bio_or_headline(p: Dict[str, Any]) -> bool:
    h = (p.get("headline") or "").strip()
    b = (p.get("bio") or "").strip()
    return len(b) >= 20 or len(h) >= 15


_CHECKS = {
    "email_present": _score_email,
    "phone_present": _score_phone,
    "source_url": _score_source_url,
    "skills_3": _score_skills_3,
    "education": _score_education,
    "experience": _score_experience,
    "location": _score_location,
    "photo": _score_photo,
    "enriched": _score_enriched,
    "fresh": _score_fresh,
    "bio_or_headline": _score_bio_or_headline,
}


def score_profile(p: Dict[str, Any]) -> Dict[str, Any]:
    """Pure, side-effect-free scoring of one profile dict.

    Returns {"score": int, "needs_attention": bool, "breakdown": {...},
             "missing": [dimension keys that scored 0]}.
    """
    breakdown: Dict[str, Dict[str, Any]] = {}
    missing: List[str] = []
    total = 0
    for dim, weight in _WEIGHTS.items():
        ok = _CHECKS[dim](p)
        pts = weight if ok else 0
        total += pts
        breakdown[dim] = {"weight": weight, "scored": pts, "passed": ok}
        if not ok:
            missing.append(dim)
    return {
        "score": total,
        "needs_attention": total < 30,
        "breakdown": breakdown,
        "missing": missing,
    }


async def score_profiles(db, limit: int = 5000) -> Dict[str, Any]:
    """Score and persist quality_score on up to `limit` active profiles.

    Only overwrites when the score actually changed, to avoid write churn.
    Returns counts for the run log.
    """
    scored = 0
    changed = 0
    needs_attention = 0
    async for p in db.talent_pool.find({"is_active": True}).limit(limit):
        r = score_profile(p)
        scored += 1
        if r["needs_attention"]:
            needs_attention += 1
        if p.get("quality_score") != r["score"] or "quality_breakdown" not in p:
            await db.talent_pool.update_one(
                {"_id": p["_id"]},
                {"$set": {
                    "quality_score": r["score"],
                    "quality_breakdown": r["breakdown"],
                    "needs_attention": r["needs_attention"],
                    "quality_scored_at": now_utc(),
                }},
            )
            changed += 1
    return {"scored": scored, "changed": changed, "needs_attention": needs_attention}


async def quality_report(db) -> Dict[str, Any]:
    """Aggregate quality stats for the admin dashboard + needs-attention queue."""
    total = await db.talent_pool.count_documents({"is_active": True})
    scored = await db.talent_pool.count_documents({"quality_score": {"$exists": True}, "is_active": True})
    mean = await db.talent_pool.aggregate([
        {"$match": {"quality_score": {"$exists": True}, "is_active": True}},
        {"$group": {"_id": None, "avg": {"$avg": "$quality_score"}}},
    ]).to_list(1)
    mean_score = round(float(mean[0]["avg"]), 1) if mean and mean[0].get("avg") else 0

    buckets = {"0-29": 0, "30-59": 0, "60-79": 0, "80-100": 0}
    qa = await db.talent_pool.count_documents(
        {"quality_score": {"$lt": 30}, "is_active": True}
    )
    b1 = await db.talent_pool.count_documents({"quality_score": {"$gte": 0, "$lt": 30}, "is_active": True})
    b2 = await db.talent_pool.count_documents({"quality_score": {"$gte": 30, "$lt": 60}, "is_active": True})
    b3 = await db.talent_pool.count_documents({"quality_score": {"$gte": 60, "$lt": 80}, "is_active": True})
    b4 = await db.talent_pool.count_documents({"quality_score": {"$gte": 80}, "is_active": True})
    buckets.update({"0-29": b1, "30-59": b2, "60-79": b3, "80-100": b4})

    # per-dimension pass rate: tally the stored breakdowns in Python (robust;
    # talent pool is a few thousand docs at most, and this is on-demand + daily).
    passed: Dict[str, int] = {k: 0 for k in _WEIGHTS}
    denom = 0
    docs = await db.talent_pool.find(
        {"is_active": True, "quality_breakdown": {"$exists": True}},
        {"quality_breakdown": 1},
    ).to_list(length=200000)
    for p in docs:
        denom += 1
        for d, v in (p.get("quality_breakdown") or {}).items():
            if d in passed and v.get("passed"):
                passed[d] += 1
    avg_per_dimension: Dict[str, float] = {
        k: (round(v / denom * 100, 1) if denom else 0.0) for k, v in passed.items()
    }

    low = await db.talent_pool.find(
        {"quality_score": {"$lt": 30}, "is_active": True}
    ).sort("quality_score", 1).limit(25).to_list(25)
    low_scoring = [
        {
            "id": str(p.get("_id")),
            "full_name": p.get("full_name"),
            "quality_score": p.get("quality_score"),
            "missing": [k for k, v in (p.get("quality_breakdown") or {}).items() if not v.get("passed")],
        }
        for p in low
    ]

    return {
        "total": total,
        "scored": scored,
        "mean_score": mean_score,
        "buckets": buckets,
        "needs_attention": qa,
        "avg_per_dimension": avg_per_dimension,
        "low_scoring": low_scoring,
    }


async def score_single(db, profile_id: str) -> Optional[Dict[str, Any]]:
    """Score + persist one profile by its `id` (or `_id`) and return the result."""
    p = await db.talent_pool.find_one({"id": profile_id})
    if not p:
        from bson import ObjectId, InvalidId
        try:
            p = await db.talent_pool.find_one({"_id": ObjectId(profile_id)})
        except (InvalidId, TypeError):
            p = None
    if not p:
        return None
    r = score_profile(p)
    await db.talent_pool.update_one(
        {"_id": p["_id"]},
        {"$set": {
            "quality_score": r["score"],
            "quality_breakdown": r["breakdown"],
            "needs_attention": r["needs_attention"],
            "quality_scored_at": now_utc(),
        }},
    )
    r["profile_id"] = str(p.get("id") or p["_id"])
    return r


class QualityScorerAgent:
    """TP24 dashboard facade."""
    name = "TP24 Quality Scorer"
    group = "data-quality"
    priority = "P1"

    async def agent_status(self, db) -> Dict[str, Any]:
        rep = await quality_report(db)
        last = await db.scheduler_logs.find_one(
            {"agent": "tp23_scheduler", "action": "quality_scan"},
            sort=[("started_at", -1)])
        return {
            "name": self.name, "group": self.group, "priority": self.priority,
            "status": "ok",
            "mean_score": rep["mean_score"],
            "needs_attention": rep["needs_attention"],
            "scored_profiles": rep["scored"],
            "est_cost_per_month": "$0 (deterministic rubric, no API)",
            "last_run_at": last.get("started_at").isoformat() if last and last.get("started_at") else None,
        }


quality_agent = QualityScorerAgent()
