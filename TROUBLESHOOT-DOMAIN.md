# استكشاف مشاكل الدومين — demaalhayaadelivery.online

## 502 Bad Gateway على /employee/ أو /driver/

إذا ظهر 502 عند فتح `https://demaalhayaadelivery.online/employee/` أو `/driver/`:

### 1. التأكد من تشغيل جميع الحاويات

```bash
cd /opt/delivery-system
docker ps
```

يجب أن ترى: `delivery-system` و `delivery-employee-web` و `delivery-driver-web` و `delivery-nginx` (جميعها في حالة Up).

### 2. إذا كان employee-web أو driver-web متوقفاً

```bash
# إعادة تشغيل كل الخدمات (مع Nginx و HTTPS)
docker compose --profile https up -d

# أو إن كنت بدون profile https:
docker compose up -d
```

### 3. عرض سجلات الموظفين والسائقين

```bash
docker compose logs employee-web --tail 30
docker compose logs driver-web --tail 30
```

إذا ظهر "لا يمكن الاتصال بالسيرفر الرئيسي" — السيرفر الرئيسي (app) غير جاهز. انتظر حتى يكتمل تشغيله ثم أعد تشغيل employee-web:

```bash
docker compose restart employee-web driver-web
```

### 4. إعادة بناء Nginx بعد التحديثات

```bash
cd /opt/delivery-system
docker compose --profile https build --no-cache nginx
docker compose --profile https up -d
```

### 5. التحقق من الشبكة بين الحاويات

```bash
# من داخل nginx — هل يصل لـ employee-web؟
docker exec delivery-nginx wget -q -O - http://employee-web:3002/ | head -5

# إذا فشل — تأكد أن nginx و employee-web على نفس الشبكة
docker network inspect alhayat-network
```

---

## مشكلة: Let's Encrypt يستشير 2.57.91.91 بدلاً من 187.124.23.65

إذا ظهر في السجلات أن Let's Encrypt يصل إلى `2.57.91.91` (Hostinger) وليس سيرفرك:
- خوادم Let's Encrypt ما زالت تستخدم نسخة قديمة من DNS
- أو انتشار DNS غير مكتمل عالمياً

**الحل:** استخدم الإعداد البديل (شهادة ذاتية على البورت 8443) — يعمل فوراً.

## التشخيص السريع — نفّذ على السيرفر

```bash
# 1. هل الحاويات تعمل؟
docker ps

# 2. سجلات Nginx — هل توجد أخطاء؟
docker logs delivery-nginx --tail 50

# 3. ما الذي يستخدم البورت 80؟ (إذا كان محجوزاً، Certbot سيفشل)
sudo ss -tlnp | grep ':80 '

# 4. ما الذي يستخدم البورت 443؟
sudo ss -tlnp | grep ':443 '

# 5. هل التطبيق يعمل مباشرة؟
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/health
# النتيجة المتوقعة: 200

# 6. هل Nginx يستجيب محلياً؟
curl -sk -o /dev/null -w "%{http_code}" https://127.0.0.1:443/ 2>/dev/null || echo "فشل"
```

---

## الحل 1: البورت 80 مستخدم (تطبيق آخر يعمل عليه)

إذا كان تطبيقك الآخر يستخدم البورت 80، استخدم الإعداد البديل:

```bash
cd /opt/delivery-system
docker compose -f docker-compose.yml -f docker-compose.override-ports.yml --profile https up -d
sudo ufw allow 8443
sudo ufw reload
```

**ثم افتح بهذا الشكل (مع البورت 8443):**
- https://demaalhayaadelivery.online:8443
- https://demaalhayaadelivery.online:8443/employee
- https://demaalhayaadelivery.online:8443/driver

**ملاحظة:** المتصفح قد يعرض تحذير أمان (شهادة ذاتية) — اضغط "المتابعة" أو "Advanced → Proceed".

---

## الحل 2: البورت 80 متاح — إعادة تشغيل Nginx

```bash
cd /opt/delivery-system
docker compose --profile https restart nginx
docker logs delivery-nginx --tail 30
```

---

## الحل 3: التأكد من ملف .env

```bash
cat /opt/delivery-system/.env
# يجب أن يحتوي: DOMAIN=demaalhayaadelivery.online
```

---

## الحل 4: الجدار الناري

```bash
sudo ufw allow 80
sudo ufw allow 443
sudo ufw reload
sudo ufw status
```

---

## الحل 5: حذف Nginx وإعادة بنائه (لحل المشاكل المستعصية)

```bash
cd /opt/delivery-system
bash scripts/rebuild-nginx.sh
```

**إذا كنت تستخدم البورت 8443**:
```bash
OVERRIDE=override-ports bash scripts/rebuild-nginx.sh
```

---

## التحقق من DNS

```bash
nslookup demaalhayaadelivery.online
# يجب أن يظهر: 187.124.23.65
```
