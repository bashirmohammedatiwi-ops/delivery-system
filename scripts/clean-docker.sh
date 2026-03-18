#!/bin/bash
# إزالة الحاويات القديمة وحل تعارض الأسماء
# تشغيل: bash scripts/clean-docker.sh

set -e
echo "إيقاف وإزالة حاويات التوصيل..."
docker-compose down 2>/dev/null || true
for c in 1fc97e1d005b_delivery-system delivery-system delivery-driver-web delivery-employee-web delivery-nginx; do
  docker rm -f "$c" 2>/dev/null || true
done
echo "تم. شغّل: docker-compose up -d"
