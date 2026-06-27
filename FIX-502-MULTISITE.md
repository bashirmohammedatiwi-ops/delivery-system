# إصلاح 502 — /price/ و rybellairaq.com

## ماذا يعني 502؟

```
502 Bad Gateway
nginx/1.24.0 (Ubuntu)
```

nginx **على Ubuntu** يعمل، لكن **التطبيق خلفه** (upstream) لا يستجيب:
- متوقف
- منفذ خاطئ في الإعداد
- حاوية Docker لم تُشغَّل

---

## الخطوة 1 — تشخيص (على السيرفر)

```bash
# 1) ما الذي يستمع على المنافذ؟
sudo ss -tlnp | grep -E ':80|:443|:3000|:5000|:8000|:8080'

# 2) إعداد nginx لدومين التوصيل و rybell
sudo grep -r "price\|rybell\|demaalhaya\|proxy_pass" /etc/nginx/sites-enabled/

# 3) آخر أخطاء nginx
sudo tail -40 /var/log/nginx/error.log

# 4) الحاويات العاملة
docker ps -a
```

**في error.log** ستجد سطراً مثل:
```
connect() failed (111: Connection refused) while connecting to upstream
```
والمنفذ في السطر = المنفذ الذي nginx يحاول الاتصال به.

---

## الخطوة 2 — rybellairaq.com

يجب أن يكون له ملف **منفصل** في nginx، مثلاً:
`/etc/nginx/sites-enabled/rybellairaq.com`

```bash
sudo cat /etc/nginx/sites-enabled/rybellairaq.com
# أو
sudo ls -la /etc/nginx/sites-enabled/
```

**إذا الملف موجود:** تحقق من `proxy_pass` — مثلاً `http://127.0.0.1:XXXX`

```bash
# اختبر المنفذ مباشرة (استبدل XXXX بالمنفذ من الإعداد)
curl -sI http://127.0.0.1:XXXX
```

- إذا `Connection refused` → **شغّل التطبيق** أو **صحّح المنفذ**
- إذا 200 → المشكلة في nginx config

**إذا التطبيق Docker:**

```bash
docker ps -a | grep -i rybell
# شغّله إن كان متوقفاً
docker start CONTAINER_NAME
```

**إذا التطبيق systemd:**

```bash
sudo systemctl list-units --type=service | grep -i rybell
sudo systemctl restart SERVICE_NAME
```

---

## الخطoة 3 — demaalhayaadelivery.online/price/

`/price/` **ليس** جزءاً من نظام التوصيل — تطبيق **منفصل** على منفذ آخر.

### أ) اعثر على المنفذ القديم

```bash
sudo grep -r "price" /etc/nginx/
# ابحث عن proxy_pass بجانب /price/
```

### ب) تحقق أن التطبيق يعمل

```bash
# جرّب المنافذ الشائعة
curl -sI http://127.0.0.1:5000/price/ 2>/dev/null | head -1
curl -sI http://127.0.0.1:8000/price/ 2>/dev/null | head -1
curl -sI http://127.0.0.1:3001/price/ 2>/dev/null | head -1
```

### ج) أضف location /price/ في vhost الدومين

انظر `nginx/host-vhost.conf.example` — يجب أن يكون **قبل** `location /`:

```nginx
location /price/ {
    proxy_pass http://127.0.0.1:PORT;   # ← المنفذ الصحيح
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    ...
}

location / {
    proxy_pass http://127.0.0.1:8080;     # نظام التوصيل (Docker)
    ...
}
```

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## الخطوة 4 — تأكد أن Docker التوصيل يعمل

```bash
cd /opt/delivery-system

docker compose -f docker-compose.yml \
  -f docker-compose.override-domain.yml \
  -f docker-compose.override-multisite.yml \
  --profile https up -d --build

curl -s http://127.0.0.1:8080/health
# يجب: {"ok":true,"version":"..."}
```

---

## الخطوة 5 — استعادة إعداد nginx القديم (إن وُجد)

```bash
# نسخ احتياطية nginx
sudo ls -la /etc/nginx/sites-available/
sudo ls -la /etc/nginx/sites-enabled/

# إن وُجد .bak أو نسخة قديمة
sudo cp /etc/nginx/sites-available/demaalhayaadelivery.online.bak \
        /etc/nginx/sites-available/demaalhayaadelivery.online
sudo nginx -t && sudo systemctl reload nginx
```

---

## ملخص سريع

| الموقع | السبب المحتمل | الحل |
|--------|---------------|------|
| `rybellairaq.com` | تطبيق rybell متوقف أو منفذ خاطئ | `docker ps` / `systemctl` + تصحيح vhost |
| `/price/` | location مفقود أو تطبيق الأسعار متوقف | أضف `location /price/` + شغّل التطبيق |
| `/` (التوصيل) | Docker على 8080 متوقف | `docker compose ... up -d --build` |

---

## أرسل لي (للمساعدة)

```bash
sudo grep -r "proxy_pass\|server_name" /etc/nginx/sites-enabled/
sudo tail -20 /var/log/nginx/error.log
docker ps -a
sudo ss -tlnp | grep LISTEN
```

انسخ الناتج لتحديد المنفذ والتطبيق المتوقف بدقة.
