# Student Alumni Platform

A full-stack platform connecting students and alumni — built with **FastAPI** (Python 3.12) and **Expo React Native** (TypeScript).

---

## 🛠️ Development Setup

> **From a clean clone to a running server in under 5 minutes.**

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Python | 3.12+ | `python3 --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | bundled with Node |
| Git | any | — |

> A running **MongoDB** instance is required. [MongoDB Atlas free tier](https://www.mongodb.com/atlas) works perfectly for development.

---

### Option A — One-command setup (recommended)

```bash
# 1. Clone the repository
git clone https://github.com/kktejas07/Student-Alumni-Master.git
cd Student-Alumni-Master

# 2. Create the virtual environment + install all dependencies
make setup          # creates backend/.venv and installs requirements.txt
                    # also copies backend/.env.example → backend/.env

# 3. Fill in your secrets
nano backend/.env   # set MONGO_URL, JWT_SECRET, FERNET_KEY at minimum

# 4. Start the backend
make backend        # FastAPI on http://localhost:8080
                    # Swagger UI → http://localhost:8080/docs

# 5. (Separate terminal) Start the frontend
make frontend       # Expo web on http://localhost:8081
```

---

### Option B — Manual setup

```bash
# Clone
git clone https://github.com/kktejas07/Student-Alumni-Master.git
cd Student-Alumni-Master/backend

# Create virtual environment (standardized name: .venv)
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and set MONGO_URL, JWT_SECRET, FERNET_KEY

# Start the server
uvicorn server:app --host 0.0.0.0 --port 8080 --reload
# → http://localhost:8080/docs
```

---

### Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URL` | ✅ | MongoDB connection string |
| `DB_NAME` | ✅ | Database name (default: `studentalumni`) |
| `JWT_SECRET` | ✅ | 32+ random chars. Generate: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `FERNET_KEY` | ✅ | AES key for PII encryption. Generate: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated CORS origins (e.g. `http://localhost:8081`) |
| `ADMIN_EMAIL` | ✅ | Seeded admin email |
| `ADMIN_PASSWORD` | ✅ | Seeded admin password |
| `SMTP_HOST` | optional | For OTP/forgot-password emails |
| `OPENAI_API_KEY` | optional | For AI features |

---

### Running Tests

```bash
# Backend (requires the server to be running on :8080)
make test

# Frontend
make test-frontend

# With dev tools installed (make setup-dev first):
make lint      # flake8
make format    # black + isort
```

---

### All `make` targets

```
make help           # list all targets
make setup          # create .venv + install runtime deps
make setup-dev      # also install test/lint tools
make backend        # start FastAPI (hot-reload, port 8080)
make frontend       # start Expo web (port 8081)
make test           # run pytest
make lint           # flake8
make format         # black + isort
make docker-up      # full stack via docker compose
make clean          # remove .venv + __pycache__
```

---

### Project Structure

```
Student-Alumni-Master/
├── backend/
│   ├── .env.example          ← copy to .env, fill in secrets
│   ├── requirements.txt      ← runtime Python dependencies
│   ├── requirements-dev.txt  ← dev/test tools (black, pytest, etc.)
│   ├── server.py             ← FastAPI application entry point
│   ├── routers/              ← modular route handlers
│   ├── core/                 ← shared DB, security, models
│   ├── services/             ← business logic services
│   └── tests/                ← pytest test suite
├── frontend/
│   ├── app/                  ← Expo Router pages
│   ├── src/views/            ← reusable UI components
│   └── src/lib/              ← API helpers
├── Makefile                  ← one-command dev workflow
├── run.sh                    ← alternative bash dev runner
└── docker-compose.yml        ← local Docker stack
```

---

## 🚀 Deployment Guide



## 📁 Project Structure

