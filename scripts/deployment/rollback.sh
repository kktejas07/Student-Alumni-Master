#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# rollback.sh — Rollback Docker services to previous version
# ═══════════════════════════════════════════════════════════════════════
# Usage:
#   ./scripts/deployment/rollback.sh frontend    # Rollback frontend only
#   ./scripts/deployment/rollback.sh backend     # Rollback backend only
#   ./scripts/deployment/rollback.sh all         # Rollback both
#   ./scripts/deployment/rollback.sh list        # List available rollback versions
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

SSH_USER="root"
SSH_HOST="77.42.64.12"
FRONTEND_SERVICE="student-alumni-frontend-yefvun"
BACKEND_SERVICE="student-alumni-backend-aompqa"

case "${1:-list}" in
  frontend)
    ssh "$SSH_USER@$SSH_HOST" "docker service rollback $FRONTEND_SERVICE" ;;
  backend)
    ssh "$SSH_USER@$SSH_HOST" "docker service rollback $BACKEND_SERVICE" ;;
  all)
    ssh "$SSH_USER@$SSH_HOST" "docker service rollback $FRONTEND_SERVICE; docker service rollback $BACKEND_SERVICE" ;;
  list|*)
    ssh "$SSH_USER@$SSH_HOST" "docker service inspect $FRONTEND_SERVICE --format '{{json .PreviousSpec}}' 2>/dev/null | python3 -m json.tool || echo 'No rollback data available'"
    echo "---"
    echo "Available rollback targets: frontend, backend, all"
    echo "Usage: ./scripts/deployment/rollback.sh {frontend|backend|all|list}"
    ;;
esac
