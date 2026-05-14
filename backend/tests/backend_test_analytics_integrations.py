"""
Backend Tests — Analytics + Integrations endpoints
Base URL pulled from EXPO_PUBLIC_BACKEND_URL.
"""
import os
import sys
import json
import requests

BASE = "https://hiring-mvvm.preview.emergentagent.com/api"

CREDS = {
    "admin":   ("admin@careerpath.app", "Admin@12345"),
    "mentor":  ("mentor01@test.com",    "TestPass@123"),
    "college": ("iith@university.in",   "TestPass@123"),
    "student": ("student@test.com",     "Student@123"),
}

# Track failures
failures = []
passed   = []


def log_pass(name):
    passed.append(name)
    print(f"  PASS: {name}")


def log_fail(name, reason):
    failures.append((name, reason))
    print(f"  FAIL: {name} -> {reason}")


def login(role):
    email, pw = CREDS[role]
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": pw})
    if r.status_code != 200:
        raise SystemExit(f"Login failed for {role}: {r.status_code} {r.text}")
    j = r.json()
    return j["access_token"], j["user"]


def H(tok):
    return {"Authorization": f"Bearer {tok}"}


def section(title):
    print(f"\n=== {title} ===")


# ---------------------------------------------------------------------------
section("LOGIN ALL ROLES")
tokens = {}
users = {}
for role in ("admin", "mentor", "college", "student"):
    t, u = login(role)
    tokens[role] = t
    users[role]  = u
    print(f"  Logged in {role}: {u['email']} role={u['role']}")

# ---------------------------------------------------------------------------
# 1. /api/analytics dispatcher
# ---------------------------------------------------------------------------
section("1) GET /api/analytics dispatcher (admin)")
r = requests.get(f"{BASE}/analytics", headers=H(tokens["admin"]))
if r.status_code != 200:
    log_fail("dispatcher admin status 200", f"got {r.status_code} {r.text}")
else:
    j = r.json()
    if j.get("scope") == "platform":
        log_pass("admin scope=platform")
    else:
        log_fail("admin scope=platform", f"got {j.get('scope')}")
    kpis = j.get("kpis", {}) or {}
    for k in ("total_users", "students", "alumni", "mentors", "colleges", "pending_mentors"):
        if k in kpis:
            log_pass(f"admin kpis.{k} present")
        else:
            log_fail(f"admin kpis.{k} present", f"missing; kpis keys={list(kpis.keys())}")
    gs = j.get("growth_series")
    if isinstance(gs, list) and len(gs) == 14:
        log_pass("admin growth_series len=14")
    else:
        log_fail("admin growth_series len=14", f"got {type(gs).__name__} len={len(gs) if isinstance(gs, list) else 'n/a'}")
    rd = j.get("role_distribution")
    if isinstance(rd, list) and len(rd) == 4:
        log_pass("admin role_distribution len=4")
    else:
        log_fail("admin role_distribution len=4", f"got len={len(rd) if isinstance(rd, list) else 'n/a'}")
    if isinstance(j.get("mentor_categories"), list):
        log_pass("admin mentor_categories present (list)")
    else:
        log_fail("admin mentor_categories list", f"got {type(j.get('mentor_categories')).__name__}")
    tc = j.get("top_colleges")
    if isinstance(tc, list) and len(tc) >= 3:
        log_pass(f"admin top_colleges len>=3 (got {len(tc)})")
    else:
        log_fail("admin top_colleges len>=3", f"got len={len(tc) if isinstance(tc, list) else 'n/a'}")
    rev = j.get("revenue") or {}
    if "mtd" in rev:
        log_pass(f"admin revenue.mtd exists ({rev['mtd']})")
    else:
        log_fail("admin revenue.mtd exists", f"revenue={rev}")

section("1) GET /api/analytics dispatcher (mentor)")
r = requests.get(f"{BASE}/analytics", headers=H(tokens["mentor"]))
if r.status_code != 200:
    log_fail("mentor dispatcher 200", f"{r.status_code} {r.text}")
