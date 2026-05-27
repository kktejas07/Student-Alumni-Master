#!/usr/bin/env bash
# run.sh — start the Student Alumni / NexusOS stack
#
# Usage:
#   ./run.sh              # local dev (backend + frontend in parallel)
#   ./run.sh backend      # backend only
#   ./run.sh frontend     # frontend only
#   ./run.sh docker       # full stack via docker compose
#   ./run.sh stop         # stop background local processes

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
PID_FILE="$ROOT/.run.pids"

# Prepend local Node.js if it exists (useful for Windows environments)
if [[ -d "$ROOT/node-local" ]]; then
  export PATH="$ROOT/node-local:$PATH"
fi


# ── colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}▶ $*${RESET}"; }
success() { echo -e "${GREEN}✔ $*${RESET}"; }
warn()    { echo -e "${YELLOW}⚠ $*${RESET}"; }
error()   { echo -e "${RED}✖ $*${RESET}" >&2; exit 1; }

# ── helpers ───────────────────────────────────────────────────────────────────
check_command() {
  command -v "$1" &>/dev/null || error "'$1' not found — please install it first."
}

load_env() {
  local env_file="$BACKEND_DIR/.env"
  if [[ -f "$env_file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
    success "Loaded env from backend/.env"
  else
    warn "backend/.env not found — backend may fail without MONGO_URL / JWT_SECRET."
  fi
}

# ── backend ───────────────────────────────────────────────────────────────────
start_backend() {
  info "Starting backend (FastAPI on :8000)…"

  # Prefer python3.11 / python3.12 (requirements need >=3.10); fall back to python3
  PYTHON_CMD=""
  if [[ -n "${PYTHON:-}" ]]; then
    PYTHON_CMD="$PYTHON"
    if [[ ! -x "$PYTHON_CMD" ]] && ! command -v "$PYTHON_CMD" >/dev/null 2>&1; then
      error "PYTHON is set to '$PYTHON_CMD' but it is not found or executable."
    fi
    if ! "$PYTHON_CMD" -c 'import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)' >/dev/null 2>&1; then
      error "PYTHON is set to '$PYTHON_CMD', but it is not Python 3.10+."
    fi
    success "Using PYTHON override: $PYTHON_CMD ($($PYTHON_CMD --version))"
  else
    for candidate in python3.14 python3.12 python3.11 python3.10 python3 python py; do
      if command -v "$candidate" &>/dev/null; then
        if "$candidate" -c 'import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)' >/dev/null 2>&1; then
          PYTHON_CMD="$candidate"
          break
        fi
      fi
    done
    [[ -n "$PYTHON_CMD" ]] || error "Python 3.10+ is required. Install it and re-run."
    success "Using $PYTHON_CMD ($($PYTHON_CMD --version))"
  fi

  VENV_BIN="$BACKEND_DIR/venv/bin"
  if [[ -d "$BACKEND_DIR/venv/Scripts" ]]; then
    VENV_BIN="$BACKEND_DIR/venv/Scripts"
  fi

  if [[ ! -d "$BACKEND_DIR/venv" ]]; then
    warn "No venv found — creating one and installing dependencies…"
    "$PYTHON_CMD" -m venv "$BACKEND_DIR/venv"
    if [[ -d "$BACKEND_DIR/venv/Scripts" ]]; then
      VENV_BIN="$BACKEND_DIR/venv/Scripts"
    fi
    "$VENV_BIN/pip" install -q --upgrade pip
    "$VENV_BIN/pip" install -q -r "$BACKEND_DIR/requirements.txt"
    "$VENV_BIN/pip" install -q "uvicorn[standard]"
    success "Dependencies installed."
  fi

  load_env

  cd "$BACKEND_DIR"
  "$VENV_BIN/uvicorn" server:app \
    --host 0.0.0.0 --port 8000 --reload \
    --log-level info &
  echo $! >> "$PID_FILE"
  success "Backend started (PID $!) → http://localhost:8000"
  success "API docs → http://localhost:8000/docs"
}

# ── frontend ──────────────────────────────────────────────────────────────────
start_frontend() {
  info "Starting frontend (Expo on :8081)…"
  check_command node

  if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
    warn "node_modules missing — running npm install…"
    cd "$FRONTEND_DIR" && npm install --no-audit --no-fund
    success "Dependencies installed."
  fi

  cd "$FRONTEND_DIR"
  EXPO_PUBLIC_BACKEND_URL="http://localhost:8000" node_modules/.bin/expo start --web --port 8081 &
  echo $! >> "$PID_FILE"
  success "Frontend started (PID $!) → http://localhost:8081"
}

# ── docker ────────────────────────────────────────────────────────────────────
start_docker() {
  info "Starting full stack via docker compose…"
  check_command docker

  [[ -f "$ROOT/.env" ]] || error "Project-root .env not found — copy .env.example and fill in secrets."

  docker compose -f "$ROOT/docker-compose.yml" up --build "$@"
}

# ── stop ──────────────────────────────────────────────────────────────────────
stop_all() {
  if [[ ! -f "$PID_FILE" ]]; then
    warn "No PID file found — nothing to stop."
    return
  fi
  info "Stopping local processes…"
  while read -r pid; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" && success "Stopped PID $pid"
    fi
  done < "$PID_FILE"
  rm -f "$PID_FILE"
}

wait_for_services() {
  local -a pids=()
  local pid

  while read -r pid; do
    [[ -n "$pid" ]] && pids+=("$pid")
  done < "$PID_FILE"

  while ((${#pids[@]})); do
    sleep 1
    local -a alive=()
    for pid in "${pids[@]}"; do
      if kill -0 "$pid" 2>/dev/null; then
        alive+=("$pid")
      fi
    done
    pids=("${alive[@]}")
  done
}

# ── main ──────────────────────────────────────────────────────────────────────
MODE="${1:-dev}"

rm -f "$PID_FILE"   # clear stale pids on each fresh start

echo -e "\n${BOLD}Student Alumni / NexusOS — run.sh${RESET}\n"

case "$MODE" in
  dev|"")
    start_backend
    start_frontend
    echo ""
    info "Both services running. Press Ctrl-C to stop."
    trap stop_all INT TERM EXIT
    wait_for_services
    ;;
  backend)
    start_backend
    info "Backend running. Press Ctrl-C to stop."
    trap stop_all INT TERM EXIT
    wait_for_services
    ;;
  frontend)
    start_frontend
    info "Frontend running. Press Ctrl-C to stop."
    trap stop_all INT TERM EXIT
    wait_for_services
    ;;
  docker)
    shift || true
    start_docker "$@"
    ;;
  stop)
    stop_all
    ;;
  *)
    echo "Usage: $0 [dev|backend|frontend|docker|stop]"
    exit 1
    ;;
esac
