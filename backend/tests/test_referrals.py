"""
Alumni Referrals — backend tests.

Requires MongoDB (MONGO_URL / DB_NAME env, mirrors backend/.env.example and CI).
Covers:
  1. company_key normalization (pure unit tests)
  2. GET /api/jobs/{job_id}/alumni privacy gating (no email/phone, visibility respected)
  3. POST /api/referrals creation + rate limits
  4. GET /api/referrals/inbox + POST /api/referrals/{id}/respond transitions
"""
import uuid
from bson import ObjectId
import httpx
import jwt
import pytest
from fastapi import FastAPI

from core.db import db
from core.security import JWT_SECRET, JWT_ALGORITHM
from features.routers.referrals import router as referrals_router
from services.company_norm import company_key, extract_company_name

app = FastAPI()
app.include_router(referrals_router, prefix="/api")


def make_token(sub: str, role: str) -> str:
    return jwt.encode({"sub": sub, "role": role, "type": "access"}, JWT_SECRET, algorithm=JWT_ALGORITHM)


# ── 1. company_key normalization ─────────────────────────────────────────────


def test_company_key_normalizes_variants():
    assert company_key("VNR") == company_key("vnr")
    assert company_key("VNR Vidda Pvt Ltd") == company_key("vnr vidda pvt ltd")
    assert company_key("Acme, Inc.") == "acme"
    assert company_key("  Globex   Corporation  ") == "globex"
    assert company_key("Müller GmbH & Co.") == "muller gmbh"
    assert company_key("") == ""
    assert company_key(None) == ""
    # trailing suffixes drop one at a time, non-suffixes stay
    assert company_key("VNR Vidda") == "vnr vidda"
    assert company_key("VNR-Vidda") == "vnr vidda"
    assert company_key("a") == "a"  # single-token fallback keeps the stripped string


def test_extract_company_name_probes_field_variants():
    assert extract_company_name({"alumni_info": {"company": "Acme"}}) == "Acme"
    assert extract_company_name({"alumni_info": {"current_employer": "Globex"}}) == "Globex"
    assert extract_company_name({"mentor_profile": {"organization": "Initech"}}) == "Initech"
    assert extract_company_name({"company": "Umbrella"}) == "Umbrella"
    assert extract_company_name({}) == ""


@pytest.mark.anyio
async def test_company_key_backfill_writes_keys():
    from services.company_norm import backfill_company_keys

    uid = uuid.uuid4().hex[:8]
    u1 = ObjectId()
    await db.users.insert_one({
        "_id": u1,
        "email": f"bk_user_{uid}@test.com",
        "role": "alumni",
        "alumni_info": {"company": "VNR Vidda Pvt Ltd"},
    })
    j1 = ObjectId()
    await db.jobs_cache.insert_one({
        "_id": j1,
        "dedup_hash": f"bk_{uid}",
        "title": "SDE",
        "company": "vnr vidda pvt ltd",
    })

    counters = await backfill_company_keys(db)
    assert counters["users"] >= 1
    assert counters["jobs"] >= 1

    user_doc = await db.users.find_one({"_id": u1})
    assert user_doc["alumni_info"]["company_key"] == "vnr vidda"
    job_doc = await db.jobs_cache.find_one({"_id": j1})
    assert job_doc["company_key"] == "vnr vidda"


# ── fixtures for endpoint tests ──────────────────────────────────────────────

