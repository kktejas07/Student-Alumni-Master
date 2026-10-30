"""
Firebase Analytics Data API integration.
Queries GA4 for real-time, historical, and behavioral analytics data.

Requires: google-analytics-data package, a GA4 property ID, and a Google
service account (or GOOGLE_APPLICATION_CREDENTIALS / Application Default
Credentials).

Config resolution (highest priority first):
  1. Env: FIREBASE_ANALYTICS_PROPERTY_ID + GOOGLE_APPLICATION_CREDENTIALS
  2. platform_controls system_settings:
       ga4_property_id            → GA4 property ID
       firebase_service_account   → service account JSON (built into a client)
"""
import os
import json
import logging
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger(__name__)

_ENV_PROPERTY_ID = os.environ.get("FIREBASE_ANALYTICS_PROPERTY_ID", "")


def _date_range(days: int):
    from datetime import datetime, timedelta, timezone
    end = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    start = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    return start, end


async def _resolve_config(db=None) -> Dict[str, Any]:
    """Resolve (property_id, service_account_json) from env then db settings."""
    property_id = _ENV_PROPERTY_ID.strip()
    sa_json = ""
    if db is not None:
        try:
            doc = await db.platform_controls.find_one({"_id": "singleton"})
        except Exception:
            doc = None
        if doc:
            settings = doc.get("system_settings") or []
            by_key = {s.get("key"): s.get("value") for s in settings}
            if not property_id:
                property_id = (by_key.get("ga4_property_id") or "").strip()
            # Prefer dedicated GA4 service account; fall back to Firebase service account
            sa_json = (by_key.get("ga4_service_account_json") or "").strip()
            if not sa_json:
                sa_json = (by_key.get("firebase_service_account") or "").strip()
    # Allow a full credentials JSON too
    if not sa_json and property_id:
        # Nothing extra; ADC / GOOGLE_APPLICATION_CREDENTIALS will be used by the SDK.
        pass
    return {"property_id": property_id, "service_account_json": sa_json}


def _build_client(property_id: str, sa_json: str):
    """Build a BetaAnalyticsDataClient, preferring explicit service account JSON."""
    from google.analytics.data_v1beta import BetaAnalyticsDataClient

    if sa_json.strip():
        try:
            from google.oauth2 import service_account
            info = json.loads(sa_json)
            scopes = ["https://www.googleapis.com/auth/analytics.readonly"]
            creds = service_account.Credentials.from_service_account_info(info, scopes=scopes)
            return BetaAnalyticsDataClient(credentials=creds)
        except Exception as e:
            logger.warning(f"Failed to build GA4 client from service account JSON: {e}")
    return BetaAnalyticsDataClient()


async def _client(db=None):
    """Lazy-init the GA4 Data API client using db-resolved config."""
    try:
        from google.analytics.data_v1beta.types import (
            RunReportRequest, DateRange, Dimension, Metric,
            OrderBy, FilterExpression, Filter, RunRealtimeReportRequest,
        )
        cfg = await _resolve_config(db)
        if not cfg["property_id"]:
            return None
        client = _build_client(cfg["property_id"], cfg["service_account_json"])
        return client, RunReportRequest, RunRealtimeReportRequest, DateRange, Dimension, Metric, OrderBy, FilterExpression, Filter, cfg["property_id"]
    except Exception as e:
        logger.warning(f"Firebase Analytics not available: {e}")
    return None


def _pid(property_id: str) -> str:
    pid = (property_id or "").strip()
    if not pid:
        return ""
    return pid if pid.startswith("properties/") else f"properties/{pid}"


# ── Real-time ────────────────────────────────────────────────────────────────

