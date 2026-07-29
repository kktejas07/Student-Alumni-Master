from datetime import datetime
from typing import Any, Dict

from core.db import db as _db

async def search_jobs(args: dict, user: dict) -> dict:
    role = (args.get("role") or "").lower()
    location = (args.get("location") or "").lower()
    limit = min(int(args.get("limit") or 5), 20)
    q: Dict[str, Any] = {}
    cur = _db.internships.find(q).limit(limit)
    out = []
    async for it in cur:
        title = (it.get("title") or "")
        loc = (it.get("location") or "")
        # Cheap relevance filter
        if role and role not in title.lower():
            continue
        if location and location not in loc.lower():
            continue
        out.append({
            "id": str(it.get("_id")),
            "role": title,
            "company": it.get("company"),
            "location": loc,
            "stipend": it.get("stipend"),
            "deadline": (it.get("deadline").isoformat() if isinstance(it.get("deadline"), datetime) else None),
            "match": 80 + (len(out) * 2),
        })
    return {"count": len(out), "results": out}

async def get_wallet_balance(args: dict, user: dict) -> dict:
    sid = str(user.get("_id", ""))
    bal = await _db.wallet_balances.find_one({"user_id": sid}) or {}
    return {
        "credits": bal.get("credits", 0),
        "inr_value": bal.get("inr_value", 0),
        "lifetime_earned": bal.get("lifetime_earned", 0),
        "lifetime_spent": bal.get("lifetime_spent", 0),
        "tier": (user.get("tier") or {}).get("tier", "Bronze"),
    }

async def search_mentors(args: dict, user: dict) -> dict:
    expertise = (args.get("expertise") or "").lower()
    limit = min(int(args.get("limit") or 5), 10)
    cur = _db.users.find({"role": "mentor", "mentor_status": "approved"}).limit(limit)
    out = []
    async for m in cur:
        info = m.get("mentor_info") or {}
        skills_str = " ".join(m.get("skills", []) + [info.get("job_title", "")]).lower()
        if expertise and expertise not in skills_str:
            continue
        out.append({
            "id": str(m["_id"]),
            "name": m.get("full_name"),
            "role": info.get("job_title"),
            "company": info.get("organization"),
            "rating": m.get("rating") or 4.9,
            "price": m.get("expected_rate_inr") or 999,
        })
    return {"count": len(out), "results": out}

async def search_courses(args: dict, user: dict) -> dict:
    topic = (args.get("topic") or "").lower()
    free_only = bool(args.get("free_only", False))
    limit = min(int(args.get("limit") or 5), 10)
    q: Dict[str, Any] = {}
    if free_only:
        q["price"] = 0
    cur = _db.courses.find(q).limit(limit)
    out = []
    async for c in cur:
        title = (c.get("title") or "")
        if topic and topic not in title.lower():
            continue
        out.append({
            "id": str(c.get("_id")),
            "title": title,
            "provider": c.get("provider"),
            "price": c.get("price", 0),
            "rating": c.get("rating") or 4.5,
        })
    return {"count": len(out), "results": out}

async def get_profile(args: dict, user: dict) -> dict:
    return {
        "id":     str(user.get("_id", "")),
        "name":   user.get("full_name"),
        "email":  user.get("email"),
        "year":   (user.get("school_info") or {}).get("graduation_year"),
        "skills": user.get("skills", []),
        "tier":   (user.get("tier") or {}).get("tier"),
        "career_goal": (user.get("student_info") or {}).get("career_goal"),
    }
