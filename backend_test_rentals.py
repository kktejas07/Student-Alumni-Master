"""
Backend tests — SA Stay (Rentals Marketplace) v1.

Target endpoints (/api prefix):
  GET  /api/rentals/categories
  GET  /api/rentals/listings  (filters: category, city, q, min_price, max_price)
  GET  /api/rentals/listings/{id}
  POST /api/rentals/book
  GET  /api/rentals/bookings
  GET  /api/rentals/bookings/{id}
  POST /api/rentals/bookings/{id}/cancel
  POST /api/rentals/ai/recommend
"""
from __future__ import annotations
import json
import sys
import requests

BASE = "https://hiring-mvvm.preview.emergentagent.com/api"

PRIMARY = ("realtime@studentalumni.in", "RealTime@2026")
FALLBACK = ("student01@test.com", "TestPass@123")

passed: list[str] = []
failed: list[str] = []


def check(cond: bool, label: str, detail: str = ""):
    if cond:
        passed.append(label)
        print(f"PASS: {label}")
    else:
        failed.append(f"{label} :: {detail}")
        print(f"FAIL: {label} :: {detail}")


def login() -> str:
    for email, pw in (PRIMARY, FALLBACK):
        r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": pw}, timeout=30)
        if r.status_code == 200 and r.json().get("access_token"):
            print(f"[login] as {email}")
            return r.json()["access_token"]
        print(f"[login-fail] {email} → {r.status_code}: {r.text[:120]}")
    raise SystemExit("No login credentials worked")


