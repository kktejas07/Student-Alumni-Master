# ═══════════════════════════════════════════════════════════════════════
# GitHub Actions CI/CD — Setup & Configuration Guide
# ═══════════════════════════════════════════════════════════════════════
# Student Alumni Platform
# ═══════════════════════════════════════════════════════════════════════

---

## Table of Contents

1. [Required GitHub Secrets](#1-required-github-secrets)
2. [Environment Configuration](#2-environment-configuration)
3. [Branch Protection Rules](#3-branch-protection-rules)
4. [Workflow Overview](#4-workflow-overview)
5. [Deployment Strategy](#5-deployment-strategy)
6. [Rollback Strategy](#6-rollback-strategy)
7. [Monitoring Setup](#7-monitoring-setup)
8. [Debugging Failed Workflows](#8-debugging-failed-workflows)
9. [Security Best Practices](#9-security-best-practices)
10. [Cost Optimization](#10-cost-optimization)

---

## 1. Required GitHub Secrets

### Where to add them
```
GitHub Repository → Settings → Secrets and variables → Actions → New repository secret
```

### Required Secrets

| Secret Name | Description | Example | Required For |
|------------|-------------|---------|-------------|
| `PROD_SSH_HOST` | Production VPS IP | `77.42.64.12` | Deployment |
| `PROD_SSH_USER` | SSH username | `root` | Deployment |
| `PROD_SSH_KEY` | SSH private key (base64) | `-----BEGIN OPENSSH PRIVATE KEY-----\n...` | Deployment |
| `PROD_FRONTEND_SERVICE` | Dokploy frontend service name | `student-alumni-frontend-yefvun` | Deployment |
| `PROD_BACKEND_SERVICE` | Dokploy backend service name | `student-alumni-backend-aompqa` | Deployment |
| `SLACK_WEBHOOK` | Slack notification webhook | `https://hooks.slack.com/services/...` | Deployment alerts |
| `SNYK_TOKEN` | Snyk API token | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | Security scanning |
| `ACTIONS_STEP_DEBUG` | Debug logging | `true` | Debugging (optional) |

### Generate SSH Key for CI
```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github-actions
cat ~/.ssh/github-actions.pub >> ~/.ssh/authorized_keys  # Add to VPS
cat ~/.ssh/github-actions | base64  # Copy as PROD_SSH_KEY
```

---

## 2. Environment Configuration

### Dokploy Environment Variables
Set these in Dokploy dashboard for both backend and frontend services:

```env
# Backend
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=studentalumniadmin
JWT_SECRET=<random-64-char-string>
FERNET_KEY=<generated-via-python-cryptography>
ADMIN_EMAIL=admin@careerpath.app
ADMIN_PASSWORD=<strong-password>
ALLOWED_ORIGINS=https://studentalumni.ai
FRONTEND_URL=https://studentalumni.ai
UVICORN_WORKERS=2
ENV=production

# Frontend (Build Args, NOT env vars)
EXPO_PUBLIC_BACKEND_URL=https://studentalumni.ai
```

### Dokploy Domain Configuration
```
Frontend:
  Host: studentalumni.ai
  Path: /
  Port: 80
  HTTPS: enabled

Backend:
  Host: studentalumni.ai
  Path: /api
  Port: 8000
  HTTPS: enabled
  Strip Path: enabled
```

---

## 3. Branch Protection Rules

### Configure in GitHub:
```
Settings → Branches → Add branch protection rule
```

### For `main` branch:
- [x] Require pull request before merging
- [x] Require approvals (1-2 reviewers)
- [x] Dismiss stale reviews
- [x] Require status checks to pass
  - [x] CI Status
  - [x] Security Scan / CodeQL Analysis
  - [x] Docker Build & Push
- [x] Require branches to be up-to-date
- [x] Require conversation resolution
- [x] Do not allow bypassing
- [x] Restrict push access to admins only

### For `dev`/`develop`/`staging` branches:
- [x] Require pull request before merging
- [x] Require status checks to pass
- [x] CI Status

---

## 4. Workflow Overview

### Files in `.github/workflows/`

| File | Purpose | Trigger | Runtime |
|------|---------|---------|---------|
| `01-ci.yml` | CI — lint, test, build | Push + PR | ~15 min |
| `02-docker-build-push.yml` | Build & push to GHCR | Push to main/dev | ~20 min |
| `03-deploy.yml` | Auto-deploy to VPS | After Docker build | ~10 min |
| `04-security.yml` | CodeQL + secrets + dependency scan | Push + weekly | ~25 min |
| `05-release.yml` | Semantic release + changelog | Push to main | ~2 min |
| `06-nightly.yml` | Backup + cleanup + health checks | Daily 2 AM UTC | ~20 min |
| `07-ai-pr-review.yml` | AI-powered PR review | PR opened | ~2 min |

### Workflow Dependencies
```
Push → CI (01-ci.yml)
         ↓ (if CI passes)
         Docker Build & Push (02-docker-build-push.yml)
         ↓ (if push to main/staging)
         Deploy (03-deploy.yml)
```

---

## 5. Deployment Strategy

### Zero-Downtime Strategy
Dokploy uses Docker Swarm's rolling update:

```yaml
--update-parallelism 1     # Update one container at a time
--update-delay 10s         # Wait 10s between updates
--update-order start-first # Start new before stopping old
--rollback-monitor 30s     # Monitor for 30s after update
```

### Deployment Flow
1. Developer pushes to `develop` → CI runs → Docker builds → deploys to staging
2. Developer merges PR to `main` → CI runs → Docker builds → deploys to production
3. Each deployment runs health checks automatically
4. Failed health checks trigger rollback

### Manual Deployment
```bash
# Via GitHub Actions UI
Actions → Deploy → Run workflow → Select environment

# Via CLI
gh workflow run deploy.yml -f environment=production -f tag=latest
```

---

## 6. Rollback Strategy

### Automatic Rollback
Docker Swarm automatically rolls back if health checks fail within the `--rollback-monitor` window (30 seconds by default).

### Manual Rollback
```bash
# Via Dokploy dashboard
Click service → Rollback

# Via SSH
ssh root@77.42.64.12
docker service rollback student-alumni-frontend-yefvun
docker service rollback student-alumni-backend-aompqa

# Via deploy script
./scripts/deployment/rollback.sh frontend
./scripts/deployment/rollback.sh backend
./scripts/deployment/rollback.sh all
```

### Rollback to Specific Version
```bash
# List previous versions
docker service inspect student-alumni-frontend-yefvun --format '{{json .PreviousSpec}}'

# Update to specific image tag
docker service update --image ghcr.io/kktejas07/student-alumni-master/frontend:v1.2.3 student-alumni-frontend-yefvun
```

---

## 7. Monitoring Setup

### Recommended Tools

| Tool | Purpose | Setup |
|------|---------|-------|
| **Sentry** | Error tracking | Add `SENTRY_DSN` to backend env, install `sentry-sdk` |
| **PostHog** | Product analytics | Already configured via `EXPO_PUBLIC_POSTHOG_KEY` |
| **Uptime Kuma** | Uptime monitoring | Deploy via Docker: `docker run -p 3001:3001 louislam/uptime-kuma` |
| **Docker logs** | Container logs | `docker logs -f student-alumni-backend-aompqa` |
| **Healthcheck endpoints** | API health | `/api/health` (backend), `/healthz` (frontend) |

### Sentry Setup
```bash
# Backend
pip install sentry-sdk
# Add to server.py:
# import sentry_sdk
# sentry_sdk.init(dsn=os.environ["SENTRY_DSN"])

# Add SENTRY_DSN to Dokploy backend env vars
```

### Uptime Kuma (Self-Hosted)
```bash
docker run -d --name uptime-kuma -p 3001:3001 louislam/uptime-kuma
```
Then add monitors for:
- `https://studentalumni.ai/api/health`
- `https://studentalumni.ai/healthz`
- `https://studentalumni.ai`

### Logging Strategy
```bash
# Docker logs with JSON driver for structured logging
docker service update --log-driver json-file --log-opt max-size=10m --log-opt max-file=3 student-alumni-backend-aompqa

# View logs
docker logs -f --tail 100 student-alumni-backend-aompqa
```

---

## 8. Debugging Failed Workflows

### Common Failures & Fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| `CI / Backend` fails | MongoDB not ready | Increase `health-retries` |
| `CI / Frontend` fails | Cache miss, OOM | Increase runner, add swap |
| `Docker Build` fails | GHCR rate limit | Add `DOCKER_USERNAME` secret |
| `Deploy` fails | SSH key expired | Regenerate key, update secret |
| `Security / CodeQL` fails | Timeout on large codebase | Increase `timeout-minutes` |
| `Nightly / Backup` fails | Mongo container not found | Adjust container name filter |

### Debug Steps

1. **Inspect workflow logs:**
   ```bash
   GitHub → Actions → Select workflow → Click failed step
   ```

2. **Re-run with debug:**
   ```bash
   Add secret ACTIONS_STEP_DEBUG=true to enable diagnostic logging
   ```

3. **SSH into runner (if self-hosted):**
   ```bash
   # Check runner status
   sudo systemctl status actions.runner.*
   
   # Check runner logs
   cat /home/runner/actions-runner/_diag/*
   ```

4. **Check VPS manually:**
   ```bash
   ssh root@77.42.64.12
   docker service ls                    # Check service status
   docker service ps student-alumni-frontend-yefvun --no-trunc  # Check task status
   docker logs student-alumni-frontend-yefvun.1.<task-id>       # Check task logs
   ```

---

## 9. Security Best Practices

### CI/CD Security
- [x] **Never store secrets in code** — use GitHub Secrets
- [x] **Least privilege** — `permissions:` blocks in each workflow
- [x] **Dependency auditing** — Snyk + npm audit + safety
- [x] **Docker image scanning** — Trivy on every build
- [x] **Secret scanning** — TruffleHog + Gitleaks on every push
- [x] **CodeQL analysis** — Static analysis on every PR
- [x] **Branch protection** — Required checks, approvals
- [x] **Signed commits** — `commit.gpgsign=true`

### Repository Security
```bash
# Enable in GitHub:
Settings → Security → Code security and analysis
  - [x] Dependency graph
  - [x] Dependabot alerts
  - [x] Dependabot security updates
  - [x] Secret scanning
  - [x] Code scanning (CodeQL)
```

### Container Security
- Use specific image tags (not `:latest` in production)
- Run containers as non-root user (already in Dockerfiles: `appuser`)
- Use read-only root filesystem where possible

---

## 10. Cost Optimization

### GitHub Actions
- **Use cache effectively:** Pip, yarn, Docker layers all cached
- **Concurrency control:** Cancel stale runs with `cancel-in-progress: true`
- **Self-hosted runners:** For heavy workloads (Docker builds), consider self-hosted
- **Scheduled jobs:** Weekly security scans, daily nightlies

### Docker
- **Multi-stage builds:** Optimized Dockerfiles (already done)
- **Layer caching:** GitHub Actions cache for Docker layers
- **Image cleanup:** Nightly `docker system prune -af`
- **GHCR limits:** Free tier includes 500 MB storage, 1 GB transfers/month

### Estimated Monthly Costs
| Service | Cost | Notes |
|---------|------|-------|
| GitHub Actions (free) | $0 | 2000 min/month included |
| GHCR (free) | $0 | 500 MB storage included |
| Snyk (free tier) | $0 | 200 tests/month |
| VPS (Dokploy) | ~$10-20/mo | Already paid |

---

## Workflow Folder Structure

```
.github/
├── dependabot.yml                          # Dependabot configuration
└── workflows/
    ├── 01-ci.yml                           # CI pipeline
    ├── 02-docker-build-push.yml            # Docker build & push
    ├── 03-deploy.yml                       # Auto deployment
    ├── 04-security.yml                     # Security scanning
    ├── 05-release.yml                      # Release workflow
    ├── 06-nightly.yml                      # Nightly jobs
    └── 07-ai-pr-review.yml                 # AI PR review

scripts/
└── deployment/
    ├── deploy.sh                           # Manual deployment script
    ├── rollback.sh                         # Rollback script
    └── healthcheck.sh                      # Health check script
```

> **Last updated:** May 2026
> **Maintainer:** DevOps Team
