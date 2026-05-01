"""
Export Seeded Data — JSON + CSV for local analysis/testing.
============================================================
Exports the realistic seed dataset to /app/backend/seed_data_export/
as both JSON (structured) and CSV (Excel-compatible).

Files generated:
  • users.json                — All 1360 users with tier + breakdown
  • users.csv                 — Flat CSV for Excel/sheets
  • students.csv              — Students-only with tier metrics
  • mentors.csv               — Mentors-only
  • colleges.csv              — Colleges with NIRF/NAAC/placement
  • internships.csv           — All seeded internships
  • events.csv                — All seeded events
  • kpi_dashboard.json        — Aggregated KPIs per role × tier
  • analytics_events.csv      — Synthetic Firebase events (100-user sample)

USAGE:
    cd /app/backend && python3 export_seed_data.py
"""
from __future__ import annotations

import asyncio
import csv
import json
import os
import random
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List

from bson import ObjectId
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / ".env")

_mongo = AsyncIOMotorClient(os.environ["MONGO_URL"])
_db = _mongo[os.environ["DB_NAME"]]

EXPORT_DIR = Path(__file__).parent / "seed_data_export"
EXPORT_DIR.mkdir(exist_ok=True)

random.seed(42)


def _safe(v: Any) -> Any:
    """Convert Mongo-specific types to JSON-serialisable."""
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, datetime):
        return v.isoformat()
    if isinstance(v, dict):
        return {k: _safe(x) for k, x in v.items()}
    if isinstance(v, list):
        return [_safe(x) for x in v]
    return v


def _flatten(d: Dict[str, Any], parent: str = "", sep: str = ".") -> Dict[str, Any]:
    flat = {}
    for k, v in d.items():
        nk = f"{parent}{sep}{k}" if parent else k
        if isinstance(v, dict):
            flat.update(_flatten(v, nk, sep))
        elif isinstance(v, list):
            flat[nk] = "; ".join(str(x) for x in v[:5])  # cap lists
        else:
            flat[nk] = v
    return flat


def _write_csv(path: Path, rows: List[Dict[str, Any]], cols: List[str]):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            # stringify everything else
            row = {c: ("" if r.get(c) is None else str(r.get(c)))[:500] for c in cols}
            w.writerow(row)


async def export_users():
    print("📥 Fetching users...")
    cur = _db.users.find({})
    users = []
    async for u in cur:
        u_safe = _safe(u)
        users.append(u_safe)

    # JSON
    out = []
    for u in users:
        out.append({
            "id": u.get("_id"),
            "email": u.get("email"),
            "role": u.get("role"),
            "full_name": u.get("full_name"),
            "tier": u.get("tier"),
            "tier_score": u.get("tier_score"),
            "tier_breakdown": u.get("tier_breakdown"),
            "skills": u.get("skills"),
            "city": u.get("city"),
            "state": u.get("state"),
            "school_info": u.get("school_info"),
            "mentor_info": u.get("mentor_info"),
            "student_info": u.get("student_info"),
            "phone": u.get("phone"),
            "onboarding_completed": u.get("onboarding_completed"),
            "created_at": u.get("created_at"),
        })

    json_path = EXPORT_DIR / "users.json"
    json_path.write_text(json.dumps(out, indent=2, default=str))
    print(f"  ✓ {json_path} ({len(out)} users)")

    # Master CSV — flat
    cols = ["id", "email", "role", "full_name", "tier", "tier_score",
            "city", "state", "skills", "phone", "onboarding_completed", "created_at"]
    rows = []
    for u in out:
        rows.append({
            "id": u["id"], "email": u["email"], "role": u["role"], "full_name": u["full_name"],
            "tier": u["tier"], "tier_score": u["tier_score"], "city": u["city"], "state": u["state"],
            "skills": "; ".join((u["skills"] or [])[:5]),
            "phone": u["phone"], "onboarding_completed": u["onboarding_completed"],
            "created_at": u["created_at"],
        })
    _write_csv(EXPORT_DIR / "users.csv", rows, cols)
    print(f"  ✓ users.csv")

    # Students CSV
    s_cols = ["id", "email", "full_name", "tier", "tier_score", "college", "branch",
              "graduation_year", "cgpa", "skills_count", "career_path", "city", "state"]
    s_rows = []
    for u in out:
        if u["role"] != "student": continue
        si = u.get("school_info") or {}
        s_rows.append({
            "id": u["id"], "email": u["email"], "full_name": u["full_name"],
            "tier": u["tier"], "tier_score": u["tier_score"],
            "college": si.get("institution_name"), "branch": si.get("branch_or_stream"),
            "graduation_year": si.get("graduation_year"), "cgpa": si.get("cgpa"),
            "skills_count": len(u.get("skills") or []),
            "career_path": (u.get("student_info") or {}).get("career_goal"),
            "city": u["city"], "state": u["state"],
        })
    _write_csv(EXPORT_DIR / "students.csv", s_rows, s_cols)
    print(f"  ✓ students.csv ({len(s_rows)} rows)")

    # Mentors CSV
    m_cols = ["id", "email", "full_name", "tier", "tier_score", "job_title", "organization",
              "industry", "years_of_experience", "expected_rate_inr", "rating",
              "sessions_completed", "city"]
    m_rows = []
    for u in out:
        if u["role"] != "mentor": continue
        mi = u.get("mentor_info") or {}
        m_rows.append({
            "id": u["id"], "email": u["email"], "full_name": u["full_name"],
            "tier": u["tier"], "tier_score": u["tier_score"],
            "job_title": mi.get("job_title"), "organization": mi.get("organization"),
            "industry": mi.get("industry"), "years_of_experience": mi.get("years_of_experience"),
            "expected_rate_inr": users_full_lookup(users, u["id"], "expected_rate_inr"),
            "rating": users_full_lookup(users, u["id"], "rating"),
            "sessions_completed": users_full_lookup(users, u["id"], "sessions_completed"),
            "city": u["city"],
        })
    _write_csv(EXPORT_DIR / "mentors.csv", m_rows, m_cols)
    print(f"  ✓ mentors.csv ({len(m_rows)} rows)")
    return users


