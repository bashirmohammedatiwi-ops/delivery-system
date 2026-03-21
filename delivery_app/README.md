# تطبيق ديما الحياة - نظام التوصيل

تطبيق Flutter موحّد يجمع تطبيق السائق وتطبيق الموظف في واجهة واحدة.

## البداية

عند فتح التطبيق تظهر شاشة اختيار:
- **تطبيق السائق**: طلباتي، استلام، منتظرة، إحصائيات، السجل، إعدادات
- **تطبيق الموظف**: طلب جديد، استلام، الطلبات، إعدادات

## التشغيل

```bash
cd delivery_app
flutter pub get
flutter run
```

## تغيير عنوان السيرفر

```bash
flutter run --dart-define=API_URL=http://YOUR_IP:3000
```

أو لاستخدام الدومين (التصنيع):
```bash
flutter run --dart-define=API_URL=https://demaalhayaadelivery.online
```

## المتطلبات

- Flutter 3.11+
- Android / iOS

## الحزم المستخدمة

- http: طلبات API
- shared_preferences: تخزين الجلسة
- mobile_scanner: مسح الباركود
- intl: تنسيق التواريخ والعملات
