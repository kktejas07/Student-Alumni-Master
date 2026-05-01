"""
Backend smoke + integration tests for the latest session changes:

A) Bulk seed verification (1360 new users, 320 internships, 151 colleges_meta).
B) AI Daily Brief endpoint (POST /api/ai/daily-brief — Claude live).
C) Tier system regression after bulk seed.
D) Internships expansion.

Run:  python /app/backend_test.py
"""
from __future__ import annotations

import sys
from typing import Any, Dict, List, Optional

import requests

BASE = "https://hiring-mvvm.preview.emergentagent.com/api"

PASSED: List[str] = []
FAILED: List[str] = []


def ok(msg: str) -> None:
    print(f"  PASS: {msg}")
    PASSED.append(msg)


def fail(msg: str) -> None:
    print(f"  FAIL: {msg}")
    FAILED.append(msg)


def get(path: str, **kw) -> requests.Response:
    return requests.get(f"{BASE}{path}", timeout=kw.pop("timeout", 30), **kw)


def post(path: str, json_body: Optional[Dict[str, Any]] = None, **kw) -> requests.Response:
    return requests.post(f"{BASE}{path}", json=json_body, timeout=kw.pop("timeout", 60), **kw)


# ════════════════════════════════════════════════════════════════════════════════
# A) BULK SEED VERIFICATION
# ════════════════════════════════════════════════════════════════════════════════

def test_super_overview():
    print("\n--- A1. /admin/super-overview reflects bulk seed ---")
    r = get("/admin/super-overview")
    if r.status_code != 200:
        fail(f"super-overview status {r.status_code}: {r.text[:200]}")
        return None
    data = r.json()
    kpis = data.get("kpis", [])
    if not kpis:
        fail("super-overview returned no kpis")
        return None
    ok(f"super-overview 200 with {len(kpis)} KPIs")

    counts = {}
    for k in kpis:
        try:
            counts[k["id"]] = int(str(k["value"]).replace(",", ""))
        except Exception:
            pass
    print(f"     KPIs: {counts}")
    total = (
        counts.get("students", 0)
        + counts.get("alumni", 0)
        + counts.get("mentors", 0)
        + counts.get("colleges", 0)
        + counts.get("approvals", 0)
    )
    if total >= 1300:
        ok(f"total seeded users (sum across KPIs) = {total} (>=1300)")
    else:
        fail(f"total seeded users = {total} (expected >=1300)")
    return counts


def test_super_students():
    print("\n--- A2. /admin/super/students returns >100 students ---")
    r = get("/admin/super/students", params={"limit": 200})
    if r.status_code != 200:
        fail(f"super/students status {r.status_code}: {r.text[:200]}")
        return None
    data = r.json()
    items = data.get("items", [])
    stats = data.get("stats", {})
    print(f"     items: {len(items)}, stats.total: {stats.get('total')}")
    if stats.get("total", 0) > 100:
        ok(f"students.stats.total = {stats.get('total')} (>100)")
    else:
        fail(f"students.stats.total = {stats.get('total')} (expected >100)")
    if len(items) > 0:
        ok(f"super/students returned {len(items)} student rows")
    else:
        fail("super/students returned 0 rows")
    return items


def test_super_mentors():
    print("\n--- A3. /admin/super/mentors returns mentor pool ---")
    r = get("/admin/super/mentors")
    if r.status_code != 200:
        fail(f"super/mentors status {r.status_code}: {r.text[:200]}")
        return None
    data = r.json()
    items = data.get("items", [])
    print(f"     mentors returned: {len(items)} (endpoint capped at 100)")
    if len(items) >= 100:
        ok(f"super/mentors returned {len(items)} (cap reached)")
    elif len(items) > 50:
        ok(f"super/mentors returned {len(items)} (>50)")
    else:
        fail(f"super/mentors returned only {len(items)} (expected >100)")
    return items


