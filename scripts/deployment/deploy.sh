#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# deploy.sh — Production deployment script for Dokploy VPS
# ═══════════════════════════════════════════════════════════════════════
# Usage:
#   ./scripts/deployment/deploy.sh staging
#   ./scripts/deployment/deploy.sh production
#   ./scripts/deployment/deploy.sh rollback
#
# Requirements:
#   - SSH access to VPS
#   - Docker + Dokploy running on VPS
#   - Images pushed to GHCR
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────
ENVIRONMENT="${1:-staging}"
REGISTRY="ghcr.io/kktejas07/student-alumni-master"
SSH_USER="root"
SSH_HOST="77.42.64.12"

# ─── Colors ──────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ─── Validation ──────────────────────────────────────────────────────
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "rollback" ]]; then
  err "Usage: $0 {staging|production|rollback}"
fi

# ─── Tag determination ───────────────────────────────────────────────
if [[ "$ENVIRONMENT" == "production" ]]; then
  TAG="latest"
elif [[ "$ENVIRONMENT" == "staging" ]]; then
  TAG="staging"
else
  TAG=""
fi

# ─── Rollback ────────────────────────────────────────────────────────
if [[ "$ENVIRONMENT" == "rollback" ]]; then
  log "🔄 Performing rollback to previous deployment..."
  ssh "$SSH_USER@$SSH_HOST" bash -s << 'ROLLBACK'
    set -e
    echo "📋 Listing available tags..."
    docker service ls | grep student-alumni

    echo "⏮️  Rolling back frontend..."
    docker service rollback student-alumni-frontend-yefvun 2>/dev/null || warn "No frontend service to rollback"

    echo "⏮️  Rolling back backend..."
    docker service rollback student-alumni-backend-aompqa 2>/dev/null || warn "No backend service to rollback"

    echo "✅ Rollback complete"
ROLLBACK
  exit 0
fi

# ─── Main deployment ─────────────────────────────────────────────────
log "🚀 Deploying $ENVIRONMENT environment (tag: $TAG)"

ssh "$SSH_USER@$SSH_HOST" bash -s << DEPLOY
  set -e

  echo "📥 Pulling images..."
  docker pull "$REGISTRY/frontend:$TAG" || warn "Frontend image not found"
  docker pull "$REGISTRY/backend:$TAG" || warn "Backend image not found"

  echo "🔄 Updating frontend service..."
  if docker service ls 2>/dev/null | grep -q "student-alumni-frontend"; then
    docker service update \
      --image "$REGISTRY/frontend:$TAG" \
      --update-parallelism 1 \
      --update-delay 10s \
      --update-order start-first \
      --rollback-parallelism 1 \
      --rollback-monitor 30s \
      student-alumni-frontend-yefvun || warn "Frontend update failed"
  fi

  echo "🔄 Updating backend service..."
  if docker service ls 2>/dev/null | grep -q "student-alumni-backend"; then
    docker service update \
      --image "$REGISTRY/backend:$TAG" \
      --update-parallelism 1 \
      --update-delay 10s \
      --update-order start-first \
      --rollback-parallelism 1 \
      --rollback-monitor 30s \
      student-alumni-backend-aompqa || warn "Backend update failed"
  fi

  echo "⏳ Waiting for services to stabilize..."
  sleep 15

  echo "🔍 Running health checks..."
  echo -n "   Backend:  "
  if curl -fsS -o /dev/null -w "%{http_code}" --max-time 10 https://studentalumni.ai/api/health; then
    echo " ✅"
  else
    echo " ❌"
    warn "Backend health check failed!"
  fi

  echo -n "   Frontend: "
  if curl -fsS -o /dev/null -w "%{http_code}" --max-time 10 https://studentalumni.ai/healthz; then
    echo " ✅"
  else
    echo " ❌"
    warn "Frontend health check failed — run autofix script"
    bash /root/autofix-frontend.sh || true
  fi

  echo ""
  echo "✅ Deployment to $ENVIRONMENT complete!"
DEPLOY

log "✅ Done"
