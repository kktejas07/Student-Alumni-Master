"""
Phase 4 — SA Profile Web backend test suite.

Covers:
  PUT   /api/users/me           (extended profile with allow-list)
  GET   /api/users/me/completion
  GET   /api/users/me/resume
  POST  /api/users/me/resume
  GET   /api/users/me/resume/{id}/raw
  POST  /api/users/me/resume/{id}/activate
  DELETE /api/users/me/resume/{id}
  PATCH /api/users/me/preferences     (deep-merge)
  POST  /api/users/me/password

Base URL read from EXPO_PUBLIC_BACKEND_URL in /app/frontend/.env.
"""
from __future__ import annotations

import base64
import json
import os
import sys
import time
from typing import Any

import requests

BASE_URL = "https://hiring-mvvm.preview.emergentagent.com/api"

STUDENT_EMAIL = "student01@test.com"
STUDENT_PASSWORD = "TestPass@123"
MENTOR_EMAIL = "mentor01@test.com"
MENTOR_PASSWORD = "TestPass@123"
ADMIN_EMAIL = "admin@careerpath.app"
ADMIN_PASSWORD = "Admin@12345"

PASS = "\033[92mPASS\033[0m"
FAIL = "\033[91mFAIL\033[0m"

results: list[tuple[str, bool, str]] = []


def log(name: str, ok: bool, detail: str = "") -> None:
    tag = PASS if ok else FAIL
    print(f"[{tag}] {name}  —  {detail}")
    results.append((name, ok, detail))


def short(r: requests.Response) -> str:
    try:
        return str(r.status_code) + " " + json.dumps(r.json())[:240]
    except Exception:
        return f"{r.status_code} {r.text[:240]}"


def login(email: str, password: str) -> tuple[str, dict]:
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"Login failed for {email}: {r.status_code} {r.text[:200]}"
    body = r.json()
    assert "access_token" in body, f"No access_token in login response: {body}"
    return body["access_token"], body["user"]


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# A. Auth gating
# ---------------------------------------------------------------------------
def test_auth_gating() -> None:
    print("\n=== A. Auth Gating ===")
    endpoints = [
        ("GET",    "/users/me/completion"),
        ("GET",    "/users/me/resume"),
        ("PUT",    "/users/me"),
        ("POST",   "/users/me/resume"),
        ("PATCH",  "/users/me/preferences"),
        ("POST",   "/users/me/password"),
        ("GET",    "/users/me/resume/bogus/raw"),
        ("POST",   "/users/me/resume/bogus/activate"),
        ("DELETE", "/users/me/resume/bogus"),
    ]
    for method, ep in endpoints:
        # 1) No token
        r = requests.request(method, f"{BASE_URL}{ep}", json={}, timeout=10)
        ok_no = r.status_code == 401
        # 2) Malformed token
        r2 = requests.request(method, f"{BASE_URL}{ep}", json={},
                              headers={"Authorization": "Bearer not.a.jwt"}, timeout=10)
        ok_mal = r2.status_code == 401
        log(f"{method} {ep} rejects no-token", ok_no, f"got {r.status_code}")
        log(f"{method} {ep} rejects bad-token", ok_mal, f"got {r2.status_code}")


# ---------------------------------------------------------------------------
# B. Happy-path full flow
# ---------------------------------------------------------------------------
def test_happy_path(token: str) -> None:
    print("\n=== B. Happy-path profile flow ===")
    h = auth_headers(token)

    # GET initial completion
    r0 = requests.get(f"{BASE_URL}/users/me/completion", headers=h, timeout=10)
    log("GET /users/me/completion (initial)", r0.status_code == 200, short(r0))
    initial = r0.json() if r0.status_code == 200 else {}
    initial_pct = initial.get("percentage", 0)
    items = initial.get("items") or []
    log("completion has 7 items", len(items) == 7, f"items={len(items)}")
    keys = {i.get("key") for i in items}
    expected_keys = {"basic", "photo", "bio", "college", "social", "interests", "skills"}
    log("completion item keys match spec", keys == expected_keys,
        f"missing={expected_keys - keys} extra={keys - expected_keys}")

    # PUT extended profile
    payload = {
        "first_name": "Test",
        "last_name": "User",
        "headline": "QA bot",
        "bio": "A short bio",
        "linkedin_url": "https://linkedin.com/in/x",
        "interests": ["AI / ML", "Design / UX", "Cybersecurity"],
        "skills": ["Python", "Pytest"],
    }
    r1 = requests.put(f"{BASE_URL}/users/me", json=payload, headers=h, timeout=15)
    log("PUT /users/me with valid fields → 200", r1.status_code == 200, short(r1))
    if r1.status_code == 200:
        body = r1.json()
        log("full_name auto-synth = 'Test User'", body.get("full_name") == "Test User",
            f"got={body.get('full_name')!r}")
        log("interests persisted", set(body.get("interests") or []) == set(payload["interests"]),
            f"got={body.get('interests')}")
        log("skills persisted", set(body.get("skills") or []) == set(payload["skills"]),
            f"got={body.get('skills')}")

    # GET completion again → should increase
    r2 = requests.get(f"{BASE_URL}/users/me/completion", headers=h, timeout=10)
    new_pct = r2.json().get("percentage", 0) if r2.status_code == 200 else 0
    log("completion percentage increased after PUT",
        new_pct > initial_pct,
        f"initial={initial_pct} new={new_pct}")

    # GET /auth/me → full_name
    rm = requests.get(f"{BASE_URL}/auth/me", headers=h, timeout=10)
    log("GET /auth/me reflects full_name='Test User'",
        rm.status_code == 200 and rm.json().get("full_name") == "Test User",
        short(rm))


