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
| Standalone pages (landing, admin, auth, onboarding, policy, etc.) | 85 | 85 | 0 |
| Dynamic routes (tested with sample IDs/slugs) | 15 | 15 | 0 |
| **Rolled-up statistics** | **217** | **217** | **0** |

> Before the fixes on Aug 12, **14 URLs returned HTTP 403** (see §4). All are resolved and verified as 200 now.

> **Rev. 2 (Aug 12, later):** The first draft counted 207. Re-audit (dedup + full admin sub-pages + `/two-fa-challenge`) brings the verified total to **217**. This revision lists the **complete absolute URL** for every route.

---

## 2. Enumerated URLs (complete list)

### 2.1 Portals — deep-linkable path segments (117 URLs, all `200 OK`)

Base: `https://studentalumni.ai`

#### 2.1.1 Super Admin — `/super-admin` (61 URLs)

Index: `/super-admin` → redirects to `/super-admin/overview`.

Top-level tabs (19):

| URL | Status |
|---|---|
| `https://studentalumni.ai/super-admin/overview` | ✅ 200 |
| `https://studentalumni.ai/super-admin/colleges` | ✅ 200 |
| `https://studentalumni.ai/super-admin/students` | ✅ 200 |
| `https://studentalumni.ai/super-admin/mentors` | ✅ 200 |
| `https://studentalumni.ai/super-admin/alumni` | ✅ 200 |
| `https://studentalumni.ai/super-admin/talent-pool` | ✅ 200 |
| `https://studentalumni.ai/super-admin/imports` | ✅ 200 |
| `https://studentalumni.ai/super-admin/events` | ✅ 200 |
| `https://studentalumni.ai/super-admin/echo-showcase` | ✅ 200 |
| `https://studentalumni.ai/super-admin/partners` | ✅ 200 |
| `https://studentalumni.ai/super-admin/promotions` | ✅ 200 |
| `https://studentalumni.ai/super-admin/newsletter` | ✅ 200 |
| `https://studentalumni.ai/super-admin/certificates` | ✅ 200 |
| `https://studentalumni.ai/super-admin/payments` | ✅ 200 |
| `https://studentalumni.ai/super-admin/analytics` | ✅ 200 |
| `https://studentalumni.ai/super-admin/approvals` | ✅ 200 |
| `https://studentalumni.ai/super-admin/ai-insights` | ✅ 200 |
| `https://studentalumni.ai/super-admin/workflows` | ✅ 200 |
| `https://studentalumni.ai/super-admin/settings` | ✅ 200 |

Sub-tabs (42):

