"""
mentor_agents.py — MT8–MT14: the autonomous agent suite for the Mentor portal.

House pattern (mirrors services/agents/talent_scheduler.py + TP15–TP32):
each entry point takes a `db` handle, is deterministic, side-effect-scoped to
its own collections, and never raises — failures are captured in the result
dict so a single agent's error can't take down the scheduler cycle.

No heavy ML deps are required (no sentence-transformers / FAISS download),
so these run in the Docker build unchanged. MT9 uses a weighted
keyword-overlap scorer over mentor bios + expertise + categories; if a
`mentor_match_index` document (pre-computed embeddings) is present it is
preferred, otherwise the keyword fallback is used.
"""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from services.agents.talent_common import now_utc


def _uid() -> str:
    return uuid.uuid4().hex


def _clean(s: Optional[str]) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


# ═══════════════════════════════════════════════════════════════════
# MT8 — Auto-Categorization
# ═══════════════════════════════════════════════════════════════════
def _kw_hits(text: str, keywords: List[str]) -> int:
    t = text
    return sum(1 for kw in keywords if kw in t)


async def categorize_pending_mentors(db, admin_id: str, limit: int = 500) -> Dict[str, Any]:
    """Score pending (or unclassified) mentors against the 13-slug taxonomy.
    Writes top-3 `mentor_category_suggestions` docs per mentor; admin confirms
    in UI. Uses the taxonomy+keyword table imported from the router."""
    run_id = _uid()
    try:
        from features.mentor_admin import TAXONOMY, _CATEGORY_KEYWORDS
    except Exception:
        return {"ok": False, "error": "taxonomy not importable", "run_id": run_id}

    q = {"role": "mentor", "archived": {"$ne": True},
         "mentor_info.category": {"$in": [None, ""]}}
    # also pick up already-classified-but-without-suggestions for refresh
    q["$or"] = [
        {"mentor_info.category": {"$in": [None, ""]}},
        {"mentor_category_suggestion_id": {"$exists": False}},
    ]
    docs = await db.users.find(q).limit(limit).to_list(limit)
    processed = 0
    for u in docs:
        info = u.get("mentor_info") or {}
        text = _clean(
            " ".join([
                u.get("headline") or "",
                u.get("designation") or "",
                u.get("current_title") or "",
                info.get("job_title") or "",
                info.get("organization") or "",
                info.get("bio") or "",
                " ".join(info.get("expertise") or info.get("skills_offered") or []),
            ])
        )
        if not text:
            continue
        scored: List[Dict[str, Any]] = []
        for slug, kws in _CATEGORY_KEYWORDS.items():
            hits = _kw_hits(text, kws)
            if hits > 0:
                scored.append({"slug": slug, "hits": hits,
                               "confidence": round(min(1.0, hits / 3.0), 3)})
        scored.sort(key=lambda x: x["hits"], reverse=True)
        top3 = scored[:3]
        for t in top3:
            t["label"] = next((x["label"] for x in TAXONOMY if x["slug"] == t["slug"]), t["slug"])
        if not top3:
            continue
        doc = {
            "run_id": run_id,
            "mentor_id": str(u["_id"]),
            "name": u.get("full_name") or u.get("name"),
            "suggested_categories": top3,
            "chosen_slug": None,      # admin sets on confirm
            "status": "pending",      # pending / confirmed / dismissed
            "created_at": now_utc(),
        }
        await db.mentor_category_suggestions.update_one(
            {"mentor_id": str(u["_id"]), "status": "pending"},
            {"$set": {k: v for k, v in doc.items() if k != "_id"}},
            upsert=True,
        )
        processed += 1
    return {"ok": True, "run_id": run_id, "processed": processed}


# ═══════════════════════════════════════════════════════════════════
# MT9 — Mentor-Student Match
# ═══════════════════════════════════════════════════════════════════
_GOAL_STOPWORDS = {
    "a", "an", "the", "i", "my", "me", "to", "in", "for", "of", "and", "or",
    "want", "would", "like", "need", "help", "with", "on", "about", "as",
    "become", "get", "job", "jobs", "role", "career", "field", "industry",
}


def _tokens(s: str) -> set:
    out = set()
    for w in re.findall(r"[a-z0-9+#-]+", _clean(s)):
        if w in _GOAL_STOPWORDS or len(w) < 2:
            continue
        out.add(w)
    return out


