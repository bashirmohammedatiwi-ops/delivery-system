#!/bin/bash
set -e

if [ "$SELF_SIGNED" = "true" ]; then
    CERT_DIR="/etc/nginx/certs"
    mkdir -p "$CERT_DIR"
    if [ ! -f "$CERT_DIR/fullchain.pem" ]; then
        echo "إنشاء شهادة ذاتية..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$CERT_DIR/privkey.pem" \
            -out "$CERT_DIR/fullchain.pem" \
            -subj "/CN=localhost/O=Diya Al-Hayat"
    fi
    rm -f /etc/nginx/conf.d/*.conf
    cp /etc/nginx/templates/default-selfsigned.conf /etc/nginx/conf.d/default.conf
else
    export DOMAIN="${DOMAIN:-localhost}"
    envsubst '${DOMAIN}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf
fi

exec "$@"
