"""
Realistic Mock Data Seeder — 1360 users distributed across all 4 tiers.
=======================================================================
Generates:
  - 1000 students (Bronze 30%, Silver 35%, Gold 25%, Platinum 10%)
  -  200 mentors  (Bronze 25%, Silver 35%, Gold 30%, Platinum 10%)
  -  140 colleges (sourced from real NIRF top 140)
  -   20 admins   (super admins + sub-admins)
  -  300 internships (tied to real companies)
  -  100 events    (across colleges)

All data uses real Indian college names + real company names + common
Indian first/last names. Tiers are computed dynamically by tier_logic.py
and persisted on user.tier for fast reads.

USAGE:
    cd /app/backend && python3 seed_realistic.py [--reset] [--count=1000]

Idempotent — uses email as primary key. --reset wipes generated users
(but preserves seeded test_credentials.md accounts).
"""
from __future__ import annotations

import argparse
import asyncio
import os
import random
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List

import bcrypt
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / ".env")

from seed_real_datasets import (
    COLLEGES_REAL, COMPANIES_REAL, SKILLS_REAL,
    INDIAN_FIRST_NAMES, INDIAN_LAST_NAMES, JOB_TITLES, BRANCHES,
)
from tier_logic import (
    compute_student_tier, compute_mentor_tier, compute_college_tier,
)

# Mongo
_mongo = AsyncIOMotorClient(os.environ["MONGO_URL"])
_db = _mongo[os.environ["DB_NAME"]]

# Global RNG seed for reproducibility
random.seed(42)

PROTECTED_EMAILS = {
    "admin@careerpath.app", "student01@test.com", "mentor01@test.com",
    "college01@test.com", "alumni01@test.com", "iith@university.in",
}

DEFAULT_PWD_HASH = bcrypt.hashpw(b"TestPass@123", bcrypt.gensalt()).decode()


# ─── helpers ────────────────────────────────────────────────────
def _email(first: str, last: str, idx: int, role: str) -> str:
    """Generate deterministic email."""
    base = f"{first.lower()}.{last.lower()}{idx}".replace(" ", "")
    return f"{base}@{role}.demo"


def _random_skills(target_tier: str) -> List[str]:
    """Pick skill set sized by target tier."""
    counts = {"Bronze": (1, 3), "Silver": (3, 6), "Gold": (5, 9), "Platinum": (8, 14)}
    lo, hi = counts.get(target_tier, (3, 6))
    n = random.randint(lo, hi)
    return random.sample(SKILLS_REAL, n)


def _pick_college_for_tier(tier: str) -> Dict[str, Any]:
    """Filter colleges by NIRF rank to bucket into tiers."""
    if tier == "Platinum":
        pool = [c for c in COLLEGES_REAL if c["nirf_rank"] <= 15]
    elif tier == "Gold":
        pool = [c for c in COLLEGES_REAL if 15 < c["nirf_rank"] <= 50]
    elif tier == "Silver":
        pool = [c for c in COLLEGES_REAL if 50 < c["nirf_rank"] <= 150]
    else:
        pool = [c for c in COLLEGES_REAL if c["nirf_rank"] > 150]
    return random.choice(pool or COLLEGES_REAL)


def _pick_company_for_tier(tier: str) -> Dict[str, Any]:
    pool = [c for c in COMPANIES_REAL if c["tier"] == tier]
    if not pool:
        pool = COMPANIES_REAL
    return random.choice(pool)


