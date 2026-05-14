# syntax=docker/dockerfile:1.6
# ─────────────────────────────────────────────────────────────────────────
# Student Alumni / NexusOS — Backend image (FastAPI + Motor)
# Designed for Dokploy / Docker / docker-compose deployment on a VPS.
# ─────────────────────────────────────────────────────────────────────────
FROM python:3.12-slim AS base

# Faster + leaner Python runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# System deps for cryptography / motor / lxml / xlsx parsing
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libffi-dev \
    libssl-dev \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Install Python deps first for better Docker layer caching
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt && \
    pip install "uvicorn[standard]" gunicorn

# ── Copy application code
COPY . .

# Drop root for security
RUN useradd --create-home --shell /usr/sbin/nologin appuser && \
    chown -R appuser:appuser /app
USER appuser

# Listen on 8000 inside the container (mapped by docker-compose / Dokploy)
EXPOSE 8000

# Healthcheck — Dokploy reads this to decide if the service is up
HEALTHCHECK --interval=30s --timeout=8s --start-period=20s --retries=3 \
    CMD curl -fsS http://localhost:8000/api/health || exit 1

# Start FastAPI with uvicorn — 2 workers fits a typical 2-vCPU VPS,
# override via UVICORN_WORKERS at runtime if you have more cores.
ENV UVICORN_WORKERS=2
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port 8000 --workers ${UVICORN_WORKERS} --proxy-headers --forwarded-allow-ips '*'"]
