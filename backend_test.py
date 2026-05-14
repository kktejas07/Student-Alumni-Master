"""
Super-Admin "Colleges & Auto-Distribution" backend smoke test.

Verifies the endpoints requested in the review:
  1. POST /api/admin/imports/manual  → auto-onboard mentor + auto-create college
  2. POST /api/admin/colleges/{cid}/reenrich  → Wikipedia + Hipolabs enrichment
  3. College CRUD (list/get/patch/approve/disable/restore/delete/restore-from-archive)
  4. User lifecycle (disable/restore/approve) under /api/admin/users/profile/{id}/*
  5. Auto-distribution → GET /api/admin/users/list?category=mentor
  6. GET /api/admin/super/events  (TZ-fix regression)
  7. POST /api/admin/colleges {name} → manual create + enrichment
"""
import os
import sys
import time
import random
import string
import requests

BASE = os.environ.get("BACKEND_URL") or "https://hiring-mvvm.preview.emergentagent.com"
API  = BASE.rstrip("/") + "/api"

ADMIN_EMAIL = "admin-super1@persona.demo"
ADMIN_PASSWORD = "TestPass@123"
ALT_EMAIL = "admin@careerpath.app"
ALT_PASSWORD = "Admin@12345"

def banner(s): print("\n" + "=" * 70 + f"\n{s}\n" + "=" * 70)
def ok(s):    print("  PASS  " + s)
def fail(s):  print("  FAIL  " + s)

results = []
def record(label, passed, info=""):
    results.append((label, passed, info))
    (ok if passed else fail)(f"{label} — {info}" if info else label)


# ─── 0. Login as super admin ─────────────────────────────────────
banner("0. AUTH — login admin-super1@persona.demo")
r = requests.post(f"{API}/auth/login",
                  json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                  timeout=20)
if r.status_code != 200:
    print(f"primary admin login failed ({r.status_code}): trying ALT {ALT_EMAIL}")
    r = requests.post(f"{API}/auth/login",
                      json={"email": ALT_EMAIL, "password": ALT_PASSWORD},
                      timeout=20)
if r.status_code != 200:
    print("FATAL — cannot login as either admin account:", r.status_code, r.text[:200])
    sys.exit(2)
TOKEN = r.json()["access_token"]
ME    = r.json()["user"]
print(f"Logged in as {ME.get('email')}  role={ME.get('role')}  id={ME.get('id')}")
H = {"Authorization": f"Bearer {TOKEN}"}


# ─── 1. Manual add — auto-onboard + auto-create college ──────────
banner("1. POST /api/admin/imports/manual  (mentor, IIT Madras)")
rand = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
mentor_email = f"test_madras_{rand}@test.demo"
manual_body = {
    "first_name": "Test",
    "last_name":  "Madras",
    "email":      mentor_email,
    "college":    "Indian Institute of Technology Madras",
    "degree":     "B.Tech ECE",
    "designation":"Senior Engineer",
    "company":    "Google",
    "experience_years_raw": "5",
}
r = requests.post(f"{API}/admin/imports/manual", headers=H, json=manual_body, timeout=20)
print("status:", r.status_code, "body:", r.text[:300])
record("POST /admin/imports/manual returns 200", r.status_code == 200, f"status={r.status_code}")
manual_user_id = None
if r.status_code == 200:
    j = r.json()
    record("ok=true", bool(j.get("ok")), str(j.get("ok")))
    record("action in (added,updated,restored)", j.get("action") in ("added","updated","restored"), f"action={j.get('action')}")
    record("category=mentor (Rule 1: ≥4 yrs experience)", j.get("category") == "mentor", f"category={j.get('category')}")
    manual_user_id = j.get("id")


# ─── 2. Wait, then college list ──────────────────────────────────
banner("2. Wait 3s for async college enrichment, then GET /admin/colleges/list")
time.sleep(3.5)
r = requests.get(f"{API}/admin/colleges/list?status=all", headers=H, timeout=20)
record("GET /admin/colleges/list returns 200", r.status_code == 200, f"status={r.status_code}")
madras = None
if r.status_code == 200:
    items = r.json().get("items", [])
    print(f"  → {len(items)} colleges total")
    for c in items:
        if c["name"].strip().lower() == "indian institute of technology madras":
            madras = c
            break
    record("IIT Madras present in college list", madras is not None,
           "missing" if madras is None else f"id={madras['id']}, status={madras.get('status')}, enrichment={madras.get('enrichment_status')}")
    if madras:
        record("IIT Madras status='pending' or 'active'",
               madras["status"] in ("pending", "active"),
               f"status={madras['status']}")


