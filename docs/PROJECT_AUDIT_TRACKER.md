# Project Audit Tracker

Last updated: 2026-05-16

This file tracks the full product audit requested for every frontend page, CRUD path, API integration, database persistence path, data table, and save flow. Status values: `OPEN`, `IN PROGRESS`, `FIXED`, `BLOCKED`.

## Phase Plan

1. **Phase 0 - Quality gates and safety:** remove temporary suppressions, restore strict typing where practical, make lint/typecheck meaningful, and document remaining accepted warnings.
2. **Phase 1 - API contract and persistence audit:** map every frontend mutation to a backend route and Mongo collection; fix mismatched payloads and non-persistent UI actions.
3. **Phase 2 - Admin and Super Admin CRUD:** verify users, colleges, events, imports, payments, approvals, roles, settings, integrations, security, and audit logs.
4. **Phase 3 - Auth and onboarding:** verify registration, login, OAuth, OTP, 2FA, role setup, onboarding flows, profile completion, and member ID persistence.
5. **Phase 4 - Student, alumni, mentor, and college portals:** verify dashboards, bookings, sessions, events, network, profile settings, wallet, AI tools, and notifications.
6. **Phase 5 - Marketplace and feature modules:** verify courses, jobs/internships, deals, rentals, financial services, higher education, resources, chat, rooms, and applications.

## Global Issues

| ID | Priority | Status | Area | Issue | Fix Standard |
| --- | --- | --- | --- | --- | --- |
| AUD-001 | P0 | OPEN | TypeScript | Many feature files require `// @ts-nocheck` to pass `tsc`; this hides real defects and is not production-grade. | Remove suppressions in phases, add proper shared types, and keep `npx tsc --noEmit` passing. |
| AUD-002 | P0 | OPEN | Lint | ESLint currently passes with warnings and relaxed rules for unescaped entities, undefined JSX, and duplicate keys. | Restore meaningful rules or justify scoped exceptions; no lint errors in CI. |
| AUD-003 | P0 | FIXED | API wrapper | Some frontend code passed `JSON.stringify(payload)` into `request()`, which stringifies again and can break backend parsing. | All audited `request()` callers now pass objects; wrapper owns JSON serialization. |
| AUD-004 | P0 | IN PROGRESS | API usage | Several pages use direct `fetch()` instead of the shared `request()` wrapper, bypassing auth token retry and error handling. | Route all app API calls through `request()` unless intentionally public. |
| AUD-005 | P0 | FIXED | Backend routes | Duplicate FastAPI route definitions existed for `/admin/platform-controls`, `/admin/super/events`, and `/users/me/preferences`. | Canonical handlers retained; route uniqueness check added to verification notes. |
| AUD-006 | P1 | OPEN | Persistence | Multiple UI actions optimistically update state without confirming database persistence or reload consistency. | Mutation must call backend, handle failure, and revalidate from DB. |
| AUD-007 | P1 | OPEN | Data tables | Admin tables lack consistent pagination, sorting, search debounce, empty states, bulk action feedback, and CSV/export behavior. | Use shared table conventions with server-side pagination where data can grow. |
| AUD-008 | P1 | OPEN | Audit/security | Admin destructive actions are inconsistently audit-logged. | Log actor, action, target, diff/metadata, IP/device, timestamp. |
| AUD-009 | P1 | OPEN | Errors/loading | Many pages swallow errors with empty `catch {}` and leave users without recovery. | Add visible error states, retry actions, and toast/error copy. |
| AUD-010 | P1 | OPEN | Tests | Many CRUD and save flows lack frontend tests and backend regression tests. | Add focused tests for critical API contracts and persistence. |

## Page And Feature Audit Inventory

### Auth And Onboarding

| Area | Routes | Status | Known Issues |
| --- | --- | --- | --- |
| Auth | `/(auth)/email-detect`, `email-otp`, `email-verify`, `forgot-password`, `login`, `register`, `role-setup`, `two-fa-*`, `referral-code` | OPEN | OAuth UX still mock-first; OTP/2FA persistence and session tracking need full DB verification; several warnings indicate unused paths. |
| Onboarding | `/(onboarding)/*` | OPEN | College onboarding had missing `SuggestionAutocomplete`; all role-specific onboarding payloads need DB schema verification and reload tests. |
| Member ID | `/(onboarding)/member-id`, `/id-card` | OPEN | Verify photo/QR persistence and generated ID uniqueness; avoid raw web-only `<img>` where RN image can work. |

### Admin And Super Admin

| Area | Routes | Status | Known Issues |
| --- | --- | --- | --- |
| Legacy admin | `/admin/*`, `src/views/web/admin/*` | OPEN | Several frontend endpoints appear to target routes not present in current backend or older route names. |
| Super Admin shell | `/super-admin`, `src/views/web/portals/superadmin/*` | OPEN | CRUD coverage exists for many modules, but type debt and inconsistent table/action patterns remain. |
| Super Admin settings | Platform controls, integrations, roles, notifications, security, digital ID | IN PROGRESS | OAuth credential modal fixed; duplicate backend platform-controls route removed; settings need audit log and secret masking validation. |
| Imports/users | Imports, user directory, profile editor | OPEN | Uses many DB writes; needs transaction-like consistency, duplicate handling review, and safer delete/restore semantics. |
| Colleges | Colleges table and editor | OPEN | CRUD exists; needs pagination, validation, status transitions, and audit log verification. |
| Events | Super Admin Events | IN PROGRESS | Double-stringified payloads and duplicate backend event routes fixed; pagination, validation, and audit logs still need verification. |
| Payments/approvals | Payments, approvals | OPEN | Payment actions need real state transition persistence and audit logging. |

