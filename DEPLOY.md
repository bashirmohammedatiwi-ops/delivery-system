# نشر التطبيق على السيرفر باستخدام Docker

## المتطلبات
- Docker و Docker Compose على السيرفر

## البورتات
| الخدمة        | البورت | الوصف                    |
|--------------|--------|--------------------------|
| التطبيق الرئيسي | 3000   | واجهة الإدارة والـ API    |
| تطبيق السائقين  | 3001   | واجهة ويب السائقين       |
| **تطبيق الموظفين** | **3002** | **واجهة ويب الموظفين** |

## خطوات الرفع

### 1. رفع الملفات للسيرفر
```bash
# نسخ المشروع إلى السيرفر
scp -r . user@your-server:/opt/alhayat-delivery
cd /opt/alhayat-delivery
```

### 2. البناء والتشغيل
```bash
# إيقاف الحاويات القديمة إن وُجدت
docker compose down

# بناء الصور وتشغيل الحاويات (بدون كاش للبناء النظيف إن لزم)
docker compose up -d --build
```

### في حالة فشل healthcheck
```bash
# عرض سجلات التطبيق الرئيسي للتشخيص
docker compose logs app
```

### 3. التحقق
```bash
# عرض الحاويات
docker-compose ps

# عرض السجلات
docker-compose logs -f employee-web
```

### 4. الوصول للتطبيق
- **تطبيق الموظفين (ويب):** `http://YOUR_SERVER_IP:3002`
- التطبيق الإداري: `http://YOUR_SERVER_IP:3000`
- تطبيق السائقين: `http://YOUR_SERVER_IP:3001`

## استخدام Nginx كـ Reverse Proxy (اختياري)

للاستخدام مع نطاق (domain) وـ HTTPS:

```nginx
server {
    listen 80;
    server_name employees.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## أوامر مفيدة

```bash
# إيقاف الخدمات
docker-compose down   # أو: docker compose down

# إعادة بناء وتشغيل
docker-compose up -d --build

# عرض السجلات
docker-compose logs -f employee-web
```
