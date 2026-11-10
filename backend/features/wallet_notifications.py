"""
wallet_notifications.py — Wallet Notifications & Reminders (W9).

Layered on the existing notification infra:
  - in-app inbox  : features.notifications.send_push -> db.notifications
  - push tokens   : same send_push path
  - email         : core.email.send_email

What it adds:
  - per-user preferences stored on user.wallet.notif_prefs
    (earn / spend / level_up / digest / email / push)
  - notify_wallet_event() — the single entry point every wallet feature
    uses to raise a notification, honoring the user's preferences
  - a leader-elected weekly digest job (Mondays 06:00 IST) summarizing
    the last 7 days: earned, spent, level, streak, next challenge

Endpoints (all under /api):
   GET  /wallet/notifications
   POST /wallet/notifications/{id}/read
   GET  /wallet/notifications/preferences
   PUT  /wallet/notifications/preferences

No emoji, per CODING_RULES.md.
"""
from __future__ import annotations

import asyncio
import logging
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query

from core.db import db as _db

logger = logging.getLogger("wallet_notifications")
router = APIRouter()

WALLET_TYPES_RE = re.compile(r"^wallet_")

DEFAULT_PREFS: Dict[str, bool] = {
    "earn": True,
    "spend": True,
    "level_up": True,
    "digest": True,
    "email": False,
    "push": True,
}

# event name -> preference flag that gates it
_EVENT_PREF = {
    "earn": "earn",
    "spend": "spend",
    "level_up": "level_up",
    "digest": "digest",
}


def _get_current_user_dependency():
    from core.deps import get_current_user  # noqa
    return get_current_user


def _prefs_of(user: Dict[str, Any]) -> Dict[str, bool]:
    p = dict(DEFAULT_PREFS)
    stored = ((user.get("wallet") or {}).get("notif_prefs")) or {}
    for k in DEFAULT_PREFS:
        if isinstance(stored.get(k), bool):
            p[k] = stored[k]
    return p


# ─── EVENT DISPATCH ─────────────────────────────────────────────────────
async def notify_wallet_event(
    user: Dict[str, Any],
    event: str,
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
    email_body_html: Optional[str] = None,
) -> bool:
    """Send a wallet notification honoring the user's preferences.

    `event` is one of earn | spend | level_up | digest | custom
    (custom is always delivered unless push is off). Returns True when
    the in-app notification was logged.
    """
    try:
        uid = str(user["_id"])
        prefs = _prefs_of(user)
        gate = _EVENT_PREF.get(event)
        if gate is not None and not prefs[gate]:
            return False
        if not prefs["push"]:
            return False

        from features.notifications import send_push
        await send_push(
            _db, user_id=uid, title=title, body=body,
            data={"type": f"wallet_{event}", **(data or {})})

        if prefs.get("email"):
            email = (user.get("email") or "").strip()
            if email:
                try:
                    from core.email import send_email
                    html = email_body_html or (
                        f"<h2>{title}</h2><p>{body}</p>")
                    await send_email(email, f"StudentAlumni: {title}", html)
                except Exception as e:  # noqa: BLE001
                    logger.warning("wallet notification email failed: %s", e)
        return True
    except Exception as e:  # noqa: BLE001
        logger.warning("wallet event notification failed: %s", e)
        return False


async def notify_level_up(user: Dict[str, Any], new_level: Dict[str, Any]) -> bool:
    """Called when a credit crosses into the next level."""
    name = new_level.get("name") or "new"
    nxt = new_level.get("next_level_name")
    next_line = f"Next: {nxt} at {new_level.get('next_level_at')} credits." if nxt else "Top level reached."
    return await notify_wallet_event(
        user, "level_up",
        f"Level up: {name}",
        f"You reached {name} level. {next_line}",
        data={"level": new_level.get("level"), "level_name": name,
              "progress_pct": new_level.get("progress_pct")},
        email_body_html=(
            f"<h2>Level up: {name}</h2>"
            f"<p>Congratulations on reaching the {name} tier of the "
            f"StudentAlumni wallet. {next_line}</p>"),
    )


# ─── INBOX ENDPOINTS ────────────────────────────────────────────────────
@router.get("/wallet/notifications")
async def wallet_notifications(
    limit: int = Query(30, ge=1, le=100),
    user: dict = Depends(_get_current_user_dependency()),
):
    """Wallet-scoped feed: only notifications raised by the wallet itself."""
    uid = str(user["_id"])
    q = {"user_id": uid, "type": {"$regex": "^wallet"}}
    rows = await _db.notifications.find(q).sort("created_at", -1).limit(limit).to_list(limit)
    out = []
    for r in rows:
        out.append({
            "id": str(r["_id"]),
            "title": r.get("title"),
            "body": r.get("body"),
            "type": r.get("type"),
            "data": r.get("data") or {},
            "read": bool(r.get("read")),
            "created_at": (r.get("created_at").isoformat()
                           if isinstance(r.get("created_at"), datetime) else r.get("created_at")),
        })
    unread = await _db.notifications.count_documents({**q, "read": False})
    return {"notifications": out, "unread": unread, "count": len(out)}


