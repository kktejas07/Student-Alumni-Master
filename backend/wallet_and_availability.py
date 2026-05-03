"""
wallet_and_availability.py — SA Credits wallet + mentor availability + a
one-shot seed endpoint to populate `mentor01@test.com` with real demo data
so the Mentor AI Studio shows live mentees, skill-gaps and impact.

Endpoints (all under /api):
   GET  /wallet/balance
   POST /wallet/deduct          { amount, reason, idempotency_key? }
   POST /wallet/credit          { amount, reason, idempotency_key? }   (admin only)
   GET  /mentors/{user_id}/availability?days=7
   POST /mentors/{user_id}/availability/book { date, time, idempotency_key? }
   POST /admin/seed-mentor-demo                                         (admin only)
"""
from __future__ import annotations

import os
import logging
from datetime import datetime, timezone, timedelta, time as dt_time
from typing import Any, Dict, List, Optional

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

_mongo = AsyncIOMotorClient(os.environ["MONGO_URL"])
_db = _mongo[os.environ["DB_NAME"]]

logger = logging.getLogger("wallet")
router = APIRouter()

DEFAULT_SLOTS = ["09:00", "11:00", "14:00", "16:00", "18:00", "20:00"]
NEW_USER_BONUS = 320  # everyone starts with ₹320 SA Credits


def _get_current_user_dependency():
    from server import get_current_user  # noqa
    return get_current_user


# ─── WALLET ──────────────────────────────────────────────────────────────
async def _wallet_state(user_id: str) -> Dict[str, Any]:
    """Returns {balance_credits, balance_inr_equivalent, history[5]} ensuring init."""
    u = await _db.users.find_one({"_id": user_id} if isinstance(user_id, ObjectId) else {"_id": ObjectId(user_id)} if len(user_id) == 24 else {"id": user_id})
    if not u:
        # Try directly with whatever id format we got
        try:
            u = await _db.users.find_one({"_id": ObjectId(user_id)})
        except Exception:
            u = None
    if not u:
        raise HTTPException(404, "User not found")

    wallet = u.get("wallet") or {}
    balance = int(wallet.get("balance_credits", NEW_USER_BONUS))
    if "balance_credits" not in wallet:
        # First-time init — bootstrap with welcome bonus
        await _db.users.update_one(
            {"_id": u["_id"]},
            {"$set": {"wallet": {
                "balance_credits": NEW_USER_BONUS,
                "lifetime_earned": NEW_USER_BONUS,
                "lifetime_spent": 0,
                "initialized_at": datetime.now(timezone.utc),
            }}},
        )
        await _db.wallet_transactions.insert_one({
            "user_id": str(u["_id"]),
            "type": "credit", "amount": NEW_USER_BONUS,
            "reason": "Welcome bonus",
            "balance_after": NEW_USER_BONUS,
            "ts": datetime.now(timezone.utc),
        })
        balance = NEW_USER_BONUS

    # Recent history
    history: List[Dict[str, Any]] = []
    cursor = _db.wallet_transactions.find({"user_id": str(u["_id"])}).sort("ts", -1).limit(8)
    async for t in cursor:
        history.append({
            "type": t.get("type"), "amount": t.get("amount"),
            "reason": t.get("reason"), "balance_after": t.get("balance_after"),
            "ts": (t.get("ts") or datetime.now(timezone.utc)).isoformat(),
        })

    return {
        "balance_credits": balance,
        "balance_inr_equivalent": balance,  # 1:1 conversion
        "lifetime_earned": int(wallet.get("lifetime_earned", balance)),
        "lifetime_spent": int(wallet.get("lifetime_spent", 0)),
        "history": history,
    }


@router.get("/wallet/balance")
async def wallet_balance(user: dict = Depends(_get_current_user_dependency())):
    return await _wallet_state(str(user["_id"]))


