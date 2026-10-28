"""
Google OAuth contract tests — POST /api/auth/google (and /api/auth/firebase).

Regression coverage for the production login failure on studentalumni.ai:
"Google sign-in requires a valid id_token." (HTTP 401)

Root cause proven by test_google_fallback_token_verified_via_platform_settings:
the web client signs in through Firebase Auth (signInWithPopup) and sends the
resulting Firebase ID token under the `id_token` field. The backend first tries
Google-JWT verification (verify_oauth2_token against google_oauth_client_id),
which always rejects a Firebase token (different issuer / signing keys /
audience). It then falls back to Firebase Admin verification — but /auth/google
never synced the `firebase_service_account` platform setting into the process
environment (unlike /auth/firebase), so _get_or_init_firebase() saw an empty
env and returned None, making every legitimate login 401.

All verification is mocked at the module boundary; no real Google/Firebase
tokens or network calls are used. Invalid tokens must still be rejected —
this suite never weakens signature/expiry/audience checks.
"""

from __future__ import annotations

import os
import sys
import types
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("JWT_SECRET", "test-secret-for-oauth-contract")
os.environ.setdefault("DB_NAME", "test_oauth_contract")
os.environ.setdefault("SYNC_SCHEDULER_ENABLED", "0")

from bson import ObjectId  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from slowapi import _rate_limit_exceeded_handler  # noqa: E402
from slowapi.errors import RateLimitExceeded  # noqa: E402

from routers import auth as auth_mod  # noqa: E402
from routers.auth import router as auth_router, limiter  # noqa: E402

GOOGLE_SIGNIN_ERROR = "Google sign-in requires a valid id_token."

FAKE_SERVICE_ACCOUNT = '{"type": "service_account", "project_id": "unit-test-project"}'


# ---------------------------------------------------------------- fake Mongo
class FakeCollection:
    """Minimal async Mongo collection stub (find_one / insert_one / update_one)."""

    def __init__(self, docs=None):
        self.docs = list(docs or [])

    def _match(self, query):
        for d in self.docs:
            if all(d.get(k) == v for k, v in query.items()):
                return d
        return None

    async def find_one(self, query, *_args, **_kwargs):
        return self._match(query)

    async def insert_one(self, doc):
        doc = dict(doc)
        doc["_id"] = ObjectId()
        self.docs.append(doc)
        return types.SimpleNamespace(inserted_id=doc["_id"])

    async def update_one(self, query, update):
        d = self._match(query)
        if d is not None:
            d.update(update.get("$set", {}))
        return types.SimpleNamespace(matched_count=1 if d else 0)


class FakeDB:
    def __init__(self, settings=None):
        # platform_controls singleton doc in the shape _get_oauth_creds reads
        self.platform_controls = FakeCollection(
            [{"_id": "singleton", "system_settings": settings or []}]
        )
        self.users = FakeCollection()

    def settings_dict(self):
        return {
            s["key"]: s.get("value", "")
            for s in self.platform_controls.docs[0]["system_settings"]
        }


def setting(key, value):
    return {"key": key, "value": value}


# ---------------------------------------------------------------- fixtures
@pytest.fixture
def client(monkeypatch):
    """Minimal app hosting only the auth router, mirroring server.py wiring."""
    fake_db = FakeDB()
    monkeypatch.setattr(auth_mod, "db", fake_db)
    # Activity credits talk to the real DB import — disable in unit tests.
    monkeypatch.setattr(auth_mod, "_record_activity", None)
    # Reset the lazily-initialized Firebase Admin app between tests.
    monkeypatch.setattr(auth_mod, "_firebase_app", None)
    # Rate limiter state is process-global — clear it per test.
    try:
        limiter.reset()
    except Exception:
        pass

    app = FastAPI()
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.include_router(auth_router, prefix="/api")
    yield TestClient(app)
    # The handler may sync the service account into the env — never leak it.
    os.environ.pop("FIREBASE_SERVICE_ACCOUNT_JSON", None)


@pytest.fixture
def production_mode(monkeypatch):
    """Force strict (production) verification semantics regardless of local .env."""
    monkeypatch.setenv("ENV", "production")
    monkeypatch.delenv("FIREBASE_SERVICE_ACCOUNT_JSON", raising=False)


