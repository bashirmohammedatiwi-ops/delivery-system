import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../services/employee_api.dart';
import '../../../widgets/barcode_scanner_view.dart';
import '../employee_theme.dart';
import '../employee_ui_kit.dart';
import '../../../widgets/app_layout.dart';

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
  bool _verifying = false;
  bool _assigning = false;

  @override
  void dispose() {
    _driverCode.dispose();
    _scanInput.dispose();
    super.dispose();
  }

  Future<void> _verifyDriver() async {
    final code = _driverCode.text.trim();
    if (code.isEmpty) {
      setState(() {
        _message = 'أدخل الرمز';
        _isSuccess = false;
      });
      return;
    }
    setState(() {
      _message = null;
      _verifying = true;
    });
    try {
      final res = await EmployeeApi.verifyDriverPassword(code);
      final driver = res['driver'];
      if (driver != null && driver is Map<String, dynamic>) {
        setState(() {
          _currentDriver = driver;
          _message = 'تم التحقق · ${driver['DriverName'] ?? ''}';
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
    } finally {
      if (mounted) setState(() => _verifying = false);
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
    setState(() {
      _message = null;
      _assigning = true;
    });
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
    } finally {
      if (mounted) setState(() => _assigning = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasDriver = _currentDriver != null;

    return SingleChildScrollView(
      padding: AppLayout.scrollPadding(context),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          EmployeeUiKit.workflowStep(
            step: 1,
            title: 'تحديد السائق',
            subtitle: 'أدخل الرمز السري للسائق',
            active: !hasDriver,
            done: hasDriver,
            accent: EmployeeTheme.secondary,
            child: hasDriver
                ? Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: EmployeeTheme.secondary.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(EmployeeTheme.radiusMd),
                      border: Border.all(color: EmployeeTheme.secondary.withValues(alpha: 0.22)),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: EmployeeTheme.secondary,
                          child: Text(
                            (_currentDriver!['DriverName']?.toString() ?? '?').substring(0, 1),
                            style: GoogleFonts.cairo(fontWeight: FontWeight.w800, color: Colors.white),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(_currentDriver!['DriverName'] ?? '', style: EmployeeTheme.titleSmall),
                              Text('جاهز لاستلام الشحنات', style: EmployeeTheme.bodyMedium.copyWith(fontSize: 12)),
                            ],
                          ),
                        ),
                        TextButton(
                          onPressed: () => setState(() {
                            _currentDriver = null;
                            _message = null;
                          }),
                          child: const Text('تغيير'),
                        ),
                      ],
                    ),
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TextField(
                        controller: _driverCode,
                        decoration: EmployeeTheme.inputDecoration(
                          label: 'الرمز السري للسائق',
                          hint: 'أدخل الرمز',
                          prefixIcon: const Icon(Icons.key_rounded, size: 22),
                        ),
                        obscureText: true,
                        onSubmitted: (_) => _verifyDriver(),
                      ),
                      const SizedBox(height: 14),
                      FilledButton(
                        onPressed: _verifying ? null : _verifyDriver,
                        style: FilledButton.styleFrom(backgroundColor: EmployeeTheme.secondary),
                        child: _verifying
                            ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Text('التحقق من السائق'),
                      ),
                    ],
                  ),
          ),
          EmployeeUiKit.workflowStep(
            step: 2,
            title: 'مسح الشحنة',
            subtitle: 'باركود أو إدخال يدوي',
            active: hasDriver,
            done: false,
            accent: EmployeeTheme.primary,
            child: !hasDriver
                ? EmployeeUiKit.infoBanner(
                    message: 'أكمل الخطوة الأولى لتحديد السائق',
                    color: EmployeeTheme.onSurfaceVariant,
                    icon: Icons.info_outline_rounded,
                  )
                : _scanning
                    ? Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(EmployeeTheme.radiusMd),
                            child: BarcodeScannerView(
                              height: 280,
                              primaryColor: EmployeeTheme.primary,
                              instructionText: 'وجّه الكاميرا نحو باركود الشحنة',
                              onDetect: (capture) {
                                final codes = capture.barcodes;
                                if (codes == null) return;
                                for (final b in codes) {
                                  if (b.rawValue != null && b.rawValue!.isNotEmpty) {
                                    setState(() => _scanning = false);
                                    _assign(b.rawValue);
                                    return;
                                  }
                                }
                              },
                              onClose: () => setState(() => _scanning = false),
                            ),
                          ),
                          const SizedBox(height: 12),
                          OutlinedButton.icon(
                            onPressed: () => setState(() => _scanning = false),
                            icon: const Icon(Icons.stop_rounded),
                            label: const Text('إيقاف المسح'),
                          ),
                        ],
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          FilledButton.icon(
                            onPressed: () => setState(() => _scanning = true),
                            icon: const Icon(Icons.qr_code_scanner_rounded, size: 24),
                            label: const Text('مسح الباركود بالكاميرا'),
                            style: FilledButton.styleFrom(
                              backgroundColor: EmployeeTheme.primary,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(EmployeeTheme.radiusMd)),
                            ),
                          ),
                          const SizedBox(height: 20),
                          Row(
                            children: [
                              Expanded(child: Divider(color: EmployeeTheme.outline)),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 12),
                                child: Text('أو يدوياً', style: EmployeeTheme.bodyMedium.copyWith(fontSize: 12)),
                              ),
                              Expanded(child: Divider(color: EmployeeTheme.outline)),
                            ],
                          ),
                          const SizedBox(height: 16),
                          TextField(
                            controller: _scanInput,
                            decoration: EmployeeTheme.inputDecoration(
                              label: 'رقم الشحنة',
                              hint: 'امسح أو اكتب',
                              prefixIcon: const Icon(Icons.numbers_rounded, size: 22),
                            ),
                            keyboardType: TextInputType.number,
                            onSubmitted: (_) => _assign(null),
                          ),
                          const SizedBox(height: 14),
                          FilledButton(
                            onPressed: _assigning ? null : () => _assign(null),
                            child: _assigning
                                ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : const Text('تعيين للسائق'),
                          ),
                        ],
                      ),
          ),
          if (_message != null) ...[
            const SizedBox(height: 4),
            EmployeeUiKit.infoBanner(
              message: _message!,
              color: _isSuccess ? EmployeeTheme.success : EmployeeTheme.danger,
              icon: _isSuccess ? Icons.check_circle_rounded : Icons.error_outline_rounded,
            ),
          ],
        ],
      ),
    );
  }
}
