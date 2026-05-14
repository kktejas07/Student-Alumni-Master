# 🚢 Release Notes — Push Plan

Logical commits taking the project from **`v0.6.0` → `v0.18.1`**. Each
commit maps 1:1 to a `CHANGELOG.md` section so reviewers can read the diff
and the release note side-by-side.

> Format: **Conventional Commits** (`type(scope): subject` + body). Tag each
> commit with the matching `vX.Y.Z` after pushing. Order matters — push them
> in sequence, oldest first.

**Latest tags (newest first):**

| Tag        | Headline                                                                                              | Surface                |
| ---------- | ----------------------------------------------------------------------------------------------------- | ---------------------- |
| `v0.18.1`  | FinTax360 polish — calmer aurora (no pink) · sidebar / topbar restyled · Outfit + Plus Jakarta fonts  | Student portal         |
| `v0.18.0`  | FinTax360 Glass-Dark theme — animated multicolor aurora · GlassCard / KpiTile / PillChip primitives   | Student portal         |
| `v0.17.0`  | Glass-morphism preview — first pass on Dashboard only (superseded by 0.18.0)                          | Student / Dashboard    |
| `v0.16.0`  | Agent K · Scheduled (cron) automations — APScheduler · 8 new endpoints · BYO-AI gated                 | Backend + Agent K UI   |
| `v0.15.0`  | Super Admin Settings drill-ins — Signature editor · Role-detail panel                                 | Super Admin            |
| `v0.14.0`  | Agent K · BYO-AI + Prescription Cards + single view                                                   | Agent K                |
| `v0.13.0`  | SA Events CRUD + multi-portal brand identities (Alumni / College / Mentor)                            | Super Admin · Portals  |
| `v0.12.0`  | Dokploy / Docker deployment readiness                                                                 | DevOps                 |

---

## Commit 8 — `v0.18.1`  ▸ FinTax360 polish: Sidebar + TopBar + calmer aurora

```text
style(student): calm aurora · restyle sidebar + topbar to FinTax360 (v0.18.1)

- Aurora: removed rose/pink orb entirely. Remaining three orbs (violet,
  blue, teal) reduced to 0.16-0.26 opacity with 140-160px blur so the
  canvas reads as a plain dark navy with subtle color hints.
- Sidebar: translucent navy rgba(10,15,30,0.72) + backdrop-filter
  blur(24px) saturate(160%). Active nav pill uses the spec
  [#8B5CF6 → #7C3AED] gradient with violetGlow shadow. Brand title and
  nav labels migrated to Outfit / Plus Jakarta typography.
- TopBar: matching navy glass + Outfit 700 greeting (18px, -0.5
  letterSpacing). Search box, theme toggle, bell button reskinned to
  FinTax360 glass-soft surfaces.

Files: glass.tsx · Sidebar.tsx · TopBar.tsx

Refs: CHANGELOG.md §0.18.1
```

---

## Commit 7 — `v0.18.0`  ▸ FinTax360 Glass-Dark theme (Student portal foundation)

```text
feat(student): FinTax360 Glass-Dark theme — palette · typography · primitives (v0.18.0)

- PALETTE: navy canvas (#0a0f1e → #131938), violet primary (#8B5CF6 /
  #7C3AED), semantic accents (blue #3B82F6, teal #10B981, amber #F59E0B,
  rose #f43f5e), glass surfaces rgba(20,26,45,0.55), violet glow
  shadow. Legacy SC tokens kept as aliases for unmigrated views.
- Typography: Outfit (display), Plus Jakarta Sans (body), JetBrains
  Mono (KPI numerics) via @expo-google-fonts. Loaded in app/_layout.tsx.
- Primitives in glass.tsx: <AnimatedAurora>, <GridOverlay>, <GlassCard>
  (fade+slide mount, hover lift, press scale), <GlassSoft>, <KpiTile>,
  <PillChip>, <GradientButton>, <RouteTransition>, glassStyle() helper.
- Shell wiring: StudentPortalRN renders AnimatedAurora + GridOverlay
  + RouteTransition. Every student view inherits the canvas + transition.

Deps: @expo-google-fonts/plus-jakarta-sans, @expo-google-fonts/jetbrains-mono

Files: tokens.ts · glass.tsx · StudentPortalRN.tsx · DashboardView.tsx
       · app/_layout.tsx · package.json

Refs: CHANGELOG.md §0.18.0
```

