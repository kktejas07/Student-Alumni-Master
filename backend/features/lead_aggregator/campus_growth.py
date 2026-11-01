"""LA13 — Campus Network Growth Agent.

Track campus-level lead generation, ambassador performance,
institution ranking, and growth targets.
"""
from __future__ import annotations

import secrets
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from db import db
from .database import leads_col, campus_col, referrals_col

logger = logging.getLogger(__name__)

campus_growth_col = db.la_campus_growth
campus_targets_col = db.la_campus_targets


async def compute_campus_stats(institution: str) -> dict:
    """Compute lead generation stats for a specific campus."""
    total_leads = await leads_col.count_documents({"institution": {"$regex": institution, "$options": "i"}})
    now = datetime.now(timezone.utc)
    month_ago = now - timedelta(days=30)
    week_ago = now - timedelta(days=7)

    leads_this_month = await leads_col.count_documents({
        "institution": {"$regex": institution, "$options": "i"},
        "created_at": {"$gte": month_ago},
    })
    leads_this_week = await leads_col.count_documents({
        "institution": {"$regex": institution, "$options": "i"},
        "created_at": {"$gte": week_ago},
    })

    # Temperature distribution
    temp_pipeline = [
        {"$match": {"institution": {"$regex": institution, "$options": "i"}}},
        {"$group": {"_id": "$temperature", "count": {"$sum": 1}}},
    ]
    temp_dist: dict[str, int] = {}
    async for doc in leads_col.aggregate(temp_pipeline):
        temp_dist[doc["_id"]] = doc["count"]

    # Conversion rate
    converted = await leads_col.count_documents({
        "institution": {"$regex": institution, "$options": "i"},
        "status": "converted",
    })
    conversion_rate = round(converted / total_leads * 100, 1) if total_leads else 0

    # Average score
    score_pipeline = [
        {"$match": {"institution": {"$regex": institution, "$options": "i"}}},
        {"$group": {"_id": None, "avg": {"$avg": "$score"}}},
    ]
    avg_score = 0
    async for doc in leads_col.aggregate(score_pipeline):
        avg_score = round(doc["avg"] or 0, 1)

    # Campus ambassadors
    ambassadors = await campus_col.count_documents({
        "institution": {"$regex": institution, "$options": "i"},
    })

    return {
        "institution": institution,
        "total_leads": total_leads,
        "leads_this_month": leads_this_month,
        "leads_this_week": leads_this_week,
        "temperature_distribution": temp_dist,
        "conversion_rate": conversion_rate,
        "avg_score": avg_score,
        "ambassadors": ambassadors,
        "converted": converted,
    }


async def institution_ranking(limit: int = 20) -> list[dict]:
    """Rank institutions by lead generation volume and quality."""
    pipeline = [
        {"$match": {"institution": {"$ne": None}}},
        {"$group": {
            "_id": "$institution",
            "total_leads": {"$sum": 1},
            "avg_score": {"$avg": "$score"},
            "converted": {"$sum": {"$cond": [{"$eq": ["$status", "converted"]}, 1, 0]}},
            "hot_leads": {"$sum": {"$cond": [{"$eq": ["$temperature", "hot"]}, 1, 0]}},
        }},
        {"$addFields": {
            "conversion_rate": {
                "$cond": [{"$gt": ["$total_leads", 0]},
                          {"$round": [{"$multiply": [{"$divide": ["$converted", "$total_leads"]}, 100]}, 1]},
                          0]
            },
            "quality_score": {
                "$round": [{"$add": [
                    {"$multiply": ["$avg_score", 0.4]},
                    {"$multiply": [
                        {"$cond": [{"$gt": ["$total_leads", 0]},
                                   {"$divide": ["$converted", "$total_leads"]},
                                   0]},
                        60,
                    ]},
                ]}, 1],
            },
        }},
        {"$sort": {"quality_score": -1}},
        {"$limit": limit},
    ]

    results = []
    rank = 1
    async for doc in leads_col.aggregate(pipeline):
        results.append({
            "rank": rank,
            "institution": doc["_id"],
            "total_leads": doc["total_leads"],
            "hot_leads": doc["hot_leads"],
            "converted": doc["converted"],
            "conversion_rate": doc["conversion_rate"],
            "avg_score": round(doc["avg_score"] or 0, 1),
            "quality_score": doc["quality_score"],
        })
        rank += 1
    return results


async def ambassador_leaderboard(limit: int = 20) -> list[dict]:
    """Rank campus ambassadors by leads generated via referral codes."""
    pipeline = [
        {"$group": {
            "_id": "$referrer_code",
            "leads_referred": {"$sum": 1},
            "statuses": {"$push": "$status"},
        }},
        {"$sort": {"leads_referred": -1}},
        {"$limit": limit},
    ]

    results = []
    rank = 1
    async for doc in referrals_col.aggregate(pipeline):
        code = doc["_id"]
        contact = await campus_col.find_one({"referral_code": code})
        results.append({
            "rank": rank,
            "referral_code": code,
            "ambassador_name": contact["name"] if contact else "Unknown",
            "institution": contact["institution"] if contact else "Unknown",
            "leads_referred": doc["leads_referred"],
        })
        rank += 1
    return results


async def set_growth_target(institution: str, monthly_target: int, quarter: str) -> dict:
    await campus_targets_col.update_one(
        {"institution": institution, "quarter": quarter},
        {"$set": {
            "institution": institution,
            "monthly_target": monthly_target,
            "quarter": quarter,
            "updated_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    return {"status": "ok"}


async def growth_tracker() -> list[dict]:
    """Compare actual vs. target for all institutions with targets."""
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    quarter = f"Q{(now.month - 1) // 3 + 1}-{now.year}"

    targets_cursor = campus_targets_col.find({"quarter": quarter})
    results = []

    async for target in targets_cursor:
        institution = target["institution"]
        actual = await leads_col.count_documents({
            "institution": {"$regex": institution, "$options": "i"},
            "created_at": {"$gte": month_start},
        })
        monthly_target = target["monthly_target"]
        pct = round(actual / monthly_target * 100, 1) if monthly_target else 0

        results.append({
            "institution": institution,
            "monthly_target": monthly_target,
            "actual_this_month": actual,
            "progress_pct": pct,
            "on_track": pct >= (now.day / 30 * 100),
        })

    return results
