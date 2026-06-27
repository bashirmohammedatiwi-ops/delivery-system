# إصلاح: باقي الدومينات تشير لتطبيق الإدmin

## السبب

حاوية `delivery-nginx` في Docker كانت:

1. تحجز **البورت 80 و 443** على السيرفر بالكامل
2. تستخدم `server_name _` (أي دومين) → كل المواقع تعرض لوحة التوصيل

---

## الحل السريع على السيرفر (فوراً)

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

### 2) تشغيل Docker بدون حجز 80/443 للعامة

```bash
docker compose -f docker-compose.yml \
  -f docker-compose.override-domain.yml \
  -f docker-compose.override-multisite.yml \
  --profile https up -d --build
```

هذا يشغّل nginx التوصيل على **localhost فقط**:
- `127.0.0.1:8080` (HTTP)
- `127.0.0.1:8443` (HTTPS)

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
curl -s http://127.0.0.1:8080/health
```

---

## ملاحظات

- **لا تستخدم** `docker-compose.override-domain.yml` وحده على سيرفر متعدد المواقع — أضف دائماً `override-multisite.yml`
- دوميناتك الأخرى تبقى في `/etc/nginx/sites-enabled/` كما كانت
- إذا `nginx -t` فشل، راجع تعارض `server_name` بين المواقع