---

## Commit 6 — `v0.17.0`  ▸ Glass-morphism preview (Dashboard only)

```text
feat(student): glass-morphism dark+purple preview on Dashboard (v0.17.0)

First-cut glass effect applied only to DashboardView so the team could
review the look. Aurora gradients behind cards, translucent purple-
tinted fills, top white-alpha highlights. Superseded by v0.18.0 but
the <GlassSurface> + glassStyle() primitives remain as compatibility
aliases for the new system.

Files: glass.tsx (initial) · DashboardView.tsx · tokens.ts

Refs: CHANGELOG.md §0.17.0
```

---

## Commit 5 — `v0.16.0`  ▸ Agent K · Scheduled (cron) automations

```text
feat(agent-k): scheduled cron automations · APScheduler · 8 endpoints (v0.16.0)

- agent_k_scheduled.py (new, ~450 LOC) — APScheduler AsyncIOScheduler
  with 60-second tick polling agent_k_schedules collection. Indexes on
  (status, next_run_at) and (user_id, created_at). Lock-protected tick
  reserves due rows by bumping next_run_at forward so a slow run can't
  double-fire. Plans containing spend/submit/communicate steps pause
  at approval rather than auto-execute. Admin bypasses BYO-AI gate.

- 8 REST endpoints under /api:
    GET    /agent-k/scheduled
    POST   /agent-k/scheduled            cadence: daily / weekly / hourly / cron
    GET    /agent-k/scheduled/{id}
    PATCH  /agent-k/scheduled/{id}       status pause/resume + edits
    DELETE /agent-k/scheduled/{id}
    POST   /agent-k/scheduled/{id}/run-now
    GET    /agent-k/scheduled/{id}/runs
    GET    /agent-k/scheduled-meta/cadences

- Frontend: <ScheduleEditor> modal (title prefilled, cadence chips,
  hour/minute/weekday/N-hours/cron fields, IANA timezone). "Scheduled
  Automations" section on /agent-k with cadence pill, next-run
  timestamp, last status, and run-now / pause-resume / delete buttons.

- Deps: APScheduler 3.10.4 · croniter 2.0.5 · pytz 2026.2 · tzlocal 5.3.1
- Multi-replica safety: AGENT_K_SCHEDULER_ENABLED env flag (see
  DOKPLOY.md §10).

Verified: 44/44 backend assertions PASS (deep_testing_backend_v2).

Files: backend/agent_k_scheduled.py · server.py · requirements.txt
       · frontend/app/agent-k.tsx · DOKPLOY.md · CHANGELOG.md

Refs: CHANGELOG.md §0.16.0
```

---

## Build variants — bumped this release

| Channel              | Identifier          | Version | Build #     |
| -------------------- | ------------------- | ------- | ----------- |
| `frontend` (NPM)     | `frontend`          | 0.18.1  | —           |
| Expo iOS             | `com.careerpath.app`| 1.1.0   | 18          |
| Expo Android         | `com.careerpath.app`| 1.1.0   | 18 (vc 18)  |
| Splash backgroundColor + Android adaptive icon backgroundColor migrated from cream `#FDFBF7` → navy `#0a0f1e` to match the FinTax360 dark theme. |



---

## Commit 1 — `v0.7.0`  ▸ Imports auto-distribution + College auto-onboarding

