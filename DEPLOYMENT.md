# دليل النشر على VPS (Ubuntu)

دليل خطوة بخطوة لنشر تطبيق نظام إدارة التوصيل على خادم VPS (Ubuntu) باستخدام Docker.

---

## المتطلبات

- خادم VPS يعمل بنظام Ubuntu 22.04 LTS (أو أحدث)
- اتصال SSH بالخادم
- مستودع GitHub: `https://github.com/bashirmohammedatiwi-ops/delivery-system.git`

---

## الخطوة 1: الاتصال بالخادم

```bash
ssh root@YOUR_SERVER_IP
```

أو باستخدام مستخدم غير root:

```bash
ssh your_user@YOUR_SERVER_IP
```

---

## الخطوة 2: تثبيت Docker

```bash
# تحديث الحزم
sudo apt update && sudo apt upgrade -y

# تثبيت التبعيات
sudo apt install -y ca-certificates curl gnupg lsb-release

# إضافة مفتاح GPG الرسمي لـ Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# إضافة مستودع Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# تثبيت Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# إضافة المستخدم الحالي لمجموعة docker (لتشغيل docker بدون sudo)
sudo usermod -aG docker $USER

# تطبيق التغييرات (أو إعادة تسجيل الدخول)
newgrp docker
```

---

## الخطوة 3: التحقق من التثبيت

```bash
docker --version
docker compose version
```

يجب أن يظهر إصدار Docker و Docker Compose.

---

## الخطوة 4: استنساخ المستودع

```bash
# الانتقال للمجلد المناسب (مثلاً /opt أو /home)
cd /opt

# استنساخ المستودع
sudo git clone https://github.com/bashirmohammedatiwi-ops/delivery-system.git
cd delivery-system
```

---

## الخطوة 5: بناء وتشغيل التطبيق

```bash
# بناء الصور وتشغيل الحاوية في الخلفية
docker compose up -d --build
```

سيقوم الأمر بـ:

- بناء صورة التطبيق
- تشغيل الحاوية على المنفذ 3000
- إعادة التشغيل تلقائياً عند تعطل التطبيق
- إنشاء وحدة تخزين لحفظ قاعدة البيانات SQLite

---

## الخطوة 6: التحقق من التشغيل

```bash
# عرض الحاويات العاملة
docker compose ps

# عرض السجلات
docker compose logs -f app
```

التطبيق متاح على:

```
http://YOUR_SERVER_IP:3000
```

---

## أوامر إضافية مفيدة

| الأمر | الوصف |
|-------|-------|
| `docker compose up -d --build` | بناء وتشغيل التطبيق |
| `docker compose down` | إيقاف وإزالة الحاويات |
| `docker compose logs -f app` | عرض السجلات (متابعة) |
| `docker compose restart` | إعادة تشغيل التطبيق |
| `docker compose pull && docker compose up -d --build` | تحديث الكود وإعادة البناء |

---

## تحديث التطبيق بعد تعديل الكود

```bash
cd /opt/delivery-system
git pull origin main
docker compose up -d --build
```

---

## حل المشاكل

### المنفذ 3000 مستخدم

عدّل المنفذ في `docker-compose.yml`:

```yaml
ports:
  - "8080:3000"   # استبدل 8080 بالمنفذ المطلوب
```

### فشل البناء

```bash
# بناء بدون كاش
docker compose build --no-cache
docker compose up -d
```

### عرض سجلات الأخطاء

```bash
docker compose logs app
```

---

## ملاحظات الأمان

- استخدم جدار ناري (UFW) لتقييد الوصول للمنافذ
- استخدم Nginx كـ reverse proxy مع SSL للوصول عبر HTTPS
- لا تُشغّل التطبيق كـ root في الإنتاج (تم استخدام مستخدم non-root داخل الحاوية)

---

## دعم

للأسئلة أو المشاكل، راجع مستودع المشروع على GitHub أو تواصل مع فريق التطوير.
