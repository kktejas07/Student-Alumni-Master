"""
Backend validation for the College 6-step Onboarding Wizard.

SCOPE: Only the new optional fields on CollegeInfo (ranking_tier,
accreditations, contact_name/designation/official_email/phone,
features_needed, logo, cover_photo, bio, writing_style).
"""
import os
import sys
import time
import uuid
import json
import requests

BASE = "https://hiring-mvvm.preview.emergentagent.com/api"

PASS = "TestPass@123"

PASSES = []
FAILS = []


def check(name, cond, detail=""):
    if cond:
        PASSES.append(name)
        print(f"  PASS  {name}")
    else:
        FAILS.append(f"{name} :: {detail}")
        print(f"  FAIL  {name} :: {detail}")


def register_college(email_suffix: str):
    email = f"college-test-{email_suffix}-{int(time.time()*1000)}@test.com"
    r = requests.post(
        f"{BASE}/auth/register",
        json={
            "email": email,
            "password": PASS,
            "full_name": "Test College Admin",
            "role": "college",
        },
        timeout=20,
    )
    if r.status_code != 200:
        print("REGISTER FAIL", r.status_code, r.text[:400])
        return None, None
    return email, r.json()["access_token"]


FULL_PAYLOAD = {
    "school_info": {
        "country": "India",
        "institution_type": "college",  # must be one of school/college/university (SchoolInfo allowed)
        "institution_name": "IIT Bombay",
    },
    "college_info": {
        "institution_name": "IIT Bombay",
        "institution_type": "institute",
        "affiliated_university": None,
        "official_website": "www.iitb.ac.in",
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India",
        "year_established": 1958,
        "ranking_tier": "top_50",
        "accreditations": ["NAAC A++", "NBA Accreditation", "NIRF Top 100", "QS Ranked"],
        "accreditation": "NAAC A++",
        "contact_name": "Prof Subhasis Chaudhuri",
        "contact_designation": "Director",
        "contact_official_email": "director@iitb.ac.in",
        "contact_phone": "+91 9876543210",
        "features_needed": [
            "student_placement", "alumni_network", "mentor_connections",
            "industry_tieups", "event_management", "job_portal",
        ],
        "logo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        "cover_photo": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/w//Z",
        "bio": "IIT Bombay is one of India's premier engineering institutions.",
        "writing_style": "Inspiring",
    },
    "career_path": "job",
    "interests": [],
    "skills": [],
    "bio": "IIT Bombay",
}


def headers(token):
    return {"Authorization": f"Bearer {token}"}


# -------------------------------------------------------------------
# SUB-CASE 1+2: register + full onboarding payload (exercise ALL new fields)
# -------------------------------------------------------------------
print("\n[1+2] Register college user + FULL onboarding payload")
email, token = register_college("full")
check("Register college user", token is not None)
if not token:
    print("Aborting — cannot register")
    sys.exit(1)

r = requests.post(
    f"{BASE}/users/onboarding",
    json=FULL_PAYLOAD,
    headers=headers(token),
    timeout=30,
)
check("POST /users/onboarding returns 200", r.status_code == 200,
      f"status={r.status_code} body={r.text[:500]}")

# -------------------------------------------------------------------
# SUB-CASE 3: GET /auth/me verify fields round-trip verbatim
# -------------------------------------------------------------------
print("\n[3] GET /auth/me returns all new college_info fields verbatim")
r = requests.get(f"{BASE}/auth/me", headers=headers(token), timeout=15)
check("GET /auth/me returns 200", r.status_code == 200, f"status={r.status_code}")
me = r.json() if r.status_code == 200 else {}
ci = (me.get("college_info") or {}) if me else {}

expected = FULL_PAYLOAD["college_info"]
for key in [
    "institution_name", "institution_type", "official_website", "city", "state",
    "country", "year_established", "ranking_tier", "contact_name",
    "contact_designation", "contact_official_email", "contact_phone",
    "bio", "writing_style", "accreditation",
]:
    check(f"college_info.{key} == {expected[key]!r}",
          ci.get(key) == expected[key],
          f"got={ci.get(key)!r}")

# Lists preserved
check("college_info.accreditations preserved as 4-item list",
      ci.get("accreditations") == expected["accreditations"],
      f"got={ci.get('accreditations')}")
check("college_info.features_needed preserved as 6-item list",
      ci.get("features_needed") == expected["features_needed"],
      f"got={ci.get('features_needed')}")

# base64 data retained verbatim
check("college_info.logo retained (starts with data:image/png;base64)",
      (ci.get("logo") or "").startswith("data:image/png;base64"),
      f"got[:40]={(ci.get('logo') or '')[:40]}")
check("college_info.cover_photo retained (starts with data:image/jpeg;base64)",
      (ci.get("cover_photo") or "").startswith("data:image/jpeg;base64"),
      f"got[:40]={(ci.get('cover_photo') or '')[:40]}")

# Onboarding flag
check("me.onboarding_completed == True", me.get("onboarding_completed") is True)
check("me.role == 'college'", me.get("role") == "college")

