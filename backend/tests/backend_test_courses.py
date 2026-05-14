"""
Backend test for SA Courses v1 (courses_marketplace.py).
Tests all 11 endpoints + edge cases.
"""
import os
import sys
import json
import requests
from typing import Any, Dict

BASE = "https://hiring-mvvm.preview.emergentagent.com/api"

PRIMARY_CREDS = {"email": "realtime@studentalumni.in", "password": "RealTime@2026"}
FALLBACK_CREDS = {"email": "student01@test.com", "password": "TestPass@123"}

PASS = 0
FAIL = 0
ERRORS = []


def chk(cond: bool, msg: str, info: Any = ""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  ✅ {msg}")
    else:
        FAIL += 1
        ERRORS.append(f"{msg} | {info}")
        print(f"  ❌ {msg} | {info}")


def section(title: str):
    print(f"\n{'='*72}\n{title}\n{'='*72}")


def login(creds: Dict[str, str]) -> str | None:
    try:
        r = requests.post(f"{BASE}/auth/login", json=creds, timeout=15)
        if r.status_code == 200:
            data = r.json()
            print(f"  Logged in as {creds['email']}")
            return data.get("access_token")
        else:
            print(f"  Login failed for {creds['email']}: {r.status_code} {r.text[:200]}")
            return None
    except Exception as e:
        print(f"  Login exception: {e}")
        return None


def main():
    section("AUTH")
    token = login(PRIMARY_CREDS)
    if not token:
        print("  Falling back to student01")
        token = login(FALLBACK_CREDS)
    if not token:
        print("FATAL: cannot login with any account")
        sys.exit(1)
    h = {"Authorization": f"Bearer {token}"}

    # ──────────────────────────────────────────────────────────────────────
    section("1) GET /api/courses/catalog")
    r = requests.get(f"{BASE}/courses/catalog", headers=h, timeout=15)
    chk(r.status_code == 200, "catalog status 200", r.status_code)
    cat = r.json() if r.status_code == 200 else {}
    chk(set(cat.keys()) >= {"sections", "hero", "stats", "tracks", "fetched_at"},
        "catalog has required keys", list(cat.keys()))
    sections = cat.get("sections", [])
    chk(len(sections) == 3, f"catalog 3 sections (got {len(sections)})", "")
    if len(sections) == 3:
        chk(sections[0]["id"] == "tech" and sections[0]["emoji"] == "💻", "section[0] tech 💻", sections[0].get("id"))
        chk(sections[1]["id"] == "design" and sections[1]["emoji"] == "🎨", "section[1] design 🎨", sections[1].get("id"))
        chk(sections[2]["id"] == "business" and sections[2]["emoji"] == "💼", "section[2] business 💼", sections[2].get("id"))
        for s in sections:
            chk(len(s.get("items", [])) == 8, f"{s['id']} has 8 items (got {len(s.get('items',[]))})", "")
            for it in s.get("items", []):
                chk("count" in it and isinstance(it["count"], int), f"{s['id']}/{it.get('key')} has int count", it.get("count"))
        # Figma highlighted
        design = sections[1].get("items", [])
        figma = next((i for i in design if i.get("key") == "figma-mastery"), None)
        chk(figma is not None and figma.get("highlighted") is True, "figma-mastery highlighted=true", figma)
    hero = cat.get("hero", [])
    chk(len(hero) == 2, f"hero has 2 cards (got {len(hero)})")
    if len(hero) == 2:
        chk(hero[0]["id"] == "ai-career-track" and hero[0].get("variant") == "violet", "hero[0]=ai-career-track violet", hero[0])
        chk(hero[1]["id"] == "free-this-month" and hero[1].get("variant") == "green", "hero[1]=free-this-month green", hero[1])
    stats = cat.get("stats", {})
    chk(stats.get("total_courses", 0) >= 35, f"stats.total_courses >= 35 (got {stats.get('total_courses')})")
    chk(stats.get("free_courses", 0) >= 18, f"stats.free_courses >= 18 (got {stats.get('free_courses')})")
    chk(stats.get("free_certs", 0) >= 8, f"stats.free_certs >= 8 (got {stats.get('free_certs')})")
    tracks = cat.get("tracks", [])
    chk(len(tracks) == 2, f"tracks has 2 entries (got {len(tracks)})")
    track_slugs = {t.get("slug") for t in tracks}
    chk(track_slugs == {"ai-career-track", "frontend-engineer-track"}, "tracks slugs correct", track_slugs)
    chk(isinstance(cat.get("fetched_at"), str), "fetched_at is ISO string")

    # ──────────────────────────────────────────────────────────────────────
    section("2) GET /api/courses/list (variants)")
    r = requests.get(f"{BASE}/courses/list", headers=h, timeout=15)
    chk(r.status_code == 200, "list status 200")
    all_courses = r.json().get("courses", [])
    chk(len(all_courses) >= 35, f"no-filter returns >= 35 (got {len(all_courses)})")

    r = requests.get(f"{BASE}/courses/list?category=tech", headers=h, timeout=15)
    tech = r.json().get("courses", [])
    chk(all(c["category"] == "tech" for c in tech), f"category=tech all-tech ({len(tech)} items)")

    r = requests.get(f"{BASE}/courses/list?category=tech&subcategory=ai-ml", headers=h, timeout=15)
    aiml = r.json().get("courses", [])
    aiml_ids = {c["id"] for c in aiml}
    expected_aiml = {"coursera-andrew-ng-ml", "deeplearning-ai-spec",
                      "fast-ai-course", "nptel-iitb-aiml", "kaggle-learn-ml"}
    chk(len(aiml) == 5, f"ai-ml returns exactly 5 (got {len(aiml)})")
    chk(aiml_ids == expected_aiml, f"ai-ml ids match", aiml_ids ^ expected_aiml)

    r = requests.get(f"{BASE}/courses/list?pricing=free", headers=h, timeout=15)
    free_items = r.json().get("courses", [])
    free_types_ok = all(c["pricing"]["type"] in ("free", "free_audit", "free_with_sa") for c in free_items)
    chk(free_types_ok, f"pricing=free returns only free/free_audit/free_with_sa ({len(free_items)} items)")

    r = requests.get(f"{BASE}/courses/list?pricing=discounted", headers=h, timeout=15)
    disc_items = r.json().get("courses", [])
    disc_ok = all(c["pricing"]["type"] == "discounted_for_sa" for c in disc_items)
    chk(disc_ok, f"pricing=discounted returns only discounted_for_sa ({len(disc_items)} items)")

    r = requests.get(f"{BASE}/courses/list?level=Beginner", headers=h, timeout=15)
    beg_items = r.json().get("courses", [])
    beg_ok = all(c["level"].lower() == "beginner" for c in beg_items)
    chk(beg_ok, f"level=Beginner returns only Beginner ({len(beg_items)} items)")

    r = requests.get(f"{BASE}/courses/list?q=Andrew", headers=h, timeout=15)
    andrew_items = r.json().get("courses", [])
    chk(len(andrew_items) >= 2, f"q=Andrew returns >= 2 courses (got {len(andrew_items)})")

    r = requests.get(f"{BASE}/courses/list?sort=free_first", headers=h, timeout=15)
    free_first = r.json().get("courses", [])
    first10 = free_first[:10]
    free_first_ok = all(c["pricing"]["type"] in ("free", "free_audit", "free_with_sa") for c in first10)
    chk(free_first_ok, "sort=free_first first 10 are free*")

    r = requests.get(f"{BASE}/courses/list?sort=rating", headers=h, timeout=15)
    rated = r.json().get("courses", [])
    sorted_ok = all(rated[i].get("rating", 0) >= rated[i+1].get("rating", 0) for i in range(len(rated)-1))
    chk(sorted_ok, "sort=rating desc by rating")

    # ──────────────────────────────────────────────────────────────────────
    section("3) GET /api/courses/course/{id}")
    r = requests.get(f"{BASE}/courses/course/coursera-andrew-ng-ml", headers=h, timeout=15)
    chk(r.status_code == 200, "course detail status 200", r.status_code)
    detail = r.json().get("course", {}) if r.status_code == 200 else {}
    chk(detail.get("id") == "coursera-andrew-ng-ml", "course id matches")
    syll = detail.get("syllabus", [])
    chk(len(syll) == 4, f"syllabus has 4 weeks (got {len(syll)})")
    wyl = detail.get("what_youll_learn", [])
    chk(len(wyl) == 4 and all(isinstance(s, str) for s in wyl), f"what_youll_learn has 4 strings ({len(wyl)})")

    r = requests.get(f"{BASE}/courses/course/INVALID-XYZ", headers=h, timeout=15)
    chk(r.status_code == 404, f"invalid course returns 404 (got {r.status_code})")

    # ──────────────────────────────────────────────────────────────────────
    section("4) POST /api/courses/enroll")
    # First, clean up previous test enrollment to ensure idempotent test of duplicate flag — not strictly needed; just record
    r = requests.post(f"{BASE}/courses/enroll", headers=h,
                      json={"course_id": "coursera-andrew-ng-ml"}, timeout=15)
    chk(r.status_code == 200, f"enroll status 200 (got {r.status_code})", r.text[:200])
    enr_resp = r.json() if r.status_code == 200 else {}
    chk(enr_resp.get("ok") is True, "enroll ok=true")
    enrollment = enr_resp.get("enrollment", {})
    enrollment_id = enrollment.get("enrollment_id", "")
    chk(enrollment_id.startswith("ENR-"), f"enrollment_id starts ENR- (got {enrollment_id})")
    chk(enrollment.get("status") == "active", f"status=active (got {enrollment.get('status')})")
    # progress_percent may be 0 OR non-zero if previously created and progressed.
    # If duplicate=False (fresh) it must be 0.
    if not enr_resp.get("duplicate"):
        chk(enrollment.get("progress_percent") == 0, f"fresh enroll progress=0 (got {enrollment.get('progress_percent')})")
    chk(isinstance(enrollment.get("course_snapshot"), dict), "course_snapshot is dict")
    chk(isinstance(enrollment.get("enrolled_at"), str), "enrolled_at is ISO string")
    chk(isinstance(enr_resp.get("enroll_url"), str) and enr_resp["enroll_url"], "enroll_url present")

    # Re-POST same body → duplicate
    r2 = requests.post(f"{BASE}/courses/enroll", headers=h,
                       json={"course_id": "coursera-andrew-ng-ml"}, timeout=15)
    chk(r2.status_code == 200 and r2.json().get("duplicate") is True, "re-enroll duplicate=true")

    # missing course_id → 400
    r3 = requests.post(f"{BASE}/courses/enroll", headers=h, json={}, timeout=15)
    chk(r3.status_code == 400, f"missing course_id → 400 (got {r3.status_code})")

    # unknown course_id → 404
    r4 = requests.post(f"{BASE}/courses/enroll", headers=h,
                       json={"course_id": "no-such-course"}, timeout=15)
    chk(r4.status_code == 404, f"unknown course_id → 404 (got {r4.status_code})")

    # ──────────────────────────────────────────────────────────────────────
    section("5) GET /api/courses/my-enrollments")
    r = requests.get(f"{BASE}/courses/my-enrollments", headers=h, timeout=15)
    chk(r.status_code == 200, "my-enrollments status 200")
    my = r.json().get("enrollments", [])
    chk(any(e.get("enrollment_id") == enrollment_id for e in my),
        f"my-enrollments contains {enrollment_id}", [e.get('enrollment_id') for e in my[:5]])
    # sorted desc by enrolled_at
    if len(my) >= 2:
        sorted_desc = all(my[i]["enrolled_at"] >= my[i+1]["enrolled_at"] for i in range(len(my)-1))
        chk(sorted_desc, "my-enrollments sorted by enrolled_at desc")

    # ──────────────────────────────────────────────────────────────────────
    section("6) POST /api/courses/enrollments/{id}/progress")
    r = requests.post(f"{BASE}/courses/enrollments/{enrollment_id}/progress",
                      headers=h, json={"percent": 50}, timeout=15)
    chk(r.status_code == 200, f"progress status 200 (got {r.status_code})", r.text[:200])
    p = r.json() if r.status_code == 200 else {}
    chk(p.get("ok") is True, "progress ok=true")
    upf = p.get("updated_fields", [])
    chk("progress_percent" in upf and "updated_at" in upf, f"updated_fields contains progress_percent + updated_at ({upf})")

    r2 = requests.post(f"{BASE}/courses/enrollments/{enrollment_id}/progress",
                       headers=h, json={"completed": True}, timeout=15)
    chk(r2.status_code == 200, f"progress completed status 200 (got {r2.status_code})")
    # verify state via my-enrollments
    r3 = requests.get(f"{BASE}/courses/my-enrollments", headers=h, timeout=15)
    cur = next((e for e in r3.json().get("enrollments", [])
                 if e.get("enrollment_id") == enrollment_id), None)
    chk(cur is not None and cur.get("status") == "completed", f"status=completed (got {cur.get('status') if cur else None})")
    chk(cur is not None and cur.get("progress_percent") == 100, f"progress_percent=100 (got {cur.get('progress_percent') if cur else None})")

    r4 = requests.post(f"{BASE}/courses/enrollments/{enrollment_id}/progress",
                       headers=h, json={}, timeout=15)
    chk(r4.status_code == 400, f"empty body → 400 (got {r4.status_code})")

    r5 = requests.post(f"{BASE}/courses/enrollments/ENR-NONEXIST/progress",
                       headers=h, json={"percent": 30}, timeout=15)
    chk(r5.status_code == 404, f"invalid id → 404 (got {r5.status_code})")

    # ──────────────────────────────────────────────────────────────────────
    section("7) GET /api/courses/tracks")
    r = requests.get(f"{BASE}/courses/tracks", headers=h, timeout=15)
    chk(r.status_code == 200, "tracks status 200")
    trks = r.json().get("tracks", [])
    chk(len(trks) == 2, f"tracks returns 2 (got {len(trks)})")

    # ──────────────────────────────────────────────────────────────────────
    section("8) GET /api/courses/tracks/ai-career-track")
    r = requests.get(f"{BASE}/courses/tracks/ai-career-track", headers=h, timeout=15)
    chk(r.status_code == 200, f"track detail status 200 (got {r.status_code})", r.text[:300])
    track_resp = r.json().get("track", {}) if r.status_code == 200 else {}
    mods = track_resp.get("modules", [])
    chk(len(mods) == 6, f"track has 6 modules (got {len(mods)})")
    # Each module's courses[i] has both course_id and course
    hyd_ok = True
    for m in mods:
        for cref in m.get("courses", []):
            if "course_id" not in cref or not isinstance(cref.get("course"), dict):
                hyd_ok = False
                break
    chk(hyd_ok, "every module course has course_id + hydrated course object")
    chk(len(track_resp.get("mentors", [])) == 3, f"track has 3 mentors (got {len(track_resp.get('mentors', []))})")
    cap = track_resp.get("capstone")
    chk(isinstance(cap, dict) and isinstance(cap.get("deliverables"), list),
        "capstone defined with deliverables list")

    r2 = requests.get(f"{BASE}/courses/tracks/INVALID-TRACK", headers=h, timeout=15)
    chk(r2.status_code == 404, f"invalid track → 404 (got {r2.status_code})")

    # ──────────────────────────────────────────────────────────────────────
    section("9) POST /api/courses/tracks/ai-career-track/enroll")
    r = requests.post(f"{BASE}/courses/tracks/ai-career-track/enroll",
                      headers=h, json={}, timeout=15)
    chk(r.status_code == 200, f"track enroll status 200 (got {r.status_code})", r.text[:200])
    te = r.json() if r.status_code == 200 else {}
    chk(te.get("ok") is True, "track enroll ok=true")
    te_enr = te.get("enrollment", {})
    chk(te_enr.get("enrollment_id", "").startswith("TRK-"),
        f"track enrollment_id starts TRK- (got {te_enr.get('enrollment_id')})")
    chk(te_enr.get("current_week") == 1, f"current_week=1 (got {te_enr.get('current_week')})")
    chk(te_enr.get("slug") == "ai-career-track", f"slug=ai-career-track (got {te_enr.get('slug')})")

    r2 = requests.post(f"{BASE}/courses/tracks/ai-career-track/enroll",
                       headers=h, json={}, timeout=15)
    chk(r2.status_code == 200 and r2.json().get("duplicate") is True,
        f"re-enroll track duplicate=true (got {r2.json().get('duplicate')})")

    r3 = requests.post(f"{BASE}/courses/tracks/INVALID-TRACK/enroll",
                       headers=h, json={}, timeout=15)
    chk(r3.status_code == 404, f"unknown track → 404 (got {r3.status_code})")

    # ──────────────────────────────────────────────────────────────────────
    section("10) POST /api/courses/ai/recommend")
    r = requests.post(f"{BASE}/courses/ai/recommend", headers=h,
                      json={"goal": "learn ML for career switch",
                             "weekly_hours": 10, "budget": 5000}, timeout=30)
    chk(r.status_code == 200, f"ai/recommend status 200 (got {r.status_code})", r.text[:200])
    rec = r.json() if r.status_code == 200 else {}
    recs = rec.get("recommendations", [])
    chk(0 < len(recs) <= 6, f"recommendations 1..6 (got {len(recs)})")
    rationale = rec.get("rationale", "")
    chk(isinstance(rationale, str) and rationale, "rationale is non-empty string")
    chk("5,000" in rationale or "5000" in rationale or "5,000" in rationale or "₹" in rationale, f"rationale mentions budget (got: {rationale})")
    chk("10" in rationale and ("hr" in rationale.lower() or "hour" in rationale.lower()),
        f"rationale mentions hours (got: {rationale})")

    # ──────────────────────────────────────────────────────────────────────
    section("11) POST /api/courses/ai/path")
    r = requests.post(f"{BASE}/courses/ai/path", headers=h,
                      json={"role": "ML Engineer", "current_skills": ["python"],
                             "deadline_weeks": 24, "weekly_hours": 12}, timeout=30)
    chk(r.status_code == 200, f"ai/path status 200 (got {r.status_code})", r.text[:200])
    p = r.json() if r.status_code == 200 else {}
    path = p.get("path", [])
    chk(len(path) >= 1, f"path has >= 1 module (got {len(path)})")
    # hydrated courses
    hyd2 = all(isinstance(c, dict) and "id" in c for m in path for c in m.get("courses", []))
    # Allow modules without courses (some may be empty) — check at least one module has hydrated courses
    has_courses = any(len(m.get("courses", [])) >= 1 for m in path)
    chk(has_courses and hyd2, "path modules have hydrated courses")
    chk(p.get("track_slug") == "ai-career-track", f"track_slug=ai-career-track (got {p.get('track_slug')})")
    summary = p.get("summary", "")
    chk("ML Engineer" in summary and "24" in summary and "12" in summary,
        f"summary mentions ML Engineer + 24 + 12 (got: {summary})")

    r2 = requests.post(f"{BASE}/courses/ai/path", headers=h,
                       json={"role": "Frontend Engineer", "weekly_hours": 10},
                       timeout=30)
    p2 = r2.json() if r2.status_code == 200 else {}
    chk(p2.get("track_slug") == "frontend-engineer-track",
        f"frontend role → frontend-engineer-track (got {p2.get('track_slug')})")

    # ──────────────────────────────────────────────────────────────────────
    section("EDGE: Auth gating (no token → 401)")
    bad_h = {}
    endpoints = [
        ("GET", "/courses/catalog"),
        ("GET", "/courses/list"),
        ("GET", "/courses/course/coursera-andrew-ng-ml"),
        ("POST", "/courses/enroll"),
        ("GET", "/courses/my-enrollments"),
        ("GET", "/courses/tracks"),
        ("GET", "/courses/tracks/ai-career-track"),
        ("POST", "/courses/tracks/ai-career-track/enroll"),
        ("POST", "/courses/ai/recommend"),
        ("POST", "/courses/ai/path"),
    ]
    for method, path in endpoints:
        if method == "GET":
            rr = requests.get(f"{BASE}{path}", headers=bad_h, timeout=10)
        else:
            rr = requests.post(f"{BASE}{path}", headers=bad_h, json={}, timeout=10)
        chk(rr.status_code in (401, 403), f"{method} {path} → 401/403 (got {rr.status_code})")

    # ──────────────────────────────────────────────────────────────────────
    section("EDGE: Pricing math sanity")
    # Reforge 159000 → 49999 → 69%, Udemy 3499→1199→66%, NSDC 5999→2499→58%
    r = requests.get(f"{BASE}/courses/list?pricing=discounted", headers=h, timeout=15)
    disc = r.json().get("courses", [])
    found_159 = next((c for c in disc if c["pricing"]["original_inr"] == 159000), None)
    chk(found_159 is not None and found_159["pricing"]["sa_inr"] == 49999
        and found_159["pricing"]["sa_discount_percent"] == 69,
        "Reforge 159000→49999 = 69%", found_159 and found_159.get("pricing"))
    found_udemy = next((c for c in disc
                        if c["pricing"]["original_inr"] == 3499
                        and c["pricing"]["sa_inr"] == 1199), None)
    chk(found_udemy is not None and found_udemy["pricing"]["sa_discount_percent"] == 66,
        "Udemy 3499→1199 = 66%", found_udemy and found_udemy.get("pricing"))
    found_nsdc = next((c for c in disc
                        if c["pricing"]["original_inr"] == 5999
                        and c["pricing"]["sa_inr"] == 2499), None)
    chk(found_nsdc is not None and found_nsdc["pricing"]["sa_discount_percent"] == 58,
        "NSDC 5999→2499 = 58%", found_nsdc and found_nsdc.get("pricing"))
    # All discounted: sa < orig and pct rough match
    all_ok = True
    for c in disc:
        o = c["pricing"]["original_inr"]; s = c["pricing"]["sa_inr"]
        if not (s < o):
            all_ok = False; break
    chk(all_ok, "all discounted: sa_inr < original_inr")

    # free_with_sa: original > 0, sa == 0
    r = requests.get(f"{BASE}/courses/list?pricing=free", headers=h, timeout=15)
    free_all = r.json().get("courses", [])
    fws = [c for c in free_all if c["pricing"]["type"] == "free_with_sa"]
    fws_ok = all(c["pricing"]["original_inr"] > 0 and c["pricing"]["sa_inr"] == 0 for c in fws)
    chk(fws_ok and len(fws) > 0, f"free_with_sa: original>0, sa==0 ({len(fws)} items)")

    # ──────────────────────────────────────────────────────────────────────
    section("RESULTS")
    print(f"\n  PASS: {PASS}\n  FAIL: {FAIL}")
    if ERRORS:
        print("\n  Failures:")
        for e in ERRORS:
            print(f"    - {e}")
    sys.exit(0 if FAIL == 0 else 1)


if __name__ == "__main__":
    main()
