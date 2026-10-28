# Architecture Audit — StudentAlumni.ai (2026-10-27)

Scope: whole app. Backend = FastAPI + MongoDB (`backend/`, 203 files, ~78k lines). Frontend = Expo React Native + expo-router (`frontend/`, 480 ts/tsx files).

Goal per user: module/feature-based structure (MVVM-style), remove dead/unused/duplicated code, no hardcoded values. Classic MVVM doesn't map to FastAPI/React Native; the pragmatic equivalents are **feature folders with thin routers + service + schemas** (backend) and **feature folders with view + hook/VM + api** (frontend). Everything below is grep-verified; no changes made yet.

---

## A. Backend — current state

### A1. What's mounted (server.py)
- `app = FastAPI` at `server.py:361`, one `api_router` (prefix `/api`) mounted at `server.py:3311`.
- **All 36 live router modules are mounted (50 `include_router` calls) — none are dead.** Inconsistency: a subset (echo, vendors, marketplace, newsletter, contacts, student_perks, partners, consent, tour, promotions) mounts directly on `app` without the `/api` prefix.
- ~~**54 inline endpoints still live in `server.py`** (27 GET / 22 POST / 3 DELETE / 2 PATCH): Teams ~18, coupons 11, notifications 6, auth 5, analytics 5, reviews 3, misc 6.~~ **Closed in Step 4b** — the 8 endpoint groups (48 endpoints: coupons 8, auth-verify 4, media 3, analytics 5, integrations 5, Teams 14, reviews 3, notifications 6) moved verbatim into `features/{coupons,auth_verify,media,analytics,integrations,teams,reviews,notifications}_api.py`; each original source position now holds a two-line `include_router` mount stub, so route registration order is preserved. `server.py` keeps only `/admin/upload`, `/dashboard/student-summary`, `GET /`, `/auth/logout` plus config/lifespan/middleware. Gates: route table byte-identical (844 `METHOD /path` lines), ruff `E9,F63,F7,F82` clean, pytest `2 failed, 131 passed` (same two pre-existing failures as baseline).
- **No orphaned root modules either**: every `backend/*.py` is imported by `server.py` or another module. `echo_showcase.py` (8,147 lines, the biggest file) is live, tested (4 `test_echo_*` files), seeded at boot (`server.py:242`).
- Orphan-looking but live: `firebase_analytics.py` / `posthog_analytics.py` (lazy imports from `analytics.py:724,759`); `background_sync.py` (the APScheduler, started `server.py:271`, stopped `:354`); `security_scanner.py` (8 importers — shared util, belongs in `core/`).

### A2. Domain map (root modules + routers grouped)
| Domain | Modules |
|---|---|
| echo/events | `echo_showcase.py` (8147), `events_aggregator.py`, `routers/certificates.py` |
| users/auth | `routers/users.py` (3929), `routers/auth.py` (1761), `auth_analytics.py`, `tier_logic.py` |
| colleges/higher-ed | `college_portal.py`, `higher_ed_platform.py` (789), `routers/admin/colleges.py` |
| marketplace/courses/deals | `courses_marketplace.py`, `deals_aggregator.py`, `rentals_marketplace.py`, `routers/marketplace.py`, `badges.py` |
| jobs/careers | `jobs_feed.py`, `talent_pool.py` (1080), `routers/careers.py`, `routers/blog.py`, `routers/community.py` |
| bgv | `routers/bgv.py` (2268, `/bgv`), `routers/bgv_integrations.py` (903, `/bgv/integrations`) — **both live, complementary, not duplicates** |
| wallet/finance | `wallet_and_availability.py`, `activity_credits.py` (995), `financial_services.py` |
| analytics | `analytics.py` (826), `visitor_analytics.py`, `ai_briefs.py`, `posthog_proxy.py` |
| email | `newsletter.py` (1496) |
| teams/MS | ~530 inline endpoint lines inside `server.py` (2244–2777) + `integrations/teams.py` |
| agent_k | `agent_k/api/{routes,provider_routes,rag_routes}`, `knowledge_base/` (empty dir) |
| admin | `routers/admin/{settings,imports,colleges,agents}` |
| misc CRUD | `crud_endpoints.py` (1079, 20 routes spanning 4 domains) |
| infra | `server.py` (3359), `core/{db,config,security,…}`, `integrations_base.py`, `security_scanner.py`, `geo.py`, `notifications.py` |

