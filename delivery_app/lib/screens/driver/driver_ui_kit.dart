import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../widgets/pulse_skeleton.dart';
import 'driver_theme.dart';

class DriverUiKit {
  DriverUiKit._();

  static Widget pageBackground({required Widget child, Color? accent}) {
    final c = accent ?? DriverTheme.primary;
    return Stack(
      fit: StackFit.expand,
      children: [
        Container(color: DriverTheme.surface),
        Positioned(top: -70, left: -50, child: _blob(210, c.withValues(alpha: 0.12))),
        Positioned(top: 140, right: -80, child: _blob(170, DriverTheme.secondary.withValues(alpha: 0.08))),
        child,
      ],
    );
  }

  static Widget _blob(double size, Color color) {
    return Container(width: size, height: size, decoration: BoxDecoration(shape: BoxShape.circle, color: color));
  }

  static Widget heroHeader({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color accent,
    String? badge,
  }) {
    return Builder(
      builder: (context) {
        final top = MediaQuery.of(context).padding.top;
        return Container(
          width: double.infinity,
          decoration: BoxDecoration(
            gradient: DriverTheme.gradientFor(accent),
            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(DriverTheme.radiusXl)),
            boxShadow: DriverTheme.shadowFor(accent),
          ),
          child: Padding(
            padding: EdgeInsets.fromLTRB(20, top + 10, 20, 20),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.28)),
                  ),
                  child: Icon(icon, color: Colors.white, size: 26),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: GoogleFonts.cairo(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white)),
                      const SizedBox(height: 4),
                      Text(subtitle, style: GoogleFonts.cairo(fontSize: 13, color: Colors.white.withValues(alpha: 0.88))),
                    ],
                  ),
                ),
                if (badge != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
                    ),
                    child: Text(badge, style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white)),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  static Widget statusChip(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.22)),
      ),
      child: Text(text, style: GoogleFonts.cairo(fontSize: 10, fontWeight: FontWeight.w800, color: color)),
    );
  }

  static Widget infoBanner({required String message, required Color color, IconData icon = Icons.info_outline_rounded}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(DriverTheme.radiusMd),
        border: Border.all(color: color.withValues(alpha: 0.22)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(width: 10),
          Expanded(child: Text(message, style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.w600, color: color, height: 1.35))),
        ],
      ),
    );
  }

  static Widget emptyState({
    required IconData icon,
    required String title,
    required String subtitle,
    Color? accent,
    Widget? action,
  }) {
    final c = accent ?? DriverTheme.primary;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(36),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: [c.withValues(alpha: 0.14), c.withValues(alpha: 0.04)]),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 42, color: c.withValues(alpha: 0.55)),
            ),
            const SizedBox(height: 20),
            Text(title, style: DriverTheme.titleMedium, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(subtitle, style: DriverTheme.bodyMedium, textAlign: TextAlign.center),
            if (action != null) ...[const SizedBox(height: 20), action],
          ],
        ),
      ),
    );
  }

  static Widget statTile({required String label, required String value, required IconData icon, required Color color}) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(DriverTheme.radiusMd),
          border: Border.all(color: DriverTheme.outline),
          boxShadow: [BoxShadow(color: color.withValues(alpha: 0.06), blurRadius: 12, offset: const Offset(0, 4))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(height: 8),
            Text(value, style: GoogleFonts.cairo(fontSize: 18, fontWeight: FontWeight.w800, color: DriverTheme.onSurface)),
            Text(label, style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.w600, color: DriverTheme.onSurfaceVariant)),
          ],
        ),
      ),
    );
  }

  static Widget skeletonCard({double height = 132, Color accent = DriverTheme.primary}) {
    return PulseSkeleton(
      child: Container(
        height: height,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(DriverTheme.radiusLg),
          border: Border.all(color: DriverTheme.outline),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(DriverTheme.radiusLg),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(width: 5, color: accent.withValues(alpha: 0.35)),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SkeletonLine(height: 14, width: 120),
                      const SizedBox(height: 12),
                      const SkeletonLine(height: 12),
                      const SizedBox(height: 8),
                      SkeletonLine(height: 12, width: 180),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static Widget skeletonList({int count = 5, double cardHeight = 132}) {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      itemCount: count,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (_, i) => skeletonCard(height: cardHeight),
    );
  }

  static Widget dateNavigator({
    required String label,
    required VoidCallback onPrev,
    required VoidCallback? onNext,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(DriverTheme.radiusMd),
        border: Border.all(color: DriverTheme.outline),
        boxShadow: DriverTheme.cardShadow,
      ),
      child: Row(
        children: [
          IconButton.filled(
            onPressed: onPrev,
            icon: const Icon(Icons.chevron_right_rounded),
            style: IconButton.styleFrom(
              backgroundColor: DriverTheme.primary.withValues(alpha: 0.12),
              foregroundColor: DriverTheme.primary,
            ),
          ),
          Expanded(
            child: Text(label, textAlign: TextAlign.center, style: GoogleFonts.cairo(fontSize: 15, fontWeight: FontWeight.w800)),
          ),
          IconButton.filled(
            onPressed: onNext,
            icon: const Icon(Icons.chevron_left_rounded),
            style: IconButton.styleFrom(
              backgroundColor: DriverTheme.primary.withValues(alpha: 0.12),
              foregroundColor: DriverTheme.primary,
            ),
          ),
        ],
      ),
    );
  }

  static Widget segmentPills<T>({
    required List<(T value, String label, IconData icon)> options,
    required T selected,
    required ValueChanged<T> onChanged,
    required Color accent,
  }) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(DriverTheme.radiusMd),
        border: Border.all(color: DriverTheme.outline),
      ),
      child: Row(
        children: options.map((opt) {
          final isSelected = opt.$1 == selected;
          return Expanded(
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () => onChanged(opt.$1),
                borderRadius: BorderRadius.circular(12),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: isSelected ? accent.withValues(alpha: 0.12) : Colors.transparent,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(opt.$3, size: 18, color: isSelected ? accent : DriverTheme.onSurfaceVariant),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          opt.$2,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.cairo(
                            fontSize: 12,
                            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                            color: isSelected ? accent : DriverTheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  static Widget areaCountTile({
    required String label,
    required int count,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(DriverTheme.radiusMd),
        child: Ink(
          padding: const EdgeInsets.symmetric(vertical: 18),
          decoration: BoxDecoration(
            gradient: LinearGradient(colors: [color.withValues(alpha: 0.16), color.withValues(alpha: 0.05)]),
            borderRadius: BorderRadius.circular(DriverTheme.radiusMd),
            border: Border.all(color: color.withValues(alpha: 0.28)),
          ),
          child: Column(
            children: [
              Text('$count', style: GoogleFonts.cairo(fontSize: 30, fontWeight: FontWeight.w900, color: color)),
              Text(label, style: GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.w700, color: color)),
            ],
          ),
        ),
      ),
    );
  }

  static Widget bottomSheetHeader({required String title, required VoidCallback onClose}) {
    return Column(
      children: [
        const SizedBox(height: 10),
        Container(width: 44, height: 4, decoration: BoxDecoration(color: DriverTheme.outline, borderRadius: BorderRadius.circular(2))),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 8, 0),
          child: Row(
            children: [
              Expanded(child: Text(title, style: DriverTheme.titleMedium)),
              IconButton(
                onPressed: onClose,
                icon: const Icon(Icons.close_rounded),
                style: IconButton.styleFrom(backgroundColor: DriverTheme.outline.withValues(alpha: 0.45)),
              ),
            ],
          ),
        ),
      ],
    );
  }

  static Widget listCard({
    required Color accent,
    required Widget child,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(DriverTheme.radiusLg),
        border: Border.all(color: DriverTheme.outline),
        boxShadow: DriverTheme.cardShadow,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(DriverTheme.radiusLg),
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(width: 5, color: accent),
              Expanded(child: Padding(padding: const EdgeInsets.all(16), child: child)),
            ],
          ),
        ),
      ),
    );
  }

  static Widget metricCard({
    required String value,
    required String label,
    required IconData icon,
    required Color color,
    String? badge,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(DriverTheme.radiusLg),
        border: Border.all(color: DriverTheme.outline),
        boxShadow: DriverTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(11)),
                child: Icon(icon, color: color, size: 20),
              ),
              const Spacer(),
              if (badge != null) statusChip(badge, color),
            ],
          ),
          const SizedBox(height: 14),
          Text(value, style: GoogleFonts.cairo(fontSize: 22, fontWeight: FontWeight.w900, color: DriverTheme.onSurface)),
          const SizedBox(height: 4),
          Text(label, style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.w700, color: DriverTheme.onSurfaceVariant)),
        ],
      ),
    );
  }

  static Widget highlightHero({
    required String title,
    required String value,
    required IconData icon,
    required Color accent,
    String? subtitle,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: DriverTheme.gradientFor(accent),
        borderRadius: BorderRadius.circular(DriverTheme.radiusXl),
        boxShadow: DriverTheme.shadowFor(accent),
      ),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: Colors.white, size: 28),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white.withValues(alpha: 0.9))),
                Text(value, style: GoogleFonts.cairo(fontSize: 36, fontWeight: FontWeight.w900, color: Colors.white, height: 1.1)),
                if (subtitle != null)
                  Text(subtitle, style: GoogleFonts.cairo(fontSize: 12, color: Colors.white.withValues(alpha: 0.85))),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static Widget progressBar({required double value, required Color color, String? label}) {
    final v = value.clamp(0.0, 1.0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (label != null) ...[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: DriverTheme.labelSmall),
              Text('${(v * 100).round()}%', style: GoogleFonts.cairo(fontWeight: FontWeight.w800, color: color)),
            ],
          ),
          const SizedBox(height: 8),
        ],
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: LinearProgressIndicator(value: v, minHeight: 10, backgroundColor: color.withValues(alpha: 0.12), color: color),
        ),
      ],
    );
  }

  static Widget detailRow({
    required IconData icon,
    required String label,
    required String? value,
    Color? valueColor,
    VoidCallback? onTap,
  }) {
    final content = Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: DriverTheme.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 18, color: DriverTheme.primary),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.w600, color: DriverTheme.onSurfaceVariant)),
              const SizedBox(height: 4),
              Text(
                value ?? '—',
                style: GoogleFonts.cairo(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: valueColor ?? DriverTheme.onSurface,
                  decoration: onTap != null ? TextDecoration.underline : null,
                ),
              ),
            ],
          ),
        ),
      ],
    );
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: onTap != null ? InkWell(onTap: onTap, borderRadius: BorderRadius.circular(12), child: content) : content,
    );
  }
}

