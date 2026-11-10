"""Invoice + ticket endpoints.

Verbatim segment of features/echo_showcase.py (audit Step 5b). Exec'd into that
module's namespace in source order — referenced names resolve from the shared
namespace; do not import this file directly.
"""
from __future__ import annotations

# ── Razorpay webhook ─────────────────────────────────────────────────────────
@router.post("/showcases/webhook/razorpay")
async def razorpay_webhook(request: Request):
    """Server-confirmed payment capture webhook.

    Razorpay POSTs here when a payment is captured. We verify the HMAC signature
    over the raw body, then finalize the matching pending ECHO registration
    (QR + invoice + email + mirror). Always answers 200 so Razorpay does not
    retry already-handled events; failures are logged and re-drivable via
    verify-payment.
    """
    db = _get_db(request)
    body = await request.body()
    signature = request.headers.get("x-razorpay-signature", "")

    cfg = await _razorpay_config(db)
    if not cfg:
        print("[ECHO-WEBHOOK] Razorpay webhook received but gateway not configured")
        return {"received": True, "processed": False, "reason": "gateway_not_configured"}

    if not signature:
        print("[ECHO-WEBHOOK] No x-razorpay-signature header — Razorpay may not be configured to send webhooks")
        return {"received": True, "processed": False, "reason": "missing_signature"}
    if not await _razorpay_verify_webhook_signature(db, body, signature):
        print("[ECHO-WEBHOOK] Razorpay webhook signature verification failed — check webhook_secret in Settings → Razorpay matches the one in Razorpay Dashboard → Settings → Webhooks")
        return {"received": True, "processed": False, "reason": "signature_failed"}

    try:
        event = json.loads(body)
    except Exception as e:
        print(f"[ECHO-WEBHOOK] Invalid JSON body: {e}")
        return {"received": True, "processed": False, "reason": "invalid_json"}

    event_name = event.get("event") or ""
    entity = (event.get("payload") or {}).get("payment", {}).get("entity") or {}
    order_id = entity.get("order_id") or ""
    payment_id = entity.get("id") or ""
    amount_paise = int(entity.get("amount") or 0)

    print(f"[ECHO-WEBHOOK] event={event_name} order={order_id} payment={payment_id}")

    # Accept both payment.captured (final) and payment.authorized (pre-capture).
    # Some Razorpay integrations fire authorized first; we finalize on either
    # so the registration doesn't go stale while waiting for a second webhook.
    if event_name not in ("payment.captured", "payment.authorized"):
        return {"received": True, "processed": False, "reason": "ignored_event"}

    if not order_id:
        print("[ECHO-WEBHOOK] payment.captured without order_id")
        return {"received": True, "processed": False, "reason": "missing_order_id"}

    # The order id is stored on the pending registration's payment_order.
    reg = await db.echo_registrations.find_one({"payment_order.order_id": order_id})
    if not reg:
        # Also try receipt fallback (Razorpay puts our reg_id in receipt).
        # Search BOTH pending AND failed — the sweep job may have already
        # marked the registration "failed" before the webhook arrived.
        for r in await db.echo_registrations.find({
            "payment.status": {"$in": ["pending", "failed"]}
        }).to_list(500):
            if r.get("id") == order_id or (r.get("payment_order") or {}).get("order_id") == order_id:
                reg = r
                break
    if not reg:
        print(f"[ECHO-WEBHOOK] No pending registration for order {order_id}")
        return {"received": True, "processed": False, "reason": "no_registration"}

    expected_amount = int(float(reg.get("fee") or 0) * 100)
    if expected_amount and amount_paise != expected_amount:
        print(f"[ECHO-WEBHOOK] Amount mismatch: expected {expected_amount} got {amount_paise} for order {order_id}")
        return {"received": True, "processed": False, "reason": "amount_mismatch"}

    showcase = await db.echo_showcases.find_one(_slug_query(reg.get("slug")))
    finalized = await _finalize_paid_registration(db, reg, showcase, payment_id)
    print(f"[ECHO-WEBHOOK] Finalized registration {reg.get('id')} (payment {payment_id})")
    return {"received": True, "processed": True, "registration_id": reg.get("id")}


