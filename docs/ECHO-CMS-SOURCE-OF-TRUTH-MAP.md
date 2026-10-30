# ECHO CMS Source-of-Truth Map — Public Landing vs Public Event Page vs Student Portal vs Superadmin

**Audit date:** 2026-10-22
**Codebase:** `Student-Alumni-Master-main` @ `fc58bd59` (branch `feat/echo-showcase-remediation`)
**Companion report:** `docs/ECHO-CROSS-EVENT-DATA-ISOLATION-AUDIT.md` (first forensic audit — cross-event isolation)
**Method:** investigation-only. No source code or DB records were modified. Evidence = line-level code inspection (with line references), git archaeology for the pre-remediation builds, read-only live-DB queries (local `studentalumniadmin`), and one locally executed React serialization test using the repository's own `node_modules`.

---

## 1. Executive summary

| Question | Answer |
|---|---|
| Do the public page and the student portal use different data? | **No.** Both resolve the *same* public endpoints: `GET /api/echo/showcases` (list) and `GET /api/echo/showcases/{slug}` (detail) — **auth: false** for both pages (`frontend/src/models/services/api.ts:428-429`). Superadmin edits the *same* records via `GET/PUT /api/echo/admin/showcases` and publish-path CRUD (`api.ts:447-461`). There is **no separate portal showcase datasource**. |
| Does `vnrvjit` resolve to the right event? | Yes — `GET /showcases/vnrvjit` matches via `_slug_query`'s `$or` on `aliases` (`backend/echo_showcase.py:578-591`) and returns the canonical `vnr-echo-2026` doc (slug is DB-unique). The old portal build also pre-mapped `vnrvjit → vnr-vjiet` (`git show d3bfcdd8`, lines 831-833) — both resolve correctly. |
| Why do the portal pages look different from the public pages? | Three families of verified causes: **(1)** the two views render **different subsets** of the same doc (portal honors `sections` toggles and renders Sponsors + Downloads; public ignores `sections` and never renders Sponsors/Downloads, while hardcoding a ticker, verticals, track options, and an unconditional handbook button); **(2)** the public detail page has a **verified child-render crash** when `prize_pool` is a dict (see §7) — it throws for SNIST/VNR today; **(3)** data quality: VNR's hero fields are placeholders in the DB (`hero_banners: null`, `hero_image_url` = an external random-photo URL) so the portal hero card shows a stock photo/blank gradient instead of a real banner. |
| Where is each page's content managed? | Public landing hero (badge/title/description/mini-stats/recent hosts/CTA labels/section header): **global `echo_settings.hero_config`** — served by `GET /api/echo/admin/settings` (no auth), **not editable in any Superadmin screen today** (backend `PUT` accepts `hero_config`, but no UI calls it). Per-event content: the `echo_showcases` record per event, editable in **Superadmin → ECHO Showcase CMS** tabs. A small number of things are **hardcoded in frontend** (landing Mosaic tiles, ticker bar, vertical/track fallbacks, portal sponsor/download fallback lists, EchoImg logo fallbacks). |
| Root cause of the blank VNR hero? | The VNR record renders through the portal's hero-card branch (`hero_banners` empty/null for VNR) using `hero_image_url` — which in the live local DB is the placeholder `https://picsum.photos/seed/echo2026-hero/1200/700`. When that external asset loads, a *random stock photo* appears; when it is slow/unreachable or empty, the portal shows an **empty gradient box with only overlay text** (also exactly what the pre-remediation portal build rendered on any fetch failure, because it silently kept a neutral `DEFAULT_SHOWCASE`). It is a **data + fallback-design** issue, not a broken API, an auth issue, or a rendering-condition bug. Fixable today via **Superadmin → ECHO Showcase CMS → VNR ECHO 2026 → Hero tab** (see §4). |

---

## 2. The four experiences and their real component/data flow

### A. Public ECHO landing — `/echo`
```
/echo  (app/echo/index.tsx:11-16)
  → EchoEventsPage(initialView="list")           [src/views/web/echo/EchoEventsPage.tsx:133]
      → api.listEchoShowcases()                  [GET /api/echo/showcases, auth:false]   (EchoEventsPage list-fetch effect + lines 356-373)
      → api.getEchoHeroConfig()                  [GET /api/echo/admin/settings]          (EchoEventsPage:477-484)
          → echo_settings collection, _id:"global"  → hero_config (backend/echo_showcase.py:6852-6881, defaults inline)
      → renders: hero card (badge/title/description/stats/recent hosts/mosaic tiles),
        section header, 2-col event cards (title, poster_banner, status, college, description, date, venue)
```

### B. Public event detail — `/echo/snist`, `/echo/vnr-echo-2026`, `/echo/cbit`
```
/echo/[slug]   (app/echo/[slug]/index.tsx:7-13 → EchoEventsPage(initialView="detail", initialSlug=slug))
  static aliases: /echo/snist (app/echo/snist/index.tsx), /echo/cbit; /echo/vnr → client-redirect → /echo/vnr-echo-2026
  → EchoEventsPage
      → api.listEchoShowcases()  (catalog)
      → api.getEchoShowcase(slug) (detail effect, lines 408-475; canonical mapping 420-455)
          → backend GET /showcases/{slug} → _slug_query($or slug/aliases) → echo_showcases doc (_ser pass-through, :454-472)
      → renders: hero poster (poster_banner = hero_image_url|banner_url|poster_url), title/college/description,
        pills (status/organizer/date/prize/venue), prize-pool block (2289-2310), categories+verticals,
        conclave (gated on cyber_conclave.enabled; sessions from CMS w/ fallback), speakers+panel, perks,
        videos, partners, gallery strip, Razorpay registration (fee from registration config)
      → NOT rendered publicly: stats, testimonials, timeline, faqs, schedule, panels, sponsors, downloads,
        about_cards, hero_banners carousel, organizers card
```

### C. Student Portal (logged-in) — `/student-portal/{slug}`
```
/student-portal/[...segments]   (app/student-portal/[...segments].tsx:17-26, permissive catch-all)
  → PortalUrlProvider(base="student-portal", permissive) → StudentPortalRN
      [src/views/web/portals/student/StudentPortalRN.tsx:146-151]
      → Sidebar EchoNavGroup                     (Sidebars children come from api.listEchoShowcases() — canonical slugs;
                                                  Sidebar.tsx:79-103; the built-in seed list uses vnr-echo-2026/snist)
      → EchoShowcaseView({ slug: active == 'echo-showcase' ? undefined : active })
          [src/views/web/portals/student/views/EchoShowcaseView.tsx:815-864]
      → api.getEchoShowcase(slug)                [SAME public detail endpoint; auth:false]
      → rendering (guard showSection(key) from data.sections — defaults to all-visible, EchoShowcaseView:829-835):
        hero: hero_banners carousel (905-924) OR hero card (927-1032: EchoImg w/ logo fallback,
              empty-gradient box when hero_image_url missing), stats, about+organizers, partners,
              gallery+lightbox, testimonials, timeline, speakers+panelists, categories, schedule, panels,
              eligibility/team/prize-pool cards, faqs, sponsors, downloads, CTA
      → Legacy shell also exists: /nexus-os → NexusOSModernDashboardRN:863 → <EchoShowcaseView /> (no slug →
        "Showcase not found" after the Oct-7-neutral fallback change)
```