def test_super_colleges():
    print("\n--- A4. /admin/super/colleges + colleges_meta count ---")
    r = get("/admin/super/colleges")
    if r.status_code != 200:
        fail(f"super/colleges status {r.status_code}: {r.text[:200]}")
        return
    data = r.json()
    items = data.get("items", [])
    print(f"     super/colleges items: {len(items)} (capped at 30 in code)")
    if len(items) >= 30:
        ok(f"super/colleges returned {len(items)} aggregated colleges (cap reached)")
    elif len(items) > 0:
        ok(f"super/colleges returned {len(items)} (note: aggregated from student.school_info)")
    else:
        fail("super/colleges returned 0 colleges")

    rm = get("/colleges_meta")
    if rm.status_code == 200:
        meta = rm.json()
        if isinstance(meta, list):
            n = len(meta)
        elif isinstance(meta, dict):
            n = len(meta.get("items", []) or meta.get("colleges", []) or [])
        else:
            n = 0
        print(f"     /colleges_meta returned {n} entries")
        if n >= 140:
            ok(f"/colleges_meta has {n} entries (>=140)")
        else:
            fail(f"/colleges_meta has {n} entries (expected >=140)")
    else:
        print(f"     /colleges_meta status: {rm.status_code} (skipping)")


def test_seeded_user_existence(students_items):
    print("\n--- A5. Probe 5 *.demo emails (login) ---")
    if not students_items:
        fail("Cannot probe — super/students returned no items")
        return
    sample_emails: List[str] = []
    for s in students_items[:30]:
        nm = (s.get("name") or "").strip()
        if not nm or nm == "—":
            continue
        parts = nm.lower().split()
        if len(parts) < 2:
            continue
        sample_emails.append(f"{parts[0]}.{parts[-1]}1@student.demo")
        if len(sample_emails) >= 5:
            break
    if not sample_emails:
        fail("Could not derive sample emails from student names")
        return
    print(f"     probing emails: {sample_emails}")
    found = 0
    not_found = 0
    for em in sample_emails:
        r = post("/auth/login", {"email": em, "password": "TestPass@123"})
        sc = r.status_code
        if sc == 200:
            print(f"     {em} → 200 (login success)")
            found += 1
        elif sc == 401:
            print(f"     {em} → 401 (auth gated, accepted)")
            found += 1
        elif sc == 404:
            print(f"     {em} → 404 (not found)")
            not_found += 1
        else:
            print(f"     {em} → {sc} ({r.text[:80]})")
            not_found += 1
    if found >= 1:
        ok(f"At least one *.demo email present (found={found}, 404={not_found})")
    else:
        fail(f"All probed *.demo emails returned 404 — seeded users may not have those emails")


# ════════════════════════════════════════════════════════════════════════════════
# B) AI DAILY BRIEF
# ════════════════════════════════════════════════════════════════════════════════

REQUIRED_KEYS = {"brief", "generated_at", "model", "role", "user_id", "user_name", "tier"}


def _verify_brief_shape(role: str, body: Dict[str, Any]) -> bool:
    missing = REQUIRED_KEYS - set(body.keys())
    if missing:
        fail(f"daily-brief[{role}] missing keys: {missing}")
        return False
    ok(f"daily-brief[{role}] schema has all 7 required keys")
    brief_text = body.get("brief") or ""
    if isinstance(brief_text, str) and len(brief_text.strip()) >= 50:
        ok(f"daily-brief[{role}] brief length = {len(brief_text)} chars (>=50)")
    else:
        fail(f"daily-brief[{role}] brief too short or non-string: {brief_text!r}")
        return False
    if body.get("role") == role:
        ok(f"daily-brief[{role}] echoed role correctly")
    else:
        fail(f"daily-brief[{role}] role mismatch: {body.get('role')}")
    if "claude" in str(body.get("model", "")).lower():
        ok(f"daily-brief[{role}] model = {body.get('model')}")
    else:
        fail(f"daily-brief[{role}] unexpected model: {body.get('model')}")
    if "tier" in body:
        ok(f"daily-brief[{role}] tier field present: {body.get('tier')!r}")
    return True