async def get_realtime_active_users(db=None) -> Dict[str, Any]:
    result = await _client(db)
    if not result:
        return {"active_users": 0, "configured": False}
    client, _, RTReq, _, Dim, Met, _, _, _, prop = result
    p = _pid(prop)
    if not p:
        return {"active_users": 0, "configured": False}
    try:
        req = RTReq(property=p, metrics=[Met(name="activeUsers")])
        resp = client.run_realtime_report(req)
        count = sum(int(r.metric_values[0].value) for r in resp.rows)
        return {"active_users": count, "configured": True}
    except Exception as e:
        logger.warning(f"Firebase realtime query failed: {e}")
        return {"active_users": 0, "configured": True, "error": str(e)}


# ── Page Views & Screen Views ────────────────────────────────────────────────

async def get_page_views(days: int = 30, db=None) -> Dict[str, Any]:
    result = await _client(db)
    if not result:
        return {"pages": [], "configured": False}
    client, Req, _, DR, Dim, Met, OB, _, _, prop = result
    p = _pid(prop)
    if not p:
        return {"pages": [], "configured": False}
    try:
        s, e = _date_range(days)
        req = Req(
            property=p, date_ranges=[DR(start_date=s, end_date=e)],
            dimensions=[Dim(name="pagePath")],
            metrics=[Met(name="screenPageViews")],
            order_bys=[OB(metric=Met(name="screenPageViews"), desc=True)],
            limit=15,
        )
        resp = client.run_report(req)
        pages = [{"path": r.dimension_values[0].value, "views": int(r.metric_values[0].value)} for r in resp.rows]
        return {"pages": pages, "configured": True}
    except Exception as e:
        logger.warning(f"Firebase page views query failed: {e}")
        return {"pages": [], "configured": True, "error": str(e)}


# ── Session Duration ─────────────────────────────────────────────────────────

async def get_session_duration(days: int = 30, db=None) -> Dict[str, Any]:
    result = await _client(db)
    if not result:
        return {"avg_duration_sec": 0, "total_sessions": 0, "configured": False}
    client, Req, _, DR, Dim, Met, _, _, _, prop = result
    p = _pid(prop)
    if not p:
        return {"avg_duration_sec": 0, "total_sessions": 0, "configured": False}
    try:
        s, e = _date_range(days)
        req = Req(
            property=p, date_ranges=[DR(start_date=s, end_date=e)],
            metrics=[Met(name="averageSessionDuration"), Met(name="sessions")],
        )
        resp = client.run_report(req)
        if resp.rows:
            return {
                "avg_duration_sec": round(float(resp.rows[0].metric_values[0].value), 1),
                "total_sessions": int(resp.rows[0].metric_values[1].value),
                "configured": True,
            }
        return {"avg_duration_sec": 0, "total_sessions": 0, "configured": True}
    except Exception as e:
        logger.warning(f"Firebase session duration query failed: {e}")
        return {"avg_duration_sec": 0, "total_sessions": 0, "configured": True, "error": str(e)}


# ── Active Hours (hourly breakdown) ──────────────────────────────────────────

async def get_active_hours(days: int = 7, db=None) -> Dict[str, Any]:
    """Get hourly activity breakdown for heat map visualization."""
    result = await _client(db)
    if not result:
        return {"hours": [], "configured": False}
    client, Req, _, DR, Dim, Met, OB, _, _, prop = result
    p = _pid(prop)
    if not p:
        return {"hours": [], "configured": False}
    try:
        s, e = _date_range(days)
        req = Req(
            property=p, date_ranges=[DR(start_date=s, end_date=e)],
            dimensions=[Dim(name="hour")],
            metrics=[Met(name="activeUsers")],
            order_bys=[OB(dimension=Dim(name="hour"))],
        )
        resp = client.run_report(req)
        hours = []
        for r in resp.rows:
            h = int(r.dimension_values[0].value)
            hours.append({"hour": h, "count": int(r.metric_values[0].value)})
        return {"hours": hours, "configured": True}
    except Exception as e:
        logger.warning(f"Firebase active hours query failed: {e}")
        return {"hours": [], "configured": True, "error": str(e)}


# ── User Retention ───────────────────────────────────────────────────────────

