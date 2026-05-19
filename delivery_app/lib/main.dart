import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'screens/entry_screen.dart';
import 'screens/driver/driver_app.dart';
import 'screens/employee/employee_app.dart';
import 'screens/privacy_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('ar', null);
  await initializeDateFormatting('ar_IQ', null);
  // Edge-to-edge: allow app background to extend behind system bars.
  // Individual screens should still use SafeArea for tappable content.
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    systemNavigationBarColor: Colors.transparent,
  ));
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);
  runApp(const DeliveryApp());
}

class DeliveryApp extends StatelessWidget {
  const DeliveryApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ديما الحياة - نظام التوصيل',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF7C3AED)),
        useMaterial3: true,
        fontFamily: 'Cairo',
      ),
      home: const EntryScreen(),
      routes: {
        '/driver': (ctx) => const DriverApp(),
        '/employee': (ctx) => const EmployeeApp(),
        '/privacy': (ctx) => const PrivacyScreen(),
      },
    );
  }
}
