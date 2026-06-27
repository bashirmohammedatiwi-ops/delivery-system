#!/bin/bash
# إصلاح شامل — التوصيل + price_app + Rybella + nginx + SSL
# على السيرفر: cd /opt/delivery-system && bash scripts/fix-all-apps.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="$ROOT/scripts/server-apps.env"
if [ ! -f "$ENV_FILE" ]; then
  cp "$ROOT/scripts/server-apps.env.example" "$ENV_FILE"
  echo "أنشئ $ENV_FILE — عدّل مسارات المشاريع ثم أعد التشغيل."
  exit 1
fi

# shellcheck disable=SC1091
source "$ENV_FILE"

DELIVERY_ROOT="${DELIVERY_ROOT:-$ROOT}"
PRICE_APP_ROOT="${PRICE_APP_ROOT:-/opt/price_app}"
RYBELLA_ROOT="${RYBELLA_ROOT:-/opt/ry}"
DELIVERY_DOMAIN="${DELIVERY_DOMAIN:-demaalhayaadelivery.online}"
RYBELLA_DOMAIN="${RYBELLA_DOMAIN:-rybellairaq.com}"
RYBELLA_ADMIN_DOMAIN="${RYBELLA_ADMIN_DOMAIN:-admin.rybellairaq.com}"
SSL_EMAIL="${SSL_EMAIL:-admin@$DELIVERY_DOMAIN}"

free_local_port() {
  local port="$1"
  echo "    تحرير المنفذ $port..."
  docker ps -q --filter "publish=127.0.0.1:${port}" 2>/dev/null | xargs -r docker stop 2>/dev/null || true
  docker ps -q --filter "publish=${port}" 2>/dev/null | xargs -r docker stop 2>/dev/null || true
  for name in delivery-system delivery-driver-web delivery-employee-web; do
    docker rm -f "$name" 2>/dev/null || true
  done
  if command -v ss >/dev/null 2>&1 && ss -tlnp 2>/dev/null | grep -q ":${port} "; then
    echo "    تحذير: المنفذ $port ما زال مستخدماً:"
    ss -tlnp | grep ":${port} " || true
    echo "    نفّذ: ss -tlnp | grep :${port}"
  fi
}

echo "══════════════════════════════════════════"
echo " إصلاح جميع التطبيقات على السيرفر"
echo "══════════════════════════════════════════"

# ─── 1) إيقاف delivery-nginx (لا يحجز 80/443) ───
echo ""
echo "==> [1/7] إيقاف delivery-nginx..."
docker stop delivery-nginx 2>/dev/null || true
docker rm delivery-nginx 2>/dev/null || true

# ─── 2) نظام التوصيل ───
echo ""
echo "==> [2/7] نظام التوصيل: $DELIVERY_ROOT"
cd "$DELIVERY_ROOT"
git pull origin main 2>/dev/null || true
free_local_port 3000
free_local_port 3001
free_local_port 3002
docker compose -f docker-compose.yml -f docker-compose.override-multisite.yml down 2>/dev/null || true
docker network rm alhayat-delivery-net 2>/dev/null || true
docker compose -f docker-compose.yml -f docker-compose.override-multisite.yml up -d --build

wait_url() {
  local url="$1" label="$2" max="${3:-30}"
  local i
  for i in $(seq 1 "$max"); do
    if curl -sf "$url" >/dev/null 2>&1; then
      echo "    ✓ $label"
      return 0
    fi
    sleep 2
  done
  echo "    ✗ $label — لم يرد على $url"
  return 1
}

wait_url "http://127.0.0.1:3000/health" "التوصيل :3000" || true

# ─── 3) price_app ───
echo ""
echo "==> [3/7] price_app: $PRICE_APP_ROOT"
if [ -d "$PRICE_APP_ROOT" ]; then
  cd "$PRICE_APP_ROOT"
  git pull origin main 2>/dev/null || git pull 2>/dev/null || true
  docker compose down 2>/dev/null || true
  docker compose up -d --build
  wait_url "http://127.0.0.1:5000/health" "price API :5000" || \
    wait_url "http://127.0.0.1:5000/" "price API :5000" || true
  wait_url "http://127.0.0.1:5002/price/" "price client :5002" || true
else
  echo "    تحذير: المجلد غير موجود — تخطي price_app"
fi

# ─── 4) Rybella ───
echo ""
echo "==> [4/7] Rybella: $RYBELLA_ROOT"
if [ -d "$RYBELLA_ROOT" ] && [ -f "$RYBELLA_ROOT/deploy.sh" ]; then
  cd "$RYBELLA_ROOT"
  git pull origin master 2>/dev/null || git pull 2>/dev/null || true
  bash deploy.sh
  wait_url "http://127.0.0.1:4003/api/health" "Rybella store :4003" || true
  wait_url "http://127.0.0.1:4000/api/health" "Rybella admin :4000" || true
else
  echo "    تحذير: المجلد أو deploy.sh غير موجود — تخطي Rybella"
fi