else:
    j = r.json()
    if j.get("scope") == "mentor":
        log_pass("mentor scope=mentor")
    else:
        log_fail("mentor scope=mentor", f"got {j.get('scope')}")
    kpis = j.get("kpis", {}) or {}
    for k in ("total_bookings", "completed_sessions", "upcoming_sessions",
              "hours_mentored", "estimated_earnings"):
        if k in kpis:
            log_pass(f"mentor kpis.{k} present")
        else:
            log_fail(f"mentor kpis.{k} present", f"missing; keys={list(kpis.keys())}")
    if kpis.get("currency") == "INR":
        log_pass("mentor kpis.currency=INR")
    else:
        log_fail("mentor kpis.currency=INR", f"got {kpis.get('currency')}")
    wb = j.get("weekly_bookings")
    if isinstance(wb, list) and len(wb) == 8:
        log_pass("mentor weekly_bookings len=8")
    else:
        log_fail("mentor weekly_bookings len=8", f"got len={len(wb) if isinstance(wb, list) else 'n/a'}")
    if isinstance(j.get("top_topics"), list):
        log_pass("mentor top_topics list")
    else:
        log_fail("mentor top_topics list", "missing or wrong type")
    if isinstance(j.get("upcoming_sessions_list"), list):
        log_pass("mentor upcoming_sessions_list list")
    else:
        log_fail("mentor upcoming_sessions_list list", "missing")
    if "rating" in j:
        log_pass(f"mentor rating present ({j['rating']})")
    else:
        log_fail("mentor rating present", "missing")

section("1) GET /api/analytics dispatcher (college)")
r = requests.get(f"{BASE}/analytics", headers=H(tokens["college"]))
if r.status_code != 200:
    log_fail("college dispatcher 200", f"{r.status_code} {r.text}")
else:
    j = r.json()
    if j.get("scope") == "college":
        log_pass("college scope=college")
    else:
        log_fail("college scope=college", f"got {j.get('scope')}")
    if j.get("institution_name") == "IIT Hyderabad":
        log_pass("college institution_name=IIT Hyderabad")
    else:
        log_fail("college institution_name", f"got {j.get('institution_name')}")
    kpis = j.get("kpis", {}) or {}
    for k in ("total_students", "total_alumni", "total_mentors", "total_bookings_by_students"):
        if k in kpis:
            log_pass(f"college kpis.{k} present (val={kpis[k]})")
        else:
            log_fail(f"college kpis.{k} present", f"missing; keys={list(kpis.keys())}")
    if isinstance(j.get("education_distribution"), list):
        log_pass("college education_distribution list")
    else:
        log_fail("college education_distribution list", "missing")
    if isinstance(j.get("career_path_distribution"), list):
        log_pass("college career_path_distribution list")
    else:
        log_fail("college career_path_distribution list", "missing")
    if isinstance(j.get("top_alumni"), list):
        log_pass("college top_alumni list")
    else:
        log_fail("college top_alumni list", "missing")
    es = j.get("enrollment_series")
    if isinstance(es, list) and len(es) == 14:
        log_pass("college enrollment_series len=14")
    else:
        log_fail("college enrollment_series len=14", f"got len={len(es) if isinstance(es, list) else 'n/a'}")

section("1) GET /api/analytics dispatcher (student)")
r = requests.get(f"{BASE}/analytics", headers=H(tokens["student"]))
if r.status_code != 200:
    log_fail("student dispatcher 200", f"{r.status_code} {r.text}")
else:
    j = r.json()
    if j.get("scope") == "none":
        log_pass("student scope=none")
    else:
        log_fail("student scope=none", f"got {j.get('scope')}")

# ---------------------------------------------------------------------------
# 2. Specific role endpoints
# ---------------------------------------------------------------------------
section("2) GET /api/analytics/super-admin (admin)")
r = requests.get(f"{BASE}/analytics/super-admin", headers=H(tokens["admin"]))
if r.status_code == 200 and "revenue" in r.json():
    log_pass("super-admin admin → 200 + revenue")
else:
    log_fail("super-admin admin", f"{r.status_code} body has revenue? {'revenue' in (r.json() if r.status_code == 200 else {})}")

section("2) GET /api/analytics/super-admin (mentor) → 403")
r = requests.get(f"{BASE}/analytics/super-admin", headers=H(tokens["mentor"]))
if r.status_code == 403:
    log_pass("super-admin mentor → 403")
else:
    log_fail("super-admin mentor → 403", f"got {r.status_code} {r.text[:200]}")

