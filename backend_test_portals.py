"""
Test the 4 portal dashboard endpoints in /app/backend/portals.py.

These endpoints currently return STATIC MOCK DATA, are unauthenticated,
and should each return HTTP 200 with a stable JSON shape that the
frontend dashboards can render directly.
"""
import os
import sys
import json
import requests

# Use REACT_APP_BACKEND_URL from frontend/.env (per testing rules)
def _get_backend_url() -> str:
    env_path = "/app/frontend/.env"
    url = None
    try:
        with open(env_path) as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    url = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break
    except FileNotFoundError:
        pass
    return url or "http://localhost:8001"


BASE = _get_backend_url().rstrip("/")
API = f"{BASE}/api"

EXPECTED = {
    "/mentor/dashboard": {"mentor", "kpis", "todaySessions", "monthly", "pendingRequests"},
    "/student/dashboard": {"student", "kpis", "topMatches", "recommendedMentors", "upcomingEvents", "profileCompletion"},
    "/admin/college-stats": {"college", "kpis", "deptPlacement", "recentActivity", "upcomingEvents", "topRecruiters"},
    "/admin/super-overview": {"admin", "kpis", "recentActivity", "platformUsers", "monthlyEnrollments", "revenueBreakdown"},
}


def main() -> int:
    print(f"BASE: {API}")
    failures = []
    for path, expected_keys in EXPECTED.items():
        url = f"{API}{path}"
        try:
            r = requests.get(url, timeout=20)
        except Exception as e:
            failures.append(f"{path} → request error: {e}")
            print(f"❌ {path}: request error {e}")
            continue

        if r.status_code != 200:
            failures.append(f"{path} → HTTP {r.status_code} (body: {r.text[:200]})")
            print(f"❌ {path}: HTTP {r.status_code}")
            continue

        try:
            data = r.json()
        except Exception as e:
            failures.append(f"{path} → invalid JSON: {e}")
            print(f"❌ {path}: invalid JSON")
            continue

        if not isinstance(data, dict):
            failures.append(f"{path} → top-level is {type(data).__name__}, expected object")
            print(f"❌ {path}: top-level is {type(data).__name__}")
            continue

        actual_keys = set(data.keys())
        missing = expected_keys - actual_keys
        if missing:
            failures.append(f"{path} → missing keys: {sorted(missing)} (got {sorted(actual_keys)})")
            print(f"❌ {path}: missing {sorted(missing)}")
            continue

        # Per-endpoint shape sanity (lightweight, since these are mocks)
        spot_checks = []
        if path == "/mentor/dashboard":
            spot_checks.append(("mentor.name", isinstance(data["mentor"].get("name"), str)))
            spot_checks.append(("kpis is list", isinstance(data["kpis"], list) and len(data["kpis"]) > 0))
            spot_checks.append(("todaySessions is list", isinstance(data["todaySessions"], list)))
            spot_checks.append(("monthly is list", isinstance(data["monthly"], list)))
        elif path == "/student/dashboard":
            spot_checks.append(("student.name", isinstance(data["student"].get("name"), str)))
            spot_checks.append(("kpis is list", isinstance(data["kpis"], list) and len(data["kpis"]) > 0))
            spot_checks.append(("topMatches is list", isinstance(data["topMatches"], list)))
            spot_checks.append(("recommendedMentors is list", isinstance(data["recommendedMentors"], list)))
            spot_checks.append(("profileCompletion.score is int",
                                isinstance(data["profileCompletion"].get("score"), int)))
        elif path == "/admin/college-stats":
            spot_checks.append(("college.name", isinstance(data["college"].get("name"), str)))
            spot_checks.append(("kpis is list", isinstance(data["kpis"], list) and len(data["kpis"]) > 0))
            spot_checks.append(("deptPlacement is list", isinstance(data["deptPlacement"], list)))
            spot_checks.append(("topRecruiters is list", isinstance(data["topRecruiters"], list)))
        elif path == "/admin/super-overview":
            spot_checks.append(("admin.name", isinstance(data["admin"].get("name"), str)))
            spot_checks.append(("kpis is list (8)", isinstance(data["kpis"], list) and len(data["kpis"]) == 8))
            spot_checks.append(("platformUsers is list", isinstance(data["platformUsers"], list)))
            spot_checks.append(("monthlyEnrollments is list", isinstance(data["monthlyEnrollments"], list)))
            spot_checks.append(("revenueBreakdown is list", isinstance(data["revenueBreakdown"], list)))

        bad = [n for n, ok in spot_checks if not ok]
        if bad:
            failures.append(f"{path} → spot checks failed: {bad}")
            print(f"❌ {path}: spot checks failed {bad}")
            continue

        print(f"✅ {path}: HTTP 200, keys={sorted(actual_keys)}")

    print()
    if failures:
        print(f"FAIL — {len(failures)} issue(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("ALL 4 PORTAL ENDPOINTS PASS ✅")
    return 0


if __name__ == "__main__":
    sys.exit(main())
