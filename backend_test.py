"""Backend tier system test — validates P0 Dynamic Tier/Badge System."""
import os
import sys
from typing import Any, Dict, List

import httpx

BASE = os.environ.get("BACKEND_URL", "https://hiring-mvvm.preview.emergentagent.com/api")
TIER_ENUM = {"Bronze", "Silver", "Gold", "Platinum"}
VISUAL_KEYS = {"primary", "glow", "ring", "icon"}

results: List[Dict[str, Any]] = []


def check(cond: bool, label: str, detail: str = "") -> None:
    status = "PASS" if cond else "FAIL"
    print(f"  [{status}] {label}" + (f" — {detail}" if detail and not cond else ""))
    results.append({"label": label, "ok": cond, "detail": detail})


def tier_for_score(score: int) -> str:
    if score >= 80: return "Platinum"
    if score >= 60: return "Gold"
    if score >= 40: return "Silver"
    return "Bronze"


def validate_tier_payload(tier: Dict[str, Any], breakdown_keys: set, prefix: str, need_suggestions: bool = False) -> None:
    check(isinstance(tier, dict), f"{prefix}: tier is dict")
    check(tier.get("tier") in TIER_ENUM, f"{prefix}: tier in enum", f"got {tier.get('tier')}")
    score = tier.get("score")
    check(isinstance(score, int) and 0 <= score <= 100, f"{prefix}: score int 0..100", f"got {score}")
    expected = tier_for_score(score if isinstance(score, int) else 0)
    check(tier.get("tier") == expected, f"{prefix}: tier matches score thresholds", f"score={score}, tier={tier.get('tier')}, expected={expected}")
    bd = tier.get("breakdown") or {}
    check(isinstance(bd, dict), f"{prefix}: breakdown is dict")
    for k in breakdown_keys:
        v = bd.get(k)
        check(isinstance(v, int), f"{prefix}: breakdown.{k} is int", f"got {v!r}")
    missing = breakdown_keys - set(bd.keys())
    check(not missing, f"{prefix}: breakdown has all keys", f"missing={missing}")
    vis = tier.get("visuals") or {}
    check(isinstance(vis, dict), f"{prefix}: visuals is dict")
    for k in VISUAL_KEYS:
        check(isinstance(vis.get(k), str) and vis.get(k), f"{prefix}: visuals.{k} non-empty string", f"got {vis.get(k)!r}")
    if need_suggestions:
        sug = tier.get("suggestions") or {}
        check(isinstance(sug, dict), f"{prefix}: suggestions is dict")
        for k in ("internships", "skills", "mentors", "events"):
            v = sug.get(k)
            check(isinstance(v, list) and all(isinstance(s, str) for s in v), f"{prefix}: suggestions.{k} is list[str]", f"got {v!r}")


def section(title: str):
    print(f"\n=== {title} ===")


