"""
wallet_analytics.py — Wallet Spending Analytics (W3).

GET /wallet/analytics?period=30d returns everything the analytics tab
needs in one shot, computed server-side so the frontend stays a dumb
renderer:

  earnings_by_category   — donut: lifetime-activity credits by metadata.category
                           (topups bucketed separately), period-scoped
  spending_by_type       — bar: debits by metadata.kind, period-scoped
  trend                  — daily [in, out, net] series over the period
  milestones             — the 5 wallet levels with achieved/current flags
  projection             — current level, days to next level, forecast
                           (from the period's average daily earning rate)
  summary                — earned/spent/net/balance for the period

Periods: 7d | 30d | 90d | 365d (default 30d).

Uses core.db / core.deps. No emoji, per CODING_RULES.md.
"""
from __future__ import annotations

import logging
import math
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, Query

from core.db import db as _db

logger = logging.getLogger("wallet_analytics")
router = APIRouter()


def _get_current_user_dependency():
    from core.deps import get_current_user  # noqa
    return get_current_user


_PERIOD_DAYS = {"7d": 7, "30d": 30, "90d": 90, "365d": 365}


def _resolve_period(period: str) -> int:
    p = (period or "30d").lower()
    return _PERIOD_DAYS.get(p, 30)


@router.get("/wallet/analytics")
async def wallet_analytics(
    period: str = Query("30d"),
    user: dict = Depends(_get_current_user_dependency()),
):
    days = _resolve_period(period)
    from features.activity_credits import LEVELS, _compute_level

    uid = str(user["_id"])
    now = datetime.now(timezone.utc)
    lo = now - timedelta(days=days)

    rows = await _db.wallet_transactions.find(
        {"user_id": uid, "ts": {"$gte": lo}}
    ).to_list(200000)

    # ── bucket by day + category + kind ───────────────────────────────
    earn_by_cat: Dict[str, int] = {}
    spend_by_kind: Dict[str, int] = {}
    day_in: Dict[str, int] = {}
    day_out: Dict[str, int] = {}

    for r in rows:
        ts = r.get("ts")
        if isinstance(ts, datetime):
            key = ts.astimezone(timezone.utc).strftime("%Y-%m-%d")
        else:
            key = str(ts)[:10] if ts else now.strftime("%Y-%m-%d")
        amount = int(r.get("amount") or 0)
        md = r.get("metadata") or {}
        if r.get("type") == "credit":
            bucket = md.get("category") or ("topup" if md.get("kind") == "topup" else "other")
            earn_by_cat[bucket] = earn_by_cat.get(bucket, 0) + amount
            day_in[key] = day_in.get(key, 0) + amount
        elif r.get("type") == "debit":
            bucket = md.get("kind") or "other"
            spend_by_kind[bucket] = spend_by_kind.get(bucket, 0) + amount
            day_out[key] = day_out.get(key, 0) + amount

    earned = sum(earn_by_cat.values())
    spent = sum(spend_by_kind.values())

    # ── contiguous daily trend (fill zero days) ──────────────────────
    trend: List[Dict[str, Any]] = []
    cursor = lo.replace(hour=0, minute=0, second=0, microsecond=0)
    for i in range(days):
        dkey = (cursor + timedelta(days=i)).strftime("%Y-%m-%d")
        inc = day_in.get(dkey, 0)
        outc = day_out.get(dkey, 0)
        trend.append({
            "date": dkey,
            "in": inc,
            "out": outc,
            "net": inc - outc,
        })

    # ── milestones (the 5 levels) + level projection ─────────────────
    wallet = user.get("wallet") or {}
    lifetime = int(wallet.get("lifetime_earned") or 0)
    cur_level = _compute_level(lifetime)

    milestones = []
    for lvl in LEVELS:
        achieved = lifetime >= lvl["min"]
        milestones.append({
            "level": lvl["level"],
            "name": lvl["name"],
            "icon": lvl["icon"],
            "color": lvl["color"],
            "threshold": lvl["min"],
            "achieved": achieved,
            "current": int(lvl["level"]) == int(cur_level["level"]),
        })

    # average daily earning rate over the window (activity + topup)
    daily_rate = round(earned / days, 1) if days else 0
    credits_to_next = int(cur_level.get("credits_to_next") or 0)
    if credits_to_next > 0 and daily_rate > 0:
        eta_days = math.ceil(credits_to_next / daily_rate)
        eta_date = (now + timedelta(days=eta_days)).isoformat()
    else:
        eta_days = None
        eta_date = None

    return {
        "period": period if period in _PERIOD_DAYS else f"{days}d",
        "period_days": days,
        "generated_at": now.isoformat(),
        "summary": {
            "earned": earned,
            "spent": spent,
            "net": earned - spent,
            "balance_credits": int(wallet.get("balance_credits") or 0),
            "lifetime_earned": lifetime,
        },
        "earnings_by_category": [
            {"category": k, "credits": v}
            for k, v in sorted(earn_by_cat.items(), key=lambda x: -x[1])
        ],
        "spending_by_type": [
            {"type": k, "credits": v}
            for k, v in sorted(spend_by_kind.items(), key=lambda x: -x[1])
        ],
        "trend": trend,
        "milestones": milestones,
        "level": cur_level,
        "projection": {
            "daily_rate_credits": daily_rate,
            "current_level": cur_level["level"],
            "current_level_name": cur_level["name"],
            "next_level_name": cur_level.get("next_level_name"),
            "credits_to_next": credits_to_next,
            "eta_days": eta_days,
            "eta_date": eta_date,
            "note": (
                "Top level reached." if not cur_level.get("next_level_name")
                else (f"At your current pace you reach "
                      f"{cur_level['next_level_name']} in about {eta_days} days."
                      if eta_days is not None
                      else "Keep earning to project your next level ETA.")),
        },
    }
