"""
talent_insights.py — TP27: weekly talent-pool insights (admin analytics).

All computation is Mongo aggregation over db.talent_pool — no external
dependencies. `generate_weekly_insights` compares the last 7 days against the
prior 7 and upserts ONE document per ISO week into db.talent_pool_insights,
so the admin dashboard can render trends without re-scanning the pool.

Stored insight doc:
    {_id, week_start: "YYYY-MM-DD" (ISO date of the window start),
     computed_at: datetime(UTC),
     payload: {
       source_effectiveness: [{source, imported, enriched_pct,
                               outreach_converted, avg_quality}],
       skill_trends: [{skill, this_week, last_week, delta_pct}] (top 15 by
                     this_week; delta_pct is None when last_week == 0),
       geo_distribution: [{location, count}] (top 10 by count),
       pipeline_velocity: [{interest_status, count, moved_this_week}],
       enrichment_coverage: {enriched_pct, has_github_pct, has_linkedin_pct},
       conversion_funnel: [{stage, count, marker}] (stages in the order
                           imported/enriched/matched/outreach_sent/reply;
                           a stage with no measurable data reports count 0
                           with marker None)
     }}

Conventions used by the aggregations:
- `is_active` docs only (soft-deactivated duplicates are excluded).
- Legacy ISO-string timestamps are normalized with $toDate so the 24h/7d
  window math works the same whether the router or an old agent wrote the
  doc (see talent_dedup.repair_timestamps for the in-place fix).
- "outreach_converted" = a profile whose interest_status has moved off the
  default "Interested" (i.e. it reacted to outreach), for that source.
- "moved_this_week" = interest_status bucket whose members had updated_at
  inside the current window.
- Skill trends count skill occurrences among profiles imported OR updated
  inside the window (deduped per profile by $unwind).

The scheduler runs this weekly; `agent_status` reports freshness so the
admin UI can show "stale" instead of silently trusting last week's numbers.
"""
from __future__ import annotations

from datetime import timedelta
from typing import Any, Dict, List, Optional

from services.agents.talent_common import agent_run_log, log_activity, now_utc

_AGENT = "TP27 Insights"
_ACTIVE = {"is_active": True}


def _add_dt_fields(fields: Dict[str, str]) -> List[Dict[str, Any]]:
    return [
        {"$addFields": {
            name: {"$toDate": f"${src}"}
            for name, src in fields.items()
        }}
    ]


def _in_window(dt_field: str, start, end) -> List[Dict[str, Any]]:
    return [
        {"$gte": [f"${dt_field}", start]},
        {"$lte": [f"${dt_field}", end]},
    ]


def _in_window_cond(dt_field: str, start, end) -> Dict[str, Any]:
    """Single-expression window predicate (usable inside $cond / $or)."""
    return {"$and": _in_window(dt_field, start, end)}


def _pct(part: int, total: int) -> Optional[float]:
    return round(part / total * 100, 1) if total else None


async def _source_effectiveness(db, week_start, now) -> List[Dict[str, Any]]:
    pipe = [
        {"$match": _ACTIVE},
        *_add_dt_fields({"_imp_dt": "imported_at", "_ls_dt": "last_synced_at"}),
        {"$addFields": {
            "_changed_interest": {
                "$and": [
                    {"$ne": [{"$toLower": {"$ifNull": ["$interest_status", ""]}}, ""]},
                    {"$ne": [{"$toLower": {"$ifNull": ["$interest_status", ""]}}, "interested"]},
                ]
            }
        }},
        {"$group": {
            "_id": {"$ifNull": [{"$toLower": {"$ifNull": ["$source", ""]}}, "unknown"]},
            "imported": {"$sum": {"$cond": [
                _in_window_cond("_imp_dt", week_start, now), 1, 0]}},
            "enriched": {"$sum": {"$cond": [
                {"$ne": ["$_ls_dt", None]}, 1, 0]}},
            "converted": {"$sum": {"$cond": [
                {"$eq": ["$_changed_interest", True]}, 1, 0]}},
            "total": {"$sum": 1},
            "avg_quality": {"$avg": "$quality_score"},
        }},
        {"$sort": {"total": -1}},
        {"$limit": 25},
    ]
    rows = await db.talent_pool.aggregate(pipe).to_list(25)
    return [
        {
            "source": r["_id"] or "unknown",
            "imported": r.get("imported", 0),
            "enriched_pct": _pct(r.get("enriched", 0), r.get("total", 0)),
            "outreach_converted": r.get("converted", 0),
            "avg_quality": round(r["avg_quality"], 1) if r.get("avg_quality") is not None else None,
        }
        for r in rows
    ]


