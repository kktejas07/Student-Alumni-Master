"""
Schema Regression Test
======================
Verifies the recent schema changes:
1. MentorCategory: it_software | higher_education | startup | business (split startup_business; removed education)
2. AlumniInfo new fields: linkedin_url, wants_to_mentor, mentor_category
3. StudentInfo new field: career_goal
4. _path_to_mentor_cat mapping updated: startup→startup, business→business
"""
import sys
import time
import requests

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
    return (r.json(), r) if r.status_code == 200 else (None, r)


# ----------------------------------------------------------------------
# Test 1: Login + Dashboard regression
# ----------------------------------------------------------------------
def test_login_dashboard():
    print("\n--- Test 1: Login + Dashboard regression ---")
    data, r = login(STUDENT_EMAIL, STUDENT_PASSWORD)
    if not data:
        log("Login student@test.com", False, f"HTTP {r.status_code}: {r.text[:200]}")
        return None
    log("Login student@test.com", True)
    token = data["access_token"]

    r = requests.get(f"{BASE}/dashboard", headers=headers(token), timeout=30)
    log("GET /api/dashboard returns 200", r.status_code == 200, f"HTTP {r.status_code}")
    if r.status_code != 200:
        return token

    d = r.json()
    log("dashboard.personalization present", isinstance(d.get("personalization"), dict))
    log("dashboard.recommendations present", isinstance(d.get("recommendations"), dict))
    pm = d.get("personalization", {}).get("priority_modules")
    log("priority_modules is list", isinstance(pm, list) and len(pm) > 0,
        f"len={len(pm) if isinstance(pm, list) else 'NA'}")
    return token


# ----------------------------------------------------------------------
# Test 2: PATCH preferences with new mentor category mapping
# ----------------------------------------------------------------------
def test_preferences_mapping(token):
    print("\n--- Test 2: PATCH preferences (career_path → mentor category) ---")

    # career_path = business
    r = requests.patch(
        f"{BASE}/users/me/preferences",
        json={"career_path": "business"},
        headers=headers(token),
        timeout=20,
    )
    log("PATCH preferences career_path=business → 200", r.status_code == 200, f"HTTP {r.status_code}")

    r = requests.get(f"{BASE}/dashboard", headers=headers(token), timeout=30)
    if r.status_code == 200:
        mentor = r.json().get("recommendations", {}).get("mentor")
        cat = mentor.get("category") if mentor else None
        log("dashboard.recommendations.mentor.category == 'business'",
            cat == "business",
            f"got '{cat}' (mentor_id={mentor.get('id') if mentor else 'None'})")

    # career_path = startup
    r = requests.patch(
        f"{BASE}/users/me/preferences",
        json={"career_path": "startup"},
        headers=headers(token),
        timeout=20,
    )
    log("PATCH preferences career_path=startup → 200", r.status_code == 200, f"HTTP {r.status_code}")

    r = requests.get(f"{BASE}/dashboard", headers=headers(token), timeout=30)
    if r.status_code == 200:
        mentor = r.json().get("recommendations", {}).get("mentor")
        cat = mentor.get("category") if mentor else None
        log("dashboard.recommendations.mentor.category == 'startup'",
            cat == "startup",
            f"got '{cat}' (mentor_id={mentor.get('id') if mentor else 'None'})")

    # career_path = higher_education
    r = requests.patch(
        f"{BASE}/users/me/preferences",
        json={"career_path": "higher_education"},
        headers=headers(token),
        timeout=20,
    )
    log("PATCH preferences career_path=higher_education → 200",
        r.status_code == 200, f"HTTP {r.status_code}")

    r = requests.get(f"{BASE}/dashboard", headers=headers(token), timeout=30)
    if r.status_code == 200:
        mentor = r.json().get("recommendations", {}).get("mentor")
        cat = mentor.get("category") if mentor else None
        log("dashboard.recommendations.mentor.category == 'higher_education'",
            cat == "higher_education", f"got '{cat}'")

    # Restore back to job
    requests.patch(
        f"{BASE}/users/me/preferences",
        json={"career_path": "job"},
        headers=headers(token),
        timeout=20,
    )


