import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

class EntryScreen extends StatefulWidget {
  const EntryScreen({super.key});

  @override
  State<EntryScreen> createState() => _EntryScreenState();
}

class _EntryScreenState extends State<EntryScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fade;
  late Animation<Offset> _slide;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 700));
    _fade = CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic);
    _slide = Tween<Offset>(begin: const Offset(0, 0.06), end: Offset.zero).animate(_fade);
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0xFFEEF2FF), Color(0xFFF8FAFC), Color(0xFFECFDF5)],
              ),
            ),
          ),
          Positioned(top: -60, right: -40, child: _blob(200, const Color(0x336366F1))),
          Positioned(bottom: 80, left: -50, child: _blob(160, const Color(0x220D9488))),
          SafeArea(
            child: Directionality(
              textDirection: TextDirection.rtl,
              child: FadeTransition(
                opacity: _fade,
                child: SlideTransition(
                  position: _slide,
                  child: Padding(
                    padding: const EdgeInsets.all(22),
                    child: SingleChildScrollView(
                      child: ConstrainedBox(
                        constraints: BoxConstraints(
                          minHeight: MediaQuery.of(context).size.height -
                              MediaQuery.of(context).padding.top -
                              MediaQuery.of(context).padding.bottom -
                              44,
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              width: 104,
                              height: 104,
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [Color(0xFF6366F1), Color(0xFF4F46E5), Color(0xFF0D9488)],
                                ),
                                borderRadius: BorderRadius.circular(30),
                                boxShadow: const [
                                  BoxShadow(color: Color(0x406366F1), blurRadius: 24, offset: Offset(0, 10)),
                                ],
                                border: Border.all(color: Colors.white, width: 3),
                              ),
                              child: const Icon(Icons.local_shipping_rounded, size: 52, color: Colors.white),
                            ),
                            const SizedBox(height: 20),
                            Text(
                              'ديما الحياة',
                              style: GoogleFonts.cairo(fontSize: 32, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A)),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'نظام إدارة التوصيل',
                              style: GoogleFonts.cairo(fontSize: 15, color: const Color(0xFF64748B)),
                            ),
                            const SizedBox(height: 10),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Text(
                                'اختر نوع التطبيق',
                                style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF64748B)),
                              ),
                            ),
                            const SizedBox(height: 28),
                            _ChoiceCard(
                              icon: Icons.local_shipping_rounded,
                              title: 'تطبيق السائق',
                              subtitle: 'طلباتي · استلام · إحصائيات · السجل',
                              features: const ['توصيل', 'مسح باركود', 'تقارير يومية'],
                              onTap: () {
                                HapticFeedback.lightImpact();
                                Navigator.pushNamed(context, '/driver');
                              },
                              accent: const Color(0xFF0D9488),
                            ),
                            const SizedBox(height: 14),
                            _ChoiceCard(
                              icon: Icons.badge_rounded,
                              title: 'تطبيق الموظف',
                              subtitle: 'طلب جديد · استلام · الطلبات',
                              features: const ['إنشاء طلب', 'تعيين سائق', 'طباعة ملصق'],
                              onTap: () {
                                HapticFeedback.lightImpact();
                                Navigator.pushNamed(context, '/employee');
                              },
                              accent: const Color(0xFF6366F1),
                            ),
                            const SizedBox(height: 28),
                            InkWell(
                              onTap: () => Navigator.pushNamed(context, '/privacy'),
                              borderRadius: BorderRadius.circular(12),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.privacy_tip_outlined, size: 18, color: Color(0xFF6366F1)),
                                    const SizedBox(width: 8),
                                    Text(
                                      'سياسة الخصوصية',
                                      style: GoogleFonts.cairo(
                                        color: const Color(0xFF475569),
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'شركة ديما الحياة · v2',
                              style: GoogleFonts.cairo(color: const Color(0xFF94A3B8), fontSize: 12),
                            ),
                          ],
                        ),
                      ),
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

  static Widget _blob(double size, Color color) {
    return Container(width: size, height: size, decoration: BoxDecoration(shape: BoxShape.circle, color: color));
  }
}

class _ChoiceCard extends StatefulWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final List<String> features;
  final VoidCallback onTap;
  final Color accent;

  const _ChoiceCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.features,
    required this.onTap,
    required this.accent,
  });

  @override
  State<_ChoiceCard> createState() => _ChoiceCardState();
}

class _ChoiceCardState extends State<_ChoiceCard> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) => setState(() => _pressed = false),
      onTapCancel: () => setState(() => _pressed = false),
      onTap: widget.onTap,
      child: AnimatedScale(
        scale: _pressed ? 0.98 : 1,
        duration: const Duration(milliseconds: 120),
        child: Material(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          child: Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: widget.accent.withValues(alpha: 0.2), width: _pressed ? 2 : 1),
              boxShadow: [
                BoxShadow(
                  color: widget.accent.withValues(alpha: _pressed ? 0.18 : 0.08),
                  blurRadius: _pressed ? 20 : 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(colors: [widget.accent, widget.accent.withValues(alpha: 0.75)]),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Icon(widget.icon, size: 28, color: Colors.white),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.title,
                            style: GoogleFonts.cairo(fontSize: 18, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A)),
                          ),
                          const SizedBox(height: 4),
                          Text(widget.subtitle, style: GoogleFonts.cairo(fontSize: 13, color: const Color(0xFF64748B))),
                        ],
                      ),
                    ),
                    Icon(Icons.chevron_left_rounded, color: widget.accent, size: 24),
                  ],
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: widget.features
                      .map(
                        (f) => Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: widget.accent.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            f,
                            style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.w700, color: widget.accent),
                          ),
                        ),
                      )
                      .toList(),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
