#!/usr/bin/env python3
"""
Backend tests for Portal sub-view APIs + Career Intel adapters +
CTA mutation endpoints (portals.py + career_intel.py).

Target base URL: ${EXPO_PUBLIC_BACKEND_URL}/api
"""
from __future__ import annotations

import sys
import time
from typing import Any, Dict, Optional

import requests

BASE = "https://hiring-mvvm.preview.emergentagent.com/api"
TIMEOUT = 30

PASS = []
FAIL = []
WARN = []


def log(kind: str, label: str, detail: str = "") -> None:
    bucket = {"PASS": PASS, "FAIL": FAIL, "WARN": WARN}[kind]
    bucket.append({"label": label, "detail": detail})
    icon = {"PASS": "OK", "FAIL": "FAIL", "WARN": "WARN"}[kind]
    print(f"[{icon}] {label}" + (f"  —  {detail}" if detail else ""))


def get(path: str, **params) -> requests.Response:
    return requests.get(f"{BASE}{path}", params=params, timeout=TIMEOUT)


def post(path: str, **kwargs) -> requests.Response:
    return requests.post(f"{BASE}{path}", timeout=TIMEOUT, **kwargs)


def expect_200(path: str, label: str) -> Optional[Dict[str, Any]]:
    try:
        r = get(path)
    except Exception as e:
        log("FAIL", label, f"exception {type(e).__name__}: {e}")
        return None
    if r.status_code != 200:
        log("FAIL", label, f"status={r.status_code} body={r.text[:200]}")
        return None
    try:
        data = r.json()
    except Exception:
        log("FAIL", label, "non-JSON response")
        return None
    return data


# ── DASHBOARDS ─────────────────────────────────────────
def test_student_dashboard():
    d = expect_200("/student/dashboard", "GET /student/dashboard")
    if not d:
        return
    need = {"student", "kpis", "topMatches", "recommendedMentors", "upcomingEvents"}
    missing = need - set(d.keys())
    if missing:
        log("FAIL", "student/dashboard shape", f"missing: {missing}")
        return
    kpi_count = len(d.get("kpis") or [])
    if kpi_count != 4:
        log("FAIL", "student/dashboard kpis=4", f"got {kpi_count}")
    else:
        log("PASS", "GET /student/dashboard",
            f"4 KPIs, topMatches={len(d.get('topMatches', []))}, "
            f"mentors={len(d.get('recommendedMentors', []))}, "
            f"events={len(d.get('upcomingEvents', []))}")


def test_mentor_dashboard():
    d = expect_200("/mentor/dashboard", "GET /mentor/dashboard")
    if not d:
        return
    need = {"mentor", "kpis", "todaySessions", "monthly"}
    missing = need - set(d.keys())
    if missing:
        log("FAIL", "mentor/dashboard shape", f"missing: {missing}")
        return
    if len(d.get("kpis") or []) != 4:
        log("FAIL", "mentor/dashboard kpis=4", f"got {len(d['kpis'])}")
    else:
        log("PASS", "GET /mentor/dashboard",
            f"4 KPIs, today={len(d.get('todaySessions', []))}, monthly={len(d.get('monthly', []))}")


def test_college_stats():
    d = expect_200("/admin/college-stats", "GET /admin/college-stats")
    if not d:
        return
    need = {"college", "kpis", "deptPlacement", "recentActivity", "upcomingEvents", "topRecruiters"}
    missing = need - set(d.keys())
    if missing:
        log("FAIL", "admin/college-stats shape", f"missing: {missing}")
        return
    if len(d.get("kpis") or []) != 4:
        log("FAIL", "college-stats kpis=4", f"got {len(d['kpis'])}")
    else:
        log("PASS", "GET /admin/college-stats",
            f"4 KPIs, depts={len(d['deptPlacement'])}, activity={len(d['recentActivity'])}")