# ---------------------------------------------------------------------------
# C. Disallowed fields silently ignored
# ---------------------------------------------------------------------------
def test_disallowed_fields(token: str) -> None:
    print("\n=== C. Disallowed fields silently ignored ===")
    h = auth_headers(token)

    # Capture original role
    r0 = requests.get(f"{BASE_URL}/auth/me", headers=h, timeout=10)
    original_role = r0.json().get("role") if r0.status_code == 200 else None

    payload = {
        "role": "admin",
        "sa_id": "HACK-1",
        "password_hash": "x",
        "email": "hacked@evil.com",
        "random_xyz": 1,
        "first_name": "Real",
    }
    r1 = requests.put(f"{BASE_URL}/users/me", json=payload, headers=h, timeout=15)
    log("PUT with disallowed fields returns 200 (not 400)", r1.status_code == 200, short(r1))
    if r1.status_code == 200:
        body = r1.json()
        log("role NOT changed by PUT",
            body.get("role") == original_role, f"got={body.get('role')!r} expected={original_role!r}")
        # Full name should now start with 'Real'
        log("first_name=Real applied via full_name auto-synth",
            (body.get("full_name") or "").startswith("Real"),
            f"full_name={body.get('full_name')!r}")

    rm = requests.get(f"{BASE_URL}/auth/me", headers=h, timeout=10)
    log("GET /auth/me role still unchanged",
        rm.status_code == 200 and rm.json().get("role") == original_role,
        f"role={rm.json().get('role')!r}")


# ---------------------------------------------------------------------------
# D. Resume CRUD lifecycle + edge cases
# ---------------------------------------------------------------------------
PDF_DATAURL_SMALL = "data:application/pdf;base64," + base64.b64encode(b"%PDF-1.4\n%fake pdf\n").decode("ascii")