### D. Superadmin — ECHO Showcase CMS
```
/super-admin/echo-showcase/...   (app/super-admin/[...segments].tsx → EchoShowcaseAdminView)
  → api.adminListEchoShowcases()  [GET /api/echo/admin/showcases]
  → per-record editor modal, tabs (EchoShowcaseAdminView.tsx:246-291):
        general · hero · statistics · about · gallery · testimonials · highlights · speakers ·
        categories · schedule · panels · faqs · sponsors · videos · downloads · sections ·
        registration · catalog · seo · publish
  → save: api.updateEchoShowcase(_id, form)  [PUT /api/echo/admin/showcases/{_id}  — scoped by _id, :7015]
  → media: uploads go to /echo/admin/upload → echo_media collection, URL stored into showcase fields
  → global template/email branding: Superadmin → Settings → Templates (+Branding sub-tab)
        (SettingsView.tsx TemplatesTab — fetch/PUT /api/echo/admin/settings; NO hero_config control)
```

---

## 3. Verified backend storage resolution (no filename guessing)

| Data | Collection / source | Where rendered | Editable today? |
|---|---|---|---|
| Per-event showcase content | `echo_showcases` (one doc per event; `slug` unique index verified locally) | all three experiences | ✅ Showcase CMS tabs (per `_id`) |
| Global landing hero + template prefs | `echo_settings` doc `_id:"global"` (`hero_config`, ticket/invoice/email templates, branding) | public `/echo` landing hero only (EchoEventsPice heroConfig) | template/email/branding ✅ (Settings → Templates); **hero_config ❌ no UI writes it** |
| Uploaded images/files | `echo_media` (uploads via `/echo/admin/upload`) → URL strings stored in showcase fields (`hero_image_url`, `gallery`, `partner.logo_url`, `download.file_url`, speaker photos…) | all | ✅ inside each showcase tab |
| Marketplace items/vendors/orders | `echo_catalog_items`, vendors, `echo_orders` | public event catalog section + Superadmin Catalog tab | ✅ |
| Student "My ECHO" side (tickets, invoices, orders) | `echo_registrations`, `invoices` | MyTickets/MyBookings views | n/a (user data) |
| Marketplace catalog merge scopes | `routers/marketplace.py:691-718` — `[showcase._id, slug, "master"]` merged by design | several | master scope shared across events (documented shared-by-design) |

---

## 4. Superadmin — exact change locations (verified tab → field wiring)

Editor: **Superadmin → ECHO Showcase CMS → All Showcases → click a showcase → editor modal** (tabs at `EchoShowcaseAdminView.tsx:246-291`; save by `_id` at ~6857-6887; publish/date controls in All Showcases row actions).

| Fix | Exact screen | Writable fields |
|---|---|---|
| **VNR real hero** | **Hero tab** (lines 2373-2424): "Hero Banners (carousel)" (`BannerCarouselEditor` → `hero_banners`), "Card Thumbnail (listing page + fallback)" (`hero_image_url`), "Cover Image" (`hero_cover_url`), "Registration Page Background" (`hero_bg_url`), Organizer name/logo | ✅ `hero_banners`, `hero_image_url`, `hero_cover_url`, `hero_bg_url`, `organizer_name/_logo_url` (all in `ShowcaseUpdateSchema:3063-3116`) |
| Card image on /echo listing | same Hero tab "Card Thumbnail" | ✅ |
| Registration pricing/quote/posters | Registration tab (form; fee Fields ~2744-2770) | ✅ |
| Categories/Schedule/Panels/Downloads | Categories (~2563) / Schedule (~2570) / Panels (~2577) / Downloads (`DownloadsEditor` 973-1010 — **supports file upload** + URL paste per row) | ✅ |
| Speakers | Speakers tab | ✅ |
| Sponsors/Partners | Sponsors tab (sponsors + partners editors) | ✅ |
| Section visibility | Sections tab (static toggles list ~2640-2650) | ✅ but **this currently gates only the Student Portal** (public page has no `showSection` — verify §5.1) |
| Slug | General tab "Short Title / Slug" (auto-generated; can be edited; placeholder literally reads "vnrvjit" at :2317) | ✅ |
| **Aliases (URL variants)** | ❌ **No editor field** — `ShowcaseUpdateSchema:3066` supports `aliases`, but the General tab exposes only `slug` | needs missing-control addition or DB update |
| **Cyber conclave content** | ❌ **No editor tab** (only cert-status views reference conclave, :5217+:5680); data exists in `ShowcaseUpdateSchema:3058` | needs missing-control (or DB update) |
| **Ticker messages** | ❌ **No editor tab**; field exists in schema (`ticker_messages`) and in DB data | orphaned (nothing renders it — §5.3) |
| **Global landing hero** | ❌ **No UI anywhere writes `hero_config`** (`updateEchoSettings` in `api.ts:621` has **zero callers**); backend `PUT /echo/admin/settings` fully supports it (`echo_showcase.py:6908-6914`, merge-preserving) | needs missing-control addition |
| Global templates/branding | Superadmin → Settings → **Templates** (+ Branding sub-tab) | ✅ |

---

## 5. Field-by-field source-of-truth matrix

Legends: **S** = specific event (isolated), **G** = globally shared, **H** = hardcoded in frontend, **D** = derived from API/DB. Classifications follow the requested enum.

