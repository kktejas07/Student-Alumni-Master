"""
Test suite for:
  1) SA Credits Wallet (/api/wallet/*)
  2) Mentor Availability + Booking (/api/mentors/{id}/availability + /book)
  3) Mentor AI Studio (/api/mentor/ai-studio/* + /api/admin/seed-mentor-demo)

Run against the live preview URL.
"""
import os
import sys
import time
import uuid
import json
import requests

BASE = "https://hiring-mvvm.preview.emergentagent.com/api"

STUDENT_EMAIL = "realtime@studentalumni.in"
STUDENT_PASS = "RealTime@2026"
MENTOR_EMAIL = "mentor01@test.com"
MENTOR_PASS = "TestPass@123"
ADMIN_EMAIL = "admin@careerpath.app"
ADMIN_PASS = "Admin@12345"

# Collect results
results = []

def log(step, ok, msg=""):
    status = "PASS" if ok else "FAIL"
    line = f"[{status}] {step}"
    if msg:
        line += f" — {msg}"
    print(line)
    results.append({"step": step, "ok": ok, "msg": msg})

def login(email, pw):
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": pw}, timeout=30)
    if r.status_code != 200:
        raise SystemExit(f"Login failed for {email}: {r.status_code} {r.text}")
    data = r.json()
    tok = data.get("access_token")
    uid = (data.get("user") or {}).get("id")
    return tok, uid, data.get("user", {})

