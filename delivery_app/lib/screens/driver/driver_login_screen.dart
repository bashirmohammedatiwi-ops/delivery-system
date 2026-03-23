import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../services/driver_api.dart';
import 'driver_theme.dart';

class DriverLoginScreen extends StatelessWidget {
  final VoidCallback onLoggedIn;

  const DriverLoginScreen({super.key, required this.onLoggedIn});

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        extendBodyBehindAppBar: true,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded),
            tooltip: 'رجوع',
            onPressed: () => Navigator.of(context).maybePop(),
          ),
        ),
        body: Container(
          width: double.infinity,
          height: double.infinity,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Color(0xFFE0F2FE),
                Color(0xFFF8FAFC),
              ],
            ),
          ),
          child: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: Column(
                children: [
                  const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF0891B2), Color(0xFF0EA5E9)],
                    ),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0x330EA5E9),
                        blurRadius: 26,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.local_shipping_rounded,
                    size: 60,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'تطبيق السائق',
                  style: GoogleFonts.cairo(
                    fontSize: 30,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF0F172A),
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'شركة ديما الحياة',
                  style: GoogleFonts.cairo(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: const Color(0xFF475569),
                  ),
                ),
                const SizedBox(height: 56),
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
            color: const Color(0x14000000),
            blurRadius: 18,
            offset: const Offset(0, 6),
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
          Container(
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF0284C7), Color(0xFF0EA5E9)],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: _loading ? null : _login,
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  alignment: Alignment.center,
                  child: _loading
                      ? const SizedBox(
                          height: 24,
                          width: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
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
          ),
        ],
      ),
    );
  }
}
