"""
Backend Test Suite — OAuth endpoints + seeded mock data + personalization regression.

Targets:
  1. POST /api/auth/google + /api/auth/linkedin (mock-mode)
  2. Verify seeded mock data (student/mentor/alumni/college logins, catalog ≥30, rooms ≥12)
  3. Personalization with seeded users (student01 school + student21 alumni-eligible)
  4. Regression: admin login + pending mentors queue ≥3
"""
import time
import json
import requests

BASE = "https://hiring-mvvm.preview.emergentagent.com/api"

results = []


def log(name, ok, msg=""):
    status = "PASS" if ok else "FAIL"
    print(f"[{status}] {name} :: {msg}")
    results.append({"test": name, "ok": ok, "msg": msg})


def hdr(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def post(path, payload=None, token=None):
    h = {"Content-Type": "application/json"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return requests.post(BASE + path, json=payload or {}, headers=h, timeout=30)


def get(path, token=None, params=None):
    h = {}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return requests.get(BASE + path, headers=h, params=params, timeout=30)


def login(email, password):
    r = post("/auth/login", {"email": email, "password": password})
    return r


# =============================================================================
# 1. OAuth Endpoints (mock-mode)
# =============================================================================
def test_oauth():
    print("\n=== 1. OAuth Endpoints (mock-mode) ===")

    # Use a fresh email each run to test "create new" + "re-find" semantics
    ts = int(time.time())
    g_email = f"newoauth.google.{ts}@example.com"
    li_email = f"newoauth.li.{ts}@example.com"

    # 1a. /auth/google (new student)
    r = post("/auth/google", {
        "email": g_email,
        "full_name": "Google Test",
        "role": "student",
    })
    if r.status_code == 200:
        body = r.json()
        ok = (
            "access_token" in body and "refresh_token" in body and "user" in body
            and body["user"]["email"] == g_email
            and body["user"]["onboarding_completed"] is False
            and body["user"]["role"] == "student"
        )
        log("OAuth Google new student", ok,
            f"email={body['user']['email']}, onboarding_completed={body['user']['onboarding_completed']}, role={body['user']['role']}")
        google_token_first = body.get("access_token")
        google_user_id_first = body["user"]["id"]
    else:
        log("OAuth Google new student", False, f"status={r.status_code} body={r.text[:200]}")
        google_token_first = None
        google_user_id_first = None

    # 1b. /auth/linkedin (new student)
    r = post("/auth/linkedin", {
        "email": li_email,
        "full_name": "LinkedIn Test",
        "role": "student",
    })
    if r.status_code == 200:
        body = r.json()
        ok = (
            "access_token" in body and "refresh_token" in body and "user" in body
            and body["user"]["email"] == li_email
            and body["user"]["onboarding_completed"] is False
            and body["user"]["role"] == "student"
        )
        log("OAuth LinkedIn new student", ok,
            f"email={body['user']['email']}, onboarding_completed={body['user']['onboarding_completed']}")
    else:
        log("OAuth LinkedIn new student", False, f"status={r.status_code} body={r.text[:200]}")

    # 1c. Re-call /auth/google with SAME email → must re-find existing user, no duplicate
    r2 = post("/auth/google", {
        "email": g_email,
        "full_name": "Google Test 2",
        "role": "student",
    })
    if r2.status_code == 200 and google_user_id_first:
        body2 = r2.json()
        ok = body2["user"]["id"] == google_user_id_first
        log("OAuth Google re-login (no duplicate)", ok,
            f"first_id={google_user_id_first} second_id={body2['user']['id']}")
    else:
        log("OAuth Google re-login (no duplicate)", False,
            f"status={r2.status_code} body={r2.text[:200]}")

    # 1d. /auth/google with missing email → 400
    r = post("/auth/google", {"full_name": "Anonymous"})
    log("OAuth Google missing email → 400", r.status_code == 400,
        f"status={r.status_code} body={r.text[:120]}")

    # 1e. /auth/google with role=mentor
    mentor_email = f"newoauth.mentor.{ts}@example.com"
    r = post("/auth/google", {
        "email": mentor_email,
        "full_name": "Mentor Test",
        "role": "mentor",
    })
    if r.status_code == 200:
        body = r.json()
        ok = body["user"]["role"] == "mentor"
        log("OAuth Google role=mentor", ok, f"role={body['user']['role']}")
    else:
        log("OAuth Google role=mentor", False, f"status={r.status_code} body={r.text[:200]}")

    # 1f. After OAuth login, GET /auth/me should return same user
    if google_token_first:
        r = get("/auth/me", token=google_token_first)
        if r.status_code == 200:
            me = r.json()
            ok = me["email"] == g_email and me["id"] == google_user_id_first
            log("OAuth /auth/me with returned access_token", ok,
                f"email={me['email']} id_match={me['id'] == google_user_id_first}")
        else:
            log("OAuth /auth/me with returned access_token", False,
                f"status={r.status_code} body={r.text[:200]}")
    else:
        log("OAuth /auth/me with returned access_token", False, "no access_token from earlier step")


# =============================================================================
# 2. Verify seeded mock data exists
# =============================================================================
seeded_tokens = {}


def test_seeded_logins():
    print("\n=== 2. Seeded mock data — logins ===")
    pwd = "TestPass@123"

    # Student
    r = login("student01@test.com", pwd)
    if r.status_code == 200:
        body = r.json()
        ok = body["user"]["role"] == "student"
        log("Login student01", ok, f"role={body['user']['role']}")
        seeded_tokens["student01"] = body["access_token"]
        seeded_tokens["student01_user"] = body["user"]
    else:
        log("Login student01", False, f"status={r.status_code} body={r.text[:200]}")

    # Approved mentor
    r = login("mentor01@test.com", pwd)
    if r.status_code == 200:
        body = r.json()
        u = body["user"]
        ok = u["role"] == "mentor" and u.get("mentor_status") == "approved"
        log("Login mentor01 (approved)", ok,
            f"role={u['role']} mentor_status={u.get('mentor_status')}")
    else:
        log("Login mentor01 (approved)", False, f"status={r.status_code} body={r.text[:200]}")

    # Pending mentor
    r = login("mentor13@test.com", pwd)
    if r.status_code == 200:
        body = r.json()
        u = body["user"]
        ok = u.get("mentor_status") == "pending"
        log("Login mentor13 (pending)", ok, f"mentor_status={u.get('mentor_status')}")
    else:
        log("Login mentor13 (pending)", False, f"status={r.status_code} body={r.text[:200]}")

    # Alumni
    r = login("alumni01@test.com", pwd)
    if r.status_code == 200:
        body = r.json()
        ok = body["user"]["role"] == "alumni"
        log("Login alumni01", ok, f"role={body['user']['role']}")
    else:
        log("Login alumni01", False, f"status={r.status_code} body={r.text[:200]}")

    # College
    r = login("iith@university.in", pwd)
    if r.status_code == 200:
        body = r.json()
        ok = body["user"]["role"] == "college"
        log("Login iith (college)", ok, f"role={body['user']['role']}")
    else:
        log("Login iith (college)", False, f"status={r.status_code} body={r.text[:200]}")


def test_catalog_counts():
    print("\n=== 2. Seeded mock data — catalog volumes ===")
    checks = [
        ("/catalog/courses", "courses", 30),
        ("/catalog/internships", "internships", 30),
        ("/catalog/deals", "deals", 30),
        ("/catalog/events", "events", 30),
    ]
    for path, key, minimum in checks:
        # Catalog endpoints have default limit=20, so request more
        r = get(path, params={"limit": 100})
        if r.status_code == 200:
            arr = r.json().get(key, [])
            log(f"GET {path} ≥{minimum}", len(arr) >= minimum,
                f"count={len(arr)}")
        else:
            log(f"GET {path} ≥{minimum}", False, f"status={r.status_code}")

    # /rooms — no limit param needed
    r = get("/rooms")
    if r.status_code == 200:
        arr = r.json().get("rooms", [])
        log("GET /rooms ≥12", len(arr) >= 12, f"count={len(arr)}")
    else:
        log("GET /rooms ≥12", False, f"status={r.status_code}")

    # /catalog/mentors
    r = get("/catalog/mentors", params={"limit": 100})
    if r.status_code == 200:
        arr = r.json().get("mentors", [])
        log("GET /catalog/mentors ≥6", len(arr) >= 6, f"count={len(arr)}")
    else:
        log("GET /catalog/mentors ≥6", False, f"status={r.status_code}")


# =============================================================================
# 3. Personalization with seeded users
# =============================================================================
def test_personalization():
    print("\n=== 3. Personalization with seeded users ===")
    pwd = "TestPass@123"

    # student01: Class 11 → school-friendly priority modules
    r = login("student01@test.com", pwd)
    if r.status_code == 200:
        token = r.json()["access_token"]
        rd = get("/dashboard", token=token)
        if rd.status_code == 200:
            d = rd.json()
            pers = d.get("personalization") or {}
            pri = pers.get("priority_modules") or []
            school_friendly = {"scholarships", "courses", "campus_tours", "events"}
            top4 = pri[:4]
            ok = bool(set(top4) & school_friendly) and (pri[0] in school_friendly if pri else False)
            log("student01 (Class 11) priority_modules school-friendly first",
                ok,
                f"priority_modules[0]={pri[0] if pri else None} top4={top4} edu_level={pers.get('education_level')}")
        else:
            log("student01 dashboard", False, f"status={rd.status_code}")
    else:
        log("student01 dashboard login", False, f"status={r.status_code}")

    # student21: B.Tech 4th year → can_transition_alumni=True OR education_level=='btech'
    r = login("student21@test.com", pwd)
    if r.status_code == 200:
        token = r.json()["access_token"]
        rd = get("/dashboard", token=token)
        if rd.status_code == 200:
            d = rd.json()
            pers = d.get("personalization") or {}
            edu = pers.get("education_level")
            can_trans = pers.get("can_transition_alumni")
            ok = (can_trans is True) or (edu == "btech")
            log("student21 (B.Tech 4th yr) alumni-eligible", ok,
                f"education_level={edu} can_transition_alumni={can_trans}")
        else:
            log("student21 dashboard", False, f"status={rd.status_code}")
    else:
        log("student21 dashboard login", False, f"status={r.status_code}")


# =============================================================================
# 4. Regression — admin
# =============================================================================
def test_admin_regression():
    print("\n=== 4. Regression — admin flows ===")
    r = login("admin@careerpath.app", "Admin@12345")
    if r.status_code == 200:
        body = r.json()
        ok = body["user"]["role"] == "admin"
        log("Login admin@careerpath.app role=admin", ok,
            f"role={body['user']['role']}")
        admin_token = body["access_token"]

        r2 = get("/admin/mentors/pending", token=admin_token)
        if r2.status_code == 200:
            mentors = r2.json().get("mentors", [])
            ok = len(mentors) >= 3
            emails = [m.get("email") for m in mentors]
            log("Admin pending mentors ≥3", ok,
                f"count={len(mentors)} emails={emails[:5]}")
        else:
            log("Admin pending mentors ≥3", False,
                f"status={r2.status_code} body={r2.text[:200]}")
    else:
        log("Login admin", False, f"status={r.status_code} body={r.text[:200]}")


# =============================================================================
# Run
# =============================================================================
if __name__ == "__main__":
    print(f"Testing against: {BASE}")
    print("=" * 70)

    test_oauth()
    test_seeded_logins()
    test_catalog_counts()
    test_personalization()
    test_admin_regression()

    print("\n" + "=" * 70)
    passed = sum(1 for r in results if r["ok"])
    total = len(results)
    print(f"RESULTS: {passed}/{total} passed")
    if passed != total:
        print("\nFailures:")
        for r in results:
            if not r["ok"]:
                print(f"  - {r['test']}: {r['msg']}")
