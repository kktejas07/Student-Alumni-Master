"""
Agent K Scheduled (cron) automations — backend test suite.

Covers:
  GET    /api/agent-k/scheduled-meta/cadences   (no auth)
  GET    /api/agent-k/scheduled                 (auth required)
  POST   /api/agent-k/scheduled                 (create)
  GET    /api/agent-k/scheduled/{id}            (fetch single + 404 + 401)
  PATCH  /api/agent-k/scheduled/{id}            (partial update)
  DELETE /api/agent-k/scheduled/{id}            (idempotent)
  POST   /api/agent-k/scheduled/{id}/run-now    (immediate fire)
  GET    /api/agent-k/scheduled/{id}/runs       (runs list)

Plus validation edge cases:
  invalid cron / unknown timezone / cron without cron_expr /
  short/long title / short prompt / 25-cap / user-isolation /
  next_run_at math for Asia/Kolkata.

Smoke-pass on /api/admin/super/events POST/PATCH/DELETE (no regression).
"""
from __future__ import annotations
import os
import sys
import json
import time
import uuid
import requests
from datetime import datetime, timezone, timedelta

BASE = os.environ.get("BACKEND_BASE", "http://localhost:8001/api")
ADMIN_EMAIL = "admin@careerpath.app"
ADMIN_PW    = "Admin@12345"
STUDENT_EMAIL = "student01@test.com"
STUDENT_PW    = "TestPass@123"

passes: list[str] = []
fails:  list[str] = []


def _ok(label: str):
    passes.append(label)
    print(f"  ✅ {label}")


def _fail(label: str, detail: str = ""):
    fails.append(f"{label} :: {detail}")
    print(f"  ❌ {label} :: {detail}")


def _login(email: str, password: str) -> str:
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    return r.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ────────────────────────────────────────────────────────────────────────
# 1. Login
# ────────────────────────────────────────────────────────────────────────
print("\n── 1. Login (admin + secondary user)")
admin_tok = _login(ADMIN_EMAIL, ADMIN_PW)
print(f"  admin token OK ({len(admin_tok)} chars)")
student_tok = _login(STUDENT_EMAIL, STUDENT_PW)
print(f"  student token OK ({len(student_tok)} chars)")

# Record baseline schedule count for admin
r = requests.get(f"{BASE}/agent-k/scheduled", headers=_auth(admin_tok), timeout=15)
assert r.status_code == 200, r.text
baseline_count = r.json()["count"]
print(f"  baseline admin schedules: {baseline_count}")

created_ids: list[str] = []  # to cleanup


# ────────────────────────────────────────────────────────────────────────
# 2. Cadences meta (no auth)
# ────────────────────────────────────────────────────────────────────────
print("\n── 2. GET /agent-k/scheduled-meta/cadences (no auth)")
try:
    r = requests.get(f"{BASE}/agent-k/scheduled-meta/cadences", timeout=15)
    if r.status_code != 200:
        _fail("cadences meta status 200", f"got {r.status_code}")
    else:
        body = r.json()
        if not isinstance(body.get("cadences"), list) or len(body["cadences"]) < 4:
            _fail("cadences list >= 4", json.dumps(body)[:200])
        else:
            _ok("cadences list returned")
        vals = [c["value"] for c in body.get("cadences", [])]
        if set(["daily", "weekly", "hourly", "cron"]).issubset(set(vals)):
            _ok("cadences include daily/weekly/hourly/cron")
        else:
            _fail("cadences include daily/weekly/hourly/cron", str(vals))
        if body.get("weekdays") and len(body["weekdays"]) == 7:
            _ok("weekdays list length 7")
        else:
            _fail("weekdays list length 7", str(body.get("weekdays")))
        if "UTC" in (body.get("common_timezones") or []):
            _ok("common_timezones contains UTC")
        else:
            _fail("common_timezones contains UTC", str(body.get("common_timezones")))
except Exception as e:
    _fail("cadences meta call", str(e))


# ────────────────────────────────────────────────────────────────────────
# 3. List requires auth
# ────────────────────────────────────────────────────────────────────────
print("\n── 3. GET /agent-k/scheduled — auth gating")
r = requests.get(f"{BASE}/agent-k/scheduled", timeout=15)
if r.status_code == 401:
    _ok("list without token → 401")