section("2) GET /api/analytics/admin (admin) → 200 NO revenue")
r = requests.get(f"{BASE}/analytics/admin", headers=H(tokens["admin"]))
if r.status_code != 200:
    log_fail("analytics/admin status 200", f"{r.status_code}")
else:
    j = r.json()
    if "revenue" not in j:
        log_pass("analytics/admin 200 + NO revenue")
    else:
        log_fail("analytics/admin no revenue", f"revenue field present: {j.get('revenue')}")

section("2) GET /api/analytics/college (college user)")
r = requests.get(f"{BASE}/analytics/college", headers=H(tokens["college"]))
if r.status_code == 200 and r.json().get("institution_name") == "IIT Hyderabad":
    log_pass("analytics/college (college user) → IIT Hyderabad")
else:
    log_fail("analytics/college college user", f"{r.status_code} {r.text[:200]}")

section("2) GET /api/analytics/college?institution_name=IIT%20Bombay (admin)")
r = requests.get(f"{BASE}/analytics/college", params={"institution_name": "IIT Bombay"}, headers=H(tokens["admin"]))
if r.status_code == 200:
    j = r.json()
    if j.get("scope") == "college" and j.get("institution_name") == "IIT Bombay":
        log_pass("analytics/college admin override → IIT Bombay")
    else:
        log_fail("analytics/college admin override", f"scope={j.get('scope')} inst={j.get('institution_name')}")
else:
    log_fail("analytics/college admin override status", f"{r.status_code} {r.text[:200]}")

section("2) GET /api/analytics/mentor (mentor)")
r = requests.get(f"{BASE}/analytics/mentor", headers=H(tokens["mentor"]))
if r.status_code == 200 and r.json().get("scope") == "mentor":
    log_pass("analytics/mentor (mentor) → 200")
else:
    log_fail("analytics/mentor mentor", f"{r.status_code} {r.text[:200]}")

section("2) GET /api/analytics/mentor (student) → 403")
r = requests.get(f"{BASE}/analytics/mentor", headers=H(tokens["student"]))
if r.status_code == 403:
    log_pass("analytics/mentor student → 403")
else:
    log_fail("analytics/mentor student → 403", f"got {r.status_code}")

# ---------------------------------------------------------------------------
# 3. Integrations
# ---------------------------------------------------------------------------
section("3) GET /api/integrations/status")
r = requests.get(f"{BASE}/integrations/status")
if r.status_code != 200:
    log_fail("integrations/status 200", f"{r.status_code}")
else:
    j = r.json()
    expected = {"coursera": "mock", "udemy": "mock", "adzuna": "mock"}
    if all(j.get(k) == v for k, v in expected.items()):
        log_pass("integrations/status all mock")
    else:
        log_fail("integrations/status all mock", f"got {j}")

section("3) GET /api/integrations/courses?limit=4")
r = requests.get(f"{BASE}/integrations/courses", params={"limit": 4})
if r.status_code != 200:
    log_fail("integrations/courses 200", f"{r.status_code}")
else:
    j = r.json()
    items = j.get("items") or []
    if len(items) >= 4:
        log_pass(f"integrations/courses returns {len(items)} items (>=4)")
    else:
        log_fail("integrations/courses >=4 items", f"got {len(items)}")
    coursera_items = [i for i in items if i.get("source") == "coursera"]
    udemy_items    = [i for i in items if i.get("source") == "udemy"]
    if coursera_items and udemy_items:
        log_pass(f"integrations/courses mix coursera={len(coursera_items)} udemy={len(udemy_items)}")
    else:
        log_fail("integrations/courses coursera+udemy mix", f"sources={[i.get('source') for i in items]}")
    required_fields = ("id", "title", "provider", "url", "image", "source", "synced_at")
    if items:
        first = items[0]
        missing = [f for f in required_fields if f not in first]
        if not missing:
            log_pass("integrations/courses item shape ok")
        else:
            log_fail("integrations/courses item shape", f"missing fields {missing} in {list(first.keys())}")

section("3) GET /api/integrations/internships?limit=3")
r = requests.get(f"{BASE}/integrations/internships", params={"limit": 3})
if r.status_code != 200:
    log_fail("integrations/internships 200", f"{r.status_code}")
