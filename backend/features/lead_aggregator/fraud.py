"""LA11 — Fraud Detection Agent.

Behavioral analysis: velocity checks, device fingerprinting,
geo-anomaly detection, and risk scoring.
"""
from __future__ import annotations

import secrets
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from db import db
from .database import leads_col, claims_col

logger = logging.getLogger(__name__)

fraud_signals_col = db.la_fraud_signals
fraud_rules_col = db.la_fraud_rules

# Risk thresholds
_HIGH_RISK_SCORE = 70
_MEDIUM_RISK_SCORE = 40


async def analyze_lead(lead: dict, ip_address: str = "", user_agent: str = "") -> dict:
    """Run all fraud checks on a lead and return a risk assessment."""
    signals: list[dict] = []
    risk_score = 0
    now = datetime.now(timezone.utc)
    phone = lead.get("phone", "")

    # 1. Velocity check — too many leads from same phone in 24h
    day_ago = now - timedelta(hours=24)
    phone_count = await leads_col.count_documents({"phone": phone, "created_at": {"$gte": day_ago}})
    if phone_count >= 5:
        risk_score += 30
        signals.append({"rule": "phone_velocity", "detail": f"{phone_count} leads in 24h", "severity": "high"})
    elif phone_count >= 3:
        risk_score += 15
        signals.append({"rule": "phone_velocity", "detail": f"{phone_count} leads in 24h", "severity": "medium"})

    # 2. Email pattern check — disposable email domains
    email = lead.get("email", "")
    disposable_domains = {
        "tempmail.com", "throwaway.email", "guerrillamail.com", "mailinator.com",
        "yopmail.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
        "dispostable.com", "10minutemail.com", "trashmail.com", "fakeinbox.com",
    }
    if email and "@" in email:
        domain = email.rsplit("@", 1)[1].lower()
        if domain in disposable_domains:
            risk_score += 25
            signals.append({"rule": "disposable_email", "detail": domain, "severity": "high"})

    # 3. IP velocity — same IP, different leads
    if ip_address:
        ip_count = await leads_col.count_documents({
            "source_ip": ip_address,
            "created_at": {"$gte": day_ago},
            "phone": {"$ne": phone},
        })
        if ip_count >= 10:
            risk_score += 25
            signals.append({"rule": "ip_velocity", "detail": f"{ip_count} unique leads from same IP", "severity": "high"})
        elif ip_count >= 5:
            risk_score += 10
            signals.append({"rule": "ip_velocity", "detail": f"{ip_count} unique leads from same IP", "severity": "medium"})

    # 4. Incomplete profile (bot indicator)
    fields = ["full_name", "email", "phone", "age", "city"]
    filled = sum(1 for f in fields if lead.get(f))
    if filled <= 2:
        risk_score += 15
        signals.append({"rule": "incomplete_profile", "detail": f"Only {filled}/5 basic fields", "severity": "medium"})

    # 5. Serial claimer check
    week_ago = now - timedelta(days=7)
    claim_count = await claims_col.count_documents({"phone": phone, "claimed_at": {"$gte": week_ago}})
    if claim_count >= 10:
        risk_score += 30
        signals.append({"rule": "serial_claimer", "detail": f"{claim_count} claims in 7 days", "severity": "high"})
    elif claim_count >= 5:
        risk_score += 15
        signals.append({"rule": "serial_claimer", "detail": f"{claim_count} claims in 7 days", "severity": "medium"})

    # 6. Name pattern check (gibberish detection)
    name = lead.get("full_name", "")
    if name and len(name) <= 2:
        risk_score += 10
        signals.append({"rule": "short_name", "detail": f"Name '{name}' too short", "severity": "low"})
    elif name:
        vowels = sum(1 for c in name.lower() if c in "aeiou")
        if len(name) > 5 and vowels == 0:
            risk_score += 15
            signals.append({"rule": "name_gibberish", "detail": "No vowels in name", "severity": "medium"})

    risk_score = min(risk_score, 100)
    if risk_score >= _HIGH_RISK_SCORE:
        risk_level = "high"
    elif risk_score >= _MEDIUM_RISK_SCORE:
        risk_level = "medium"
    else:
        risk_level = "low"

    signal_id = f"FRD-{secrets.token_hex(6)}"
    signal_doc = {
        "signal_id": signal_id,
        "lead_id": lead.get("lead_id"),
        "phone": phone,
        "email": email,
        "ip_address": ip_address,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "signals": signals,
        "action": "block" if risk_level == "high" else ("review" if risk_level == "medium" else "allow"),
        "created_at": now,
    }
    await fraud_signals_col.insert_one(signal_doc)

    return {
        "signal_id": signal_id,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "signals": signals,
        "action": signal_doc["action"],
    }


async def get_risk_summary(days: int = 7) -> dict:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    pipeline = [
        {"$match": {"created_at": {"$gte": cutoff}}},
        {"$group": {
            "_id": "$risk_level",
            "count": {"$sum": 1},
            "avg_score": {"$avg": "$risk_score"},
        }},
    ]

    summary: dict[str, Any] = {"high": 0, "medium": 0, "low": 0}
    async for doc in fraud_signals_col.aggregate(pipeline):
        summary[doc["_id"]] = {"count": doc["count"], "avg_score": round(doc["avg_score"], 1)}

    # Top fraud rules triggered
    rule_pipeline = [
        {"$match": {"created_at": {"$gte": cutoff}}},
        {"$unwind": "$signals"},
        {"$group": {"_id": "$signals.rule", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    top_rules = []
    async for doc in fraud_signals_col.aggregate(rule_pipeline):
        top_rules.append({"rule": doc["_id"], "count": doc["count"]})

    blocked = await fraud_signals_col.count_documents({"action": "block", "created_at": {"$gte": cutoff}})

    return {
        "window_days": days,
        "risk_distribution": summary,
        "top_rules": top_rules,
        "blocked_count": blocked,
    }


async def get_lead_risk(lead_id: str) -> Optional[dict]:
    doc = await fraud_signals_col.find_one({"lead_id": lead_id}, sort=[("created_at", -1)])
    if doc:
        doc["_id"] = str(doc["_id"])
    return doc