# ----------------------------------------------------------------------
# Test 3: Onboarding accepts student_info.career_goal
# ----------------------------------------------------------------------
def test_student_career_goal():
    print("\n--- Test 3: Onboarding accepts student_info.career_goal ---")
    ts = int(time.time())
    email = f"regression.student.{ts}@test.com"
    password = "TestPass@123"

    r = requests.post(
        f"{BASE}/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": "Regression Student",
            "role": "student",
        },
        timeout=20,
    )
    if r.status_code != 200:
        log("Register fresh student", False, f"HTTP {r.status_code}: {r.text[:200]}")
        return
    log("Register fresh student", True)
    token = r.json()["access_token"]

    onb = {
        "school_info": {
            "institution_name": "BITS Pilani",
            "institution_type": "college",
            "class_or_year": "B.Tech 2nd Year",
            "branch_or_stream": "Computer Science",
            "country": "India",
        },
        "career_path": "job",
        "student_info": {
            "age": 20,
            "education_level": "btech",
            "career_goal": "Software Developer",
        },
        "interests": ["Coding"],
        "skills": ["Python"],
    }
    r = requests.post(f"{BASE}/users/onboarding", json=onb, headers=headers(token), timeout=20)
    log("POST /users/onboarding with career_goal → 200",
        r.status_code == 200, f"HTTP {r.status_code}: {r.text[:200] if r.status_code != 200 else ''}")
    if r.status_code != 200:
        return

    r = requests.get(f"{BASE}/auth/me", headers=headers(token), timeout=15)
    if r.status_code != 200:
        log("GET /auth/me", False, f"HTTP {r.status_code}")
        return
    user = r.json()
    si = user.get("student_info") or {}
    log("user.student_info.career_goal == 'Software Developer'",
        si.get("career_goal") == "Software Developer",
        f"got '{si.get('career_goal')}'")


# ----------------------------------------------------------------------
# Test 4: Alumni opt-in mentor schema (linkedin_url, wants_to_mentor, mentor_category)
# ----------------------------------------------------------------------
def test_alumni_opt_in_mentor():
    print("\n--- Test 4: Alumni opt-in mentor schema ---")
    ts = int(time.time())
    email = f"regression.alumni.{ts}@test.com"
    password = "TestPass@123"

    r = requests.post(
        f"{BASE}/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": "Regression Alumni",
            "role": "alumni",
        },
        timeout=20,
    )
    if r.status_code != 200:
        log("Register fresh alumni", False, f"HTTP {r.status_code}: {r.text[:200]}")
        return
    log("Register fresh alumni", True)
    token = r.json()["access_token"]

    onb = {
        "school_info": {
            "institution_name": "IIT Madras",
            "institution_type": "university",
            "class_or_year": "Graduated",
            "country": "India",
            "graduation_year": 2024,
        },
        "career_path": "startup",
        "alumni_info": {
            "graduation_year": 2024,
            "university": "IIT",
            "linkedin_url": "https://linkedin.com/in/test",
            "wants_to_mentor": True,
            "mentor_category": "startup",
        },
        "interests": ["Mentorship"],
        "skills": ["Strategy"],
    }
    r = requests.post(f"{BASE}/users/onboarding", json=onb, headers=headers(token), timeout=20)
    log("POST /users/onboarding (alumni opt-in mentor) → 200",
        r.status_code == 200, f"HTTP {r.status_code}: {r.text[:300] if r.status_code != 200 else ''}")
    if r.status_code != 200:
        return

    r = requests.get(f"{BASE}/auth/me", headers=headers(token), timeout=15)
    if r.status_code != 200:
        log("GET /auth/me (alumni)", False, f"HTTP {r.status_code}")
        return
    user = r.json()
    ai = user.get("alumni_info") or {}
    log("alumni_info.linkedin_url persisted",
        ai.get("linkedin_url") == "https://linkedin.com/in/test",
        f"got '{ai.get('linkedin_url')}'")
    log("alumni_info.wants_to_mentor == True",
        ai.get("wants_to_mentor") is True,
        f"got {ai.get('wants_to_mentor')}")
    log("alumni_info.mentor_category == 'startup'",
        ai.get("mentor_category") == "startup",
        f"got '{ai.get('mentor_category')}'")


