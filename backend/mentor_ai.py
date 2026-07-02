"""
mentor_ai.py — Mentor AI Studio aggregator.

Provides four mentor-centric insights driven by data already on the platform
plus optional LLM-enriched session prep talking points.

Endpoints (all under /api):
   GET  /mentor/ai-studio/mentee-pulse
   GET  /mentor/ai-studio/skill-gaps
   GET  /mentor/ai-studio/impact
   POST /mentor/ai-studio/session-prep   { mentee_id }
"""
from __future__ import annotations

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from core.db import db as _db


logger = logging.getLogger("mentor_ai")
router = APIRouter()


def _get_current_user_dependency():
    from core.deps import get_current_user  # noqa
    return get_current_user


def _ensure_mentor(user: dict):
    if (user or {}).get("role") not in ("mentor", "alumni", "admin"):
        raise HTTPException(403, "Mentor access required")


async def _mentee_ids(mentor: dict) -> List[str]:
    """List of mentee user_ids this mentor is connected to."""
    out = set()
    mid = str(mentor.get("_id"))
    
    # 1. Fetch from connections collection (both key pairs a/b and legacy keys)
    async for c in _db.connections.find({"$or": [
        {"a": mid}, {"b": mid},
        {"mentor_id": mid}, {"connected_user_id": mid}, {"user_id": mid},
    ]}):
        # Only count active/accepted connections
        status = c.get("status")
        if status and status not in ("active", "accepted", "completed"):
            continue
            
        other = None
        if "a" in c and "b" in c:
            other = c["b"] if c["a"] == mid else c["a"]
        else:
            for k in ("user_id", "mentee_id", "connected_user_id", "student_id"):
                if c.get(k) and c[k] != mid:
                    other = c[k]
                    break
        if other and other != mid:
            out.add(str(other))
            
    # 2. Fallback — if the mentor has booked sessions, treat the bookers as mentees
    async for s in _db.bookings.find({"mentor_id": mid, "status": {"$in": ["confirmed", "completed", "accepted", "pending"]}}):
        if s.get("student_id"):
            out.add(str(s["student_id"]))
            
    # 3. Fallback — if the mentor has sessions, treat the users as mentees
    async for s in _db.sessions.find({"mentor_id": mid}):
        if s.get("user_id"):
            out.add(str(s["user_id"]))
            
    return list(out)


@router.get("/mentor/ai-studio/mentee-pulse")
async def mentee_pulse(user: dict = Depends(_get_current_user_dependency())):
    _ensure_mentor(user)
    ids = await _mentee_ids(user)
    out: List[Dict[str, Any]] = []

    # Pull each mentee's profile + roadmap
    for mid in ids[:30]:
        try:
            try:
                u = await _db.users.find_one({"_id": ObjectId(mid)})
            except Exception:
                u = await _db.users.find_one({"_id": mid}) or await _db.users.find_one({"id": mid})
            if not u:
                continue
            rm = await _db.career_roadmaps.find_one({"user_id": str(u["_id"])}) or {}
            
            # Support both new milestones model and legacy weekly_plan model
            if "milestones" in rm:
                wp = rm.get("milestones") or []
                done_count = sum(1 for m in wp if m.get("completed"))
                total_count = len(wp)
                progress_pct = round(done_count / total_count * 100) if total_count > 0 else rm.get("progress_pct", 0)
                current_week = next((i for i, m in enumerate(wp) if not m.get("completed")), total_count)
                current_week_title = wp[current_week]["title"] if current_week < total_count else "Roadmap complete"
            else:
                wp = rm.get("weekly_plan") or []
                done = rm.get("milestones_completed") or []
                done_count = len(done)
                total_count = len(wp)
                progress_pct = round(done_count / total_count * 100) if total_count > 0 else rm.get("progress_pct", 0)
                current_week = next((i for i in range(total_count) if i not in done), total_count)
                current_week_title = wp[current_week]["title"] if current_week < total_count else "Roadmap complete"

            # Get last session specifically with this mentor
            last_booking = await _db.bookings.find_one(
                {"mentor_id": str(user.get("_id") or user.get("id")), "student_id": str(u["_id"]), "status": {"$in": ["confirmed", "completed"]}},
                sort=[("scheduled_at", -1)],
            )
            last_sess = await _db.sessions.find_one(
                {"mentor_id": str(user.get("_id") or user.get("id")), "$or": [{"user_id": str(u["_id"])}, {"mentee_id": str(u["_id"])}]},
                sort=[("scheduled_at", -1)],
            )
            
            last_session_at = None
            if last_booking and last_sess:
                b_date = last_booking.get("scheduled_at")
                if isinstance(b_date, str):
                    try:
                        b_date = datetime.fromisoformat(b_date.replace("Z", "+00:00"))
                    except Exception:
                        b_date = None
                s_date = last_sess.get("scheduled_at")
                if b_date and s_date:
                    last_session_at = max(b_date, s_date)
                elif b_date:
                    last_session_at = b_date
                else:
                    last_session_at = s_date
            elif last_booking:
                b_date = last_booking.get("scheduled_at")
                if isinstance(b_date, str):
                    try:
                        b_date = datetime.fromisoformat(b_date.replace("Z", "+00:00"))
                    except Exception:
                        b_date = None
                last_session_at = b_date
            elif last_sess:
                last_session_at = last_sess.get("scheduled_at")

            # Stuck detection — handle tz-naive last_login from Mongo
            ll = u.get("last_login")
            now_utc = datetime.now(timezone.utc)
            if isinstance(ll, datetime):
                if ll.tzinfo is None:
                    ll = ll.replace(tzinfo=timezone.utc)
                stuck_days = (now_utc - ll).days
            else:
                stuck_days = 30
            stuck = stuck_days >= 7

            out.append({
                "user_id": str(u["_id"]),
                "name": u.get("full_name") or u.get("name") or u.get("email", "—").split("@")[0],
                "email": u.get("email"),
                "year": u.get("year") or u.get("current_year"),
                "graduation_year": u.get("graduation_year"),
                "institution": u.get("institution"),
                "branch": u.get("branch") or u.get("department"),
                "progress_pct": progress_pct,
                "current_week_index": current_week if current_week < total_count else None,
                "current_week_title": current_week_title,
                "milestones_done": done_count,
                "milestones_total": total_count,
                "skill_scores_top": dict(sorted((rm.get("skill_scores") or {}).items(),
                                                  key=lambda kv: -kv[1])[:3]),
                "last_session_at": last_session_at,
                "stuck": stuck,
                "stuck_days": stuck_days,
                "badges_count": len(u.get("badges") or []),
            })
        except Exception as e:
            logger.warning(f"mentee_pulse skip {mid}: {e}")

    out.sort(key=lambda m: (m.get("stuck", False), m.get("progress_pct", 0)), reverse=True)
    return {"items": out, "total": len(out)}