@router.post("/wallet/notifications/{nid}/read")
async def mark_wallet_notification_read(
    nid: str,
    user: dict = Depends(_get_current_user_dependency()),
):
    from bson import ObjectId
    uid = str(user["_id"])
    try:
        oid = ObjectId(nid)
    except Exception:
        oid = None
    q: Dict[str, Any] = {"user_id": uid}
    if oid:
        q["$or"] = [{"id": nid}, {"_id": oid}]
    else:
        raise HTTPException(404, "Notification not found")
    res = await _db.notifications.update_many(q, {"$set": {"read": True}})
    if res.matched_count == 0:
        raise HTTPException(404, "Notification not found")
    return {"ok": True}


# ─── PREFERENCES ────────────────────────────────────────────────────────
@router.get("/wallet/notifications/preferences")
async def get_preferences(user: dict = Depends(_get_current_user_dependency())):
    return {"preferences": _prefs_of(user), "defaults": DEFAULT_PREFS}


@router.put("/wallet/notifications/preferences")
async def set_preferences(
    body: Dict[str, Any] = Body(default={}),
    user: dict = Depends(_get_current_user_dependency()),
):
    known = set(DEFAULT_PREFS)
    clean: Dict[str, bool] = {}
    for k, v in (body or {}).items():
        if k in known and isinstance(v, bool):
            clean[k] = v
    if not clean:
        raise HTTPException(400, "Provide at least one known preference as a boolean")
    await _db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"wallet.notif_prefs": clean}},
    )
    user.setdefault("wallet", {})["notif_prefs"] = clean
    return {"ok": True, "preferences": _prefs_of(user)}


# ─── WEEKLY DIGEST ──────────────────────────────────────────────────────
def _ist_week_key() -> str:
    d = datetime.now(timezone.utc).astimezone(_IST)
    y, w, _ = d.isocalendar()
    return f"{y}-W{w:02d}"


try:
    import pytz
    _IST = pytz.timezone("Asia/Kolkata")
except Exception:  # pragma: no cover
    _IST = timezone(timedelta(hours=5, minutes=30), "IST")


async def build_weekly_digest(user: Dict[str, Any]) -> Dict[str, Any]:
    """7-day wallet summary for one user."""
    from features.activity_credits import _compute_level
    uid = str(user["_id"])
    now = datetime.now(timezone.utc)
    lo = now - timedelta(days=7)
    w = user.get("wallet") or {}
    lifetime = int(w.get("lifetime_earned") or 0)
    level = _compute_level(lifetime)

    pip = [
        {"$match": {"user_id": uid, "ts": {"$gte": lo}}},
        {"$group": {"_id": "$type", "total": {"$sum": "$amount"}}},
    ]
    earned = spent = 0
    async for row in _db.wallet_transactions.aggregate(pip):
        if row.get("_id") == "credit":
            earned = int(row.get("total") or 0)
        elif row.get("_id") == "debit":
            spent = int(row.get("total") or 0)

    ch = await _db["sa_challenges"].find_one({"user_id": uid})
    challenge = None
    if ch:
        lo7 = ch.get("created_at") or lo
        progress = 0
        async for ev in _db.activity_events.find(
                {"user_id": uid, "category": ch.get("category"),
                 "ts": {"$gte": lo7}, "credits": {"$gt": 0}}):
            progress += int(ev.get("credits") or 0)
        challenge = {"category": ch.get("category"), "progress": progress,
                     "target": int(ch.get("target") or 0),
                     "claimed": ch.get("status") == "claimed"}

    best = int(user.get("streak_best_days") or 0)
    active_days = set()
    async for ev in _db.activity_events.find(
            {"user_id": uid, "ts": {"$gte": lo}}, {"ts": 1}):
        ts = ev.get("ts")
        if isinstance(ts, datetime):
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            active_days.add(ts.astimezone(_IST).strftime("%Y-%m-%d"))

    return {
        "period_days": 7,
        "earned": earned,
        "spent": spent,
        "net": earned - spent,
        "balance_credits": int(w.get("balance_credits") or 0),
        "lifetime_earned": lifetime,
        "level": {"level": level["level"], "name": level["name"],
                  "next_level_name": level["next_level_name"],
                  "next_level_at": level["next_level_at"],
                  "progress_pct": level["progress_pct"],
                  "credits_to_next": level["credits_to_next"]},
        "streak_best_days": best,
        "active_days_this_week": len(active_days),
        "challenge": challenge,
    }


