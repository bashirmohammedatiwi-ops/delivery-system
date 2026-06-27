#!/bin/bash
# تحديث السيرفر بعد git push — يشغّل من مجلد المشروع على VPS
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILES="-f docker-compose.yml"
if [ -f docker-compose.override-domain.yml ]; then
  COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.override-domain.yml"
fi

echo "==> جلب آخر التحديثات من GitHub..."
git pull origin main

echo "==> إيقاف الحاويات..."
docker compose $COMPOSE_FILES --profile https down || true

echo "==> إزالة شبكة Docker القديمة (إن وُجدت)..."
docker network rm alhayat-delivery-net 2>/dev/null || true

echo "==> إعادة بناء وتشغيل Docker..."
docker compose $COMPOSE_FILES --profile https up -d --build

echo ""
echo "==> تم التحديث. الإصدار:"
git log -1 --oneline
echo ""
echo "تحقق: curl -s https://demaalhayaadelivery.online/health"
echo "ثم حدّث المتصفح: Cmd+Shift+R أو Ctrl+Shift+R"
