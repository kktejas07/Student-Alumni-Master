"""
talent_integrations.py — TP31: ATS/CRM push for the Talent Pool suite.

Pushes talent_pool candidates into external ATS/CRM systems so recruiters
don't re-key data. Three adapters, each isolated (one failing never blocks
the others):

  - zoho_recruit : Zoho Recruit candidates API ({domain}.zohopublic.com)
  - freshteam    : Freshdesk-based CRM ({domain}.freshdesk.com, X-APPS-TOKEN)
  - webhook      : custom HTTP sink (any CRM/ERP/Slack bridge)

Credential sources (mirrors features/linkedin_sync.py — installed_tools first,
env fallback):
  installed_tools docs with status="connected":
    tool_id="zoho_recruit"  credentials: {domain, api_key}
    tool_id="freshteam"     credentials: {domain, api_key, endpoint?}
    tool_id="webhook"      credentials: {url, method?, headers?, api_key?}
  env fallbacks:
    ZOHORECRUIT_DOMAIN / ZOHORECRUIT_API_KEY
    FRESHTOOL_DOMAIN   / FRESHTOOL_APPS_TOKEN
    TALENT_WEBHOOK_URL / TALENT_WEBHOOK_METHOD / TALENT_WEBHOOK_HEADERS (JSON)
                       / TALENT_WEBHOOK_API_KEY (sent as Bearer)

Field mapping lives in db.ats_field_mappings, one doc per ATS:
    {ats, field_map: {talent_pool_field: ats_field}, endpoint?, enabled,
     last_sync_at}
Seeded with sensible defaults on first use (see _DEFAULT_FIELD_MAPS).

Per-profile sync state is written to talent_pool.ats_sync.{ats} =
{status, external_id, synced_at, last_error}. Zoho dedups by external_id
(create → update once present); webhook skips re-push when external_id is set.

Honest-by-default: with no credentials the agent reports "unconfigured" and
every push returns an explicit error entry — it never pretends a sync.
"""
from __future__ import annotations

import base64
import json
import logging
import os
from typing import Any, Dict, List, Optional

import httpx

from services.agents.talent_common import agent_run_log, log_activity, now_utc

logger = logging.getLogger("talent_integrations")

_AGENT = "TP31_ats_push"

# ── credential resolution (installed_tools → env) ─────────────────


async def _tool_creds(db, tool_id: str) -> Dict[str, Any]:
    doc = await db.installed_tools.find_one({"tool_id": tool_id, "status": "connected"})
    return (doc or {}).get("credentials") or {}


def _zoho_creds(db_creds: Dict[str, Any]) -> Dict[str, str]:
    domain = str(db_creds.get("domain") or os.environ.get("ZOHORECRUIT_DOMAIN") or "").strip()
    api_key = str(db_creds.get("api_key") or os.environ.get("ZOHORECRUIT_API_KEY") or "").strip()
    return {"domain": domain, "api_key": api_key}


def _freshteam_creds(db_creds: Dict[str, Any]) -> Dict[str, str]:
    domain = str(db_creds.get("domain") or os.environ.get("FRESHTOOL_DOMAIN") or "").strip()
    api_key = str(db_creds.get("api_key") or os.environ.get("FRESHTOOL_APPS_TOKEN") or "").strip()
    endpoint = str(db_creds.get("endpoint") or "candidates").strip()
    return {"domain": domain, "api_key": api_key, "endpoint": endpoint}


def _webhook_creds(db_creds: Dict[str, Any]) -> Dict[str, Any]:
    url = str(db_creds.get("url") or os.environ.get("TALENT_WEBHOOK_URL") or "").strip()
    method = str(db_creds.get("method") or os.environ.get("TALENT_WEBHOOK_METHOD") or "POST").upper()
    raw_headers = db_creds.get("headers")
    if raw_headers is None:
        raw_headers = os.environ.get("TALENT_WEBHOOK_HEADERS") or "{}"
    if isinstance(raw_headers, str):
        try:
            raw_headers = json.loads(raw_headers)
        except json.JSONDecodeError:
            raw_headers = {}
    api_key = str(db_creds.get("api_key") or os.environ.get("TALENT_WEBHOOK_API_KEY") or "").strip()
    return {"url": url, "method": method, "headers": raw_headers or {}, "api_key": api_key}


# ── field mappings ─────────────────────────────────────────────────

_TALENT_FIELDS = [
    "full_name", "email", "phone", "skills", "current_role",
    "location", "experience_years", "education", "github_url",
]

