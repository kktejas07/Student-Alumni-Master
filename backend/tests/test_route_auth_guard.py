"""
Route authorization guard.

Walks every registered FastAPI route and fails if a privileged path is
reachable without an authentication dependency. This is the regression test
for the October 2026 audit, which found 146 handlers with no auth reference,
including user purge, API-key minting and PII CSV exports.

A route counts as protected when any of these is true:
  * its dependency tree contains a known auth dependency
    (get_current_user, require_role / role_checker, require_admin, ...), or
  * the handler body itself calls an in-function auth helper
    (e.g. `await _require_admin(request)` in echo_showcase.py).

Add a path to PUBLIC_ALLOWLIST only when the endpoint is intentionally public.
"""
from __future__ import annotations

import inspect
import os
import re
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("JWT_SECRET", "test-secret-for-route-guard")
os.environ.setdefault("DB_NAME", "test_route_guard")
os.environ.setdefault("SYNC_SCHEDULER_ENABLED", "0")

from fastapi.routing import APIRoute  # noqa: E402

from server import app  # noqa: E402

# Paths that must never be anonymous. Matched as substrings of the full path.
PRIVILEGED_PATTERNS = (
    "/admin",
    "/super",
    "/agent-k/rag/documents",
    "/agent-k/rag/reindex",
    "/export-csv",
    "/export-incomplete-profiles-csv",
    "/sync-unstop",
    "/purge",
    "/api-keys",
)

# Intentionally public endpoints that happen to match a pattern above.
PUBLIC_ALLOWLIST = {
    ("POST", "/api/vendors/login"),
    ("POST", "/api/auth/login"),
    # Read-only, non-sensitive by design (banner text, template prefs, demo HTML).
    ("GET", "/api/admin/broadcast/active"),
    ("GET", "/api/echo/admin/settings"),
    ("GET", "/api/echo/admin/settings/preview/invoice/{template_id}"),
}

AUTH_DEP_NAMES = re.compile(
    r"^(get_current_user|require_role|role_checker|require_admin|require_admin_role|"
    r"require_super_admin|_require_admin|_require_vendor|require_vendor|resolve_user|"
    r"_resolve_user|get_admin|_get_admin|_current_user|current_user|get_optional_user|"
    r"verify_vendor_token|_vendor_from_token|_admin_user|admin_user|_require_role|require_auth)$"
)

# In-body auth helpers (the handler calls one of these itself).
BODY_AUTH = re.compile(
    r"\b(_require_admin|_require_super_admin|_require_role|_require_vendor|_require_auth|"
    r"_check_admin|_assert_admin|_get_current_user|get_current_user|_resolve_user|"
    r"require_admin|_admin_from_request|_vendor_from_request|_require_api_key|_verify_api_key)\s*\("
)


def _dep_callables(dependant, seen=None):
    seen = seen if seen is not None else set()
    for sub in dependant.dependencies:
        call = sub.call
        if call is not None and id(call) not in seen:
            seen.add(id(call))
            yield call
            yield from _dep_callables(sub, seen)


def _flat_routes():
    """Yield (path, methods, endpoint, dependant) for every route, flattening
    nested routers. FastAPI >= 0.13x registers included routers lazily as
    `_IncludedRouter` objects, so `app.routes` alone is not enough."""
    for route in app.routes:
        if isinstance(route, APIRoute):
            yield route.path, route.methods, route.endpoint, route.dependant
        elif hasattr(route, "effective_route_contexts"):
            for ctx in route.effective_route_contexts():
                yield ctx.path, ctx.methods, ctx.endpoint, ctx.dependant


def _is_protected(endpoint, dependant) -> bool:
    for call in _dep_callables(dependant):
        name = getattr(call, "__name__", "") or ""
        if AUTH_DEP_NAMES.match(name):
            return True
        qual = getattr(call, "__qualname__", "") or ""
        if "role_checker" in qual or "require_" in qual:
            return True
    try:
        src = inspect.getsource(endpoint)
    except (OSError, TypeError):
        src = ""
    return bool(BODY_AUTH.search(src))


def _privileged_routes():
    for path, methods, endpoint, dependant in _flat_routes():
        if not any(p in path for p in PRIVILEGED_PATTERNS):
            continue
        for method in methods or ():
            if method in ("HEAD", "OPTIONS"):
                continue
            if (method, path) in PUBLIC_ALLOWLIST:
                continue
            yield method, path, endpoint, dependant


def test_route_table_is_visible():
    """Guard against the flattening silently returning nothing."""
    total = sum(1 for _ in _flat_routes())
    privileged = sum(1 for _ in _privileged_routes())
    assert total > 500, f"only {total} routes found; route flattening is broken"
    assert privileged > 100, f"only {privileged} privileged routes found"


def test_privileged_routes_require_auth():
    offenders = []
    for method, path, endpoint, dependant in _privileged_routes():
        if not _is_protected(endpoint, dependant):
            try:
                where = f"{inspect.getsourcefile(endpoint)}:{inspect.getsourcelines(endpoint)[1]}"
            except (OSError, TypeError):
                where = "?"
            offenders.append(f"{method} {path}  ({endpoint.__name__}) {where}")
    assert not offenders, (
        "Privileged routes reachable without an auth dependency:\n  "
        + "\n  ".join(sorted(offenders))
    )


def test_no_self_service_admin_role():
    """Clients must not be able to pick admin / super_admin at signup."""
    from typing import get_args

    from core.models import SelfServiceRole

    assert set(get_args(SelfServiceRole)) == {"student", "alumni", "mentor", "college"}


@pytest.mark.parametrize("value", ["dev-only-insecure-secret-change-me"])
def test_no_hardcoded_jwt_fallbacks(value):
    backend = Path(__file__).resolve().parent.parent
    hits = []
    for p in backend.rglob("*.py"):
        if any(part in (".venv", "venv", "node_modules", "tests") for part in p.parts):
            continue
        if value in p.read_text(encoding="utf-8", errors="ignore"):
            hits.append(str(p.relative_to(backend)))
    assert not hits, f"Hardcoded JWT secret fallback still present in: {hits}"


# Endpoints that were anonymous and keyed on a caller-supplied email until the
# October 2026 "honest data" pass. They must stay behind an auth dependency.
@pytest.mark.parametrize("method,path", [
    ("POST", "/api/student/workshops/enroll"),
    ("GET", "/api/student/my-workshops"),
    ("POST", "/api/student/workshops/progress"),
    ("GET", "/api/rentals/listings"),
    ("POST", "/api/rentals/book"),
])
def test_user_scoped_routes_require_auth(method, path):
    found = False
    for p, methods, endpoint, dependant in _flat_routes():
        if p == path and method in (methods or ()):
            found = True
            assert _is_protected(endpoint, dependant), f"{method} {path} is reachable without auth"
    assert found, f"{method} {path} not registered"


def test_removed_fabricated_endpoints_stay_removed():
    """These returned invented data (hashed CGPAs, synthetic sparklines,
    donors picked by email hash) and had no callers."""
    gone = {"/api/student/intelligence", "/api/admin/super/colleges", "/api/admin/super/students",
            "/api/admin/super/mentors", "/api/admin/super/alumni"}
    present = {p for p, _m, _e, _d in _flat_routes()} & gone
    assert not present, f"fabricated endpoints re-registered: {sorted(present)}"
