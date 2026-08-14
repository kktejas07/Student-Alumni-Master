"""
Firebase Analytics Data API integration.
Queries GA4 for real-time, historical, and behavioral analytics data.
Requires: google-analytics-data package, Firebase service account, GA4 Property ID.
"""
import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

PROPERTY_ID = os.environ.get("FIREBASE_ANALYTICS_PROPERTY_ID", "")


def _client():
    """Lazy-init the GA4 Data API client."""
    try:
        from google.analytics.data_v1beta import BetaAnalyticsDataClient
        from google.analytics.data_v1beta.types import (
            RunReportRequest, DateRange, Dimension, Metric,
            OrderBy, FilterExpression, Filter, RunRealtimeReportRequest,
        )
        if PROPERTY_ID:
            client = BetaAnalyticsDataClient()
            return client, RunReportRequest, RunRealtimeReportRequest, DateRange, Dimension, Metric, OrderBy, FilterExpression, Filter
    except Exception as e:
        logger.warning(f"Firebase Analytics not available: {e}")
    return None


def _pid() -> str:
    pid = PROPERTY_ID.strip()
    if not pid:
        return ""
    return pid if pid.startswith("properties/") else f"properties/{pid}"


def _date_range(days: int):
    from datetime import datetime, timedelta, timezone
    end = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    start = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    return start, end


# ── Real-time ────────────────────────────────────────────────────────────────

async def get_realtime_active_users() -> Dict[str, Any]:
    result = _client()
    if not result:
        return {"active_users": 0, "configured": False}
    client, _, RTReq, _, Dim, Met, _, _, _ = result
    p = _pid()
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

async def get_page_views(days: int = 30) -> Dict[str, Any]:
    result = _client()
    if not result:
        return {"pages": [], "configured": False}
    client, Req, _, DR, Dim, Met, OB, _, _ = result
    p = _pid()
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

async def get_session_duration(days: int = 30) -> Dict[str, Any]:
    result = _client()
    if not result:
        return {"avg_duration_sec": 0, "total_sessions": 0, "configured": False}
    client, Req, _, DR, Dim, Met, _, _, _ = result
    p = _pid()
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

async def get_active_hours(days: int = 7) -> Dict[str, Any]:
    """Get hourly activity breakdown for heat map visualization."""
    result = _client()
    if not result:
        return {"hours": [], "configured": False}
    client, Req, _, DR, Dim, Met, OB, _, _ = result
    p = _pid()
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

async def get_retention(days: int = 30) -> Dict[str, Any]:
    """Get user retention cohorts from GA4."""
    result = _client()
    if not result:
        return {"cohorts": [], "configured": False}
    client, Req, _, DR, Dim, Met, OB, _, _ = result
    p = _pid()
    if not p:
        return {"cohorts": [], "configured": False}
    try:
        s, e = _date_range(days)
        # Weekly retention cohorts
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

async def get_demographics(days: int = 30) -> Dict[str, Any]:
    """Get user demographics (country, city, device, browser, OS) from GA4."""
    result = _client()
    if not result:
        return {"countries": [], "cities": [], "configured": False}
    client, Req, _, DR, Dim, Met, OB, _, _ = result
    p = _pid()
    if not p:
        return {"countries": [], "cities": [], "configured": False}
    try:
        s, e = _date_range(days)
        # Countries
        country_req = Req(
            property=p, date_ranges=[DR(start_date=s, end_date=e)],
            dimensions=[Dim(name="country")],
            metrics=[Met(name="activeUsers")],
            order_bys=[OB(metric=Met(name="activeUsers"), desc=True)],
            limit=15,
        )
        country_resp = client.run_report(country_req)
        countries = [{"country": r.dimension_values[0].value, "count": int(r.metric_values[0].value)} for r in country_resp.rows]
        # Cities
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

async def get_device_data(days: int = 30) -> Dict[str, Any]:
    result = _client()
    if not result:
        return {"by_os": [], "by_browser": [], "by_device": [], "configured": False}
    client, Req, _, DR, Dim, Met, OB, _, _ = result
    p = _pid()
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

async def get_acquisition(days: int = 30) -> Dict[str, Any]:
    result = _client()
    if not result:
        return {"sources": [], "configured": False}
    client, Req, _, DR, Dim, Met, OB, _, _ = result
    p = _pid()
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

async def get_daily_active_users(days: int = 30) -> Dict[str, Any]:
    result = _client()
    if not result:
        return {"series": [], "configured": False}
    client, Req, _, DR, Dim, Met, OB, _, _ = result
    p = _pid()
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

async def get_engagement_metrics(days: int = 30) -> Dict[str, Any]:
    result = _client()
    if not result:
        return {"bounce_rate": 0, "engagement_rate": 0, "views_per_session": 0, "configured": False}
    client, Req, _, DR, Dim, Met, _, _, _ = result
    p = _pid()
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
