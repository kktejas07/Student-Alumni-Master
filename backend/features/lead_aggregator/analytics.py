"""Lead Aggregator Analytics — event tracking, metrics, and funnel analysis."""
from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta, timezone

from db import db

logger = logging.getLogger(__name__)

la_events_col = db.la_analytics_events

EVENT_LEAD_SUBMITTED = "lead_submitted"
EVENT_LEAD_SCORED = "lead_scored"
EVENT_LEAD_STATUS_CHANGED = "lead_status_changed"
EVENT_LEAD_ASSIGNED = "lead_assigned"
EVENT_LEAD_EXPORTED = "lead_exported"
EVENT_BRAND_REGISTERED = "brand_registered"
EVENT_BRAND_UPDATED = "brand_updated"
EVENT_OFFER_CREATED = "offer_created"
EVENT_OFFER_CLAIMED = "offer_claimed"
EVENT_OTP_SENT = "otp_sent"
EVENT_OTP_VERIFIED = "otp_verified"
EVENT_CONSENT_GRANTED = "consent_granted"
EVENT_CONSENT_REVOKED = "consent_revoked"
EVENT_WEBHOOK_FIRED = "webhook_fired"
EVENT_WEBHOOK_FAILED = "webhook_failed"
EVENT_FRAUD_DETECTED = "fraud_detected"
EVENT_DEDUP_FOUND = "dedup_found"
EVENT_DEDUP_MERGED = "dedup_merged"
EVENT_BOT_RUN = "bot_run"
EVENT_DIGEST_SENT = "digest_sent"
EVENT_IMPORT_COMPLETED = "import_completed"
EVENT_ML_RETRAINED = "ml_retrained"
EVENT_INTEGRATION_FIRED = "integration_fired"
EVENT_WA_MESSAGE = "wa_message"
EVENT_API_ERROR = "api_error"
EVENT_RATE_LIMITED = "rate_limited"

FUNNEL_STAGES = [
    EVENT_LEAD_SUBMITTED,
    EVENT_LEAD_SCORED,
    EVENT_LEAD_ASSIGNED,
    EVENT_OFFER_CLAIMED,
    EVENT_LEAD_STATUS_CHANGED,
]


async def track_event(
    event_type: str,
    category: str,
    entity_type: str,
    entity_id: str,
    data: dict | None = None,
    actor_type: str = "system",
    actor_id: str | None = None,
    ip: str | None = None,
    ua: str | None = None,
) -> str:
    now = datetime.now(timezone.utc)
    event_id = f"EVT-{secrets.token_hex(8)}"
    doc = {
        "event_id": event_id,
        "event_type": event_type,
        "category": category,
        "actor_type": actor_type,
        "actor_id": actor_id or "",
        "entity_type": entity_type,
        "entity_id": entity_id,
        "data": data or {},
        "ip_address": ip or "",
        "user_agent": ua or "",
        "timestamp": now,
        "date_key": now.strftime("%Y-%m-%d"),
    }
    try:
        await la_events_col.insert_one(doc)
    except Exception as e:
        logger.error("analytics track_event failed: %s", e)
    return event_id