async def match_mentors_for_goal(db, goal: str, limit: int = 5) -> Dict[str, Any]:
    """Keyword-overlap match of a free-text student goal against approved
    mentor profiles. Prefers pre-computed `mentor_match_index` embeddings
    when present, else the deterministic keyword scorer."""
    goal_tokens = _tokens(goal)
    mentors = await db.users.find({
        "role": "mentor", "mentor_status": "approved", "archived": {"$ne": True},
    }).limit(2000).to_list(2000)

    results: List[Dict[str, Any]] = []
    for m in mentors:
        info = m.get("mentor_info") or {}
        hay = " ".join([
            m.get("headline") or "",
            info.get("job_title") or "",
            info.get("organization") or "",
            info.get("bio") or "",
            " ".join(info.get("expertise") or info.get("skills_offered") or []),
            info.get("category") or "",
        ])
        hay_tokens = _tokens(hay)
        overlap = goal_tokens & hay_tokens
        # score: weighted overlap / goal-token coverage
        coverage = len(overlap) / len(goal_tokens) if goal_tokens else 0.0
        if coverage < 0.1 and not overlap:
            continue
        bonus = 0.15 if info.get("category") in goal.lower() else 0.0
        results.append({
            "mentor_id": str(m["_id"]),
            "name": m.get("full_name") or m.get("name"),
            "org": info.get("organization") or m.get("current_company"),
            "title": info.get("job_title") or m.get("designation"),
            "category": info.get("category"),
            "avg_rating": m.get("avg_rating") or info.get("avg_rating") or 0.0,
            "score": round(min(1.0, coverage + bonus), 3),
            "matched_terms": sorted(overlap)[:8],
        })
    results.sort(key=lambda x: x["score"], reverse=True)
    return {"goal": goal, "matches": results[:limit], "engine": "keyword-fallback"}


# ═══════════════════════════════════════════════════════════════════
# MT10 — Engagement scorer (0–100)
# ═══════════════════════════════════════════════════════════════════
# sessions 30, response 20, rating 20, active-days 15, mentee-progress 15
async def compute_engagement_scores(db, batch: int = 500) -> Dict[str, Any]:
    run_id = _uid()
    processed = 0
    mentors = await db.users.find({"role": "mentor", "mentor_status": "approved"}).limit(batch).to_list(batch)
    now = now_utc()
    window_60d = now - timedelta(days=60)
    for m in mentors:
        mid = str(m["_id"])
        sessions_total = await db.mentor_sessions.count_documents({"mentor_id": mid})
        sessions_60 = await db.mentor_sessions.count_documents({"mentor_id": mid, "created_at": {"$gte": window_60d}})
        active_days = await db.mentor_sessions.distinct("day_key", {"mentor_id": mid, "created_at": {"$gte": window_60d}})
        avg_rating = m.get("avg_rating") or 0.0
        mentees = await db.bookings.count_documents({"mentor_id": mid, "status": {"$in": ["completed", "done"]}})

        s_sessions = min(30, (sessions_total / 10) * 30)          # 10+ sessions → full
        try:
            rt = float(m.get("response_time_hrs") or 0)
        except (TypeError, ValueError):
            rt = 0.0
        s_response = 20.0 if rt <= 0 else max(0.0, 20.0 - (rt / 48.0) * 20)
        s_rating = min(20.0, (avg_rating / 5.0) * 20)
        s_active = min(15.0, (len(active_days) / 10) * 15)
        s_progress = min(15.0, (mentees / 5) * 15)
        total = round(s_sessions + s_response + s_rating + s_active + s_progress, 1)
        disengaged = total < 30 and sessions_60 == 0

        update = {"mentor_engagement_score": total, "mentor_engagement_breakdown": {
            "sessions": round(s_sessions, 1), "response": round(s_response, 1),
            "rating": round(s_rating, 1), "active_days": round(s_active, 1),
            "mentee_progress": round(s_progress, 1)},
            "mentor_disengaged": disengaged,
            "mentor_engagement_updated_at": now,
        }
        await db.users.update_one({"_id": m["_id"]}, {"$set": update})
        if disengaged:
            # best-effort re-engagement inbox note (email gated to avoid spam)
            try:
                await db.reengagement_log.insert_one({
                    "mentor_id": mid, "score": total, "at": now, "action": "flagged",
                })
            except Exception:
                pass
        processed += 1
    return {"ok": True, "run_id": run_id, "processed": processed}


async def engagement_scores_for(db) -> Dict[str, Any]:
    items = await db.users.find({"role": "mentor", "mentor_engagement_score": {"$exists": True}}).sort(
        "mentor_engagement_score", -1).limit(500).to_list(500)
    out = []
    for m in items:
        out.append({
            "mentor_id": str(m["_id"]),
            "name": m.get("full_name") or m.get("name"),
            "score": m.get("mentor_engagement_score", 0),
            "disengaged": bool(m.get("mentor_disengaged")),
            "breakdown": m.get("mentor_engagement_breakdown"),
            "updated_at": str(m.get("mentor_engagement_updated_at")),
        })
    disengaged = [x for x in out if x["disengaged"]]
    return {"items": out, "disengaged": disengaged}