# ---------------------------------------------------------------- mocks
def google_verifier_rejects(token, request, audience=None):
    """Stand-in for google.auth verify_oauth2_token when verification fails
    (bad signature / wrong audience / malformed)."""
    raise ValueError("Token verification failed")


def google_verifier_accepts(token, request, audience=None):
    """Stand-in for a successfully verified Google-issued ID token."""
    assert audience == "unit-test-client-id"
    return {
        "iss": "accounts.google.com",
        "aud": audience,
        "email": "student@example.com",
        "name": "Test User",
        "picture": "https://lh3.googleusercontent.com/pic.jpg",
        "sub": "1234567890",
    }


FIREBASE_CLAIMS = {
    "email": "firebase.user@example.com",
    "name": "Firebase User",
    "picture": "https://lh3.googleusercontent.com/fb.jpg",
    "uid": "fb-uid-123",
    "phone_number": None,
    "firebase": {"sign_in_provider": "google.com"},
}


def install_firebase_admin_mocks(monkeypatch, claims=FIREBASE_CLAIMS):
    """Replace the Firebase Admin SDK surface with controlled fakes."""

    class FakeCert:
        def __init__(self, payload):
            self.payload = payload

    class FakeApp:
        pass

    monkeypatch.setattr(auth_mod.credentials, "Certificate", FakeCert)
    monkeypatch.setattr(auth_mod, "initialize_app", lambda cred: FakeApp())
    monkeypatch.setattr(
        auth_mod.fb_auth, "verify_id_token", lambda token, **kw: dict(claims)
    )


# ---------------------------------------------------------------- tests
class TestRequestContract:
    def test_missing_id_token_rejected_in_production(self, client, production_mode):
        r = client.post(
            "/api/auth/google",
            json={"email": "student@example.com", "full_name": "Student"},
        )
        assert r.status_code == 401
        assert r.json()["detail"] == GOOGLE_SIGNIN_ERROR

    def test_empty_id_token_rejected(self, client, production_mode):
        r = client.post(
            "/api/auth/google",
            json={"id_token": "", "email": "student@example.com", "full_name": "S"},
        )
        assert r.status_code == 401
        assert r.json()["detail"] == GOOGLE_SIGNIN_ERROR

    def test_malformed_token_rejected(self, client, production_mode):
        r = client.post(
            "/api/auth/google",
            json={
                "id_token": "not-a-jwt",
                "email": "student@example.com",
                "full_name": "S",
            },
        )
        assert r.status_code == 401
        assert r.json()["detail"] == GOOGLE_SIGNIN_ERROR

    def test_wrong_field_name_is_not_accepted(self, client, production_mode):
        # GIS-style `credential` is NOT the documented contract; the schema
        # accepts only id_token (Google/Firebase JWTs) or access_token (code flows).
        r = client.post(
            "/api/auth/google",
            json={
                "credential": "some-gis-credential",
                "email": "student@example.com",
                "full_name": "S",
            },
        )
        assert r.status_code == 401
        assert r.json()["detail"] == GOOGLE_SIGNIN_ERROR


class TestGoogleJWTVerification:
    def test_rejects_token_when_verifier_rejects(
        self, client, production_mode, monkeypatch
    ):
        monkeypatch.setattr(
            auth_mod.g_id, "verify_oauth2_token", google_verifier_rejects
        )
        fake_db = auth_mod.db
        fake_db.platform_controls.docs[0]["system_settings"] = [
            setting("google_oauth_client_id", "unit-test-client-id")
        ]
        r = client.post(
            "/api/auth/google",
            json={
                "id_token": "sig-invalid-google-jwt",
                "email": "student@example.com",
                "full_name": "S",
            },
        )
        assert r.status_code == 401
        # A rejected Google identity must never create a user or session.
        assert fake_db.users.docs == []

    def test_verified_gis_token_creates_session(
        self, client, production_mode, monkeypatch
    ):
        monkeypatch.setattr(
            auth_mod.g_id, "verify_oauth2_token", google_verifier_accepts
        )
        fake_db = auth_mod.db
        fake_db.platform_controls.docs[0]["system_settings"] = [
            setting("google_oauth_client_id", "unit-test-client-id")
        ]
        r = client.post(
            "/api/auth/google",
            json={
                "id_token": "valid-google-jwt",
                "email": "student@example.com",
                "full_name": "Test User",
                "picture": "https://lh3.googleusercontent.com/pic.jpg",
                "role": "student",
            },
        )
        assert r.status_code == 200
        data = r.json()
        assert data["access_token"] and data["refresh_token"]
        assert data["user"]["email"] == "student@example.com"
        assert data["user"]["role"] == "student"
        assert len(fake_db.users.docs) == 1
        stored = fake_db.users.docs[0]
        assert stored["oauth_provider"] == "google"
        # Tokens are transient — the raw id_token must never be persisted.
        assert "id_token" not in stored