async def _skill_counts_in_window(db, start, end) -> Dict[str, int]:
    pipe = [
        {"$match": _ACTIVE},
        *_add_dt_fields({"_imp_dt": "imported_at", "_upd_dt": "updated_at"}),
        {"$match": {"$or": [
            {"$and": _in_window("_imp_dt", start, end)},
            {"$and": _in_window("_upd_dt", start, end)},
        ]}},
        {"$unwind": "$skills"},
        {"$group": {"_id": {"$toUpper": "$skills"}, "n": {"$sum": 1}}},
        {"$sort": {"n": -1}},
        {"$limit": 150},
    ]
    rows = await db.talent_pool.aggregate(pipe).to_list(150)
    return {(r["_id"] or "?").strip(): r.get("n", 0) for r in rows if r.get("_id")}


async def _skill_trends(db, week_start, now) -> List[Dict[str, Any]]:
    # window = [week_start, now]; prior window = [week_start - 7d, week_start)
    prev_start = week_start - timedelta(days=7)
    this_map = await _skill_counts_in_window(db, week_start, now)
    last_map = await _skill_counts_in_window(db, prev_start, week_start)
    ranked = sorted(
        this_map.items(),
        key=lambda kv: (kv[1], kv[0]),
        reverse=True,
    )[:15]
    out: List[Dict[str, Any]] = []
    for skill, tw in ranked:
        lw = last_map.get(skill, 0)
        out.append({
            "skill": skill,
            "this_week": tw,
            "last_week": lw,
            "delta_pct": round((tw - lw) / lw * 100, 1) if lw else None,
        })
    return out


