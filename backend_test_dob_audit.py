"""
Phase A validation — RegisterRequest DOB + country_code + postal_code +
audit_logs collection side-effects.

Tests against the live backend URL (from frontend/.env) and live MongoDB
(from backend/.env).
"""
import os
import sys
import time
import uuid
import json
import asyncio
from datetime import datetime, timezone, date, timedelta
from typing import Any, Dict, List, Tuple

import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load backend .env so we get MONGO_URL + DB_NAME
load_dotenv("/app/backend/.env")

BACKEND = "https://hiring-mvvm.preview.emergentagent.com"
API = f"{BACKEND}/api"
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

PASS = []
FAIL = []


def record(name: str, ok: bool, detail: str = ""):
    if ok:
        PASS.append(name)
        print(f"✅ PASS  {name}")
    else:
        FAIL.append((name, detail))
        print(f"❌ FAIL  {name}\n        {detail}")


async def get_audit_logs(db, user_id: str) -> List[Dict[str, Any]]:
    cursor = db.audit_logs.find({"user_id": user_id})
    return [doc async for doc in cursor]


async def main():
    mongo = AsyncIOMotorClient(MONGO_URL)
    db = mongo[DB_NAME]

    async with httpx.AsyncClient(timeout=30.0) as http:

        # ---- Sub-case A: Register with full payload (new fields) ----
        print("\n=== A. Register with DOB + country_code + postal_code ===")
        unique = uuid.uuid4().hex[:10]
        email_A = f"dob_test_{unique}@test.com"
        payload_A = {
            "email": email_A,
            "password": "TestPass@123",
            "full_name": "DOB Test",
            "role": "mentor",
            "phone": "+919999998877",
            "dob": "1990-05-12",
            "country_code": "IN",
            "postal_code": "110001",
        }
        r = await http.post(f"{API}/auth/register", json=payload_A)
        record("A.1 POST /auth/register returns 200",
               r.status_code == 200,
               f"status={r.status_code} body={r.text[:400]}")
        access_token_A = None
        user_id_A = None
        if r.status_code == 200:
            body = r.json()
            user = body.get("user", {})
            access_token_A = body.get("access_token")
            user_id_A = user.get("id")
            record("A.2 Response has access_token",
                   bool(access_token_A),
                   f"body keys={list(body.keys())}")
            record("A.3 user.dob == '1990-05-12'",
                   user.get("dob") == "1990-05-12",
                   f"actual={user.get('dob')!r}  full user={json.dumps(user)[:500]}")
            record("A.4 user.country_code == 'IN'",
                   user.get("country_code") == "IN",
                   f"actual={user.get('country_code')!r}")
            record("A.5 user.postal_code == '110001'",
                   user.get("postal_code") == "110001",
                   f"actual={user.get('postal_code')!r}")
            record("A.6 user.phone echoed",
                   user.get("phone") == "+919999998877",
                   f"actual={user.get('phone')!r}")

        # ---- Sub-case B: GET /api/auth/me returns the new fields ----
        print("\n=== B. GET /auth/me exposes new fields ===")
        if access_token_A:
            headers = {"Authorization": f"Bearer {access_token_A}"}
            r = await http.get(f"{API}/auth/me", headers=headers)
            record("B.1 GET /auth/me returns 200",
                   r.status_code == 200,
                   f"status={r.status_code} body={r.text[:400]}")
            if r.status_code == 200:
                me = r.json()
                record("B.2 /auth/me.dob == '1990-05-12'",
                       me.get("dob") == "1990-05-12",
                       f"actual={me.get('dob')!r}")
                record("B.3 /auth/me.country_code == 'IN'",
                       me.get("country_code") == "IN",
                       f"actual={me.get('country_code')!r}")
                record("B.4 /auth/me.postal_code == '110001'",
                       me.get("postal_code") == "110001",
                       f"actual={me.get('postal_code')!r}")

        # ---- Sub-case C: Audit logs present ----
        print("\n=== C. Audit log entries created on register ===")
        if user_id_A:
            # Small wait in case of write lag.
            await asyncio.sleep(0.3)
            logs = await get_audit_logs(db, user_id_A)
            print(f"  Found {len(logs)} audit entries for user {user_id_A}")
            for L in logs:
                print(f"    • field={L.get('field_name')!r:<16} "
                      f"new={str(L.get('new_value'))[:40]:<40} "
                      f"source={L.get('source')!r}  "
                      f"validation={L.get('validation_status')!r}")
            record("C.1 At least 7 audit entries exist",
                   len(logs) >= 7,
                   f"found={len(logs)}")

            by_field = {L["field_name"]: L for L in logs}
            for f in ("email", "full_name", "role", "phone", "dob",
                      "country_code", "postal_code"):
                record(f"C.2.{f} audit entry for '{f}' exists",
                       f in by_field,
                       f"available={list(by_field.keys())}")

            # Check contents
            for (field, expected) in [
                ("email", email_A),
                ("full_name", "DOB Test"),
                ("role", "mentor"),
                ("phone", "+919999998877"),
                ("dob", "1990-05-12"),
                ("country_code", "IN"),
                ("postal_code", "110001"),
            ]:
                L = by_field.get(field)
                if not L:
                    continue
                record(f"C.3.{field} source == 'register'",
                       L.get("source") == "register",
                       f"source={L.get('source')!r}")
                record(f"C.3.{field} old_value is None",
                       L.get("old_value") is None,
                       f"old_value={L.get('old_value')!r}")
                record(f"C.3.{field} new_value == expected",
                       L.get("new_value") == expected,
                       f"new_value={L.get('new_value')!r}  expected={expected!r}")
                record(f"C.3.{field} validation_status == 'passed'",
                       L.get("validation_status") == "passed",
                       f"validation_status={L.get('validation_status')!r}")
                ts = L.get("ts")
                ts_ok = False
                if isinstance(ts, datetime):
                    # Recent = within last 5 minutes
                    ts_utc = ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
                    ts_ok = abs((datetime.now(timezone.utc) - ts_utc).total_seconds()) < 300
                record(f"C.3.{field} ts is a recent UTC datetime",
                       ts_ok, f"ts={ts!r}")

        # ---- Sub-case D: DOB validation ----
        print("\n=== D. DOB validation — future / under-13 / malformed / missing ===")

        async def _register_expect(code_range, name_prefix, extra):
            u = uuid.uuid4().hex[:8]
            body = {
                "email": f"{name_prefix}_{u}@test.com",
                "password": "TestPass@123",
                "full_name": f"{name_prefix} User",
                "role": "student",
                **extra,
            }
            return await http.post(f"{API}/auth/register", json=body), body

        # D.1 Future DOB
        r, body = await _register_expect(422, "future_dob", {"dob": "2030-01-01"})
        msg = r.text
        record("D.1 Future dob → 422",
               r.status_code == 422,
               f"status={r.status_code} body={r.text[:400]}")
        if r.status_code == 422:
            record("D.1b 422 message mentions 'future'",
                   "future" in r.text.lower(),
                   f"body={r.text[:500]}")

        # D.2 Under-13 DOB
        today = date.today()
        under_13 = (today - timedelta(days=365 * 10)).isoformat()  # age ~10
        r, body = await _register_expect(422, "under13", {"dob": under_13})
        record("D.2 Under-13 dob → 422",
               r.status_code == 422,
               f"status={r.status_code} dob={under_13} body={r.text[:400]}")
        if r.status_code == 422:
            record("D.2b 422 message mentions min-age",
                   ("13" in r.text or "year" in r.text.lower()),
                   f"body={r.text[:500]}")

        # D.3 Malformed DOB
        r, body = await _register_expect(422, "bad_fmt", {"dob": "not-a-date"})
        record("D.3 Malformed dob → 422",
               r.status_code == 422,
               f"status={r.status_code} body={r.text[:400]}")
        if r.status_code == 422:
            record("D.3b 422 message mentions format",
                   ("format" in r.text.lower() or "yyyy" in r.text.lower()
                    or "yyyy-mm-dd" in r.text.lower()),
                   f"body={r.text[:500]}")

        # D.4 No DOB → 200
        r, body = await _register_expect(200, "no_dob", {})
        record("D.4 No dob field → 200 OK",
               r.status_code == 200,
               f"status={r.status_code} body={r.text[:400]}")

        # ---- Sub-case E: Backwards-compat for legacy user ----
        print("\n=== E. Backwards-compat — mentor01@test.com ===")
        r = await http.post(f"{API}/auth/login", json={
            "email": "mentor01@test.com",
            "password": "TestPass@123",
        })
        record("E.1 Login mentor01 → 200",
               r.status_code == 200,
               f"status={r.status_code} body={r.text[:300]}")
        if r.status_code == 200:
            jb = r.json()
            tok = jb.get("access_token")
            user_obj = jb.get("user", {})
            record("E.2 mentor01 login response has user object",
                   isinstance(user_obj, dict),
                   f"body keys={list(jb.keys())}")
            record("E.3 mentor01 role == 'mentor'",
                   user_obj.get("role") == "mentor",
                   f"role={user_obj.get('role')!r}")
            if tok:
                r2 = await http.get(f"{API}/auth/me",
                                    headers={"Authorization": f"Bearer {tok}"})
                record("E.4 GET /auth/me for mentor01 → 200",
                       r2.status_code == 200,
                       f"status={r2.status_code} body={r2.text[:400]}")
                if r2.status_code == 200:
                    me = r2.json()
                    # For legacy users, new fields should be null (not cause serialization error)
                    record("E.5 /auth/me returns JSON even for legacy user",
                           isinstance(me, dict) and "email" in me,
                           f"me={str(me)[:400]}")
                    # Should not have caused a 500
                    record("E.6 dob/country_code/postal_code present (possibly null)",
                           ("dob" in me) and ("country_code" in me) and ("postal_code" in me),
                           f"keys={list(me.keys())}")

        # ---- Sub-case F: Edge cases ----
        print("\n=== F. Edge cases — empty country_code + duplicate email ===")

        # F.1 Empty country_code → 200
        uniq = uuid.uuid4().hex[:8]
        r = await http.post(f"{API}/auth/register", json={
            "email": f"empty_cc_{uniq}@test.com",
            "password": "TestPass@123",
            "full_name": "Empty CC",
            "role": "student",
            "country_code": "",
        })
        record("F.1 Empty country_code → 200",
               r.status_code == 200,
               f"status={r.status_code} body={r.text[:400]}")

        # F.2 Duplicate email → 400/409
        if access_token_A:
            r = await http.post(f"{API}/auth/register", json={
                "email": email_A,  # same as A
                "password": "TestPass@123",
                "full_name": "Duplicate",
                "role": "student",
            })
            record("F.2 Duplicate email → 400/409",
                   r.status_code in (400, 409),
                   f"status={r.status_code} body={r.text[:400]}")

    # ---- Summary ----
    print("\n" + "=" * 70)
    print(f"RESULT: {len(PASS)} PASS  /  {len(FAIL)} FAIL")
    print("=" * 70)
    if FAIL:
        print("\nFAILURES:")
        for (n, d) in FAIL:
            print(f"  ❌ {n}\n        {d}")
    mongo.close()
    sys.exit(0 if not FAIL else 1)


if __name__ == "__main__":
    asyncio.run(main())
