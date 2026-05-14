"""
Validate the 7 NEW college/student sub-view endpoints + RSVP mutation flow.
Run: python3 /app/backend_test_subviews.py
"""
import os
import sys
import json
import requests

BASE = os.environ.get("BACKEND_URL", "https://hiring-mvvm.preview.emergentagent.com").rstrip("/")
API = BASE + "/api"

results = []
passed = 0
failed = 0


def check(name, cond, detail=""):
    global passed, failed
    if cond:
        passed += 1
        print(f"  ✅ {name}")
    else:
        failed += 1
        print(f"  ❌ {name}  — {detail}")
    results.append((name, cond, detail))


def section(t):
    print(f"\n=== {t} ===")


def get(path, **params):
    url = API + path
    r = requests.get(url, params=params or None, timeout=30)
    return r


def post(path, **params):
    url = API + path
    r = requests.post(url, params=params or None, timeout=30)
    return r


def expect_keys(name, obj, keys):
    missing = [k for k in keys if k not in obj]
    check(f"{name} has keys {keys}", not missing, f"missing={missing} got={list(obj.keys())[:10]}")


# ───────────────────────── 1. /college/alumni ─────────────────────────
section("1. GET /api/college/alumni")
r = get("/college/alumni")
check("alumni 200 OK", r.status_code == 200, f"got {r.status_code} body={r.text[:200]}")
if r.status_code == 200:
    body = r.json()
    expect_keys("alumni response", body, ["items", "college"])
    items = body.get("items", [])
    check("alumni has at least 1 item", len(items) >= 1, f"got {len(items)} items, college={body.get('college')}")
    if items:
        a = items[0]
        for k in ["id", "name", "initials", "batch", "role", "company", "city", "donor", "color"]:
            check(f"alumni[0].{k}", k in a, f"got keys={list(a.keys())}")
        check("alumni.donor is bool", isinstance(a.get("donor"), bool))

    # Edge case: non-existent college
    r2 = get("/college/alumni", college_name="ZZ_NONEXIST_COLLEGE_99999")
    check("alumni nonexistent college 200", r2.status_code == 200)
    if r2.status_code == 200:
        b2 = r2.json()
        check("alumni nonexistent items is list", isinstance(b2.get("items"), list))

    # Limit param
    r3 = get("/college/alumni", limit=2)
    if r3.status_code == 200:
        check("alumni limit=2 returns ≤2", len(r3.json().get("items", [])) <= 2)


# ───────────────────────── 2. /college/mentors ─────────────────────────
section("2. GET /api/college/mentors")
r = get("/college/mentors")
check("mentors 200 OK", r.status_code == 200, f"got {r.status_code} body={r.text[:200]}")
if r.status_code == 200:
    body = r.json()
    expect_keys("mentors response", body, ["items", "college"])
    items = body.get("items", [])
    if items:
        m = items[0]
        for k in ["id", "name", "initials", "role", "company", "sessions", "rating", "status", "color"]:
            check(f"mentors[0].{k}", k in m)


# ───────────────────────── 3. /college/events ─────────────────────────
section("3. GET /api/college/events")
r = get("/college/events")
check("events 200 OK", r.status_code == 200, f"got {r.status_code} body={r.text[:200]}")
if r.status_code == 200:
    body = r.json()
    expect_keys("events response", body, ["items"])
    items = body.get("items", [])
    check("events ≥ 5", len(items) >= 5, f"got {len(items)}")
    if items:
        e = items[0]
        for k in ["id", "title", "date", "mode", "city", "cat", "attending", "capacity", "kind", "accent"]:
            check(f"events[0].{k}", k in e)
        check("events[0].kind is free|paid", e.get("kind") in ("free", "paid"))


# ───────────────────────── 4. /college/announcements ─────────────────────────
section("4. GET /api/college/announcements")
r = get("/college/announcements")
check("announcements 200 OK", r.status_code == 200, f"got {r.status_code} body={r.text[:200]}")
if r.status_code == 200:
    body = r.json()
    expect_keys("announcements response", body, ["items"])
    items = body.get("items", [])
    check("announcements has 5", len(items) == 5, f"got {len(items)}")
    pinned = [i for i in items if i.get("pinned") is True]
    check("≥2 announcements pinned=True", len(pinned) >= 2, f"pinned count={len(pinned)}")
    if items:
        a = items[0]
        for k in ["id", "title", "body", "audience", "tag", "posted_at", "pinned", "author"]:
            check(f"announcements[0].{k}", k in a)
        check("announcements[0].pinned is bool", isinstance(a.get("pinned"), bool))


