"""End-to-End Real-Time Auth Flow validation (P0).

Tests verify the bug-fix in /app/backend/server.py:
  1. StudentInfo.age + education_level are now Optional (so seeded users
     with only career_goal don't 422).
  2. _safe_block() drops invalid info blocks instead of crashing UserResponse.
"""
import sys
import uuid
import requests

BASE = "https://hiring-mvvm.preview.emergentagent.com/api"
TIMEOUT = 30

results = []


def record(name, ok, detail=""):
    status = "PASS" if ok else "FAIL"
    results.append((status, name, detail))
    sym = "✅" if ok else "❌"
    print(f"{sym} [{status}] {name} :: {detail}")
    return ok


def post(path, **kwargs):
    return requests.post(BASE + path, timeout=TIMEOUT, **kwargs)


def get(path, **kwargs):
    return requests.get(BASE + path, timeout=TIMEOUT, **kwargs)


# ---------------------------------------------------------------------------
# 1. Register — brand new student
# ---------------------------------------------------------------------------
rand_suffix = uuid.uuid4().hex[:10]
student_email = f"e2e_student_{rand_suffix}@test.com"
student_password = "TestPass@123"

r = post("/auth/register", json={
    "email": student_email,
    "password": student_password,
    "full_name": "E2E Student",
    "role": "student",
})
ok = r.status_code == 200
new_student_tokens = {}
if ok:
    data = r.json()
    new_student_tokens["access"] = data.get("access_token")
    new_student_tokens["refresh"] = data.get("refresh_token")
    user = data.get("user", {})
    ok = (
        bool(data.get("access_token"))
        and bool(data.get("refresh_token"))
        and user.get("onboarding_completed") is False
        and user.get("role") == "student"
        and "password_hash" not in user
    )
record(
    "1) POST /auth/register — new student",
    ok,
    f"status={r.status_code} email={student_email}",
)


# ---------------------------------------------------------------------------
# 2. Register — brand new mentor
# ---------------------------------------------------------------------------
mentor_email = f"e2e_mentor_{rand_suffix}@test.com"
r = post("/auth/register", json={
    "email": mentor_email,
    "password": student_password,
    "full_name": "E2E Mentor",
    "role": "mentor",
})
ok = r.status_code == 200
if ok:
    user = r.json().get("user", {})
    ok = user.get("role") == "mentor" and user.get("mentor_status") == "pending"
record(
    "2) POST /auth/register — new mentor (mentor_status=pending)",
    ok,
    f"status={r.status_code}",
)


# ---------------------------------------------------------------------------
# 3. Login — seeded users (the critical regression case set)
# ---------------------------------------------------------------------------
seeded = [
    ("student01@test.com",            "TestPass@123"),
    ("mentor01@test.com",             "TestPass@123"),
    ("college01@test.com",            "TestPass@123"),
    ("admin@careerpath.app",          "Admin@12345"),
    ("booked1@persona.demo",          "TestPass@123"),  # was 500 before fix
    ("mentor-active1@persona.demo",   "TestPass@123"),
    ("college-high1@persona.demo",    "TestPass@123"),
    ("admin-super1@persona.demo",     "TestPass@123"),
]

login_tokens = {}  # email → access_token

for email, password in seeded:
    r = post("/auth/login", json={"email": email, "password": password})
    ok = r.status_code == 200
    detail = f"status={r.status_code}"
    if ok:
        try:
            data = r.json()
            ok = bool(data.get("access_token")) and bool(data.get("user"))
            if ok:
                login_tokens[email] = data["access_token"]
                user = data["user"]
                detail += f" role={user.get('role')} onboarded={user.get('onboarding_completed')}"
                if "password_hash" in user:
                    ok = False
                    detail += " (LEAKED password_hash!)"
        except Exception as exc:
            ok = False
            detail += f" parse_err={exc}"
    else:
        detail += f" body={r.text[:300]}"
    record(f"3) POST /auth/login — {email}", ok, detail)


