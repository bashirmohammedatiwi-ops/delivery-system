# إصلاح: باقي الدومينات تشير لتطبيق الإدmin

## السبب

Docker كان يشغّل `delivery-nginx` على **80/443** ويلتقط **كل الدومينات**.

---

## الحل الشامل (سكربت واحد)

```bash
cd /opt/delivery-system
git pull origin main
bash scripts/fix-production-server.sh
```

السكربت يقوم بـ:
1. إيقاف `delivery-nginx` عن 80/443
2. تشغيل التطبيق على `127.0.0.1:3000` فقط
3. تجديد SSL عبر certbot (nginx Ubuntu)
4. إعداد vhost لدومين التوصيل + `/price/`
5. إعادة تحميل nginx النظام

### قبل التشغيل — أنشئ `.env`:

```bash
cat > /opt/delivery-system/.env << 'EOF'
DOMAIN=demaalhayaadelivery.online
SSL_EMAIL=admin@demaalhayaadelivery.online
MULTISITE=true
PRICE_APP_PORT=5000
EOF
```

**عدّل `PRICE_APP_PORT`** إلى المنفذ الصحيح لتطبيق `/price/` (تحقق: `sudo grep price /etc/nginx/sites-enabled/*`)

---

## الحل اليدوي السريع

### الخطوة 1 — إيقاف nginx الخاص بـ Docker عن 80/443

```bash
cd /opt/delivery-system
docker stop delivery-nginx
```

### الخطوة 2 — إعادة تشغيل nginx النظام (مواقعك الأخرى)

```bash
sudo systemctl restart nginx
# أو
sudo service nginx restart
```

**تحقق:** افتح الدومينات الأخرى — يجب أن تعود لمواقعها.

---

## الحل الدائم

### 1) جلب التحديثات

```bash
cd /opt/delivery-system
git pull origin main
```

### 2) تشغيل Docker (متعدد المواقع — بدون nginx Docker)

```bash
docker compose -f docker-compose.yml \
  -f docker-compose.override-multisite.yml \
  up -d --build
```

**لا تستخدم** `--profile https` على سيرفر متعدد المواقع.

### 3) إعداد vhost لدومين التوصيل على nginx النظام

```bash
sudo cp nginx/host-vhost.conf.example /etc/nginx/sites-available/demaalhayaadelivery.online
sudo ln -sf /etc/nginx/sites-available/demaalhayaadelivery.online /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

عدّل مسارات الشهادة في الملف إذا لزم.

---

## التحقق

```bash
# دومين التوصيل
curl -sI https://demaalhayaadelivery.online/health

# nginx النظام يعمل
sudo systemctl status nginx

# Docker nginx على localhost فقط
docker ps | grep delivery-nginx
curl -s http://127.0.0.1:3000/health
```

---

## ملاحظات

- **لا تستخدم** `docker-compose.override-domain.yml` وحده على سيرفر متعدد المواقع — أضف دائماً `override-multisite.yml`
- دوميناتك الأخرى تبقى في `/etc/nginx/sites-enabled/` كما كانت
- إذا `nginx -t` فشل، راجع تعارض `server_name` بين المواقع
- **502 على /price/ أو rybellairaq.com** → انظر [FIX-502-MULTISITE.md](FIX-502-MULTISITE.md)
- vhost الدومين يجب أن يوجّه `/price/` لتطبيق منفصل (ليس Docker التوصيل) — انظر `nginx/host-vhost.conf.example`
