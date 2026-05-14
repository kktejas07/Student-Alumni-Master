"""
Backend tests for Super Admin Events CRUD:
  POST   /api/admin/super/events
  PATCH  /api/admin/super/events/{event_id}
  DELETE /api/admin/super/events/{event_id}
"""
import os
import sys
import json
import requests
from pathlib import Path

# Load frontend .env to get EXPO_PUBLIC_BACKEND_URL
FRONT_ENV = Path("/app/frontend/.env")
BASE_URL = None
for line in FRONT_ENV.read_text().splitlines():
    if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
        BASE_URL = line.split("=", 1)[1].strip().strip('"')
        break

assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL not found"
API = BASE_URL.rstrip("/") + "/api"
print(f"Using API base: {API}\n")

results = []
def check(name, cond, detail=""):
    status = "PASS" if cond else "FAIL"
    print(f"  [{status}] {name}" + (f"  --  {detail}" if detail else ""))
    results.append((name, cond, detail))
    return cond


# ════════════════════════════════════════════════════════════════
print("=" * 70)
print("SCENARIO (a): POST minimal {title: 'Test Event A'}")
print("=" * 70)
r = requests.post(f"{API}/admin/super/events", json={"title": "Test Event A"}, timeout=30)
print(f"  HTTP {r.status_code}")
check("a.status 200", r.status_code == 200, str(r.status_code))
ja = r.json() if r.ok else {}
print(f"  body: {json.dumps(ja, default=str)[:400]}")
check("a.ok=true", ja.get("ok") is True)
ev_a = ja.get("event") or {}
check("a.event.id non-empty", bool(ev_a.get("id")), ev_a.get("id"))
check("a.event._id non-empty", bool(ev_a.get("_id")), ev_a.get("_id"))
check("a.event.title", ev_a.get("title") == "Test Event A")
check("a.event.mode==Online (default)", ev_a.get("mode") == "Online", str(ev_a.get("mode")))
check("a.event.capacity==200 (default)", ev_a.get("capacity") == 200, str(ev_a.get("capacity")))
check("a.event.price is None (free default)", ev_a.get("price") is None, str(ev_a.get("price")))
check("a.event.start_date present", bool(ev_a.get("start_date")), ev_a.get("start_date"))
event_a_id = ev_a.get("id")
event_a_oid = ev_a.get("_id")


# ════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("SCENARIO (b): POST full payload")
print("=" * 70)
payload_b = {
    "title": "Test Event B",
    "start_date": "2026-08-15T10:00",
    "mode": "Hybrid",
    "venue": "Bengaluru",
    "category": "Hackathon",
    "capacity": 500,
    "price": 499,
    "description": "Annual hackathon",
}
r = requests.post(f"{API}/admin/super/events", json=payload_b, timeout=30)
print(f"  HTTP {r.status_code}")
check("b.status 200", r.status_code == 200, str(r.status_code))
jb = r.json() if r.ok else {}
print(f"  body: {json.dumps(jb, default=str)[:500]}")
check("b.ok=true", jb.get("ok") is True)
ev_b = jb.get("event") or {}
event_b_id = ev_b.get("id")
event_b_oid = ev_b.get("_id")
check("b.event.id non-empty", bool(event_b_id))
check("b.event._id non-empty", bool(event_b_oid))
check("b.event.title", ev_b.get("title") == "Test Event B")
check("b.event.mode==Hybrid", ev_b.get("mode") == "Hybrid", str(ev_b.get("mode")))
check("b.event.venue==Bengaluru", ev_b.get("venue") == "Bengaluru")
check("b.event.category==Hackathon", ev_b.get("category") == "Hackathon")
check("b.event.capacity==500", ev_b.get("capacity") == 500)
check("b.event.price==499", float(ev_b.get("price") or 0) == 499.0, str(ev_b.get("price")))
check("b.event.description echoed", ev_b.get("description") == "Annual hackathon")
# start_date should be 2026-08-15T10:00 UTC ish
sd = ev_b.get("start_date") or ""
check("b.event.start_date starts with 2026-08-15", sd.startswith("2026-08-15"), sd)


# ════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("SCENARIO (c): GET /admin/super/events includes both")
print("=" * 70)
r = requests.get(f"{API}/admin/super/events", timeout=30)
check("c.status 200", r.status_code == 200, str(r.status_code))
items = (r.json() or {}).get("items", []) if r.ok else []
print(f"  total items: {len(items)}")
ids = {it.get("id") for it in items}
check("c.contains event A", event_a_id in ids, f"a_id={event_a_id}")
check("c.contains event B", event_b_id in ids, f"b_id={event_b_id}")
# Sanity: pull event B and verify echo (date in items is short format)
ev_b_in_list = next((it for it in items if it.get("id") == event_b_id), None)
if ev_b_in_list:
    print(f"  event B in list: {json.dumps(ev_b_in_list, default=str)[:400]}")
    check("c.event B venue=Bengaluru", ev_b_in_list.get("city") == "Bengaluru" or ev_b_in_list.get("venue") == "Bengaluru")