def users_full_lookup(users_full: List[Dict[str, Any]], uid: str, key: str):
    for u in users_full:
        if str(u.get("_id")) == uid:
            return u.get(key)
    return None


async def export_colleges():
    print("📥 Fetching colleges metadata...")
    cur = _db.colleges_meta.find({})
    cols = ["name", "city", "state", "naac", "nirf_rank", "type", "placement_pct",
            "fee_lpa", "established_year", "tier", "tier_score", "status"]
    rows = []
    async for c in cur:
        c = _safe(c)
        rows.append({k: c.get(k) for k in cols})
    _write_csv(EXPORT_DIR / "colleges.csv", rows, cols)
    print(f"  ✓ colleges.csv ({len(rows)} rows)")
    # JSON also
    (EXPORT_DIR / "colleges.json").write_text(json.dumps(rows, indent=2, default=str))


async def export_internships():
    print("📥 Fetching internships...")
    cur = _db.internships.find({})
    cols = ["id", "title", "company", "location", "stipend", "duration", "type", "mode",
            "skills", "deadline", "url"]
    rows = []
    async for it in cur:
        it = _safe(it)
        rows.append({
            "id": it.get("_id"),
            "title": it.get("title"), "company": it.get("company"),
            "location": it.get("location"), "stipend": it.get("stipend"),
            "duration": it.get("duration"), "type": it.get("type"), "mode": it.get("mode"),
            "skills": "; ".join((it.get("skills") or [])[:5]),
            "deadline": it.get("deadline"), "url": it.get("url"),
        })
    _write_csv(EXPORT_DIR / "internships.csv", rows, cols)
    print(f"  ✓ internships.csv ({len(rows)} rows)")


async def export_events():
    print("📥 Fetching events...")
    cur = _db.events.find({})
    cols = ["id", "title", "category", "mode", "college_name", "start_date",
            "registration_deadline", "price", "capacity"]
    rows = []
    async for ev in cur:
        ev = _safe(ev)
        rows.append({
            "id": ev.get("_id"),
            "title": ev.get("title"), "category": ev.get("category"), "mode": ev.get("mode"),
            "college_name": ev.get("college_name"), "start_date": ev.get("start_date"),
            "registration_deadline": ev.get("registration_deadline"),
            "price": ev.get("price"), "capacity": ev.get("capacity"),
        })
    _write_csv(EXPORT_DIR / "events.csv", rows, cols)
    print(f"  ✓ events.csv ({len(rows)} rows)")