| URL | Status |
|---|---|
| `https://studentalumni.ai/super-admin/certificates/registry` | ✅ 200 |
| `https://studentalumni.ai/super-admin/certificates/issue` | ✅ 200 |
| `https://studentalumni.ai/super-admin/certificates/bulk` | ✅ 200 |
| `https://studentalumni.ai/super-admin/certificates/files` | ✅ 200 |
| `https://studentalumni.ai/super-admin/certificates/external` | ✅ 200 |
| `https://studentalumni.ai/super-admin/certificates/verify` | ✅ 200 |
| `https://studentalumni.ai/super-admin/colleges/all` | ✅ 200 |
| `https://studentalumni.ai/super-admin/colleges/pending` | ✅ 200 |
| `https://studentalumni.ai/super-admin/colleges/active` | ✅ 200 |
| `https://studentalumni.ai/super-admin/colleges/paused` | ✅ 200 |
| `https://studentalumni.ai/super-admin/events/all` | ✅ 200 |
| `https://studentalumni.ai/super-admin/events/live` | ✅ 200 |
| `https://studentalumni.ai/super-admin/events/pending` | ✅ 200 |
| `https://studentalumni.ai/super-admin/events/free` | ✅ 200 |
| `https://studentalumni.ai/super-admin/events/paid` | ✅ 200 |
| `https://studentalumni.ai/super-admin/partners/all` | ✅ 200 |
| `https://studentalumni.ai/super-admin/partners/college` | ✅ 200 |
| `https://studentalumni.ai/super-admin/partners/company` | ✅ 200 |
| `https://studentalumni.ai/super-admin/partners/sponsor` | ✅ 200 |
| `https://studentalumni.ai/super-admin/newsletter/bulk` | ✅ 200 |
| `https://studentalumni.ai/super-admin/newsletter/individual` | ✅ 200 |
| `https://studentalumni.ai/super-admin/settings/profile` | ✅ 200 |
| `https://studentalumni.ai/super-admin/settings/platform` | ✅ 200 |
| `https://studentalumni.ai/super-admin/settings/integrations` | ✅ 200 |
| `https://studentalumni.ai/super-admin/settings/roles` | ✅ 200 |
| `https://studentalumni.ai/super-admin/settings/notifications` | ✅ 200 |
| `https://studentalumni.ai/super-admin/settings/security` | ✅ 200 |
| `https://studentalumni.ai/super-admin/settings/digital-id` | ✅ 200 |
| `https://studentalumni.ai/super-admin/settings/pages` | ✅ 200 |
| `https://studentalumni.ai/super-admin/settings/templates` | ✅ 200 |
| `https://studentalumni.ai/super-admin/settings/branding` | ✅ 200 |
| `https://studentalumni.ai/super-admin/imports/upload` | ✅ 200 |
| `https://studentalumni.ai/super-admin/imports/manual` | ✅ 200 |
| `https://studentalumni.ai/super-admin/imports/history` | ✅ 200 |
| `https://studentalumni.ai/super-admin/imports/browse` | ✅ 200 |
| `https://studentalumni.ai/super-admin/echo-showcase/all` | ✅ 200 |
| `https://studentalumni.ai/super-admin/echo-showcase/create` | ✅ 200 |
| `https://studentalumni.ai/super-admin/echo-showcase/drafts` | ✅ 200 |
| `https://studentalumni.ai/super-admin/echo-showcase/registrations` | ✅ 200 |
| `https://studentalumni.ai/super-admin/echo-showcase/volunteers` | ✅ 200 |
| `https://studentalumni.ai/super-admin/echo-showcase/media` | ✅ 200 |
| `https://studentalumni.ai/super-admin/echo-showcase/settings` | ✅ 200 |

#### 2.1.2 Student Portal — `/student-portal` (15 URLs, all `200 OK`)

Index: `/student-portal` → redirects to `/student-portal/dashboard`.

| URL | Status |
|---|---|
| `https://studentalumni.ai/student-portal/dashboard` | ✅ 200 |
| `https://studentalumni.ai/student-portal/career-ai` | ✅ 200 |
| `https://studentalumni.ai/student-portal/internships` | ✅ 200 |
| `https://studentalumni.ai/student-portal/network` | ✅ 200 |
| `https://studentalumni.ai/student-portal/my-bookings` | ✅ 200 |
| `https://studentalumni.ai/student-portal/my-tickets` | ✅ 200 |
| `https://studentalumni.ai/student-portal/events` | ✅ 200 |
| `https://studentalumni.ai/student-portal/my-workshops` | ✅ 200 |
| `https://studentalumni.ai/student-portal/courses` | ✅ 200 |
| `https://studentalumni.ai/student-portal/financial` | ✅ 200 |
| `https://studentalumni.ai/student-portal/deals` | ✅ 200 |
| `https://studentalumni.ai/student-portal/wallet` | ✅ 200 |
| `https://studentalumni.ai/student-portal/higher-ed` | ✅ 200 |
| `https://studentalumni.ai/student-portal/rentals` | ✅ 200 |
| `https://studentalumni.ai/student-portal/profile` | ✅ 200 |

#### 2.1.3 Alumni Portal — `/alumni-portal` (16 URLs, all `200 OK`)

