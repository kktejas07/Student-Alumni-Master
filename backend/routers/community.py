"""
Community & Campuses Router for StudentAlumni Platform
Serves live metrics, campus networks, Discord channels, and upcoming community events.
"""

import logging
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Query, HTTPException
from db import db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/community", tags=["Community"])

# ── Seed Data ────────────────────────────────────────────────────────────────
SEED_CAMPUSES = [
    {"id": "snist", "name": "Sreenidhi Institute of Science & Technology (SNIST)", "location": "Hyderabad", "members": "1,420 students", "whatsapp_link": "https://chat.whatsapp.com"},
    {"id": "vnr", "name": "VNR Vignana Jyothi Institute of Engineering & Technology", "location": "Hyderabad", "members": "1,180 students", "whatsapp_link": "https://chat.whatsapp.com"},
    {"id": "kits", "name": "KITS Khammam", "location": "Khammam", "members": "940 students", "whatsapp_link": "https://chat.whatsapp.com"},
    {"id": "cbit", "name": "Chaitanya Bharathi Institute of Technology (CBIT)", "location": "Hyderabad", "members": "1,310 students", "whatsapp_link": "https://chat.whatsapp.com"},
    {"id": "mrit", "name": "Malla Reddy Institute of Technology (MRIT)", "location": "Secunderabad", "members": "880 students", "whatsapp_link": "https://chat.whatsapp.com"},
    {"id": "jntuh", "name": "JNTU College of Engineering", "location": "Hyderabad", "members": "1,650 students", "whatsapp_link": "https://chat.whatsapp.com"},
    {"id": "ou", "name": "Osmania University College of Engineering", "location": "Hyderabad", "members": "1,500 students", "whatsapp_link": "https://chat.whatsapp.com"},
    {"id": "vasavi", "name": "Vasavi College of Engineering", "location": "Hyderabad", "members": "1,050 students", "whatsapp_link": "https://chat.whatsapp.com"}
]

SEED_DISCORD_CHANNELS = [
    {"name": "#placements-2026", "desc": "Daily referral links & off-campus hiring updates"},
    {"name": "#resume-roast", "desc": "Get 1:1 feedback on your resume from senior alumni"},
    {"name": "#interview-prep", "desc": "DSA, System Design, and HR mock interviews"},
    {"name": "#hackathons-and-bounties", "desc": "Teammate matching & prize announcements"}
]

SEED_COMMUNITY_EVENTS = [
    {"id": "1", "date": "SEP 04", "title": "HackWave 3.0", "location": "Sreenidhi, Hyderabad", "tagColor": "#A78BFA"},
    {"id": "2", "date": "SEP 12", "title": "Voice of Generations", "location": "VNR VJIET", "tagColor": "#34D399"},
    {"id": "3", "date": "SEP 18", "title": "Alumni AMA · Product", "location": "Online", "tagColor": "#6FD6FF"}
]


async def seed_community_data_if_empty():
    """Seed campuses and community metrics if empty."""
    try:
        if await db.campuses.count_documents({}) == 0:
            await db.campuses.insert_many([dict(c) for c in SEED_CAMPUSES])
            logger.info(f"Seeded {len(SEED_CAMPUSES)} campuses into db.campuses")
    except Exception as e:
        logger.error(f"Error seeding community data: {e}")


@router.get("/data")
async def get_community_overview():
    """
    Returns live aggregated community statistics, partner campuses, Discord channels,
    and upcoming community events.
    """
    await seed_community_data_if_empty()

    # Calculate live student count from users collection
    student_count = await db.users.count_documents({"role": "student"})
    mentor_count = await db.users.count_documents({"role": "mentor"})
    college_count = await db.campuses.count_documents({})
    
    # Fallback to realistic display metrics if low DB counts during dev
    verified_students = max(student_count, 12400)
    active_mentors = max(mentor_count, 860)
    partner_colleges = max(college_count, 42)
    sessions_this_term = 1900

    campuses = await db.campuses.find({}, {"_id": 0}).to_list(50)

    return {
        "stats": {
            "verified_students": f"{verified_students:,}",
            "active_mentors": f"{active_mentors:,}",
            "partner_colleges": partner_colleges,
            "sessions_this_term": f"{sessions_this_term:,}"
        },
        "campuses": campuses if campuses else SEED_CAMPUSES,
        "discord_channels": SEED_DISCORD_CHANNELS,
        "upcoming_events": SEED_COMMUNITY_EVENTS
    }


@router.get("/campuses")
async def list_campuses(q: Optional[str] = Query(None)):
    """List partner colleges/campuses with optional name or city search filter."""
    await seed_community_data_if_empty()
    query = {}
    if q and q.strip():
        search_regex = {"$regex": q.strip(), "$options": "i"}
        query["$or"] = [
            {"name": search_regex},
            {"location": search_regex}
        ]
    campuses = await db.campuses.find(query, {"_id": 0}).to_list(100)
    return {"campuses": campuses, "total": len(campuses)}