# ---------------------------------------------------------------------------
# 4. Login — negative cases
# ---------------------------------------------------------------------------
r = post("/auth/login", json={"email": "student01@test.com", "password": "WrongPass!1"})
ok = r.status_code == 401 and "Invalid email or password" in r.text
record(
    "4a) POST /auth/login — wrong password → 401",
    ok,
    f"status={r.status_code} body={r.text[:200]}",
)

r = post("/auth/login", json={"email": f"nobody_{rand_suffix}@noexist.zz", "password": "AnyPass@123"})
ok = r.status_code == 401
record(
    "4b) POST /auth/login — unknown email → 401",
    ok,
    f"status={r.status_code} body={r.text[:200]}",
)


# ---------------------------------------------------------------------------
# 5. Login with the brand-new user from step 1 (proves persistence to DB)
# ---------------------------------------------------------------------------
r = post("/auth/login", json={"email": student_email, "password": student_password})
ok = r.status_code == 200
new_login_access = None
new_login_refresh = None
if ok:
    data = r.json()
    new_login_access = data.get("access_token")
    new_login_refresh = data.get("refresh_token")
    ok = bool(new_login_access) and bool(new_login_refresh)
record(
    "5) POST /auth/login — newly registered student persisted",
    ok,
    f"status={r.status_code}",
)


# ---------------------------------------------------------------------------
# 6. GET /auth/me with + without token
# ---------------------------------------------------------------------------
if new_login_access:
    r = get("/auth/me", headers={"Authorization": f"Bearer {new_login_access}"})
    ok = r.status_code == 200
    detail = f"status={r.status_code}"
    if ok:
        u = r.json()
        ok = (
            u.get("email") == student_email
            and u.get("role") == "student"
            and "password_hash" not in u
        )
        detail += f" email={u.get('email')} role={u.get('role')}"
    record("6a) GET /auth/me — with bearer → 200, no password_hash", ok, detail)
else:
    record("6a) GET /auth/me — with bearer", False, "skipped: no access_token from step 5")

r = get("/auth/me")
ok = r.status_code == 401
record("6b) GET /auth/me — without bearer → 401", ok, f"status={r.status_code}")


# ---------------------------------------------------------------------------
# 7. Refresh token
# ---------------------------------------------------------------------------
if new_login_refresh:
    r = post("/auth/refresh", json={"refresh_token": new_login_refresh})
    ok = r.status_code == 200
    detail = f"status={r.status_code}"
    if ok:
        ok = bool(r.json().get("access_token"))
        detail += " new_access_token=present"
    record("7) POST /auth/refresh — returns new access_token", ok, detail)
else:
    record("7) POST /auth/refresh", False, "skipped: no refresh_token")


# ---------------------------------------------------------------------------
# 8. Sanity — dashboard endpoints
# Note: backend exposes a single /api/dashboard (role-personalized).
# /api/student/dashboard and /api/mentor/dashboard are NOT defined in server.py.
# We try the user-requested paths first then fall back to /api/dashboard.
# ---------------------------------------------------------------------------
def test_dashboard(label, token):
    if not token:
        record(f"8) {label} dashboard", False, "no token available")
        return
    if label == "student":
        try_paths = ["/student/dashboard", "/dashboard"]
    else:
        try_paths = ["/mentor/dashboard", "/dashboard"]
    last = None
    for path in try_paths:
        r = get(path, headers={"Authorization": f"Bearer {token}"})
        last = (path, r)
        if r.status_code == 200:
            record(
                f"8) GET {path} ({label}) → 200",
                True,
                f"keys={list(r.json().keys())[:6]}",
            )
            return
    p, r = last
    record(
        f"8) GET dashboard for {label}",
        False,
        f"last={p} status={r.status_code} body={r.text[:200]}",
    )


test_dashboard("student", login_tokens.get("student01@test.com"))
test_dashboard("mentor",  login_tokens.get("mentor01@test.com"))


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
total = len(results)
passed = sum(1 for s, *_ in results if s == "PASS")
failed = total - passed
print()
print("=" * 78)
print(f"TOTAL {total}   PASS {passed}   FAIL {failed}")
print("=" * 78)
for status, name, detail in results:
    sym = "✅" if status == "PASS" else "❌"
    print(f"{sym} {status}  {name}")

sys.exit(0 if failed == 0 else 1)