def test_super_overview():
    d = expect_200("/admin/super-overview", "GET /admin/super-overview")
    if not d:
        return
    need = {"admin", "kpis", "recentActivity", "platformUsers", "monthlyEnrollments", "revenueBreakdown"}
    missing = need - set(d.keys())
    if missing:
        log("FAIL", "super-overview shape", f"missing: {missing}")
        return
    if len(d.get("kpis") or []) != 8:
        log("FAIL", "super-overview kpis=8", f"got {len(d['kpis'])}")
    else:
        log("PASS", "GET /admin/super-overview",
            f"8 KPIs, platformUsers={len(d['platformUsers'])}, months={len(d['monthlyEnrollments'])}")


# ── SUPER ADMIN SUB-VIEWS ──────────────────────────────
def test_super_colleges():
    d = expect_200("/admin/super/colleges", "GET /admin/super/colleges")
    if not d:
        return
    items = d.get("items") or []
    if len(items) < 5:
        log("FAIL", "super/colleges items>=5", f"got {len(items)}")
    else:
        log("PASS", "GET /admin/super/colleges", f"{len(items)} items, total={d.get('total')}")


def test_super_students():
    d = expect_200("/admin/super/students", "GET /admin/super/students")
    if not d:
        return
    stats = d.get("stats") or {}
    need = {"total", "active", "placement_ready", "at_risk"}
    missing = need - set(stats.keys())
    if missing:
        log("FAIL", "super/students stats keys", f"missing: {missing}")
    elif not d.get("items"):
        log("FAIL", "super/students items", "empty")
    else:
        log("PASS", "GET /admin/super/students",
            f"items={len(d['items'])}, total={stats['total']}, placement_ready={stats['placement_ready']}")


def test_super_mentors_all():
    d = expect_200("/admin/super/mentors", "GET /admin/super/mentors")
    if not d:
        return None
    counts = d.get("counts") or {}
    need = {"all", "active", "pending"}
    if not need.issubset(counts.keys()):
        log("FAIL", "super/mentors counts keys", f"got {list(counts.keys())}")
        return d
    if counts.get("pending", 0) <= 0:
        log("WARN", "super/mentors pending>0", f"got {counts.get('pending')}")
    else:
        log("PASS", "GET /admin/super/mentors",
            f"all={counts['all']}, active={counts['active']}, pending={counts['pending']}")
    return d


def test_super_mentors_pending():
    d = expect_200("/admin/super/mentors?status=pending", "GET /admin/super/mentors?status=pending")
    if not d:
        return None
    items = d.get("items") or []
    bad = [x for x in items if x.get("status") != "pending"]
    if bad:
        log("FAIL", "super/mentors pending filter", f"{len(bad)}/{len(items)} non-pending")
    else:
        log("PASS", "GET /admin/super/mentors?status=pending", f"{len(items)} pending items")
    return d


def test_super_alumni():
    d = expect_200("/admin/super/alumni", "GET /admin/super/alumni")
    if not d:
        return
    stats = d.get("stats") or {}
    need = {"verified", "donations_ytd", "companies", "countries"}
    missing = need - set(stats.keys())
    if missing:
        log("FAIL", "super/alumni stats", f"missing: {missing}")
    else:
        log("PASS", "GET /admin/super/alumni",
            f"verified={stats['verified']}, companies={stats['companies']}, items={len(d.get('items', []))}")


def test_super_events():
    d = expect_200("/admin/super/events", "GET /admin/super/events")
    if not d:
        return None
    items = d.get("items") or []
    if not items:
        log("FAIL", "super/events items", "empty")
    else:
        log("PASS", "GET /admin/super/events", f"{len(items)} events")
    return d


def test_super_payments():
    d = expect_200("/admin/super/payments", "GET /admin/super/payments")
    if not d:
        return
    need = {"kpi", "ledger", "stripe_balance", "tiers"}
    if not need.issubset(d.keys()):
        log("FAIL", "super/payments shape", f"missing: {need - set(d.keys())}")
        return
    kpi = d["kpi"]
    if not {"gross", "payouts", "pending", "net"}.issubset(kpi.keys()):
        log("FAIL", "super/payments kpi keys", f"got {list(kpi.keys())}")
    else:
        log("PASS", "GET /admin/super/payments",
            f"gross={kpi['gross']}, ledger={len(d['ledger'])}, tiers={len(d['tiers'])}")


