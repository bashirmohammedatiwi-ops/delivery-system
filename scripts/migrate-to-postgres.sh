#!/bin/bash
# نقل البيانات من SQLite إلى PostgreSQL بدون فقدان
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-delivery_secret_change_me}"
export DATABASE_URL="${DATABASE_URL:-postgres://delivery:${POSTGRES_PASSWORD}@127.0.0.1:5432/delivery}"

echo "==> Starting PostgreSQL (if using Docker)..."
docker compose -f docker-compose.yml up -d postgres 2>/dev/null || true
sleep 3

echo "==> Installing dependencies..."
npm install --omit=dev pg deasync 2>/dev/null || npm install pg deasync

echo "==> Running migration..."
node scripts/migrate-sqlite-to-postgres.js

echo ""
echo "==> To activate PostgreSQL, ensure DATABASE_URL is set for the app service and run:"
echo "    docker compose up -d --build app employee-web driver-web"
