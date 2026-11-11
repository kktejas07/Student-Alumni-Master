"""
Student Dashboard Summary endpoint — extracted from server.py.

GET /dashboard/student-summary
Returns a bundled payload for the Job Readiness Command Center dashboard.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends

from core.deps import get_current_user
from db import db
from services.career_ai.skill_intelligence_service import compute_full_intelligence
from services.profile_service import compute_profile_completion

router = APIRouter()


@router.get("/dashboard/student-summary")
async def student_dashboard_summary(user: dict = Depends(get_current_user)):
    """Student Dashboard Command Center — one endpoint that bundles all data needed
    for the redesigned Job Readiness Command Center dashboard.

    Combines (all from existing cached/fast sources):
      - skill_intelligence  — readiness score, skill scores, ranked_actions
      - profile_completion  — percentage + item checklist
      - user_stats          — connections, sessions, applications, streak
      - career_roadmap      — target_role, progress_pct, next milestone (from cache)
      - featured_content    — top 3 internships, top 3 mentors, top 3 events
      - notification_count  — count of unread notifications
    """
    uid = str(user.get("id") or user.get("_id"))

    # -- 1. Skill Intelligence --
    async def _get_intel():
        try:
            return await compute_full_intelligence(user, uid, db)
        except Exception:
            return {
                "readiness_score": {"score": 0, "level": "Getting Started", "next_level": "Builder", "next_threshold": 25},
                "skill_scores": {"Technical Excellence": 0, "Professional Communication": 0, "Personal Brand": 0,
                                 "Leadership & Collaboration": 0, "Career Preparation": 0, "Industry Presence": 0},
                "potential_score": 100,
                "ranked_actions": [],
                "score_explanations": {},
            }

    # -- 2. Profile Completion --
    async def _get_completion():
        try:
            user_db = await db.users.find_one({"_id": user["_id"]}, {"resume_documents": 1})
            u2 = dict(user)
            if user_db:
                u2["resume_documents"] = user_db.get("resume_documents") or []
            return compute_profile_completion(u2)
        except Exception:
            return {"percentage": 0, "items": []}

    # -- 3. User Stats --
    async def _get_stats():
        connections = sessions = applications = streak = 0
        try:
            connections = await db.connections.count_documents({
                "$or": [
                    {"from_id": uid},
                    {"to_id": uid},
                    {"a": uid},
                    {"b": uid},
                    {"mentor_id": uid},
                    {"user_id": uid},
                    {"student_id": uid},
                    {"from_user": uid},
                    {"to_user": uid}
                ],
                "status": {"$in": ["accepted", "active"]},
            })
        except Exception:
            pass
        try:
            sessions = await db.mentor_sessions.count_documents({
                "mentee_id": uid, "status": {"$in": ["completed", "done"]},
            })
        except Exception:
            pass
        try:
            applications = await db.applications.count_documents({"user_id": uid})
        except Exception:
            pass
        # streak from activity events
        try:
            today2 = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
            thirty_ago = today2 - timedelta(days=30)
            streak_days: set[str] = set()
            async for ev in db.activity_events.find({"user_id": uid, "ts": {"$gte": thirty_ago}}, {"ts": 1}):
                d_ts = ev.get("ts")
                if isinstance(d_ts, datetime):
                    streak_days.add(d_ts.date().isoformat())
            d_day = today2.date()
            if d_day.isoformat() not in streak_days:
                yesterday2 = d_day - timedelta(days=1)
                if yesterday2.isoformat() in streak_days:
                    d_day = yesterday2
            while d_day.isoformat() in streak_days:
                streak += 1
                d_day = d_day - timedelta(days=1)
        except Exception:
            pass
        return {"connections": connections, "sessions": sessions, "applications": applications, "streak": streak}

    # -- 4. Career Roadmap (cache-only, no LLM trigger) --
    async def _get_roadmap_summary():
        try:
            existing = await db.career_roadmaps.find_one({"user_id": uid})
            if not existing:
                return None
            milestones = existing.get("milestones") or []
            completed = [m for m in milestones if m.get("completed")]
            progress_pct = round(len(completed) / len(milestones) * 100) if milestones else 0
            pending = [m for m in milestones if not m.get("completed")]
            next_milestone = pending[0] if pending else None
            return {
                "target_role": existing.get("target_role", ""),
                "target_company_type": existing.get("target_company_type", ""),
                "progress_pct": progress_pct,
                "milestones_total": len(milestones),
                "milestones_completed": len(completed),
                "next_milestone": {
                    "title": next_milestone.get("title", "") if next_milestone else "",
                    "milestone_type": next_milestone.get("milestone_type", "") if next_milestone else "",
                    "description": next_milestone.get("description", "") if next_milestone else "",
                } if next_milestone else None,
            }
        except Exception:
            return None

    # -- 5. Featured Content --
    async def _get_featured():
        career_path = (user.get("career_path") or "").lower()
        # Internships
        intern_q: dict = {}
        if career_path:
            intern_q["career_paths"] = career_path
        internships = await db.internships.find(intern_q, {"_id": 0}).limit(5).to_list(5)
        # Mentors (approved only, real users first)
        mentor_q: dict = {"role": "mentor", "mentor_status": "approved"}
        if career_path:
            mentor_q["mentor_info.category"] = {
                "job": "it_software",
                "higher_education": "higher_education",
                "startup": "startup",
                "business": "business",
            }.get(career_path, "it_software")
        mentors_raw = await db.users.find(mentor_q, {"password_hash": 0}).limit(4).to_list(4)
        mentors = []
        for m in mentors_raw:
            mr = m.get("mentor_rating", {})
            mentors.append({
                "id": str(m["_id"]),
                "full_name": m.get("full_name", ""),
                "designation": (m.get("mentor_info") or {}).get("designation", ""),
                "organization": (m.get("mentor_info") or {}).get("organization", ""),
                "category": (m.get("mentor_info") or {}).get("category", ""),
                "rating": mr.get("rating", mr.get("average", 5.0)),
                "total_reviews": mr.get("total_reviews", mr.get("total", 0)),
                "bio": m.get("bio", ""),
                "skills": (m.get("mentor_info") or {}).get("skills_offered", []),
                "photo_url": m.get("face_image_base64", "") or m.get("photo_url", ""),
            })
        # Events
        events = await db.events.find(
            {"start_date": {"$gte": datetime.now(timezone.utc).replace(tzinfo=None)}},
            {"_id": 0, "title": 1, "date_str": 1, "time_str": 1, "mode": 1, "category": 1, "coverColor": 1, "capacity": 1, "mentor_id": 1}
        ).sort("start_date", 1).limit(4).to_list(4)
        return {"internships": internships, "mentors": mentors, "events": events}

    # -- 6. Notification Count --
    async def _get_notif_count():
        try:
            notifs = await db.notifications.find({"user_id": uid, "read": {"$ne": True}}).to_list(100)
            return len(notifs)
        except Exception:
            try:
                all_notifs = await db.notifications.find({"user_id": uid}).to_list(100)
                unread = [n for n in all_notifs if not n.get("read")]
                return len(unread)
            except Exception:
                return 0

    # -- 7. AI Coach Data (computed, no LLM) --
    async def _get_coach_data(intel_data):
        try:
            rs = intel_data.get("readiness_score", {})
            scores = intel_data.get("skill_scores", {})
            actions = intel_data.get("ranked_actions", [])
            expl = intel_data.get("score_explanations", {})

            sorted_cats = sorted(scores.items(), key=lambda x: x[1])
            weakest = sorted_cats[0] if sorted_cats else ("Unknown", 0)
            strongest = sorted_cats[-1] if sorted_cats else ("Unknown", 100)

            top_action = actions[0] if actions else None
            total_gain = sum(a.get("gain", 0) for a in actions[:3])

            raw_confidence = max(0, 100 - weakest[1])
            confidence = min(95, max(60, raw_confidence))

            cat_expl = (expl.get("categories") or {}).get(weakest[0], {})
            factors = cat_expl.get("factors", []) if cat_expl else []

            return {
                "current_readiness": rs.get("score", 0),
                "current_tier": rs.get("level", "Getting Started"),
                "next_tier": rs.get("next_level", "Builder"),
                "points_to_next": max(0, rs.get("next_threshold", 100) - rs.get("score", 0)),
                "weakest_category": weakest[0],
                "weakest_score": weakest[1],
                "strongest_category": strongest[0],
                "strongest_score": strongest[1],
                "top_action": top_action,
                "total_potential_gain_today": total_gain,
                "confidence_score": confidence,
                "score_factors": factors[:3],
            }
        except Exception:
            return {}

    # -- 8. Career Insights --
    async def _get_career_insights(intel_data, completion_data, stats_data):
        insights = []
        try:
            rs = intel_data.get("readiness_score", {})
            scores = intel_data.get("skill_scores", {})
            actions = intel_data.get("ranked_actions", [])
            sorted_cats = sorted(scores.items(), key=lambda x: x[1]) if scores else []
            weakest = sorted_cats[0] if sorted_cats else None
            profile_pct = completion_data.get("percentage", 0)

            thirty_ago = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=30)
            profile_views = 0
            try:
                profile_views = await db.analytics_events.count_documents({
                    "target_id": uid, "event_type": "profile_view",
                    "ts": {"$gte": thirty_ago}
                })
                if profile_views == 0:
                    profile_views = await db.page_views.count_documents({
                        "target_user_id": uid, "ts": {"$gte": thirty_ago}
                    })
            except Exception:
                profile_views = 0

            # Resume age signal
            try:
                user_doc = await db.users.find_one({"_id": user["_id"]}, {"resume_documents": 1, "updated_at": 1})
                resume_docs = (user_doc or {}).get("resume_documents") or []
                has_resume = len(resume_docs) > 0
                if has_resume:
                    latest_resume_ts = None
                    for r in resume_docs:
                        rt = r.get("uploaded_at") or r.get("created_at")
                        if rt and (latest_resume_ts is None or rt > latest_resume_ts):
                            latest_resume_ts = rt
                    if latest_resume_ts:
                        delta = datetime.now(timezone.utc).replace(tzinfo=None) - latest_resume_ts
                        days_old = delta.days
                        if days_old > 30:
                            insights.append({
                                "icon": "file-text", "color": "#F59E0B",
                                "text": f"Resume hasn't been updated in {days_old} days",
                                "type": "warning", "priority": 2,
                            })
                        else:
                            insights.append({
                                "icon": "file-text", "color": "#34D399",
                                "text": f"Resume uploaded {days_old} days ago — keep it current",
                                "type": "positive", "priority": 5,
                            })
                else:
                    insights.append({
                        "icon": "file-text", "color": "#F87171",
                        "text": "No resume uploaded yet — this blocks most applications",
                        "type": "blocker", "priority": 1,
                    })
            except Exception:
                pass

            if profile_views > 0:
                insights.append({
                    "icon": "eye", "color": "#60A5FA",
                    "text": f"Profile viewed {profile_views} time{'s' if profile_views != 1 else ''} this month",
                    "type": "positive", "priority": 4,
                })

            if weakest and weakest[1] < 50:
                insights.append({
                    "icon": "alert-triangle", "color": "#F87171",
                    "text": f"{weakest[0]} is your weakest area at {weakest[1]}% — focus here for fastest gains",
                    "type": "warning", "priority": 1,
                })
            elif weakest:
                insights.append({
                    "icon": "trending-up", "color": "#A78BFA",
                    "text": f"{weakest[0]} has room to grow ({weakest[1]}%) — targeted effort could push it up",
                    "type": "info", "priority": 3,
                })

            connections = stats_data.get("connections", 0)
            if connections == 0:
                insights.append({
                    "icon": "users", "color": "#A78BFA",
                    "text": "No connections yet — networking is below average for your career stage",
                    "type": "action", "priority": 2,
                })
            elif connections < 5:
                insights.append({
                    "icon": "users", "color": "#60A5FA",
                    "text": f"{connections} connection{'s' if connections != 1 else ''} — aim for 10+ to strengthen your network score",
                    "type": "info", "priority": 4,
                })

            apps = stats_data.get("applications", 0)
            if apps == 0:
                insights.append({
                    "icon": "briefcase", "color": "#F59E0B",
                    "text": "No internship applications sent — start applying to boost Career Preparation",
                    "type": "action", "priority": 2,
                })

            total_gain = sum(a.get("gain", 0) for a in actions[:3])
            if total_gain > 0:
                insights.append({
                    "icon": "zap", "color": "#2DD4BF",
                    "text": f"+{total_gain}% readiness possible if you complete today's top {min(len(actions), 3)} actions",
                    "type": "highlight", "priority": 0,
                })

            if profile_pct < 60:
                insights.append({
                    "icon": "target", "color": "#F87171",
                    "text": f"Profile is only {profile_pct}% complete — recruiters skip incomplete profiles",
                    "type": "blocker", "priority": 1,
                })

            score = rs.get("score", 0)
            next_level = rs.get("next_level", "")
            pts_to_next = max(0, rs.get("next_threshold", 100) - score)
            if pts_to_next > 0 and pts_to_next <= 15:
                insights.append({
                    "icon": "trophy", "color": "#F59E0B",
                    "text": f"Only {pts_to_next}% away from {next_level} tier — you're almost there!",
                    "type": "highlight", "priority": 0,
                })

            insights.sort(key=lambda x: x.get("priority", 5))
            return insights[:6]
        except Exception:
            return []

    # -- 9. Yesterday's Activity Wins --
    async def _get_yesterday_wins():
        try:
            yesterday_start = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=24)
            events = await db.activity_events.find(
                {"user_id": uid, "ts": {"$gte": yesterday_start}},
                {"title": 1, "sub": 1, "icon": 1, "tint": 1}
            ).sort("ts", -1).limit(5).to_list(5)
            wins = []
            for ev in events:
                wins.append({
                    "label": ev.get("title", "Activity"),
                    "detail": ev.get("sub", ""),
                    "icon": ev.get("icon", "check-circle"),
                    "color": ev.get("tint", "#34D399"),
                })
            return wins
        except Exception:
            return []

    # -- Run all in parallel --
    intel, completion, stats, roadmap, featured, notif_count = await asyncio.gather(
        _get_intel(),
        _get_completion(),
        _get_stats(),
        _get_roadmap_summary(),
        _get_featured(),
        _get_notif_count(),
    )

    # Coach + Insights depend on intel/completion/stats — run after gather
    coach_data, career_insights, yesterday_wins = await asyncio.gather(
        _get_coach_data(intel),
        _get_career_insights(intel, completion, stats),
        _get_yesterday_wins(),
    )

    return {
        "skill_intelligence": intel,
        "profile_completion": completion,
        "stats": stats,
        "career_roadmap": roadmap,
        "featured": featured,
        "notification_count": notif_count,
        "ai_coach": coach_data,
        "career_insights": career_insights,
        "yesterday_wins": yesterday_wins,
        "predictions": intel.get("predictions", {}) if isinstance(intel, dict) else {},
        "readiness_estimates": intel.get("readiness_estimates", {}) if isinstance(intel, dict) else {},
        "user": {
            "full_name": user.get("full_name", ""),
            "role": user.get("role", "student"),
            "career_path": user.get("career_path", ""),
            "career_goal": (user.get("student_info") or {}).get("career_goal") or user.get("career_goal", ""),
        },
    }
