"""
Backend Test — Alumni 6-step Onboarding Wizard
Validates new optional fields on AlumniInfo model.
"""
import time
import requests
import json

BASE = "https://hiring-mvvm.preview.emergentagent.com/api"

results = []
def check(name, cond, detail=""):
    status = "PASS" if cond else "FAIL"
    results.append((status, name, detail))
    print(f"[{status}] {name}{' — ' + detail if detail else ''}")
    return cond


def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def register_alumni(suffix=""):
    ts = int(time.time() * 1000)
    email = f"alumni-test-{ts}{suffix}@test.com"
    payload = {
        "email": email,
        "password": "TestPass@123",
        "full_name": "Aarav Test Alumni",
        "role": "alumni",
    }
    r = requests.post(f"{BASE}/auth/register", json=payload, timeout=30)
    if r.status_code != 200:
        print("register failed", r.status_code, r.text)
        return None, None
    body = r.json()
    return email, body["access_token"]


# -------------------- TEST 1+2 --------------------
print("\n=== TEST 1+2: Register + onboarding with full alumni payload ===")
email, token = register_alumni()
check("register alumni → 200 + token", bool(token))

full_payload = {
    "school_info": {
        "country": "India",
        "institution_type": "college",
        "institution_name": "IIT Bombay",
        "graduation_year": 2018,
    },
    "alumni_info": {
        "graduation_year": 2018,
        "university": "IIT Bombay",
        "current_employer": "Flipkart",
        "current_role": "Senior PM",
        "employment_status": "employed",
        "years_of_experience": 6,
        "domain_expertise": ["Software Engineering", "Product", "Finance"],
        "tech_skills": ["Python", "React", "SQL", "ML / AI"],
        "business_skills": ["Excel / Sheets", "Financial Modelling"],
        "soft_skills": ["Communication", "Leadership", "Problem Solving"],
        "next_chapter": "become_mentor",
        "profile_photo": "data:image/jpeg;base64,/9j/4AAQ...",
        "bio": "Senior PM at Flipkart with 6 years in product. IIT Bombay alum.",
        "writing_style": "Inspiring",
        "wants_to_mentor": True,
    },
    "career_path": "job",
    "interests": ["Software Engineering"],
    "skills": ["Python", "React"],
    "bio": "Senior PM at Flipkart",
}
r = requests.post(f"{BASE}/users/onboarding", json=full_payload, headers=headers(token), timeout=30)
check("POST /users/onboarding (full alumni) → 200", r.status_code == 200,
      f"status={r.status_code} body={r.text[:300]}")

# -------------------- TEST 3: GET /auth/me preservation --------------------
print("\n=== TEST 3: GET /auth/me preserves all new fields ===")
r = requests.get(f"{BASE}/auth/me", headers=headers(token), timeout=30)
check("GET /auth/me → 200", r.status_code == 200, f"status={r.status_code}")
me = r.json() if r.status_code == 200 else {}
ai = (me or {}).get("alumni_info") or {}

check("alumni_info exists", bool(ai))
check("years_of_experience == 6", ai.get("years_of_experience") == 6, f"got={ai.get('years_of_experience')}")
check("domain_expertise list preserved",
      ai.get("domain_expertise") == ["Software Engineering", "Product", "Finance"],
      f"got={ai.get('domain_expertise')}")
check("tech_skills list preserved",
      ai.get("tech_skills") == ["Python", "React", "SQL", "ML / AI"],
      f"got={ai.get('tech_skills')}")
check("business_skills list preserved",
      ai.get("business_skills") == ["Excel / Sheets", "Financial Modelling"],
      f"got={ai.get('business_skills')}")
check("soft_skills list preserved",
      ai.get("soft_skills") == ["Communication", "Leadership", "Problem Solving"],
      f"got={ai.get('soft_skills')}")
check("next_chapter == become_mentor", ai.get("next_chapter") == "become_mentor",
      f"got={ai.get('next_chapter')}")
check("profile_photo preserved",
      ai.get("profile_photo") == "data:image/jpeg;base64,/9j/4AAQ...",
      f"got={(ai.get('profile_photo') or '')[:60]}")
check("bio preserved", "Senior PM at Flipkart" in (ai.get("bio") or ""),
      f"got={ai.get('bio')}")
check("writing_style == Inspiring", ai.get("writing_style") == "Inspiring",
      f"got={ai.get('writing_style')}")
check("wants_to_mentor true", ai.get("wants_to_mentor") is True,
      f"got={ai.get('wants_to_mentor')}")
check("graduation_year == 2018", ai.get("graduation_year") == 2018)
check("current_employer == Flipkart", ai.get("current_employer") == "Flipkart")
check("current_role == Senior PM", ai.get("current_role") == "Senior PM")
check("employment_status == employed", ai.get("employment_status") == "employed")
check("university == IIT Bombay", ai.get("university") == "IIT Bombay")

