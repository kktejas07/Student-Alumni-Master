# Changelog

All notable changes to this project are documented here. The format is loosely
based on [Keep a Changelog](https://keepachangelog.com/), with versions
following [Semantic Versioning](https://semver.org/).

Each entry below corresponds to a logical commit / development chunk shipped in
this session. Earlier history pre-dates this changelog.

---

## [Unreleased]

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