async def get_retention(days: int = 30, db=None) -> Dict[str, Any]:
    """Get user retention cohorts from GA4."""
    result = await _client(db)
    if not result:
        return {"cohorts": [], "configured": False}
    client, Req, _, DR, Dim, Met, OB, _, _, prop = result
    p = _pid(prop)
    if not p:
        return {"cohorts": [], "configured": False}
    try:
        s, e = _date_range(days)
        req = Req(
            property=p, date_ranges=[DR(start_date=s, end_date=e)],
            dimensions=[Dim(name="cohort"), Dim(name="cohortWeek")],
            metrics=[Met(name="cohortActiveUsers")],
            order_bys=[OB(dimension=Dim(name="cohort"))],
        )
        resp = client.run_report(req)
        cohorts = []
        for r in resp.rows:
            cohorts.append({
                "cohort": r.dimension_values[0].value,
                "week": r.dimension_values[1].value,
                "users": int(r.metric_values[0].value),
            })
        return {"cohorts": cohorts, "configured": True}
    except Exception as e:
        logger.warning(f"Firebase retention query failed: {e}")
        return {"cohorts": [], "configured": True, "error": str(e)}


# ── User Demographics ────────────────────────────────────────────────────────

async def get_demographics(days: int = 30, db=None) -> Dict[str, Any]:
    """Get user demographics (country, city) from GA4."""
    result = await _client(db)
    if not result:
        return {"countries": [], "cities": [], "configured": False}
    client, Req, _, DR, Dim, Met, OB, _, _, prop = result
    p = _pid(prop)
    if not p:
        return {"countries": [], "cities": [], "configured": False}
    try:
        s, e = _date_range(days)
        country_req = Req(
            property=p, date_ranges=[DR(start_date=s, end_date=e)],
            dimensions=[Dim(name="country"), Dim(name="countryId")],
            metrics=[Met(name="activeUsers")],
            order_bys=[OB(metric=Met(name="activeUsers"), desc=True)],
            limit=15,
        )
        country_resp = client.run_report(country_req)
        countries = [{"country": r.dimension_values[0].value, "code": r.dimension_values[1].value, "count": int(r.metric_values[0].value)} for r in country_resp.rows]
        city_req = Req(
            property=p, date_ranges=[DR(start_date=s, end_date=e)],
            dimensions=[Dim(name="city"), Dim(name="country")],
            metrics=[Met(name="activeUsers")],
            order_bys=[OB(metric=Met(name="activeUsers"), desc=True)],
            limit=10,
        )
        city_resp = client.run_report(city_req)
        cities = [{"city": r.dimension_values[0].value, "country": r.dimension_values[1].value, "count": int(r.metric_values[0].value)} for r in city_resp.rows]
        return {"countries": countries, "cities": cities, "configured": True}
    except Exception as e:
        logger.warning(f"Firebase demographics query failed: {e}")
        return {"countries": [], "cities": [], "configured": True, "error": str(e)}


# ── Device / Browser / OS Breakdown ──────────────────────────────────────────

async def get_device_data(days: int = 30, db=None) -> Dict[str, Any]:
    result = await _client(db)
    if not result:
        return {"by_os": [], "by_browser": [], "by_device": [], "configured": False}
    client, Req, _, DR, Dim, Met, OB, _, _, prop = result
    p = _pid(prop)
    if not p:
        return {"by_os": [], "by_browser": [], "by_device": [], "configured": False}
    try:
        s, e = _date_range(days)
        def _query(dim_name, limit=8):
            req = Req(
                property=p, date_ranges=[DR(start_date=s, end_date=e)],
                dimensions=[Dim(name=dim_name)],
                metrics=[Met(name="activeUsers")],
                order_bys=[OB(metric=Met(name="activeUsers"), desc=True)],
                limit=limit,
            )
            resp = client.run_report(req)
            return [{"label": r.dimension_values[0].value, "value": int(r.metric_values[0].value)} for r in resp.rows]
        by_os = _query("operatingSystem")
        by_browser = _query("browser")
        by_device = _query("deviceCategory")
        return {"by_os": by_os, "by_browser": by_browser, "by_device": by_device, "configured": True}
    except Exception as e:
        logger.warning(f"Firebase device query failed: {e}")
        return {"by_os": [], "by_browser": [], "by_device": [], "configured": True, "error": str(e)}


