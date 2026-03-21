# نشر صفحة سياسة الخصوصية

## الرابط بعد النشر

```
https://demaalhayaadelivery.online/privacy
```

## ما تم إضافته

- **صفحة HTML:** `public/privacy.html` — سياسة خصوصية بالعربية
- **مسار السيرفر:** `GET /privacy` في `server.js`

## النشر عبر Docker

صفحة الخصوصية تُضمَّن تلقائياً في صورة Docker لأن مجلد `public` مُنسَخ إلى الحاوية.

### بناء وإعادة التشغيل

```bash
# من جذر المشروع (app_web)
docker-compose build app
docker-compose up -d app
```

### تشغيل كامل مع Nginx

```bash
docker-compose up -d --build
```

ستكون الصفحة متاحة على:

- **بدون Nginx:** `http://localhost:3000/privacy`
- **مع Nginx و HTTPS:** `https://دومينك/privacy`

### التحقق

```bash
curl -I https://demaalhayaadelivery.online/privacy
```

يجب أن يعيد `200 OK`.

---

## استخدام الرابط في App Store Connect

في حقل **Privacy Policy URL** ضع:

```
https://demaalhayaadelivery.online/privacy
```
