"""
test_phase3_permissions.py — Unit tests for the Phase 3 permission system.

Tests:
  - core.roles.has_permission() — admin bypass, SYSTEM_ROLES fast path, unknown role
  - core.roles.Role constants — completeness
  - core.roles.Perm constants — all permissions defined
  - core.deps.require_role() — correct role passes, wrong role raises 403
  - core.deps.require_permission() — admin passes all, role-gated permission pass/fail
  - SYSTEM_ROLES coverage — all built-in roles have expected permissions

No live MongoDB connection required — DB calls are mocked.
"""
from __future__ import annotations

import sys
import pytest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

# Ensure backend is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.roles import Role, Perm, SYSTEM_ROLES, has_permission, get_role
from fastapi import HTTPException


# ════════════════════════════════════════════════════════════════════════════
# 1. Role constants
# ════════════════════════════════════════════════════════════════════════════

def test_role_constants_defined():
    assert Role.STUDENT  == "student"
    assert Role.ALUMNI   == "alumni"
    assert Role.MENTOR   == "mentor"
    assert Role.COLLEGE  == "college"
    assert Role.ADMIN    == "admin"
    assert Role.SUPPORT  == "support"


def test_role_all_set_complete():
    """Role.ALL must contain every named role."""
    for r in (Role.STUDENT, Role.ALUMNI, Role.MENTOR, Role.COLLEGE,
              Role.COLLEGE_ADMIN, Role.ADMIN, Role.SUPPORT):
        assert r in Role.ALL


# ════════════════════════════════════════════════════════════════════════════
# 2. Perm constants
# ════════════════════════════════════════════════════════════════════════════

def test_perm_constants_all_in_perm_all():
    """Every Perm.* attribute must appear in Perm.ALL."""
    public_perms = {
        v for k, v in vars(Perm).items()
        if not k.startswith("_") and isinstance(v, str)
    }
    assert public_perms.issubset(Perm.ALL), (
        f"These permissions are not in Perm.ALL: {public_perms - Perm.ALL}"
    )


def test_perm_groups_cover_all():
    """Every permission in Perm.ALL must appear in exactly one Perm.GROUPS entry."""
    grouped = {p for perms in Perm.GROUPS.values() for p in perms}
    assert grouped == Perm.ALL


# ════════════════════════════════════════════════════════════════════════════
# 3. SYSTEM_ROLES structure
# ════════════════════════════════════════════════════════════════════════════

def test_system_roles_have_required_keys():
    required = {"key", "name", "description", "permissions"}
    for role_def in SYSTEM_ROLES:
        assert required.issubset(role_def.keys()), (
            f"Role '{role_def.get('key')}' missing keys: {required - role_def.keys()}"
        )


def test_system_roles_permissions_are_valid_perm_strings():
    """All permissions in SYSTEM_ROLES must be valid Perm.* constants."""
    for role_def in SYSTEM_ROLES:
        for perm in role_def["permissions"]:
            assert perm in Perm.ALL, (
                f"Role '{role_def['key']}' has unknown permission '{perm}'"
            )


def test_super_admin_has_all_permissions():
    sa = next(r for r in SYSTEM_ROLES if r["key"] == "super_admin")
    assert set(sa["permissions"]) == Perm.ALL


def test_college_admin_role_exists():
    keys = [r["key"] for r in SYSTEM_ROLES]
    assert "college_admin" in keys


def test_mentor_role_can_create_events():
    mentor = next(r for r in SYSTEM_ROLES if r["key"] == "mentor")
    assert Perm.EVENTS_CREATE in mentor["permissions"]


def test_support_role_is_read_only():
    """Support should have view permissions but no delete/edit/manage."""
    support = next(r for r in SYSTEM_ROLES if r["key"] == "support")
    destructive = {Perm.USERS_DELETE, Perm.PAYMENTS_REFUND, Perm.SETTINGS_MANAGE,
                   Perm.ROLES_MANAGE, Perm.COLLEGES_MANAGE}
    overlap = destructive & set(support["permissions"])
    assert not overlap, f"Support role has destructive permissions: {overlap}"


