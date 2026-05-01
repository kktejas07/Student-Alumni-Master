"""
Persona-Based Test Accounts — multi-role, workflow-scenario test users.
=======================================================================
Creates dedicated test accounts with stable predictable emails for each
persona × role combination, plus the supporting data (bookings, event
registrations, workshop registrations, courses, payouts, etc.) so each
account exercises a realistic dashboard state.

PERSONAS BY ROLE:
  STUDENT (5 × 3 = 15)
    🌱 beginner       — just signed up, 0 skills, 0 projects
    ⏳ incomplete     — email only, no school/skills/onboarding
    📅 with-bookings  — 3 confirmed mentor sessions
    🎟️ with-events   — RSVP'd to 3 events
    🛠️ workshops     — paid + completed workshops

  MENTOR (6 × 3 = 18)
    🌱 new            — just approved, 0 sessions
    ⏳ pending        — registered, awaiting approval
    📅 active         — sessions today
    💰 high-earner    — 50+ completed sessions, high earnings
    ⭐ top-rated     — 4.9+ rating with many reviews
    📝 creator        — has published courses/workshops

  ADMIN (5 × 3 = 15)
    🛡️ super         — full platform access
    👤 college-admin  — scoped to one college
    📊 analytics      — read-only on stats
    💵 finance        — payouts/wallet only
    🔒 moderator      — content approval queue

  COLLEGE (5 × 3 = 15)
    🌱 onboarding     — just signed up, no students
    📊 high-placement — 90%+ placement
    🏗️ building       — mid-stage placement cell
    🎯 active-drives  — scheduled recruiter visits
    🤝 alumni-network — strong alumni base

USAGE:
    cd /app/backend && python3 seed_personas.py [--reset]

All passwords: TestPass@123. Emails: <persona><n>@persona.demo
Idempotent — --reset wipes prior persona accounts and supporting data.
"""
from __future__ import annotations

import argparse
import asyncio
import os
import random
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

_db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
random.seed(7)

PWD_HASH = bcrypt.hashpw(b"TestPass@123", bcrypt.gensalt()).decode()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _name() -> tuple[str, str]:
    return random.choice(INDIAN_FIRST_NAMES), random.choice(INDIAN_LAST_NAMES)


