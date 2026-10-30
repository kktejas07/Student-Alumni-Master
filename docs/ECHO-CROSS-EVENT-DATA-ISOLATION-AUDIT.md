# ECHO Cross-Event Data Isolation — Forensic Audit

**Audit date:** 2026-10-22
**Codebase:** `Student-Alumni-Master-main` @ `fc58bd59` (branch `feat/echo-showcase-remediation`; pre-fix parent = `fc58bd59^` = `4921bdd7`)
**Scope:** Cross-event content synchronization between `StudentAlumni ECHO` event pages — `/echo/snist` (HackWave 3.0) vs `/echo/vnrvjiet` `/ `/echo/vnr` → `/echo/vnr-echo-2026` (VNR ECHO 2026), plus `/echo/cbit` (CBIT ECHO 2026).
**Method:** Forensic, evidence-based. Read-only DB queries (redacted, no PII/credentials), git archaeology (`git show fc58bd59^:…`), code line-level inspection, and existing regression tests executed. **No code or DB mutations were performed during this audit.** The only file produced is this report.

---

## 1. Executive summary

| Question | Answer |
|---|---|
| **Is the reported bug real?** | Yes, in two layers: (a) a **frontend cross-event fallback bug** that displayed HackWave (SNIST) content for unresolvable VNR URLs (pre-fix, docstring evidence below), and (b) **cross-event content physically stored in MongoDB** (SNIST doc seeded with VNR content; VNR placeholder speakers shared onto CBIT). |
| **Is it fixed today (this repo state)?** | **Frontend layer: yes** — commit `fc58bd59` "fix: remediate echo showcase cross-showcase data leakage" removes every cross-showcase fallback. All 7 remediation regression tests **pass** (7/7). |
| **Is the data layer fully clean?** | **No.** The live local DB (`studentalumniadmin`) still contains residual cross-event content: SNIST doc carries VNR's `categories` list, VNR-style `schedule` and `panels` (with VNR placeholder names), and a registration tuple copied from VNR; VNR's 4 placeholder speakers are shared verbatim with CBIT. An ad-hoc Oct-14 cleanup (not in the repo; untracked backups prove it) fixed most of the SNIST doc but left those fields. |
| **Can Superadmin fix the residual data?** | **Mostly, yes — via UI.** Categories / Schedule / Panels / Speakers / Registration are all per-showcase editable tabs in `EchoShowcaseAdminView.tsx`. **Two exceptions are NOT UI-editable:** (1) `aliases` (need DB update or `_ALIAS_MAP` code change), (2) `cyber_conclave` (no editor tab). |
| **Is a code change still needed?** | **No code change is required to close the reported leak** (frontend isolation is already shipped). A small, **optional** hardening set remains: URL alias `/echo/vnrvjiet` is unresolvable (404 → catalog listing) — reachable only via a DB alias update or a `_ALIAS_MAP`/route addition; plus removal of a few residual hardcoded fallbacks (low severity, documented in §9). |
| **Root cause (confirmed, with paths)** | See §6. Short version: a polluted code seed (`DEFAULT_SHOWCASE_SEED`, slug `snist`) — a VNR→SNIST copy-paste — was auto-inserted by `seed_echo_showcase()` on any unknown-slug public request; the buggy frontend `activeEvent = events.find(...) \|\| events[0]` then made `/echo/vnrvjiet` render that contaminated SNIST doc, completing the cross-event symptom. |

---

## 2. Scope, method and evidence sources

Evidence used (all read-only):

1. **Git history** — `fc58bd59` (remediation) and its parent `fc58bd59^` (`4921bdd7`). The pre-fix `EchoEventsPage.tsx` was recovered via `git show fc58bd59^:frontend/src/views/web/echo/EchoEventsPage.tsx` (fallback at recovered-file line 260).
2. **Live MongoDB (local, `127.0.0.1:27017`)** — DB `studentalumniadmin` (the backend default; `docker-compose.yml:29`), collection `echo_showcases`, 3 published docs. Redacted comparison scripts ran through the backend venv interpreter (`backend/venv/Scripts/python.exe`, pymongo).
3. **Untracked pre-cleanup backups** — `backend/backups/snist_showcase_pre_cleanup_20261014_{070745,070929,070949}.json` (not referenced by any repo script → ad-hoc cleanup run outside the repo, against this local DB, on 2026-10-14 ~07:09).
4. **Code inspection** — `backend/echo_showcase.py`, `backend/routers/marketplace.py`, `frontend/src/views/web/echo/EchoEventsPage.tsx`, `frontend/src/views/web/portals/superadmin/views/EchoShowcaseAdminView.tsx`, `frontend/src/views/web/portals/student/views/EchoShowcaseView.tsx`, `frontend/app/echo/**`.
5. **Regression suite** — `backend/tests/test_echo_showcase_remediation.py` executed against the live DB.

**Limitations / unverified items** (explicit per instructions):
- Production/staging DB was **not** accessible from this environment; all DB findings are for the **local** instance the local backend `.env` points to. If production runs a different MongoDB, deployment must be re-verified (production-safe? see §12 checklist).
- The production deployed bundle (which frontend commit built it) is unverified. All *behavioral* claims below refer to this repo @ `fc58bd59`.
- The exact author/script of the Oct-14 cleanup is unknown (no script in repo references `pre_cleanup`; DB-internal evidence only).
- Index facts verified only on the local DB (`slug` unique index exists there; production should be checked to match).

---

## 3. Architecture and data flow (verified facts)

- **Backend:** FastAPI 0.139.2 (single FastAPI app `backend/server.py`), MongoDB 7.0 via Motor (`backend/core/db.py` — `AsyncIOMotorClient` created at import; `MONGO_URL`/`DB_NAME` env; default DB `studentalumniadmin`, `docker-compose.yml:29` and `docker-compose.prod.yml:44`).
- **Frontend:** Expo Router (React Native Web) SPA, static export served by nginx (`docker-compose.prod.yml`).
- **ECHO showcase CMS module:** `backend/echo_showcase.py` (router prefix `/api/echo`).
- **Collections:** `echo_showcases` (one doc per event), `echo_registrations`, `event_registrations` (SA-side mirror), `echo_settings` (`_id:"global"` hero/config), `echo_catalog_items`, `echo_discount_coupons`, `echo_orders`, `echo_volunteers`, `echo_media`.
- **Caching (ruled out):** nginx caches only static assets and `/uploads/` (1-day, key by URI) — no `/api/` response caching. Backend echo endpoints have no response cache. The only TTLCache noted (`events_cache`, 60 s, global key, `backend/routers/portals.py:2555-2640`) serves the **general events** feature, unrelated to ECHO. Browser/CDN caching by the production proxy chain is unverified (§12). react-query is not the data layer for this page (plain `fetch` + `useEffect`).

**Public read/write flow (all slug-scoped):**

| Endpoint | Location | Scoping |
|---|---|---|
| `GET /api/echo/showcases` | `echo_showcase.py:3546-3562` | list of all `status:"published"` docs (projection excludes `gallery`,`testimonials`,`timeline`); auto-seeds **only if list empty** |
| `GET /api/echo/showcases/{slug}` | `echo_showcase.py:3565-3584` | `_slug_query(slug)`; auto-seeds on miss then retries; 404 if still missing |
| `POST /api/echo/showcases/{slug}/register` | `echo_showcase.py:3845+` | slug-scoped, canonical-slug idempotency, writes `echo_registrations` + `event_registrations` |
| `POST /api/echo/showcases/{slug}/payment-order` | `echo_showcase.py:4212+` | slug-scoped (`find_one(_slug_query(slug))`), publish/gates enforced server-side |
| Verify / certificates / QR / volunteers | `echo_showcase.py` (full module) | slug- or registration-id-scoped; verified spot checks |
| Admin CRUD (`POST/PUT/DELETE /api/echo/admin/showcases…`) | `echo_showcase.py:7005/7015/7050/7084/7094/7104` | **scoped by `_id`** — no cross-showcase write path |
| `GET /api/marketplace/showcases/{slug}/catalog` | `backend/routers/marketplace.py:691-718` | merges scopes `[showcase._id, slug, "master"]` — **shared "master" scope is by design** (documented, see §8) |

Slug/alias canonicalization: `_ALIAS_MAP` + `resolve_canonical_slug()` + `_slug_query()` at `backend/echo_showcase.py:556-591`.

---

## 4. Route-to-record mapping (frontend)

| URL | Route file | Param passed | Record resolved at HEAD |
|---|---|---|---|
| `/echo` | `frontend/app/echo/index.tsx` | — | catalog list view |
| `/echo/snist` (static) | `frontend/app/echo/snist/index.tsx` | `initialSlug="snist"` | exact slug match → `snist` doc ✔ |
| `/echo/snist/register` | `app/echo/snist/register.tsx` | `initialSlug="snist"`, `initialView="reg"` | `snist` doc ✔ |
| `/echo/cbit` (static) | `app/echo/cbit/index.tsx` | `initialSlug="cbit"` | `cbit` doc ✔ |
| `/echo/cbit/register` | `app/echo/cbit/register.tsx` | `initialSlug="cbit"` | `cbit` doc ✔ |
| `/echo/vnr` | `app/echo/vnr/index.tsx` | — | client redirect → `/echo/vnr-echo-2026` → dynamic route → `vnr-echo-2026` doc ✔ |
| `/echo/vnr/register` | `app/echo/vnr/register.tsx` | — | redirect (same target) |
| `/echo/vnr-echo-2026` | `app/echo/[slug]/index.tsx` | `slug="vnr-echo-2026"` | exact slug → `vnr-echo-2026` doc ✔ |
| `/echo/vnrvjiet` | `app/echo/[slug]/index.tsx` | `slug="vnrvjiet"` | ❌ **resolves to nothing**: `vnrvjiet` is in neither `_ALIAS_MAP` (`echo_showcase.py:556-569`) nor the doc's `aliases`; API 404 → catalog/not-found state. **Pre-fix this rendered `events[0]` (HackWave content) — the reported leak.** Today it is simply a broken alias, not a leak. |
| `/echo/[slug]/[event]` | `app/echo/[slug]/[event]/index.tsx:12` | `initialSlug={slug \|\| 'snist'}` | ⚠️ residual hard default: a missing slug renders the `snist` showcase (cosmetic-only under normal navigation; document as risk §9) |
| Legacy `GET /api/echo/handbook` | `echo_showcase.py:3540-3542` | `target_slug = slug or "snist"` | documented legacy redirect to SNIST handbook (intentional default, not a leak) |

**Frontend resolution chain (HEAD):**
1. List fetch `GET /showcases` → catalog entries.
2. `activeEvent = events.find((e) => e.slug === selectedSlug || (e.aliases && e.aliases.includes(selectedSlug)))` — `EchoEventsPage.tsx:241`. **No fallback.** Pre-fix line 260 was `events.find((e) => e.slug === selectedSlug) || events[0] || SAMPLE_EVENTS[0]` (recovered via git; see §6).
3. Detail fetch `api.getEchoShowcase(selectedSlug)` (`EchoEventsPage.tsx:408-475`) replaces/inserts the doc keyed by its canonical `slug`; on failure → `notFound` state, never another event's content.
4. `SAMPLE_EVENTS = []` and `_UNUSED_SAMPLE_EVENTS` exist as **dead code** (no reference in UI path at HEAD).

---

## 5. DB model / query / API comparison — frontend vs backend

| Concern | Backend (`echo_showcase.py`) | Frontend (`api.ts` + `EchoEventsPage.tsx`) | Verdict |
|---|---|---|---|
| Slug resolution | `_ALIAS_MAP` (10 entries) + doc `aliases` + exact slug (`$or`) | strict `=== slug \|\| aliases.includes` | consistent ✔ (both strict at HEAD) |
| unknown slug | 404 (after one seed-ensure pass) | `notFound` state → catalog view | consistent ✔ (404 leaf, no synthetic doc) |
| List projection | excludes `gallery`,`testimonials`,`timeline` | detail fetch re-hydrates those via detail call | correct pattern ✔ |
| Fee fields | `registration.fee / individual_fee / team_fee`; legacy flat `fee` fields supported | `individual_fee: item.fee ?? item.individual_fee ?? item.registration?.fee ?? 0` (line 439) — no `599` constant anymore | ✔ (pre-fix hardcoded `\|\| 599` removed) |
| Handbook | per-slug `handbook_url`; `/showcases/{slug}/handbook`; legacy `/handbook`→snist default | `handbook_url: item.handbook_url \|\| ''` — no `'/HackWave_3.0_Event_Handbook.pdf'` constant fallback anymore | ✔ |
| Registration poster | `registration.poster_images` | `regPosters` derived strictly from config (`EchoEventsPage.tsx:244-258`) | ✔ (only *image-style* fallback to static `/images/hackwave/…` for the Razorpay checkout banner remains — cosmetic, §9) |
| Admin write | `PUT /admin/showcases/{_id}` `$set` of non-None schema fields (`echo_showcase.py:7015`; `ShowcaseUpdateSchema` drops `None`) | `EchoShowcaseAdminView.tsx` save binds to edited item `_id` (save at ~6857-6887) | ✔ isolated; **note:** schema-level `None`-drop means UI-defaulted nested objects can overwrite subfields on save — reversed-scoped, not cross-event (§9 note) |
| Marketplace catalog | merge of `[showcase_id, slug, "master"]` scopes | — | shared-by-design, flagged §8 |

---

## 6. Root cause (confirmed, three nested layers)

### Layer 1 — Polluted code seed (data origin)
At the pre-fix revision (`4921bdd7` — which was in effect when the local DB was seeded), `backend/echo_showcase.py` contained a single seed `DEFAULT_SHOWCASE_SEED` (at that revision: file line 3062) whose **identity fields said HackWave/SNIST but whose filler content was copied from a VNR ECHO seed**:

- `slug: "snist"`, `title: "HackWave 3.0 (2026)"`, HackWave `aliases`
- `seo_title: "VNR ECHO 2026 — Student Alumni Flagship Showcase"`, `seo_keywords: "VNR VJIET, ECHO 2026, …"`
- `registration.fee: 0`, `payment_note: "Free entry for VNR VJIET students. Registrations close 1 day before the event."`
- `downloads: [{title: "VNR ECHO 2026 Brochure", …}]`
- 4 placeholder speakers: Vijay Raghavan (Google), Sneha Reddy (Microsoft), **Dr. Kavitha Nair (VNR VJIET)**, Arjun Mehta (BrightFuture Labs) — the same four objects that still exist verbatim on the VNR and CBIT docs today
- VNR-style `schedule` ("Keynote — AI at Scale … Vijay Raghavan kicks off the day"), `panels` (panelists = the 3 placeholders), `about_cards`, `stats` ("Students Attended 320+"), `faqs` ("Yes — ECHO 2026 is free…"), picsum `echo2026` hero/gallery placeholders.

### Layer 2 — Auto-seeding on public requests (how it entered the DB)
Pre-fix, `seed_echo_showcase()` was invoked not only when the collection was empty but also **when any slug lookup missed** (`get_showcase` → seed → retry; same pattern still exists at HEAD `echo_showcase.py:3570-3572`, now harmless because the per-event seeds are correct). The live local SNIST doc (`created_at 2026-09-24T08:05:58`, `created_by:"system"`) is field-for-field consistent with Layer-1 seed content — proven by the untracked backup diff below. **Consequence: simply visiting an unresolvable slug (e.g. `/echo/vnrvjiet`) in an empty DB materialized the contaminated HackWave doc.**

### Layer 3 — Frontend fallback (how it became a visible cross-event bug)
Pre-fix `EchoEventsPage.tsx` (recovered from `fc58bd59^`, recovered-file line 260):

```js
const activeEvent = events.find((e) => e.slug === selectedSlug) || events[0] || SAMPLE_EVENTS[0];
```

Since `vnrvjiet` matches **no** published record, `events[0]` resolved to the SNIST/HackWave doc → the page rendered HackWave identity + its (VNR-contaminated) content for the "VNR" URL. Together with additional hardcoded fallbacks (per-person fee `|| 599`, handbook `|| '/HackWave_3.0_Event_Handbook.pdf'`, hardcoded verticals/conclave/category arrays) the page could present a mixture of SNIST identity, VNR leakage, and hardcoded HackWave fixtures **regardless of which event the visitor requested**. The same pattern existed in the student-portal view (`EchoShowcaseView.tsx`, `DEFAULT_SHOWCASE` constant — now `null`).

**Evidence chain for Layer 1/2 (DB + backups):**
- `backend/backups/snist_showcase_pre_cleanup_20261014_070745.json` ≡ `…_070929.json` (byte-identical, 16,685 B) — state **A**: matches the pre-fix seed fillers; doc `updated_at: 2026-09-24T08:05:58.646684`.
- `…_070949.json` (17,325 B) — state **B′** captured immediately before a last mutation; equals the **current** DB doc except `updated_at` (2026-10-14T07:09:29.568 → current 07:09:49.767). The final mutation therefore changed no content fields.
- The A → B′ delta (i.e., the effective Oct-14 cleanup) rewrote: `speakers` (4 placeholders → 9 real HackWave speakers: Stan Mierzwa Ph.D., Ken Fishkin, Sharon Kelley, Jeremy Livingston, Suman Kalia, Jonna Dheeraj, Harish Kotra, M Avinash Rao, Gopichand Anumolu), `gallery`/`hero_*` (picsum → HackWave posters), `highlights`, `perks`, `stats`, `timeline`, `faqs`, `eligibility`, `team_composition`, `seo_*`, `sponsors` (placeholders → WeHive), `registration.payment_note` + `poster_images` (+ contact phones), `cyber_conclave` (enabled: ISC2 New Jersey Chapter conclave content), `ticker_messages`; **emptied** `testimonials` and `videos`.
- **Left unchanged by the cleanup** (still cross-event in DB today, §7): `categories`, `schedule`, `panels`, `about_cards`, the `registration` fee/seat tuple.
- `downloads` was already normalized to "HackWave 3.0 Event Handbook" before the backups began.

---

## 7. Live DB state (local `studentalumniadmin`, all 3 docs published)

### 7.1 Identity (clean)
| Doc | slug | aliases | created | updated | created_by |
|---|---|---|---|---|---|
| HackWave 3.0 (2026) | `snist` | `hackwave-3.0, hackwave-3, hackwave, snist` | 2026-09-24 (system) | 2026-10-14 07:09 | system |
| VNR ECHO 2026 | `vnr-echo-2026` | `vnrvjit, vnrjvit, vnr, vnr-vjiet, vnr-vjit` | 2026-10-07 08:29 | 2026-10-07 08:29 | system |
| CBIT ECHO 2026 | `cbit` | `cbit-echo-2026, cbit` | 2026-10-08 12:01 | 2026-10-08 12:01 | **None** |

- DB-uniqueness: canonical slugs unique; alias sets pairwise disjoint (no doc claims another event's aliases). `studentalumniadmin.echo_showcases` has unique index on `slug` (verified) + `status_1_date_-1`. **Alias uniqueness is not enforced at the DB level** (app-level check only; noted as hardening §10).
- `vnrvjiet` (the user-reported URL) belongs to **no** doc — see route table §4.

### 7.2 Per-event content correctness (today)
| Field | snist (HackWave) | vnr-echo-2026 | cbit | Correct per event? |
|---|---|---|---|---|
| title/date/venue/description | HackWave-specific ✔ | VNR ✔ | CBIT ✔ | ✔ |
| prize_pool | `{total:"₹17,50,000+", grand_pool:"₹2,00,000", tracks:"₹50,000", wehive_germany:"₹15,00,000", visas:"2 Business Visas", …}` (dict) | `{total:"₹30,000", grand_pool:"₹20,000", tracks:"₹10,000", …}` (dict) | `"₹35,000 prize pool"` (**string** — frontend renders both forms; schema permits Union) | ✔ |
| speakers | 9 real HackWave/ISC2 speakers ✔ | 4 **placeholders** (Vijay Raghavan…, incl. Dr. Kavitha Nair — *VNR VJIET*) — appropriate **for VNR** but UNRESOLVED data | **same 4 placeholders as VNR** ❌ (CBIT page shows VNR speakers) | ⚠️ |
| ticker/seo/downloads/handbook | HackWave ✔ | VNR ✔ | partial (seo_title NULL; ticker = VNR phrasing with CBIT substitutions) | ⚠️ cbit |
| registration tuple | `fee 0, max_seats 500, individual_fee/team_fee NULL` ❌ (code seed says `599/2495/985`; tuple came from VNR copy) | same values — **correct for VNR** (free) | `499/1999/350` ✔ | ⚠️ snist |
| categories | **VNR's 5-item list** ❌ (`Healthcare & MedTech…Smart Cities & Mobility`) — code seed defines HackWave AI tracks | VNR list ✔ (correct owner) | 3-item subset | ⚠️ snist |
| schedule | **VNR's generic schedule** ❌ ("Keynote — AI at Scale", day-model) — HackWave has its own `timeline` (fixed) but `schedule` left VNR content | VNR schedule ✔ | own | ⚠️ snist |
| panels | **VNR panels w/ VNR placeholder panelists** ❌ | VNR panels ✔ | empty | ⚠️ snist |
| about_cards | generic Learn/Connect/Grow (== VNR) | same | own | low severity |
| conclave/videos/testimonials | conclave enabled+ISC2 content ✔; videos `[]` (cleanup removed 3 real HackWave teaser videos — data loss note), testimonials `[]` | conclave disabled; videos `[]`; seed testimonials | conclave disabled; videos/testimonials `[]` | ✔/note |

### 7.3 Residual cross-event duplicates (field-level equality scan across the 3 docs)
Programmatic scan of every field; identical values appearing in ≥2 docs:

| Field | Shared by | Classification |
|---|---|---|
| `categories` (5-item list) | snist == vnr | **UNINTENDED** — VNR content on SNIST |
| `schedule` | snist == vnr | **UNINTENDED** — VNR content on SNIST |
| `panels` | snist == vnr | **UNINTENDED** — VNR speakers on SNIST |
| `registration` (fee/seat tuple) | snist == vnr | **PROBABLY UNINTENDED on snist** (code seed: 599/2495/985) — confirm intended pricing with owner |
| `speakers` (4 placeholders) | vnr == cbit | **UNINTENDED on cbit**; placeholders also contestable on vnr |
| `about_cards` | snist == vnr | cosmetic/generic |
| `category:"college-event"`, `cta_title/subtitle/button_text`, `event_status_badge:"Upcoming"`, `sections` (toggles), `status:"published"`, `gallery_layout:"grid"`, `videos: []`, `testimonials: []`, `cyber_conclave` empty-dict (vnr==cbit, disabled) | multiple | benign/default-by-design |

No slug/alias overlap; no duplicated canonical identity; **no** duplicated `prize_pool`, `partners`, `sponsors`, `perks`, `ticker` messages across events (post-cleanup).

---

## 8. Shared-by-design vs unintended — explicit distinction

**Intended shared mechanisms (not leaks, documented):**
1. **Global ECHO settings** — `echo_settings` doc `_id:"global"` (hero config, invoice templates) consumed by all events; editable in Superadmin `SettingsView.tsx` (PUT `/api/echo/admin/settings`, `api.ts:619-622`).
2. **Marketplace "master" scope** — `routers/marketplace.py:691-718` intentionally merges per-showcase scope with the `"master"` catalog scope; items inserted by an operator into `master` appear on every event's catalog page by design.
3. **Section toggles / layout defaults / CTA texts / status defaults** — common template fields, identical across docs by design.
4. **Legacy handbook redirect** `/api/echo/handbook` → defaults to `snist` (`echo_showcase.py:3540-3542`) — explicit, documented legacy route.
5. **Slug-alias canonicalization map** — deliberate convenience for event microsites. (Its gap for `vnrvjiet` is a defect, not a leak.)
6. **Dead code** `_UNUSED_SAMPLE_EVENTS` / `SAMPLE_EVENTS = []` in `EchoEventsPage.tsx` — zero render paths at HEAD.

**Unintended cross-event content (defects)** — aggregated: everything in §7.3 marked UNINTENDED, the (now-shipped) frontend fallback behavior, the `DEFAULT_SHOWCASE_SEED` pollution (Layer 1), and the auto-seed-on-unknown-slug behavior that can materialize seeds into an empty production DB silently (behavior retained at HEAD but with correct per-event seeds — worth a deliberate decision either way; see §10).

---

## 9. Superadmin (EchoShowcaseAdminView.tsx) remediation matrix

Editor: `frontend/src/views/web/portals/superadmin/views/EchoShowcaseAdminView.tsx` — per-showcase modal, tabs defined at lines 246-291, save by `_id` (~6857-6887 → `PUT /api/echo/admin/showcases/{_id}`).

| # | Content category | Affects | Where in UI | UI-fixable? |
|---|---|---|---|---|
| 1 | Title / subtitle / description / dates / venue / college / organizer | any event | **General** tab | ✅ |
| 2 | SEO (title/keywords/description) | snist (already fixed by cleanup), cbit (NULL) | **SEO** tab | ✅ |
| 3 | Hero/banner/gallery images | any event | **Hero + Gallery + Media** tabs | ✅ |
| 4 | Speakers (real names per event; replace 4 shared placeholders on CBIT) | cbit, vnr | **Speakers** tab | ✅ |
| 5 | Categories / tracks (SNIST currently has VNR's list) | snist | **Categories** tab (`CategoriesEditor`, line ~2563) | ✅ |
| 6 | Schedule / agenda (SNIST has VNR's schedule) | snist | **Schedule** tab (~2570) | ✅ |
| 7 | Panels (SNIST has VNR panels/panelists) | snist | **Panels** tab (~2577) | ✅ |
| 8 | Registration config — fee `0`→intended, deadlines, payment note, posters, seats | snist | **Registration** tab (`registration.fee` Fields ~2744-2770) | ✅ *(pending owner confirmation of intended pricing)* |
| 9 | Downloads / videos / perks / stats / highlights / ticker / testimonials / FAQs / sponsors | any event | dedicated tabs | ✅ |
| 10 | About cards (generic duplication) | snist | **About** tab (`about_cards` ~2459) | ✅ |
| 11 | **URL aliases (add `vnrvjiet` → vnr-echo-2026)** | route reach | ❌ **no aliases field anywhere in the editor** (grep-verified) | ❌ → DB update or `_ALIAS_MAP` code change |
| 12 | **Cyber conclave block** (title/sessions/date) | snist | ❌ no conclave editor (only cert-status views) | ❌ → DB update or code |
| 13 | Global hero/landing settings | all events | Superadmin **SettingsView** (`/api/echo/admin/settings` PUT) | ✅ |
| 14 | Publish status / badges / sections toggles | any event | General + **Publish/Sections** tabs | ✅ |

**Bottom line:** every residual *cross-event content field* (rows 4-10) is fixable today through the existing Superadmin UI; two *structural* items (row 11 aliases, row 12 conclave) and any new single-event *field type* require a code or DB change.

**Save-scope note (correctness, not a leak):** `ShowcaseUpdateSchema` drops `None` values server-side (`echo_showcase.py`, update handler) and the admin save sends the full form object — nested objects (e.g. `registration`) are replaced wholesale. This is scoped-per-`_id` and cannot write to another event, but an editor save with a partially loaded form can erase sub-fields introduced later (schema-drift hazard). Recommend eventual field-level `$set` on nested sub-documents (hardening, §10).

---

## 10. Remediation status + recommended minimal actions (NONE applied without approval)

### Already shipped (commit `fc58bd59`) — verified
1. `EchoEventsPage.tsx:241` — strict active-event resolution; removed `|| events[0] || SAMPLE_EVENTS[0]`.
2. Removed hardcoded fee (`|| 599`), chatbook (`|| '/HackWave_3.0_Event_Handbook.pdf'`), and perks fallbacks; perks render only when data exists.
3. `EchoShowcaseView.tsx` — `DEFAULT_SHOWCASE` → `null` (student portal no longer synthesizes SNIST content when a doc is missing).
4. Per-event correct seeds (SNIST/VNR `*_SHOWCASE_SEED`); seed no longer fabricates docs for unknown slugs (existing docs are left untouched; seed triggers only on missing docs).
5. Rewritten regression suite `backend/tests/test_echo_showcase_remediation.py` (7 tests — all pass, §11).
6. Registration/payment/cert submit paths remain slug-scoped & publish-gated (spot-verified).

### Recommended A — data fixes (no code)
- Via **Superadmin UI** (rows 4-10 above): fix SNIST `categories`, `schedule`, `panels`; decide/enter intended SNIST pricing; replace CBIT's 4 placeholder speakers with real CBIT speakers; optionally complete CBIT SEO/ticker.
- Via **DB update (admin script)**: add `aliases:["vnrvjiet"]` to `vnr-echo-2026` (or create `/echo/vnrvjiet` redirect route in code — equal effect) so the historic marketing URL resolves; consider also documenting `/echo/vnr/...` as the canonical short link.

### Recommended B — small code hardening (optional, low urgency)
1. `_ALIAS_MAP`: add `"vnrvjiet": "vnr-echo-2026"` alongside the existing `vnrvjit` typo-variants (single-line; would allow adding a regression test).
2. `frontend/app/echo/[slug]/[event]/index.tsx:12` — guard `initialSlug={slug || 'snist'}` → render catalog/404 when `slug` is missing instead of defaulting to SNIST.
3. `EchoEventsPage.tsx` residual hardcoded fallbacks (~line 2030 verticals, ~2060 conclave sessions, ~2770 track-select options, Razorpay poster image `/images/hackwave/hackwave_main_poster.png`) — replace with neutral empty-state rendering (only fire when data absent; LOW risk; the >2770 one still *presents HackWave track names on another event's registration form* when that event has no categories).
4. Re-endpoint decision: auto-seed on unknown-slug (`echo_showcase.py:3570-3572`) — either remove (pure 404 semantics; recommended) or keep consciously documented, since it can materialize seed content into any empty production DB.
5. DB hardening (needs explicit approval; migrations only with user sign-off): enforce alias-uniqueness where supported, align production DB to the cleaned local data, and consider field-level `$set` for nested admin saves.

### Restorative data note
The Oct-14 cleanup emptied SNIST `videos` (3 real HackWave teaser entries existed in state A: "HackWave 3.0 SNIST Official Teaser", "Cyber Security with AI Conclave Teaser", "Build by Sunset… Highlights") and `testimonials`. If those assets are still wanted, restore from `backend/backups/snist_showcase_pre_cleanup_20261014_070949.json` (state B′ / current-equal) or the older 070745 file — via a controlled DB update, not automatically.

---

## 11. Regression test results

**Executed:** `backend/venv/Scripts/python.exe -m pytest tests/test_echo_showcase_remediation.py -v` (live local backend + DB; 2026-10-22).

| Test | Assertion focus | Result |
|---|---|---|
| `test_snist_content` | GET snist → 200, slug `snist`, "HackWave" title, INR registration, prize ₹17,50,000+, partners contain WeHive | ✅ PASSED |
| `test_vnr_content` | GET vnr-echo-2026 → 200, VNR title, fee 0, prize ₹30,000, no WeHive/visas | ✅ PASSED |
| `test_backend_alias_resolution` | aliases `vnrvjit, vnr, vnr-vjiet` → VNR doc; `snist-hackwave, hackwave` → SNIST doc | ✅ PASSED |
| `test_invalid_slug_returns_404` | unknown slug → 404 "Showcase not found" | ✅ PASSED |
| `test_vnr_lookup_failure_never_returns_snist` | failed VNR-ish slug → 404, body never contains snist/HackWave | ✅ PASSED |
| `test_handbook_resolution` | SNIST handbook serves configured PDF; VNR handbook → 404 (never SNIST's); legacy `/api/echo/handbook` → 307 → SNIST (documented) | ✅ PASSED |
| `test_showcase_editing_isolation` | `PUT /admin/showcases/{id}` edits mutate **only** the targeted doc (tagline mutated & restored) | ✅ PASSED |

**7/7 passed (12.25 s).** One test performs a controlled write+restore on a single field of a single showcase (`tagline`) — no destructive migration involved.

**Still-to-add tests (recommended, would cover residual gaps):** alias `snist` NOT returned for `/echo/[any-invalid]` registered flow; `[slug]/[event]` missing-slug guard; catalog `master`-scope opt-out behavior; a data-integrity assertion suite for "no field is byte-identical across two showcase docs except the allow-listed template fields" (§7.3 list).

---

## 12. Production checklist (must be re-verified at deployment — not verifiable from this machine)

1. Confirm production `DB_NAME` and that production `echo_showcases` matches the cleaned local state; if the production DB still holds the pre-cleanup SNIST doc (VNR seo/ticker/speakers/schedule/panels), run the same Superadmin fixes (§9) there.
2. Verify the deployed frontend bundle ≥ `fc58bd59` (the fallback fix must actually be in the production build).
3. Add the `vnrvjiet` alias (DB or code) so the historically reported URL resolves (or redirect it).
4. Check any intermediary CDN/proxy caching behavior for `/api/echo/*` (nginx-level confirmed clean; CDN untested).
5. Confirm `slug` unique index exists in production collection.

---

## 13. Appendix — verification commands / artifact pointers

- Pre-fix frontend: `git show fc58bd59^:frontend/src/views/web/echo/EchoEventsPage.tsx` (fallback at recovered line 260).
- Pre-fix backend seed: `git show 4921bdd7:backend/echo_showcase.py` (line 3062 `DEFAULT_SHOWCASE_SEED`; superfluous VNR fillers at lines ~3108-3220: speakers, schedule, faqs, downloads "VNR ECHO 2026 Brochure", seo_*, registration payment_note).
- Backup diff artifact: comparisons of `backend/backups/snist_showcase_pre_cleanup_20261014_*.json` (state A ≡ 070745 ≡ 070929; state B′ = 070949 = current DB except `updated_at`).
- DB scans (read-only, redacted): list of candidates, per-doc content fingerprint, cross-doc field equality scan; all run with the repo's backend venv interpreter.
- Regression run: 7/7 pass (§11).
- No source files were modified during this audit; the only artifact written is this report. Untracked pre-existing artifacts (`backend/backups/`, `frontend/test-results/`) left untouched; no commits/pushes/branch switches performed.