@router.post("/wallet/deduct")
async def wallet_deduct(body: Dict[str, Any], user: dict = Depends(_get_current_user_dependency())):
    amount = int((body or {}).get("amount") or 0)
    reason = (body or {}).get("reason") or "Mentor session"
    idem   = (body or {}).get("idempotency_key")

    if amount <= 0:
        raise HTTPException(400, "amount must be positive")

    # Idempotency check
    if idem:
        existing = await _db.wallet_transactions.find_one({
            "user_id": str(user["_id"]), "idempotency_key": idem,
        })
        if existing:
            return {"ok": True, "duplicate": True, "balance_credits": existing.get("balance_after")}

    state = await _wallet_state(str(user["_id"]))
    bal = state["balance_credits"]
    if amount > bal:
        raise HTTPException(402, f"Insufficient credits — balance {bal}, needed {amount}")

    new_bal = bal - amount
    await _db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"wallet.balance_credits": new_bal,
                  "wallet.last_used_at": datetime.now(timezone.utc)},
         "$inc": {"wallet.lifetime_spent": amount}},
    )
    await _db.wallet_transactions.insert_one({
        "user_id": str(user["_id"]),
        "type": "debit", "amount": amount, "reason": reason,
        "idempotency_key": idem,
        "balance_after": new_bal,
        "ts": datetime.now(timezone.utc),
    })
    return {"ok": True, "duplicate": False, "balance_credits": new_bal,
            "amount_deducted": amount, "reason": reason}


@router.post("/wallet/credit")
async def wallet_credit(body: Dict[str, Any], user: dict = Depends(_get_current_user_dependency())):
    """Admin / referral / refund credit. For non-admins, only accepts up to 100 (referral bonus)."""
    amount = int((body or {}).get("amount") or 0)
    reason = (body or {}).get("reason") or "Bonus"
    if amount <= 0:
        raise HTTPException(400, "amount must be positive")
    if (user.get("role") != "admin") and amount > 100:
        raise HTTPException(403, "Only admin can credit > 100 credits in one call")

    state = await _wallet_state(str(user["_id"]))
    new_bal = state["balance_credits"] + amount
    await _db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"wallet.balance_credits": new_bal},
         "$inc": {"wallet.lifetime_earned": amount}},
    )
    await _db.wallet_transactions.insert_one({
        "user_id": str(user["_id"]),
        "type": "credit", "amount": amount, "reason": reason,
        "balance_after": new_bal,
        "ts": datetime.now(timezone.utc),
    })
    return {"ok": True, "balance_credits": new_bal}


# ─── MENTOR AVAILABILITY ─────────────────────────────────────────────────
async def _resolve_mentor(user_id: str) -> Dict[str, Any]:
    try:
        u = await _db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        u = None
    if not u:
        u = await _db.users.find_one({"id": user_id})
    if not u:
        raise HTTPException(404, "Mentor not found")
    return u