def test_super_approvals():
    d = expect_200("/admin/super/approvals", "GET /admin/super/approvals")
    if not d:
        return None
    counts = d.get("counts") or {}
    need = {"all", "college", "mentor", "event"}
    if not need.issubset(counts.keys()):
        log("FAIL", "super/approvals counts keys", f"missing: {need - set(counts.keys())}")
        return d
    mcount = counts.get("mentor", 0)
    ccount = counts.get("college", 0)
    msgs = []
    if mcount < 6:
        log("WARN", "super/approvals mentor>=6", f"got {mcount}")
    if ccount < 4:
        log("WARN", "super/approvals college>=4", f"got {ccount}")
    log("PASS", "GET /admin/super/approvals",
        f"mentor={mcount}, college={ccount}, event={counts.get('event')}, all={counts.get('all')}")
    return d


def test_super_analytics():
    d = expect_200("/admin/super/analytics", "GET /admin/super/analytics")
    if not d:
        return
    need = {"growth", "retention", "funnel", "ab"}
    if not need.issubset(d.keys()):
        log("FAIL", "super/analytics shape", f"missing: {need - set(d.keys())}")
    else:
        log("PASS", "GET /admin/super/analytics",
            f"growth={len(d['growth'])}, retention={len(d['retention'])}, funnel={len(d['funnel'])}, ab={len(d['ab'])}")


def test_super_ai_insights():
    d = expect_200("/admin/super/ai-insights", "GET /admin/super/ai-insights")
    if not d:
        return None
    items = d.get("items") or []
    if len(items) != 6:
        log("WARN", "super/ai-insights count=6", f"got {len(items)}")
    else:
        log("PASS", "GET /admin/super/ai-insights", f"6 insights")
    return d


def test_super_workflows():
    d = expect_200("/admin/super/workflows", "GET /admin/super/workflows")
    if not d:
        return None
    items = d.get("items") or []
    if len(items) != 6:
        log("WARN", "super/workflows count=6", f"got {len(items)}")
    else:
        log("PASS", "GET /admin/super/workflows", f"6 workflows")
    return d


# ── COLLEGE ─────────────────────────────────────────────
def test_college_students():
    d = expect_200("/college/students", "GET /college/students")
    if not d:
        return
    if not d.get("items"):
        log("FAIL", "college/students items", "empty")
    else:
        log("PASS", "GET /college/students", f"{len(d['items'])} students, college={d.get('college')}")


def test_college_placements():
    d = expect_200("/college/placements", "GET /college/placements")
    if not d:
        return
    stages = d.get("stages") or {}
    need = {"shortlisted", "interviewing", "offered", "joined"}
    if not need.issubset(stages.keys()):
        log("FAIL", "college/placements stages", f"missing: {need - set(stages.keys())}")
    else:
        log("PASS", "GET /college/placements",
            f"shortlisted={len(stages['shortlisted'])}, interviewing={len(stages['interviewing'])}, "
            f"offered={len(stages['offered'])}, joined={len(stages['joined'])}")


def test_college_ai_insights():
    d = expect_200("/college/ai-insights", "GET /college/ai-insights")
    if not d:
        return
    items = d.get("items") or []
    if len(items) != 6:
        log("WARN", "college/ai-insights count=6", f"got {len(items)}")
    else:
        log("PASS", "GET /college/ai-insights", f"6 insights")


# ── STUDENT ─────────────────────────────────────────────
def test_student_internships():
    d = expect_200("/student/internships", "GET /student/internships")
    if not d:
        return
    items = d.get("items") or []
    if len(items) < 10:
        log("WARN", "student/internships items>=10", f"got {len(items)} (spec says 20)")
    else:
        log("PASS", "GET /student/internships", f"{len(items)} items")