async def send_weekly_digest(user: Dict[str, Any]) -> bool:
    """Compose + deliver the digest if the user's week was non-empty or
    they opted in anyway. Returns True when sent."""
    d = await build_weekly_digest(user)
    if d["earned"] == 0 and d["spent"] == 0 and not d["challenge"]:
        return False
    w = user.get("wallet") or {}
    week = _ist_week_key()
    if w.get("last_digest_week") == week:
        return False

    lvl = d["level"]
    lines = [
        f"{'+' if d['net'] >= 0 else ''}{d['net']} net credits this week "
        f"(earned {d['earned']}, spent {d['spent']}).",
        f"Balance: {d['balance_credits']} credits. Level: {lvl['name']} "
        f"({lvl['progress_pct']}% toward {lvl['next_level_name'] or 'top tier'}).",
    ]
    if d["challenge"] and not d["challenge"]["claimed"]:
        c = d["challenge"]
        lines.append(
            f"Weekly challenge ({c['category']}): {c['progress']}/{c['target']} — "
            + ("claim your reward" if c["progress"] >= c["target"]
               else f"{c['target'] - c['progress']} to go"))
    elif d["challenge"] and d["challenge"]["claimed"]:
        lines.append("Weekly challenge completed and claimed. Nice work.")

    title = "Your weekly wallet digest"
    body = " ".join(lines)
    ok = await notify_wallet_event(
        user, "digest", title, body,
        data={"week": week, **d},
        email_body_html=(
            f"<h2>Your weekly wallet digest</h2>"
            + "".join(f"<p>{l}</p>" for l in lines)),
    )
    if ok:
        await _db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"wallet.last_digest_week": week}},
        )
    return ok


async def sweep_weekly_digests() -> Dict[str, Any]:
    """Deliver the weekly digest to every user with wallet activity this
    week (or any opt-in digest user). Idempotent per user per ISO week."""
    lo = datetime.now(timezone.utc) - timedelta(days=7)
    ids: set = set()
    q = {"$or": [
        {"wallet.last_credited_at": {"$gte": lo}},
        {"wallet.last_used_at": {"$gte": lo}},
    ]}
    async for u in _db.users.find(q, {"_id": 1}):
        ids.add(str(u["_id"]))

    sent = skipped = failed = 0
    for uid in sorted(ids):
        u = await _db.users.find_one({"_id": _to_oid(uid)})
        if not u:
            continue
        if ((u.get("wallet") or {}).get("last_digest_week") == _ist_week_key()):
            skipped += 1
            continue
        try:
            if await send_weekly_digest(u):
                sent += 1
            else:
                skipped += 1
        except Exception as e:  # noqa: BLE001
            failed += 1
            logger.warning("weekly digest failed for %s: %s", uid, e)
    logger.info("[wallet_notifications] digest sweep: sent=%d skipped=%d failed=%d",
                sent, skipped, failed)
    return {"sent": sent, "skipped": skipped, "failed": failed,
            "candidates": len(ids), "at": datetime.now(timezone.utc).isoformat()}


def _to_oid(uid: str):
    from bson import ObjectId
    try:
        return ObjectId(uid)
    except Exception:
        return uid


# ─── SCHEDULER (leader-elected, see server.py) ──────────────────────────
_scheduler: Optional[Any] = None


def _flag_set(var: str, default: str = "1") -> bool:
    v = (os.environ.get(var) or default).strip().lower()
    return v in {"1", "true", "yes", "on"}


def start_wallet_notifications_scheduler() -> None:
    """Weekly digest on Mondays 06:00 IST, guarded by
    WALLET_NOTIF_CRON_ENABLED (default 1). No startup catch-up — the
    digest must only fire once a week, not once per deploy."""
    global _scheduler
    if _scheduler is not None:
        return
    if not _flag_set("WALLET_NOTIF_CRON_ENABLED", "1"):
        logger.info("[wallet_notifications] cron disabled via WALLET_NOTIF_CRON_ENABLED")
        return
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.cron import CronTrigger
        ist = _IST
        _scheduler = AsyncIOScheduler(timezone=ist)
        _scheduler.add_job(
            _run_digest,
            CronTrigger(day_of_week="mon", hour=6, minute=0, timezone=ist),
            id="wallet_notifications_weekly_digest",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )
        _scheduler.start()
        logger.info("[wallet_notifications] weekly digest cron started (Mon 06:00 IST)")
    except Exception as e:  # noqa: BLE001
        logger.warning("[wallet_notifications] failed to start scheduler: %s", e)


async def _run_digest() -> None:
    try:
        await sweep_weekly_digests()
    except Exception as e:  # noqa: BLE001
        logger.warning("weekly digest sweep failed: %s", e)


def stop_wallet_notifications_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        try:
            _scheduler.shutdown(wait=False)
        except Exception:  # noqa: BLE001
            pass
        _scheduler = None
