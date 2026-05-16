#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# healthcheck.sh — Comprehensive health check for all services
# ═══════════════════════════════════════════════════════════════════════
# Usage:
#   ./scripts/deployment/healthcheck.sh          # Full check
#   ./scripts/deployment/healthcheck.sh --quiet  # Silent, exit code only
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

BASE_URL="https://studentalumni.ai"
PASS=0
FAIL=0

check() {
  local name="$1" url="$2" expected="$3"
  local status
  status=$(curl -fsS -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
  if [[ "$status" == "$expected" ]]; then
    echo "✅ $name — HTTP $status"
    PASS=$((PASS + 1))
  else
    echo "❌ $name — Expected $expected, got $status"
    FAIL=$((FAIL + 1))
  fi
}

echo "═════════════════════════════════════════════════"
echo "  Health Check — $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "═════════════════════════════════════════════════"
echo ""

check "Backend API"     "$BASE_URL/api/health" "200"
check "Frontend Static" "$BASE_URL/healthz"    "200"
check "Main Page"       "$BASE_URL/"           "200"
check "Login Page"      "$BASE_URL/login"      "200"

echo ""
echo "═════════════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed"
echo "═════════════════════════════════════════════════"

if [[ "$1" == "--quiet" ]]; then
  exit $FAIL
fi