_DEFAULT_FIELD_MAPS: Dict[str, Dict[str, str]] = {
    "zoho_recruit": {
        "full_name": "Name", "email": "Email", "phone": "Phone",
        "skills": "Skills", "current_role": "Current Designation",
        "location": "Location", "experience_years": "Experience",
        "education": "Education", "github_url": "GitHub Profile",
    },
    "freshteam": {
        "full_name": "Name", "email": "Email", "phone": "Phone",
        "skills": "Skills", "current_role": "Job Title",
        "location": "Location", "experience_years": "Experience",
        "education": "Education", "github_url": "GitHub Profile",
    },
    "webhook": {f: f for f in _TALENT_FIELDS},
}


async def ensure_field_mappings(db) -> List[str]:
    """Seed default mappings for any ATS that has none. Returns seeded ids."""
    seeded: List[str] = []
    for ats, fmap in _DEFAULT_FIELD_MAPS.items():
        exists = await db.ats_field_mappings.find_one({"ats": ats})
        if not exists:
            doc: Dict[str, Any] = {"ats": ats, "field_map": fmap, "enabled": ats != "webhook"}
            if ats == "freshteam":
                doc["endpoint"] = "candidates"
            await db.ats_field_mappings.insert_one(doc)
            seeded.append(ats)
    return seeded


async def _load_mappings(db) -> Dict[str, Dict[str, Any]]:
    await ensure_field_mappings(db)
    out: Dict[str, Dict[str, Any]] = {}
    async for m in db.ats_field_mappings.find({}):
        out[m.get("ats") or m.get("_id")] = m
    return out


def _mapped_payload(profile: Dict[str, Any], field_map: Dict[str, str]) -> Dict[str, Any]:
    """Build the ATS payload: talent_pool_field → mapped target field name."""
    payload: Dict[str, Any] = {}
    for src, dst in (field_map or {}).items():
        val = profile.get(src)
        if val in (None, "", []):
            continue
        if src == "skills" and isinstance(val, list):
            val = ", ".join(str(s) for s in val)
        if src == "experience_years" and isinstance(val, (int, float)):
            val = f"{val:g} years"
        payload[dst] = val
    return payload


# ── adapters ───────────────────────────────────────────────────────


async def _push_zoho(db, profile: Dict[str, Any], mapping: Dict[str, Any]) -> Dict[str, Any]:
    creds = _zoho_creds(await _tool_creds(db, "zoho_recruit"))
    if not creds["domain"] or not creds["api_key"]:
        return {"status": "error", "error": "zoho_recruit unconfigured (domain + api_key required)"}
    base = f"https://{creds['domain']}.zohopublic.com/recruit/v1"
    headers: Dict[str, str] = {}
    if ":" in creds["api_key"]:
        token = base64.b64encode(creds["api_key"].encode()).decode()
        headers["Authorization"] = f"Basic {token}"
    else:
        headers["Authorization"] = f"Bearer {creds['api_key']}"
    payload = _mapped_payload(profile, mapping.get("field_map"))
    external_id = str((profile.get("ats_sync", {}).get("zoho_recruit", {}).get("external_id") or "")).strip()
    async with httpx.AsyncClient(timeout=20) as client:
        if external_id:
            resp = await client.put(f"{base}/candidates/{external_id}", json=payload, headers=headers)
            action = "updated"
        else:
            resp = await client.post(f"{base}/candidates", json=payload, headers=headers)
            action = "created"
    if not resp.is_success:
        return {"status": "error", "error": f"zoho HTTP {resp.status_code}: {resp.text[:300]}"}
    data = {}
    try:
        data = resp.json()
    except Exception:
        pass
    ext = (
        (data.get("data") or [{}])[0].get("id") if isinstance(data.get("data"), list)
        else data.get("id") or external_id
    )
    return {"status": action, "external_id": str(ext) if ext else None}