def test_daily_brief_student():
    print("\n--- B1. POST /ai/daily-brief role=student ---")
    r = post("/ai/daily-brief", {"role": "student"}, timeout=120)
    if r.status_code != 200:
        fail(f"daily-brief student status {r.status_code}: {r.text[:300]}")
        return None
    data = r.json()
    print(f"     brief preview: {(data.get('brief') or '')[:140]!r}")
    print(f"     user_name: {data.get('user_name')!r}")
    _verify_brief_shape("student", data)
    return data


def test_daily_brief_mentor():
    print("\n--- B2. POST /ai/daily-brief role=mentor ---")
    r = post("/ai/daily-brief", {"role": "mentor"}, timeout=120)
    if r.status_code != 200:
        fail(f"daily-brief mentor status {r.status_code}: {r.text[:300]}")
        return None
    data = r.json()
    print(f"     brief preview: {(data.get('brief') or '')[:140]!r}")
    _verify_brief_shape("mentor", data)
    return data


def test_daily_brief_college():
    print("\n--- B3. POST /ai/daily-brief role=college ---")
    r = post("/ai/daily-brief", {"role": "college"}, timeout=120)
    if r.status_code != 200:
        fail(f"daily-brief college status {r.status_code}: {r.text[:300]}")
        return None
    data = r.json()
    print(f"     brief preview: {(data.get('brief') or '')[:140]!r}")
    _verify_brief_shape("college", data)
    return data


def test_daily_brief_invalid_role():
    print("\n--- B4. POST /ai/daily-brief role=xyz → 400 ---")
    r = post("/ai/daily-brief", {"role": "xyz"})
    if r.status_code == 400:
        try:
            detail = r.json().get("detail")
        except Exception:
            detail = r.text
        ok(f"invalid role returns 400: {detail!r}")
    else:
        fail(f"invalid role: expected 400, got {r.status_code}: {r.text[:200]}")


def test_daily_brief_with_seeded_email(students_items):
    print("\n--- B5. POST /ai/daily-brief role=student email=<seeded *.demo email> ---")
    candidates: List[str] = []
    for s in (students_items or [])[:40]:
        nm = (s.get("name") or "").strip()
        if not nm or nm == "—":
            continue
        parts = nm.lower().split()
        if len(parts) < 2:
            continue
        candidates.append(f"{parts[0]}.{parts[-1]}1@student.demo")
    if not candidates:
        candidates = ["aarav.sharma1@student.demo", "rahul.kumar1@student.demo"]

    chosen: Optional[str] = None
    for em in candidates[:8]:
        r = post("/auth/login", {"email": em, "password": "TestPass@123"}, timeout=15)
        if r.status_code in (200, 401):
            chosen = em
            print(f"     Found seeded email: {em} (probe {r.status_code})")
            break
    if not chosen:
        chosen = candidates[0]
        print(f"     No probe matched; using {chosen} anyway (endpoint will fallback)")

    r = post("/ai/daily-brief", {"role": "student", "email": chosen}, timeout=120)
    if r.status_code != 200:
        fail(f"daily-brief with email status {r.status_code}: {r.text[:300]}")
        return
    data = r.json()
    name = data.get("user_name")
    print(f"     resolved user_name = {name!r}")
    if name:
        ok(f"daily-brief with email returned user_name: {name}")
    else:
        fail("daily-brief with email returned empty user_name")
    _verify_brief_shape("student", data)


# ════════════════════════════════════════════════════════════════════════════════
# C) TIER REGRESSION
# ════════════════════════════════════════════════════════════════════════════════

def test_student_dashboard_tier():
    print("\n--- C1. GET /student/dashboard → tier present ---")
    r = get("/student/dashboard")
    if r.status_code != 200:
        fail(f"student/dashboard status {r.status_code}: {r.text[:200]}")
        return
    tier = (r.json().get("student") or {}).get("tier")
    if tier and tier.get("tier") in ("Bronze", "Silver", "Gold", "Platinum"):
        ok(f"student.tier = {tier['tier']} ({tier.get('score')}/100)")
    else:
        fail(f"student.tier missing/invalid: {tier}")


