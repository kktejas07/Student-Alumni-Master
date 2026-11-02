"""
PostHog Analytics integration for the Super Admin dashboard.

Fetches product-analytics data from PostHog via the HogQL Query API
(``POST /api/projects/{project_id}/query/``) using a personal API key
(``phx_``) with the ``query:read`` scope.

Credentials are resolved in this priority order:
  1. Environment: POSTHOG_PERSONAL_API_KEY, POSTHOG_HOST, POSTHOG_PROJECT_ID
  2. ``installed_tools`` → tool_id="posthog" → credentials dict
     (api_key / personal_api_key, host, project_id)

A project API key (``phc_``) alone is NOT enough to read analytics — a
personal API key is required for the Query API.
"""
import os
import time
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

_TIMEOUT = 20.0
_CACHE: Dict[str, Any] = {"project_id": None, "at": 0}
_CACHE_TTL = 300


# ── Credential resolution ────────────────────────────────────────────────────

def _env_config() -> Dict[str, str]:
    """Read PostHog config from env vars. Only returns non-empty values."""
    result: Dict[str, str] = {}
    key = os.environ.get("POSTHOG_PERSONAL_API_KEY", "").strip() or os.environ.get("POSTHOG_API_KEY", "").strip()
    if key:
        result["api_key"] = key
    host = os.environ.get("POSTHOG_HOST", "").strip()
    if host:
        result["host"] = host.replace(".i.posthog.com", ".posthog.com")
    pid = os.environ.get("POSTHOG_PROJECT_ID", "").strip()
    if pid:
        result["project_id"] = pid
    return result


async def _db_config(db) -> Dict[str, str]:
    """Read PostHog credentials from the marketplace install (any user)."""
    try:
        it = await db.installed_tools.find_one({"tool_id": "posthog", "status": "connected"})
        if not it:
            return {}
        creds = it.get("credentials") or {}
        host = (creds.get("host") or "").strip()
        if not host:
            host = "https://app.posthog.com"
        # Normalize ingestion endpoints to API endpoints
        host = host.replace(".i.posthog.com", ".posthog.com")
        return {
            "api_key": (creds.get("personal_api_key") or creds.get("api_key") or "").strip(),
            "host": host.rstrip("/"),
            "project_id": (creds.get("project_id") or "").strip(),
        }
    except Exception as e:
        logger.warning(f"PostHog db config read failed: {e}")
        return {}


async def _config(db) -> Dict[str, str]:
    """Merge env + db config, preferring env (only non-empty values)."""
    merged = {"api_key": "", "host": "https://app.posthog.com", "project_id": ""}
    merged.update({k: v for k, v in (await _db_config(db)).items() if v})
    merged.update({k: v for k, v in _env_config().items() if v})
    return merged


