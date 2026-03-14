#!/bin/bash
# إعادة بناء Caddy من الصفر — لحل المشاكل
# شغّل: bash scripts/rebuild-caddy.sh
# لاستخدام البورت 8443: OVERRIDE=override-ports bash scripts/rebuild-caddy.sh

OVERRIDE="${OVERRIDE:-override-domain}"
set -e
cd "$(dirname "$0")/.."

echo "إيقاف Caddy..."
docker compose -f docker-compose.yml -f docker-compose.${OVERRIDE}.yml --profile https stop caddy 2>/dev/null || true

echo "إزالة حاوية Caddy..."
docker rm -f delivery-caddy 2>/dev/null || true

echo "حذف بيانات Caddy (شهادات + كاش)..."
docker volume rm delivery-system_caddy-data 2>/dev/null || true

echo "تشغيل Caddy من جديد..."
docker compose -f docker-compose.yml -f docker-compose.${OVERRIDE}.yml --profile https up -d caddy

echo "انتظار 5 ثوانٍ..."
sleep 5

echo "سجلات Caddy:"
docker logs delivery-caddy --tail 30

echo ""
if [ "$OVERRIDE" = "override-ports" ]; then
  echo "تم. جرّب: https://demaalhayaadelivery.online:8443"
else
  echo "تم. جرّب: https://demaalhayaadelivery.online"
fi
