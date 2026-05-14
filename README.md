# SA Platform — Student / Alumni / College / Super-Admin / Mentor

A unified, multi-portal career platform with an automation-grade AI operator
(**Agent K**), live dashboards, and a **FinTax360 Glass-Dark** design system
(Student portal) layered on top of the **NexusOS** multi-portal foundation.

> One codebase. Five portals. One AI agent that can plan, ask for consent,
> run multi-step tasks, AND now operate on a **cron schedule** — across
> every module on the user's behalf.

---

## ✦ Highlights

* 🤖 **Agent K** — Claude-powered automation operator with planner → approval
  gates → tool execution → friendly summary, accessible via Cmd/Ctrl+K from
  anywhere, with a dedicated full-screen view at `/agent-k`. **BYO-AI**:
  users connect their own provider key via Profile → Tools & Integrations.
  **Prescription Cards** drive the UI — the agent derives action cards from
  dashboard data rather than asking for free-form prompts.
* ⏰ **Agent K Scheduler** (`v0.16.0`) — recurring automations on
  `daily / weekly / hourly / cron` cadences. Powered by an in-process
  **APScheduler** AsyncIOScheduler that polls Mongo every 60 seconds.
  Plans containing spend / submit / communicate steps pause at approval
  rather than auto-execute. Multi-replica safe via
  `AGENT_K_SCHEDULER_ENABLED` env flag (see DOKPLOY.md §10).
* 🎨 **FinTax360 Glass-Dark theme** (`v0.18.x`, Student portal) — animated
  multicolor aurora (violet · blue · teal orbs drifting across a deep
  navy canvas), translucent glass cards with `backdrop-filter: blur(22px)
  saturate(180%)`, fade+slide-in on mount, hover lift + violet glow, 64-px
  grid overlay with radial mask. Typography deliberately distinct from
  the usual Inter/Roboto: **Outfit** (display) · **Plus Jakarta Sans**
  (body) · **JetBrains Mono** (KPI numerics).
* 🎨 **NexusOS design system** — shared dark palette (`src/theme/nexus.ts`)
  applied across Alumni, College, Super-Admin, Mentor portals and auth
  pages; each portal keeps its accent identity (Alumni LinkedIn blue,
  College indigo, Mentor teal, Super Admin amber).
* 📊 **Intelligence Center dashboard** — sparkline KPI tiles, smooth-area
  growth chart, live activity stream, powered by `/api/student/intelligence`.
* 🪟 **Collapsible sidebar** — 264 ⟷ 72 px on Student portal with persisted
  preference (localStorage + `/api/user/preferences`) and Cmd/Ctrl+B shortcut.
* 💼 **15 modules** — Career AI, Internships, Applications, Network, Bookings,
  Events, Workshops, Courses, Financial, Deals, Wallet, Higher-Ed, Rentals,
  Profile, Insurance.

---

## 🧱 Tech Stack

| Layer       | Stack                                                                    |
| ----------- | ------------------------------------------------------------------------ |
| Frontend    | React Native (Expo SDK 54) · Expo Router · Reanimated 3 · Zustand        |
| Charting    | react-native-svg (no web-only chart libs)                                |
| Theming     | NexusOS palette (`src/theme/nexus.ts`) + FinTax360 PALETTE (student)     |
| Typography  | DM Sans (multi-portal) · Outfit + Plus Jakarta + JetBrains Mono (student)|
| Backend     | FastAPI · Motor (async Mongo) · PyJWT · **APScheduler 3.10**             |
| AI          | Anthropic Claude 4.5 via `emergentintegrations.LlmChat` (admin tasks)    |
|             | + user-provided OpenAI / Anthropic / Gemini keys via BYO-AI integrations |
| DB          | MongoDB (local Mongo via `MONGO_URL`)                                    |
| Auth        | JWT access + refresh tokens (HS256)                                      |
| Scheduling  | APScheduler `AsyncIOScheduler` (60 s tick) + croniter for cron parsing   |
| CI / CD     | GitHub Actions (release.yml + extract-changelog.sh) → Dokploy            |

---

## 📁 Repository Layout