# ════════════════════════════════════════════════════════════════
#  STUDENT personas
# ════════════════════════════════════════════════════════════════
async def make_student_personas() -> List[Dict[str, Any]]:
    out = []

    # 🌱 beginner — signed up but zero skills/projects
    for n in range(1, 4):
        first, last = _name()
        out.append({
            "email": f"beginner{n}@persona.demo",
            "_persona": "🌱 Beginner Student",
            "_persona_key": "beginner",
            "password_hash": PWD_HASH,
            "role": "student",
            "first_name": first, "last_name": last, "full_name": f"{first} {last}",
            "phone": f"+91{random.randint(7000000000, 9999999999)}",
            "skills": [],
            "projects": [],
            "school_info": {
                "institution_name": random.choice(COLLEGES_REAL[60:120])["name"],
                "branch_or_stream": random.choice(BRANCHES),
                "graduation_year": _now().year + 3,
                "cgpa": round(random.uniform(6.0, 7.5), 2),
            },
            "student_info": {"career_goal": "Still exploring options"},
            "onboarding_completed": True,
            "created_at": _now() - timedelta(days=random.randint(1, 14)),
        })

    # ⏳ incomplete — onboarding incomplete, no school/skills
    for n in range(1, 4):
        first, last = _name()
        out.append({
            "email": f"incomplete{n}@persona.demo",
            "_persona": "⏳ Incomplete Profile Student",
            "_persona_key": "incomplete",
            "password_hash": PWD_HASH,
            "role": "student",
            "first_name": first, "last_name": last, "full_name": f"{first} {last}",
            "phone": None,
            "skills": [],
            "projects": [],
            "school_info": {"class_or_year": "Not set yet"},
            "student_info": {},
            "onboarding_completed": False,
            "created_at": _now() - timedelta(days=random.randint(0, 7)),
        })

    # 📅 with-bookings — 3 confirmed mentor sessions
    for n in range(1, 4):
        first, last = _name()
        college = random.choice(COLLEGES_REAL[:50])
        out.append({
            "email": f"booked{n}@persona.demo",
            "_persona": "📅 Student w/ Mentor Bookings",
            "_persona_key": "booked",
            "password_hash": PWD_HASH,
            "role": "student",
            "first_name": first, "last_name": last, "full_name": f"{first} {last}",
            "phone": f"+91{random.randint(7000000000, 9999999999)}",
            "skills": random.sample(SKILLS_REAL, 6),
            "projects": [{"name": f"Project {i}", "description": "—"} for i in range(2)],
            "school_info": {
                "institution_name": college["name"],
                "branch_or_stream": "Computer Science",
                "graduation_year": _now().year + 1,
                "cgpa": round(random.uniform(7.5, 9.0), 2),
            },
            "student_info": {"career_goal": "Software Engineer at Google"},
            "onboarding_completed": True,
            "created_at": _now() - timedelta(days=random.randint(30, 180)),
        })

    # 🎟️ with-events — RSVPd to 3 events
    for n in range(1, 4):
        first, last = _name()
        college = random.choice(COLLEGES_REAL[:80])
        out.append({
            "email": f"enrolled{n}@persona.demo",
            "_persona": "🎟️ Student w/ Event RSVPs",
            "_persona_key": "enrolled",
            "password_hash": PWD_HASH,
            "role": "student",
            "first_name": first, "last_name": last, "full_name": f"{first} {last}",
            "phone": f"+91{random.randint(7000000000, 9999999999)}",
            "skills": random.sample(SKILLS_REAL, 4),
            "school_info": {
                "institution_name": college["name"],
                "branch_or_stream": "Information Technology",
                "graduation_year": _now().year + 2,
                "cgpa": round(random.uniform(7.0, 8.5), 2),
            },
            "student_info": {"career_goal": "Product Manager"},
            "onboarding_completed": True,
            "created_at": _now() - timedelta(days=random.randint(45, 240)),
        })

    # 🛠️ workshops — registered + completed paid workshops
    for n in range(1, 4):
        first, last = _name()
        college = random.choice(COLLEGES_REAL[:30])
        out.append({
            "email": f"workshop{n}@persona.demo",
            "_persona": "🛠️ Student w/ Workshop Flows",
            "_persona_key": "workshop",
            "password_hash": PWD_HASH,
            "role": "student",
            "first_name": first, "last_name": last, "full_name": f"{first} {last}",
            "phone": f"+91{random.randint(7000000000, 9999999999)}",
            "skills": random.sample(SKILLS_REAL, 8),
            "projects": [{"name": f"Capstone {i}", "description": "Workshop deliverable"} for i in range(3)],
            "school_info": {
                "institution_name": college["name"],
                "branch_or_stream": "Data Science",
                "graduation_year": _now().year + 1,
                "cgpa": round(random.uniform(8.0, 9.5), 2),
            },
            "student_info": {"career_goal": "ML Engineer at OpenAI"},
            "onboarding_completed": True,
            "created_at": _now() - timedelta(days=random.randint(60, 365)),
        })

    return out


