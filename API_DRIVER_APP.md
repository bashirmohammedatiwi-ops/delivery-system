# واجهة API لتطبيق هاتف السائق

## تسجيل الدخول

```
POST /api/auth/driver-login
Content-Type: application/json

{
  "username": "اسم المستخدم",
  "password": "الرمز"
}

الاستجابة:
{
  "success": true,
  "driver": { "DriverID": 1, "DriverName": "...", "Phone": "...", "Username": "..." },
  "token": "xxxxxxxx..."
}
```

## جلب طلبات السائق

```
GET /api/driver/orders
Authorization: Bearer <token>

الاستجابة: مصفوفة الطلبات المعينة لهذا السائق (حالة: مع السائق)
```

## معلومات السائق الحالي

```
GET /api/driver/me
Authorization: Bearer <token>
```

## تسجيل الخروج

```
POST /api/auth/driver-logout
Authorization: Bearer <token>
```

## ملاحظات
- الرمز (token) صالح لمدة 30 يوماً
- عند كل طلب لجلب الطلبات، أرسل الرأس: `Authorization: Bearer <token>`
- عنوان الخادم: `http://عنوان-السيرفر:3000`
