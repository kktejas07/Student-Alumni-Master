# Full-Stack / QA / DevOps Audit Report — Student Alumni Platform

**Date:** August 10, 2026
**Auditor:** Automated + manual (full-stack, QA, DevOps lens)
**Branch:** `dev-fixes`
**Method:** Static import-graph analysis, content hashing, dependency reference scans, CI/workflow inspection, runtime measurements, and manual code review with `file:line` evidence.

> Note: a previous report (`CODEBASE_AUDIT_REPORT.md`, Aug 7) covered file-level hygiene. This report re-verifies those findings and adds the **root-cause analysis for slow loading**, plus **security** and **CI/deploy** findings.

---

## 1. Executive Summary

| Area | Verdict |
|---|---|
| **Why the site is slow** | First-paint is blocked by 15 web fonts + auth init + an artificial 1.4 s splash; landing page ships ~2.5 MB of unoptimized PNGs, a 100 KB render-blocking CSS, a CJS `framer-motion` bundle, and a 2000-star canvas animation loop. Backend boots in ~12 s and does ≥2 Mongo round-trips on every authenticated request. |
| **Security** | **Hardcoded production Mongo Atlas credentials** and **hardcoded JWT secret** in source. |
| **Dead code** | ~49 one-off scripts at repo root, ~46 in `backend/`, ~15 orphan frontend files, 2 conflicting route pairs, 3 byte-identical portal files. |
| **Repo bloat** | **784 files** of committed test artifacts / vendored runtimes / log dumps tracked in git (~70 MB+, plus 327 MB `.git` history). |
| **CI/Deploy** | Deploy workflow (`03-deploy.yml`) is **broken** — placeholders never expanded, hardcoded service names. |
| **Dependencies** | ~15 unused npm packages; ~10 unused direct Python deps; 4 GB of local build caches. |

**Bottom line:** The core app code is modest. The problems are (1) avoidable first-paint latency, (2) committed junk inflating every clone/deploy/image, and (3) a handful of genuine security and correctness bugs.

---

## 2. Performance — Why the Website Loads Slowly

### 2.1 Frontend first-paint is starved (biggest factor)

1. **The app renders nothing until 15 web fonts download** — `frontend/app/_layout.tsx:3-24` loads 5×DM Sans + 5×Outfit + 5×Manrope; the whole tree is gated behind `if ((!fontsLoaded && !fontError) || !initialized)` at `_layout.tsx:132`. On web each font face is a separate network request.
   - Evidence the fonts are genuinely failing/hanging: `_layout.tsx:41` suppresses `['6000ms timeout exceeded', 'fontfaceobserver']` and `_layout.tsx:98-118` swallows `6000ms timeout exceeded` errors — the 6 s `FontFaceObserver` timeout is being **hidden, not fixed**.
2. **Artificial 1.4 s splash delay** — `frontend/app/index.tsx:63`: `const delay = IS_WEB ? 1400 : 2000;`. Every web load waits ~1.4 s of dead time before `router.replace('/welcome')` (`index.tsx:67`).
3. **Heavy boot blockers mounted at root** — `_layout.tsx:172-176` mounts `AgentKQuickLauncher`, `ConsentBanner`, `TourProvider`, `TourOverlay` on every route. `AgentKQuickLauncher` pulls `@expo/vector-icons` full glyphmap + `react-native-paper` (whole library) into the root bundle.
4. **Landing page weight** — `app/welcome.tsx:15` imports `NexusLanding`, which fetches:
   - `frontend/public/sa-3d-shield.png` (668 KB), 4 big club logos (459–536 KB), ~19 logo images total → ~2.5 MB of PNGs above the fold (`Logos.tsx`, `AgentK3D.tsx:66`).
   - `frontend/src/nexus-glow-styles.css` (102 KB, render-blocking) imported at `NexusLanding.tsx:13`.
   - `framer-motion` forced to **CJS** by `frontend/metro.config.js:40`, killing tree-shaking; every landing section imports it (`Hero/Features/Stats/Dashboard/Testimonials/CTA/Navbar/AgentK3D`).
   - `StarryBackground.tsx` runs a continuous 2000-star canvas animation with `shadowBlur` on the landing page (`StarryBackground.tsx:184`) — constant CPU/GPU burn while the page is open.
