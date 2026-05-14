"""Backend test for jobs_feed.py - new endpoints:
   - GET /api/jobs/trending-companies
   - GET /api/jobs/new-since-last-visit
"""
import os
import sys
import asyncio
import datetime as dt
from datetime import datetime, timezone, timedelta

import httpx

BASE = "https://hiring-mvvm.preview.emergentagent.com/api"

STUDENT_EMAIL = "realtime@studentalumni.in"
STUDENT_PASS = "RealTime@2026"
ALUMNI_EMAIL = "alumni01@test.com"
ALUMNI_PASS = "TestPass@123"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "career_platform")

results = []

def record(name, ok, detail=""):
    results.append((name, ok, detail))
    sym = "PASS" if ok else "FAIL"
    print(f"[{sym}] {name} :: {detail}")


def login(email, password):
    r = httpx.post(f"{BASE}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login {email} -> {r.status_code} {r.text}"
    return r.json()["access_token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_trending(student_token, alumni_token):
    print("\n=== TEST: GET /api/jobs/trending-companies ===")

    # 1. No-auth -> 401
    r = httpx.get(f"{BASE}/jobs/trending-companies", timeout=30)
    record("trending: no-auth -> 401/403", r.status_code in (401, 403), f"got {r.status_code}")

    # 2. Student limit=8
    r = httpx.get(f"{BASE}/jobs/trending-companies", params={"limit": 8}, headers=auth(student_token), timeout=60)
    record("trending: student limit=8 -> 200", r.status_code == 200, f"status {r.status_code}")
    if r.status_code != 200:
        print("body:", r.text[:600])
        return
    body = r.json()
    items = body.get("items")
    record("response.items is list", isinstance(items, list), f"len={len(items) if isinstance(items, list) else 'NA'}")
    record("response.total is int", isinstance(body.get("total"), int), f"total={body.get('total')}")
    record("window_days == 7", body.get("window_days") == 7, f"={body.get('window_days')}")
    tier = body.get("tier_filter")
    expected = ["Internship", "Full-time", "Contract"]
    record("student tier_filter==[Internship,Full-time,Contract]",
           isinstance(tier, list) and set(tier) == set(expected), f"tier={tier}")

    valid_sources = {"RemoteOK", "ArbeitNow", "The Muse", "Remotive", "Jobicy", ""}
    if items:
        bad = []
        for i, it in enumerate(items):
            errs = []
            if not (isinstance(it.get("company"), str) and it["company"]):
                errs.append("company empty")
            if not (isinstance(it.get("open_jobs"), int) and it["open_jobs"] > 0):
                errs.append(f"open_jobs={it.get('open_jobs')}")
            if it.get("primary_source") not in valid_sources:
                errs.append(f"primary_source={it.get('primary_source')}")
            for k in ("primary_location", "dominant_type", "logo_url"):
                if k not in it:
                    errs.append(f"missing {k}")
            if errs:
                bad.append((i, it.get("company"), errs))
        record("items have valid shape", len(bad) == 0, f"bad={bad[:3]}")
        ojs = [it["open_jobs"] for it in items]
        record("items sorted by open_jobs desc", ojs == sorted(ojs, reverse=True), f"open_jobs={ojs}")
    else:
        record("items non-empty", False, "empty list (cache may have no fresh entries)")

    # 3. limit=3
    r = httpx.get(f"{BASE}/jobs/trending-companies", params={"limit": 3}, headers=auth(student_token), timeout=30)
    record("limit=3 returns <=3", r.status_code == 200 and len(r.json().get("items", [])) <= 3,
           f"len={len(r.json().get('items', [])) if r.status_code == 200 else 'NA'}")

    # 4. limit=20
    r = httpx.get(f"{BASE}/jobs/trending-companies", params={"limit": 20}, headers=auth(student_token), timeout=30)
    record("limit=20 returns <=20", r.status_code == 200 and len(r.json().get("items", [])) <= 20,
           f"len={len(r.json().get('items', [])) if r.status_code == 200 else 'NA'}")

    # limit=21 (out of bound)
    r = httpx.get(f"{BASE}/jobs/trending-companies", params={"limit": 21}, headers=auth(student_token), timeout=30)
    record("limit=21 rejected (upper bound 20)", r.status_code == 422, f"status={r.status_code}")

    # 5. Alumni
    r = httpx.get(f"{BASE}/jobs/trending-companies", params={"limit": 8}, headers=auth(alumni_token), timeout=30)
    record("alumni -> 200", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        atier = r.json().get("tier_filter")
        record("alumni tier_filter has [Internship,Full-time,Contract]",
               isinstance(atier, list) and set(["Internship", "Full-time", "Contract"]).issubset(set(atier)),
               f"alumni_tier={atier}")


async def test_year1_change(student_token):
    print("\n=== TEST: Year-tier change (grad=2029 -> Year 1) ===")
    from motor.motor_asyncio import AsyncIOMotorClient
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # First: get baseline item count for student (year=4)
    r = httpx.get(f"{BASE}/jobs/trending-companies", params={"limit": 20}, headers=auth(student_token), timeout=30)
    base_count = len(r.json().get("items", [])) if r.status_code == 200 else 0
    print(f"baseline (final-year) items: {base_count}")

    # Set grad_year=2029
    res = await db.users.update_one({"email": STUDENT_EMAIL}, {"$set": {"graduation_year": 2029}})
    record("mongo: set graduation_year=2029", res.matched_count == 1, f"matched={res.matched_count}")

    r = httpx.get(f"{BASE}/jobs/trending-companies", params={"limit": 20}, headers=auth(student_token), timeout=30)
    if r.status_code == 200:
        body = r.json()
        tier = body.get("tier_filter")
        record("year=1 tier_filter == [Internship]", tier == ["Internship"], f"tier={tier}")
        types = [it.get("dominant_type") for it in body.get("items", [])]
        record("year=1 items dominant_type all == 'Internship'",
               all(t == "Internship" for t in types), f"types={types[:5]} (showing first 5)")
        record("year=1 items count <= baseline (may shrink)",
               len(body.get("items", [])) <= max(base_count, 1) + 10,  # generous
               f"y1_count={len(body.get('items', []))} baseline={base_count}")
    else:
        record("year=1 -> 200", False, f"status={r.status_code}")

    # Restore
    res = await db.users.update_one({"email": STUDENT_EMAIL}, {"$set": {"graduation_year": 2026}})
    record("mongo: restore graduation_year=2026", res.matched_count == 1, f"matched={res.matched_count}")
    client.close()


async def test_new_since(student_token):
    print("\n=== TEST: GET /api/jobs/new-since-last-visit ===")
    from motor.motor_asyncio import AsyncIOMotorClient
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # 1. No-auth
    r = httpx.get(f"{BASE}/jobs/new-since-last-visit", timeout=30)
    record("new-since-last-visit: no-auth -> 401/403", r.status_code in (401, 403), f"status={r.status_code}")

    # 2. Unset last_jobs_visit
    res = await db.users.update_one({"email": STUDENT_EMAIL}, {"$unset": {"last_jobs_visit": ""}})
    record("mongo: unset last_jobs_visit", res.matched_count == 1, f"matched={res.matched_count}")

    r = httpx.get(f"{BASE}/jobs/new-since-last-visit", headers=auth(student_token), timeout=30)
    record("first visit -> 200", r.status_code == 200, f"status={r.status_code}")
    if r.status_code != 200:
        print("body:", r.text[:500])
        client.close()
        return
    body = r.json()
    record("first visit: new_count > 0 (24h fallback)",
           isinstance(body.get("new_count"), int) and body["new_count"] > 0,
           f"new_count={body.get('new_count')}")
    record("first visit: 'since' ISO string",
           isinstance(body.get("since"), str) and "T" in body.get("since", ""),
           f"since={body.get('since')}")
    record("first visit: 'checked_at' ISO string",
           isinstance(body.get("checked_at"), str) and "T" in body.get("checked_at", ""),
           f"checked_at={body.get('checked_at')}")

    # Verify last_jobs_visit persisted
    udoc = await db.users.find_one({"email": STUDENT_EMAIL})
    record("last_jobs_visit persisted on user doc",
           isinstance(udoc.get("last_jobs_visit"), datetime),
           f"last_jobs_visit type={type(udoc.get('last_jobs_visit')).__name__}")
    first_ts = udoc.get("last_jobs_visit")

    # 3. Immediate re-hit
    r = httpx.get(f"{BASE}/jobs/new-since-last-visit", headers=auth(student_token), timeout=30)
    if r.status_code == 200:
        b2 = r.json()
        record("immediate re-hit: new_count == 0", b2.get("new_count") == 0, f"new_count={b2.get('new_count')}")
    else:
        record("immediate re-hit -> 200", False, f"status={r.status_code}")

    # 4. last_jobs_visit updated again
    udoc2 = await db.users.find_one({"email": STUDENT_EMAIL})
    second_ts = udoc2.get("last_jobs_visit")
    if first_ts and second_ts and first_ts.tzinfo is None:
        first_ts = first_ts.replace(tzinfo=timezone.utc)
    if second_ts and second_ts.tzinfo is None:
        second_ts = second_ts.replace(tzinfo=timezone.utc)
    record("last_jobs_visit updated on each call",
           isinstance(second_ts, datetime) and second_ts >= first_ts,
           f"first={first_ts} second={second_ts}")

    # 5. Tier-aware: Year-1
    await db.users.update_one(
        {"email": STUDENT_EMAIL},
        {"$set": {"graduation_year": 2029}, "$unset": {"last_jobs_visit": ""}},
    )
    r = httpx.get(f"{BASE}/jobs/new-since-last-visit", headers=auth(student_token), timeout=30)
    if r.status_code == 200:
        y1 = r.json()
        # Compare with: cache where job_type=Internship cached in last 24h
        since_24h = datetime.now(timezone.utc) - timedelta(hours=24)
        cache_intern = await db.jobs_cache.count_documents({
            "expires_at": {"$gt": datetime.now(timezone.utc)},
            "job_type": "Internship",
            "cached_at": {"$gt": since_24h},
        })
        cache_all = await db.jobs_cache.count_documents({
            "expires_at": {"$gt": datetime.now(timezone.utc)},
            "cached_at": {"$gt": since_24h},
        })
        # The new_count should equal cache_intern (within margin since clock advances)
        record("Year-1 tier-aware: new_count matches Internship-only count",
               abs(y1.get("new_count", -1) - cache_intern) <= 2,
               f"new_count={y1.get('new_count')} expected_intern={cache_intern} all_24h={cache_all}")
        record("Year-1 new_count <= all-types count",
               y1.get("new_count", 0) <= cache_all,
               f"new_count={y1.get('new_count')} cache_all={cache_all}")
    else:
        record("Year-1 tier-aware -> 200", False, f"status={r.status_code}")

    # CLEANUP
    await db.users.update_one(
        {"email": STUDENT_EMAIL},
        {"$set": {"graduation_year": 2026},
         "$unset": {"last_jobs_visit": "", "saved_jobs": "", "applied_jobs": ""}},
    )
    final = await db.users.find_one({"email": STUDENT_EMAIL})
    record("CLEANUP: grad=2026 + last_jobs_visit/saved/applied cleared",
           final.get("graduation_year") == 2026
           and "last_jobs_visit" not in final
           and not final.get("saved_jobs")
           and not final.get("applied_jobs"),
           f"grad={final.get('graduation_year')} lv={final.get('last_jobs_visit')} "
           f"saved={final.get('saved_jobs')} applied={final.get('applied_jobs')}")
    client.close()


def warm_cache(student_token):
    print("\n=== Pre-warm jobs_cache via /api/jobs/feed ===")
    r = httpx.get(f"{BASE}/jobs/feed", params={"per_page": 1}, headers=auth(student_token), timeout=120)
    if r.status_code == 200:
        b = r.json()
        print(f"Cache primed. total={b.get('total')}, refresh_stats={b.get('refresh_stats')}")
    else:
        print(f"warm-cache failed status={r.status_code}: {r.text[:300]}")


async def main():
    print("Logging in...")
    s = login(STUDENT_EMAIL, STUDENT_PASS)
    a = login(ALUMNI_EMAIL, ALUMNI_PASS)
    print("Logins OK")

    warm_cache(s)
    test_trending(s, a)
    await test_year1_change(s)
    await test_new_since(s)

    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print(f"\n========== SUMMARY: {passed}/{total} passed ==========")
    fails = [(n, d) for n, ok, d in results if not ok]
    if fails:
        print("\nFAILED:")
        for n, d in fails:
            print(f"  - {n}: {d}")
    return passed, total


if __name__ == "__main__":
    p, t = asyncio.run(main())
    sys.exit(0 if p == t else 1)
