import 'package:flutter/material.dart';
import '../../services/employee_api.dart';
import 'employee_login_screen.dart';
import 'employee_main_screen.dart';

class EmployeeApp extends StatefulWidget {
  const EmployeeApp({super.key});

  @override
  State<EmployeeApp> createState() => _EmployeeAppState();
}

class _EmployeeAppState extends State<EmployeeApp> {
  bool _checked = false;
  bool _loggedIn = false;

  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    await EmployeeApi.initToken();
    try {
      await EmployeeApi.me();
      setState(() {
        _loggedIn = true;
        _checked = true;
      });
    } catch (_) {
      setState(() {
        _loggedIn = false;
        _checked = true;
      });
    }
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
        ? EmployeeMainScreen(onLogout: _onLoggedOut)
        : EmployeeLoginScreen(onLoggedIn: _onLoggedIn);
  }
}