```
Student-Alumni-Master/
├── Dockerfile.frontend       # Root-level Dockerfile for frontend (used by Dokploy)
├── Dockerfile.backend        # Root-level Dockerfile for backend (used by Dokploy)
├── frontend/
│   ├── nginx.conf            # Nginx config for SPA routing
│   ├── package.json          # Frontend dependencies
│   ├── app/                  # Expo Router app
│   └── .dockerignore         # Docker build exclusions
├── backend/
│   ├── requirements.txt      # Python dependencies
│   ├── server.py            # FastAPI main application
│   ├── .dockerignore         # Docker build exclusions
│   └── ...                   # Other backend modules
├── docker-compose.yml        # Local development compose file
├── README.md                 # This file
└── DOKPLOY.md               # Detailed Dokploy documentation
```

---

## 🐳 Dockerfiles Explanation

### Dockerfile.frontend (Inside frontend/ directory)

**Location:** `frontend/Dockerfile.frontend`

**Purpose:** Builds the React Native/Expo web app and serves it via nginx

**Build Context:** `./frontend` (Docker Context Path must be `./frontend`)

**Build Process:**
1. **Stage 1 (builder):** Uses Node.js 20 Alpine to run `npx expo export --platform web`
2. **Stage 2 (runtime):** Serves static files via nginx on port 80

**Key Features:**
- Multi-stage build for smaller image size
- Health check at `/healthz` endpoint
- Non-root nginx process
- Gzip compression enabled
- SPA fallback (all routes go to index.html)

**Build Args Required:**
```
EXPO_PUBLIC_BACKEND_URL=https://studentalumni.ai
```

### Dockerfile.backend (Inside backend/ directory)

**Location:** `backend/Dockerfile.backend`

**Purpose:** Builds the FastAPI Python backend

**Build Context:** `./backend` (Docker Context Path must be `./backend`)

**Key Features:**
- Python 3.12 slim image
- Installs all dependencies from requirements.txt
- Non-root user (`appuser`) for security
- Health check at `/api/health` endpoint
- Runs on port 8000 with Uvicorn

---

## 🚀 Dokploy Deployment

### Step 1: Create Project

In Dokploy dashboard:
1. **Projects → Create Project** → Name: `Student Alumni`

### Step 2: Create Backend Application

| Field | Value |
|-------|-------|
| **Name** | `backend` |
| **Provider** | GitHub |
| **Repository** | `kktejas07/Student-Alumni-Master` |
| **Branch** | `main` |
| **Build Path** | `./backend` |
| **Build Type** | Dockerfile |
| **Dockerfile Path** | `./Dockerfile` |
| **Docker Context Path** | `./backend` |
| **Port** | `8000` |

**Environment Variables:**
```env
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=studentalumniadmin
JWT_SECRET=your-32-char-random-string
FERNET_KEY=Fernet-key-generated-via-python
ALLOWED_ORIGINS=https://studentalumni.ai,https://api.studentalumni.ai
FRONTEND_URL=https://studentalumni.ai
UVICORN_WORKERS=2
```

### Step 3: Create Frontend Application

| Field | Value |
|-------|-------|
| **Name** | `frontend` |
| **Provider** | GitHub |
| **Repository** | `kktejas07/Student-Alumni-Master` |
| **Branch** | `main` |
| **Build Path** | `./frontend` |
| **Build Type** | Dockerfile |
| **Dockerfile Path** | `./Dockerfile` |
| **Docker Context Path** | `./frontend` |
| **Port** | `80` |

**Build Args (NOT Environment Variables):**
```
EXPO_PUBLIC_BACKEND_URL=https://studentalumni.ai
```

---

## 🌐 Domain Configuration (Critical for 502 Fix)

### Option 1: Path-Based Routing (Recommended)

Both frontend and backend on same domain:

| Domain | Path | Container | Port | Priority |
|--------|------|------------|------|----------|
| `studentalumni.ai` | `/api` | backend | 8000 | 100 (higher) |
| `studentalumni.ai` | `/` | frontend | 80 | 10 (lower) |

**Why This Works:**
- `/api/*` routes to backend (higher priority)
- All other paths route to frontend (SPA fallback)

