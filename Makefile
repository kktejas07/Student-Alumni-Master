# =============================================================================
# Makefile — Student Alumni Platform
# Targets for backend, frontend, and Docker.
# =============================================================================

.PHONY: help setup setup-dev backend frontend stop test lint format check

PYTHON        ?= python3
BACKEND_DIR   := backend
VENV          := $(BACKEND_DIR)/.venv
VENV_BIN      := $(VENV)/bin
PY            := $(VENV_BIN)/python
PIP           := $(VENV_BIN)/pip
UVICORN       := $(VENV_BIN)/uvicorn
FRONTEND_DIR  := frontend
PORT_BACKEND  ?= 8080
PORT_FRONTEND ?= 8081

# ── help ─────────────────────────────────────────────────────────────────────
help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "  Quick start:  make setup && make backend"

# ── environment setup ─────────────────────────────────────────────────────────
$(VENV)/bin/activate:
	@echo "▶ Creating virtual environment in $(VENV)…"
	$(PYTHON) -m venv $(VENV)
	$(PIP) install --upgrade pip wheel

setup: $(VENV)/bin/activate ## Create .venv and install runtime dependencies
	@echo "▶ Installing runtime dependencies…"
	$(PIP) install -r $(BACKEND_DIR)/requirements.txt
	@if [ ! -f $(BACKEND_DIR)/.env ]; then \
	  echo "▶ Copying .env.example → .env (fill in your secrets!)"; \
	  cp $(BACKEND_DIR)/.env.example $(BACKEND_DIR)/.env; \
	fi
	@echo "✔ Backend environment ready → $(VENV)"

setup-dev: setup ## Install runtime + dev/test dependencies
	@echo "▶ Installing dev dependencies…"
	$(PIP) install -r $(BACKEND_DIR)/requirements-dev.txt
	@echo "✔ Dev environment ready"

# ── backend ───────────────────────────────────────────────────────────────────
backend: ## Start the FastAPI backend with hot-reload (port 8080)
	@echo "▶ Starting backend on http://localhost:$(PORT_BACKEND)/docs"
	cd $(BACKEND_DIR) && $(UVICORN) server:app \
	  --host 0.0.0.0 --port $(PORT_BACKEND) \
	  --reload --log-level info

backend-prod: ## Start backend without hot-reload (production-like)
	cd $(BACKEND_DIR) && $(UVICORN) server:app \
	  --host 0.0.0.0 --port $(PORT_BACKEND) \
	  --workers 2 --log-level warning

# ── frontend ──────────────────────────────────────────────────────────────────
frontend: ## Install npm deps (if needed) and start Expo web
	@echo "▶ Starting frontend on http://localhost:$(PORT_FRONTEND)"
	cd $(FRONTEND_DIR) && \
	  [ -d node_modules ] || npm install --no-audit --no-fund && \
	  EXPO_PUBLIC_BACKEND_URL=http://localhost:$(PORT_BACKEND) \
	  npx expo start --web --port $(PORT_FRONTEND)

# ── testing ───────────────────────────────────────────────────────────────────
test: ## Run backend tests (requires backend to be running)
	cd $(BACKEND_DIR) && $(VENV_BIN)/pytest tests/ -q --tb=short

test-verbose: ## Run backend tests with full output
	cd $(BACKEND_DIR) && $(VENV_BIN)/pytest tests/ -v --tb=long

test-frontend: ## Run frontend Jest tests
	cd $(FRONTEND_DIR) && npm test -- --watchAll=false

# ── code quality ─────────────────────────────────────────────────────────────
lint: ## Run flake8 linter
	cd $(BACKEND_DIR) && $(VENV_BIN)/flake8 . \
	  --exclude=venv,.venv,__pycache__,migrations \
	  --max-line-length=120

format: ## Auto-format with black + isort
	cd $(BACKEND_DIR) && \
	  $(VENV_BIN)/black . --line-length 120 --exclude '/(venv|\.venv)/' && \
	  $(VENV_BIN)/isort . --skip venv --skip .venv

check: lint ## Run all checks (lint only; add type: mypy for strict mode)
	@echo "✔ All checks passed"

# ── docker ────────────────────────────────────────────────────────────────────
docker-up: ## Start full stack with Docker Compose
	docker compose up --build

docker-down: ## Stop Docker Compose stack
	docker compose down

# ── cleanup ───────────────────────────────────────────────────────────────────
clean: ## Remove .venv and __pycache__ directories
	rm -rf $(VENV)
	find $(BACKEND_DIR) -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find $(BACKEND_DIR) -name "*.pyc" -delete 2>/dev/null || true
	@echo "✔ Cleaned"

.DEFAULT_GOAL := help
