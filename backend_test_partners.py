"""
Collaboration Partners API — Phase A backend test.

Tests:
  GET    /api/landing/partners   (public)
  GET    /api/admin/partners     (admin)
  POST   /api/admin/partners     (admin)
  PATCH  /api/admin/partners/{id}
  DELETE /api/admin/partners/{id}
  POST   /api/admin/partners/reorder
"""
from __future__ import annotations

import base64
import os
import sys
from typing import Optional

import requests

BASE_URL = "https://hiring-mvvm.preview.emergentagent.com/api"

ADMIN_EMAIL = "admin@careerpath.app"
ADMIN_PASS = "Admin@12345"
STUDENT_EMAIL = "student01@test.com"
STUDENT_PASS = "TestPass@123"

# 1x1 transparent PNG
TINY_PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBg"
    "AAAABQABh6FO1AAAAABJRU5ErkJggg=="
)
TINY_PNG_DATA_URI = f"data:image/png;base64,{TINY_PNG_B64}"

results = []  # list of (name, passed, info)


def record(name: str, ok: bool, info: str = ""):
    results.append((name, ok, info))
    icon = "✅" if ok else "❌"
    print(f"{icon} {name} — {info}" if info else f"{icon} {name}")


def login(email: str, password: str) -> Optional[str]:
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password}, timeout=15)
    if r.status_code != 200:
        print(f"❌ login {email} → {r.status_code} {r.text[:200]}")
        return None
    js = r.json()
    if js.get("requires_2fa"):
        print(f"❌ login {email} requires 2FA — skipping")
        return None
    return js.get("access_token")


def hdr(tok: Optional[str]) -> dict:
    return {"Authorization": f"Bearer {tok}"} if tok else {}


