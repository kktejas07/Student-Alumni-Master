# ═══════════════════════════════════════════════════════════════════════
# GitHub Actions CI/CD — README
# ═══════════════════════════════════════════════════════════════════════

## Quick Start

### Required GitHub Secrets

| Secret | Description | How to Get |
|--------|-------------|------------|
| `PROD_SSH_HOST` | VPS IP address | Your server IP |
| `PROD_SSH_USER` | SSH username | Usually `root` |
| `PROD_SSH_KEY` | SSH private key | `ssh-keygen -t ed25519` |
| `SLACK_WEBHOOK` | Slack notifications | Create Slack webhook |
| `SNYK_TOKEN` | Security scanning | Snyk.io account |

### Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **CI** | Push + PR | Lint, test, typecheck, build |
| **Docker Build** | Push to main/dev | Build + push to GHCR |
| **Deploy** | After Docker build | Deploy to Dokploy VPS |
| **Security** | Push + weekly | CodeQL, Trivy, Snyk |
| **Release** | CHANGELOG push | Semantic release |
| **Nightly** | Daily 2 AM | Backup, cleanup, health |

### Monitoring Stack
```bash
docker compose -f docker-compose.monitoring.yml up -d
```
- Grafana: http://localhost:3001
- Prometheus: http://localhost:9090
- Uptime Kuma: http://localhost:3002

### Local Testing
```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

### Rollback
```bash
./scripts/deployment/rollback.sh all
```

### Manual Deploy
```bash
./scripts/deployment/deploy.sh production
```

### Health Check
```bash
./scripts/deployment/healthcheck.sh
```

---

_See `CI_CD_SETUP.md` for full documentation._
