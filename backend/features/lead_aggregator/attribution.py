"""LA10 — Lead Attribution Agent.

Multi-touch attribution models: first-touch, last-touch, linear, time-decay.
UTM parameter tracking, channel performance analytics.
"""
from __future__ import annotations

import math
import secrets
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from db import db
from .database import leads_col

logger = logging.getLogger(__name__)

attribution_col = db.la_attribution_events
attribution_models_col = db.la_attribution_models


async def record_touchpoint(
    lead_id: str,
    channel: str,
    *,
    brand_id: Optional[str] = None,
    utm_source: Optional[str] = None,
    utm_medium: Optional[str] = None,
    utm_campaign: Optional[str] = None,
    referrer_url: Optional[str] = None,
    page_url: Optional[str] = None,
) -> dict:
    event_id = f"ATR-{secrets.token_hex(6)}"
    now = datetime.now(timezone.utc)

    doc = {
        "event_id": event_id,
        "lead_id": lead_id,
        "brand_id": brand_id,
        "channel": channel,
        "utm_source": utm_source,
        "utm_medium": utm_medium,
        "utm_campaign": utm_campaign,
        "referrer_url": referrer_url,
        "page_url": page_url,
        "created_at": now,
    }
    await attribution_col.insert_one(doc)
    return {"status": "ok", "event_id": event_id}


async def get_lead_journey(lead_id: str) -> list[dict]:
    cursor = attribution_col.find({"lead_id": lead_id}).sort("created_at", 1)
    journey = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        journey.append(doc)
    return journey


async def attribute_conversion(lead_id: str, model: str = "linear") -> dict:
    """Attribute a lead conversion across touchpoints using the specified model."""
    touchpoints = await get_lead_journey(lead_id)
    if not touchpoints:
        return {"status": "error", "message": "No touchpoints found"}

    n = len(touchpoints)
    credits: dict[str, float] = {}

    if model == "first_touch":
        channel = touchpoints[0]["channel"]
        credits[channel] = 1.0

    elif model == "last_touch":
        channel = touchpoints[-1]["channel"]
        credits[channel] = 1.0

    elif model == "linear":
        weight = 1.0 / n
        for tp in touchpoints:
            channel = tp["channel"]
            credits[channel] = credits.get(channel, 0) + weight

    elif model == "time_decay":
        half_life_days = 7
        now = datetime.now(timezone.utc)
        raw_weights: list[float] = []
        for tp in touchpoints:
            ts = tp["created_at"]
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            days_ago = (now - ts).total_seconds() / 86400
            raw_weights.append(math.exp(-0.693 * days_ago / half_life_days))

        total_weight = sum(raw_weights) or 1
        for tp, w in zip(touchpoints, raw_weights):
            channel = tp["channel"]
            credits[channel] = credits.get(channel, 0) + w / total_weight

    elif model == "u_shaped":
        if n == 1:
            credits[touchpoints[0]["channel"]] = 1.0
        elif n == 2:
            credits[touchpoints[0]["channel"]] = credits.get(touchpoints[0]["channel"], 0) + 0.5
            credits[touchpoints[1]["channel"]] = credits.get(touchpoints[1]["channel"], 0) + 0.5
        else:
            first_w = 0.4
            last_w = 0.4
            mid_w = 0.2 / (n - 2)
            credits[touchpoints[0]["channel"]] = credits.get(touchpoints[0]["channel"], 0) + first_w
            credits[touchpoints[-1]["channel"]] = credits.get(touchpoints[-1]["channel"], 0) + last_w
            for tp in touchpoints[1:-1]:
                credits[tp["channel"]] = credits.get(tp["channel"], 0) + mid_w
    else:
        return {"status": "error", "message": f"Unknown model: {model}"}

    # Round credits
    credits = {k: round(v, 4) for k, v in credits.items()}

    return {
        "lead_id": lead_id,
        "model": model,
        "touchpoints": n,
        "credits": credits,
    }


async def channel_performance(
    brand_id: Optional[str] = None,
    days: int = 30,
) -> list[dict]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    match: dict[str, Any] = {"created_at": {"$gte": cutoff}}
    if brand_id:
        match["brand_id"] = brand_id

    pipeline = [
        {"$match": match},
        {"$group": {
            "_id": "$channel",
            "touchpoints": {"$sum": 1},
            "unique_leads": {"$addToSet": "$lead_id"},
            "utm_sources": {"$addToSet": "$utm_source"},
        }},
        {"$addFields": {"unique_lead_count": {"$size": "$unique_leads"}}},
        {"$sort": {"touchpoints": -1}},
    ]

    results = []
    async for doc in attribution_col.aggregate(pipeline):
        results.append({
            "channel": doc["_id"],
            "touchpoints": doc["touchpoints"],
            "unique_leads": doc["unique_lead_count"],
            "utm_sources": [s for s in doc["utm_sources"] if s],
        })
    return results


async def campaign_roi(brand_id: str, days: int = 30) -> list[dict]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    pipeline = [
        {"$match": {"brand_id": brand_id, "created_at": {"$gte": cutoff}, "utm_campaign": {"$ne": None}}},
        {"$group": {
            "_id": "$utm_campaign",
            "leads": {"$addToSet": "$lead_id"},
            "touchpoints": {"$sum": 1},
        }},
        {"$addFields": {"lead_count": {"$size": "$leads"}}},
        {"$sort": {"lead_count": -1}},
    ]

    results = []
    async for doc in attribution_col.aggregate(pipeline):
        lead_ids = doc["leads"]
        converted = await leads_col.count_documents({"lead_id": {"$in": lead_ids}, "status": "converted"})
        results.append({
            "campaign": doc["_id"],
            "leads": doc["lead_count"],
            "touchpoints": doc["touchpoints"],
            "converted": converted,
            "conversion_rate": round(converted / doc["lead_count"] * 100, 1) if doc["lead_count"] else 0,
        })
    return results