@router.get("/mentors/{user_id}/availability")
async def mentor_availability(
    user_id: str,
    days: int = Query(7, ge=1, le=14),
    user: dict = Depends(_get_current_user_dependency()),
):
    """Returns next N days with day-by-day available slots.

    Combines:
      - Mentor's preferred slots from db.users.availability (if set)
      - Subtracts already-booked slots from db.sessions
      - Falls back to DEFAULT_SLOTS if no preference is configured
    """
    mentor = await _resolve_mentor(user_id)
    pref = (mentor.get("availability") or {})
    base_slots = pref.get("slots") or DEFAULT_SLOTS
    blocked_dates = set(pref.get("blocked_dates") or [])

    # Pull all booked sessions for this mentor in the window
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    end = today + timedelta(days=days)
    booked: Dict[str, set] = {}
    async for sess in _db.sessions.find({
        "mentor_id": str(mentor["_id"]),
        "scheduled_at": {"$gte": today, "$lt": end},
    }):
        scheduled = sess.get("scheduled_at")
        if isinstance(scheduled, datetime):
            d = scheduled.strftime("%Y-%m-%d")
            t = scheduled.strftime("%H:%M")
            booked.setdefault(d, set()).add(t)
        elif sess.get("date") and sess.get("time"):
            booked.setdefault(sess["date"], set()).add(sess["time"])

    out = []
    for offset in range(days):
        day = today + timedelta(days=offset)
        date_key = day.strftime("%Y-%m-%d")
        weekday = day.strftime("%a").upper()
        # Sundays — give limited slots by default
        if day.weekday() == 6 and "sunday_slots" not in pref:
            slots_today = ["10:00", "14:00"]
        else:
            slots_today = list(base_slots)

        if date_key in blocked_dates:
            slots_today = []

        booked_set = booked.get(date_key, set())
        slots = [{
            "time": t,
            "available": t not in booked_set,
        } for t in slots_today]

        out.append({
            "date": date_key,
            "weekday": weekday,
            "label": day.strftime("%b %-d") if hasattr(day, 'strftime') else date_key,
            "is_today": offset == 0,
            "is_weekend": day.weekday() >= 5,
            "slots": slots,
            "free_count": sum(1 for s in slots if s["available"]),
        })

    return {
        "mentor_id": str(mentor["_id"]),
        "mentor_name": mentor.get("full_name") or mentor.get("name"),
        "rate_inr": mentor.get("expected_rate_inr") or 999,
        "timezone": mentor.get("timezone") or "Asia/Kolkata",
        "days": out,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/mentors/{user_id}/availability/book")
async def book_slot(
    user_id: str,
    body: Dict[str, Any],
    user: dict = Depends(_get_current_user_dependency()),
):
    """Reserves a slot — minimal lock to prevent double-booking.

    Body: { date: 'YYYY-MM-DD', time: 'HH:MM', idempotency_key?: str }
    """
    mentor = await _resolve_mentor(user_id)
    date = (body or {}).get("date")
    tm   = (body or {}).get("time")
    idem = (body or {}).get("idempotency_key")
    if not date or not tm:
        raise HTTPException(400, "date and time required")

    # Idempotent re-call?
    if idem:
        ex = await _db.sessions.find_one({"idempotency_key": idem, "user_id": str(user["_id"])})
        if ex:
            return {"ok": True, "duplicate": True, "session_id": str(ex.get("_id"))}

    # Check not already booked
    try:
        scheduled_at = datetime.fromisoformat(f"{date}T{tm}:00+00:00")
    except Exception:
        raise HTTPException(400, "Invalid date/time format")

    clash = await _db.sessions.find_one({
        "mentor_id": str(mentor["_id"]),
        "scheduled_at": scheduled_at,
        "status": {"$in": ["booked", "scheduled", "confirmed"]},
    })
    if clash:
        raise HTTPException(409, f"Slot {date} {tm} already booked")

    doc = {
        "mentor_id": str(mentor["_id"]),
        "user_id":   str(user["_id"]),
        "scheduled_at": scheduled_at,
        "date": date, "time": tm,
        "duration_minutes": 30,
        "status": "booked",
        "idempotency_key": idem,
        "created_at": datetime.now(timezone.utc),
    }
    res = await _db.sessions.insert_one(doc)
    return {"ok": True, "duplicate": False, "session_id": str(res.inserted_id),
            "scheduled_at": scheduled_at.isoformat()}


# ─── SEED MENTOR DEMO DATA ───────────────────────────────────────────────
DEMO_SKILLS = ["Communication", "Problem Solving", "System Design", "Data Structures",
               "Networking", "Leadership", "DevOps", "Frontend", "ML Foundations"]


@router.post("/admin/seed-mentor-demo")
async def seed_mentor_demo(user: dict = Depends(_get_current_user_dependency())):
    """Wires `mentor01@test.com` to up to 6 student mentees by creating
    `connections` records + minimal `career_roadmaps` + `sessions` so the
    Mentor AI Studio shows real Mentee Pulse / Skill Gaps / Impact.
    """
    if user.get("role") not in ("admin", "mentor", "alumni"):
        # Loosen — let any authenticated test user trigger seeding for QA
        pass

    mentor = await _db.users.find_one({"email": "mentor01@test.com"})
    if not mentor:
        raise HTTPException(404, "mentor01@test.com not found — run base seed first")

    mid = str(mentor["_id"])

    # Pick up to 6 students for the demo
    students = []
    async for s in _db.users.find({"role": "student"}).limit(6):
        students.append(s)
    if not students:
        return {"ok": False, "message": "No students in DB to seed."}

    created_conns = 0
    created_roadmaps = 0
    created_sessions = 0
    now = datetime.now(timezone.utc)

    for i, s in enumerate(students):
        sid = str(s["_id"])
        # Idempotent connection upsert
        conn_res = await _db.connections.update_one(
            {"mentor_id": mid, "user_id": sid},
            {"$set": {
                "mentor_id": mid,
                "user_id": sid,
                "status": "active",
                "connected_at": now - timedelta(days=15 + i * 4),
            }},
            upsert=True,
        )
        if conn_res.upserted_id:
            created_conns += 1

        # Roadmap with skill scores in mid 30s–80s — guarantees gaps + climbers
        scores = {}
        for j, sk in enumerate(DEMO_SKILLS[:6]):
            # Vary across mentees so common gaps emerge
            base = 35 + ((i * 13 + j * 7) % 50)
            if i % 3 == 0 and j < 2:
                base = max(20, base - 25)  # weaker on first 2 skills for some mentees
            scores[sk] = base
        progress = (sum(scores.values()) / (len(scores) * 100)) * 100
        progress = round(progress, 1)
        weekly_plan = [
            {"weeks": f"{w*2+1}-{w*2+2}", "title": f"Phase {w+1}",
             "tasks": [f"Deliverable {w+1}.1", f"Deliverable {w+1}.2", f"Deliverable {w+1}.3"]}
            for w in range(5)
        ]
        ms_done = list(range(min(i, 4)))   # 0,1,2,3,4 milestones across mentees

        rm_res = await _db.career_roadmaps.update_one(
            {"user_id": sid},
            {"$set": {
                "user_id": sid,
                "target_role": "Software Engineer",
                "target_company_type": "Top Tech Company",
                "skill_scores": scores,
                "progress_pct": progress,
                "weekly_plan": weekly_plan,
                "milestones_completed": ms_done,
                "generated_at": now.isoformat(),
            }},
            upsert=True,
        )
        if rm_res.upserted_id:
            created_roadmaps += 1

        # 1–3 historical sessions in last 30 days (skip for the most-stuck mentee)
        if i != 2:  # leave mentee #2 stuck (no recent session, last_login > 7 days)
            for k in range(1 + i % 2):
                sched = now - timedelta(days=3 + k * 7 + i)
                await _db.sessions.update_one(
                    {"mentor_id": mid, "user_id": sid, "scheduled_at": sched},
                    {"$set": {
                        "mentor_id": mid, "user_id": sid,
                        "scheduled_at": sched, "status": "completed",
                        "duration_minutes": 30, "rating": 4.5 + (i % 3) * 0.2,
                    }},
                    upsert=True,
                )
                created_sessions += 1

        # Set last_login for "stuck" detection (mentee #2 stuck for 12 days)
        last_login = now - timedelta(days=12 if i == 2 else 1)
        await _db.users.update_one(
            {"_id": s["_id"]},
            {"$set": {"last_login": last_login}},
        )

    return {
        "ok": True,
        "mentor": "mentor01@test.com",
        "mentees_linked": len(students),
        "connections_upserted": created_conns,
        "roadmaps_upserted": created_roadmaps,
        "sessions_seeded": created_sessions,
        "stuck_mentees": 1,  # mentee #2 is intentionally stuck
        "as_of": now.isoformat(),
    }
