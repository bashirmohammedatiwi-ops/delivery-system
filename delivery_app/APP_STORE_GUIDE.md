# دليل رفع تطبيق ديما الحياة على App Store

## ما تم تجهيزه في المشروع ✅

- **NSCameraUsageDescription**: وصف صلاحية الكاميرا لمسح الباركود (مطلوب من Apple)
- **CFBundleDevelopmentRegion**: اللغة العربية كمنطقة افتراضية
- **ITSAppUsesNonExemptEncryption**: التطبيق يستخدم HTTPS المعياري فقط (يسرّع المراجعة)
- **Bundle ID**: `com.diyaalhayat.deliveryApp`
- **أيقونات التطبيق**: موجودة بجميع الأحجام بما فيها 1024×1024

---

## المتطلبات قبل الرفع

### 1. جهاز Mac مع Xcode
- لا يمكن بناء IPA من Windows — يجب استخدام Mac
- تثبيت [Xcode](https://developer.apple.com/xcode/) (الإصدار 16 أو أحدث)
- تثبيت Xcode Command Line Tools: `xcode-select --install`

### 2. اشتراك Apple Developer
- [Apple Developer Program](https://developer.apple.com/programs/) — حوالي 99$ سنوياً
- إعداد الدفع والضرائب في [App Store Connect](https://appstoreconnect.apple.com/)

### 3. التوقيع (Code Signing)
في Xcode على Mac:
1. افتح `ios/Runner.xcworkspace` (وليس `.xcodeproj`)
2. اختر Target → Runner → Signing & Capabilities
3. فعّل **Automatically manage signing**
4. اختر فريقك (Team) من القائمة
5. أو أنشئ Provisioning Profile يدوياً من [developer.apple.com](https://developer.apple.com/account/resources/profiles/list)

---

## خطوات البناء والرفع

### على جهاز Mac

```bash
cd delivery_app

# التحديث وتثبيت الحزم
flutter pub get

# بناء IPA للرفع على App Store
flutter build ipa
```

أو مع خيارات التصدير (عدّل `YOUR_TEAM_ID` في `ios/ExportOptions.plist` أولاً):

```bash
flutter build ipa --export-options-plist=ios/ExportOptions.plist
```

### من Xcode بدلاً من ذلك

1. `flutter build ios --release`
2. افتح `ios/Runner.xcworkspace` في Xcode
3. Product → Archive
4. بعد اكتمال الأرشيف: Distribute App → App Store Connect → Upload

---

## إعداد App Store Connect

### قبل الرفع

1. سجّل الدخول إلى [App Store Connect](https://appstoreconnect.apple.com/)
2. My Apps → + (تطبيق جديد)
3. اختر **iOS** واسم التطبيق (مثل: ديما الحياة - التوصيل)
4. Bundle ID: `com.diyaalhayat.deliveryApp`

### معلومات التطبيق المطلوبة

| البند | الوصف |
|-------|-------|
| **اسم التطبيق** | حتى 30 حرفاً (مثال: ديما الحياة) |
| **الوصف** | وصف واضح بالعربية |
| **لقطات الشاشة** | مطلوبة لـ iPhone 6.5" و 5.5" على الأقل |
| **أيقونة 1024×1024** | موجودة في المشروع |
| **سياسة الخصوصية** | `https://demaalhayaadelivery.online/privacy` |
| **الفئة** | مثل: Business أو Productivity |
| **التصنيف العمري** | مثل: 4+ أو 12+ حسب المحتوى |

### لقطات الشاشة المطلوبة

- **iPhone 6.7"** (مثل iPhone 15 Pro Max): 1290 × 2796 px
- **iPhone 6.5"** (مثل iPhone 11 Pro Max): 1242 × 2688 px  
- **iPhone 5.5"** (مثل iPhone 8 Plus): 1242 × 2208 px

---

## بعد رفع IPA

1. في App Store Connect → التطبيق → TestFlight (يظهر الت build بعد بضع دقائق)
2. أضف المعلومات المطلوبة (الوصف، اللقطات، سياسة الخصوصية، إلخ)
3. أرسل للتقييم: App Store → إصدار جديد → حدد الـ build → إرسال للمراجعة

---

## ملاحظات مهمة

- **اختبار قبل الرفع**: اختبر على جهاز iPhone فعلي باستخدام `flutter run`
- **بيئة الإنتاج**: تأكد أن الـ API يستخدم `https://demaalhayaadelivery.online` في بناء الإنتاج
- **تصحيح ExportOptions.plist**: استبدل `YOUR_TEAM_ID` برمز فريقك من [developer.apple.com/account](https://developer.apple.com/account)

---

## استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| Code signing failed | تأكد من اشتراك Apple Developer والـ Team في Xcode |
| No such module | نفّذ `flutter pub get` و`pod install` في مجلد ios |
| Build fails on Mac | تحقق من إصدار Xcode (16+) و Flutter (`flutter doctor -v`) |
