"""
Backend tests for SA Higher Education platform — /api/he/*
Runs 30 test items from review_request. Uses requests against public URL.
"""
import os
import re
import json
import sys
import time
from typing import Any, Dict, List, Optional

import requests

BASE = "https://hiring-mvvm.preview.emergentagent.com/api"
EMAIL = "realtime@studentalumni.in"
PASSWORD = "RealTime@2026"

ALLOWED_TAGS = {
    "TOP_RANKED", "FULLY_FUNDED", "DEADLINE_SOON", "SAFE_BET", "STRETCH",
    "INDIA_TOP", "GLOBAL_TOP_50", "HIGH_ROI", "NEW_INTAKE",
}

results: List[Dict[str, Any]] = []
created_app_id: Optional[str] = None


def log(name: str, ok: bool, detail: str = ""):
    results.append({"name": name, "ok": ok, "detail": detail})
    sym = "✅" if ok else "❌"
    print(f"{sym} {name} — {detail}")


def login() -> str:
    r = requests.post(f"{BASE}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


def main():
    token = login()
    H = {"Authorization": f"Bearer {token}"}

    # =========================================================
    # 1. GET /he/programmes — shape, seed, tag rules
    # =========================================================
    r = requests.get(f"{BASE}/he/programmes", headers=H, timeout=60)
    try:
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        data = r.json()
        assert set(["programmes", "total", "fetched_at"]).issubset(data.keys()), f"keys: {list(data.keys())}"
        progs = data["programmes"]
        assert len(progs) >= 10, f"only {len(progs)} programmes"
        required = ["id", "degree", "country", "match", "name", "institution", "duration",
                    "fee", "fee_amount", "fee_inr", "total_cost_inr", "mode", "intake",
                    "deadline", "decision_days", "apply_url", "min_cgpa", "acceptance_rate",
                    "qs_rank", "gre_required", "ielts_required", "post_grad_salary_inr", "tags"]
        missing_by_id: Dict[str, List[str]] = {}
        for p in progs:
            miss = [k for k in required if k not in p]
            if miss:
                missing_by_id[p.get("id", "?")] = miss
        assert not missing_by_id, f"missing fields: {missing_by_id}"
        by_id = {p["id"]: p for p in progs}
        assert "iitb-mtech-aiml" in by_id, "iitb-mtech-aiml missing"
        assert by_id["iitb-mtech-aiml"]["match"] == 96, f"IITB match={by_id['iitb-mtech-aiml']['match']}"
        assert "stanford-ms-cs" in by_id, "stanford-ms-cs missing"
        assert by_id["stanford-ms-cs"]["match"] == 88, f"Stanford match={by_id['stanford-ms-cs']['match']}"
        # Tags subset
        for p in progs:
            bad = [t for t in p["tags"] if t not in ALLOWED_TAGS]
            assert not bad, f"{p['id']} has unknown tags {bad}"
        # IISc PhD must have FULLY_FUNDED
        if "iisc-phd-cs" in by_id:
            assert "FULLY_FUNDED" in by_id["iisc-phd-cs"]["tags"], f"IISc tags: {by_id['iisc-phd-cs']['tags']}"
        # Stanford must have TOP_RANKED + GLOBAL_TOP_50
        st = by_id["stanford-ms-cs"]["tags"]
        assert "TOP_RANKED" in st and "GLOBAL_TOP_50" in st, f"Stanford tags: {st}"
        log("1. GET /he/programmes (shape+tags+match)", True,
            f"{len(progs)} progs, IITB match=96, Stanford tags={st}")
    except Exception as e:
        log("1. GET /he/programmes", False, str(e))

    # =========================================================
    # 2. GET /he/programmes?country=India
    # =========================================================
    r = requests.get(f"{BASE}/he/programmes", headers=H, params={"country": "India"}, timeout=30)
    try:
        assert r.status_code == 200, r.text
        data = r.json()
        countries = {p["country"] for p in data["programmes"]}
        assert countries == {"India"}, f"got countries={countries}"
        log("2. GET /he/programmes?country=India", True, f"{len(data['programmes'])} India progs")
    except Exception as e:
        log("2. GET /he/programmes?country=India", False, str(e))

    # =========================================================
    # 3. GET /he/programmes?degree=MS
    # =========================================================
    r = requests.get(f"{BASE}/he/programmes", headers=H, params={"degree": "MS"}, timeout=30)
    try:
        assert r.status_code == 200, r.text
        data = r.json()
        degs = {p["degree"] for p in data["programmes"]}
        assert degs == {"MS"}, f"got degrees={degs}"
        log("3. GET /he/programmes?degree=MS", True, f"{len(data['programmes'])} MS progs")
    except Exception as e:
        log("3. GET /he/programmes?degree=MS", False, str(e))

    # =========================================================
    # 4. GET /he/scholarships
    # =========================================================
    r = requests.get(f"{BASE}/he/scholarships", headers=H, timeout=30)
    try:
        assert r.status_code == 200, r.text
        data = r.json()
        assert "scholarships" in data and "total" in data, f"keys: {list(data.keys())}"
        sc = data["scholarships"]
        assert len(sc) >= 10, f"only {len(sc)}"
        req = ["id", "name", "funder", "country", "degree_levels", "award_inr",
               "coverage", "deadline", "eligibility", "url"]
        miss = {s.get("id", "?"): [k for k in req if k not in s] for s in sc}
        miss = {k: v for k, v in miss.items() if v}
        assert not miss, f"missing: {miss}"
        log("4. GET /he/scholarships", True, f"{len(sc)} scholarships")
    except Exception as e:
        log("4. GET /he/scholarships", False, str(e))

    # =========================================================
    # 5. GET /he/scholarships?country=UK
    # =========================================================
    r = requests.get(f"{BASE}/he/scholarships", headers=H, params={"country": "UK"}, timeout=30)
    try:
        assert r.status_code == 200, r.text
        data = r.json()
        countries = {s["country"] for s in data["scholarships"]}
        assert countries.issubset({"UK", "Multiple"}), f"got {countries}"
        log("5. GET /he/scholarships?country=UK", True, f"countries={countries}")
    except Exception as e:
        log("5. GET /he/scholarships?country=UK", False, str(e))

    # =========================================================
    # 6. GET /he/scholarships?degree=PG
    # =========================================================
    r = requests.get(f"{BASE}/he/scholarships", headers=H, params={"degree": "PG"}, timeout=30)
    try:
        assert r.status_code == 200, r.text
        data = r.json()
        bad = [s["id"] for s in data["scholarships"] if "PG" not in s.get("degree_levels", [])]
        assert not bad, f"no PG: {bad}"
        log("6. GET /he/scholarships?degree=PG", True, f"{len(data['scholarships'])} PG scholarships")
    except Exception as e:
        log("6. GET /he/scholarships?degree=PG", False, str(e))

    # =========================================================
    # 7. GET /he/countries
    # =========================================================
    r = requests.get(f"{BASE}/he/countries", headers=H, timeout=30)
    try:
        assert r.status_code == 200, r.text
        data = r.json()
        c = data["countries"]
        assert len(c) >= 8, f"only {len(c)}"
        req = ["id", "flag", "name", "programmes", "scholarships", "avg_fee_inr", "avg_living_inr"]
        miss_cs = {cc["name"]: [k for k in req if k not in cc] for cc in c}
        miss_cs = {k: v for k, v in miss_cs.items() if v}
        assert not miss_cs, f"missing: {miss_cs}"
        for cc in c:
            assert isinstance(cc["programmes"], int), f"{cc['name']} programmes not int"
            assert isinstance(cc["scholarships"], int), f"{cc['name']} scholarships not int"
        log("7. GET /he/countries", True, f"{len(c)} countries")
    except Exception as e:
        log("7. GET /he/countries", False, str(e))

    # =========================================================
    # 8. POST /he/compare — 2 ids, valid
    # =========================================================
    r = requests.post(f"{BASE}/he/compare", headers=H,
                      json={"programme_ids": ["iitb-mtech-aiml", "stanford-ms-cs"]}, timeout=30)
    try:
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        assert "programmes" in data and "rows" in data and "tied" in data, f"keys={list(data.keys())}"
        assert len(data["programmes"]) == 2, f"{len(data['programmes'])} progs"
        assert len(data["rows"]) >= 10, f"rows={len(data['rows'])}"
        row_keys = {row["key"] for row in data["rows"]}
        required_keys = {"match", "country", "duration", "total_cost_inr", "decision_days",
                         "qs_rank", "min_cgpa", "gre_required", "ielts_required", "post_grad_salary_inr"}
        missing_rk = required_keys - row_keys
        assert not missing_rk, f"missing row keys: {missing_rk}"
        assert "tied" in data, "no tied key"
        assert isinstance(data["tied"], bool), f"tied={data['tied']}"
        # tie_breaker_note exists (null or string) — key must at least be present
        assert "tie_breaker_note" in data, "no tie_breaker_note key"
        log("8. POST /he/compare (2 valid ids)", True,
            f"progs=2, rows={len(data['rows'])}, tied={data['tied']}")
    except Exception as e:
        log("8. POST /he/compare (2 valid ids)", False, str(e))

    # =========================================================
    # 9. compare with 1 id → 400
    # =========================================================
    r = requests.post(f"{BASE}/he/compare", headers=H,
                      json={"programme_ids": ["iitb-mtech-aiml"]}, timeout=15)
    log("9. POST /he/compare (1 id) → 400", r.status_code == 400, f"status={r.status_code}")

    # =========================================================
    # 10. compare with 5 ids → 400
    # =========================================================
    r = requests.post(f"{BASE}/he/compare", headers=H,
                      json={"programme_ids": ["a", "b", "c", "d", "e"]}, timeout=15)
    log("10. POST /he/compare (5 ids) → 400", r.status_code == 400, f"status={r.status_code}")

    # =========================================================
    # 11. compare with bogus ids → 404
    # =========================================================
    r = requests.post(f"{BASE}/he/compare", headers=H,
                      json={"programme_ids": ["bogus-x", "bogus-y"]}, timeout=15)
    log("11. POST /he/compare (bogus ids) → 404", r.status_code == 404, f"status={r.status_code}")

    # =========================================================
    # Cleanup existing applications to test both new + duplicate flow
    # Use MongoDB directly — or use the API (no delete endpoint exists, so skip cleanup).
    # Step 12 might hit duplicate=True if test was run before. We'll handle both cases.
    # =========================================================
    global created_app_id

    # =========================================================
    # 12. POST /he/apply — new (or duplicate if previously applied)
    # =========================================================
    r = requests.post(f"{BASE}/he/apply", headers=H,
                      json={"programme_id": "iitb-mtech-aiml"}, timeout=30)
    try:
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        assert data.get("ok") is True, f"ok={data.get('ok')}"
        dup = data.get("duplicate")
        app = data.get("application") or {}
        # Either new (duplicate=False) or existing (duplicate=True); app_id format must be APP-XXXXXXXX
        assert "app_id" in app, f"no app_id: {list(app.keys())}"
        assert re.match(r"^APP-[0-9A-F]{8}$", app["app_id"]), f"app_id bad format: {app['app_id']}"
        created_app_id = app["app_id"]
        assert app.get("programme_id") == "iitb-mtech-aiml", f"programme_id={app.get('programme_id')}"
        assert "programme_snapshot" in app, "no programme_snapshot"
        assert app.get("status") == "submitted", f"status={app.get('status')}"
        assert "submitted_at" in app, "no submitted_at"
        assert "expected_decision_at" in app, "no expected_decision_at"
        cb = app.get("cost_breakdown") or {}
        for k in ("tuition_per_year_inr", "living_per_year_inr", "app_fee_inr", "total_y1_inr", "total_programme_inr"):
            assert k in cb, f"cost_breakdown missing {k}"
        assert len(app.get("deadlines") or []) == 4, f"deadlines={len(app.get('deadlines') or [])}"
        assert len(app.get("timeline") or []) == 5, f"timeline={len(app.get('timeline') or [])}"
        assert "redirect" in data and "apply_url" in data, f"keys={list(data.keys())}"
        # Note if duplicate, flag it (user may have run test before; still ok structurally)
        log("12. POST /he/apply (iitb-mtech-aiml)", True,
            f"app_id={created_app_id}, duplicate={dup}, status={app['status']}")
    except Exception as e:
        log("12. POST /he/apply (iitb-mtech-aiml)", False, str(e))

    # =========================================================
    # 13. POST /he/apply again → duplicate=True
    # =========================================================
    r = requests.post(f"{BASE}/he/apply", headers=H,
                      json={"programme_id": "iitb-mtech-aiml"}, timeout=30)
    try:
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("duplicate") is True, f"duplicate={data.get('duplicate')}"
        log("13. POST /he/apply (dup) → duplicate=True", True, f"app_id={data['application']['app_id']}")
    except Exception as e:
        log("13. POST /he/apply (dup)", False, str(e))

    # =========================================================
    # 14. POST /he/apply bogus → 404
    # =========================================================
    r = requests.post(f"{BASE}/he/apply", headers=H,
                      json={"programme_id": "does-not-exist"}, timeout=15)
    log("14. POST /he/apply (bogus id) → 404", r.status_code == 404, f"status={r.status_code}")

    # =========================================================
    # 15. POST /he/apply with no body → 400
    # =========================================================
    # FastAPI expects json. Empty dict should trigger "programme_id required" → 400.
    r = requests.post(f"{BASE}/he/apply", headers=H, json={}, timeout=15)
    log("15. POST /he/apply (no body) → 400", r.status_code == 400, f"status={r.status_code}")

    # =========================================================
    # 16. GET /he/applications — list
    # =========================================================
    r = requests.get(f"{BASE}/he/applications", headers=H, timeout=30)
    try:
        assert r.status_code == 200, r.text
        data = r.json()
        ids = [a["app_id"] for a in data.get("applications", [])]
        assert created_app_id in ids, f"{created_app_id} not in {ids}"
        log("16. GET /he/applications", True, f"{len(ids)} apps, includes {created_app_id}")
    except Exception as e:
        log("16. GET /he/applications", False, str(e))

    # =========================================================
    # 17. GET /he/applications/{id}
    # =========================================================
    r = requests.get(f"{BASE}/he/applications/{created_app_id}", headers=H, timeout=30)
    try:
        assert r.status_code == 200, r.text
        data = r.json()
        app = data.get("application") or {}
        assert app.get("app_id") == created_app_id, f"app_id={app.get('app_id')}"
        assert "days_until_decision" in app, "no days_until_decision"
        assert isinstance(app["days_until_decision"], int), f"days_until_decision={app['days_until_decision']}"
        log("17. GET /he/applications/{id}", True,
            f"days_until_decision={app['days_until_decision']}")
    except Exception as e:
        log("17. GET /he/applications/{id}", False, str(e))

    # =========================================================
    # 18. POST /he/applications/{id}/update
    # =========================================================
    r = requests.post(f"{BASE}/he/applications/{created_app_id}/update", headers=H,
                      json={"status": "under_review", "notes": "reviewed by adcom"}, timeout=30)
    try:
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True, f"ok={data.get('ok')}"
        uf = data.get("updated_fields") or []
        assert "status" in uf and "notes" in uf, f"updated_fields={uf}"
        log("18. POST /he/applications/{id}/update", True, f"updated_fields={uf}")
    except Exception as e:
        log("18. POST /he/applications/{id}/update", False, str(e))

    # ======== NON-AI TESTS DONE ABOVE =========================================
    # Now AI tests (slow, may hit quota). Wrapped in try/except; continue on fail.
    # =========================================================================

    # 19. SOP — questions
    r = requests.post(f"{BASE}/he/ai/sop", headers=H,
                      json={"programme_id": "iitb-mtech-aiml"}, timeout=30)
    try:
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("stage") == "questions", f"stage={data.get('stage')}"
        qs = data.get("questions") or []
        assert len(qs) == 4, f"questions={len(qs)}"
        qids = [q["id"] for q in qs]
        assert set(qids) == {"q1", "q2", "q3", "q4"}, f"qids={qids}"
        log("19. POST /he/ai/sop (no answers) → questions", True, f"q ids={qids}")
    except Exception as e:
        log("19. POST /he/ai/sop (no answers)", False, str(e))

    # 20. SOP — draft
    r = requests.post(f"{BASE}/he/ai/sop", headers=H,
                      json={"programme_id": "iitb-mtech-aiml",
                            "answers": {
                                "q1": "Built an ML classifier for medical imaging with 92% accuracy on chest X-ray data.",
                                "q2": "Want to work with Prof. Pushpak Bhattacharyya on NLP & low-resource Indian languages.",
                                "q3": "In 5 years, I aim to be a research scientist at Google AI working on multilingual LLMs.",
                                "q4": "No major red flags; one backlog in Semester 3 cleared with CGPA 8.6 overall."
                            }}, timeout=120)
    try:
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert data.get("stage") == "draft", f"stage={data.get('stage')}"
        assert data.get("doc_id"), f"no doc_id: {data}"
        content = data.get("content") or ""
        wc = len(content.split())
        assert wc > 200, f"word_count={wc}"
        log("20. POST /he/ai/sop (with answers) → draft", True, f"doc_id={data['doc_id']}, words={wc}")
    except Exception as e:
        log("20. POST /he/ai/sop (with answers)", False, str(e)[:200])

    # 21. CV — questions
    r = requests.post(f"{BASE}/he/ai/cv", headers=H, json={}, timeout=30)
    try:
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("stage") == "questions", f"stage={data.get('stage')}"
        qs = data.get("questions") or []
        assert len(qs) == 6, f"questions={len(qs)}"
        log("21. POST /he/ai/cv (no answers) → questions", True, f"{len(qs)} questions")
    except Exception as e:
        log("21. POST /he/ai/cv (no answers)", False, str(e))

    # 22. CV — draft
    r = requests.post(f"{BASE}/he/ai/cv", headers=H,
                      json={"answers": {
                          "education": "B.Tech CSE, IIT Bombay (2022-2026), CGPA 8.6",
                          "projects": "1) Medical ML classifier (92% acc). 2) Hindi NLP toolkit. 3) Distributed key-value store.",
                          "experience": "Microsoft Research India intern, summer 2025 — built transformer for code completion.",
                          "publications": "Co-authored 1 workshop paper at NeurIPS LatinX 2025.",
                          "skills": "Python, PyTorch, C++, Rust, SQL; Hindi, English, Marathi",
                          "awards": "KVPY Fellow; JEE AIR 412; ACM ICPC Regional top 20"
                      }}, timeout=120)
    try:
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert data.get("stage") == "draft", f"stage={data.get('stage')}"
        assert data.get("doc_id") and data.get("content"), f"keys={list(data.keys())}"
        log("22. POST /he/ai/cv (with answers) → draft", True, f"doc_id={data['doc_id']}, chars={len(data['content'])}")
    except Exception as e:
        log("22. POST /he/ai/cv (with answers)", False, str(e)[:200])

    # 23. Cover letter — questions
    r = requests.post(f"{BASE}/he/ai/cover-letter", headers=H,
                      json={"programme_id": "stanford-ms-cs"}, timeout=30)
    try:
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("stage") == "questions", f"stage={data.get('stage')}"
        assert len(data.get("questions") or []) == 3, f"q count={len(data.get('questions') or [])}"
        log("23. POST /he/ai/cover-letter (no answers) → 3 qs", True, "")
    except Exception as e:
        log("23. POST /he/ai/cover-letter (no answers)", False, str(e))

    # 24. Cover letter — draft
    r = requests.post(f"{BASE}/he/ai/cover-letter", headers=H,
                      json={"programme_id": "stanford-ms-cs",
                            "answers": {
                                "hook": "Stanford's HAI lab on human-centered AI resonates with my ML-for-healthcare work.",
                                "strength": "Shipped medical ML classifier with 92% accuracy on 10k X-rays.",
                                "advisor": "Prof. Fei-Fei Li on multimodal vision-language models."
                            }}, timeout=120)
    try:
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert data.get("stage") == "draft", f"stage={data.get('stage')}"
        assert data.get("doc_id") and data.get("content"), f"keys={list(data.keys())}"
        log("24. POST /he/ai/cover-letter (draft)", True, f"doc_id={data['doc_id']}")
    except Exception as e:
        log("24. POST /he/ai/cover-letter (draft)", False, str(e)[:200])

    # 25. LOR email — questions
    r = requests.post(f"{BASE}/he/ai/lor-email", headers=H, json={}, timeout=30)
    try:
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("stage") == "questions", f"stage={data.get('stage')}"
        assert len(data.get("questions") or []) >= 1, f"q count={len(data.get('questions') or [])}"
        log("25. POST /he/ai/lor-email (no fields) → questions", True, f"{len(data['questions'])} qs")
    except Exception as e:
        log("25. POST /he/ai/lor-email (no fields)", False, str(e))

    # 26. LOR email — draft
    r = requests.post(f"{BASE}/he/ai/lor-email", headers=H,
                      json={"prof_name": "Dr. Sharma",
                            "relationship": "Took ML course Fall 2024",
                            "outcome": "A+ grade and led project"}, timeout=120)
    try:
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert data.get("stage") == "draft", f"stage={data.get('stage')}"
        assert data.get("doc_id") and data.get("content"), f"keys={list(data.keys())}"
        log("26. POST /he/ai/lor-email (draft)", True, f"doc_id={data['doc_id']}")
    except Exception as e:
        log("26. POST /he/ai/lor-email (draft)", False, str(e)[:200])

    # 27. Eligibility (fastest AI)
    r = requests.post(f"{BASE}/he/ai/eligibility", headers=H,
                      json={"programme_id": "stanford-ms-cs"}, timeout=120)
    try:
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        content = data.get("content") or ""
        assert isinstance(content, str) and len(content) > 50, f"content too short: {len(content)}"
        log("27. POST /he/ai/eligibility (stanford)", True, f"chars={len(content)}")
    except Exception as e:
        log("27. POST /he/ai/eligibility", False, str(e)[:200])

    # 28. Profile parse
    r = requests.post(f"{BASE}/he/ai/profile-parse", headers=H,
                      json={"bio_text": "I am a final-year CSE student at IIT Bombay with CGPA 8.6, interested in ML and AI"},
                      timeout=120)
    try:
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        profile = data.get("profile") or {}
        assert isinstance(profile, dict) and profile, f"profile empty: {profile}"
        assert data.get("doc_id"), f"no doc_id"
        log("28. POST /he/ai/profile-parse", True,
            f"profile keys={list(profile.keys())[:6]}, doc_id={data['doc_id']}")
    except Exception as e:
        log("28. POST /he/ai/profile-parse", False, str(e)[:200])

    # 29. Next steps
    if created_app_id:
        r = requests.post(f"{BASE}/he/ai/next-steps", headers=H,
                          json={"application_id": created_app_id}, timeout=120)
        try:
            assert r.status_code == 200, r.text[:300]
            data = r.json()
            steps = data.get("steps") or []
            assert 3 <= len(steps) <= 8, f"steps={len(steps)}"
            log("29. POST /he/ai/next-steps", True, f"{len(steps)} steps")
        except Exception as e:
            log("29. POST /he/ai/next-steps", False, str(e)[:200])
    else:
        log("29. POST /he/ai/next-steps", False, "no created_app_id from step 12")

    # 30. GET /he/documents
    r = requests.get(f"{BASE}/he/documents", headers=H, timeout=30)
    try:
        assert r.status_code == 200, r.text
        data = r.json()
        docs = data.get("documents") or []
        kinds = {d.get("kind") for d in docs}
        log("30a. GET /he/documents", True, f"total={len(docs)}, kinds={kinds}")
    except Exception as e:
        log("30a. GET /he/documents", False, str(e))

    # Filter by kind=sop
    r = requests.get(f"{BASE}/he/documents", headers=H, params={"kind": "sop"}, timeout=30)
    try:
        assert r.status_code == 200, r.text
        data = r.json()
        docs = data.get("documents") or []
        non_sop = [d for d in docs if d.get("kind") != "sop"]
        assert not non_sop, f"non-sop returned: {[d.get('kind') for d in non_sop]}"
        log("30b. GET /he/documents?kind=sop", True, f"{len(docs)} sop docs")
    except Exception as e:
        log("30b. GET /he/documents?kind=sop", False, str(e))

    # ======== SUMMARY ==============================================
    print("\n\n========== HIGHER ED TEST SUMMARY ==========")
    passed = sum(1 for r in results if r["ok"])
    failed = sum(1 for r in results if not r["ok"])
    print(f"PASSED: {passed}/{len(results)}   FAILED: {failed}")
    if failed:
        print("\nFAILED ITEMS:")
        for r in results:
            if not r["ok"]:
                print(f"  ❌ {r['name']}: {r['detail']}")
    return failed


if __name__ == "__main__":
    sys.exit(0 if main() == 0 else 1)
