import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../services/driver_api.dart';
import '../driver_theme.dart';

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
                      DriverTheme.primary,
                      DriverTheme.primaryDark,
                      const Color(0xFF334155),
                    ],
                    stops: const [0.0, 0.5, 1.0],
                  ),
                  borderRadius: BorderRadius.circular(28),
                  boxShadow: [
                    BoxShadow(
                      color: DriverTheme.primary.withValues(alpha: 0.4),
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
                      child: Icon(Icons.person_rounded, size: 52, color: Colors.white.withValues(alpha: 0.95)),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      'اسم السائق',
                      style: GoogleFonts.cairo(fontSize: 14, color: Colors.white.withValues(alpha: 0.9), fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      name,
                      style: GoogleFonts.cairo(fontSize: 24, fontWeight: FontWeight.w800, color: Colors.white),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () async {
                    if (!await _confirmLogout(context)) return;
                    await DriverApi.logout();
                    onLogout();
                  },
                  icon: const Icon(Icons.logout_rounded, size: 22),
                  label: const Text('تسجيل الخروج'),
                  style: FilledButton.styleFrom(
                    backgroundColor: DriverTheme.danger,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 0,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              InkWell(
                onTap: () => Navigator.pushNamed(context, '/privacy'),
                borderRadius: BorderRadius.circular(12),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.privacy_tip_outlined, size: 20, color: DriverTheme.primary),
                      const SizedBox(width: 10),
                      Text(
                        'سياسة الخصوصية',
                        style: GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.w600, color: DriverTheme.primary),
                      ),
                      const SizedBox(width: 6),
                      Icon(Icons.open_in_new_rounded, size: 16, color: DriverTheme.primary),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.local_shipping_rounded, size: 18, color: DriverTheme.onSurfaceVariant),
                  const SizedBox(width: 8),
                  Text(
                    'تطبيق السائق • شركة ديما الحياة',
                    style: GoogleFonts.cairo(fontSize: 13, color: DriverTheme.onSurfaceVariant),
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

Future<bool> _confirmLogout(BuildContext context) async {
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
          style: FilledButton.styleFrom(backgroundColor: DriverTheme.danger),
          child: const Text('نعم'),
        ),
      ],
    ),
  ) ?? false;
}