### 5.1 Public ECHO landing `/echo`
| Field | Component (render site) | Actual data source | Scope | Classification | Superadmin control | Needed change |
|---|---|---|---|---|---|---|
| Hero badge/title/description | `EchoEventsPage` 1507-1516 | `echo_settings.hero_config` via `GET /admin/settings`; **inline defaults duplicated in JSX + backend** | G | `EDITABLE_IN_GLOBAL_SETTINGS` *only via API* → effectively `MISSING_CONFIGURATION` | ❌ (no UI writes hero_config) | Add hero editor (option E) |
| Hero mini-stats ("86 events run / 31 cities / 4.8 rating") | 1519-1529 | `hero_config.stats` w/ defaults | G | `MISSING_CONFIGURATION` (API-editable, no UI) | ❌ | Add hero editor |
| Hero Mosaic tiles ("Keynote — Main Stage", "Crowd", "Workshop") | 1555-1565 | literal strings | H | `HARDCODED_IN_FRONTEND` ❌ | ❌ | Replace with data/media or settings keys (F/E) |
| Recent hosts row ("Sreenidhi Institute", "VNR VJIET", "Khammam Institute", "CBIT Hyderabad") | 1572 | `hero_config.recent_hosts` w/ defaults | G | `MISSING_CONFIGURATION` (no UI) | ❌ | Add hero editor |
| CTA labels / targets | 1542 / 1549 | `hero_config.cta_*`; **targets hardcoded** (`@scroll section`, `/contact`) | G + H | `EDITABLE_IN_GLOBAL_SETTINGS` (labels) / `HARDCODED_IN_FRONTEND` (targets) | ❌ | Add hero editor (label); code change for target |
| Top ticker bar ("The network is a feed…", "86 ECHO events…", "267 roles matched…") | 1339-1356+ | literal strings | H | `HARDCODED_IN_FRONTEND` ❌ | ❌ | Wire to `ticker_messages`/settings or reduce |
| Section header (badge/title/description) | 1583-1592 | `hero_config.section_*` w/ fallbacks | G | `MISSING_CONFIGURATION` (no UI) | ❌ | Add hero editor |
| Event cards grid (poster, title, status, college, description, date, venue) | 1597-1657 | list endpoint → per-event doc fields `hero_image_url/hero_cover_url/banner_url/poster_url`, `title`, `event_status_badge`, `college`, `description`, `date`, `venue` | S (D) | `DERIVED_FROM_API` + `EDITABLE_IN_SHOWCASE_CMS` (Hero tab Card Thumbnail; General tab identity; SEO not shown on cards) | ✅ Hero/General tabs | none (already wired) |
| "Card Thumbnail" fallback chain | list-canonical `EchoEventsPage:363-373,447` | `hero_image_url → hero_cover_url → banner_url → poster_url → ''` | S | `DERIVED_FROM_API` (fallback order hardcoded) | ✅ Hero tab | none |

### 5.2 Public event detail `/echo/{slug}`
| Field | Render site | Data source | Scope | Classification | Superadmin | Needed change |
|---|---|---|---|---|---|---|
| Hero poster image | 1714-1723 `activeEvent.poster_banner` | doc `hero_image_url \|\| banner_url \|\| poster_url` | S (D) | `DERIVED_FROM_API` + `EDITABLE_IN_SHOWCASE_CMS` | ✅ Hero tab | none |
| Status/organizer/date/venue pills | 1728-1754 | doc `event_status_badge`, `organizer_name`, `date`, `venue` | S | `EDITABLE_IN_SHOWCASE_CMS` | ✅ General | none |
| **Prize pill** | 1750 `{activeEvent.prize_pool}` | doc `prize_pool` **raw** | S | **`HARDCODED_IN_FRONTEND` render bug** — dict values throw (verified §7) | n/a | **one-line normalize (P0, option D)** |
| Prize pool block | 2289-2310 | doc `prize_pool` (dict `.total/.grand_pool/.tracks` or string) | S | `DERIVED_FROM_API` → `EDITABLE_IN_SHOWCASE_CMS` | ✅ (in most CMS about/registration context) | none |
| Ticket price (individual/team) | 2282, registration form | `individual_fee ?? fee ?? registration.fee` / `team_fee ?? registration.team_fee` | S | `DERIVED_FROM_API` (residual `SA-HW3-…` cosmetic ticket-id fallback for anonymous flows) | ✅ Registration tab | cosmetic cleanup optional |
| Categories / verticals | 2030-2055 | doc `categories`, else hardcoded 9 HackWave verticals | S + H | `EDITABLE_IN_SHOWCASE_CMS` w/ `HARDCODED_IN_FRONTEND` fallback | ✅ Categories tab | remove/neutralize fallback (option D) |
| Conclave sessions | 2055-2075 | `activeEvent.cyber_conclave` — ⚠️ **not carried in the canonical mapping (420-455/356-373), so publicly always `undefined` → section never renders even when enabled in DB**; fallback sessions hardcoded at 2060 | S (unreachable) | `DERIVED_FROM_API` **unwired** (`MISSING_CONFIGURATION`) + `HARDCODED_IN_FRONTEND` fallback | ❌ no editor | map field in canonical (D) + add editor (E) |
| Speakers (+panel ordering) | 2105-2310 | doc `speakers` sorted per `sort_order`/order; panel members flagged `is_panel_member` | S | `EDITABLE_IN_SHOWCASE_CMS` | ✅ Speakers tab | none (verify SSL/`visible` filter parity — see 5.4 row) |
| Perks | 2316-2330 | doc `perks` | S | `EDITABLE_IN_SHOWCASE_CMS` | ✅ | none |
| Videos | 1949-2000 | doc `videos` (else `gallery_videos`) | S | `DERIVED_FROM_API` | ✅ Videos tab | none |
| Partners strip | 1936-1942 | doc `partners` | S | `EDITABLE_IN_SHOWCASE_CMS` | ✅ Sponsors tab | none |
| Gallery images | 251-257 (reg posters) | doc `gallery` / `gallery_images` | S | `DERIVED_FROM_API` | ✅ Gallery tab | none |
| Handbook button | 537-543, 1805-1816, 2605-2613 | unconditional button → `GET /showcases/{slug}/handbook` (backend serves `handbook_url` or 404; legacy `/api/echo/handbook` → snist default) | S | `DERIVED_FROM_API` (visibility **hardcoded-on**) | ✅ (add/remove value) | make button conditional on data (D) |
| Downloads section | — | **not rendered publicly** (`downloads` only in canonical mapping) | S | `MISSING_CONFIGURATION` (no public surface) | ✅ data | optional: render section (D) |
| Sponsors section | — | **not rendered publicly** | S | `MISSING_CONFIGURATION` (no public surface) | ✅ data | optional: render (D) |
| Stats / Testimonials / Timeline / FAQs / Schedule / Panels / About-cards / Eligibility / `about` organizer card | — | **not rendered publicly** (no references; portal renders them) | S | `MISSING_CONFIGURATION` (render subset difference) | ✅ data | decide parity (plan §9 P2) |
| `sections` visibility toggles | — | doc `sections` — **public page never reads it** (zero references) | S | portal-only wiring | ✅ but portal-only | add `showSection` to public render or document portal-only |
| Registration checkout / gates | 619, 2705+ | doc `registration` + server gates (`_assert_registration_open`) | S | `DERIVED_FROM_API` + `EDITABLE_IN_SHOWCASE_CMS` | ✅ Registration tab | none |