@router.get("/mentor/ai-studio/skill-gaps")
async def skill_gaps(user: dict = Depends(_get_current_user_dependency())):
    """Top 5 skill gaps aggregated across all mentees."""
    _ensure_mentor(user)
    ids = await _mentee_ids(user)
    counts: Dict[str, Dict[str, Any]] = {}
    for mid in ids[:50]:
        try:
            rm = await _db.career_roadmaps.find_one({"user_id": str(mid)}) or {}
        except Exception:
            continue
        for skill, score in (rm.get("skill_scores") or {}).items():
            try:
                v = float(score)
            except Exception:
                continue
            if v >= 60:
                continue  # only count gaps
            entry = counts.setdefault(skill, {"skill": skill, "mentees_below_60": 0, "avg_score": 0.0, "_sum": 0.0})
            entry["mentees_below_60"] += 1
            entry["_sum"] += v
            entry["avg_score"] = round(entry["_sum"] / entry["mentees_below_60"], 1)

    items = [{"skill": v["skill"], "mentees_below_60": v["mentees_below_60"], "avg_score": v["avg_score"]}
             for v in counts.values()]
    items.sort(key=lambda x: (-x["mentees_below_60"], x["avg_score"]))
    return {"items": items[:8], "total_mentees": len(ids)}


@router.get("/mentor/ai-studio/impact")
async def impact(user: dict = Depends(_get_current_user_dependency())):
    """Mentor's impact: milestones completed by mentees in last 30 days,
    badges earned, sessions delivered, average mentee progress lift."""
    _ensure_mentor(user)
    ids = await _mentee_ids(user)
    mid = str(user.get("_id"))
    now = datetime.now(timezone.utc)
    thirty = now - timedelta(days=30)

    sessions_30_completed = await _db.sessions.count_documents({
        "mentor_id": mid,
        "scheduled_at": {"$gte": thirty},
    })
    bookings_30 = 0
    async for b in _db.bookings.find({
        "mentor_id": mid,
        "status": {"$in": ["confirmed", "completed", "accepted"]}
    }):
        b_date = b.get("scheduled_at")
        if isinstance(b_date, str):
            try:
                b_date = datetime.fromisoformat(b_date.replace("Z", "+00:00"))
            except Exception:
                b_date = None
        if isinstance(b_date, datetime):
            if b_date.tzinfo is None:
                b_date = b_date.replace(tzinfo=timezone.utc)
            if b_date >= thirty:
                bookings_30 += 1
    sessions_30 = sessions_30_completed + bookings_30

    total_done = 0
    total_badges = 0
    total_progress = 0.0
    counted = 0
    for m_id in ids:
        rm = await _db.career_roadmaps.find_one({"user_id": str(m_id)}) or {}
        if "milestones" in rm:
            wp = rm.get("milestones") or []
            done_count = sum(1 for m in wp if m.get("completed"))
            total_count = len(wp)
            pct = round(done_count / total_count * 100) if total_count > 0 else rm.get("progress_pct", 0)
        else:
            wp = rm.get("weekly_plan") or []
            done = rm.get("milestones_completed") or []
            done_count = len(done)
            total_count = len(wp)
            pct = round(done_count / total_count * 100) if total_count > 0 else rm.get("progress_pct", 0)
            
        total_done += done_count
        total_progress += float(pct)
        try:
            try:
                u = await _db.users.find_one({"_id": ObjectId(m_id)})
            except Exception:
                u = await _db.users.find_one({"_id": m_id})
            if u:
                total_badges += len(u.get("badges") or [])
                counted += 1
        except Exception:
            pass

    avg_progress = round(total_progress / max(counted, 1), 1)

    return {
        "mentees_total": len(ids),
        "sessions_last_30d": sessions_30,
        "milestones_completed_total": total_done,
        "badges_earned_total": total_badges,
        "avg_mentee_progress_pct": avg_progress,
        "as_of": now.isoformat(),
    }