def _gen_name() -> tuple[str, str]:
    return random.choice(INDIAN_FIRST_NAMES), random.choice(INDIAN_LAST_NAMES)


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ─── student generation ─────────────────────────────────────────
async def gen_student(idx: int, target_tier: str) -> Dict[str, Any]:
    first, last = _gen_name()
    college = _pick_college_for_tier(target_tier)
    branch = random.choice(BRANCHES)
    year_now = datetime.now().year
    # Year of study based on tier — Platinum tend to be final year
    if target_tier == "Platinum":
        grad_year = year_now + random.choice([0, 1])
    elif target_tier == "Gold":
        grad_year = year_now + random.choice([0, 1, 2])
    elif target_tier == "Silver":
        grad_year = year_now + random.choice([1, 2, 3])
    else:
        grad_year = year_now + random.choice([2, 3, 4])

    skills = _random_skills(target_tier)
    has_face = target_tier in ("Gold", "Platinum") or random.random() > 0.5
    has_github = target_tier in ("Silver", "Gold", "Platinum")
    projects_count = {"Bronze": 0, "Silver": 1, "Gold": 3, "Platinum": 6}[target_tier]

    user = {
        "email": _email(first, last, idx, "student"),
        "password_hash": DEFAULT_PWD_HASH,
        "role": "student",
        "first_name": first,
        "last_name": last,
        "full_name": f"{first} {last}",
        "phone": f"+91{random.randint(7000000000, 9999999999)}",
        "city": college["city"],
        "state": college["state"],
        "skills": skills,
        "interests": random.sample(skills, min(3, len(skills))),
        "career_path": random.choice(["job", "higher_education", "startup"]),
        "school_info": {
            "institution_name": college["name"],
            "branch_or_stream": branch,
            "graduation_year": grad_year,
            "class_or_year": "Final Year" if grad_year <= year_now + 1 else "Junior",
            "cgpa": round(random.uniform(6.5, 9.5) if target_tier != "Bronze" else random.uniform(5.5, 7.5), 2),
        },
        "student_info": {
            "career_goal": f"{random.choice(JOB_TITLES[target_tier])} at top {random.choice(['Tech', 'Finance', 'Product'])} Company",
        },
        "face_image_base64": "data:image/svg+xml;base64,..." if has_face else None,
        "github_url": f"https://github.com/{first.lower()}{last.lower()}{idx}" if has_github else None,
        "projects": [
            {"name": f"Project {i+1}", "description": f"A {skills[0] if skills else 'demo'} project"}
            for i in range(projects_count)
        ],
        "onboarding_completed": target_tier != "Bronze",
        "_seed_target_tier": target_tier,
        "created_at": _now() - timedelta(days=random.randint(1, 365)),
    }

    # Compute persisted tier
    tier_result = compute_student_tier(user, college["naac"])
    user["tier"] = tier_result["tier"]
    user["tier_score"] = tier_result["score"]
    user["tier_breakdown"] = tier_result["breakdown"]
    return user


# ─── mentor generation ──────────────────────────────────────────
async def gen_mentor(idx: int, target_tier: str) -> Dict[str, Any]:
    first, last = _gen_name()
    company = _pick_company_for_tier(target_tier)
    title = random.choice(JOB_TITLES[target_tier])
    yoe = {"Bronze": (1, 3), "Silver": (3, 7), "Gold": (7, 12), "Platinum": (12, 25)}[target_tier]
    years = random.randint(*yoe)
    skills = _random_skills(target_tier)

    user = {
        "email": _email(first, last, idx, "mentor"),
        "password_hash": DEFAULT_PWD_HASH,
        "role": "mentor",
        "mentor_status": "approved" if target_tier != "Bronze" else random.choice(["approved", "pending"]),
        "first_name": first,
        "last_name": last,
        "full_name": f"{first} {last}",
        "phone": f"+91{random.randint(7000000000, 9999999999)}",
        "city": company["city"],
        "skills": skills,
        "expertise_areas": skills[:5],
        "mentor_info": {
            "job_title": title,
            "organization": company["name"],
            "years_of_experience": years,
            "industry": company["industry"],
        },
        "expected_rate_inr": {"Bronze": 499, "Silver": 999, "Gold": 1999, "Platinum": 4999}[target_tier],
        "rating": {"Bronze": 4.2, "Silver": 4.5, "Gold": 4.7, "Platinum": 4.9}[target_tier] + random.uniform(-0.1, 0.1),
        "onboarding_completed": True,
        "_seed_target_tier": target_tier,
        "created_at": _now() - timedelta(days=random.randint(30, 720)),
    }

    # Approximate sessions count based on tier
    sess_count = {"Bronze": random.randint(0, 8), "Silver": random.randint(8, 30),
                  "Gold": random.randint(30, 80), "Platinum": random.randint(80, 250)}[target_tier]
    avg_rating = round(user["rating"], 1)

    tier_result = compute_mentor_tier(user, sess_count, avg_rating)
    user["tier"] = tier_result["tier"]
    user["tier_score"] = tier_result["score"]
    user["tier_breakdown"] = tier_result["breakdown"]
    user["sessions_completed"] = sess_count
    return user