```text
feat(admin): auto-distribute imports + auto-onboard & enrich colleges (v0.7.0)

- Imports router now routes each row into the correct directory (students /
  mentors / alumni) by `category` and emits a directory-distribution event
  so the relevant grid revalidates without a refresh.
- New `backend/admin_colleges.py` module:
  • POST /api/admin/colleges/auto-onboard — normalises + dedupes raw college
    names, creates rows with enrichment_status="pending".
  • Hipolabs Universities API → country, domains, web_pages.
  • Wikipedia REST API → description, logo_url, tier, rank, specialties.
  • POST /api/admin/colleges/backfill — idempotent sweep over existing users.
  • GET  /api/admin/colleges — paginated, status-filterable list.
- CollegesView consumes the new endpoints.

Refs: CHANGELOG.md §0.7.0
```

**Files**
```
A  backend/admin_colleges.py
M  backend/admin_imports.py
M  backend/server.py
M  frontend/src/views/web/portals/superadmin/views/CollegesView.tsx
```

---

## Commit 2 — `v0.8.0`  ▸ Apple HIG / Amber Admin design sweep

```text
feat(ui): Apple-HIG Amber Admin design sweep across Super Admin (v0.8.0)

Introduce a single design language for the Super Admin portal.

- New `applekit.tsx` primitives — amber token palette, 8-pt spacing, SF-style
  typography ramp, soft-shadow surface elevation. Exports: <Card />,
  <Section />, <HeaderBar />, <StatTile />, <RowAction />, <SelectionBar />,
  <EmptyState />, <Toast />.
- Reskinned with applekit:
  Overview, Approvals, Imports, Colleges, UserDirectory (Students / Mentors /
  Alumni), Events, Payments, Analytics.
- Tabular grids replaced with information-dense cards optimised for the
  desktop super-admin workflow.

Refs: CHANGELOG.md §0.8.0
```

**Files**
```
A  frontend/src/views/web/portals/superadmin/views/applekit.tsx
M  .../views/{Overview,Approvals,Imports,Colleges,UserDirectory,Events,
              Payments,Analytics}View.tsx
```

---

## Commit 3 — `v0.9.0`  ▸ Marketplace × 62 AI tools + Connect modal + Test connection

```text
feat(marketplace): 62 AI/tooling integrations + ConnectModal + live test (v0.9.0)

- Registered 62 tools (OpenAI, Anthropic, Gemini, Stripe, Razorpay, Notion,
  Slack, SendGrid, Twilio, LinkedIn, Calendly, Zoom, HubSpot, …) with
  id / name / category / auth_kind / required fields / docs URL / brand colour.
- <ConnectModal /> — Apple-HIG glass sheet rendering the right form per
  auth_kind (api_key | oauth | webhook), masks secrets, persists to
  `installed_tools` collection (encrypted with FERNET_KEY when set).
- POST /api/marketplace/test — live connectivity probe per category, hits
  provider's lightest authenticated endpoint and returns
  {ok, status, latency_ms, message}. Surfaced as a "Test connection" button
  with inline ✓ / ✗ + latency badge on every installed tool card.
- Grid now groups by category with sticky section headers
  (AI, Payments, Comms, Analytics, Productivity, CRM).

Refs: CHANGELOG.md §0.9.0
```

**Files**
```
M  backend/admin_settings.py
M  frontend/src/views/web/portals/superadmin/views/MarketplaceView.tsx
A  frontend/src/views/web/portals/superadmin/views/ConnectModal.tsx
```

---

## Commit 4 — `v0.10.0`  ▸ Bulk approve / disable on directory grids

```text
feat(admin): bulk approve / disable across directory grids (v0.10.0)

- Selection mode on UserDirectoryView (Students / Mentors / Alumni) and
  CollegesView — tap "Select" in the toolbar → row checkboxes appear.
- Sticky <SelectionBar /> with live count + "Approve selected" /
  "Disable selected" / "Clear" actions and confirmation dialog.
- POST /api/admin/super/users/bulk-action — idempotent, role-guarded,
  accepts { ids: [], action: "approve" | "disable" }. Writes one audit-log
  row per id. Optimistic UI patch + background revalidate on success.

Refs: CHANGELOG.md §0.10.0
```

**Files**
```
M  frontend/.../views/UserDirectoryView.tsx
M  frontend/.../views/CollegesView.tsx
M  frontend/.../views/applekit.tsx          # <SelectionBar />
M  backend/server.py                        # /users/bulk-action
```

