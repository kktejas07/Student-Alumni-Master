"""Enhancement #1 — Rate Limiting & API Key Authentication."""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone

from fastapi import HTTPException, Request

from db import db
from .database import brands_col

logger = logging.getLogger(__name__)

rate_limits_col = db.la_rate_limits
brand_rate_overrides_col = db.la_brand_rate_overrides

TIER_LIMITS: dict[str, int] = {
    "free": 60,
    "starter": 200,
    "growth": 500,
    "enterprise": 2000,
}

DEFAULT_WINDOW_SECONDS = 60


async def verify_api_key(request: Request) -> dict:
    api_key = request.headers.get("X-API-Key")
    if not api_key:
        raise HTTPException(status_code=401, detail="Missing X-API-Key header")

    key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    brand = await brands_col.find_one({"api_key_hash": key_hash})
    if not brand:
        raise HTTPException(status_code=401, detail="Invalid API key")

    if brand.get("status") != "active":
        raise HTTPException(status_code=403, detail="Brand account is not active")

    brand["_id"] = str(brand["_id"])
    return brand


async def verify_api_key_from_key(api_key: str) -> dict | None:
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    brand = await brands_col.find_one({"api_key_hash": key_hash, "status": "active"})
    if brand:
        brand["_id"] = str(brand["_id"])
    return brand


def _tier_max_requests(tier: str) -> int:
    return TIER_LIMITS.get(tier, TIER_LIMITS["free"])


def _window_key(brand_id: str, endpoint: str, window_seconds: int) -> str:
    now = datetime.now(timezone.utc)
    bucket = int(now.timestamp()) // window_seconds
    return f"{brand_id}:{endpoint}:{bucket}"


async def check_rate_limit(
    brand_id: str,
    endpoint: str,
    window_seconds: int = DEFAULT_WINDOW_SECONDS,
    max_requests: int | None = None,
    tier: str = "free",
) -> dict:
    if max_requests is None:
        override = await brand_rate_overrides_col.find_one(
            {"brand_id": brand_id, "endpoint": endpoint}
        )
        if override:
            max_requests = override["max_requests"]
        else:
            max_requests = _tier_max_requests(tier)

    key = _window_key(brand_id, endpoint, window_seconds)
    now = datetime.now(timezone.utc)

    bucket_start_ts = (int(now.timestamp()) // window_seconds) * window_seconds
    reset_at = datetime.fromtimestamp(bucket_start_ts + window_seconds, tz=timezone.utc)

    result = await rate_limits_col.find_one_and_update(
        {"key": key},
        {
            "$inc": {"count": 1},
            "$setOnInsert": {
                "brand_id": brand_id,
                "endpoint": endpoint,
                "created_at": now,
                "expires_at": reset_at,
            },
        },
        upsert=True,
        return_document=True,
    )

    current_count = result["count"]
    allowed = current_count <= max_requests
    remaining = max(0, max_requests - current_count)

    return {
        "allowed": allowed,
        "limit": max_requests,
        "remaining": remaining,
        "current": current_count,
        "reset_at": reset_at,
        "window_seconds": window_seconds,
    }


async def get_rate_limits(brand_id: str) -> dict:
    now = datetime.now(timezone.utc)
    cursor = rate_limits_col.find({
        "brand_id": brand_id,
        "expires_at": {"$gte": now},
    })
    active_windows: list[dict] = []
    async for doc in cursor:
        active_windows.append({
            "endpoint": doc["endpoint"],
            "count": doc["count"],
            "reset_at": doc["expires_at"].isoformat() if doc.get("expires_at") else None,
        })

    overrides_cursor = brand_rate_overrides_col.find({"brand_id": brand_id})
    custom_limits: list[dict] = []
    async for doc in overrides_cursor:
        custom_limits.append({
            "endpoint": doc["endpoint"],
            "max_requests": doc["max_requests"],
        })

    return {
        "brand_id": brand_id,
        "active_windows": active_windows,
        "custom_limits": custom_limits,
    }


async def set_brand_rate_limit(brand_id: str, endpoint: str, max_requests: int) -> dict:
    await brand_rate_overrides_col.update_one(
        {"brand_id": brand_id, "endpoint": endpoint},
        {
            "$set": {
                "max_requests": max_requests,
                "updated_at": datetime.now(timezone.utc),
            },
            "$setOnInsert": {
                "brand_id": brand_id,
                "endpoint": endpoint,
                "created_at": datetime.now(timezone.utc),
            },
        },
        upsert=True,
    )
    return {
        "status": "ok",
        "brand_id": brand_id,
        "endpoint": endpoint,
        "max_requests": max_requests,
    }


def rate_limit_headers(result: dict) -> dict[str, str]:
    reset_ts = ""
    if result.get("reset_at"):
        reset_ts = str(int(result["reset_at"].timestamp()))
    return {
        "X-RateLimit-Limit": str(result.get("limit", 0)),
        "X-RateLimit-Remaining": str(result.get("remaining", 0)),
        "X-RateLimit-Reset": reset_ts,
    }


async def ensure_rate_limit_indexes() -> None:
    try:
        await rate_limits_col.create_index("key", unique=True)
        await rate_limits_col.create_index("expires_at", expireAfterSeconds=0)
        await rate_limits_col.create_index([("brand_id", 1), ("endpoint", 1)])
        await brand_rate_overrides_col.create_index(
            [("brand_id", 1), ("endpoint", 1)], unique=True
        )
    except Exception as e:
        logger.warning("Rate limit index skip: %s", e)