# ─── college generation ─────────────────────────────────────────
async def gen_college_user(college_def: Dict[str, Any], idx: int) -> Dict[str, Any]:
    safe_name = college_def["name"].lower().replace(" ", "").replace("'", "").replace(".", "").replace(",", "")[:20]
    return {
        "email": f"admin{idx}@{safe_name}.demo",
        "password_hash": DEFAULT_PWD_HASH,
        "role": "college",
        "first_name": "Admin",
        "last_name": college_def["name"].split()[0],
        "full_name": f"Admin · {college_def['name']}",
        "school_info": {
            "institution_name": college_def["name"],
        },
        "city": college_def["city"],
        "state": college_def["state"],
        "onboarding_completed": True,
        "created_at": _now() - timedelta(days=random.randint(180, 1500)),
    }


# ─── admin generation ──────────────────────────────────────────
async def gen_admin(idx: int) -> Dict[str, Any]:
    first, last = _gen_name()
    return {
        "email": _email(first, last, idx, "admin"),
        "password_hash": DEFAULT_PWD_HASH,
        "role": "admin",
        "first_name": first,
        "last_name": last,
        "full_name": f"{first} {last}",
        "is_super_admin": idx <= 5,
        "phone": f"+91{random.randint(7000000000, 9999999999)}",
        "onboarding_completed": True,
        "created_at": _now() - timedelta(days=random.randint(180, 1500)),
    }


# ─── internships generation ────────────────────────────────────
def gen_internship(idx: int) -> Dict[str, Any]:
    company = random.choice(COMPANIES_REAL)
    is_intern = random.random() < 0.6
    skills = random.sample(SKILLS_REAL, random.randint(2, 5))
    title = random.choice([
        "Software Engineering Intern", "Data Science Intern", "Product Management Intern",
        "ML Research Intern", "Frontend Engineer", "Backend Engineer", "DevOps Engineer",
        "Mobile Developer", "Designer Intern", "Business Analyst",
    ])
    if not is_intern:
        title = title.replace("Intern", "").strip() or "Software Engineer"
    stipend_inr = random.choice([15000, 25000, 40000, 60000, 80000])
    deadline = _now() + timedelta(days=random.randint(5, 60))
    return {
        "title": title,
        "company": company["name"],
        "location": f"{company['city']} / Remote" if random.random() < 0.5 else company["city"],
        "stipend": f"₹{stipend_inr:,}/month" if is_intern else f"₹{company['ctc_lpa']:.1f} LPA",
        "duration": "3 months" if is_intern else "Full-time",
        "type": "Internship" if is_intern else "Full-time",
        "mode": random.choice(["Remote", "Hybrid", "On-site"]),
        "skills": skills,
        "deadline": deadline,
        "url": f"https://careers.{company['name'].lower().replace(' ', '')}.com/job/{idx}",
        "created_at": _now() - timedelta(days=random.randint(0, 30)),
    }


# ─── events generation ─────────────────────────────────────────
def gen_event(idx: int) -> Dict[str, Any]:
    college = random.choice(COLLEGES_REAL)
    titles = [
        f"{college['name']} TechFest", "Career Fair 2026", "Hackathon Marathon",
        "AI/ML Workshop", "Industry Connect Day", "Resume Building Workshop",
        "Mock Interview Drive", "Alumni Meet 2026", "Coding Championship",
        "Startup Pitch Night", "Women in Tech Summit",
    ]
    is_paid = random.random() < 0.3
    return {
        "title": random.choice(titles),
        "category": random.choice(["Career Fair", "Workshop", "Hackathon", "Talk", "Networking"]),
        "mode": random.choice(["Online", "In-person", "Hybrid"]),
        "college_name": college["name"],
        "start_date": _now() + timedelta(days=random.randint(1, 90)),
        "registration_deadline": _now() + timedelta(days=random.randint(1, 30)),
        "price": random.choice([199, 499, 999]) if is_paid else 0,
        "capacity": random.choice([50, 100, 200, 500]),
        "created_at": _now() - timedelta(days=random.randint(0, 30)),
    }


