#!/bin/bash
# إعداد PostgreSQL على السيرفر: استخراج SQLite + نقل البيانات + تشغيل التطبيق
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MULTISITE=true
PUBLIC_DELIVERY_PORT=false
if [ -f "$ROOT/scripts/server-apps.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/scripts/server-apps.env"
  set +a
elif [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
MULTISITE="${MULTISITE:-true}"
PUBLIC_DELIVERY_PORT="${PUBLIC_DELIVERY_PORT:-false}"

COMPOSE="-f docker-compose.yml"
if [ "$MULTISITE" = "true" ]; then
  if [ "$PUBLIC_DELIVERY_PORT" = "true" ]; then
    COMPOSE="$COMPOSE -f docker-compose.override-multisite-public.yml"
  else
    COMPOSE="$COMPOSE -f docker-compose.override-multisite.yml"
  fi
fi

# كلمة سر ASCII آمنة (تجنّب العربية في URLs)
if [ -f .env ] && grep -q '^POSTGRES_PASSWORD=' .env; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
if [ -z "${POSTGRES_PASSWORD:-}" ] || [[ "${POSTGRES_PASSWORD:-}" == *"ضع_"* ]]; then
  POSTGRES_PASSWORD="$(openssl rand -hex 16)"
  echo "==> كلمة سر PostgreSQL جديدة: $POSTGRES_PASSWORD"
fi

POSTGRES_DB="${POSTGRES_DB:-delivery}"
POSTGRES_USER="${POSTGRES_USER:-delivery}"

echo "==> إيقاف التطبيق مؤقتاً (PostgreSQL يبقى يعمل)..."
docker stop delivery-system delivery-driver-web delivery-employee-web 2>/dev/null || true

echo "==> استخراج SQLite من Docker volume..."
bash "$ROOT/scripts/extract-sqlite-from-docker.sh"

echo "==> تشغيل PostgreSQL..."
export POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD
docker compose $COMPOSE up -d postgres
echo "==> انتظار PostgreSQL..."
for i in $(seq 1 30); do
  if docker compose $COMPOSE exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "==> تثبيت الحزم (على السيرفر)..."
npm install --omit=dev 2>/dev/null || npm install

echo "==> نقل البيانات إلى PostgreSQL..."
export DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:5432/${POSTGRES_DB}"
export SQLITE_PATH="$ROOT/data/delivery.db"
node "$ROOT/scripts/migrate-sqlite-to-postgres.js"

echo "==> تحديث .env..."
ENV_FILE="$ROOT/.env"
touch "$ENV_FILE"
grep -v '^POSTGRES_\|^DATABASE_URL=\|^PG_POOL_MAX=' "$ENV_FILE" > "$ENV_FILE.tmp" 2>/dev/null || true
mv "$ENV_FILE.tmp" "$ENV_FILE"
cat >> "$ENV_FILE" << EOF
POSTGRES_DB=${POSTGRES_DB}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
DATABASE_URL=postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
PG_POOL_MAX=20
EOF

echo "==> إعادة تشغيل التطبيق..."
bash "$ROOT/scripts/deploy-update.sh"

echo ""
echo "==> التحقق..."
sleep 8
curl -sf "http://127.0.0.1:3000/health" && echo "" || {
  echo "تحذير: /health لم يرد — السجلات:"
  docker logs delivery-system --tail 40 2>&1 || true
}

echo ""
echo "SUCCESS: احفظ كلمة سر PostgreSQL في مكان آمن:"
echo "  POSTGRES_PASSWORD=${POSTGRES_PASSWORD}"
