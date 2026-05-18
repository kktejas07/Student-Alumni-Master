"""
backend_test.py — Phase C: Promotional Banners API tests.

Covers:
  - Auth gating (401 unauthenticated, 403 non-admin)
  - POST create (full payload, validation 422)
  - GET /admin/promotions (list ALL)
  - GET /promotions/active (audience-filter, time-bounded)
  - PATCH (partial update; audience/time/is_active)
  - DELETE (404 missing)
  - Cleanup
"""
import sys
import requests

BASE = "http://localhost:8001/api"

ADMIN = ("admin@careerpath.app", "Admin@12345")
STUDENT = ("student01@test.com", "TestPass@123")

PASSES = 0
FAILS = 0
CREATED_IDS = []


def _print(ok: bool, label: str, detail: str = ""):
    global PASSES, FAILS
    if ok:
        PASSES += 1
        print(f"  ✅ {label}" + (f" — {detail}" if detail else ""))
    else:
        FAILS += 1
        print(f"  ❌ {label}" + (f" — {detail}" if detail else ""))


def login(email: str, password: str) -> str:
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": password}, timeout=15)
    r.raise_for_status()
    body = r.json()
    if "access_token" not in body:
        raise RuntimeError(f"login did not return token: {body}")
    return body["access_token"]