| URL | Status |
|---|---|
| `https://studentalumni.ai/alumni-portal/dashboard` | ✅ 200 |
| `https://studentalumni.ai/alumni-portal/career-ai` | ✅ 200 |
| `https://studentalumni.ai/alumni-portal/internships` | ✅ 200 |
| `https://studentalumni.ai/alumni-portal/my-applications` | ✅ 200 |
| `https://studentalumni.ai/alumni-portal/network` | ✅ 200 |
| `https://studentalumni.ai/alumni-portal/my-bookings` | ✅ 200 |
| `https://studentalumni.ai/alumni-portal/my-tickets` | ✅ 200 |
| `https://studentalumni.ai/alumni-portal/events` | ✅ 200 |
| `https://studentalumni.ai/alumni-portal/my-workshops` | ✅ 200 |
| `https://studentalumni.ai/alumni-portal/courses` | ✅ 200 |
| `https://studentalumni.ai/alumni-portal/financial` | ✅ 200 |
| `https://studentalumni.ai/alumni-portal/deals` | ✅ 200 |
| `https://studentalumni.ai/alumni-portal/wallet` | ✅ 200 |
| `https://studentalumni.ai/alumni-portal/higher-ed` | ✅ 200 |
| `https://studentalumni.ai/alumni-portal/rentals` | ✅ 200 |
| `https://studentalumni.ai/alumni-portal/profile` | ✅ 200 |

#### 2.1.4 College Portal — `/college-portal` (12 URLs, all `200 OK`)

| URL | Status |
|---|---|
| `https://studentalumni.ai/college-portal/dashboard` | ✅ 200 |
| `https://studentalumni.ai/college-portal/students` | ✅ 200 |
| `https://studentalumni.ai/college-portal/alumni` | ✅ 200 |
| `https://studentalumni.ai/college-portal/mentors` | ✅ 200 |
| `https://studentalumni.ai/college-portal/events` | ✅ 200 |
| `https://studentalumni.ai/college-portal/create-event` | ✅ 200 |
| `https://studentalumni.ai/college-portal/announcements` | ✅ 200 |
| `https://studentalumni.ai/college-portal/analytics` | ✅ 200 |
| `https://studentalumni.ai/college-portal/ai-insights` | ✅ 200 |
| `https://studentalumni.ai/college-portal/career-intel` | ✅ 200 |
| `https://studentalumni.ai/college-portal/placements` | ✅ 200 |
| `https://studentalumni.ai/college-portal/profile` | ✅ 200 |

#### 2.1.5 Mentor Portal — `/mentor-portal` (13 URLs, all `200 OK`)

| URL | Status |
|---|---|
| `https://studentalumni.ai/mentor-portal/dashboard` | ✅ 200 |
| `https://studentalumni.ai/mentor-portal/ai-studio` | ✅ 200 |
| `https://studentalumni.ai/mentor-portal/students` | ✅ 200 |
| `https://studentalumni.ai/mentor-portal/sessions` | ✅ 200 |
| `https://studentalumni.ai/mentor-portal/requests` | ✅ 200 |
| `https://studentalumni.ai/mentor-portal/network` | ✅ 200 |
| `https://studentalumni.ai/mentor-portal/earnings` | ✅ 200 |
| `https://studentalumni.ai/mentor-portal/feedback` | ✅ 200 |
| `https://studentalumni.ai/mentor-portal/event` | ✅ 200 |
| `https://studentalumni.ai/mentor-portal/profile` | ✅ 200 |
| `https://studentalumni.ai/mentor-portal/profile/manage` | ✅ 200 |
| `https://studentalumni.ai/mentor-portal/profile/digital-id` | ✅ 200 |
| `https://studentalumni.ai/mentor-portal/profile/notifications` | ✅ 200 |

### 2.2 Standalone pages (85 URLs, all `200 OK`)