# ════════════════════════════════════════════════════════════════
#  MENTOR personas
# ════════════════════════════════════════════════════════════════
async def make_mentor_personas() -> List[Dict[str, Any]]:
    out = []

    # 🌱 new — just approved, 0 sessions
    for n in range(1, 4):
        first, last = _name()
        company = random.choice([c for c in COMPANIES_REAL if c["tier"] == "Silver"])
        out.append({
            "email": f"mentor-new{n}@persona.demo",
            "_persona": "🌱 New Mentor (just approved)",
            "_persona_key": "new",
            "password_hash": PWD_HASH,
            "role": "mentor",
            "mentor_status": "approved",
            "first_name": first, "last_name": last, "full_name": f"{first} {last}",
            "skills": random.sample(SKILLS_REAL, 4),
            "mentor_info": {
                "job_title": "Senior Software Engineer",
                "organization": company["name"],
                "years_of_experience": 5,
                "industry": company["industry"],
            },
            "expected_rate_inr": 999,
            "rating": 0.0,
            "sessions_completed": 0,
            "onboarding_completed": True,
            "created_at": _now() - timedelta(days=random.randint(1, 7)),
        })

    # ⏳ pending — awaiting approval
    for n in range(1, 4):
        first, last = _name()
        company = random.choice(COMPANIES_REAL)
        out.append({
            "email": f"mentor-pending{n}@persona.demo",
            "_persona": "⏳ Pending Approval Mentor",
            "_persona_key": "pending",
            "password_hash": PWD_HASH,
            "role": "mentor",
            "mentor_status": "pending",
            "first_name": first, "last_name": last, "full_name": f"{first} {last}",
            "skills": random.sample(SKILLS_REAL, 5),
            "mentor_info": {
                "job_title": random.choice(JOB_TITLES["Silver"]),
                "organization": company["name"],
                "years_of_experience": random.randint(3, 8),
                "industry": company["industry"],
            },
            "expected_rate_inr": 799,
            "rating": 0.0,
            "sessions_completed": 0,
            "onboarding_completed": False,
            "created_at": _now() - timedelta(days=random.randint(0, 5)),
        })

    # 📅 active — sessions today
    for n in range(1, 4):
        first, last = _name()
        company = random.choice([c for c in COMPANIES_REAL if c["tier"] == "Gold"])
        out.append({
            "email": f"mentor-active{n}@persona.demo",
            "_persona": "📅 Active Mentor (sessions today)",
            "_persona_key": "active",
            "password_hash": PWD_HASH,
            "role": "mentor",
            "mentor_status": "approved",
            "first_name": first, "last_name": last, "full_name": f"{first} {last}",
            "skills": random.sample(SKILLS_REAL, 6),
            "mentor_info": {
                "job_title": "Tech Lead",
                "organization": company["name"],
                "years_of_experience": 9,
                "industry": company["industry"],
            },
            "expected_rate_inr": 1499,
            "rating": 4.6,
            "sessions_completed": 22,
            "onboarding_completed": True,
            "created_at": _now() - timedelta(days=random.randint(180, 400)),
        })

    # 💰 high-earner — 50+ completed sessions
    for n in range(1, 4):
        first, last = _name()
        company = random.choice([c for c in COMPANIES_REAL if c["tier"] in ("Gold", "Platinum")])
        out.append({
            "email": f"mentor-earner{n}@persona.demo",
            "_persona": "💰 High-Earner Mentor",
            "_persona_key": "earner",
            "password_hash": PWD_HASH,
            "role": "mentor",
            "mentor_status": "approved",
            "first_name": first, "last_name": last, "full_name": f"{first} {last}",
            "skills": random.sample(SKILLS_REAL, 8),
            "mentor_info": {
                "job_title": "Engineering Manager",
                "organization": company["name"],
                "years_of_experience": 12,
                "industry": company["industry"],
            },
            "expected_rate_inr": 2999,
            "rating": 4.7,
            "sessions_completed": 78,
            "onboarding_completed": True,
            "created_at": _now() - timedelta(days=random.randint(400, 800)),
        })

    # ⭐ top-rated
    for n in range(1, 4):
        first, last = _name()
        company = random.choice([c for c in COMPANIES_REAL if c["tier"] == "Platinum"])
        out.append({
            "email": f"mentor-top{n}@persona.demo",
            "_persona": "⭐ Top-Rated Mentor (4.9+)",
            "_persona_key": "top",
            "password_hash": PWD_HASH,
            "role": "mentor",
            "mentor_status": "approved",
            "first_name": first, "last_name": last, "full_name": f"{first} {last}",
            "skills": random.sample(SKILLS_REAL, 10),
            "mentor_info": {
                "job_title": "Principal Engineer",
                "organization": company["name"],
                "years_of_experience": 15,
                "industry": company["industry"],
            },
            "expected_rate_inr": 4999,
            "rating": 4.95,
            "sessions_completed": 124,
            "onboarding_completed": True,
            "created_at": _now() - timedelta(days=random.randint(800, 1500)),
        })

    # 📝 creator — has courses/workshops
    for n in range(1, 4):
        first, last = _name()
        company = random.choice([c for c in COMPANIES_REAL if c["tier"] in ("Gold", "Platinum")])
        out.append({
            "email": f"mentor-creator{n}@persona.demo",
            "_persona": "📝 Course Creator Mentor",
            "_persona_key": "creator",
            "password_hash": PWD_HASH,
            "role": "mentor",
            "mentor_status": "approved",
            "first_name": first, "last_name": last, "full_name": f"{first} {last}",
            "skills": random.sample(SKILLS_REAL, 7),
            "mentor_info": {
                "job_title": "Staff Engineer",
                "organization": company["name"],
                "years_of_experience": 11,
                "industry": company["industry"],
            },
            "expected_rate_inr": 2499,
            "rating": 4.8,
            "sessions_completed": 45,
            "courses_published": 3,
            "workshops_published": 2,
            "onboarding_completed": True,
            "created_at": _now() - timedelta(days=random.randint(300, 700)),
        })

    return out


