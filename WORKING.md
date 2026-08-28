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
| - | - | - | - | - |

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

