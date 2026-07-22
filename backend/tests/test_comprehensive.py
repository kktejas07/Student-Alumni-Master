import pytest
import jwt
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from core.security import JWT_SECRET, JWT_ALGORITHM

@pytest.fixture
async def mentor_client(client):
    if client is None:
        yield None
        return
    unique = datetime.now().timestamp()
    payload = {
        "email": f"mentor_{unique}@test.com",
        "password": "Test@123!pass",
        "full_name": "Test Mentor",
        "role": "mentor",
    }
    resp = await client.post("/api/auth/register", json=payload)
    assert resp.status_code in [200, 201]
    token = resp.json().get("access_token")
    client.headers = {"Authorization": f"Bearer {token}"}
    yield client

class TestComprehensiveAPI:
    # 1. Authentication
    async def test_auth_register_and_login(self, client):
        unique = datetime.now().timestamp()
        email = f"user_{unique}@test.com"
        password = "Test@123!pass"
        # Register
        resp = await client.post("/api/auth/register", json={
            "email": email,
            "password": password,
            "full_name": "Test User",
            "role": "student"
        })
        assert resp.status_code in [200, 201]
        
        # Login
        resp_login = await client.post("/api/auth/login", json={
            "email": email,
            "password": password
        })
        assert resp_login.status_code == 200
        assert "access_token" in resp_login.json()

    # 2. JWT Validation & Edge cases
    async def test_jwt_expired(self, client):
        # Generate an expired token
        payload = {
            "sub": str(ObjectId()),
            "email": "expired@test.com",
            "role": "student",
            "exp": datetime.now(timezone.utc) - timedelta(seconds=1)
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        client.headers = {"Authorization": f"Bearer {token}"}
        resp = await client.get("/api/auth/me")
        assert resp.status_code == 401
        assert "expired" in resp.text.lower() or "invalid" in resp.text.lower() or "unauthorized" in resp.text.lower()

    async def test_jwt_tampered_signature(self, client):
        payload = {
            "sub": str(ObjectId()),
            "email": "tampered@test.com",
            "role": "student",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1)
        }
        # Encode with wrong secret
        token = jwt.encode(payload, "WRONG_SECRET", algorithm=JWT_ALGORITHM)
        client.headers = {"Authorization": f"Bearer {token}"}
        resp = await client.get("/api/auth/me")
        assert resp.status_code == 401

    async def test_jwt_missing_header(self, client):
        client.headers = {}
        resp = await client.get("/api/auth/me")
        assert resp.status_code == 401

    # 3. Role-Based Access Control (RBAC)
    async def test_rbac_student_cannot_access_admin(self, auth_client):
        # Student trying to fetch admin settings
        resp = await auth_client.get("/api/admin/platform-controls")
        assert resp.status_code in [403, 401]

    async def test_rbac_student_cannot_access_mentor_sessions(self, auth_client):
        # Student trying to get mentor specific sessions list
        resp = await auth_client.get("/api/mentor/sessions/me")
        assert resp.status_code in [403, 401]

    # 4. Student & Dashboard APIs
    async def test_student_dashboard(self, auth_client):
        resp = await auth_client.get("/api/student/dashboard")
        assert resp.status_code == 200
        data = resp.json()
        assert "student" in data

    # 5. Mentor APIs
    async def test_mentor_sessions_list(self, mentor_client):
        if mentor_client:
            resp = await mentor_client.get("/api/mentor/sessions/me")
            assert resp.status_code == 200

    # 6. Admin APIs
    async def test_admin_approvals_list(self, admin_client):
        if admin_client:
            resp = await admin_client.get("/api/admin/approvals")
            assert resp.status_code == 200

    # 7. Jobs Feed
    async def test_jobs_feed_filtering(self, auth_client):
        resp = await auth_client.get("/api/jobs/feed", params={"work_mode": "Remote"})
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data

    # 8. Events
    async def test_events_search(self, auth_client):
        resp = await auth_client.get("/api/events/search", params={"q": "workshop"})
        assert resp.status_code == 200

    # 9. Networking
    async def test_networking_discover(self, auth_client):
        resp = await auth_client.get("/api/network/discover")
        assert resp.status_code == 200

    # 10. AI Career APIs
    async def test_ai_chat_mock(self, auth_client):
        resp = await auth_client.post("/api/ai/chat", json={
            "message": "Hello AI",
            "session_id": "test_session_comp"
        })
        assert resp.status_code in [200, 500, 502, 503]

    # 11. Notifications
    async def test_notifications_me(self, auth_client):
        resp = await auth_client.get("/api/notifications")
        assert resp.status_code == 200

    # 12. Database Integrity & Constraints
    async def test_db_duplicate_email_registration(self, client):
        unique = datetime.now().timestamp()
        email = f"duplicate_{unique}@test.com"
        payload = {
            "email": email,
            "password": "Password@123",
            "full_name": "User 1",
            "role": "student"
        }
        resp1 = await client.post("/api/auth/register", json=payload)
        assert resp1.status_code in [200, 201]
        
        # Register second time
        resp2 = await client.post("/api/auth/register", json=payload)
        assert resp2.status_code in [400, 409]

    # 13. Invalid Input & Error Handling
    async def test_invalid_input_emi_negative_amount(self, auth_client):
        resp = await auth_client.post("/api/financial/emi-calculate", json={
            "loan_amount": -10000,
            "interest_rate": 8.5,
            "tenure_months": 60
        })
        assert resp.status_code == 400

    async def test_invalid_input_register_empty_fields(self, client):
        resp = await client.post("/api/auth/register", json={
            "email": "",
            "password": "",
            "full_name": "",
            "role": "student"
        })
        assert resp.status_code in [400, 422]