# -------------------------------------------------------------------
# SUB-CASE 4: Each valid ranking_tier in a separate user
# -------------------------------------------------------------------
print("\n[4] All 4 ranking_tier slugs accepted")
for tier in ["top_50", "top_51_200", "top_201_500", "not_ranked"]:
    e, t = register_college(f"tier-{tier}")
    if not t:
        check(f"ranking_tier={tier}", False, "register failed")
        continue
    payload = {
        "school_info": {"country": "India", "institution_type": "college",
                        "institution_name": "Test Inst"},
        "college_info": {"institution_name": "Test Inst", "ranking_tier": tier},
    }
    r = requests.post(f"{BASE}/users/onboarding", json=payload,
                      headers=headers(t), timeout=20)
    check(f"onboarding ranking_tier={tier} → 200", r.status_code == 200,
          f"status={r.status_code} body={r.text[:200]}")
    if r.status_code == 200:
        ci2 = (r.json().get("college_info") or {})
        check(f"ranking_tier={tier} echoed back", ci2.get("ranking_tier") == tier,
              f"got={ci2.get('ranking_tier')}")

# -------------------------------------------------------------------
# SUB-CASE 5: Each features_needed slug in a separate user
# -------------------------------------------------------------------
print("\n[5] All 6 features_needed slugs accepted as single-item lists")
for feat in ["student_placement", "alumni_network", "mentor_connections",
             "industry_tieups", "event_management", "job_portal"]:
    e, t = register_college(f"feat-{feat}")
    if not t:
        check(f"features_needed={feat}", False, "register failed")
        continue
    payload = {
        "school_info": {"country": "India", "institution_type": "college",
                        "institution_name": "Test Inst"},
        "college_info": {"institution_name": "Test Inst", "features_needed": [feat]},
    }
    r = requests.post(f"{BASE}/users/onboarding", json=payload,
                      headers=headers(t), timeout=20)
    check(f"onboarding features_needed=[{feat}] → 200", r.status_code == 200,
          f"status={r.status_code} body={r.text[:200]}")
    if r.status_code == 200:
        ci2 = (r.json().get("college_info") or {})
        check(f"features_needed=[{feat}] echoed back",
              ci2.get("features_needed") == [feat],
              f"got={ci2.get('features_needed')}")

# -------------------------------------------------------------------
# SUB-CASE 6: Backwards compat — log in as legacy college user
# NOTE: review asked for college01@test.com but that does NOT exist in DB.
# Using iitb@university.in from /app/memory/test_credentials.md instead.
# -------------------------------------------------------------------
print("\n[6] Backwards compat — legacy college user login + /auth/me")
legacy_email = "iitb@university.in"
r = requests.post(f"{BASE}/auth/login",
                  json={"email": legacy_email, "password": PASS}, timeout=15)
check(f"Login legacy college {legacy_email} → 200", r.status_code == 200,
      f"status={r.status_code} body={r.text[:200]}")
if r.status_code == 200:
    data = r.json()
    legacy_token = data.get("access_token")
    check("Legacy login returned access_token", bool(legacy_token))
    r2 = requests.get(f"{BASE}/auth/me", headers=headers(legacy_token), timeout=15)
    check("Legacy /auth/me → 200 (no new fields; must load cleanly)",
          r2.status_code == 200, f"status={r2.status_code} body={r2.text[:300]}")
    if r2.status_code == 200:
        legacy_me = r2.json()
        check("Legacy user role == 'college'", legacy_me.get("role") == "college")
        # college_info may be None (legacy schema). Should not crash.
        print(f"    legacy college_info present = {legacy_me.get('college_info') is not None}")

# -------------------------------------------------------------------
# SUB-CASE 7: Edge cases
# -------------------------------------------------------------------
print("\n[7a] Minimal college_info (only institution_name) → 200")
e, t = register_college("minimal")
if t:
    payload = {
        "school_info": {"country": "India", "institution_type": "college",
                        "institution_name": "Minimal Inst"},
        "college_info": {"institution_name": "Minimal Inst"},
    }
    r = requests.post(f"{BASE}/users/onboarding", json=payload,
                      headers=headers(t), timeout=20)
    check("Minimal college_info → 200", r.status_code == 200,
          f"status={r.status_code} body={r.text[:300]}")

print("\n[7b] Empty arrays (accreditations=[], features_needed=[]) → 200")
e, t = register_college("emptyarr")
if t:
    payload = {
        "school_info": {"country": "India", "institution_type": "college",
                        "institution_name": "EmptyArr Inst"},
        "college_info": {
            "institution_name": "EmptyArr Inst",
            "accreditations": [],
            "features_needed": [],
        },
    }
    r = requests.post(f"{BASE}/users/onboarding", json=payload,
                      headers=headers(t), timeout=20)
    check("Empty arrays → 200", r.status_code == 200,
          f"status={r.status_code} body={r.text[:300]}")
    if r.status_code == 200:
        ci2 = r.json().get("college_info") or {}
        check("empty accreditations preserved as []",
              ci2.get("accreditations") == [], f"got={ci2.get('accreditations')}")
        check("empty features_needed preserved as []",
              ci2.get("features_needed") == [], f"got={ci2.get('features_needed')}")

# -------------------------------------------------------------------
# Summary
# -------------------------------------------------------------------
print("\n" + "=" * 70)
print(f"RESULTS: {len(PASSES)} PASS / {len(FAILS)} FAIL")
if FAILS:
    print("\nFAILURES:")
    for f in FAILS:
        print(" -", f)
    sys.exit(1)
print("All College Onboarding backend assertions PASSED.")
sys.exit(0)
