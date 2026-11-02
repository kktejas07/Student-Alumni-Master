"""LA9 — A/B Testing Framework for Offers.

Variant assignment, conversion tracking, statistical significance testing.
"""
from __future__ import annotations

import math
import secrets
import logging
from datetime import datetime, timezone
from typing import Any, Optional

from db import db

logger = logging.getLogger(__name__)

experiments_col = db.la_ab_experiments
assignments_col = db.la_ab_assignments


async def create_experiment(
    offer_id: str,
    brand_id: str,
    name: str,
    variants: list[dict],
    traffic_pct: float = 100.0,
) -> dict:
    exp_id = f"EXP-{secrets.token_hex(6)}"
    now = datetime.now(timezone.utc)

    for i, v in enumerate(variants):
        v.setdefault("variant_id", f"V{i}")
        v.setdefault("weight", 1.0 / len(variants))
        v["impressions"] = 0
        v["conversions"] = 0

    doc = {
        "experiment_id": exp_id,
        "offer_id": offer_id,
        "brand_id": brand_id,
        "name": name,
        "variants": variants,
        "traffic_pct": traffic_pct,
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }
    await experiments_col.insert_one(doc)
    return {"status": "ok", "experiment_id": exp_id}


async def assign_variant(experiment_id: str, lead_id: str) -> dict:
    exp = await experiments_col.find_one({"experiment_id": experiment_id, "status": "active"})
    if not exp:
        return {"status": "error", "message": "Experiment not found or inactive"}

    existing = await assignments_col.find_one({"experiment_id": experiment_id, "lead_id": lead_id})
    if existing:
        return {"variant_id": existing["variant_id"], "cached": True}

    # Weighted random assignment
    variants = exp["variants"]
    r = secrets.randbelow(10000) / 10000.0
    cumulative = 0.0
    chosen = variants[0]
    for v in variants:
        cumulative += v["weight"]
        if r <= cumulative:
            chosen = v
            break

    await assignments_col.insert_one({
        "experiment_id": experiment_id,
        "lead_id": lead_id,
        "variant_id": chosen["variant_id"],
        "assigned_at": datetime.now(timezone.utc),
        "converted": False,
    })

    await experiments_col.update_one(
        {"experiment_id": experiment_id, "variants.variant_id": chosen["variant_id"]},
        {"$inc": {"variants.$.impressions": 1}},
    )

    return {"variant_id": chosen["variant_id"], "cached": False}


async def record_conversion(experiment_id: str, lead_id: str) -> dict:
    assignment = await assignments_col.find_one({"experiment_id": experiment_id, "lead_id": lead_id})
    if not assignment:
        return {"status": "error", "message": "No assignment found"}
    if assignment.get("converted"):
        return {"status": "already_converted"}

    await assignments_col.update_one(
        {"experiment_id": experiment_id, "lead_id": lead_id},
        {"$set": {"converted": True, "converted_at": datetime.now(timezone.utc)}},
    )
    await experiments_col.update_one(
        {"experiment_id": experiment_id, "variants.variant_id": assignment["variant_id"]},
        {"$inc": {"variants.$.conversions": 1}},
    )
    return {"status": "ok", "variant_id": assignment["variant_id"]}


def _z_test_significance(impressions_a: int, conv_a: int, impressions_b: int, conv_b: int) -> dict:
    """Two-proportion z-test for A/B significance."""
    if impressions_a < 30 or impressions_b < 30:
        return {"significant": False, "reason": "insufficient_sample", "p_value": None}

    p_a = conv_a / impressions_a
    p_b = conv_b / impressions_b
    p_pool = (conv_a + conv_b) / (impressions_a + impressions_b)
    se = math.sqrt(p_pool * (1 - p_pool) * (1 / impressions_a + 1 / impressions_b))

    if se == 0:
        return {"significant": False, "reason": "zero_variance", "p_value": None}

    z = (p_b - p_a) / se

    # Approximate p-value from z-score (two-tailed)
    p_value = 2 * (1 - _normal_cdf(abs(z)))

    return {
        "significant": p_value < 0.05,
        "z_score": round(z, 4),
        "p_value": round(p_value, 6),
        "lift_pct": round((p_b - p_a) / p_a * 100, 2) if p_a > 0 else 0,
        "confidence": round((1 - p_value) * 100, 1),
    }


def _normal_cdf(x: float) -> float:
    """Approximation of the standard normal CDF."""
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))


async def get_experiment_results(experiment_id: str) -> dict:
    exp = await experiments_col.find_one({"experiment_id": experiment_id})
    if not exp:
        return {"status": "error", "message": "Experiment not found"}

    variants = exp["variants"]
    results = []
    for v in variants:
        imp = v.get("impressions", 0)
        conv = v.get("conversions", 0)
        results.append({
            "variant_id": v["variant_id"],
            "impressions": imp,
            "conversions": conv,
            "conversion_rate": round(conv / imp * 100, 2) if imp > 0 else 0,
            **v,
        })

    significance = None
    if len(variants) >= 2:
        a, b = variants[0], variants[1]
        significance = _z_test_significance(
            a.get("impressions", 0), a.get("conversions", 0),
            b.get("impressions", 0), b.get("conversions", 0),
        )

    return {
        "experiment_id": experiment_id,
        "name": exp["name"],
        "status": exp["status"],
        "variants": results,
        "significance": significance,
    }


async def stop_experiment(experiment_id: str, winner_variant: Optional[str] = None) -> dict:
    await experiments_col.update_one(
        {"experiment_id": experiment_id},
        {"$set": {
            "status": "completed",
            "winner": winner_variant,
            "completed_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }},
    )
    return {"status": "ok", "winner": winner_variant}
