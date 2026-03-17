#!/bin/bash
# سكربت النشر — يبني الصورة محلياً ثم يشغّل الحاويات
# استخدمه كـ Build Command في منصة النشر (Coolify, CapRover, إلخ)

set -e
cd "$(dirname "$0")/.."

echo "=== بناء الصورة alhayat-delivery ==="
docker build -t localhost/alhayat-delivery:latest -f Dockerfile .

echo "=== تشغيل الحاويات ==="
docker compose up -d 2>/dev/null || docker-compose up -d

echo "=== تم النشر بنجاح ==="
