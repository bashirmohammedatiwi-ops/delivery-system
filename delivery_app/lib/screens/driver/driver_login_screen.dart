import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../services/driver_api.dart';
import 'driver_theme.dart';

class DriverLoginScreen extends StatelessWidget {
  final VoidCallback onLoggedIn;

  const DriverLoginScreen({super.key, required this.onLoggedIn});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topRight,
            end: Alignment.bottomLeft,
            colors: [
              Color(0xFF0F766E),
              Color(0xFF0D9488),
              Color(0xFF334155),
              Color(0xFF475569),
            ],
            stops: [0.0, 0.3, 0.7, 1.0],
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 32),
            child: Column(
              children: [
                const SizedBox(height: 48),
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.2),
                        blurRadius: 24,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: const Icon(Icons.local_shipping_rounded, size: 64, color: Colors.white),
                ),
                const SizedBox(height: 24),
                Text(
                  'تطبيق السائق',
                  style: GoogleFonts.cairo(
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    letterSpacing: -0.5,
                    shadows: [Shadow(color: Colors.black26, blurRadius: 8, offset: const Offset(0, 2))],
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'شركة ديما الحياة',
                  style: GoogleFonts.cairo(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: Colors.white.withValues(alpha: 0.9),
                  ),
                ),
                const SizedBox(height: 56),
                _LoginForm(onLoggedIn: onLoggedIn),
              ],
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
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 32,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'تسجيل الدخول',
            style: DriverTheme.titleLarge.copyWith(color: DriverTheme.onSurface),
          ),
          const SizedBox(height: 28),
          TextField(
            controller: _username,
            decoration: DriverTheme.inputDecoration(label: 'اسم المستخدم', hint: 'أدخل اسم المستخدم'),
            textInputAction: TextInputAction.next,
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _password,
            obscureText: true,
            decoration: DriverTheme.inputDecoration(label: 'كلمة المرور', hint: 'أدخل كلمة المرور'),
            onSubmitted: (_) => _login(),
          ),
          if (_error != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: DriverTheme.danger.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: DriverTheme.danger.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  Icon(Icons.error_outline, size: 20, color: DriverTheme.danger),
                  const SizedBox(width: 12),
                  Expanded(child: Text(_error!, style: TextStyle(color: DriverTheme.danger, fontWeight: FontWeight.w600))),
                ],
              ),
            ),
          ],
          const SizedBox(height: 28),
          Material(
            borderRadius: BorderRadius.circular(16),
            elevation: 0,
            color: DriverTheme.primary,
            child: InkWell(
              onTap: _loading ? null : _login,
              borderRadius: BorderRadius.circular(16),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 18),
                alignment: Alignment.center,
                child: _loading
                    ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text(
                        'دخول',
                        style: GoogleFonts.cairo(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
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