@router.post("/mentor/ai-studio/session-prep")
async def session_prep(body: Dict[str, Any] = None,
                       user: dict = Depends(_get_current_user_dependency())):
    """Generates AI-powered talking points for an upcoming mentee session.

    Uses the Emergent LLM key (Claude) over the mentee's roadmap + skill scores.
    Falls back to deterministic talking points if the LLM call fails.
    """
    _ensure_mentor(user)
    mentee_id = (body or {}).get("mentee_id")
    if not mentee_id:
        raise HTTPException(400, "mentee_id required")

    try:
        try:
            u = await _db.users.find_one({"_id": ObjectId(mentee_id)})
        except Exception:
            u = await _db.users.find_one({"_id": mentee_id}) or await _db.users.find_one({"id": mentee_id})
        if not u:
            raise HTTPException(404, "Mentee not found")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(404, "Mentee not found")

    rm = await _db.career_roadmaps.find_one({"user_id": str(u["_id"])}) or {}
    target = rm.get("target_role") or "Software Engineer"
    if "milestones" in rm:
        wp = rm.get("milestones") or []
        done = sum(1 for m in wp if m.get("completed"))
        total = len(wp)
    else:
        wp = rm.get("weekly_plan") or []
        done = len(rm.get("milestones_completed") or [])
        total = len(wp)
    progress = round(done / total * 100) if total > 0 else (rm.get("progress_pct") or 0)
    weak_skills = sorted([(k, v) for k, v in (rm.get("skill_scores") or {}).items() if v < 60],
                         key=lambda kv: kv[1])[:3]
    strong_skills = sorted([(k, v) for k, v in (rm.get("skill_scores") or {}).items() if v >= 70],
                           key=lambda kv: -kv[1])[:3]
    name = u.get("full_name") or u.get("email", "Mentee").split("@")[0]

    # Try LLM
    bullets: List[str] = []
    provider = None
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if api_key:
            chat = LlmChat(
                api_key=api_key,
                session_id=f"mentor-prep-{user['_id']}-{u['_id']}-{datetime.now().timestamp():.0f}",
                system_message=(
                    "You are a senior career coach helping a mentor prepare for a "
                    "30-minute mentee session. Output 5 concise, action-oriented "
                    "talking points (max 18 words each) tailored to the mentee's "
                    "weakest skills + current roadmap milestone. No fluff, no "
                    "preamble, only the bulleted list."
                ),
            ).with_model("anthropic", "claude-3-5-sonnet-20241022").with_max_tokens(450)
            prompt = (
                f"Mentee: {name} · Goal: {target} · Progress: {progress}% "
                f"({done}/{total} milestones)\n"
                f"Weakest skills: {', '.join(f'{k} ({v}%)' for k, v in weak_skills) or '—'}\n"
                f"Strongest skills: {', '.join(f'{k} ({v}%)' for k, v in strong_skills) or '—'}\n"
                "Output 5 talking points to advance them this session."
            )
            text = await chat.send_message(UserMessage(text=prompt))
            for line in (text or "").splitlines():
                ln = line.strip().lstrip("-•*0123456789. ").strip()
                if 6 <= len(ln) <= 200:
                    bullets.append(ln)
                    if len(bullets) >= 5:
                        break
            provider = "Claude 3.5 Sonnet"
    except Exception as e:
        logger.info(f"session_prep LLM fallback: {e}")

    if not bullets:
        # Deterministic fallback
        bullets = []
        if weak_skills:
            sk, sc = weak_skills[0]
            bullets.append(f"Open with a 5-min roleplay on {sk} (currently at {sc}%) — anchor on a real interview question.")
        if total and done < total:
            bullets.append(f"Review milestone {done + 1}/{total} together; unblock anything missing.")
        bullets.append(f"Reaffirm goal: {target}. Ask: what would push progress from {progress}% to {progress + 10}% by next week?")
        if strong_skills:
            bullets.append(f"Leverage strength in {strong_skills[0][0]} ({strong_skills[0][1]}%) — assign a 1-week public project to compound it.")
        bullets.append("Close with 1 SMART action item + book the next 30-min slot.")

    return {
        "mentee": {
            "id": str(u["_id"]),
            "name": name,
            "target_role": target,
            "progress_pct": progress,
            "weak_skills": [{"skill": k, "score": v} for k, v in weak_skills],
            "strong_skills": [{"skill": k, "score": v} for k, v in strong_skills],
        },
        "bullets": bullets[:5],
        "provider_label": provider or "Heuristic Coach",
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