5. **Metro is throttled** — `frontend/metro.config.js:80` sets `maxWorkers = 2`, slowing every rebuild.

### 2.2 Backend startup (~12 s per worker)

Measured import time on this machine: **`import server` ≈ 12.2 s**. Top contributors:
- `litellm` 4.81 s (pulled in by `agent_k/providers/*` and `emergentintegrations/llm/chat.py:1`).
- `routers/career_ai` 5.49 s (chains litellm via `from emergentintegrations.llm.chat import UserMessage`, `backend/routers/career_ai.py:20`).
- `qdrant_client` 2.74 s — **created at import time** in `backend/agent_k/rag/store.py:23-44` (attempts persistent store, falls back to `:memory:`).
- `fastembed` 1.41 s, plus ~1.4 s each for the marketplace aggregators (`events_aggregator`, `jobs_feed`, `courses_marketplace`, `financial_services`, `rentals_marketplace`, `talent_pool`, `deals_aggregator`, `higher_ed_platform`).

Startup lifespan (`backend/server.py:138-255`): Mongo warm-ping + **~55 sequential `create_index`** calls + admin/echo seeding + Qdrant `init_collection` + background scheduler + a 60 s workflow cron — **all before the first request is served**. Production runs 2 uvicorn workers (`backend/Dockerfile:38`), each re-importing → 12–25 s boot. Compose `start_period: 25s` is right at the edge.

### 2.3 Per-request cost

`get_current_user` (`backend/server.py:974-1074`) does, on **every authenticated request**:
- `db.token_blacklist.find_one({"jti": jti})` (`server.py:986`),
- `db.users.find_one(...)` (`server.py:989`),
- an inline per-request "Schema Unification Migration" that can issue `db.users.update_one` (`server.py:996-1064`),
- `serialize_user` Fernet-decrypts phone/DOB/postal code on every response (`server.py:911-971`).

→ ≥2 Mongo round-trips per API call; high-traffic dashboard endpoints multiply this. `GZipMiddleware` min 1000 B (`server.py:2566`) adds per-response CPU.

---

## 3. Security Issues (Critical)

1. **Hardcoded production MongoDB Atlas credentials in source** (real live credentials):
   - `backend/server.py:125`
   - `backend/core/db.py:21`
   - `backend/check_4_accounts.py:5`, `backend/find_student.py:8`, `backend/migrate_to_atlas.py:23`, `backend/run_full_portal_regression.py:8`
2. **Hardcoded JWT secret** `studentalumni_jwt_secret_key_2026`:
   - `backend/server.py:130`
   - `backend/echo_showcase.py:128, 1693, 1833, 1868`
   - `backend/newsletter.py:57`
3. **FERNET_KEY silently falls back to an ephemeral random key** (`backend/server.py:354-368`) — PII encryption is non-durable if `FERNET_KEY` is unset in prod; decryption of previously-encrypted fields breaks on restart.
4. **Deploy workflow would expose** the deploy flow to a misconfigured/broken state (see §6).
5. `ALLOWED_ORIGINS` defaults to `*` in `docker-compose.yml:32` — permissive CORS in the shipped compose file.

---

## 4. Dead Code & Orphan Files

### 4.1 Repo root — 49 one-off scripts (228 KB, referenced nowhere)

- `fix_*.py` (13): `fix_all_white_colors`, `fix_alumni_sidebar_shadow`, `fix_atoms_muted`, `fix_college_onboard_text`, `fix_kpi_cards`, `fix_kpi_icons`, `fix_onboarding_colors`, `fix_onboarding_colors_2`, `fix_option_list_card`, `fix_option_list_card_2`, `fix_platform_import`, `fix_users_photo`, `fix_web_controls_colors`
- `check_*.py` (5): `check_ai_settings`, `check_db`, `check_db2`, `check_frontend`, `check_metrics`
- `test_*.py` (14): `test_chat`, `test_collection`, `test_cors`, `test_cors2`, `test_db`, `test_debug`, `test_debug2`, `test_direct_qdrant`, `test_local`, `test_prompt`, `test_retrieval`, `test_script`, `test_stream`, `test_chat`
- debug/scratch: `debug_flow.py`, `debug_login.py`, `scratch_verify.py`, `capture_auth.py`
- one-shot changes: `change_shield_color.py`/`_dark.py`/`_indigo.py` (3×603-byte near-identical), `use_glass_logo.py`, `patch_all_sidebars.py`, `remove_sidebar_shadow.py`, `seed_network.py`, `reindex_rag.py`, `find_roadmap.py`, `find_missing_image.py`, `generate_docs.py`, `generate_rag_docs.py`, `generate_rag_text_docs.py`, `wait_frontend.py`