else:
    _fail("list without token → 401", f"got {r.status_code}: {r.text[:120]}")

r = requests.get(f"{BASE}/agent-k/scheduled", headers={"Authorization": "Bearer not-a-real-token"}, timeout=15)
if r.status_code == 401:
    _ok("list with bogus token → 401")
else:
    _fail("list with bogus token → 401", f"got {r.status_code}")

r = requests.get(f"{BASE}/agent-k/scheduled", headers=_auth(admin_tok), timeout=15)
if r.status_code == 200 and isinstance(r.json().get("schedules"), list):
    _ok("list with admin token → 200 + schedules[]")
else:
    _fail("list with admin token", f"{r.status_code} {r.text[:120]}")


# ────────────────────────────────────────────────────────────────────────
# 4. POST — create schedules for each cadence
# ────────────────────────────────────────────────────────────────────────
print("\n── 4. POST /agent-k/scheduled — create for each cadence")

def _create(token, payload, label) -> str | None:
    r = requests.post(f"{BASE}/agent-k/scheduled", headers=_auth(token), json=payload, timeout=15)
    if r.status_code != 200:
        _fail(f"create {label}", f"{r.status_code} {r.text[:200]}")
        return None
    j = r.json()
    if not j.get("ok") or not j.get("schedule", {}).get("id"):
        _fail(f"create {label} shape", str(j)[:200])
        return None
    sid = j["schedule"]["id"]
    created_ids.append(sid)
    _ok(f"create {label} → {sid}")
    return sid

daily_id = _create(admin_tok, {
    "title": "Daily 9am Kolkata test",
    "prompt": "Summarize my top 3 job matches and draft brief notes.",
    "cadence": "daily",
    "hour": 9, "minute": 0,
    "timezone": "Asia/Kolkata",
}, "daily Asia/Kolkata 09:00")

weekly_id = _create(admin_tok, {
    "title": "Weekly Monday digest",
    "prompt": "Compile this week's mentor sessions and pending applications.",
    "cadence": "weekly",
    "hour": 8, "minute": 30, "weekday": 0,
    "timezone": "UTC",
}, "weekly Mon 08:30 UTC")

hourly_id = _create(admin_tok, {
    "title": "Hourly check 6h",
    "prompt": "Check the inbox for new mentor messages.",
    "cadence": "hourly", "interval_hours": 6,
    "timezone": "UTC",
}, "hourly 6h UTC")

cron_id = _create(admin_tok, {
    "title": "Cron at midnight",
    "prompt": "Generate a daily digest of platform activity for review.",
    "cadence": "cron",
    "cron_expr": "0 0 * * *",
    "timezone": "UTC",
}, "cron 0 0 * * * UTC")

# Verify the daily Asia/Kolkata schedule has correct next_run_at math
print("\n── 4b. next_run_at math (Asia/Kolkata 09:00 = 03:30 UTC)")
if daily_id:
    r = requests.get(f"{BASE}/agent-k/scheduled/{daily_id}", headers=_auth(admin_tok), timeout=15)
    if r.status_code == 200:
        nra = r.json().get("next_run_at")
        if nra:
            try:
                # Parse to datetime
                dt = datetime.fromisoformat(nra.replace("Z", "+00:00"))
                dt_utc = dt.astimezone(timezone.utc)
                if dt_utc.hour == 3 and dt_utc.minute == 30:
                    _ok(f"daily Asia/Kolkata 09:00 → UTC 03:30 (got {dt_utc.isoformat()})")
                else:
                    _fail("daily 09:00 Asia/Kolkata UTC math",
                          f"expected 03:30 UTC, got {dt_utc.hour:02d}:{dt_utc.minute:02d} ({nra})")
                # next_run_at must be in the future
                if dt_utc > datetime.now(timezone.utc):
                    _ok("next_run_at is in the future")
                else:
                    _fail("next_run_at in future", f"got {nra} (now={datetime.now(timezone.utc).isoformat()})")
            except Exception as e:
                _fail("parse next_run_at", str(e))
        else:
            _fail("next_run_at populated", "absent")
    else:
        _fail("GET daily schedule", f"{r.status_code} {r.text[:120]}")


