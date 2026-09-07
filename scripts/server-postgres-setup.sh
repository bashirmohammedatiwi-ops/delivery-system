#!/bin/bash
# إعداد PostgreSQL على السيرفر: استخراج SQLite + نقل البيانات + تشغيل التطبيق
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MULTISITE=true
PUBLIC_DELIVERY_PORT=true
if [ -f "$ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi
if [ -f "$ROOT/scripts/server-apps.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/scripts/server-apps.env"
  set +a
fi
MULTISITE="${MULTISITE:-true}"
PUBLIC_DELIVERY_PORT="${PUBLIC_DELIVERY_PORT:-true}"

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

reset_postgres_volume() {
  echo "==> إعادة تهيئة PostgreSQL (volume جديد بكلمة السر الحالية)..."
  docker compose $COMPOSE stop postgres 2>/dev/null || true
  docker rm -f delivery-postgres 2>/dev/null || true
  local pg_vol
  pg_vol=$(docker volume ls -q 2>/dev/null | grep 'pg-data$' | head -1 || true)
  if [ -n "$pg_vol" ]; then
    echo "    حذف volume: $pg_vol"
    docker volume rm "$pg_vol" 2>/dev/null || true
  fi
  export POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD
  docker compose $COMPOSE up -d postgres
  echo "==> انتظار PostgreSQL..."
  for i in $(seq 1 40); do
    if docker compose $COMPOSE exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done
}

verify_postgres_password() {
  docker compose $COMPOSE exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c 'SELECT 1' >/dev/null 2>&1
}

echo "==> إيقاف التطبيق مؤقتاً..."
docker stop delivery-system delivery-driver-web delivery-employee-web 2>/dev/null || true

echo "==> استخراج SQLite من Docker volume..."
bash "$ROOT/scripts/extract-sqlite-from-docker.sh"

# PostgreSQL يحفظ كلمة السر عند أول إنشاء للـ volume — إذا تغيّرت كلمة السر يجب إعادة التهيئة
reset_postgres_volume

if ! verify_postgres_password; then
  echo "ERROR: فشل التحقق من كلمة سر PostgreSQL"
  exit 1
fi
echo "==> PostgreSQL جاهز وكلمة السر صحيحة"

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