### 5.3 Student Portal `/student-portal/{slug}` (`EchoShowcaseView`)
| Field | Render site | Data source | Scope | Classification | Superadmin | Needed change |
|---|---|---|---|---|---|---|
| Portal sidebar event list | `Sidebar.tsx:79-103` (children from `listEchoShowcases`) | same list endpoint, canonical slugs | S/D | `DERIVED_FROM_API` | ✅ (create/publish events) | none |
| Deep-link slug handling | `[...segments].tsx:17-26` permissive | URL segment = slug (e.g. `vnrvjit` → alias-resolved doc) | S | `DERIVED_FROM_API` | n/a | none (works) |
| Hero banner carousel | 905-924 + 145-244 (`HeroBannerCarousel`, `EchoImg` + logo fallback) | doc `hero_banners` — **present only for SNIST (set by Oct-14 cleanup); `null` for VNR/CBIT** | S | `EDITABLE_IN_SHOWCASE_CMS` (Hero tab BannerCarouselEditor) — data currently `MISSING_CONFIGURATION` for VNR/CBIT | ✅ Hero tab | fill real banners (option A) |
| Hero card image / empty-gradient box | 927-1032 (EchoImg at 1014-1026) | doc `hero_image_url` (fallback: gradient box w/ title text) | S | `EDITABLE_IN_SHOWCASE_CMS`; **VNR currently = external picsum placeholder** → `MISSING_CONFIGURATION` (real asset) | ✅ Hero tab Card Thumbnail | upload real asset (option A) |
| Logo-on-error fallback | `EchoChrome.tsx:46-77` — SNIST logo / VNR logo / generic, keyed by matching label text | literal local assets + text matching | H | `HARDCODED_IN_FRONTEND` (legit branding fallback) | ❌ | keep (documented) |
| Stats | 1035-1042 | doc `stats` | S | `EDITABLE_IN_SHOWCASE_CMS` | ✅ Statistics tab | none |
| About + Organizer card | 1044-1078 | doc `description`, `highlights`, `organizer_name/_logo_url` | S | `EDITABLE_IN_SHOWCASE_CMS` | ✅ About tab | none |
| **Sponsors section** | 1314-1346 — `data.sponsors` **else hardcoded list incl. "VNR VJIET Alumni Assoc. — HOST CHAPTER"** | doc `sponsors` / hardcoded fallback | S + H | `EDITABLE_IN_SHOWCASE_CMS` w/ **wrong-branded `HARDCODED_IN_FRONTEND` fallback** (fires today for CBIT whose `sponsors: []`) | ✅ Sponsors tab | **remove/neutralize fallback (P1, option D)** |
| **Downloads ("Official Resources & Downloads")** | 1348-1387 — `data.downloads` **else 5 fake items (`file_url: '#'` → toast-only)** | doc `downloads` / hardcoded fallback | S + H | same as above (fires today for CBIT; VNR has 1 real row w/ **empty `file_url`** → button shows toast only) | ✅ Downloads tab (supports upload) | neutralize fallback (P1) + fill VNR file (option A) |
| Partners | 1079-1101 | doc `partners` | S | `EDITABLE_IN_SHOWCASE_CMS` | ✅ | none |
| Gallery + lightbox | 1102-1146, 786-812 | doc `gallery` (`resolveImageUrl`) | S | `EDITABLE_IN_SHOWCASE_CMS` | ✅ Gallery tab | none (VNR imgs are picsum placeholders — data task) |
| Testimonials / Timeline | 1147-1186 | doc (`visible !== false` filter) | S | `EDITABLE_IN_SHOWCASE_CMS` | ✅ | none |
| Speakers/Panelists | 1187-1214 (`visible !== false`, `is_panel_member`) | doc `speakers` | S | `EDITABLE_IN_SHOWCASE_CMS` | ✅ | none |
| Categories / Schedule / Panels | 1215-1252 | doc `categories`/`schedule`/`panels` | S | `EDITABLE_IN_SHOWCASE_CMS` | ✅ tabs | data tasks from first audit (SNIST carries VNR lists) |
| Eligibility / Team composition / Prize pool | 1253-1293 — **dict-safe** (`.total/.first/…`; string prize_pool renders nothing) | doc | S | `DERIVED_FROM_API` (partial string-prize blindness for CBIT) | ✅ | optional normalize both shapes |
| FAQs | 1296-1313 | doc `faqs` | S | `EDITABLE_IN_SHOWCASE_CMS` | ✅ | none |
| Registration CTA / handbook button | 938-967, 202-226 | doc `registration.enabled`, `event_status_badge`, `handbook_url`/`downloads.file_url` | S | `DERIVED_FROM_API` (button **conditional**) | ✅ | none |
| Conclave / ticker | — | **not rendered in portal** (no component; `sections.conclave` key unused here) | S | `MISSING_CONFIGURATION` (surface) | ❌ | decide parity (P2) |
| `sections` toggles | 829-835 `showSection` defaults all-true when absent | doc `sections` | S | `DERIVED_FROM_API` | ✅ Sections tab | none (works) |

### 5.4 Cross-cutting notes (verified)
1. **Speaker `visible` filter parity:** portal filters `visible !== false` (1187); public block (2105-2310) renders `speakers` — the panel/split rows don't gate on `visible` (spot-verified). Keep as parity-check item when verifying visually; classify `UNVERIFIED` for exact visual parity on the public page.
2. **Ordering:** both render speakers in data order; ordering is the `sort_order` the CMS stores (Speakers tab items include `sort_order`).
3. **Image resolution:** `resolveImageUrl` (`api.ts:873-885`) — `http(s):/data:/blob:` absolute passthrough; `/path` → `BASE_URL + path`. No CSP in `frontend/nginx.conf:83-89` that would block external images.
4. **`prize_pool` shape heterogeneity:** DB stores dicts for SNIST/VNR and a **string** for CBIT ("₹35,000 prize pool") — both rendered differently per surface (portal hides string-prize card; public prize block handles both; public hero pill crashes on dict — §7).

---

## 6. Why the logged-in pages differ from the public pages — verified causes, ranked