# ────────────────────────────────────────────────────────────────────────
# 5. Validation edge cases (must return 422)
# ────────────────────────────────────────────────────────────────────────
print("\n── 5. Validation edge cases")

def _expect_422(payload, label, token=admin_tok):
    r = requests.post(f"{BASE}/agent-k/scheduled", headers=_auth(token), json=payload, timeout=15)
    if r.status_code == 422:
        _ok(f"422 — {label}")
    else:
        _fail(f"422 — {label}", f"got {r.status_code} {r.text[:200]}")

# Invalid cron expression
_expect_422({"title": "bad cron",
             "prompt": "Run this every misconfigured minute please.",
             "cadence": "cron",
             "cron_expr": "this is not a cron",
             "timezone": "UTC"}, "invalid cron expression")

# Unknown timezone
_expect_422({"title": "Mars time",
             "prompt": "Run on Mars timezone please.",
             "cadence": "daily", "hour": 9, "minute": 0,
             "timezone": "Mars/Olympus"}, "unknown timezone Mars/Olympus")

# Cron cadence without cron_expr
_expect_422({"title": "Cron without expr",
             "prompt": "Run cron with no expression.",
             "cadence": "cron",
             "timezone": "UTC"}, "cron cadence without cron_expr")

# Title too short
_expect_422({"title": "a",
             "prompt": "Sufficiently long prompt here.",
             "cadence": "daily",
             "hour": 9, "minute": 0,
             "timezone": "UTC"}, "title < 2 chars")

# Title too long
_expect_422({"title": "x" * 141,
             "prompt": "Sufficiently long prompt here.",
             "cadence": "daily",
             "hour": 9, "minute": 0,
             "timezone": "UTC"}, "title > 140 chars")

# Prompt too short
_expect_422({"title": "valid title",
             "prompt": "ab",
             "cadence": "daily",
             "hour": 9, "minute": 0,
             "timezone": "UTC"}, "prompt < 4 chars")


# ────────────────────────────────────────────────────────────────────────
# 6. GET single — 404 for bogus, 401 without auth, 404 for other user's id
# ────────────────────────────────────────────────────────────────────────
print("\n── 6. GET single schedule edge cases")
if daily_id:
    r = requests.get(f"{BASE}/agent-k/scheduled/{daily_id}", timeout=15)
    if r.status_code == 401:
        _ok("GET single without auth → 401")
    else:
        _fail("GET single without auth → 401", f"got {r.status_code}")

# Bogus 24-hex ObjectId
bogus_oid = "000000000000000000000000"
r = requests.get(f"{BASE}/agent-k/scheduled/{bogus_oid}", headers=_auth(admin_tok), timeout=15)
if r.status_code == 404:
    _ok("GET bogus ObjectId → 404")
else:
    _fail("GET bogus ObjectId → 404", f"got {r.status_code} {r.text[:120]}")

# user-isolation: student tries to fetch admin's schedule
if daily_id:
    r = requests.get(f"{BASE}/agent-k/scheduled/{daily_id}", headers=_auth(student_tok), timeout=15)
    if r.status_code == 404:
        _ok("user-isolation: student GET admin's id → 404")
    else:
        _fail("user-isolation: student GET admin's id → 404", f"got {r.status_code} {r.text[:120]}")


# ────────────────────────────────────────────────────────────────────────
# 7. PATCH — partial update (pause/resume, change cadence, edit cron etc.)
# ────────────────────────────────────────────────────────────────────────
print("\n── 7. PATCH /agent-k/scheduled/{id} partial updates")