def test_resume_lifecycle(token: str) -> None:
    print("\n=== D. Resume CRUD lifecycle ===")
    h = auth_headers(token)

    # Start with a clean slate: delete any existing docs
    rlist0 = requests.get(f"{BASE_URL}/users/me/resume", headers=h, timeout=10)
    if rlist0.status_code == 200:
        for d in rlist0.json().get("documents") or []:
            requests.delete(f"{BASE_URL}/users/me/resume/{d['id']}", headers=h, timeout=10)

    # POST first resume
    r1 = requests.post(f"{BASE_URL}/users/me/resume",
                       json={"name": "resume_alpha.pdf", "size": 4096, "data_url": PDF_DATAURL_SMALL},
                       headers=h, timeout=15)
    log("POST resume #1 → 200", r1.status_code == 200, short(r1))
    doc1_id = None
    if r1.status_code == 200:
        b = r1.json()
        doc1_id = b.get("id")
        log("resume #1 active=True", b.get("active") is True, f"body={b}")

    # POST second resume
    r2 = requests.post(f"{BASE_URL}/users/me/resume",
                       json={"name": "resume_beta.pdf", "size": 8192, "data_url": PDF_DATAURL_SMALL},
                       headers=h, timeout=15)
    log("POST resume #2 → 200", r2.status_code == 200, short(r2))
    doc2_id = r2.json().get("id") if r2.status_code == 200 else None
    log("resume #2 active=True", r2.json().get("active") is True if r2.status_code == 200 else False)

    # List → both listed
    rlist = requests.get(f"{BASE_URL}/users/me/resume", headers=h, timeout=10)
    docs = rlist.json().get("documents") or [] if rlist.status_code == 200 else []
    log("GET list returns 2 documents", len(docs) == 2, f"count={len(docs)}")
    # Newest first — doc2 first
    if docs:
        log("latest document listed first",
            docs[0].get("id") == doc2_id, f"first={docs[0].get('id')} expected={doc2_id}")
        # doc1 inactive, doc2 active
        id2active = {d["id"]: d.get("active") for d in docs}
        log("doc1 demoted to inactive after doc2 upload",
            id2active.get(doc1_id) is False, f"id2active={id2active}")
        log("doc2 active=True", id2active.get(doc2_id) is True, f"id2active={id2active}")

    # GET raw of doc1
    rraw = requests.get(f"{BASE_URL}/users/me/resume/{doc1_id}/raw", headers=h, timeout=10)
    log("GET /resume/{id}/raw returns data_url",
        rraw.status_code == 200 and rraw.json().get("data_url", "").startswith("data:"),
        short(rraw))

    # Activate doc1
    ract = requests.post(f"{BASE_URL}/users/me/resume/{doc1_id}/activate", headers=h, timeout=10)
    log("POST /resume/{id1}/activate → 200", ract.status_code == 200, short(ract))
    # verify
    rlist2 = requests.get(f"{BASE_URL}/users/me/resume", headers=h, timeout=10)
    a2 = {d["id"]: d.get("active") for d in rlist2.json().get("documents") or []}
    log("after activate: doc1 active, doc2 inactive",
        a2.get(doc1_id) is True and a2.get(doc2_id) is False, f"active_map={a2}")

    # Delete doc2 (inactive); doc1 remains active
    rdel2 = requests.delete(f"{BASE_URL}/users/me/resume/{doc2_id}", headers=h, timeout=10)
    log("DELETE doc2 → 200", rdel2.status_code == 200, short(rdel2))
    rlist3 = requests.get(f"{BASE_URL}/users/me/resume", headers=h, timeout=10)
    remaining = rlist3.json().get("documents") or []
    log("after deleting doc2: 1 doc left, still doc1 active",
        len(remaining) == 1 and remaining[0].get("id") == doc1_id and remaining[0].get("active") is True,
        f"remaining={remaining}")

    # Now test auto-promote: upload doc3, delete active doc3 — wait, better: upload doc3 (becomes active, doc1 inactive), then delete doc3, doc1 should auto-promote to active
    r3 = requests.post(f"{BASE_URL}/users/me/resume",
                       json={"name": "resume_gamma.pdf", "size": 2048, "data_url": PDF_DATAURL_SMALL},
                       headers=h, timeout=15)
    doc3_id = r3.json().get("id") if r3.status_code == 200 else None
    log("POST resume #3 (doc3 becomes active, doc1 demoted)", r3.status_code == 200, short(r3))
    rlist3b = requests.get(f"{BASE_URL}/users/me/resume", headers=h, timeout=10)
    a3 = {d["id"]: d.get("active") for d in rlist3b.json().get("documents") or []}
    log("before deletion: doc3 active, doc1 inactive",
        a3.get(doc3_id) is True and a3.get(doc1_id) is False, f"active_map={a3}")

    # Delete active doc3 → doc1 should auto-promote to active
    rdel3 = requests.delete(f"{BASE_URL}/users/me/resume/{doc3_id}", headers=h, timeout=10)
    log("DELETE active doc3 → 200", rdel3.status_code == 200, short(rdel3))
    rlist4 = requests.get(f"{BASE_URL}/users/me/resume", headers=h, timeout=10)
    remain = rlist4.json().get("documents") or []
    log("auto-promote: doc1 promoted back to active after active-doc delete",
        len(remain) == 1 and remain[0].get("id") == doc1_id and remain[0].get("active") is True,
        f"remain={remain}")

    # Delete doc1 → empty
    rdel1 = requests.delete(f"{BASE_URL}/users/me/resume/{doc1_id}", headers=h, timeout=10)
    log("DELETE doc1 → 200", rdel1.status_code == 200, short(rdel1))
    rlist5 = requests.get(f"{BASE_URL}/users/me/resume", headers=h, timeout=10)
    log("document list now empty",
        (rlist5.json().get("documents") or []) == [], short(rlist5))

    # Edge: invalid data_url
    re1 = requests.post(f"{BASE_URL}/users/me/resume",
                        json={"name": "bad.pdf", "size": 10, "data_url": "notadataurl"},
                        headers=h, timeout=10)
    log("POST with non data: URL → 400", re1.status_code == 400, short(re1))

    # Edge: size too large
    re2 = requests.post(f"{BASE_URL}/users/me/resume",
                        json={"name": "big.pdf", "size": 6_000_000, "data_url": PDF_DATAURL_SMALL},
                        headers=h, timeout=10)
    log("POST size=6MB → 400 File too large", re2.status_code == 400, short(re2))

    # Edge: raw of nonexistent
    re3 = requests.get(f"{BASE_URL}/users/me/resume/doesnotexist/raw", headers=h, timeout=10)
    log("GET raw nonexistent → 404", re3.status_code == 404, short(re3))

    # Edge: delete nonexistent
    re4 = requests.delete(f"{BASE_URL}/users/me/resume/doesnotexist", headers=h, timeout=10)
    log("DELETE nonexistent → 404", re4.status_code == 404, short(re4))

    # Edge: activate nonexistent
    re5 = requests.post(f"{BASE_URL}/users/me/resume/doesnotexist/activate", headers=h, timeout=10)
    log("POST activate nonexistent → 404", re5.status_code == 404, short(re5))


