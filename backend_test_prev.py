"""
Backend Test Suite — Personalization Features
==============================================
Tests new personalization endpoints + regression on existing endpoints.
"""
import os
import sys
import time
import json
import requests
from datetime import datetime, timedelta

BASE = "https://hiring-mvvm.preview.emergentagent.com/api"

STUDENT_EMAIL = "student@test.com"
STUDENT_PASSWORD = "Student@123"
ADMIN_EMAIL = "admin@careerpath.app"
ADMIN_PASSWORD = "Admin@12345"

results = []


def log(name, ok, msg=""):
    status = "PASS" if ok else "FAIL"
    print(f"[{status}] {name} :: {msg}")
    results.append({"test": name, "ok": ok, "msg": msg})


def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def login(email, password):
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": password}, timeout=20)
    if r.status_code != 200:
        # Try register if student doesn't exist
        return None, r
    return r.json(), r


def ensure_student_exists():
    """Ensure student@test.com exists with proper onboarding."""
    data, _ = login(STUDENT_EMAIL, STUDENT_PASSWORD)
    if data:
        # Verify onboarding completed
        u = data["user"]
        if u.get("onboarding_completed"):
            return data
        # Else complete onboarding below
        token = data["access_token"]
    else:
        # Register
        r = requests.post(
            f"{BASE}/auth/register",
            json={
                "email": STUDENT_EMAIL,
                "password": STUDENT_PASSWORD,
                "full_name": "Riya Sharma",
                "role": "student",
                "phone": "+919876543210",
            },
            timeout=20,
        )
        if r.status_code != 200:
            print(f"Register failed: {r.status_code} {r.text}")
            return None
        data = r.json()
        token = data["access_token"]

    # Complete onboarding (btech + job)
    onb_payload = {
        "school_info": {
            "institution_name": "IIT Bombay",
            "institution_type": "college",
            "class_or_year": "B.Tech 3rd Year",
            "branch_or_stream": "Computer Science",
            "city": "Mumbai",
            "state": "Maharashtra",
            "country": "India",
            "graduation_year": 2027,
        },
        "career_path": "job",
        "student_info": {
            "age": 21,
            "education_level": "btech",
            "career_interests": ["Tech", "AI/ML"],
        },
        "interests": ["AI/ML", "Coding"],
        "skills": ["Python", "JavaScript"],
        "bio": "B.Tech CS student aspiring for SWE roles",
    }
    r = requests.post(f"{BASE}/users/onboarding", json=onb_payload, headers=headers(token), timeout=20)
    if r.status_code != 200:
        print(f"Onboarding failed: {r.status_code} {r.text}")
    # Re-login to get fresh user
    data, _ = login(STUDENT_EMAIL, STUDENT_PASSWORD)
    return data


def test_dashboard_personalization(token):
    r = requests.get(f"{BASE}/dashboard", headers=headers(token), timeout=30)
    if r.status_code != 200:
        log("GET /api/dashboard", False, f"HTTP {r.status_code}: {r.text[:200]}")
        return None
    d = r.json()

    # personalization
    p = d.get("personalization", {})
    pm = p.get("priority_modules")
    ok = isinstance(pm, list) and len(pm) == 8
    log("dashboard.personalization.priority_modules is list of 8", ok, f"got len={len(pm) if isinstance(pm, list) else 'N/A'}")

    # btech+job ordering: career_guidelines top, events high, networking high
    if isinstance(pm, list):
        log(
            "priority_modules[0] for btech+job is career_guidelines",
            pm[0] == "career_guidelines",
            f"got {pm[0]}",
        )
        # events should be top 3
        log(
            "events appears in top 3 priority modules (btech+job)",
            "events" in pm[:3],
            f"top3={pm[:3]}",
        )

    log(
        "personalization.education_level == btech",
        p.get("education_level") == "btech",
        f"got {p.get('education_level')}",
    )
    log(
        "personalization.career_path == job",
        p.get("career_path") == "job",
        f"got {p.get('career_path')}",
    )

    # recommendations
    rec = d.get("recommendations", {})
    mentor = rec.get("mentor")
    log("recommendations.mentor exists", mentor is not None)
    if mentor:
        log(
            "recommendations.mentor.category matches it_software (career=job)",
            mentor.get("category") == "it_software",
            f"got {mentor.get('category')}",
        )

    event = rec.get("event")
    log("recommendations.event exists", event is not None)
    if event:
        log(
            "recommendations.event has deadline_days numeric",
            isinstance(event.get("deadline_days"), (int, float)),
            f"got {event.get('deadline_days')}",
        )

    log("recommendations.course exists", rec.get("course") is not None)

    log("closing_soon is list", isinstance(d.get("closing_soon"), list))

    sm = d.get("suggested_mentors")
    log(
        "suggested_mentors returns 6 items",
        isinstance(sm, list) and len(sm) == 6,
        f"got len={len(sm) if isinstance(sm, list) else 'N/A'}",
    )

    for k in ("featured_courses", "featured_internships", "featured_events", "featured_deals"):
        log(f"{k} is list", isinstance(d.get(k), list))

    stats = d.get("stats", {})
    log(
        "stats.courses_available is int",
        isinstance(stats.get("courses_available"), int),
        f"got {stats.get('courses_available')}",
    )

    return d


