import pytest
import httpx
import uuid
import os
from fastapi import FastAPI
from routers.careers import router as careers_router
from jobs_feed import router as jobs_feed_router
from core.security import create_access_token
from core.db import db

# Create test app mounting careers router and existing jobs_feed router under /api
app = FastAPI()
app.include_router(careers_router, prefix="/api")
app.include_router(jobs_feed_router, prefix="/api")


import jwt
from core.security import JWT_SECRET, JWT_ALGORITHM

def make_token(sub: str, role: str) -> str:
    return jwt.encode({"sub": sub, "role": role, "type": "access"}, JWT_SECRET, algorithm=JWT_ALGORITHM)

@pytest.mark.anyio
async def test_careers_module_flow():
    from bson import ObjectId
    admin_oid = ObjectId()
    student_oid = ObjectId()

    admin_token = make_token(str(admin_oid), "superadmin")
    student_token = make_token(str(student_oid), "student")

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    student_headers = {"Authorization": f"Bearer {student_token}"}

    await db.users.insert_one({
        "_id": admin_oid,
        "email": "superadmin@student-alumni.org",
        "name": "Super Admin Tester",
        "role": "superadmin",
    })
    await db.users.insert_one({
        "_id": student_oid,
        "email": "student.tester@college.edu",
        "name": "Kalyan Student Tester",
        "role": "student",
        "phone": "+91 9876543210",
    })

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Super Admin creates a Draft Career Opening
        create_payload = {
            "title": "Lead Software Engineer - StudentAlumni",
            "company_name": "StudentAlumni Core Team",
            "description": "Building next-generation campus and alumni intelligence systems.",
            "responsibilities": ["Design distributed APIs", "Scale MongoDB clusters"],
            "requirements": ["5+ years Python/FastAPI", "MongoDB expertise"],
            "skills": ["Python", "FastAPI", "MongoDB", "AsyncIO"],
            "employment_type": "FULL_TIME",
            "work_mode": "REMOTE",
            "location": "Bengaluru, India",
            "experience_level": "SENIOR",
            "salary_range": "₹24,00,000 - ₹32,00,000 P.A.",
            "status": "DRAFT",
            "featured": True,
        }
        res = await client.post("/api/careers/admin/openings", json=create_payload, headers=admin_headers)
        assert res.status_code == 200, res.text
        opening = res.json()
        opening_id = opening["id"]
        assert opening["status"] == "DRAFT"
        assert opening["title"] == create_payload["title"]

        # 2. Verify draft opening is NOT visible in public /api/careers
        pub_res = await client.get("/api/careers")
        assert pub_res.status_code == 200
        pub_data = pub_res.json()
        assert not any(op["id"] == opening_id for op in pub_data["openings"])

        # 3. Super Admin publishes the opening
        pub_action_res = await client.post(f"/api/careers/admin/openings/{opening_id}/publish", headers=admin_headers)
        assert pub_action_res.status_code == 200
        assert pub_action_res.json()["success"] is True

        # 4. Verify opening is now visible publicly
        pub_res2 = await client.get("/api/careers")
        assert pub_res2.status_code == 200
        pub_data2 = pub_res2.json()
        assert any(op["id"] == opening_id for op in pub_data2["openings"])

        # 5. Public single opening detail
        detail_res = await client.get(f"/api/careers/{opening_id}")
        assert detail_res.status_code == 200
        assert detail_res.json()["id"] == opening_id

        # 6. Student applies to the opening
        apply_payload = {
            "cover_letter": "I am excited to build high-performance systems for StudentAlumni.",
            "resume_url": "https://storage.student-alumni.org/resumes/kalyan.pdf",
            "phone": "+91 9876543210",
        }
        apply_res = await client.post(f"/api/careers/{opening_id}/apply", json=apply_payload, headers=student_headers)
        assert apply_res.status_code == 200
        apply_data = apply_res.json()
        assert apply_data["success"] is True
        application_id = apply_data["application"]["id"]
        assert "admin_notes" not in apply_data["application"]

        # 7. Duplicate application prevention: Attempting to apply again MUST return HTTP 409
        dup_res = await client.post(f"/api/careers/{opening_id}/apply", json=apply_payload, headers=student_headers)
        assert dup_res.status_code == 409
        assert "already applied" in dup_res.json()["detail"].lower()

        # 8. Student checks their submitted applications
        my_apps_res = await client.get("/api/careers/student/my-applications", headers=student_headers)
        assert my_apps_res.status_code == 200
        my_apps = my_apps_res.json()["applications"]
        assert any(a["id"] == application_id for a in my_apps)

        # 9. Super Admin views all applications
        admin_apps_res = await client.get("/api/careers/admin/applications", headers=admin_headers)
        assert admin_apps_res.status_code == 200
        admin_apps = admin_apps_res.json()["applications"]
        assert any(a["id"] == application_id for a in admin_apps)

        # 10. Super Admin updates status and adds private note
        status_update_payload = {
            "status": "SHORTLISTED",
            "admin_notes": "Strong candidate with solid portfolio. Interview on Thursday.",
        }
        update_res = await client.patch(
            f"/api/careers/admin/applications/{application_id}/status",
            json=status_update_payload,
            headers=admin_headers,
        )
        assert update_res.status_code == 200
        assert update_res.json()["status"] == "SHORTLISTED"
        assert update_res.json()["admin_notes"] == status_update_payload["admin_notes"]

        # 11. Student views their application: verify status is SHORTLISTED and admin_notes are HIDDEN
        student_check_res = await client.get(f"/api/careers/student/my-applications/{application_id}", headers=student_headers)
        assert student_check_res.status_code == 200
        student_view = student_check_res.json()
        assert student_view["status"] == "SHORTLISTED"
        assert "admin_notes" not in student_view
        assert len(student_view.get("status_history", [])) >= 2  # APPLIED then SHORTLISTED

        # 12. Super Admin stats
        stats_res = await client.get("/api/careers/admin/stats", headers=admin_headers)
        assert stats_res.status_code == 200
        stats = stats_res.json()
        assert stats["total_openings"] >= 1
        assert stats["total_applications"] >= 1

        # 13. Super Admin closes the opening
        close_res = await client.post(f"/api/careers/admin/openings/{opening_id}/close", headers=admin_headers)
        assert close_res.status_code == 200
        assert close_res.json()["success"] is True

        # 14. Applying to a closed opening is blocked
        student2_oid = ObjectId()
        await db.users.insert_one({"_id": student2_oid, "email": "s2@test.com", "role": "student"})
        student2_token = make_token(str(student2_oid), "student")
        apply_closed_res = await client.post(
            f"/api/careers/{opening_id}/apply",
            json=apply_payload,
            headers={"Authorization": f"Bearer {student2_token}"},
        )
        assert apply_closed_res.status_code == 400
        assert "closed" in apply_closed_res.json()["detail"].lower()


@pytest.mark.anyio
async def test_existing_jobs_feed_coexistence():
    """
    Verify that existing external Jobs feed endpoints remain operational
    and completely isolated from the new first-party careers module.
    """
    from bson import ObjectId
    user_oid = ObjectId()
    await db.users.insert_one({"_id": user_oid, "email": "feed.user@example.com", "role": "student"})
    user_token = make_token(str(user_oid), "student")
    user_headers = {"Authorization": f"Bearer {user_token}"}

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Existing jobs feed endpoint returns 200
        feed_res = await client.get("/api/jobs/feed?page=1&per_page=5", headers=user_headers)
        assert feed_res.status_code == 200
        feed_data = feed_res.json()
        assert "items" in feed_data
        assert "total" in feed_data

        # 2. First-party careers endpoint returns 200 and does not contain external jobs
        careers_res = await client.get("/api/careers")
        assert careers_res.status_code == 200
        careers_data = careers_res.json()
        assert "openings" in careers_data

        # Ensure no cross-contamination between systems
        for opening in careers_data["openings"]:
            assert "job_id" not in opening  # job_id is external jobs schema
            assert "company_name" in opening  # company_name is first-party career schema
