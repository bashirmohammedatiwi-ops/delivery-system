import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../services/employee_api.dart';
import 'employee_theme.dart';
import 'employee_ui_kit.dart';

class EmployeeLoginScreen extends StatelessWidget {
  final VoidCallback onLoggedIn;

  const EmployeeLoginScreen({super.key, required this.onLoggedIn});

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: EmployeeUiKit.pageBackground(
          child: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Align(
                    alignment: Alignment.centerRight,
                    child: IconButton(
                      onPressed: () => Navigator.of(context).maybePop(),
                      icon: const Icon(Icons.arrow_forward_rounded),
                      style: IconButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: EmployeeTheme.onSurface,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Center(
                    child: Container(
                      width: 96,
                      height: 96,
                      decoration: BoxDecoration(
                        gradient: EmployeeTheme.primaryGradient,
                        borderRadius: BorderRadius.circular(28),
                        boxShadow: EmployeeTheme.shadowFor(EmployeeTheme.primary),
                        border: Border.all(color: Colors.white, width: 3),
                      ),
                      child: const Icon(Icons.badge_rounded, size: 48, color: Colors.white),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'تطبيق الموظفين',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.cairo(
                      fontSize: 30,
                      fontWeight: FontWeight.w800,
                      color: EmployeeTheme.onSurface,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'نظام التوصيل — ديما الحياة',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.cairo(fontSize: 15, color: EmployeeTheme.onSurfaceVariant),
                  ),
                  const SizedBox(height: 36),
                  _LoginForm(onLoggedIn: onLoggedIn),
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.verified_user_outlined, size: 16, color: EmployeeTheme.onSurfaceVariant),
                      const SizedBox(width: 6),
                      Text(
                        'اتصال آمن مع السيرفر',
                        style: GoogleFonts.cairo(fontSize: 12, color: EmployeeTheme.onSurfaceVariant),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _LoginForm extends StatefulWidget {
  final VoidCallback onLoggedIn;

  const _LoginForm({required this.onLoggedIn});

  @override
  State<_LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<_LoginForm> {
  final _username = TextEditingController();
  final _password = TextEditingController();
  String? _error;
  bool _loading = false;
  bool _obscure = true;

  @override
  void dispose() {
    _username.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    final u = _username.text.trim();
    final p = _password.text;
    if (u.isEmpty || p.isEmpty) {
      setState(() => _error = 'أدخل اسم المستخدم وكلمة المرور');
      return;
    }
    setState(() {
      _error = null;
      _loading = true;
    });
    try {
      final data = await EmployeeApi.login(u, p);
      final token = data['token'] as String?;
      if (token != null) {
        await EmployeeApi.saveLogin(token);
        widget.onLoggedIn();
      } else {
        setState(() => _error = 'فشل تسجيل الدخول');
      }
    } catch (e) {
      final msg = e.toString().replaceFirst('Exception: ', '');
      final friendly = (msg.contains('CERTIFICATE_VERIFY_FAILED') || msg.contains('Handshake error'))
          ? 'شهادة أمان السيرفر منتهية أو غير صالحة. يجب تجديد HTTPS على السيرفر.'
          : msg;
      setState(() => _error = friendly);
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(EmployeeTheme.radiusXl),
        border: Border.all(color: EmployeeTheme.outline),
        boxShadow: EmployeeTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('تسجيل الدخول', style: EmployeeTheme.titleLarge.copyWith(fontSize: 20)),
          const SizedBox(height: 6),
          Text('أدخل بيانات حسابك للمتابعة', style: EmployeeTheme.bodyMedium),
          const SizedBox(height: 24),
          TextField(
            controller: _username,
            decoration: EmployeeTheme.inputDecoration(
              label: 'اسم المستخدم',
              hint: 'username',
              prefixIcon: const Icon(Icons.person_outline_rounded, size: 22),
            ),
            textInputAction: TextInputAction.next,
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _password,
            obscureText: _obscure,
            decoration: EmployeeTheme.inputDecoration(
              label: 'كلمة المرور',
              hint: '••••••••',
              prefixIcon: const Icon(Icons.lock_outline_rounded, size: 22),
              suffixIcon: IconButton(
                onPressed: () => setState(() => _obscure = !_obscure),
                icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 22),
              ),
            ),
            onSubmitted: (_) => _login(),
          ),
          if (_error != null) ...[
            const SizedBox(height: 16),
            EmployeeUiKit.infoBanner(message: _error!, color: EmployeeTheme.danger, icon: Icons.error_outline_rounded),
          ],
          const SizedBox(height: 24),
          SizedBox(
            height: 54,
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: EmployeeTheme.primaryGradient,
                borderRadius: BorderRadius.circular(EmployeeTheme.radiusMd),
                boxShadow: EmployeeTheme.shadowFor(EmployeeTheme.primary),
              ),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: _loading ? null : _login,
                  borderRadius: BorderRadius.circular(EmployeeTheme.radiusMd),
                  child: Center(
                    child: _loading
                        ? const SizedBox(
                            height: 24,
                            width: 24,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : Text(
                            'دخول',
                            style: GoogleFonts.cairo(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white),
                          ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