def run():
    with httpx.Client(timeout=30.0) as c:
        # 1. Student dashboard
        section("1. GET /api/student/dashboard — student.tier")
        r = c.get(f"{BASE}/student/dashboard")
        check(r.status_code == 200, "student/dashboard 200", f"got {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            student = data.get("student") or {}
            tier = student.get("tier") or {}
            validate_tier_payload(
                tier,
                breakdown_keys={"year_of_study", "institution_ranking", "tech_stack", "profile_completion"},
                prefix="student.tier",
                need_suggestions=True,
            )

        # 2. Mentor dashboard
        section("2. GET /api/mentor/dashboard — mentor.tier")
        r = c.get(f"{BASE}/mentor/dashboard")
        check(r.status_code == 200, "mentor/dashboard 200", f"got {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            mentor = data.get("mentor") or {}
            tier = mentor.get("tier") or {}
            validate_tier_payload(
                tier,
                breakdown_keys={"experience", "organization", "sessions", "rating"},
                prefix="mentor.tier",
            )

        # 3. College stats
        section("3. GET /api/admin/college-stats — college.tier + naac + rank")
        r = c.get(f"{BASE}/admin/college-stats")
        check(r.status_code == 200, "admin/college-stats 200", f"got {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            college = data.get("college") or {}
            tier = college.get("tier") or {}
            validate_tier_payload(
                tier,
                breakdown_keys={"accreditation", "size", "placement", "alumni_size"},
                prefix="college.tier",
            )
            naac = tier.get("naac")
            check(isinstance(naac, str) and naac, "college.tier.naac non-empty str", f"got {naac!r}")
            rank = college.get("rank")
            check(rank == f"NAAC {naac}", "college.rank == 'NAAC ' + naac", f"got rank={rank!r}, naac={naac!r}")

        # 4. /users/me/tier?role=student
        section("4. GET /api/users/me/tier?role=student")
        r = c.get(f"{BASE}/users/me/tier", params={"role": "student"})
        check(r.status_code == 200, "users/me/tier?role=student 200", f"got {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            check(data.get("role") == "student", "role=student", f"got {data.get('role')}")
            check(isinstance(data.get("name"), str) and data.get("name"), "name is non-empty str")
            validate_tier_payload(
                data.get("tier") or {},
                breakdown_keys={"year_of_study", "institution_ranking", "tech_stack", "profile_completion"},
                prefix="student tier payload",
                need_suggestions=True,
            )

        # 5. /users/me/tier?role=mentor
        section("5. GET /api/users/me/tier?role=mentor")
        r = c.get(f"{BASE}/users/me/tier", params={"role": "mentor"})
        check(r.status_code == 200, "users/me/tier?role=mentor 200", f"got {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            check(data.get("role") == "mentor", "role=mentor", f"got {data.get('role')}")
            validate_tier_payload(
                data.get("tier") or {},
                breakdown_keys={"experience", "organization", "sessions", "rating"},
                prefix="mentor tier payload",
            )

        # 6. /users/me/tier?role=college
        section("6. GET /api/users/me/tier?role=college")
        r = c.get(f"{BASE}/users/me/tier", params={"role": "college"})
        check(r.status_code == 200, "users/me/tier?role=college 200", f"got {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            check(data.get("role") == "college", "role=college", f"got {data.get('role')}")
            tier = data.get("tier") or {}
            validate_tier_payload(
                tier,
                breakdown_keys={"accreditation", "size", "placement", "alumni_size"},
                prefix="college tier payload",
            )
            check(isinstance(tier.get("naac"), str) and tier.get("naac"), "college tier payload naac non-empty str")

        # 7. /users/me/tier?email=student01
        section("7. GET /api/users/me/tier?email=student01@test.com&role=student")
        r = c.get(f"{BASE}/users/me/tier", params={"email": "student01@test.com", "role": "student"})
        check(r.status_code == 200, "users/me/tier email lookup 200", f"got {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            check(data.get("role") == "student", "role=student")
            validate_tier_payload(
                data.get("tier") or {},
                breakdown_keys={"year_of_study", "institution_ranking", "tech_stack", "profile_completion"},
                prefix="student01 tier",
                need_suggestions=True,
            )
            r2 = c.get(f"{BASE}/users/me/tier", params={"email": "student01@test.com", "role": "student"})
            if r2.status_code == 200:
                d2 = r2.json()
                check(
                    d2.get("tier", {}).get("tier") == data.get("tier", {}).get("tier")
                    and d2.get("tier", {}).get("score") == data.get("tier", {}).get("score"),
                    "idempotent result on repeat call",
                    f"first={data.get('tier')}, second={d2.get('tier')}",
                )

        # Bonus: missing user → 404
        section("Bonus: /users/me/tier with impossible email+role → 404")
        r = c.get(f"{BASE}/users/me/tier", params={"email": "nobody@nope.invalid", "role": "nosuchrole"})
        check(r.status_code == 404, "missing user returns 404", f"got {r.status_code}")

        # 8. /student/internships
        section("8. GET /api/student/internships — items, user_tier, sort, boost")
        r = c.get(f"{BASE}/student/internships")
        check(r.status_code == 200, "student/internships 200", f"got {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            items = data.get("items")
            check(isinstance(items, list), "items is list")
            check(len(items) <= 30, "<= 30 items", f"got {len(items) if items else 0}")
            user_tier = data.get("user_tier") or {}
            check(user_tier.get("tier") in TIER_ENUM, "user_tier.tier in enum", f"got {user_tier.get('tier')}")
            check(isinstance(user_tier.get("score"), int), "user_tier.score int")
            check(isinstance(user_tier.get("visuals"), dict) and set(user_tier["visuals"].keys()) >= VISUAL_KEYS, "user_tier.visuals keys")
            check(isinstance(user_tier.get("suggestions"), dict), "user_tier.suggestions is dict")
            check(isinstance(data.get("stretch_goals"), list), "stretch_goals is list")

            all_have_fields = True
            for i, it in enumerate(items or []):
                ok = all(k in it for k in ("id", "title", "company", "tier", "tier_recommended", "tier_visuals", "match"))
                if not ok:
                    all_have_fields = False
                    check(False, f"items[{i}] has required fields", f"keys={list(it.keys())}")
                    break
            if all_have_fields:
                check(True, "all items have required fields (id/title/company/tier/tier_recommended/tier_visuals/match)")

            if items:
                check(all(it.get("tier") in TIER_ENUM for it in items), "all items.tier in enum")
                check(all(isinstance(it.get("match"), int) and 0 <= it["match"] <= 100 for it in items), "all items.match is int 0..100")
                check(all(isinstance(it.get("tier_recommended"), bool) for it in items), "all items.tier_recommended is bool")
                check(all(isinstance(it.get("tier_visuals"), dict) and set(it["tier_visuals"].keys()) >= VISUAL_KEYS for it in items), "all items.tier_visuals has {primary,glow,ring,icon}")

                # Sorting
                sort_ok = True
                for a, b in zip(items, items[1:]):
                    ra, rb = int(a.get("tier_recommended", False)), int(b.get("tier_recommended", False))
                    if rb > ra:
                        sort_ok = False; break
                    if ra == rb and b.get("match", 0) > a.get("match", 0):
                        sort_ok = False; break
                check(sort_ok, "items sorted: tier_recommended first, then match desc")

                top_match = max((it.get("match", 0) for it in items if it.get("tier_recommended")), default=0)
                check(top_match >= 90, "≥1 recommended item with match >= 90 (boost applied)", f"top_match={top_match}")

        # 9. /student/internships?query=intern
        section("9. GET /api/student/internships?query=intern")
        r = c.get(f"{BASE}/student/internships", params={"query": "intern"})
        check(r.status_code == 200, "internships?query=intern 200", f"got {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            items = data.get("items") or []
            check(isinstance(data.get("user_tier"), dict), "user_tier still present")
            check(isinstance(data.get("stretch_goals"), list), "stretch_goals still list")
            ok = all(("intern" in (it.get("title") or "").lower() or "intern" in (it.get("company") or "").lower()) for it in items)
            check(ok, "all items have 'intern' in title or company")
            sort_ok = True
            for a, b in zip(items, items[1:]):
                ra, rb = int(a.get("tier_recommended", False)), int(b.get("tier_recommended", False))
                if rb > ra:
                    sort_ok = False; break
                if ra == rb and b.get("match", 0) > a.get("match", 0):
                    sort_ok = False; break
            check(sort_ok, "items still tier-recommended sorted with query filter")

        # 10. Regression
        section("10. Regression — wallet / college-students / network / super-overview")
        for path in ("student/wallet", "college/students", "student/network", "admin/super-overview"):
            r = c.get(f"{BASE}/{path}")
            check(r.status_code == 200, f"GET /{path} returns 200", f"got {r.status_code}")
            try:
                r.json()
                check(True, f"GET /{path} returns JSON")
            except Exception as e:
                check(False, f"GET /{path} returns JSON", str(e))

    fails = [r for r in results if not r["ok"]]
    print(f"\n=== SUMMARY: {len(results) - len(fails)}/{len(results)} PASSED ===")
    if fails:
        print("\nFAILURES:")
        for f in fails:
            print(f"  - {f['label']}: {f['detail']}")
    return 0 if not fails else 1


if __name__ == "__main__":
    sys.exit(run())
