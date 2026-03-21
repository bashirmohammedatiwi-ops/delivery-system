import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../services/driver_api.dart';
import 'driver_login_screen.dart';
import 'driver_main_screen.dart';

class DriverApp extends StatefulWidget {
  const DriverApp({super.key});

  @override
  State<DriverApp> createState() => _DriverAppState();
}

class _DriverAppState extends State<DriverApp> {
  bool _checked = false;
  bool _loggedIn = false;

  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    await DriverApi.initToken();
    final driver = await DriverApi.getDriver();
    setState(() {
      _loggedIn = driver != null && driver['DriverID'] != null;
      _checked = true;
    });
  }

  void _onLoggedIn() => setState(() => _loggedIn = true);
  void _onLoggedOut() => setState(() => _loggedIn = false);

  @override
  Widget build(BuildContext context) {
    if (!_checked) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    return _loggedIn
        ? DriverMainScreen(onLogout: _onLoggedOut)
        : DriverLoginScreen(onLoggedIn: _onLoggedIn);
  }
}

String formatIQD(num? n) {
  return '${NumberFormat('#,##0', 'ar_IQ').format(n ?? 0)} د.ع';
}

String formatDateAr(String? d) {
  if (d == null) return '—';
  try {
    final dt = DateTime.tryParse('${d}T12:00:00');
    if (dt == null) return d;
    return DateFormat('EEEE، d MMMM yyyy', 'ar').format(dt);
  } catch (_) {
    return d;
  }
}
