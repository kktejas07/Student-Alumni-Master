# ═══════════════════════════════════════════════════════════════════════
# Role & Permission System — Complete Audit Report
# ═══════════════════════════════════════════════════════════════════════
# Student Alumni Platform
# Date: May 2026
# ═══════════════════════════════════════════════════════════════════════

---

## 1. CURRENT ROLE ARCHITECTURE

### 1.1 Roles Used in the Platform

| Role Key | Display Label | Database Field | User Count (typical) |
|----------|--------------|----------------|---------------------|
| `student` | Student | `role: "student"` | Bulk of users |
| `alumni` | Alumni | `role: "alumni"` | Graduated students |
| `mentor` | Mentor | `role: "mentor"` | Mentors |
| `college` | College | `role: "college"` | Institution accounts |
| `admin` | Super Admin / Admin | `role: "admin"` + `is_super_admin: true/false` | Platform admins |
| `college_admin` | College Admin | `role` NOT used in DB — only in roles collection | (not assigned to users) |
| `support` | Support Agent | `role` NOT used in DB — only in roles collection | (not assigned to users) |
| `super_admin` *(legacy)* | — | Migrated to `admin` + `is_super_admin: true` | (no longer in DB) |

### 1.2 How Users are Categorized

Each user has **two fields** in MongoDB that determine their access:

```json
{
  "role": "admin",
  "is_super_admin": true,    // Only set for the platform owner
  "permissions": []           // NOT used — display only in admin UI
}
```

- `role` — determines portal routing, feature access, and backend authorization
- `is_super_admin` — **display only**, NOT used for access control
- `permissions` — **not enforced** anywhere, only shown in admin role editor UI

---

## 2. HOW THE PLATFORM WORKS (User Journey)

### 2.1 Registration → Role Selection

```
User signs up → Selects role (student/alumni/mentor/college)
              → Role stored in DB user document
              → Redirected to role-specific onboarding flow
              → Onboarding completes → User assigned to portal
```

### 2.2 Portal Access by Role

| Role | Portal URL | Dashboard Features |
|------|-----------|-------------------|
| `student` | `/student-portal` | Courses, Events, Internships, Network, Wallet, Career AI |
| `alumni` | `/alumni-portal` | Events, Network, Mentoring, Profile, Wallet |
| `mentor` | `/mentor-portal` | Sessions, Availability, Earnings, AI Studio, Events |
| `college` | `/college-portal` | Students, Analytics, Placements, Announcements, Events |
| `admin` | `/super-admin` | All data CRUD, Settings, Approvals, Analytics, AI Insights |

### 2.3 Backend Authorization Model

The backend uses **role-based string checks** scattered across ~50+ locations:

```python
# Pattern 1: Direct role check in endpoint
if user.get("role") != "admin":
    raise HTTPException(403, "Admin only")

# Pattern 2: _require_admin() helper (4 different implementations)
user = await _require_admin(authorization)
```

---

## 3. PERMISSION SYSTEM (Admin Settings UI)

### 3.1 Available Permissions (16 total)

```
USERS:    view, edit, delete, export
COLLEGES: view, manage
MENTORS:  approve
EVENTS:   create, delete
PAYMENTS: view, refund
ANALYTICS: view
SETTINGS: manage, roles.manage, marketplace.install
AI:       run
```

### 3.2 System Roles (4 built-in)

```
SUPER ADMIN    → All 16 permissions
COLLEGE ADMIN  → users.view, users.edit, colleges.view, events.create, events.delete, analytics.view
MENTOR (role)  → users.view, events.create, analytics.view
SUPPORT AGENT  → users.view, payments.view, analytics.view
```

### 3.3 ⚠️ CRITICAL: Permissions are NOT enforced

The permission system is **only for display** in the admin UI. No backend endpoint actually checks:

```python
# This does NOT exist anywhere in the codebase:
if not user_has_permission(user, "users.delete"):
    raise HTTPException(403, "Permission denied")
```

All access control is done via `role == "admin"` checks.

---

## 4. IDENTIFIED GAPS & FLAWS

### 🔴 CRITICAL

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| C1 | **Permissions not enforced** — `PERMISSIONS_CATALOG` and role->permission mappings are display-only. No code checks `has_permission()`. | Every backend endpoint | Any admin can do anything — no true access control |
| C2 | **`is_super_admin` is decorative** — Set on users but never checked for authorization. Only changes display label. | 4 display locations vs 0 enforcement locations | Platform owner has same access as any admin |
| C3 | **Self-import bug** — `from admin_settings import DEFAULT_SYSTEM_ROLES` would crash at runtime | `admin_settings.py:662` | `GET /admin/roles/{role_id}` would fail with ImportError |
| C4 | **4 different `_require_admin()` implementations** — Slightly different error messages, same logic | `admin_settings.py:55`, `server.py:2880`, `admin_imports.py:83`, `admin_colleges.py:79` | Maintenance nightmare, inconsistent error messages |

