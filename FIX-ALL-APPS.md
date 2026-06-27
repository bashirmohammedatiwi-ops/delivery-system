# إصلاح شامل — 3 مشاريع على سيرفر واحد

## المشاريع

| المشروع | المسار على السيرفر | الدومين | المنفذ |
|---------|-------------------|---------|--------|
| **delivery-system** | `/opt/delivery-system` | demaalhayaadelivery.online | 3000 |
| **price_app** | `/opt/price_app` | demaalhayaadelivery.online/price/ | 5000–5002 |
| **ry (Rybella)** | `/opt/ry` | rybellairaq.com | 4003 |
| **ry admin** | `/opt/ry` | admin.rybellairaq.com | 4000 |

**nginx Ubuntu** يدير 80/443 — Docker **لا يحجز** هذه المنافذ.

---

## خطوة واحدة على السيرفر

```bash
# 1) تأكد أن المشاريع موجودة
ls /opt/delivery-system /opt/price_app /opt/ry

# 2) إعداد المسارات (عدّل إن لزم)
cd /opt/delivery-system
cp scripts/server-apps.env.example scripts/server-apps.env
nano scripts/server-apps.env

# 3) تشغيل الإصلاح الشامل
bash scripts/fix-all-apps.sh
```

---

## محتوى server-apps.env

```env
DELIVERY_ROOT=/opt/delivery-system
PRICE_APP_ROOT=/opt/price_app
RYBELLA_ROOT=/opt/ry
DELIVERY_DOMAIN=demaalhayaadelivery.online
RYBELLA_DOMAIN=rybellairaq.com
RYBELLA_ADMIN_DOMAIN=admin.rybellairaq.com
SSL_EMAIL=admin@demaalhayaadelivery.online
MULTISITE=true
```

---

## ماذا يفعل السكربت؟

1. يوقف `delivery-nginx` (كان يلتقط كل الدومينات)
2. يشغّل **نظام التوصيل** على `127.0.0.1:3000`
3. يشغّل **price_app** (5000, 5001, 5002)
4. يشغّل **Rybella** (4000, 4003)
5. يثبت nginx vhosts من `nginx/sites/`
6. يجدّد SSL لكل الدومينات
7. يعيد تحميل nginx

---

## التحقق

```bash
curl -s http://127.0.0.1:3000/health
curl -s http://127.0.0.1:5000/health
curl -s http://127.0.0.1:4003/api/health
curl -sI https://demaalhayaadelivery.online/price/
curl -sI https://rybellairaq.com/
```

---

## تحديث لاحق (بدون إعادة إعداد nginx)

```bash
cd /opt/delivery-system && bash scripts/deploy-update.sh
cd /opt/price_app && docker compose up -d --build
cd /opt/ry && ./deploy.sh
sudo systemctl reload nginx
```

---

## ملفات nginx

| ملف | الدومين |
|-----|---------|
| `nginx/sites/demaalhayaadelivery.online.conf` | التوصيل + /price/ |
| `nginx/sites/rybellairaq.com.conf` | المتجر |
| `nginx/sites/admin.rybellairaq.com.conf` | لوحة Rybella |