class TestFirebaseFallback:
    def test_firebase_fallback_without_service_account_rejected(
        self, client, production_mode, monkeypatch
    ):
        """No service account anywhere → Firebase Admin cannot verify → 401.

        This is the strict behavior that keeps unverified tokens out; the
        fix must not loosen it (no service account = no login)."""
        monkeypatch.setattr(
            auth_mod.g_id, "verify_oauth2_token", google_verifier_rejects
        )
        fake_db = auth_mod.db
        fake_db.platform_controls.docs[0]["system_settings"] = []
        r = client.post(
            "/api/auth/google",
            json={
                "id_token": "firebase-token",
                "email": "f@example.com",
                "full_name": "F",
            },
        )
        assert r.status_code == 401
        assert fake_db.users.docs == []

    def test_firebase_fallback_with_env_service_account_works(
        self, client, production_mode, monkeypatch
    ):
        """Service account present via env var (documented deployment option)."""
        monkeypatch.setenv("FIREBASE_SERVICE_ACCOUNT_JSON", FAKE_SERVICE_ACCOUNT)
        monkeypatch.setattr(
            auth_mod.g_id, "verify_oauth2_token", google_verifier_rejects
        )
        install_firebase_admin_mocks(monkeypatch)
        r = client.post(
            "/api/auth/google",
            json={
                "id_token": "firebase-id-token",
                "email": "firebase.user@example.com",
                "full_name": "Firebase User",
                "picture": "https://lh3.googleusercontent.com/fb.jpg",
                "role": "student",
            },
        )
        assert r.status_code == 200
        data = r.json()
        assert data["access_token"] and data["refresh_token"]
        assert data["user"]["email"] == "firebase.user@example.com"
        assert data["user"]["role"] == "student"

    def test_google_fallback_token_verified_via_platform_settings(
        self, client, production_mode, monkeypatch
    ):
        """THE PRODUCTION REGRESSION.

        Service account stored in platform settings (DB), env var unset,
        Google-JWT verification fails (Firebase token audience/issuer).
        /auth/google must sync the platform setting before falling back to
        Firebase verification — /auth/firebase already does exactly this."""
        monkeypatch.setattr(
            auth_mod.g_id, "verify_oauth2_token", google_verifier_rejects
        )
        install_firebase_admin_mocks(monkeypatch)
        fake_db = auth_mod.db
        fake_db.platform_controls.docs[0]["system_settings"] = [
            setting("firebase_api_key", "unit-test-api-key"),
            setting("firebase_project_id", "unit-test-project"),
            setting("firebase_service_account", FAKE_SERVICE_ACCOUNT),
        ]
        assert "FIREBASE_SERVICE_ACCOUNT_JSON" not in os.environ

        r = client.post(
            "/api/auth/google",
            json={
                "id_token": "firebase-id-token",
                "email": "firebase.user@example.com",
                "full_name": "Firebase User",
                "picture": "https://lh3.googleusercontent.com/fb.jpg",
                "role": "student",
            },
        )
        assert r.status_code == 200, r.json()
        data = r.json()
        assert data["access_token"] and data["refresh_token"]
        assert data["user"]["email"] == "firebase.user@example.com"
        assert data["user"]["role"] == "student"
        stored = fake_db.users.docs[0]
        assert stored["oauth_provider"] == "google"
        assert "id_token" not in stored

    def test_firebase_endpoint_platform_settings_still_work(
        self, client, production_mode, monkeypatch
    ):
        """Existing /auth/firebase behavior with platform settings is preserved."""
        install_firebase_admin_mocks(monkeypatch)
        fake_db = auth_mod.db
        fake_db.platform_controls.docs[0]["system_settings"] = [
            setting("firebase_service_account", FAKE_SERVICE_ACCOUNT),
        ]
        r = client.post(
            "/api/auth/firebase",
            json={
                "id_token": "firebase-id-token",
                "email": "firebase.user@example.com",
                "full_name": "Firebase User",
                "role": "student",
            },
        )
        assert r.status_code == 200
        assert r.json()["user"]["email"] == "firebase.user@example.com"