1. **Different render subsets of the same record** (verified): portal honors `sections` and renders sponsors/downloads/stats/testimonials/timeline/faqs/schedule/panels/organizer; public renders a handcrafted detail layout (hero poster, pills, prize block, categories/verticals, conclave, speakers, perks, videos, partners, gallery strip, registration) and **never renders** sponsors/downloads/stats/testimonials/timeline/faqs/schedule/panels sections. Same DB, different presentation — by design, not a data bug.
2. **`prize_pool` dict crash on the public detail page (P0 candidate):** `EchoEventsPage.tsx:1750` renders the field raw; SNIST/VNR store dicts; the repo's own React throws `Objects are not valid as a React child` (locally verified with `react-dom/server` from this repo). Root `AnalyticsErrorBoundary` exists (`app/_layout.tsx:168`), so the practical symptom is a full-tree error/blank instead of graceful degradation. **Hypothesis (not visually reproduced here): public SNIST/VNR detail pages fail to render at HEAD while the portal succeeds — consistent with "portal shows content, public doesn't".**
3. **Hero asset gaps for VNR:** `hero_banners: null` + picsum placeholder `hero_image_url` (live local DB). Portal prefers the banner carousel; absent banners → hero card → external placeholder → real-world variability (slow load/failure → gradient box w/ text; pre-remediation builds even kept a neutral empty shell on fetch failure — `git show d3bfcdd8` lines 808-868: `setData(DEFAULT_SHOWCASE)`, `catch {}`).
4. **Wrong-branded hardcoded fallbacks:** portal sponsors/downloads fallback lists (incl. "VNR VJIET Alumni Assoc." on empty-sponsors events — CBIT today) + public hardcoded vertical/track/conclave-fallbacks. Same class of defect as the fallback fixes from the Oct-7 remediation, but on different fields.
5. **Orphaned fields:** `ticker_messages` (rendered nowhere; hardcoded public ticker instead), `cyber_conclave` (no editor; never mapped into the public canonical → invisible publicly; not rendered in portal), `sections` toggles (portal-only).

---

## 7. Verified technical reproduction of the `prize_pool` crash path

