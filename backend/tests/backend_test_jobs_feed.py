"""
Backend test for /api/jobs/* live job aggregator endpoints.
Tests against the public preview URL using realtime@studentalumni.in.
"""
import os
import sys
import json
import time
import requests
from pymongo import MongoClient

BASE = "https://hiring-mvvm.preview.emergentagent.com/api"
EMAIL = "realtime@studentalumni.in"
PASSWORD = "RealTime@2026"

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "career_platform"

results = []  # (name, passed, detail)

def record(name, passed, detail=""):
    icon = "PASS" if passed else "FAIL"
    print(f"[{icon}] {name}{(' — ' + detail) if detail else ''}")
    results.append((name, passed, detail))

def login():
    r = requests.post(f"{BASE}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=20)
    if r.status_code != 200:
        print("LOGIN FAIL", r.status_code, r.text)
        sys.exit(1)
    tok = r.json().get("access_token")
    print(f"login OK, token len={len(tok or '')}")
    return tok

def auth_headers(tok):
    return {"Authorization": f"Bearer {tok}"}

# ------------- begin tests -------------
token = login()
H = auth_headers(token)

# === 1. POST /api/jobs/refresh ===
print("\n=== 1) POST /api/jobs/refresh ===")
r = requests.post(f"{BASE}/jobs/refresh", headers=H, timeout=60)
record("1.0 refresh status 200", r.status_code == 200, f"got {r.status_code} body={r.text[:200]}")
if r.status_code == 200:
    j = r.json()
    src = j.get("sources") or {}
    print("  sources:", src)
    print("  total_unique:", j.get("total_unique"), " ttl:", j.get("ttl_minutes"))
    nonzero = [k for k, v in src.items() if v and v > 0]
    record("1.1 ≥3 sources non-zero", len(nonzero) >= 3, f"non-zero={nonzero}")
    expected_keys = {"RemoteOK", "ArbeitNow", "The Muse", "Remotive", "Jobicy"}
    record("1.2 all 5 source keys present", expected_keys.issubset(set(src.keys())),
           f"keys={list(src.keys())}")
    record("1.3 total_unique >= 100", (j.get("total_unique") or 0) >= 100,
           f"total_unique={j.get('total_unique')}")
    record("1.4 ttl_minutes == 30", j.get("ttl_minutes") == 30, f"ttl={j.get('ttl_minutes')}")

# === 2. GET /api/jobs/feed ===
print("\n=== 2) GET /api/jobs/feed (no auth → 401) ===")
r = requests.get(f"{BASE}/jobs/feed?per_page=12", timeout=20)
record("2.0 unauth feed → 401", r.status_code in (401, 403), f"got {r.status_code}")

print("\n=== 2b) GET /api/jobs/feed?per_page=12 (auth) ===")
r = requests.get(f"{BASE}/jobs/feed?per_page=12", headers=H, timeout=30)
record("2b.0 status 200", r.status_code == 200, f"got {r.status_code}")
if r.status_code == 200:
    j = r.json()
    items = j.get("items") or []
    print("  total:", j.get("total"), " items:", len(items))
    record("2b.1 total > 0", (j.get("total") or 0) > 0, f"total={j.get('total')}")
    record("2b.2 items non-empty list ≤12", isinstance(items, list) and 0 < len(items) <= 12,
           f"len={len(items)}")
    if items:
        it = items[0]
        required = ["job_id", "title", "company", "location", "work_mode", "job_type", "sources", "source_urls"]
        missing = [k for k in required if k not in it]
        record("2b.3 each item has required fields", not missing,
               f"missing={missing} keys={list(it.keys())[:15]}")
        record("2b.3a sources is list", isinstance(it.get("sources"), list))
        record("2b.3b source_urls is list", isinstance(it.get("source_urls"), list))
    record("2b.4 allowed_types == [Internship,Full-time,Contract]",
           set(j.get("allowed_types") or []) == {"Internship", "Full-time", "Contract"},
           f"allowed_types={j.get('allowed_types')}")
    expected_sources = {"RemoteOK", "ArbeitNow", "The Muse", "Remotive", "Jobicy"}
    record("2b.5 available_sources includes all 5",
           expected_sources.issubset(set(j.get("available_sources") or [])),
           f"got={j.get('available_sources')}")

# === 3. type=Internship ===
print("\n=== 3) GET /api/jobs/feed?type=Internship&per_page=10 ===")
r = requests.get(f"{BASE}/jobs/feed?type=Internship&per_page=10", headers=H, timeout=30)
record("3.0 status 200", r.status_code == 200, f"got {r.status_code}")
if r.status_code == 200:
    j = r.json()
    items = j.get("items") or []
    print("  total:", j.get("total"), " items returned:", len(items))
    types = {it.get("job_type") for it in items}
    record("3.1 all returned items job_type==Internship",
           all(it.get("job_type") == "Internship" for it in items) and len(items) > 0,
           f"types={types} len={len(items)}")
    record("3.2 ≥10 internships available", (j.get("total") or 0) >= 10, f"total={j.get('total')}")

# === 4. type=Contract ===
print("\n=== 4) GET /api/jobs/feed?type=Contract&per_page=5 ===")
r = requests.get(f"{BASE}/jobs/feed?type=Contract&per_page=5", headers=H, timeout=30)
record("4.0 status 200", r.status_code == 200, f"got {r.status_code}")
if r.status_code == 200:
    j = r.json()
    items = j.get("items") or []
    print("  total:", j.get("total"), " items:", len(items))
    record("4.1 user_tier_locked != true (Contract allowed)", j.get("user_tier_locked") is False,
           f"locked={j.get('user_tier_locked')}")
    if items:
        record("4.2 all returned items job_type==Contract",
               all(it.get("job_type") == "Contract" for it in items),
               f"types={[it.get('job_type') for it in items]}")
    else:
        record("4.2 items list (may be empty if 0 contracts cached)", True,
               "WARN: no contract items cached, but endpoint succeeded")

# === 5. work_mode=Remote ===
print("\n=== 5) GET /api/jobs/feed?work_mode=Remote&per_page=10 ===")
r = requests.get(f"{BASE}/jobs/feed?work_mode=Remote&per_page=10", headers=H, timeout=30)
record("5.0 status 200", r.status_code == 200, f"got {r.status_code}")
if r.status_code == 200:
    j = r.json()
    items = j.get("items") or []
    record("5.1 all items work_mode==Remote",
           all(it.get("work_mode") == "Remote" for it in items) and len(items) > 0,
           f"modes={set(it.get('work_mode') for it in items)} len={len(items)}")

# === 6. q=engineer ===
print("\n=== 6) GET /api/jobs/feed?q=engineer&per_page=10 ===")
r = requests.get(f"{BASE}/jobs/feed?q=engineer&per_page=10", headers=H, timeout=30)
record("6.0 status 200", r.status_code == 200, f"got {r.status_code}")
if r.status_code == 200:
    j = r.json()
    items = j.get("items") or []
    def match_engineer(it):
        s = (it.get("title") or "") + " " + (it.get("company") or "") + " " + " ".join(it.get("tags") or [])
        return "engineer" in s.lower()
    bad = [it for it in items if not match_engineer(it)]
    record("6.1 every item matches 'engineer' (title/company/tags ci)",
           len(bad) == 0 and len(items) > 0,
           f"bad={[(b.get('title'), b.get('tags')) for b in bad[:3]]} total_items={len(items)}")

# === 7. source=The Muse ===
print("\n=== 7) GET /api/jobs/feed?source=The%20Muse&per_page=10 ===")
r = requests.get(f"{BASE}/jobs/feed", params={"source": "The Muse", "per_page": 10}, headers=H, timeout=30)
record("7.0 status 200", r.status_code == 200, f"got {r.status_code}")
if r.status_code == 200:
    j = r.json()
    items = j.get("items") or []
    bad = [it for it in items if "The Muse" not in (it.get("sources") or [])]
    record("7.1 every item has 'The Muse' in sources",
           len(bad) == 0 and len(items) > 0,
           f"len={len(items)} bad={[b.get('sources') for b in bad[:3]]}")

# === 8. Pagination ===
print("\n=== 8) Pagination ===")
r1 = requests.get(f"{BASE}/jobs/feed?page=1&per_page=5", headers=H, timeout=30)
r2 = requests.get(f"{BASE}/jobs/feed?page=2&per_page=5", headers=H, timeout=30)
record("8.0 page1 status 200", r1.status_code == 200, f"got {r1.status_code}")
record("8.1 page2 status 200", r2.status_code == 200, f"got {r2.status_code}")
if r1.status_code == 200 and r2.status_code == 200:
    j1 = r1.json(); j2 = r2.json()
    ids1 = {it["job_id"] for it in (j1.get("items") or [])}
    ids2 = {it["job_id"] for it in (j2.get("items") or [])}
    record("8.2 page1 and page2 have different job_id sets",
           len(ids1) > 0 and len(ids2) > 0 and ids1 != ids2,
           f"|p1|={len(ids1)} |p2|={len(ids2)} overlap={len(ids1 & ids2)}")
    record("8.3 total stays consistent across pages",
           j1.get("total") == j2.get("total"),
           f"t1={j1.get('total')} t2={j2.get('total')}")

# === 9. Save flow ===
print("\n=== 9) Save flow ===")
r = requests.get(f"{BASE}/jobs/feed?per_page=5", headers=H, timeout=30)
job_id = None
if r.status_code == 200:
    items = r.json().get("items") or []
    if items:
        job_id = items[0]["job_id"]
        print("  picked job_id:", job_id, " title:", items[0].get("title"))

if not job_id:
    record("9.0 picked job_id from feed", False, "no items found")
else:
    record("9.0 picked job_id from feed", True)

    # save
    r = requests.post(f"{BASE}/jobs/save", headers=H, json={"job_id": job_id}, timeout=20)
    record("9.1 POST /jobs/save → 200 ok:true saved:true",
           r.status_code == 200 and r.json().get("ok") is True and r.json().get("saved") is True,
           f"status={r.status_code} body={r.text[:200]}")

    # GET saved → list contains job_id
    r = requests.get(f"{BASE}/jobs/saved", headers=H, timeout=20)
    saved_items = (r.json().get("items") if r.status_code == 200 else []) or []
    saved_ids = {it.get("job_id") for it in saved_items}
    record("9.2 GET /jobs/saved contains job_id", job_id in saved_ids,
           f"saved_ids={saved_ids}")

    # feed shows saved=true for the same job
    r = requests.get(f"{BASE}/jobs/feed?per_page=50", headers=H, timeout=30)
    feed_items = r.json().get("items") if r.status_code == 200 else []
    match = next((it for it in (feed_items or []) if it["job_id"] == job_id), None)
    record("9.3 feed item.saved == true for saved job",
           bool(match) and match.get("saved") is True,
           f"match_present={bool(match)} saved_flag={match.get('saved') if match else None}")

    # unsave
    r = requests.post(f"{BASE}/jobs/unsave", headers=H, json={"job_id": job_id}, timeout=20)
    record("9.4 POST /jobs/unsave → 200 ok:true saved:false",
           r.status_code == 200 and r.json().get("ok") is True and r.json().get("saved") is False,
           f"status={r.status_code} body={r.text[:200]}")

    # GET saved again → no longer
    r = requests.get(f"{BASE}/jobs/saved", headers=H, timeout=20)
    saved_items = (r.json().get("items") if r.status_code == 200 else []) or []
    saved_ids = {it.get("job_id") for it in saved_items}
    record("9.5 GET /jobs/saved no longer contains job_id", job_id not in saved_ids,
           f"saved_ids={saved_ids}")

    # empty body → 400
    r = requests.post(f"{BASE}/jobs/save", headers=H, json={}, timeout=20)
    record("9.6 POST /jobs/save with empty body → 400", r.status_code == 400,
           f"got {r.status_code} body={r.text[:200]}")

# === 10. Apply tracking ===
print("\n=== 10) Apply tracking ===")
if job_id:
    r = requests.post(f"{BASE}/jobs/track-apply", headers=H,
                      json={"job_id": job_id, "source_url": "https://example.com/apply"},
                      timeout=20)
    record("10.0 POST /jobs/track-apply → 200", r.status_code == 200,
           f"status={r.status_code} body={r.text[:200]}")

    # Check user document via Mongo direct
    mc = MongoClient(MONGO_URL)
    udoc = mc[DB_NAME].users.find_one({"email": EMAIL})
    applied = udoc.get("applied_jobs") or []
    record("10.1 user.applied_jobs[] contains job_id", job_id in applied,
           f"applied_jobs={applied}")
    mc.close()

    # feed → applied=true
    r = requests.get(f"{BASE}/jobs/feed?per_page=50", headers=H, timeout=30)
    feed_items = r.json().get("items") if r.status_code == 200 else []
    match = next((it for it in (feed_items or []) if it["job_id"] == job_id), None)
    record("10.2 feed item.applied == true",
           bool(match) and match.get("applied") is True,
           f"applied_flag={match.get('applied') if match else None}")

# === 11. Year-tier enforcement ===
print("\n=== 11) Year-tier enforcement (gy=2029, year≈1, internship-only) ===")
mc = MongoClient(MONGO_URL)
udb = mc[DB_NAME].users
mc_user = udb.find_one({"email": EMAIL})
orig_gy = mc_user.get("graduation_year")
udb.update_one({"email": EMAIL}, {"$set": {"graduation_year": 2029}})
print(f"  set graduation_year=2029 (was {orig_gy})")

try:
    # 11a: type=Full-time → 200, locked, empty
    r = requests.get(f"{BASE}/jobs/feed?type=Full-time", headers=H, timeout=30)
    record("11a.0 type=Full-time status 200", r.status_code == 200, f"got {r.status_code}")
    if r.status_code == 200:
        j = r.json()
        record("11a.1 user_tier_locked == true", j.get("user_tier_locked") is True,
               f"locked={j.get('user_tier_locked')}")
        record("11a.2 items is empty array",
               isinstance(j.get("items"), list) and len(j.get("items")) == 0,
               f"items_len={len(j.get('items') or [])}")
        record("11a.3 has explanatory message", bool(j.get("message")),
               f"msg={j.get('message')!r}")

    # 11b: feed (no filter) → only Internship items
    r = requests.get(f"{BASE}/jobs/feed?per_page=20", headers=H, timeout=30)
    record("11b.0 feed status 200", r.status_code == 200, f"got {r.status_code}")
    if r.status_code == 200:
        j = r.json()
        items = j.get("items") or []
        types = {it.get("job_type") for it in items}
        record("11b.1 only Internship items returned",
               types == {"Internship"} and len(items) > 0,
               f"types={types} len={len(items)}")
        record("11b.2 allowed_types == [Internship]",
               j.get("allowed_types") == ["Internship"],
               f"allowed_types={j.get('allowed_types')}")
finally:
    udb.update_one({"email": EMAIL}, {"$set": {"graduation_year": orig_gy or 2026}})
    mc_user2 = udb.find_one({"email": EMAIL})
    print(f"  RESTORED graduation_year={mc_user2.get('graduation_year')}")
    mc.close()

# === 12. Auth gating ===
print("\n=== 12) Auth gating (no auth → 401) ===")
endpoints = [
    ("GET",  "/jobs/feed", None),
    ("POST", "/jobs/save", {"job_id": "x"}),
    ("POST", "/jobs/unsave", {"job_id": "x"}),
    ("GET",  "/jobs/saved", None),
    ("POST", "/jobs/track-apply", {"job_id": "x"}),
    ("POST", "/jobs/refresh", None),
]
for method, path, body in endpoints:
    if method == "GET":
        r = requests.get(f"{BASE}{path}", timeout=20)
    else:
        r = requests.post(f"{BASE}{path}", json=body, timeout=20)
    record(f"12 {method} {path} → 401 (no auth)",
           r.status_code in (401, 403),
           f"got {r.status_code}")

# === Cleanup: clear saved_jobs and applied_jobs ===
print("\n=== Cleanup ===")
mc = MongoClient(MONGO_URL)
mc[DB_NAME].users.update_one(
    {"email": EMAIL},
    {"$set": {"saved_jobs": [], "applied_jobs": [], "graduation_year": 2026}}
)
udoc = mc[DB_NAME].users.find_one({"email": EMAIL})
print(f"  Final state: gy={udoc.get('graduation_year')} "
      f"saved_jobs={udoc.get('saved_jobs')} applied_jobs={udoc.get('applied_jobs')}")
mc.close()

# ====== Summary ======
print("\n\n========== SUMMARY ==========")
total = len(results)
passed = sum(1 for _, p, _ in results if p)
print(f"PASSED: {passed}/{total}")
print("\nFAILURES:")
for n, p, d in results:
    if not p:
        print(f"  - {n} :: {d}")
print()
sys.exit(0 if passed == total else 1)
