#!/bin/bash
# إصلاح شامل لسيرفر الإنتاج (متعدد المواقع + SSL + تحديث التطبيق)
# شغّل على VPS: bash scripts/fix-production-server.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# ─── قراءة .env ───
DOMAIN="${DOMAIN:-demaalhayaadelivery.online}"
PRICE_PORT="${PRICE_APP_PORT:-5000}"
MULTISITE="${MULTISITE:-true}"
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
  DOMAIN="${DOMAIN:-demaalhayaadelivery.online}"
  PRICE_PORT="${PRICE_APP_PORT:-5000}"
  MULTISITE="${MULTISITE:-true}"
fi

COMPOSE="-f docker-compose.yml"
if [ "$MULTISITE" = "true" ]; then
  COMPOSE="$COMPOSE -f docker-compose.override-multisite.yml"
  echo "==> وضع متعدد المواقع: Docker لن يحجز 80/443"
else
  COMPOSE="$COMPOSE -f docker-compose.override-domain.yml --profile https"
  echo "==> وضع دومين واحد: Docker nginx على 80/443"
fi

echo "==> 1) إيقاف delivery-nginx عن 80/443 (إن كان يعمل)..."
docker stop delivery-nginx 2>/dev/null || true
docker rm delivery-nginx 2>/dev/null || true

echo "==> 2) جلب آخر كود..."
git pull origin main

echo "==> 3) بناء وتشغيل التطبيق..."
docker compose $COMPOSE down 2>/dev/null || true
docker network rm alhayat-delivery-net 2>/dev/null || true
docker compose $COMPOSE up -d --build

echo "==> 4) انتظار جاهزية التطبيق..."
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:3000/health >/dev/null 2>&1; then
    echo "    التطبيق جاهز."
    break
  fi
  sleep 2
  if [ "$i" -eq 30 ]; then
    echo "    تحذير: التطبيق لم يرد بعد — راجع: docker compose logs app --tail 30"
  fi
done

if [ "$MULTISITE" = "true" ] && command -v nginx >/dev/null 2>&1; then
  echo "==> 5) تجديد شهادة SSL (nginx النظام)..."
  if command -v certbot >/dev/null 2>&1; then
    certbot renew --force-renewal 2>/dev/null || \
      certbot certonly --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos \
        -m "${SSL_EMAIL:-admin@$DOMAIN}" 2>/dev/null || \
      echo "    تحذير: فشل certbot — نفّذ يدوياً: sudo certbot renew"
  else
    echo "    certbot غير مثبت — ثبّته: apt install certbot python3-certbot-nginx"
  fi

  VHOST="/etc/nginx/sites-available/$DOMAIN"
  if [ ! -f "$VHOST" ]; then
    echo "==> 6) إنشاء vhost من القالب..."
    sed "s/127.0.0.1:5000/127.0.0.1:$PRICE_PORT/g" nginx/host-vhost.conf.example > "/tmp/$DOMAIN.vhost"
    cp "/tmp/$DOMAIN.vhost" "$VHOST"
    ln -sf "$VHOST" "/etc/nginx/sites-enabled/$DOMAIN"
    echo "    تم إنشاء $VHOST — راجع PRICE_APP_PORT=$PRICE_PORT"
  else
    echo "==> 6) vhost موجود: $VHOST"
    if ! grep -q "location /price/" "$VHOST" 2>/dev/null; then
      echo "    تحذير: أضف location /price/ يدوياً — انظر nginx/host-vhost.conf.example"
    fi
    if ! grep -q "127.0.0.1:3000\|127.0.0.1:8080" "$VHOST" 2>/dev/null; then
      echo "    تحذير: تأكد أن location / يوجّه إلى 127.0.0.1:3000"
    fi
  fi

  echo "==> 7) إعادة تحميل nginx النظام..."
  nginx -t
  systemctl reload nginx
  systemctl restart nginx 2>/dev/null || service nginx restart
fi

echo ""
echo "════════════════════════════════════════"
echo " تم الإصلاح"
echo "════════════════════════════════════════"
echo "  التوصيل:  curl -s http://127.0.0.1:3000/health"
echo "  HTTPS:     https://$DOMAIN/health"
echo "  rybell:    https://rybellairaq.com (تحقق من docker ps / systemctl)"
echo ""
echo "  إذا rybellairaq.com = 502:"
echo "    sudo tail -20 /var/log/nginx/error.log"
echo "    docker ps -a"
echo ""
