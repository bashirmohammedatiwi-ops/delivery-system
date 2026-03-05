# إعداد خطوط العربية على السيرفر (VPS)

## الحل الأساسي (مُفضّل)

**المجلد `fonts/` وملف `Amiri-Regular.ttf` موجودان داخل المشروع.** عند نشر التطبيق على السيرفر، تأكد أن مجلد `fonts` يتم نسخه مع الملفات. بذلك سيعمل PDF والملصقات تلقائياً دون تثبيت إضافي.

---

## نشر عبر Docker

تم تكوين المشروع مسبقاً ليشمل الخطوط:

- **Dockerfile**: ينسخ مجلد `fonts/` داخل الصورة.
- **docker-compose.yml**: يربط مجلد `./fonts` كـ Volume على المسار `/app/fonts`.

عند التشغيل (بعد تثبيت Docker Desktop):

```bash
# الطريقة الحديثة (مسافة):
docker compose build --no-cache
docker compose up -d

# أو استخدم السكربت الجاهز:
.\docker-build.ps1
```

تأكد أن مجلد `fonts` وملف `Amiri-Regular.ttf` موجودان في نفس مستوى `docker-compose.yml` قبل التنفيذ.

---

## خطوات احتياطية على السيرفر (Linux)

إذا لم يُنسخ مجلد `fonts` أو أردت ضمان وجود خطوط عربية في النظام، نفّذ الأوامر التالية على السيرفر:

### 1. تثبيت خطوط الدعم العربي

**Debian / Ubuntu:**
```bash
sudo apt update
sudo apt install -y fonts-amiri fonts-dejavu-core fonts-liberation
```

**CentOS / RHEL / Fedora:**
```bash
sudo dnf install -y google-noto-sans-arabic-fonts dejavu-sans-fonts liberation-fonts
# أو على CentOS قديم:
# sudo yum install -y google-noto-sans-arabic-fonts dejavu-sans-fonts liberation-fonts
```

### 2. تحديث كاش الخطوط (إن لزم)

```bash
fc-cache -fv
```

### 3. إعادة تشغيل التطبيق

بعد النشر أو التحديث:

```bash
# إذا كنت تستخدم PM2:
pm2 restart all

# أو إذا تشغّل عبر systemd:
sudo systemctl restart your-app-service
```

---

## التحقق من وجود الخط

```bash
fc-list | grep -i amiri
# أو
ls -la /usr/share/fonts/truetype/amiri/
```

إذا ظهر الملف `Amiri-Regular.ttf` فهذا يعني أن الخط مثبت بنجاح.
