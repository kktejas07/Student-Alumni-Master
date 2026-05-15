# 🚀 Dokploy VPS Deployment Guide

Complete walkthrough for deploying **Student Alumni / NexusOS** to a VPS using
[Dokploy](https://dokploy.com). The same setup also runs with plain
`docker compose` on any Linux server.

---

## 📦 What ships in this repo

| File | Purpose |
|---|---|
| `backend/Dockerfile` | FastAPI image (Python 3.12-slim, uvicorn, non-root user) |
| `frontend/Dockerfile` | Two-stage Expo Web build → nginx static serve |
| `frontend/nginx.conf` | SPA history fallback, gzip, long-cache for hashed assets |
| `docker-compose.yml` | Both services wired with health checks |
| `.env.example` | Every env var with inline guidance |
| `backend/.dockerignore` / `frontend/.dockerignore` | Lean build contexts |

Backend exposes `:8000`, frontend exposes `:80`. Backend health: `GET /api/health`,
frontend health: `GET /healthz` (returned by nginx independently of the JS shell).

---

## 0. Prerequisites

- A VPS (DigitalOcean / Hetzner / OVH / Contabo — 2 vCPU + 2 GB RAM minimum).
- Dokploy installed (`curl -sSL https://dokploy.com/install.sh | sh`).
- A domain you can point at the VPS (e.g. `app.studentalumni.ai` + `api.studentalumni.ai`).
- A MongoDB Atlas cluster (free tier works). Whitelist the VPS public IP.
- (Optional) An Emergent LLM Key from your Emergent profile for Agent K.

---

## 0.1 ⚡ Quick-start checklist

> ✅ = tick once done. The order below is the path of least surprise.

```
[ ] VPS provisioned with public IPv4
[ ] Dokploy installed and reachable at http://<VPS_IP>:3000
[ ] GitHub repo accessible:  Tejascss/Student-Alumni-Master @ main
[ ] DNS A-records pointing at the VPS:
       app.studentalumni.ai   →  <VPS_IP>
       api.studentalumni.ai   →  <VPS_IP>
       (optional) studentalumni.ai → <VPS_IP> with 301 redirect to app.*
[ ] Mongo Atlas cluster URL + DB user created and VPS IP whitelisted
[ ] Random JWT_SECRET + FERNET_KEY generated and stored in a password manager
[ ] Emergent LLM key (if Agent K backend tasks are enabled)

[ ] Dokploy Project   →  "studentalumni"
[ ] Dokploy Service A →  backend  (build path ./backend, port 8000)
[ ] Dokploy Service B →  frontend (build path ./frontend, port 80)
[ ] Backend env vars set, "On Push" autodeploy enabled
[ ] Frontend BUILD ARGS set (NOT runtime env — Expo bakes them in)
[ ] Backend domain api.studentalumni.ai + HTTPS toggled
[ ] Frontend domain app.studentalumni.ai + HTTPS toggled
[ ] First Deploy ran green (both services healthy)
[ ] curl https://api.studentalumni.ai/api/health → 200
[ ] curl https://app.studentalumni.ai/healthz    → 200
[ ] Login as admin from app.studentalumni.ai with seeded credentials
```

---

## 0.2 🌐 DNS records (registrar dashboard)

Studentalumni.ai is the canonical domain. Add these A-records at your DNS
host (Cloudflare / Namecheap / Route 53 / etc.):

| Type | Name | Value          | TTL | Proxy / Cloud |
| ---- | ---- | -------------- | --- | ------------- |
| A    | `app`| `<VPS_IPv4>`   | 300 | DNS-only (Dokploy/Traefik handles TLS) |
| A    | `api`| `<VPS_IPv4>`   | 300 | DNS-only |
| A    | `@`  | `<VPS_IPv4>`   | 300 | DNS-only (optional — for the apex; Dokploy can redirect → `app.*`) |
| A    | `www`| `<VPS_IPv4>`   | 300 | DNS-only (optional) |

> ⚠️ **If you use Cloudflare**, set the records to **"DNS only" (grey cloud)**
> at first so Dokploy's Traefik can complete the Let's Encrypt HTTP-01
> challenge. You can re-enable the orange-cloud proxy AFTER the cert is
> issued (and switch SSL mode to **"Full (strict)"**).

Confirm propagation before deploying:

```bash
dig +short app.studentalumni.ai
dig +short api.studentalumni.ai
# both should return your VPS IP
```

---

## 1. Push the repo to GitHub

```bash
git init && git add . && git commit -m "feat: dokploy deployment files"
git remote add origin git@github.com:<your-org>/student-alumni.git
git push -u origin main
```

> ⚠️ **Never commit `.env`** — only `.env.example`. The real `.env` lives on the
> server (set in the Dokploy UI as environment variables).

---

## 2. Create the project in Dokploy

1. Log into your Dokploy dashboard (`http://<VPS_IP>:3000`).
2. **Projects → Create Project** → name it `studentalumni`.
3. Inside the project, **Create Service → Application**. We'll create **two**
   applications: one for the backend, one for the frontend.

---

## 3. Backend service

### 3.1 Source

| Field | Value |
|---|---|
| **Provider** | GitHub (or Git generic) |
| **Repository** | `your-org/student-alumni` |
| **Branch** | `main` |
| **Build Path** | `./backend` |
| **Build Type** | `Dockerfile` |
| **Dockerfile Path** | `Dockerfile` |
| **Port** | `8000` |

### 3.2 Environment variables

Copy these into Dokploy's **Environment** tab:

```env
MONGO_URL=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=studentalumniadmin
JWT_SECRET=<openssl rand -hex 32>
FERNET_KEY=<python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())">
ADMIN_EMAIL=admin@careerpath.app
ADMIN_PASSWORD=<your-strong-password>
ALLOWED_ORIGINS=https://app.studentalumni.ai
FRONTEND_URL=https://app.studentalumni.ai
UVICORN_WORKERS=2
EMERGENT_LLM_KEY=<your-emergent-key>   # optional, only if you use Agent K
```

> The backend reads `ALLOWED_ORIGINS` as a comma-separated list and automatically
> disables `allow_credentials` when `*` is used (browsers reject the combo).

### 3.3 Domain

- **Domains → Add Domain** → `api.studentalumni.ai`
- Toggle **HTTPS** → Dokploy will fetch a Let's Encrypt cert via Traefik.
- **Path**: `/`  **Port**: `8000`

### 3.4 Health check

Already declared in the Dockerfile (`/api/health`). Dokploy will mark the
container **healthy** only after Mongo responds to `ping`.

Click **Deploy**. First build takes ~3-4 min.

---

## 4. Frontend service

### 4.1 Source

| Field | Value |
|---|---|
| **Build Path** | `./frontend` |
| **Build Type** | `Dockerfile` |
| **Port** | `80` |

### 4.2 Build args (CRITICAL)

Expo bakes `EXPO_PUBLIC_*` vars into the JS bundle at **build time**, so they
must be supplied as **Build Args**, not runtime env:

```env
EXPO_PUBLIC_BACKEND_URL=https://api.studentalumni.ai
# Optional — only if you use Firebase / PostHog
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_POSTHOG_KEY=...
EXPO_PUBLIC_POSTHOG_HOST=https://app.posthog.com
EXPO_PUBLIC_ANALYTICS_ENABLED=true
```

In Dokploy: **Advanced → Build Args** (NOT Environment). If you change the
backend URL you MUST trigger a rebuild.

### 4.3 Domain

- **Domains → Add Domain** → `app.studentalumni.ai`
- Toggle HTTPS, port `80`, path `/`.

Click **Deploy**.

---

## 5. Verify the deployment

```bash
# Backend liveness + Mongo connectivity
curl -fsS https://api.studentalumni.ai/api/health
# → {"status":"ok","service":"studentalumni-backend","mongo":"ok",...}

# Frontend liveness
curl -fsS https://app.studentalumni.ai/healthz
# → {"status":"ok","service":"studentalumni-frontend"}

# CORS preflight from the frontend domain
curl -i -X OPTIONS https://api.studentalumni.ai/api/health \
  -H "Origin: https://app.studentalumni.ai" \
  -H "Access-Control-Request-Method: GET"
# → 200 with `access-control-allow-origin: https://app.studentalumni.ai`
```

Open `https://app.studentalumni.ai` and sign in with the seeded admin:

- **Email**: value of `ADMIN_EMAIL`
- **Password**: value of `ADMIN_PASSWORD`

---

## 6. Common issues & fixes

| Symptom | Cause | Fix |
|---|---|---|
| Frontend loads but every API call 404s | `EXPO_PUBLIC_BACKEND_URL` was missing or set as runtime env | Put it under **Build Args** and rebuild |
| `CORS: response not allowed` in browser console | `ALLOWED_ORIGINS` doesn't include the frontend domain (or has a trailing slash) | `ALLOWED_ORIGINS=https://app.studentalumni.ai` — no trailing `/` |
| Backend container is **unhealthy** | Mongo URL wrong, IP not whitelisted, or DNS blocked | `docker logs studentalumni-backend`; whitelist VPS IP in Atlas → Network Access |
| 401 on every request right after login | `JWT_SECRET` rotated between builds | Set a permanent `JWT_SECRET` (32+ random chars) and keep it stable |
| Build OOM on small VPS | Expo web export needs ~3 GB RAM | Bump the swap: `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile` |
| File upload fails with 413 | nginx reverse-proxy body limit | In Dokploy Traefik labels, add `traefik.http.middlewares.bigbody.buffering.maxRequestBodyBytes=20000000` |
| Build error: `EXPO_PUBLIC_BACKEND_URL build-arg is required` | The frontend Dockerfile guards against an empty URL | Provide it as a Build Arg in Dokploy |

---

## 7. Local smoke test (before pushing)

Reproduce production locally:

```bash
cp .env.example .env
# Edit MONGO_URL, JWT_SECRET, EXPO_PUBLIC_BACKEND_URL=http://localhost:8000

docker compose build
docker compose up -d
docker compose ps          # both services should be (healthy)
curl -fsS http://localhost:8000/api/health
curl -fsS http://localhost/healthz
```

Tear down:

```bash
docker compose down
```

---

## 8. Updating after the first deploy

Dokploy auto-builds on every push to the configured branch (webhook).
If you change **build-time** vars (anything in `EXPO_PUBLIC_*`), trigger a
manual **Rebuild** so the new bundle picks them up.

For backend-only changes, a **Restart** is enough.

---

## 9. Backups & secrets hygiene

- **Mongo**: rely on Atlas point-in-time backups (free tier = 2 days).
- **JWT_SECRET / FERNET_KEY**: store a copy in your password manager. If you
  rotate `FERNET_KEY`, previously stored marketplace credentials become
  unreadable — re-enter them.
- **Admin password**: change it from inside the app after first login.

---

Happy shipping! 🚢  If something blows up, grab logs with:

```bash
docker logs -f studentalumni-backend
docker logs -f studentalumni-frontend
```

…and ping the assistant with the exact error string + the failing endpoint.

---

## 10. Agent K scheduled (cron) automations — Production notes

Since `v0.16.0`, the backend boots an **APScheduler `AsyncIOScheduler`**
in-process and polls `agent_k_schedules` every 60 seconds. This works
out-of-the-box on **single-replica** Dokploy deployments (the default).

### If you ever scale to multiple replicas
Multiple replicas would each run their own scheduler tick and could
double-fire every schedule. Pick **one** of:

1. **Leader election by env var** — set `AGENT_K_SCHEDULER_ENABLED=1`
   on exactly one replica; gate `start_scheduler()` on it. (Easiest.)
2. **Run the API + scheduler as separate services** — keep your N
   API replicas with the env flag OFF, and run one dedicated `worker`
   service with the flag ON, same image, same Mongo, no public port.
3. **Switch APScheduler to a `MongoDBJobStore`** — out of scope here,
   but the schedule rows are already in Mongo so the migration is
   small. Open an issue if you need it.

### Verifying the scheduler is healthy
```bash
docker logs studentalumni-backend 2>&1 | grep -i "agent-k.scheduled"
# Expected:
#   agent-k.scheduled scheduler started (tick=60s)
#   agent-k.scheduled[fire] 6a0617…  user=…  title=…
```

If you see schedules accumulating in `agent_k_schedules` with stale
`next_run_at`, the scheduler isn't ticking — check the container is
healthy and that the import didn't fail (`pip show apscheduler`).

### Backups
The schedule rows + their `agent_runs` history are stored in Mongo;
no extra backup wiring is required beyond Atlas point-in-time backup.

---

## 11. 🛠 Operator cheat-sheet

| Need to… | Command (run on the VPS via Dokploy → Open Terminal) |
| --- | --- |
| Tail backend logs | `docker logs -f studentalumni-backend` |
| Tail frontend logs | `docker logs -f studentalumni-frontend` |
| Force a rebuild (frontend, after BUILD ARG change) | Dokploy → service → **Rebuild** |
| Restart only (no rebuild) | Dokploy → service → **Reload** |
| Confirm Atlas connection | `docker exec studentalumni-backend python -c "from pymongo import MongoClient,os; print(MongoClient(os.environ['MONGO_URL']).admin.command('ping'))"` |
| Check Agent K scheduler heartbeat | `docker logs studentalumni-backend 2>&1 \| grep "agent-k.scheduled"` |
| Rotate Mongo password | Atlas → Database Access → Edit user → set new password → update `MONGO_URL` in Dokploy env → **Reload** backend |
| Rotate JWT_SECRET | Set new value in Dokploy env → **Reload** backend (all sessions invalidated) |
| Force HTTPS cert reissue | Dokploy → Domain → **Generate Cert** |

---

## 12. 🌍 Domain summary (current canonical)

| Surface | URL | Service | Build path | Container port |
| --- | --- | --- | --- | --- |
| Student / Alumni / College / Mentor / Super-Admin web app | https://app.studentalumni.ai | `frontend` | `./frontend` | 80 |
| REST API + Agent K | https://api.studentalumni.ai | `backend` | `./backend` | 8000 |
| Apex (optional) | https://studentalumni.ai | redirect → `app.*` (Dokploy → Frontend → Domains → enable **"Redirect from root"**) | — | — |
| `www` (optional) | https://www.studentalumni.ai | same redirect | — | — |

> **Single source of truth:** the production domain is **`studentalumni.ai`**
> — anywhere you find the legacy `studentalumni.in` references in code
> comments, README, or CI scripts, swap to `.ai`. The seed admin email
> `admin@studentalumni.in` (in `backend/portals.py` and tests) is **mock
> data** and is NOT a deliverable user email; leave it alone unless you
> intend to seed a different admin.
