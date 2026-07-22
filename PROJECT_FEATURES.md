# Student Alumni Project Features

## Backend
- FastAPI server (Python 3.12 slim) with health check at `/api/health`.
- Runs on port 8000, non-root user (`appuser`), Uvicorn workers configurable.
- Environment variables: `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `FERNET_KEY`, `ALLOWED_ORIGINS`, `FRONTEND_URL`, `UVICORN_WORKERS`.

## Frontend
- Expo web build served by nginx (multi-stage Dockerfile).
- Serves static files on port 80, health check at `/healthz`.
- SPA fallback routing, gzip compression, multi-stage build for small image.
- Build argument: `EXPO_PUBLIC_BACKEND_URL`.

## Routing & Deployment
- Recommended path‑based routing: `/api` → backend (priority 100), all other paths → frontend (priority 10).
- Alternative subdomain routing (`api.studentalumni.ai` → backend, `studentalumni.ai` → frontend).
- Traefik labels for manual routing configuration.
- Docker Swarm labels for Traefik routers and services.

## Security
- Non‑root containers, 32+ character `JWT_SECRET`, generated `FERNET_KEY`.
- `ALLOWED_ORIGINS` must exactly match frontend domain.
- HTTPS enabled, MongoDB whitelist restricted to VPS IP.

## Troubleshooting
- 502 Bad Gateway causes: container not running, wrong port, network isolation, domain not attached, SSL not ready.
- Commands to debug: `docker ps`, `docker network inspect`, direct `curl` checks, Traefik router/log inspection.

## Verification
- Backend health: `curl https://studentalumni.ai/api/health`.
- Frontend health: `curl https://studentalumni.ai/healthz`.
- Frontend main page: `curl https://studentalumni.ai/`.

## Documentation
- `DOKPLOY.md` – detailed deployment guide.
- `docker-compose.yml` – local dev configuration.
- `frontend/nginx.conf` – SPA routing config.