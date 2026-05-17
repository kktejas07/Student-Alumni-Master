# Student Alumni - Deployment Guide

Complete guide for deploying the Student Alumni platform using **Dokploy** with **Docker Swarm** and **Traefik**.

---

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