# ════════════════════════════════════════════════════════════════
#  ADMIN personas
# ════════════════════════════════════════════════════════════════
async def make_admin_personas() -> List[Dict[str, Any]]:
    out = []
    persona_specs = [
        ("super",     "🛡️ Super Admin (full access)",       True,  "platform"),
        ("college",   "👤 College-scoped Admin",             False, "college"),
        ("analytics", "📊 Analytics-only Admin (read-only)", False, "analytics"),
        ("finance",   "💵 Finance/Payouts Admin",            False, "finance"),
        ("mod",       "🔒 Content Moderator Admin",          False, "moderation"),
    ]
    for key, label, is_super, scope in persona_specs:
        for n in range(1, 4):
            first, last = _name()
            out.append({
                "email": f"admin-{key}{n}@persona.demo",
                "_persona": label,
                "_persona_key": f"admin-{key}",
                "password_hash": PWD_HASH,
                "role": "admin",
                "first_name": first, "last_name": last, "full_name": f"{first} {last}",
                "is_super_admin": is_super,
                "admin_scope": scope,
                "admin_permissions": {
                    "manage_users": is_super or scope == "college",
                    "manage_payouts": is_super or scope == "finance",
                    "view_analytics": True,
                    "moderate_content": is_super or scope == "moderation",
                },
                "phone": f"+91{random.randint(7000000000, 9999999999)}",
                "onboarding_completed": True,
                "created_at": _now() - timedelta(days=random.randint(60, 800)),
            })
    return out


# ════════════════════════════════════════════════════════════════
#  COLLEGE personas
# ════════════════════════════════════════════════════════════════
async def make_college_personas() -> List[Dict[str, Any]]:
    out = []

    # Stable college pool used for personas
    onboarding_pool = COLLEGES_REAL[120:140]   # lower-tier
    high_pool = COLLEGES_REAL[:8]               # IIT family
    building_pool = COLLEGES_REAL[40:80]
    drives_pool = COLLEGES_REAL[15:40]
    alumni_pool = COLLEGES_REAL[8:25]

    persona_specs = [
        ("onboarding", "🌱 Just-Onboarded College",             onboarding_pool),
        ("high",       "📊 High-Placement College",             high_pool),
        ("building",   "🏗️ Building Placement Cell",            building_pool),
        ("drives",     "🎯 Active Drives Scheduled",             drives_pool),
        ("alumni",     "🤝 Strong Alumni Network",               alumni_pool),
    ]
    for key, label, pool in persona_specs:
        for n in range(1, 4):
            college = random.choice(pool)
            out.append({
                "email": f"college-{key}{n}@persona.demo",
                "_persona": label,
                "_persona_key": f"college-{key}",
                "password_hash": PWD_HASH,
                "role": "college",
                "first_name": "Admin",
                "last_name": college["name"].split()[0],
                "full_name": f"{label.split()[1]} · {college['name']}",
                "school_info": {"institution_name": college["name"]},
                "city": college["city"],
                "state": college["state"],
                "_college_meta_overlay": {
                    "name": college["name"],
                    "naac": college["naac"],
                    "nirf_rank": college["nirf_rank"],
                    "placement_pct": (
                        15 if key == "onboarding" else
                        92 if key == "high" else
                        55 if key == "building" else
                        72 if key == "drives" else
                        80
                    ),
                },
                "onboarding_completed": key != "onboarding",
                "created_at": _now() - timedelta(days=(3 if key == "onboarding" else random.randint(180, 1500))),
            })
    return out