---

## Commit 5 — `v0.11.0`  ▸ Auth hardening + Events timezone fix

```text
fix(auth,events): wait-and-retry token + tz-aware events datetimes (v0.11.0)

- frontend/src/models/services/api.ts — wait up to ~900 ms for AsyncStorage
  to hydrate the JWT, then retry once on a 401 with the fresh token. Fixes
  random empty Super Admin states on first paint.
- /super-admin route now guards on token presence and re-checks after
  hydration completes (redirects to /login otherwise).
- GET /api/admin/super/events 500 fixed — all datetimes now produced via
  `datetime.now(timezone.utc)` and compared consistently.

Refs: CHANGELOG.md §0.11.0
```

**Files**
```
M  frontend/src/models/services/api.ts
M  frontend/app/super-admin.tsx
M  backend/server.py     # events router tz fix
```

---

## Commit 6 — `v0.12.0`  ▸ Dokploy / Docker deployment readiness

```text
chore(deploy): Dokploy / Docker stack + DOKPLOY guide (v0.12.0)

Production-ready container stack for one-click VPS deployment via Dokploy
(or plain `docker compose` anywhere).

- backend/Dockerfile — Python 3.12-slim, non-root appuser, uvicorn with
  --proxy-headers, configurable UVICORN_WORKERS, HEALTHCHECK → /api/health.
- frontend/Dockerfile — 2-stage build: Node 20-alpine `expo export
  --platform web` → nginx 1.27-alpine. Hard-fails if EXPO_PUBLIC_BACKEND_URL
  build-arg is missing (prevents "undefined" baked-in URL bug).
- frontend/nginx.conf — SPA history fallback, gzip, 30d immutable cache for
  hashed assets, JSON /healthz, security headers, X-Forwarded-For honoured.
- docker-compose.yml — both services, healthchecks, depends_on:
  service_healthy, restart policies, JSON-file log rotation.
- .env.example — every env var documented with generation hints
  (openssl rand -hex 32, Fernet.generate_key()).
- backend/.dockerignore + frontend/.dockerignore — lean build contexts.
- DOKPLOY.md — step-by-step VPS walkthrough: prerequisites, GitHub push,
  Dokploy 2-service setup, build-arg vs runtime-env, domain + HTTPS via
  Traefik, verification curls, 9-row troubleshooting table.
- backend/server.py — CORS reads ALLOWED_ORIGINS + ALLOWED_ORIGIN_REGEX
  from env, auto-flips allow_credentials=False when "*" is present.
  Added GET /api/health and GET /health that ping Mongo.
- frontend/package.json — version bumped to 0.12.0.

Refs: CHANGELOG.md §0.12.0
```

**Files**
```
A  backend/Dockerfile
A  backend/.dockerignore
A  frontend/Dockerfile
A  frontend/nginx.conf
A  frontend/.dockerignore
A  docker-compose.yml
A  .env.example
A  DOKPLOY.md
M  backend/server.py
M  frontend/package.json
M  CHANGELOG.md
```

---

## 🏷️ Push & tag sequence

```bash
# After staging each chunk above as its own commit, in this order:
git tag -a v0.7.0  -m "Imports auto-distribution + College auto-onboard/enrichment"
git tag -a v0.8.0  -m "Apple HIG / Amber Admin design sweep"
git tag -a v0.9.0  -m "Marketplace × 62 tools + Connect modal + Test connection"
git tag -a v0.10.0 -m "Bulk approve / disable on directory grids"
git tag -a v0.11.0 -m "Auth hardening + Events timezone fix"
git tag -a v0.12.0 -m "Dokploy / Docker deployment readiness"

git push origin main
git push origin --tags
```

> If you'd rather ship everything as one big commit/tag, use
> `feat: NexusOS Super-Admin sweep + Dokploy deployment readiness (v0.12.0)`
> as the subject and paste the body of all six sections concatenated under
> ### Highlights.
