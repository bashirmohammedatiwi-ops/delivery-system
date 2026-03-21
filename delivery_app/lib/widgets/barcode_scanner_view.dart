import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

/// عرض مخصص لمسح الباركود مع إطار مسح، زر المصباح، وخط مسح متحرك
class BarcodeScannerView extends StatefulWidget {
  final void Function(BarcodeCapture capture) onDetect;
  final VoidCallback? onClose;
  final Color primaryColor;
  final String instructionText;
  final double? height;
  final bool showTorchButton;

  const BarcodeScannerView({
    super.key,
    required this.onDetect,
    this.onClose,
    this.primaryColor = const Color(0xFF0D9488),
    this.instructionText = 'وجّه الكاميرا نحو الباركود',
    this.height,
    this.showTorchButton = true,
  });

  @override
  State<BarcodeScannerView> createState() => _BarcodeScannerViewState();
}

class _BarcodeScannerViewState extends State<BarcodeScannerView>
    with SingleTickerProviderStateMixin {
  late MobileScannerController _controller;
  late AnimationController _scanLineController;

  @override
  void initState() {
    super.initState();
    _controller = MobileScannerController(
      detectionSpeed: DetectionSpeed.normal,
      facing: CameraFacing.back,
      torchEnabled: false,
    );
    _scanLineController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat();
  }

  @override
  void dispose() {
    _scanLineController.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _handleDetect(BarcodeCapture capture) {
    for (final b in capture.barcodes) {
      if (b.rawValue != null && b.rawValue!.isNotEmpty) {
        widget.onDetect(capture);
        return;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: SizedBox(
        height: widget.height,
        child: Stack(
          fit: StackFit.expand,
          children: [
            MobileScanner(
              controller: _controller,
              onDetect: _handleDetect,
              errorBuilder: (ctx, err, _) => _ErrorView(
                error: err,
                primaryColor: widget.primaryColor,
                onRetry: () => _controller.start(),
              ),
              overlayBuilder: (ctx, constraints) => AnimatedBuilder(
                animation: _scanLineController,
                builder: (context, child) => _ScanOverlay(
                  constraints: constraints,
                  primaryColor: widget.primaryColor,
                  instructionText: widget.instructionText,
                  scanProgress: _scanLineController.value,
                ),
              ),
            ),
            Positioned(
              top: MediaQuery.of(context).padding.top + 12,
              left: 0,
              right: 0,
              child: SafeArea(
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.6),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: widget.primaryColor.withValues(alpha: 0.5),
                      width: 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.qr_code_scanner_rounded,
                        color: widget.primaryColor,
                        size: 24,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          widget.instructionText,
                          style: GoogleFonts.cairo(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                            fontSize: 15,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            if (widget.showTorchButton)
              Positioned(
                bottom: 24,
                left: 0,
                right: 0,
                child: Center(
                  child: ValueListenableBuilder<MobileScannerState>(
                    valueListenable: _controller,
                    builder: (context, state, child) {
                      final torchAvailable = state.torchState == TorchState.off ||
                          state.torchState == TorchState.on;
                      return Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (torchAvailable)
                            Material(
                              color: Colors.transparent,
                              child: InkWell(
                                onTap: () => _controller.toggleTorch(),
                                borderRadius: BorderRadius.circular(50),
                                child: Container(
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                    color: Colors.black.withValues(alpha: 0.6),
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: widget.primaryColor.withValues(alpha: 0.5),
                                    ),
                                  ),
                                  child: Icon(
                                    state.torchState == TorchState.on
                                        ? Icons.flash_on_rounded
                                        : Icons.flash_off_rounded,
                                    color: Colors.white,
                                    size: 28,
                                  ),
                                ),
                              ),
                            ),
                          if (widget.onClose != null) ...[
                            if (torchAvailable) const SizedBox(width: 20),
                            Material(
                              color: Colors.transparent,
                              child: InkWell(
                                onTap: widget.onClose,
                                borderRadius: BorderRadius.circular(50),
                                child: Container(
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                    color: Colors.black.withValues(alpha: 0.6),
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: Colors.red.withValues(alpha: 0.7),
                                    ),
                                  ),
                                  child: const Icon(
                                    Icons.close_rounded,
                                    color: Colors.white,
                                    size: 28,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ],
                      );
                    },
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _ScanOverlay extends StatelessWidget {
  final BoxConstraints constraints;
  final Color primaryColor;
  final String instructionText;
  final double scanProgress;

  const _ScanOverlay({
    required this.constraints,
    required this.primaryColor,
    required this.instructionText,
    required this.scanProgress,
  });

  @override
  Widget build(BuildContext context) {
    final scanWidth = constraints.maxWidth * 0.8;
    final scanHeight = 160.0;
    final left = (constraints.maxWidth - scanWidth) / 2;
    final top = (constraints.maxHeight - scanHeight) / 2 - 20;
    final scanRect = Rect.fromLTWH(left, top, scanWidth, scanHeight);

    return Stack(
      children: [
        CustomPaint(
          painter: _ScanOverlayPainter(
            scanRect: scanRect,
            primaryColor: primaryColor,
            scanProgress: scanProgress,
          ),
          size: Size(constraints.maxWidth, constraints.maxHeight),
        ),
      ],
    );
  }
}

class _ScanOverlayPainter extends CustomPainter {
  final Rect scanRect;
  final Color primaryColor;
  final double scanProgress;

  _ScanOverlayPainter({
    required this.scanRect,
    required this.primaryColor,
    required this.scanProgress,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final cornerLength = 28.0;
    final cornerWidth = 4.0;
    final overlayPaint = Paint()
      ..color = Colors.black.withValues(alpha: 0.5)
      ..style = PaintingStyle.fill;

    final path = Path()
      ..addRect(Rect.fromLTWH(0, 0, size.width, size.height));
    final holePath = Path()
      ..addRRect(RRect.fromRectAndRadius(scanRect, const Radius.circular(20)));
    final overlayPath = Path.combine(PathOperation.difference, path, holePath);
    canvas.drawPath(overlayPath, overlayPaint);

    final borderPaint = Paint()
      ..color = primaryColor.withValues(alpha: 0.9)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3;

    final rrect = RRect.fromRectAndRadius(scanRect, const Radius.circular(20));
    canvas.drawRRect(rrect, borderPaint);

    _drawCorner(canvas, scanRect.topLeft, cornerLength, cornerWidth, 0, primaryColor);
    _drawCorner(canvas, scanRect.topRight, cornerLength, cornerWidth, 1, primaryColor);
    _drawCorner(canvas, scanRect.bottomRight, cornerLength, cornerWidth, 2, primaryColor);
    _drawCorner(canvas, scanRect.bottomLeft, cornerLength, cornerWidth, 3, primaryColor);

    final lineY = scanRect.top + (scanRect.height * scanProgress);
    if (lineY <= scanRect.bottom) {
      final linePaint = Paint()
        ..shader = LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [
            primaryColor.withValues(alpha: 0.3),
            primaryColor,
            primaryColor.withValues(alpha: 0.3),
          ],
        ).createShader(scanRect)
        ..strokeWidth = 3
        ..style = PaintingStyle.stroke;
      canvas.drawLine(
        Offset(scanRect.left + 12, lineY),
        Offset(scanRect.right - 12, lineY),
        linePaint,
      );
    }
  }

  void _drawCorner(Canvas canvas, Offset pos, double len, double w, int i, Color color) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = w
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    switch (i) {
      case 0:
        canvas.drawLine(pos, pos + Offset(len, 0), paint);
        canvas.drawLine(pos, pos + Offset(0, len), paint);
        break;
      case 1:
        canvas.drawLine(pos - Offset(len, 0), pos, paint);
        canvas.drawLine(pos, pos + Offset(0, len), paint);
        break;
      case 2:
        canvas.drawLine(pos - Offset(len, 0), pos, paint);
        canvas.drawLine(pos, pos - Offset(0, len), paint);
        break;
      case 3:
        canvas.drawLine(pos, pos + Offset(len, 0), paint);
        canvas.drawLine(pos, pos - Offset(0, len), paint);
        break;
    }
  }

  @override
  bool shouldRepaint(covariant _ScanOverlayPainter old) =>
      old.scanProgress != scanProgress;
}

class _ErrorView extends StatelessWidget {
  final MobileScannerException error;
  final Color primaryColor;
  final VoidCallback onRetry;

  const _ErrorView({
    required this.error,
    required this.primaryColor,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black87,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.error_outline_rounded, size: 64, color: primaryColor.withValues(alpha: 0.8)),
              const SizedBox(height: 20),
              Text(
                'فشل تشغيل الكاميرا',
                style: GoogleFonts.cairo(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                error.errorDetails?.message ?? error.errorCode.name,
                style: GoogleFonts.cairo(
                  fontSize: 14,
                  color: Colors.white70,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('إعادة المحاولة'),
                style: FilledButton.styleFrom(
                  backgroundColor: primaryColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