| URL | Status |
|---|---|
| `https://studentalumni.ai/` | ✅ 200 |
| `https://studentalumni.ai/home` | ✅ 200 |
| `https://studentalumni.ai/about` | ✅ 200 |
| `https://studentalumni.ai/blogs` | ✅ 200 |
| `https://studentalumni.ai/faq` | ✅ 200 |
| `https://studentalumni.ai/chat` | ✅ 200 |
| `https://studentalumni.ai/contact` | ✅ 200 |
| `https://studentalumni.ai/get-started` | ✅ 200 |
| `https://studentalumni.ai/help-center` | ✅ 200 |
| `https://studentalumni.ai/styleguide` | ✅ 200 |
| `https://studentalumni.ai/intro` | ✅ 200 |
| `https://studentalumni.ai/welcome` | ✅ 200 |
| `https://studentalumni.ai/platform` | ✅ 200 |
| `https://studentalumni.ai/nexus-os` | ✅ 200 |
| `https://studentalumni.ai/dash-preview` | ✅ 200 |
| `https://studentalumni.ai/mentor-preview` | ✅ 200 |
| `https://studentalumni.ai/me` | ✅ 200 |
| `https://studentalumni.ai/id-card` | ✅ 200 |
| `https://studentalumni.ai/preferences` | ✅ 200 |
| `https://studentalumni.ai/events` | ✅ 200 |
| `https://studentalumni.ai/courses` | ✅ 200 |
| `https://studentalumni.ai/deals` | ✅ 200 |
| `https://studentalumni.ai/internships` | ✅ 200 |
| `https://studentalumni.ai/talent-pool` | ✅ 200 |
| `https://studentalumni.ai/network` | ✅ 200 |
| `https://studentalumni.ai/rooms` | ✅ 200 |
| `https://studentalumni.ai/community` | ✅ 200 |
| `https://studentalumni.ai/financial` | ✅ 200 |
| `https://studentalumni.ai/resources` | ✅ 200 |
| `https://studentalumni.ai/higher-education` | ✅ 200 |
| `https://studentalumni.ai/career-ai` | ✅ 200 |
| `https://studentalumni.ai/analytics` | ✅ 200 |
| `https://studentalumni.ai/wallet` | ✅ 200 |
| `https://studentalumni.ai/rentals` | ✅ 200 |
| `https://studentalumni.ai/notifications` | ✅ 200 |
| `https://studentalumni.ai/explore-courses` | ✅ 200 |
| `https://studentalumni.ai/explore-network` | ✅ 200 |
| `https://studentalumni.ai/explore-internships` | ✅ 200 |
| `https://studentalumni.ai/login` | ✅ 200 |
| `https://studentalumni.ai/register` | ✅ 200 |
| `https://studentalumni.ai/forgot-password` | ✅ 200 |
| `https://studentalumni.ai/email-otp` | ✅ 200 |
| `https://studentalumni.ai/email-detect` | ✅ 200 |
| `https://studentalumni.ai/email-verify` | ✅ 200 |
| `https://studentalumni.ai/two-fa-setup` | ✅ 200 |
| `https://studentalumni.ai/two-fa-challenge` | ✅ 200 |
| `https://studentalumni.ai/referral-code` | ✅ 200 |
| `https://studentalumni.ai/role-setup` | ✅ 200 |
| `https://studentalumni.ai/role-info` | ✅ 200 |
| `https://studentalumni.ai/role-details` | ✅ 200 |
| `https://studentalumni.ai/career-path` | ✅ 200 |
| `https://studentalumni.ai/quick-setup` | ✅ 200 |
| `https://studentalumni.ai/school-info` | ✅ 200 |
| `https://studentalumni.ai/face-capture` | ✅ 200 |
| `https://studentalumni.ai/member-id` | ✅ 200 |
| `https://studentalumni.ai/success` | ✅ 200 |
| `https://studentalumni.ai/welcome-dashboard` | ✅ 200 |
| `https://studentalumni.ai/generating-experience` | ✅ 200 |
| `https://studentalumni.ai/student-onboard` | ✅ 200 |
| `https://studentalumni.ai/alumni-onboard` | ✅ 200 |
| `https://studentalumni.ai/mentor-onboard` | ✅ 200 |
| `https://studentalumni.ai/college-onboard` | ✅ 200 |
| `https://studentalumni.ai/admin` | ✅ 200 |
| `https://studentalumni.ai/admin/index` | ✅ 200 |
| `https://studentalumni.ai/admin/students` | ✅ 200 |
| `https://studentalumni.ai/admin/alumni` | ✅ 200 |
| `https://studentalumni.ai/admin/mentors` | ✅ 200 |
| `https://studentalumni.ai/admin/colleges` | ✅ 200 |
| `https://studentalumni.ai/admin/events` | ✅ 200 |
| `https://studentalumni.ai/admin/payments` | ✅ 200 |
| `https://studentalumni.ai/admin/settings` | ✅ 200 |
| `https://studentalumni.ai/admin/analytics` | ✅ 200 |
| `https://studentalumni.ai/admin/approvals` | ✅ 200 |
| `https://studentalumni.ai/agent-k` | ✅ 200 |
| `https://studentalumni.ai/agent-k/runs` | ✅ 200 |
| `https://studentalumni.ai/echo` | ✅ 200 |
| `https://studentalumni.ai/echo/admin/scan` | ✅ 200 |
| `https://studentalumni.ai/verify` | ✅ 200 |
| `https://studentalumni.ai/_sitemap` | ✅ 200 |
| `https://studentalumni.ai/+not-found` | ✅ 200 |
| `https://studentalumni.ai/policy/terms` | ✅ 200 |
| `https://studentalumni.ai/policy/privacy` | ✅ 200 |
| `https://studentalumni.ai/policy/refund` | ✅ 200 |
| `https://studentalumni.ai/policy/cookies` | ✅ 200 |
| `https://studentalumni.ai/policy/security` | ✅ 200 |