# ════════════════════════════════════════════════════════════════════════════
# 4. get_role() helper
# ════════════════════════════════════════════════════════════════════════════

def test_get_role_returns_lowercase():
    assert get_role({"role": "Admin"}) == "admin"
    assert get_role({"role": "MENTOR"}) == "mentor"


def test_get_role_defaults_to_student():
    assert get_role({}) == "student"
    assert get_role({"role": None}) == "student"
    assert get_role({"role": ""}) == "student"


# ════════════════════════════════════════════════════════════════════════════
# 5. has_permission() — async, mocked DB
# ════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_admin_always_has_any_permission():
    """Admins bypass all checks — no DB hit needed."""
    user = {"role": "admin"}
    for perm in Perm.ALL:
        assert await has_permission(user, perm) is True


@pytest.mark.asyncio
async def test_mentor_has_events_create():
    user = {"role": "mentor"}
    assert await has_permission(user, Perm.EVENTS_CREATE) is True


@pytest.mark.asyncio
async def test_mentor_does_not_have_colleges_manage():
    user = {"role": "mentor"}
    assert await has_permission(user, Perm.COLLEGES_MANAGE) is False


@pytest.mark.asyncio
async def test_college_admin_has_users_view():
    user = {"role": "college_admin"}
    assert await has_permission(user, Perm.USERS_VIEW) is True


@pytest.mark.asyncio
async def test_college_admin_does_not_have_roles_manage():
    user = {"role": "college_admin"}
    assert await has_permission(user, Perm.ROLES_MANAGE) is False


@pytest.mark.asyncio
async def test_support_has_analytics_view():
    user = {"role": "support"}
    assert await has_permission(user, Perm.ANALYTICS_VIEW) is True


@pytest.mark.asyncio
async def test_support_does_not_have_colleges_manage():
    user = {"role": "support"}
    assert await has_permission(user, Perm.COLLEGES_MANAGE) is False


@pytest.mark.asyncio
async def test_unknown_role_hits_db_and_returns_false_on_miss():
    """A role not in SYSTEM_ROLES falls back to DB; if not found there either, returns False."""
    user = {"role": "custom_role_xyz"}
    mock_db = MagicMock()
    mock_db.admin_roles.find_one = AsyncMock(return_value=None)  # not in DB
    with patch("core.roles._db", mock_db):
        result = await has_permission(user, Perm.ANALYTICS_VIEW)
    assert result is False
    mock_db.admin_roles.find_one.assert_awaited_once_with({"key": "custom_role_xyz"})


@pytest.mark.asyncio
async def test_custom_role_in_db_with_permission():
    """A custom role stored in DB is checked correctly."""
    user = {"role": "custom_manager"}
    mock_db = MagicMock()
    mock_db.admin_roles.find_one = AsyncMock(return_value={
        "key": "custom_manager",
        "permissions": [Perm.ANALYTICS_VIEW, Perm.USERS_VIEW],
    })
    with patch("core.roles._db", mock_db):
        assert await has_permission(user, Perm.ANALYTICS_VIEW) is True
        assert await has_permission(user, Perm.ROLES_MANAGE) is False


@pytest.mark.asyncio
async def test_has_permission_never_raises_on_db_error():
    """If DB lookup throws, has_permission() must return False (never crash a route)."""
    user = {"role": "some_broken_role"}
    mock_db = MagicMock()
    mock_db.admin_roles.find_one = AsyncMock(side_effect=Exception("DB down"))
    with patch("core.roles._db", mock_db):
        result = await has_permission(user, Perm.ANALYTICS_VIEW)
    assert result is False  # safe fallback


# ════════════════════════════════════════════════════════════════════════════
# 6. require_role() dependency factory
# ════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_require_role_passes_for_correct_role():
    """require_role('admin') must return user dict when role matches."""
    from core.deps import require_role
    dep = require_role("admin")
    user = {"role": "admin", "email": "admin@test.com"}
    result = await dep(user=user)
    assert result == user