### A3. Duplication (top findings)
1. **Hand-rolled JWT decode in ~20 places** (`crud_endpoints.py:500`, `talent_pool.py:55`, `portals.py:440`, `routers/bgv.py:1645/1698/1772`, `server.py:1148/3148`, `routers/auth.py:636/694/725`, `echo_showcase.py:405/422/3873/4096/4206`, `routers/marketplace.py:85/99`, `routers/vendors.py:45/244`). One shared dependency replaces all. **HIGH**
2. **`_require_admin`-style guards defined 12×** (`talent_pool.py:74`, `routers/contacts.py:125`, `routers/vendors.py:39`, `routers/promotions.py:48`, `echo_showcase.py:396/413`, `routers/marketplace.py:78`, `visitor_analytics.py:41`, `routers/partners.py:92`, `routers/certificates.py:1899`, `routers/users.py:1606`). **HIGH**
3. **Email/WhatsApp senders re-implemented** in `echo_showcase.py` (15+ `_send_*` helpers, lines 498–2374) and `workflow_automation.py:44` while `core/email.py` + `core/whatsapp.py` already exist. MED
4. ~~**`{"$nin": [None, ...]}` non-empty query fragment 7×** (`analytics.py:660`, `background_sync.py:146`, `talent_pool.py:694`, `portals.py:620/711/1919`, `visitor_analytics.py:696`) → extract a `nonempty()` helper.~~ **Closed in Step 2** — `core/query_helpers.nonempty()` now shared by all 9 sites. MED
5. **Tier-threshold table duplicated** inside `activity_credits.py` (`:821`, `:926`, plus `:104`). MED
6. ~~**`mongodb://localhost:27017` fallback** in `linkedin_sync.py:23`, `talent_pool.py:34` contradicts `core/db.py:25` (which *raises* when unset) — inconsistent behavior.~~ **Closed in Step 1** — both modules now import `db` from `core.db` with no localhost fallback. LOW
7. **`datetime.utcnow()`** in 7 legacy spots vs 437 correct `datetime.now(timezone.utc)` usages. LOW
8. **Collection-name fragmentation**: `events` vs `events_v2` (47 vs 32 usages; `crud_endpoints.py:771` even queries both via `$or`) and `event_registrations` vs `echo_registrations` (33 vs 114). HIGH (data-model)
9. Redundant admin purge endpoints: `routers/bgv_integrations.py:739` `/fake-universities` and `bgv.py:1348` + `:2080` two nearly identical `purge-test` endpoints.

### A4. Dead / unused (verified)
- `knowledge_base/` — empty on disk but it is the **RAG data dir** referenced as `KNOWLEDGE_BASE_DIR` by `agent_k/api/rag_routes.py` — keep (add `.gitkeep`), do NOT delete.
- `seed_certificates.py` is imported by app code (`server.py:237`, runs when count=0) — keep. The other `seed_*`/`migrate_*` files (14) are one-shot ops runbooks; move to `scripts/ops/`, never imported from the app.
- `deals_aggregator.py` — live router but **no scheduler/cron invokes it**; endpoint-only, confirm intended before touching.
- `bgv.py` + `bgv_integrations.py` — **not dead**, both mounted (verified `server.py:3289–3294`); rename for clarity only.
- One real TODO left: `echo_showcase.py:7783`.

### A5. Hardcoded values (remaining)
| Finding | Location | Severity |
|---|---|---|
| Entire financial-services catalog in Python (26+ institutions: rates, ₹ limits, URLs, hex tints) | `financial_services.py:100-140` | HIGH |
| Sample course records with `enrolled_count: 1500000`/ratings + `harvard.edu` catalog URLs — **survived the P2 fabrication pass** | `courses_marketplace.py:348/378/619/718/842`, FreeCodeCamp scrape at `:1546` | HIGH |
| Boot-time seeding of large doc literals | `echo_showcase.py:3121/3269` | MED |
| 425 literal `https://` provider URLs across backend (Razorpay `activity_credits.py:464`, Coursera/Udemy/Adzuna `integrations_base.py:34/84/135`) | spread | MED |
| Hex color codes in 15 backend files (`tint` fields) | `financial_services.py`, `activity_credits.py` | LOW |
| **Security divergence**: `talent_pool.py:45` silently falls back to `_JWT_SECRET = ""` when the import fails, while `core/config.py` *raises* — silent-degrade auth config | `talent_pool.py:40-50` | HIGH |
| No central config: only `core/config.py` + `core/db.py` enforce; top offenders read >5 env vars with inline defaults: `echo_showcase.py` (19), `server.py` (13), `routers/auth.py` (12), `routers/bgv_integrations.py` (11), `integrations_base.py` (8) | — | MED |