# ════════════════════════════════════════════════════════════════
#  Supporting data (bookings, events, workshops, courses, payouts)
# ════════════════════════════════════════════════════════════════
async def seed_supporting_data():
    """Hydrate persona accounts with realistic interaction data."""
    print("📦 Seeding supporting data (bookings, RSVPs, workshops, courses)…")

    # 1) Bookings: 'booked*@persona.demo' students × any approved mentor
    student_booked = await _db.users.find({"_persona_key": "booked"}).to_list(20)
    mentors_active = await _db.users.find({"_persona_key": "active"}).to_list(10)
    if not mentors_active:
        mentors_active = await _db.users.find({"role": "mentor", "mentor_status": "approved"}).limit(5).to_list(5)
    bookings = []
    topics = ["System Design Mock Interview", "Career Path Discussion",
             "Resume Review", "DSA Practice", "Mock Behavioral Interview"]
    for s in student_booked:
        for m in mentors_active[:3]:
            bookings.append({
                "_persona_seed": True,
                "student_id": str(s["_id"]),
                "student_email": s["email"],
                "mentor_id": str(m["_id"]),
                "mentor_email": m["email"],
                "topic": random.choice(topics),
                "scheduled_at": _now() + timedelta(days=random.randint(1, 14), hours=random.randint(0, 8)),
                "duration_minutes": 45,
                "amount_paid": m.get("expected_rate_inr", 999),
                "status": "confirmed",
                "created_at": _now() - timedelta(days=random.randint(2, 10)),
            })
    if bookings:
        await _db.bookings.delete_many({"_persona_seed": True})
        await _db.bookings.insert_many(bookings)
        print(f"  ✓ {len(bookings)} bookings (student × mentor)")

    # 2) Mentor 'active' personas — sessions today
    sessions_today = []
    for m in mentors_active:
        for i in range(2):
            sessions_today.append({
                "_persona_seed": True,
                "mentor_id": str(m["_id"]),
                "mentor_email": m["email"],
                "scheduled_at": _now().replace(hour=10 + i * 4, minute=0, second=0),
                "topic": random.choice(topics),
                "duration_minutes": 45,
                "status": "confirmed",
                "student_id": str(student_booked[0]["_id"]) if student_booked else None,
            })
    if sessions_today:
        await _db.bookings.insert_many(sessions_today)
        print(f"  ✓ {len(sessions_today)} mentor sessions scheduled today")

    # 3) Event RSVPs: 'enrolled*' students RSVP'd to 3 events each
    students_enrolled = await _db.users.find({"_persona_key": "enrolled"}).to_list(20)
    events = await _db.events.find({}).limit(30).to_list(30)
    rsvps = []
    for s in students_enrolled:
        for e in random.sample(events, min(3, len(events))):
            rsvps.append({
                "_persona_seed": True,
                "event_id": str(e["_id"]),
                "event_title": e.get("title"),
                "student_id": str(s["_id"]),
                "student_email": s["email"],
                "registered_at": _now() - timedelta(days=random.randint(1, 7)),
                "status": "registered",
            })
    if rsvps:
        await _db.event_registrations.delete_many({"_persona_seed": True})
        await _db.event_registrations.insert_many(rsvps)
        print(f"  ✓ {len(rsvps)} event RSVPs")

    # 4) Workshops: workshop students registered + 1 completed
    students_workshop = await _db.users.find({"_persona_key": "workshop"}).to_list(20)
    workshop_records = []
    workshops = [
        {"title": "System Design Bootcamp", "fee_inr": 2999, "weeks": 6},
        {"title": "Data Structures Crash Course", "fee_inr": 1499, "weeks": 4},
        {"title": "Frontend Mastery: React + Next.js", "fee_inr": 3499, "weeks": 8},
        {"title": "MLOps Fundamentals", "fee_inr": 2499, "weeks": 5},
    ]
    for s in students_workshop:
        # 2 registered, 1 completed
        for i, w in enumerate(random.sample(workshops, 3)):
            workshop_records.append({
                "_persona_seed": True,
                "student_id": str(s["_id"]),
                "student_email": s["email"],
                "workshop_title": w["title"],
                "fee_inr": w["fee_inr"],
                "weeks": w["weeks"],
                "status": "completed" if i == 0 else "registered",
                "completed_at": _now() - timedelta(days=20) if i == 0 else None,
                "registered_at": _now() - timedelta(days=random.randint(15, 60)),
                "certificate_url": f"https://certificates.example.com/{s['email']}-{i}" if i == 0 else None,
            })
    if workshop_records:
        await _db.workshop_registrations.delete_many({"_persona_seed": True})
        await _db.workshop_registrations.insert_many(workshop_records)
        print(f"  ✓ {len(workshop_records)} workshop registrations")

    # 5) Courses for creator mentors
    creators = await _db.users.find({"_persona_key": "creator"}).to_list(10)
    courses = []
    for m in creators:
        for i in range(3):
            courses.append({
                "_persona_seed": True,
                "mentor_id": str(m["_id"]),
                "mentor_email": m["email"],
                "title": f"{random.choice(['Advanced', 'Intro to', 'Mastering'])} {random.choice(['React', 'Python', 'System Design', 'ML', 'AWS'])}",
                "fee_inr": random.choice([1999, 2999, 4999]),
                "students_enrolled": random.randint(20, 200),
                "status": "published",
                "created_at": _now() - timedelta(days=random.randint(60, 500)),
            })
    if courses:
        await _db.courses.delete_many({"_persona_seed": True})
        await _db.courses.insert_many(courses)
        print(f"  ✓ {len(courses)} mentor-created courses")

    # 6) Payouts for high-earner mentors
    high_earners = await _db.users.find({"_persona_key": "earner"}).to_list(10)
    payouts = []
    for m in high_earners:
        for month_offset in range(0, 6):
            month_date = _now() - timedelta(days=month_offset * 30)
            payouts.append({
                "_persona_seed": True,
                "mentor_id": str(m["_id"]),
                "mentor_email": m["email"],
                "amount_inr": random.randint(20000, 80000),
                "month": month_date.strftime("%Y-%m"),
                "status": "completed" if month_offset > 0 else "pending",
                "processed_at": month_date if month_offset > 0 else None,
            })
    if payouts:
        await _db.mentor_payouts.delete_many({"_persona_seed": True})
        await _db.mentor_payouts.insert_many(payouts)
        print(f"  ✓ {len(payouts)} mentor payouts")


