"""
alumni_transition_engine.py — MT7: student → alumni transition + mentor eligibility.

Imported by `features/routers/users.py` as `transition_to_alumni(db, user)`.
The module previously did not exist, so the caller silently fell back to a
no-op stub — students could hit POST /users/me/transition-alumni and nothing
changed. This module restores the real behavior:

  1. Marks the user as an alumni (role flip + alumni metadata + graduation).
  2. Computes **mentor eligibility** (years of experience ≥ 4, a LinkedIn
     profile, and at least one skill) and stores it in
     `user["mentor_eligibility"]` so the super-admin "Potential Mentors"
     pipeline (GET /admin/mentors/eligible-alumni) can surface them.
  3. Best-effort: records an activity-log entry and notifies the user of
     their new alumni status + the mentor application path.

The function is best-effort: any sub-step that fails logs and continues —
a transition must never be rolled back because a notification failed.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

logger = logging.getLogger("alumni_transition")


def _years_of_experience(user: dict) -> int:
    """Derive years of experience from graduation year / experience fields."""
    info = user.get("alumni_info") or {}
    direct = user.get("years_of_experience") or info.get("years_of_experience")
    if isinstance(direct, (int, float)) and direct > 0:
        return int(direct)
    grad = info.get("graduation_year") or user.get("graduation_year") or (user.get("school_info") or {}).get("graduation_year")
    if isinstance(grad, (int, str)) and str(grad).isdigit():
        now_year = datetime.now(timezone.utc).year
        return max(0, now_year - int(grad))
    return 0


def compute_mentor_eligibility(user: dict) -> Dict[str, Any]:
    """Determine whether an alumni can become a mentor, and why."""
    years = _years_of_experience(user)
    linkedin = bool(user.get("linkedin_url") or (user.get("mentor_info") or {}).get("linkedin_url"))
    skills: list = list(user.get("skills") or [])
    alumni_info = user.get("alumni_info") or {}
    if not skills:
        skills = [s for s in ((alumni_info.get("expertise") or []) or (user.get("interests") or [])) if s]

    reasons: Dict[str, bool] = {
        "min_experience": years >= 4,
        "linkedin_present": linkedin,
        "has_skills": len(skills) >= 1,
    }
    return {
        "qualified": all(reasons.values()),
        "years_of_experience": years,
        "checks": reasons,
        "wants_to_mentor": bool(alumni_info.get("wants_to_mentor") or user.get("wants_to_mentor")),
        "computed_at": datetime.now(timezone.utc).isoformat(),
    }


async def transition_to_alumni(db, user: dict, *, source: str = "user_action") -> Optional[dict]:
    """Transition a student (or already-alumni) user to full alumni status.

    Returns the updated user document, or None if the user no longer exists.
    Never raises for sub-step failures — the role flip itself is the
    load-bearing write; everything else is best-effort.
    """
    user_id = str(user.get("_id") or user.get("id"))
    now = datetime.now(timezone.utc)

    base_update: Dict[str, Any] = {
        "role": "alumni",
        "alumni_status": "active",
        "alumni_transitioned_at": now,
        "alumni_transition_source": source,
        "can_transition_alumni": False,
    }

    # Carry the graduation year into alumni_info if not already set
    alumni_info = dict(user.get("alumni_info") or {})
    if not alumni_info.get("graduation_year"):
        gy = user.get("graduation_year") or (user.get("school_info") or {}).get("graduation_year")
        if gy:
            alumni_info["graduation_year"] = gy
    if not alumni_info.get("alumni_employer"):
        alumni_info["alumni_employer"] = user.get("current_company") or user.get("company")
    base_update["alumni_info"] = alumni_info

    # Mentor eligibility (MT7 pipeline input)
    candidate = {**user, **base_update}
    base_update["mentor_eligibility"] = compute_mentor_eligibility(candidate)
    base_update["alumni_eligible_for_mentoring"] = base_update["mentor_eligibility"]["qualified"]

    from bson import ObjectId
    oid = ObjectId(user_id) if ObjectId.is_valid(user_id) else user.get("_id")
    result = await db.users.update_one({"_id": oid}, {"$set": base_update})
    if result.matched_count == 0:
        logger.warning("transition_to_alumni: no user matched id=%s", user_id)
        return None

    fresh = await db.users.find_one({"_id": oid})

    # Best-effort activity log
    try:
        await db.activity_log.insert_one({
            "user_id": user_id, "type": "alumni_transition",
            "source": source, "eligible_for_mentoring": base_update["alumni_eligibility"]["qualified"],
            "created_at": now,
        })
    except Exception as e:  # noqa: BLE001
        logger.info("transition_to_alumni: activity log write failed: %s", e)

    # Best-effort inbox notification to the user
    try:
        from features.notifications import _log_inbox
        await _log_inbox(
            db, user_id, "You're now an alumni 🎓",
            "Your account has moved to alumni status. "
            + ("You're eligible to apply as a mentor — complete your mentor profile to get started."
               if base_update["alumni_eligibility"]["qualified"]
               else "Keep your profile fresh; you can apply to mentor once you hit 4+ years of experience with a LinkedIn profile."),
            {"type": "alumni_transition"},
        )
    except Exception as e:  # noqa: BLE001
        logger.info("transition_to_alumni: inbox notify failed: %s", e)

    return fresh
