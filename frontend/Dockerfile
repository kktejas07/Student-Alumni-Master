# syntax=docker/dockerfile:1.6
# ─────────────────────────────────────────────────────────────────────────
# Student Alumni / NexusOS — Frontend image (Expo Web → static → nginx)
# ─────────────────────────────────────────────────────────────────────────
# 1. Build stage — bundles the Expo app for the web platform.
# 2. Runtime stage — serves the static export through nginx with SPA fallback.
#
# Build-time arg:
#   EXPO_PUBLIC_BACKEND_URL  — public origin of the FastAPI backend.
#                              Burned into the JS bundle, so you MUST rebuild
#                              the image if the backend URL changes.
# ─────────────────────────────────────────────────────────────────────────

# ============================================================
# Stage 1 — build the Expo web bundle
# ============================================================
FROM node:20-alpine AS builder

# Build args (forwarded into the Metro env as EXPO_PUBLIC_* )
ARG EXPO_PUBLIC_BACKEND_URL
ARG EXPO_PUBLIC_FIREBASE_API_KEY=""
ARG EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=""
ARG EXPO_PUBLIC_FIREBASE_PROJECT_ID=""
ARG EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=""
ARG EXPO_PUBLIC_FIREBASE_SENDER_ID=""
ARG EXPO_PUBLIC_FIREBASE_APP_ID=""
ARG EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=""
ARG EXPO_PUBLIC_POSTHOG_KEY=""
ARG EXPO_PUBLIC_POSTHOG_HOST=""
ARG EXPO_PUBLIC_ANALYTICS_ENABLED="false"

ENV EXPO_PUBLIC_BACKEND_URL=${EXPO_PUBLIC_BACKEND_URL} \
    EXPO_PUBLIC_FIREBASE_API_KEY=${EXPO_PUBLIC_FIREBASE_API_KEY} \
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=${EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN} \
    EXPO_PUBLIC_FIREBASE_PROJECT_ID=${EXPO_PUBLIC_FIREBASE_PROJECT_ID} \
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=${EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET} \
    EXPO_PUBLIC_FIREBASE_SENDER_ID=${EXPO_PUBLIC_FIREBASE_SENDER_ID} \
    EXPO_PUBLIC_FIREBASE_APP_ID=${EXPO_PUBLIC_FIREBASE_APP_ID} \
    EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=${EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID} \
    EXPO_PUBLIC_POSTHOG_KEY=${EXPO_PUBLIC_POSTHOG_KEY} \
    EXPO_PUBLIC_POSTHOG_HOST=${EXPO_PUBLIC_POSTHOG_HOST} \
    EXPO_PUBLIC_ANALYTICS_ENABLED=${EXPO_PUBLIC_ANALYTICS_ENABLED} \
    CI=1 \
    NODE_OPTIONS="--max-old-space-size=4096"

WORKDIR /app

# Install build essentials (some RN deps need gyp)
RUN apk add --no-cache git python3 make g++ libc6-compat bash

# Cache node_modules layer
COPY package.json yarn.lock* ./
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile --network-timeout 600000; \
    else npm install --no-audit --no-fund; fi

# Copy source
COPY . .

# Fail fast if backend URL is missing — we'd otherwise burn `undefined`
# into the bundle and every API call would 404.
RUN test -n "$EXPO_PUBLIC_BACKEND_URL" || \
    (echo "✖ EXPO_PUBLIC_BACKEND_URL build-arg is required" && exit 1)

# Produce static web bundle under /app/dist/
RUN npx expo export --platform web --output-dir dist

# ============================================================
# Stage 2 — nginx runtime
# ============================================================
FROM nginx:1.27-alpine

# Drop the default site config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our SPA-friendly config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static bundle
COPY --from=builder /app/dist /usr/share/nginx/html

# Optional small page returned by Dokploy's health probe even before
# the SPA shell loads (independent of any JS execution).
RUN printf '%s\n' '{"status":"ok","service":"studentalumni-frontend"}' \
    > /usr/share/nginx/html/healthz

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O - http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
