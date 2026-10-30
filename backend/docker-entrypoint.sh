#!/bin/sh
set -e

# Ensure uploads directory exists and is writable by appuser
mkdir -p /app/uploads/newsletter /app/uploads/echo /app/uploads/general /app/uploads/coupons /app/uploads/certificates
chown -R appuser:appuser /app/uploads 2>/dev/null || true
chmod -R 755 /app/uploads 2>/dev/null || true

exec "$@"