### 🟡 HIGH

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| H1 | **Role strings hardcoded ~70+ times** — No constants/enums used | Across backend + frontend | Adding a new role requires touching 70+ locations |
| H2 | **`college_admin` and `support` roles are dead code** — Defined in `SYSTEM_ROLES` and stored in DB, but never checked in any gate | `admin_settings.py:86-91` | Confusion — roles exist but do nothing |
| H3 | **Frontend `PORTAL_ACCENTS` missing `mentor`** | `nexus.ts:71` | Mentor portal would fall back to undefined color/lookup |
| H4 | **No seed data populates `admin_roles` collection** | No setup script | Roles are lazily inserted on first GET request |

### 🟢 MEDIUM

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| M1 | **`students` (typo) vs `student` (correct) reference** | `server.py:2180` | Potential lookup miss |
| M2 | **Fallback `role: 'student'` in `useCurrentUser.ts`** | `useCurrentUser.ts:16` | New/unrecognized roles mapped to student |
| M3 | **`_student_status_label()` named misleadingly** — handles ALL roles, not just students | `server.py:1278` | Code clarity |
| M4 | **Cascading fallbacks for role_label** — 3 levels of fallback in one expression | `admin_settings.py:612` | Hard to trace which value is shown |

---

## 5. HARDCODED VALUES THAT SHOULD BE DYNAMIC

| What | Where | Why it's wrong |
|------|-------|----------------|
| `"admin"` string ~30+ times | `server.py`, `admin_*.py` | Should import from `core.roles` constants |
| `"student"` string ~15+ times | `server.py` | Same — should use constants |
| `"mentor"` string ~20+ times | `server.py`, `events_aggregator.py` | Same |
| `ROLE_LABELS` dict (duplicated) | `server.py:1396`, `admin_settings.py:607,1457` | Defined 3 times in backend |
| `ROLE_GRADIENTS` dict | `frontend/.../tokens.ts:56` | Should come from theme/tokens |
| `_student_status_label()` colors | `server.py:1281-1312` | Hardcoded hex colors per role |
| `generate_unique_id()` role_codes | `server.py:599` | Hardcoded prefix mapping |
| `FRONTEND_URL=https://studentalumni.ai` | `.env` + fallbacks | Already fixed for QR, but verify endpoint fallback |

---

## 6. RECOMMENDED FIXES (Priority Order)

### 🔴 Fix Immediately

1. **Fix the self-import bug** (`admin_settings.py:662`):
   ```python
   # Change from:
   from admin_settings import DEFAULT_SYSTEM_ROLES
   # Change to:
   DEFAULT_SYSTEM_ROLES = SYSTEM_ROLES
   ```

2. **Unify `_require_admin()` into one function** in `core/deps.py`:
   - Remove the 4 duplicate implementations
   - Import from a single location

3. **Create and use role constants** — already started with `backend/core/roles.py`

### 🟡 Fix Soon

4. **Wire permissions to access control** — Add `has_permission()` checks to critical endpoints
5. **Use `is_super_admin` for meaningful gating** — Restrict sensitive operations (settings, roles, marketplace) to `is_super_admin: true`
6. **Clean up `college_admin` and `support`** — Either implement proper gating or remove from system roles
7. **Fix `PORTAL_ACCENTS` missing `mentor`** in `nexus.ts`

### 🟢 Fix When Convenient

8. **Consolidate `ROLE_LABELS`** — Use `core/roles.py` instead of 3 duplicate dicts
9. **Rename `_student_status_label()`** to `_user_status_label()`
10. **Use `core/roles.py` constants** across all role checks

---

## 7. HOW TO ADD A NEW ROLE

If you want to add a new role (e.g., `"moderator"`):

### Backend:
1. Add role constant in `backend/core/roles.py`
2. Add to `Role.ALL` set
3. Add display label + color
4. Add role checks in endpoints that should gate for this role
5. Add to `UserRole` Literal type in `server.py`

### Frontend:
1. Add portal route mapping in `login.tsx`, `index.tsx`, `platform.tsx`
2. Add to `UserRole` type in `entities/index.ts`
3. Add portal component/route
4. Add to role selection UI (RoleCards.tsx, RoleTheme.tsx)
5. Add accent color in `nexus.ts`

### Database:
1. Optionally add to `SYSTEM_ROLES` in `admin_settings.py`
2. Define which permissions the role has

---

## 8. QUICK FIXES APPLIED IN THIS SESSION

| Fix | File | Status |
|-----|------|--------|
| Role value normalization (`super_admin`/`superadmin` → `admin`) | 11 files | ✅ Committed |
| Role display using `is_super_admin` boolean | `server.py`, `admin_settings.py` | ✅ Committed |
| Seed data updated with `is_super_admin: true` | `seed_mock_data.py` | ✅ Committed |
| Migration script for existing DB | `scripts/migrate_admin_roles.py` | ✅ Committed |
| Shared role constants file | `backend/core/roles.py` | ✅ Created |
| This audit report | — | ✅ Generated |

---

## 9. SELF-IMPORT BUG QUICK FIX

```python
# File: backend/admin_settings.py, line ~662
# CHANGE THIS (broken self-import):
from admin_settings import DEFAULT_SYSTEM_ROLES
# TO THIS:
DEFAULT_SYSTEM_ROLES = [
    {"key": "super_admin", ...},
    {"key": "college_admin", ...},
    {"key": "mentor", ...},
    {"key": "support", ...},
]
```

Or better yet, import from `core/roles.py`:
```python
from core.roles import SYSTEM_ROLES as DEFAULT_SYSTEM_ROLES
```
