"""
Phase B — Backend tests for Consent + Tour Status APIs.

Verifies:
  • Auth gating (401 without JWT)
  • PUT /api/me/consent semantics (essential always true; accepted_all inference)
  • POST /api/anon/consent (no-auth upsert + validation)
  • PATCH /api/me/tour-status state transitions (completed / replayed / skipped)
  • Cross-user isolation (admin vs student bucket separation)
"""
from __future__ import annotations
import os
import sys
import time
import json
import uuid
import requests

BASE = os.environ.get("BACKEND_URL", "https://hiring-mvvm.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

ADMIN_EMAIL = "admin@careerpath.app"
ADMIN_PW    = "Admin@12345"
STU_EMAIL   = "student01@test.com"
STU_PW      = "TestPass@123"

results: list[tuple[str, bool, str]] = []


def _ok(name: str, cond: bool, detail: str = "") -> None:
    results.append((name, bool(cond), detail))
    flag = "✅" if cond else "❌"
    print(f"{flag} {name} — {detail}")


def login(email: str, password: str) -> str:
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    data = r.json()
    if data.get("requires_2fa"):
        raise RuntimeError(f"{email} has 2FA enabled — disable it for the test.")
    return data["access_token"]


def hdr(tok: str) -> dict:
    return {"Authorization": f"Bearer {tok}"}


# ─────────────────────────────────────────────────────────────────────────
def test_auth_gating() -> None:
    print("\n=== 1. AUTH GATING ===")
    r1 = requests.get(f"{API}/me/consent", timeout=15)
    _ok("GET /me/consent w/o token → 401", r1.status_code == 401, f"got {r1.status_code}")
    r2 = requests.get(f"{API}/me/tour-status", timeout=15)
    _ok("GET /me/tour-status w/o token → 401", r2.status_code == 401, f"got {r2.status_code}")
    r3 = requests.put(f"{API}/me/consent", json={"analytics": True}, timeout=15)
    _ok("PUT /me/consent w/o token → 401", r3.status_code == 401, f"got {r3.status_code}")
    r4 = requests.patch(f"{API}/me/tour-status",
                        json={"tour": "student", "status": "completed"}, timeout=15)
    _ok("PATCH /me/tour-status w/o token → 401", r4.status_code == 401, f"got {r4.status_code}")


def test_admin_consent(admin_tok: str) -> None:
    print("\n=== 2. CONSENT (admin) ===")
    # Initial GET
    r = requests.get(f"{API}/me/consent", headers=hdr(admin_tok), timeout=15)
    _ok("GET /me/consent → 200", r.status_code == 200, f"status {r.status_code}")
    body = r.json()
    _ok("initial GET has 'exists' key", "exists" in body, f"keys={list(body.keys())}")

    # PUT with analytics=true only
    r = requests.put(f"{API}/me/consent",
                     headers=hdr(admin_tok),
                     json={"analytics": True, "functional": False, "marketing": False},
                     timeout=15)
    _ok("PUT analytics-only → 200", r.status_code == 200, f"status {r.status_code}, body={r.text[:200]}")
    body = r.json()
    _ok("essential always true", body.get("essential") is True, str(body.get("essential")))
    _ok("analytics=true echoed", body.get("analytics") is True, str(body.get("analytics")))
    _ok("functional=false echoed", body.get("functional") is False, str(body.get("functional")))
    _ok("marketing=false echoed", body.get("marketing") is False, str(body.get("marketing")))
    _ok("accepted_all=false (not all true)", body.get("accepted_all") is False, str(body.get("accepted_all")))
    _ok("PUT response has exists=true", body.get("exists") is True, str(body.get("exists")))

    # PUT with accepted_all=true → forces all true
    r = requests.put(f"{API}/me/consent",
                     headers=hdr(admin_tok),
                     json={"accepted_all": True},
                     timeout=15)
    _ok("PUT accepted_all=true → 200", r.status_code == 200, f"status {r.status_code}")
    body = r.json()
    _ok("accepted_all=true → all 3 flags true",
        body.get("analytics") and body.get("functional") and body.get("marketing") and body.get("accepted_all") is True,
        f"a={body.get('analytics')} f={body.get('functional')} m={body.get('marketing')} all={body.get('accepted_all')}")

    # PUT with all three optional true → accepted_all inferred true
    r = requests.put(f"{API}/me/consent",
                     headers=hdr(admin_tok),
                     json={"analytics": True, "functional": True, "marketing": True},
                     timeout=15)
    _ok("PUT all three flags=true → 200", r.status_code == 200, f"status {r.status_code}")
    body = r.json()
    _ok("accepted_all inferred=true", body.get("accepted_all") is True, str(body.get("accepted_all")))

    # PUT with only marketing
    r = requests.put(f"{API}/me/consent",
                     headers=hdr(admin_tok),
                     json={"analytics": False, "functional": False, "marketing": True},
                     timeout=15)
    body = r.json()
    _ok("PUT only marketing=true → marketing reflected",
        body.get("marketing") is True and body.get("analytics") is False and body.get("functional") is False,
        json.dumps({k: body.get(k) for k in ("analytics", "functional", "marketing", "accepted_all")}))
    _ok("accepted_all stays false when only marketing", body.get("accepted_all") is False, str(body.get("accepted_all")))

    # Final GET reflects last PUT
    r = requests.get(f"{API}/me/consent", headers=hdr(admin_tok), timeout=15)
    body = r.json()
    _ok("final GET reflects last PUT",
        body.get("marketing") is True and body.get("analytics") is False and body.get("functional") is False,
        json.dumps({k: body.get(k) for k in ("exists", "analytics", "functional", "marketing", "accepted_all")}))


def test_anon_consent() -> None:
    print("\n=== 3. ANONYMOUS CONSENT (no auth) ===")
    anon_id = f"test_anon_b1_{int(time.time())}"

    r = requests.post(f"{API}/anon/consent",
                      json={"anon_id": anon_id, "analytics": True, "functional": False, "marketing": True},
                      timeout=15)
    _ok("POST /anon/consent (no token) → 200", r.status_code == 200, f"status {r.status_code}, body={r.text[:200]}")
    body = r.json() if r.status_code == 200 else {}
    _ok("response.ok=true", body.get("ok") is True, str(body.get("ok")))
    _ok("response.version present", bool(body.get("version")), str(body.get("version")))

    # Upsert with same anon_id, different flags
    r = requests.post(f"{API}/anon/consent",
                      json={"anon_id": anon_id, "analytics": False, "functional": True, "marketing": False},
                      timeout=15)
    _ok("POST /anon/consent upsert (same anon_id) → 200", r.status_code == 200, f"status {r.status_code}")

    # Missing anon_id → 422 (pydantic validation)
    r = requests.post(f"{API}/anon/consent",
                      json={"analytics": True, "functional": True, "marketing": True},
                      timeout=15)
    _ok("POST /anon/consent without anon_id → 422", r.status_code == 422, f"got {r.status_code}")

    # anon_id too short (<8 chars) → 422
    r = requests.post(f"{API}/anon/consent",
                      json={"anon_id": "abc", "analytics": True},
                      timeout=15)
    _ok("POST /anon/consent anon_id<8 chars → 422", r.status_code == 422, f"got {r.status_code}")


def test_tour_admin(admin_tok: str) -> None:
    print("\n=== 4. TOUR STATUS (admin) ===")
    r = requests.get(f"{API}/me/tour-status", headers=hdr(admin_tok), timeout=15)
    _ok("GET /me/tour-status → 200", r.status_code == 200, f"status {r.status_code}")
    body = r.json()
    _ok("response has 'tours' key", "tours" in body, f"keys={list(body.keys())}")
    _ok("tours is dict", isinstance(body.get("tours"), dict), type(body.get("tours")).__name__)

    # super_admin completed step=5
    r = requests.patch(f"{API}/me/tour-status", headers=hdr(admin_tok),
                       json={"tour": "super_admin", "status": "completed", "step": 5},
                       timeout=15)
    _ok("PATCH super_admin completed step=5 → 200", r.status_code == 200, f"status {r.status_code}, body={r.text[:200]}")
    body = r.json()
    sa = (body.get("tours") or {}).get("super_admin", {})
    _ok("super_admin.completed_at set", bool(sa.get("completed_at")), str(sa.get("completed_at")))
    _ok("super_admin.last_step=5", sa.get("last_step") == 5, str(sa.get("last_step")))
    _ok("super_admin.skipped=false", sa.get("skipped") is False, str(sa.get("skipped")))
    replays_before = int(sa.get("replays", 0))

    # super_admin replayed → replays++ (step=0)
    r = requests.patch(f"{API}/me/tour-status", headers=hdr(admin_tok),
                       json={"tour": "super_admin", "status": "replayed", "step": 0},
                       timeout=15)
    _ok("PATCH super_admin replayed step=0 → 200", r.status_code == 200, f"status {r.status_code}")
    body = r.json()
    sa2 = (body.get("tours") or {}).get("super_admin", {})
    _ok("super_admin.replays incremented by 1",
        int(sa2.get("replays", 0)) == replays_before + 1,
        f"before={replays_before} after={sa2.get('replays')}")

    # student tour skipped step=2
    r = requests.patch(f"{API}/me/tour-status", headers=hdr(admin_tok),
                       json={"tour": "student", "status": "skipped", "step": 2},
                       timeout=15)
    _ok("PATCH student skipped step=2 → 200", r.status_code == 200, f"status {r.status_code}")
    body = r.json()
    st = (body.get("tours") or {}).get("student", {})
    _ok("student.skipped=true", st.get("skipped") is True, str(st.get("skipped")))
    _ok("student.completed_at set on skip", bool(st.get("completed_at")), str(st.get("completed_at")))
    _ok("student.last_step=2", st.get("last_step") == 2, str(st.get("last_step")))

    # Invalid tour → 422
    r = requests.patch(f"{API}/me/tour-status", headers=hdr(admin_tok),
                       json={"tour": "garbage", "status": "completed"},
                       timeout=15)
    _ok("PATCH invalid tour → 422", r.status_code == 422, f"got {r.status_code}")

    # Invalid status → 422
    r = requests.patch(f"{API}/me/tour-status", headers=hdr(admin_tok),
                       json={"tour": "student", "status": "garbage"},
                       timeout=15)
    _ok("PATCH invalid status → 422", r.status_code == 422, f"got {r.status_code}")

    # Step out of bounds — step=51 should fail (Field ge=0 le=50)
    r = requests.patch(f"{API}/me/tour-status", headers=hdr(admin_tok),
                       json={"tour": "student", "status": "completed", "step": 51},
                       timeout=15)
    _ok("PATCH step=51 (out of bounds) → 422", r.status_code == 422, f"got {r.status_code}")

    # GET reflects state
    r = requests.get(f"{API}/me/tour-status", headers=hdr(admin_tok), timeout=15)
    body = r.json()
    tours = body.get("tours") or {}
    _ok("GET reflects super_admin entry", "super_admin" in tours, f"keys={list(tours.keys())}")
    _ok("GET reflects student entry", "student" in tours, f"keys={list(tours.keys())}")


def test_cross_user_isolation(admin_tok: str, stu_tok: str) -> None:
    print("\n=== 5. CROSS-USER ISOLATION ===")
    # Snapshot admin
    admin_consent = requests.get(f"{API}/me/consent", headers=hdr(admin_tok), timeout=15).json()
    admin_tours = requests.get(f"{API}/me/tour-status", headers=hdr(admin_tok), timeout=15).json()

    # Student
    stu_consent = requests.get(f"{API}/me/consent", headers=hdr(stu_tok), timeout=15).json()
    stu_tours = requests.get(f"{API}/me/tour-status", headers=hdr(stu_tok), timeout=15).json()

    _ok("student consent doc differs from admin (different id or no doc)",
        stu_consent.get("id") != admin_consent.get("id") or (not stu_consent.get("exists")),
        f"stu.exists={stu_consent.get('exists')} stu.id={stu_consent.get('id')} adm.id={admin_consent.get('id')}")

    # Student PATCH mentor tour — should not affect admin
    stu_patch = requests.patch(f"{API}/me/tour-status", headers=hdr(stu_tok),
                               json={"tour": "mentor", "status": "completed", "step": 3},
                               timeout=15)
    _ok("student PATCH mentor → 200", stu_patch.status_code == 200, f"status {stu_patch.status_code}")
    stu_body = stu_patch.json()
    _ok("student.mentor recorded", bool((stu_body.get("tours") or {}).get("mentor", {}).get("completed_at")),
        str((stu_body.get("tours") or {}).get("mentor")))

    # Re-fetch admin tours — admin should NOT have mentor entry from student's PATCH
    admin_after = requests.get(f"{API}/me/tour-status", headers=hdr(admin_tok), timeout=15).json()
    admin_mentor_before = (admin_tours.get("tours") or {}).get("mentor")
    admin_mentor_after = (admin_after.get("tours") or {}).get("mentor")
    _ok("admin.mentor unchanged after student PATCH",
        admin_mentor_before == admin_mentor_after,
        f"before={admin_mentor_before} after={admin_mentor_after}")

    # Student PUT consent → should not affect admin's consent
    stu_put = requests.put(f"{API}/me/consent", headers=hdr(stu_tok),
                           json={"analytics": True, "functional": True, "marketing": False},
                           timeout=15)
    _ok("student PUT consent → 200", stu_put.status_code == 200, f"status {stu_put.status_code}")
    stu_put_body = stu_put.json()
    _ok("student.analytics=true after PUT", stu_put_body.get("analytics") is True, str(stu_put_body.get("analytics")))

    # Admin re-fetch — should retain its last state
    admin_after_consent = requests.get(f"{API}/me/consent", headers=hdr(admin_tok), timeout=15).json()
    _ok("admin consent doc id unchanged",
        admin_consent.get("id") == admin_after_consent.get("id"),
        f"before={admin_consent.get('id')} after={admin_after_consent.get('id')}")
    # Admin's marketing was set true in test_admin_consent (last PUT was marketing=true only)
    _ok("admin.marketing unchanged by student PUT",
        admin_after_consent.get("marketing") == admin_consent.get("marketing"),
        f"before={admin_consent.get('marketing')} after={admin_after_consent.get('marketing')}")


def main() -> None:
    print(f"BASE = {API}")
    test_auth_gating()

    admin_tok = login(ADMIN_EMAIL, ADMIN_PW)
    print(f"admin token len={len(admin_tok)}")
    stu_tok = login(STU_EMAIL, STU_PW)
    print(f"student token len={len(stu_tok)}")

    test_admin_consent(admin_tok)
    test_anon_consent()
    test_tour_admin(admin_tok)
    test_cross_user_isolation(admin_tok, stu_tok)

    print("\n=== SUMMARY ===")
    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print(f"{passed}/{total} assertions passed")
    fails = [(n, d) for n, ok, d in results if not ok]
    if fails:
        print("\nFAILURES:")
        for n, d in fails:
            print(f"  • {n} — {d}")
        sys.exit(1)
    else:
        print("ALL PASS")


if __name__ == "__main__":
    main()