if daily_id:
    # pause
    r = requests.patch(f"{BASE}/agent-k/scheduled/{daily_id}",
                       headers=_auth(admin_tok), json={"status": "paused"}, timeout=15)
    if r.status_code == 200 and r.json().get("schedule", {}).get("status") == "paused":
        _ok("PATCH status=paused")
    else:
        _fail("PATCH status=paused", f"{r.status_code} {r.text[:200]}")

    # resume
    r = requests.patch(f"{BASE}/agent-k/scheduled/{daily_id}",
                       headers=_auth(admin_tok), json={"status": "active"}, timeout=15)
    if r.status_code == 200 and r.json().get("schedule", {}).get("status") == "active":
        _ok("PATCH status=active (resume)")
    else:
        _fail("PATCH status=active", f"{r.status_code} {r.text[:200]}")

    # Change cadence + timezone + minute (becomes daily 14:00 UTC)
    r = requests.patch(f"{BASE}/agent-k/scheduled/{daily_id}",
                       headers=_auth(admin_tok),
                       json={"cadence": "daily", "hour": 14, "minute": 0, "timezone": "UTC"},
                       timeout=15)
    if r.status_code == 200:
        sch = r.json().get("schedule", {})
        if sch.get("hour") == 14 and sch.get("timezone") == "UTC":
            _ok("PATCH cadence/hour/timezone")
        else:
            _fail("PATCH cadence/hour/timezone", json.dumps(sch)[:200])
        # next_run_at must be in future (not ≤ now) after PATCH
        nra = sch.get("next_run_at")
        if nra:
            dt = datetime.fromisoformat(nra.replace("Z", "+00:00")).astimezone(timezone.utc)
            if dt > datetime.now(timezone.utc):
                _ok("next_run_at recomputed and > now after PATCH")
            else:
                _fail("next_run_at > now after PATCH", f"{nra} <= now")
    else:
        _fail("PATCH cadence/hour/timezone", f"{r.status_code} {r.text[:200]}")

if cron_id:
    # invalid cron_expr in PATCH → 422
    r = requests.patch(f"{BASE}/agent-k/scheduled/{cron_id}",
                       headers=_auth(admin_tok),
                       json={"cron_expr": "not a cron"}, timeout=15)
    if r.status_code == 422:
        _ok("PATCH invalid cron_expr → 422")
    else:
        _fail("PATCH invalid cron_expr → 422", f"got {r.status_code} {r.text[:120]}")

    # bad timezone in PATCH → 422
    r = requests.patch(f"{BASE}/agent-k/scheduled/{cron_id}",
                       headers=_auth(admin_tok),
                       json={"timezone": "Mars/Olympus"}, timeout=15)
    if r.status_code == 422:
        _ok("PATCH bad timezone → 422")
    else:
        _fail("PATCH bad timezone → 422", f"got {r.status_code} {r.text[:120]}")

    # valid cron edit
    r = requests.patch(f"{BASE}/agent-k/scheduled/{cron_id}",
                       headers=_auth(admin_tok),
                       json={"cron_expr": "15 8 * * 1-5"}, timeout=15)
    if r.status_code == 200 and r.json().get("schedule", {}).get("cron_expr") == "15 8 * * 1-5":
        _ok("PATCH cron_expr to valid value")
    else:
        _fail("PATCH cron_expr valid", f"{r.status_code} {r.text[:200]}")

# PATCH another user's schedule → 404
if daily_id:
    r = requests.patch(f"{BASE}/agent-k/scheduled/{daily_id}",
                       headers=_auth(student_tok),
                       json={"status": "paused"}, timeout=15)
    if r.status_code == 404:
        _ok("user-isolation: student PATCH admin's id → 404")
    else:
        _fail("user-isolation: student PATCH admin's id → 404", f"got {r.status_code} {r.text[:120]}")


# ────────────────────────────────────────────────────────────────────────
# 8. POST run-now (admin should bypass BYO-AI gate → last_status=completed)
# ────────────────────────────────────────────────────────────────────────
print("\n── 8. POST /agent-k/scheduled/{id}/run-now")
if hourly_id:
    # capture pre-state
    pre = requests.get(f"{BASE}/agent-k/scheduled/{hourly_id}", headers=_auth(admin_tok), timeout=15).json()
    pre_runs = int(pre.get("runs_count") or 0)
    r = requests.post(f"{BASE}/agent-k/scheduled/{hourly_id}/run-now",
                      headers=_auth(admin_tok), timeout=60)
    if r.status_code == 200:
        sch = r.json().get("schedule", {})
        post_runs = int(sch.get("runs_count") or 0)
        if post_runs > pre_runs:
            _ok(f"run-now bumped runs_count {pre_runs} → {post_runs}")
        else:
            _fail("run-now bumps runs_count", f"pre={pre_runs} post={post_runs}")
        last_status = sch.get("last_status")
        # admin bypass: accept "completed", "no_steps", or any non-"no_ai_provider"
        if last_status == "no_ai_provider":
            _fail("admin bypass BYO-AI gate",
                  f"last_status='no_ai_provider' for admin user — admin should bypass")
        elif last_status:
            _ok(f"run-now last_status='{last_status}' (admin bypass)")
        else:
            _fail("last_status set", str(sch)[:200])
    else:
        _fail("run-now 200", f"{r.status_code} {r.text[:300]}")


