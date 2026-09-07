import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../services/driver_api.dart';
import 'driver_theme.dart';
import 'driver_ui_kit.dart';

class DriverLoginScreen extends StatelessWidget {
  final VoidCallback onLoggedIn;

  const DriverLoginScreen({super.key, required this.onLoggedIn});

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: DriverUiKit.pageBackground(
          accent: DriverTheme.secondary,
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
                      style: IconButton.styleFrom(backgroundColor: Colors.white, foregroundColor: DriverTheme.onSurface),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Center(
                    child: Container(
                      width: 96,
                      height: 96,
                      decoration: BoxDecoration(
                        gradient: DriverTheme.primaryGradient,
                        borderRadius: BorderRadius.circular(28),
                        boxShadow: DriverTheme.shadowFor(DriverTheme.primary),
                        border: Border.all(color: Colors.white, width: 3),
                      ),
                      child: const Icon(Icons.local_shipping_rounded, size: 48, color: Colors.white),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'تطبيق السائق',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.cairo(fontSize: 30, fontWeight: FontWeight.w800, color: DriverTheme.onSurface),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'شركة ديما الحياة',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.cairo(fontSize: 15, color: DriverTheme.onSurfaceVariant),
                  ),
                  const SizedBox(height: 36),
                  _LoginForm(onLoggedIn: onLoggedIn),
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
      final data = await DriverApi.login(u, p);
      final token = data['token'] as String?;
      final driver = data['driver'] as Map<String, dynamic>?;
      if (token != null && driver != null) {
        await DriverApi.saveLogin(token, driver);
        widget.onLoggedIn();
      } else {
        setState(() => _error = 'فشل تسجيل الدخول');
      }
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
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
        borderRadius: BorderRadius.circular(DriverTheme.radiusXl),
        border: Border.all(color: DriverTheme.outline),
        boxShadow: DriverTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('تسجيل الدخول', style: DriverTheme.titleLarge.copyWith(fontSize: 20)),
          const SizedBox(height: 6),
          Text('أدخل بيانات حساب السائق', style: DriverTheme.bodyMedium),
          const SizedBox(height: 24),
          TextField(
            controller: _username,
            decoration: DriverTheme.inputDecoration(
              label: 'اسم المستخدم',
              prefixIcon: const Icon(Icons.person_outline_rounded, size: 22),
            ),
            textInputAction: TextInputAction.next,
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _password,
            obscureText: _obscure,
            decoration: DriverTheme.inputDecoration(
              label: 'كلمة المرور',
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
            DriverUiKit.infoBanner(message: _error!, color: DriverTheme.danger, icon: Icons.error_outline_rounded),
          ],
          const SizedBox(height: 24),
          SizedBox(
            height: 54,
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: DriverTheme.primaryGradient,
                borderRadius: BorderRadius.circular(DriverTheme.radiusMd),
                boxShadow: DriverTheme.shadowFor(DriverTheme.primary),
              ),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: _loading ? null : _login,
                  borderRadius: BorderRadius.circular(DriverTheme.radiusMd),
                  child: Center(
                    child: _loading
                        ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : Text('دخول', style: GoogleFonts.cairo(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white)),
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
