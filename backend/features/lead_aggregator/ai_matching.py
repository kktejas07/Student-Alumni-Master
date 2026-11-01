"""LA4 — Claude AI Lead-Brand Matching Engine.

Semantic lead-brand matching using Claude claude-sonnet-5-5 for understanding
lead profiles against brand requirements. Falls back to heuristic scoring
on API failure.

Features:
  - Structured prompt: lead profile → brand requirements → confidence + explanation
  - 24h caching for identical lead-profile + brand-requirement pairs
  - Batch mode for bot runs (up to 1,000 leads per run)
  - Cost tracking per brand/month
  - Graceful degradation to heuristic scoring
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from db import db
from .scoring import compute_lead_score

logger = logging.getLogger(__name__)

_CACHE_TTL_HOURS = 24
_BATCH_SIZE = 50  # leads per Claude API call in batch mode
_MODEL = "claude-sonnet-5-5"

ai_match_cache = db.la_ai_match_cache
ai_cost_log = db.la_ai_cost_log


def _cache_key(lead_profile: dict, brand_requirements: dict) -> str:
    """Deterministic cache key from lead + brand data."""
    canonical = json.dumps(
        {"lead": lead_profile, "brand": brand_requirements},
        sort_keys=True, default=str,
    )
    return hashlib.sha256(canonical.encode()).hexdigest()


async def _get_cached(cache_key: str) -> Optional[dict]:
    """Check 24h cache for a previous match result."""
    doc = await ai_match_cache.find_one({"cache_key": cache_key})
    if not doc:
        return None
    expires = doc.get("expires_at")
    if expires:
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires:
            await ai_match_cache.delete_one({"cache_key": cache_key})
            return None
    return doc.get("result")


async def _set_cache(cache_key: str, result: dict) -> None:
    now = datetime.now(timezone.utc)
    await ai_match_cache.update_one(
        {"cache_key": cache_key},
        {"$set": {
            "cache_key": cache_key,
            "result": result,
            "created_at": now,
            "expires_at": now + timedelta(hours=_CACHE_TTL_HOURS),
        }},
        upsert=True,
    )


def _build_prompt(lead: dict, brand: dict) -> str:
    """Build the structured matching prompt."""
    lead_profile = {
        "name": lead.get("full_name"),
        "age": lead.get("age"),
        "city": lead.get("city"),
        "state": lead.get("state"),
        "education": lead.get("education_level"),
        "institution": lead.get("institution"),
        "skills": lead.get("skills", []),
        "interests": lead.get("interests", []),
        "domain": lead.get("domain"),
    }

    brand_req = {
        "name": brand.get("name"),
        "domain": brand.get("domain"),
        "target_age_range": f"{brand.get('target_age_min', 16)}-{brand.get('target_age_max', 30)}",
        "target_cities": brand.get("target_cities", []),
        "target_skills": brand.get("target_skills", []),
        "target_education": brand.get("target_education_levels", []),
        "tier": brand.get("tier"),
    }

    return f"""You are a lead-brand matching engine for a student career platform.

Analyze how well this lead matches the brand's target audience.

LEAD PROFILE:
{json.dumps(lead_profile, indent=2)}

BRAND REQUIREMENTS:
{json.dumps(brand_req, indent=2)}

