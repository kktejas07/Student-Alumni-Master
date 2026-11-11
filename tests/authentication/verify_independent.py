"""
Independent Post-Remediation Verification Script
Student Alumni Authentication & Authorization Audit

Executes reproducible, deterministic verification checks against live local services.
"""

import os
import sys
import time
import json
import secrets
import jwt
import requests
from datetime import datetime

BACKEND_URL = os.environ.get("TEST_BACKEND_URL", "http://127.0.0.1:8000")
FRONTEND_URL = os.environ.get("TEST_FRONTEND_URL", "http://localhost:8081")

results = []

def record(item_id, category, objective, expected, actual, status, details=None):
    entry = {
        "id": item_id,
        "category": category,
        "objective": objective,
        "expected": expected,
        "actual": actual,
        "status": status,
        "details": details or {}
    }
    results.append(entry)
    icon = "[PASS]" if status == "PASS" else "[FAIL]"
    print(f"{icon} {item_id}: {objective} -> {status} ({actual})")

def run_independent_checks():
    print(f"\n=======================================================")
    print(f"Starting Independent Security Verification Checks")
    print(f"Backend: {BACKEND_URL}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"=======================================================\n")

    # -------------------------------------------------------------
    # Check 1: Public Registration Privilege Escalation Probes
    # -------------------------------------------------------------
    probes = [
        "admin",
        "super_admin",
        "administrator",
        "superadmin",
        "college_admin",
        "system_admin",
        "root",
        " ADMIN ",
        "SuperAdmin",
        "admin ",
    ]
    all_probes_rejected = True
    rejected_reasons = []
    for role_probe in probes:
        email = f"probe_esc_{int(time.time())}_{secrets.token_hex(4)}@example.com"
        res = requests.post(
            f"{BACKEND_URL}/api/auth/register",
            json={
                "email": email,
                "password": "Password123!",
                "full_name": f"Probe {role_probe}",
                "role": role_probe,
                "dob": "1995-01-01"
            },
            timeout=5
        )
        if res.status_code != 403:
            all_probes_rejected = False
            rejected_reasons.append(f"Role '{role_probe}' returned {res.status_code}")
        else:
            rejected_reasons.append(f"Role '{role_probe}' -> 403")

    if all_probes_rejected:
        record("CHK-01", "Registration RBAC", "Reject all privileged roles and aliases in public registration",
               "HTTP 403 Forbidden for all probe variations", f"All {len(probes)} probes returned 403", "PASS",
               {"probes": probes})
    else:
        record("CHK-01", "Registration RBAC", "Reject all privileged roles and aliases in public registration",
               "HTTP 403 Forbidden for all probe variations", f"Bypass detected: {rejected_reasons}", "FAIL")

    # -------------------------------------------------------------
    # Check 2: Legitimate Registrations for All Supported Roles
    # -------------------------------------------------------------
    roles_to_test = [
        ("student", "2002-05-15"),
        ("alumni", "1998-03-20"),
        ("mentor", "1992-07-10"),
        ("college", "1990-01-01"),
    ]
    all_legit_ok = True
    legit_tokens = {}
    for role_name, dob in roles_to_test:
        email = f"legit_{role_name}_{int(time.time())}_{secrets.token_hex(4)}@example.com"
        res = requests.post(
            f"{BACKEND_URL}/api/auth/register",
            json={
                "email": email,
                "password": "Password123!",
                "full_name": f"Legit {role_name.title()} User",
                "role": role_name,
                "dob": dob
            },
            timeout=5
        )
        if res.status_code == 200:
            data = res.json()
            user_data = data.get("user", {})
            returned_role = user_data.get("role")
            token = data.get("access_token")
            legit_tokens[role_name] = {"token": token, "email": email}

            # Decode token claims
            claims = jwt.decode(token, options={"verify_signature": False})
            claim_role = claims.get("role")
            claim_jti = claims.get("jti")

            if returned_role != role_name or claim_role != role_name or not claim_jti:
                all_legit_ok = False
                break
        else:
            all_legit_ok = False
            break

    if all_legit_ok:
        record("CHK-02", "Registration Workflows", "Legitimate registration for student, alumni, mentor, college",
               "HTTP 200 with consistent DB role and JWT claim", "All 4 approved roles registered successfully", "PASS")
    else:
        record("CHK-02", "Registration Workflows", "Legitimate registration for student, alumni, mentor, college",
               "HTTP 200 with matching role", "Failure during registration of legitimate roles", "FAIL")

    # -------------------------------------------------------------
    # Check 3: Public Email Detection Sanitization (GET and POST)
    # -------------------------------------------------------------
    registered_email = legit_tokens.get("student", {}).get("email")
    get_res = requests.get(f"{BACKEND_URL}/api/auth/check-email?email={registered_email}", timeout=5)
    post_res = requests.post(f"{BACKEND_URL}/api/auth/check-email", json={"email": registered_email}, timeout=5)
    none_res = requests.post(f"{BACKEND_URL}/api/auth/check-email", json={"email": "nonexistent_verify_999@example.com"}, timeout=5)

    get_body = get_res.json() if get_res.status_code == 200 else {}
    post_body = post_res.json() if post_res.status_code == 200 else {}
    none_body = none_res.json() if none_res.status_code == 200 else {}

    leaks = [k for k in ["role", "full_name", "onboarding_completed", "user_id"] if k in get_body or k in post_body]

    if not leaks and get_body.get("exists") is True and post_body.get("exists") is True and none_body.get("exists") is False:
        record("CHK-03", "Email Detection", "Verify check-email GET/POST returns solely exists boolean without PII/roles",
               "HTTP 200, {'exists': bool}, zero PII or role keys", "Sanitized strictly to {'exists': bool}", "PASS")
    else:
        record("CHK-03", "Email Detection", "Verify check-email GET/POST returns solely exists boolean",
               "No PII leaks", f"Leaks detected: {leaks}, get: {get_body}, post: {post_body}", "FAIL")

    # -------------------------------------------------------------
    # Check 4: Access Token Revocation on Logout
    # -------------------------------------------------------------
    student_auth = legit_tokens.get("student", {})
    st_token = student_auth.get("token")

    # Verify token is valid initially
    pre_me = requests.get(f"{BACKEND_URL}/api/auth/me", headers={"Authorization": f"Bearer {st_token}"}, timeout=5)
    pre_status = pre_me.status_code

    # Logout
    logout_res = requests.post(f"{BACKEND_URL}/api/auth/logout", headers={"Authorization": f"Bearer {st_token}"}, timeout=5)

    # Verify token is now revoked
    post_me = requests.get(f"{BACKEND_URL}/api/auth/me", headers={"Authorization": f"Bearer {st_token}"}, timeout=5)
    post_status = post_me.status_code

    if pre_status == 200 and logout_res.status_code == 200 and post_status == 401:
        record("CHK-04", "Token Revocation", "Token revocation after POST /api/auth/logout",
               "Pre-logout HTTP 200, Logout HTTP 200, Post-logout HTTP 401",
               f"Pre: {pre_status}, Post: {post_status} (Revoked)", "PASS")
    else:
        record("CHK-04", "Token Revocation", "Token revocation after POST /api/auth/logout",
               "HTTP 401 after logout", f"Pre: {pre_status}, Logout: {logout_res.status_code}, Post: {post_status}", "FAIL")

    # -------------------------------------------------------------
    # Check 5: Refresh Token Rotation & Single-Use Rejection
    # -------------------------------------------------------------
    # Register disposable user for rotation check
    rot_email = f"rot_user_{int(time.time())}_{secrets.token_hex(4)}@example.com"
    r_reg = requests.post(f"{BACKEND_URL}/api/auth/register", json={
        "email": rot_email, "password": "Password123!", "full_name": "Rotation Test", "role": "student", "dob": "2000-01-01"
    }, timeout=5)
    rot_refresh_1 = r_reg.json().get("refresh_token")

    # Rotate 1: should succeed and issue rot_refresh_2
    r_rot_1 = requests.post(f"{BACKEND_URL}/api/auth/refresh", json={"refresh_token": rot_refresh_1}, timeout=5)
    rot_data_1 = r_rot_1.json() if r_rot_1.status_code == 200 else {}
    rot_refresh_2 = rot_data_1.get("refresh_token")
    rot_access_2 = rot_data_1.get("access_token")

    # Try reusing old refresh token rot_refresh_1 -> must be rejected with 401
    r_reuse = requests.post(f"{BACKEND_URL}/api/auth/refresh", json={"refresh_token": rot_refresh_1}, timeout=5)

    # Verify rot_access_2 works
    r_acc2_check = requests.get(f"{BACKEND_URL}/api/auth/me", headers={"Authorization": f"Bearer {rot_access_2}"}, timeout=5)

    if r_rot_1.status_code == 200 and r_reuse.status_code == 401 and r_acc2_check.status_code == 200:
        record("CHK-05", "Token Rotation", "Refresh token rotation and single-use invalidation",
               "Rotation succeeds (200), re-use of previous refresh token fails (401)",
               "Rotated successfully, re-use rejected with 401", "PASS")
    else:
        record("CHK-05", "Token Rotation", "Refresh token rotation and single-use invalidation",
               "Re-use rejected with 401", f"Rot1: {r_rot_1.status_code}, Reuse: {r_reuse.status_code}", "FAIL")

    # -------------------------------------------------------------
    # Check 6: Login Abuse Throttling (5 failed logins -> HTTP 429)
    # -------------------------------------------------------------
    throt_email = f"throttle_target_{int(time.time())}@example.com"
    hit_429 = False
    retry_after_hdr = None
    for attempt in range(6):
        r_fail = requests.post(f"{BACKEND_URL}/api/auth/login", json={"email": throt_email, "password": "WrongPassword!"}, timeout=5)
        if r_fail.status_code == 429:
            hit_429 = True
            retry_after_hdr = r_fail.headers.get("Retry-After")
            break

    # Test that a different email from the same IP is NOT throttled (avoid collateral lockout)
    diff_email = f"diff_user_{int(time.time())}@example.com"
    r_diff = requests.post(f"{BACKEND_URL}/api/auth/login", json={"email": diff_email, "password": "WrongPassword!"}, timeout=5)
    diff_is_401 = (r_diff.status_code == 401)

    if hit_429 and retry_after_hdr and diff_is_401:
        record("CHK-06", "Abuse Protection", "Login brute force throttling (5 failed attempts -> 429) with no collateral lockout",
               "HTTP 429 with Retry-After header; other accounts return 401 (not locked out)",
               f"429 triggered with Retry-After={retry_after_hdr}s; other account returns 401", "PASS")
    else:
        record("CHK-06", "Abuse Protection", "Login brute force throttling",
               "HTTP 429 with Retry-After", f"Hit 429: {hit_429}, Retry-After: {retry_after_hdr}, Diff 401: {diff_is_401}", "FAIL")

    # -------------------------------------------------------------
    # Check 7: Backend Authorization & Tenant Isolation
    # -------------------------------------------------------------
    alumni_token = legit_tokens.get("alumni", {}).get("token")
    college_token = legit_tokens.get("college", {}).get("token")

    # Student / Alumni token accessing college portal endpoint
    r_stu_col = requests.get(f"{BACKEND_URL}/api/college/students", headers={"Authorization": f"Bearer {alumni_token}"}, timeout=5)
    r_no_auth = requests.get(f"{BACKEND_URL}/api/college/students", timeout=5)
    r_fake_auth = requests.get(f"{BACKEND_URL}/api/college/students", headers={"Authorization": "Bearer fake.token.here"}, timeout=5)
    r_col_auth = requests.get(f"{BACKEND_URL}/api/college/students", headers={"Authorization": f"Bearer {college_token}"}, timeout=5)

    if r_stu_col.status_code == 403 and r_no_auth.status_code == 401 and r_fake_auth.status_code == 401 and r_col_auth.status_code in (200, 404):
        record("CHK-07", "Tenant RBAC", "Enforce server-side authorization on college portal APIs",
               "Non-college returns 403, unauthenticated returns 401, college user allowed",
               f"Non-college: {r_stu_col.status_code}, Unauth: {r_no_auth.status_code}, College: {r_col_auth.status_code}", "PASS")
    else:
        record("CHK-07", "Tenant RBAC", "Enforce server-side authorization on college portal APIs",
               "403 for non-college, 401 for unauth",
               f"Non-college: {r_stu_col.status_code}, Unauth: {r_no_auth.status_code}", "FAIL")

    # -------------------------------------------------------------
    # Check 8: Cookie Flags and Session Security Configuration
    # -------------------------------------------------------------
    login_probe_email = rot_email
    r_login = requests.post(f"{BACKEND_URL}/api/auth/login", json={"email": login_probe_email, "password": "Password123!"}, timeout=5)
    cookies_set = r_login.headers.get("Set-Cookie", "")
    has_httponly = "httponly" in cookies_set.lower()
    has_samesite = "samesite=lax" in cookies_set.lower()
    has_path = "path=/api/auth" in cookies_set.lower()

    if has_httponly and has_samesite and has_path:
        record("CHK-08", "Cookie Hardening", "Verify HttpOnly, SameSite=Lax, and Path scoping on refresh cookie",
               "Set-Cookie includes HttpOnly, SameSite=Lax, Path=/api/auth",
               "Cookie headers verified with required security attributes", "PASS", {"raw_cookie": cookies_set})
    else:
        record("CHK-08", "Cookie Hardening", "Verify HttpOnly and SameSite cookie attributes",
               "HttpOnly, SameSite, Path", f"Cookie header: {cookies_set}", "FAIL")

    # -------------------------------------------------------------
    # Check 9: Registration Rate Limiting Enforcement (>60/min -> HTTP 429)
    # -------------------------------------------------------------
    reg_test_ip = f"198.51.100.{secrets.randbelow(150) + 50}"
    s_reg = requests.Session()
    reg_hit_429 = False
    reg_retry_header = None
    for i in range(65):
        r_rate_probe = s_reg.post(
            f"{BACKEND_URL}/api/auth/register",
            json={
                "email": "test_student_audit@example.com",
                "password": "Password123!",
                "full_name": "Rate Probe",
                "role": "student",
                "dob": "2000-01-01"
            },
            headers={"X-Forwarded-For": reg_test_ip},
            timeout=5
        )
        if r_rate_probe.status_code == 429:
            reg_hit_429 = True
            reg_retry_header = r_rate_probe.headers.get("Retry-After")
            break

    if reg_hit_429 and reg_retry_header:
        record("CHK-09", "Registration Rate Limiting", "Enforce 60/min registration limit with HTTP 429 and Retry-After",
               "HTTP 429 triggered with Retry-After header",
               f"HTTP 429 triggered with Retry-After: {reg_retry_header}s", "PASS")
    else:
        record("CHK-09", "Registration Rate Limiting", "Enforce 60/min registration limit",
               "HTTP 429 with Retry-After", f"Hit 429: {reg_hit_429}, Retry: {reg_retry_header}", "FAIL")

    # -------------------------------------------------------------
    # Output Summary
    # -------------------------------------------------------------
    total = len(results)
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = total - passed

    print(f"\n=======================================================")
    print(f"Independent Verification Summary: {passed}/{total} PASSED")
    print(f"=======================================================\n")

    out_path = os.path.join(os.path.dirname(__file__), "..", "..", "docs", "evidence", "independent_verification_results.json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        json.dump({"total": total, "passed": passed, "failed": failed, "results": results}, f, indent=2)

    return (failed == 0)

if __name__ == "__main__":
    success = run_independent_checks()
    sys.exit(0 if success else 1)
