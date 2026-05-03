#!/usr/bin/env python3
"""
Mentor Onboarding Backend Test — validates new MentorInfo fields + new
MentorCategory enum values added for the 8-step mentor onboarding wizard.

Tests:
 1. Register fresh mentor → access_token
 2. POST /api/users/onboarding with full mentor payload (all new fields)
 3. GET /api/auth/me — verify mentor_info preserved
 4. Each new enum slug accepted individually
 5. Backwards compat: mentor01@test.com still loads cleanly
 6. Regression: /api/mentors/suggestions, /api/dashboard
 7. categories=[] empty list still 200
 8. category="invalid_slug" → 422
"""
import os
import sys
import json
import time
import uuid
import requests

BASE = os.environ.get("BASE_URL", "https://hiring-mvvm.preview.emergentagent.com").rstrip("/") + "/api"

# small base64 (1x1 jpeg)
TINY_JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKpAAA="

PASSED = []
FAILED = []

def log_pass(msg):
    print(f"  ✅ {msg}")
    PASSED.append(msg)

def log_fail(msg, *extras):
    print(f"  ❌ {msg}")
    for e in extras:
        print(f"     {e}")
    FAILED.append((msg, extras))

def post(path, json_body=None, token=None, expected=200):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = requests.post(BASE + path, json=json_body, headers=headers, timeout=30)
    return r