async def _make_users(uid: str) -> dict:
    """Seed viewer + matching alumni + non-matching + private + disabled users."""
    viewer = ObjectId()
    alumni1 = ObjectId()
    alumni_private = ObjectId()
    alumni_disabled = ObjectId()
    mentor1 = ObjectId()
    other_co = ObjectId()
    await db.users.insert_many([
        {
            "_id": viewer,
            "email": f"viewer_{uid}@college.edu",
            "full_name": "Viewer Student",
            "role": "student",
            "phone": "+91 11112222333",
            "profile_visibility": "public",
            "college": "VNR Vidda VIT",
        },
        {
            "_id": alumni1,
            "email": f"al1_{uid}@vnrvidda.com",
            "full_name": "Alumni One",
            "role": "alumni",
            "phone": "+91 44445555666",
            "profile_visibility": "public",
            "college": "VNR Vidda VIT",
            "alumni_info": {"company": "VNR Vidda Pvt Ltd", "company_key": "vnr vidda", "current_role": "SDE II", "graduation_year": 2021},
        },
        {
            "_id": alumni_private,
            "email": f"alpriv_{uid}@vnrvidda.com",
            "full_name": "Private Alumni",
            "role": "alumni",
            "phone": "+91 77778888999",
            "profile_visibility": "private",
            "alumni_info": {"company": "VNR Vidda Pvt Ltd", "company_key": "vnr vidda"},
        },
        {
            "_id": alumni_disabled,
            "email": f"aldis_{uid}@vnrvidda.com",
            "full_name": "Disabled Alumni",
            "role": "alumni",
            "accepts_referrals": False,
            "profile_visibility": "public",
            "alumni_info": {"company": "VNR Vidda Pvt Ltd", "company_key": "vnr vidda", "current_role": "SDE"},
        },
        {
            "_id": mentor1,
            "email": f"ment_{uid}@vnrvidda.com",
            "full_name": "Mentor Maya",
            "role": "mentor",
            "profile_visibility": "public",
            "mentor_profile": {"organization": "VNR Vidda", "organization_key": "vnr vidda", "job_title": "Staff Engineer"},
            "graduation_year": 2015,
        },
        {
            "_id": other_co,
            "email": f"othr_{uid}@acme.com",
            "full_name": "Other Company",
            "role": "alumni",
            "alumni_info": {"company": "Acme Inc", "company_key": "acme"},
        },
    ])
    job = ObjectId()
    await db.jobs_cache.insert_one({
        "_id": job,
        "dedup_hash": f"job_{uid}",
        "title": "Backend Engineer",
        "company": "VNR Vidda Pvt Ltd",
        "company_key": "vnr vidda",
    })
    return {
        "viewer": str(viewer),
        "alumni1": str(alumni1),
        "alumni_private": str(alumni_private),
        "alumni_disabled": str(alumni_disabled),
        "mentor1": str(mentor1),
        "other_co": str(other_co),
        "job_id": f"job_{uid}",
    }


@pytest.mark.anyio
async def test_job_alumni_privacy_gating():
    uid = uuid.uuid4().hex[:8]
    ids = await _make_users(uid)

    # Prune residual seeded users from earlier runs so the bounded first pass
    # (limit 200) is guaranteed to include this run's fresh mentor/alumni.
    keep_alumni = [ObjectId(ids["alumni1"]), ObjectId(ids["alumni_private"]), ObjectId(ids["alumni_disabled"])]
    await db.users.delete_many({
        "mentor_profile.organization_key": "vnr vidda",
        "_id": {"$nin": [ObjectId(ids["mentor1"])]},
    })
    await db.users.delete_many({
        "alumni_info.company_key": "vnr vidda",
        "_id": {"$nin": keep_alumni},
    })
    await db.users.delete_many({
        "$or": [
            {"alumni_info.company": "VNR Vidda"},
            {"mentor_profile.organization": "VNR Vidda"},
        ],
        "alumni_info.company_key": {"$in": [None, ""]},
        "_id": {"$nin": keep_alumni + [ObjectId(ids["mentor1"])]},
    })

    viewer_token = make_token(ids["viewer"], "student")
    headers = {"Authorization": f"Bearer {viewer_token}"}

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get(f"/api/jobs/{ids['job_id']}/alumni", headers=headers)
        assert res.status_code == 200, res.text
        data = res.json()
        listed = {i["id"] for i in data["items"]}

        # exact field allowlist — no email/phone ever returned
        for item in data["items"]:
            assert set(item.keys()) == {
                "id", "name", "photo", "role", "grad_year", "college", "is_connected", "accepts_referrals"
            }
            assert "email" not in item
            assert "phone" not in item

        # matching alumni + mentor present, same-college alumni ranked first
        assert ids["alumni1"] in listed
        assert ids["mentor1"] in listed
        assert ids["other_co"] not in listed
        first = data["items"][0]
        assert first["id"] == ids["alumni1"]  # same-college first
        assert first["is_connected"] is False
        assert first["accepts_referrals"] is True  # default ON

        # private profile NOT surfaced
        assert ids["alumni_private"] not in listed
        assert data["total_from_viewer_college"] >= 1

        # accepts_referrals=False reflected (default ON otherwise)
        disabled_item = next(i for i in data["items"] if i["id"] == ids["alumni_disabled"])
        assert disabled_item["accepts_referrals"] is False

        # 404 for unknown job
        res404 = await client.get("/api/jobs/does_not_exist/alumni", headers=headers)
        assert res404.status_code == 404