# -------------------- TEST 4: All 6 next_chapter slugs --------------------
print("\n=== TEST 4: 6 next_chapter slugs accepted ===")
slugs = ["become_mentor", "level_up_career", "build_startup",
         "higher_education", "explore_options", "give_back"]
for i, slug in enumerate(slugs):
    em, tk = register_alumni(suffix=f"-nc{i}")
    if not tk:
        check(f"register for slug {slug}", False)
        continue
    p = {
        "school_info": {"country": "India", "institution_type": "college",
                        "institution_name": "VIT Vellore", "graduation_year": 2020},
        "alumni_info": {
            "graduation_year": 2020,
            "university": "VIT Vellore",
            "next_chapter": slug,
        },
        "career_path": "job",
        "interests": [],
        "skills": [],
    }
    r = requests.post(f"{BASE}/users/onboarding", json=p, headers=headers(tk), timeout=30)
    ok_post = r.status_code == 200
    me = requests.get(f"{BASE}/auth/me", headers=headers(tk), timeout=30).json() if ok_post else {}
    nc = ((me or {}).get("alumni_info") or {}).get("next_chapter")
    check(f"slug '{slug}' → 200 + echoed back",
          ok_post and nc == slug,
          f"post_status={r.status_code} echo={nc}")

# -------------------- TEST 5: Backwards compat with seeded alumni01 --------------------
print("\n=== TEST 5: Backwards compat — alumni01@test.com legacy schema ===")
r = requests.post(f"{BASE}/auth/login",
                  json={"email": "alumni01@test.com", "password": "TestPass@123"},
                  timeout=30)
check("alumni01 login → 200", r.status_code == 200, f"status={r.status_code} body={r.text[:200]}")
if r.status_code == 200:
    body = r.json()
    if body.get("requires_2fa"):
        check("alumni01 has no 2FA (regression)", False, "got 2FA challenge")
    else:
        tok = body.get("access_token")
        r2 = requests.get(f"{BASE}/auth/me", headers=headers(tok), timeout=30)
        check("alumni01 GET /auth/me → 200 (legacy schema loads cleanly)",
              r2.status_code == 200,
              f"status={r2.status_code} body={r2.text[:200]}")
        if r2.status_code == 200:
            u = r2.json()
            check("alumni01 role == alumni", u.get("role") == "alumni")
            # Just verify alumni_info loads (may be None or have legacy shape)
            check("alumni01 response has no Pydantic error", "alumni_info" in u)

# -------------------- TEST 6a: Edge - no new fields --------------------
print("\n=== TEST 6a: Edge — no new fields, only legacy required ===")
em, tk = register_alumni(suffix="-legacy")
p = {
    "school_info": {"country": "India", "institution_type": "college",
                    "institution_name": "IIT Madras", "graduation_year": 2015},
    "alumni_info": {
        "graduation_year": 2015,
        "university": "IIT Madras",
    },
    "career_path": "job",
    "interests": [],
    "skills": [],
}
r = requests.post(f"{BASE}/users/onboarding", json=p, headers=headers(tk), timeout=30)
check("legacy minimal alumni_info → 200", r.status_code == 200,
      f"status={r.status_code} body={r.text[:200]}")

# -------------------- TEST 6b: Edge - empty arrays --------------------
print("\n=== TEST 6b: Edge — empty arrays ===")
em, tk = register_alumni(suffix="-empty")
p = {
    "school_info": {"country": "India", "institution_type": "college",
                    "institution_name": "BITS Pilani", "graduation_year": 2019},
    "alumni_info": {
        "graduation_year": 2019,
        "university": "BITS Pilani",
        "domain_expertise": [],
        "tech_skills": [],
        "business_skills": [],
        "soft_skills": [],
    },
    "career_path": "job",
    "interests": [],
    "skills": [],
}
r = requests.post(f"{BASE}/users/onboarding", json=p, headers=headers(tk), timeout=30)
check("empty-arrays alumni_info → 200", r.status_code == 200,
      f"status={r.status_code} body={r.text[:200]}")
if r.status_code == 200:
    me = requests.get(f"{BASE}/auth/me", headers=headers(tk), timeout=30).json()
    ai = (me or {}).get("alumni_info") or {}
    check("empty arrays preserved as []",
          ai.get("domain_expertise") == [] and ai.get("tech_skills") == []
          and ai.get("business_skills") == [] and ai.get("soft_skills") == [],
          f"de={ai.get('domain_expertise')} ts={ai.get('tech_skills')}")

# -------------------- SUMMARY --------------------
print("\n" + "=" * 70)
passed = sum(1 for s, _, _ in results if s == "PASS")
failed = sum(1 for s, _, _ in results if s == "FAIL")
print(f"TOTAL: {passed} PASS, {failed} FAIL out of {len(results)}")
if failed:
    print("\n--- FAILURES ---")
    for s, name, detail in results:
        if s == "FAIL":
            print(f"  FAIL: {name} — {detail}")