def main():
    token = login()
    H = {"Authorization": f"Bearer {token}"}

    # ===== 1. CATEGORIES =====
    print("\n=== 1. GET /rentals/categories ===")
    r = requests.get(f"{BASE}/rentals/categories", headers=H, timeout=30)
    check(r.status_code == 200, "categories: 200", f"got {r.status_code} {r.text[:120]}")
    if r.status_code == 200:
        j = r.json()
        cats = j.get("categories", [])
        check(len(cats) == 4, "categories: exactly 4", f"len={len(cats)}")
        ids = [c.get("id") for c in cats]
        check(set(ids) == {"housing", "vehicle", "hotel", "coworking"},
              "categories: ids housing/vehicle/hotel/coworking", f"ids={ids}")
        required = {"id", "label", "icon", "color", "tagline", "count"}
        all_ok = all(required.issubset(c.keys()) for c in cats)
        check(all_ok, "categories: each has id/label/icon/color/tagline/count")
        check(j.get("total") == 40, "categories: total=40", f"total={j.get('total')}")
        counts = {c["id"]: c["count"] for c in cats}
        check(counts.get("housing") == 12, "categories: housing count=12", f"c={counts}")
        check(counts.get("vehicle") == 10, "categories: vehicle count=10")
        check(counts.get("hotel") == 12, "categories: hotel count=12")
        check(counts.get("coworking") == 8, "categories: coworking count=8")
        check(j.get("verified") == 40, "categories: verified=40", f"v={j.get('verified')}")
        check(isinstance(j.get("featured"), int) and j["featured"] > 0, "categories: featured is int>0")

    # Auth gate
    print("\n=== 1b. auth gate (no token) ===")
    r = requests.get(f"{BASE}/rentals/categories", timeout=30)
    check(r.status_code in (401, 403), "categories without auth → 401/403", f"got {r.status_code}")

    # ===== 2. LISTINGS =====
    print("\n=== 2. GET /rentals/listings (no filter) ===")
    r = requests.get(f"{BASE}/rentals/listings", headers=H, timeout=30)
    check(r.status_code == 200, "listings: 200", r.text[:120])
    j = r.json()
    listings = j.get("listings", [])
    check(len(listings) == 40, "listings: 40 items", f"len={len(listings)}")
    # Sort: featured first, then rating desc
    # verify first is featured & first non-featured appears after
    first_non_feat_seen = False
    sort_ok = True
    for it in listings:
        if not it.get("featured"):
            first_non_feat_seen = True
        elif first_non_feat_seen:
            sort_ok = False
            break
    check(sort_ok, "listings: featured-first ordering")
    # validate each listing shape
    required_keys = {"id", "category", "title", "type", "city", "location", "rent_inr",
                     "rent_label", "orig_inr", "orig_label", "discount", "amenities",
                     "rating", "reviews", "beds", "available", "color", "emoji", "perk",
                     "verified", "tags"}
    missing = [it["id"] for it in listings if not required_keys.issubset(it.keys())]
    check(len(missing) == 0, "listings: each has all required keys", f"missing in {missing[:3]}")
    check(all(it.get("verified") is True for it in listings), "listings: all verified=true")
    check(all(isinstance(it.get("featured"), bool) or it.get("featured") is None or it.get("featured") is False or it.get("featured") is True for it in listings),
          "listings: featured is bool")
    check(all(isinstance(it.get("amenities"), list) for it in listings), "listings: amenities is list")

    # category filter
    print("\n=== 2b. category filters ===")
    for slug, expected in (("housing", 12), ("vehicle", 10), ("hotel", 12), ("coworking", 8)):
        r = requests.get(f"{BASE}/rentals/listings", headers=H, params={"category": slug}, timeout=30)
        j = r.json()
        check(r.status_code == 200 and len(j.get("listings", [])) == expected,
              f"listings?category={slug} → {expected}",
              f"got {len(j.get('listings', []))}")
        check(all(it["category"] == slug for it in j.get("listings", [])),
              f"listings?category={slug}: all items category=={slug}")

    # city filter
    print("\n=== 2c. city=Bengaluru ===")
    r = requests.get(f"{BASE}/rentals/listings", headers=H, params={"city": "Bengaluru"}, timeout=30)
    j = r.json()
    beng = j.get("listings", [])
    check(r.status_code == 200 and len(beng) > 0, "listings?city=Bengaluru: >0 results")
    ok = all("bengaluru" in (it.get("city", "") + " " + it.get("location", "")).lower() for it in beng)
    check(ok, "listings?city=Bengaluru: all contain Bengaluru")

    # q filter
    print("\n=== 2d. q=Zoomcar ===")
    r = requests.get(f"{BASE}/rentals/listings", headers=H, params={"q": "Zoomcar"}, timeout=30)
    j = r.json()
    z = j.get("listings", [])
    check(r.status_code == 200 and len(z) >= 1, "listings?q=Zoomcar: ≥1 result")
    check(any("zoomcar" in it.get("title", "").lower() for it in z), "listings?q=Zoomcar: title contains Zoomcar")

    # price range
    print("\n=== 2e. min/max price ===")
    r = requests.get(f"{BASE}/rentals/listings", headers=H,
                     params={"min_price": 5000, "max_price": 10000}, timeout=30)
    j = r.json()
    prc = j.get("listings", [])
    check(r.status_code == 200, "listings?price range: 200")
    ok = all(5000 <= it.get("rent_inr", 0) <= 10000 for it in prc)
    check(ok, f"listings?5000-10000: all in range (got {len(prc)})")

    # ===== 3. LISTING DETAIL =====
    print("\n=== 3. GET /rentals/listings/H1 ===")
    r = requests.get(f"{BASE}/rentals/listings/H1", headers=H, timeout=30)
    check(r.status_code == 200, "listing H1: 200", r.text[:120])
    j = r.json()
    d = j.get("listing", {})
    check(d.get("id") == "H1", "listing H1: id correct")
    check(isinstance(d.get("description"), str) and len(d["description"]) > 20, "listing H1: description present")
    check(isinstance(d.get("gallery"), list), "listing H1: gallery is list")
    hr = d.get("house_rules", [])
    check(isinstance(hr, list) and len(hr) >= 4, f"listing H1: house_rules≥4 (got {len(hr)})")
    host = d.get("host", {})
    check(isinstance(host, dict) and host.get("name"), "listing H1: host object present")

    r = requests.get(f"{BASE}/rentals/listings/INVALID", headers=H, timeout=30)
    check(r.status_code == 404, "listing INVALID → 404", f"got {r.status_code}")

    # ===== 4. BOOK =====
    print("\n=== 4. POST /rentals/book (H4 housing) ===")
    body = {"listing_id": "H4", "check_in": "2026-06-01", "check_out": "2026-07-01",
            "guests": 1, "notes": "backend test"}
    r = requests.post(f"{BASE}/rentals/book", headers=H, json=body, timeout=30)
    check(r.status_code == 200, "book H4: 200", r.text[:200])
    j = r.json()
    check(j.get("ok") is True, "book H4: ok=true")
    bk = j.get("booking", {})
    bid = bk.get("booking_id", "")
    check(bid.startswith("RNT-"), "book H4: booking_id starts RNT-", f"bid={bid}")
    check(isinstance(bk.get("listing_snapshot"), dict), "book H4: listing_snapshot dict")
    check(bk.get("status") == "confirmed", "book H4: status=confirmed", f"s={bk.get('status')}")
    dur = bk.get("duration", {})
    check(dur.get("unit") == "months", f"book H4: duration.unit=months (got {dur.get('unit')})")
    cb = bk.get("cost_breakdown", {})
    for f in ("subtotal_inr", "sa_savings_inr", "service_fee_inr", "security_deposit_inr", "total_inr"):
        check(f in cb, f"book H4: cost_breakdown.{f}")
    # For H4: rent=14000, orig=17000, units = floor(30/30)=1
    # subtotal=14000*1=14000, savings=(17000-14000)*1=3000, fee=round(14000*0.04)=560, deposit=14000, total=28560
    check(cb.get("subtotal_inr") == 14000, f"book H4: subtotal=14000 (got {cb.get('subtotal_inr')})")
    check(cb.get("sa_savings_inr") == 3000, f"book H4: savings=3000 (got {cb.get('sa_savings_inr')})")
    check(cb.get("service_fee_inr") == 560, f"book H4: fee=560 (got {cb.get('service_fee_inr')})")
    check(cb.get("security_deposit_inr") == 14000, f"book H4: deposit=14000 (got {cb.get('security_deposit_inr')})")
    check(cb.get("total_inr") == 28560, f"book H4: total=28560 (got {cb.get('total_inr')})")
    tl = bk.get("timeline", [])
    check(len(tl) == 5, f"book H4: timeline 5 entries (got {len(tl)})")
    check([t.get("id") for t in tl] == ["booked", "confirmed", "checkin", "checkout", "completed"],
          "book H4: timeline ids order")
    check(j.get("redirect", "").startswith("/rentals?bookingId="), "book H4: redirect present")

    housing_bid = bid

    # No listing_id → 400
    r = requests.post(f"{BASE}/rentals/book", headers=H, json={}, timeout=30)
    check(r.status_code == 400, f"book w/o listing_id → 400 (got {r.status_code})")

    r = requests.post(f"{BASE}/rentals/book", headers=H, json={"listing_id": "XYZ999"}, timeout=30)
    check(r.status_code == 404, f"book unknown → 404 (got {r.status_code})")

    # Vehicle booking (V1 — Rapido bike, rent_label='₹1,499/mo' → wait, V1 is /mo too!)
    # Need a vehicle that's /day. V5 Royloy is /day.
    print("\n=== 4b. POST /rentals/book (V5 vehicle per-day) ===")
    vbody = {"listing_id": "V5", "check_in": "2026-06-01", "check_out": "2026-06-04",
             "guests": 1, "notes": "bike trip"}
    r = requests.post(f"{BASE}/rentals/book", headers=H, json=vbody, timeout=30)
    check(r.status_code == 200, "book V5: 200", r.text[:200])
    vj = r.json()
    vbk = vj.get("booking", {})
    vdur = vbk.get("duration", {})
    check(vdur.get("unit") == "nights", f"book V5: unit=nights (got {vdur.get('unit')})")
    vcb = vbk.get("cost_breakdown", {})
    check(vcb.get("security_deposit_inr") == 0, f"book V5: deposit=0 (got {vcb.get('security_deposit_inr')})")
    # V5: rent=599, 3 days → subtotal=1797, fee=round(1797*0.04)=72, deposit=0, total=1869
    check(vcb.get("subtotal_inr") == 599 * 3, f"book V5: subtotal=1797 (got {vcb.get('subtotal_inr')})")

    # ===== 5. LIST BOOKINGS =====
    print("\n=== 5. GET /rentals/bookings ===")
    r = requests.get(f"{BASE}/rentals/bookings", headers=H, timeout=30)
    check(r.status_code == 200, "bookings list: 200")
    j = r.json()
    arr = j.get("bookings", [])
    check(any(b.get("booking_id") == housing_bid for b in arr),
          f"bookings list contains housing_bid={housing_bid}")
    # sort desc by created_at
    if len(arr) >= 2:
        from datetime import datetime as _dt
        try:
            times = [_dt.fromisoformat(b["created_at"].replace("Z", "+00:00")) for b in arr if b.get("created_at")]
            sorted_ok = all(times[i] >= times[i + 1] for i in range(len(times) - 1))
            check(sorted_ok, "bookings: sorted by created_at desc")
        except Exception as e:
            check(False, "bookings: sort check", str(e))

    # ===== 6. BOOKING DETAIL =====
    print(f"\n=== 6. GET /rentals/bookings/{housing_bid} ===")
    r = requests.get(f"{BASE}/rentals/bookings/{housing_bid}", headers=H, timeout=30)
    check(r.status_code == 200, "booking detail: 200")
    dj = r.json().get("booking", {})
    check(dj.get("booking_id") == housing_bid, "booking detail: id matches")
    check("days_until_checkout" in dj, "booking detail: days_until_checkout present")

    r = requests.get(f"{BASE}/rentals/bookings/INVALID", headers=H, timeout=30)
    check(r.status_code == 404, f"booking INVALID → 404 (got {r.status_code})")

    # ===== 7. CANCEL =====
    print(f"\n=== 7. POST /rentals/bookings/{housing_bid}/cancel ===")
    r = requests.post(f"{BASE}/rentals/bookings/{housing_bid}/cancel", headers=H, timeout=30)
    check(r.status_code == 200, "cancel 1st: 200", r.text[:120])
    j = r.json()
    check(j.get("ok") is True and j.get("status") == "cancelled", "cancel 1st: ok + cancelled")
    # 2nd time → 404 (already cancelled)
    r = requests.post(f"{BASE}/rentals/bookings/{housing_bid}/cancel", headers=H, timeout=30)
    check(r.status_code == 404, f"cancel 2nd → 404 (got {r.status_code})")

    # ===== 8. AI RECOMMEND =====
    print("\n=== 8. POST /rentals/ai/recommend ===")
    body = {"prefs": {"budget": 10000, "city": "Bengaluru", "category": "housing", "vibe": "premium"}}
    r = requests.post(f"{BASE}/rentals/ai/recommend", headers=H, json=body, timeout=30)
    check(r.status_code == 200, "ai recommend: 200", r.text[:150])
    j = r.json()
    recs = j.get("recommendations", [])
    check(isinstance(recs, list) and 0 < len(recs) <= 6, f"ai recommend: up to 6 items (got {len(recs)})")
    rat = j.get("rationale", "")
    check(isinstance(rat, str) and len(rat) > 0, "ai recommend: rationale non-empty")
    check("10,000" in rat or "10000" in rat, f"ai rationale mentions budget: '{rat}'")
    check("Bengaluru" in rat, "ai rationale mentions Bengaluru")
    check("Housing" in rat, "ai rationale mentions Housing")
    # top rec should be housing + Bengaluru + under 10k
    if recs:
        top = recs[0]
        check(top.get("category") == "housing", f"ai top rec category=housing (got {top.get('category')})")
        check(top.get("rent_inr", 999999) <= 10000, f"ai top rec rent<=10000 (got {top.get('rent_inr')})")
        check("bengaluru" in (top.get("city", "") + " " + top.get("location", "")).lower(),
              "ai top rec in Bengaluru")

    # ===== SUMMARY =====
    print("\n\n========== SUMMARY ==========")
    print(f"PASSED: {len(passed)}")
    print(f"FAILED: {len(failed)}")
    if failed:
        print("\nFailures:")
        for f in failed:
            print(f"  - {f}")
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