### Option 2: Separate Subdomains

| Domain | Container | Port |
|--------|-----------|------|
| `api.studentalumni.ai` | backend | 8000 |
| `studentalumni.ai` | frontend | 80 |

---

## 🔧 Troubleshooting 502 Bad Gateway

### Root Causes:

1. **Container not running** - Check if containers are running in Dokploy
2. **Wrong port** - Verify container port matches (80 for frontend, 8000 for backend)
3. **Network isolation** - Containers must be on `dokploy-network`
4. **Domain not attached** - Domain must have container attached
5. **SSL not ready** - Wait 2-5 minutes for Let's Encrypt cert

### Commands to Debug:

```bash
# Check if containers are running
docker ps | grep student-alumni

# Check container network
docker network inspect dokploy-network

# Test container directly (inside container)
curl http://localhost:8000/api/health
curl http://localhost/healthz

# Check Traefik routing (on server)
curl http://localhost:8080/api/http/routers

# Check Traefik logs
docker service logs dokploy-traefik -f
```

### Quick Fix Steps:

1. **Stop** both containers in Dokploy
2. **Delete** both domain configurations
3. **Redeploy** backend first, wait for healthy
4. **Redeploy** frontend, wait for healthy
5. **Recreate** domains with correct container attachment
6. **Wait** 2-5 minutes for SSL to provision

---

## ✅ Verification Commands

After deployment, test these endpoints:

```bash
# Backend health (must return JSON)
curl https://studentalumni.ai/api/health
# Expected: {"status":"ok","service":"studentalumni-backend",...}

# Frontend health (must return JSON)
curl https://studentalumni.ai/healthz
# Expected: {"status":"ok","service":"studentalumni-frontend"}

# Frontend main page
curl https://studentalumni.ai/
# Expected: HTML with React app (not 404/502)
```

---

## 🔐 Security Checklist

- [ ] Both containers run as non-root user
- [ ] JWT_SECRET is 32+ random characters
- [ ] FERNET_KEY generated via Python cryptography
- [ ] ALLOWED_ORIGINS includes exact domain (no trailing slash)
- [ ] HTTPS enabled on both domains
- [ ] MongoDB Atlas whitelist includes VPS IP only

---

## 📝 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| 502 Bad Gateway | Domain not attached to container | Re-attach container in Domain settings |
| 502 Bad Gateway | Container unhealthy | Check logs, verify Mongo connection |
| 404 on frontend | Wrong path priority | Ensure `/api` path has higher priority |
| CORS error | ALLOWED_ORIGINS wrong | Must include exact frontend domain |
| API 404 | Wrong EXPO_PUBLIC_BACKEND_URL | Must be Build Arg, not env variable |

---

## 🚢 Docker Swarm Labels (Advanced)

For manual Traefik configuration via labels:

```yaml
# Frontend labels
traefik.enable=true
traefik.http.routers.frontend.rule=Host(`studentalumni.ai`) && !PathPrefix(`/api`)
traefik.http.routers.frontend.entrypoints=websecure
traefik.http.routers.frontend.tls=true
traefik.http.routers.frontend.priority=10
traefik.http.services.frontend.loadbalancer.server.port=80

# Backend labels (higher priority)
traefik.enable=true
traefik.http.routers.backend.rule=Host(`studentalumni.ai`) && PathPrefix(`/api`)
traefik.http.routers.backend.entrypoints=websecure
traefik.http.routers.backend.tls=true
traefik.http.routers.backend.priority=100
traefik.http.services.backend.loadbalancer.server.port=8000
```

---

## 📚 Additional Documentation

- **DOKPLOY.md** - Detailed Dokploy deployment guide
- **docker-compose.yml** - Local development configuration
- **frontend/nginx.conf** - Nginx SPA configuration

---

## 🔗 Links

- **Dokploy:** https://dokploy.com
- **Traefik:** https://traefik.io
- **Expo:** https://expo.dev
- **FastAPI:** https://fastapi.tiangolo.com