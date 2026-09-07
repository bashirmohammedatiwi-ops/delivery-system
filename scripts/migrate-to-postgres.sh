#!/bin/bash
# نقل البيانات من SQLite (Docker volume) إلى PostgreSQL
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
POSTGRES_USER="${POSTGRES_USER:-delivery}"
POSTGRES_DB="${POSTGRES_DB:-delivery}"

# رفض كلمة المرور النموذجية العربية
if [[ "$POSTGRES_PASSWORD" == *"ضع_"* ]]; then
  echo "ERROR: غيّر POSTGRES_PASSWORD في .env — لا تستخدم النص النموذجي العربي"
  echo "شغّل بدلاً من ذلك: bash scripts/server-postgres-setup.sh"
  exit 1
fi

export DATABASE_URL="${DATABASE_URL:-postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:5432/${POSTGRES_DB}}"

echo "==> استخراج SQLite من Docker (إن لزم)..."
bash "$ROOT/scripts/extract-sqlite-from-docker.sh"

echo "==> Starting PostgreSQL..."
docker compose -f docker-compose.yml up -d postgres 2>/dev/null || true
sleep 5

echo "==> Installing dependencies..."
npm install --omit=dev 2>/dev/null || npm install

export SQLITE_PATH="$ROOT/data/delivery.db"
echo "==> Running migration from $SQLITE_PATH ..."
node scripts/migrate-sqlite-to-postgres.js

echo ""
echo "==> Migration done. Restart app:"
echo "    bash scripts/deploy-update.sh"