async def export_kpi_dashboard(users: List[Dict[str, Any]]):
    """Per-role × per-tier aggregates that mirror the admin analytics."""
    print("📥 Aggregating KPI dashboard...")
    kpi: Dict[str, Any] = {
        "summary": {
            "total_users": len(users),
            "by_role": {},
            "by_tier": {},
        },
        "students_by_tier": {"Bronze": 0, "Silver": 0, "Gold": 0, "Platinum": 0},
        "mentors_by_tier": {"Bronze": 0, "Silver": 0, "Gold": 0, "Platinum": 0},
        "colleges_by_tier": {"Bronze": 0, "Silver": 0, "Gold": 0, "Platinum": 0},
        "avg_tier_score_by_role": {},
        "top_colleges_by_student_count": {},
        "skills_top_20": {},
    }
    role_scores: Dict[str, List[int]] = {}
    college_counts: Dict[str, int] = {}
    skill_counts: Dict[str, int] = {}

    for u in users:
        role = u.get("role")
        tier = u.get("tier")
        kpi["summary"]["by_role"][role] = kpi["summary"]["by_role"].get(role, 0) + 1
        if tier:
            kpi["summary"]["by_tier"][tier] = kpi["summary"]["by_tier"].get(tier, 0) + 1
        if role == "student" and tier:
            kpi["students_by_tier"][tier] += 1
        if role == "mentor" and tier:
            kpi["mentors_by_tier"][tier] += 1
        if role == "college" and tier:
            kpi["colleges_by_tier"][tier] += 1
        if u.get("tier_score") is not None and role:
            role_scores.setdefault(role, []).append(u["tier_score"])
        si = u.get("school_info") or {}
        if si.get("institution_name") and role == "student":
            college_counts[si["institution_name"]] = college_counts.get(si["institution_name"], 0) + 1
        for s in (u.get("skills") or []):
            skill_counts[s] = skill_counts.get(s, 0) + 1

    for role, scores in role_scores.items():
        kpi["avg_tier_score_by_role"][role] = round(sum(scores) / len(scores), 2) if scores else 0
    kpi["top_colleges_by_student_count"] = dict(
        sorted(college_counts.items(), key=lambda x: -x[1])[:15]
    )
    kpi["skills_top_20"] = dict(sorted(skill_counts.items(), key=lambda x: -x[1])[:20])

    path = EXPORT_DIR / "kpi_dashboard.json"
    path.write_text(json.dumps(kpi, indent=2, default=str))
    print(f"  ✓ {path}")


async def synthetic_firebase_events():
    """Emit 100 sample analytics events into db.analytics_events to mirror Firebase."""
    print("📡 Generating synthetic Firebase events for 100 user sessions...")
    EVENT_TYPES = [
        ("login_success", 0.20),
        ("dashboard_view", 0.30),
        ("internship_view", 0.15),
        ("internship_apply", 0.08),
        ("mentor_view", 0.10),
        ("mentor_book", 0.04),
        ("event_view", 0.06),
        ("event_rsvp", 0.04),
        ("profile_edit", 0.03),
    ]
    weights = [w for _, w in EVENT_TYPES]
    names = [n for n, _ in EVENT_TYPES]

    # pick 100 random users
    sample_users = await _db.users.aggregate([
        {"$sample": {"size": 100}},
    ]).to_list(100)

    events = []
    for user in sample_users:
        # 20-80 events per user
        n = random.randint(20, 80)
        base_ts = datetime.now(timezone.utc) - timedelta(days=30)
        for _ in range(n):
            evt_name = random.choices(names, weights=weights, k=1)[0]
            base_ts += timedelta(seconds=random.randint(60, 3600))
            events.append({
                "user_id": str(user["_id"]),
                "user_email": user.get("email"),
                "user_role": user.get("role"),
                "user_tier": user.get("tier"),
                "event_name": evt_name,
                "platform": random.choice(["web", "ios", "android"]),
                "session_id": f"s_{random.randint(100000, 999999)}",
                "occurred_at": base_ts,
                "props": {
                    "screen": evt_name.split("_")[0],
                    "tier": user.get("tier"),
                },
            })

    if events:
        await _db.analytics_events.delete_many({})
        await _db.analytics_events.insert_many(events)

    # Also dump as CSV
    cols = ["user_id", "user_email", "user_role", "user_tier", "event_name",
            "platform", "session_id", "occurred_at"]
    rows = [{k: e.get(k) for k in cols} for e in events]
    _write_csv(EXPORT_DIR / "analytics_events.csv", rows, cols)
    (EXPORT_DIR / "analytics_events.json").write_text(
        json.dumps([_safe(e) for e in events], indent=2, default=str)
    )
    print(f"  ✓ Inserted {len(events)} events for {len(sample_users)} users")
    print(f"  ✓ analytics_events.csv + analytics_events.json")


async def main():
    print("=" * 70)
    print("EXPORTING SEED DATA → /app/backend/seed_data_export/")
    print("=" * 70)
    users = await export_users()
    await export_colleges()
    await export_internships()
    await export_events()
    await export_kpi_dashboard(users)
    await synthetic_firebase_events()

    # Manifest
    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "files": [
            "users.json", "users.csv", "students.csv", "mentors.csv",
            "colleges.csv", "colleges.json", "internships.csv", "events.csv",
            "kpi_dashboard.json", "analytics_events.csv", "analytics_events.json",
        ],
        "credentials": "All seeded users use password: TestPass@123",
        "scope": "1360 users (1000 students + 200 mentors + 140 colleges + 20 admins) + 300 internships + 100 events",
    }
    (EXPORT_DIR / "MANIFEST.json").write_text(json.dumps(manifest, indent=2))
    print("=" * 70)
    print(f"✅ ALL EXPORTS DONE → {EXPORT_DIR}")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