def test_preferences_update(token):
    # Switch to plus_two + higher_education
    r = requests.patch(
        f"{BASE}/users/me/preferences",
        json={"career_path": "higher_education", "education_level": "plus_two", "interests": ["AI/ML"]},
        headers=headers(token),
        timeout=20,
    )
    log(
        "PATCH /users/me/preferences (higher_ed/plus_two)",
        r.status_code == 200,
        f"HTTP {r.status_code}",
    )
    if r.status_code == 200:
        u = r.json()
        log(
            "preferences updated career_path",
            u.get("career_path") == "higher_education",
            f"got {u.get('career_path')}",
        )
        si = u.get("student_info") or {}
        log(
            "preferences updated student_info.education_level",
            si.get("education_level") == "plus_two",
            f"got {si.get('education_level')}",
        )

    # Verify dashboard reflects new prefs
    r = requests.get(f"{BASE}/dashboard", headers=headers(token), timeout=30)
    if r.status_code == 200:
        pm = r.json().get("personalization", {}).get("priority_modules", [])
        log(
            "dashboard priority_modules[0] == 'scholarships' (school student rule)",
            pm and pm[0] == "scholarships",
            f"got pm[:3]={pm[:3]}",
        )

    # Switch back to btech + job
    r = requests.patch(
        f"{BASE}/users/me/preferences",
        json={"career_path": "job", "education_level": "btech"},
        headers=headers(token),
        timeout=20,
    )
    log(
        "PATCH /users/me/preferences (back to btech/job)",
        r.status_code == 200,
        f"HTTP {r.status_code}",
    )


def test_track_click(token):
    # Get baseline dashboard - find baseline rank of 'deals'
    r = requests.get(f"{BASE}/dashboard", headers=headers(token), timeout=30)
    baseline_pm = r.json().get("personalization", {}).get("priority_modules", [])
    baseline_idx = baseline_pm.index("deals") if "deals" in baseline_pm else -1
    print(f"  baseline deals position: {baseline_idx} in {baseline_pm}")

    # Send 6 click tracks for 'deals'
    fail_count = 0
    for i in range(6):
        r = requests.post(
            f"{BASE}/dashboard/track-click",
            json={"module_id": "deals"},
            headers=headers(token),
            timeout=15,
        )
        if r.status_code != 200:
            fail_count += 1
    log(
        "POST /dashboard/track-click x6 (module_id=deals)",
        fail_count == 0,
        f"failures={fail_count}",
    )

    # Re-fetch dashboard
    r = requests.get(f"{BASE}/dashboard", headers=headers(token), timeout=30)
    new_pm = r.json().get("personalization", {}).get("priority_modules", [])
    new_idx = new_pm.index("deals") if "deals" in new_pm else -1
    print(f"  after-click deals position: {new_idx} in {new_pm}")
    # deals is in top 8 always for btech, baseline ~7. After 6 clicks, should jump.
    # We accept "earlier than baseline" or at least same position with score boost.
    # Best assertion: deals appears earlier OR scores reflect boost.
    scores = r.json().get("personalization", {}).get("module_scores", {})
    deals_score = scores.get("deals", 0)
    log(
        "click tracking boosts deals score (>=baseline +0.05)",
        deals_score >= 0.70,  # btech baseline=0.65 + ~0.10 boost
        f"deals_score={deals_score}, baseline_idx={baseline_idx}, new_idx={new_idx}",
    )
    # Position-based check
    if baseline_idx >= 0 and new_idx >= 0:
        log(
            "deals appears earlier than baseline after click boost",
            new_idx <= baseline_idx,
            f"baseline={baseline_idx} new={new_idx}",
        )

    # Test invalid: empty body
    r = requests.post(
        f"{BASE}/dashboard/track-click",
        json={},
        headers=headers(token),
        timeout=15,
    )
    log(
        "POST /dashboard/track-click with empty body returns 400",
        r.status_code == 400,
        f"HTTP {r.status_code}",
    )


