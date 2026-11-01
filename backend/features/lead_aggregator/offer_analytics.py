"""LA14 — Offer Performance Analytics Agent.

Per-offer and per-brand performance tracking: impressions, claims,
conversion funnels, time-to-claim, and offer comparison.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from db import db
from .database import offers_col, claims_col, leads_col, brands_col

logger = logging.getLogger(__name__)

offer_analytics_col = db.la_offer_analytics


async def offer_performance(offer_id: str) -> dict:
    """Detailed performance metrics for a single offer."""
    offer = await offers_col.find_one({"offer_id": offer_id})
    if not offer:
        return {"status": "error", "message": "Offer not found"}

    total_claims = await claims_col.count_documents({"offer_id": offer_id})
    max_claims = offer.get("max_claims", 100)
    fill_rate = round(total_claims / max_claims * 100, 1) if max_claims else 0

    # Claims by status
    status_pipeline = [
        {"$match": {"offer_id": offer_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    claim_statuses: dict[str, int] = {}
    async for doc in claims_col.aggregate(status_pipeline):
        claim_statuses[doc["_id"]] = doc["count"]

    # Avg time-to-claim from lead creation
    time_pipeline = [
        {"$match": {"offer_id": offer_id}},
        {"$lookup": {
            "from": "la_leads",
            "localField": "lead_id",
            "foreignField": "lead_id",
            "as": "lead",
        }},
        {"$unwind": {"path": "$lead", "preserveNullAndEmptyArrays": True}},
        {"$addFields": {
            "time_to_claim_hrs": {
                "$divide": [
                    {"$subtract": ["$claimed_at", "$lead.created_at"]},
                    3600000,
                ]
            }
        }},
        {"$group": {"_id": None, "avg_hours": {"$avg": "$time_to_claim_hrs"}}},
    ]
    avg_time = None
    async for doc in claims_col.aggregate(time_pipeline):
        avg_time = round(doc["avg_hours"] or 0, 1)

    # Temperature of claiming leads
    temp_pipeline = [
        {"$match": {"offer_id": offer_id}},
        {"$lookup": {
            "from": "la_leads",
            "localField": "lead_id",
            "foreignField": "lead_id",
            "as": "lead",
        }},
        {"$unwind": "$lead"},
        {"$group": {"_id": "$lead.temperature", "count": {"$sum": 1}}},
    ]
    temp_dist: dict[str, int] = {}
    async for doc in claims_col.aggregate(temp_pipeline):
        temp_dist[doc["_id"]] = doc["count"]

    # Claims over time (daily)
    daily_pipeline = [
        {"$match": {"offer_id": offer_id}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$claimed_at"}},
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
        {"$limit": 30},
    ]
    daily_claims = []
    async for doc in claims_col.aggregate(daily_pipeline):
        daily_claims.append({"date": doc["_id"], "claims": doc["count"]})

    return {
        "offer_id": offer_id,
        "title": offer.get("title"),
        "brand_id": offer.get("brand_id"),
        "domain": offer.get("domain"),
        "total_claims": total_claims,
        "max_claims": max_claims,
        "fill_rate_pct": fill_rate,
        "claim_statuses": claim_statuses,
        "avg_time_to_claim_hrs": avg_time,
        "temperature_distribution": temp_dist,
        "daily_claims": daily_claims,
        "is_active": offer.get("is_active", False),
    }


async def brand_performance(brand_id: str, days: int = 30) -> dict:
    """Aggregate performance across all offers for a brand."""
    brand = await brands_col.find_one({"brand_id": brand_id})
    if not brand:
        return {"status": "error", "message": "Brand not found"}

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    offers_cursor = offers_col.find({"brand_id": brand_id})
    offer_ids = [o["offer_id"] async for o in offers_cursor]

    total_claims = await claims_col.count_documents({"brand_id": brand_id, "claimed_at": {"$gte": cutoff}})
    matched_leads = await leads_col.count_documents({"matched_brands": brand_id, "created_at": {"$gte": cutoff}})
    converted = await leads_col.count_documents({"matched_brands": brand_id, "status": "converted", "created_at": {"$gte": cutoff}})

    # Score distribution
    score_pipeline = [
        {"$match": {"matched_brands": brand_id, "created_at": {"$gte": cutoff}}},
        {"$bucket": {
            "groupBy": "$score",
            "boundaries": [0, 25, 45, 70, 101],
            "default": "other",
            "output": {"count": {"$sum": 1}},
        }},
    ]
    score_dist: dict[str, int] = {}
    async for doc in leads_col.aggregate(score_pipeline):
        label = {0: "low (0-24)", 25: "cold (25-44)", 45: "warm (45-69)", 70: "hot (70-100)"}.get(doc["_id"], "other")
        score_dist[label] = doc["count"]

    # Top performing offers
    offer_perf_pipeline = [
        {"$match": {"brand_id": brand_id, "claimed_at": {"$gte": cutoff}}},
        {"$group": {"_id": "$offer_id", "claims": {"$sum": 1}}},
        {"$sort": {"claims": -1}},
        {"$limit": 5},
    ]
    top_offers = []
    async for doc in claims_col.aggregate(offer_perf_pipeline):
        offer = await offers_col.find_one({"offer_id": doc["_id"]})
        top_offers.append({
            "offer_id": doc["_id"],
            "title": offer["title"] if offer else "Unknown",
            "claims": doc["claims"],
        })

    return {
        "brand_id": brand_id,
        "brand_name": brand.get("name"),
        "window_days": days,
        "total_offers": len(offer_ids),
        "matched_leads": matched_leads,
        "total_claims": total_claims,
        "converted": converted,
        "conversion_rate": round(converted / matched_leads * 100, 1) if matched_leads else 0,
        "score_distribution": score_dist,
        "top_offers": top_offers,
    }


async def offer_comparison(offer_ids: list[str]) -> list[dict]:
    """Side-by-side comparison of multiple offers."""
    results = []
    for oid in offer_ids[:10]:
        perf = await offer_performance(oid)
        if perf.get("status") != "error":
            results.append({
                "offer_id": oid,
                "title": perf.get("title"),
                "total_claims": perf["total_claims"],
                "fill_rate_pct": perf["fill_rate_pct"],
                "avg_time_to_claim_hrs": perf.get("avg_time_to_claim_hrs"),
            })
    return results


async def daily_snapshot(brand_id: Optional[str] = None) -> dict:
    """Generate a daily snapshot for the analytics dashboard."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)

    match: dict[str, Any] = {}
    if brand_id:
        match["brand_id"] = brand_id

    # Today's claims
    today_claims = await claims_col.count_documents({**match, "claimed_at": {"$gte": today_start}})
    yesterday_claims = await claims_col.count_documents({**match, "claimed_at": {"$gte": yesterday_start, "$lt": today_start}})

    lead_match = {"matched_brands": brand_id} if brand_id else {}
    today_leads = await leads_col.count_documents({**lead_match, "created_at": {"$gte": today_start}})
    yesterday_leads = await leads_col.count_documents({**lead_match, "created_at": {"$gte": yesterday_start, "$lt": today_start}})

    def _delta(today: int, yesterday: int) -> str:
        if yesterday == 0:
            return "+100%" if today > 0 else "0%"
        pct = round((today - yesterday) / yesterday * 100, 1)
        return f"+{pct}%" if pct >= 0 else f"{pct}%"

    return {
        "date": today_start.strftime("%Y-%m-%d"),
        "leads_today": today_leads,
        "leads_delta": _delta(today_leads, yesterday_leads),
        "claims_today": today_claims,
        "claims_delta": _delta(today_claims, yesterday_claims),
    }