### 4.2 Backend root — 46 orphan scripts

Not imported by `server.py`, routers, CI, Dockerfile, or `run.sh`: `api_deep_audit.py`, `api_verify.py`, `career_ai_acceptance_test.py`, `check_*` (11), `cleanup_legacy.py`, `delete_test_accounts.py`, `discover_api.py`, `dump_errors.py`, `e2e_9accounts_test.py`, `ensure_indexes.py`, `export_seed_data.py`, `find_student.py`, `fix_qr_codes.py`, `fix_test.py`, `generate_test_account_list.py`, `list_users.py`, `migrate_to_atlas.py`, `preflight.py`, `qa_e2e_audit.py`, `reindex.py`, `run_acceptance_test.py`, `run_dump.py`, `run_full_portal_regression.py`, `run_phase7_e2e_audit.py`, `seed_*` (7), `setup_test_student.py`, `test_ai/atlas/atlas2/conn/db/discover/email/regex.py`.
*(Some are legit manual seed/DB scripts — move to `backend/scripts/` before deleting.)*

### 4.3 Frontend orphan files (verify-then-delete)

- `src/lib/skillMeta.ts`, `src/lib/useTrackPageView.ts`
- `src/utils/eventHelpers.ts`, `src/utils/pinCode.ts`
- `src/views/screens/MentorHome.tsx`
- `src/views/web/LandingPageFinTax360.tsx`, `src/views/web/admin/PlaceholderPage.tsx`
- `src/views/web/nexus-glow-landing/AgentKCompanion.tsx`
- `src/views/web/portals/{alumni,mentor,college}/brand.ts` (unused; only portal copies)
- `src/views/web/portals/{student,alumni}/views/WalletView.tsx`
- `src/views/web/portals/mentor/StubView.tsx`
- `src/views/web/roleData.tsx`
- `src/motion/apple/composites.tsx`

### 4.4 Conflicting / duplicate routes (Expo Router)

- `app/(tabs)/network.tsx` (33 lines, mobile bento) **vs** `app/network.tsx` (1,346 lines, full network screen) — both resolve to `/network`; one is dead.
- `app/(tabs)/courses.tsx` (8 lines, `Redirect href="/courses"`) **vs** `app/courses.tsx` (1,837 lines) — the redirect target is itself → ambiguous/likely loops.
- `app/(tabs)/_layout.tsx` declares a `profile` tab (`name="profile"`) but **no `(tabs)/profile.tsx` exists** (only `app/profile/[id].tsx` and `app/me.tsx`) → broken tab reference.

### 4.5 Byte-identical portal duplicates

- `frontend/src/views/web/portals/student/data.ts` ≡ `alumni/data.ts`
- `.../student/views/ProfileView.tsx` ≡ `.../alumni/views/ProfileView.tsx`
- `.../student/views/StubView.tsx` ≡ `.../alumni/views/StubView.tsx`
- `app/apply_ux.py` — **a stray Python file inside `frontend/app/`** (Expo Router dir) — should be deleted.

---

## 5. Repo Bloat & Committed Artifacts (784 tracked files)

