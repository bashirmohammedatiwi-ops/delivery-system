#!/bin/bash
# إصلاح سريع: إعادة تهيئة PostgreSQL + إكمال النقل (بعد فشل password authentication)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# استخدم كلمة السر من آخر تشغيل أو أنشئ جديدة
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
if [ -z "${POSTGRES_PASSWORD:-}" ] || [[ "${POSTGRES_PASSWORD:-}" == *"ضع_"* ]]; then
  POSTGRES_PASSWORD="$(openssl rand -hex 16)"
fi
POSTGRES_DB="${POSTGRES_DB:-delivery}"
POSTGRES_USER="${POSTGRES_USER:-delivery}"

echo "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}"

[ -f "$ROOT/data/delivery.db" ] || bash "$ROOT/scripts/extract-sqlite-from-docker.sh"

docker compose stop postgres 2>/dev/null || true
docker rm -f delivery-postgres 2>/dev/null || true
VOL=$(docker volume ls -q | grep 'pg-data$' | head -1 || true)
[ -n "$VOL" ] && docker volume rm "$VOL" 2>/dev/null || true

export POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD
docker compose up -d postgres
sleep 12

export DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:5432/${POSTGRES_DB}"
export SQLITE_PATH="$ROOT/data/delivery.db"
node scripts/migrate-sqlite-to-postgres.js

grep -v '^POSTGRES_\|^DATABASE_URL=\|^PG_POOL_MAX=' .env > .env.tmp 2>/dev/null || true
mv .env.tmp .env
cat >> .env << EOF
POSTGRES_DB=${POSTGRES_DB}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
DATABASE_URL=postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
PG_POOL_MAX=20
EOF

bash scripts/deploy-update.sh