# ────────────────────────────────────────────────────────────────────────
# 9. GET runs list
# ────────────────────────────────────────────────────────────────────────
print("\n── 9. GET /agent-k/scheduled/{id}/runs")
if hourly_id:
    r = requests.get(f"{BASE}/agent-k/scheduled/{hourly_id}/runs",
                     headers=_auth(admin_tok), timeout=15)
    if r.status_code == 200:
        runs = r.json().get("runs", [])
        if isinstance(runs, list):
            _ok(f"runs list returned ({len(runs)} runs)")
        else:
            _fail("runs is list", type(runs).__name__)
        # NOTE: runs list filter is `schedule_id` string — only runs whose plan succeeded would be inserted.
        # If admin's first run had no plan errors, we expect >= 1 run.
        if len(runs) >= 1:
            _ok("at least 1 run logged via run-now")
        else:
            print(f"  ℹ run-now may have errored before insertion (last_status above) — runs list is empty")
    else:
        _fail("GET runs 200", f"{r.status_code} {r.text[:200]}")


# ────────────────────────────────────────────────────────────────────────
# 10. DELETE — idempotency
# ────────────────────────────────────────────────────────────────────────
print("\n── 10. DELETE /agent-k/scheduled/{id} idempotency")
if cron_id:
    r = requests.delete(f"{BASE}/agent-k/scheduled/{cron_id}", headers=_auth(admin_tok), timeout=15)
    if r.status_code == 200 and r.json().get("ok"):
        _ok("1st DELETE → 200 ok=true")
        created_ids.remove(cron_id) if cron_id in created_ids else None
    else:
        _fail("1st DELETE 200", f"{r.status_code} {r.text[:200]}")
    r = requests.delete(f"{BASE}/agent-k/scheduled/{cron_id}", headers=_auth(admin_tok), timeout=15)
    if r.status_code == 404:
        _ok("2nd DELETE same id → 404")
    else:
        _fail("2nd DELETE → 404", f"got {r.status_code} {r.text[:200]}")

# DELETE another user's schedule → 404
if daily_id:
    r = requests.delete(f"{BASE}/agent-k/scheduled/{daily_id}", headers=_auth(student_tok), timeout=15)
    if r.status_code == 404:
        _ok("user-isolation: student DELETE admin's id → 404")
    else:
        _fail("user-isolation: student DELETE admin's id → 404", f"got {r.status_code} {r.text[:120]}")


# ────────────────────────────────────────────────────────────────────────
# 11. Per-user 25-cap → 26th POST → 429
# ────────────────────────────────────────────────────────────────────────
print("\n── 11. Per-user 25-schedule cap → 429 on 26th")
# Count current admin schedules
r = requests.get(f"{BASE}/agent-k/scheduled", headers=_auth(admin_tok), timeout=15)
current = r.json()["count"]
print(f"  current admin schedules: {current}")
fill_ids: list[str] = []
target = 25
# Create up to 25 total
needed = max(0, target - current)
print(f"  creating {needed} placeholder schedules to reach the cap")
for i in range(needed):
    payload = {
        "title": f"cap-test-{i}-{uuid.uuid4().hex[:6]}",
        "prompt": "Cap test schedule — auto cleanup.",
        "cadence": "daily", "hour": 23, "minute": 59,
        "timezone": "UTC",
    }
    rr = requests.post(f"{BASE}/agent-k/scheduled", headers=_auth(admin_tok), json=payload, timeout=15)
    if rr.status_code == 200:
        fill_ids.append(rr.json()["schedule"]["id"])
    else:
        print(f"  fill {i} failed: {rr.status_code} {rr.text[:120]}")
        break

# Recount
r = requests.get(f"{BASE}/agent-k/scheduled", headers=_auth(admin_tok), timeout=15)
print(f"  post-fill admin schedules: {r.json()['count']}")
# 26th
r = requests.post(f"{BASE}/agent-k/scheduled", headers=_auth(admin_tok),
                  json={"title": "26th must fail",
                        "prompt": "This should be capped.",
                        "cadence": "daily", "hour": 1, "minute": 0,
                        "timezone": "UTC"}, timeout=15)
