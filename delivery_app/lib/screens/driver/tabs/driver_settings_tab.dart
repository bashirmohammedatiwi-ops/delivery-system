import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../services/driver_api.dart';
import '../driver_theme.dart';
import '../driver_ui_kit.dart';

class DriverSettingsTab extends StatelessWidget {
  final VoidCallback onLogout;

  const DriverSettingsTab({super.key, required this.onLogout});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, dynamic>?>(
      future: DriverApi.getDriver(),
      builder: (context, snap) {
        final driver = snap.data;
        final name = driver?['DriverName'] ?? '—';
        final initial = name.toString().isNotEmpty ? name.toString().substring(0, 1).toUpperCase() : '?';

        return SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: DriverTheme.primaryGradient,
                  borderRadius: BorderRadius.circular(DriverTheme.radiusXl),
                  boxShadow: DriverTheme.shadowFor(DriverTheme.primary),
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
                        child: Text(initial, style: GoogleFonts.cairo(fontSize: 36, fontWeight: FontWeight.w800, color: Colors.white)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(name, style: GoogleFonts.cairo(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white)),
                    const SizedBox(height: 8),
                    DriverUiKit.statusChip('سائق', Colors.white),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Text('الحساب', style: DriverTheme.labelSmall.copyWith(color: DriverTheme.onSurface)),
              const SizedBox(height: 10),
              DriverSettingsTile(
                icon: Icons.phone_outlined,
                title: 'رقم الهاتف',
                subtitle: driver?['Phone']?.toString() ?? '—',
                trailing: const SizedBox.shrink(),
                onTap: null,
              ),
              const SizedBox(height: 24),
              Text('التطبيق', style: DriverTheme.labelSmall.copyWith(color: DriverTheme.onSurface)),
              const SizedBox(height: 10),
              DriverSettingsTile(
                icon: Icons.privacy_tip_outlined,
                title: 'سياسة الخصوصية',
                subtitle: 'قراءة سياسة استخدام البيانات',
                accent: DriverTheme.secondary,
                onTap: () => Navigator.pushNamed(context, '/privacy'),
              ),
              const SizedBox(height: 10),
              DriverSettingsTile(
                icon: Icons.local_shipping_outlined,
                title: 'ديما الحياة · تطبيق السائق',
                subtitle: 'الإصدار v2',
                trailing: const SizedBox.shrink(),
                onTap: null,
              ),
              const SizedBox(height: 28),
              DriverSettingsTile(
                icon: Icons.logout_rounded,
                title: 'تسجيل الخروج',
                subtitle: 'إنهاء الجلسة على هذا الجهاز',
                danger: true,
                trailing: const SizedBox.shrink(),
                onTap: () async {
                  if (!await _confirmLogout(context)) return;
                  await DriverApi.logout();
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

Future<bool> _confirmLogout(BuildContext context) async {
  return await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(DriverTheme.radiusLg)),
          title: Text('تسجيل الخروج', style: DriverTheme.titleMedium),
          content: Text('هل تريد تسجيل الخروج؟', style: DriverTheme.bodyLarge),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('إلغاء')),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: FilledButton.styleFrom(backgroundColor: DriverTheme.danger),
              child: const Text('نعم'),
            ),
          ],
        ),
      ) ??
      false;
}