# ─── main ───────────────────────────────────────────────────────
async def seed(reset: bool = False, scale: int = 1):
    print("=" * 70)
    print(f"REALISTIC SEED — scale={scale}× (1000s + 200m + 140c + 20A users)")
    print("=" * 70)

    if reset:
        print("🧹 Resetting generated users (preserving protected accounts)...")
        await _db.users.delete_many({"email": {"$regex": r"@(student|mentor|admin)\.demo$"}})
        await _db.users.delete_many({"email": {"$regex": r"@.+\.demo$"}})
        await _db.internships.delete_many({"_seed": True})
        await _db.events.delete_many({"_seed_realistic": True})
        await _db.colleges_meta.delete_many({"_seed_realistic": True})

    # 1) Students — distribution per tier
    student_count = int(1000 * scale)
    plan = [
        ("Bronze",    int(student_count * 0.30)),
        ("Silver",    int(student_count * 0.35)),
        ("Gold",      int(student_count * 0.25)),
        ("Platinum",  int(student_count * 0.10)),
    ]
    print(f"\n📚 Generating {student_count} students...")
    students = []
    idx = 1
    for tier, n in plan:
        for _ in range(n):
            students.append(await gen_student(idx, tier))
            idx += 1
    if students:
        await _db.users.insert_many(students)
    by_tier = {}
    for s in students:
        by_tier[s["tier"]] = by_tier.get(s["tier"], 0) + 1
    print(f"  ✓ Inserted {len(students)} students. Tier distribution: {by_tier}")

    # 2) Mentors
    mentor_count = int(200 * scale)
    plan = [
        ("Bronze", int(mentor_count * 0.25)),
        ("Silver", int(mentor_count * 0.35)),
        ("Gold",   int(mentor_count * 0.30)),
        ("Platinum", int(mentor_count * 0.10)),
    ]
    print(f"\n👨‍🏫 Generating {mentor_count} mentors...")
    mentors = []
    idx = 1
    for tier, n in plan:
        for _ in range(n):
            mentors.append(await gen_mentor(idx, tier))
            idx += 1
    if mentors:
        await _db.users.insert_many(mentors)
    by_tier = {}
    for m in mentors:
        by_tier[m["tier"]] = by_tier.get(m["tier"], 0) + 1
    print(f"  ✓ Inserted {len(mentors)} mentors. Tier distribution: {by_tier}")

    # 3) Colleges — pick 140 from COLLEGES_REAL + admin user per college
    college_pool = COLLEGES_REAL[:140]
    print(f"\n🏫 Generating {len(college_pool)} colleges (admin users + colleges_meta)...")
    college_users = []
    college_metas = []
    for i, c in enumerate(college_pool, 1):
        college_users.append(await gen_college_user(c, i))
        # colleges_meta entry
        ctier = compute_college_tier(c["naac"], random.randint(800, 5000),
                                      float(c["placement_pct"]), random.randint(2000, 20000))
        college_metas.append({
            "name": c["name"],
            "city": c["city"],
            "state": c["state"],
            "naac": c["naac"],
            "nirf_rank": c["nirf_rank"],
            "type": c["type"],
            "placement_pct": c["placement_pct"],
            "fee_lpa": c["fee_lpa"],
            "established_year": c["est"],
            "tier": ctier["tier"],
            "tier_score": ctier["score"],
            "status": "active",
            "_seed_realistic": True,
        })
    if college_users:
        await _db.users.insert_many(college_users)
    if college_metas:
        await _db.colleges_meta.insert_many(college_metas)
    by_tier = {}
    for c in college_metas:
        by_tier[c["tier"]] = by_tier.get(c["tier"], 0) + 1
    print(f"  ✓ Inserted {len(college_users)} college users + {len(college_metas)} metadata entries. Tier: {by_tier}")

    # 4) Admins (20)
    print(f"\n🛡  Generating 20 admins...")
    admins = [await gen_admin(i) for i in range(1, 21)]
    if admins:
        await _db.users.insert_many(admins)
    print(f"  ✓ Inserted {len(admins)} admins (5 super-admins, 15 sub-admins)")

    # 5) Internships (300 tied to companies)
    print(f"\n💼 Generating 300 internships...")
    internships = [{**gen_internship(i), "_seed": True} for i in range(1, 301)]
    if internships:
        await _db.internships.delete_many({"_seed": True})
        await _db.internships.insert_many(internships)
    print(f"  ✓ Inserted {len(internships)} internships")

    # 6) Events (100)
    print(f"\n📅 Generating 100 events...")
    events = [{**gen_event(i), "_seed_realistic": True} for i in range(1, 101)]
    if events:
        await _db.events.insert_many(events)
    print(f"  ✓ Inserted {len(events)} events")

    print("\n" + "=" * 70)
    total_users = len(students) + len(mentors) + len(college_users) + len(admins)
    print(f"🎉 SEED COMPLETE — {total_users} users + {len(internships)} internships + {len(events)} events")
    print("All passwords: TestPass@123")
    print("=" * 70)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true")
    parser.add_argument("--scale", type=float, default=1.0)
    args = parser.parse_args()
    asyncio.run(seed(reset=args.reset, scale=args.scale))