# ----------------------------------------------------------------------
# Test 5: Catalog mentors filter — no startup_business / education legacy categories
# ----------------------------------------------------------------------
def test_catalog_mentors_filter():
    print("\n--- Test 5: GET /catalog/mentors filter validation ---")

    # career_path=startup → mentors with category="startup" should appear first
    r = requests.get(f"{BASE}/catalog/mentors", params={"career_path": "startup", "limit": 50}, timeout=20)
    log("GET /catalog/mentors?career_path=startup → 200",
        r.status_code == 200, f"HTTP {r.status_code}")
    if r.status_code == 200:
        ms = r.json().get("mentors", [])
        log("returns at least 1 mentor for startup",
            len(ms) > 0, f"count={len(ms)}")
        # first mentor (real) should be startup category
        cats = [m.get("mentor_info", {}).get("category") if "mentor_info" in m else m.get("category") for m in ms]
        # filter out None
        non_null_cats = [c for c in cats if c]
        log("first mentor for career_path=startup has category='startup'",
            len(non_null_cats) > 0 and non_null_cats[0] == "startup",
            f"first category='{non_null_cats[0] if non_null_cats else None}', cats={cats[:5]}")
        log("NO mentor has legacy category='startup_business'",
            all(c != "startup_business" for c in cats),
            f"found startup_business count={sum(1 for c in cats if c == 'startup_business')}")
        log("NO mentor has legacy category='education'",
            all(c != "education" for c in cats),
            f"found education count={sum(1 for c in cats if c == 'education')}")

    # career_path=business
    r = requests.get(f"{BASE}/catalog/mentors", params={"career_path": "business", "limit": 50}, timeout=20)
    log("GET /catalog/mentors?career_path=business → 200",
        r.status_code == 200, f"HTTP {r.status_code}")
    if r.status_code == 200:
        ms = r.json().get("mentors", [])
        log("returns at least 1 mentor for business",
            len(ms) > 0, f"count={len(ms)}")
        cats = [m.get("mentor_info", {}).get("category") if "mentor_info" in m else m.get("category") for m in ms]
        non_null_cats = [c for c in cats if c]
        log("first mentor for career_path=business has category='business'",
            len(non_null_cats) > 0 and non_null_cats[0] == "business",
            f"first category='{non_null_cats[0] if non_null_cats else None}', cats={cats[:5]}")
        log("NO mentor has legacy category='startup_business'",
            all(c != "startup_business" for c in cats))
        log("NO mentor has legacy category='education'",
            all(c != "education" for c in cats))

    # Also check unfiltered set has no legacy values
    r = requests.get(f"{BASE}/catalog/mentors", params={"limit": 100}, timeout=20)
    if r.status_code == 200:
        ms = r.json().get("mentors", [])
        cats_all = [m.get("mentor_info", {}).get("category") if "mentor_info" in m else m.get("category") for m in ms]
        log("Full /catalog/mentors has NO legacy 'startup_business' values",
            all(c != "startup_business" for c in cats_all),
            f"total mentors={len(ms)}, legacy count={sum(1 for c in cats_all if c == 'startup_business')}")
        log("Full /catalog/mentors has NO legacy 'education' values",
            all(c != "education" for c in cats_all),
            f"total mentors={len(ms)}, legacy count={sum(1 for c in cats_all if c == 'education')}")


# ----------------------------------------------------------------------
# Test 6: Admin pending mentor queue
# ----------------------------------------------------------------------
def test_admin_pending():
    print("\n--- Test 6: Admin pending mentor queue ---")
    data, r = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not data:
        log("Admin login", False, f"HTTP {r.status_code}: {r.text[:200]}")
        return
    log("Admin login", True)
    token = data["access_token"]

    r = requests.get(f"{BASE}/admin/mentors/pending", headers=headers(token), timeout=15)
    log("GET /admin/mentors/pending → 200",
        r.status_code == 200, f"HTTP {r.status_code}")
    if r.status_code == 200:
        ms = r.json().get("mentors", [])
        log("≥3 pending mentors", len(ms) >= 3, f"count={len(ms)}")


def main():
    print("=" * 70)
    print("Schema Regression Test Suite")
    print(f"BASE: {BASE}")
    print("=" * 70)

    token = test_login_dashboard()
    if token:
        test_preferences_mapping(token)
    test_student_career_goal()
    test_alumni_opt_in_mentor()
    test_catalog_mentors_filter()
    test_admin_pending()

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
