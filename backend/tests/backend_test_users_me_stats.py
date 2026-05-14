"""Tests for GET /api/users/me/stats + regression on /auth/me, /users/me/completion, PUT /users/me.

Runs against REACT/EXPO backend URL.
"""

import os
import sys
import requests

BASE = "https://hiring-mvvm.preview.emergentagent.com/api"
EMAIL = "student01@test.com"
PASSWORD = "TestPass@123"

REQUIRED_STAT_KEYS = [
    "sessions_completed",
    "connections_made",
    "profile_views",
    "mentor_sessions",
    "applications_sent",
]


def main() -> int:
    passed = 0
    failed = 0
    failures = []

    def ok(msg):
        nonlocal passed
        passed += 1
        print(f"[PASS] {msg}")

    def fail(msg):
        nonlocal failed
        failed += 1
        failures.append(msg)
        print(f"[FAIL] {msg}")

    # --- Login ---
    try:
        r = requests.post(
            f"{BASE}/auth/login",
            json={"email": EMAIL, "password": PASSWORD},
            timeout=20,
        )
    except Exception as e:
        fail(f"login request exception: {e}")
        return 1

    if r.status_code != 200:
        fail(f"login expected 200 got {r.status_code} body={r.text[:300]}")
        return 1
    ok("login 200")
    body = r.json()
    token = body.get("access_token")
    if not token:
        fail("login response missing access_token")
        return 1
    ok("login returned access_token")
    auth = {"Authorization": f"Bearer {token}"}

    # --- 1. AUTH WALL: no bearer ---
    r = requests.get(f"{BASE}/users/me/stats", timeout=20)
    if r.status_code in (401, 403):
        ok(f"GET /users/me/stats without bearer -> {r.status_code} (auth wall)")
    else:
        fail(f"GET /users/me/stats without bearer expected 401/403 got {r.status_code}")

    # --- 2. AUTH happy path ---
    r = requests.get(f"{BASE}/users/me/stats", headers=auth, timeout=20)
    if r.status_code != 200:
        fail(f"GET /users/me/stats with bearer expected 200 got {r.status_code} body={r.text[:300]}")
    else:
        ok("GET /users/me/stats with bearer -> 200")
        try:
            data = r.json()
        except Exception as e:
            fail(f"stats JSON parse error: {e}")
            data = {}
        for k in REQUIRED_STAT_KEYS:
            if k not in data:
                fail(f"stats response missing key: {k}")
                continue
            v = data[k]
            if not isinstance(v, int) or isinstance(v, bool):
                fail(f"stats.{k} expected int, got {type(v).__name__} ({v!r})")
                continue
            if v < 0:
                fail(f"stats.{k} expected >= 0, got {v}")
                continue
            ok(f"stats.{k} present and int >= 0 (={v})")
        print(f"    raw stats payload: {data}")

    # --- 3. GRACEFUL FALLBACK: call multiple times, ensure never 500 ---
    for i in range(3):
        r = requests.get(f"{BASE}/users/me/stats", headers=auth, timeout=20)
        if r.status_code >= 500:
            fail(f"stats returned {r.status_code} on call {i} body={r.text[:300]}")
            break
    else:
        ok("stats endpoint never returned 5xx across 3 repeated calls (graceful fallback)")

    # --- 4. NO REGRESSION: /auth/me ---
    r = requests.get(f"{BASE}/auth/me", headers=auth, timeout=20)
    if r.status_code == 200:
        ok("GET /auth/me -> 200")
        me_before = r.json()
    else:
        fail(f"GET /auth/me expected 200 got {r.status_code} body={r.text[:300]}")
        me_before = {}

    # --- NO REGRESSION: /users/me/completion ---
    r = requests.get(f"{BASE}/users/me/completion", headers=auth, timeout=20)
    if r.status_code != 200:
        fail(f"GET /users/me/completion expected 200 got {r.status_code}")
    else:
        ok("GET /users/me/completion -> 200")
        cj = r.json()
        if "percentage" in cj and isinstance(cj["percentage"], int):
            ok(f"completion.percentage present as int ({cj['percentage']})")
        else:
            fail(f"completion.percentage missing or not int: {cj.get('percentage')!r}")
        if "items" in cj and isinstance(cj["items"], list) and len(cj["items"]) > 0:
            ok(f"completion.items list present, len={len(cj['items'])}")
        else:
            fail("completion.items missing or empty")

    # --- NO REGRESSION: PUT /users/me headline update ---
    import time
    headline = f"Test headline X {int(time.time())}"
    original_headline = me_before.get("headline", "") if me_before else ""
    r = requests.put(
        f"{BASE}/users/me",
        headers=auth,
        json={"headline": headline},
        timeout=20,
    )
    if r.status_code != 200:
        fail(f"PUT /users/me headline expected 200 got {r.status_code} body={r.text[:300]}")
    else:
        ok("PUT /users/me {headline:'...'} -> 200")
        try:
            updated = r.json()
            if updated.get("headline") == headline:
                ok(f"PUT response returns updated headline: {headline!r}")
            else:
                fail(f"PUT response headline mismatch. expected={headline!r} got={updated.get('headline')!r}")
        except Exception as e:
            fail(f"PUT /users/me JSON parse error: {e}")

    # --- /auth/me reflects headline after PUT ---
    r = requests.get(f"{BASE}/auth/me", headers=auth, timeout=20)
    if r.status_code != 200:
        fail(f"POST PUT GET /auth/me expected 200 got {r.status_code}")
    else:
        me_after = r.json()
        if me_after.get("headline") == headline:
            ok(f"/auth/me reflects updated headline: {headline!r}")
        else:
            fail(f"/auth/me headline not updated; got {me_after.get('headline')!r}")

    # Restore original headline for cleanliness
    try:
        requests.put(
            f"{BASE}/users/me",
            headers=auth,
            json={"headline": original_headline},
            timeout=20,
        )
    except Exception:
        pass

    print()
    print("=" * 60)
    print(f"RESULT: {passed} passed, {failed} failed")
    if failures:
        print("FAILURES:")
        for f_ in failures:
            print(f"  - {f_}")
    print("=" * 60)
    return 0 if failed == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