# ════════════════════════════════════════════════════════════════
#  Main
# ════════════════════════════════════════════════════════════════
async def main(reset: bool):
    if reset:
        print("🧹 Resetting prior persona accounts…")
        result = await _db.users.delete_many({"email": {"$regex": "@persona.demo$"}})
        print(f"  Removed {result.deleted_count} prior persona users.")

    print("\n📚 Generating STUDENT personas…")
    students = await make_student_personas()
    print(f"  → {len(students)} students")
    print("👨‍🏫 Generating MENTOR personas…")
    mentors = await make_mentor_personas()
    print(f"  → {len(mentors)} mentors")
    print("🛡️  Generating ADMIN personas…")
    admins = await make_admin_personas()
    print(f"  → {len(admins)} admins")
    print("🏫 Generating COLLEGE personas…")
    colleges = await make_college_personas()
    print(f"  → {len(colleges)} colleges")

    all_users = students + mentors + admins + colleges

    # Compute tier where applicable
    for u in all_users:
        if u["role"] == "student":
            si = u.get("school_info") or {}
            cname = si.get("institution_name")
            naac = None
            if cname:
                cmeta = await _db.colleges_meta.find_one({"name": cname})
                naac = (cmeta or {}).get("naac")
            t = compute_student_tier(u, naac)
            u["tier"], u["tier_score"] = t["tier"], t["score"]
        elif u["role"] == "mentor":
            t = compute_mentor_tier(u, u.get("sessions_completed", 0), float(u.get("rating", 0)))
            u["tier"], u["tier_score"] = t["tier"], t["score"]
        elif u["role"] == "college":
            overlay = u.get("_college_meta_overlay") or {}
            t = compute_college_tier(overlay.get("naac", "A"), 1000, float(overlay.get("placement_pct", 60)), 5000)
            u["tier"], u["tier_score"] = t["tier"], t["score"]

    if all_users:
        await _db.users.insert_many(all_users)
    print(f"\n✅ Inserted {len(all_users)} persona accounts")

    await seed_supporting_data()

    print("\n" + "=" * 70)
    print(f"🎉 SEED COMPLETE — {len(all_users)} persona users with full workflow data")
    print("All passwords: TestPass@123 — emails: <persona><n>@persona.demo")
    print("=" * 70)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true")
    args = parser.parse_args()
    asyncio.run(main(reset=args.reset))
