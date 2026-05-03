"""
Re-test for College Portal Phase 3 — only re-test the 2 previously failing endpoints:
  1) GET /api/college/students
  2) GET /api/college/analytics
"""
import json
import sys
import requests

BASE = "https://hiring-mvvm.preview.emergentagent.com/api"
EMAIL = "realtime@studentalumni.in"
PASSWORD = "RealTime@2026"

results = []


def add(name: str, ok: bool, detail: str = ""):
    results.append((ok, name, detail))
    icon = "PASS" if ok else "FAIL"
    print(f"[{icon}] {name}" + (f" — {detail}" if detail else ""))


def login() -> str:
    r = requests.post(f"{BASE}/auth/login",
                       json={"email": EMAIL, "password": PASSWORD}, timeout=15)
    if r.status_code != 200:
        print("LOGIN FAILED:", r.status_code, r.text)
        sys.exit(1)
    return r.json()["access_token"]


def test_students(token: str):
    H = {"Authorization": f"Bearer {token}"}

    # 1) Default
    r = requests.get(f"{BASE}/college/students", headers=H, timeout=15)
    add("students: default 200", r.status_code == 200, f"status={r.status_code}")
    j = r.json() if r.status_code == 200 else {}
    add("students: total=120", j.get("total") == 120, f"total={j.get('total')}")
    add("students: page=1", j.get("page") == 1)
    add("students: page_size=20", j.get("page_size") == 20)
    add("students: pages=6", j.get("pages") == 6)
    add("students: items has 20", len(j.get("items", [])) == 20,
        f"len={len(j.get('items', []))}")
    flt = j.get("filters", {})
    add("students: filters.departments=7",
        len(flt.get("departments", [])) == 7)
    add("students: filters.years=5", len(flt.get("years", [])) == 5)
    add("students: filters.statuses=3", len(flt.get("statuses", [])) == 3)

    # Validate first item shape
    first = j.get("items", [{}])[0] if j.get("items") else {}
    valid_depts = {"CSE", "ECE", "ME", "EEE", "Civil", "Chem", "MBA"}
    valid_years = {"1st", "2nd", "3rd", "4th", "Final"}
    valid_status = {"top", "good", "at_risk"}
    item_checks = [
        ("id starts STU-", isinstance(first.get("id"), str) and first.get("id", "").startswith("STU-")),
        ("name str", isinstance(first.get("name"), str)),
        ("initials 2-char upper", isinstance(first.get("initials"), str)
            and len(first.get("initials", "")) == 2
            and first.get("initials", "").isupper()),
        ("email str", isinstance(first.get("email"), str)),
        ("dept valid", first.get("dept") in valid_depts),
        ("year valid", first.get("year") in valid_years),
        ("cgpa in [6.5,9.9]", isinstance(first.get("cgpa"), (int, float))
            and 6.5 <= first["cgpa"] <= 9.9),
        ("attendance in [70,99]", isinstance(first.get("attendance"), (int, float))
            and 70 <= first["attendance"] <= 99),
        ("status valid", first.get("status") in valid_status),
        ("color hex", isinstance(first.get("color"), str)
            and first.get("color", "").startswith("#")),
        ("placed bool", isinstance(first.get("placed"), bool)),
        ("company str|None", first.get("company") is None
            or isinstance(first.get("company"), str)),
        ("package_lpa num|None", first.get("package_lpa") is None
            or isinstance(first.get("package_lpa"), (int, float))),
        ("sector str|None", first.get("sector") is None
            or isinstance(first.get("sector"), str)),
    ]
    for name, ok in item_checks:
        add(f"students.item[0]: {name}", ok)

    # 2) ?dept=CSE
    r = requests.get(f"{BASE}/college/students", headers=H,
                      params={"dept": "CSE"}, timeout=15)
    j2 = r.json()
    add("students?dept=CSE: 200", r.status_code == 200)
    items2 = j2.get("items", [])
    cse_only = all(s["dept"] == "CSE" for s in items2)
    add("students?dept=CSE: all dept==CSE", cse_only)
    # CSE count: 120/7 ≈ ~17 (i % 7 == 0 → 0,7,14,21,…)
    expected_cse_total = sum(1 for i in range(120) if i % 7 == 0)
    add("students?dept=CSE: total reflects CSE-only",
        j2.get("total") == expected_cse_total,
        f"total={j2.get('total')}, expected={expected_cse_total}")

    # 3) ?status=top
    r = requests.get(f"{BASE}/college/students", headers=H,
                      params={"status": "top", "page_size": 100}, timeout=15)
    j3 = r.json()
    add("students?status=top: 200", r.status_code == 200)
    top_items = j3.get("items", [])
    add("students?status=top: all status==top",
        all(s["status"] == "top" for s in top_items))
    add("students?status=top: all cgpa>=9.0",
        all(s["cgpa"] >= 9.0 for s in top_items),
        f"min_cgpa={min((s['cgpa'] for s in top_items), default=None)}")

    # 4) ?status=at_risk
    r = requests.get(f"{BASE}/college/students", headers=H,
                      params={"status": "at_risk", "page_size": 100}, timeout=15)
    j4 = r.json()
    add("students?status=at_risk: 200", r.status_code == 200)
    ar_items = j4.get("items", [])
    add("students?status=at_risk: all (cgpa<7 or attendance<75)",
        all(s["cgpa"] < 7.0 or s["attendance"] < 75 for s in ar_items))

    # 5) ?q=Aarav
    r = requests.get(f"{BASE}/college/students", headers=H,
                      params={"q": "Aarav", "page_size": 100}, timeout=15)
    j5 = r.json()
    add("students?q=Aarav: 200", r.status_code == 200)
    qa_items = j5.get("items", [])
    add("students?q=Aarav: all names contain 'aarav'",
        all("aarav" in s["name"].lower() for s in qa_items)
        and len(qa_items) > 0,
        f"got {len(qa_items)} items")

    # 6) ?page=2&page_size=10
    r = requests.get(f"{BASE}/college/students", headers=H,
                      params={"page": 2, "page_size": 10}, timeout=15)
    j6 = r.json()
    add("students?page=2&size=10: 200", r.status_code == 200)
    add("students?page=2&size=10: 10 items", len(j6.get("items", [])) == 10)
    add("students?page=2&size=10: page=2", j6.get("page") == 2)
    add("students?page=2&size=10: page_size=10", j6.get("page_size") == 10)

    # 7) ?page_size=200 → clamped to 100
    r = requests.get(f"{BASE}/college/students", headers=H,
                      params={"page_size": 200}, timeout=15)
    j7 = r.json()
    add("students?page_size=200: page_size clamped=100",
        j7.get("page_size") == 100,
        f"page_size={j7.get('page_size')}")

    # Sample envelope for report (no filter, default)
    sample = {
        "items[0:2]": j.get("items", [])[:2],
        "total": j.get("total"),
        "page": j.get("page"),
        "page_size": j.get("page_size"),
        "pages": j.get("pages"),
        "filters": j.get("filters"),
    }
    print("\n--- /api/college/students sample (no filter) ---")
    print(json.dumps(sample, indent=2, default=str))


