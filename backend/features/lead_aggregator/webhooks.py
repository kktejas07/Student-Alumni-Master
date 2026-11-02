"""LA3 — Webhook Delivery with Retry Queue.

Async webhook delivery with exponential backoff, HMAC-SHA256 signatures,
dead letter queue, and delivery status tracking.

Uses asyncio task queue (no Celery dependency) since the platform already
runs background tasks via asyncio.create_task in the lifespan.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import httpx

from .database import webhook_log_col, brands_col

logger = logging.getLogger(__name__)

# Retry schedule: 1min, 5min, 30min
_RETRY_DELAYS = [60, 300, 1800]
_WEBHOOK_TIMEOUT = 10  # seconds
_DEAD_LETTER_RETENTION_DAYS = 30


def _sign_payload(payload: bytes, secret: str) -> str:
    """HMAC-SHA256 signature for webhook verification."""
    return hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()


async def deliver_webhook(
    brand_id: str,
    event_type: str,
    payload: dict[str, Any],
    *,
    webhook_url: Optional[str] = None,
    webhook_secret: Optional[str] = None,
) -> dict:
    """Fire a webhook to a brand's configured URL.

    If no URL/secret passed, looks them up from the brand record.
    Creates a webhook_log entry for tracking.
    """
    if not webhook_url or not webhook_secret:
        brand = await brands_col.find_one({"brand_id": brand_id})
        if not brand or not brand.get("webhook_url"):
            return {"status": "skipped", "reason": "no_webhook_configured"}
        webhook_url = brand["webhook_url"]
        webhook_secret = brand.get("webhook_secret", "")

    delivery_id = f"WHK-{secrets.token_hex(8)}"
    now = datetime.now(timezone.utc)

    envelope = {
        "delivery_id": delivery_id,
        "event_type": event_type,
        "brand_id": brand_id,
        "timestamp": now.isoformat(),
        "data": payload,
    }

    payload_bytes = json.dumps(envelope, default=str).encode()
    signature = _sign_payload(payload_bytes, webhook_secret or "")

    log_doc = {
        "delivery_id": delivery_id,
        "brand_id": brand_id,
        "event_type": event_type,
        "webhook_url": webhook_url,
        "status": "pending",
        "retry_count": 0,
        "max_retries": len(_RETRY_DELAYS),
        "next_retry_at": None,
        "response_status": None,
        "response_body": None,
        "error": None,
        "created_at": now,
        "updated_at": now,
        "dead_letter_expires_at": now + timedelta(days=_DEAD_LETTER_RETENTION_DAYS),
    }
    await webhook_log_col.insert_one(log_doc)

    success = await _attempt_delivery(
        delivery_id, webhook_url, payload_bytes, signature
    )

    if not success:
        # Schedule first retry
        if _RETRY_DELAYS:
            next_retry = now + timedelta(seconds=_RETRY_DELAYS[0])
            await webhook_log_col.update_one(
                {"delivery_id": delivery_id},
                {"$set": {"status": "failed", "next_retry_at": next_retry, "updated_at": now}},
            )

    return {"status": "delivered" if success else "queued_for_retry", "delivery_id": delivery_id}


async def _attempt_delivery(
    delivery_id: str,
    url: str,
    payload_bytes: bytes,
    signature: str,
) -> bool:
    """Single HTTP POST attempt. Returns True on 2xx."""
    now = datetime.now(timezone.utc)
    try:
        async with httpx.AsyncClient(timeout=_WEBHOOK_TIMEOUT) as client:
            resp = await client.post(
                url,
                content=payload_bytes,
                headers={
                    "Content-Type": "application/json",
                    "X-Signature": signature,
                    "X-Delivery-Id": delivery_id,
                    "User-Agent": "AXISS-LeadAggregator/2.0",
                },
            )

        await webhook_log_col.update_one(
            {"delivery_id": delivery_id},
            {"$set": {
                "response_status": resp.status_code,
                "response_body": resp.text[:500],
                "updated_at": now,
            }},
        )

        if 200 <= resp.status_code < 300:
            await webhook_log_col.update_one(
                {"delivery_id": delivery_id},
                {"$set": {"status": "delivered", "updated_at": now}},
            )
            logger.info("[LA-WH] Delivered %s to brand", delivery_id)
            return True

        logger.warning("[LA-WH] %s got HTTP %s", delivery_id, resp.status_code)
        return False

    except Exception as e:
        await webhook_log_col.update_one(
            {"delivery_id": delivery_id},
            {"$set": {"error": str(e)[:500], "updated_at": now}},
        )
        logger.warning("[LA-WH] %s delivery error: %s", delivery_id, e)
        return False


async def process_retry_queue() -> dict:
    """Process all webhooks due for retry. Called by the bot agent / cron."""
    now = datetime.now(timezone.utc)
    retried = 0
    dead_lettered = 0

    cursor = webhook_log_col.find({
        "status": "failed",
        "next_retry_at": {"$lte": now},
        "retry_count": {"$lt": len(_RETRY_DELAYS)},
    })

    async for doc in cursor:
        delivery_id = doc["delivery_id"]
        retry_count = doc.get("retry_count", 0)

        # Re-fetch brand for current webhook URL
        brand = await brands_col.find_one({"brand_id": doc["brand_id"]})
        if not brand or not brand.get("webhook_url"):
            await webhook_log_col.update_one(
                {"delivery_id": delivery_id},
                {"$set": {"status": "dead_letter", "error": "brand_webhook_removed", "updated_at": now}},
            )
            dead_lettered += 1
            continue

        # Reconstruct the payload for re-signing
        envelope = {
            "delivery_id": delivery_id,
            "event_type": doc.get("event_type"),
            "brand_id": doc["brand_id"],
            "timestamp": doc["created_at"].isoformat() if doc.get("created_at") else now.isoformat(),
            "data": doc.get("payload", {}),
            "retry": retry_count + 1,
        }
        payload_bytes = json.dumps(envelope, default=str).encode()
        signature = _sign_payload(payload_bytes, brand.get("webhook_secret", ""))

        success = await _attempt_delivery(delivery_id, brand["webhook_url"], payload_bytes, signature)

        if success:
            retried += 1
        else:
            new_retry = retry_count + 1
            if new_retry >= len(_RETRY_DELAYS):
                await webhook_log_col.update_one(
                    {"delivery_id": delivery_id},
                    {"$set": {"status": "dead_letter", "retry_count": new_retry, "updated_at": now}},
                )
                dead_lettered += 1
            else:
                next_at = now + timedelta(seconds=_RETRY_DELAYS[new_retry])
                await webhook_log_col.update_one(
                    {"delivery_id": delivery_id},
                    {"$set": {"retry_count": new_retry, "next_retry_at": next_at, "updated_at": now}},
                )

    return {"retried": retried, "dead_lettered": dead_lettered}


async def health_check_webhook(brand_id: str) -> dict:
    """Test a brand's webhook URL reachability."""
    brand = await brands_col.find_one({"brand_id": brand_id})
    if not brand or not brand.get("webhook_url"):
        return {"reachable": False, "error": "No webhook URL configured"}

    try:
        async with httpx.AsyncClient(timeout=_WEBHOOK_TIMEOUT) as client:
            resp = await client.head(brand["webhook_url"])
        return {
            "reachable": resp.status_code < 500,
            "status_code": resp.status_code,
            "url": brand["webhook_url"],
        }
    except Exception as e:
        return {"reachable": False, "error": str(e)[:200]}
