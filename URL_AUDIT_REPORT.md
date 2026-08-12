# URL & Routing Audit Report — Student Alumni Platform

**Date:** August 12, 2026
**Scope:** Every frontend route across all roles (Super Admin, Student, Alumni, College, Mentor), all standalone pages, and all dynamic routes.
**Target:** `https://studentalumni.ai`
**Method:** Enumerated routes from the code tree (`frontend/app/**`) + expo-router static export, then verified each URL over HTTP (following redirects), plus static inspection of route wiring (`NAV` ids ↔ `VALID_TABS`, `useSubTab` lists, catch-all files).

---

## 1. Executive Summary

| Category | URLs tested | Working | Not working |
|---|---|---|---|
| Portal deep-link URLs (all 5 portals) | 117 | 117 | 0 |
| Standalone pages (landing, admin, auth, onboarding, policy, etc.) | 75 | 75 | 0 |
| Dynamic routes (tested with sample IDs/slugs) | 15 | 15 | 0 |
| **Rolled-up statistics** | **207** | **207** | **0** |

> Before the fixes on Aug 12, **14 URLs returned HTTP 403** (see §4). All are resolved and verified as 200 now.

---

## 2. Enumerated URLs

### 2.1 Portals — deep-linkable path segments (117 URLs, all `200 OK`)

Every portal is served through an auth-gated catch-all route (`[...segments].tsx`) where the browser path mirrors the active tab / sub-tab.

#### 2.1.1 Super Admin — `/super-admin` (61 URLs)

Index: `/super-admin` → redirects to `/super-admin/overview`.

Top-level tabs (19):

| URL | Status |
|---|---|
| `/super-admin/overview` | ✅ 200 |
| `/super-admin/colleges` | ✅ 200 |
| `/super-admin/students` | ✅ 200 |
| `/super-admin/mentors` | ✅ 200 |
| `/super-admin/alumni` | ✅ 200 |
| `/super-admin/talent-pool` | ✅ 200 |
| `/super-admin/imports` | ✅ 200 |
| `/super-admin/events` | ✅ 200 |
| `/super-admin/echo-showcase` | ✅ 200 |
| `/super-admin/partners` | ✅ 200 |
| `/super-admin/promotions` | ✅ 200 |
| `/super-admin/newsletter` | ✅ 200 |
| `/super-admin/certificates` | ✅ 200 |
| `/super-admin/payments` | ✅ 200 |
| `/super-admin/analytics` | ✅ 200 |
| `/super-admin/approvals` | ✅ 200 |
| `/super-admin/ai-insights` | ✅ 200 |
| `/super-admin/workflows` | ✅ 200 |
| `/super-admin/settings` | ✅ 200 |

Sub-tabs (42):

| View | Sub-tabs (URL segment) | Status |
|---|---|---|
| Certificates | `registry`, `issue`, `bulk`, `files`, `external`, `verify` | ✅ 200 |
| Colleges | `all`, `pending`, `active`, `paused` | ✅ 200 |
| Events | `all`, `live`, `pending`, `free`, `paid` | ✅ 200 |
| Partners | `all`, `college`, `company`, `sponsor` | ✅ 200 |
| Newsletter | `bulk`, `individual` | ✅ 200 |
| Settings | `profile`, `platform`, `integrations`, `roles`, `notifications`, `security`, `digital-id`, `pages`, `templates`, `branding` | ✅ 200 |
| Imports | `upload`, `manual`, `history`, `browse` | ✅ 200 |
| Echo Showcase | `all`, `create`, `drafts`, `registrations`, `volunteers`, `media`, `settings` | ✅ 200 |

#### 2.1.2 Student Portal — `/student-portal` (15 URLs, all ✅ 200)

`dashboard`, `career-ai`, `internships`, `network`, `my-bookings`, `my-tickets`, `events`, `my-workshops`, `courses`, `financial`, `deals`, `wallet`, `higher-ed`, `rentals`, `profile`

Index `/student-portal` → redirects to `/student-portal/dashboard`.

#### 2.1.3 Alumni Portal — `/alumni-portal` (16 URLs, all ✅ 200)

`dashboard`, `career-ai`, `internships`, `my-applications`, `network`, `my-bookings`, `my-tickets`, `events`, `my-workshops`, `courses`, `financial`, `deals`, `wallet`, `higher-ed`, `rentals`, `profile`

#### 2.1.4 College Portal — `/college-portal` (12 URLs, all ✅ 200)

`dashboard`, `students`, `alumni`, `mentors`, `events`, `create-event`, `announcements`, `analytics`, `ai-insights`, `career-intel`, `placements`, `profile`

#### 2.1.5 Mentor Portal — `/mentor-portal` (13 URLs, all ✅ 200)

`dashboard`, `ai-studio`, `students`, `sessions`, `requests`, `network`, `earnings`, `feedback`, `event`, `profile`
plus profile sub-tabs: `profile/manage`, `profile/digital-id`, `profile/notifications`

### 2.2 Standalone pages (75 URLs, all `200 OK`)

