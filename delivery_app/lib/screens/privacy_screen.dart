import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// شاشة سياسة الخصوصية — تعرض داخل التطبيق
class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

  static const String _content = '''
نرحب بكم في تطبيق ديما الحياة للتوصيل. نحترم خصوصيتكم ونلتزم بحماية بياناتك الشخصية. توضّح هذه السياسة كيفية جمعنا واستخدامنا وحمايتنا للمعلومات.

١. البيانات التي نجمعها
نجمع الأنواع التالية من البيانات لضمان تقديم الخدمة:
• بيانات تسجيل الدخول: اسم المستخدم وكلمة المرور (مشفرة) للموظفين والسائقين.
• بيانات الطلبات: أسماء المستلمين، أرقام الهواتف، العناوين، وأرقام الشحن اللازمة لإتمام التوصيل.
• الوصول إلى الكاميرا: نطلب إذن الكاميرا لمسح الباركود عند استلام الطلبات. لا نخزّن الصور أو التسجيلات.
• بيانات الجلسة: رمز جلسة مؤقت (Token) يُحفظ على جهازك لتسجيل دخول تلقائي.

٢. الغرض من جمع البيانات
نستخدم البيانات للمراصد التالية:
• إدارة الطلبات والتوصيل.
• توثيق هوية الموظفين والسائقين.
• مسح الباركود لربط الشحنات بالسائقين.
• تحسين الخدمة والدعم الفني.

٣. مشاركة البيانات
لا نبيع ولا نؤجر بياناتك الشخصية لأطراف ثالثة. قد نشارك بيانات الطلبات مع السائقين المعينين فقط لإتمام التوصيل، ولا نشاركها خارج نطاق الخدمة.

٤. تخزين وحماية البيانات
نخزّن البيانات على خوادم آمنة ونستخدم تشفيراً (HTTPS) عند نقلها عبر الإنترنت. كلمات المرور مُخزّنة بشكل مشفّر ولا يمكن استرجاعها كنص واضح.

٥. حقوقك
يمكنك طلب الاطلاع على بياناتك الشخصية المخزنة لدينا، أو تصحيحها أو حذفها، أو إيقاف استخدام الخدمة وسحب الموافقة.

٦. التخزين المحلي
نستخدم تخزيناً محلياً على جهازك لحفظ جلسة تسجيل الدخول فقط. لا نستخدم ملفات تعريف ارتباط لتتبعك خارج التطبيق.

٧. التحديثات
قد نحدّث هذه السياسة بين الحين والآخر. سنُعلمك بأي تغييرات جوهرية عبر التطبيق.

٨. التواصل معنا
لأي استفسارات حول الخصوصية أو لتنفيذ حقوقك، يرجى التواصل معنا عبر القنوات الرسمية لشركة ديما الحياة.
''';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text('سياسة الخصوصية', style: GoogleFonts.cairo(fontWeight: FontWeight.w700)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.06),
                  blurRadius: 20,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'تطبيق ديما الحياة - نظام إدارة التوصيل',
                  style: GoogleFonts.cairo(
                    fontSize: 14,
                    color: const Color(0xFF64748B),
                    height: 1.6,
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  _content,
                  style: GoogleFonts.cairo(
                    fontSize: 15,
                    height: 1.8,
                    color: const Color(0xFF334155),
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'آخر تحديث: مارس 2025',
                  style: GoogleFonts.cairo(
                    fontSize: 13,
                    color: const Color(0xFF94A3B8),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