# ════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("SCENARIO (d): PATCH event A by short id → update title")
print("=" * 70)
r = requests.patch(
    f"{API}/admin/super/events/{event_a_id}",
    json={"title": "Test Event A — updated"},
    timeout=30,
)
print(f"  HTTP {r.status_code}")
check("d.status 200", r.status_code == 200, str(r.status_code))
jd = r.json() if r.ok else {}
print(f"  body: {json.dumps(jd, default=str)[:400]}")
check("d.ok=true", jd.get("ok") is True)
check("d.event.title updated", (jd.get("event") or {}).get("title") == "Test Event A — updated", str((jd.get("event") or {}).get("title")))
# id should remain stable
check("d.event.id unchanged", (jd.get("event") or {}).get("id") == event_a_id)


# ════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("SCENARIO (e): PATCH non-existent ids → 404")
print("=" * 70)
# 8-char non-existent short id
r1 = requests.patch(f"{API}/admin/super/events/xxxxxxxx", json={"title": "x"}, timeout=30)
print(f"  short id PATCH HTTP {r1.status_code}")
check("e.short id → 404", r1.status_code == 404, f"got {r1.status_code}: {r1.text[:200]}")

# Fake ObjectId
r2 = requests.patch(f"{API}/admin/super/events/000000000000000000000000", json={"title": "x"}, timeout=30)
print(f"  fake oid PATCH HTTP {r2.status_code}")
check("e.fake ObjectId → 404", r2.status_code == 404, f"got {r2.status_code}: {r2.text[:200]}")


# ════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("SCENARIO (f): DELETE event A twice (idempotent)")
print("=" * 70)
r = requests.delete(f"{API}/admin/super/events/{event_a_id}", timeout=30)
print(f"  first DELETE HTTP {r.status_code}: {r.text[:200]}")
check("f.first delete status 200", r.status_code == 200)
jf1 = r.json() if r.ok else {}
check("f.first delete ok=true", jf1.get("ok") is True)
check("f.first delete deleted==1", jf1.get("deleted") == 1, str(jf1.get("deleted")))

r2 = requests.delete(f"{API}/admin/super/events/{event_a_id}", timeout=30)
print(f"  second DELETE HTTP {r2.status_code}: {r2.text[:200]}")
check("f.second delete status 200", r2.status_code == 200)
jf2 = r2.json() if r2.ok else {}
check("f.second delete ok=true", jf2.get("ok") is True)
check("f.second delete deleted==0", jf2.get("deleted") == 0, str(jf2.get("deleted")))


# ════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("SCENARIO (g): GET after delete — A gone, B still present")
print("=" * 70)
r = requests.get(f"{API}/admin/super/events", timeout=30)
check("g.status 200", r.status_code == 200)
items = (r.json() or {}).get("items", []) if r.ok else []
ids = {it.get("id") for it in items}
check("g.event A NOT in list", event_a_id not in ids, f"a_id={event_a_id}")
check("g.event B still in list", event_b_id in ids, f"b_id={event_b_id}")


# ════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("SCENARIO (h): Cleanup — DELETE event B by its Mongo _id (ObjectId path)")
print("=" * 70)
r = requests.delete(f"{API}/admin/super/events/{event_b_oid}", timeout=30)
print(f"  DELETE by _id HTTP {r.status_code}: {r.text[:200]}")
check("h.status 200", r.status_code == 200)
jh = r.json() if r.ok else {}
check("h.deleted==1 (ObjectId path works)", jh.get("deleted") == 1, str(jh.get("deleted")))

# Verify B is now gone
r = requests.get(f"{API}/admin/super/events", timeout=30)
items = (r.json() or {}).get("items", []) if r.ok else []
ids = {it.get("id") for it in items}
check("h.event B removed from list", event_b_id not in ids)


# ════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)
passed = sum(1 for _, ok, _ in results if ok)
failed = sum(1 for _, ok, _ in results if not ok)
print(f"  PASSED: {passed}")
print(f"  FAILED: {failed}")
if failed:
    print("\n  Failures:")
    for n, ok, d in results:
        if not ok:
            print(f"   - {n}: {d}")
    sys.exit(1)
print("  ALL ASSERTIONS PASS ✅")