def get(path, token=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = requests.get(BASE + path, headers=headers, timeout=30)
    return r


def register_mentor(email_suffix=""):
    """Return (token, email)"""
    ts = int(time.time() * 1000)
    email = f"mentor.test.{ts}{email_suffix}@test.com"
    body = {
        "email": email,
        "password": "TestPass@123",
        "full_name": "Test Mentor",
        "role": "mentor",
    }
    r = post("/auth/register", body)
    if r.status_code != 200:
        return None, email, r
    token = r.json()["access_token"]
    return token, email, r


# -------------------- TEST 1 + 2 + 3 --------------------
def test_full_payload():
    print("\n▶ TEST 1+2+3: Register mentor + onboard with full new fields + GET /auth/me")
    token, email, r = register_mentor()
    if not token:
        log_fail(f"register_mentor failed status={r.status_code}", r.text[:300])
        return None
    log_pass(f"Register mentor → 200 ({email})")

    payload = {
        "school_info": {
            "country": "India",
            "institution_type": "college",
            "institution_name": "IIT Bombay",
            "graduation_year": 2018,
        },
        "mentor_info": {
            "category": "interview_prep",
            "categories": [
                "interview_prep", "it_software", "creative_design", "life_wellness",
                "career_coach", "startup_advisor", "higher_education",
                "engineering_manager", "industry_advisor", "business_mentor",
            ],
            "organization": "Google",
            "job_title": "SDE-2",
            "years_of_experience": 5,
            "session_price_inr": 999,
            "education_level": "btech",
            "expertise": ["System Design", "Career Guidance", "Negotiation"],
            "availability": ["mon_18_19", "sat_10_12", "sun_10_12"],
            "profile_photo": TINY_JPEG,
            "college": "IIT Bombay",
            "college_batch": 2018,
            "bio": "5+ yrs distributed systems",
        },
        "career_path": "job",
        "interests": [],
        "skills": ["System Design"],
        "bio": "Mentor bio",
        "phone": "+919999999999",
    }
    r = post("/users/onboarding", payload, token=token)
    if r.status_code != 200:
        log_fail(f"POST /users/onboarding → {r.status_code} (expected 200)", r.text[:600])
        return token
    log_pass("POST /users/onboarding with full mentor payload → 200")

    # Now GET /auth/me
    r = get("/auth/me", token=token)
    if r.status_code != 200:
        log_fail(f"GET /auth/me → {r.status_code}", r.text[:300])
        return token
    user = r.json()
    mi = user.get("mentor_info") or {}

    # Verify each field
    checks = [
        ("category=='interview_prep'", mi.get("category") == "interview_prep"),
        ("categories list len==10", isinstance(mi.get("categories"), list) and len(mi["categories"]) == 10),
        ("expertise len==3", isinstance(mi.get("expertise"), list) and len(mi["expertise"]) == 3),
        ("availability len==3", isinstance(mi.get("availability"), list) and len(mi["availability"]) == 3),
        ("education_level=='btech'", mi.get("education_level") == "btech"),
        ("college=='IIT Bombay'", mi.get("college") == "IIT Bombay"),
        ("college_batch==2018", mi.get("college_batch") == 2018),
        ("session_price_inr==999", mi.get("session_price_inr") == 999),
        ("organization=='Google'", mi.get("organization") == "Google"),
        ("job_title=='SDE-2'", mi.get("job_title") == "SDE-2"),
        ("years_of_experience==5", mi.get("years_of_experience") == 5),
        ("bio preserved", mi.get("bio") == "5+ yrs distributed systems"),
        # profile_photo: spec says "retained or stripped per existing behavior"
        # we only check the field name exists in the model (might be None or value)
    ]
    for name, ok in checks:
        if ok:
            log_pass(f"GET /auth/me mentor_info.{name}")
        else:
            log_fail(f"GET /auth/me mentor_info.{name}", f"actual mentor_info={json.dumps(mi)[:500]}")

    # profile_photo: log either retention or strip
    pp = mi.get("profile_photo")
    if pp == TINY_JPEG:
        log_pass("profile_photo retained verbatim")
    elif pp is None:
        log_pass("profile_photo absent/None (acceptable per spec)")
    else:
        log_pass(f"profile_photo present (length={len(pp) if isinstance(pp, str) else 'n/a'})")

    return token


# -------------------- TEST 4 --------------------
def test_individual_new_slugs():
    print("\n▶ TEST 4: Each new MentorCategory slug accepted individually")
    for slug in ("interview_prep", "creative_design", "life_wellness"):
        token, email, r = register_mentor(email_suffix=f"_{slug}")
        if not token:
            log_fail(f"register failed for slug={slug}", r.text[:200])
            continue
        body = {
            "school_info": {"country": "India", "institution_type": "college",
                            "institution_name": "Test College", "graduation_year": 2020},
            "mentor_info": {
                "category": slug,
                "organization": "Acme",
                "job_title": "Senior Engineer",
            },
            "career_path": "job",
            "interests": [],
            "skills": [],
        }
        r2 = post("/users/onboarding", body, token=token)
        if r2.status_code == 200 and (r2.json().get("mentor_info") or {}).get("category") == slug:
            log_pass(f"category='{slug}' accepted; mentor_info.category preserved")
        else:
            log_fail(f"category='{slug}' rejected (status={r2.status_code})", r2.text[:300])


# -------------------- TEST 5 --------------------
def test_backwards_compat():
    print("\n▶ TEST 5: Backwards compatibility — mentor01@test.com login + /auth/me")
    r = post("/auth/login", {"email": "mentor01@test.com", "password": "TestPass@123"})
    if r.status_code != 200:
        log_fail(f"mentor01 login → {r.status_code}", r.text[:300])
        return None
    body = r.json()
    if body.get("requires_2fa"):
        log_fail("mentor01 has 2FA enabled — cannot proceed without TOTP", str(body))
        return None
    token = body.get("access_token")
    log_pass("mentor01@test.com login → 200")

    r = get("/auth/me", token=token)
    if r.status_code != 200:
        log_fail(f"mentor01 /auth/me → {r.status_code}", r.text[:400])
        return token
    user = r.json()
    log_pass(f"mentor01 /auth/me → 200 (role={user.get('role')}, email={user.get('email')})")

    mi = user.get("mentor_info") or {}
    # Old single-category schema should still load (don't crash on missing new fields)
    if "category" in mi or mi == {}:
        log_pass(f"Old mentor still loads cleanly; category={mi.get('category')!r} (new fields may be None)")
    else:
        log_fail("mentor_info malformed", json.dumps(mi)[:400])
    return token


# -------------------- TEST 6 --------------------
def test_regression(mentor01_token):
    print("\n▶ TEST 6: Regression — /api/mentors/suggestions + /api/dashboard")
    r = get("/mentors/suggestions")
    if r.status_code == 200 and "organizations" in r.json() and "job_titles" in r.json():
        log_pass(f"GET /mentors/suggestions → 200 (orgs={len(r.json()['organizations'])}, titles={len(r.json()['job_titles'])})")
    else:
        log_fail(f"GET /mentors/suggestions → {r.status_code}", r.text[:300])

    if mentor01_token:
        r = get("/dashboard", token=mentor01_token)
        if r.status_code == 200:
            log_pass("GET /dashboard (mentor01 bearer) → 200")
        else:
            log_fail(f"GET /dashboard (mentor01) → {r.status_code}", r.text[:400])


# -------------------- TEST 7 --------------------
def test_empty_categories():
    print("\n▶ TEST 7: Edge case — categories=[] empty list")
    token, email, r = register_mentor(email_suffix="_empty")
    if not token:
        log_fail("register failed", r.text[:300])
        return
    body = {
        "school_info": {"country": "India", "institution_type": "college",
                        "institution_name": "Test College", "graduation_year": 2020},
        "mentor_info": {
            "category": "it_software",
            "categories": [],
            "organization": "Acme",
            "job_title": "Engineer",
        },
        "career_path": "job",
        "interests": [],
        "skills": [],
    }
    r2 = post("/users/onboarding", body, token=token)
    if r2.status_code == 200:
        log_pass("categories=[] empty list accepted (200)")
    else:
        log_fail(f"categories=[] returned {r2.status_code}", r2.text[:300])


# -------------------- TEST 8 --------------------
def test_invalid_slug():
    print("\n▶ TEST 8: Edge case — category='invalid_slug' should 422")
    token, email, r = register_mentor(email_suffix="_invalid")
    if not token:
        log_fail("register failed", r.text[:300])
        return
    body = {
        "school_info": {"country": "India", "institution_type": "college",
                        "institution_name": "Test College", "graduation_year": 2020},
        "mentor_info": {
            "category": "invalid_slug",
            "organization": "Acme",
            "job_title": "Engineer",
        },
        "career_path": "job",
        "interests": [],
        "skills": [],
    }
    r2 = post("/users/onboarding", body, token=token)
    if r2.status_code == 422:
        log_pass("category='invalid_slug' → 422 Unprocessable Entity")
    elif r2.status_code in (400,):
        log_pass(f"category='invalid_slug' → {r2.status_code} (acceptable: rejected)")
    else:
        log_fail(f"category='invalid_slug' returned {r2.status_code} (expected 422)", r2.text[:400])


def main():
    print(f"=== Mentor Onboarding Backend Tests ===\nBASE = {BASE}\n")
    test_full_payload()
    test_individual_new_slugs()
    mentor01_token = test_backwards_compat()
    test_regression(mentor01_token)
    test_empty_categories()
    test_invalid_slug()

    print("\n" + "=" * 60)
    print(f"PASSED: {len(PASSED)}")
    print(f"FAILED: {len(FAILED)}")
    if FAILED:
        print("\n--- FAILURES ---")
        for msg, extras in FAILED:
            print(f"  ✗ {msg}")
            for e in extras:
                print(f"      {e}")
    return 0 if not FAILED else 1


if __name__ == "__main__":
    sys.exit(main())