def test_student_wallet():
    d = expect_200("/student/wallet", "GET /student/wallet")
    if not d:
        return None
    need = {"balance", "refer_earn", "tx"}
    if not need.issubset(d.keys()):
        log("FAIL", "student/wallet shape", f"missing: {need - set(d.keys())}")
        return d
    tx = d.get("tx") or []
    if not tx:
        log("FAIL", "student/wallet tx populated", f"tx empty (balance={d.get('balance')})")
    else:
        log("PASS", "GET /student/wallet", f"balance={d['balance']}, tx={len(tx)}")
    return d


def test_student_network():
    d = expect_200("/student/network", "GET /student/network")
    if not d:
        return
    items = d.get("items") or []
    kinds = {x.get("kind") for x in items}
    if not items:
        log("FAIL", "student/network items", "empty")
    elif "alumni" not in kinds or "student" not in kinds:
        log("WARN", "student/network mix", f"kinds={kinds}")
    else:
        log("PASS", "GET /student/network", f"{len(items)} items, kinds={kinds}")


# ── CAREER INTEL ─────────────────────────────────────────
def test_career_intel_jobs():
    d = expect_200("/career-intel/jobs", "GET /career-intel/jobs")
    if not d:
        return
    issues = []
    if not d.get("_mocked"):
        issues.append("_mocked not true")
    if d.get("source") != "linkedin":
        issues.append(f"source={d.get('source')}")
    if not d.get("items"):
        issues.append("items empty")
    if issues:
        log("FAIL", "career-intel/jobs", "; ".join(issues))
    else:
        log("PASS", "GET /career-intel/jobs", f"items={len(d['items'])}, _mocked={d['_mocked']}")


def test_career_intel_internships():
    d = expect_200("/career-intel/internships", "GET /career-intel/internships")
    if not d:
        return
    if d.get("source") != "internshala" or not d.get("items"):
        log("FAIL", "career-intel/internships", f"source={d.get('source')}, items={len(d.get('items',[]))}")
    else:
        log("PASS", "GET /career-intel/internships", f"items={len(d['items'])}, _mocked={d.get('_mocked')}")


def test_career_intel_scholarships():
    d = expect_200("/career-intel/scholarships", "GET /career-intel/scholarships")
    if not d:
        return
    if d.get("source") != "buddy4study" or not d.get("items"):
        log("FAIL", "career-intel/scholarships", f"source={d.get('source')}, items={len(d.get('items',[]))}")
    else:
        log("PASS", "GET /career-intel/scholarships", f"items={len(d['items'])}")


def test_career_intel_summary():
    d = expect_200("/career-intel/intel-summary", "GET /career-intel/intel-summary")
    if not d:
        return
    sources = d.get("sources") or []
    if len(sources) != 3:
        log("FAIL", "intel-summary sources=3", f"got {len(sources)}")
    else:
        names = [s.get("name") for s in sources]
        log("PASS", "GET /career-intel/intel-summary", f"sources={names}")


# ── MUTATIONS ────────────────────────────────────────────
def test_wallet_topup():
    before = get("/student/wallet").json()
    before_tx = len(before.get("tx") or [])

    r = post("/student/wallet/topup", json={"amount": 500})
    if r.status_code != 200:
        log("FAIL", "POST /student/wallet/topup", f"status={r.status_code} body={r.text[:200]}")
        return
    d = r.json()
    if not d.get("ok") or not str(d.get("tx_id", "")).startswith("TX-"):
        log("FAIL", "wallet/topup response shape", f"got {d}")
        return
    log("PASS", "POST /student/wallet/topup amount=500",
        f"tx_id={d['tx_id']}, new_balance={d.get('new_balance')}")

    time.sleep(0.3)
    after = get("/student/wallet").json()
    after_tx = len(after.get("tx") or [])
    if after_tx < before_tx + 1:
        log("FAIL", "wallet/topup tx persisted", f"before={before_tx}, after={after_tx}")
    else:
        log("PASS", "wallet/topup tx persisted", f"{before_tx} → {after_tx}")


