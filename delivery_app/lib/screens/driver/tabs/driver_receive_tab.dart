import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../services/driver_api.dart';
import '../../../widgets/barcode_scanner_view.dart';
import '../driver_theme.dart';

class DriverReceiveTab extends StatefulWidget {
  final VoidCallback? onReceived;
  final void Function(Map<String, dynamic>)? onShowOrderDetail;

  const DriverReceiveTab({super.key, this.onReceived, this.onShowOrderDetail});

  @override
  State<DriverReceiveTab> createState() => _DriverReceiveTabState();
}

class _DriverReceiveTabState extends State<DriverReceiveTab> {
  final _controller = TextEditingController();
  String? _message;
  bool _isSuccess = false;
  bool _scanning = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _receive(String num) async {
    final n = num.replaceAll(RegExp(r'\D'), '').trim();
    if (n.isEmpty) {
      setState(() {
        _message = 'أدخل رقم الشحنة';
        _isSuccess = false;
      });
      return;
    }
    setState(() => _message = null);
    try {
      final result = await DriverApi.receiveOrder(n);
      setState(() {
        _message = 'تم استلام الطلب #$n بنجاح';
        _isSuccess = true;
        _controller.clear();
      });
      widget.onReceived?.call();
      final order = result['order'];
      if (order != null && order is Map<String, dynamic> && mounted) {
        Future.delayed(const Duration(milliseconds: 800), () {
          if (mounted) widget.onShowOrderDetail?.call(order as Map<String, dynamic>);
        });
      }
    } catch (e) {
      setState(() {
        _message = e.toString().replaceFirst('Exception: ', '');
        _isSuccess = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          if (_scanning) ...[
            Expanded(
              child: BarcodeScannerView(
                primaryColor: DriverTheme.primary,
                instructionText: 'وجّه الكاميرا نحو الباركود',
                onDetect: (capture) {
                  for (final b in capture.barcodes) {
                    if (b.rawValue != null && b.rawValue!.isNotEmpty) {
                      setState(() => _scanning = false);
                      _receive(b.rawValue!);
                      return;
                    }
                  }
                },
                onClose: () => setState(() => _scanning = false),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () => setState(() => _scanning = false),
                icon: const Icon(Icons.stop_rounded),
                label: const Text('إيقاف المسح'),
                style: FilledButton.styleFrom(
                  backgroundColor: DriverTheme.danger,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ),
          ] else ...[
            Container(
              padding: const EdgeInsets.all(28),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    DriverTheme.primary.withValues(alpha: 0.1),
                    DriverTheme.primary.withValues(alpha: 0.05),
                  ],
                ),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: DriverTheme.primary.withValues(alpha: 0.2)),
              ),
              child: Column(
                children: [
                  Icon(Icons.qr_code_scanner_rounded, size: 72, color: DriverTheme.primary.withValues(alpha: 0.8)),
                  const SizedBox(height: 16),
                  Text(
                    'مسح الباركود',
                    style: GoogleFonts.cairo(fontSize: 20, fontWeight: FontWeight.w800, color: DriverTheme.onSurface),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'اضغط لتفعيل الكاميرا ومسح رقم الشحنة',
                    style: GoogleFonts.cairo(fontSize: 14, color: DriverTheme.onSurfaceVariant),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),
            FilledButton.icon(
              onPressed: () => setState(() => _scanning = true),
              icon: const Icon(Icons.qr_code_scanner_rounded, size: 26),
              label: const Text('تفعيل مسح الباركود'),
              style: FilledButton.styleFrom(
                backgroundColor: DriverTheme.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 18),
                minimumSize: const Size(double.infinity, 56),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 2,
                shadowColor: DriverTheme.primary.withValues(alpha: 0.4),
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(child: Divider(color: DriverTheme.outline, thickness: 1)),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Text('أو أدخل يدوياً', style: GoogleFonts.cairo(fontSize: 14, color: DriverTheme.onSurfaceVariant)),
                ),
                Expanded(child: Divider(color: DriverTheme.outline, thickness: 1)),
              ],
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _controller,
              decoration: DriverTheme.inputDecoration(label: 'رقم الشحنة', hint: 'أدخل رقم الشحنة'),
              keyboardType: TextInputType.number,
              textAlign: TextAlign.center,
              style: GoogleFonts.cairo(fontSize: 20, fontWeight: FontWeight.w700),
              onSubmitted: _receive,
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () => _receive(_controller.text),
                style: FilledButton.styleFrom(
                  backgroundColor: DriverTheme.primary,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: const Text('استلام الطلب'),
              ),
            ),
          ],
          if (_message != null) ...[
            const SizedBox(height: 24),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: _isSuccess ? DriverTheme.success.withValues(alpha: 0.12) : DriverTheme.danger.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: _isSuccess ? DriverTheme.success.withValues(alpha: 0.3) : DriverTheme.danger.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  Icon(_isSuccess ? Icons.check_circle_rounded : Icons.error_outline_rounded, color: _isSuccess ? DriverTheme.success : DriverTheme.danger, size: 24),
                  const SizedBox(width: 14),
                  Expanded(child: Text(_message!, style: GoogleFonts.cairo(fontWeight: FontWeight.w600, color: _isSuccess ? DriverTheme.success : DriverTheme.danger))),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
