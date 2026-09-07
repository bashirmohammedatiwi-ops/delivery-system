#!/bin/bash
# تحديث السيرفر بعد git push
# يدعم الدومين (nginx) + الوصول عبر IP (:3000 / :3001 / :3002)
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
DELIVERY_DOMAIN="${DELIVERY_DOMAIN:-demaalhayaadelivery.online}"

# تأكد من وجود PUBLIC_DELIVERY_PORT في .env
if [ -f "$ROOT/.env" ]; then
  if grep -q '^PUBLIC_DELIVERY_PORT=' "$ROOT/.env" 2>/dev/null; then
    sed -i "s/^PUBLIC_DELIVERY_PORT=.*/PUBLIC_DELIVERY_PORT=${PUBLIC_DELIVERY_PORT}/" "$ROOT/.env"
  else
    echo "PUBLIC_DELIVERY_PORT=${PUBLIC_DELIVERY_PORT}" >> "$ROOT/.env"
  fi
fi

COMPOSE="-f docker-compose.yml"
if [ "$MULTISITE" = "true" ]; then
  if [ "$PUBLIC_DELIVERY_PORT" = "true" ]; then
    COMPOSE="$COMPOSE -f docker-compose.override-multisite-public.yml"
    echo "==> الوصول عبر IP مفعّل: :3000 (إدارة) :3001 (سائق) :3002 (موظف)"
  else
    COMPOSE="$COMPOSE -f docker-compose.override-multisite.yml"
    echo "==> localhost فقط — للوصول عبر IP: PUBLIC_DELIVERY_PORT=true في .env"
  fi
else
  COMPOSE="$COMPOSE -f docker-compose.override-domain.yml --profile https"
fi

detect_server_ip() {
  local ip=""
  ip="$(curl -sf --max-time 3 ifconfig.me 2>/dev/null || true)"
  if [ -z "$ip" ]; then
    ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  fi
  echo "$ip"
}

echo "==> جلب آخر التحديثات..."
git pull origin main

echo "==> إيقاف delivery-nginx القديم (80/443)..."
docker stop delivery-nginx 2>/dev/null || true

echo "==> تحرير المنافذ وإيقاف حاويات قديمة..."
for name in delivery-system delivery-driver-web delivery-employee-web; do
  docker rm -f "$name" 2>/dev/null || true
done

# منع override من shell migration (127.0.0.1)
unset DATABASE_URL

echo "==> إعادة بناء وتشغيل..."
docker compose $COMPOSE down 2>/dev/null || true
docker network rm alhayat-delivery-net 2>/dev/null || true
docker compose $COMPOSE up -d --build

if [ "$MULTISITE" = "true" ]; then
  echo "==> إعادة تحميل nginx النظام..."
  nginx -t && systemctl reload nginx
fi

if [ "$PUBLIC_DELIVERY_PORT" = "true" ] && command -v ufw >/dev/null 2>&1; then
  ufw allow 3000/tcp comment 'delivery admin' 2>/dev/null || true
  ufw allow 3001/tcp comment 'delivery driver' 2>/dev/null || true
  ufw allow 3002/tcp comment 'delivery employee' 2>/dev/null || true
fi

echo ""
git log -1 --oneline

echo "==> انتظار جاهزية التطبيق..."
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:3000/health >/dev/null 2>&1; then
    curl -s http://127.0.0.1:3000/health
    echo ""
    SERVER_IP="$(detect_server_ip)"
    echo ""
    echo "==> روابط الوصول:"
    echo "    الدومين:  https://${DELIVERY_DOMAIN}/"
    if [ -n "$SERVER_IP" ] && [ "$PUBLIC_DELIVERY_PORT" = "true" ]; then
      echo "    IP إدارة:   http://${SERVER_IP}:3000/"
      echo "    IP سائق:    http://${SERVER_IP}:3001/"
      echo "    IP موظف:    http://${SERVER_IP}:3002/"
    fi
    exit 0
  fi
  sleep 3
done

echo "تحذير: التطبيق لم يرد على :3000"
echo "==> آخر سجلات delivery-system:"
docker logs delivery-system --tail 50 2>&1 || true