- Code path: detail canonical does no normalization (`EchoEventsPage.tsx:437 prize_pool: item.prize_pool || null`) → hero pill renders it raw (`:1750`).
- DB: SNIST + VNR `prize_pool` = dict (`{"total": "₹17,50,000+", …}` / `{"total": "₹30,000", …}`), CBIT = string (read-only dump of live `studentalumniadmin.echo_showcases`).
- Runtime property (repo's own React): `renderToStaticMarkup(createElement('span', null, {total:…}))` → **throws** `Objects are not valid as a React child (found: object with keys {total, tracks})` (executed with `frontend/node_modules`).
- Consequence: React child-render error inside the detail page; root boundary `AnalyticsErrorBoundary` catches. **(On-screen exact behavior unverified — needs a browser check; the throw itself is verified.)**
- Portal equivalent is dict-safe (`EchoShowcaseView.tsx:1274-1288` uses property access only).

---

## 8. Host/format/asset sanity checks performed (blank-hero hypotheses eliminated)

| Hypothesis | Verification | Result |
|---|---|---|
| Separate portal API | `EchoShowcaseView:847` → `api.getEchoShowcase` → public `GET /showcases/{slug}` (`api.ts:429`, `auth:false`) | ❌ eliminated — same endpoint |
| `vnrvjit` resolves wrong record | `_slug_query` $or alias match → canonical doc; DB aliases contain `vnrvjit`; growing UB slug-unique index verified | ❌ eliminated — correct event |
| Invalid/unreachable URL assets (`/uploads/...`) | VNR hero URL is `https://picsum.photos/seed/echo2026-hero/1200/700`; fetched HTTP-200 `image/jpeg` from this environment | ✔ reachable here; external-asset slowness/failure remains environment-dependent (production users may differ) |
| CSP blocking remote images | `frontend/nginx.conf:83-89` — no Content-Security-Policy header | ❌ eliminated |
| Rendering condition bug | `EchoShowcaseView:905/927` — carousel only when `hero_banners.length>0`, else hero card; empty `hero_image_url` → gradient box w/ title text (1016-1026); `EchoImg` onError → logo fallback | ✔ mechanism mapped |
| Auth/data privacy | Public GET is deliberately `auth:false` (published docs only; draft gating via Bearer check backend-side `:3574-3583`) | ✔ documented |
| Old-build behavior (screenshot era, Sep 17 → Oct 7) | `git show d3bfcdd8`: silent `catch {}` kept `DEFAULT_SHOWCASE` (all-empty, `hero_image_url: null`) → **blank gradient hero + hardcoded fallback sponsor/download lists** | ✔ screened-in mechanism for the reported screenshots |

**Confirmed root cause of the VNR blank hero (data layer):** the VNR record carries no real banner assets — `hero_banners` missing/null and `hero_image_url` = an external random-photo placeholder. Rendered under either the current or the remediation-era portal, that presents as a bare/stock-image hero rather than the real event artwork. The precise *production* DB state is unverified from this machine (flagged §10).

---

## 9. Prioritized implementation plan — smallest safe fixes first

Legend mirrors the requested remedy classes (A/B/C/D/E/F).

**P0 — correctness hazards (code, small)**
1. **(D)** `EchoEventsPage.tsx:1750` — normalize the prize pill: `typeof activeEvent.prize_pool === 'string' ? activeEvent.prize_pool : activeEvent.prize_pool?.total` (one line; removes a verified render-throw for dict `prize_pool`; beneficial for SNIST/VNR public detail pages). Optionally normalize once at the canonical mapping (`:363` and `:437`) so every public display path is safe.
2. **(D)** Portal hardcoded fallback lists — `EchoShowcaseView.tsx:1321-1326` (sponsors incl. "VNR VJIET Alumni Assoc.") and `:1355-1361` (fake downloads with useless `file_url: '#'`) → render nothing (or a neutral empty state) when data is empty. Prevents fake/other-event-branded sections; mirrors the Oct-7 remediation class.

**P1 — data fixes via existing UI (no code)**
3. **(A)** VNR hero: Superadmin → ECHO Showcase CMS → VNR ECHO 2026 → **Hero** tab: upload real banner(s) into "Hero Banners (carousel)" (`hero_banners`) and a real image into "Card Thumbnail" (`hero_image_url`); replace picsum `gallery` images in the **Gallery** tab; upload the actual brochure into the **Downloads** tab row ("VNR ECHO 2026 Brochure" → `file_url` empty today; `DownloadsEditor` supports upload); optionally replace placeholder `sponsors` (Tech Corp/InnoLabs).
4. **(A)** CBIT: Sponsors tab to fill real sponsors (currently forces the hardcoded fallback — see P0.2 double protection), Downloads, stats, SEO (Title null today), and real per-event speakers (currently shares VNR's 4 placeholders).
5. **(A)** SNIST residuals from the first audit: Categories/Schedule/Panels + intended registration pricing (UI-only).
6. **(B)** Global templates/branding are already editable (Settings → Templates); no action needed beyond that screen for what it covers.

**P2 — missing editing controls (small, additive; backend already supports)**
7. **(E)** Add an **Aliases editor** to the General tab (field already in `ShowcaseUpdateSchema:3066`); lets Superadmin restore/mark `vnrvjit`-style URLs without DB surgery. (Alternatively a one-time DB `aliases` update — approved-op only.)
8. **(E)** Add a **hero_config editor** (title/description/stats/recent_hosts/CTA labels/section header) — the API merge endpoint already exists (`echo_showcase.py:6908-6914`); `updateEchoSettings` exists client-side with zero callers. Lowest-risk home: a new "ECHO Landing Hero" card in Superadmin → Settings.
9. **(E/D)** Cyber conclave: add a Conclave tab (schema field exists, `:3058`) **and** map `cyber_conclave` into the public canonical mapping (today the public section can never render — `:2058` reads a field that isn't carried). Portal parity (render or hide intentionally).
10. **(D)** Ticker: either render the per-event `ticker_messages` in the public ticker bar and add a ticker editor (schema supports), or delete the field from seeds/DB to avoid dead data. (Terminology decision, not urgent.)
11. **(D)** Public `sections`-toggle support (or documented portal-only semantics) + conditional public handbook button (hide when `handbook_url`/downloads unset, mirroring portal behavior at `EchoShowcaseView:202-208`).

**P3 — parity decisions (larger, planned)**
12. Decide section-parity between public detail and portal (stats/testimonials/timeline/schedule/panels/downloads/sponsors publicly), either by reusing the shared primitives or by introducing one shared section renderer. Only after P0-P2 land; avoid duplicating CMS systems.

No P-item requires a new backend field or API (the data model already supports everything above) → **option F is not needed anywhere.**

---

## 10. Verification checklist across the three experiences

| Scenario | Public landing `/echo` | Public detail | Portal `/student-portal/{slug}` | Superadmin record |
|---|---|---|---|---|
| SNIST HackWave | card from `hero_image_url` (real poster) → detail | renders hero poster; **risk: pill dict throw (P0.1)** | hero carousel (2 real posters) ✔; correct HackWave content; registration fee 0 (needs owner decision) | record correct except VNR-derived `categories/schedule/panels` (P1.5) |
| VNR VJIET | card uses picsum placeholder (stock image) | `hero_banners` n/a; hero = picsum; **pill dict throw (P0.1)**; sponsors/downloads rendered? no (public omits) | `vnrvjit` resolves ✔; **hero = picsum/blank-gradient (confirmed data cause §8)**; sponsors = placeholders; brochure has no file | record present; Hero tab is the fix site (P1.3) |
| CBIT | card uses local hackwave asset | prize **string** renders fine on pill; portal shows hardcoded sponsor/download fallbacks today | sponsors fallback list (incl. VNR-branded card) until P0.2 | missing SEO/stats/speakers; speakers = VNR placeholders |
| Superadmin edit → reflection | showcase fields: reflected after save + page fetch (both pages hit the same endpoints, no cache layer) | ✔ same | ✔ same | ✔ |
| Global `hero_config` change | today: **no UI path exists**; API-only (unverified impact attempt avoided) | — | — | — |

Preservation note: global content that is legitimately shared (global landing hero text/template branding, the marketplace `master` catalog scope, `EchoImg` brand-logo fallbacks, the built-in sidebar short-names) stays shared; per-event content above remains isolated via per-`_id` records — consistent with the first audit's isolation guarantees.

---

## 11. Verified facts vs hypotheses

**Verified (code + data + runtime prop):**
- Identical public endpoints used by all experiences; Superadmin CRUD is `_id`-scoped; no portal-only datasource.
- `vnrvjit` → `vnr-echo-2026` resolution (aliases + `_ALIAS_MAP`); DB-unique `slug` index.
- VNR hero data state (local DB): `hero_banners null`, `hero_image_url` picsum placeholder, gallery picsum placeholders, downloads row with empty `file_url`, placeholder sponsors, `handbook_url` null.
- SNIST hero state: real local posters in `hero_banners`/`hero_image_url`/gallery/downloads/handbook.
- Render-subset differences + `sections` honored only in the portal; public page never reads `sections`.
- Portal hardcoded sponsor/download fallback lists (and their firing condition), public hardcoded ticker/verticals/tracks/conclave-fallbacks, public unconditional handbook button.
- `cyber_conclave` never reaches the public render (absent from both canonical mappings); no editor; not rendered in the portal.
- `ticker_messages` rendered nowhere; no editor (API-client `updateEchoSettings` also uncalled).
- `hero_config` — backend GET (no auth) + PUT (admin, merge) exist; no Superadmin editor writes it.
- Dict-as-child throw reproduced locally with the repository's React (`Objects are not valid as a React child`).
- Hero/UI failover behavior of the remediation-era build (git d3bfcdd8) and `EchoImg` logo fallbacks.

**Hypotheses / unverified:**
- The exact on-screen effect of the prize-pill throw in a real browser session (throw itself verified; boundary outcome expected = blank/error at root boundary).
- Production DB contents (hero fields, doc publication state, alias values) — only the local DB was accessible.
- The production frontend build vintage (whether the deployed bundle includes `fc58bd59` and behavior parity with HEAD).
- Whether the screenshots reflecting the "vnrvjit blank portal hero" correspond to the old build's silent-catch path or a production DB with empty hero fields — both mechanisms produce the same symptom and both are addressed by P0.2/P1.3.
- Public speaker-`visible` gating parity (code-level spot check only).

---

## 12. Artifacts & audit trail

- Read-only DB dump scripts executed against `studentalumniadmin` (content fingerprints, hero/media fields for snist/vnr-echo-2026/cbit) — via the backend venv interpreter.
- React child-render reproduction script run with `NODE_PATH=frontend/node_modules` (results quoted in §7).
- Git snapshots recovered for behavior archaeology: `fc58bd59^` (EchoEventsPage pre-fix), `d3bfcdd8` (original EchoShowcaseView).
- No files other than this report were created; no code, DB, deployment, or branch operations performed.

---

## 13. Implemented remediation — 2026-10-22 (addendum, Phase 1–4)

This section records what was implemented **after** the audit above. Branch: `feat/echo-showcase-remediation`; no commits were made (per instruction). Nothing in §9 above has been *deployed* yet — correctors below are code-level and reviewed as a working tree.

### 13.1 Phase 1 — rendering & isolation fixes (completed)

| Fix | File | Change |
|---|---|---|
| Prize pill crash (P0.1) | `frontend/src/views/web/echo/prizePool.ts` (new) | Pure normaliser `prizePoolDisplayText(value)`: string → trimmed string; object → `.total` (string/number) or `''`; always a string — keeps dict/string `prize_pool` (SNIST/VNR/CBIT) safe as a React child. |
| Prize pill crash (P0.1) | `frontend/src/views/web/echo/EchoEventsPage.tsx` | Derived `prizePoolPillText` (after `activeEvent`); hero pill renders `<span>{prizePoolPillText}</span>` only when non-empty (raw `{activeEvent.prize_pool}` child removed). Prize-pool section (2289+) untouched. |
| HackWave verticals fallback | `EchoEventsPage.tsx` | The "A NATIONAL-LEVEL TECH FEST" banner block is now a guard-IIFE: renders **only** from `activeEvent.categories`; renders `null` when the event has no categories. The 9 hardcoded vertical cards were removed from the render path and the dead `_UNUSED_SAMPLE_EVENTS` array (the source of that fallback content) was deleted (~100 lines, verified unreferenced). |
| Registration track fallback | `EchoEventsPage.tsx` | Track/theme select now shows a disabled `-- Optional · Select a track --` placeholder and maps **only** `activeEvent.categories` (the 5 hardcoded HackWave AI-track options removed) — events no longer offer another event's tracks. |
| Razorpay poster fallback | `EchoEventsPage.tsx` | Checkout `image:` falls back to `undefined` instead of SNIST's `/images/hackwave/hackwave_main_poster.png`. |
| Conclave sessions fallback | `EchoEventsPage.tsx` | `sessions` uses only `conclave.sessions` (hardcoded ISC2 session list removed). |
| VNR-branded sponsor fallback | `frontend/src/views/web/portals/student/views/EchoShowcaseView.tsx` | Sponsors section renders **only** when `data.sponsors.length > 0`; the hardcoded fallback list (Deloitte / Featherless AI / "VNR VJIET Alumni Assoc." / Garuda Vigilance) was removed entirely. |
| Fake downloads fallback | `EchoShowcaseView.tsx` | Downloads section renders **only** when `data.downloads.length > 0`; the 5 fake rows (`file_url: '#'`) removed; the download button only renders when `dl.file_url` is a real non-`#` URL (no more toast-only actions on file-less rows). |
| Deep-link defaulting | `frontend/app/echo/[slug]/[event]/index.tsx` | Removed `initialSlug={slug || 'snist'}`: missing slug → list view / graceful not-found instead of SNIST content. |

Deliberately **not** changed (stays as planned P2/P3): `cyber_conclave` canonical mapping (public conclave section remains unreachable until wired — §9 item 9), `ticker_messages` wiring, `sections` handling on the public detail page, aliases editor, SNIST registration fee (requires owner confirmation), portal string-`prize_pool` card (CBIT hidden — cosmetic only).

### 13.2 Phase 2 — Superadmin "ECHO Landing Hero" editor (completed)

Added to `frontend/src/views/web/portals/superadmin/views/SettingsView.tsx`:

- New top tab **"ECHO Landing Hero"** (`tab id 'echo-hero'`, Sparkles icon) rendered by a new `EchoLandingHeroTab` component following the existing `TemplatesTab` raw-fetch + `tokenStore` conventions.
- **Load:** `GET /api/echo/admin/settings` → the returned (server-merged) `hero_config` populates: badge, title, description, stats rows (value/label/color), recent hosts (textarea, one per line), CTA primary/secondary labels, section badge/title/description.
- **Load-failure safety:** the form stays empty, saving is disabled and a Retry action is offered — saved values are never overwritten with empty defaults.
- **Save:** `PUT /api/echo/admin/settings` with **only** `hero_config` → per-key merge server-side (`echo_showcase.py:6908-6914`), so template/invoice/email/branding settings and unknown hero keys are preserved.
- **Validation:** a statistic row must have both value and label (save blocked with an explicit error toast otherwise); strings trimmed; empty host lines dropped.
- **Feedback:** Loading view while fetching, saving spinner state, success/error toast via the shared `onSaved` flash mechanism.
- **CTA targets:** preserved as-is (labels only) — the `hero_config` schema stores labels; scroll-to-events and `/contact` targets are unchanged frontend behaviour. No new backend endpoint/field was needed.

### 13.3 Phase 3 — asset handling (no code change; manual production steps)

No automatic data changes were made. The VNR record is retained as-is; the Superadmin UI already provides everything needed (Hero tab `BannerCarouselEditor`/`ImageUploadWidget`, Gallery tab, Downloads tab with `DownloadsEditor` file upload). Exact manual steps in §13.5.

### 13.4 Tests & checks — results

**Backend** (`backend\venv\Scripts\python.exe -m pytest tests/test_echo_content_remediation.py tests/test_echo_showcase_remediation.py -v` from `backend/`): **11 passed** (14.5s) —
- new `tests/test_echo_content_remediation.py`:
  1. `test_hero_settings_put_requires_admin_auth` — PUT without/with bad token → 401/403; GET stays public.
  2. `test_partial_hero_config_save_merges_per_key_and_preserves_root_settings` — hero-only PUT merges per-key (incl. unknown keys at the storage layer; note: GET projects a fixed hero-key whitelist, verified) and never changes template/branding root settings.
  3. `test_settings_save_never_modifies_showcase_records` — showcase docs byte-identical before/after a settings save (all mutations restored in `finally`).
  4. `test_events_remain_correctly_scoped` — snist/vnr-echo-2026/cbit distinct; `vnrvjit` → `vnr-echo-2026`; dict `prize_pool` for SNIST/VNR; no SNIST↔VNR sponsor/download cross-leak in payloads.
- existing `tests/test_echo_showcase_remediation.py`: 7/7 still passing.

**Frontend** (`npm test` from `frontend/`): **23 passed** (15.8s) across 4 suites —
- new `src/views/web/echo/__tests__/prizePool.test.ts` (4+2): both stored shapes render without errors via `renderToStaticMarkup` (repo React); degenerate inputs never throw; the pre-fix raw-object failure mode is pinned as a documented throw.
- new `src/views/web/echo/__tests__/echoRemediationGuards.test.ts` (11): source-level regression locks — no fallback verticals/tracks/sessions, no Razorpay poster fallback, no raw prize child, no VNR-branded sponsor cards, no fake `#` downloads, section gating conditions, no `|| 'snist'` deep-link default, not-found safety intact.
- existing `exploreData.test.tsx` + `eventTypes.test.ts`: still passing.

**Static checks:** `npm run lint` (expo lint) — repo-wide 17 errors / 1352 warnings are **pre-existing**; the touched/new frontend files report **no errors** (only pre-existing warning classes). `npx tsc --noEmit` — **42** pre-existing errors (final verified count), all in unrelated files (`CareersAdminView.tsx` ×32, `app/internships.tsx` ×9, `AlumniPortalRN.tsx` ×1); none in the touched files. Web bundle check: `npx expo export --platform web` — see §13.7 for the final status recorded at completion.

### 13.5 Manual Superadmin steps (assets, still required)

**VNR ECHO 2026** (fixes the blank/placeholder hero + brochure):
1. Superadmin → ECHO Showcase CMS → All Showcases → **VNR ECHO 2026** → edit.
2. **Hero** tab → *Hero Banners (carousel)* → upload the real VNR ECHO banner image(s) (first = primary) → `hero_banners` (drives the portal carousel). Also set /replace *Card Thumbnail* → `hero_image_url` (used by the `/echo` listing card, the public detail poster, and the portal hero card) — replacing the `petsune...`/picsum placeholder.
3. **Gallery** tab → replace the picsum placeholder images with real event photos.
4. **Downloads** tab → row "VNR ECHO 2026 Brochure" → upload the actual brochure file (replaces the empty `file_url` — port the file into `DownloadsEditor`'s per-row upload).
5. Optional: **Sponsors** tab → replace the Tech Corp / InnoLabs placeholders with real sponsors (+ logos).
6. Save. Hero/gallery/downloads are served by the same public endpoints the public page and portal use — changes reflect on both after reload.

**SNIST HackWave 3.0** (data corrections from the first audit, owner-approved):
1. **Categories / Schedule / Panels** tabs currently mirror VNR data → replace with SNIST's own values (or clear to empty states — the new code handles empty gracefully: verticals banner & track select now render event-appropriate content or nothing).
2. **Registration** tab → confirm the intended fee (currently 0 vs seed 599) — **requires explicit owner confirmation per safety rules; not changed by this remediation**.
3. Hero/Downloads already correct (real HackWave posters + handbook).

**CBIT** (optional polish): Sponsors tab (currently empty → portal now shows *no* section instead of VNR-branded cards), stats, SEO inputs, real speakers (currently shares VNR's four placeholders).

### 13.6 Completed code fixes vs outstanding production tasks

| Item | Status |
|---|---|
| Prize pill dict/string normalization | ✅ code (fs) |
| Sponsor/download fallback removal + real-file guard | ✅ code (fs) |
| Verticals / track / conclave / Razorpay fallback removal | ✅ code (fs) |
| `|| 'snist'` deep-link leak | ✅ code (fs) |
| ECHO Landing Hero editor | ✅ code (fs) — **production build** must be ≥ this commit before it appears on the deployed Superadmin |
| VNR hero/gallery/downloads/sponsor assets | ⏳ manual (Superadmin CMS, §13.5) |
| SNIST categories/schedule/panels data corrections | ⏳ manual (owner-approved) |
| SNIST fee 0 → 599 | ⏳ owner decision (not changed) |
| Production DB verification (alias/hero state in prod, whether deployed bundle includes these fixes) | ⏳ manual (post-deploy) |
| P2 editors (aliases / conclave / ticker) & public `sections` parity | ⏳ not in this phase |

### 13.7 Final verification output (recorded at run time)

- Backend pytest: `11 passed in 14.49s` (4 new + 7 existing).
- Frontend jest: `23 passed, 23 total` (4 suites; 4/4 suites green).
- Lint / tsc: pre-existing issues only (none in touched files) — counts above.
- Build: `npx expo export --platform web` → **exit 0**, 11 web bundles exported successfully (all edits compile and bundle); the generated `dist/` was deleted afterwards to keep the tree clean.

#### 13.7.1 Final pre-deployment verification (2026-10-22, re-run before commit)

- Backend pytest re-run: **11 passed in 12.39s** (same two files, all green).
- Frontend jest re-run: **23 passed** (4 suites) in 7.2s.
- ESLint (direct, 7 touched/new files): **0 errors, 21 warnings** — all pre-existing classes at lines outside the new code; baseline comparison against `HEAD` shows `EchoEventsPage.tsx` went 13 warnings → 12 (deleting `_UNUSED_SAMPLE_EVENTS` removed one; none added). `prizePool.ts` and both new test files: 0/0.
- `npx tsc --noEmit` fresh: **42 errors** — verified identical on the patched tree AND on the `HEAD` baseline (stash/re-run/restore) in exactly the same 3 unrelated files (CareersAdminView ×32, internships ×9, AlumniPortalRN ×1) → the patch introduces **zero** TypeScript errors.
- Web export re-run: `npx expo export --platform web` → **exit 0** (2 JS bundles, 25 files); `dist/` deleted afterward.
- **Live-server API smoke (uvicorn :8010 + local Mongo): 27/27 PASS** — `GET /showcases` (3 events), per-slug fetches, `vnrvjit` → canonical `vnr-echo-2026` (payload identical), CBIT string `prize_pool` + empty sponsors/downloads, CBIT/VNR payloads free of SNIST-branded content, SNIST downloads real URLs, `GET /admin/settings` public, `PUT` unauthenticated → **401**, authed PUT updates only `hero_config` per-key (other hero keys + root keys preserved), `echo_showcases` records **byte-identical** before/after settings saves, and the test values were restored afterwards.
- **Browser smoke (system Edge via Playwright, static export served with `/api` proxy): 8 URLs clean** — `/echo` (lists all 3 events), `/echo/snist`, `/echo/hackwave` (SNIST alias), `/echo/vnr-echo-2026`, `/echo/vnrvjit` (alias → VNR), `/echo/cbit` (own categories `Healthcare & MedTech…`; hides HackWave title/VNR-branded fallback strings), `/echo/unknown-showcase-xyz` (safe not-found; backend 404). **No "Objects are not valid as a React child" / hydration errors on any page.**
- Scope note: authed areas excluded from browser run (needs credentials) — see §13.8 for the remaining manual checks.

#### 13.8 Findings from final verification (code unchanged; follow-ups, not part of this patch)

1. **P2 — `app/echo/register/index.tsx:12`** renders `initialView="reg" initialSlug={slug || 'snist'}`: the generic `/echo/register` URL always shows SNIST's registration form (same defaulting class the remediation removed from the `[slug]/[event]` route). Nothing internal links to `/echo/register` today, so it is orphan/latent; align with the patched pattern (`initialSlug={slug}`) in a follow-up.
2. **P3 — `app/echo/[slug]/[event]/register.tsx:12`** has the same `slug || 'snist'` fallback; with the `[slug]` segment required for the route to match it is currently unreachable, but should be aligned for hygiene.
3. **Data hygiene (CMS-editable, no code change)**: CBIT's own record carries `partners: Deloitte / Featherless / Atlast` (likely copied from SNIST at seed time) — rendered faithfully on `/echo/cbit` "In Association With"; owner may correct it in the Showcase CMS. (VNR record's own partners are CodeSpectra + Featherless.) VNR brochure row `file_url: ''` renders as a card without a download button by design (§13.5 step 4 documents the fix); VNR hero placeholders likewise.
4. Local env note: `frontend/.env` inlines `EXPO_PUBLIC_BACKEND_URL=http://localhost:8000` into exported bundles at build time — local QA must proxy/listen on :8000; production uses its own configured URL.
