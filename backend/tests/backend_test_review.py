"""
Review-request quick verification test:
1. POST /api/admin/colleges/backfill — idempotent
2. GET  /api/admin/colleges/list?limit=200 — enrichment quality
3. GET  /api/marketplace/tools — AI catalog ≥60
4. Auto-onboard new college via /api/admin/imports/manual
"""
import requests
import time
import json
import uuid

BASE = "https://hiring-mvvm.preview.emergentagent.com/api"
EMAIL = "admin-super1@persona.demo"
PASS  = "TestPass@123"

results = {"pass": 0, "fail": 0, "items": []}


def check(label: str, cond: bool, detail: str = ""):
    status = "PASS" if cond else "FAIL"
    results["items"].append((status, label, detail))
    if cond:
        results["pass"] += 1
    else:
        results["fail"] += 1
    print(f"[{status}] {label}{(' — ' + detail) if detail else ''}")


# ── 1. Auth ──────────────────────────────────────────────────────────
print("\n══ AUTH ══")
r = requests.post(f"{BASE}/auth/login", json={"email": EMAIL, "password": PASS}, timeout=15)
check("Admin login 200", r.status_code == 200, f"got {r.status_code}")
if r.status_code != 200:
    print(r.text[:400])
    raise SystemExit(1)
token = r.json()["access_token"]
H = {"Authorization": f"Bearer {token}"}


# ── 2. Backfill (idempotent) ────────────────────────────────────────
print("\n══ BACKFILL ══")
t0 = time.time()
r = requests.post(f"{BASE}/admin/colleges/backfill", headers=H, timeout=180)
dt = time.time() - t0
check("POST /admin/colleges/backfill 200", r.status_code == 200, f"{r.status_code} ({dt:.1f}s)")
if r.status_code == 200:
    data = r.json()
    print(json.dumps(data, indent=2)[:800])
    check("response.ok == true", data.get("ok") is True)
    for key in ("distinct_names_in_users", "newly_created", "reenriched_existing", "already_complete", "failed"):
        check(f"response has key '{key}'", key in data)
    check("'failed' is list", isinstance(data.get("failed"), list))


# ── 3. /admin/colleges/list ─────────────────────────────────────────
print("\n══ COLLEGES LIST ══")
r = requests.get(f"{BASE}/admin/colleges/list?limit=200", headers=H, timeout=30)
check("GET /admin/colleges/list 200", r.status_code == 200, f"got {r.status_code}")
colleges = []
if r.status_code == 200:
    j = r.json()
    colleges = j.get("items", [])
    total = j.get("total", 0)
    print(f"Total={total}  items={len(colleges)}  counts={j.get('counts')}")
    check("≥ 70 colleges returned", len(colleges) >= 70, f"got {len(colleges)}")

    with_desc        = [c for c in colleges if c.get("description")]
    with_logo        = [c for c in colleges if c.get("logo_url")]
    with_ranking     = [c for c in colleges if c.get("ranking")]
    with_specialties = [c for c in colleges if c.get("specialties")]

    print(f"with description={len(with_desc)}  logo={len(with_logo)}  "
          f"ranking={len(with_ranking)}  specialties={len(with_specialties)}")

    check("≥ 60 have description", len(with_desc) >= 60, f"got {len(with_desc)}")
    check("≥ 40 have logo_url",    len(with_logo) >= 40, f"got {len(with_logo)}")
    check("≥ 30 have ranking",     len(with_ranking) >= 30, f"got {len(with_ranking)}")
    check("≥ 50 have specialties", len(with_specialties) >= 50, f"got {len(with_specialties)}")

    # Sample 5 colleges
    print("\nSAMPLE 5:")
    for c in colleges[:5]:
        nm = c.get("name", "")[:40]
        desc_len = len(c.get("description") or "")
        logo = "✓" if c.get("logo_url") else "✗"
        rk = c.get("ranking") or []
        sp = c.get("specialties") or []
        print(f"  · {nm:40s} desc={desc_len:4d}  logo={logo}  rank={rk[:2]}  spec={sp[:3]}")