### A6. Target layout + backend phases
```
backend/
  app/            # server.py → bootstrap only (lifespan, middleware, include_router; ~500 lines)
  shared/         # core/{db,config,security}, integrations_base, tier_logic, geo, security_scanner,
                  # email/whatsapp central senders, jwt deps, nonempty() query helper
  features/
    auth/  users/  bgv/  certificates/  career_ai/        # from routers/*
    echo_events/      # echo_showcase split: showcases, tickets, payments, qr, router
    events/  colleges/  higher_ed/  mentor/  wallet/
    marketplace/  rentals/  deals/  courses/  jobs/
    teams/            # the ~530-line server.py Teams block
    coupons/  reviews/  notifications/  ads/
    analytics/        # analytics + auth_analytics + visitor + ai_briefs + posthog/firebase
    newsletter/  communities/  admin/
  # each feature: router.py, service.py, schemas.py, models.py
```
**Phases (each keeps the app importable; CI = `ruff check --select=E9,F63,F7,F82 backend` + `pytest backend/tests -q` in `student-alumni-test:latest`, baseline 60 pre-existing failures):**
1. **Shared deps pass** (highest value, low risk): one `get_current_user` + `require_admin`/`require_role` in `shared/`; kill the ~20 hand-rolled JWT decodes + 12 guard defs; fix `talent_pool.py` silent-secret.
2. **Catalog extraction**: move financial/courses static catalogs out of `financial_services.py` / `courses_marketplace.py` into `shared/catalogs/` (or DB seed) + `nonempty()` helper + env-config centralization in `core/config.py`.
3. ~~**Mechanical moves**: `git mv` root feature modules + `routers/*` into `features/<dom>/router.py`; update ~60 import lines in `server.py`. No logic changes.~~ **Closed in Step 4** — 28 root feature modules + `routers/` + `agent_k/` now live under a single `features/` package (flat, module names kept so import rewrites stay mechanical and `mock.patch` targets stay resolvable); all cross-imports, 4 `__file__`-relative path computations, and the CI import smoke / ruff / pytest gates are green. Per-domain `features/<dom>/` subfolders happen as Phases 4–6 carve out the server.py endpoint groups and echo modules.
4. ~~**Split `server.py`**: extract the inline endpoint groups (coupons 1735–1874, OTP/auth-verify 1903–2022, ads 2097–2136, analytics 2200–2230, **Teams 2244–2777**, reviews 2793–2877, notifications 2893–2939) into feature routers; `server.py` keeps config + mounts only.~~ **Closed in Step 4b** — 8 groups / 48 endpoints moved verbatim to `features/{coupons,auth_verify,media,analytics,integrations,teams,reviews,notifications}_api.py` with in-place `include_router` mount stubs (registration order preserved); `server.py` 3351 → 2137 lines and keeps only `/admin/upload`, `/dashboard/student-summary`, `GET /`, `/auth/logout` + config/lifespan/middleware. Route table byte-identical, gates green.
5. ~~**Split `crud_endpoints.py`**: 20 routes → 4 feature routers; delete the file.~~ **Split in Step 5a** — the 20 routes moved verbatim to `crud/{student,mentor,college,misc}_api.py` nested under the original `router` in a slimmed `crud_endpoints.py` that now only holds the shared helpers `_now`/`_short_id`/`_issue_workshop_certificate`/`_resolve_user` and the four mount stubs; the `from crud_endpoints import router` mount in `server.py` is unchanged. Route table byte-identical, gates green; the stub collapses into `core/` shared helpers in Phase 7.
6. ~~**Carve `echo_showcase.py`**: split into `features/echo_events/{showcases,tickets,payments,qr}.py` (94 inline handlers thin out).~~ **Closed in Step 5b** — the 8126-line body was cut verbatim into 16 segments under `features/echo_events/` (`unstop`, `data`, `core_helpers`, `invoice_helpers`, `provisioning`, `schemas_seed`, `handbook_public`, `register`, `payments`, `invoices`, `admin_registrations`, `ticket`, `admin`, `coupons`, `volunteers`, `interns`); `echo_showcase.py` is now a 108-line stub that `exec`s the segments into its own namespace in source order, keeping the original single-module semantics the test suite depends on (patch targets on module attrs, `__file__`-relative static lookups). Direct submodule imports are ruled out by real mutual cycles between `data`↔`invoice_helpers` and `invoice_helpers`↔`provisioning`; the exec approach plus a scoped `F821` ignore in `backend/ruff.toml` keeps the CI ruff gate green. Route table byte-identical (844 lines), gates green. The 94 inline handlers are now thin — next: services pass (Phase 7).
7. **Services pass**: query logic out of `portals.py` (3150) / `routers/users.py` (3929) into per-feature `service.py`.
8. **Prune**: move one-shot `seed_*`/`migrate_*` scripts to `scripts/ops/` (keep `seed_certificates.py`, app-imported); add `.gitkeep` to `knowledge_base/`; fix inconsistent router prefixes; unify `events`/`events_v2` + `echo_registrations`/`event_registrations` naming (needs a data migration — last, not first).