| Path | Size | Verdict |
|---|---|---|
| `QA-Automation/allure-results/` | ~59 MB / 611 files | Test artifacts committed — remove + gitignore |
| `node-local/` (vendored Node incl. 66 MB `node.exe`) | 66 MB / 12 files | Remove from git |
| `frontend/yarn-local/` | 5.1 MB | Remove from git |
| `git_log.txt` | 19 MB / 106,931 lines | Delete |
| `backend/{acceptance_screenshots, e2e_report, qa_audit_report, phase7_e2e_screenshots}` | ~14.7 MB | Delete + gitignore |
| `tests/artifacts/` | 8.4 MB / 93 files | Delete + gitignore |
| `frontend_lint_results.txt` (180 KB), `backend_test_results.txt`, `frontend_test_results.txt`, `backend/out.txt`, `backend/working_accounts.json`, `backend/body_text.txt`, `backend/api_audit_results.json`, `backend/phase7_e2e_results.json`, `backend/portal_regression_results.json`, `backend/e2e_report/` | — | Delete + gitignore |
| `backend/cryptography.whl` | 3.6 MB | Stray wheel — delete |
| `.DS_Store` (3×) | — | Remove + already in .gitignore |
| `stars-bg.jpg` (root, 324 KB) | — | Duplicate of `frontend/public/stars-bg.jpg` |
| `qa_testing/` | 8 KB | Empty stub (only package.json) — delete |
| `.git` | **327 MB** | History rewrite needed to reclaim fully |
| `backend/venv/` (1.1 GB), `frontend/node_modules/` (978 MB), `frontend/.metro-cache/` (396 MB) | local only | Safe to delete locally |

---

## 6. Broken CI / Deploy

- **`.github/workflows/03-deploy.yml` is broken:**
  - Lines 115–117 use **unexpanded placeholders** inside a quoted heredoc: `ENV="{{ ENV }}"`, `TAG="{{ TAG }}"`, `REGISTRY="ghcr.io/{{ github.repository }}"` — the remote host literally executes `{{ ... }}`.
  - Lines 125/128 hardcode service names `student-alumni-frontend-yefvun` / `student-alumni-backend-aompqa` (random Dokploy suffixes).
- Backend `Dockerfile` is **single-stage** (`COPY . .`, line 27) — ships tests/screenshots; ~GB-scale image. `.dockerignore` exists (221 B).
- `frontend/.dockerignore` **does not exclude `public/`** → 18 MB PNGs + 13 MB portal HTML baked into every nginx image.
- `run-all-tests.sh` lines 210–212 reference `test_all_endpoints.py` / `test_database_models.py` only in help text (they exist in `backend/tests/`); no hard break.
- Root `pytest.ini` points `testpaths = tests` but root `tests/conftest.py` requires **Playwright pytest fixtures** (`browser_context_args`, `page`) without `pytest-playwright` in deps → legacy suite likely doesn't run.

---

## 7. Dependencies

### 7.1 Frontend — unused (0 references in app/src/components)

`three`, `@types/three`, `zod`, `react-hook-form`, `dompurify`, `jspdf`, `html2canvas`, `posthog-js`, `lexical`, `@lexical/*` (10 pkgs), `expo-camera`, `expo-image-manipulator`, `expo-symbols`, `expo-web-browser`, `@expo/ngrok`, `@tanstack/react-query`, `moti`, `react-native-dotenv`.

Partial: `firebase` (dynamic-only, keep), `html5-qrcode` (unused), `react-native-qrcode-svg` (2 refs, keep). Both `lucide-react` **and** `lucide-react-native` installed; metro redirects `lucide-react` → 1.9 MB CJS (`metro.config.js:44-49`) — consolidate to one.

### 7.2 Backend — direct deps with no import anywhere

`boto3`, `botocore`, `s3transfer`, `jmespath`, `jq`, `s5cmd`, `pytokens`, `typer`, `shellingham`, `croniter`, `passlib`, `tiktoken`, `tokenizers`, `watchfiles`. Transitive deps should be regenerated with `pip-tools`; keep `pydantic[email]` (EmailStr) and `motor` (async driver). `g4f` and `playwright` **are** referenced in live code (`routers/users.py:2266`, `qa scripts`).

---

## 8. Correctness / Maintenance Gaps