# ───────────────────────── 5. /college/analytics ─────────────────────────
section("5. GET /api/college/analytics")
r = get("/college/analytics")
check("analytics 200 OK", r.status_code == 200, f"got {r.status_code} body={r.text[:200]}")
if r.status_code == 200:
    body = r.json()
    for k in ["kpi", "placement_trend", "salary_dist", "sectors", "attrition"]:
        check(f"analytics.{k} present", k in body)
    kpi = body.get("kpi", {})
    for k in ["students", "placement", "median_lpa", "top_offer", "median_yoy"]:
        check(f"analytics.kpi.{k}", k in kpi)
    pt = body.get("placement_trend", [])
    check("placement_trend has 5 entries", len(pt) == 5, f"got {len(pt)}")
    if pt:
        years = [e.get("year") for e in pt]
        check("placement_trend years 2022-2026",
              years == [2022, 2023, 2024, 2025, 2026],
              f"got years={years}")
    sd = body.get("salary_dist", [])
    check("salary_dist has 5 bands", len(sd) == 5, f"got {len(sd)}")
    sec = body.get("sectors", [])
    check("sectors has 6", len(sec) == 6, f"got {len(sec)}")


# ───────────────────────── 6. /college/career-intel ─────────────────────────
section("6. GET /api/college/career-intel")
r = get("/college/career-intel")
check("career-intel 200 OK", r.status_code == 200, f"got {r.status_code} body={r.text[:200]}")
if r.status_code == 200:
    body = r.json()
    for k in ["skill_gaps", "hiring_intent", "roles_in_demand"]:
        check(f"career-intel.{k} present", k in body)
    sg = body.get("skill_gaps", [])
    check("skill_gaps has 5", len(sg) == 5, f"got {len(sg)}")
    if sg:
        s0 = sg[0]
        for k in ["skill", "demand", "supply", "gap", "color"]:
            check(f"skill_gaps[0].{k}", k in s0)


# ───────────────────────── 7. /student/events ─────────────────────────
section("7. GET /api/student/events")
# Pick a student that hasn't registered. To get a 'fresh' student, use a new email
# that isn't found → endpoint falls back to first student. To truly test fresh-state,
# use a mentor's email (won't match role=student) → fallback to first student.
# But tests already may have RSVP'd. Better: use a known seed student that the
# endpoint may return registered=true for. We'll test that the field exists & is bool.

r = get("/student/events", limit=18)
check("student/events 200 OK", r.status_code == 200, f"got {r.status_code} body={r.text[:200]}")
event_id = None
if r.status_code == 200:
    body = r.json()
    expect_keys("student/events response", body, ["items"])
    items = body.get("items", [])
    check("student/events ≥ 5", len(items) >= 5, f"got {len(items)}")
    if items:
        e = items[0]
        for k in ["id", "title", "date", "mode", "city", "cat", "attending", "capacity", "kind", "accent", "registered"]:
            check(f"student/events[0].{k}", k in e)
        check("student/events[0].registered is bool", isinstance(e.get("registered"), bool))
        event_id = e.get("id")

    # limit=3 must return exactly 3
    r3 = get("/student/events", limit=3)
    if r3.status_code == 200:
        n = len(r3.json().get("items", []))
        check("student/events limit=3 returns exactly 3", n == 3, f"got {n}")


# ───────────────────────── 8. RSVP mutation flow ─────────────────────────
section("8. POST /api/student/events/{event_id}/rsvp")
# Use a fresh student email — fall back student is the first student. We need a
# clean student. Try mentor02@test.com → endpoint will fall back to first student
# because role=student filter applied. So that's not fresh.
# Instead, find a student whose registrations are clean. Use student_email param
# pointing to a real student; if already registered, we should see {already:true}
# directly. Test logic must accept either order.
if event_id:
    # First call — could be either {registered:true} (fresh) or {already:true}
    r = post(f"/student/events/{event_id}/rsvp")
    check("rsvp 1st call 200", r.status_code == 200, f"got {r.status_code} body={r.text[:200]}")
    if r.status_code == 200:
        b = r.json()
        check("rsvp 1st call ok=True", b.get("ok") is True, f"body={b}")
        first_was_new = b.get("registered") is True
        first_was_already = b.get("already") is True
        check("rsvp 1st call has registered=true OR already=true",
              first_was_new or first_was_already,
              f"body={b}")

    # 2nd call must be already=true
    r2 = post(f"/student/events/{event_id}/rsvp")
    check("rsvp 2nd call 200", r2.status_code == 200)
    if r2.status_code == 200:
        b2 = r2.json()
        check("rsvp 2nd call ok=true & already=true",
              b2.get("ok") is True and b2.get("already") is True,
              f"body={b2}")

    # GET /student/events again — same event must show registered:true
    r3 = get("/student/events", limit=18)
    if r3.status_code == 200:
        items3 = r3.json().get("items", [])
        match = next((i for i in items3 if i.get("id") == event_id), None)
        check("after rsvp, event.registered=true", bool(match) and match.get("registered") is True,
              f"event_id={event_id} match.registered={match.get('registered') if match else 'no match'}")
else:
    check("rsvp flow — needs event_id", False, "no event id captured")


# ───────────────────────── SUMMARY ─────────────────────────
print()
print("=" * 60)
print(f"PASSED:  {passed}")
print(f"FAILED:  {failed}")
print("=" * 60)
sys.exit(0 if failed == 0 else 1)