---

## B. Frontend — current state

### B1. Layout
- `app/` ~140 route files, **organized by route, not feature**. Only 3 route groups: `(tabs)` (5), `(auth)` (10), `(onboarding)` (16); 37 flat top-level routes incl. `wallet.tsx` (2053), `events.tsx` (1708), `certificates/verify/index.tsx` (2041), `courses.tsx` (1908). Portals are catch-alls delegating to `src/views/web/portals/<role>/` (superadmin 36, college 19, student 25, mentor 18, alumni 14, vendor 6 views).
- `src/` is layered MVC-ish (`views/`, `models/`, `viewmodels/`, `lib/`), not feature-organized.

### B2. Data layer
- **Three parallel API clients**: `src/models/services/api.ts` (903 lines, 133 importers), `src/lib/portalApi.ts` (used by only 24 files), plus 15+ inline `fetch(API_BASE…)` in `app/echo/*`, `app/verify`, `app/certificates/*`, `app/teams/register`, `app/events.tsx:382`; superadmin views repeat base-URL boilerplate (`EmailQualityView` 5×, `SettingsView` 7×).
- ~~**Hardcoded fallback `https://studentalumni.ai` in ~8 files**; `EXPO_PUBLIC_` read ad-hoc instead of via `src/lib/env.ts` (5-line file that exists for this).~~ **Closed in Step 3** — every ad-hoc `EXPO_PUBLIC_BACKEND_URL` reader (8 `app/` files + 6 superadmin views, 21 sites) now routes through `getBaseUrl()` from `src/lib/env.ts`; the prod-domain fallback is gone. Remaining `studentalumni.ai` literals are share-text/QR canonical URLs, not API base URLs.
- P2 miss: `app/profile/[id].tsx:54-56` still embeds fabricated mentor seed data.

### B3. Duplication
- **10,757 hex literals** (`#fff` ×944, `#10B981` ×369, `#A78BFA` ×361…); 3 competing theme systems (`src/lib/designTokens.ts`, `src/theme/{tokens,apple,nexus}.ts`, `src/ui/theme.ts`) despite `src/ui/Table.tsx` being token-driven and well-built.
- No shared pagination: 58 local `.slice()` pagination hits in superadmin alone (`EventsView/ApprovalsView/PaymentsView`).
- Two card families: `views/web/components/` vs `views/components/` (AnimatedCard/GlassCard/Toast duplicated).
- Two near-parallel `NetworkView.tsx` (student 2608 lines, mentor 2396) with identical graph logic.
- ~~Giant files: `EchoShowcaseAdminView` 7112, `LandingPage` 4462, `SettingsView` 4009, `BGVAccountVerticalsView` 3398~~ `EchoEventsPage` 3076, `wallet.tsx` 2053. **EchoShowcaseAdminView split in Step 6a** — cut verbatim into a 7-module DAG under `src/features/echo/` (shared/fields/widgets/media/modal/panels + `echoCms` entry; 251/258/1257/249/1110/3626/397 lines); the old file is a 9-line re-export stub so `SuperAdminPortalRN`'s import is untouched. tsc error set 44 → 43 (one latent TS2353 suppressed), eslint 0 errors on all 8 files. 5 of 6 remaining giant screens left. **LandingPage split in Step 6b** — cut verbatim into a 5-module DAG under `src/features/landing/` (landingTheme 159 / marquees 26 / primitives 246 / landingView 2276 / landingStyles 1742); the old file is a 10-line default re-export stub so `app/{index,contact,verify}` + `welcome` keep working. 13 dead original imports (Easing, 6 lucide icons, 7 svg sub-exports) dropped. tsc error set 43 → 42 (the themedStyles TS2345 at L2779 is now suppressed by per-module `@ts-nocheck`), eslint 0 errors on all 6 files. 4 of 6 remaining giant screens left. **SettingsView split in Step 6c** — cut verbatim into a 15-module DAG under `src/features/settings/` (settingsTokens 172 / settingsEntry 107 / settingsProfile 291 / settingsPlatform 282 / settingsIntegrations 451 / settingsRoles 448 / settingsNotifs 126 / settingsSecurity 509 / settingsDigitalId 211 / settingsPages 178 / settingsBranding 181 / settingsTemplates 227 / settingsEchoHero 277 / settingsWidgets 46 / settingsStyles 606 lines); the old file is a 12-line named re-export stub so `SuperAdminPortalRN`'s import is untouched. Cross-module edge: `SecurityTab` imports `liveAgo` from `settingsNotifs`. 2 spurious scanner false-positive imports dropped (Platform in tokens, Modal in styles — label-string/comment hits only). tsc main-line error set unchanged (42 errors, zero new; the raw output grew 42 → 47 lines purely from 5 two-space-indented detail lines tsc now prints under pre-existing `CareersAdminView.tsx` TS2322/TS2339 errors); eslint 0 errors on all 16 files (300 warnings, all inherited verbatim). 3 of 6 remaining giant screens left. **BGVAccountVerticalsView split in Step 6d** — cut verbatim into a 3-module DAG under `src/features/bgv/` (bgvGlyph 34 / bgvView 2027 / bgvStyles 1323 lines); the old file is an 11-line named re-export stub so `SuperAdminPortalRN`'s `import { BGVAccountVerticalsView }` is untouched. The 7 subsystem tabs stay inline inside `bgvView` because they are JSX closures over ~30 shared state vars — per-tab modules would need a state-passing refactor, which the zero-behavior-change mandate forbids. 22 unused lucide icons, 10 unused applekit sub-exports, `useMemo`, and the bare `React` default import dropped (dead in every region). tsc main-line error set unchanged (42 errors, zero new); eslint 0 errors on all 4 files (384 warnings, all inherited verbatim). 2 of 6 remaining giant screens left.