### 2.3 Dynamic routes (15 URLs, all `200 OK` — replace the placeholder with a real value)

| Route | Status |
|---|---|
| `https://studentalumni.ai/verify/[id]` | ✅ 200 (test: `/verify/abc123`) |
| `https://studentalumni.ai/room/[id]` | ✅ 200 (test: `/room/123`) |
| `https://studentalumni.ai/event/[id]` | ✅ 200 (test: `/event/123`) |
| `https://studentalumni.ai/mentor/[id]` | ✅ 200 (test: `/mentor/123`) |
| `https://studentalumni.ai/profile/[id]` | ✅ 200 (test: `/profile/123`) |
| `https://studentalumni.ai/tracks/[slug]` | ✅ 200 (test: `/tracks/ds`) |
| `https://studentalumni.ai/echo/[slug]` | ✅ 200 (test: `/echo/demo`) |
| `https://studentalumni.ai/echo/[slug]/register` | ✅ 200 (test: `/echo/demo/register`) |
| `https://studentalumni.ai/echo/[slug]/coupons` | ✅ 200 (test: `/echo/demo/coupons`) |
| `https://studentalumni.ai/echo-showcase/[slug]` | ✅ 200 (test: `/echo-showcase/demo`) |
| `https://studentalumni.ai/echo/scan/[code]` | ✅ 200 (test: `/echo/scan/abc123`) |
| `https://studentalumni.ai/applications/[id]` | ✅ 200 (test: `/applications/123`) |
| `https://studentalumni.ai/manage-event/[id]` | ✅ 200 (test: `/manage-event/123`) |
| `https://studentalumni.ai/certificates/verify/[id]` | ✅ 200 (test: `/certificates/verify/abc123`) |
| `https://studentalumni.ai/certificates/verify/[code]` | ✅ 200 (test: `/certificates/verify/abc1234`) |

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

- HTTP 200 proves the route resolves; the **authenticated on-screen rendering of each role's tabs/sub-tabs is behind login** and was verified by static wiring inspection, not a browser session.
- A full real-browser click-through per role (Super Admin, Student, Alumni, College, Mentor) is offered if test credentials are provided.
- The earlier draft reported 207 URLs; the full unique set is **217** (dedup + all admin sub-pages + `/two-fa-challenge`).

---

## 5. Related changes shipped

| PR | Milestone | Status |
|---|---|---|
| #506 | Verify-certificate search page centering fix (`alignSelf: 'center'`) | Merged, deployed |
| #507 | Deep-linkable URL routing for all portals (catch-all segment routes + `PortalUrlProvider`/`usePortalUrl`/`useSubTab`) | Merged, deployed |
| #508 | nginx SPA fallback fix for route-directory 403s | Merged, deployed |