def main():
    print(f"=== Backend: {BASE_URL} ===\n")

    # ── 0. Login both users ──────────────────────────────────────────
    admin_tok = login(ADMIN_EMAIL, ADMIN_PASS)
    student_tok = login(STUDENT_EMAIL, STUDENT_PASS)
    record("Login admin", admin_tok is not None)
    record("Login student (non-admin)", student_tok is not None)
    if not admin_tok:
        print("Cannot continue without admin token.")
        sys.exit(1)

    # ── 1. Auth gating ───────────────────────────────────────────────
    print("\n--- 1. Auth gating ---")
    # GET admin/partners no token
    r = requests.get(f"{BASE_URL}/admin/partners", timeout=15)
    record("GET /admin/partners no-token → 401", r.status_code == 401, f"got {r.status_code}")

    # POST admin/partners no token
    r = requests.post(f"{BASE_URL}/admin/partners", json={"name": "x", "category": "company", "logo_url": TINY_PNG_DATA_URI}, timeout=15)
    record("POST /admin/partners no-token → 401", r.status_code == 401, f"got {r.status_code}")

    # PATCH no token
    r = requests.patch(f"{BASE_URL}/admin/partners/000000000000000000000000", json={"name": "y"}, timeout=15)
    record("PATCH /admin/partners no-token → 401", r.status_code == 401, f"got {r.status_code}")

    # DELETE no token
    r = requests.delete(f"{BASE_URL}/admin/partners/000000000000000000000000", timeout=15)
    record("DELETE /admin/partners no-token → 401", r.status_code == 401, f"got {r.status_code}")

    # reorder no token
    r = requests.post(f"{BASE_URL}/admin/partners/reorder", json={"ordered_ids": []}, timeout=15)
    record("POST /admin/partners/reorder no-token → 401", r.status_code == 401, f"got {r.status_code}")

    # Non-admin (student)
    if student_tok:
        r = requests.get(f"{BASE_URL}/admin/partners", headers=hdr(student_tok), timeout=15)
        record("GET /admin/partners student → 403", r.status_code == 403, f"got {r.status_code}")
        r = requests.post(f"{BASE_URL}/admin/partners", headers=hdr(student_tok),
                          json={"name": "x", "category": "company", "logo_url": TINY_PNG_DATA_URI}, timeout=15)
        record("POST /admin/partners student → 403", r.status_code == 403, f"got {r.status_code}")
        r = requests.patch(f"{BASE_URL}/admin/partners/000000000000000000000000", headers=hdr(student_tok),
                           json={"name": "y"}, timeout=15)
        record("PATCH /admin/partners student → 403", r.status_code == 403, f"got {r.status_code}")
        r = requests.delete(f"{BASE_URL}/admin/partners/000000000000000000000000", headers=hdr(student_tok), timeout=15)
        record("DELETE /admin/partners student → 403", r.status_code == 403, f"got {r.status_code}")
        r = requests.post(f"{BASE_URL}/admin/partners/reorder", headers=hdr(student_tok),
                          json={"ordered_ids": []}, timeout=15)
        record("POST /admin/partners/reorder student → 403", r.status_code == 403, f"got {r.status_code}")

    created_ids = []  # track for cleanup

    # ── 2. Create ────────────────────────────────────────────────────
    print("\n--- 2. Create ---")
    body = {
        "name": "IIT Bombay",
        "category": "college",
        "logo_url": TINY_PNG_DATA_URI,
        "logo_white_url": TINY_PNG_DATA_URI,
        "display_order": 50,
        "is_active": True,
    }
    r = requests.post(f"{BASE_URL}/admin/partners", headers=hdr(admin_tok), json=body, timeout=15)
    ok = r.status_code == 200
    record("POST create partner → 200", ok, f"got {r.status_code}: {r.text[:200] if not ok else ''}")
    if ok:
        p = r.json()
        partner_id = p.get("id")
        created_ids.append(partner_id)
        record("Response has id", bool(partner_id))
        record("name echoed", p.get("name") == body["name"])
        record("category echoed", p.get("category") == body["category"])
        record("logo_url echoed", p.get("logo_url") == body["logo_url"])
        record("logo_white_url echoed", p.get("logo_white_url") == body["logo_white_url"])
        record("display_order echoed", p.get("display_order") == 50)
        record("is_active echoed", p.get("is_active") is True)
        record("created_at present", bool(p.get("created_at")))
        record("updated_at present", bool(p.get("updated_at")))
    else:
        partner_id = None

    # ── 3. List ──────────────────────────────────────────────────────
    print("\n--- 3. List ---")
    r = requests.get(f"{BASE_URL}/admin/partners", headers=hdr(admin_tok), timeout=15)
    ok = r.status_code == 200
    record("GET /admin/partners → 200", ok)
    if ok and partner_id:
        items = r.json().get("items", [])
        record("Admin list contains created partner", any(i.get("id") == partner_id for i in items),
               f"total={len(items)}")

    r = requests.get(f"{BASE_URL}/landing/partners", timeout=15)
    ok = r.status_code == 200
    record("GET /landing/partners (public) → 200", ok)
    if ok and partner_id:
        items = r.json().get("items", [])
        record("Landing list includes active partner", any(i.get("id") == partner_id for i in items),
               f"total={len(items)}")

    # ── 4. Update / Toggle ───────────────────────────────────────────
    print("\n--- 4. Update / Toggle ---")
    if partner_id:
        r = requests.patch(f"{BASE_URL}/admin/partners/{partner_id}", headers=hdr(admin_tok),
                           json={"is_active": False}, timeout=15)
        ok = r.status_code == 200
        record("PATCH is_active=false → 200", ok, f"got {r.status_code}")
        if ok:
            record("Returned is_active=false", r.json().get("is_active") is False)

        # Verify removed from landing
        r2 = requests.get(f"{BASE_URL}/landing/partners", timeout=15)
        items = r2.json().get("items", []) if r2.status_code == 200 else []
        record("Inactive partner NOT in landing list",
               not any(i.get("id") == partner_id for i in items))

        # Still in admin
        r3 = requests.get(f"{BASE_URL}/admin/partners", headers=hdr(admin_tok), timeout=15)
        items3 = r3.json().get("items", []) if r3.status_code == 200 else []
        record("Inactive partner STILL in admin list",
               any(i.get("id") == partner_id for i in items3))

        # Toggle back active
        r = requests.patch(f"{BASE_URL}/admin/partners/{partner_id}", headers=hdr(admin_tok),
                           json={"is_active": True}, timeout=15)
        record("PATCH is_active=true → 200", r.status_code == 200)
        r2 = requests.get(f"{BASE_URL}/landing/partners", timeout=15)
        items = r2.json().get("items", []) if r2.status_code == 200 else []
        record("Re-active partner reappears in landing",
               any(i.get("id") == partner_id for i in items))

        # Update other fields
        r = requests.patch(f"{BASE_URL}/admin/partners/{partner_id}", headers=hdr(admin_tok),
                           json={"name": "IIT Bombay (Updated)", "display_order": 25}, timeout=15)
        ok = r.status_code == 200
        record("PATCH name+display_order → 200", ok)
        if ok:
            record("Updated name echoed", r.json().get("name") == "IIT Bombay (Updated)")
            record("Updated display_order echoed", r.json().get("display_order") == 25)

    # ── 5. Reorder (create 3 partners A, B, C) ───────────────────────
    print("\n--- 5. Reorder ---")
    reorder_ids = {}
    for label, order in [("A", 110), ("B", 120), ("C", 130)]:
        b = {
            "name": f"Partner-{label}",
            "category": "company",
            "logo_url": TINY_PNG_DATA_URI,
            "display_order": order,
            "is_active": True,
        }
        r = requests.post(f"{BASE_URL}/admin/partners", headers=hdr(admin_tok), json=b, timeout=15)
        if r.status_code == 200:
            pid = r.json().get("id")
            reorder_ids[label] = pid
            created_ids.append(pid)
    record("Created 3 reorder partners", len(reorder_ids) == 3, f"created {len(reorder_ids)}")

    if len(reorder_ids) == 3:
        # Reorder C, A, B → display_order 10, 20, 30
        payload = {"ordered_ids": [reorder_ids["C"], reorder_ids["A"], reorder_ids["B"]]}
        r = requests.post(f"{BASE_URL}/admin/partners/reorder", headers=hdr(admin_tok), json=payload, timeout=15)
        ok = r.status_code == 200
        record("POST /reorder → 200", ok, f"got {r.status_code}: {r.text[:200] if not ok else ''}")

        # Verify display_order via admin list
        r = requests.get(f"{BASE_URL}/admin/partners", headers=hdr(admin_tok), timeout=15)
        items = r.json().get("items", []) if r.status_code == 200 else []
        by_id = {i["id"]: i for i in items}
        c_order = by_id.get(reorder_ids["C"], {}).get("display_order")
        a_order = by_id.get(reorder_ids["A"], {}).get("display_order")
        b_order = by_id.get(reorder_ids["B"], {}).get("display_order")
        record("C.display_order == 10", c_order == 10, f"got {c_order}")
        record("A.display_order == 20", a_order == 20, f"got {a_order}")
        record("B.display_order == 30", b_order == 30, f"got {b_order}")

        # Verify landing returns them in order C, A, B (filter by our test ids)
        r = requests.get(f"{BASE_URL}/landing/partners", timeout=15)
        items = r.json().get("items", []) if r.status_code == 200 else []
        ours = [i for i in items if i["id"] in reorder_ids.values()]
        ours_order = [i["id"] for i in ours]
        expected = [reorder_ids["C"], reorder_ids["A"], reorder_ids["B"]]
        record("Landing returns C, A, B in reorder sequence",
               ours_order == expected, f"got_order has {len(ours_order)} items")

    # ── 6. Error paths ───────────────────────────────────────────────
    print("\n--- 6. Error paths ---")
    r = requests.patch(f"{BASE_URL}/admin/partners/not-an-oid", headers=hdr(admin_tok),
                       json={"name": "z"}, timeout=15)
    record("PATCH bad id → 400", r.status_code == 400, f"got {r.status_code}")

    r = requests.patch(f"{BASE_URL}/admin/partners/000000000000000000000000", headers=hdr(admin_tok),
                       json={"name": "z"}, timeout=15)
    record("PATCH valid-but-missing id → 404", r.status_code == 404, f"got {r.status_code}")

    r = requests.delete(f"{BASE_URL}/admin/partners/not-an-oid", headers=hdr(admin_tok), timeout=15)
    record("DELETE bad id → 400", r.status_code == 400, f"got {r.status_code}")

    r = requests.delete(f"{BASE_URL}/admin/partners/000000000000000000000000", headers=hdr(admin_tok), timeout=15)
    record("DELETE missing id → 404", r.status_code == 404, f"got {r.status_code}")

    # Logo too large — > 2.7MB
    huge = "data:image/png;base64," + ("A" * 2_800_001)
    r = requests.post(f"{BASE_URL}/admin/partners", headers=hdr(admin_tok),
                      json={"name": "TooBig", "category": "company", "logo_url": huge}, timeout=30)
    record("POST oversized logo → 422", r.status_code == 422, f"got {r.status_code}")

    # ── 7. Cleanup ───────────────────────────────────────────────────
    print("\n--- 7. Cleanup ---")
    deleted_ok = 0
    for pid in created_ids:
        r = requests.delete(f"{BASE_URL}/admin/partners/{pid}", headers=hdr(admin_tok), timeout=15)
        if r.status_code == 200:
            deleted_ok += 1
    record(f"Cleanup deleted {deleted_ok}/{len(created_ids)} created partners",
           deleted_ok == len(created_ids))

    # ── Summary ──────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    total = len(results)
    passed = sum(1 for _, ok, _ in results if ok)
    print(f"RESULT: {passed}/{total} checks passed")
    failed = [name for name, ok, _ in results if not ok]
    if failed:
        print("\nFAILED:")
        for f in failed:
            print(f"  - {f}")
        sys.exit(1)
    else:
        print("All checks passed ✅")
        sys.exit(0)


if __name__ == "__main__":
    main()