# ---------------------------------------------------------------------------
# E. Preferences deep-merge
# ---------------------------------------------------------------------------
def test_preferences_deep_merge(token: str) -> None:
    print("\n=== E. Preferences deep-merge ===")
    h = auth_headers(token)

    # Seed with multi-key dict in existing sub-objects
    seed = {
        "notifications": {"messages": True, "requests": True, "mentions": True,
                          "weekly_digest": False, "new_matches": True},
        "app": {"theme": "dark", "language": "en"},
    }
    rseed = requests.patch(f"{BASE_URL}/users/me/preferences", json=seed, headers=h, timeout=10)
    log("PATCH seed preferences → 200", rseed.status_code == 200, short(rseed))

    # Patch partial: only notifications.messages=false + app.theme=light
    patch1 = {"notifications": {"messages": False}, "app": {"theme": "light"}}
    r1 = requests.patch(f"{BASE_URL}/users/me/preferences", json=patch1, headers=h, timeout=10)
    log("PATCH partial #1 → 200", r1.status_code == 200, short(r1))
    prefs1 = r1.json().get("preferences") or {}
    # Verify merged, not replaced
    notif = prefs1.get("notifications") or {}
    appp = prefs1.get("app") or {}
    log("deep-merge: notifications.messages=False",
        notif.get("messages") is False, f"notif={notif}")
    log("deep-merge: notifications.requests STILL True (not wiped)",
        notif.get("requests") is True, f"notif={notif}")
    log("deep-merge: notifications.weekly_digest STILL False (not wiped)",
        notif.get("weekly_digest") is False, f"notif={notif}")
    log("deep-merge: app.theme=light",
        appp.get("theme") == "light", f"app={appp}")
    log("deep-merge: app.language STILL 'en' (not wiped)",
        appp.get("language") == "en", f"app={appp}")

    # Verify persistence via /auth/me (preferences lives on user doc)
    # Note: /auth/me UserResponse doesn't include preferences, so use PATCH echo round-trip
    patch2 = {"notifications": {"requests": False}}
    r2 = requests.patch(f"{BASE_URL}/users/me/preferences", json=patch2, headers=h, timeout=10)
    log("PATCH partial #2 → 200", r2.status_code == 200, short(r2))
    prefs2 = r2.json().get("preferences") or {}
    n2 = prefs2.get("notifications") or {}
    log("after 2nd patch: messages=False AND requests=False",
        n2.get("messages") is False and n2.get("requests") is False,
        f"notif={n2}")
    log("after 2nd patch: app.language still 'en'",
        (prefs2.get("app") or {}).get("language") == "en",
        f"app={prefs2.get('app')}")