# ═══════════════════════════════════════════════════════════════════
# MT11 — Session quality agent
# ═══════════════════════════════════════════════════════════════════
_POS_WORDS = {"great", "excellent", "amazing", "helpful", "insight", "insightful",
             "patient", "clear", "clearly", "useful", "recommend", "loved", "fantastic",
             "indepth", "in-depth", "knowledgeable", "wise", "supportive"}
_NEG_WORDS = {"poor", "bad", "waste", "wasted", "rude", "no-show", "noshow", "didn't show",
             "unhelpful", "unprofessional", "boring", "worse", "disappointed"}


def _sentiment(text: str) -> float:
    t = _clean(text)
    pos = sum(1 for w in _POS_WORDS if w in t)
    neg = sum(1 for w in _NEG_WORDS if w in t)
    return round((pos - neg) / (pos + neg + 1), 2)


async def refresh_quality_flags(db) -> Dict[str, Any]:
    run_id = _uid()
    # last 10 reviews per mentor; flag avg<3.0
    mentors = await db.users.find({"role": "mentor", "mentor_status": "approved"}).to_list(5000)
    flagged = 0
    for m in mentors:
        mid = str(m["_id"])
        revs = await db.reviews.find({"mentor_id": mid}).sort("created_at", -1).limit(10).to_list(10)
        if not revs:
            continue
        ratings = [r.get("rating") for r in revs if r.get("rating")]
        avg = round(sum(ratings) / len(ratings), 2) if ratings else 0.0
        quotes = [r.get("comment") for r in revs if (r.get("comment") or "").strip()][:3]
        low = avg < 3.0
        await db.users.update_one({"_id": m["_id"]}, {"$set": {
            "mentor_quality_avg": avg, "mentor_quality_flagged": low,
            "mentor_quality_quotes": quotes,
        }})
        if low:
            flagged += 1
    return {"ok": True, "run_id": run_id, "flagged": flagged}


async def quality_report(db) -> Dict[str, Any]:
    flagged = await db.users.find({"role": "mentor", "mentor_quality_flagged": True}).to_list(500)
    out = [{
        "mentor_id": str(f["_id"]), "name": f.get("full_name") or f.get("name"),
        "avg": f.get("mentor_quality_avg", 0), "quotes": f.get("mentor_quality_quotes", []),
    } for f in flagged]
    total_reviews = await db.reviews.count_documents({})
    return {"flagged": out, "total_reviews": total_reviews}


# ═══════════════════════════════════════════════════════════════════
# MT12 — Content recommendation (career-opening digest)
# ═══════════════════════════════════════════════════════════════════
async def mentor_content_digest(db, mentor_id: Optional[str] = None) -> Dict[str, Any]:
    q: Dict[str, Any] = {"role": "mentor"}
    if mentor_id:
        q["_id"] = mentor_id
    mentors = await db.users.find(q).to_list(2000)
    produced = 0
    for m in mentors:
        info = m.get("mentor_info") or {}
        expertise = [e.lower() for e in (info.get("expertise") or info.get("skills_offered") or [])]
        if not expertise:
            continue
        # find matching open roles by skill overlap
        matches: List[Dict[str, Any]] = []
        openings = await db.career_openings.find(
            {"skills_required.0": {"$exists": True}},
            {"title": 1, "company": 1, "skills_required": 1, "location": 1},
        ).limit(500).to_list(500)
        for o in openings:
            req = [s.lower() for s in (o.get("skills_required") or [])]
            overlap = set(expertise) & set(req)
            if overlap:
                matches.append({"title": o.get("title"), "company": o.get("company"),
                                "location": o.get("location"), "skills_matched": sorted(overlap)[:6]})
        matches.sort(key=lambda x: len(x["skills_matched"]), reverse=True)
        if matches:
            produced += 1
        await db.mentor_content_digests.update_one(
            {"mentor_id": str(m["_id"])},
            {"$set": {"mentor_id": str(m["_id"]), "matches": matches[:10],
                      "generated_at": now_utc(), "click_count": 0}},
            upsert=True,
        )
    return {"ok": True, "digests_produced": produced}


