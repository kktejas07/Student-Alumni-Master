"""
revenue.py — Super Admin revenue analytics (PY4).

Date-ranged revenue reporting over every recorded payment surface:

  • Monthly/daily trend over the selected window
  • Revenue by source (mentor sessions, event registrations, marketplace, other)
  • Top events by revenue
  • KPIs with delta % against the immediately preceding period of equal length

Ranges: `7d` / `30d` / `90d` / `ytd` / `custom` (from + to, YYYY-MM-DD).
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, Query

from core.db import db
from core.deps import require_role

router = APIRouter(prefix="/admin/revenue", tags=["Admin Revenue"])

# (label, collection, match, amount field, date fields, dedupe key)
SOURCES: List[Tuple[str, str, Dict[str, Any], str, List[str], Optional[str]]] = [
    (
        "Mentor sessions", "bookings",
        {"status": {"$in": ["completed", "confirmed", "paid", "done"]}},
        "amount_paid", ["completed_at", "created_at"], None,
    ),
    (
        "Event registrations", "echo_registrations",
        {"payment.status": "paid"},
        "payment.amount", ["payment.paid_at", "created_at"], "payment.payment_id",
    ),
    (
        "Marketplace", "echo_orders",
        {"status": "paid", "payment_status": {"$ne": "free"}},
        "final_amount", ["paid_at", "created_at"], None,
    ),
    (
        "Other payments", "payments", {},
        "amount", ["created_at"], None,
    ),
]


def _to_datetime(value: Any) -> Optional[datetime]:
    """Coerce a stored timestamp (datetime or ISO string) to an aware datetime."""
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str) and value:
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    return None


def _pick_date(doc: Dict[str, Any], fields: List[str]) -> Optional[datetime]:
    for f in fields:
        dt = _to_datetime(_dotted(doc, f))
        if dt:
            return dt
    return None


def _dotted(doc: Dict[str, Any], field: str) -> Any:
    """Read a possibly-dotted field path from a plain dict."""
    cur: Any = doc
    for part in field.split("."):
        if not isinstance(cur, dict):
            return None
        cur = cur.get(part)
    return cur


def _amount_of(doc: Dict[str, Any], field: str) -> float:
    """Read a possibly-dotted amount field, tolerating missing/None values."""
    cur = _dotted(doc, field)
    try:
        return float(cur or 0)
    except (TypeError, ValueError):
        return 0.0


def _resolve_range(preset: str, frm: Optional[str], to: Optional[str]) -> Tuple[datetime, datetime, str]:
    """Return (start, end, label) for the requested window."""
    now = datetime.now(timezone.utc)
    end = now
    preset = (preset or "30d").lower()

    if preset == "custom":
        start = None
        if frm:
            start = _to_datetime(f"{frm}T00:00:00+00:00")
        if to:
            end_dt = _to_datetime(f"{to}T23:59:59+00:00")
            if end_dt:
                end = end_dt
        if start is None:
            start = end - timedelta(days=30)
    elif preset == "ytd":
        start = end.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    elif preset == "7d":
        start = end - timedelta(days=7)
    elif preset == "90d":
        start = end - timedelta(days=90)
    else:
        preset = "30d"
        start = end - timedelta(days=30)

    if start > end:
        start, end = end, start
    return start, end, preset


async def _collect(start: datetime, end: datetime) -> Dict[str, List[dict]]:
    """Fetch every revenue-bearing document in the window, per source."""
    out: Dict[str, List[dict]] = {}
    for label, coll, match, _amount, _dates, _dedupe in SOURCES:
        try:
            cursor = db[coll].find(match).limit(20000)
            docs = [d async for d in cursor]
        except Exception:
            docs = []
        out[label] = docs
    return out


def _rows_in_window(docs: List[dict], label: str, start: datetime, end: datetime) -> List[Tuple[datetime, float, dict]]:
    """Filter docs to the window and return (date, amount, doc) tuples."""
    spec = next((s for s in SOURCES if s[0] == label), None)
    if not spec:
        return []
    _l, _c, _m, amount_field, date_fields, dedupe = spec
    rows: List[Tuple[datetime, float, dict]] = []
    seen: set = set()
    for d in docs:
        dt = _pick_date(d, date_fields)
        if not dt or not (start <= dt <= end):
            continue
        amount = _amount_of(d, amount_field)
        if amount <= 0:
            continue
        if dedupe:
            key = _dotted(d, dedupe) or ""
            if not key:
                continue
            if key.startswith("ADMIN_PAY_"):
                continue
            if key in seen:
                continue
            seen.add(key)
        rows.append((dt, amount, d))
    return rows


def _bucket_label(dt: datetime, daily: bool) -> str:
    if daily:
        return dt.strftime("%d %b")
    return dt.strftime("%b %Y")


async def _analyze(start: datetime, end: datetime) -> Dict[str, Any]:
    docs_by_source = await _collect(start, end)
    span_days = max((end - start).days, 1)
    daily = span_days <= 92

    trend_map: Dict[str, float] = {}
    source_totals: List[dict] = []
    event_map: Dict[str, Dict[str, Any]] = {}
    gross = 0.0
    txn_count = 0

    for label, _coll, _match, _amount, _dates, _dedupe in SOURCES:
        rows = _rows_in_window(docs_by_source.get(label, []), label, start, end)
        total = 0.0
        for dt, amount, doc in rows:
            total += amount
            gross += amount
            txn_count += 1
            key = _bucket_label(dt, daily)
            trend_map[key] = trend_map.get(key, 0.0) + amount

            if label == "Event registrations":
                slug = doc.get("slug") or doc.get("showcase_slug") or "unknown"
                entry = event_map.setdefault(slug, {
                    "slug": slug,
                    "title": doc.get("showcase_title") or slug,
                    "revenue": 0.0,
                    "count": 0,
                })
                entry["revenue"] += amount
                entry["count"] += 1

        if total > 0:
            source_totals.append({
                "label": label,
                "value": round(total, 2),
                "count": len(rows),
            })

    # Build a dense, ordered trend series across the whole window.
    trend: List[dict] = []
    if daily:
        cursor = start
        while cursor <= end:
            label = _bucket_label(cursor, True)
            trend.append({"label": label, "value": round(trend_map.get(label, 0.0), 2)})
            cursor += timedelta(days=1)
    else:
        # Monthly buckets, walked from the first of the start month.
        cursor = start.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        while cursor <= end:
            label = _bucket_label(cursor, False)
            trend.append({"label": label, "value": round(trend_map.get(label, 0.0), 2)})
            cursor = (cursor.replace(day=28) + timedelta(days=4)).replace(day=1)

    top_events = sorted(event_map.values(), key=lambda e: e["revenue"], reverse=True)[:10]
    for e in top_events:
        e["revenue"] = round(e["revenue"], 2)

    source_totals.sort(key=lambda s: s["value"], reverse=True)
    refunds_total = 0.0
    refunds_count = 0
    try:
        async for r in db.payment_refunds.find({"status": {"$ne": "failed"}}):
            created = _to_datetime(r.get("created_at"))
            if created and start <= created <= end:
                refunds_total += float(r.get("amount") or 0)
                refunds_count += 1
    except Exception:
        pass

    return {
        "gross": round(gross, 2),
        "transactions": txn_count,
        "avg_order": round(gross / txn_count, 2) if txn_count else 0.0,
        "refunds": round(refunds_total, 2),
        "refund_count": refunds_count,
        "net": round(gross - refunds_total, 2),
        "trend": trend,
        "by_source": source_totals,
        "top_events": top_events,
    }


def _delta_pct(current: float, previous: float) -> Optional[float]:
    if previous <= 0:
        return None if current > 0 else 0.0
    return round((current - previous) / previous * 100, 1)


@router.get("/analytics")
async def revenue_analytics(
    range: str = Query("30d"),
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = Query(None),
    user: dict = Depends(require_role("admin")),
):
    """Revenue analytics for the selected window, with previous-period deltas."""
    start, end, preset = _resolve_range(range, from_, to)
    span = end - start
    prev_end = start
    prev_start = start - span

    current = await _analyze(start, end)
    previous = await _analyze(prev_start, prev_end)

    return {
        "ok": True,
        "range": {
            "preset": preset,
            "from": start.strftime("%Y-%m-%d"),
            "to": end.strftime("%Y-%m-%d"),
            "days": max((end - start).days, 1),
        },
        "kpi": {
            "gross": current["gross"],
            "transactions": current["transactions"],
            "avg_order": current["avg_order"],
            "refunds": current["refunds"],
            "refund_count": current["refund_count"],
            "net": current["net"],
        },
        "previous": {
            "gross": previous["gross"],
            "transactions": previous["transactions"],
            "avg_order": previous["avg_order"],
            "refunds": previous["refunds"],
            "net": previous["net"],
        },
        "delta": {
            "gross_pct": _delta_pct(current["gross"], previous["gross"]),
            "transactions_pct": _delta_pct(current["transactions"], previous["transactions"]),
            "avg_order_pct": _delta_pct(current["avg_order"], previous["avg_order"]),
            "net_pct": _delta_pct(current["net"], previous["net"]),
            "refunds_pct": _delta_pct(current["refunds"], previous["refunds"]),
        },
        "trend": current["trend"],
        "previous_trend": previous["trend"],
        "by_source": current["by_source"],
        "top_events": current["top_events"],
    }
