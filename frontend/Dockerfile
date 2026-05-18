# Student Alumni Frontend - Dokploy compatible Dockerfile
# Build context: ./frontend
# Dockerfile location: ./frontend/Dockerfile

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

FROM node:20-alpine AS builder

ARG EXPO_PUBLIC_BACKEND_URL
ARG EXPO_PUBLIC_FIREBASE_API_KEY
ARG EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG EXPO_PUBLIC_FIREBASE_PROJECT_ID
ARG EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG EXPO_PUBLIC_FIREBASE_SENDER_ID
ARG EXPO_PUBLIC_FIREBASE_APP_ID
ARG EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
ARG EXPO_PUBLIC_POSTHOG_KEY
ARG EXPO_PUBLIC_POSTHOG_HOST
ARG EXPO_PUBLIC_ANALYTICS_ENABLED

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

RUN apk add --no-cache git python3 make g++ libc6-compat bash

COPY package.json yarn.lock* ./
RUN if [ -f yarn.lock ]; then yarn install --network-timeout 600000; \
    else npm install --no-audit --no-fund; fi

COPY . .

RUN npx expo export --platform web --output-dir dist

FROM nginx:1.27-alpine

RUN apk add --no-cache curl

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

RUN printf '%s\n' '{"status":"ok","service":"studentalumni-frontend"}' \
    > /usr/share/nginx/html/healthz

EXPOSE 80

# ── Security: run as non-root user ──────────────────────────────────────────
RUN addgroup -g 1001 -S nodejs && adduser -S nodeapp -u 1001
USER nodeapp

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]