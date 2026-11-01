"""LA12 — Smart Pricing Agent.

Dynamic lead pricing based on domain, temperature, profile completeness,
and supply/demand. Revenue tracking per brand.
"""
from __future__ import annotations

import secrets
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from db import db
from .database import leads_col, brands_col, offers_col

logger = logging.getLogger(__name__)

pricing_tiers_col = db.la_pricing_tiers
pricing_log_col = db.la_pricing_log

# Base prices per temperature (INR)
_BASE_PRICES = {
    "hot": 500,
    "warm": 250,
    "cold": 100,
    "low": 25,
}

# Domain multipliers
_DOMAIN_MULTIPLIERS = {
    "technology": 1.5, "finance": 1.8, "banking": 1.7,
    "consulting": 1.6, "insurance": 1.4, "automotive": 1.3,
    "medical": 1.5, "pharma": 1.4, "real_estate": 1.5,
    "education": 1.0, "ecommerce": 1.1, "retail": 1.0,
    "food_beverage": 0.9, "fitness": 0.9, "entertainment": 0.8,
    "nonprofit": 0.6, "government": 0.7,
}


def calculate_lead_price(
    temperature: str,
    domain: str = "",
    profile_completeness: float = 0.0,
    phone_verified: bool = False,
    score: int = 0,
) -> dict:
    """Calculate the price for a lead based on quality signals."""
    base = _BASE_PRICES.get(temperature, 50)
    domain_mult = _DOMAIN_MULTIPLIERS.get(domain, 1.0)

    # Profile completeness bonus (0-50% markup)
    completeness_mult = 1.0 + (profile_completeness * 0.5)

    # Phone verification bonus (20% markup)
    verified_mult = 1.2 if phone_verified else 1.0

    # High-score bonus (score > 80 gets 30% markup)
    score_mult = 1.3 if score >= 80 else (1.15 if score >= 60 else 1.0)

    price = base * domain_mult * completeness_mult * verified_mult * score_mult
    price = round(price, 2)

    return {
        "price_inr": price,
        "base_price": base,
        "temperature": temperature,
        "multipliers": {
            "domain": round(domain_mult, 2),
            "completeness": round(completeness_mult, 2),
            "verified": round(verified_mult, 2),
            "score": round(score_mult, 2),
        },
    }


async def price_lead(lead: dict) -> dict:
    """Price a lead and log it."""
    pricing = calculate_lead_price(
        temperature=lead.get("temperature", "cold"),
        domain=lead.get("domain", ""),
        profile_completeness=lead.get("profile_completeness", 0),
        phone_verified=lead.get("phone_verified", False),
        score=lead.get("score", 0),
    )

    log_id = f"PRC-{secrets.token_hex(6)}"
    await pricing_log_col.insert_one({
        "log_id": log_id,
        "lead_id": lead.get("lead_id"),
        "brand_id": lead.get("matched_brands", [None])[0],
        "price_inr": pricing["price_inr"],
        "temperature": lead.get("temperature"),
        "domain": lead.get("domain"),
        "score": lead.get("score"),
        "created_at": datetime.now(timezone.utc),
    })

    return pricing


async def set_custom_tier(domain: str, temperature: str, price_inr: float) -> dict:
    await pricing_tiers_col.update_one(
        {"domain": domain, "temperature": temperature},
        {"$set": {
            "domain": domain,
            "temperature": temperature,
            "price_inr": price_inr,
            "updated_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    return {"status": "ok"}


async def revenue_summary(brand_id: Optional[str] = None, days: int = 30) -> dict:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    match: dict[str, Any] = {"created_at": {"$gte": cutoff}}
    if brand_id:
        match["brand_id"] = brand_id

    pipeline = [
        {"$match": match},
        {"$group": {
            "_id": "$brand_id",
            "total_revenue": {"$sum": "$price_inr"},
            "lead_count": {"$sum": 1},
            "avg_price": {"$avg": "$price_inr"},
        }},
        {"$sort": {"total_revenue": -1}},
    ]

    brands = []
    total = 0
    async for doc in pricing_log_col.aggregate(pipeline):
        brands.append({
            "brand_id": doc["_id"],
            "total_revenue_inr": round(doc["total_revenue"], 2),
            "lead_count": doc["lead_count"],
            "avg_price_inr": round(doc["avg_price"], 2),
        })
        total += doc["total_revenue"]

    return {
        "window_days": days,
        "total_revenue_inr": round(total, 2),
        "brands": brands,
    }


async def pricing_breakdown_by_domain(days: int = 30) -> list[dict]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    pipeline = [
        {"$match": {"created_at": {"$gte": cutoff}}},
        {"$group": {
            "_id": {"domain": "$domain", "temperature": "$temperature"},
            "count": {"$sum": 1},
            "total": {"$sum": "$price_inr"},
            "avg": {"$avg": "$price_inr"},
        }},
        {"$sort": {"total": -1}},
    ]

    results = []
    async for doc in pricing_log_col.aggregate(pipeline):
        results.append({
            "domain": doc["_id"]["domain"],
            "temperature": doc["_id"]["temperature"],
            "lead_count": doc["count"],
            "total_inr": round(doc["total"], 2),
            "avg_price_inr": round(doc["avg"], 2),
        })
    return results
