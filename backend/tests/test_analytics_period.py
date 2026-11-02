"""Unit tests for the analytics date-range + previous-period comparison (AN1)."""
from datetime import datetime, timedelta, timezone

import pytest

from features.analytics import (
    _pct_change,
    _period_metrics,
    resolve_date_range,
)

NOW = datetime(2026, 11, 1, 12, 0, tzinfo=timezone.utc)


class FakeCollection:
    """Minimal stand-in for an async Mongo collection."""

    def __init__(self, docs):
        self.docs = docs

    def find(self, query):
        return FakeCursor([d for d in self.docs if _matches(d, query)])

    async def count_documents(self, query):
        return sum(1 for d in self.docs if _matches(d, query))

    def aggregate(self, pipeline):
        raise NotImplementedError


class FakeCursor:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, n=None):
        return self.docs[:n] if n else self.docs


def _dotted(doc, key):
    """Fetch a dotted key (e.g. `payment.status`) from a nested document."""
    cur = doc
    for part in key.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return None
        cur = cur[part]
    return cur


def _cmp(value, bound, op):
    """Compare a stored value against a query bound, ignoring type clashes."""
    if value is None:
        return False
    try:
        return bool(op(value, bound))
    except TypeError:
        return False


def _matches(doc, query):
    """Only the operators this module actually uses."""
    for key, cond in query.items():
        if key == "$or":
            if not any(_matches(doc, c) for c in cond):
                return False
            continue
        value = _dotted(doc, key)
        if isinstance(cond, dict):
            # Mongo evaluates each $or branch as its own query, so a datetime
            # value and an ISO-string bound never meet. The fake sees them
            # together — treat an incomparable pair as "no match".
            if "$gte" in cond and not _cmp(value, cond["$gte"], lambda a, b: a >= b):
                return False
            if "$lt" in cond and not _cmp(value, cond["$lt"], lambda a, b: a < b):
                return False
            if "$in" in cond and value not in cond["$in"]:
                return False
            if "$ne" in cond and value == cond["$ne"]:
                return False
    return True


class FakeDB:
    def __init__(self, **collections):
        self._collections = {
            name: docs if isinstance(docs, FakeCollection) else FakeCollection(docs)
            for name, docs in collections.items()
        }

    def __getitem__(self, name):
        return self._collections.get(name, FakeCollection([]))

    @property
    def users(self):
        return self["users"]

    @property
    def bookings(self):
        return self["bookings"]

    @property
    def activity_events(self):
        return self["activity_events"]


# ── resolve_date_range ───────────────────────────────────────────────────────

@pytest.mark.parametrize("key,days", [("7d", 7), ("30d", 30), ("90d", 90)])
def test_preset_ranges_have_requested_length(key, days):
    r = resolve_date_range(key, now=NOW)
    assert r["key"] == key
    assert r["days"] == days


def test_ytd_starts_on_january_first():
    r = resolve_date_range("ytd", now=NOW)
    assert r["start"].startswith("2026-01-01")
    assert r["days"] > 300


def test_custom_range_is_inclusive_of_the_end_day():
    r = resolve_date_range("custom", start="2026-10-01", end="2026-10-15", now=NOW)
    assert r["start"].startswith("2026-10-01")
    assert r["end"].startswith("2026-10-16")  # end day is exclusive
    assert r["days"] == 15


def test_previous_period_is_the_same_length_and_immediately_prior():
    r = resolve_date_range("30d", now=NOW)
    cur_start = datetime.fromisoformat(r["start"])
    cur_end = datetime.fromisoformat(r["end"])
    prev_start = datetime.fromisoformat(r["previous_start"])
    prev_end = datetime.fromisoformat(r["previous_end"])
    assert (cur_end - cur_start) == (prev_end - prev_start)
    assert prev_end == cur_start


def test_unknown_range_falls_back_to_30d():
    assert resolve_date_range("bogus", now=NOW)["key"] == "30d"
    assert resolve_date_range(None, now=NOW)["key"] == "30d"


# ── _pct_change ──────────────────────────────────────────────────────────────

def test_pct_change():
    assert _pct_change(110, 100) == 10.0
    assert _pct_change(90, 100) == -10.0
    assert _pct_change(50, 0) is None


# ── _period_metrics ──────────────────────────────────────────────────────────

async def test_period_metrics_counts_only_documents_inside_the_window():
    inside = NOW - timedelta(days=2)
    outside = NOW - timedelta(days=40)
    db = FakeDB(
        users=[{"created_at": inside}, {"created_at": outside}],
        bookings=[{"created_at": inside, "status": "completed", "amount_paid": 500}],
        activity_events=[],
    )
    r = resolve_date_range("7d", now=NOW)
    m = await _period_metrics(db, datetime.fromisoformat(r["start"]), datetime.fromisoformat(r["end"]))
    assert m["signups"] == 1
    assert m["bookings"] == 1
    assert m["revenue"] == 500.0
    assert len(m["daily"]) == 7


async def test_revenue_deduplicates_echo_registrations_by_payment_id():
    paid_at = NOW - timedelta(days=1)
    db = FakeDB(
        echo_registrations=[
            {"created_at": paid_at, "fee": 1000, "payment": {"status": "paid", "payment_id": "PAY_1"}},
            {"created_at": paid_at, "fee": 1000, "payment": {"status": "paid", "payment_id": "PAY_1"}},
            {"created_at": paid_at, "fee": 500, "payment": {"status": "paid", "payment_id": "ADMIN_PAY_X"}},
        ],
    )
    r = resolve_date_range("7d", now=NOW)
    m = await _period_metrics(db, datetime.fromisoformat(r["start"]), datetime.fromisoformat(r["end"]))
    assert m["revenue"] == 1000.0


async def test_previous_period_revenue_excludes_current_window():
    now = NOW
    db = FakeDB(
        echo_orders=[
            {"created_at": now - timedelta(days=2), "status": "paid", "payment_status": "paid", "final_amount": 700},
            {"created_at": now - timedelta(days=40), "status": "paid", "payment_status": "paid", "final_amount": 300},
        ],
    )
    r = resolve_date_range("30d", now=now)
    cur = await _period_metrics(db, datetime.fromisoformat(r["start"]), datetime.fromisoformat(r["end"]))
    prev = await _period_metrics(db, datetime.fromisoformat(r["previous_start"]), datetime.fromisoformat(r["previous_end"]))
    assert cur["revenue"] == 700.0
    assert prev["revenue"] == 300.0
