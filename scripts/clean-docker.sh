#!/bin/bash
# إزالة الحاويات القديمة وحل تعارض الصور
# تشغيل: bash scripts/clean-docker.sh

set -e
echo "إيقاف وإزالة حاويات التوصيل..."
docker-compose down 2>/dev/null || true
# إزالة أي حاوية تحتوي على delivery في الاسم (بما فيها البادئات مثل 45009875a835_delivery-system)
for c in $(docker ps -a --format '{{.Names}}' 2>/dev/null | grep -i delivery || true); do
  echo "إزالة: $c"
  docker rm -f "$c" 2>/dev/null || true
done
echo "تم. شغّل: docker-compose build --no-cache && docker-compose up -d"