@pytest.mark.anyio
async def test_referral_create_and_rate_limits():
    uid = uuid.uuid4().hex[:8]
    ids = await _make_users(uid)

    viewer_token = make_token(ids["viewer"], "student")
    al1_token = make_token(ids["alumni1"], "alumni")
    headers = {"Authorization": f"Bearer {viewer_token}"}

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # reject recipient who opted out
        res_dis = await client.post("/api/referrals", json={
            "job_id": ids["job_id"], "alumni_id": ids["alumni_disabled"], "note": "hi",
        }, headers=headers)
        assert res_dis.status_code == 403

        # unknown recipient
        res_bad = await client.post("/api/referrals", json={
            "job_id": ids["job_id"], "alumni_id": str(ObjectId()), "note": "",
        }, headers=headers)
        assert res_bad.status_code == 404

        # too-long note
        res_long = await client.post("/api/referrals", json={
            "job_id": ids["job_id"], "alumni_id": ids["alumni1"], "note": "x" * 501,
        }, headers=headers)
        assert res_long.status_code == 422

        # first create succeeds, notification + DM written
        res = await client.post("/api/referrals", json={
            "job_id": ids["job_id"], "alumni_id": ids["alumni1"],
            "note": "I worked on a similar project, would appreciate an intro.",
        }, headers=headers)
        assert res.status_code == 200, res.text
        ref = res.json()
        assert ref["status"] == "requested"
        assert ref["daily_used"] == 1 and ref["daily_limit"] == 5

        stored = await db.referral_requests.find_one({"_id": ObjectId(ref["id"])})
        assert stored["status"] == "requested"
        assert stored["alumni_id"] == ids["alumni1"]

        ntok = await db.notifications.find_one({"user_id": ids["alumni1"], "data.type": "referral_requested"})
        assert ntok is not None
        dm = await db.chat_messages.find_one({"referral_id": ref["id"], "kind": "referral_request"})
        assert dm is not None
        assert dm["from_user"] == ids["viewer"] and dm["to_user"] == ids["alumni1"]

        # duplicate (alumni, job) pair blocked
        dup = await client.post("/api/referrals", json={
            "job_id": ids["job_id"], "alumni_id": ids["alumni1"], "note": "",
        }, headers=headers)
        assert dup.status_code == 409

        # daily limit: 4 more distinct recipients hit the cap, 6th (a new recipient) -> 429
        extra = []
        for i in range(4):
            x = ObjectId()
            await db.users.insert_one({
                "_id": x,
                "email": f"ratelimit_{uid}_{i}@vnrvidda.com",
                "full_name": f"Rate Limit {i}",
                "role": "alumni",
                "alumni_info": {"company": "VNR Vidda", "company_key": "vnr vidda"},
            })
            extra.append(str(x))
        for xid in extra:
            r = await client.post("/api/referrals", json={
                "job_id": ids["job_id"], "alumni_id": xid, "note": "",
            }, headers=headers)
            assert r.status_code == 200, r.text

        fresh = ObjectId()
        await db.users.insert_one({
            "_id": fresh,
            "email": f"ratelimit_{uid}_fresh@vnrvidda.com",
            "full_name": "Rate Limit Fresh",
            "role": "alumni",
            "alumni_info": {"company": "VNR Vidda", "company_key": "vnr vidda"},
        })
        limit_res = await client.post("/api/referrals", json={
            "job_id": ids["job_id"], "alumni_id": str(fresh), "note": "",
        }, headers=headers)
        assert limit_res.status_code == 429, limit_res.text

        # my-requests lists the student's own requests
        my_reqs = await client.get("/api/referrals/my-requests", headers=headers)
        assert my_reqs.status_code == 200
        assert my_reqs.json()["total"] == 5

        # alumni cannot create requests
        al_res = await client.post("/api/referrals", json={
            "job_id": ids["job_id"], "alumni_id": ids["alumni1"], "note": "",
        }, headers={"Authorization": f"Bearer {al1_token}"})
        assert al_res.status_code == 403

        # inbox: alumni sees their requests; mentor without requests sees empty
        inbox = await client.get("/api/referrals/inbox", headers={"Authorization": f"Bearer {al1_token}"})
        assert inbox.status_code == 200
        inbox_items = inbox.json()["items"]
        assert len(inbox_items) == 1
        req_doc = inbox_items[0]
        assert req_doc["student_name"] == "Viewer Student"
        assert req_doc["status"] == "requested"

        ment_inbox = await client.get("/api/referrals/inbox", headers={"Authorization": f"Bearer {make_token(ids['mentor1'], 'mentor')}"})
        assert ment_inbox.status_code == 200
        assert ment_inbox.json()["total"] == 0

        # student is blocked from inbox
        stu_inbox = await client.get("/api/referrals/inbox", headers=headers)
        assert stu_inbox.status_code == 403

        # respond: only the recipient can respond, only once, valid statuses only
        wrong_alumni_headers = {"Authorization": f"Bearer {make_token(ids['other_co'], 'alumni')}"}
        res_wrong = await client.post(f"/api/referrals/{ref['id']}/respond", json={"status": "accepted"}, headers=wrong_alumni_headers)
        assert res_wrong.status_code == 404

        res_badstatus = await client.post(f"/api/referrals/{ref['id']}/respond", json={"status": "requested"}, headers={"Authorization": f"Bearer {al1_token}"})
        assert res_badstatus.status_code == 400

        accepted = await client.post(f"/api/referrals/{ref['id']}/respond", json={"status": "accepted"}, headers={"Authorization": f"Bearer {al1_token}"})
        assert accepted.status_code == 200, accepted.text
        assert accepted.json()["status"] == "accepted"

        # already handled
        again = await client.post(f"/api/referrals/{ref['id']}/respond", json={"status": "declined"}, headers={"Authorization": f"Bearer {al1_token}"})
        assert again.status_code == 409

        stored2 = await db.referral_requests.find_one({"_id": ObjectId(ref["id"])})
        assert stored2["status"] == "accepted"
        assert stored2.get("responded_at") is not None

        notif = await db.notifications.find_one({"user_id": ids["viewer"], "data.type": "referral_accepted"})
        assert notif is not None


@pytest.mark.anyio
async def test_referral_settings_toggle():
    uid = uuid.uuid4().hex[:8]
    ids = await _make_users(uid)
    al1_token = make_token(ids["alumni1"], "alumni")
    stu_token = make_token(ids["viewer"], "student")

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        off = await client.patch("/api/users/me/referral-settings", json={"accepts_referrals": False}, headers={"Authorization": f"Bearer {al1_token}"})
        assert off.status_code == 200, off.text
        assert off.json()["accepts_referrals"] is False

        doc = await db.users.find_one({"_id": ObjectId(ids["alumni1"])})
        assert doc["accepts_referrals"] is False

        on = await client.patch("/api/users/me/referral-settings", json={"accepts_referrals": True}, headers={"Authorization": f"Bearer {al1_token}"})
        assert on.status_code == 200

        student_blocked = await client.patch("/api/users/me/referral-settings", json={"accepts_referrals": True}, headers={"Authorization": f"Bearer {stu_token}"})
        assert student_blocked.status_code == 403
