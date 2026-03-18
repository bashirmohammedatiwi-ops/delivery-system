#!/bin/bash
# نشر كامل: تنظيف + بناء + تشغيل
# تشغيل: bash scripts/deploy.sh

set -e
cd "$(dirname "$0")/.."
echo "=== تنظيف الحاويات ==="
docker-compose down 2>/dev/null || true
for c in $(docker ps -a --format '{{.Names}}' 2>/dev/null | grep -i delivery || true); do
  docker rm -f "$c" 2>/dev/null || true
done
echo "=== بناء الصور ==="
docker-compose build --no-cache
echo "=== تشغيل الخدمات ==="
docker-compose up -d
echo "=== تم ==="
docker ps
