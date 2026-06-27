#!/bin/bash
# تحديث السيرفر بعد git push
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MULTISITE=true
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
MULTISITE="${MULTISITE:-true}"

COMPOSE="-f docker-compose.yml"
if [ "$MULTISITE" = "true" ]; then
  COMPOSE="$COMPOSE -f docker-compose.override-multisite.yml"
else
  COMPOSE="$COMPOSE -f docker-compose.override-domain.yml --profile https"
fi

echo "==> جلب آخر التحديثات..."
git pull origin main

echo "==> إيقاف delivery-nginx القديم (80/443)..."
docker stop delivery-nginx 2>/dev/null || true

echo "==> تحرير المنافذ وإيقاف حاويات قديمة..."
for name in delivery-system delivery-driver-web delivery-employee-web; do
  docker rm -f "$name" 2>/dev/null || true
done

echo "==> إعادة بناء وتشغيل..."
docker compose $COMPOSE down 2>/dev/null || true
docker network rm alhayat-delivery-net 2>/dev/null || true
docker compose $COMPOSE up -d --build

if [ "$MULTISITE" = "true" ]; then
  echo "==> إعادة تحميل nginx النظام..."
  nginx -t && systemctl reload nginx
fi

echo ""
git log -1 --oneline
curl -sf http://127.0.0.1:3000/health && echo "" || echo "تحذير: التطبيق لم يرد على :3000"
