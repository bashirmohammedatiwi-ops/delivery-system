# تفعيل HTTPS للتطبيق

## الطريقة الموصى بها: Nginx + Let's Encrypt

### على السيرفر (الإنتاج)

1. **أنشئ ملف `.env`** في مجلد المشروع:
   ```
   DOMAIN=demaalhayaadelivery.online
   SSL_EMAIL=admin@demaalhayaadelivery.online
   ```

2. **تأكد أن الدومين يشير لـ IP السيرفر** في إعدادات الـ DNS.

3. **افتح المنافذ 80 و 443** في الجدار الناري (firewall).

4. **احصل على شهادة Let's Encrypt** (مرة واحدة):
   ```bash
   bash scripts/init-ssl.sh
   ```
   تأكد أن **البورت 80 حر** — أوقف أي خدمة أخرى عليه.

5. **شغّل التطبيق**:
   ```bash
   docker compose --profile https up -d
   ```

6. **الوصول**: `https://demaalhayaadelivery.online`

### البورت 80 محجوز

إذا كان البورت 80 مستخدماً، استخدم الشهادة الذاتية على البورت 8443:

```bash
docker compose -f docker-compose.yml -f docker-compose.override-ports.yml --profile https up -d
```

الوصول: `https://demaalhayaadelivery.online:8443` (المتصفح قد يعرض تحذيراً).

### التشغيل

```bash
# تشغيل مع HTTPS (يشمل Nginx)
docker compose --profile https up -d
```

الوصول:
- التطبيق الرئيسي: `https://demaalhayaadelivery.online`
- **تطبيق السائقين**: `https://demaalhayaadelivery.online/driver`
- **تطبيق الموظفين**: `https://demaalhayaadelivery.online/employee`

**ملاحظة**: الخدمة `nginx` تستخدم profile باسم `https`. للإنتاج، احذف `profiles: - https` من docker-compose حتى يبدأ Nginx دائماً مع التطبيق.

---

## تجديد الشهادة

Let's Encrypt يجدد تلقائياً كل 90 يوماً. لتجديد يدوياً (أوقف Nginx أولاً لأن Certbot يحتاج البورت 80):

```bash
docker compose --profile https stop nginx
docker compose --profile init-ssl run --rm -p 80:80 certbot-init
docker compose --profile https start nginx
```

---

## طريقة بديلة: Node.js مباشرة (شهادة ذاتية للاختبار)

للتجربة المحلية فقط - المتصفح سيعرض تحذيراً لأن الشهادة غير موقّعة:

أنشئ ملف `server-https.js` أو عدّل `server.js`:

```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('certs/key.pem'),
  cert: fs.readFileSync('certs/cert.pem')
};

// استبدل app.listen بـ:
https.createServer(options, app).listen(3443, '0.0.0.0', () => {
  console.log('HTTPS على المنفذ 3443');
});
```

إنشاء شهادة ذاتية للاختبار:
```bash
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/CN=localhost"
```

---

## ملخص سريع

| الطريقة        | مناسب لـ        | الجهد |
|----------------|-----------------|-------|
| Nginx + Certbot| الإنتاج (موصى به) | متوسط |
| البورت 8443 (شهادة ذاتية) | البورت 80 محجوز | منخفض |
| Node.js مباشر  | اختبار محلي    | منخفض |

## ملاحظات مهمة

1. **الدومين**: تحتاج دومين يشير إلى السيرفر (مثل `demaalhayaadelivery.online`).
2. **المنفذ 80**: مطلوب للتحقق من Let's Encrypt في المرة الأولى.
3. **الجدار الناري**: تأكد من فتح المنافذ 80 و 443.