```
app/
├── backend/                     FastAPI service (port 8001)
│   ├── server.py                Monolith — auth, portals, AI, wallet, … (~5000 LOC)
│   ├── agent_k.py               Agent K — planner + tool registry + approval gates
│   ├── ai_briefs.py             Daily-brief AI
│   ├── portals.py               Per-portal dashboard endpoints (Student Intel,
│   │                            College, SA aggregations)
│   ├── core/                    Reusable utilities (db, deps, security)
│   ├── .env                     MONGO_URL, JWT_SECRET, EMERGENT_LLM_KEY, …
│   └── requirements.txt         Python deps
└── frontend/                    Expo Router web app (port 3000)
    ├── app/                     File-based routes
    │   ├── _layout.tsx          Root stack + Toast + Agent K Quick Launcher
    │   ├── (auth)/login.tsx     etc.
    │   ├── (tabs)/              Bottom-tab routes
    │   ├── student-portal.tsx
    │   ├── alumni-portal.tsx
    │   ├── college-portal.tsx
    │   ├── super-admin.tsx
    │   ├── mentor-portal.tsx
    │   ├── wallet.tsx
    │   ├── agent-k.tsx          Agent K workspace
    │   ├── agent-k/runs.tsx     Run history
    │   └── nexus-os.tsx         Standalone Intelligence Center spec
    ├── src/
    │   ├── theme/
    │   │   ├── nexus.ts         Shared NexusOS palette + helpers (NEW)
    │   │   ├── ThemeContext.tsx Light/Dark
    │   │   ├── apple.ts         Apple HIG type/spacing
    │   │   └── breakpoints.ts
    │   ├── views/web/
    │   │   ├── portals/         student / alumni / college / superadmin / mentor
    │   │   │   └── <portal>/
    │   │   │       ├── Sidebar.tsx
    │   │   │       ├── TopBar.tsx
    │   │   │       ├── tokens.ts        Portal-specific tokens (consume NX)
    │   │   │       └── views/           Sub-pages
    │   │   ├── agent-k/
    │   │   │   ├── AgentKLauncher.tsx
    │   │   │   └── AgentKQuickLauncher.tsx
    │   │   └── FeaturePageShell.tsx
    │   ├── viewmodels/
    │   │   └── stores/
    │   │       ├── authStore.ts
    │   │       ├── sidebarStore.ts      Collapsed-state persistence
    │   │       └── agentKStore.ts       Quick-launcher + active-run state
    │   ├── motion/apple/        Reusable Reanimated primitives
    │   └── models/services/api.ts       request() helper (auto-tokenised)
    ├── package.json
    └── .env                     EXPO_PACKAGER_*, EXPO_BACKEND_URL
```

---

## 🚀 Running Locally

### Prerequisites
* **Node 20+** and **Yarn 1.x**
* **Python 3.11+** and **pip**
* **MongoDB 6+** running locally on the default port
* An **`EMERGENT_LLM_KEY`** (or alternatively a direct Anthropic API key —
  see below for swap-in instructions)

### 1. Clone & install

```bash
git clone <repo>
cd app

# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Critical: emergentintegrations may need the wheel index
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

# Frontend
cd ../frontend
yarn install
```

### 2. Environment files

Create `backend/.env`:

```env
# Database
MONGO_URL="mongodb://localhost:27017"
DB_NAME="sa_platform"

# Auth (generate a long random string for JWT_SECRET in production)
JWT_SECRET="dev-secret-change-me"

# LLM — use Emergent Universal Key (recommended for dev)
EMERGENT_LLM_KEY="sk-emergent-…"

# Optional: replace EMERGENT_LLM_KEY usage with these later
# ANTHROPIC_API_KEY="sk-ant-…"
```

Create `frontend/.env` (already managed by Expo in cloud env — locally add):

```env
EXPO_BACKEND_URL=http://localhost:8001
```

> The PROTECTED variables `EXPO_PACKAGER_PROXY_URL` and `EXPO_PACKAGER_HOSTNAME`
> are only required in cloud environments — leave them unset locally.

### 3. Start the services

```bash
# 3a. Make sure Mongo is running
brew services start mongodb-community         # macOS
sudo systemctl start mongodb                  # Linux

# 3b. Backend (port 8001)
cd backend
source .venv/bin/activate
uvicorn server:app --reload --host 0.0.0.0 --port 8001

# 3c. Frontend (port 3000)
cd frontend
yarn start              # web build + Expo Go QR
# or for an isolated web build:
yarn expo start --web
```

Open <http://localhost:3000>. The Kubernetes-ingress rule that routes
`/api/*` → `8001` in cloud does **not** exist locally, so the frontend
uses `EXPO_BACKEND_URL` to talk directly to the backend.

### 4. Default credentials

Bootstrapped via `backend/seed_*` scripts (run once after Mongo is empty):

