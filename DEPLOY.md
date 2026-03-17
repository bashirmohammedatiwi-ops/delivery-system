# إعداد النشر (Deployment)

## المشكلة
منصة النشر تحاول **سحب** الصورة من Docker Hub، لكنها **صورة محلية** يجب بناؤها من الكود.

## الحل المدمج
تم استخدام `localhost/alhayat-delivery:latest` — البادئة `localhost/` تجعل Docker يعامل الصورة كمحلية ولا يحاول سحبها من الإنترنت.

## الحل

### 1. استخدام سكربت النشر
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### 2. إعداد منصة النشر (Coolify / CapRover / إلخ)

**Coolify:** جرّب تفعيل **Raw Compose Deployment** في إعدادات المشروع — ينشر مباشرة دون خطوة Pull إضافية.

#### Build Command (أمر البناء):
```bash
docker build -t localhost/alhayat-delivery:latest -f Dockerfile .
```

#### Start Command (أمر التشغيل):
```bash
docker compose up -d
```

أو أمر واحد:
```bash
docker build -t localhost/alhayat-delivery:latest -f Dockerfile . && docker compose up -d
```

### 3. النشر اليدوي على السيرفر
```bash
cd /opt/delivery-system
docker build -t localhost/alhayat-delivery:latest -f Dockerfile .
docker compose up -d
```