- **Two DB modules**: `backend/db.py` is a thin compat shim over `core/db.py` (fine), but duplicated `db.py`/`pytest.ini`/`conftest.py`/`check_db.py`/`test_db.py` exist at both root and `backend/`.
- **Two test roots**: root `tests/` (Playwright legacy) vs `backend/tests/` (CI's real suite) — confusing split.
- **`backend/package.json`** uses Windows-style `venv\Scripts\...` paths — won't run on macOS/Linux.
- `frontend/package.json` `"test"` runs `jest` with a `ts-jest` preset but `jest-expo` is installed unused; tests under `__tests__` reference `lucide-react-native` mock.
- `agent_k/api/routes.py:7` does `from server import limiter, JWT_SECRET...` — circular-import smell that only works because `server` is the entry module.

---

## 9. Recommended Cleanup Plan (in priority order)

**Phase 0 — Performance fixes (do first, biggest user impact):**
1. `_layout.tsx`: load only 1–2 font families (or lazy/subsets); remove the 6 s `fontfaceobserver` error-suppression once fonts are fixed.
2. `index.tsx:63`: remove the artificial 1.4–2 s splash delay (or gate on `initialized` only).
3. Compress/convert landing images to WebP; delete dead `bg-fluid.png`, `stars-bg.jpg`, `agent-k-hero.png`, 0-byte `vj-data-questers.png`; drop the 2000-star canvas or cap at ~200 stars / disable `shadowBlur`.
4. Lazy-load `framer-motion` (stop CJS-forcing) and below-the-fold landing sections.
5. Backend: lazy-import `litellm`/`qdrant_client`/agent_k (12 s → <2 s import), batch index creation, cache the token-blacklist check, remove per-request schema migration.

**Phase 1 — Security:** move hardcoded Atlas URI + JWT secret to `.env` (they already exist in `.env.example`); rotate the leaked credentials; fail fast if `FERNET_KEY` missing in prod.

**Phase 2 — Dead code:** delete the 49 root scripts + 46 backend scripts (move kept seed scripts to `backend/scripts/`); delete verified-orphan frontend files; resolve the 2 conflicting route pairs + broken `profile` tab; consolidate identical portal files.

**Phase 3 — Git hygiene:** `git rm --cached` the 784 tracked blobs, add `allure-results/`, `node-local/`, `yarn-local/`, `*.txt` dumps, `artifacts/`, `.DS_Store`, screenshot dirs to `.gitignore`; delete local `venv`/`.metro-cache`.

**Phase 4 — CI/Deploy:** fix `03-deploy.yml` (expand vars outside the heredoc, parameterize service names); make backend Dockerfile multi-stage; exclude `frontend/public/` (or serve via CDN) from the image.

**Phase 5 — Deps:** prune unused npm/pip packages; regenerate `requirements.txt` via `pip-tools`; consolidate `lucide-react`/`lucide-react-native`.

---

*Nothing has been deleted. All items above await your approval before any change is made.*

---

## Fix Log (applied Aug 10, 2026)

### Performance — fonts & splash (DONE)
- `frontend/app/_layout.tsx`: no longer blocks first paint on web fonts. Gate changed to `(Platform.OS !== 'web' && !fontsLoaded && !fontError) || !initialized` — web renders immediately (system-font fallback, fonts swap in via FOUT); native still waits on fast local fonts.
- `frontend/app/index.tsx`: removed the artificial 1.4 s (web) / 2.0 s (native) splash `setTimeout` — routing now fires as soon as auth state is known.
- Verified: `tsc --noEmit` shows 0 errors in both edited files; ESLint passes (only pre-existing warnings).

### Security — leaked credentials removed from source (DONE)
- Removed hardcoded **MongoDB Atlas URI** from `backend/server.py:125`, `backend/core/db.py:21`, and one-off scripts `check_4_accounts.py`, `find_student.py`, `migrate_to_atlas.py`, `run_full_portal_regression.py` — `MONGO_URL` is now required from `.env` (fails fast with a clear message).
- Removed hardcoded **JWT secret** from `backend/server.py:130`, `backend/core/security.py:41`, `backend/echo_showcase.py` (×4), `backend/newsletter.py:57` — `JWT_SECRET` is now required from `.env`.
- `backend/.env` already contains both values, so local/dev boot is unaffected (verified: `import server` succeeds).
- **ACTION REQUIRED BY USER (cannot be done in code):** rotate the actual Atlas password and `JWT_SECRET` value at the source (Atlas console / deploy env), and set a fresh `FERNET_KEY` in production. The old values were public in git history.

### Remaining (awaiting approval)
Phase 1 (dead-code deletion), Phase 2 (git hygiene / `git rm --cached` 784 blobs), Phase 3 (broken `03-deploy.yml`), Phase 4 (dependency pruning), Phase 5 (asset compression + further perf work).