if r.status_code == 429:
    _ok("26th POST → 429 Schedule limit reached")
else:
    _fail("26th POST → 429", f"got {r.status_code} {r.text[:200]}")
    # If it accidentally succeeded, record id for cleanup
    if r.status_code == 200:
        fill_ids.append(r.json()["schedule"]["id"])


# ────────────────────────────────────────────────────────────────────────
# 12. CLEANUP — delete every schedule we created
# ────────────────────────────────────────────────────────────────────────
print("\n── 12. Cleanup")
all_ids = set(created_ids) | set(fill_ids)
print(f"  deleting {len(all_ids)} schedules created during this run")
for sid in list(all_ids):
    try:
        requests.delete(f"{BASE}/agent-k/scheduled/{sid}", headers=_auth(admin_tok), timeout=15)
    except Exception:
        pass

# Confirm count back to baseline
r = requests.get(f"{BASE}/agent-k/scheduled", headers=_auth(admin_tok), timeout=15)
post_count = r.json()["count"]
if post_count == baseline_count:
    _ok(f"cleanup: admin count back to baseline ({baseline_count})")
else:
    _fail("cleanup baseline", f"baseline={baseline_count} post={post_count}")


# ────────────────────────────────────────────────────────────────────────
# 13. Smoke pass — admin super events CRUD (regression)
# ────────────────────────────────────────────────────────────────────────
print("\n── 13. Smoke /admin/super/events CRUD (regression)")
r = requests.post(f"{BASE}/admin/super/events", json={
    "title": "Regression Smoke Event",
    "category": "Workshop",
    "mode": "Online",
    "capacity": 200,
}, timeout=15)
if r.status_code == 200 and r.json().get("ok"):
    ev = r.json()["event"]
    ev_id = ev.get("id") or ev.get("_id")
    _ok(f"POST /admin/super/events → 200 (id={ev_id})")
    # PATCH
    rp = requests.patch(f"{BASE}/admin/super/events/{ev_id}", json={"title": "Regression Smoke Event — updated"}, timeout=15)
    if rp.status_code == 200 and "updated" in rp.json().get("event", {}).get("title", ""):
        _ok("PATCH /admin/super/events/{id} → 200 title updated")
    else:
        _fail("PATCH admin super events", f"{rp.status_code} {rp.text[:200]}")
    # DELETE
    rd = requests.delete(f"{BASE}/admin/super/events/{ev_id}", timeout=15)
    if rd.status_code == 200 and rd.json().get("ok"):
        _ok("DELETE /admin/super/events/{id} → 200")
    else:
        _fail("DELETE admin super events", f"{rd.status_code} {rd.text[:200]}")
else:
    _fail("POST /admin/super/events", f"{r.status_code} {r.text[:300]}")


# ────────────────────────────────────────────────────────────────────────
# 14. Scheduler runtime — best-effort log check
# ────────────────────────────────────────────────────────────────────────
print("\n── 14. APScheduler runtime (best-effort)")
try:
    with open("/var/log/supervisor/backend.err.log", "r") as f:
        log_data = f.read()
    if "agent-k.scheduled scheduler started (tick=60s)" in log_data:
        _ok("scheduler boot log line present")
    else:
        print("  ⚠ scheduler boot line NOT found — log might have been truncated")
    # Look for recent tick within last 90s? Just verify any tick occurred
    if "_tick_due_schedules" in log_data:
        _ok("APScheduler tick reference present in log")
    else:
        print("  ⚠ tick reference not found (best-effort check)")
except Exception as e:
    print(f"  ⚠ cannot read backend.err.log: {e} (skipping runtime check)")


# ────────────────────────────────────────────────────────────────────────
# Summary
# ────────────────────────────────────────────────────────────────────────
print("\n" + "=" * 72)
print(f"PASS:  {len(passes)}")
print(f"FAIL:  {len(fails)}")
if fails:
    print("\nFAILURES:")
    for f in fails:
        print(f"  ✗ {f}")
print("=" * 72)
sys.exit(0 if not fails else 1)