async def daily_metrics(date_str: str | None = None) -> dict:
    if not date_str:
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    match_stage = {"$match": {"date_key": date_str}}

    by_type_pipeline = [
        match_stage,
        {"$group": {"_id": "$event_type", "count": {"$sum": 1}}},
    ]
    by_category_pipeline = [
        match_stage,
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
    ]
    actors_pipeline = [
        match_stage,
        {"$match": {"actor_id": {"$ne": ""}}},
        {"$group": {"_id": "$actor_id"}},
        {"$count": "total"},
    ]
    top_entities_pipeline = [
        match_stage,
        {"$group": {"_id": {"type": "$entity_type", "id": "$entity_id"}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]

    events_by_type = {}
    async for doc in la_events_col.aggregate(by_type_pipeline):
        events_by_type[doc["_id"]] = doc["count"]

    events_by_category = {}
    async for doc in la_events_col.aggregate(by_category_pipeline):
        events_by_category[doc["_id"]] = doc["count"]

    unique_actors = 0
    async for doc in la_events_col.aggregate(actors_pipeline):
        unique_actors = doc["total"]

    top_entities = []
    async for doc in la_events_col.aggregate(top_entities_pipeline):
        top_entities.append({
            "entity_type": doc["_id"]["type"],
            "entity_id": doc["_id"]["id"],
            "count": doc["count"],
        })

    total_events = sum(events_by_type.values())

    return {
        "date": date_str,
        "total_events": total_events,
        "events_by_type": events_by_type,
        "events_by_category": events_by_category,
        "unique_actors": unique_actors,
        "top_entities": top_entities,
    }


async def event_timeline(entity_type: str, entity_id: str, limit: int = 50) -> list:
    cursor = la_events_col.find(
        {"entity_type": entity_type, "entity_id": entity_id},
        {"_id": 0},
    ).sort("timestamp", -1).limit(limit)

    events = []
    async for doc in cursor:
        doc["timestamp"] = doc["timestamp"].isoformat() if doc.get("timestamp") else None
        events.append(doc)
    return events


async def funnel_metrics(start_date: str, end_date: str) -> dict:
    pipeline = [
        {"$match": {
            "date_key": {"$gte": start_date, "$lte": end_date},
            "event_type": {"$in": FUNNEL_STAGES},
        }},
        {"$group": {"_id": "$event_type", "count": {"$sum": 1}}},
    ]

    counts = {}
    async for doc in la_events_col.aggregate(pipeline):
        counts[doc["_id"]] = doc["count"]

    stages = []
    prev_count = None
    for stage in FUNNEL_STAGES:
        count = counts.get(stage, 0)
        drop_off = 0.0
        if prev_count and prev_count > 0:
            drop_off = round((1 - count / prev_count) * 100, 1)
        stages.append({
            "stage": stage,
            "count": count,
            "drop_off_pct": drop_off,
        })
        prev_count = count

    return {
        "start_date": start_date,
        "end_date": end_date,
        "stages": stages,
        "total_submitted": counts.get(EVENT_LEAD_SUBMITTED, 0),
        "total_claimed": counts.get(EVENT_OFFER_CLAIMED, 0),
    }


async def conversion_metrics(brand_id: str | None = None, days: int = 30) -> dict:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    match_filter: dict = {
        "timestamp": {"$gte": cutoff},
        "event_type": {"$in": [EVENT_LEAD_SUBMITTED, EVENT_OFFER_CLAIMED]},
    }
    if brand_id:
        match_filter["actor_id"] = brand_id

    pipeline = [
        {"$match": match_filter},
        {"$group": {
            "_id": "$event_type",
            "count": {"$sum": 1},
            "first": {"$min": "$timestamp"},
            "last": {"$max": "$timestamp"},
        }},
    ]

    stats = {}
    async for doc in la_events_col.aggregate(pipeline):
        stats[doc["_id"]] = doc

    submitted = stats.get(EVENT_LEAD_SUBMITTED, {}).get("count", 0)
    claimed = stats.get(EVENT_OFFER_CLAIMED, {}).get("count", 0)
    conversion_rate = round((claimed / submitted * 100), 1) if submitted > 0 else 0.0

    temp_pipeline = [
        {"$match": {
            "timestamp": {"$gte": cutoff},
            "event_type": EVENT_LEAD_SCORED,
            **({"actor_id": brand_id} if brand_id else {}),
        }},
        {"$group": {
            "_id": "$data.temperature",
            "count": {"$sum": 1},
        }},
    ]

    by_temperature = {}
    async for doc in la_events_col.aggregate(temp_pipeline):
        if doc["_id"]:
            by_temperature[doc["_id"]] = doc["count"]

    return {
        "days": days,
        "brand_id": brand_id,
        "submitted": submitted,
        "claimed": claimed,
        "conversion_rate": conversion_rate,
        "by_temperature": by_temperature,
    }


async def system_health() -> dict:
    now = datetime.now(timezone.utc)
    one_min_ago = now - timedelta(minutes=1)
    five_min_ago = now - timedelta(minutes=5)
    one_hour_ago = now - timedelta(hours=1)

    events_last_min = await la_events_col.count_documents({"timestamp": {"$gte": one_min_ago}})
    events_last_5min = await la_events_col.count_documents({"timestamp": {"$gte": five_min_ago}})
    events_last_hour = await la_events_col.count_documents({"timestamp": {"$gte": one_hour_ago}})

    errors_last_hour = await la_events_col.count_documents({
        "timestamp": {"$gte": one_hour_ago},
        "event_type": {"$in": [EVENT_API_ERROR, EVENT_WEBHOOK_FAILED]},
    })

    error_rate = round((errors_last_hour / events_last_hour * 100), 2) if events_last_hour > 0 else 0.0

    return {
        "timestamp": now.isoformat(),
        "events_per_minute": events_last_min,
        "events_last_5min": events_last_5min,
        "events_last_hour": events_last_hour,
        "errors_last_hour": errors_last_hour,
        "error_rate_pct": error_rate,
    }


async def cleanup_old_events(days: int = 90) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    result = await la_events_col.delete_many({"timestamp": {"$lt": cutoff}})
    logger.info("Cleaned up %d analytics events older than %d days", result.deleted_count, days)
    return result.deleted_count


async def ensure_analytics_indexes() -> None:
    try:
        await la_events_col.create_index("event_id", unique=True)
        await la_events_col.create_index("date_key")
        await la_events_col.create_index([("entity_type", 1), ("entity_id", 1)])
        await la_events_col.create_index([("event_type", 1), ("timestamp", -1)])
        await la_events_col.create_index("timestamp")
        await la_events_col.create_index([("actor_id", 1), ("event_type", 1)])
    except Exception as e:
        logger.warning("Analytics index skip: %s", e)
