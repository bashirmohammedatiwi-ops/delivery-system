# تطبيق السائق - ديما الحياة

تطبيق هاتف للسائقين باستخدام React Native و Expo.

## المتطلبات

- Node.js 18+
- npm أو yarn
- Expo Go (على الهاتف للاختبار)

## التثبيت

```bash
cd driver-app
npm install
```

## التشغيل

```bash
npm start
```

ثم امسح رمز QR بالكاميرا (Android) أو تطبيق الكاميرا (iOS) لفتح التطبيق في Expo Go.

## إعداد عنوان الـ API

عدّل ملف `src/config.js`:

```javascript
// للتطوير - استخدم IP جهاز الكمبيوتر (وليس localhost)
export const API_BASE_URL = 'http://192.168.1.100:3000';

// للإنتاج - استخدم عنوان الخادم
// export const API_BASE_URL = 'https://your-server.com';
```

> **مهم:** عند التشغيل على الهاتف أو المحاكي، استخدم IP جهازك وليس `localhost`.

## البناء للإنتاج

```bash
# Android
npx expo run:android

# iOS
npx expo run:ios
```

أو استخدم EAS Build لنشر التطبيق.

## الميزات

- تسجيل دخول السائق
- عرض الطلبات المعيّنة للسائق
- تفاصيل الطلب مع إمكانية الاتصال بالعميل
- تأكيد التوصيل
- إرجاع الطلب
