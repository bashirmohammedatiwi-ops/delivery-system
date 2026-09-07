import 'package:flutter/material.dart';

/// هيكل تحميل نابض — بدون حزم إضافية
class PulseSkeleton extends StatefulWidget {
  final Widget child;

  const PulseSkeleton({super.key, required this.child});

  @override
  State<PulseSkeleton> createState() => _PulseSkeletonState();
}

class _PulseSkeletonState extends State<PulseSkeleton> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 950))..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Opacity(opacity: 0.45 + (_controller.value * 0.4), child: child);
      },
      child: widget.child,
    );
  }
}

class SkeletonLine extends StatelessWidget {
  final double height;
  final double? width;
  final BorderRadius? radius;
  final Color color;

  const SkeletonLine({
    super.key,
    this.height = 12,
    this.width,
    this.radius,
    this.color = const Color(0xFFE2E8F0),
  });

  @override
  Widget build(BuildContext context) {
    return PulseSkeleton(
      child: Container(
        height: height,
        width: width,
        decoration: BoxDecoration(
          color: color,
          borderRadius: radius ?? BorderRadius.circular(8),
        ),
      ),
    );
  }
}
