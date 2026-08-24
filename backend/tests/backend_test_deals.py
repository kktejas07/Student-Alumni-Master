"""
Backend test for SA Member Deals aggregator (/app/backend/deals_aggregator.py).
Runs end-to-end against the public preview URL.
"""
import os
import random
import sys
import time
import requests

BASE = "https://hiring-mvvm.preview.emergentagent.com/api"
EMAIL = "realtime@studentalumni.in"
PASSWORD = "RealTime@2026"

# Optional knob: skip the AI generate test (costs LLM credits) unless RUN_AI=1
RUN_AI = os.environ.get("RUN_AI", "0") == "1"

PASS = []
FAIL = []


def check(cond, label, detail=""):
    if cond:
        PASS.append(label)
        print(f"  ✅ {label}")
    else:
        FAIL.append(f"{label} — {detail}")
        print(f"  ❌ {label} — {detail}")


def hdr(name):
    print(f"\n=== {name} ===")


def main():
    # ── Auth ─────────────────────────────────────────────────────────
    hdr("AUTH")
    r = requests.post(f"{BASE}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=20)
    if r.status_code != 200:
        print(f"FATAL: login failed {r.status_code} {r.text[:200]}")
        sys.exit(1)
    data = r.json()
    token = data.get("access_token")
    check(bool(token), "Login returns access_token")
    H = {"Authorization": f"Bearer {token}"}

    # ── 1. GET /deals/all (no params) ────────────────────────────────
    hdr("1. GET /deals/all (no params)")
    r = requests.get(f"{BASE}/deals/all", headers=H, timeout=30)
    check(r.status_code == 200, "GET /deals/all 200", f"status={r.status_code}")
    j = r.json() if r.status_code == 200 else {}
    for k in ["deals", "total_count", "last_updated", "cache_ttl_min", "sources", "category", "country"]:
        check(k in j, f"Response has '{k}'")
    check(j.get("cache_ttl_min") == 60, "cache_ttl_min == 60", f"got {j.get('cache_ttl_min')}")
    deals = j.get("deals", [])
    check(len(deals) >= 50, f"Total >= 50 deals", f"got {len(deals)}")
    # schema
    required_keys = ["deal_id", "brand", "title", "category", "description", "price_inr",
                     "price_label", "original_inr", "original_label", "discount_pct",
                     "discount_label", "absolute_savings_inr", "affiliate_url", "code",
                     "logo_url", "accent", "student_only", "auto_apply", "country",
                     "available_globally", "source", "tags"]
    if deals:
        d0 = deals[0]
        missing = [k for k in required_keys if k not in d0]
        check(not missing, "Deal[0] has all required keys", f"missing: {missing}")
        check(isinstance(d0.get("tags"), list), "Deal.tags is a list")

    all_deals = deals  # keep for later use

    # ── 2. category=tech ─────────────────────────────────────────────
    hdr("2. GET /deals/all?category=tech")
    r = requests.get(f"{BASE}/deals/all?category=tech", headers=H, timeout=20)
    check(r.status_code == 200, "200")
    tech = r.json().get("deals", []) if r.status_code == 200 else []
    check(len(tech) > 0, f"tech deals returned ({len(tech)})")
    check(all(d.get("category") == "tech" for d in tech), "All deals.category == 'tech'")
    brands = {d.get("brand") for d in tech}
    expected_tech = {"GitHub", "JetBrains", "Figma", "Notion", "Microsoft", "Canva"}
    found = expected_tech & brands
    check(len(found) >= 4, f"Expected tech brands present ({len(found)}/6)", f"found={found}")

    # ── 3. category=travel ───────────────────────────────────────────
    hdr("3. GET /deals/all?category=travel")
    r = requests.get(f"{BASE}/deals/all?category=travel", headers=H, timeout=20)
    check(r.status_code == 200, "200")
    travel = r.json().get("deals", []) if r.status_code == 200 else []
    tbrands = {d.get("brand") for d in travel}
    expected_travel = {"MakeMyTrip", "Yatra", "RedBus", "Booking.com", "IndiGo", "Indian Railways"}
    found_t = expected_travel & tbrands
    check(len(found_t) >= 4, f"Travel brands present ({len(found_t)}/6)", f"found={found_t}")

    # ── 4. category=fashion ──────────────────────────────────────────
    hdr("4. GET /deals/all?category=fashion")
    r = requests.get(f"{BASE}/deals/all?category=fashion", headers=H, timeout=20)
    check(r.status_code == 200, "200")
    fashion = r.json().get("deals", []) if r.status_code == 200 else []
    fbrands = {d.get("brand") for d in fashion}
    expected_fashion = {"Myntra", "Ajio", "H&M", "Nike", "Bewakoof"}
    found_f = expected_fashion & fbrands
    check(len(found_f) >= 4, f"Fashion brands present ({len(found_f)}/5)", f"found={found_f}")

    # ── 5. category=grocery ──────────────────────────────────────────
    hdr("5. GET /deals/all?category=grocery")
    r = requests.get(f"{BASE}/deals/all?category=grocery", headers=H, timeout=20)
    check(r.status_code == 200, "200")
    grocery = r.json().get("deals", []) if r.status_code == 200 else []
    gbrands = {d.get("brand") for d in grocery}
    expected_grocery = {"BigBasket", "Blinkit", "Zepto", "Amazon Fresh"}
    found_g = expected_grocery & gbrands
    check(len(found_g) >= 3, f"Grocery brands present ({len(found_g)}/4)", f"found={found_g}")

    # ── 6. student_only=true ─────────────────────────────────────────
    hdr("6. GET /deals/all?student_only=true")
    r = requests.get(f"{BASE}/deals/all?student_only=true", headers=H, timeout=20)
    check(r.status_code == 200, "200")
    so_deals = r.json().get("deals", []) if r.status_code == 200 else []
    check(len(so_deals) > 0, f"Student-only deals returned ({len(so_deals)})")
    bad = [d for d in so_deals if d.get("student_only") is not True]
    check(not bad, "All returned have student_only=true", f"{len(bad)} bad")

    # ── 7. GET /deals/stats ──────────────────────────────────────────
    hdr("7. GET /deals/stats")
    r = requests.get(f"{BASE}/deals/stats", headers=H, timeout=30)
    check(r.status_code == 200, "200", f"{r.status_code} {r.text[:150]}")
    s = r.json() if r.status_code == 200 else {}
    for k in ["total_deals", "free_deals", "hot_deals", "total_savings_inr",
              "yearly_savings_inr", "top_category", "best_roi", "smart_bundle",
              "smart_bundle_total_savings_inr", "by_category"]:
        check(k in s, f"stats has '{k}'")
    if s.get("top_category"):
        check(
            "id" in s["top_category"] and "savings" in s["top_category"],
            "top_category has id+savings",
        )
    if s.get("best_roi"):
        br = s["best_roi"]
        check(all(k in br for k in ["brand", "title", "savings_inr"]), "best_roi has brand/title/savings_inr")
    sb = s.get("smart_bundle") or []
    check(len(sb) == 4, f"smart_bundle length == 4 (got {len(sb)})")
    check(isinstance(s.get("by_category"), list), "by_category is list")

    # ── 8. POST /deals/refresh ───────────────────────────────────────
    hdr("8. POST /deals/refresh")
    r = requests.post(f"{BASE}/deals/refresh", headers=H, timeout=30)
    check(r.status_code == 200, "200", f"{r.status_code} {r.text[:150]}")
    rj = r.json() if r.status_code == 200 else {}
    check(rj.get("ok") is True, "ok == true")
    for k in ["total_inserted", "sources", "at"]:
        check(k in rj, f"refresh has '{k}'")

    # ── 9. POST /deals/claim/{deal_id} ───────────────────────────────
    hdr("9. POST /deals/claim/{deal_id}")
    if not all_deals:
        print("  SKIP claim tests — no deals in step 1")
    else:
        # 9a: get baseline wallet
        r = requests.get(f"{BASE}/wallet/summary", headers=H, timeout=15)
        check(r.status_code == 200, "GET /wallet/summary before claim")
        wsum = r.json() if r.status_code == 200 else {}
        baseline_balance = int(wsum.get("balance_credits", 0) or 0)
        print(f"  baseline balance={baseline_balance}")

        # Pick 5 distinct deal IDs (for steps 9 + 11)
        pool = [d for d in all_deals if d.get("deal_id")]
        random.seed(42)
        random.shuffle(pool)
        first_deal = pool[0]
        first_id = first_deal["deal_id"]

        r = requests.post(f"{BASE}/deals/claim/{first_id}", headers=H, timeout=20)
        check(r.status_code == 200, "first claim 200", f"{r.status_code} {r.text[:150]}")
        c1 = r.json() if r.status_code == 200 else {}
        check(c1.get("credits_awarded") == 20, f"credits_awarded == 20 (got {c1.get('credits_awarded')})")
        check(c1.get("todays_claims") == 1, f"todays_claims == 1 (got {c1.get('todays_claims')})")
        check(c1.get("max_per_day") == 3, f"max_per_day == 3 (got {c1.get('max_per_day')})")
        check(bool(c1.get("affiliate_url")), "affiliate_url returned")
        check("code" in c1, "code returned (may be empty)")
        bal_after_1 = c1.get("balance_credits")
        if bal_after_1 is not None:
            check(int(bal_after_1) - baseline_balance == 20,
                  f"balance increased by 20 (got delta {int(bal_after_1)-baseline_balance})",
                  f"baseline={baseline_balance} after={bal_after_1}")

        # 12: cross-module integration AFTER first claim
        hdr("12. Cross-module: GET /wallet/summary after claim")
        r = requests.get(f"{BASE}/wallet/summary", headers=H, timeout=15)
        check(r.status_code == 200, "wallet summary 200")
        wj = r.json() if r.status_code == 200 else {}
        new_bal = int(wj.get("balance_credits", 0) or 0)
        check(new_bal - baseline_balance == 20,
              f"wallet balance delta +20 (delta={new_bal-baseline_balance})",
              f"baseline={baseline_balance} new={new_bal}")
        history = wj.get("history") or []
        check(len(history) > 0, "wallet history non-empty")
        if history:
            h0 = history[0]
            check(h0.get("type") == "credit", f"history[0].type=='credit' (got {h0.get('type')})")
            check(int(h0.get("amount") or 0) == 20, f"history[0].amount==20 (got {h0.get('amount')})")
            meta = h0.get("metadata") or {}
            check(meta.get("kind") == "deal_claim", f"history[0].metadata.kind=='deal_claim' (got {meta.get('kind')})")

        # 9b: claim 3 more deals to hit daily quota
        hdr("9b. 3 more claims to trigger quota")
        # Need 3 unique deal_ids different from first_id; also ensure they are valid
        more_ids = []
        for d in pool[1:]:
            if d["deal_id"] != first_id:
                more_ids.append(d["deal_id"])
            if len(more_ids) >= 3:
                break
        results = []
        for i, did in enumerate(more_ids, start=2):
            rr = requests.post(f"{BASE}/deals/claim/{did}", headers=H, timeout=20)
            results.append((did, rr.status_code, rr.json() if rr.ok else rr.text))
            print(f"  claim #{i} did={did[:10]} status={rr.status_code} "
                  f"awarded={rr.json().get('credits_awarded') if rr.ok else '?'}")

        # 2nd claim (i=2) should award 20, todays_claims==2
        if len(results) >= 1:
            r2 = results[0][2]
            check(r2.get("credits_awarded") == 20 and r2.get("todays_claims") == 2,
                  "2nd claim: credits=20, todays_claims=2",
                  f"got awarded={r2.get('credits_awarded')} claims={r2.get('todays_claims')}")
        # 3rd claim (i=3) should award 20, todays_claims==3
        if len(results) >= 2:
            r3 = results[1][2]
            check(r3.get("credits_awarded") == 20 and r3.get("todays_claims") == 3,
                  "3rd claim: credits=20, todays_claims=3",
                  f"got awarded={r3.get('credits_awarded')} claims={r3.get('todays_claims')}")
        # 4th claim should be 0 credits with quota message, but affiliate_url still returned
        if len(results) >= 3:
            r4 = results[2][2]
            check(r4.get("credits_awarded") == 0, f"4th claim: credits_awarded == 0 (got {r4.get('credits_awarded')})")
            check(bool(r4.get("reason")), f"4th claim has quota reason (got {r4.get('reason')!r})")
            check(bool(r4.get("affiliate_url")), "4th claim still returns affiliate_url")

        # 9c: 404 for bogus deal_id
        hdr("9c. 404 for nonexistent deal")
        r = requests.post(f"{BASE}/deals/claim/nonexistent_id_xyz123", headers=H, timeout=15)
        check(r.status_code == 404, f"404 for nonexistent id (got {r.status_code})")

    # ── 10. GET /deals/sources ───────────────────────────────────────
    hdr("10. GET /deals/sources")
    r = requests.get(f"{BASE}/deals/sources", headers=H, timeout=15)
    check(r.status_code == 200, "200")
    src = r.json() if r.status_code == 200 else {}
    srcs = src.get("sources") or []
    check(len(srcs) == 3, f"sources length == 3 (got {len(srcs)})")
    names = {s.get("name") for s in srcs}
    for n in ["curated", "githubPack", "ai-trending"]:
        check(n in names, f"source '{n}' present")
    check("last_refresh_at" in src, "has last_refresh_at")
    check("status" in src, "has status")

    # ── 11. Tag Engine validation ────────────────────────────────────
    hdr("11. Tag Engine validation")
    # Re-fetch deals so they have freshest tags
    r = requests.get(f"{BASE}/deals/all", headers=H, timeout=20)
    deals2 = r.json().get("deals", []) if r.status_code == 200 else []
    check(len(deals2) > 0, "deals present for tag check")
    if deals2:
        allowed = {"HOT", "OFF_30", "STUDENT_VERIFIED", "INSTANT", "ENDING_SOON",
                   "NEW", "TRENDING", "INDIA_EXCLUSIVE", "NO_EXPIRY", "BEST_VALUE"}
        random.seed(7)
        sample = random.sample(deals2, min(5, len(deals2)))
        for d in sample:
            tags = d.get("tags") or []
            check(len(tags) >= 1, f"Deal '{d.get('brand')}' has >=1 tag", f"tags={tags}")
            bad = [t for t in tags if t not in allowed]
            check(not bad, f"Deal '{d.get('brand')}' tags all valid", f"invalid={bad}")
            check(not ("HOT" in tags and "OFF_30" in tags),
                  f"Deal '{d.get('brand')}' HOT/OFF_30 mutually exclusive",
                  f"tags={tags}")

        # auto_apply==true MUST include INSTANT
        auto_deals = [d for d in deals2 if d.get("auto_apply") is True]
        if auto_deals:
            violators = [d for d in auto_deals if "INSTANT" not in (d.get("tags") or [])]
            check(not violators, "All auto_apply deals have INSTANT tag",
                  f"{len(violators)} violations e.g. {violators[0].get('brand') if violators else ''}")

        # country='IN' AND available_globally=false → must have INDIA_EXCLUSIVE
        india_ex = [d for d in deals2 if d.get("country") == "IN" and d.get("available_globally") is False]
        check(len(india_ex) > 0, f"India-exclusive deal set non-empty ({len(india_ex)})")
        violators = [d for d in india_ex if "INDIA_EXCLUSIVE" not in (d.get("tags") or [])]
        check(not violators, "All India-exclusive deals tagged INDIA_EXCLUSIVE",
              f"{len(violators)} violators e.g. {violators[0].get('brand') if violators else ''}")

        # Specifically check the mentioned brands
        by_brand = {d.get("brand"): d for d in deals2}
        for b in ["Swiggy", "Zomato", "Rapido"]:
            d = by_brand.get(b)
            if d:
                check("INDIA_EXCLUSIVE" in (d.get("tags") or []),
                      f"{b} has INDIA_EXCLUSIVE tag",
                      f"tags={d.get('tags')}")

    # ── 13. OPTIONAL: AI generate ────────────────────────────────────
    if RUN_AI:
        hdr("13. POST /deals/ai-generate")
        r = requests.post(f"{BASE}/deals/ai-generate", headers=H, timeout=120)
        check(r.status_code == 200, f"ai-generate 200", f"{r.status_code} {r.text[:200]}")
        ag = r.json() if r.status_code == 200 else {}
        check(ag.get("ok") is True, "ok==true")
        check("generated_count" in ag, "has generated_count")
        check("expires_at" in ag, "has expires_at")
        check(ag.get("model") == "claude-sonnet-4-5", f"model is claude-sonnet-4-5 (got {ag.get('model')})")
        check(isinstance(ag.get("deals"), list), "deals is list")

        # 2nd call should be cached
        r = requests.post(f"{BASE}/deals/ai-generate", headers=H, timeout=60)
        check(r.status_code == 200, "2nd ai-generate 200")
        ag2 = r.json() if r.status_code == 200 else {}
        check(ag2.get("cached") is True, f"2nd call cached==true (got {ag2.get('cached')})")
    else:
        print("\n(Skipping 13. /deals/ai-generate — set RUN_AI=1 env to enable)")

    # ── Summary ──────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print(f"PASS: {len(PASS)}")
    print(f"FAIL: {len(FAIL)}")
    if FAIL:
        print("\nFAILURES:")
        for f in FAIL:
            print(f"  ✗ {f}")
        sys.exit(1)
    else:
        print("ALL CHECKS PASSED ✅")


if __name__ == "__main__":
    main()