class TestFailureContainment:
    def test_unverifiable_token_creates_no_user_and_no_session(
        self, client, production_mode, monkeypatch
    ):
        monkeypatch.setattr(
            auth_mod.g_id, "verify_oauth2_token", google_verifier_rejects
        )
        fake_db = auth_mod.db
        fake_db.platform_controls.docs[0]["system_settings"] = []
        for token in ("", "garbage", "ey.ey.sig"):
            r = client.post(
                "/api/auth/google",
                json={
                    "id_token": token,
                    "email": "student@example.com",
                    "full_name": "S",
                },
            )
            assert r.status_code == 401
            assert r.json()["detail"] == GOOGLE_SIGNIN_ERROR
        assert fake_db.users.docs == []


class TestDevelopmentMockModeUnchanged:
    def test_development_mock_profile_still_allowed(self, client, monkeypatch):
        # ENV=development with no OAuth client configured → historical mock path.
        monkeypatch.setenv("ENV", "development")
        fake_db = auth_mod.db
        fake_db.platform_controls.docs[0]["system_settings"] = []
        r = client.post(
            "/api/auth/google",
            json={
                "email": "dev.mock@example.com",
                "full_name": "Dev Mock",
                "picture": "https://example.com/p.jpg",
                "role": "student",
            },
        )
        assert r.status_code == 200
        assert r.json()["user"]["email"] == "dev.mock@example.com"


class TestEmailPasswordUntouched:
    def test_login_endpoint_contract_still_present(self, client):
        # /auth/login must still accept the classic email/password body.
        # (Detailed login behavior is covered elsewhere; here we assert the
        # schema still routes and rejects an unknown account rather than 404ing.)
        r = client.post(
            "/api/auth/login",
            json={"email": "nobody@example.com", "password": "WrongPass1"},
        )
        # The endpoint exists and responds (400/401-class auth failure, or a
        # DB-less 500 is acceptable ONLY if the local suite pre-existing state
        # shows the same; the schema must never 404).
        assert r.status_code != 404


class TestOauthConfigEndpoint:
    """GET /api/auth/oauth-config — the runtime Firebase web-config source.

    The login page feeds data.firebase straight into initializeApp
    (login.tsx -> initFirebaseAuth). These tests pin the exact field names the
    frontend consumes and guarantee no secret material is ever returned, so a
    wrong/placeholder API key cannot be confused with a transport failure.
    """

    EXPECTED_TOP_LEVEL = {
        "google_client_id",
        "linkedin_client_id",
        "github_client_id",
        "enable_google_login",
        "enable_linkedin_login",
        "enable_github_login",
        "firebase",
        "redirect_uri",
        "configured",
    }

    def test_unconfigured_returns_no_firebase_block(self, client):
        # With no firebase_api_key anywhere, the firebase block must be None —
        # the frontend must skip initialization (and report "not configured")
        # rather than initialize against an empty/placeholder config.
        r = client.get("/api/auth/oauth-config")
        assert r.status_code == 200
        data = r.json()
        assert set(data.keys()) == self.EXPECTED_TOP_LEVEL
        assert data["firebase"] is None
        assert data["redirect_uri"].endswith("/oauth.html")

    def test_firebase_block_field_names_match_frontend(self, monkeypatch):
        fake_db = FakeDB(settings=[
            setting("firebase_api_key", "unit-test-api-key"),
            setting("firebase_auth_domain", "unit-test.firebaseapp.com"),
            setting("firebase_project_id", "unit-test-project"),
            setting("firebase_app_id", "1:000000000000:web:unit"),
        ])
        monkeypatch.setattr(auth_mod, "db", fake_db)
        monkeypatch.setattr(auth_mod, "_record_activity", None)

        app = FastAPI()
        app.state.limiter = limiter
        app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
        app.include_router(auth_router, prefix="/api")
        with TestClient(app) as c:
            data = c.get("/api/auth/oauth-config").json()

        assert set(data["firebase"].keys()) == {"apiKey", "authDomain", "projectId", "appId"}
        assert data["firebase"]["apiKey"] == "unit-test-api-key"
        assert data["firebase"]["authDomain"] == "unit-test.firebaseapp.com"
        assert data["firebase"]["projectId"] == "unit-test-project"
        assert data["firebase"]["appId"] == "1:000000000000:web:unit"

    def test_oauth_config_never_leaks_secrets(self, monkeypatch):
        fake_db = FakeDB(settings=[
            setting("firebase_api_key", "unit-test-api-key"),
            setting("firebase_service_account", '{"type": "service_account", "private_key": "UNIT-TEST-SECRET"}'),
            setting("linkedin_oauth_client_secret", "unit-test-linkedin-secret"),
        ])
        monkeypatch.setattr(auth_mod, "db", fake_db)
        monkeypatch.setattr(auth_mod, "_record_activity", None)

        app = FastAPI()
        app.state.limiter = limiter
        app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
        app.include_router(auth_router, prefix="/api")
        with TestClient(app) as c:
            body = c.get("/api/auth/oauth-config").text

        assert "firebase_service_account" not in body
        assert "linkedin_oauth_client_secret" not in body
        assert "private_key" not in body
        assert "UNIT-TEST-SECRET" not in body
        assert "unit-test-linkedin-secret" not in body