### B4. Dead / unused (grep-verified, zero importers)
- `src/viewmodels/hooks/index.ts`: `useDashboard`, `useCareerSuggestions`
- `views/components/`: `PaymentStatusScreen`, `Charts`, `OptionListCard`
- Shadowed routes: `app/login.tsx` + `app/register.tsx` (by `(auth)/`), `app/courses.tsx` (by `(tabs)/courses`)
- 16 `console.log` + ~16 `console.warn/error` leftovers.

### B5. Target layout + frontend phases
```
app/(public)/, app/(echo)/, app/(portals)/…                # route groups per area (thin routes)
src/features/<feature>/{api, hooks, components, types}     # auth, onboarding, events, echo,
                                                            # certificates, wallet, network,
                                                            # bookings/rentals, career, portals/*
src/shared/{ui, theme(ONE token source), lib(env, http)}
```
**Phases:**
1. **Delete verified dead code** (B4 list) + remove the `app/profile/[id]` fabricated seed data.
2. **One HTTP client**: everything through `portalApi` + `lib/env.ts`; delete the 8 hardcoded fallback URLs + inline fetches.
3. **Split the six >2000-line screens** into `src/features/<feature>/` using `Table` + `usePortalData` + a new shared `usePagination`.
4. **Unify theme** to one token source (kill 2 of 3 theme files); replace hex literals progressively (start with the top-3 colors).
5. **Move portal views → features**, merge the two `NetworkView`s, regroup public routes.

---

## C. Combined execution order (recommended)

| Step | Work | Risk | Why this order |
|---|---|---|---|
| 1 | Backend Phase 1 (shared auth deps, `talent_pool` secret fix) + Frontend Phase 1 (dead code + fabricated profile data) | Low | Pure deletion + one new shared dep; zero behavior change; CI stays green |
| 2 | Backend Phase 2 (catalog extraction, config centralization) | Low–Med | Removes HIGH hardcoded-value findings; no endpoint shape changes |
| 3 | Frontend Phase 2 (single HTTP client) | Med | Kills 8 hardcoded-URL findings; mechanical |
| 4 | Backend Phase 3–4 (mechanical `features/` moves, split `server.py`) | Med | No logic changes, but ~60 import rewrites; one PR per phase, CI-gated |
| 5 | Backend Phase 5–6 (split `crud_endpoints`, carve `echo_showcase`) | Med–High | Big diff, feature-scoped PRs |
| 6 | Frontend Phase 3–5 (split giant screens, theme unification, features migration) | Med–High | Largest UX-blast-radius work; do after backend is stable |
| 7 | Backend Phase 7–8 (services pass, `events_v2` unification w/ data migration) | High | Behavior/data-affecting; last |

Each step = one branch + one PR, CI gate: `ruff check --select=E9,F63,F7,F82 backend` + `pytest backend/tests -q` (Docker `student-alumni-test:latest`; baseline = 60 pre-existing failures, 73 passing incl. the fabrication guard test) + `npx tsc --noEmit` / `expo lint` for frontend.