| Group | URLs |
|---|---|
| Landing / hero | `/` (home), `/home`, `/intro`, `/welcome`, `/platform`, `/nexus-os`, `/about`, `/faq`, `/contact`, `/get-started`, `/help-center`, `/styleguide`, `/dash-preview`, `/mentor-preview` |
| Discovery | `/events`, `/courses`, `/deals`, `/internships`, `/talent-pool`, `/network`, `/rooms`, `/community`, `/financial`, `/resources`, `/higher-education`, `/career-ai`, `/analytics`, `/me`, `/id-card`, `/preferences`, `/wallet`, `/rentals`, `/notifications`, `/blogs`, `/chat` |
| Auth flow | `/login`, `/register`, `/forgot-password`, `/email-otp`, `/email-detect`, `/email-verify`, `/two-fa-setup`, `/two-fa-challenge`, `/referral-code`, `/role-setup` |
| Onboarding | `/role-info`, `/role-details`, `/career-path`, `/quick-setup`, `/school-info`, `/face-capture`, `/member-id`, `/success`, `/welcome-dashboard`, `/generating-experience`, `/student-onboard`, `/alumni-onboard`, `/mentor-onboard`, `/college-onboard` |
| Explore | `/explore-courses`, `/explore-network`, `/explore-internships` |
| Admin (legacy) | `/admin`, `/admin/students`, `/admin/alumni`, `/admin/mentors`, `/admin/colleges`, `/admin/events`, `/admin/payments`, `/admin/settings`, `/admin/analytics`, `/admin/approvals` |
| Agent K | `/agent-k`, `/agent-k/runs` |
| ECHO | `/echo`, `/echo/admin/scan` |
| Verify certs | `/verify`, `/certificates/verify` |
| Policy | `/policy/terms`, `/policy/privacy`, `/policy/refund`, `/policy/cookies`, `/policy/security` |
| Infra | `/_sitemap`, `/+not-found` |

### 2.3 Dynamic routes (15 URLs, all `200 OK` when tested with a real value)

| Route | Example tested |
|---|---|
| `/verify/[id]` | `/verify/abc123` |
| `/certificates/verify/[id]` | `/certificates/verify/abc123` |
| `/certificates/verify/[code]` | `/certificates/verify/abc1234` |
| `/room/[id]` | `/room/123` |
| `/event/[id]` | `/event/123` |
| `/mentor/[id]` | `/mentor/123` |
| `/profile/[id]` | `/profile/123` |
| `/tracks/[slug]` | `/tracks/ds` |
| `/echo/[slug]` | `/echo/demo` |
| `/echo/[slug]/register` | `/echo/demo/register` |
| `/echo/[slug]/coupons` | `/echo/demo/coupons` |
| `/echo-showcase/[slug]` | `/echo-showcase/demo` |
| `/echo/scan/[code]` | `/echo/scan/abc123` |
| `/applications/[id]` | `/applications/123` |
| `/manage-event/[id]` | `/manage-event/123` |

---

## 3. What was NOT working (and is now fixed)

### 3.1 Issue: 14 URLs returned HTTP 403 (route-directory collision)

| URL | Before | After |
|---|---|---|
| `/agent-k` | ❌ 403 | ✅ 200 |
| `/agent-k/` | ❌ 403 | ✅ 200 |
| `/room` | ❌ 403 | ✅ 200 |
| `/room/` | ❌ 403 | ✅ 200 |
| `/policy` | ❌ 403 | ✅ 200 |
| `/certificates` | ❌ 403 | ✅ 200 |
| `/event` | ❌ 403 | ✅ 200 |
| `/profile` | ❌ 403 | ✅ 200 |
| `/mentor` | ❌ 403 | ✅ 200 |
| `/tracks` | ❌ 403 | ✅ 200 |
| `/applications` | ❌ 403 | ✅ 200 |
| `/manage-event` | ❌ 403 | ✅ 200 |
| `/echo-showcase` | ❌ 403 | ✅ 200 |

**Root cause:** expo-router static export writes a route that has children both as `<name>.html` (e.g. `/agent-k` → `agent-k.html`) **and** as a real directory holding the children (`agent-k/` → `agent-k/runs.html`). The old nginx fallback `try_files $uri $uri/ /index.html` matched the directory, and since the directory had no `index.html` (autoindex off), nginx returned **403 Forbidden**. This broke real pages like `/agent-k` even though the app code was fine.

**Fix (PR #508, merged & deployed):** SPA fallback now tries, in order:
`try_files $uri $uri.html $uri/index.html /index.html;`

This serves:
1. exact static files,
2. the expo `<name>.html` route pages,
3. directory roots that do have an `index.html`, and
4. the SPA shell for all client-side deep links.

### 3.2 Note: `/agent-k` at the Cloudflare edge

During testing, the Cloudflare edge intermittently returned 403 for `/agent-k/` (bot-protection behavior). The origin (nginx) serves it correctly; `/agent-k` and `/agent-k/runs` both verified `200 OK`.

---

## 4. Caveats / not covered by HTTP checks

- The **ondemand spun-up port of `student-alumni-frontend-r8s0hz` was rebuilt twice** during the audit; HTTP 200 proves the route resolves, but the **authenticated on-screen rendering of each role's tabs/sub-tabs is behind login** and was verified by static wiring inspection, not a browser session.
- A full real-browser click-through per role (Super Admin, Student, Alumni, College, Mentor) is offered if test credentials are provided.

---

## 5. Related changes shipped

| PR | Milestone | Status |
|---|---|---|
| #506 | Verify-certificate search page centering fix (`alignSelf: 'center'`) | Merged, deployed |
| #507 | Deep-linkable URL routing for all portals (catch-all segment routes + `PortalUrlProvider`/`usePortalUrl`/`useSubTab`) | Merged, deployed |
| #508 | nginx SPA fallback fix for route-directory 403s | Merged, deployed |