# ─── 5) nginx vhosts ───
echo ""
echo "==> [5/7] تثبيت إعدادات nginx..."
NGINX_SITES="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
mkdir -p /var/www/certbot 2>/dev/null || true

install_site() {
  local src="$1" name="$2"
  if [ -f "$src" ]; then
    cp "$src" "$NGINX_SITES/$name"
    ln -sf "$NGINX_SITES/$name" "$NGINX_ENABLED/$name"
    echo "    ✓ $name"
  else
    echo "    ✗ ملف غير موجود: $src"
  fi
}

has_ssl_cert() {
  local domain="$1"
  [ -f "/etc/letsencrypt/live/${domain}/fullchain.pem" ] \
    && [ -f "/etc/letsencrypt/live/${domain}/privkey.pem" ]
}

install_site_ssl_or_http() {
  local ssl_src="$1" http_src="$2" name="$3" cert_domain="$4"
  if has_ssl_cert "$cert_domain"; then
    install_site "$ssl_src" "$name"
  else
    echo "    ⚠ لا توجد شهادة SSL لـ $cert_domain — HTTP فقط"
    install_site "$http_src" "$name"
  fi
}

install_site_ssl_or_http \
  "$DELIVERY_ROOT/nginx/sites/demaalhayaadelivery.online.conf" \
  "$DELIVERY_ROOT/nginx/sites/demaalhayaadelivery.online.http.conf" \
  "$DELIVERY_DOMAIN" "$DELIVERY_DOMAIN"

install_site_ssl_or_http \
  "$DELIVERY_ROOT/nginx/sites/rybellairaq.com.conf" \
  "$DELIVERY_ROOT/nginx/sites/rybellairaq.com.http.conf" \
  "$RYBELLA_DOMAIN" "$RYBELLA_DOMAIN"

install_site_ssl_or_http \
  "$DELIVERY_ROOT/nginx/sites/admin.rybellairaq.com.conf" \
  "$DELIVERY_ROOT/nginx/sites/admin.rybellairaq.com.http.conf" \
  "$RYBELLA_ADMIN_DOMAIN" "$RYBELLA_ADMIN_DOMAIN"

# ─── 6) nginx (HTTP) ثم SSL ───
echo ""
echo "==> [6/7] اختبار nginx..."
nginx -t
systemctl reload nginx 2>/dev/null || service nginx reload

echo ""
echo "==> [7/7] تجديد / إصدار SSL..."
if command -v certbot >/dev/null 2>&1; then
  certbot renew --quiet 2>/dev/null || true
  if ! has_ssl_cert "$DELIVERY_DOMAIN"; then
    certbot certonly --nginx --non-interactive --agree-tos -m "$SSL_EMAIL" \
      -d "$DELIVERY_DOMAIN" -d "www.$DELIVERY_DOMAIN" || true
  fi
  if ! has_ssl_cert "$RYBELLA_DOMAIN"; then
    certbot certonly --nginx --non-interactive --agree-tos -m "$SSL_EMAIL" \
      -d "$RYBELLA_DOMAIN" -d "www.$RYBELLA_DOMAIN" || true
  fi
  if ! has_ssl_cert "$RYBELLA_ADMIN_DOMAIN"; then
    certbot certonly --nginx --non-interactive --agree-tos -m "$SSL_EMAIL" \
      -d "$RYBELLA_ADMIN_DOMAIN" 2>/dev/null || \
      echo "    تخطّي admin SSL — تأكد DNS لـ $RYBELLA_ADMIN_DOMAIN"
  fi
  # ترقية إلى HTTPS بعد إصدار الشهادات
  if has_ssl_cert "$DELIVERY_DOMAIN"; then
    install_site "$DELIVERY_ROOT/nginx/sites/demaalhayaadelivery.online.conf" "$DELIVERY_DOMAIN"
  fi
  if has_ssl_cert "$RYBELLA_DOMAIN"; then
    install_site "$DELIVERY_ROOT/nginx/sites/rybellairaq.com.conf" "$RYBELLA_DOMAIN"
  fi
  if has_ssl_cert "$RYBELLA_ADMIN_DOMAIN"; then
    install_site "$DELIVERY_ROOT/nginx/sites/admin.rybellairaq.com.conf" "$RYBELLA_ADMIN_DOMAIN"
  fi
else
  echo "    ثبّت certbot: apt install -y certbot python3-certbot-nginx"
fi

echo ""
echo "==> إعادة تحميل nginx..."
nginx -t
systemctl reload nginx
systemctl restart nginx 2>/dev/null || service nginx restart

echo ""
echo "══════════════════════════════════════════"
echo " تم — تحقق:"
echo "══════════════════════════════════════════"
echo "  https://$DELIVERY_DOMAIN/health"
echo "  https://$DELIVERY_DOMAIN/price/"
echo "  https://$DELIVERY_DOMAIN/price-api/health"
echo "  https://$RYBELLA_DOMAIN/api/health"
echo "  https://$RYBELLA_ADMIN_DOMAIN/"
echo ""
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | head -20
