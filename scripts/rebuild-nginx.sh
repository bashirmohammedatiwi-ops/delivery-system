#!/bin/bash
# إعادة بناء Nginx من الصفر — لحل المشاكل
# شغّل: bash scripts/rebuild-nginx.sh
# لاستخدام البورت 8443 (شهادة ذاتية): OVERRIDE=override-ports bash scripts/rebuild-nginx.sh

OVERRIDE="${OVERRIDE:-override-domain}"
set -e
cd "$(dirname "$0")/.."

echo "إيقاف Nginx..."
docker compose -f docker-compose.yml -f docker-compose.${OVERRIDE}.yml --profile https stop nginx 2>/dev/null || true

echo "إزالة حاوية Nginx..."
docker rm -f delivery-nginx 2>/dev/null || true

echo "إعادة بناء وتشغيل Nginx..."
docker compose -f docker-compose.yml -f docker-compose.${OVERRIDE}.yml --profile https build --no-cache nginx 2>/dev/null || true
docker compose -f docker-compose.yml -f docker-compose.${OVERRIDE}.yml --profile https up -d nginx

echo "انتظار 5 ثوانٍ..."
sleep 5

echo "سجلات Nginx:"
docker logs delivery-nginx --tail 30

echo ""
if [ "$OVERRIDE" = "override-ports" ]; then
  echo "تم. جرّب: https://demaalhayaadelivery.online:8443"
else
  echo "تم. جرّب: https://demaalhayaadelivery.online"
fi
