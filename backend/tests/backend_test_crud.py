#!/usr/bin/env python3
"""
Test CRUD/append-only endpoints in /app/backend/crud_endpoints.py
"""
import os
import sys
import json
import time
import requests

BASE = os.environ.get("BACKEND_URL", "https://hiring-mvvm.preview.emergentagent.com/api")

PASS = []
FAIL = []


def check(name, cond, detail=""):
    if cond:
        PASS.append(name)
        print(f"  ✅ {name}")
    else:
        FAIL.append((name, detail))
        print(f"  ❌ {name} :: {detail}")


def jpost(path, body, expect=200):
    r = requests.post(f"{BASE}{path}", json=body, timeout=20)
    return r


def jget(path, params=None):
    r = requests.get(f"{BASE}{path}", params=params or {}, timeout=20)
    return r


def jdelete(path, params=None):
    r = requests.delete(f"{BASE}{path}", params=params or {}, timeout=20)
    return r


def section(t):
    print(f"\n=== {t} ===")


# ────────────────────────── A) Student bookings ──────────────────────────
section("A) Student bookings")
booking_id = None

# 1. Create booking
r = jpost("/student/bookings", {
    "student_email": "booked2@persona.demo",
    "mentor_email": "mentor-active2@persona.demo",
    "topic": "DSA Practice",
})
ok = r.status_code == 200
check("1. POST /student/bookings → 200", ok, f"got {r.status_code}: {r.text[:200]}")
if ok:
    body = r.json()
    booking_id = body.get("booking_id")
    check("   booking_id present", bool(booking_id), str(body))
    check("   scheduled_at present", bool(body.get("scheduled_at")), str(body))
    check("   amount_paid > 0", (body.get("amount_paid", 0) or 0) > 0, str(body))

# 2. List my-bookings
r = jget("/student/my-bookings", {"email": "booked2@persona.demo"})
check("2. GET /student/my-bookings → 200", r.status_code == 200, f"got {r.status_code}")
if r.status_code == 200:
    items = r.json().get("items", [])
    found = next((i for i in items if i.get("id") == booking_id), None)
    check("   created booking present", bool(found), f"id={booking_id} not in items: {[i.get('id') for i in items]}")
    if found:
        check("   item.mentor_name present", bool(found.get("mentor_name")), str(found))
        check("   item.scheduled_at present", bool(found.get("scheduled_at")), str(found))
        check("   item.status == 'confirmed'", found.get("status") == "confirmed", str(found))

# 3. Bad mentor → 404
r = jpost("/student/bookings", {
    "student_email": "booked2@persona.demo",
    "mentor_email": "nobody@x.com",
    "topic": "X",
})
check("3. POST /student/bookings with bad mentor → 404", r.status_code == 404, f"got {r.status_code}: {r.text[:200]}")