Respond with ONLY valid JSON (no markdown, no code fences):
{{
  "confidence": <0-100 integer>,
  "explanation": "<1-2 sentence natural language explanation>",
  "key_matches": ["<matching factor 1>", "<matching factor 2>"],
  "key_gaps": ["<gap 1>", "<gap 2>"],
  "recommendation": "strong_match" | "good_match" | "weak_match" | "no_match"
}}"""


async def match_lead_to_brand(lead: dict, brand: dict) -> dict:
    """Score a lead against a brand using Claude AI with heuristic fallback.

    Returns:
      {
        "confidence": int (0-100),
        "explanation": str,
        "key_matches": list[str],
        "key_gaps": list[str],
        "recommendation": str,
        "source": "ai" | "heuristic",
      }
    """
    lead_slim = {k: lead.get(k) for k in
                 ("full_name", "age", "city", "state", "education_level",
                  "institution", "skills", "interests", "domain")}
    brand_slim = {k: brand.get(k) for k in
                  ("name", "domain", "target_age_min", "target_age_max",
                   "target_cities", "target_skills", "target_education_levels", "tier")}

    ck = _cache_key(lead_slim, brand_slim)

    # Check cache
    cached = await _get_cached(ck)
    if cached:
        cached["source"] = "ai_cached"
        return cached

    # Try Claude API
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return _fallback_heuristic(lead, brand)

    try:
        import httpx

        prompt = _build_prompt(lead, brand)
        now = datetime.now(timezone.utc)

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": _MODEL,
                    "max_tokens": 300,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )

        if resp.status_code != 200:
            logger.warning("[LA-AI] Claude API %s: %s", resp.status_code, resp.text[:200])
            return _fallback_heuristic(lead, brand)

        data = resp.json()
        text = data.get("content", [{}])[0].get("text", "")

        # Track cost
        usage = data.get("usage", {})
        input_tokens = usage.get("input_tokens", 0)
        output_tokens = usage.get("output_tokens", 0)
        await ai_cost_log.insert_one({
            "brand_id": brand.get("brand_id"),
            "lead_id": lead.get("lead_id"),
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "model": _MODEL,
            "timestamp": now,
            "month": now.strftime("%Y-%m"),
        })

        result = json.loads(text)
        result["source"] = "ai"

        # Cache
        await _set_cache(ck, result)

        return result

    except json.JSONDecodeError:
        logger.warning("[LA-AI] Failed to parse Claude response")
        return _fallback_heuristic(lead, brand)
    except Exception as e:
        logger.warning("[LA-AI] Claude API error: %s", e)
        return _fallback_heuristic(lead, brand)


def _fallback_heuristic(lead: dict, brand: dict) -> dict:
    """Fallback to the existing heuristic scoring engine."""
    score, breakdown, temp = compute_lead_score(lead, brand)

    if score >= 70:
        rec = "strong_match"
    elif score >= 45:
        rec = "good_match"
    elif score >= 25:
        rec = "weak_match"
    else:
        rec = "no_match"

    matches = [k for k, v in breakdown.items() if v > 0]
    gaps = [k for k, v in breakdown.items() if v == 0]

    return {
        "confidence": score,
        "explanation": f"Heuristic score {score}/100 ({temp}). Key factors: {', '.join(matches[:3])}.",
        "key_matches": matches,
        "key_gaps": gaps,
        "recommendation": rec,
        "source": "heuristic",
    }


async def batch_match(leads: list[dict], brands: list[dict]) -> list[dict]:
    """Batch match leads against brands for the 6h bot run.

    Returns list of {lead_id, brand_id, confidence, recommendation, source}.
    """
    results = []
    for lead in leads:
        for brand in brands:
            match = await match_lead_to_brand(lead, brand)
            results.append({
                "lead_id": lead.get("lead_id"),
                "brand_id": brand.get("brand_id"),
                **match,
            })
    return results


async def get_cost_summary(brand_id: Optional[str] = None, month: Optional[str] = None) -> dict:
    """API cost tracking per brand/month."""
    now = datetime.now(timezone.utc)
    target_month = month or now.strftime("%Y-%m")

    query: dict[str, Any] = {"month": target_month}
    if brand_id:
        query["brand_id"] = brand_id

    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": "$brand_id",
            "total_input_tokens": {"$sum": "$input_tokens"},
            "total_output_tokens": {"$sum": "$output_tokens"},
            "api_calls": {"$sum": 1},
        }},
    ]

    brands_cost: list[dict] = []
    async for doc in ai_cost_log.aggregate(pipeline):
        # Approximate cost (Sonnet pricing)
        input_cost = doc["total_input_tokens"] * 3.0 / 1_000_000
        output_cost = doc["total_output_tokens"] * 15.0 / 1_000_000
        brands_cost.append({
            "brand_id": doc["_id"],
            "api_calls": doc["api_calls"],
            "total_input_tokens": doc["total_input_tokens"],
            "total_output_tokens": doc["total_output_tokens"],
            "estimated_cost_usd": round(input_cost + output_cost, 4),
        })

    return {"month": target_month, "brands": brands_cost}