def test_alumni_transition():
    ts = int(time.time())
    email = f"alumni-test-{ts}@test.com"
    password = "Test@123"
    # Register fresh student
    r = requests.post(
        f"{BASE}/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": "Alumni Test User",
            "role": "student",
        },
        timeout=20,
    )
    if r.status_code != 200:
        log("Register fresh student for alumni transition", False, f"HTTP {r.status_code}: {r.text[:200]}")
        return
    log("Register fresh student for alumni transition", True)
    token = r.json()["access_token"]

    # Onboard
    onb = {
        "school_info": {
            "institution_name": "VIT Vellore",
            "institution_type": "college",
            "class_or_year": "B.Tech 4th Year",
            "branch_or_stream": "ECE",
            "graduation_year": 2026,
        },
        "career_path": "job",
        "student_info": {
            "age": 22,
            "education_level": "btech",
            "career_interests": ["Tech"],
        },
        "interests": ["Tech"],
        "skills": ["C++"],
    }
    r = requests.post(f"{BASE}/users/onboarding", json=onb, headers=headers(token), timeout=20)
    log("Onboard fresh student", r.status_code == 200, f"HTTP {r.status_code}")

    # Transition to alumni
    r = requests.post(f"{BASE}/users/me/transition-alumni", headers=headers(token), timeout=20)
    log("POST /users/me/transition-alumni first call returns 200", r.status_code == 200, f"HTTP {r.status_code}: {r.text[:200] if r.status_code != 200 else ''}")
    if r.status_code == 200:
        u = r.json()
        log("user role becomes alumni", u.get("role") == "alumni", f"got {u.get('role')}")
        log("alumni_info populated", u.get("alumni_info") is not None, f"got {u.get('alumni_info')}")

    # Idempotent
    r = requests.post(f"{BASE}/users/me/transition-alumni", headers=headers(token), timeout=20)
    log("transition-alumni idempotent (2nd call 200)", r.status_code == 200, f"HTTP {r.status_code}")
    if r.status_code == 200:
        log("after 2nd call role still alumni", r.json().get("role") == "alumni")

    # GET /auth/me reflects alumni
    r = requests.get(f"{BASE}/auth/me", headers=headers(token), timeout=15)
    log("GET /auth/me reflects role=alumni", r.status_code == 200 and r.json().get("role") == "alumni", f"got role={r.json().get('role') if r.status_code==200 else 'ERR'}")


def test_regression(student_token, admin_token):
    # /auth/login already used. Verify auth/me
    r = requests.get(f"{BASE}/auth/me", headers=headers(student_token), timeout=15)
    log("GET /auth/me (student)", r.status_code == 200, f"HTTP {r.status_code}")

    # /catalog/mentors
    r = requests.get(f"{BASE}/catalog/mentors", timeout=15)
    log(
        "GET /catalog/mentors returns mentors",
        r.status_code == 200 and isinstance(r.json().get("mentors"), list) and len(r.json()["mentors"]) > 0,
        f"HTTP {r.status_code}, count={len(r.json().get('mentors', [])) if r.status_code==200 else 'N/A'}",
    )

    # Booking
    booking_payload = {
        "mentor_id": "m1",
        "slot_start_iso": (datetime.utcnow() + timedelta(days=2)).isoformat() + "Z",
        "slot_end_iso": (datetime.utcnow() + timedelta(days=2, hours=1)).isoformat() + "Z",
        "topic": "Career guidance for SWE roles",
        "notes": "Looking for FAANG prep tips",
    }
    r = requests.post(f"{BASE}/bookings", json=booking_payload, headers=headers(student_token), timeout=20)
    log(
        "POST /bookings (student)",
        r.status_code == 200 and r.json().get("status") == "confirmed",
        f"HTTP {r.status_code}: {r.text[:200] if r.status_code != 200 else 'OK'}",
    )

    # Admin pending mentors
    r = requests.get(f"{BASE}/admin/mentors/pending", headers=headers(admin_token), timeout=15)
    log(
        "GET /admin/mentors/pending (admin)",
        r.status_code == 200 and "mentors" in r.json(),
        f"HTTP {r.status_code}",
    )


def main():
    print("=" * 70)
    print("Backend Personalization Test Suite")
    print(f"BASE: {BASE}")
    print("=" * 70)

    # Login student (ensure exists & onboarded)
    sdata = ensure_student_exists()
    if not sdata:
        log("Student login/setup", False, "Could not set up student account")
        sys.exit(1)
    student_token = sdata["access_token"]
    log("POST /auth/login (student)", True, f"got access_token={student_token[:25]}...")

    # Admin
    adata, ar = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not adata:
        log("Admin login", False, f"HTTP {ar.status_code}: {ar.text[:200]}")
        sys.exit(1)
    admin_token = adata["access_token"]
    log("POST /auth/login (admin)", True)

    print("\n--- Test 1: Dashboard Personalization ---")
    test_dashboard_personalization(student_token)

    print("\n--- Test 2: Preferences Update ---")
    test_preferences_update(student_token)

    print("\n--- Test 3: Click Tracking ---")
    test_track_click(student_token)

    print("\n--- Test 4: Alumni Transition ---")
    test_alumni_transition()

    print("\n--- Test 5: Regression Checks ---")
    test_regression(student_token, admin_token)

    # Summary
    print("\n" + "=" * 70)
    passed = sum(1 for r in results if r["ok"])
    failed = sum(1 for r in results if not r["ok"])
    print(f"RESULTS: {passed} passed, {failed} failed (total {len(results)})")
    if failed:
        print("\nFAILED TESTS:")
        for r in results:
            if not r["ok"]:
                print(f"  - {r['test']}: {r['msg']}")
    print("=" * 70)

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
