"""
Backend Test — Wallet v2 endpoints (/app/backend/activity_credits.py)

Tests:
  POST /api/wallet/seed-demo-earnings (idempotent)
  GET  /api/wallet/summary
  POST /api/wallet/topup
  POST /api/wallet/withdraw
  POST /api/wallet/track
  GET  /api/wallet/earnings
  GET  /api/wallet/balance (legacy)
"""
import os
import sys
import json
import requests

BASE = "https://hiring-mvvm.preview.emergentagent.com/api"
EMAIL = "realtime@studentalumni.in"
PASSWORD = "RealTime@2026"

CREDITS_PER_INR = 25
WITHDRAW_THRESHOLD_CREDITS = 2500
TOPUP_BONUS_PCT = 5

passed: list = []
failed: list = []


def ok(msg):
    passed.append(msg)
    print(f"  [PASS] {msg}")


def fail(msg):
    failed.append(msg)
    print(f"  [FAIL] {msg}")


def section(name):
    print(f"\n=== {name} ===")


# ───── LOGIN ─────
section("Auth — login as realtime@studentalumni.in")
r = requests.post(f"{BASE}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
if r.status_code != 200:
    print(f"  LOGIN FAILED: {r.status_code} {r.text}")
    sys.exit(1)
body = r.json()
token = body.get("access_token")
assert token, "No access_token returned"
ok(f"login 200, token obtained (user={body.get('user', {}).get('email')})")
H = {"Authorization": f"Bearer {token}"}


# ───── 1. Seed demo earnings (idempotent) ─────
section("1. POST /wallet/seed-demo-earnings — first call")
r = requests.post(f"{BASE}/wallet/seed-demo-earnings", headers=H, timeout=30)
if r.status_code != 200:
    fail(f"seed-demo-earnings first call status={r.status_code} body={r.text[:300]}")
else:
    seed1 = r.json()
    if seed1.get("ok") is True:
        ok("seed 1: ok=true")
    else:
        fail(f"seed 1: ok not true — {seed1}")

    # Either non-zero seeded this run (first time user), OR user already had things seeded earlier runs.
    # Spec says "expect seeded_events>0, seeded_credits>0 on first call" — but note user may have been
    # seeded in previous test runs. So we only require that lifetime_earned > 0 & balance_credits >= 0.
    if seed1.get("lifetime_earned", 0) > 0:
        ok(f"seed 1: lifetime_earned > 0 ({seed1.get('lifetime_earned')})")
    else:
        fail(f"seed 1: lifetime_earned not > 0 ({seed1.get('lifetime_earned')})")

    print(f"    seeded_events={seed1.get('seeded_events')} seeded_credits={seed1.get('seeded_credits')} balance={seed1.get('balance_credits')}")

    balance_after_seed1 = seed1.get("balance_credits", 0)
    lifetime_after_seed1 = seed1.get("lifetime_earned", 0)


section("1b. POST /wallet/seed-demo-earnings — second call (idempotency)")
r = requests.post(f"{BASE}/wallet/seed-demo-earnings", headers=H, timeout=30)
if r.status_code != 200:
    fail(f"seed 2 status={r.status_code}")
else:
    seed2 = r.json()
    # Idempotent: seeded_events should be 0 on second call
    if seed2.get("seeded_events", -1) == 0:
        ok("seed 2: seeded_events == 0 (idempotent)")
    else:
        fail(f"seed 2: seeded_events != 0 (got {seed2.get('seeded_events')}) — idempotency broken")
    if seed2.get("balance_credits") == balance_after_seed1:
        ok(f"seed 2: balance unchanged ({seed2.get('balance_credits')})")
    else:
        fail(f"seed 2: balance changed from {balance_after_seed1} to {seed2.get('balance_credits')}")


# ───── 2. GET /wallet/summary ─────
section("2. GET /wallet/summary — response shape")
r = requests.get(f"{BASE}/wallet/summary", headers=H, timeout=30)
if r.status_code != 200:
    fail(f"summary status={r.status_code} body={r.text[:300]}")
    summary = {}
else:
    summary = r.json()
    def need(key, cond, descr):
        if cond:
            ok(f"summary.{key}: {descr}")
        else:
            fail(f"summary.{key}: expected {descr} — got {summary.get(key)!r}")

    need("balance_credits", isinstance(summary.get("balance_credits"), int) and summary["balance_credits"] >= 0,
         "int >= 0")
    bc = summary.get("balance_credits", 0)
    expected_inr = round(bc / CREDITS_PER_INR, 2)
    need("balance_inr", summary.get("balance_inr") == expected_inr,
         f"== {expected_inr} (= credits/25)")
    need("credits_per_inr", summary.get("credits_per_inr") == CREDITS_PER_INR, "== 25")
    need("lifetime_earned", isinstance(summary.get("lifetime_earned"), int), "int")
    need("lifetime_spent", isinstance(summary.get("lifetime_spent"), int), "int")
    need("withdraw_threshold_credits", summary.get("withdraw_threshold_credits") == WITHDRAW_THRESHOLD_CREDITS, "== 2500")
    need("withdraw_threshold_inr", summary.get("withdraw_threshold_inr") == 100.0 or summary.get("withdraw_threshold_inr") == 100,
         "== 100")
    need("topup_bonus_pct", summary.get("topup_bonus_pct") == TOPUP_BONUS_PCT, "== 5")

    # level
    lvl = summary.get("level") or {}
    need("level.level", isinstance(lvl.get("level"), int) and 1 <= lvl["level"] <= 5, "int 1-5")
    need("level.name", isinstance(lvl.get("name"), str) and lvl.get("name"), "non-empty str")
    need("level.icon", isinstance(lvl.get("icon"), str), "str")
    need("level.color", isinstance(lvl.get("color"), str), "str")
    ppct = lvl.get("progress_pct")
    need("level.progress_pct", isinstance(ppct, (int, float)) and 0 <= ppct <= 100, "0-100")
    need("level.credits_to_next", isinstance(lvl.get("credits_to_next"), int), "int")
    nxt = lvl.get("next_level_name")
    need("level.next_level_name", nxt is None or isinstance(nxt, str), "str or null")

    need("streak_days", isinstance(summary.get("streak_days"), int) and summary["streak_days"] >= 0, "int >= 0")
    need("active_days_30", isinstance(summary.get("active_days_30"), int), "int")

    ebc = summary.get("earnings_by_category")
    if isinstance(ebc, list):
        ok(f"earnings_by_category: list (len={len(ebc)})")
        if ebc:
            e0 = ebc[0]
            req = ("category" in e0 and "credits" in e0 and "items" in e0 and isinstance(e0["items"], list))
            if req:
                ok("earnings_by_category[0] has {category, credits, items[]}")
            else:
                fail(f"earnings_by_category[0] missing fields: {e0}")
    else:
        fail(f"earnings_by_category not a list: {type(ebc)}")

    ab = summary.get("activity_breakdown")
    if isinstance(ab, list):
        ok(f"activity_breakdown: list (len={len(ab)})")
        if ab:
            a0 = ab[0]
            expected = {"activity_type", "label", "icon", "credits", "count", "last_at"}
            missing = expected - set(a0.keys())
            if not missing:
                ok("activity_breakdown[0] has required keys")
            else:
                fail(f"activity_breakdown[0] missing: {missing}")
    else:
        fail(f"activity_breakdown not a list: {type(ab)}")

    er = summary.get("earning_rules")
    if isinstance(er, list) and len(er) > 0:
        ok(f"earning_rules: list (len={len(er)}, role={summary.get('role')})")
        e0 = er[0]
        expected = {"activity_type", "label", "icon", "credits", "category"}
        missing = expected - set(e0.keys())
        if not missing:
            ok("earning_rules[0] has required keys")
        else:
            fail(f"earning_rules[0] missing: {missing}")
    else:
        fail(f"earning_rules bad: {er}")

    hist = summary.get("history")
    if isinstance(hist, list):
        ok(f"history: list (len={len(hist)}, max 30)")
        if len(hist) > 30:
            fail(f"history len > 30 ({len(hist)})")
        if hist:
            h0 = hist[0]
            expected = {"id", "type", "amount", "reason", "balance_after", "ts"}
            missing = expected - set(h0.keys())
            if not missing:
                ok("history[0] has required keys")
            else:
                fail(f"history[0] missing: {missing}")
            if h0["type"] in ("credit", "debit"):
                ok(f"history[0].type in credit|debit (got {h0['type']})")
            else:
                fail(f"history[0].type invalid: {h0['type']}")
    else:
        fail(f"history not a list: {type(hist)}")


# ───── 3. POST /wallet/topup — happy path ─────
section("3. POST /wallet/topup — amount_inr=500, upi")
bal_before_topup = summary.get("balance_credits", 0) if summary else 0
r = requests.post(f"{BASE}/wallet/topup", headers=H, json={"amount_inr": 500, "payment_method": "upi"}, timeout=30)
if r.status_code != 200:
    fail(f"topup status={r.status_code} body={r.text[:300]}")
else:
    tu = r.json()
    # Expected: base=12500, bonus=625, total=13125
    if tu.get("base_credits") == 12500:
        ok("topup.base_credits == 12500")
    else:
        fail(f"topup.base_credits = {tu.get('base_credits')} (expected 12500)")
    if tu.get("bonus_credits") == 625:
        ok("topup.bonus_credits == 625")
    else:
        fail(f"topup.bonus_credits = {tu.get('bonus_credits')} (expected 625)")
    if tu.get("total_credits") == 13125:
        ok("topup.total_credits == 13125")
    else:
        fail(f"topup.total_credits = {tu.get('total_credits')} (expected 13125)")

    bal_after_topup = tu.get("balance_credits", 0)
    if bal_after_topup - bal_before_topup == 13125:
        ok(f"balance increased by exactly 13125 ({bal_before_topup} → {bal_after_topup})")
    else:
        fail(f"balance delta {bal_after_topup - bal_before_topup} != 13125")

# Verify history reflects the topup
section("3b. GET /wallet/summary → most recent history is topup credit of 13125")
r = requests.get(f"{BASE}/wallet/summary", headers=H, timeout=30)
if r.status_code == 200:
    hist = r.json().get("history") or []
    if hist:
        h0 = hist[0]
        if h0.get("type") == "credit" and h0.get("amount") == 13125:
            ok(f"history[0]: type=credit amount=13125")
        else:
            fail(f"history[0] type/amount wrong: type={h0.get('type')} amount={h0.get('amount')}")
        if (h0.get("metadata") or {}).get("kind") == "topup":
            ok("history[0].metadata.kind == 'topup'")
        else:
            fail(f"history[0].metadata.kind != 'topup' — got {(h0.get('metadata') or {}).get('kind')}")
    else:
        fail("history empty after topup")


# ───── 4. POST /wallet/topup — edge cases ─────
section("4. POST /wallet/topup — edge cases")
for amt, tag in [(0, "amount_inr=0"), (-100, "amount_inr=-100"), (200000, "amount_inr=200000")]:
    r = requests.post(f"{BASE}/wallet/topup", headers=H, json={"amount_inr": amt}, timeout=30)
    if r.status_code == 400:
        ok(f"{tag} → 400")
    else:
        fail(f"{tag} → {r.status_code} (expected 400). body={r.text[:150]}")


# ───── 5. POST /wallet/withdraw — happy path ─────
section("5. POST /wallet/withdraw — amount_inr=100 upi")
r = requests.get(f"{BASE}/wallet/summary", headers=H, timeout=30)
bal_before_wd = r.json().get("balance_credits", 0) if r.status_code == 200 else 0

r = requests.post(f"{BASE}/wallet/withdraw", headers=H,
                  json={"amount_inr": 100, "method": "upi", "target": "demo@upi"}, timeout=30)
if r.status_code != 200:
    fail(f"withdraw status={r.status_code} body={r.text[:300]}")
else:
    wd = r.json()
    if wd.get("amount_credits") == 2500:
        ok("withdraw.amount_credits == 2500")
    else:
        fail(f"withdraw.amount_credits = {wd.get('amount_credits')}")
    bal_after_wd = wd.get("balance_credits", 0)
    if bal_before_wd - bal_after_wd == 2500:
        ok(f"balance decreased by 2500 ({bal_before_wd} → {bal_after_wd})")
    else:
        fail(f"balance delta {bal_before_wd - bal_after_wd} != 2500")

    # Verify history
    r2 = requests.get(f"{BASE}/wallet/summary", headers=H, timeout=30)
    if r2.status_code == 200:
        h = (r2.json().get("history") or [])
        if h:
            h0 = h[0]
            md = h0.get("metadata") or {}
            if h0.get("type") == "debit" and md.get("kind") == "withdraw":
                ok("history[0]: type=debit, metadata.kind=withdraw")
            else:
                fail(f"history[0] wrong: type={h0.get('type')}, kind={md.get('kind')}")
            if md.get("status") == "processing":
                ok("history[0].metadata.status == processing")
            else:
                fail(f"metadata.status = {md.get('status')}")
            if md.get("eta") == "1-2 business days":
                ok("history[0].metadata.eta == '1-2 business days'")
            else:
                fail(f"metadata.eta = {md.get('eta')}")


# ───── 6. Withdraw edge cases ─────
section("6. POST /wallet/withdraw — edge cases")
# below threshold
r = requests.post(f"{BASE}/wallet/withdraw", headers=H, json={"amount_credits": 1000, "method": "upi"}, timeout=30)
if r.status_code == 400 and "minimum withdrawal" in (r.json().get("detail", "") or "").lower():
    ok("amount_credits=1000 → 400 'Minimum withdrawal'")
else:
    try:
        d = r.json().get("detail")
    except Exception:
        d = r.text
    fail(f"amount_credits=1000 → {r.status_code} detail={d!r}")

# zero
r = requests.post(f"{BASE}/wallet/withdraw", headers=H, json={"amount_inr": 0}, timeout=30)
if r.status_code == 400:
    ok("amount_inr=0 → 400")
else:
    fail(f"amount_inr=0 → {r.status_code}")

# way more than balance
r = requests.post(f"{BASE}/wallet/withdraw", headers=H, json={"amount_inr": 99999999}, timeout=30)
if r.status_code == 402 and "insufficient" in (r.json().get("detail", "") or "").lower():
    ok("amount_inr=99999999 → 402 'Insufficient credits'")
else:
    try:
        d = r.json().get("detail")
    except Exception:
        d = r.text
    fail(f"amount_inr=99999999 → {r.status_code} detail={d!r}")


# ───── 7. POST /wallet/track ─────
section("7. POST /wallet/track — session_attended (student rule, 30 credits, no max_per_day)")

def balance():
    rr = requests.get(f"{BASE}/wallet/summary", headers=H, timeout=30)
    return rr.json().get("balance_credits", 0) if rr.status_code == 200 else -1

bbefore = balance()
r = requests.post(f"{BASE}/wallet/track", headers=H, json={"activity_type": "session_attended"}, timeout=30)
if r.status_code == 200:
    j = r.json()
    if j.get("credited") == 30 and j.get("duplicate") is False:
        ok("session_attended: credited=30, duplicate=false")
    else:
        fail(f"session_attended got credited={j.get('credited')} duplicate={j.get('duplicate')}")
    bafter = balance()
    if bafter - bbefore == 30:
        ok(f"balance increased by 30 ({bbefore} → {bafter})")
    else:
        fail(f"balance delta {bafter - bbefore} != 30")
else:
    fail(f"track session_attended status={r.status_code} body={r.text[:200]}")


section("7b. POST /wallet/track — daily_login (max_per_day=1)")
b0 = balance()
r1 = requests.post(f"{BASE}/wallet/track", headers=H, json={"activity_type": "daily_login"}, timeout=30)
r2 = requests.post(f"{BASE}/wallet/track", headers=H, json={"activity_type": "daily_login"}, timeout=30)
if r1.status_code == 200 and r2.status_code == 200:
    j1, j2 = r1.json(), r2.json()
    # Could already have been tracked today by seed; handle both paths
    # Case A: first call credits 5 (new day)
    if j1.get("credited") == 5 and j1.get("duplicate") is False:
        ok("daily_login #1: credited=5, duplicate=false")
    elif j1.get("credited") == 0 and j1.get("duplicate") is True:
        ok("daily_login #1: ALREADY DONE TODAY (duplicate=true, credited=0) — expected given seed ran earlier")
    else:
        fail(f"daily_login #1 unexpected: {j1}")
    # Case B: second call always duplicate
    if j2.get("credited") == 0 and j2.get("duplicate") is True:
        ok("daily_login #2: credited=0, duplicate=true")
    else:
        fail(f"daily_login #2 not duplicate: {j2}")
else:
    fail(f"daily_login track failed: {r1.status_code}/{r2.status_code}")


section("7c. POST /wallet/track — profile_completed (once=true)")
r1 = requests.post(f"{BASE}/wallet/track", headers=H, json={"activity_type": "profile_completed"}, timeout=30)
r2 = requests.post(f"{BASE}/wallet/track", headers=H, json={"activity_type": "profile_completed"}, timeout=30)
if r1.status_code == 200 and r2.status_code == 200:
    j1, j2 = r1.json(), r2.json()
    if j1.get("credited") == 100 and j1.get("duplicate") is False:
        ok("profile_completed #1: credited=100, duplicate=false")
    elif j1.get("credited") == 0 and j1.get("duplicate") is True:
        ok("profile_completed #1: ALREADY DONE (duplicate=true, credited=0) — seeded earlier")
    else:
        fail(f"profile_completed #1 unexpected: {j1}")
    if j2.get("credited") == 0 and j2.get("duplicate") is True:
        ok("profile_completed #2: duplicate=true (once-only)")
    else:
        fail(f"profile_completed #2 not duplicate: {j2}")
else:
    fail(f"profile_completed track failed: {r1.status_code}/{r2.status_code}")


section("7d. POST /wallet/track — unknown activity (foo_bar_unknown)")
r = requests.post(f"{BASE}/wallet/track", headers=H, json={"activity_type": "foo_bar_unknown"}, timeout=30)
if r.status_code == 200:
    j = r.json()
    if j.get("skipped") is True and j.get("credited") == 0:
        ok("unknown activity: skipped=true, credited=0")
    else:
        fail(f"unknown activity response: {j}")
else:
    fail(f"unknown activity status={r.status_code}")


# ───── 8. GET /wallet/earnings ─────
section("8. GET /wallet/earnings")
r = requests.get(f"{BASE}/wallet/earnings", headers=H, timeout=30)
if r.status_code == 200:
    j = r.json()
    need_keys = {"balance_credits", "lifetime_earned", "level", "role"}
    missing = need_keys - set(j.keys())
    if not missing:
        ok(f"earnings keys present: {list(j.keys())}")
    else:
        fail(f"earnings missing keys: {missing}")
    if isinstance(j.get("level"), dict) and "level" in j["level"]:
        ok(f"earnings.level is dict (level={j['level'].get('level')}, name={j['level'].get('name')})")
    else:
        fail(f"earnings.level bad: {j.get('level')}")
else:
    fail(f"earnings status={r.status_code}")


# ───── 9. Legacy /wallet/balance ─────
section("9. GET /wallet/balance (legacy)")
r = requests.get(f"{BASE}/wallet/balance", headers=H, timeout=30)
if r.status_code == 200:
    j = r.json()
    ok(f"legacy /wallet/balance 200 (keys={list(j.keys())[:10]})")
else:
    fail(f"legacy /wallet/balance status={r.status_code} body={r.text[:200]}")


# ───── Summary ─────
print("\n" + "=" * 70)
print(f"TOTAL: passed={len(passed)}  failed={len(failed)}")
print("=" * 70)
if failed:
    print("\nFAILED:")
    for f_ in failed:
        print(f"  - {f_}")
    sys.exit(1)
sys.exit(0)