else:
    j = r.json()
    items = j.get("items") or []
    if len(items) == 3:
        log_pass(f"integrations/internships returns 3 items")
    else:
        log_fail("integrations/internships len=3", f"got {len(items)}")
    if items and all(i.get("source") == "adzuna" for i in items):
        log_pass("integrations/internships all source=adzuna")
    else:
        log_fail("integrations/internships source=adzuna", f"sources={[i.get('source') for i in items]}")
    required_fields = ("title", "company", "location", "stipend", "url", "source")
    if items:
        first = items[0]
        missing = [f for f in required_fields if f not in first]
        if not missing:
            log_pass("integrations/internships item shape ok")
        else:
            log_fail("integrations/internships item shape", f"missing {missing}")

section("3) POST /api/integrations/sync/courses (admin)")
r = requests.post(f"{BASE}/integrations/sync/courses", headers=H(tokens["admin"]))
if r.status_code != 200:
    log_fail("sync/courses admin 200", f"{r.status_code} {r.text[:200]}")
else:
    j = r.json()
    synced = j.get("synced") or {}
    if all(k in synced for k in ("coursera", "udemy", "total")):
        log_pass(f"sync/courses synced fields ok ({synced})")
    else:
        log_fail("sync/courses synced fields", f"got {synced}")
    # Verify catalog/courses contains synced source items
    rc = requests.get(f"{BASE}/catalog/courses", params={"limit": 200}, headers=H(tokens["admin"]))
    if rc.status_code == 200:
        courses = rc.json().get("courses") or rc.json() if isinstance(rc.json(), list) else rc.json().get("courses", [])
        # try a fallback: response may be a dict with "courses" or just a list
        if isinstance(rc.json(), dict):
            courses = rc.json().get("courses") or rc.json().get("items") or []
        else:
            courses = rc.json()
        sources = [c.get("source") for c in courses if isinstance(c, dict)]
        if "coursera" in sources or "udemy" in sources:
            log_pass(f"catalog/courses contains synced (coursera/udemy) items")
        else:
            log_fail("catalog/courses contains synced",
                     f"unique sources in {len(courses)} courses: {set(sources)}")
    else:
        log_fail("catalog/courses fetch", f"{rc.status_code}")

section("3) POST /api/integrations/sync/courses (student) → 403")
r = requests.post(f"{BASE}/integrations/sync/courses", headers=H(tokens["student"]))
if r.status_code == 403:
    log_pass("sync/courses student → 403")
else:
    log_fail("sync/courses student → 403", f"got {r.status_code}")

section("3) POST /api/integrations/sync/internships (admin)")
r = requests.post(f"{BASE}/integrations/sync/internships", headers=H(tokens["admin"]))
if r.status_code != 200:
    log_fail("sync/internships admin 200", f"{r.status_code} {r.text[:200]}")
else:
    j = r.json()
    synced = j.get("synced") or {}
    if "adzuna" in synced and "total" in synced:
        log_pass(f"sync/internships ok ({synced})")
    else:
        log_fail("sync/internships fields", f"{synced}")

# ---------------------------------------------------------------------------
# 4. Regression
# ---------------------------------------------------------------------------
section("4) GET /api/dashboard (student)")
r = requests.get(f"{BASE}/dashboard", headers=H(tokens["student"]))
if r.status_code != 200:
    log_fail("dashboard student 200", f"{r.status_code} {r.text[:200]}")
else:
    j = r.json()
    p = j.get("personalization") or {}
    if isinstance(p.get("priority_modules"), list) and len(p["priority_modules"]) > 0:
        log_pass("dashboard personalization.priority_modules present")
    else:
        log_fail("dashboard personalization.priority_modules", f"got {p}")
    if "recommendations" in j:
        log_pass("dashboard recommendations present")
    else:
        log_fail("dashboard recommendations present", "missing")

section("4) PATCH /api/users/me/preferences (student)")
r = requests.patch(f"{BASE}/users/me/preferences",
                    headers=H(tokens["student"]),
                    json={"interests": ["AI/ML", "Web Dev"]})
if r.status_code == 200:
    log_pass("PATCH preferences student → 200")
else:
    log_fail("PATCH preferences student", f"{r.status_code} {r.text[:200]}")

# ---------------------------------------------------------------------------
section("\n=== SUMMARY ===")
print(f"PASSED: {len(passed)}")
print(f"FAILED: {len(failures)}")
if failures:
    print("\nFAILURES:")
    for n, why in failures:
        print(f"  - {n}: {why}")
sys.exit(1 if failures else 0)
