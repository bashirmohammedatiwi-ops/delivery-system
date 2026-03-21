import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../config/api_config.dart';
import '../../../services/employee_api.dart';
import '../employee_theme.dart';

class EmpSettingsTab extends StatelessWidget {
  final VoidCallback onLogout;

  const EmpSettingsTab({super.key, required this.onLogout});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, dynamic>?>(
      future: EmployeeApi.me(),
      builder: (context, snap) {
        final user = snap.data;
        final name = user?['DisplayName'] ?? user?['Username'] ?? 'موظف';
        final role = user?['Role'] == 'admin' ? 'مدير' : 'موظف';
        return SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 32),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topRight,
                    end: Alignment.bottomLeft,
                    colors: [
                      EmployeeTheme.primary,
                      EmployeeTheme.primaryDark,
                      const Color(0xFF334155),
                    ],
                    stops: const [0.0, 0.5, 1.0],
                  ),
                  borderRadius: BorderRadius.circular(28),
                  boxShadow: [
                    BoxShadow(
                      color: EmployeeTheme.primary.withValues(alpha: 0.4),
                      blurRadius: 24,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Container(
                      width: 96,
                      height: 96,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white.withValues(alpha: 0.4), width: 3),
                      ),
                      child: Center(
                        child: Text(
                          name.toString().substring(0, 1).toUpperCase(),
                          style: GoogleFonts.cairo(fontSize: 40, fontWeight: FontWeight.w800, color: Colors.white),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      'المستخدم',
                      style: GoogleFonts.cairo(fontSize: 14, color: Colors.white.withValues(alpha: 0.9), fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      name,
                      style: GoogleFonts.cairo(fontSize: 24, fontWeight: FontWeight.w800, color: Colors.white),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(role, style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () async {
                    if (!await _confirm(context)) return;
                    await EmployeeApi.logout();
                    onLogout();
                  },
                  icon: const Icon(Icons.logout_rounded, size: 22),
                  label: const Text('تسجيل الخروج'),
                  style: FilledButton.styleFrom(
                    backgroundColor: EmployeeTheme.danger,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 0,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              InkWell(
                onTap: () => launchUrl(
                  Uri.parse('${ApiConfig.baseUrl}/privacy'),
                  mode: LaunchMode.externalApplication,
                ),
                borderRadius: BorderRadius.circular(12),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.privacy_tip_outlined, size: 20, color: EmployeeTheme.primary),
                      const SizedBox(width: 10),
                      Text(
                        'سياسة الخصوصية',
                        style: GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.w600, color: EmployeeTheme.primary),
                      ),
                      const SizedBox(width: 6),
                      Icon(Icons.open_in_new_rounded, size: 16, color: EmployeeTheme.primary),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.description_rounded, size: 18, color: EmployeeTheme.onSurfaceVariant),
                  const SizedBox(width: 8),
                  Text(
                    'تطبيق الموظفين • ديما الحياة',
                    style: GoogleFonts.cairo(fontSize: 13, color: EmployeeTheme.onSurfaceVariant),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

Future<bool> _confirm(BuildContext context) async {
  return await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      title: const Text('تسجيل الخروج'),
      content: const Text('هل تريد تسجيل الخروج؟'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('إلغاء')),
        FilledButton(
          onPressed: () => Navigator.pop(ctx, true),
          style: FilledButton.styleFrom(backgroundColor: EmployeeTheme.danger),
          child: const Text('نعم'),
        ),
      ],
    ),
  ) ?? false;
}
