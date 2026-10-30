"""
wallet_transfer.py — Wallet-to-Wallet Transfer (W11).

Members can move SA Credits between their own and another member's
wallet (e.g. splitting a challenge reward, sponsoring a mentee).

Rules:
  - minimum 10 credits, maximum 500 per transfer
  - at most 3 outgoing transfers per IST day
  - no self-transfers
  - both parties are notified in-app (earn / spend events,
    honoring each one's notification preferences)
  - audited via sa_wallet_audit + wallet_transactions (kind=transfer)

The recipient's incoming credit is exempt from the daily activity
earning cap by metadata kind, same as top-ups.

No emoji, per CODING_RULES.md.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Depends, HTTPException

from core.db import db as _db

logger = logging.getLogger("wallet_transfer")
router = APIRouter()

TRANSFER_MIN = 10
TRANSFER_MAX = 500
TRANSFERS_PER_DAY = 3


def _get_current_user_dependency():
    from core.deps import get_current_user  # noqa
    return get_current_user


def _ist_day_bounds(now: Optional[datetime] = None) -> tuple:
    now = now or datetime.now(timezone.utc)
    try:
        import pytz
        ist = pytz.timezone("Asia/Kolkata")
    except Exception:  # pragma: no cover
        ist = timezone(timedelta(hours=5, minutes=30), "IST")
    ist_now = now.astimezone(ist)
    day_start_utc = (ist_now - timedelta(days=1, hours=5, minutes=30)).replace(
        tzinfo=timezone.utc)
    return day_start_utc, day_start_utc + timedelta(days=1)


async def _find_recipient(lookup: str, sender_id: str) -> Dict[str, Any]:
    """Resolve a recipient by sa_id, name, or email."""
    v = lookup.strip()
    if not v:
        raise HTTPException(400, "recipient is required (name, email or sa_id)")
    cand = (await _db.users.find_one({"email": v.lower()})
            or await _db.users.find_one({"sa_id": v})
            or await _db.users.find_one({"full_name": v})
            or await _db.users.find_one({"name": v}))
    if not cand:
        raise HTTPException(404, "Recipient not found")
    if str(cand["_id"]) == sender_id:
        raise HTTPException(400, "You cannot transfer credits to yourself")
    return cand


@router.post("/wallet/transfer")
async def transfer_credits(
    body: Dict[str, Any] = Body(...),
    user: dict = Depends(_get_current_user_dependency()),
):
    """Transfer SA Credits to another member's wallet.

    Body: { recipient | recipient_email: name|email|sa_id, amount: int,
            message? | note?: str }
    """
    from features.activity_credits import _credit_user, _debit_user
    from features.wallet_security import (
        audit_op, check_debit_lock, register_failed_debit,
    )
    from features.wallet_notifications import notify_wallet_event

    amount = int((body or {}).get("amount") or 0)
    if amount < TRANSFER_MIN:
        raise HTTPException(400, f"Minimum transfer is {TRANSFER_MIN} credits")
    if amount > TRANSFER_MAX:
        raise HTTPException(400, f"Maximum transfer is {TRANSFER_MAX} credits per transaction")

    sender_id = str(user["_id"])
    await check_debit_lock(user)

    today_out = await _db.wallet_transactions.count_documents({
        "user_id": sender_id,
        "type": "debit",
        "metadata.kind": "transfer",
        "ts": {"$gte": _ist_day_bounds()[0]},
    })
    if today_out >= TRANSFERS_PER_DAY:
        raise HTTPException(
            429, f"Max {TRANSFERS_PER_DAY} transfers per day reached. Try again tomorrow.")

    recipient_lookup = str((body or {}).get("recipient")
                           or (body or {}).get("recipient_email") or "").strip()
    recipient = await _find_recipient(recipient_lookup, sender_id)
    rec_id = str(recipient["_id"])

    note = str((body or {}).get("note") or "").strip()[:200]
    reason = f"Transfer from {user.get('full_name') or user.get('name') or sender_id[:8]}"
    if note:
        reason += f" — {note}"

    await audit_op(sender_id, "transfer", amount, reason, "attempted")

    # Debit the sender; a failed debit locks the wallet after 3 failures.
    try:
        new_sender, _ = await _debit_user(
            user, amount, reason,
            metadata={"kind": "transfer", "recipient_id": rec_id, "note": note},
            idempotency_key=f"transfer-out:{sender_id}:{rec_id}:{amount}:{today_out}")
    except HTTPException as e:
        if e.status_code == 402:
            await register_failed_debit(user, amount=amount, op="transfer",
                                        reason="insufficient_credits")
        await audit_op(sender_id, "transfer", amount, reason, "failed")
        raise
    await audit_op(sender_id, "transfer", amount, reason, "ok")

    # Credit the recipient (refresh the shared sender dict is irrelevant
    # here — recipient is a fresh document from the DB).
    try:
        _new_rec, _ = await _credit_user(
            recipient, amount,
            f"Transfer from {user.get('full_name') or user.get('name') or sender_id[:8]}",
            metadata={"kind": "transfer", "sender_id": sender_id, "note": note})
    except Exception as e:  # noqa: BLE001
        # Sender already debited — claw it back rather than lose money.
        logger.warning("recipient credit failed (%s); clawing back", e)
        await _credit_user(user, amount, "Transfer rollback",
                           metadata={"kind": "transfer", "rollback": True})
        await audit_op(sender_id, "transfer", amount, reason, "failed")
        raise HTTPException(409, "Transfer could not be completed; your credits were returned")

    await audit_op(rec_id, "transfer", amount, reason, "ok")

    name = user.get("full_name") or user.get("name") or "A member"
    await notify_wallet_event(
        user, "spend",
        f"Transferred {amount} credits to {recipient.get('full_name') or recipient.get('name') or rec_id[:8]}",
        f"You sent {amount} credits" + (f" with a note: {note}" if note else "."),
        data={"kind": "transfer", "amount": amount, "recipient_id": rec_id},
    )
    await notify_wallet_event(
        recipient, "earn",
        f"Received {amount} credits from {name}",
        f"{name} transferred {amount} credits to your wallet"
        + (f" with a note: {note}" if note else "."),
        data={"kind": "transfer", "amount": amount, "sender_id": sender_id},
    )

    return {
        "ok": True,
        "amount": amount,
        "sender_balance_credits": new_sender,
        "recipient": {
            "id": rec_id,
            "name": recipient.get("full_name") or recipient.get("name"),
        },
        "note": note,
        "transfers_today": today_out + 1,
        "transfers_per_day_limit": TRANSFERS_PER_DAY,
    }


@router.get("/wallet/transfer/history")
async def transfer_history(
    limit: int = 20,
    user: dict = Depends(_get_current_user_dependency()),
):
    """My transfers, in both directions, newest first."""
    uid = str(user["_id"])
    q = {"$or": [
        # outgoing: a debit with kind=transfer (rollback re-credits, so
        # it never shows up as a debit)
        {"user_id": uid, "type": "debit", "metadata.kind": "transfer",
         "metadata.rollback": {"$ne": True}},
        # incoming: a credit with kind=transfer
        {"user_id": uid, "type": "credit", "metadata.kind": "transfer"},
    ]}
    rows = await _db.wallet_transactions.find(q).sort("ts", -1).limit(limit).to_list(limit)
    out = []
    for r in rows:
        md = r.get("metadata") or {}
        sent = r.get("type") == "debit"
        out.append({
            "direction": "sent" if sent else "received",
            "amount": int(r.get("amount") or 0),
            "other_user_id": md.get("recipient_id") if sent else md.get("sender_id"),
            "note": md.get("note"),
            "ts": r.get("ts"),
            "id": str(r["_id"]),
        })
    return {"transfers": out, "count": len(out)}
