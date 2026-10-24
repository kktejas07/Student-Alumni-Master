# Authentication & Authorization Test Suite — Student Alumni

This directory contains the automated test suite verifying authentication, session persistence, role-based access control (RBAC), multi-tenant isolation, and onboarding enforcement across the Student Alumni Master application.

---

## 1. Directory Structure

```
tests/authentication/
├── run_audit_suite.py          # Standalone Python Playwright + Requests test runner
├── auth_audit.spec.ts          # Playwright TypeScript test specification
└── README.md                   # Setup, execution, and environment documentation
```

---

## 2. Test Accounts & Credentials

The suite utilizes dedicated disposable test accounts configured in the local MongoDB database:

| Role | Email | Password | Intended Portal |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@studentalumni.ai` | `admin123` | `/super-admin` |
| **Student** | `test_student_audit@example.com` | `Password123!` | `/student-portal/dashboard` |
| **Alumni** | `test_alumni_audit@example.com` | `Password123!` | `/alumni-portal` |
| **Mentor** | `test_mentor_audit@example.com` | `Password123!` | `/mentor-portal` |

---

## 3. Environment Variables Configuration

The following environment variables can be configured to point to alternative testing environments:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `FRONTEND_URL` / `TEST_FRONTEND_URL` | `http://localhost:8081` | Base URL of the running Expo Web frontend |
| `BACKEND_URL` / `TEST_API_URL` | `http://localhost:8000` | Base URL of the FastAPI backend service |
| `TEST_STUDENT_EMAIL` | `test_student_audit@example.com` | Test student account email |
| `TEST_STUDENT_PASSWORD` | `Password123!` | Test student account password |
| `AUDIT_HEADLESS` | `true` | Set to `false` to observe the browser execution |

---

## 4. Execution Instructions

### Option A: Python Standalone Runner (Recommended for Local Windows)
The Python runner executes all **29 API and Playwright browser tests**, saves detailed results to JSON, and takes visual evidence screenshots:

```powershell
# From repository root:
& "backend\venv\Scripts\python.exe" tests\authentication\run_audit_suite.py
```

### Option B: Playwright TypeScript Runner
To execute the browser suite using standard Playwright CLI:

```bash
# Run headless
npx playwright test tests/authentication/auth_audit.spec.ts

# Run with UI mode
npx playwright test tests/authentication/auth_audit.spec.ts --ui
```

---

## 5. Evidence & Test Results

- **Visual Evidence Screenshots:** Stored in `docs/evidence/screenshots/`
  - `TC-UI-01_login_page_with_password.png`
  - `TC-UI-02_empty_fields_validation.png`
  - `TC-UI-03_invalid_password_error.png`
  - `TC-UI-04_anonymous_student_guard.png`
  - `TC-UI-05_anonymous_superadmin_guard.png`
  - `TC-UI-07_student_logged_in.png`
  - `TC-UI-09_student_blocked_from_superadmin.png`
  - `TC-UI-10_logout_and_back_button.png`
- **JSON Test Results Ledger:** Stored in `docs/evidence/audit_test_results.json`
- **Full Security Audit Report:** [`docs/AUTHENTICATION-AUDIT-REPORT.md`](../../docs/AUTHENTICATION-AUDIT-REPORT.md)
- **Role & Authorization Matrix:** [`docs/AUTHORIZATION-MATRIX.md`](../../docs/AUTHORIZATION-MATRIX.md)
