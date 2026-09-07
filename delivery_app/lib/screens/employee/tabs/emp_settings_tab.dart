import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../services/employee_api.dart';
import '../employee_theme.dart';
import '../employee_ui_kit.dart';
import '../../../widgets/app_layout.dart';

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
        final initial = name.toString().isNotEmpty ? name.toString().substring(0, 1).toUpperCase() : '?';

        return SingleChildScrollView(
          padding: AppLayout.scrollPadding(context),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: EmployeeTheme.primaryGradient,
                  borderRadius: BorderRadius.circular(EmployeeTheme.radiusXl),
                  boxShadow: EmployeeTheme.shadowFor(EmployeeTheme.primary),
                ),
                child: Column(
                  children: [
                    Container(
                      width: 88,
                      height: 88,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.18),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white.withValues(alpha: 0.35), width: 3),
                      ),
                      child: Center(
                        child: Text(
                          initial,
                          style: GoogleFonts.cairo(fontSize: 36, fontWeight: FontWeight.w800, color: Colors.white),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(name, style: GoogleFonts.cairo(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white)),
                    const SizedBox(height: 8),
                    EmployeeUiKit.statusChip(role, Colors.white),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Text('الحساب', style: EmployeeTheme.labelSmall.copyWith(color: EmployeeTheme.onSurface)),
              const SizedBox(height: 10),
              EmployeeSettingsTile(
                icon: Icons.person_outline_rounded,
                title: 'اسم المستخدم',
                subtitle: user?['Username']?.toString() ?? '—',
                trailing: const SizedBox.shrink(),
                onTap: null,
              ),
              const SizedBox(height: 10),
              EmployeeSettingsTile(
                icon: Icons.badge_outlined,
                title: 'الدور',
                subtitle: role,
                accent: EmployeeTheme.info,
                trailing: const SizedBox.shrink(),
                onTap: null,
              ),
              const SizedBox(height: 24),
              Text('التطبيق', style: EmployeeTheme.labelSmall.copyWith(color: EmployeeTheme.onSurface)),
              const SizedBox(height: 10),
              EmployeeSettingsTile(
                icon: Icons.privacy_tip_outlined,
                title: 'سياسة الخصوصية',
                subtitle: 'قراءة سياسة استخدام البيانات',
                accent: EmployeeTheme.secondary,
                onTap: () => Navigator.pushNamed(context, '/privacy'),
              ),
              const SizedBox(height: 10),
              EmployeeSettingsTile(
                icon: Icons.info_outline_rounded,
                title: 'ديما الحياة · نظام التوصيل',
                subtitle: 'تطبيق الموظفين v2',
                trailing: const SizedBox.shrink(),
                onTap: null,
              ),
              const SizedBox(height: 28),
              EmployeeSettingsTile(
                icon: Icons.logout_rounded,
                title: 'تسجيل الخروج',
                subtitle: 'إنهاء الجلسة على هذا الجهاز',
                danger: true,
                trailing: const SizedBox.shrink(),
                onTap: () async {
                  if (!await _confirm(context)) return;
                  await EmployeeApi.logout();
                  onLogout();
                },
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
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(EmployeeTheme.radiusLg)),
          title: Text('تسجيل الخروج', style: EmployeeTheme.titleMedium),
          content: Text('هل تريد تسجيل الخروج؟', style: EmployeeTheme.bodyLarge),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('إلغاء')),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: FilledButton.styleFrom(backgroundColor: EmployeeTheme.danger),
              child: const Text('نعم'),
            ),
          ],
        ),
      ) ??
      false;
}