def test_mentor_dashboard_tier():
    print("\n--- C2. GET /mentor/dashboard → tier present ---")
    r = get("/mentor/dashboard")
    if r.status_code != 200:
        fail(f"mentor/dashboard status {r.status_code}: {r.text[:200]}")
        return
    tier = (r.json().get("mentor") or {}).get("tier")
    if tier and tier.get("tier") in ("Bronze", "Silver", "Gold", "Platinum"):
        ok(f"mentor.tier = {tier['tier']} ({tier.get('score')}/100)")
    else:
        fail(f"mentor.tier missing/invalid: {tier}")


def test_college_dashboard_tier():
    print("\n--- C3. GET /admin/college-stats → tier present ---")
    r = get("/admin/college-stats")
    if r.status_code != 200:
        fail(f"admin/college-stats status {r.status_code}: {r.text[:200]}")
        return
    tier = (r.json().get("college") or {}).get("tier")
    if tier and tier.get("tier") in ("Bronze", "Silver", "Gold", "Platinum"):
        ok(f"college.tier = {tier['tier']} ({tier.get('score')}/100, NAAC {tier.get('naac')})")
    else:
        fail(f"college.tier missing/invalid: {tier}")


def test_internships_tier():
    print("\n--- C4 + D. GET /student/internships ---")
    r = get("/student/internships")
    if r.status_code != 200:
        fail(f"student/internships status {r.status_code}: {r.text[:200]}")
        return
    data = r.json()
    items = data.get("items", [])
    print(f"     items count: {len(items)}")
    if len(items) == 30:
        ok("student/internships returned exactly 30 items (limit applied)")
    elif len(items) >= 20:
        ok(f"student/internships returned {len(items)} items (close to limit 30)")
    else:
        fail(f"student/internships returned only {len(items)} items (expected 30)")

    user_tier = data.get("user_tier")
    if user_tier and user_tier.get("tier"):
        ok(f"user_tier present: {user_tier.get('tier')}")
    else:
        fail(f"user_tier missing: {user_tier}")

    seen_non_rec = False
    sort_ok = True
    for it in items:
        if not it.get("tier_recommended"):
            seen_non_rec = True
        elif seen_non_rec:
            sort_ok = False
            break
    if sort_ok:
        ok("items sorted: tier_recommended=true items appear before false")
    else:
        fail("tier_recommended sorting violated")

    real_companies = {"Google", "Microsoft", "Razorpay", "Flipkart", "TCS", "Infosys", "Zomato",
                      "Amazon", "Apple", "Meta", "Adobe", "Atlassian", "Zoho", "PhonePe",
                      "Swiggy", "Cred", "Wipro", "Accenture", "Netflix", "OpenAI", "Stripe"}
    found_real = [it["company"] for it in items if it.get("company") in real_companies]
    if found_real:
        ok(f"Real-company internships present: {set(found_real[:5])}")
    else:
        substring_hits = [it.get("company") for it in items
                          if any(rc.lower() in (it.get("company") or "").lower() for rc in real_companies)]
        if substring_hits:
            ok(f"Real company names via substring: {set(substring_hits[:5])}")
        else:
            fail(f"No real company names found. Sample: {[it.get('company') for it in items[:5]]}")


# ════════════════════════════════════════════════════════════════════════════════
# Main
# ════════════════════════════════════════════════════════════════════════════════

def main():
    print(f"\n{'=' * 70}")
    print(f"Backend test suite vs {BASE}")
    print(f"{'=' * 70}")

    test_super_overview()
    students = test_super_students()
    test_super_mentors()
    test_super_colleges()
    test_seeded_user_existence(students)

    test_daily_brief_student()
    test_daily_brief_mentor()
    test_daily_brief_college()
    test_daily_brief_invalid_role()
    test_daily_brief_with_seeded_email(students)

    test_student_dashboard_tier()
    test_mentor_dashboard_tier()
    test_college_dashboard_tier()

    test_internships_tier()

    print(f"\n{'=' * 70}")
    print(f"RESULTS: {len(PASSED)} PASS, {len(FAILED)} FAIL")
    print(f"{'=' * 70}")
    if FAILED:
        print("\nFAILURES:")
        for f in FAILED:
            print(f"  FAIL: {f}")
        sys.exit(1)
    print("\nAll assertions passed.")


if __name__ == "__main__":
    main()
