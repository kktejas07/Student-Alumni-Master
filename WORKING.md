# Working — Agent & Developer Coordination

> **Purpose:** Track who is working on what across all agents and developers.
> Update this file when you start or finish work so others know the status.

---

## Active Work

| Agent / Person | Working On | Files / Area | Status | Notes |
|---------------|-----------|--------------|--------|-------|
| Devender (opencode) | Restored LandingPage layout for Echo | `frontend/src/views/web/echo/EchoEventsPage.tsx`, `frontend/src/views/web/LandingPage.tsx` | Done | Fixed missing SAWatermark, SAModernLoader, activeEvent init order, Browse button visibility, Home nav URL |
| Devender (opencode) | Restored corrupted register.tsx | `frontend/app/echo/[slug]/register.tsx` | Done | File was truncated/broken — restored from git |
| Devender (opencode) | Metro config path alias | `frontend/metro.config.js` | Done | Added `@/` alias resolver for Metro bundler |
| Devender (opencode) | Backend import fix | `backend/routers/admin/agents.py` | Done | Added missing `Query` import |
| Antigravity | Echo registration layout/logic and real-time coupons | `frontend/src/views/web/echo/EchoEventsPage.tsx` | Done | Integrated real-time verify-coupon API, added coupon code to registration payload, fixed team size price calculation in Razorpay button, audited poster/gallery admin UI |
| Devender (opencode) | Page lock re-lock on browser tab switch | `frontend/src/views/web/portals/superadmin/views/EchoShowcaseAdminView.tsx` | Done | Added visibilitychange listener to re-lock registrations page when user switches browser tabs |
| Devender (opencode) | My Tickets page → latest student-portal UI + marketplace orders section | `frontend/src/views/web/portals/student/views/MyTicketsView.tsx`, `frontend/src/models/services/api.ts`, `frontend/src/views/web/portals/student/iconShims.tsx` | Done | Rewrote to GlassCard/SC/FONTS design language, added Marketplace Orders section with pickup QR + invoice, API helpers myMarketplaceOrders/myMarketplaceInvoice/myMarketplaceOrderQr, Store icon shim |
| Devender (opencode) | Vendor catalog form + superadmin catalog form enrichment | `frontend/src/views/web/portals/vendor/views/VendorCatalogView.tsx`, `frontend/src/views/web/portals/superadmin/views/CatalogOrdersManager.tsx`, `backend/routers/vendors.py`, `frontend/src/models/services/api.ts` | Done | Added file→base64 image upload, description, stall_no, stall_location, is_active toggle, stock_limit to vendor catalog form; expanded backend VendorCatalogItemInput + stock_remaining/is_active on create; superadmin form got image upload + stall + availability toggle; added admin api.ts marketplace helpers (catalog/coupon/vendor CRUD, coupon-preview) |

---

## Completed Work

| Date | Agent / Person | What | Files Changed |
|------|---------------|------|---------------|
| 2026-08-28 | opencode | Created SAWatermark component | `frontend/src/views/web/components/SAWatermark.tsx` |
| 2026-08-28 | opencode | Created SAModernLoader component | `frontend/src/views/components/SAModernLoader.tsx` |
| 2026-08-28 | opencode | Fixed Metro @ alias resolver | `frontend/metro.config.js` |
| 2026-08-28 | opencode | Fixed activeEvent TDZ error | `frontend/src/views/web/echo/EchoEventsPage.tsx` |
| 2026-08-28 | opencode | Fixed StyleSheet undefined error | `frontend/app/echo/[slug]/index.tsx` |
| 2026-08-28 | opencode | Fixed Browse all events button visibility | `frontend/src/views/web/LandingPage.tsx` |
| 2026-08-28 | opencode | Fixed Home nav URL not updating | `frontend/src/views/web/LandingPage.tsx` |
| 2026-08-28 | opencode | Fixed missing Query import in agents.py | `backend/routers/admin/agents.py` |
| 2026-08-28 | opencode | Restored corrupted register.tsx from git | `frontend/app/echo/[slug]/register.tsx` |
| 2026-09-03 | opencode | Fixed registrations page lock not re-locking on browser tab switch | `frontend/src/views/web/portals/superadmin/views/EchoShowcaseAdminView.tsx` |
| 2026-09-03 | opencode | Updated My Tickets to latest student-portal UI + added marketplace orders section (QR pickup, invoice, coupon breakdown); added myMarketplaceOrders/myMarketplaceInvoice/myMarketplaceOrderQr API helpers + Store icon shim | `frontend/src/views/web/portals/student/views/MyTicketsView.tsx`, `frontend/src/models/services/api.ts`, `frontend/src/views/web/portals/student/iconShims.tsx` |
| 2026-09-03 | opencode | Enriched vendor catalog form (image upload, description, stall_no, stall_location, is_active toggle, stock_limit) and superadmin catalog form (image upload + stall + availability); expanded backend VendorCatalogItemInput with stock_remaining/is_active handling; added admin marketplace API helpers to api.ts | `frontend/src/views/web/portals/vendor/views/VendorCatalogView.tsx`, `frontend/src/views/web/portals/superadmin/views/CatalogOrdersManager.tsx`, `backend/routers/vendors.py`, `frontend/src/models/services/api.ts` |

---

## Known Issues / Backlog

| Issue | Priority | Assigned To | Notes |
|-------|----------|-------------|-------|
| lucide-react-native export warning | Low | - | Metro falls back to file-based resolution |
| Qdrant set_model warning | Low | - | Non-critical, embedding models not configured |
| EchoCertificateStudio activeEventFilter | Medium | - | Superadmin certificate studio filter |

---

## How to Use This File

1. **Before starting work:** Check "Active Work" to see if someone is already on it
2. **When you start:** Add a row to "Active Work" with your name/agent, what you're doing, and which files
3. **When you finish:** Move the entry to "Completed Work" with the date
4. **If blocked:** Add to "Known Issues / Backlog"

### Agent Naming Convention
- `opencode` — OpenCode CLI agent
- `antigravity` — Antigravity Clause agent
- `[name]` — Human developer

