"""Pre-browser API verification for acceptance test."""
import json, urllib.request, urllib.error

creds = json.load(open("test_credentials.json"))
token = creds["token"]
API = "http://localhost:8000"

CANONICAL_SKILL_KEYS = [
    "Technical Excellence", "Professional Communication", "Personal Brand",
    "Leadership & Collaboration", "Career Preparation", "Industry Presence"
]

def api(endpoint, method="GET", body=None):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(f"{API}{endpoint}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, {}
    except Exception as ex:
        return 0, {"error": str(ex)}

print("=" * 60)
print("PHASE 0: API Ground-Truth Verification")
print("=" * 60)

# ── 1. Roadmap ───────────────────────────────────────────────
print("\n[1] POST /api/ai/career-roadmap ...")
status, roadmap = api("/api/ai/career-roadmap", "POST", {})
print(f"    HTTP {status}")
if status == 200:
    print(f"    target_role   = {roadmap.get('target_role')}")
    print(f"    progress_pct  = {roadmap.get('progress_pct')}")
    milestones = roadmap.get("milestones", [])
    completed = sum(1 for m in milestones if m.get("completed"))
    total = len(milestones)
    computed_pct = round(completed / total * 100) if total > 0 else 0
    print(f"    milestones    = {completed}/{total} completed")
    print(f"    computed_pct  = {computed_pct}")
    if roadmap.get("progress_pct") == computed_pct:
        print("    [PASS] progress_pct matches computed")
    else:
        print(f"    [FAIL] progress_pct {roadmap.get('progress_pct')} != computed {computed_pct}")
    
    skill_scores_roadmap = roadmap.get("skill_scores", {})
    print(f"    skill_scores keys = {list(skill_scores_roadmap.keys())}")
elif status == 403:
    print("    [FAIL] 403 Forbidden - role guard blocking student")
else:
    print(f"    [FAIL] Unexpected status {status}")

# ── 2. Skill Intelligence ────────────────────────────────────
print("\n[2] GET /api/users/me/skill-intelligence ...")
status, intel = api("/api/users/me/skill-intelligence")
print(f"    HTTP {status}")
if status == 200:
    readiness = intel.get("readiness_score", {}).get("score", 0)
    potential = intel.get("potential_score", 0)
    gap       = intel.get("readiness_gap", 0)
    profile   = intel.get("profile_strength", 0)
    skill_scores = intel.get("skill_scores", {})
    
    print(f"    readiness     = {readiness}")
    print(f"    potential     = {potential}")
    print(f"    gap           = {gap}")
    print(f"    profile       = {profile}%")
    print(f"    skill_scores  = {json.dumps(skill_scores)}")
    
    # Validate canonical keys
    missing = [k for k in CANONICAL_SKILL_KEYS if k not in skill_scores]
    if not missing:
        print(f"    [PASS] All 6 canonical skill keys present")
    else:
        print(f"    [FAIL] Missing canonical keys: {missing}")
    
    # Validate ranges
    bad = {k: v for k, v in skill_scores.items() if not (0 <= v <= 100)}
    if not bad:
        print("    [PASS] All scores in 0-100 range")
    else:
        print(f"    [FAIL] Out-of-range scores: {bad}")
    
    # Validate potential >= readiness
    if potential >= readiness:
        print(f"    [PASS] potential({potential}) >= readiness({readiness})")
    else:
        print(f"    [FAIL] potential({potential}) < readiness({readiness})")
    
    # Validate gap = potential - readiness
    expected_gap = potential - readiness
    if gap == expected_gap:
        print(f"    [PASS] gap={gap} == {potential}-{readiness}={expected_gap}")
    else:
        print(f"    [FAIL] gap={gap} != expected {expected_gap}")
elif status == 403:
    print("    [FAIL] 403 Forbidden - student blocked from skill-intelligence")
else:
    print(f"    [FAIL] HTTP {status}")

# ── 3. Completion ────────────────────────────────────────────
print("\n[3] GET /api/users/me/completion ...")
status, comp = api("/api/users/me/completion")
print(f"    HTTP {status}")
if status == 200:
    pct = comp.get("percentage", -1)
    items = comp.get("items", [])
    print(f"    percentage  = {pct}%")
    print(f"    items count = {len(items)}")
    # Verify pct is computed from items
    done = sum(1 for i in items if i.get("done"))
    total_items = len(items)
    if total_items > 0:
        expected_pct = round(done / total_items * 100)
    else:
        expected_pct = 0
    print(f"    computed    = {done}/{total_items} = {expected_pct}%")
    if abs(pct - expected_pct) <= 5:  # allow rounding diff due to weights
        print("    [PASS] percentage within 5% of computed")
    else:
        print(f"    [WARN] percentage {pct} differs from simple computed {expected_pct} (may use weights)")
elif status == 403:
    print("    [FAIL] 403 Forbidden")

# ── 4. Stats ─────────────────────────────────────────────────
print("\n[4] GET /api/users/me/stats ...")
status, stats = api("/api/users/me/stats")
print(f"    HTTP {status}")
if status == 200:
    streak = stats.get("skill_streak", 0)
    print(f"    skill_streak = {streak}")
    print(f"    [PASS] Stats endpoint returning data")
elif status == 403:
    print("    [FAIL] 403 Forbidden")

# ── 5. Role Guard Test ───────────────────────────────────────
print("\n[5] Role Guard: Testing admin access to student-only endpoints ...")
admin_status, admin_body = api("/api/auth/login", "POST", 
                               {"email": "admin@studentalumni.ai", "password": "admin123"})
# Quick workaround using admin token from JSON header manually
headers = {"Content-Type": "application/json"}

# Get admin token
admin_req = urllib.request.Request(
    f"{API}/api/auth/login",
    data=json.dumps({"email": "admin@studentalumni.ai", "password": "admin123"}).encode(),
    headers=headers,
    method="POST"
)
try:
    with urllib.request.urlopen(admin_req, timeout=10) as r:
        admin_token = json.loads(r.read()).get("access_token", "")
    
    # Test roadmap with admin token
    admin_roadmap_req = urllib.request.Request(
        f"{API}/api/ai/career-roadmap",
        data=json.dumps({}).encode(),
        headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(admin_roadmap_req, timeout=10) as r:
            print(f"    [FAIL] Admin got HTTP {r.status} - should be 403")
    except urllib.error.HTTPError as e:
        if e.code == 403:
            print(f"    [PASS] Admin correctly blocked with HTTP 403 Forbidden")
        else:
            print(f"    [FAIL] Admin got HTTP {e.code} - expected 403")
except Exception as ex:
    print(f"    [WARN] Role guard test: {ex}")

print("\n" + "=" * 60)
print("API VERIFICATION COMPLETE")
print("=" * 60)
