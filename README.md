# ديما الحياة - نظام التوصيل (نسخة الويب)

نسخة ويب من نظام إدارة التوصيل، تعمل على المتصفح وتدعم عدة مستخدمين في نفس الوقت.

## التشغيل

```bash
npm install
npm start
```

ثم افتح المتصفح على: **http://localhost:3000**

## المميزات

- نفس وظائف النسخة المكتبية (Electron)
- دعم عدة مستخدمين متزامنين
- REST API جاهز للربط مع تطبيق السائق (Expo/React Native)
- قاعدة بيانات SQLite عبر sql.js (ملف `data/delivery.db`)

## API للمطورين / تطبيق السائق

جميع المسارات تحت `/api/`:

| الطريقة | المسار | الوصف |
|---------|--------|-------|
| GET | `/api/drivers` | قائمة السائقين |
| POST | `/api/orders` | إنشاء طلب جديد |
| GET | `/api/orders` | قائمة الطلبات (مع فلاتر) |
| GET | `/api/orders/shipment/:num` | طلب برقم الشحنة |
| POST | `/api/orders/assign` | تعيين طلب لسائق `{ shipmentNumber, driverId }` |
| POST | `/api/orders/return` | إرجاع طلب `{ shipmentNumber }` |

**CORS** مُفعّل لجميع المصادر، لذا يمكن لتطبيق الهاتف الاتصال بالخادم عند نشرّه.

### مثال لتطبيق السائق (Expo)

```javascript
const API_BASE = 'http://YOUR_SERVER_IP:3000';

// جلب طلبات السائق
const res = await fetch(`${API_BASE}/api/orders?driverId=${driverId}&status=AssignedToDriver`);
const orders = await res.json();
```

## التشغيل بـ Docker

```bash
docker-compose up -d --build
```

- **النظام الإداري:** http://localhost:3000
- **تطبيق السائق (ويب):** http://localhost:3001
- **تطبيق الموظفين (ويب):** http://localhost:3002

توجّه تطبيقات السائق والموظفين طلباتها إلى السيرفر الرئيسي تلقائياً داخل Docker.

## النشر

- ضع الخادم على VPS أو أي استضافة Node.js
- غيّر `PORT` عبر متغير البيئة: `PORT=8080 npm start`
- للتوصيل عبر الهاتف: استخدم IP الخادم أو نطاق (domain) بدلاً من localhost
