# استكشاف مشاكل الدومين — demaalhayaadelivery.online

## مشكلة: Let's Encrypt يستشير 2.57.91.91 بدلاً من 187.124.23.65

إذا ظهر في السجلات أن Let's Encrypt يصل إلى `2.57.91.91` (Hostinger) وليس سيرفرك:
- خوادم Let's Encrypt ما زالت تستخدم نسخة قديمة من DNS
- أو انتشار DNS غير مكتمل عالمياً

**الحل:** استخدم الإعداد البديل (شهادة ذاتية على البورت 8443) — يعمل فوراً.

## التشخيص السريع — نفّذ على السيرفر

```bash
# 1. هل الحاويات تعمل؟
docker ps

# 2. سجلات Caddy — هل توجد أخطاء؟
docker logs delivery-caddy --tail 50

# 3. ما الذي يستخدم البورت 80؟ (إذا كان محجوزاً، Caddy سيفشل)
sudo ss -tlnp | grep ':80 '

# 4. ما الذي يستخدم البورت 443؟
sudo ss -tlnp | grep ':443 '

# 5. هل التطبيق يعمل مباشرة؟
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/health
# النتيجة المتوقعة: 200

# 6. هل Caddy يستجيب محلياً؟
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

## الحل 2: البورت 80 متاح — إعادة تشغيل Caddy

```bash
cd /opt/delivery-system
docker compose --profile https restart caddy
docker logs delivery-caddy --tail 30
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

## التحقق من DNS

```bash
nslookup demaalhayaadelivery.online
# يجب أن يظهر: 187.124.23.65
```
