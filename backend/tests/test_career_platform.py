"""
Backend regression tests for Student Alumni Platform (Iteration 2).
Covers: multi-role auth (student/alumni/mentor/admin), role-specific onboarding,
mentor approval workflow, 8 dashboard module catalogs, bookings, AI, dashboard.
"""
import os
import secrets
import pytest

BASE_URL = (
    os.environ.get("EXPO_BACKEND_URL")
    or os.environ.get("EXPO_PUBLIC_BACKEND_URL")
).rstrip("/")

ADMIN_EMAIL = "admin@careerpath.app"
ADMIN_PASSWORD = "Admin@12345"

state = {
    "student_email": f"test-student-{secrets.token_hex(4)}@test.com",
    "student_password": "Student@123",
    "student_token": None,
    "student_id": None,

    "student2_email": f"test-student2-{secrets.token_hex(4)}@test.com",
    "student2_token": None,

    "alumni_email": f"test-alumni-{secrets.token_hex(4)}@test.com",
    "alumni_token": None,

    "mentor_email": f"test-mentor-{secrets.token_hex(4)}@test.com",
    "mentor_token": None,
    "mentor_user_id": None,

    "admin_token": None,
    "booking_id": None,
}


# ---------------- Health ----------------
class TestHealth:
    def test_root(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/")
        assert r.status_code == 200, r.text
        assert r.json().get("status") == "ok"


# ---------------- Auth - multi-role ----------------
class TestAuth:
    def test_register_student(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": state["student_email"],
            "password": state["student_password"],
            "full_name": "Test Student",
            "role": "student",
            "phone": "+919999999999",
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert "access_token" in d and "refresh_token" in d
        assert d["user"]["role"] == "student"
        # mentor_status MUST be null for non-mentor roles
        assert d["user"].get("mentor_status") is None, f"Non-mentor must have mentor_status=null, got {d['user'].get('mentor_status')}"
        assert d["user"]["onboarding_completed"] is False
        state["student_token"] = d["access_token"]
        state["student_id"] = d["user"]["id"]

    def test_register_student2_for_autofill(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": state["student2_email"],
            "password": state["student_password"],
            "full_name": "Test Student2",
            "role": "student",
        })
        assert r.status_code == 200
        state["student2_token"] = r.json()["access_token"]

    def test_register_alumni(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": state["alumni_email"],
            "password": state["student_password"],
            "full_name": "Test Alumni",
            "role": "alumni",
        })
        assert r.status_code == 200
        u = r.json()["user"]
        assert u["role"] == "alumni"
        assert u.get("mentor_status") is None
        state["alumni_token"] = r.json()["access_token"]

    def test_register_mentor_pending(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": state["mentor_email"],
            "password": state["student_password"],
            "full_name": "Test Mentor",
            "role": "mentor",
        })
        assert r.status_code == 200, r.text
        u = r.json()["user"]
        assert u["role"] == "mentor"
        # CRITICAL: mentor_status must be 'pending' on registration
        assert u.get("mentor_status") == "pending", f"Expected mentor_status=pending, got {u.get('mentor_status')}"
        state["mentor_token"] = r.json()["access_token"]
        state["mentor_user_id"] = u["id"]

    def test_register_duplicate(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": state["student_email"], "password": "x" * 6,
            "full_name": "Dup", "role": "student",
        })
        assert r.status_code == 400

    def test_login_admin(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD,
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user"]["role"] == "admin"
        state["admin_token"] = d["access_token"]

    def test_login_bad_password(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": "WrongPass!"
        })
        assert r.status_code == 401

    def test_get_me(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {state['student_token']}"})
        assert r.status_code == 200
        assert r.json()["email"] == state["student_email"]

    def test_get_me_no_token(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401


# ---------------- Onboarding (role-specific) ----------------
class TestOnboarding:
    def test_student_class_10_rejected(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/users/onboarding",
            json={
                "school_info": {"institution_name": "X HS", "institution_type": "school",
                                "class_or_year": "10", "country": "India"},
                "career_path": "job",
                "interests": [],
            },
            headers={"Authorization": f"Bearer {state['student_token']}"})
        assert r.status_code == 400, r.text
        assert "11" in r.json().get("detail", "")

    def test_student_with_student_info_succeeds_and_unique_id_format(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/users/onboarding",
            json={
                "school_info": {"institution_name": "Springdale Sr Sec",
                                "institution_type": "school", "class_or_year": "12",
                                "branch_or_stream": "Science", "country": "India"},
                "career_path": "job",
                "student_info": {"age": 17, "education_level": "plus_two",
                                 "career_interests": ["AI"]},
                "interests": ["Software"], "skills": ["Python"], "bio": "Aspiring SWE",
            },
            headers={"Authorization": f"Bearer {state['student_token']}"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["onboarding_completed"] is True
        assert d["career_path"] == "job"
        # Unique ID: SA-YYYY-STU-XXXXXX
        uid = d.get("unique_id") or ""
        assert uid.startswith("SA-") and "-STU-" in uid, f"Bad unique_id: {uid}"
        parts = uid.split("-")
        assert len(parts) == 4 and len(parts[3]) == 6
        # QR base64 PNG
        qr = d.get("qr_code_base64") or ""
        assert qr.startswith("iVBOR"), "qr_code_base64 not a PNG"
        assert d["student_info"]["age"] == 17
        assert d["student_info"]["education_level"] == "plus_two"

    def test_student_autofill_without_student_info(self, api_client):
        # Student2 has no student_info but valid Class 11
        r = api_client.post(f"{BASE_URL}/api/users/onboarding",
            json={
                "school_info": {"institution_name": "Auto School",
                                "institution_type": "school", "class_or_year": "11",
                                "country": "India"},
                "career_path": "higher_education",
                "interests": ["Math"],
            },
            headers={"Authorization": f"Bearer {state['student2_token']}"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["onboarding_completed"] is True
        # auto-filled student_info expected
        assert d.get("student_info") is not None
        assert d["student_info"]["education_level"] in ("plus_one", "plus_two", "btech")

    def test_mentor_without_mentor_info_rejected(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/users/onboarding",
            json={
                "school_info": {"institution_name": "Some Co", "institution_type": "college",
                                "class_or_year": "N/A", "country": "India"},
                "career_path": "job",
                "interests": [],
            },
            headers={"Authorization": f"Bearer {state['mentor_token']}"})
        assert r.status_code == 400, r.text

    def test_mentor_with_mentor_info_succeeds(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/users/onboarding",
            json={
                "school_info": {"institution_name": "Google", "institution_type": "college",
                                "class_or_year": "N/A", "country": "USA"},
                "mentor_info": {"category": "it_software", "organization": "Google",
                                "job_title": "SWE", "linkedin_url": "https://linkedin.com/in/x"},
                "interests": [], "skills": [],
            },
            headers={"Authorization": f"Bearer {state['mentor_token']}"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["onboarding_completed"] is True
        assert d["mentor_info"]["organization"] == "Google"
        assert d["mentor_info"]["job_title"] == "SWE"
        # Still pending until admin approves
        assert d.get("mentor_status") == "pending"


# ---------------- Mentor approval (admin) ----------------
class TestAdminMentorApproval:
    def test_pending_requires_admin(self, api_client):
        # Student token -> 403
        r = api_client.get(f"{BASE_URL}/api/admin/mentors/pending",
            headers={"Authorization": f"Bearer {state['student_token']}"})
        assert r.status_code == 403

    def test_admin_lists_pending(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/admin/mentors/pending",
            headers={"Authorization": f"Bearer {state['admin_token']}"})
        assert r.status_code == 200, r.text
        ids = [m.get("id") for m in r.json().get("mentors", [])]
        assert state["mentor_user_id"] in ids, "Newly-registered mentor should be in pending list"

    def test_admin_approve_mentor(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/admin/mentors/{state['mentor_user_id']}/approve",
            headers={"Authorization": f"Bearer {state['admin_token']}"})
        assert r.status_code == 200
        assert r.json().get("status") == "approved"
        # Verify via /auth/me as that mentor
        r2 = api_client.get(f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {state['mentor_token']}"})
        assert r2.status_code == 200
        assert r2.json().get("mentor_status") == "approved"


# ---------------- Catalog endpoints (8 modules) ----------------
class TestCatalog:
    def test_events(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/catalog/events")
        assert r.status_code == 200, r.text
        events = r.json()["events"]
        assert len(events) >= 6
        cats = {e.get("category") for e in events}
        # Spec: hackathon/workshop/fest categories should exist
        assert "hackathon" in cats
        assert "workshop" in cats
        assert "fest" in cats

    def test_financial_loans(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/catalog/financial", params={"kind": "loan"})
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) >= 1
        for x in items:
            assert x["kind"] == "loan"

    def test_financial_scholarships(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/catalog/financial", params={"kind": "scholarship"})
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) >= 1
        for x in items:
            assert x["kind"] == "scholarship"

    def test_insurance(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/catalog/insurance")
        assert r.status_code == 200
        items = r.json()["items"]
        kinds = {i.get("kind") for i in items}
        assert "medical" in kinds
        assert "bike" in kinds
        assert "loan" in kinds

    def test_housing_usa(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/catalog/housing", params={"country": "USA"})
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) >= 1
        for x in items:
            assert x["country"] == "USA"

    def test_mentors_only_approved_and_samples(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/catalog/mentors")
        assert r.status_code == 200, r.text
        mentors = r.json()["mentors"]
        # All real-mentor entries (those with role field) must be approved
        for m in mentors:
            if m.get("role") == "mentor":
                assert m.get("mentor_status") == "approved", f"Unapproved mentor leaked: {m.get('email')}"
        # Sample mentors should be present
        sample_ids = {m.get("id") for m in mentors}
        assert "m1" in sample_ids, "Sample mentor m1 missing"
        # The newly-approved mentor should now appear
        emails = {m.get("email") for m in mentors if m.get("email")}
        assert state["mentor_email"] in emails, "Approved mentor not visible in /catalog/mentors"


# ---------------- Bookings ----------------
class TestBookings:
    def test_create_booking_for_sample_mentor(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/bookings",
            json={
                "mentor_id": "m1",
                "slot_start_iso": "2026-02-15T10:00:00Z",
                "slot_end_iso": "2026-02-15T11:00:00Z",
                "topic": "Career advice for SDE",
                "notes": "Need help cracking FAANG",
            },
            headers={"Authorization": f"Bearer {state['student_token']}"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["mentor_id"] == "m1"
        assert d["status"] == "confirmed"
        assert "id" in d
        state["booking_id"] = d["id"]

    def test_my_bookings(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/bookings/me",
            headers={"Authorization": f"Bearer {state['student_token']}"})
        assert r.status_code == 200
        bookings = r.json()["bookings"]
        assert len(bookings) >= 1
        assert any(b.get("mentor_id") == "m1" for b in bookings)

    def test_alumni_cannot_book(self, api_client):
        # Alumni hasn't onboarded but role check happens first
        r = api_client.post(f"{BASE_URL}/api/bookings",
            json={"mentor_id": "m1", "slot_start_iso": "2026-02-15T10:00:00Z",
                  "slot_end_iso": "2026-02-15T11:00:00Z", "topic": "x"},
            headers={"Authorization": f"Bearer {state['alumni_token']}"})
        assert r.status_code == 403


# ---------------- AI ----------------
class TestAI:
    def test_career_suggestions(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/ai/career-suggestions",
            json={"additional_context": "Strong in math"},
            headers={"Authorization": f"Bearer {state['student_token']}"},
            timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("summary", "milestones"):
            assert k in d
        assert isinstance(d["milestones"], list)
        assert len(d["summary"]) > 5


# ---------------- Dashboard ----------------
class TestDashboard:
    def test_dashboard_payload(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/dashboard",
            headers={"Authorization": f"Bearer {state['student_token']}"})
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("user", "stats", "featured_events", "personalization"):
            assert k in d, f"Missing {k}"
        # stats includes events_available
        assert "events_available" in d["stats"]
        assert isinstance(d["stats"]["events_available"], int)
        assert d["stats"]["events_available"] >= 6
        # personalization
        p = d["personalization"]
        assert p.get("career_path") == "job"
        assert p.get("education_level") == "plus_two"
        assert isinstance(p.get("priority_modules"), list)
        assert len(p["priority_modules"]) >= 5