# ─── 3. Enrichment ───────────────────────────────────────────────
banner("3. POST /admin/colleges/{cid}/reenrich")
cid = madras["id"] if madras else None
if cid:
    r = requests.post(f"{API}/admin/colleges/{cid}/reenrich", headers=H, timeout=30)
    print("status:", r.status_code)
    record("POST /reenrich returns 200", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        j = r.json()
        record("enrichment_status in (enriched, partial)",
               j.get("enrichment_status") in ("enriched", "partial"),
               f"enrichment_status={j.get('enrichment_status')}")
        record("description populated (Wikipedia)",
               bool(j.get("description")) and len(j["description"]) > 30,
               f"description_len={len(j.get('description') or '')}")
        record("logo_url populated (Wikipedia thumb)",
               bool(j.get("logo_url")),
               f"logo_url={(j.get('logo_url') or '')[:80]}")
        record("ranking contains 'Tier-1 (IIT)'",
               any("IIT" in rg for rg in (j.get("ranking") or [])),
               f"ranking={j.get('ranking')}")
        record("specialties array non-empty",
               len(j.get("specialties") or []) > 0,
               f"specialties={j.get('specialties')}")
        record("enrichment_sources include wikipedia and/or hipolabs",
               any(s in (j.get("enrichment_sources") or []) for s in ("wikipedia", "hipolabs")),
               f"sources={j.get('enrichment_sources')}")
else:
    record("reenrich skipped (no college id)", False, "no IIT Madras id available")


# ─── 4. College CRUD ─────────────────────────────────────────────
banner("4. College CRUD")
if cid:
    r = requests.get(f"{API}/admin/colleges/list?status=all&q=Madras", headers=H, timeout=15)
    record("GET list?status=all&q=Madras → 200", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        items = r.json().get("items", [])
        record("query filter narrows results",
               all("madras" in (it["name"].lower()) for it in items),
               f"got {len(items)} items")

    r = requests.get(f"{API}/admin/colleges/{cid}", headers=H, timeout=15)
    record("GET /admin/colleges/{cid} → 200", r.status_code == 200, f"status={r.status_code}")

    r = requests.patch(f"{API}/admin/colleges/{cid}", headers=H,
                       json={"city": "Chennai", "state": "Tamil Nadu"}, timeout=15)
    record("PATCH city/state → 200", r.status_code == 200, f"status={r.status_code}")
    r2 = requests.get(f"{API}/admin/colleges/{cid}", headers=H, timeout=10).json()
    record("PATCH persisted (city=Chennai)", r2.get("city") == "Chennai", f"city={r2.get('city')}")
    record("PATCH persisted (state=Tamil Nadu)", r2.get("state") == "Tamil Nadu", f"state={r2.get('state')}")

    r = requests.post(f"{API}/admin/colleges/{cid}/approve", headers=H, timeout=15)
    record("POST /approve → 200", r.status_code == 200, f"status={r.status_code}")
    record("status=active after approve",
           r.status_code == 200 and r.json().get("status") == "active",
           f"resp={r.json() if r.status_code == 200 else r.text[:120]}")

    r = requests.post(f"{API}/admin/colleges/{cid}/disable", headers=H, timeout=15)
    record("POST /disable → 200", r.status_code == 200, f"status={r.status_code}")
    record("status=paused after disable",
           r.status_code == 200 and r.json().get("status") == "paused",
           f"resp={r.json() if r.status_code == 200 else r.text[:120]}")

    r = requests.post(f"{API}/admin/colleges/{cid}/restore", headers=H, timeout=15)
    record("POST /restore (live) → 200", r.status_code == 200, f"status={r.status_code}")
    record("status=active after restore",
           r.status_code == 200 and r.json().get("status") == "active",
           f"resp={r.json() if r.status_code == 200 else r.text[:120]}")

    r = requests.delete(f"{API}/admin/colleges/{cid}", headers=H, timeout=15)
    record("DELETE → 200", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        j = r.json()
        record("archived flag set on delete",
               bool(j.get("archived")) or j.get("removed") == 1, f"resp={j}")
    r2 = requests.get(f"{API}/admin/colleges/{cid}", headers=H, timeout=10)
    record("After delete, GET /{cid} returns 404", r2.status_code == 404, f"status={r2.status_code}")

    r = requests.post(f"{API}/admin/colleges/{cid}/restore", headers=H, timeout=15)
    record("POST /restore (from archive) → 200", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        j = r.json()
        record("restored_from=archive marker",
               j.get("status") == "active" and j.get("restored_from") == "archive",
               f"resp={j}")
    r2 = requests.get(f"{API}/admin/colleges/{cid}", headers=H, timeout=10)
    record("After archive-restore, GET /{cid} returns 200", r2.status_code == 200, f"status={r2.status_code}")


# ─── 5. User lifecycle ───────────────────────────────────────────
banner("5. User lifecycle (disable / restore / approve)")
if manual_user_id:
    r = requests.post(f"{API}/admin/users/profile/{manual_user_id}/disable", headers=H, timeout=15)
    record("POST /users/profile/{uid}/disable → 200", r.status_code == 200, f"status={r.status_code}")
    record("disable: ok=true & disabled=true",
           r.status_code == 200 and r.json().get("ok") and r.json().get("disabled"),
           f"resp={r.json() if r.status_code == 200 else r.text[:120]}")

    r = requests.post(f"{API}/admin/users/profile/{manual_user_id}/restore", headers=H, timeout=15)
    record("POST /users/profile/{uid}/restore → 200", r.status_code == 200, f"status={r.status_code}")
    record("restore: status=re-enabled",
           r.status_code == 200 and r.json().get("status") == "re-enabled",
           f"resp={r.json() if r.status_code == 200 else r.text[:120]}")

    r = requests.post(f"{API}/admin/users/profile/{manual_user_id}/approve", headers=H, timeout=15)
    record("POST /users/profile/{uid}/approve → 200", r.status_code == 200, f"status={r.status_code}")
    record("approve: approved=true",
           r.status_code == 200 and r.json().get("approved") is True,
           f"resp={r.json() if r.status_code == 200 else r.text[:120]}")


# ─── 6. Auto-distribution ────────────────────────────────────────
banner("6. Auto-distribution: GET /admin/users/list?category=mentor")
r = requests.get(f"{API}/admin/users/list?category=mentor&limit=500", headers=H, timeout=20)
record("GET /admin/users/list?category=mentor → 200", r.status_code == 200, f"status={r.status_code}")
if r.status_code == 200:
    items = r.json().get("items", [])
    counts = r.json().get("counts", {})
    print(f"  → mentor counts.mentor={counts.get('mentor')}; returned {len(items)} items")
    found = next((u for u in items if u.get("email") == mentor_email), None)
    record("Test Madras mentor present in mentor list",
           found is not None,
           "missing — auto-distribution may have failed" if not found else
           f"category={found.get('category')}, exp={found.get('experience_years')}")


# ─── 7. /admin/super/events TZ regression ────────────────────────
banner("7. GET /admin/super/events — TZ comparison regression")
r = requests.get(f"{API}/admin/super/events", headers=H, timeout=20)
record("GET /admin/super/events → 200 (no TZ crash)", r.status_code == 200,
       f"status={r.status_code} body={r.text[:200]}")
if r.status_code == 200:
    items = r.json().get("items", [])
    record("events list is a list", isinstance(items, list), f"len={len(items)}")


# ─── 8. Manual create college ────────────────────────────────────
banner("8. POST /admin/colleges  (Indian Institute of Science)")
r = requests.post(f"{API}/admin/colleges", headers=H,
                  json={"name": "Indian Institute of Science"}, timeout=20)
record("POST /admin/colleges → 200", r.status_code == 200,
       f"status={r.status_code} body={r.text[:200]}")
new_cid = None
if r.status_code == 200:
    j = r.json()
    record("ok=true + id returned", bool(j.get("ok") and j.get("id")), f"resp={j}")
    new_cid = j.get("id")
if new_cid:
    print("  → waiting 4s for background enrichment…")
    time.sleep(4.0)
    r = requests.get(f"{API}/admin/colleges/{new_cid}", headers=H, timeout=15)
    record("After 4s, GET new college → 200", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        j = r.json()
        record("Enrichment ran (status in enriched/partial/pending)",
               j.get("enrichment_status") in ("enriched", "partial", "pending"),
               f"enrichment_status={j.get('enrichment_status')}")
        if j.get("enrichment_status") in ("enriched", "partial"):
            record("description or specialties populated",
                   bool(j.get("description")) or bool(j.get("specialties")),
                   f"desc_len={len(j.get('description') or '')}, specs={len(j.get('specialties') or [])}")
    # cleanup
    requests.delete(f"{API}/admin/colleges/{new_cid}", headers=H, timeout=10)


# ─── SUMMARY ─────────────────────────────────────────────────────
banner("SUMMARY")
passed = sum(1 for _, ok_, _ in results if ok_)
total  = len(results)
print(f"\n{passed} / {total} checks passed.\n")
fails = [r for r in results if not r[1]]
if fails:
    print("FAILED CHECKS:")
    for label, _, info in fails:
        print(f"  ❌ {label} — {info}")
else:
    print("✅ ALL CHECKS PASSED")

sys.exit(0 if not fails else 1)