# ── 4. /marketplace/tools ───────────────────────────────────────────
print("\n══ MARKETPLACE TOOLS ══")
r = requests.get(f"{BASE}/marketplace/tools", headers=H, timeout=15)
check("GET /marketplace/tools 200", r.status_code == 200, f"got {r.status_code}")
if r.status_code == 200:
    j = r.json()
    avail = j.get("available_count", 0)
    all_tools = j.get("all", [])
    print(f"available_count={avail}  groups={len(j.get('groups', []))}")
    check("available_count ≥ 60", avail >= 60, f"got {avail}")

    # group by category
    by_cat = {}
    for t in all_tools:
        by_cat.setdefault(t.get("category", ""), []).append(t)

    print("\nCATEGORIES:")
    for cat in sorted(by_cat):
        names = [t.get("name") or t.get("id") for t in by_cat[cat]]
        print(f"  [{cat}]  ({len(names)}):  {names}")

    # Check required categories + tools
    def has_tool_in_cat(cat_substr: str, tool_substr: str) -> bool:
        for cat, items in by_cat.items():
            if cat_substr.lower() in cat.lower():
                for t in items:
                    nm = (t.get("name") or "") + " " + (t.get("id") or "")
                    if tool_substr.lower() in nm.lower():
                        return True
        return False

    def count_tools_in_cat(cat_substr: str) -> int:
        total = 0
        for cat, items in by_cat.items():
            if cat_substr.lower() in cat.lower():
                # only exact "AI" not "AI · *"
                if cat_substr.upper() == "AI" and "·" in cat:
                    continue
                total += len(items)
        return total

    ai_count = count_tools_in_cat("AI")
    # broader AI count (any AI category)
    all_ai = sum(len(items) for cat, items in by_cat.items() if cat.upper().startswith("AI"))
    print(f"\nAI total (any AI category) = {all_ai}")

    # LLM providers
    llm_providers = ["claude", "openai", "gemini", "mistral", "cohere",
                     "perplexity", "groq", "together", "fireworks",
                     "hugging", "replicate"]
    found_llm = []
    for prov in llm_providers:
        if any(prov.lower() in ((t.get("name") or "") + " " + (t.get("id") or "")).lower()
               for items in by_cat.values() for t in items):
            found_llm.append(prov)
    check(f"≥10 LLM providers in AI", len(found_llm) >= 10, f"found {found_llm}")

    image_tools = ["stability", "dall", "fal"]
    found_img = [p for p in image_tools if any(p in ((t.get("name") or "") + " " + (t.get("id") or "")).lower()
                  for items in by_cat.values() for t in items)]
    check("AI · Image (stability/dall-e/fal.ai)", len(found_img) >= 3, f"found {found_img}")

    check("AI · Video has Runway", has_tool_in_cat("video", "runway"),
          f"video cat={[t.get('name') for items in by_cat.values() for t in items if 'video' in (t.get('category','').lower())]}")

    audio_tools = ["elevenlabs", "whisper", "assemblyai", "deepgram"]
    found_audio = [p for p in audio_tools if any(p in ((t.get("name") or "") + " " + (t.get("id") or "")).lower()
                  for items in by_cat.values() for t in items)]
    check("AI · Audio (ElevenLabs/Whisper/Assembly/Deepgram)", len(found_audio) >= 3,
          f"found {found_audio}")

    lang_tools = ["deepl", "google translate", "translate"]
    found_lang = [p for p in lang_tools if any(p in ((t.get("name") or "") + " " + (t.get("id") or "")).lower()
                  for items in by_cat.values() for t in items)]
    check("AI · Language (DeepL/Google Translate)", len(found_lang) >= 2, f"found {found_lang}")

    vec_tools = ["pinecone", "weaviate", "chroma", "qdrant"]
    found_vec = [p for p in vec_tools if any(p in ((t.get("name") or "") + " " + (t.get("id") or "")).lower()
                  for items in by_cat.values() for t in items)]
    check("AI · Vector DB (Pinecone/Weaviate/Chroma/Qdrant)", len(found_vec) >= 3,
          f"found {found_vec}")

    ops_tools = ["langsmith", "helicone"]
    found_ops = [p for p in ops_tools if any(p in ((t.get("name") or "") + " " + (t.get("id") or "")).lower()
                  for items in by_cat.values() for t in items)]
    check("AI · Ops (LangSmith/Helicone)", len(found_ops) >= 1, f"found {found_ops}")

    found_agent = any("agent k" in ((t.get("name") or "") + " " + (t.get("id") or "")).lower()
                  for items in by_cat.values() for t in items)
    check("AI · Agents (Agent K)", found_agent)


# ── 5. Auto-onboard via /admin/imports/manual ───────────────────────
print("\n══ AUTO-ONBOARD ON MANUAL ADD ══")
test_college = f"Test College {uuid.uuid4().hex[:6].upper()}"
print(f"new college: {test_college}")
payload = {
    "first_name": "Auto",
    "last_name":  "Onboard",
    "email":      f"auto-onboard-{uuid.uuid4().hex[:8]}@persona.demo",
    "college":    test_college,
    "degree":     "B.Tech",
    "graduation_year": 2024,
    "designation": "Software Engineer",
    "company":     "Acme Inc",
    "experience_years_raw": "2",
}
r = requests.post(f"{BASE}/admin/imports/manual", json=payload, headers=H, timeout=30)
check("POST /admin/imports/manual 200", r.status_code == 200, f"got {r.status_code} body={r.text[:200]}")
if r.status_code == 200:
    print(f"Response: {r.json()}")

# Wait for background enrichment to be created
print("Waiting 3.5s for background enrichment...")
time.sleep(3.5)

r = requests.get(f"{BASE}/admin/colleges/list", headers=H, params={"q": test_college, "limit": 50}, timeout=30)
check("GET /admin/colleges/list?q=<new> 200", r.status_code == 200, f"got {r.status_code}")
if r.status_code == 200:
    items = r.json().get("items", [])
    print(f"Returned {len(items)} match(es): {[i.get('name') for i in items]}")
    match = next((i for i in items if (i.get("name") or "").strip().lower() == test_college.lower()), None)
    check("New college found in list", match is not None,
          f"sought '{test_college}', got {[i.get('name') for i in items]}")
    if match:
        check("status=='pending'", match.get("status") == "pending",
              f"got status='{match.get('status')}'")


# ── Summary ─────────────────────────────────────────────────────────
print("\n══════════════════════════════════════════════════════════")
print(f"PASS: {results['pass']}  FAIL: {results['fail']}")
print("══════════════════════════════════════════════════════════")
if results["fail"]:
    print("\nFailures:")
    for st, lbl, det in results["items"]:
        if st == "FAIL":
            print(f"  ✗ {lbl}  ({det})")