class DriverTabMeta {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final String title;
  final String subtitle;
  final Color accent;

  const DriverTabMeta({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.title,
    required this.subtitle,
    required this.accent,
  });
}

class DriverBottomNav extends StatelessWidget {
  final List<DriverTabMeta> tabs;
  final int selectedIndex;
  final ValueChanged<int> onSelected;

  const DriverBottomNav({super.key, required this.tabs, required this.selectedIndex, required this.onSelected});

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: DriverTheme.surface,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(10, 6, 10, 10),
          child: Container(
            height: 64,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: DriverTheme.outline),
              boxShadow: DriverTheme.cardShadow,
            ),
            child: Row(
              children: List.generate(tabs.length, (i) {
                final meta = tabs[i];
                final selected = i == selectedIndex;
                return Expanded(
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () {
                        if (i != selectedIndex) {
                          HapticFeedback.lightImpact();
                          onSelected(i);
                        }
                      },
                      borderRadius: BorderRadius.circular(16),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        margin: const EdgeInsets.all(5),
                        decoration: BoxDecoration(
                          color: selected ? meta.accent.withValues(alpha: 0.12) : Colors.transparent,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(selected ? meta.activeIcon : meta.icon, size: 20, color: selected ? meta.accent : DriverTheme.onSurfaceVariant.withValues(alpha: 0.65)),
                            const SizedBox(height: 3),
                            Text(
                              meta.label,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.cairo(
                                fontSize: 9,
                                fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                                color: selected ? meta.accent : DriverTheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }
}

class DriverSettingsTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final Color? accent;
  final VoidCallback? onTap;
  final Widget? trailing;
  final bool danger;

  const DriverSettingsTile({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.accent,
    this.onTap,
    this.trailing,
    this.danger = false,
  });

  @override
  Widget build(BuildContext context) {
    final c = danger ? DriverTheme.danger : (accent ?? DriverTheme.primary);
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(DriverTheme.radiusMd),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(DriverTheme.radiusMd),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(DriverTheme.radiusMd),
            border: Border.all(color: DriverTheme.outline),
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(color: c.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                child: Icon(icon, color: c, size: 22),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: GoogleFonts.cairo(fontSize: 15, fontWeight: FontWeight.w700, color: danger ? DriverTheme.danger : DriverTheme.onSurface)),
                    if (subtitle != null) Text(subtitle!, style: DriverTheme.bodyMedium.copyWith(fontSize: 12)),
                  ],
                ),
              ),
              trailing ?? Icon(Icons.chevron_left_rounded, color: DriverTheme.onSurfaceVariant, size: 22),
            ],
          ),
        ),
      ),
    );
  }
}