def test_wallet_topup_edge():
    r = post("/student/wallet/topup", json={"amount": 0})
    if r.status_code != 400:
        log("FAIL", "topup amount=0 → 400", f"got {r.status_code}")
    else:
        log("PASS", "POST topup amount=0 → 400", f"status={r.status_code}")

    r = post("/student/wallet/topup", json={"amount": -5})
    if r.status_code != 400:
        log("FAIL", "topup amount=-5 → 400", f"got {r.status_code}")
    else:
        log("PASS", "POST topup amount=-5 → 400", f"status={r.status_code}")


def test_workflow_toggle(wf_data):
    if not wf_data or not wf_data.get("items"):
        log("FAIL", "workflow toggle — setup", "no workflows")
        return
    wf = wf_data["items"][0]
    wf_id = wf.get("id")
    initial = bool(wf.get("on", False))

    r = post(f"/admin/super/workflows/{wf_id}/toggle")
    if r.status_code != 200:
        log("FAIL", "POST /workflows/{id}/toggle", f"status={r.status_code} body={r.text[:200]}")
        return
    d = r.json()
    new1 = d.get("on")
    if not d.get("ok") or new1 == initial:
        log("FAIL", "workflow toggle flip", f"initial={initial}, got {d}")
        return
    log("PASS", "POST /admin/super/workflows/{id}/toggle #1", f"{initial} → {new1}")

    r2 = post(f"/admin/super/workflows/{wf_id}/toggle")
    if r2.status_code != 200 or r2.json().get("on") != initial:
        log("FAIL", "workflow toggle #2 flip-back",
            f"status={r2.status_code}, body={r2.text[:200]}")
    else:
        log("PASS", "POST /admin/super/workflows/{id}/toggle #2", f"{new1} → {initial}")


def test_workflow_invalid():
    r = post("/admin/super/workflows/garbage/toggle")
    if r.status_code not in (400, 404):
        log("FAIL", "workflow toggle invalid id", f"expected 400/404, got {r.status_code}")
    else:
        log("PASS", "POST workflow toggle invalid → 400/404", f"status={r.status_code}")


def test_insight_dismiss(ai_data):
    if not ai_data or not ai_data.get("items"):
        log("FAIL", "insight dismiss — setup", "no insights")
        return
    insight = ai_data["items"][0]
    iid = insight.get("id")

    r = post(f"/admin/super/ai-insights/{iid}/dismiss")
    if r.status_code != 200 or not r.json().get("ok"):
        log("FAIL", "POST /ai-insights/{id}/dismiss",
            f"status={r.status_code} body={r.text[:200]}")
        return
    log("PASS", "POST /admin/super/ai-insights/{id}/dismiss", f"id={iid}")

    after = get("/admin/super/ai-insights").json()
    ids = [x.get("id") for x in (after.get("items") or [])]
    if iid in ids:
        log("FAIL", "insight excluded after dismiss", "still present")
    else:
        log("PASS", "insight excluded after dismiss",
            f"before {len(ai_data['items'])} → after {len(after.get('items', []))}")


def test_mentor_approve_reject(pending_data):
    if not pending_data or len(pending_data.get("items", [])) < 2:
        log("FAIL", "mentor approve/reject — setup", "need >=2 pending mentors")
        return
    items = pending_data["items"]
    to_approve = items[0]
    to_reject = items[1]
    before_pending = len(items)

    r = post(f"/admin/super/approvals/{to_approve['id']}/approve")
    if r.status_code != 200:
        log("FAIL", "POST /approvals/{id}/approve", f"status={r.status_code} body={r.text[:200]}")
        return
    d = r.json()
    if not d.get("ok") or d.get("kind") != "mentor":
        log("FAIL", "approve response shape", f"got {d}")
    else:
        log("PASS", "POST /admin/super/approvals/{id}/approve", f"kind={d['kind']}")

    r2 = post(f"/admin/super/approvals/{to_reject['id']}/reject")
    if r2.status_code != 200 or not r2.json().get("ok"):
        log("FAIL", "POST /approvals/{id}/reject",
            f"status={r2.status_code} body={r2.text[:200]}")
    else:
        log("PASS", "POST /admin/super/approvals/{id}/reject", "ok=true")

    time.sleep(0.3)
    after = get("/admin/super/mentors", status="pending").json()
    after_pending = len(after.get("items") or [])
    if after_pending >= before_pending:
        log("FAIL", "pending count decreased", f"before={before_pending}, after={after_pending}")
    else:
        log("PASS", "pending count decreased", f"{before_pending} → {after_pending}")