```bash
cd backend
python seed_demo_data.py        # creates demo users + sample DB content
```

| Role         | Email                              | Password         |
|--------------|------------------------------------|------------------|
| Student      | realtime@studentalumni.in          | RealTime@2026    |
| Alumni       | alumni01@test.com                  | TestPass@123     |
| College Admin| iitb@university.in                 | TestPass@123     |
| Super Admin  | admin@careerpath.app               | Admin@12345      |
| Mentor       | mentor01@test.com                  | TestPass@123     |

---

## 🤖 Agent K — Configuration

Agent K is wired to Claude 4.5 via `emergentintegrations`. To swap providers:

1. Open `backend/agent_k.py`.
2. Replace the two `_plan_with_claude` and `_summarize_results` helpers
   with calls to your preferred SDK (OpenAI, Anthropic direct, Gemini).
3. Tool registry (`TOOL_REGISTRY`) is provider-agnostic — only the planner /
   summariser helpers touch the LLM API.

### Tool side-effect classes

| Class       | Approval | Examples                                       | Status     |
|-------------|----------|------------------------------------------------|------------|
| read        | none     | `search_jobs`, `get_wallet_balance`, …         | ✅ Live     |
| write       | none     | `draft_application`, `draft_sop`, `draft_message` | ✅ Live (Claude generation) |
| spend       | required | `add_money_to_wallet`, `book_mentor_session`   | ⚠️ MOCKED  |
| submit      | required | `submit_application`                           | ⚠️ MOCKED  |
| communicate | required | `send_message`                                 | ⚠️ MOCKED  |

> **MOCKED** = backend writes a row to `agent_actions` (kind=`mock_*`) but
> performs **no real payment / partner-ATS / message dispatch**. Wire real
> integrations (Razorpay, LinkedIn API, etc.) inside the corresponding
> dispatcher in `agent_k.py` when ready.

Keyboard shortcuts:

| Shortcut     | Action                          |
|--------------|---------------------------------|
| Cmd/Ctrl + K | Open Agent K quick launcher     |
| Cmd/Ctrl + B | Toggle Student sidebar collapse |
| Esc          | Close Agent K modal             |

---

## 🛠 Common Tasks

```bash
# Backend tests (curl-based smoke)
cd backend
python -m pytest -q                      # if tests/ exists

# Lint
cd frontend && yarn lint
cd backend && ruff check .

# Restart Expo / FastAPI when files don't hot-reload
sudo supervisorctl restart expo
sudo supervisorctl restart backend
```

### Update dependencies
* Frontend: `yarn add <pkg>` (package.json auto-updates)
* Backend:  install in venv, then `pip freeze > requirements.txt`

---

## 🔌 Public API Surface (high-level)

```
POST   /api/auth/login                    JWT login
GET    /api/student/dashboard
GET    /api/student/intelligence          Sparklines + chart + activity feed
GET    /api/live/counters                 Polled every 15s

POST   /api/agent-k/run                   Plan a new run
POST   /api/agent-k/runs/{id}/execute     Execute approved plan
POST   /api/agent-k/runs/{id}/approve-step Per-step consent for spend/submit
POST   /api/agent-k/runs/{id}/cancel
GET    /api/agent-k/runs[/{id}]
GET    /api/agent-k/templates
GET    /api/agent-k/preferences           Auto-approve thresholds
PATCH  /api/agent-k/preferences

GET    /api/user/preferences              Sidebar collapse + tone
PATCH  /api/user/preferences

GET    /api/admin/super-overview
GET    /api/admin/super/{colleges|students|mentors|alumni|events|payments|…}
```

Full surface lives in `backend/server.py` + module-specific routers
(`portals.py`, `agent_k.py`, `ai_briefs.py`, …).

---

## 📦 Production Deploy Notes

* The web build is **Expo Router** — output a static SPA via
  `yarn expo export --platform web` and serve it behind nginx.
* The FastAPI service binds to `0.0.0.0:8001` (do **not** change).
* In Kubernetes, the ingress rewrites every `/api/*` request to the
  backend service on port 8001. Locally this is replaced by setting
  `EXPO_BACKEND_URL` in `frontend/.env`.
* MongoDB collection `agent_runs` will grow over time — set up a TTL
  index or scheduled archive once you go to prod.

---

## 📅 Changelog

See [`CHANGELOG.md`](./CHANGELOG.md) for the full release notes.

---

## License

Proprietary — © Student Alumni Pvt. Ltd. All rights reserved.
