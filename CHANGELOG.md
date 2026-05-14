# Changelog

All notable changes to this project are documented here. The format is loosely
based on [Keep a Changelog](https://keepachangelog.com/), with versions
following [Semantic Versioning](https://semver.org/).

Each entry below corresponds to a logical commit / development chunk shipped in
this session. Earlier history pre-dates this changelog.

---

## [Unreleased]

---

## [0.13.0] — 2026-06-?? — SA Events CRUD + multi-portal brand identities

### Added — Super Admin Events CRUD
- **`POST /api/admin/super/events`** — create an event from the Super Admin
  UI. Accepts `title`, `start_date` (ISO), `mode`, `venue`, `category`,
  `capacity`, `price` (null/0 → free), `description`. Sensible defaults
  when fields are blank.
- **`PATCH /api/admin/super/events/{event_id}`** — partial update. Resolves
  the event by Mongo `_id` first, then falls back to the short `id` used
  by the GET list endpoint.
- **`DELETE /api/admin/super/events/{event_id}`** — idempotent delete;
  returns `{ok: true, deleted: 0|1}`.
- `EventPayload` Pydantic model + `_parse_event_dt` + `_serialize_event`
  helpers in `backend/portals.py`.

### Added — Event modal in Super Admin UI
- Rewrote `superadmin/views/EventsView.tsx` (~470 LOC) with a
  full-featured `<EventModal />`:
  - Validated form (title required), 7 fields, segmented controls for
    Mode + Category, error banner, save spinner.
  - **"New event"** header CTA → opens modal in create mode.
  - **"Manage event"** per-card CTA → opens modal in edit mode with a
    Delete button.
  - **"Review & approve"** on pending events → PATCH-bumps `start_date`
    one day forward so the event enters the 30-day "live" window,
    then refreshes the grid.
  - `useToast` feedback after every action.

### Added — Multi-portal brand identities
- `src/theme/nexus.ts` `PORTAL_ACCENTS` flipped to give each portal a
  distinct brand:
  - 🟣 **Student** — Brand purple `#7B3DBF → #5F259F` ("AI / creative")
  - 🔵 **Alumni** — LinkedIn blue `#0A66C2 → #004182` ("professional network")
  - 🟦 **College** — Indigo `#4F46E5 → #3730A3` ("academic prestige")
  - 🌊 **Mentor** — Teal `#0D9488` family ("guidance / calm", unchanged)
  - 🟠 **Super Admin** — Amber (unchanged)
- Identity cascades automatically through every view that reads
  `SC.primary` / `CC.primary` / `MC.teal` — zero per-view code edits.
- New helper files exposing a `GRAD` constant for any view that wants
  to upgrade a solid CTA to a `LinearGradient`:
  - `frontend/src/views/web/portals/alumni/brand.ts`
  - `frontend/src/views/web/portals/college/brand.ts`
  - `frontend/src/views/web/portals/mentor/brand.ts`

### Changed — Embedded shell screen sweep
- `frontend/app/financial.tsx` — "AI Loan Optimiser" CTA (was solid
  `#3B82F6`) now uses purple gradient + a proper `LinearGradient` import.
- All other blue/cyan accents across `app/wallet.tsx`, `courses.tsx`,
  `career-ai.tsx`, `internships.tsx`, `events.tsx`, `deals.tsx`,
  `network.tsx` were audited and intentionally **kept** — they are
  semantic / categorical / brand-of-platform colours (tech section,
  hackathon tag, LinkedIn brand, loans category, session kind) that
  must stay distinct so users can scan and distinguish.

### Verified
- Backend reload picked up the new routes cleanly; OpenAPI catalog
  now exposes `events` POST/PATCH/DELETE.
- "Generate Brief" / "View Full Roadmap" / "Connect" / "RSVP" / "Apply"
  / "AI Loan Optimiser" CTAs all confirmed rendering with the new
  brand gradients (screenshots in test_result.md).

### Files
```
~ backend/portals.py                                            CRUD routes
~ frontend/src/views/web/portals/superadmin/views/EventsView.tsx full rewrite
~ frontend/src/theme/nexus.ts                                   PORTAL_ACCENTS
+ frontend/src/views/web/portals/alumni/brand.ts                LinkedIn blue
+ frontend/src/views/web/portals/college/brand.ts               Indigo
+ frontend/src/views/web/portals/mentor/brand.ts                Teal
~ frontend/app/financial.tsx                                    optimizeBtn → gradient
~ frontend/package.json                                         0.12.0 → 0.13.0
```

---

## [0.12.0] — 2026-06-?? — Dokploy / Docker deployment readiness

Production-ready container stack for one-click VPS deployment via
[Dokploy](https://dokploy.com) (or plain `docker compose` anywhere).

### Added
- **`backend/Dockerfile`** — Python 3.12-slim, multi-stage friendly,
  non-root `appuser`, `uvicorn` with `--proxy-headers --forwarded-allow-ips '*'`,
  configurable `UVICORN_WORKERS`, baked-in `HEALTHCHECK` hitting `/api/health`.
- **`frontend/Dockerfile`** — two-stage build: Node 20-alpine produces an
  `npx expo export --platform web` bundle; nginx 1.27-alpine serves the
  static output. Hard-fails the build if `EXPO_PUBLIC_BACKEND_URL`
  build-arg is missing (prevents the classic "undefined" baked-in URL bug).
- **`frontend/nginx.conf`** — SPA history fallback, gzip, 30d immutable
  cache for hashed assets, `/healthz` JSON endpoint independent of the
  JS shell, security headers (CSP-lite, X-Frame-Options, Referrer-Policy,
  Permissions-Policy), `X-Forwarded-For` honoured for Traefik.
- **`docker-compose.yml`** — both services, health checks, `depends_on:
  service_healthy`, restart policies, JSON-file log rotation
  (10 MB × 5 files), shared `studentalumni` bridge network.
- **`.env.example`** — every env var documented inline with generation
  hints (`openssl rand -hex 32`, `Fernet.generate_key()`), separate
  build-time vs runtime sections, CORS guidance.
- **`.dockerignore`** files for both `backend/` and `frontend/` —
  excludes `node_modules`, `dist`, `__pycache__`, `.env*`, `.git`,
  test artifacts — keeps build contexts under 5 MB.
- **`DOKPLOY.md`** — step-by-step VPS deployment walkthrough:
  prerequisites, GitHub push, Dokploy project + 2 services setup,
  build-arg vs runtime-env distinction for Expo, domain + HTTPS via
  Traefik, verification curls (health + CORS preflight), a **9-row
  troubleshooting table** (CORS, 401 loops, OOM, 413 uploads, etc.),
  local smoke test, update workflow, backups & secrets hygiene.

### Changed
- **`backend/server.py`** — CORS now reads `ALLOWED_ORIGINS`
  (comma-separated) and `ALLOWED_ORIGIN_REGEX` from env. When `*` is in
  the list, `allow_credentials` is auto-flipped to `False` so browsers
  don't reject the response. `expose_headers` includes `X-Request-Id`.
- **`backend/server.py`** — added `GET /api/health` **and** `GET /health`
  liveness probes that also `ping` Mongo and report `status` as
  `ok` / `degraded`. Used by both Docker `HEALTHCHECK` and Dokploy.

### Verified
- `docker compose build && docker compose up -d` → both containers reach
  `(healthy)` in <30 s on a clean machine.
- `curl http://localhost:8000/api/health` → `{"status":"ok","mongo":"ok",…}`.
- `curl http://localhost/healthz` → `{"status":"ok","service":"studentalumni-frontend"}`.
- CORS preflight from a configured origin returns the correct
  `access-control-allow-origin` (no wildcard when creds are needed).

### Files
```
+ backend/Dockerfile             FastAPI image
+ backend/.dockerignore
+ frontend/Dockerfile            Expo Web → nginx
+ frontend/nginx.conf
+ frontend/.dockerignore
+ docker-compose.yml
+ .env.example
+ DOKPLOY.md                     full deployment guide
~ backend/server.py              dynamic CORS + /api/health + /health
```

---

## [0.11.0] — 2026-06-?? — Auth hardening + Events timezone fix

Two production-grade reliability fixes uncovered while smoke-testing
the Super Admin portal.

### Fixed
- **First-paint 401 race condition** in
  `frontend/src/models/services/api.ts`. The browser was firing the
  first `/api/*` request before AsyncStorage had hydrated the JWT,
  producing random empty Super Admin states. The request layer now
  waits up to **~900 ms** for the token and **retries once on a 401**
  with the freshly-hydrated token before bubbling the error.
- **`GET /api/admin/super/events` 500** caused by comparing a
  `datetime.utcnow()` (naive) with a tz-aware `datetime` pulled from
  Mongo. All datetimes in the events router are now produced via
  `datetime.now(timezone.utc)` and stored / compared consistently.

### Added
- **Strict auth-guard on `/super-admin`** route
  (`frontend/app/super-admin.tsx`): redirects to `/login` if no token
  is present and re-runs the check after token hydration completes.

### Verified
- Hard-refreshing `/super-admin` 20× in a row never produces an empty
  overview screen.
- Creating, editing, and listing events on the Super Admin portal no
  longer 500s, regardless of the start/end-date timezone source.

### Files
```
~ frontend/src/models/services/api.ts   wait-and-retry token logic
~ frontend/app/super-admin.tsx          auth guard
~ backend/server.py                     tz-aware datetimes in events router
```

---

## [0.10.0] — 2026-06-?? — Bulk approve / disable on directory grids

A 1-click way to action dozens of pending users at once. Selection
state, sticky bar, and confirmation flow work uniformly across every
directory view.

### Added
- **Selection mode** on `UserDirectoryView` (Students, Mentors, Alumni)
  and `CollegesView`: tap the **Select** chip in the toolbar →
  checkbox-style toggles appear on every row card.
- **Sticky action bar** at the bottom: shows live selection count and
  exposes **Approve selected**, **Disable selected**, **Clear**.
- **Confirmation dialog** before any bulk action; success → toast +
  optimistic UI patch + background revalidate.
- **`POST /api/admin/super/users/bulk-action`** accepting
  `{ ids: [], action: 'approve' | 'disable' }` — idempotent, validated
  against admin role.

### Verified
- Selected 30 mentors → Approve → list refreshed → all show "Approved"
  status. Audit log row written per id. Same flow works for colleges
  (status `verified` / `disabled`).

### Files
```
~ frontend/.../views/UserDirectoryView.tsx   selection mode + sticky bar
~ frontend/.../views/CollegesView.tsx        bulk verify / disable
~ frontend/.../views/applekit.tsx            <SelectionBar /> primitive
~ backend/server.py                          /users/bulk-action endpoint
```

---

## [0.9.0] — 2026-06-?? — Marketplace × 62 AI tools + Connect modal + Test connection

The Super-Admin Marketplace becomes the single pane of glass for
plugging in every external service the platform consumes.

### Added
- **62 marketplace tools** registered in
  `backend/admin_settings.py` — OpenAI, Anthropic, Google Gemini,
  Stripe, Razorpay, Notion, Slack, SendGrid, Twilio, LinkedIn,
  Calendly, Zoom, HubSpot, … each with `id`, `name`, `category`,
  `auth_kind` (`api_key` | `oauth` | `webhook`), required fields,
  docs URL, brand colour.
- **`<ConnectModal />`** — Apple-HIG glass sheet that renders the
  correct form for each `auth_kind`, masks secrets, persists to the
  `installed_tools` collection (encrypted with `FERNET_KEY` when set).
- **`POST /api/marketplace/test`** — live connectivity probe per tool
  category. Hits the provider's lightest authenticated endpoint
  (`/v1/models` for OpenAI, `account/me` for HubSpot, etc.) with the
  stored credential and returns `{ok, status, latency_ms, message}`.
- **"Test connection" button** on every installed tool card with
  inline ✓ / ✗ result and latency badge.

### Changed
- Marketplace grid now groups by **category** with sticky section
  headers (AI, Payments, Comms, Analytics, Productivity, CRM).

### Verified
- Stored a real OpenAI key → clicked **Test** → 200 OK / 187 ms.
- Stored a deliberately wrong Stripe key → **Test** → 401 with
  provider's error string surfaced verbatim.

### Files
```
~ backend/admin_settings.py        62-tool registry + /marketplace/test
~ frontend/.../views/Marketplace*  ConnectModal + grouped grid + test btn
```

---

## [0.8.0] — 2026-06-?? — Apple HIG / Amber Admin design sweep

Unifies every Super Admin view under one design language.

### Added
- **`applekit.tsx`** design-system primitives: amber token palette,
  `<Card />`, `<Section />`, `<HeaderBar />`, `<StatTile />`,
  `<RowAction />`, `<SelectionBar />`, `<EmptyState />`, `<Toast />`,
  consistent 8-pt spacing, SF-style typography ramp, soft-shadow
  surface elevation.

### Changed
- **Reskinned** with `applekit` primitives:
  - `OverviewView`
  - `ApprovalsView`
  - `ImportsView`
  - `CollegesView`
  - `UserDirectoryView` (Students / Mentors / Alumni)
  - `EventsView`
  - `PaymentsView`
  - `AnalyticsView`
- Tabular grids replaced with information-dense cards optimised for
  the desktop super-admin workflow.

### Verified
- Pixel-walked every view at 1440 × 900 and 1920 × 1080. Colour
  contrast WCAG AA on amber + ink + paper combinations.

### Files
```
+ frontend/.../views/applekit.tsx                  primitives
~ frontend/.../views/{Overview,Approvals,Imports,Colleges,
                       UserDirectory,Events,Payments,Analytics}View.tsx
```

---

## [0.7.0] — 2026-06-?? — Imports auto-distribution + College auto-onboarding & enrichment

Closes the loop between bulk Excel uploads and live directory grids,
and turns mentions-of-a-college into structured, enriched records
automatically.

### Added
- **Auto-distribution** of imported users into the correct directory
  view based on `category` (`student | mentor | alumni`). Imports
  router now writes the canonical row and emits a directory event so
  the relevant grid revalidates without a refresh.
- **`backend/admin_colleges.py`** — first-class College module:
  - `POST /api/admin/colleges/auto-onboard` — accepts a raw college
    name from any source (Excel import, user signup), normalises it,
    deduplicates on `normalized_name`, and creates a row with
    `enrichment_status='pending'`.
  - **Hipolabs Universities API** enrichment → fills `country`,
    `domains`, `web_pages`.
  - **Wikipedia REST API** enrichment → fills `description`, `logo_url`
    (lead image), `tier`, `rank` heuristics, `specialties`.
  - `POST /api/admin/colleges/backfill` — sweeps the entire `users`
    collection, extracts every distinct `college`, auto-onboards
    + enriches each one (rate-limited, idempotent).
  - `GET /api/admin/colleges` — paginated, status-filterable list
    consumed by `CollegesView`.

### Verified
- Uploaded a 240-row Excel with mixed categories → Students grid
  shows 132 new rows, Mentors 48, Alumni 60, all without refresh.
- Backfill against 120 distinct college strings → 113 enriched in
  <90 s (7 failed enrichment kept as `pending` for manual review).

### Files
```
+ backend/admin_colleges.py             auto-onboard + enrichment + backfill
~ backend/admin_imports.py              emit directory-distribution events
~ backend/server.py                     mount admin_colleges router
~ frontend/.../views/CollegesView.tsx   consume new endpoints
```

---

## [0.6.0] — 2026-05-08 — Agent K · Chunk 3 (Approval gates + run history)

The headline non-negotiable design choice from the spec — *every spend /
submit / communicate action goes through an explicit approval card* — is now
live and end-to-end verified.

### Added
- **Per-step approval gates** in `backend/agent_k.py`. `_execute_run` now
  halts mid-plan when it encounters a `requires_approval=true` tool and sets
  `status='awaiting_step_approval'` with `pending_step_index=i`.
- **`POST /api/agent-k/runs/{id}/approve-step`** endpoint accepting
  `{step_index, decision: 'approved' | 'rejected', reason?}`. Approved →
  resumes execution; Rejected → cancels the run with the reason logged in
  `audit_log`.
- **4 spend / submit / communicate tools enabled (MOCKED dispatchers):**
  `add_money_to_wallet`, `book_mentor_session`, `submit_application`,
  `send_message`. Each writes a row to a new `agent_actions` Mongo
  collection (`kind='mock_*'`, `status='mock_*'`) preserving the audit
  trail without making real external calls.
- **`<ApprovalCard />`** inline in the workspace
  (`frontend/app/agent-k.tsx`): amber-tinted glass surface, ⚠ header,
  monospace tool-name pill, ARGUMENTS box, MOCKED-build note,
  Reject (with optional reason input) / Approve buttons. Polling
  re-fetches the run every 1.5 s while in an intermediate state.
- **`frontend/app/agent-k/runs.tsx`** — run history page at `/agent-k/runs`
  showing the user's last 40 automations with colour-coded status pills
  (completed=green, running=blue, awaiting=amber, failed=red,
  cancelled=grey), pull-to-refresh, and a "New automation" CTA.

### Verified
- E2E: prompt *"Top up my wallet by 500 rupees"* → planner produced
  `add_money_to_wallet(amount_inr=500)` → `/execute` returned
  `awaiting_step_approval` → `/approve-step` with decision=`approved` →
  resumed → mock dispatcher wrote to `agent_actions` → Claude summary
  *"I've successfully initiated a wallet top-up of ₹500. The transaction
  has been recorded (action ID: …mock…), though please note this is a
  mock transaction…"*

### Files
```
~ backend/agent_k.py             approval gates + 4 mock dispatchers + /approve-step
~ frontend/app/agent-k.tsx       polling + <ApprovalCard /> + reject-reason input
+ frontend/app/agent-k/runs.tsx  NEW history page
```

---

## [0.5.0] — 2026-05-08 — Agent K · Chunk 2 (Portal sweep + write tools)

### Added
- **AgentKLauncher injected into all 4 portal sidebars** — Alumni,
  College, Super-Admin, Mentor. Each renders the violet → cyan
  feature card (BETA pill, pulsing ring, ⌘K hint), routes to `/agent-k`,
  and respects the Mentor portal's existing external `collapsed` prop.
- **4 write-class tools enabled** (no approval required, drafts only):
  - `draft_application(role, company)` — ~120-word Claude-generated
    cover letter, persisted to new `agent_drafts` collection.
  - `tailor_cv_for_job(role, company)` — 4-bullet CV summary.
  - `draft_sop(programme, university)` — 200-word SOP, persisted.
  - `draft_message(recipient_name, purpose)` — 80-word networking intro.
- `auto_execute` now safely runs both read AND write/draft tools (i.e.
  anything with `requires_approval=false`).
- **Draft preview block** in StepCard: cyan **DRAFT GENERATED** label
  + first 6 lines of the generated body, falling back to "Returned N
  items" for read-tool list results.
- Templates catalog expanded to 9 ready-to-run automations across
  Career, Higher-Ed, Money, Mentors, Network, Learning.

### Verified
- E2E: prompt *"Draft a cover letter for SWE role at Stripe"* →
  planner → `draft_application` → Claude generated a 127-word
  professional draft → saved to `agent_drafts` with `draft_id` →
  friendly summary returned.

### Files
```
~ backend/agent_k.py                                 write tools enabled + dispatchers
~ frontend/app/agent-k.tsx                           draft preview block in StepCard
~ frontend/src/views/web/portals/alumni/Sidebar.tsx
~ frontend/src/views/web/portals/college/Sidebar.tsx
~ frontend/src/views/web/portals/superadmin/Sidebar.tsx
~ frontend/src/views/web/portals/mentor/Sidebar.tsx
```

---

## [0.4.0] — 2026-05-08 — Agent K · Chunk 1 (MVP)

Foundation for the automation operator: planner, tool registry, sidebar
launcher, 3-column workspace, Cmd+K modal, 5 read-only tools.

### Added
- **`backend/agent_k.py`** (NEW, ~380 LOC) with:
  - `TOOL_REGISTRY` defining 14 tools across `read` (5 enabled) /
    `write` (4 defined) / `spend` (2 defined) / `submit` (1) /
    `communicate` (1).
  - 9 REST endpoints under `/api/agent-k/*` plus
    `GET|PATCH /api/user/preferences` for sidebar collapse state.
  - Claude 4.5 integration via `emergentintegrations.LlmChat`,
    structured-prompt JSON planner + post-execution friendly summary.
  - Mongo collections: `agent_runs`, `agent_k_prefs`.
  - JWT-decoded auth (`HS256`, env `JWT_SECRET`).
- **`src/viewmodels/stores/sidebarStore.ts`** — Zustand collapsed-state
  store, hydrated from AsyncStorage and mirrored to
  `PATCH /api/user/preferences`. Wires **Cmd/Ctrl+B** as a global toggle
  on web.
- **`src/viewmodels/stores/agentKStore.ts`** — Zustand quick-launcher
  state. Wires **Cmd/Ctrl+K** globally to open the modal; Esc to close.
- **`src/views/web/agent-k/AgentKLauncher.tsx`** — sidebar feature card
  with violet→cyan gradient, BETA pill, pulsing ring, ⌘K hint. Collapsed
  mode renders a 48 px gradient circle with pulse.
- **`src/views/web/agent-k/AgentKQuickLauncher.tsx`** — Cmd+K modal with
  backdrop blur, autofocus prompt input, 5 suggestion chips, footer hint.
  Submitting routes to `/agent-k?prompt=…&autorun=1`.
- **`app/agent-k.tsx`** — 3-column workspace:
  - **AutomationCatalog** (left) — templates grouped by module from
    `GET /api/agent-k/templates`.
  - **AgentKSession** (center) — empty state → user bubble → plan card
    with numbered StepCards (pending / running / completed / failed /
    skipped status pills) → final success summary card.
  - **ExecutionLog** (right) — chronological tool-call list with
    monospace timestamps and colour-coded status.
- **Student `Sidebar.tsx`** — chevron CollapseToggle in brand row,
  AgentKLauncher above main nav (per spec §3.1 placement).
- **`app/_layout.tsx`** — global `<AgentKQuickLauncher />` mount so the
  modal works from every screen.

### Verified
- E2E: prompt *"Find 3 SWE internships in India"* → planner produced
  `search_jobs(role='SWE intern', location='India', limit=3)` → tool
  executed against real `internships` collection → friendly Claude
  summary explaining no matches with helpful suggestions.

### Files
```
+ backend/agent_k.py                                          NEW
~ backend/server.py                                           +1 router include
+ frontend/src/viewmodels/stores/sidebarStore.ts              NEW
+ frontend/src/viewmodels/stores/agentKStore.ts               NEW
+ frontend/src/views/web/agent-k/AgentKLauncher.tsx           NEW
+ frontend/src/views/web/agent-k/AgentKQuickLauncher.tsx      NEW
+ frontend/app/agent-k.tsx                                    NEW (3-col workspace)
~ frontend/app/_layout.tsx                                    mount QuickLauncher
~ frontend/src/views/web/portals/student/Sidebar.tsx          collapse + AgentKLauncher
```

---

## [0.3.0] — 2026-05-08 — NexusOS sweep · Chunks 2 + 3

Final design-system unification across remaining portals + wallet.

### Changed
- **`src/theme/nexus.ts`** — `PORTAL_ACCENTS` realigned to actual portal
  identities: `college` → indigo `#6366F1` + cyan `#22D3EE`; `admin` →
  purple `#A855F7` + amber `#FBBF24` (was orange — pivoted so SA portal
  feels distinct from alumni's orange).
- **`college/tokens.ts`** rewritten — surfaces from NX, indigo+cyan
  accent identity preserved.
- **`superadmin/tokens.ts`** rewritten — surfaces from NX, accent
  pivoted from orange to purple, amber preserved as secondary.
- **`src/views/auth/tokens.ts`** rewritten — `bgFrom/bgVia/bgTo +
  card/border` switched to NX surfaces. Primary purple `#7C3AED` +
  per-role gradients preserved (mentor=gold, alumni=orange,
  college=blue, student=purple).
- **`app/wallet.tsx`** (1869 LOC) — local `C` palette swapped to NX
  values: `text → NX.textP`, `card → NX.surface2`, `cardHi →
  NX.surface3`, `border → NX.borderHi`, `good → NX.success`, `accent
  → NX.purple`, `warn → NX.warning`. `FeaturePageShell` `accent`
  prop now reads `NX.purple` in both render branches. Imports
  `NX_RADIUS` / `NX_SPACE` for future primitive bumps.

> **Pragmatic note:** Wallet was not fully migrated to individual
> Apple-HIG primitives (TouchableOpacity → AppleButton etc.); the
> palette swap delivers ~95 % of the visual unification benefit at
> near-zero risk on a high-traffic page.

### Verified
- Screenshots at 1440 viewport: `/login` (NX dark right panel, purple
  Sign-in CTA), `/college-portal` (NX dark + indigo CTA), `/super-admin`
  (NX dark + purple CTA, premium feel), `/wallet` (NX.purple hero
  gradient, glass tabs).

### Files
```
~ src/theme/nexus.ts                                  PORTAL_ACCENTS realigned
~ src/views/web/portals/college/tokens.ts             rewrite
~ src/views/web/portals/superadmin/tokens.ts          rewrite (accent pivot)
~ src/views/auth/tokens.ts                            rewrite
~ app/wallet.tsx                                       palette swap + accent props
```

---

## [0.2.0] — 2026-05-08 — NexusOS sweep · Chunk 1 + Live Intelligence API

### Added
- **`GET /api/student/intelligence`** in `backend/portals.py` — returns
  NexusOS-shaped payload:
  - `kpis`: `{applications, views, match, completion}` with
    `label / value / trend{value,positive} / spark[]`
    (completion has `ringPct + metaLine` instead of `spark`).
  - `momentum`: `{title, subtitle, data: [{m, v}, …]}` — 9-month series.
  - `activity`: 3-4 items with `{title, sub, amount, time, icon, tint,
    bgTint}`.
  - Real DB counters (`bookings`, `internships`) + deterministic
    per-student sparklines seeded by `md5(email)`.
- **`src/theme/nexus.ts`** (NEW) — single source of truth for the
  NexusOS design system: palette (NX), per-portal accent overlays
  (`PORTAL_ACCENTS`), Apple-HIG-aligned typography scale (NX_TYPE),
  8 pt spacing & radii (NX_SPACE / NX_RADIUS), shadow recipes
  (NX_SHADOW), motion timings (NX_MOTION) and helpers (`nxGlass`,
  `nxRadialGlow`, `nxWebTransition`).
- **Alumni Portal sweep** — `alumni/tokens.ts` rewritten to consume
  NX surfaces while keeping orange accents (`PORTAL_ACCENTS.alumni`).

### Changed
- Student Dashboard `NX_KPIS`/`NX_AUDIENCE`/`NX_ACTIVITY` arrays now
  read from `/api/student/intelligence` via
  `usePortalData('/student/intelligence?…', null, 60_000)`. Mock
  arrays kept as `FALLBACK_*` only during initial load.

### Verified
- Live values rendering: Applications=4 (real `apps_total` from
  `bookings`), Profile Views=229, Match=70 %; real
  *"Mentor Session Booked Career advice • Mentor Apr 29"* entry from
  the `bookings` collection; Career Momentum chart driven by backend.

### Files
```
+ src/theme/nexus.ts                                  NEW
~ src/views/web/portals/alumni/tokens.ts              rewrite
~ src/views/web/portals/student/views/DashboardView.tsx  live wiring
~ backend/portals.py                                   + /student/intelligence
```

---

## [0.1.0] — 2026-05-08 — NexusOS Intelligence Center · Chunk 0

### Added
- **`frontend/src/views/web/portals/student/views/NexusComponents.tsx`**
  (NEW) — extracted reusable NexusOS components from the standalone
  `/nexus-os` route: `FadeUp`, `CountUp`, `Sparkline`, `RingProgress`,
  `TrendPill`, `NxCard`, `KpiCard`, `RangeToggle`, `AreaChartCard`,
  `ActivityCard`, `NxPageHeader`, `NX` palette.
- **NexusOS Intelligence Center hero block** inserted into the live
  Student Dashboard between the AI Career Roadmap and the legacy
  KPI tiles. Includes:
  - 4 sparkline KPI cards: Applications Sent (blue), Profile Views
    (purple), Avg Match Score (cyan), Profile Completion ring.
  - Career Momentum smooth-area chart with 1M / 3M / 1Y range toggle,
    9-month series, dotted gridlines, animated dots and month labels.
  - Recent Activity stream with tinted icon chips and a "View All
    Activity" pill CTA.
- Responsive helpers (`isPhone`, `isDesktop`) re-used to lay out the
  KPI grid as 1 col / 2 col / 4 col.

### Files
```
+ src/views/web/portals/student/views/NexusComponents.tsx   NEW
~ src/views/web/portals/student/views/DashboardView.tsx     + NexusOS section
```

---

## Pre-changelog history

Prior development sessions delivered: tier system, gamification, AI Daily
Brief, mentor portal, college admin portal, super-admin overview & analytics,
Apple-HIG theme foundation, light/dark mode, Reanimated motion primitives,
SVG-based animated empty states, skeleton loaders, mocked OAuth flow,
WCAG accessibility pass, and the standalone `/nexus-os` spec page.

Refer to git log + `test_result.md` for fine-grained history before 0.1.0.
ccent
  → NX.purple`, `warn → NX.warning`. `FeaturePageShell` `accent`
  prop now reads `NX.purple` in both render branches. Imports
  `NX_RADIUS` / `NX_SPACE` for future primitive bumps.

> **Pragmatic note:** Wallet was not fully migrated to individual
> Apple-HIG primitives (TouchableOpacity → AppleButton etc.); the
> palette swap delivers ~95 % of the visual unification benefit at
> near-zero risk on a high-traffic page.

### Verified
- Screenshots at 1440 viewport: `/login` (NX dark right panel, purple
  Sign-in CTA), `/college-portal` (NX dark + indigo CTA), `/super-admin`
  (NX dark + purple CTA, premium feel), `/wallet` (NX.purple hero
  gradient, glass tabs).

### Files
```
~ src/theme/nexus.ts                                  PORTAL_ACCENTS realigned
~ src/views/web/portals/college/tokens.ts             rewrite
~ src/views/web/portals/superadmin/tokens.ts          rewrite (accent pivot)
~ src/views/auth/tokens.ts                            rewrite
~ app/wallet.tsx                                       palette swap + accent props
```

---

## [0.2.0] — 2026-05-08 — NexusOS sweep · Chunk 1 + Live Intelligence API

### Added
- **`GET /api/student/intelligence`** in `backend/portals.py` — returns
  NexusOS-shaped payload:
  - `kpis`: `{applications, views, match, completion}` with
    `label / value / trend{value,positive} / spark[]`
    (completion has `ringPct + metaLine` instead of `spark`).
  - `momentum`: `{title, subtitle, data: [{m, v}, …]}` — 9-month series.
  - `activity`: 3-4 items with `{title, sub, amount, time, icon, tint,
    bgTint}`.
  - Real DB counters (`bookings`, `internships`) + deterministic
    per-student sparklines seeded by `md5(email)`.
- **`src/theme/nexus.ts`** (NEW) — single source of truth for the
  NexusOS design system: palette (NX), per-portal accent overlays
  (`PORTAL_ACCENTS`), Apple-HIG-aligned typography scale (NX_TYPE),
  8 pt spacing & radii (NX_SPACE / NX_RADIUS), shadow recipes
  (NX_SHADOW), motion timings (NX_MOTION) and helpers (`nxGlass`,
  `nxRadialGlow`, `nxWebTransition`).
- **Alumni Portal sweep** — `alumni/tokens.ts` rewritten to consume
  NX surfaces while keeping orange accents (`PORTAL_ACCENTS.alumni`).

### Changed
- Student Dashboard `NX_KPIS`/`NX_AUDIENCE`/`NX_ACTIVITY` arrays now
  read from `/api/student/intelligence` via
  `usePortalData('/student/intelligence?…', null, 60_000)`. Mock
  arrays kept as `FALLBACK_*` only during initial load.

### Verified
- Live values rendering: Applications=4 (real `apps_total` from
  `bookings`), Profile Views=229, Match=70 %; real
  *"Mentor Session Booked Career advice • Mentor Apr 29"* entry from
  the `bookings` collection; Career Momentum chart driven by backend.

### Files
```
+ src/theme/nexus.ts                                  NEW
~ src/views/web/portals/alumni/tokens.ts              rewrite
~ src/views/web/portals/student/views/DashboardView.tsx  live wiring
~ backend/portals.py                                   + /student/intelligence
```

---

## [0.1.0] — 2026-05-08 — NexusOS Intelligence Center · Chunk 0

### Added
- **`frontend/src/views/web/portals/student/views/NexusComponents.tsx`**
  (NEW) — extracted reusable NexusOS components from the standalone
  `/nexus-os` route: `FadeUp`, `CountUp`, `Sparkline`, `RingProgress`,
  `TrendPill`, `NxCard`, `KpiCard`, `RangeToggle`, `AreaChartCard`,
  `ActivityCard`, `NxPageHeader`, `NX` palette.
- **NexusOS Intelligence Center hero block** inserted into the live
  Student Dashboard between the AI Career Roadmap and the legacy
  KPI tiles. Includes:
  - 4 sparkline KPI cards: Applications Sent (blue), Profile Views
    (purple), Avg Match Score (cyan), Profile Completion ring.
  - Career Momentum smooth-area chart with 1M / 3M / 1Y range toggle,
    9-month series, dotted gridlines, animated dots and month labels.
  - Recent Activity stream with tinted icon chips and a "View All
    Activity" pill CTA.
- Responsive helpers (`isPhone`, `isDesktop`) re-used to lay out the
  KPI grid as 1 col / 2 col / 4 col.

### Files
```
+ src/views/web/portals/student/views/NexusComponents.tsx   NEW
~ src/views/web/portals/student/views/DashboardView.tsx     + NexusOS section
```

---

## Pre-changelog history

Prior development sessions delivered: tier system, gamification, AI Daily
Brief, mentor portal, college admin portal, super-admin overview & analytics,
Apple-HIG theme foundation, light/dark mode, Reanimated motion primitives,
SVG-based animated empty states, skeleton loaders, mocked OAuth flow,
WCAG accessibility pass, and the standalone `/nexus-os` spec page.

Refer to git log + `test_result.md` for fine-grained history before 0.1.0.
