#!/usr/bin/env python3
"""Re-verify mentor session endpoints after uuid import fix."""
import os
import requests
import json
import sys

BASE = "https://hiring-mvvm.preview.emergentagent.com/api"

def main():
    # Login as mentor01
    r = requests.post(f"{BASE}/auth/login", json={
        "email": "mentor01@test.com",
        "password": "TestPass@123"
    }, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    token = r.json()["access_token"]
    print(f"[OK] Login mentor01 -> 200, role={r.json()['user'].get('role')}")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. POST /api/mentor/sessions
    payload = {
        "title": "Mock Interview Workshop",
        "topic": "Live mock interview practice",
        "scheduled_at": "2025-08-15 18:30",
        "duration_minutes": 45,
        "max_attendees": 3,
    }
    r1 = requests.post(f"{BASE}/mentor/sessions", json=payload, headers=headers, timeout=30)
    print(f"\n--- Test 1: POST /api/mentor/sessions ---")
    print(f"Status: {r1.status_code}")
    print(f"Body: {json.dumps(r1.json(), indent=2)[:1000]}")
    if r1.status_code != 200:
        print("[FAIL]")
        return 1
    body = r1.json()
    if not body.get("ok"):
        print(f"[FAIL] ok != true")
        return 1
    session_id = body.get("session", {}).get("id")
    if not session_id:
        print(f"[FAIL] session.id missing")
        return 1
    print(f"[PASS] session.id = {session_id}")

    # 2. GET /api/mentor/sessions/me
    r2 = requests.get(f"{BASE}/mentor/sessions/me", headers=headers, timeout=30)
    print(f"\n--- Test 2: GET /api/mentor/sessions/me ---")
    print(f"Status: {r2.status_code}")
    body2 = r2.json()
    print(f"Body (truncated): {json.dumps(body2, indent=2)[:1500]}")
    if r2.status_code != 200:
        print("[FAIL]")
        return 1
    sessions = body2.get("sessions", body2 if isinstance(body2, list) else [])
    if isinstance(body2, dict) and "sessions" in body2:
        sessions = body2["sessions"]
    elif isinstance(body2, list):
        sessions = body2
    found = any(s.get("id") == session_id for s in sessions)
    print(f"Total sessions returned: {len(sessions)}")
    print(f"Created session in list: {found}")
    if not found:
        print("[FAIL] created session not found in list")
        return 1
    print(f"[PASS] session {session_id} appears in /mentor/sessions/me")

    print("\n=== ALL 2/2 TESTS PASS ===")
    return 0

if __name__ == "__main__":
    sys.exit(main())
