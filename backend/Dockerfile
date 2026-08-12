# Student Alumni Backend - Dokploy compatible Dockerfile
# Build context: ./backend
# Dockerfile location: ./backend/Dockerfile

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# System deps: build tools + Playwright Chromium shared libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libffi-dev \
    libssl-dev \
    ca-certificates \
    # Playwright / Chromium runtime libraries
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgtk-3-0 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install --upgrade pip && \
    pip install -r requirements.txt && \
    pip install "uvicorn[standard]" gunicorn && \
    # Install Playwright Chromium to a shared path accessible by appuser
    PLAYWRIGHT_BROWSERS_PATH=/app/.playwright playwright install chromium --with-deps

COPY . .

RUN useradd --create-home --shell /usr/sbin/nologin appuser && \
    chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=8s --start-period=20s --retries=3 \
    CMD curl -fsS http://localhost:8000/api/health || exit 1

ENV UVICORN_WORKERS=2
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.playwright
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port 8000 --workers ${UVICORN_WORKERS} --proxy-headers --forwarded-allow-ips '*'"]