"""Backend tests for marketplace/test connection, existing super-admin endpoints,
and user lifecycle (approve/disable/restore).

Run: python3 /app/backend_test.py
"""
from __future__ import annotations
import json
import sys
import requests

BASE = "https://hiring-mvvm.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin-super1@persona.demo"
ADMIN_PWD   = "TestPass@123"

PASS = 0
FAIL = 0
FAILURES: list[str] = []


def _check(name: str, cond: bool, detail: str = ""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  PASS {name}")
    else:
        FAIL += 1
        FAILURES.append(f"{name} -- {detail}")
        print(f"  FAIL {name} :: {detail}")


def login() -> str:
    r = requests.post(f"{BASE}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PWD}, timeout=30)
    if r.status_code != 200:
        print(f"FATAL: login failed: {r.status_code} {r.text[:300]}")
        sys.exit(2)
    return r.json()["access_token"]


def main():
    print(f"==== Logging in as {ADMIN_EMAIL} ====")
    token = login()
    H = {"Authorization": f"Bearer {token}"}
    print("Login OK\n")

    # --- 1. Marketplace test connection ----------------------------------
    print("=== 1. POST /api/marketplace/test ===")

    r = requests.post(f"{BASE}/marketplace/test", headers=H,
                      json={"tool_id": "openai", "credentials": {}}, timeout=30)
    _check("1a openai missing creds -> 200", r.status_code == 200, f"status={r.status_code} body={r.text[:200]}")
    if r.status_code == 200:
        j = r.json()
        _check("1a body.ok=False", j.get("ok") is False, f"got {j}")
        _check("1a message contains 'Missing'", "Missing" in str(j.get("message", "")), f"msg={j.get('message')}")
        _check("1a message mentions 'OpenAI API Key'", "OpenAI API Key" in str(j.get("message", "")), f"msg={j.get('message')}")

    r = requests.post(f"{BASE}/marketplace/test", headers=H,
                      json={"tool_id": "openai", "credentials": {"api_key": "sk-INVALID-KEY-FOR-TESTING-12345"}}, timeout=30)
    _check("1b openai invalid key -> 200", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        j = r.json()
        _check("1b ok=False", j.get("ok") is False, f"got {j}")
        _check("1b msg mentions OpenAI HTTP", ("OpenAI" in str(j.get("message", ""))) and ("HTTP" in str(j.get("message", ""))), f"msg={j.get('message')}")

    r = requests.post(f"{BASE}/marketplace/test", headers=H,
                      json={"tool_id": "notion", "credentials": {"api_key": "secret_INVALID"}}, timeout=30)
    _check("1c notion invalid key -> 200", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        j = r.json()
        _check("1c ok=False", j.get("ok") is False, f"got {j}")
        _check("1c msg mentions Notion HTTP", "Notion" in str(j.get("message", "")) and "HTTP" in str(j.get("message", "")), f"msg={j.get('message')}")

    r = requests.post(f"{BASE}/marketplace/test", headers=H,
                      json={"tool_id": "github", "credentials": {"api_key": "ghp_INVALID"}}, timeout=30)
    _check("1d github invalid key -> 200", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        j = r.json()
        _check("1d ok=False", j.get("ok") is False, f"got {j}")
        _check("1d msg mentions GitHub HTTP", "GitHub" in str(j.get("message", "")) and "HTTP" in str(j.get("message", "")), f"msg={j.get('message')}")

    r = requests.post(f"{BASE}/marketplace/test", headers=H,
                      json={"tool_id": "doesnotexist", "credentials": {}}, timeout=30)
    _check("1e unknown tool -> 404", r.status_code == 404, f"status={r.status_code} body={r.text[:200]}")
    if r.status_code == 404:
        _check("1e detail mentions 'Tool not found'", "Tool not found" in r.text, f"body={r.text[:200]}")

    r = requests.post(f"{BASE}/marketplace/test", headers=H,
                      json={"tool_id": "calendly", "credentials": {"api_key": "any"}}, timeout=30)
    _check("1f calendly any key -> 200", r.status_code == 200, f"status={r.status_code} body={r.text[:200]}")
    if r.status_code == 200:
        j = r.json()
        _check("1f ok=True", j.get("ok") is True, f"got {j}")
        _check("1f msg mentions 'no live check'", "no live check" in str(j.get("message", "")).lower(), f"msg={j.get('message')}")

    # --- 2. Existing endpoints regression --------------------------------
    print("\n=== 2. Existing endpoints regression ===")
    r = requests.get(f"{BASE}/marketplace/tools", headers=H, timeout=30)
    _check("2.1 GET /marketplace/tools -> 200", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        j = r.json()
        tools = j.get("all") or []
        groups = j.get("groups") or []
        _check(f"2.1 62 tools (got {len(tools)})", len(tools) == 62, f"got {len(tools)}")
        _check(f"2.1 19 categories (got {len(groups)})", len(groups) == 19, f"got {len(groups)}")

    r1 = requests.post(f"{BASE}/admin/colleges/backfill", headers=H, timeout=60)
    _check("2.2a backfill call 1 -> 200", r1.status_code == 200, f"status={r1.status_code} body={r1.text[:200]}")
    r2 = requests.post(f"{BASE}/admin/colleges/backfill", headers=H, timeout=60)
    _check("2.2b backfill call 2 (idempotent) -> 200", r2.status_code == 200, f"status={r2.status_code} body={r2.text[:200]}")

    r = requests.get(f"{BASE}/admin/super/events", headers=H, timeout=30)
    _check("2.3 /admin/super/events -> 200", r.status_code == 200, f"status={r.status_code} body={r.text[:200]}")

    r = requests.get(f"{BASE}/admin/super/payments", headers=H, timeout=30)
    _check("2.4 /admin/super/payments -> 200", r.status_code == 200, f"status={r.status_code} body={r.text[:200]}")

    r = requests.get(f"{BASE}/admin/super/analytics", headers=H, timeout=30)
    _check("2.5 /admin/super/analytics -> 200", r.status_code == 200, f"status={r.status_code} body={r.text[:200]}")

    r = requests.get(f"{BASE}/admin/colleges/list", headers=H, timeout=30)
    _check("2.6 /admin/colleges/list -> 200", r.status_code == 200, f"status={r.status_code} body={r.text[:200]}")
    if r.status_code == 200:
        body = r.json()
        items = body if isinstance(body, list) else (body.get("items") or body.get("colleges") or [])
        _check(f"2.6 list-shape (n={len(items) if isinstance(items, list) else 'non-list'})", isinstance(items, list), f"body keys={list(body)[:5] if isinstance(body, dict) else type(body)}")

    # --- 3. User lifecycle on 3 alumni users -----------------------------
    print("\n=== 3. User lifecycle (approve/disable/restore) on 3 alumni ===")
    r = requests.get(f"{BASE}/admin/users/list", params={"category": "alumni", "limit": 5}, headers=H, timeout=30)
    _check("3.0 fetch alumni list -> 200", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        items = r.json().get("items") or []
        targets = items[:3]
        _check(f"3.0 have 3 alumni (found {len(targets)})", len(targets) >= 3, f"found {len(items)}")
        for u in targets:
            uid = u["id"]
            label = f"{u.get('name')}<{uid}>"
            r = requests.post(f"{BASE}/admin/users/profile/{uid}/approve", headers=H, timeout=30)
            _check(f"3 approve {label} -> 200", r.status_code == 200, f"status={r.status_code} body={r.text[:200]}")
            if r.status_code == 200:
                _check("3 approve ok=True", r.json().get("ok") is True, f"body={r.text[:200]}")
            r = requests.post(f"{BASE}/admin/users/profile/{uid}/disable", headers=H, timeout=30)
            _check(f"3 disable {label} -> 200", r.status_code == 200, f"status={r.status_code} body={r.text[:200]}")
            if r.status_code == 200:
                _check("3 disable ok=True", r.json().get("ok") is True, f"body={r.text[:200]}")
            r = requests.post(f"{BASE}/admin/users/profile/{uid}/restore", headers=H, timeout=30)
            _check(f"3 restore {label} -> 200", r.status_code == 200, f"status={r.status_code} body={r.text[:200]}")
            if r.status_code == 200:
                _check("3 restore ok=True", r.json().get("ok") is True, f"body={r.text[:200]}")

    print("\n" + "=" * 60)
    print(f"TOTAL  PASS = {PASS}   FAIL = {FAIL}")
    if FAILURES:
        print("\nFailures:")
        for f in FAILURES:
            print(f"  - {f}")
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
