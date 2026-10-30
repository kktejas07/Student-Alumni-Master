"""Live counters endpoint, extracted from crud_endpoints.py (audit Step 5)."""
from datetime import timedelta

from fastapi import APIRouter

from core.db import db as _db
from crud_endpoints import _now

router = APIRouter()

# ════════════════════════════════════════════════════════════════
#  LIVE counters — shows the auto-refresh effect
# ════════════════════════════════════════════════════════════════
@router.get("/live/counters")
async def live_counters():
    """Used by FE to show that auto-refresh is wired — increments
    on every booking/RSVP/application/workshop."""
    return {
        "users":           await _db.users.count_documents({}),
        "students":        await _db.users.count_documents({"role": "student"}),
        "mentors":         await _db.users.count_documents({"role": "mentor"}),
        "colleges":        await _db.users.count_documents({"role": "college"}),
        "bookings":        await _db.bookings.count_documents({}),
        "bookings_today":  await _db.bookings.count_documents({
            "scheduled_at": {
                "$gte": _now().replace(hour=0, minute=0, second=0, microsecond=0),
                "$lt": _now().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1),
            }
        }),
        "applications":    await _db.internship_applications.count_documents({}),
        "events":          await _db.events.count_documents({}),
        "rsvps":           await _db.event_registrations.count_documents({}),
        "workshops":       await _db.workshop_registrations.count_documents({}),
        "courses":         await _db.courses.count_documents({}),
        "as_of":           _now().isoformat(),
    }
