"""
Backend regression tests for Student Career Development Platform.
Covers: auth, onboarding, AI (Claude via emergent), catalog, dashboard.
"""
import os
import secrets
import pytest

BASE_URL = (
    os.environ.get("EXPO_BACKEND_URL")
    or os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or "https://hiring-mvvm.preview.emergentagent.com"
).rstrip("/")

ADMIN_EMAIL = "admin@careerpath.app"
ADMIN_PASSWORD = "Admin@12345"


# Shared state across tests in this session
state = {
    "student_email": f"test-student-{secrets.token_hex(4)}@test.com",
    "student_password": "Student@123",
    "student_token": None,
    "student_id": None,
    "admin_token": None,
    "chat_session_id": None,
}


# ---------------- Health ----------------
class TestHealth:
    def test_root(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("status") == "ok"


# ---------------- Auth ----------------
class TestAuth:
    def test_register_student(self, api_client):
        payload = {
            "email": state["student_email"],
            "password": state["student_password"],
            "full_name": "Test Student",
            "role": "student",
            "phone": "+919999999999",
        }
        r = api_client.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "access_token" in data and "refresh_token" in data
        assert data["user"]["email"] == state["student_email"]
        assert data["user"]["role"] == "student"
        assert data["user"]["onboarding_completed"] is False
        state["student_token"] = data["access_token"]
        state["student_id"] = data["user"]["id"]

    def test_register_duplicate_email(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": state["student_email"],
            "password": state["student_password"],
            "full_name": "Dup",
            "role": "student",
        })
        assert r.status_code == 400

    def test_login_student(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": state["student_email"],
            "password": state["student_password"],
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert "access_token" in data
        state["student_token"] = data["access_token"]

    def test_login_admin(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD,
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == ADMIN_EMAIL
        state["admin_token"] = data["access_token"]

    def test_login_bad_password(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": "WrongPass!"
        })
        assert r.status_code == 401

    def test_get_me_with_token(self, api_client):
        assert state["student_token"]
        r = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {state['student_token']}"}
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == state["student_email"]
        assert data["role"] == "student"

    def test_get_me_without_token(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401


# ---------------- Onboarding ----------------
class TestOnboarding:
    def test_reject_class_10_for_student(self, api_client):
        assert state["student_token"]
        payload = {
            "school_info": {
                "institution_name": "Test High School",
                "institution_type": "school",
                "class_or_year": "10",
                "branch_or_stream": "Science",
                "board_or_university": "CBSE",
                "city": "Mumbai",
                "state": "MH",
                "country": "India",
            },
            "career_path": "job",
            "interests": ["AI", "Web"],
            "skills": ["Python"],
            "bio": "10th grader",
        }
        r = api_client.post(
            f"{BASE_URL}/api/users/onboarding",
            json=payload,
            headers={"Authorization": f"Bearer {state['student_token']}"}
        )
        assert r.status_code == 400, r.text
        assert "11" in r.json().get("detail", "")

    def test_accept_class_11_and_generate_unique_id_qr(self, api_client):
        payload = {
            "school_info": {
                "institution_name": "Springdale Sr Sec",
                "institution_type": "school",
                "class_or_year": "11",
                "branch_or_stream": "Science",
                "board_or_university": "CBSE",
                "city": "Delhi",
                "state": "DL",
                "country": "India",
            },
            "career_path": "job",
            "interests": ["Software", "AI"],
            "skills": ["Python", "JS"],
            "bio": "Aspiring SWE",
        }
        r = api_client.post(
            f"{BASE_URL}/api/users/onboarding",
            json=payload,
            headers={"Authorization": f"Bearer {state['student_token']}"}
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["onboarding_completed"] is True
        assert data["career_path"] == "job"
        uid = data.get("unique_id") or ""
        assert uid.startswith("SCD-") and "-STU-" in uid, f"Bad unique_id: {uid}"
        parts = uid.split("-")
        assert len(parts) == 4 and len(parts[3]) == 6
        qr = data.get("qr_code_base64") or ""
        assert len(qr) > 100  # base64 PNG should be substantial
        # iVBORw0KGgo => PNG header in base64 starts with 'iVBOR'
        assert qr.startswith("iVBOR"), "qr_code_base64 not a PNG"

    def test_me_after_onboarding(self, api_client):
        r = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {state['student_token']}"}
        )
        assert r.status_code == 200
        data = r.json()
        assert data["onboarding_completed"] is True
        assert data["unique_id"]


# ---------------- AI ----------------
class TestAI:
    def test_career_suggestions(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/ai/career-suggestions",
            json={"additional_context": "Strong in math, want FAANG"},
            headers={"Authorization": f"Bearer {state['student_token']}"},
            timeout=120,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        # required structural keys
        for k in ("summary", "milestones", "recommended_skills", "recommended_courses"):
            assert k in data, f"Missing key {k} in {data.keys()}"
        assert isinstance(data["milestones"], list)
        assert isinstance(data["recommended_skills"], list)
        assert isinstance(data["recommended_courses"], list)
        assert len(data["summary"]) > 5

    def test_career_suggestions_cached(self, api_client):
        r = api_client.get(
            f"{BASE_URL}/api/ai/career-suggestions/cached",
            headers={"Authorization": f"Bearer {state['student_token']}"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "summary" in data or "milestones" in data, f"No cached data: {data}"

    def test_chat(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/ai/chat",
            json={"message": "Give me one short tip for cracking SDE interviews."},
            headers={"Authorization": f"Bearer {state['student_token']}"},
            timeout=120,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("session_id")
        assert data.get("message")
        assert len(data["message"]) > 10
        state["chat_session_id"] = data["session_id"]

    def test_chat_history(self, api_client):
        r = api_client.get(
            f"{BASE_URL}/api/ai/chat/history",
            headers={"Authorization": f"Bearer {state['student_token']}"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "messages" in data
        assert isinstance(data["messages"], list)
        assert len(data["messages"]) >= 2  # at least one user + one assistant
        roles = {m.get("role") for m in data["messages"]}
        assert "user" in roles and "assistant" in roles


# ---------------- Catalog ----------------
class TestCatalog:
    def test_courses_lists_8(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/catalog/courses")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "courses" in data
        assert len(data["courses"]) == 8, f"Expected 8 courses, got {len(data['courses'])}"
        # spot-check fields
        c0 = data["courses"][0]
        for f in ("id", "title", "provider", "career_paths"):
            assert f in c0

    def test_courses_filter_career_path(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/catalog/courses", params={"career_path": "startup"})
        assert r.status_code == 200
        data = r.json()
        assert len(data["courses"]) >= 1
        for c in data["courses"]:
            assert "startup" in c.get("career_paths", [])

    def test_mentors(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/catalog/mentors")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "mentors" in data
        # 6 sample mentors seeded; mentors collection list
        assert len(data["mentors"]) >= 6

    def test_internships(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/catalog/internships")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "internships" in data
        assert len(data["internships"]) >= 6

    def test_deals(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/catalog/deals")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "deals" in data
        assert len(data["deals"]) >= 8

    def test_resources_all(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/catalog/resources")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "resources" in data
        cats = {x.get("category") for x in data["resources"]}
        assert {"insurance", "housing", "loans"}.issubset(cats)

    def test_resources_filter(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/catalog/resources", params={"category": "loans"})
        assert r.status_code == 200
        for x in r.json()["resources"]:
            assert x["category"] == "loans"


# ---------------- Dashboard ----------------
class TestDashboard:
    def test_dashboard(self, api_client):
        r = api_client.get(
            f"{BASE_URL}/api/dashboard",
            headers={"Authorization": f"Bearer {state['student_token']}"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("user", "stats", "featured_courses", "featured_deals", "featured_internships", "career_suggestions"):
            assert k in data, f"Missing {k}"
        assert data["user"]["email"] == state["student_email"]
        stats = data["stats"]
        for k in ("courses_available", "mentors_available", "internships_available", "deals_available"):
            assert k in stats
            assert isinstance(stats[k], int)
        assert stats["courses_available"] >= 8