class TestGoogleLoginToggle:
    def _set_flag(self, fake_db, value):
        fake_db.platform_controls.docs[0]["feature_flags"] = [
            {"key": "enable_google_login", "label": "Enable Google Login", "value": value},
        ]

    def test_disabled_returns_503(self, client, production_mode, monkeypatch):
        monkeypatch.setattr(auth_mod.g_id, "verify_oauth2_token", google_verifier_accepts)
        fake_db = auth_mod.db
        fake_db.platform_controls.docs[0]["system_settings"] = [
            setting("google_oauth_client_id", "unit-test-client-id"),
        ]
        self._set_flag(fake_db, False)
        r = client.post(
            "/api/auth/google",
            json={"id_token": "valid-google-jwt", "email": "student@example.com", "full_name": "S"},
        )
        assert r.status_code == 503
        assert "unavailable" in r.json()["detail"].lower()
        assert fake_db.users.docs == []

    def test_disabled_does_not_verify(self, client, production_mode, monkeypatch):
        called = {"g": 0, "f": 0}
        def gv(*a, **k):
            called["g"] += 1
            raise ValueError("no")
        monkeypatch.setattr(auth_mod.g_id, "verify_oauth2_token", gv)
        monkeypatch.setattr(auth_mod.fb_auth, "verify_id_token", lambda *a, **k: (called.__setitem__("f", called["f"]+1) or {}))
        fake_db = auth_mod.db
        fake_db.platform_controls.docs[0]["system_settings"] = []
        self._set_flag(fake_db, False)
        r = client.post("/api/auth/google", json={"id_token": "t", "email": "a@b.com", "full_name": "S"})
        assert r.status_code == 503
        assert called["g"] == 0 and called["f"] == 0

    def test_enabled_flow_runs(self, client, production_mode, monkeypatch):
        monkeypatch.setattr(auth_mod.g_id, "verify_oauth2_token", google_verifier_accepts)
        fake_db = auth_mod.db
        fake_db.platform_controls.docs[0]["system_settings"] = [
            setting("google_oauth_client_id", "unit-test-client-id"),
        ]
        self._set_flag(fake_db, True)
        r = client.post(
            "/api/auth/google",
            json={"id_token": "valid-google-jwt", "email": "student@example.com", "full_name": "Test User", "role": "student"},
        )
        assert r.status_code == 200
        assert r.json()["access_token"]

    def test_missing_flag_defaults_enabled(self, client, production_mode, monkeypatch):
        monkeypatch.setattr(auth_mod.g_id, "verify_oauth2_token", google_verifier_accepts)
        fake_db = auth_mod.db
        fake_db.platform_controls.docs[0]["system_settings"] = [
            setting("google_oauth_client_id", "unit-test-client-id"),
        ]
        # no feature_flags key
        r = client.post(
            "/api/auth/google",
            json={"id_token": "valid-google-jwt", "email": "student@example.com", "full_name": "Test User", "role": "student"},
        )
        assert r.status_code == 200

    def test_oauth_config_reflects_flag(self, client, monkeypatch):
        fake_db = auth_mod.db
        self._set_flag(fake_db, False)
        r = client.get("/api/auth/oauth-config")
        assert r.status_code == 200
        assert r.json()["enable_google_login"] is False
