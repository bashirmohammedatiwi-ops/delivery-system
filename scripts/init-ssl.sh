#!/bin/bash
# الحصول على شهادة Let's Encrypt للتطبيق
# شغّل مرة واحدة قبل التشغيل: bash scripts/init-ssl.sh
# المتطلبات: البورت 80 حر، DOMAIN في .env (مثال: demaalhayaadelivery.online)

set -e
cd "$(dirname "$0")/.."

# إنشاء مجلد للتحقق (Certbot يكتب هنا للتحقق من الدومين)
mkdir -p nginx/certbot-webroot

echo "تشغيل Certbot للحصول على الشهادة..."
echo "(تأكد أن البورت 80 حر — أوقف Nginx أو أي خدمة أخرى عليه)"
echo ""

docker compose --profile init-ssl run --rm -p 80:80 certbot-init

echo ""
echo "تم الحصول على الشهادة بنجاح."
echo "شغّل الآن: docker compose --profile https up -d"
echo "الوصول: https://${DOMAIN:-demaalhayaadelivery.online}"