async def _push_freshteam(db, profile: Dict[str, Any], mapping: Dict[str, Any]) -> Dict[str, Any]:
    creds = _freshteam_creds(await _tool_creds(db, "freshteam"))
    if not creds["domain"] or not creds["api_key"]:
        return {"status": "error", "error": "freshteam unconfigured (domain + api_key required)"}
    endpoint = mapping.get("endpoint") or creds["endpoint"] or "candidates"
    if endpoint == "contacts":
        path = "/api/v2/crm/contacts"
        payload = _mapped_payload(profile, mapping.get("field_map"))
        name = str(payload.pop("Name", payload.pop("name", "")))
        first, _, last = name.partition(" ")
        payload["first_name"] = first or "Candidate"
        if last:
            payload["last_name"] = last
    else:
        path = "/api/v2/candidates"
        payload = _mapped_payload(profile, mapping.get("field_map"))
    base = f"https://{creds['domain']}.freshdesk.com{path}"
    external_id = str((profile.get("ats_sync", {}).get("freshteam", {}).get("external_id") or "")).strip()
    headers = {"X-APPS-TOKEN": creds["api_key"], "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=20) as client:
        if external_id:
            resp = await client.put(f"{base}/{external_id}", json=payload, headers=headers)
            action = "updated"
        else:
            resp = await client.post(base, json=payload, headers=headers)
            action = "created"
    if not resp.is_success:
        return {"status": "error", "error": f"freshteam HTTP {resp.status_code}: {resp.text[:300]}"}
    data = {}
    try:
        data = resp.json()
    except Exception:
        pass
    ext = data.get("id") if isinstance(data, dict) else None
    return {"status": action, "external_id": str(ext) if ext else (external_id or None)}


async def _push_webhook(db, profile: Dict[str, Any], mapping: Dict[str, Any]) -> Dict[str, Any]:
    creds = _webhook_creds(await _tool_creds(db, "webhook"))
    if not creds["url"]:
        return {"status": "error", "error": "webhook unconfigured (url required)"}
    external_id = str((profile.get("ats_sync", {}).get("webhook", {}).get("external_id") or "")).strip()
    if external_id:
        return {"status": "skipped", "error": "already synced (external_id present)"}
    payload = _mapped_payload(profile, mapping.get("field_map"))
    payload["profile_id"] = str(profile.get("id") or profile.get("_id"))
    payload["synced_at"] = now_utc().isoformat()
    headers = dict(creds.get("headers") or {})
    if creds.get("api_key"):
        headers["Authorization"] = f"Bearer {creds['api_key']}"
    headers.setdefault("Content-Type", "application/json")
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.request(creds["method"], creds["url"], json=payload, headers=headers)
    if not resp.is_success:
        return {"status": "error", "error": f"webhook HTTP {resp.status_code}: {resp.text[:300]}"}
    ext: Optional[str] = None
    try:
        data = resp.json()
        if isinstance(data, dict):
            ext = str(data.get("id") or data.get("external_id") or "ok")
    except Exception:
        ext = "ok"
    return {"status": "created", "external_id": ext}


_ADAPTERS = {
    "zoho_recruit": _push_zoho,
    "freshteam": _push_freshteam,
    "webhook": _push_webhook,
}


# ── public API ─────────────────────────────────────────────────────


async def push_candidate(
    db,
    profile_id: str,
    atses: Optional[List[str]] = None,
    actor: str = "system",
) -> Dict[str, Any]:
    """Push one candidate to the requested (or all enabled) ATS/CRM adapters.

    Returns {"profile_id", "results": [{ats, status, external_id?, error?}]}.
    Never raises; each adapter failure is isolated into its own result entry.
    """
    start = now_utc()
    p = await db.talent_pool.find_one({"id": profile_id})
    if not p:
        try:
            from bson import ObjectId
            p = await db.talent_pool.find_one({"_id": ObjectId(profile_id)})
        except Exception:
            p = None
    if not p:
        await agent_run_log(db, _AGENT, "push", "FAILED", error="profile not found",
                            detail={"profile_id": profile_id})
        return {"profile_id": profile_id, "results": [{"ats": "*", "status": "error", "error": "profile not found"}]}

    mappings = await _load_mappings(db)
    target_ats = atses if atses else [a for a, m in mappings.items() if m.get("enabled")]
    results: List[Dict[str, Any]] = []

    for ats in target_ats:
        adapter = _ADAPTERS.get(ats)
        if not adapter:
            results.append({"ats": ats, "status": "error", "error": f"unknown ats '{ats}'"})
            continue
        mapping = mappings.get(ats, {})
        try:
            res = await adapter(db, p, mapping)
        except Exception as e:  # isolation: one adapter must never break the batch
            res = {"status": "error", "error": f"{type(e).__name__}: {e}"}
        entry = {"ats": ats, **res}

        sync_doc: Dict[str, Any] = {
            "status": res.get("status"),
            "external_id": res.get("external_id"),
            "synced_at": now_utc(),
            "last_error": res.get("error"),
        }
        await db.talent_pool.update_one(
            {"_id": p["_id"]},
            {"$set": {f"ats_sync.{ats}": sync_doc}},
        )
        if res.get("status") in ("created", "updated"):
            await db.ats_field_mappings.update_one(
                {"ats": ats}, {"$set": {"last_sync_at": now_utc()}}
            )
            await log_activity(db, actor, "Sync", object_id=str(p.get("id") or p["_id"]),
                               summary=f"Pushed to {ats} ({res.get('status')})",
                               data={"ats": ats, "external_id": res.get("external_id")},
                               collection="talent_pool")
        results.append(entry)

    ok = sum(1 for r in results if r.get("status") in ("created", "updated"))
    await agent_run_log(
        db, _AGENT, "push", "SUCCESS" if ok else "FAILED",
        detail={"profile_id": profile_id, "ats": target_ats, "pushed": ok},
        error=None if ok else "all adapters failed",
        duration_ms=int((now_utc() - start).total_seconds() * 1000),
    )
    return {"profile_id": profile_id, "results": results}


async def push_due_updates(db, limit: int = 50) -> Dict[str, Any]:
    """Scheduler step (TP23): push candidates whose interest_status is
    Interviewing/Selected/Rejected but whose per-ATS external_id is still
    missing, plus re-sync any that have failed before. No-op when no
    adapter is configured — honest, never fake-succeeds."""
    mappings = await _load_mappings(db)
    enabled = [a for a, m in mappings.items() if m.get("enabled")]
    if not enabled:
        return {"pushed": 0, "reason": "no ATS enabled"}
    pushed = failed = 0
    async for p in db.talent_pool.find(
        {"interest_status": {"$in": ["Interviewing", "Selected", "Rejected"]}}
    ).limit(limit):
        pid = str(p.get("id") or p.get("_id"))
        due = [a for a in enabled
               if not (p.get("ats_sync") or {}).get(a, {}).get("external_id")
               or (p.get("ats_sync") or {}).get(a, {}).get("status") == "error"]
        if not due:
            continue
        res = await push_candidate(db, pid, atses=due, actor="tp23_scheduler")
        pushed += sum(1 for r in res["results"] if r.get("status") in ("created", "updated"))
        failed += sum(1 for r in res["results"] if r.get("status") == "error")
    await agent_run_log(db, _AGENT, "push_due_updates",
                        "SUCCESS" if failed == 0 else "PARTIAL",
                        detail={"pushed": pushed, "failed": failed})
    return {"pushed": pushed, "failed": failed}


async def ats_status(db, limit: int = 50) -> Dict[str, Any]:
    """Recent per-ATS sync summary for the dashboard (last `limit` runs)."""
    runs = await db.scheduler_logs.find(
        {"agent": _AGENT}
    ).sort("started_at", -1).limit(limit).to_list(limit)
    summaries = []
    for r in runs:
        started = r.get("started_at")
        summaries.append({
            "status": r.get("status"),
            "detail": r.get("detail") or {},
            "error": r.get("error"),
            "at": started.isoformat() if started else None,
        })
    enabled = [a for a, m in (await _load_mappings(db)).items() if m.get("enabled")]
    last_push = next((s["at"] for s in summaries if s["status"] == "SUCCESS"), None)
    return {"enabled_ats": enabled, "recent_runs": summaries, "last_push_at": last_push}


class TalentIntegrationsAgent:
    """Singleton facade — mirrors the house agent pattern (talent_scraper_ai_agent)."""

    async def push_candidate(self, db, profile_id, atses=None, actor="system"):
        return await push_candidate(db, profile_id, atses=atses, actor=actor)

    async def ats_status(self, db, limit=50):
        return await ats_status(db, limit=limit)

    async def agent_status(self, db) -> Dict[str, Any]:
        """Dashboard card: configured/unconfigured per adapter + cost."""
        mappings = await _load_mappings(db)
        zoho = _zoho_creds(await _tool_creds(db, "zoho_recruit"))
        ft = _freshteam_creds(await _tool_creds(db, "freshteam"))
        wh = _webhook_creds(await _tool_creds(db, "webhook"))
        status = {
            "zoho_recruit": "configured" if zoho["domain"] and zoho["api_key"] else "unconfigured",
            "freshteam": "configured" if ft["domain"] and ft["api_key"] else "unconfigured",
            "webhook": "configured" if wh["url"] else "unconfigured",
        }
        async def _last_push() -> Optional[str]:
            runs = await db.scheduler_logs.find(
                {"agent": _AGENT, "status": "SUCCESS"}
            ).sort("started_at", -1).limit(1).to_list(1)
            s = runs[0].get("started_at") if runs else None
            return s.isoformat() if s else None
        return {
            "name": "TP31 ATS Push",
            "group": "integrations",
            "priority": "P2",
            "status": status,
            "enabled_ats": [a for a, m in mappings.items() if m.get("enabled")],
            "last_push_at": await _last_push(),
            "est_cost_per_month": "$0",
        }


talent_integrations = TalentIntegrationsAgent()
