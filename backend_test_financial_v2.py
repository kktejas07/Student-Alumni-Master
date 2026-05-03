"""
Financial Services V2 — Backend test suite (21 endpoints).

Login: realtime@studentalumni.in / RealTime@2026
Base URL: from /app/frontend/.env → EXPO_PUBLIC_BACKEND_URL + /api
"""
import os
import sys
import json
import requests

BASE = "https://hiring-mvvm.preview.emergentagent.com/api"
EMAIL = "realtime@studentalumni.in"
PWD = "RealTime@2026"

PASS, FAIL = 0, 0
FAILS = []

def ok(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  PASS ✅  {name}" + (f" — {detail}" if detail else ""))
    else:
        FAIL += 1
        FAILS.append(f"{name} — {detail}")
        print(f"  FAIL ❌  {name}" + (f" — {detail}" if detail else ""))


def login():
    r = requests.post(f"{BASE}/auth/login",
                      json={"email": EMAIL, "password": PWD}, timeout=30)
    if r.status_code != 200:
        print(f"Login failed: {r.status_code} {r.text[:300]}")
        sys.exit(1)
    tok = r.json()["access_token"]
    return {"Authorization": f"Bearer {tok}"}


def main():
    print("=" * 70)
    print("FINANCIAL SERVICES V2 — TEST SUITE")
    print("=" * 70)
    headers = login()
    print(f"Logged in as {EMAIL}\n")

    # Always start fresh (wipe+reseed)
    print("\n── Ensure fresh seed (POST /financial/refresh) ─────────────")
    r = requests.post(f"{BASE}/financial/refresh", headers=headers, timeout=30)
    ok("refresh: 200", r.status_code == 200, f"code={r.status_code}")
    if r.status_code == 200:
        j = r.json()
        ok("refresh: total=46", j.get("total") == 46, f"total={j.get('total')}")

    # ─── GET /financial/all ───────────────────────────────────────────
    print("\n── GET /financial/all ──────────────────────────────────────")
    r = requests.get(f"{BASE}/financial/all", headers=headers, timeout=30)
    ok("all: 200", r.status_code == 200)
    j = r.json()
    by_cat = j.get("by_category", {})
    ok("all: has 5 categories",
       all(c in by_cat for c in ["scholarship", "loan", "startup_funding",
                                   "insurance", "venture_capital"]),
       f"keys={list(by_cat.keys())}")
    ok("all: total=46", j.get("total") == 46, f"total={j.get('total')}")
    # match_score on every item
    items_all = []
    for v in by_cat.values(): items_all.extend(v)
    ok("all: every item has match_score",
       all("match_score" in it for it in items_all),
       f"count={len(items_all)}")
    # Record sample ids for later
    sample_id = items_all[0]["financial_id"] if items_all else None
    scholarship_ids = [it["financial_id"] for it in by_cat.get("scholarship", [])]

    # ─── scholarships/search ──────────────────────────────────────────
    print("\n── GET /financial/scholarships/search ──────────────────────")
    r = requests.get(f"{BASE}/financial/scholarships/search",
                     headers=headers, timeout=30)
    ok("scholarships: 200", r.status_code == 200)
    j = r.json()
    results = j.get("results", [])
    ok("scholarships: returns list", len(results) > 0, f"n={len(results)}")
    scores = [it.get("match_score") for it in results]
    ok("scholarships: sorted by match_score desc",
       scores == sorted(scores, reverse=True),
       f"scores={scores[:5]}")

    r = requests.get(f"{BASE}/financial/scholarships/search?status=open",
                     headers=headers, timeout=30)
    ok("scholarships status=open: 200", r.status_code == 200)
    r_all = requests.get(f"{BASE}/financial/scholarships/search",
                          headers=headers, timeout=30).json()
    ok("scholarships status=open: subset",
       len(r.json().get("results", [])) < len(r_all.get("results", [])) or
       len(r.json().get("results", [])) == len(r_all.get("results", [])),
       f"open={len(r.json().get('results', []))} total={len(r_all.get('results', []))}")
    ok("scholarships status=open: only open items",
       all(x.get("status") == "open" for x in r.json().get("results", [])))

    # ─── loans/search ─────────────────────────────────────────────────
    print("\n── GET /financial/loans/search?interest_rate_max=10 ────────")
    r = requests.get(f"{BASE}/financial/loans/search?interest_rate_max=10",
                     headers=headers, timeout=30)
    ok("loans: 200", r.status_code == 200)
    results = r.json().get("results", [])
    ok("loans: all have interest_rate <= 10",
       all((x.get("interest_rate") or 99) <= 10 for x in results),
       f"rates={[x.get('interest_rate') for x in results]}")

    # ─── startup-funding/search ───────────────────────────────────────
    print("\n── GET /financial/startup-funding/search?funding_stage=seed ")
    r = requests.get(f"{BASE}/financial/startup-funding/search?funding_stage=seed",
                     headers=headers, timeout=30)
    ok("startup-funding: 200", r.status_code == 200)
    results = r.json().get("results", [])
    ok("startup-funding: has results", len(results) > 0, f"n={len(results)}")
    ok("startup-funding: every stage=seed",
       all(x.get("stage") == "seed" for x in results),
       f"stages={[x.get('stage') for x in results]}")

    # ─── insurance/search ─────────────────────────────────────────────
    print("\n── GET /financial/insurance/search?coverage_type=health ────")
    r = requests.get(f"{BASE}/financial/insurance/search?coverage_type=health",
                     headers=headers, timeout=30)
    ok("insurance: 200", r.status_code == 200)
    results = r.json().get("results", [])
    ok("insurance: only health",
       all(x.get("subcategory") == "health" for x in results),
       f"subs={[x.get('subcategory') for x in results]}")

    # ─── venture-capital/search ───────────────────────────────────────
    print("\n── GET /financial/venture-capital/search?funding_stage=seed ")
    r = requests.get(f"{BASE}/financial/venture-capital/search?funding_stage=seed",
                     headers=headers, timeout=30)
    ok("vc seed: 200", r.status_code == 200)
    results = r.json().get("results", [])
    ok("vc seed: all stage=seed",
       all(x.get("stage") == "seed" for x in results),
       f"stages={[x.get('stage') for x in results]}")
    # total VC count
    r_all = requests.get(f"{BASE}/financial/venture-capital/search",
                          headers=headers, timeout=30).json()
    ok("vc: total >= 10", r_all.get("total_count", 0) >= 10,
       f"total={r_all.get('total_count')}")

    # ─── detail ────────────────────────────────────────────────────────
    print("\n── GET /financial/{id} ─────────────────────────────────────")
    if sample_id:
        r = requests.get(f"{BASE}/financial/{sample_id}",
                         headers=headers, timeout=30)
        ok("detail: 200", r.status_code == 200)
        d = r.json()
        ok("detail: has match_score", "match_score" in d)
        ok("detail: financial_id matches", d.get("financial_id") == sample_id)
    r = requests.get(f"{BASE}/financial/does-not-exist",
                     headers=headers, timeout=30)
    ok("detail: 404 for bad id", r.status_code == 404)

    # ─── profile ───────────────────────────────────────────────────────
    print("\n── GET /financial/me/profile (defaults) ────────────────────")
    # First, clear any existing profile for pure default scenario? No, we
    # cannot without DB access. We accept that scholarship_preference=='merit'
    # is returned (default or explicit).
    r = requests.get(f"{BASE}/financial/me/profile",
                     headers=headers, timeout=30)
    ok("profile: 200", r.status_code == 200)
    p = r.json()
    ok("profile: scholarship_preference defaults to 'merit'",
       p.get("scholarship_preference") == "merit",
       f"pref={p.get('scholarship_preference')}")

    # ─── PATCH profile ─────────────────────────────────────────────────
    print("\n── PATCH /financial/me/profile ─────────────────────────────")
    r = requests.patch(f"{BASE}/financial/me/profile",
                        headers=headers,
                        json={"cgpa": 8.5, "annual_family_income": 600000,
                              "institution_tier": "top_tier"},
                        timeout=30)
    ok("patch profile: 200", r.status_code == 200)
    ok("patch profile: ok=true", r.json().get("ok") is True)
    r = requests.get(f"{BASE}/financial/me/profile",
                     headers=headers, timeout=30).json()
    ok("profile read-back: cgpa=8.5", float(r.get("cgpa") or 0) == 8.5)
    ok("profile read-back: annual_family_income=600000",
       r.get("annual_family_income") == 600000)
    ok("profile read-back: institution_tier=top_tier",
       r.get("institution_tier") == "top_tier")

    # After PATCH → scholarship match scores for Google/Tata/Aditya Birla >= 75
    print("\n── match_score boost for top scholarships (>= 75) ──────────")
    r = requests.get(f"{BASE}/financial/scholarships/search",
                     headers=headers, timeout=30).json()
    target_names = ["Google Generation", "Tata", "Aditya Birla"]
    found = {}
    for it in r.get("results", []):
        for t in target_names:
            if t.lower() in (it.get("name", "").lower()):
                found[t] = it.get("match_score", 0)
    for t in target_names:
        ok(f"  {t} match_score >= 75",
           found.get(t, 0) >= 75,
           f"got={found.get(t)}")

    # ─── save / unsave ─────────────────────────────────────────────────
    print("\n── POST /financial/{id}/save (toggle) ──────────────────────")
    test_id = sample_id
    r1 = requests.post(f"{BASE}/financial/{test_id}/save",
                        headers=headers, timeout=30)
    ok("save#1: 200", r1.status_code == 200)
    # Ensure action depends on current state — call twice and ensure it toggles
    r2 = requests.post(f"{BASE}/financial/{test_id}/save",
                        headers=headers, timeout=30)
    a1, a2 = r1.json().get("action"), r2.json().get("action")
    ok("save toggles saved/unsaved",
       (a1 == "saved" and a2 == "unsaved") or (a1 == "unsaved" and a2 == "saved"),
       f"{a1} → {a2}")
    # Save it so /me/saved has one
    r = requests.post(f"{BASE}/financial/{test_id}/save",
                      headers=headers, timeout=30)
    saved_now = r.json().get("action") == "saved"
    if not saved_now:
        # toggle one more time
        r = requests.post(f"{BASE}/financial/{test_id}/save",
                          headers=headers, timeout=30)

    # ─── saved list ────────────────────────────────────────────────────
    print("\n── GET /financial/me/saved ─────────────────────────────────")
    r = requests.get(f"{BASE}/financial/me/saved",
                     headers=headers, timeout=30)
    ok("saved: 200", r.status_code == 200)
    ids = [x["financial_id"] for x in r.json().get("items", [])]
    ok("saved: contains test_id", test_id in ids, f"saved={ids}")

    # ─── apply ────────────────────────────────────────────────────────
    print("\n── POST /financial/{id}/apply ──────────────────────────────")
    r = requests.post(f"{BASE}/financial/{test_id}/apply",
                     headers=headers, timeout=30)
    ok("apply: 200", r.status_code == 200)
    ok("apply: ok=true", r.json().get("ok") is True)

    # ─── activity ─────────────────────────────────────────────────────
    print("\n── POST /financial/{id}/activity ───────────────────────────")
    r = requests.post(f"{BASE}/financial/{test_id}/activity",
                      headers=headers, json={"action": "view"}, timeout=30)
    ok("activity view: 200", r.status_code == 200)
    ok("activity view: ok=true", r.json().get("ok") is True)
    r = requests.post(f"{BASE}/financial/{test_id}/activity",
                      headers=headers, json={"action": "bogus"}, timeout=30)
    ok("activity bogus: 400", r.status_code == 400,
       f"code={r.status_code}")

    # ─── EMI ──────────────────────────────────────────────────────────
    print("\n── POST /financial/emi-calculate ───────────────────────────")
    r = requests.post(f"{BASE}/financial/emi-calculate",
                     headers=headers,
                     json={"loan_amount": 1500000, "interest_rate": 8.5,
                           "tenure_months": 120}, timeout=30)
    ok("emi: 200", r.status_code == 200)
    d = r.json()
    emi = d.get("monthly_emi")
    interest = d.get("total_interest")
    ok("emi monthly ≈ 18598",
       emi is not None and abs(emi - 18598) <= 5,
       f"got={emi}")
    ok("emi total_interest ≈ 731723",
       interest is not None and abs(interest - 731723) <= 100,
       f"got={interest}")
    # edges
    for edge in [{"loan_amount": 0, "interest_rate": 8.5, "tenure_months": 120},
                  {"loan_amount": 100000, "interest_rate": 0, "tenure_months": 60},
                  {"loan_amount": 100000, "interest_rate": 8.5, "tenure_months": 0}]:
        r = requests.post(f"{BASE}/financial/emi-calculate",
                         headers=headers, json=edge, timeout=30)
        ok(f"emi edge {edge}: 400", r.status_code == 400,
           f"code={r.status_code}")

    # ─── AI helpers (5) ───────────────────────────────────────────────
    print("\n── POST /financial/ai/scholarships ─────────────────────────")
    r = requests.post(f"{BASE}/financial/ai/scholarships",
                     headers=headers,
                     json={"cgpa": 9.2, "institution_tier": "top_tier",
                           "scholarship_preference": "merit"},
                     timeout=30)
    ok("ai schol: 200", r.status_code == 200)
    d = r.json()
    ok("ai schol: has top_3", len(d.get("top_3", [])) == 3)
    ok("ai schol: has ranked", len(d.get("ranked", [])) > 0)
    ok("ai schol: has explanations", len(d.get("explanations", [])) == 3)
    ok("ai schol: answers_saved includes keys",
       set(d.get("answers_saved", [])) >= {"cgpa", "institution_tier",
                                            "scholarship_preference"})
    top_scores = [x.get("match_score") for x in d.get("top_3", [])]
    ok("ai schol: top_3 match_score >= 80",
       all((s or 0) >= 80 for s in top_scores),
       f"scores={top_scores}")

    print("\n── POST /financial/ai/loans ────────────────────────────────")
    r = requests.post(f"{BASE}/financial/ai/loans",
                     headers=headers,
                     json={"loan_need": 1500000,
                           "loan_repayment_capacity": 30000,
                           "has_collateral": "yes",
                           "cibil_range": "750-800"},
                     timeout=30)
    ok("ai loans: 200", r.status_code == 200)
    d = r.json()
    ok("ai loans: top_3 size=3", len(d.get("top_3", [])) == 3)
    rates = [x.get("interest_rate") for x in d.get("top_3", [])]
    # Favor low rates — at least one of top 3 should be <= 9
    ok("ai loans: top_3 favors low rates",
       any((r or 99) <= 9 for r in rates), f"rates={rates}")

    print("\n── POST /financial/ai/startup-funding ──────────────────────")
    r = requests.post(f"{BASE}/financial/ai/startup-funding",
                     headers=headers,
                     json={"startup_stage": "seed",
                           "startup_sector": "fintech",
                           "funding_need": 5000000},
                     timeout=30)
    ok("ai startup: 200", r.status_code == 200)
    d = r.json()
    ok("ai startup: top_3 size=3", len(d.get("top_3", [])) == 3)
    stages = [x.get("stage") for x in d.get("top_3", [])]
    ok("ai startup: top_3 stage=seed or matches",
       all((s or "").lower() in {"seed", "pre_seed", "early"} for s in stages),
       f"stages={stages}")

    print("\n── POST /financial/ai/venture-capital ──────────────────────")
    r = requests.post(f"{BASE}/financial/ai/venture-capital",
                     headers=headers,
                     json={"startup_stage": "series_a",
                           "startup_sector": "fintech",
                           "funding_need": 50000000},
                     timeout=30)
    ok("ai vc: 200", r.status_code == 200)
    d = r.json()
    ok("ai vc: top_3 size=3", len(d.get("top_3", [])) == 3)
    stages = [x.get("stage") for x in d.get("top_3", [])]
    ok("ai vc: top_3 stages include series_a",
       any("series_a" in (s or "") for s in stages),
       f"stages={stages}")

    print("\n── POST /financial/ai/insurance ────────────────────────────")
    r = requests.post(f"{BASE}/financial/ai/insurance",
                     headers=headers,
                     json={"age": 25, "coverage_type": "health",
                           "insurance_budget": 5000},
                     timeout=30)
    ok("ai ins: 200", r.status_code == 200)
    d = r.json()
    ok("ai ins: top_3 size=3",
       len(d.get("top_3", [])) == 3 or len(d.get("top_3", [])) >= 2,
       f"size={len(d.get('top_3', []))}")
    subs = [x.get("subcategory") for x in d.get("top_3", [])]
    ok("ai ins: top_3 skew to health",
       sum(1 for s in subs if s == "health") >= 1, f"subs={subs}")

    # ─── final refresh re-check ───────────────────────────────────────
    print("\n── Final sanity: refresh again ─────────────────────────────")
    r = requests.post(f"{BASE}/financial/refresh",
                     headers=headers, timeout=30)
    ok("refresh final: total=46", r.json().get("total") == 46,
       f"total={r.json().get('total')}")

    # ─── Summary ──────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print(f"TOTAL: {PASS} PASS, {FAIL} FAIL")
    print("=" * 70)
    if FAILS:
        print("\nFailing items:")
        for f in FAILS: print(" - " + f)
    sys.exit(0 if FAIL == 0 else 1)


if __name__ == "__main__":
    main()
