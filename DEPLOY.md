# إعداد النشر (Deployment)

## المشكلة
منصة النشر تحاول **سحب** الصورة `alhayat-delivery:latest` من Docker Hub، لكنها **صورة محلية** يجب بناؤها من الكود.

## الحل

### 1. استخدام سكربت النشر
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### 2. إعداد منصة النشر (Coolify / CapRover / إلخ)

**مهم:** عطّل أو تجاوز خطوة "Pull" واجعل المنصة تنفّذ **Build** من الكود.

#### Build Command (أمر البناء):
```bash
docker build -t alhayat-delivery:latest -f Dockerfile .
```

#### Start Command (أمر التشغيل):
```bash
docker compose up -d
```

أو أمر واحد:
```bash
docker build -t alhayat-delivery:latest -f Dockerfile . && docker compose up -d
```

### 3. النشر اليدوي على السيرفر
```bash
cd /opt/delivery-system
docker build -t alhayat-delivery:latest -f Dockerfile .
docker compose up -d
```
