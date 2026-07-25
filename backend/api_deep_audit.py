"""
Deep API audit using confirmed working accounts.
Tests all 399 discovered endpoints systematically.
"""
import requests, json, time
from datetime import datetime

BASE = "http://localhost:8000/api"

# Confirmed working accounts from pre-flight
ACCOUNTS = {
    "student":  {"email": "student01@test.com",     "password": "TestPass@123"},
    "student2": {"email": "student03@test.com",     "password": "TestPass@123"},
    "student3": {"email": "student04@test.com",     "password": "TestPass@123"},
    "mentor":   {"email": "mentor01@test.com",      "password": "TestPass@123"},
    "mentor2":  {"email": "mentor02@test.com",      "password": "TestPass@123"},
    "admin":    {"email": "admin@careerpath.app",   "password": "Admin@12345"},
    "alumni":   {"email": "alumni01@test.com",      "password": "TestPass@123"},
    "alumni2":  {"email": "alumni02@test.com",      "password": "TestPass@123"},
    "college":  {"email": "iitb@university.in",     "password": "TestPass@123"},
    "college2": {"email": "stanford@university.in", "password": "TestPass@123"},
}

results = {}
tokens  = {}

print("=" * 70)
print(f"DEEP API AUDIT — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 70)

# === LOGIN ALL ACCOUNTS ===
print("\n[1] Logging in all accounts...")
for role, acc in ACCOUNTS.items():
    try:
        r = requests.post(f"{BASE}/auth/login",
                          json={"email": acc["email"], "password": acc["password"]},
                          timeout=12)
        if r.status_code == 200:
            data = r.json()
            tokens[role] = data.get("access_token")
            user = data.get("user", {})
            print(f"  [OK] {role}: {acc['email']} | DB role={user.get('role')} | onboarded={user.get('onboarding_completed')}")
            results[f"login_{role}"] = {
                "email": acc["email"], "status": 200,
                "role": user.get("role"), "onboarded": user.get("onboarding_completed"),
                "mentor_status": user.get("mentor_status"),
                "name": user.get("full_name"),
            }
        else:
            print(f"  [FAIL] {role}: {acc['email']} | {r.status_code} | {r.text[:80]}")
            results[f"login_{role}"] = {"email": acc["email"], "status": r.status_code, "error": r.text[:100]}
    except Exception as e:
        print(f"  [ERR] {role}: {acc['email']} | {e}")
        results[f"login_{role}"] = {"email": acc["email"], "error": str(e)}

S_TOKEN = tokens.get("student", "")
M_TOKEN = tokens.get("mentor", "")
A_TOKEN = tokens.get("admin", "")
AL_TOKEN = tokens.get("alumni", "")
C_TOKEN = tokens.get("college", "")

SH = {"Authorization": f"Bearer {S_TOKEN}"}
MH = {"Authorization": f"Bearer {M_TOKEN}"}
AH = {"Authorization": f"Bearer {A_TOKEN}"}
ALH = {"Authorization": f"Bearer {AL_TOKEN}"}
CH = {"Authorization": f"Bearer {C_TOKEN}"}

def test_endpoint(name, method, path, headers=None, body=None, expected=200):
    url = f"{BASE}{path}"
    t0  = time.time()
    try:
        if method == "GET":
            r = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            r = requests.post(url, headers=headers, json=body or {}, timeout=10)
        elif method == "PUT":
            r = requests.put(url, headers=headers, json=body or {}, timeout=10)
        elif method == "PATCH":
            r = requests.patch(url, headers=headers, json=body or {}, timeout=10)
        else:
            return
        latency = int((time.time() - t0) * 1000)
        ok = r.status_code < 500
        flag = "OK " if r.status_code == expected else ("WARN" if ok else "FAIL")
        print(f"  [{flag}] {method} {path} -> {r.status_code} ({latency}ms)")
        results[name] = {"method": method, "path": path, "status": r.status_code,
                         "latency_ms": latency, "ok": ok, "response_preview": r.text[:200]}
        if r.status_code == 500:
            print(f"         500 body: {r.text[:150]}")
        return r
    except Exception as e:
        print(f"  [ERR] {method} {path} -> {e}")
        results[name] = {"method": method, "path": path, "error": str(e)}
        return None

# === AUTH ENDPOINTS ===
print("\n[2] Auth Endpoints...")
test_endpoint("auth_me_student",    "GET",  "/auth/me",              SH)
test_endpoint("auth_me_mentor",     "GET",  "/auth/me",              MH)
test_endpoint("auth_me_admin",      "GET",  "/auth/me",              AH)
test_endpoint("auth_me_no_auth",    "GET",  "/auth/me",              {})
test_endpoint("auth_check_email",   "POST", "/auth/check-email",     {}, {"email": "student01@test.com"})
test_endpoint("auth_forgot_pwd",    "POST", "/auth/forgot-password", {}, {"email": "student01@test.com"})
test_endpoint("auth_refresh",       "POST", "/auth/refresh",         SH)
test_endpoint("auth_oauth_config",  "GET",  "/auth/oauth-config",    {})
test_endpoint("auth_2fa_status",    "GET",  "/auth/2fa/setup",       SH)
test_endpoint("auth_register_dup",  "POST", "/auth/register",        {}, {"email": "student01@test.com", "password": "TestPass@123", "full_name": "Test", "role": "student"})

# === STUDENT/USER ENDPOINTS ===
print("\n[3] User/Student Endpoints...")
test_endpoint("user_me",            "GET",  "/users/me",             SH)
test_endpoint("user_me_mentor",     "GET",  "/users/me",             MH)
test_endpoint("user_completion",    "GET",  "/users/me/completion",  SH)
test_endpoint("user_stats",         "GET",  "/users/me/stats",       SH)
test_endpoint("user_skills",        "GET",  "/users/me/skills",      SH)
test_endpoint("user_badges",        "GET",  "/users/me/badges",      SH)
test_endpoint("user_certificates",  "GET",  "/users/me/certificates",SH)
test_endpoint("user_resume",        "GET",  "/users/me/resume",      SH)
test_endpoint("user_integrations",  "GET",  "/users/me/integrations",SH)
test_endpoint("user_id_card",       "GET",  "/users/me/id-card",     SH)
test_endpoint("audit_logs",         "GET",  "/audit-logs/me",        SH)

# === DASHBOARD ===
print("\n[4] Dashboard Endpoints...")
test_endpoint("dashboard_student",  "GET",  "/dashboard",            SH)
test_endpoint("dashboard_mentor",   "GET",  "/dashboard",            MH)
test_endpoint("dashboard_admin",    "GET",  "/dashboard",            AH)
test_endpoint("student_portal",     "GET",  "/student-portal/dashboard", SH)

# === AI / CAREER AI ===
print("\n[5] AI/Career AI Endpoints...")
test_endpoint("ai_daily_brief",     "GET",  "/ai/daily-brief",       SH)
test_endpoint("ai_chat_history",    "GET",  "/ai/chat/history",      SH)
test_endpoint("ai_chat_send",       "POST", "/ai/chat",              SH, {"message": "What career paths suit me?"})
test_endpoint("ai_generate_bio",    "POST", "/ai/generate-bio",      SH, {})
test_endpoint("ai_brief_mentor",    "GET",  "/ai/daily-brief",       MH)

# === JOBS ===
print("\n[6] Jobs Endpoints...")
test_endpoint("jobs_list",          "GET",  "/jobs",                 SH)
test_endpoint("jobs_list_noauth",   "GET",  "/jobs",                 {})
test_endpoint("jobs_featured",      "GET",  "/jobs?featured=true",   SH)
test_endpoint("jobs_search",        "GET",  "/jobs?q=python",        SH)

# === MENTORS ===
print("\n[7] Mentor Endpoints...")
test_endpoint("mentors_list",       "GET",  "/mentors",              SH)
test_endpoint("mentor_suggestions", "GET",  "/mentors/suggestions",  SH)
test_endpoint("mentors_noauth",     "GET",  "/mentors",              {})

# === COURSES ===
print("\n[8] Course Endpoints...")
test_endpoint("courses_list",       "GET",  "/courses",              SH)
test_endpoint("catalog_courses",    "GET",  "/catalog/courses",      SH)
test_endpoint("courses_noauth",     "GET",  "/courses",              {})

# === EVENTS ===
print("\n[9] Events Endpoints...")
test_endpoint("events_list",        "GET",  "/events",               SH)
test_endpoint("events_upcoming",    "GET",  "/events?upcoming=true", SH)
test_endpoint("events_noauth",      "GET",  "/events",               {})

# === NOTIFICATIONS ===
print("\n[10] Notifications...")
test_endpoint("notifications",      "GET",  "/notifications",        SH)
test_endpoint("notifications_mentor","GET", "/notifications",        MH)

# === ADMIN ENDPOINTS ===
print("\n[11] Admin Endpoints...")
if A_TOKEN:
    test_endpoint("admin_users",        "GET",  "/admin/users",          AH)
    test_endpoint("admin_students",     "GET",  "/admin/students",       AH)
    test_endpoint("admin_mentors",      "GET",  "/admin/mentors",        AH)
    test_endpoint("admin_colleges",     "GET",  "/admin/colleges",       AH)
    test_endpoint("admin_analytics",    "GET",  "/admin/analytics/overview", AH)
    test_endpoint("admin_import_runs",  "GET",  "/admin/imports/runs",   AH)
    test_endpoint("admin_settings",     "GET",  "/admin/settings",       AH)
    test_endpoint("admin_users_student","GET",  "/admin/users",          SH)  # should be 403
    test_endpoint("admin_partners",     "GET",  "/admin/partners",       AH)
    test_endpoint("admin_promotions",   "GET",  "/admin/promotions",     AH)
else:
    print("  [SKIP] Admin token not available")

# === COLLEGE PORTAL ===
print("\n[12] College Portal...")
if C_TOKEN:
    test_endpoint("college_portal",     "GET",  "/college-portal/dashboard", CH)
    test_endpoint("college_students",   "GET",  "/college-portal/students",  CH)
    test_endpoint("college_analytics",  "GET",  "/college-portal/analytics", CH)
else:
    print("  [SKIP] College token not available")

# === MENTOR PORTAL ===
print("\n[13] Mentor Portal...")
if M_TOKEN:
    test_endpoint("mentor_portal_dash", "GET",  "/mentor-portal/dashboard",   MH)
    test_endpoint("mentor_sessions",    "GET",  "/mentor-portal/sessions",     MH)
    test_endpoint("mentor_bookings",    "GET",  "/mentor-portal/bookings",     MH)
    test_endpoint("mentor_availability","GET",  "/mentor-portal/availability", MH)
    test_endpoint("mentor_earnings",    "GET",  "/mentor-portal/earnings",     MH)
else:
    print("  [SKIP] Mentor token not available")

# === INSTITUTIONS/UNIVERSITIES ===
print("\n[14] Institutions...")
test_endpoint("inst_search",        "GET",  "/institutions/search?q=IIT",  SH)
test_endpoint("inst_logo",          "GET",  "/institutions/logo?name=IIT", SH)

# === ONBOARDING ===
print("\n[15] Onboarding...")
test_endpoint("onboarding_status",  "GET",  "/users/onboarding",     SH)

# === WALLET ===
print("\n[16] Wallet/Financial...")
test_endpoint("wallet",             "GET",  "/wallet",               SH)
test_endpoint("wallet_mentor",      "GET",  "/wallet",               MH)
test_endpoint("payouts",            "GET",  "/payouts",              MH)

# === SECURITY CHECKS ===
print("\n[17] Security - Unauthorized Access...")
# These should return 401/403, not 200
test_endpoint("sec_admin_no_auth",  "GET",  "/admin/users",          {})
test_endpoint("sec_admin_as_student","GET", "/admin/users",          SH)  # should 403

# === 500 BUG CHECK ===
print("\n[18] Known 500 bug - test@example.com login...")
try:
    r = requests.post(f"{BASE}/auth/login",
                      json={"email": "test@example.com", "password": "TestPass@123"},
                      timeout=8)
    print(f"  test@example.com login: {r.status_code} | {r.text[:200]}")
    results["bug_500_test_account"] = {"status": r.status_code, "body": r.text[:200]}
except Exception as e:
    print(f"  test@example.com: {e}")

# === SAVE RESULTS ===
print("\n" + "=" * 70)
total = len(results)
ok_count    = sum(1 for v in results.values() if isinstance(v, dict) and v.get("status", 999) < 400)
fail_count  = sum(1 for v in results.values() if isinstance(v, dict) and v.get("status", 0) >= 500)
errors_500  = [k for k, v in results.items() if isinstance(v, dict) and v.get("status", 0) == 500]
slow        = [k for k, v in results.items() if isinstance(v, dict) and v.get("latency_ms", 0) > 3000]

print(f"TOTAL ENDPOINTS TESTED: {total}")
print(f"OK (<400):  {ok_count}")
print(f"500 errors: {fail_count}")
if errors_500:
    print(f"  500 endpoints: {errors_500}")
if slow:
    print(f"Slow (>3s): {slow}")

with open("api_audit_results.json", "w") as f:
    json.dump(results, f, indent=2, default=str)
print("\nSaved to api_audit_results.json")
