"""Enhancement #8 — Lead Assignment Rules.

Auto-assign leads to brand sales reps based on city, domain, score,
and temperature conditions with weighted round-robin distribution.
"""
from __future__ import annotations

import logging
import secrets
from datetime import datetime, timezone
from typing import Any, Optional

from db import db
from .database import leads_col, brands_col
from .geo import resolve_city

logger = logging.getLogger(__name__)

assignment_rules_col = db.la_assignment_rules
lead_assignments_col = db.la_lead_assignments

# Round-robin counters keyed by rule_id
_rr_counters: dict[str, int] = {}


def _gen_id(prefix: str = "ASR") -> str:
    return f"{prefix}-{secrets.token_hex(8)}"


async def create_rule(
    brand_id: str,
    rep_name: str,
    rep_email: str,
    conditions: dict[str, Any],
    weight: int = 1,
    rep_phone: Optional[str] = None,
) -> dict:
    rule_id = _gen_id("ASR")
    now = datetime.now(timezone.utc)

    doc = {
        "rule_id": rule_id,
        "brand_id": brand_id,
        "rep_name": rep_name,
        "rep_email": rep_email,
        "rep_phone": rep_phone,
        "conditions": {
            "cities": [c.lower() for c in conditions.get("cities", [])],
            "domains": [d.lower() for d in conditions.get("domains", [])],
            "min_score": conditions.get("min_score", 0),
            "temperatures": [t.lower() for t in conditions.get("temperatures", [])],
        },
        "weight": max(1, weight),
        "is_active": True,
        "assigned_count": 0,
        "created_at": now,
    }
    await assignment_rules_col.insert_one(doc)
    return {"status": "ok", "rule_id": rule_id}


def _rule_matches(rule: dict, lead: dict) -> bool:
    cond = rule.get("conditions", {})

    cities = cond.get("cities", [])
    if cities:
        lead_city = resolve_city(lead.get("city", ""))
        if lead_city not in cities and lead.get("city", "").lower() not in cities:
            return False

    domains = cond.get("domains", [])
    if domains:
        lead_domain = (lead.get("domain") or "").lower()
        if lead_domain not in domains:
            return False

    min_score = cond.get("min_score", 0)
    if min_score and lead.get("score", 0) < min_score:
        return False

    temperatures = cond.get("temperatures", [])
    if temperatures:
        lead_temp = (lead.get("temperature") or "").lower()
        if lead_temp not in temperatures:
            return False

    return True


async def evaluate_rules(lead: dict, brand_id: str) -> list[dict]:
    cursor = assignment_rules_col.find({"brand_id": brand_id, "is_active": True})
    matching: list[dict] = []
    async for rule in cursor:
        if _rule_matches(rule, lead):
            matching.append({
                "rule_id": rule["rule_id"],
                "rep_name": rule["rep_name"],
                "rep_email": rule["rep_email"],
                "rep_phone": rule.get("rep_phone"),
                "weight": rule.get("weight", 1),
                "assigned_count": rule.get("assigned_count", 0),
            })
    matching.sort(key=lambda r: (-r["weight"], r["assigned_count"]))
    return matching


async def auto_assign_lead(lead: dict) -> dict:
    assignments: list[dict] = []
    for brand_id in lead.get("matched_brands", []):
        reps = await evaluate_rules(lead, brand_id)
        if not reps:
            continue

        top_weight = reps[0]["weight"]
        candidates = [r for r in reps if r["weight"] == top_weight]

        rr_key = f"{brand_id}:{top_weight}"
        idx = _rr_counters.get(rr_key, 0) % len(candidates)
        _rr_counters[rr_key] = idx + 1

        chosen = candidates[idx]
        assignment_id = _gen_id("ASN")
        now = datetime.now(timezone.utc)

        await lead_assignments_col.insert_one({
            "assignment_id": assignment_id,
            "lead_id": lead["lead_id"],
            "brand_id": brand_id,
            "rule_id": chosen["rule_id"],
            "rep_name": chosen["rep_name"],
            "rep_email": chosen["rep_email"],
            "rep_phone": chosen.get("rep_phone"),
            "assigned_at": now,
            "status": "active",
        })

        await assignment_rules_col.update_one(
            {"rule_id": chosen["rule_id"]},
            {"$inc": {"assigned_count": 1}},
        )

        assignments.append({
            "brand_id": brand_id,
            "rep_name": chosen["rep_name"],
            "rep_email": chosen["rep_email"],
            "assignment_id": assignment_id,
        })

    return {"assignments": assignments, "count": len(assignments)}


async def get_assignments(lead_id: str) -> list[dict]:
    cursor = lead_assignments_col.find(
        {"lead_id": lead_id}, {"_id": 0}
    ).sort("assigned_at", -1)
    return await cursor.to_list(length=100)


async def reassign_lead(lead_id: str, brand_id: str, new_rep_email: str) -> dict:
    existing = await lead_assignments_col.find_one(
        {"lead_id": lead_id, "brand_id": brand_id, "status": "active"}
    )

    now = datetime.now(timezone.utc)

    if existing:
        await lead_assignments_col.update_one(
            {"assignment_id": existing["assignment_id"]},
            {"$set": {"status": "reassigned", "reassigned_at": now}},
        )

    rule = await assignment_rules_col.find_one(
        {"brand_id": brand_id, "rep_email": new_rep_email, "is_active": True}
    )

    assignment_id = _gen_id("ASN")
    await lead_assignments_col.insert_one({
        "assignment_id": assignment_id,
        "lead_id": lead_id,
        "brand_id": brand_id,
        "rule_id": rule["rule_id"] if rule else None,
        "rep_name": rule["rep_name"] if rule else new_rep_email.split("@")[0],
        "rep_email": new_rep_email,
        "rep_phone": rule.get("rep_phone") if rule else None,
        "assigned_at": now,
        "status": "active",
        "manual": True,
    })

    return {"status": "ok", "assignment_id": assignment_id, "rep_email": new_rep_email}


async def rep_workload(brand_id: str) -> list[dict]:
    pipeline = [
        {"$match": {"brand_id": brand_id, "status": "active"}},
        {"$group": {
            "_id": "$rep_email",
            "rep_name": {"$first": "$rep_name"},
            "active_leads": {"$sum": 1},
            "latest_assignment": {"$max": "$assigned_at"},
        }},
        {"$sort": {"active_leads": -1}},
        {"$project": {
            "rep_email": "$_id",
            "rep_name": 1,
            "active_leads": 1,
            "latest_assignment": 1,
            "_id": 0,
        }},
    ]
    results: list[dict] = []
    async for doc in lead_assignments_col.aggregate(pipeline):
        results.append(doc)
    return results


async def delete_rule(rule_id: str) -> dict:
    result = await assignment_rules_col.update_one(
        {"rule_id": rule_id},
        {"$set": {"is_active": False}},
    )
    if result.matched_count == 0:
        return {"status": "error", "message": "Rule not found"}
    return {"status": "ok", "deactivated": rule_id}


async def list_rules(brand_id: str) -> list[dict]:
    cursor = assignment_rules_col.find(
        {"brand_id": brand_id, "is_active": True}, {"_id": 0}
    ).sort("weight", -1)
    return await cursor.to_list(length=200)