# ── Acquisition Sources ──────────────────────────────────────────────────────

async def get_acquisition(days: int = 30, db=None) -> Dict[str, Any]:
    result = await _client(db)
    if not result:
        return {"sources": [], "configured": False}
    client, Req, _, DR, Dim, Met, OB, _, _, prop = result
    p = _pid(prop)
    if not p:
        return {"sources": [], "configured": False}
    try:
        s, e = _date_range(days)
        req = Req(
            property=p, date_ranges=[DR(start_date=s, end_date=e)],
            dimensions=[Dim(name="sessionSource")],
            metrics=[Met(name="sessions")],
            order_bys=[OB(metric=Met(name="sessions"), desc=True)],
            limit=10,
        )
        resp = client.run_report(req)
        sources = [{"source": r.dimension_values[0].value, "sessions": int(r.metric_values[0].value)} for r in resp.rows]
        return {"sources": sources, "configured": True}
    except Exception as e:
        logger.warning(f"Firebase acquisition query failed: {e}")
        return {"sources": [], "configured": True, "error": str(e)}


# ── Daily Active Users Time Series ───────────────────────────────────────────

async def get_daily_active_users(days: int = 30, db=None) -> Dict[str, Any]:
    result = await _client(db)
    if not result:
        return {"series": [], "configured": False}
    client, Req, _, DR, Dim, Met, OB, _, _, prop = result
    p = _pid(prop)
    if not p:
        return {"series": [], "configured": False}
    try:
        s, e = _date_range(days)
        req = Req(
            property=p, date_ranges=[DR(start_date=s, end_date=e)],
            dimensions=[Dim(name="date")],
            metrics=[Met(name="activeUsers")],
            order_bys=[OB(dimension=Dim(name="date"))],
        )
        resp = client.run_report(req)
        series = []
        for r in resp.rows:
            d = r.dimension_values[0].value
            series.append({"date": f"{d[:4]}-{d[4:6]}-{d[6:8]}", "count": int(r.metric_values[0].value)})
        return {"series": series, "configured": True}
    except Exception as e:
        logger.warning(f"Firebase DAU query failed: {e}")
        return {"series": [], "configured": True, "error": str(e)}


# ── Bounce Rate & Engagement ─────────────────────────────────────────────────

async def get_engagement_metrics(days: int = 30, db=None) -> Dict[str, Any]:
    result = await _client(db)
    if not result:
        return {"bounce_rate": 0, "engagement_rate": 0, "views_per_session": 0, "configured": False}
    client, Req, _, DR, Dim, Met, _, _, _, prop = result
    p = _pid(prop)
    if not p:
        return {"bounce_rate": 0, "engagement_rate": 0, "views_per_session": 0, "configured": False}
    try:
        s, e = _date_range(days)
        req = Req(
            property=p, date_ranges=[DR(start_date=s, end_date=e)],
            metrics=[
                Met(name="bounceRate"),
                Met(name="engagementRate"),
                Met(name="screenPageViewsPerSession"),
            ],
        )
        resp = client.run_report(req)
        if resp.rows:
            return {
                "bounce_rate": round(float(resp.rows[0].metric_values[0].value) * 100, 1),
                "engagement_rate": round(float(resp.rows[0].metric_values[1].value) * 100, 1),
                "views_per_session": round(float(resp.rows[0].metric_values[2].value), 1),
                "configured": True,
            }
        return {"bounce_rate": 0, "engagement_rate": 0, "views_per_session": 0, "configured": True}
    except Exception as e:
        logger.warning(f"Firebase engagement query failed: {e}")
        return {"bounce_rate": 0, "engagement_rate": 0, "views_per_session": 0, "configured": True, "error": str(e)}
