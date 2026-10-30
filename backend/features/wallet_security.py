"""
wallet_security.py — Wallet Security & Fraud Prevention (W8).

Defense layers around the wallet core:

  sa_wallet_audit   — append-only audit log of wallet credit ops
                      (attempted / succeeded / failed, with reasons)

  Rate limits (enforced via wallet_transactions counts, no Redis needed):
    - 10 credit operations per rolling hour
    - 3 withdrawals per IST day, 1 per rolling hour
    - 500 SA Credits earned per IST day (activity earnings, not top-ups)

  Suspicious-pattern detection:
    - 3 failed debits within 30 minutes locks the wallet for 30 minutes
      (stored on user.wallet.locked_until)

  KYC-lite for withdrawals:
    - withdrawals of 5,000+ credits require a verified UPI VPA
      (user.wallet.kyc_lite); smaller withdrawals stay friction-free.

  Transaction alerts:
    - significant ops (top-ups, withdrawals, transfers, 500cr+) are
      logged to the in-app notification feed.

No emoji, per CODING_RULES.md.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query

from core.db import db as _db

logger = logging.getLogger("wallet_security")
router = APIRouter()

AUDIT = "sa_wallet_audit"

CREDIT_OPS_PER_HOUR = 10
WITHDRAWALS_PER_DAY = 3
WITHDRAWALS_PER_HOUR = 1
FAILED_DEBITS_TO_LOCK = 3
LOCK_DURATION_MIN = 30
LOCK_WINDOW_MIN = 30
DAILY_EARNING_CAP = 500
KYC_WITHDRAW_THRESHOLD = 5000  # credits (~Rs 200)

try:
    import pytz
    _IST = pytz.timezone("Asia/Kolkata")
except Exception:  # pragma: no cover
    _IST = timezone(timedelta(hours=5, minutes=30), "IST")


def _get_current_user_dependency():
    from core.deps import get_current_user  # noqa
    return get_current_user


def _ist_day_bounds(now: Optional[datetime] = None) -> tuple:
    """Start/end of the current IST day as UTC datetimes (for queries)."""
    now = now or datetime.now(timezone.utc)
    ist_now = now.astimezone(_IST)
    day_start_utc = (ist_now - timedelta(days=1, hours=5, minutes=30)).replace(
        tzinfo=timezone.utc)
    day_end_utc = day_start_utc + timedelta(days=1)
    return day_start_utc, day_end_utc


async def audit_op(user_id: str, op: str, amount: int, reason: str,
                   status: str, metadata: Optional[Dict[str, Any]] = None) -> None:
    """Fire-and-forget audit insert. Never raises."""
    try:
        await _db[AUDIT].insert_one({
            "user_id": user_id,
            "op": op,
            "amount": int(amount or 0),
            "reason": reason,
            "status": status,  # attempted | ok | failed
            "metadata": metadata or {},
            "ts": datetime.now(timezone.utc),
        })
    except Exception as e:  # noqa: BLE001
        logger.warning("audit insert failed: %s", e)


async def check_credit_rate_limit(user: Dict[str, Any]) -> None:
    """429 if the user already ran 10 wallet credit ops in the last hour."""
    uid = str(user["_id"])
    lo = datetime.now(timezone.utc) - timedelta(hours=1)
    n = await _db.wallet_transactions.count_documents(
        {"user_id": uid, "type": {"$in": ["credit", "debit"]}, "ts": {"$gte": lo}})
    if n >= CREDIT_OPS_PER_HOUR:
        raise HTTPException(
            429, f"Rate limit: max {CREDIT_OPS_PER_HOUR} wallet operations per hour. Try again later.")


async def check_withdrawal_rate_limits(user: Dict[str, Any]) -> None:
    """429 if 3 withdrawals today (IST) or 1 in the last hour."""
    uid = str(user["_id"])
    now = datetime.now(timezone.utc)
    day_lo, _ = _ist_day_bounds(now)
    day_n = await _db.wallet_transactions.count_documents({
        "user_id": uid, "type": "debit",
        "metadata.kind": "withdraw",
        "ts": {"$gte": day_lo},
    })
    if day_n >= WITHDRAWALS_PER_DAY:
        raise HTTPException(
            429, f"Max {WITHDRAWALS_PER_DAY} withdrawals per day reached.")
    hour_n = await _db.wallet_transactions.count_documents({
        "user_id": uid, "type": "debit",
        "metadata.kind": "withdraw",
        "ts": {"$gte": now - timedelta(hours=1)},
    })
    if hour_n >= WITHDRAWALS_PER_HOUR:
        raise HTTPException(
            429, "Max 1 withdrawal per hour reached. Try again in an hour.")


async def check_daily_earning_cap(user: Dict[str, Any], amount: int) -> None:
    """409 if crediting `amount` would push the user past the 500cr/day
    activity-earning cap. Top-ups and transfers are excluded (their own
    callers decide)."""
    if amount <= 0:
        return
    uid = str(user["_id"])
    day_lo, _ = _ist_day_bounds()
    # activity earnings carry metadata.category; top-ups carry kind=topup
    rows = await _db.wallet_transactions.aggregate([
        {"$match": {"user_id": uid, "type": "credit",
                    "ts": {"$gte": day_lo},
                    "metadata.kind": {"$nin": ["topup", "transfer"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]).to_list(1)
    today = int((rows[0].get("total") or 0)) if rows else 0
    if today + amount > DAILY_EARNING_CAP:
        raise HTTPException(
            409, f"Daily earning cap reached ({today}/{DAILY_EARNING_CAP} credits today).")


async def check_debit_lock(user: Dict[str, Any]) -> None:
    """423 while the user is locked out after repeated failed debits."""
    locked_until = (user.get("wallet") or {}).get("locked_until")
    if isinstance(locked_until, datetime) and locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)
    if locked_until and locked_until > datetime.now(timezone.utc):
        left = int((locked_until - datetime.now(timezone.utc)).total_seconds() // 60) + 1
        raise HTTPException(423, f"Wallet locked after repeated failures. Retry in {left} min.")


async def register_failed_debit(user: Dict[str, Any], amount: int = 0,
                                op: str = "debit",
                                reason: str = "insufficient_credits") -> None:
    """Log a failed debit and lock the wallet for 30 min on the 3rd failure
    within a 30-minute window."""
    uid = str(user["_id"])
    safe_uid = re.sub(r"[\r\n]+", "", uid)
    now = datetime.now(timezone.utc)
    lo = now - timedelta(minutes=LOCK_WINDOW_MIN)
    await _db[AUDIT].insert_one({
        "user_id": uid, "op": op, "amount": int(amount or 0),
        "reason": reason, "status": "failed",
        "metadata": {}, "ts": now,
    })
    n = await _db[AUDIT].count_documents({
        "user_id": uid, "op": {"$in": ["debit", "withdraw"]},
        "status": "failed", "ts": {"$gte": lo}})
    if n >= FAILED_DEBITS_TO_LOCK:
        until = now + timedelta(minutes=LOCK_DURATION_MIN)
        await _db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"wallet.locked_until": until}})
        logger.info("wallet locked %s for %d min (failed debits)", safe_uid, LOCK_DURATION_MIN)


# ─── ALERTS (in-app notification feed, preference-aware) ───────────────
async def alert_transaction(user: Dict[str, Any], txn: Dict[str, Any]) -> None:
    """Push a wallet alert into the user's in-app notification feed when
    the transaction is significant (top-ups, withdrawals, transfers,
    500cr+). Honors the user's earn/spend notification preferences via
    the W9 dispatcher. Fire-and-forget; never blocks the main operation."""
    try:
        ttype = txn.get("type")
        amount = int(txn.get("amount") or 0)
        if amount <= 0:
            return
        kind = (txn.get("metadata") or {}).get("kind")
        if not (kind in ("topup", "withdraw", "transfer") or amount >= 500):
            return
        event = "earn" if ttype == "credit" else "spend"
        title = f"Wallet: +{amount} credits" if ttype == "credit" else f"Wallet: -{amount} credits"
        body = f"{txn.get('reason') or 'Wallet transaction'}"
        from features.wallet_notifications import notify_wallet_event
        await notify_wallet_event(
            user, event, title, body,
            data={"amount": amount, "kind": kind},
            email_body_html=(f"<h2>{title}</h2><p>{body}</p>"))
    except Exception as e:  # noqa: BLE001
        logger.warning("wallet alert failed: %s", e)


# ─── KYC-LITE ──────────────────────────────────────────────────────────────
_VPA_RE = re.compile(r"^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$")


def _mask_vpa(vpa: str) -> str:
    """Keep the @provider part, mask the handle: 'krishna@okaxis' -> 'k****@okaxis'."""
    handle, _, provider = vpa.partition("@")
    return handle[:1] + "*" * max(2, len(handle) - 1) + "@" + provider


def kyc_verified(user: Dict[str, Any]) -> bool:
    return bool(((user.get("wallet") or {}).get("kyc_lite") or {}).get("verified"))


async def require_kyc_for_withdrawal(user: Dict[str, Any], amount_credits: int) -> None:
    """Withdrawals of 5,000+ credits require KYC-lite (verified UPI VPA)."""
    if amount_credits < KYC_WITHDRAW_THRESHOLD:
        return
    if not kyc_verified(user):
        raise HTTPException(
            403,
            f"Withdrawals of {KYC_WITHDRAW_THRESHOLD}+ credits need a verified UPI ID. "
            "Add one via POST /wallet/security/kyc first.")


# ─── ENDPOINTS ────────────────────────────────────────────────────────────
@router.get("/wallet/security/status")
async def security_status(user: dict = Depends(_get_current_user_dependency())):
    """Current rate-limit headroom, lock state, daily earning usage, KYC."""
    uid = str(user["_id"])
    now = datetime.now(timezone.utc)
    day_lo, _ = _ist_day_bounds(now)
    ops_hour = await _db.wallet_transactions.count_documents(
        {"user_id": uid, "ts": {"$gte": now - timedelta(hours=1)}})
    wd_today = await _db.wallet_transactions.count_documents({
        "user_id": uid, "type": "debit", "metadata.kind": "withdraw",
        "ts": {"$gte": day_lo}})
    rows = await _db.wallet_transactions.aggregate([
        {"$match": {"user_id": uid, "type": "credit", "ts": {"$gte": day_lo},
                    "metadata.kind": {"$nin": ["topup", "transfer"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]).to_list(1)
    earned_today = int((rows[0].get("total") or 0)) if rows else 0

    locked_until = (user.get("wallet") or {}).get("locked_until")
    if isinstance(locked_until, datetime) and locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)
    locked = bool(locked_until and locked_until > now)

    return {
        "credit_ops_this_hour": ops_hour,
        "credit_ops_limit": CREDIT_OPS_PER_HOUR,
        "withdrawals_today": wd_today,
        "withdrawals_per_day_limit": WITHDRAWALS_PER_DAY,
        "earnings_today": earned_today,
        "daily_earning_cap": DAILY_EARNING_CAP,
        "earning_cap_remaining": max(0, DAILY_EARNING_CAP - earned_today),
        "locked": locked,
        "locked_until": locked_until.isoformat() if locked else None,
        "kyc": {
            "verified": kyc_verified(user),
            "required_for_withdrawals_from_credits": KYC_WITHDRAW_THRESHOLD,
        },
    }


@router.get("/wallet/security/audit")
async def my_audit_log(
    limit: int = Query(20, le=100),
    user: dict = Depends(_get_current_user_dependency()),
):
    """My recent audited wallet operations (newest first)."""
    rows = await _db[AUDIT].find(
        {"user_id": str(user["_id"])}).sort("ts", -1).limit(limit).to_list(limit)
    return {"entries": [
        {"op": r.get("op"), "amount": int(r.get("amount") or 0),
         "reason": r.get("reason"), "status": r.get("status"),
         "ts": r.get("ts")} for r in rows],
        "count": len(rows)}


@router.get("/wallet/security/kyc")
async def kyc_status(user: dict = Depends(_get_current_user_dependency())):
    kyc = (user.get("wallet") or {}).get("kyc_lite") or {}
    return {"verified": bool(kyc.get("verified")),
            "vpa_masked": kyc.get("vpa_masked"),
            "updated_at": (kyc.get("updated_at")
                          .isoformat() if isinstance(kyc.get("updated_at"), datetime)
                          else None),
            "required_for_withdrawals_from_credits": KYC_WITHDRAW_THRESHOLD}


@router.post("/wallet/security/kyc")
async def kyc_verify(
    body: Dict[str, Any] = Body(default={}),
    user: dict = Depends(_get_current_user_dependency()),
):
    """KYC-lite: verify a UPI VPA so large withdrawals are allowed.
    Body: { upi_vpa: str, pan_last4?: 4 digits }
    """
    vpa = str((body or {}).get("upi_vpa") or "").strip()
    pan_last4 = str((body or {}).get("pan_last4") or "").strip()
    if not _VPA_RE.match(vpa):
        raise HTTPException(400, "A valid UPI VPA (handle@provider) is required")
    if pan_last4 and not re.fullmatch(r"[0-9]{4}", pan_last4):
        raise HTTPException(400, "pan_last4 must be 4 digits")
    now = datetime.now(timezone.utc)
    await _db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"wallet.kyc_lite": {
            "verified": True,
            "vpa_masked": _mask_vpa(vpa),
            "pan_last4_masked": (pan_last4[:1] + "***") if pan_last4 else None,
            "updated_at": now,
        }}})
    await audit_op(str(user["_id"]), "kyc", 0, "KYC-lite verified", "ok")
    return {"ok": True, "verified": True, "vpa_masked": _mask_vpa(vpa)}
