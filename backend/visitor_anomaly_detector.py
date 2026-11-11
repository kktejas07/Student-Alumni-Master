"""
visitor_anomaly_detector.py — Visitor Radar anomaly rules (VR8).

APScheduler job (every 5 min) scans telemetry and raises
`admin_notifications` docs (kind = visitor_anomaly_*) that the
`/api/admin/analytics/visitor-alerts` endpoint surfaces in the
super-admin radar. Each fired alert is also pushed to the live
WebSocket hub so connected admins see it in real time.

Rules
-----
traffic_spike   (warning)  latest 5-min session volume > 5x that
                           window's 7-day average
bot_suspect     (critical) a visitor logs 50+ page_views in < 60s
ip_flood        (critical) 20+ sessions from one IP within an hour
new_country     (info)     first-time traffic from a country unseen
                           in the last 30 days

Dedup: the same (rule, subject) is not re-alerted while a matching
note from the last 30 minutes still exists.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from core.db import db as _db

logger = logging.getLogger("visitor_anomaly_detector")

NOTIFICATIONS = "admin_notifications"
DEDUP_WINDOW = timedelta(minutes=30)

_scheduler = None


# ── rule scans ────────────────────────────────────────────────────────

async def _note(kind: str, severity: str, title: str, message: str,
                subject: str, details: Dict[str, Any]) -> bool:
    """Write one alert unless an identical (kind, subject) was raised
    in the last 30 minutes. Returns True when a new note was written."""
    if subject:
        dup = await _db[NOTIFICATIONS].find_one(
            {"kind": kind, "payload.subject": subject,
             "created_at": {"$gte": datetime.now(timezone.utc) - DEDUP_WINDOW}},
            no_cursor_timeout=True)
        if dup:
            return False
    doc = {
        "kind": kind,
        "severity": severity,
        "title": title,
        "message": message,
        "payload": {**details, "subject": subject, "rule": kind.split("_", 2)[-1]},
        "dismissed": False,
        "created_at": datetime.now(timezone.utc),
    }
    await _db[NOTIFICATIONS].insert_one(doc)
    return True


async def _scan_traffic_spike() -> List[Dict[str, Any]]:
    now = datetime.now(timezone.utc)
    bucket = (now.hour * 60 + now.minute) // 5  # 0..287 (5-min index of day)
    since5 = now - timedelta(minutes=5)
    since7d = now - timedelta(days=7)

    current = await _db.visitor_sessions.count_documents(
        {"created_at": {"$gte": since5}})

    hist_pipe = [
        {"$match": {"created_at": {"$gte": since7d, "$lt": since5}}},
        {"$project": {"bucket": {"$add": [
            {"$multiply": [{"$hour": "$created_at"}, 60]},
            {"$minute": "$created_at"}]}}},
        {"$project": {"b5": {"$floor": {"$divide": ["$bucket", 5]}}}},
        {"$group": {"_id": "$b5", "n": {"$sum": 1}}},
    ]
    hist = await _db.visitor_sessions.aggregate(hist_pipe).to_list(300)
    counts = {r["_id"]: int(r["n"]) for r in hist if r["_id"] is not None}
    avg = sum(counts.values()) / max(1, len(counts))

    alerts = []
    if current > max(5.0 * avg, 25.0):
        ok = await _note(
            "visitor_anomaly_traffic_spike", "warning",
            f"Traffic spike: {current} sessions in last 5 min",
            f"Latest 5-minute window is {round(current / avg, 1) if avg else 0}x "
            f"the 7-day average for this window (~{avg:.0f} sessions).",
            "window",
            {"current": current, "avg_7d": round(avg, 2),
             "bucket_index": bucket},
        )
        if ok:
            alerts.append({"severity": "warning",
                           "title": "Traffic spike",
                           "message": f"{current} sessions in 5 min "
                                      f"(~{avg:.0f} avg)"})
    return alerts


async def _scan_bot_suspect() -> List[Dict[str, Any]]:
    now = datetime.now(timezone.utc)
    since = now - timedelta(seconds=60)
    pipe = [
        {"$match": {"event_type": "page_view",
                    "timestamp": {"$gte": since}}},
        {"$group": {
            "_id": "$visitor_id",
            "n": {"$sum": 1},
            "last": {"$max": "$timestamp"},
        }},
        {"$match": {"n": {"$gte": 50}}},
    ]
    rows = await _db.visitor_events.aggregate(pipe).to_list(50)
    alerts = []
    for r in rows:
        vid = r["_id"] or "unknown"
        ok = await _note(
            "visitor_anomaly_bot_suspect", "critical",
            f"Bot suspect: {r['n']} page views in under a minute",
            f"Visitor {vid} generated {r['n']} page views in the last 60s.",
            str(vid),
            {"visitor_id": str(vid), "page_views": int(r["n"]),
             "window_seconds": 60},
        )
        if ok:
            alerts.append({"severity": "critical",
                           "title": "Bot suspect",
                           "message": f"Visitor {vid}: {r['n']} pageviews in 60s"})
    return alerts


async def _scan_ip_flood() -> List[Dict[str, Any]]:
    now = datetime.now(timezone.utc)
    since = now - timedelta(hours=1)
    pipe = [
        {"$match": {"created_at": {"$gte": since}}},
        {"$group": {"_id": "$ip", "n": {"$sum": 1}}},
        {"$match": {"n": {"$gte": 20}}},
        {"$limit": 25},
    ]
    rows = await _db.visitor_sessions.aggregate(pipe).to_list(25)
    alerts = []
    for r in rows:
        ip = r["_id"] or "unknown"
        ok = await _note(
            "visitor_anomaly_ip_flood", "critical",
            f"IP flood: {r['n']} sessions from {ip} in 1 hour",
            f"IP {ip} opened {r['n']} sessions in the last hour "
            f"(threshold 20).",
            ip,
            {"ip": ip, "sessions": int(r["n"]), "window_hours": 1},
        )
        if ok:
            alerts.append({"severity": "critical",
                           "title": "IP flood",
                           "message": f"{ip}: {r['n']} sessions in 1h"})
    return alerts


async def _scan_new_country() -> List[Dict[str, Any]]:
    now = datetime.now(timezone.utc)
    recent = await _db.visitor_sessions.distinct(
        "geo.country", {"created_at": {"$gte": now - timedelta(hours=36)}})
    known = await _db.visitor_sessions.distinct(
        "geo.country", {"created_at": {"$lt": now - timedelta(hours=36),
                                       "$gte": now - timedelta(days=30)}})
    recent_set = {c for c in (recent or []) if c and c not in ("Unknown",)}
    known_set = {k for k in (known or []) if k and k not in ("Unknown",)}
    alerts = []
    for c in sorted(recent_set - known_set):
        cnt = await _db.visitor_sessions.count_documents(
            {"geo.country": c, "created_at": {"$gte": now - timedelta(hours=36)}})
        ok = await _note(
            "visitor_anomaly_new_country", "info",
            f"New country: first traffic from {c}",
            f"Received {cnt} sessions from {c} — no traffic from this "
            f"country in the previous 30 days.",
            c,
            {"country": c, "sessions_36h": int(cnt)},
        )
        if ok:
            alerts.append({"severity": "info",
                           "title": "New country",
                           "message": f"First traffic from {c} ({cnt} sessions)"})
    return alerts


# ── run + schedule ────────────────────────────────────────────────────

async def run_visitor_anomaly_scan() -> int:
    """Run all four rules; push fired alerts to the radar WebSocket
    hub and return the count of new notes written."""
    new_alerts: List[Dict[str, Any]] = []
    for scan in (_scan_traffic_spike, _scan_bot_suspect,
                 _scan_ip_flood, _scan_new_country):
        try:
            new_alerts.extend(await scan())
        except Exception as e:  # noqa: BLE001
            logger.warning("anomaly scan %s failed: %s",
                           getattr(scan, "__name__", "?"), e)
    if new_alerts:
        try:
            from websocket_hub import broadcast_radar
            for a in new_alerts:
                await broadcast_radar({"type": "visitor_alert", "data": a})
        except Exception as e:  # noqa: BLE001
            logger.debug("radar alert push failed: %s", e)
    if new_alerts:
        logger.info("visitor anomaly scan raised %d alert(s): %s",
                    len(new_alerts),
                    "; ".join(f"[{a['severity']}] {a['message']}"
                              for a in new_alerts))
    return len(new_alerts)


def start_visitor_anomaly_scheduler() -> None:
    """Every-5-minute APScheduler job. Mirrors the financial-aggregator
    scheduler pattern: no-op if already running."""
    global _scheduler
    if _scheduler is not None:
        return
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        _scheduler = AsyncIOScheduler()
        _scheduler.add_job(
            run_visitor_anomaly_scan,
            "interval",
            minutes=5,
            id="visitor_anomaly_scan",
            replace_existing=True,
        )
        _scheduler.start()
        # Initial scan shortly after boot so the alerts panel isn't
        # empty on a fresh deploy.
        _scheduler.add_job(
            run_visitor_anomaly_scan,
            "date",
            run_date=datetime.now(timezone.utc) + timedelta(seconds=20),
            id="visitor_anomaly_boot_scan",
        )
        logger.info("[vr8] visitor anomaly scheduler started (5m)")
    except Exception as e:  # noqa: BLE001
        logger.warning("[vr8] failed to start anomaly scheduler: %s", e)
        _scheduler = None


def stop_visitor_anomaly_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        try:
            _scheduler.shutdown(wait=False)
        except Exception:  # noqa: BLE001
            pass
        _scheduler = None