# 4. Cancel booking
if booking_id:
    r = jdelete(f"/student/bookings/{booking_id}")
    check("4. DELETE /student/bookings/{id} → 200", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")
    if r.status_code == 200:
        check("   cancelled=true", r.json().get("cancelled") is True, r.text)

    r = jget("/student/my-bookings", {"email": "booked2@persona.demo"})
    if r.status_code == 200:
        items = r.json().get("items", [])
        found = next((i for i in items if i.get("id") == booking_id), None)
        check("   after cancel, status == 'cancelled'", bool(found) and found.get("status") == "cancelled",
              f"item={found}")

# ────────────────────── B) Internship applications ──────────────────────
section("B) Student internship applications")

# 5. Get internships
r = jget("/student/internships")
internship_id = None
if r.status_code == 200:
    body = r.json()
    items = body.get("items") or body.get("internships") or body.get("data") or []
    if items:
        internship_id = items[0].get("id") or items[0].get("_id") or items[0].get("internship_id")
    check("5. GET /student/internships → 200 with items", bool(items), f"body keys={list(body.keys())[:8]} count={len(items)}")
    check("   first item id captured", bool(internship_id), str(items[:1]))
else:
    check("5. GET /student/internships → 200", False, f"status={r.status_code}: {r.text[:200]}")

# 6. Apply
if internship_id:
    r = jpost(f"/student/internships/{internship_id}/apply", {
        "student_email": "booked2@persona.demo",
        "cover_note": "Excited",
    })
    check("6. POST /student/internships/{id}/apply → 200", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")
    if r.status_code == 200:
        check("   application_id present", bool(r.json().get("application_id")), r.text)

    # 7. Idempotent
    r = jpost(f"/student/internships/{internship_id}/apply", {
        "student_email": "booked2@persona.demo",
        "cover_note": "Excited",
    })
    check("7. POST again → already=true", r.status_code == 200 and r.json().get("already") is True,
          f"status={r.status_code} body={r.text[:200]}")

# 8. List applications
r = jget("/student/my-applications", {"email": "booked2@persona.demo"})
check("8. GET /student/my-applications → 200", r.status_code == 200, f"got {r.status_code}")
if r.status_code == 200:
    items = r.json().get("items", [])
    check("   list contains an application", len(items) >= 1, f"count={len(items)}")

# ──────────────────────── C) Workshops ────────────────────────
section("C) Student workshops")

# 9. Enroll
r = jpost("/student/workshops/enroll", {
    "student_email": "workshop2@persona.demo",
    "workshop_title": "Test Bootcamp",
    "fee_inr": 1999,
    "weeks": 4,
})
check("9. POST /student/workshops/enroll → 200", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")
if r.status_code == 200:
    check("   registration_id present", bool(r.json().get("registration_id")), r.text)

# 10. Idempotent
r = jpost("/student/workshops/enroll", {
    "student_email": "workshop2@persona.demo",
    "workshop_title": "Test Bootcamp",
    "fee_inr": 1999,
    "weeks": 4,
})
check("10. POST again → already=true", r.status_code == 200 and r.json().get("already") is True,
      f"status={r.status_code} body={r.text[:200]}")

# 11. List workshops
r = jget("/student/my-workshops", {"email": "workshop2@persona.demo"})
check("11. GET /student/my-workshops → 200", r.status_code == 200, f"got {r.status_code}")
if r.status_code == 200:
    titles = [i.get("title") for i in r.json().get("items", [])]
    check("   list includes 'Test Bootcamp'", "Test Bootcamp" in titles, f"titles={titles}")

# ──────────────────────── D) Events ────────────────────────
section("D) Student events")

# 12. my-events for enrolled1
r = jget("/student/my-events", {"email": "enrolled1@persona.demo"})
check("12. GET /student/my-events → 200", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")
if r.status_code == 200:
    cnt = r.json().get("count", 0)
    check("   count > 0", cnt > 0, f"count={cnt}")

# ──────────────────────── E) Mentor endpoints ────────────────────────
section("E) Mentor endpoints")

# 13. Create course
r = jpost("/mentor/courses", {
    "mentor_email": "mentor-creator1@persona.demo",
    "title": "Live Test Course",
    "fee_inr": 2999,
})
check("13. POST /mentor/courses → 200", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")
if r.status_code == 200:
    check("   course_id present", bool(r.json().get("course_id")), r.text)

# 14. List courses
r = jget("/mentor/my-courses", {"email": "mentor-creator1@persona.demo"})
check("14. GET /mentor/my-courses → 200", r.status_code == 200, f"got {r.status_code}")
if r.status_code == 200:
    titles = [i.get("title") for i in r.json().get("items", [])]
    check("   list includes 'Live Test Course'", "Live Test Course" in titles, f"titles={titles[:5]}")

# 15. Set availability
r = jpost("/mentor/availability", {
    "mentor_email": "mentor-active1@persona.demo",
    "slots": [
        {"day": "Monday", "start_time": "09:00", "end_time": "17:00"},
        {"day": "Tuesday", "start_time": "10:00", "end_time": "16:00"},
    ],
})
check("15. POST /mentor/availability → 200", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")
if r.status_code == 200:
    check("   slots_saved == 2", r.json().get("slots_saved") == 2, r.text)

# 16. Mentor today bookings
r = jget("/mentor/my-bookings", {"email": "mentor-active1@persona.demo", "when": "today"})
check("16. GET /mentor/my-bookings?when=today → 200", r.status_code == 200, f"got {r.status_code}")
if r.status_code == 200:
    body = r.json()
    check("   scope == 'today'", body.get("scope") == "today", str(body)[:200])
    check("   count >= 0", body.get("count", 0) >= 0, str(body)[:200])

# 17. Mentor upcoming bookings
r = jget("/mentor/my-bookings", {"email": "mentor-active1@persona.demo", "when": "upcoming"})
check("17. GET /mentor/my-bookings?when=upcoming → 200", r.status_code == 200, f"got {r.status_code}")
if r.status_code == 200:
    body = r.json()
    check("   scope == 'upcoming'", body.get("scope") == "upcoming", str(body)[:200])

# ──────────────────── F) Admin / College endpoints ────────────────────
section("F) Admin / College endpoints")

# 18. Invite user — use unique email
unique_email = f"newinvite-test-{int(time.time())}@example.com"
r = jpost("/admin/users", {
    "email": unique_email,
    "role": "student",
    "full_name": "New Invite",
})
check("18. POST /admin/users → 200", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")
if r.status_code == 200:
    check("   user_id present", bool(r.json().get("user_id")), r.text)

# 19. Same email → 409
r = jpost("/admin/users", {
    "email": unique_email,
    "role": "student",
    "full_name": "New Invite",
})
check("19. POST same email → 409", r.status_code == 409, f"got {r.status_code}: {r.text[:200]}")

# 20. Create event
r = jpost("/college/events", {
    "title": "Live Test Event",
    "category": "Workshop",
    "college_name": "IIT Bombay",
    "capacity": 100,
})
check("20. POST /college/events → 200", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")
if r.status_code == 200:
    check("   event_id present", bool(r.json().get("event_id")), r.text)

# 21. College my-students
r = jget("/college/my-students", {"email": "admin1@iitbombay.demo", "limit": 20})
check("21. GET /college/my-students → 200", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")
if r.status_code == 200:
    body = r.json()
    check("   has 'count' field (>= 0 OK)", "count" in body and body.get("count", 0) >= 0, str(body)[:200])

# ──────────────────── G) LIVE counters ────────────────────
section("G) LIVE counters")

r = jget("/live/counters")
check("22. GET /live/counters → 200", r.status_code == 200, f"got {r.status_code}")
counters_pre = None
if r.status_code == 200:
    body = r.json()
    counters_pre = body
    expected_keys = ["users", "students", "mentors", "colleges", "bookings", "bookings_today",
                     "applications", "events", "rsvps", "workshops", "courses", "as_of"]
    missing = [k for k in expected_keys if k not in body]
    check("   all expected keys present", not missing, f"missing={missing}")
    int_keys = [k for k in expected_keys if k != "as_of"]
    bad = [(k, body.get(k)) for k in int_keys if not isinstance(body.get(k), int) or body.get(k) < 0]
    check("   all int counters are >= 0 ints", not bad, f"bad={bad}")
    # ISO timestamp
    try:
        from datetime import datetime
        datetime.fromisoformat(body.get("as_of"))
        ok_iso = True
    except Exception:
        ok_iso = False
    check("   as_of is valid ISO timestamp", ok_iso, f"as_of={body.get('as_of')}")

# 23. After new booking, count should increase
r = jpost("/student/bookings", {
    "student_email": "booked2@persona.demo",
    "mentor_email": "mentor-active2@persona.demo",
    "topic": "Counter Bump Test",
})
if r.status_code == 200:
    r2 = jget("/live/counters")
    if r2.status_code == 200 and counters_pre:
        new_bookings = r2.json().get("bookings", 0)
        old_bookings = counters_pre.get("bookings", 0)
        check("23. counters.bookings increased after new booking",
              new_bookings >= old_bookings + 1,
              f"old={old_bookings} new={new_bookings}")
    else:
        check("23. counters re-fetch", False, f"got {r2.status_code}")
else:
    check("23. created extra booking for counter test", False, f"booking failed: {r.status_code}")

# ──────────────────── H) Tier system regression ────────────────────
section("H) Tier system regression")

# 24. /student/dashboard
r = jget("/student/dashboard", {"email": "booked2@persona.demo"})
check("24. GET /student/dashboard → 200", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")
if r.status_code == 200:
    body = r.json()
    student_blob = body.get("student") or body
    has_tier = ("tier" in student_blob) or ("tier" in body)
    check("   student.tier present", has_tier, f"keys={list(body.keys())[:10]} student keys={list((body.get('student') or {}).keys())[:10]}")

# 25. /student/internships
r = jget("/student/internships", {"email": "booked2@persona.demo"})
check("25. GET /student/internships → 200", r.status_code == 200, f"got {r.status_code}")
if r.status_code == 200:
    body = r.json()
    check("   user_tier present", "user_tier" in body, f"keys={list(body.keys())[:10]}")


# ──────────────────── SUMMARY ────────────────────
print("\n" + "=" * 60)
print(f"PASSED: {len(PASS)}")
print(f"FAILED: {len(FAIL)}")
if FAIL:
    print("\nFailures:")
    for n, d in FAIL:
        print(f"  - {n}: {d}")
sys.exit(0 if not FAIL else 1)