### Portals

| Portal | Routes | Status | Known Issues |
| --- | --- | --- | --- |
| Student | `/student-portal`, tabs, dashboard, internships, bookings, wallet, events, profile settings | OPEN | Several views use mixed direct fetch/request; some dashboard widgets use static/persona data; booking/event mutations need DB reload checks. |
| Alumni | `/alumni-portal` and alumni portal views | OPEN | Shares several student components; tier/profile/wallet persistence needs verification. |
| Mentor | `/mentor-portal`, mentor profile, sessions, availability, AI studio | OPEN | Availability direct fetch may not match backend route; session creation and booking actions need DB consistency checks. |
| College | `/college-portal`, college dashboard/views/create event | OPEN | Some college views use static data; create-event fetch must use shared auth wrapper and verify collection writes. |

### Marketplaces And Feature Pages

| Feature | Routes | Status | Known Issues |
| --- | --- | --- | --- |
| Jobs/internships | `/internships`, `/explore-internships`, student internship widgets | OPEN | Save/apply endpoints exist; verify saved/applied DB state and idempotency. |
| Courses | `/courses`, `/explore-courses`, `/tracks/[slug]` | OPEN | Enrollment/progress endpoints exist; verify progress persistence and certificate creation. |
| Events | `/events`, `/event/[id]` | OPEN | Event save/RSVP APIs exist; verify cancellation and hosted/admin approval states. |
| Deals | `/deals` | OPEN | Claim endpoint exists; verify one-claim-per-user and wallet/benefit persistence. |
| Rentals | `/rentals`, `/room/[id]`, `/rooms` | OPEN | Booking endpoints exist; verify booking/cancel persistence and auth ownership checks. |
| Financial | `/financial` | OPEN | Profile/save/apply endpoints exist; verify applications/saved items persist and are user-scoped. |
| Higher education | `/higher-education`, `/applications/[id]` | OPEN | Application and document APIs exist; verify app updates and generated AI docs persist. |
| Network/chat | `/network`, `/explore-network`, `/chat`, `/rooms` | OPEN | Room/message endpoints exist; verify real-time or refresh behavior and DB persistence. |
| AI/Agent K | `/agent-k`, `/agent-k/runs`, `/career-ai` | OPEN | Agent run persistence exists; verify approvals/executions/cancellation and installed provider dependencies. |
| Static/info | `/blogs`, `/resources`, `/contact`, `/platform`, `/nexus-os`, previews/styleguide | OPEN | Identify intentionally static pages vs incomplete product surfaces. |

## Fix Log

| Date | Issue ID | Status | Notes |
| --- | --- | --- | --- |
| 2026-05-16 | Settings/OAuth | FIXED | Google/LinkedIn OAuth client ID/secret settings now render editable credential fields and save via platform controls. |
| 2026-05-16 | AUD-002 | IN PROGRESS | Lint command passes with warnings only; rule relaxations still need cleanup for industry-grade CI. |
| 2026-05-16 | AUD-001 | IN PROGRESS | Typecheck command passes; several legacy files are temporarily marked `// @ts-nocheck` and must be restored incrementally. |
| 2026-05-16 | AUD-003 | FIXED | Replaced all `request(... body: JSON.stringify(...))` calls with object bodies in course enrollment/progress/advisor and Super Admin events. |
| 2026-05-16 | AUD-005 | FIXED | Removed duplicate backend handlers for platform controls, Super Admin event create/update/delete, and user preferences. |
| 2026-05-16 | AUD-004 | IN PROGRESS | Migrated portal dashboards, mentor availability, college event creation, student/alumni booking cancellation, portal API helpers, and network booking/wallet calls to the shared `request()` wrapper. Remaining direct fetches are auth/onboarding/public suggestion calls, file upload, and selected feature pages. |

## Verification Notes

| Date | Command | Result |
| --- | --- | --- |
| 2026-05-16 | `python3 -m py_compile backend/admin_settings.py backend/portals.py backend/server.py backend/crud_endpoints.py backend/wallet_and_availability.py` | PASS |
| 2026-05-16 | Backend duplicate route scan | PASS - no duplicate method/path decorators within backend modules |
| 2026-05-16 | `npm run lint` | PASS - 0 errors, 382 warnings |
| 2026-05-16 | `npx tsc --noEmit` | PASS |

## Next Fix Queue

1. Finish `AUD-004`: review remaining direct `fetch()` calls and keep only intentional public/auth/file-upload exceptions.
2. Fix `AUD-001`: remove `// @ts-nocheck` from Super Admin settings first, then portal files one module at a time.
3. Fix `AUD-006`: choose one high-impact CRUD area, verify DB persistence with backend tests, then repeat by module.
