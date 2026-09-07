import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../services/driver_api.dart';
import '../../../widgets/barcode_scanner_view.dart';
import '../driver_theme.dart';
import '../driver_ui_kit.dart';

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
  bool _submitting = false;

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
    setState(() {
      _message = null;
      _submitting = true;
    });
    try {
      HapticFeedback.mediumImpact();
      final result = await DriverApi.receiveOrder(n);
      setState(() {
        _message = 'تم استلام الطلب #$n بنجاح';
        _isSuccess = true;
        _controller.clear();
        _submitting = false;
      });
      widget.onReceived?.call();
      final order = result['order'];
      if (order is Map<String, dynamic> && mounted) {
        Future.delayed(const Duration(milliseconds: 600), () {
          if (mounted) widget.onShowOrderDetail?.call(order);
        });
      }
    } catch (e) {
      setState(() {
        _message = e.toString().replaceFirst('Exception: ', '');
        _isSuccess = false;
        _submitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [DriverTheme.secondary.withValues(alpha: 0.14), DriverTheme.primary.withValues(alpha: 0.06)],
              ),
              borderRadius: BorderRadius.circular(DriverTheme.radiusLg),
              border: Border.all(color: DriverTheme.secondary.withValues(alpha: 0.2)),
            ),
            child: Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: DriverTheme.secondary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(Icons.qr_code_scanner_rounded, color: DriverTheme.secondary, size: 28),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('استلام شحنة', style: DriverTheme.titleSmall),
                      Text('امسح الباركود أو أدخل الرقم يدوياً', style: DriverTheme.bodyMedium.copyWith(fontSize: 12)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          if (_scanning) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(DriverTheme.radiusMd),
              child: BarcodeScannerView(
                height: 280,
                primaryColor: DriverTheme.primary,
                instructionText: 'وجّه الكاميرا نحو باركود الشحنة',
                onDetect: (capture) {
                  final codes = capture.barcodes;
                  for (final b in codes) {
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
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () => setState(() => _scanning = false),
              icon: const Icon(Icons.stop_rounded),
              label: const Text('إيقاف المسح'),
            ),
          ] else ...[
            SizedBox(
              height: 56,
              child: FilledButton.icon(
                onPressed: () => setState(() => _scanning = true),
                icon: const Icon(Icons.qr_code_scanner_rounded, size: 26),
                label: const Text('مسح الباركود بالكاميرا'),
                style: FilledButton.styleFrom(
                  backgroundColor: DriverTheme.primary,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(DriverTheme.radiusMd)),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(child: Divider(color: DriverTheme.outline)),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Text('أو يدوياً', style: DriverTheme.bodyMedium.copyWith(fontSize: 12)),
                ),
                Expanded(child: Divider(color: DriverTheme.outline)),
              ],
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _controller,
              decoration: DriverTheme.inputDecoration(
                label: 'رقم الشحنة',
                hint: '123456',
                prefixIcon: const Icon(Icons.numbers_rounded, size: 22),
              ),
              keyboardType: TextInputType.number,
              textAlign: TextAlign.center,
              style: GoogleFonts.roboto(fontSize: 22, fontWeight: FontWeight.w700, color: DriverTheme.primary),
              onSubmitted: _receive,
            ),
            const SizedBox(height: 14),
            SizedBox(
              height: 52,
              child: FilledButton(
                onPressed: _submitting ? null : () => _receive(_controller.text),
                child: _submitting
                    ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('استلام الطلب'),
              ),
            ),
          ],
          if (_message != null) ...[
            const SizedBox(height: 16),
            DriverUiKit.infoBanner(
              message: _message!,
              color: _isSuccess ? DriverTheme.success : DriverTheme.danger,
              icon: _isSuccess ? Icons.check_circle_rounded : Icons.error_outline_rounded,
            ),
          ],
        ],
      ),
    );
  }
}