def test_analytics(token: str):
    H = {"Authorization": f"Bearer {token}"}
    r = requests.get(f"{BASE}/college/analytics", headers=H, timeout=15)
    add("analytics: 200", r.status_code == 200, f"status={r.status_code}")
    if r.status_code != 200:
        return
    j = r.json()

    # KPI block
    kpi = j.get("kpi", {})
    add("analytics.kpi.students=120", kpi.get("students") == 120,
        f"got={kpi.get('students')}")
    add("analytics.kpi.placement endswith %",
        isinstance(kpi.get("placement"), str)
        and kpi.get("placement", "").endswith("%"),
        f"placement={kpi.get('placement')}")
    add("analytics.kpi.median_lpa starts ₹",
        isinstance(kpi.get("median_lpa"), str)
        and kpi.get("median_lpa", "").startswith("₹")
        and "LPA" in kpi.get("median_lpa", ""),
        f"median_lpa={kpi.get('median_lpa')}")
    add("analytics.kpi.top_offer starts ₹",
        isinstance(kpi.get("top_offer"), str)
        and kpi.get("top_offer", "").startswith("₹")
        and "LPA" in kpi.get("top_offer", ""),
        f"top_offer={kpi.get('top_offer')}")
    add("analytics.kpi.median_yoy starts ↑/↓",
        isinstance(kpi.get("median_yoy"), str)
        and (kpi.get("median_yoy", "").startswith("↑")
             or kpi.get("median_yoy", "").startswith("↓")),
        f"median_yoy={kpi.get('median_yoy')}")

    # placement_trend: 5 entries [2022..2026]
    pt = j.get("placement_trend", [])
    add("analytics.placement_trend: 5 entries", len(pt) == 5)
    add("analytics.placement_trend: years 2022-2026",
        [e["year"] for e in pt] == [2022, 2023, 2024, 2025, 2026])

    # salary_dist: 5 bands
    sd = j.get("salary_dist", [])
    add("analytics.salary_dist: 5 bands", len(sd) == 5)

    # sectors: 6 entries
    sectors = j.get("sectors", [])
    add("analytics.sectors: 6 entries", len(sectors) == 6)

    # attrition: 3 entries (Top performers / On track / At-risk)
    attr = j.get("attrition", [])
    add("analytics.attrition: 3 entries", len(attr) == 3)
    if len(attr) == 3:
        labels = [a["label"] for a in attr]
        add("analytics.attrition labels match",
            labels == ["Top performers", "On track", "At-risk"],
            f"labels={labels}")

    # top_recruiters: ≤10 entries sorted by hires desc
    tr = j.get("top_recruiters", [])
    add("analytics.top_recruiters: ≤10 entries", len(tr) <= 10,
        f"len={len(tr)}")
    sorted_ok = all(tr[i]["hires"] >= tr[i + 1]["hires"]
                     for i in range(len(tr) - 1))
    add("analytics.top_recruiters: sorted by hires desc", sorted_ok)

    # dept_placement: 7 entries
    dp = j.get("dept_placement", [])
    add("analytics.dept_placement: 7 entries", len(dp) == 7)

    # funnel: 4 stages [Applied → Interviewed → Shortlisted → Offered]
    fn = j.get("funnel", [])
    add("analytics.funnel: 4 stages", len(fn) == 4)
    if len(fn) == 4:
        stages = [s["stage"] for s in fn]
        add("analytics.funnel stages order match",
            stages == ["Applied", "Interviewed", "Shortlisted", "Offered"],
            f"stages={stages}")
        pcts = [s["pct"] for s in fn]
        monotone = all(pcts[i] >= pcts[i + 1] for i in range(len(pcts) - 1))
        add("analytics.funnel pct monotonically decreasing", monotone,
            f"pcts={pcts}")

    print("\n--- /api/college/analytics KPI block ---")
    print(json.dumps(kpi, indent=2, default=str))


def main():
    print(f"Logging in as {EMAIL} ...")
    token = login()
    print("Token acquired.\n")

    print("=== TEST 1: GET /api/college/students ===")
    test_students(token)

    print("\n=== TEST 2: GET /api/college/analytics ===")
    test_analytics(token)

    total = len(results)
    passed = sum(1 for ok, *_ in results if ok)
    print(f"\n========== SUMMARY ==========")
    print(f"PASSED: {passed}/{total}")
    failures = [(name, det) for ok, name, det in results if not ok]
    if failures:
        print("\nFAILURES:")
        for name, det in failures:
            print(f"  - {name}: {det}")
    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