def H(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def section(title: str):
    print(f"\n== {title} ==")


def main():
    global CREATED_IDS
    section("Login")
    admin_token = login(*ADMIN)
    _print(True, "admin login OK")
    student_token = login(*STUDENT)
    _print(True, "student login OK")

    # 1. AUTH GATING
    section("1. Auth gating")
    r = requests.get(f"{BASE}/promotions/active", timeout=15)
    _print(r.status_code == 401, f"GET /promotions/active without token → {r.status_code} (expect 401)")

    r = requests.get(f"{BASE}/admin/promotions", headers=H(student_token), timeout=15)
    _print(r.status_code == 403, f"GET /admin/promotions as student → {r.status_code} (expect 403)")

    r = requests.post(f"{BASE}/admin/promotions", headers=H(student_token),
                      json={"title": "Should fail", "body": "x"}, timeout=15)
    _print(r.status_code == 403, f"POST /admin/promotions as student → {r.status_code} (expect 403)")

    r = requests.patch(f"{BASE}/admin/promotions/000000000000000000000000",
                       headers=H(student_token), json={"title": "x"}, timeout=15)
    _print(r.status_code == 403, f"PATCH /admin/promotions/<id> as student → {r.status_code} (expect 403)")

    r = requests.delete(f"{BASE}/admin/promotions/000000000000000000000000",
                        headers=H(student_token), timeout=15)
    _print(r.status_code == 403, f"DELETE /admin/promotions/<id> as student → {r.status_code} (expect 403)")

    # 2. CREATE
    section("2. Create")
    payload = {
        "title": "Year-end placement drive",
        "body": "Top employers — apply by Friday",
        "cta_label": "Apply",
        "cta_url": "/super-admin/imports",
        "tone": "violet",
        "audience": ["student", "alumni"],
        "dismissible": True,
        "is_active": True,
        "display_order": 10,
        "badge": "NEW",
        "placement": "dashboard",
    }
    r = requests.post(f"{BASE}/admin/promotions", headers=H(admin_token), json=payload, timeout=15)
    _print(r.status_code == 200, f"POST /admin/promotions → {r.status_code}",
           r.text[:200] if r.status_code != 200 else "")
    created = r.json() if r.status_code == 200 else {}
    promo_id = created.get("id")
    if promo_id:
        CREATED_IDS.append(promo_id)

    for k in ["title", "body", "cta_label", "cta_url", "tone", "audience",
              "dismissible", "is_active", "display_order", "badge", "placement"]:
        _print(created.get(k) == payload[k], f"create echo: {k} = {created.get(k)!r}")
    _print(bool(promo_id), f"create returns id: {promo_id}")
    _print(bool(created.get("created_at")), f"create returns created_at: {created.get('created_at')}")
    _print(bool(created.get("updated_at")), f"create returns updated_at: {created.get('updated_at')}")

    # 3. LIST (admin)
    section("3. List /admin/promotions")
    r = requests.get(f"{BASE}/admin/promotions", headers=H(admin_token), timeout=15)
    _print(r.status_code == 200, f"GET /admin/promotions → {r.status_code}")
    items = (r.json() or {}).get("items", [])
    _print(any(p.get("id") == promo_id for p in items), f"list contains created promo id={promo_id}")

    # 4. AUDIENCE FILTERING
    section("4. Audience filtering on /promotions/active")
    r = requests.get(f"{BASE}/promotions/active", headers=H(admin_token), timeout=15)
    _print(r.status_code == 200, f"GET /promotions/active as admin → {r.status_code}")
    body = r.json() or {}
    active_admin = body.get("items", [])
    role_seen = body.get("role")
    _print(role_seen == "super_admin", f"role in payload = {role_seen!r} (expect 'super_admin')")
    _print(not any(p.get("id") == promo_id for p in active_admin),
           f"admin should NOT see promo (audience=student/alumni)")

    r = requests.patch(f"{BASE}/admin/promotions/{promo_id}",
                       headers=H(admin_token), json={"audience": ["all"]}, timeout=15)
    _print(r.status_code == 200, f"PATCH audience=['all'] → {r.status_code}")
    _print(r.json().get("audience") == ["all"], f"audience echoed = {r.json().get('audience')}")

    r = requests.get(f"{BASE}/promotions/active", headers=H(admin_token), timeout=15)
    active_admin = (r.json() or {}).get("items", [])
    _print(any(p.get("id") == promo_id for p in active_admin), "admin sees promo after audience=['all']")

    r = requests.get(f"{BASE}/promotions/active", headers=H(student_token), timeout=15)
    active_stu = (r.json() or {}).get("items", [])
    _print(any(p.get("id") == promo_id for p in active_stu), "student sees promo when audience=['all']")

    r = requests.patch(f"{BASE}/admin/promotions/{promo_id}",
                       headers=H(admin_token), json={"audience": ["super_admin"]}, timeout=15)
    _print(r.status_code == 200, f"PATCH audience=['super_admin'] → {r.status_code}")

    r = requests.get(f"{BASE}/promotions/active", headers=H(student_token), timeout=15)
    active_stu = (r.json() or {}).get("items", [])
    _print(not any(p.get("id") == promo_id for p in active_stu),
           "student should NOT see promo after audience=['super_admin']")

    r = requests.get(f"{BASE}/promotions/active", headers=H(admin_token), timeout=15)
    active_admin = (r.json() or {}).get("items", [])
    _print(any(p.get("id") == promo_id for p in active_admin),
           "admin still sees promo for audience=['super_admin']")

    requests.patch(f"{BASE}/admin/promotions/{promo_id}", headers=H(admin_token),
                   json={"audience": ["all"]}, timeout=15)

    # 5. TIME BOUNDS
    section("5. Time bounds")
    r = requests.patch(f"{BASE}/admin/promotions/{promo_id}", headers=H(admin_token),
                       json={"starts_at": "2099-01-01T00:00:00Z"}, timeout=15)
    _print(r.status_code == 200, f"PATCH starts_at=2099 → {r.status_code}")
    r = requests.get(f"{BASE}/promotions/active", headers=H(admin_token), timeout=15)
    active = (r.json() or {}).get("items", [])
    _print(not any(p.get("id") == promo_id for p in active),
           "promo hidden when starts_at in the future")

    r = requests.patch(f"{BASE}/admin/promotions/{promo_id}", headers=H(admin_token),
                       json={"starts_at": None, "ends_at": "2000-01-01T00:00:00Z"}, timeout=15)
    _print(r.status_code == 200, f"PATCH starts_at=null, ends_at=2000 → {r.status_code}")
    r = requests.get(f"{BASE}/promotions/active", headers=H(admin_token), timeout=15)
    active = (r.json() or {}).get("items", [])
    _print(not any(p.get("id") == promo_id for p in active),
           "promo hidden when ends_at in the past")

    r = requests.patch(f"{BASE}/admin/promotions/{promo_id}", headers=H(admin_token),
                       json={"starts_at": None, "ends_at": None}, timeout=15)
    _print(r.status_code == 200, f"PATCH both null → {r.status_code}")
    r = requests.get(f"{BASE}/promotions/active", headers=H(admin_token), timeout=15)
    active = (r.json() or {}).get("items", [])
    _print(any(p.get("id") == promo_id for p in active),
           "promo visible after clearing time bounds")

    # 6. ACTIVE TOGGLE
    section("6. Active toggle")
    r = requests.patch(f"{BASE}/admin/promotions/{promo_id}", headers=H(admin_token),
                       json={"is_active": False}, timeout=15)
    _print(r.status_code == 200, f"PATCH is_active=false → {r.status_code}")
    r = requests.get(f"{BASE}/promotions/active", headers=H(admin_token), timeout=15)
    active = (r.json() or {}).get("items", [])
    _print(not any(p.get("id") == promo_id for p in active),
           "promo hidden when is_active=false")

    r = requests.get(f"{BASE}/admin/promotions", headers=H(admin_token), timeout=15)
    all_items = (r.json() or {}).get("items", [])
    _print(any(p.get("id") == promo_id for p in all_items),
           "inactive promo still in /admin/promotions")

    r = requests.patch(f"{BASE}/admin/promotions/{promo_id}", headers=H(admin_token),
                       json={"is_active": True}, timeout=15)
    _print(r.status_code == 200, f"PATCH is_active=true → {r.status_code}")
    r = requests.get(f"{BASE}/promotions/active", headers=H(admin_token), timeout=15)
    active = (r.json() or {}).get("items", [])
    _print(any(p.get("id") == promo_id for p in active),
           "promo visible after is_active=true")

    # 7. VALIDATION
    section("7. Validation")
    bad = {**payload, "title": "Bad tone", "tone": "garbage"}
    r = requests.post(f"{BASE}/admin/promotions", headers=H(admin_token), json=bad, timeout=15)
    _print(r.status_code == 422, f"POST tone='garbage' → {r.status_code} (expect 422)")

    bad = {**payload, "title": "Bad placement", "placement": "bogus"}
    r = requests.post(f"{BASE}/admin/promotions", headers=H(admin_token), json=bad, timeout=15)
    _print(r.status_code == 422, f"POST placement='bogus' → {r.status_code} (expect 422)")

    bad = {**payload, "title": "Bad audience", "audience": ["alien"]}
    r = requests.post(f"{BASE}/admin/promotions", headers=H(admin_token), json=bad, timeout=15)
    _print(r.status_code == 422, f"POST audience=['alien'] → {r.status_code} (expect 422)")

    r = requests.patch(f"{BASE}/admin/promotions/not-an-objectid", headers=H(admin_token),
                       json={"title": "x"}, timeout=15)
    _print(r.status_code in (400, 404), f"PATCH bad id → {r.status_code} (expect 400 or 404)")

    r = requests.patch(f"{BASE}/admin/promotions/000000000000000000000000", headers=H(admin_token),
                       json={"title": "x"}, timeout=15)
    _print(r.status_code == 404, f"PATCH non-existent ObjectId → {r.status_code} (expect 404)")

    r = requests.delete(f"{BASE}/admin/promotions/000000000000000000000000",
                        headers=H(admin_token), timeout=15)
    _print(r.status_code == 404, f"DELETE non-existent id → {r.status_code} (expect 404)")

    r = requests.delete(f"{BASE}/admin/promotions/not-an-objectid",
                        headers=H(admin_token), timeout=15)
    _print(r.status_code in (400, 404), f"DELETE bad id format → {r.status_code} (expect 400 or 404)")

    # 8. CLEANUP
    section("8. Cleanup")
    for pid in CREATED_IDS:
        r = requests.delete(f"{BASE}/admin/promotions/{pid}", headers=H(admin_token), timeout=15)
        _print(r.status_code == 200, f"DELETE {pid} → {r.status_code}")
        r = requests.delete(f"{BASE}/admin/promotions/{pid}", headers=H(admin_token), timeout=15)
        _print(r.status_code == 404, f"DELETE {pid} again → {r.status_code} (expect 404)")

    r = requests.get(f"{BASE}/admin/promotions", headers=H(admin_token), timeout=15)
    remaining_ids = [p.get("id") for p in (r.json() or {}).get("items", [])]
    leaked = [pid for pid in CREATED_IDS if pid in remaining_ids]
    _print(len(leaked) == 0, f"no created promo leaked in admin list (leaked={leaked})")

    print(f"\n== Summary ==\n  PASS: {PASSES}\n  FAIL: {FAILS}")
    sys.exit(0 if FAILS == 0 else 1)


if __name__ == "__main__":
    main()
