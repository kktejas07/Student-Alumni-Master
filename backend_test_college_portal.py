"""Backend test for College Portal Phase 3 endpoints."""
import requests
import json
import sys

BASE = "https://hiring-mvvm.preview.emergentagent.com/api"
EMAIL = "realtime@studentalumni.in"
PASSWORD = "RealTime@2026"

results = []
def log(name, passed, detail=""):
    mark = "PASS" if passed else "FAIL"
    print(f"[{mark}] {name}: {detail}")
    results.append((name, passed, detail))


def login():
    r = requests.post(f"{BASE}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=15)
    r.raise_for_status()
    data = r.json()
    return data["access_token"]


def main():
    try:
        token = login()
        print(f"Logged in, token len={len(token)}")
    except Exception as e:
        log("login", False, f"FAILED: {e}")
        return
    H = {"Authorization": f"Bearer {token}"}

    # =========================================================
    # 1) GET /api/college/students defaults
    # =========================================================
    r = requests.get(f"{BASE}/college/students", headers=H, timeout=15)
    log("students default status 200", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        d = r.json()
        log("default items len==20", len(d.get("items", [])) == 20, f"len={len(d.get('items', []))}")
        log("default total==120", d.get("total") == 120, f"total={d.get('total')}")
        log("default page==1", d.get("page") == 1, f"page={d.get('page')}")
        log("default page_size==20", d.get("page_size") == 20, f"page_size={d.get('page_size')}")
        log("default pages==6", d.get("pages") == 6, f"pages={d.get('pages')}")
        # Filters structure
        f = d.get("filters", {})
        log("filters.departments len==7", len(f.get("departments", [])) == 7, f"len={len(f.get('departments', []))}")
        log("filters.years len==5", len(f.get("years", [])) == 5, f"len={len(f.get('years', []))}")
        log("filters.statuses len==3", len(f.get("statuses", [])) == 3, f"len={len(f.get('statuses', []))}")
        # Check item schema
        item = d["items"][0]
        print(f"Sample item: {json.dumps(item, indent=2)}")
        valid_depts = {"CSE", "ECE", "ME", "EEE", "Civil", "Chem", "MBA"}
        valid_years = {"1st", "2nd", "3rd", "4th", "Final"}
        valid_statuses = {"top", "good", "at_risk"}
        schema_ok = True
        schema_errs = []
        for s in d["items"]:
            if not s["id"].startswith("STU-"):
                schema_ok = False; schema_errs.append(f"bad id {s['id']}"); break
            if len(s["initials"]) != 2 or s["initials"] != s["initials"].upper():
                schema_ok = False; schema_errs.append(f"bad initials {s['initials']}"); break
            if s["dept"] not in valid_depts:
                schema_ok = False; schema_errs.append(f"bad dept {s['dept']}"); break
            if s["year"] not in valid_years:
                schema_ok = False; schema_errs.append(f"bad year {s['year']}"); break
            if not (6.5 <= s["cgpa"] <= 9.9):
                schema_ok = False; schema_errs.append(f"bad cgpa {s['cgpa']}"); break
            if not (70 <= s["attendance"] <= 99):
                schema_ok = False; schema_errs.append(f"bad att {s['attendance']}"); break
            if s["status"] not in valid_statuses:
                schema_ok = False; schema_errs.append(f"bad status {s['status']}"); break
            if not isinstance(s["placed"], bool):
                schema_ok = False; schema_errs.append("placed not bool"); break
            if s["placed"]:
                if not (isinstance(s["company"], str) and isinstance(s["package_lpa"], (int, float)) and isinstance(s["sector"], str)):
                    schema_ok = False; schema_errs.append("placed but missing company/pkg/sector"); break
            if not (isinstance(s["color"], str) and s["color"].startswith("#")):
                schema_ok = False; schema_errs.append(f"bad color {s['color']}"); break
        log("default item schema valid", schema_ok, "; ".join(schema_errs) if schema_errs else "all items valid")

    # dept=CSE
    r = requests.get(f"{BASE}/college/students?dept=CSE", headers=H, timeout=15).json()
    ok = all(s["dept"] == "CSE" for s in r["items"])
    log("?dept=CSE filter", ok, f"items={len(r['items'])} total={r['total']}")

    # year=Final
    r = requests.get(f"{BASE}/college/students?year=Final", headers=H, timeout=15).json()
    ok = all(s["year"] == "Final" for s in r["items"])
    log("?year=Final filter", ok, f"items={len(r['items'])} total={r['total']}")

    # status=top
    r = requests.get(f"{BASE}/college/students?status=top", headers=H, timeout=15).json()
    ok = all(s["status"] == "top" and s["cgpa"] >= 9.0 for s in r["items"])
    log("?status=top with cgpa>=9.0", ok, f"items={len(r['items'])} total={r['total']}")

    # status=at_risk
    r = requests.get(f"{BASE}/college/students?status=at_risk", headers=H, timeout=15).json()
    ok = all((s["cgpa"] < 7.0 or s["attendance"] < 75) for s in r["items"])
    log("?status=at_risk (cgpa<7 or att<75)", ok, f"items={len(r['items'])} total={r['total']}")

    # q=Aarav
    r = requests.get(f"{BASE}/college/students?q=Aarav", headers=H, timeout=15).json()
    ok = all("aarav" in s["name"].lower() for s in r["items"])
    log("?q=Aarav case-insensitive", ok, f"items={len(r['items'])} total={r['total']}")

    # page=2&page_size=10
    r = requests.get(f"{BASE}/college/students?page=2&page_size=10", headers=H, timeout=15).json()
    log("?page=2&page_size=10 → 10 items", len(r["items"]) == 10, f"items={len(r['items'])}")
    log("?page=2&page_size=10 → page==2", r["page"] == 2, f"page={r['page']}")
    log("?page=2&page_size=10 → page_size==10", r["page_size"] == 10, f"page_size={r['page_size']}")

    # page=999
    r = requests.get(f"{BASE}/college/students?page=999", headers=H, timeout=15).json()
    log("?page=999 empty items", r["items"] == [], f"items={r['items']}")
    log("?page=999 total still 120", r["total"] == 120, f"total={r['total']}")

    # page_size=200 -> clamp to 100
    r = requests.get(f"{BASE}/college/students?page_size=200", headers=H, timeout=15).json()
    log("?page_size=200 clamped to 100", r["page_size"] == 100, f"page_size={r['page_size']}")

    # =========================================================
    # 2) GET /api/college/students/STU-1001
    # =========================================================
    r = requests.get(f"{BASE}/college/students/STU-1001", headers=H, timeout=15)
    log("detail STU-1001 status 200", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        d = r.json()
        log("detail has student", "student" in d, str(list(d.keys())))
        log("detail has activity", "activity" in d, str(list(d.keys())))
        act = d.get("activity", [])
        log("activity len>=3", len(act) >= 3, f"len={len(act)}")
        act_ok = all(all(k in e for k in ("date", "type", "label")) for e in act)
        log("each activity has date/type/label", act_ok, json.dumps(act[0]) if act else "")

    # 404 for invalid
    r = requests.get(f"{BASE}/college/students/INVALID", headers=H, timeout=15)
    log("detail INVALID → 404", r.status_code == 404, f"status={r.status_code}")

    # =========================================================
    # 3) GET /api/college/analytics
    # =========================================================
    r = requests.get(f"{BASE}/college/analytics", headers=H, timeout=15)
    log("analytics status 200", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        d = r.json()
        # kpi
        kpi = d.get("kpi", {})
        log("kpi.students==120", kpi.get("students") == 120, f"students={kpi.get('students')}")
        log("kpi.placement ends with %", isinstance(kpi.get("placement"), str) and kpi["placement"].endswith("%"), f"placement={kpi.get('placement')}")
        log("kpi.median_lpa starts with ₹", isinstance(kpi.get("median_lpa"), str) and kpi["median_lpa"].startswith("₹"), f"median_lpa={kpi.get('median_lpa')}")
        log("kpi.top_offer starts with ₹", isinstance(kpi.get("top_offer"), str) and kpi["top_offer"].startswith("₹"), f"top_offer={kpi.get('top_offer')}")
        log("kpi.median_yoy starts with arrow", isinstance(kpi.get("median_yoy"), str) and (kpi["median_yoy"].startswith("↑") or kpi["median_yoy"].startswith("↓")), f"median_yoy={kpi.get('median_yoy')}")
        # placement_trend
        pt = d.get("placement_trend", [])
        log("placement_trend len==5", len(pt) == 5, f"len={len(pt)}")
        years = [e["year"] for e in pt]
        log("placement_trend years [2022..2026]", years == [2022, 2023, 2024, 2025, 2026], f"years={years}")
        pt_ok = all("rate" in e and "median_lpa" in e for e in pt)
        log("placement_trend entries have rate/median_lpa", pt_ok, "")
        # salary_dist
        sd = d.get("salary_dist", [])
        log("salary_dist len==5", len(sd) == 5, f"len={len(sd)}")
        sd_ok = all(all(k in e for k in ("band", "count", "pct", "color")) for e in sd)
        log("salary_dist items have band/count/pct/color", sd_ok, "")
        # sectors
        secs = d.get("sectors", [])
        log("sectors len==6", len(secs) == 6, f"len={len(secs)}")
        sec_ok = all(all(k in e for k in ("name", "count", "pct", "color")) for e in secs)
        log("sectors have name/count/pct/color", sec_ok, "")
        # attrition
        at = d.get("attrition", [])
        log("attrition len==3", len(at) == 3, f"len={len(at)}")
        labels = [e["label"] for e in at]
        log("attrition labels [Top performers, On track, At-risk]",
            labels == ["Top performers", "On track", "At-risk"], f"labels={labels}")
        # top_recruiters
        tr = d.get("top_recruiters", [])
        log("top_recruiters <=10", len(tr) <= 10, f"len={len(tr)}")
        sorted_ok = all(tr[i]["hires"] >= tr[i+1]["hires"] for i in range(len(tr)-1))
        log("top_recruiters sorted by hires desc", sorted_ok, "")
        tr_keys_ok = all(all(k in e for k in ("name", "hires", "logo")) for e in tr)
        log("top_recruiters entries have name/hires/logo", tr_keys_ok, "")
        # dept_placement
        dp = d.get("dept_placement", [])
        log("dept_placement len==7", len(dp) == 7, f"len={len(dp)}")
        dp_ok = all(all(k in e for k in ("dept", "total", "placed", "rate", "color")) for e in dp)
        log("dept_placement entries have dept/total/placed/rate/color", dp_ok, "")
        # funnel
        fnl = d.get("funnel", [])
        log("funnel len==4", len(fnl) == 4, f"len={len(fnl)}")
        stages = [e["stage"] for e in fnl]
        log("funnel stages [Applied, Interviewed, Shortlisted, Offered]",
            stages == ["Applied", "Interviewed", "Shortlisted", "Offered"], f"stages={stages}")
        pcts = [e["pct"] for e in fnl]
        mono = all(pcts[i] >= pcts[i+1] for i in range(len(pcts)-1))
        log("funnel pct decreases monotonically", mono, f"pcts={pcts}")
        fnl_ok = all(all(k in e for k in ("count", "pct", "color")) for e in fnl)
        log("funnel entries have count/pct/color", fnl_ok, "")
        # Integrity: kpi.students == sum(dept_placement.total)
        dpsum = sum(e["total"] for e in dp)
        log("kpi.students == sum(dept_placement.total)",
            kpi.get("students") == dpsum, f"kpi={kpi.get('students')}, dpsum={dpsum}")
        # placement_trend[2026].rate == kpi.placement
        last_rate = pt[-1]["rate"]
        kpi_rate = float(kpi["placement"].rstrip("%"))
        log("placement_trend[2026].rate ≈ kpi.placement", abs(last_rate - kpi_rate) < 0.15, f"trend={last_rate}, kpi={kpi_rate}")

    # =========================================================
    # 4) GET /api/college/departments
    # =========================================================
    r = requests.get(f"{BASE}/college/departments", headers=H, timeout=15)
    log("departments status 200", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        d = r.json()
        depts = d.get("departments", [])
        log("departments len==7", len(depts) == 7, f"len={len(depts)}")
        ok = all(all(k in e for k in ("name", "color", "students", "placed", "rate", "median_cgpa")) for e in depts)
        log("departments entries have name/color/students/placed/rate/median_cgpa", ok, f"sample={json.dumps(depts[0]) if depts else ''}")

    # =========================================================
    # 5) GET /api/college/recruiters
    # =========================================================
    r = requests.get(f"{BASE}/college/recruiters", headers=H, timeout=15)
    log("recruiters status 200", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        d = r.json()
        recs = d.get("recruiters", [])
        log("recruiters non-empty", len(recs) > 0, f"len={len(recs)}")
        ok = all(all(k in e for k in ("name", "hires", "min_pkg", "max_pkg", "depts", "logo")) for e in recs)
        log("recruiters entries have name/hires/min_pkg/max_pkg/depts/logo", ok, f"sample={json.dumps(recs[0]) if recs else ''}")
        logo_ok = all(isinstance(e["logo"], str) and len(e["logo"]) == 1 for e in recs)
        log("recruiters logo is single char", logo_ok, "")
        depts_list_ok = all(isinstance(e["depts"], list) for e in recs)
        log("recruiters depts is list", depts_list_ok, "")
        sorted_ok = all(recs[i]["hires"] >= recs[i+1]["hires"] for i in range(len(recs)-1))
        log("recruiters sorted by hires desc", sorted_ok, "")

    # =========================================================
    # EDGE CASES
    # =========================================================
    # No token -> 401
    endpoints = [
        "/college/students",
        "/college/students/STU-1001",
        "/college/analytics",
        "/college/departments",
        "/college/recruiters",
    ]
    for ep in endpoints:
        r = requests.get(f"{BASE}{ep}", timeout=15)
        log(f"auth required ({ep})", r.status_code in (401, 403), f"status={r.status_code}")

    # Summary
    print("\n" + "=" * 60)
    passed = sum(1 for _, p, _ in results if p)
    total = len(results)
    print(f"PASSED: {passed}/{total}")
    if passed < total:
        print("\nFailed tests:")
        for name, p, d in results:
            if not p:
                print(f"  - {name}: {d}")
    return passed == total


if __name__ == "__main__":
    ok = main()
    sys.exit(0 if ok else 1)