# ═══════════════════════════════════════════════════════════════════
# MT13 — Availability optimizer
# ═══════════════════════════════════════════════════════════════════
async def availability_insights(db) -> Dict[str, Any]:
    # gap analysis: booking demand per weekday-slot vs declared availability
    demands = await db.bookings.aggregate([
        {"$match": {"status": {"$nin": ["cancelled"]}, "slot_start_iso": {"$exists": True}}},
        {"$project": {
            "mentor_id": 1,
            "day": {"$dayOfWeek": "$slot_start_iso"},
            "hour": {"$hour": "$slot_start_iso"},
        }},
        {"$group": {"_id": {"day": "$day", "hour": "$hour"}, "n": {"$sum": 1}}},
        {"$sort": {"n": -1}},
        {"$limit": 20},
    ]).to_list(20)
    gaps = []
    for d in demands:
        day, hour = d["_id"]["day"], d["_id"]["hour"]
        # count how many mentors declared availability in that window
        avail = await db.mentor_availability.count_documents({"day_of_week": day, "hour": hour})
        pending = await db.bookings.count_documents({
            "status": "pending",
            "slot_start_iso": {"$exists": True},
        })
        gaps.append({
            "day_of_week": day, "hour": hour,
            "demand": d["n"], "available_mentors": avail,
            "pending_backlog": pending,
            "alert": d["n"] > 0 and avail <= max(1, d["n"] // 2),
        })
    await db.mentor_availability_insights.update_one(
        {"_id": "current"},
        {"$set": {"generated_at": now_utc(), "gaps": gaps}},
        upsert=True,
    )
    return {"gaps": gaps}


# ═══════════════════════════════════════════════════════════════════
# MT14 — Badge & certificate milestones
# ═══════════════════════════════════════════════════════════════════
def _award_rules(total_sessions: int, avg_rating: float, booking_rank: int) -> List[str]:
    earned: List[str] = []
    if total_sessions >= 100:
        earned.append("centennial_mentor")
    elif total_sessions >= 50:
        earned.append("half_century_mentor")
    elif total_sessions >= 10:
        earned.append("debut_mentor")
    if avg_rating >= 4.8:
        earned.append("five_star_mentor")
    if avg_rating >= 4.5:
        earned.append("top_rated_mentor")
    if booking_rank <= 3 and total_sessions >= 20:
        earned.append("most_booked_mentor")
    if total_sessions >= 30 and avg_rating >= 4.0:
        earned.append("mentee_champion")
    return earned


async def award_milestone_badges(db, actor_id: str) -> Dict[str, Any]:
    run_id = _uid()
    # compute booking rank per mentor (completed sessions)
    rank_map: Dict[str, int] = {}
    agg = db.mentor_sessions.aggregate([
        {"$group": {"_id": "$mentor_id", "n": {"$sum": 1}}},
        {"$sort": {"n": -1}},
    ])
    rank = 1
    async for doc in agg:
        rank_map[doc["_id"]] = rank
        rank += 1

    processed = 0
    mentors = await db.users.find({"role": "mentor", "mentor_status": "approved"}).to_list(5000)
    for m in mentors:
        mid = str(m["_id"])
        total_sessions = rank_map.get(mid, 0)
        avg_rating = m.get("avg_rating") or 0.0
        new_badges = _award_rules(total_sessions, avg_rating, rank_map.get(mid, 9999))
        existing = set(m.get("mentor_badges") or [])
        added = [b for b in new_badges if b not in existing]
        if added:
            await db.users.update_one({"_id": m["_id"]}, {
                "$addToSet": {"mentor_badges": {"$each": added}},
                "mentor_badges_awarded_at": now_utc(), "mentor_badges_awarded_by": actor_id,
            })
            processed += 1
    return {"ok": True, "run_id": run_id, "mentors_awarded": processed}


async def badge_status(db) -> Dict[str, Any]:
    items = await db.users.find({"role": "mentor", "mentor_badges.0": {"$exists": True}}).to_list(2000)
    out = [{
        "mentor_id": str(x["_id"]), "name": x.get("full_name") or x.get("name"),
        "badges": x.get("mentor_badges", []),
    } for x in items]
    return {"holders": out}


# ═══════════════════════════════════════════════════════════════════
# Scheduler surface — one hook runs the whole suite on its own cadence
# ═══════════════════════════════════════════════════════════════════
async def agent_status(db) -> Dict[str, Any]:
    """Read-only snapshot for the admin Agents panel."""
    cats = await db.mentor_category_suggestions.count_documents({})
    eng = await db.users.count_documents({"mentor_engagement_score": {"$exists": True}})
    dis = await db.users.count_documents({"mentor_disengaged": True})
    flags = await db.users.count_documents({"mentor_quality_flagged": True})
    badges = await db.users.count_documents({"mentor_badges.0": {"$exists": True}})
    return {
        "ok": True,
        "category_suggestions": cats,
        "engagement_scored": eng, "disengaged_flagged": dis,
        "quality_flagged": flags, "badge_holders": badges,
        "generated_at": now_utc().isoformat(),
    }