async def _resolve_project_id(db) -> Optional[int]:
    """Resolve the PostHog project ID, with a short TTL cache."""
    now = time.time()
    if _CACHE["project_id"] is not None and now - _CACHE["at"] < _CACHE_TTL:
        return _CACHE["project_id"]
    cfg = await _config(db)
    api_key = cfg.get("api_key", "")
    if not api_key:
        _CACHE.update({"project_id": None, "at": now})
        return None
    if cfg.get("project_id"):
        try:
            _CACHE.update({"project_id": int(cfg["project_id"]), "at": now})
            return _CACHE["project_id"]
        except (TypeError, ValueError):
            pass
    # Try @current first (works with personal API keys without project_access scope)
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.post(
                f"{cfg['host']}/api/projects/@current/query/",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"query": {"kind": "HogQLQuery", "query": "SELECT 1"}},
            )
        if resp.status_code == 200:
            # @current works — extract project_id from the response URL or use 0 as sentinel
            # We'll use @current directly in queries
            _CACHE.update({"project_id": -1, "at": now})  # -1 = use @current
            return _CACHE["project_id"]
        logger.warning(f"PostHog @current probe failed HTTP {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        logger.warning(f"PostHog @current probe error: {e}")
    # Fall back to listing projects the key can access.
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(
                f"{cfg['host']}/api/projects/",
                headers={"Authorization": f"Bearer {api_key}"},
            )
        if resp.status_code == 200:
            data = resp.json()
            projects = data.get("results") or data
            if isinstance(projects, list) and projects:
                pid = projects[0].get("id")
                if pid is not None:
                    _CACHE.update({"project_id": int(pid), "at": now})
                    return _CACHE["project_id"]
        logger.warning(f"PostHog project lookup failed HTTP {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        logger.warning(f"PostHog project lookup error: {e}")
    _CACHE.update({"project_id": None, "at": now})
    return None


async def _hogql(db, sql: str) -> List[Dict[str, Any]]:
    """Run a HogQL query and return rows as {column: value} dicts."""
    cfg = await _config(db)
    api_key = cfg.get("api_key", "")
    if not api_key:
        return []
    pid = await _resolve_project_id(db)
    if pid is None:
        return []
    project_str = "@current" if pid == -1 else str(pid)
    url = f"{cfg['host']}/api/projects/{project_str}/query/"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "query": {"kind": "HogQLQuery", "query": sql},
        "name": "super-admin-analytics",
    }
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.post(url, json=payload, headers=headers)
        if resp.status_code != 200:
            logger.warning(f"PostHog query HTTP {resp.status_code}: {resp.text[:300]}")
            return []
        data = resp.json()
        columns = data.get("columns") or []
        results = data.get("results") or []
        rows = []
        for row in results:
            item: Dict[str, Any] = {}
            for i, col in enumerate(columns):
                item[col] = row[i] if i < len(row) else None
            rows.append(item)
        return rows
    except Exception as e:
        logger.warning(f"PostHog HogQL query error: {e}")
        return []


# ── Data fetchers ────────────────────────────────────────────────────────────

async def _safe(db, sql: str, default: Any):
    try:
        return await _hogql(db, sql) or default
    except Exception:
        return default


async def _realtime_active(db) -> int:
    rows = await _safe(db, """
        SELECT count(DISTINCT person_id) AS users
        FROM events
        WHERE timestamp > now() - INTERVAL 5 MINUTE
    """, [])
    return int(rows[0].get("users") or 0) if rows else 0


async def _totals(db) -> Dict[str, Any]:
    rows = await _safe(db, """
        SELECT
            count() AS events,
            count(DISTINCT person_id) AS users,
            countIf(event = '$pageview') AS pageviews
        FROM events
        WHERE timestamp > now() - INTERVAL 30 DAY
    """, [])
    if not rows:
        return {"events": 0, "users": 0, "pageviews": 0}
    r = rows[0]
    return {
        "events": int(r.get("events") or 0),
        "users": int(r.get("users") or 0),
        "pageviews": int(r.get("pageviews") or 0),
    }


async def _daily_series(db) -> List[Dict[str, Any]]:
    rows = await _safe(db, """
        SELECT
            toStartOfDay(timestamp) AS day,
            count() AS events,
            count(DISTINCT person_id) AS users
        FROM events
        WHERE timestamp > now() - INTERVAL 30 DAY
        GROUP BY day ORDER BY day
    """, [])
    out = []
    for r in rows:
        day = r.get("day")
        if day:
            out.append({
                "date": str(day)[:10],
                "events": int(r.get("events") or 0),
                "users": int(r.get("users") or 0),
            })
    return out


async def _top_events(db, limit: int = 12) -> List[Dict[str, Any]]:
    rows = await _safe(db, f"""
        SELECT event, count() AS count
        FROM events
        WHERE timestamp > now() - INTERVAL 30 DAY
        GROUP BY event ORDER BY count DESC
        LIMIT {limit}
    """, [])
    return [{"event": r.get("event") or "?", "count": int(r.get("count") or 0)} for r in rows]


async def _top_paths(db, limit: int = 12) -> List[Dict[str, Any]]:
    rows = await _safe(db, f"""
        SELECT properties.$pathname AS path, count() AS views
        FROM events
        WHERE event = '$pageview'
          AND properties.$pathname IS NOT NULL
          AND timestamp > now() - INTERVAL 30 DAY
        GROUP BY path ORDER BY views DESC
        LIMIT {limit}
    """, [])
    return [{"path": r.get("path") or "/", "views": int(r.get("views") or 0)} for r in rows]


async def _sources(db, limit: int = 10) -> List[Dict[str, Any]]:
    rows = await _safe(db, f"""
        SELECT
            COALESCE(properties.$referring_domain, 'direct') AS source,
            count() AS sessions
        FROM events
        WHERE timestamp > now() - INTERVAL 30 DAY
          AND properties.$referring_domain IS NOT NULL
        GROUP BY source ORDER BY sessions DESC
        LIMIT {limit}
    """, [])
    return [{"source": r.get("source") or "direct", "sessions": int(r.get("sessions") or 0)} for r in rows]


async def _countries(db, limit: int = 12) -> List[Dict[str, Any]]:
    rows = await _safe(db, f"""
        SELECT
            COALESCE(properties.$geoip_country_name, 'Unknown') AS country,
            COALESCE(properties.$geoip_country_code, '??') AS code,
            count() AS count
        FROM events
        WHERE timestamp > now() - INTERVAL 30 DAY
          AND properties.$geoip_country_name IS NOT NULL
        GROUP BY country, code ORDER BY count DESC
        LIMIT {limit}
    """, [])
    return [{"country": r.get("country") or "Unknown", "code": r.get("code") or "??", "count": int(r.get("count") or 0)} for r in rows]


async def _devices(db) -> Dict[str, Any]:
    by_os = await _safe(db, f"""
        SELECT COALESCE(properties.$os, 'Unknown') AS label, count() AS count
        FROM events
        WHERE timestamp > now() - INTERVAL 30 DAY AND properties.$os IS NOT NULL
        GROUP BY label ORDER BY count DESC LIMIT 8
    """, [])
    by_browser = await _safe(db, f"""
        SELECT COALESCE(properties.$browser, 'Unknown') AS label, count() AS count
        FROM events
        WHERE timestamp > now() - INTERVAL 30 DAY AND properties.$browser IS NOT NULL
        GROUP BY label ORDER BY count DESC LIMIT 8
    """, [])
    by_device = await _safe(db, f"""
        SELECT COALESCE(properties.$device_type, 'Unknown') AS label, count() AS count
        FROM events
        WHERE timestamp > now() - INTERVAL 30 DAY AND properties.$device_type IS NOT NULL
        GROUP BY label ORDER BY count DESC LIMIT 5
    """, [])
    return {
        "by_os": [{"label": r.get("label") or "Unknown", "value": int(r.get("count") or 0)} for r in by_os],
        "by_browser": [{"label": r.get("label") or "Unknown", "value": int(r.get("count") or 0)} for r in by_browser],
        "by_device": [{"label": r.get("label") or "Unknown", "value": int(r.get("count") or 0)} for r in by_device],
    }


async def _sessions(db) -> Dict[str, Any]:
    """Session count + avg duration. Requires $session_id captured on events."""
    rows = await _safe(db, """
        SELECT
            count(DISTINCT properties.$session_id) AS sessions,
            count(DISTINCT person_id) AS users
        FROM events
        WHERE timestamp > now() - INTERVAL 30 DAY
          AND properties.$session_id IS NOT NULL
    """, [])
    if not rows:
        return {"sessions": 0, "users": 0, "has_session_data": False}
    r = rows[0]
    total = int(r.get("sessions") or 0)
    return {"sessions": total, "users": int(r.get("users") or 0), "has_session_data": total > 0}


async def fetch_posthog(db) -> Dict[str, Any]:
    """Aggregate all PostHog analytics for the Super Admin dashboard."""
    cfg = await _config(db)
    api_key = cfg.get("api_key", "")
    if not api_key:
        return {"configured": False, "reason": "PostHog not configured. Add a personal API key in Settings → Integrations."}

    if api_key.startswith("phc_"):
        return {
            "configured": False,
            "reason": "A project API key (phc_) cannot read analytics. Use a personal API key (phx_) with query:read scope in Settings → Integrations.",
        }

    pid = await _resolve_project_id(db)
    if pid is None:
        return {
            "configured": False,
            "reason": "PostHog is configured but the project could not be resolved. Set POSTHOG_PROJECT_ID or verify the personal API key has query:read.",
        }

    try:
        realtime, totals, series, events, paths, sources, countries, devices, sessions = await _all(
            db,
            _realtime_active(db),
            _totals(db),
            _daily_series(db),
            _top_events(db),
            _top_paths(db),
            _sources(db),
            _countries(db),
            _devices(db),
            _sessions(db),
        )
        return {
            "configured": True,
            "host": cfg.get("host"),
            "project_id": pid,
            "realtime_active": realtime,
            "totals_30d": totals,
            "daily_series": series,
            "top_events": events,
            "top_paths": paths,
            "sources": sources,
            "countries": countries,
            "devices": devices,
            "sessions": sessions,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        logger.warning(f"PostHog fetch failed: {e}")
        return {"configured": False, "reason": f"PostHog query failed: {str(e)[:200]}"}


async def _all(db, *coros):
    import asyncio
    results = await asyncio.gather(*coros, return_exceptions=True)
    return [r if not isinstance(r, Exception) else {} for r in results]
