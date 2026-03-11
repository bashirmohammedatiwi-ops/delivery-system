# تفعيل HTTPS للتطبيق

## الطريقة الموصى بها: Caddy (شهادة Let's Encrypt مجانية)

Caddy يحصل تلقائياً على شهادات SSL ويجددها. لا حاجة لإعداد يدوي.

### على السيرفر (الإنتاج)

1. **أنشئ ملف `.env`** في مجلد المشروع وأضف دومينك:
   ```
   DOMAIN=delivery.your-company.com
   ```

2. **تأكد أن الدومين يشير لـ IP السيرفر** في إعدادات الـ DNS.

3. **افتح المنافذ 80 و 443** في الجدار الناري (firewall).

4. **شغّل التطبيق**:
   ```bash
   docker-compose up -d
   ```

5. **الوصول**: `https://delivery.your-company.com`

Caddy سيحصل تلقائياً على شهادة Let's Encrypt مجانية خلال الثواني الأولى.

### محلياً (التطوير)

بدون تعيين DOMAIN، التطبيق يعمل على `https://localhost` بشهادة ذاتية (المتصفح قد يعرض تحذيراً).

### 2. ملف Caddyfile (مطلوب)

أنشئ ملف `Caddyfile` في جذر المشروع بالمحتوى التالي (عدّل الدومين):

```
your-domain.com {
    reverse_proxy app:3000
}
```

للاختبار المحلي مع دومين فرضي:

```
localhost {
    tls internal  # شهادة ذاتية للنظام
    reverse_proxy app:3000
}
```

### 3. تعديل المنافذ في docker-compose

غيّر تعريض المنافذ للخدمة `app` حتى لا تتعرض مباشرة للإنترنت:

```yaml
  app:
    # احذف أو علّق على ports - أو استخدم منافذ داخلية فقط
    expose:
      - "3000"
```

### 4. التشغيل

```bash
# تشغيل مع HTTPS (يشمل Caddy)
docker-compose --profile https up -d

# أو لتشغيل Caddy مع الخدمات الأساسية
docker-compose up -d app employee-web driver-web caddy
```

الوصول:
- التطبيق الرئيسي: `https://your-domain.com` أو `https://localhost`
- **تطبيق السائقين**: `https://your-domain.com/driver` أو `https://localhost/driver`
- **تطبيق الموظفين**: `https://your-domain.com/employee` أو `https://localhost/employee`

**ملاحظة**: الخدمة `caddy` تستخدم profile باسم `https`. للإنتاج، احذف `profiles: - https` من docker-compose حتى يبدأ Caddy دائماً مع التطبيق.

---

## طريقة بديلة: Nginx + Let's Encrypt

### 1. استخدام certbot يدوياً

```bash
# تثبيت certbot
sudo apt install certbot  # Linux
# أو من https://certbot.eff.org

# الحصول على الشهادة (يحتاج خادم يعمل على المنفذ 80)
sudo certbot certonly --standalone -d your-domain.com
```

الشهادات ستكون في:
- `/etc/letsencrypt/live/your-domain.com/fullchain.pem`
- `/etc/letsencrypt/live/your-domain.com/privkey.pem`

### 2. إعداد Nginx

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## طريقة ثالثة: HTTPS مباشرة في Node.js (شهادة ذاتية للاختبار)

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
| Caddy          | الإنتاج (موصى به) | منخفض |
| Nginx + certbot| الإنتاج         | متوسط |
| Node.js مباشر  | اختبار محلي    | منخفض |

## ملاحظات مهمة

1. **الدومين**: تحتاج دومين يشير إلى السيرفر (مثل `delivery.yourcompany.com`).
2. **المنفذ 80**: مطلوب للتحقق من Let's Encrypt.
3. **الجدار الناري**: تأكد من فتح المنافذ 80 و 443.