async def _geo_distribution(db) -> List[Dict[str, Any]]:
    pipe = [
        {"$match": {**_ACTIVE, "location": {"$ne": ""}}},
        {"$group": {"_id": "$location", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    rows = await db.talent_pool.aggregate(pipe).to_list(10)
    return [{"location": r["_id"], "count": r.get("count", 0)} for r in rows if r.get("_id")]


async def _pipeline_velocity(db, week_start, now) -> List[Dict[str, Any]]:
    pipe = [
        {"$match": _ACTIVE},
        *_add_dt_fields({"_upd_dt": "updated_at"}),
        {"$group": {
            "_id": {"$ifNull": [{"$toLower": {"$ifNull": ["$interest_status", ""]}}, "unspecified"]},
            "count": {"$sum": 1},
            "moved": {"$sum": {"$cond": [
                _in_window_cond("_upd_dt", week_start, now), 1, 0]}},
        }},
        {"$sort": {"count": -1}},
        {"$limit": 20},
    ]
    rows = await db.talent_pool.aggregate(pipe).to_list(20)
    return [
        {"interest_status": r["_id"], "count": r.get("count", 0),
         "moved_this_week": r.get("moved", 0)}
        for r in rows
    ]


async def _enrichment_coverage(db) -> Dict[str, Optional[float]]:
    pipe = [
        {"$match": _ACTIVE},
        {"$group": {
            "_id": None,
            "total": {"$sum": 1},
            "enriched": {"$sum": {"$cond": [
                {"$ne": [{"$toDate": "$last_synced_at"}, None]}, 1, 0]}},
            "github": {"$sum": {"$cond": [
                {"$ne": [{"$ifNull": ["$github_url", ""]}, ""]}, 1, 0]}},
            "linkedin": {"$sum": {"$cond": [
                {"$ne": [{"$ifNull": ["$linkedin_url", ""]}, ""]}, 1, 0]}},
        }},
    ]
    rows = await db.talent_pool.aggregate(pipe).to_list(1)
    if not rows:
        return {"enriched_pct": None, "has_github_pct": None, "has_linkedin_pct": None}
    r = rows[0]
    total = r.get("total", 0)
    return {
        "enriched_pct": _pct(r.get("enriched", 0), total),
        "has_github_pct": _pct(r.get("github", 0), total),
        "has_linkedin_pct": _pct(r.get("linkedin", 0), total),
    }


async def _conversion_funnel(db, week_start, now) -> List[Dict[str, Any]]:
    """Weekly funnel; stage order is fixed. `marker` is None on every stage —
    a stage with no measurable data reports count 0 (marker stays None), which
    the admin UI renders as "no data" rather than a real zero."""
    pipe = [
        {"$match": _ACTIVE},
        *_add_dt_fields({"_imp_dt": "imported_at", "_ls_dt": "last_synced_at", "_upd_dt": "updated_at"}),
        {"$group": {
            "_id": None,
            "imported": {"$sum": {"$cond": [
                _in_window_cond("_imp_dt", week_start, now), 1, 0]}},
            "enriched": {"$sum": {"$cond": [
                _in_window_cond("_ls_dt", week_start, now), 1, 0]}},
            "matched": {"$sum": {"$cond": [
                {"$and": [
                    _in_window_cond("_upd_dt", week_start, now),
                    {"$ne": [{"$ifNull": ["$match_score_pct", None]}, None]},
                ]}, 1, 0]}},
            "outreach_sent": {"$sum": {"$cond": [
                {"$and": [
                    _in_window_cond("_upd_dt", week_start, now),
                    {"$or": [
                        {"$eq": ["$outreach_sent", True]},
                        {"$ne": [{"$ifNull": ["$outreach_sent_at", None]}, None]},
                        {"$ne": [{"$ifNull": ["$last_outreach_at", None]}, None]},
                        {"$ne": [{"$ifNull": ["$last_outreach", None]}, None]},
                    ]},
                ]}, 1, 0]}},
            "reply": {"$sum": {"$cond": [
                {"$and": [
                    _in_window_cond("_upd_dt", week_start, now),
                    {"$or": [
                        {"$and": [
                            {"$ne": [{"$toLower": {"$ifNull": ["$interest_status", ""]}}, ""]},
                            {"$ne": [{"$toLower": {"$ifNull": ["$interest_status", ""]}}, "interested"]},
                        ]},
                        {"$eq": ["$replied", True]},
                        {"$ne": [{"$ifNull": ["$outreach_replied", None]}, None]},
                    ]},
                ]}, 1, 0]}},
        }},
    ]
    rows = await db.talent_pool.aggregate(pipe).to_list(1)
    r = rows[0] if rows else {}
    stages = {
        "imported": r.get("imported", 0),
        "enriched": r.get("enriched", 0),
        "matched": r.get("matched", 0),
        "outreach_sent": r.get("outreach_sent", 0),
        "reply": r.get("reply", 0),
    }
    return [{"stage": s, "count": c, "marker": None} for s, c in stages.items()]


# ── public API ───────────────────────────────────────────────────────

async def generate_weekly_insights(db) -> Dict[str, Any]:
    """Compute the last-7d vs prior-7d insight set and upsert one doc per ISO
    week into db.talent_pool_insights. Returns {"week_start", "generated"}.
    """
    now = now_utc()
    week_start = now - timedelta(days=7)
    week_key = week_start.date().isoformat()

    payload: Dict[str, Any] = {
        "source_effectiveness": await _source_effectiveness(db, week_start, now),
        "skill_trends": await _skill_trends(db, week_start, now),
        "geo_distribution": await _geo_distribution(db),
        "pipeline_velocity": await _pipeline_velocity(db, week_start, now),
        "enrichment_coverage": await _enrichment_coverage(db),
        "conversion_funnel": await _conversion_funnel(db, week_start, now),
    }

    await db.talent_pool_insights.update_one(
        {"week_start": week_key},
        {"$set": {"week_start": week_key, "computed_at": now, "payload": payload}},
        upsert=True,
    )
    await agent_run_log(db, _AGENT, "generate_weekly", status="SUCCESS",
                        detail={"week_start": week_key})
    await log_activity(db, "system", "Insight", object_id=week_key,
                       object_type="Insight",
                       summary=f"Weekly talent-pool insights generated for week {week_key}",
                       collection="talent_pool_insights")
    return {"week_start": week_key, "generated": True}


async def latest_insights(db, limit: int = 8) -> Dict[str, Any]:
    """Newest-first weekly insight docs for the admin analytics tab."""
    docs = await db.talent_pool_insights.find(
        {}, {"_id": 0}
    ).sort("computed_at", -1).limit(limit).to_list(limit)
    return {"insights": docs, "count": len(docs)}


async def agent_status(db) -> Dict[str, Any]:
    rows = await db.talent_pool_insights.find(
        {}, {"computed_at": 1, "week_start": 1}
    ).sort("computed_at", -1).limit(1).to_list(1)
    last = rows[0] if rows else None
    last_generated = last.get("computed_at") if last else None
    if last_generated is None:
        status = "never"
    elif (now_utc() - last_generated) < timedelta(days=10):
        status = "fresh"
    else:
        status = "stale"
    return {
        "name": _AGENT,
        "group": "infrastructure",
        "priority": "P2",
        "status": status,
        "last_generated_at": last_generated.isoformat() if last_generated else None,
        "est_cost_per_month": "$0",
    }


class TalentInsightsAgent:
    """TP27 singleton — the scheduler entry point (module functions are the impl)."""

    name = _AGENT

    async def generate(self, db) -> Dict[str, Any]:
        return await generate_weekly_insights(db)

    async def agent_status(self, db) -> Dict[str, Any]:
        return await agent_status(db)


tp27_insights_agent = TalentInsightsAgent()
