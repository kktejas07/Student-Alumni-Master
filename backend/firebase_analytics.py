"""
Firebase Analytics Data API integration.
Queries GA4 for real-time and historical analytics data.
Requires: google-analytics-data package, Firebase service account, GA4 Property ID.
"""
import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

PROPERTY_ID = os.environ.get("FIREBASE_ANALYTICS_PROPERTY_ID", "")
CREDS_PATH = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")


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


def _parse_property_id() -> str:
    """Normalize property ID to 'properties/XXXX' format."""
    pid = PROPERTY_ID.strip()
    if not pid:
        return ""
    if not pid.startswith("properties/"):
        pid = f"properties/{pid}"
    return pid


async def get_realtime_active_users() -> Dict[str, Any]:
    """Get real-time active users from GA4."""
    result = _client()
    if not result:
        return {"active_users": 0, "configured": False}
    client, RunRealtimeReportRequest, _, _, Dimension, Metric, _, _, _ = result
    pid = _parse_property_id()
    if not pid:
        return {"active_users": 0, "configured": False}
    try:
        request = RunRealtimeReportRequest(
            property=pid,
            metrics=[Metric(name="activeUsers")],
        )
        response = client.run_realtime_report(request)
        count = 0
        for row in response.rows:
            count += int(row.metric_values[0].value)
        return {"active_users": count, "configured": True}
    except Exception as e:
        logger.warning(f"Firebase realtime query failed: {e}")
        return {"active_users": 0, "configured": True, "error": str(e)}


async def get_user_acquisition(days: int = 30) -> Dict[str, Any]:
    """Get user acquisition sources from GA4."""
    result = _client()
    if not result:
        return {"sources": [], "configured": False}
    client, Req, _, DR, Dim, Met, OB, _, _ = result
    pid = _parse_property_id()
    if not pid:
        return {"sources": [], "configured": False}
    try:
        end = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        start = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
        request = Req(
            property=pid,
            date_ranges=[DR(start_date=start, end_date=end)],
            dimensions=[Dim(name="sessionSource")],
            metrics=[Met(name="sessions")],
            order_bys=[OB(metric=Met(name="sessions"), desc=True)],
            limit=10,
        )
        response = client.run_report(request)
        sources = []
        for row in response.rows:
            sources.append({
                "source": row.dimension_values[0].value,
                "sessions": int(row.metric_values[0].value),
            })
        return {"sources": sources, "configured": True}
    except Exception as e:
        logger.warning(f"Firebase acquisition query failed: {e}")
        return {"sources": [], "configured": True, "error": str(e)}


async def get_geographic_data(days: int = 30) -> Dict[str, Any]:
    """Get geographic distribution from GA4."""
    result = _client()
    if not result:
        return {"countries": [], "cities": [], "configured": False}
    client, Req, _, DR, Dim, Met, OB, _, _ = result
    pid = _parse_property_id()
    if not pid:
        return {"countries": [], "cities": [], "configured": False}
    try:
        end = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        start = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
        # Countries
        country_req = Req(
            property=pid,
            date_ranges=[DR(start_date=start, end_date=end)],
            dimensions=[Dim(name="country")],
            metrics=[Met(name="activeUsers")],
            order_bys=[OB(metric=Met(name="activeUsers"), desc=True)],
            limit=15,
        )
        country_resp = client.run_report(country_req)
        countries = []
        for row in country_resp.rows:
            countries.append({
                "country": row.dimension_values[0].value,
                "count": int(row.metric_values[0].value),
            })
        # Cities
        city_req = Req(
            property=pid,
            date_ranges=[DR(start_date=start, end_date=end)],
            dimensions=[Dim(name="city"), Dim(name="country")],
            metrics=[Met(name="activeUsers")],
            order_bys=[OB(metric=Met(name="activeUsers"), desc=True)],
            limit=10,
        )
        city_resp = client.run_report(city_req)
        cities = []
        for row in city_resp.rows:
            cities.append({
                "city": row.dimension_values[0].value,
                "country": row.dimension_values[1].value,
                "count": int(row.metric_values[0].value),
            })
        return {"countries": countries, "cities": cities, "configured": True}
    except Exception as e:
        logger.warning(f"Firebase geo query failed: {e}")
        return {"countries": [], "cities": [], "configured": True, "error": str(e)}


async def get_device_data(days: int = 30) -> Dict[str, Any]:
    """Get device/browser/OS breakdown from GA4."""
    result = _client()
    if not result:
        return {"by_os": [], "by_browser": [], "by_device": [], "configured": False}
    client, Req, _, DR, Dim, Met, OB, _, _ = result
    pid = _parse_property_id()
    if not pid:
        return {"by_os": [], "by_browser": [], "by_device": [], "configured": False}
    try:
        end = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        start = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
        # OS
        os_req = Req(
            property=pid,
            date_ranges=[DR(start_date=start, end_date=end)],
            dimensions=[Dim(name="operatingSystem")],
            metrics=[Met(name="activeUsers")],
            order_bys=[OB(metric=Met(name="activeUsers"), desc=True)],
            limit=8,
        )
        os_resp = client.run_report(os_req)
        by_os = [{"label": r.dimension_values[0].value, "value": int(r.metric_values[0].value)} for r in os_resp.rows]
        # Browser
        br_req = Req(
            property=pid,
            date_ranges=[DR(start_date=start, end_date=end)],
            dimensions=[Dim(name="browser")],
            metrics=[Met(name="activeUsers")],
            order_bys=[OB(metric=Met(name="activeUsers"), desc=True)],
            limit=8,
        )
        br_resp = client.run_report(br_req)
        by_browser = [{"label": r.dimension_values[0].value, "value": int(r.metric_values[0].value)} for r in br_resp.rows]
        # Device category
        dev_req = Req(
            property=pid,
            date_ranges=[DR(start_date=start, end_date=end)],
            dimensions=[Dim(name="deviceCategory")],
            metrics=[Met(name="activeUsers")],
            order_bys=[OB(metric=Met(name="activeUsers"), desc=True)],
        )
        dev_resp = client.run_report(dev_req)
        by_device = [{"label": r.dimension_values[0].value, "value": int(r.metric_values[0].value)} for r in dev_resp.rows]
        return {"by_os": by_os, "by_browser": by_browser, "by_device": by_device, "configured": True}
    except Exception as e:
        logger.warning(f"Firebase device query failed: {e}")
        return {"by_os": [], "by_browser": [], "by_device": [], "configured": True, "error": str(e)}


async def get_daily_active_users(days: int = 30) -> Dict[str, Any]:
    """Get daily active users time series from GA4."""
    result = _client()
    if not result:
        return {"series": [], "configured": False}
    client, Req, _, DR, Dim, Met, OB, _, _ = result
    pid = _parse_property_id()
    if not pid:
        return {"series": [], "configured": False}
    try:
        end = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        start = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
        request = Req(
            property=pid,
            date_ranges=[DR(start_date=start, end_date=end)],
            dimensions=[Dim(name="date")],
            metrics=[Met(name="activeUsers")],
            order_bys=[OB(dimension=Dim(name="date"))],
        )
        response = client.run_report(request)
        series = []
        for row in response.rows:
            date_str = row.dimension_values[0].value
            series.append({
                "date": f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}",
                "count": int(row.metric_values[0].value),
            })
        return {"series": series, "configured": True}
    except Exception as e:
        logger.warning(f"Firebase DAU query failed: {e}")
        return {"series": [], "configured": True, "error": str(e)}