def headers(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


# ── LOGIN ALL ROLES ─────────────────────────────────────────────────────
print("\n=== LOGIN ===")
student_tok, student_id, student_user = login(STUDENT_EMAIL, STUDENT_PASS)
log("login student", bool(student_tok), f"id={student_id}")
mentor_tok, mentor_id, mentor_user = login(MENTOR_EMAIL, MENTOR_PASS)
log("login mentor", bool(mentor_tok), f"id={mentor_id}")
admin_tok, admin_id, admin_user = login(ADMIN_EMAIL, ADMIN_PASS)
log("login admin", bool(admin_tok), f"id={admin_id}")


# ═══════════════════════════════════════════════════════════════════════
# TASK 1 — SA CREDITS WALLET
# ═══════════════════════════════════════════════════════════════════════
print("\n=== TASK 1: SA CREDITS WALLET ===")

# 1.1 — Create a fresh user to test the NEW_USER_BONUS seed. If test with
# existing user, seed has already happened. Use a brand new account.
new_email = f"wallet_test_{uuid.uuid4().hex[:8]}@test.com"
new_pw = "TestPass@123"
reg = requests.post(f"{BASE}/auth/register", json={
    "email": new_email,
    "password": new_pw,
    "full_name": "Wallet Tester",
    "role": "student",
    "phone": "+911234567890",
    "dob": "2002-01-01",
    "country_code": "IN",
    "postal_code": "400001",
}, timeout=30)
log("register fresh wallet-test user", reg.status_code == 200, f"HTTP {reg.status_code}")
if reg.status_code == 200:
    new_tok = reg.json().get("access_token")
else:
    new_tok = None

# 1.2 — First call to /wallet/balance should seed NEW_USER_BONUS=320
if new_tok:
    r = requests.get(f"{BASE}/wallet/balance", headers=headers(new_tok), timeout=20)
    log("GET /wallet/balance — first call 200", r.status_code == 200, f"HTTP {r.status_code} {r.text[:200]}")
    if r.status_code == 200:
        body = r.json()
        shape_ok = all(k in body for k in ("balance_credits", "balance_inr_equivalent",
                                            "lifetime_earned", "lifetime_spent", "history"))
        log("balance shape has all 5 keys", shape_ok, f"keys={list(body.keys())}")
        log("balance_credits == 320 (NEW_USER_BONUS)", body.get("balance_credits") == 320,
            f"got {body.get('balance_credits')}")
        log("lifetime_earned == 320", body.get("lifetime_earned") == 320,
            f"got {body.get('lifetime_earned')}")
        log("lifetime_spent == 0", body.get("lifetime_spent") == 0,
            f"got {body.get('lifetime_spent')}")
        hist = body.get("history") or []
        log("history has >=1 welcome credit entry", len(hist) >= 1, f"len={len(hist)}")
        if hist:
            first = hist[0]
            log("history[0].type=='credit'", first.get("type") == "credit", f"got {first.get('type')}")
            log("history[0].amount==320", first.get("amount") == 320, f"got {first.get('amount')}")

# 1.3 — Second call should NOT double-seed
if new_tok:
    r2 = requests.get(f"{BASE}/wallet/balance", headers=headers(new_tok), timeout=20)
    if r2.status_code == 200:
        log("second call still 320 (idempotent seed)", r2.json().get("balance_credits") == 320,
            f"got {r2.json().get('balance_credits')}")

# 1.4 — POST /wallet/deduct with positive amount
if new_tok:
    idem1 = f"test-ded-{uuid.uuid4().hex[:10]}"
    r = requests.post(f"{BASE}/wallet/deduct", headers=headers(new_tok),
                      json={"amount": 50, "reason": "Test deduct", "idempotency_key": idem1}, timeout=20)
    log("POST /wallet/deduct 50 → 200", r.status_code == 200, f"HTTP {r.status_code} {r.text[:200]}")
    if r.status_code == 200:
        body = r.json()
        log("deduct balance_credits == 270", body.get("balance_credits") == 270,
            f"got {body.get('balance_credits')}")
        log("deduct duplicate==False", body.get("duplicate") is False, f"got {body.get('duplicate')}")

    # Replay with SAME idempotency_key → duplicate=True, balance unchanged
    r2 = requests.post(f"{BASE}/wallet/deduct", headers=headers(new_tok),
                       json={"amount": 50, "reason": "Test deduct", "idempotency_key": idem1}, timeout=20)
    log("replay deduct same idem_key → 200", r2.status_code == 200, f"HTTP {r2.status_code}")
    if r2.status_code == 200:
        b = r2.json()
        log("replay duplicate==True", b.get("duplicate") is True, f"got {b.get('duplicate')}")
        log("replay balance still 270", b.get("balance_credits") == 270, f"got {b.get('balance_credits')}")

    # Verify via GET /wallet/balance that deduct happened once only
    rb = requests.get(f"{BASE}/wallet/balance", headers=headers(new_tok), timeout=20)
    if rb.status_code == 200:
        bal = rb.json()
        log("GET balance after deduct == 270", bal.get("balance_credits") == 270, f"got {bal.get('balance_credits')}")
        log("lifetime_spent == 50", bal.get("lifetime_spent") == 50, f"got {bal.get('lifetime_spent')}")

# 1.5 — Edge: amount <= 0 → 400
if new_tok:
    r = requests.post(f"{BASE}/wallet/deduct", headers=headers(new_tok),
                      json={"amount": 0, "reason": "bad"}, timeout=20)
    log("deduct amount=0 → 400", r.status_code == 400, f"HTTP {r.status_code}")
    r = requests.post(f"{BASE}/wallet/deduct", headers=headers(new_tok),
                      json={"amount": -10, "reason": "bad"}, timeout=20)
    log("deduct amount=-10 → 400", r.status_code == 400, f"HTTP {r.status_code}")

# 1.6 — Edge: amount > balance → 402
if new_tok:
    r = requests.post(f"{BASE}/wallet/deduct", headers=headers(new_tok),
                      json={"amount": 99999, "reason": "overdraft"}, timeout=20)
    log("deduct amount > balance → 402", r.status_code == 402, f"HTTP {r.status_code} {r.text[:200]}")

# 1.7 — POST /wallet/credit — non-admin with amount > 100 → 403
if new_tok:
    r = requests.post(f"{BASE}/wallet/credit", headers=headers(new_tok),
                      json={"amount": 500, "reason": "too much for non-admin"}, timeout=20)
    log("credit non-admin amount>100 → 403", r.status_code == 403, f"HTTP {r.status_code} {r.text[:200]}")

# 1.8 — POST /wallet/credit — non-admin with amount <= 100 → 200
if new_tok:
    r = requests.post(f"{BASE}/wallet/credit", headers=headers(new_tok),
                      json={"amount": 50, "reason": "referral"}, timeout=20)
    log("credit non-admin amount=50 → 200", r.status_code == 200, f"HTTP {r.status_code} {r.text[:200]}")
    if r.status_code == 200:
        log("credit balance_credits == 320 (270+50)", r.json().get("balance_credits") == 320,
            f"got {r.json().get('balance_credits')}")

# 1.9 — Admin can credit > 100 → 200
r = requests.post(f"{BASE}/wallet/credit", headers=headers(admin_tok),
                  json={"amount": 1000, "reason": "admin topup"}, timeout=20)
log("credit as admin amount=1000 → 200", r.status_code == 200, f"HTTP {r.status_code} {r.text[:200]}")


# ═══════════════════════════════════════════════════════════════════════
# TASK 2 — MENTOR AVAILABILITY + BOOKING
# ═══════════════════════════════════════════════════════════════════════
print("\n=== TASK 2: MENTOR AVAILABILITY + BOOKING ===")

# Need the mentor's user_id. get_current_user returns _id ObjectId; serialize_user maps to id.
mentor_uid = mentor_id  # from login response

# 2.1 — GET /api/mentors/{id}/availability?days=7
r = requests.get(f"{BASE}/mentors/{mentor_uid}/availability?days=7",
                 headers=headers(student_tok), timeout=20)
log("GET mentor availability days=7 → 200", r.status_code == 200, f"HTTP {r.status_code} {r.text[:300]}")
if r.status_code == 200:
    body = r.json()
    shape_ok = all(k in body for k in ("mentor_id", "mentor_name", "rate_inr", "days"))
    log("availability shape has mentor_id/name/rate/days", shape_ok, f"keys={list(body.keys())}")
    days = body.get("days") or []
    log("availability returns 7 days", len(days) == 7, f"got {len(days)}")
    if days:
        d0 = days[0]
        day_keys_ok = all(k in d0 for k in ("date", "weekday", "label", "is_today",
                                              "is_weekend", "slots", "free_count"))
        log("day shape has all 7 keys", day_keys_ok, f"keys={list(d0.keys())}")
        log("day[0].is_today==True", d0.get("is_today") is True, f"got {d0.get('is_today')}")
        slots = d0.get("slots") or []
        if slots:
            log("slot has time+available keys",
                all(k in slots[0] for k in ("time", "available")),
                f"slot0={slots[0]}")

        # Find a Sunday in the 7-day window and check limited slots
        sunday = next((d for d in days if d.get("weekday") == "SUN"), None)
        if sunday:
            times = [s["time"] for s in sunday.get("slots") or []]
            log("Sunday has limited slots [10:00, 14:00]", times == ["10:00", "14:00"],
                f"got {times}")
        else:
            log("Sunday in next 7 days (skipped test)", True, "no Sunday in window")

# 2.2 — POST /availability/book with valid slot
# pick a non-Sunday future date at a safe time. Use a clash-free unique time.
import datetime as dt
today = dt.datetime.now(dt.timezone.utc)
# pick a date 3 days ahead (avoid Sunday = weekday 6)
booking_date = None
for offset in range(1, 8):
    cand = today + dt.timedelta(days=offset)
    if cand.weekday() != 6:  # not Sunday
        booking_date = cand.strftime("%Y-%m-%d")
        break

# Use a unique random slot so we don't collide with seeded sessions. The DEFAULT_SLOTS list is
# ["09:00", "11:00", "14:00", "16:00", "18:00", "20:00"]. We'll try 16:00 since it's most
# likely free.
booking_time = "16:00"
idem_book = f"book-{uuid.uuid4().hex[:10]}"

r = requests.post(f"{BASE}/mentors/{mentor_uid}/availability/book",
                  headers=headers(student_tok),
                  json={"date": booking_date, "time": booking_time, "idempotency_key": idem_book},
                  timeout=20)
log(f"book {booking_date} {booking_time} → 200", r.status_code == 200, f"HTTP {r.status_code} {r.text[:200]}")
session_id = None
if r.status_code == 200:
    body = r.json()
    session_id = body.get("session_id")
    log("book returns session_id", bool(session_id), f"id={session_id}")
    log("book duplicate==False", body.get("duplicate") is False, f"got {body.get('duplicate')}")

# 2.3 — Replay same idempotency_key → duplicate=True
if session_id:
    r2 = requests.post(f"{BASE}/mentors/{mentor_uid}/availability/book",
                       headers=headers(student_tok),
                       json={"date": booking_date, "time": booking_time, "idempotency_key": idem_book},
                       timeout=20)
    log("replay same idem_key → 200", r2.status_code == 200, f"HTTP {r2.status_code}")
    if r2.status_code == 200:
        b = r2.json()
        log("replay duplicate==True", b.get("duplicate") is True, f"got {b.get('duplicate')}")
        log("replay same session_id", b.get("session_id") == session_id,
            f"got {b.get('session_id')} expected {session_id}")

# 2.4 — Different idempotency_key, same slot → 409 clash
if session_id:
    r3 = requests.post(f"{BASE}/mentors/{mentor_uid}/availability/book",
                       headers=headers(student_tok),
                       json={"date": booking_date, "time": booking_time,
                             "idempotency_key": f"clash-{uuid.uuid4().hex[:8]}"},
                       timeout=20)
    log("different idem but same slot → 409", r3.status_code == 409, f"HTTP {r3.status_code} {r3.text[:200]}")

# 2.5 — Missing date → 400
r = requests.post(f"{BASE}/mentors/{mentor_uid}/availability/book",
                  headers=headers(student_tok),
                  json={"time": "14:00"}, timeout=20)
log("book missing date → 400", r.status_code == 400, f"HTTP {r.status_code}")

# 2.6 — Missing time → 400
r = requests.post(f"{BASE}/mentors/{mentor_uid}/availability/book",
                  headers=headers(student_tok),
                  json={"date": booking_date}, timeout=20)
log("book missing time → 400", r.status_code == 400, f"HTTP {r.status_code}")

# After booking, verify availability reflects the booked slot
r = requests.get(f"{BASE}/mentors/{mentor_uid}/availability?days=7",
                 headers=headers(student_tok), timeout=20)
if r.status_code == 200 and session_id:
    days = r.json().get("days") or []
    match_day = next((d for d in days if d.get("date") == booking_date), None)
    if match_day:
        slot = next((s for s in match_day.get("slots") or [] if s.get("time") == booking_time), None)
        if slot:
            log("booked slot now shows available=false", slot.get("available") is False,
                f"slot={slot}")


# ═══════════════════════════════════════════════════════════════════════
# TASK 3 — MENTOR AI STUDIO
# ═══════════════════════════════════════════════════════════════════════
print("\n=== TASK 3: MENTOR AI STUDIO ===")

# 3.1 — Seed mentor demo via any auth user (use admin per convention)
r = requests.post(f"{BASE}/admin/seed-mentor-demo", headers=headers(admin_tok),
                  json={}, timeout=60)
log("POST /admin/seed-mentor-demo → 200", r.status_code == 200, f"HTTP {r.status_code} {r.text[:300]}")
if r.status_code == 200:
    body = r.json()
    log("seed returns ok=True", body.get("ok") is True, f"got {body.get('ok')}")
    for key in ("connections_upserted", "roadmaps_upserted", "sessions_seeded", "stuck_mentees"):
        present = key in body
        log(f"seed has key '{key}'", present, f"val={body.get(key)}")
    log("stuck_mentees == 1 (per seed design)", body.get("stuck_mentees") == 1,
        f"got {body.get('stuck_mentees')}")

# 3.2 — Login as mentor01 and hit AI Studio endpoints
# Re-auth mentor to be fresh
mentor_tok2, _, _ = login(MENTOR_EMAIL, MENTOR_PASS)

# 3.2a — mentee-pulse
r = requests.get(f"{BASE}/mentor/ai-studio/mentee-pulse", headers=headers(mentor_tok2), timeout=30)
log("GET /mentor/ai-studio/mentee-pulse → 200", r.status_code == 200, f"HTTP {r.status_code} {r.text[:400]}")
if r.status_code == 200:
    body = r.json()
    items = body.get("items") or []
    log("mentee-pulse has items list", isinstance(items, list), f"type={type(items).__name__}")
    log("mentee-pulse has total", "total" in body, f"total={body.get('total')}")
    log("mentee-pulse items count > 0", len(items) > 0, f"count={len(items)}")
    if items:
        first = items[0]
        required = ("progress_pct", "stuck", "stuck_days", "milestones_done",
                    "milestones_total", "skill_scores_top")
        for k in required:
            log(f"item[0] has '{k}'", k in first, f"val={first.get(k)}")
        log("skill_scores_top is dict of <=3 entries",
            isinstance(first.get("skill_scores_top"), dict) and len(first.get("skill_scores_top") or {}) <= 3,
            f"got {first.get('skill_scores_top')}")
        # Check at least one stuck mentee
        any_stuck = any(i.get("stuck") for i in items)
        log("at least one mentee flagged stuck", any_stuck, f"stuck_count={sum(1 for i in items if i.get('stuck'))}")

# 3.2b — skill-gaps
r = requests.get(f"{BASE}/mentor/ai-studio/skill-gaps", headers=headers(mentor_tok2), timeout=30)
log("GET /mentor/ai-studio/skill-gaps → 200", r.status_code == 200, f"HTTP {r.status_code} {r.text[:400]}")
if r.status_code == 200:
    body = r.json()
    items = body.get("items") or []
    log("skill-gaps returns items list", isinstance(items, list), f"type={type(items).__name__}")
    log("skill-gaps has total_mentees", "total_mentees" in body, f"total_mentees={body.get('total_mentees')}")
    if items:
        first = items[0]
        for k in ("skill", "mentees_below_60", "avg_score"):
            log(f"gap item has '{k}'", k in first, f"val={first.get(k)}")

# 3.2c — impact
r = requests.get(f"{BASE}/mentor/ai-studio/impact", headers=headers(mentor_tok2), timeout=30)
log("GET /mentor/ai-studio/impact → 200", r.status_code == 200, f"HTTP {r.status_code} {r.text[:400]}")
if r.status_code == 200:
    body = r.json()
    for k in ("mentees_total", "sessions_last_30d", "milestones_completed_total",
              "badges_earned_total", "avg_mentee_progress_pct", "as_of"):
        log(f"impact has '{k}'", k in body, f"val={body.get(k)}")

# 3.3 — Check backend logs for tz-aware warnings
print("\n=== BACKEND LOG SCAN FOR TZ WARNINGS ===")
import subprocess
try:
    out = subprocess.run(["tail", "-n", "200", "/var/log/supervisor/backend.err.log"],
                         capture_output=True, text=True, timeout=10)
    log_text = out.stdout
    has_tz_err = "can't subtract offset-naive and offset-aware" in log_text
    log("no 'offset-naive offset-aware' tz errors in last 200 log lines", not has_tz_err,
        "FOUND tz error" if has_tz_err else "clean")
except Exception as e:
    log("tail backend log", False, f"exec failed {e}")


# ═══════════════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ═══════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
passed = sum(1 for r in results if r["ok"])
total = len(results)
failed = [r for r in results if not r["ok"]]
print(f"RESULTS: {passed}/{total} checks PASSED")
if failed:
    print(f"\nFAILED ({len(failed)}):")
    for f in failed:
        print(f"  ❌ {f['step']} — {f['msg']}")

sys.exit(0 if not failed else 1)