@pytest.mark.asyncio
async def test_require_role_raises_403_for_wrong_role():
    from core.deps import require_role
    dep = require_role("admin")
    user = {"role": "student", "email": "stu@test.com"}
    with pytest.raises(HTTPException) as exc_info:
        await dep(user=user)
    assert exc_info.value.status_code == 403
    assert "admin" in exc_info.value.detail
    assert "student" in exc_info.value.detail


@pytest.mark.asyncio
async def test_require_role_accepts_any_of_multiple_roles():
    from core.deps import require_role
    dep = require_role("college", "admin")
    college_user = {"role": "college"}
    admin_user = {"role": "admin"}
    student_user = {"role": "student"}
    assert (await dep(user=college_user)) == college_user
    assert (await dep(user=admin_user)) == admin_user
    with pytest.raises(HTTPException) as exc_info:
        await dep(user=student_user)
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_require_role_handles_missing_role_key():
    """User dict missing 'role' key should raise 403, not KeyError."""
    from core.deps import require_role
    dep = require_role("admin")
    user = {"email": "norole@test.com"}  # no 'role' key
    with pytest.raises(HTTPException) as exc_info:
        await dep(user=user)
    assert exc_info.value.status_code == 403


# ════════════════════════════════════════════════════════════════════════════
# 7. require_permission() dependency factory
# ════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_require_permission_admin_always_passes():
    """Admin must pass ALL permission checks without DB hit."""
    from core.deps import require_permission
    dep = require_permission(Perm.ROLES_MANAGE)
    user = {"role": "admin"}
    result = await dep(user=user)
    assert result == user


@pytest.mark.asyncio
async def test_require_permission_mentor_passes_events_create():
    """Mentor has events.create in SYSTEM_ROLES — should pass."""
    from core.deps import require_permission
    dep = require_permission(Perm.EVENTS_CREATE)
    user = {"role": "mentor"}
    result = await dep(user=user)
    assert result == user


@pytest.mark.asyncio
async def test_require_permission_mentor_denied_colleges_manage():
    """Mentor does not have colleges.manage — must raise 403."""
    from core.deps import require_permission
    dep = require_permission(Perm.COLLEGES_MANAGE)
    user = {"role": "mentor"}
    with pytest.raises(HTTPException) as exc_info:
        await dep(user=user)
    assert exc_info.value.status_code == 403
    assert "colleges.manage" in exc_info.value.detail
    assert "mentor" in exc_info.value.detail


@pytest.mark.asyncio
async def test_require_permission_student_denied_analytics():
    """Student role is not in SYSTEM_ROLES at all — should be denied analytics.view."""
    from core.deps import require_permission
    mock_db = MagicMock()
    mock_db.admin_roles.find_one = AsyncMock(return_value=None)
    with patch("core.roles._db", mock_db):
        dep = require_permission(Perm.ANALYTICS_VIEW)
        user = {"role": "student"}
        with pytest.raises(HTTPException) as exc_info:
            await dep(user=user)
        assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_require_permission_error_message_is_informative():
    """403 detail must include the permission name and the user's role."""
    from core.deps import require_permission
    dep = require_permission(Perm.PAYMENTS_REFUND)
    user = {"role": "mentor"}
    with pytest.raises(HTTPException) as exc_info:
        await dep(user=user)
    detail = exc_info.value.detail
    assert Perm.PAYMENTS_REFUND in detail
    assert "mentor" in detail


# ════════════════════════════════════════════════════════════════════════════
# 8. Integration — mentors.approve permission maps to SYSTEM_ROLES admin only
# ════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_mentors_approve_perm_only_for_admin():
    """mentors.approve is used on /admin/mentors/* routes.
    Only admin should have it; no built-in non-admin role should."""
    perm = Perm.MENTORS_APPROVE

    # Admin always passes
    assert await has_permission({"role": "admin"}, perm) is True

    # Mentor, college_admin, support — none should have mentors.approve
    for role_key in ("mentor", "college_admin", "support"):
        role_def = next((r for r in SYSTEM_ROLES if r["key"] == role_key), None)
        if role_def:
            assert perm not in role_def["permissions"], (
                f"Role '{role_key}' unexpectedly has permission '{perm}'"
            )
