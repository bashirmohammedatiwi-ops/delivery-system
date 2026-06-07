import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../services/employee_api.dart';
import '../../../widgets/barcode_scanner_view.dart';
import '../employee_theme.dart';

class EmpReceiveTab extends StatefulWidget {
  const EmpReceiveTab({super.key});

  @override
  State<EmpReceiveTab> createState() => _EmpReceiveTabState();
}

class _EmpReceiveTabState extends State<EmpReceiveTab> {
  final _driverCode = TextEditingController();
  final _scanInput = TextEditingController();
  Map<String, dynamic>? _currentDriver;
  String? _message;
  bool _isSuccess = false;
  bool _scanning = false;

  @override
  void dispose() {
    _driverCode.dispose();
    _scanInput.dispose();
    super.dispose();
  }

  Future<void> _verifyDriver() async {
    final code = (_driverCode.text).trim();
    if (code.isEmpty) {
      setState(() {
        _message = 'أدخل الرمز';
        _isSuccess = false;
      });
      return;
    }
    setState(() => _message = null);
    try {
      final res = await EmployeeApi.verifyDriverPassword(code);
      final driver = res['driver'];
      if (driver != null && driver is Map<String, dynamic>) {
        setState(() {
          _currentDriver = driver;
          _message = 'السائق: ${driver['DriverName'] ?? ''}';
          _isSuccess = true;
          _driverCode.clear();
        });
      } else {
        setState(() {
          _message = 'رمز غير صحيح';
          _isSuccess = false;
        });
      }
    } catch (e) {
      setState(() {
        _message = e.toString().replaceFirst('Exception: ', '');
        _isSuccess = false;
      });
    }
  }

  Future<void> _assign(String? scannedValue) async {
    final num = (scannedValue ?? _scanInput.text).replaceAll(RegExp(r'\D'), '').trim();
    if (num.isEmpty) {
      setState(() {
        _message = 'أدخل رقم الشحنة';
        _isSuccess = false;
      });
      return;
    }
    if (_currentDriver == null) {
      setState(() {
        _message = 'أدخل الرمز السري أولاً';
        _isSuccess = false;
      });
      return;
    }
    setState(() => _message = null);
    try {
      await EmployeeApi.assignOrder(num, (_currentDriver!['DriverID'] ?? 0) as int);
      setState(() {
        _message = 'تم تعيين #$num لـ ${_currentDriver!['DriverName'] ?? ''}';
        _isSuccess = true;
        _scanInput.clear();
      });
    } catch (e) {
      setState(() {
        _message = e.toString().replaceFirst('Exception: ', '');
        _isSuccess = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_currentDriver == null) ...[
            TextField(
              controller: _driverCode,
              decoration: EmployeeTheme.inputDecoration(label: 'الرمز السري للسائق', hint: 'أدخل الرمز واضغط Enter'),
              obscureText: true,
              onSubmitted: (_) => _verifyDriver(),
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _verifyDriver,
              style: FilledButton.styleFrom(
                backgroundColor: EmployeeTheme.primary,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: const Text('التحقق من السائق'),
            ),
          ] else ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: EmployeeTheme.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: EmployeeTheme.primary.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  Icon(Icons.person_rounded, color: EmployeeTheme.primary, size: 28),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      _currentDriver!['DriverName'] ?? '',
                      style: GoogleFonts.cairo(fontSize: 16, fontWeight: FontWeight.w700, color: EmployeeTheme.onSurface),
                    ),
                  ),
                  TextButton(
                    onPressed: () {
                      setState(() => _currentDriver = null);
                      _message = null;
                    },
                    child: const Text('سائق آخر'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            if (_scanning) ...[
              BarcodeScannerView(
                height: 280,
                primaryColor: EmployeeTheme.primary,
                instructionText: 'وجّه الكاميرا نحو باركود الشحنة',
                onDetect: (capture) {
                  for (final b in capture.barcodes) {
                    if (b.rawValue != null && b.rawValue!.isNotEmpty) {
                      setState(() => _scanning = false);
                      _assign(b.rawValue);
                      return;
                    }
                  }
                },
                onClose: () => setState(() => _scanning = false),
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: () => setState(() => _scanning = false),
                icon: const Icon(Icons.stop_rounded),
                label: const Text('إيقاف المسح'),
                style: FilledButton.styleFrom(
                  backgroundColor: EmployeeTheme.danger,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ] else ...[
              FilledButton.icon(
                onPressed: () => setState(() => _scanning = true),
                icon: const Icon(Icons.qr_code_scanner_rounded, size: 26),
                label: const Text('مسح الباركود بالكاميرا'),
                style: FilledButton.styleFrom(
                  backgroundColor: EmployeeTheme.primary,
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  minimumSize: const Size(double.infinity, 56),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(child: Divider(color: EmployeeTheme.outline)),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text('أو أدخل يدوياً', style: GoogleFonts.cairo(fontSize: 14, color: EmployeeTheme.onSurfaceVariant)),
                  ),
                  Expanded(child: Divider(color: EmployeeTheme.outline)),
                ],
              ),
              const SizedBox(height: 20),
              TextField(
                controller: _scanInput,
                decoration: EmployeeTheme.inputDecoration(label: 'رقم الشحنة', hint: 'امسح أو اكتب ثم Enter'),
                keyboardType: TextInputType.number,
                onSubmitted: (_) => _assign(null),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () => _assign(null),
                style: FilledButton.styleFrom(
                  backgroundColor: EmployeeTheme.primary,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: const Text('تعيين للسائق'),
              ),
            ],
          ],
          if (_message != null) ...[
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: _isSuccess ? EmployeeTheme.success.withValues(alpha: 0.12) : EmployeeTheme.danger.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: _isSuccess ? EmployeeTheme.success.withValues(alpha: 0.3) : EmployeeTheme.danger.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  Icon(_isSuccess ? Icons.check_circle_rounded : Icons.error_outline_rounded, color: _isSuccess ? EmployeeTheme.success : EmployeeTheme.danger, size: 24),
                  const SizedBox(width: 14),
                  Expanded(child: Text(_message!, style: GoogleFonts.cairo(fontWeight: FontWeight.w600, color: _isSuccess ? EmployeeTheme.success : EmployeeTheme.danger))),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