# ---------------------------------------------------------------------------
# F. Password change
# ---------------------------------------------------------------------------
def test_password_change(token: str) -> str:
    print("\n=== F. Password change ===")
    h = auth_headers(token)

    # Wrong current
    r1 = requests.post(f"{BASE_URL}/users/me/password",
                       json={"current_password": "WRONG_PASS", "new_password": "NewStrong@123"},
                       headers=h, timeout=10)
    log("POST password with wrong current → 400", r1.status_code == 400, short(r1))

    # Too short new
    r2 = requests.post(f"{BASE_URL}/users/me/password",
                       json={"current_password": STUDENT_PASSWORD, "new_password": "abc"},
                       headers=h, timeout=10)
    log("POST password with short new (<8) → 400", r2.status_code == 400, short(r2))

    # Success
    new_pw = "NewStrong@456"
    r3 = requests.post(f"{BASE_URL}/users/me/password",
                       json={"current_password": STUDENT_PASSWORD, "new_password": new_pw},
                       headers=h, timeout=10)
    log("POST password with valid current+new → 200", r3.status_code == 200, short(r3))
    log("response status='ok'",
        r3.status_code == 200 and r3.json().get("status") == "ok", short(r3))

    # Old token still works
    rm = requests.get(f"{BASE_URL}/auth/me", headers=h, timeout=10)
    log("old access token still valid after password change", rm.status_code == 200, short(rm))

    # Login with NEW password works
    rl = requests.post(f"{BASE_URL}/auth/login",
                       json={"email": STUDENT_EMAIL, "password": new_pw}, timeout=10)
    log("login with new password → 200", rl.status_code == 200, short(rl))

    # Login with OLD password fails
    rl2 = requests.post(f"{BASE_URL}/auth/login",
                        json={"email": STUDENT_EMAIL, "password": STUDENT_PASSWORD}, timeout=10)
    log("login with old password → 401", rl2.status_code == 401, short(rl2))

    # === CRITICAL: Reset back to TestPass@123 so other tests continue ===
    # Use the new-password session to reset
    token_new = rl.json().get("access_token") if rl.status_code == 200 else None
    if token_new:
        h_new = auth_headers(token_new)
        rreset = requests.post(f"{BASE_URL}/users/me/password",
                               json={"current_password": new_pw, "new_password": STUDENT_PASSWORD},
                               headers=h_new, timeout=10)
        log("RESET password back to TestPass@123 → 200",
            rreset.status_code == 200, short(rreset))
        # Verify restore
        rlr = requests.post(f"{BASE_URL}/auth/login",
                            json={"email": STUDENT_EMAIL, "password": STUDENT_PASSWORD}, timeout=10)
        log("login with original TestPass@123 restored → 200", rlr.status_code == 200, short(rlr))
        return rlr.json().get("access_token") if rlr.status_code == 200 else token
    log("UNABLE TO RESET PASSWORD — other tests may break!", False, "no new-token")
    return token


# ---------------------------------------------------------------------------
# Sanity — other roles still authenticate
# ---------------------------------------------------------------------------
def test_sanity_other_roles() -> None:
    print("\n=== Sanity: mentor + admin login ===")
    try:
        tkm, um = login(MENTOR_EMAIL, MENTOR_PASSWORD)
        log("mentor01 login still works", um.get("role") == "mentor", f"role={um.get('role')}")
    except AssertionError as e:
        log("mentor01 login still works", False, str(e))
    try:
        tka, ua = login(ADMIN_EMAIL, ADMIN_PASSWORD)
        log("admin login still works", ua.get("role") == "admin", f"role={ua.get('role')}")
    except AssertionError as e:
        log("admin login still works", False, str(e))


# ---------------------------------------------------------------------------
# Restore student profile after tests (so interests/skills/full_name etc.
# aren't polluted for other test runs).  Best-effort.
# ---------------------------------------------------------------------------
def restore_profile(token: str, original: dict) -> None:
    print("\n=== Cleanup: restore original student profile ===")
    h = auth_headers(token)
    restore = {
        "full_name": original.get("full_name") or "Student 01",
        "interests": original.get("interests") or [],
        "skills": original.get("skills") or [],
        "bio": original.get("bio") or "",
        "headline": (original.get("headline") or "") if isinstance(original, dict) else "",
    }
    r = requests.put(f"{BASE_URL}/users/me", json=restore, headers=h, timeout=15)
    log("restore profile fields → 200", r.status_code == 200, short(r))


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    print(f"BASE_URL = {BASE_URL}")
    try:
        token, user = login(STUDENT_EMAIL, STUDENT_PASSWORD)
    except AssertionError as e:
        print(f"\n[{FAIL}] Cannot login as student01 — aborting: {e}")
        return 1
    print(f"Logged in as student01 (user_id={user.get('id')}, role={user.get('role')})")

    original_student = dict(user)  # snapshot for cleanup

    test_auth_gating()
    test_happy_path(token)
    test_disallowed_fields(token)
    test_resume_lifecycle(token)
    test_preferences_deep_merge(token)

    # Password test MUST come last because it re-auths.
    token = test_password_change(token)

    # Restore profile to clean baseline
    restore_profile(token, original_student)

    test_sanity_other_roles()

    # --------- Summary ---------
    print("\n" + "=" * 70)
    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print(f"RESULT: {passed}/{total} checks PASSED")
    fails = [(n, d) for n, ok, d in results if not ok]
    if fails:
        print("\nFAILED CHECKS:")
        for n, d in fails:
            print(f"  ❌ {n}  —  {d}")
    print("=" * 70)
    return 0 if passed == total else 2


if __name__ == "__main__":
    sys.exit(main())