def test_approve_invalid():
    r = post("/admin/super/approvals/garbage/approve")
    if r.status_code not in (400, 404):
        log("FAIL", "approve invalid id", f"expected 400/404, got {r.status_code}")
    else:
        log("PASS", "POST approve invalid → 400/404", f"status={r.status_code}")


def test_event_rsvp(events_data):
    if not events_data or not events_data.get("items"):
        log("FAIL", "event RSVP — setup", "no events")
        return
    ev_id = events_data["items"][0].get("id")

    r = post(f"/student/events/{ev_id}/rsvp")
    if r.status_code != 200 or not r.json().get("ok"):
        log("FAIL", "POST /events/{id}/rsvp #1",
            f"status={r.status_code} body={r.text[:200]}")
        return
    d = r.json()
    log("PASS", "POST /student/events/{id}/rsvp #1",
        f"registered={d.get('registered')} already={d.get('already')}")

    r2 = post(f"/student/events/{ev_id}/rsvp")
    if r2.status_code != 200:
        log("FAIL", "rsvp #2", f"status={r2.status_code}")
        return
    d2 = r2.json()
    if not d2.get("already"):
        log("FAIL", "rsvp #2 already=true", f"got {d2}")
    else:
        log("PASS", "POST /events/{id}/rsvp #2", f"already=true")


# ── MAIN ────────────────────────────────────────────────
def main() -> int:
    print(f"\n━━━ Backend tests against {BASE} ━━━\n")

    print("\n--- DASHBOARDS ---")
    test_student_dashboard()
    test_mentor_dashboard()
    test_college_stats()
    test_super_overview()

    print("\n--- SUPER ADMIN SUB-VIEWS ---")
    test_super_colleges()
    test_super_students()
    test_super_mentors_all()
    pending_data = test_super_mentors_pending()
    test_super_alumni()
    events_data = test_super_events()
    test_super_payments()
    test_super_approvals()
    test_super_analytics()
    ai_data = test_super_ai_insights()
    wf_data = test_super_workflows()

    print("\n--- COLLEGE SUB-VIEWS ---")
    test_college_students()
    test_college_placements()
    test_college_ai_insights()

    print("\n--- STUDENT SUB-VIEWS ---")
    test_student_internships()
    test_student_wallet()
    test_student_network()

    print("\n--- CAREER INTEL (mocked) ---")
    test_career_intel_jobs()
    test_career_intel_internships()
    test_career_intel_scholarships()
    test_career_intel_summary()

    print("\n--- MUTATIONS ---")
    test_wallet_topup()
    test_wallet_topup_edge()
    test_workflow_toggle(wf_data)
    test_workflow_invalid()
    test_insight_dismiss(ai_data)
    test_mentor_approve_reject(pending_data)
    test_approve_invalid()
    test_event_rsvp(events_data)

    print("\n━━━ SUMMARY ━━━")
    print(f"  PASS: {len(PASS)}")
    print(f"  WARN: {len(WARN)}")
    print(f"  FAIL: {len(FAIL)}")
    if FAIL:
        print("\n  FAILURES:")
        for f in FAIL:
            print(f"    [FAIL] {f['label']}: {f['detail']}")
    if WARN:
        print("\n  WARNINGS:")
        for w in WARN:
            print(f"    [WARN] {w['label']}: {w['detail']}")

    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
