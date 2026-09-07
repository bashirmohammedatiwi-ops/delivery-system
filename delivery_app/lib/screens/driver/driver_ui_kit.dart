import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../widgets/app_layout.dart';
import '../../widgets/pulse_skeleton.dart';
import 'driver_theme.dart';

class DriverUiKit {
  DriverUiKit._();

  static TextStyle _cairo(double size, FontWeight weight, Color color, {double height = 1.35}) =>
      GoogleFonts.cairo(fontSize: size, fontWeight: weight, color: color, height: height);

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
        final top = MediaQuery.paddingOf(context).top;
        final compact = AppLayout.isCompactHeight(context);
        final narrow = AppLayout.isNarrowWidth(context);
        return Container(
          width: double.infinity,
          decoration: BoxDecoration(
            gradient: DriverTheme.gradientFor(accent),
            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(DriverTheme.radiusXl)),
            boxShadow: DriverTheme.shadowFor(accent),
          ),
          child: Padding(
            padding: EdgeInsets.fromLTRB(20, top + (compact ? 6 : 10), 20, compact ? 16 : 20),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: compact ? 46 : 52,
                  height: compact ? 46 : 52,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.28)),
                  ),
                  child: Icon(icon, color: Colors.white, size: compact ? 22 : 26),
                ),
                SizedBox(width: narrow ? 10 : 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: _cairo(compact ? 19 : 22, FontWeight.w800, Colors.white),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        subtitle,
                        style: _cairo(compact ? 12 : 13, FontWeight.w500, Colors.white.withValues(alpha: 0.88)),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                if (badge != null)
                  Container(
                    constraints: BoxConstraints(maxWidth: narrow ? 96 : 120),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
                    ),
                    child: Text(
                      badge,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white),
                    ),
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
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.22)),
      ),
      child: Text(text, style: _cairo(11, FontWeight.w800, color)),
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
          Expanded(child: Text(message, style: _cairo(13, FontWeight.w600, color))),
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

  static Widget statTile({
    required String label,
    required String value,
    required IconData icon,
    required Color color,
    bool expanded = true,
  }) {
    final tile = Container(
      width: expanded ? null : 112,
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
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: AlignmentDirectional.centerStart,
            child: Text(value, style: _cairo(18, FontWeight.w800, DriverTheme.onSurface)),
          ),
          Text(label, style: _cairo(11, FontWeight.w600, DriverTheme.onSurfaceVariant)),
        ],
      ),
    );
    return expanded ? Expanded(child: tile) : tile;
  }

  static Widget statTileRow(List<Widget> tiles, {double spacing = 10}) {
    return Builder(
      builder: (context) {
        if (AppLayout.isNarrowWidth(context)) {
          return SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                for (var i = 0; i < tiles.length; i++) ...[
                  if (i > 0) SizedBox(width: spacing),
                  tiles[i],
                ],
              ],
            ),
          );
        }
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              for (var i = 0; i < tiles.length; i++) ...[
                if (i > 0) SizedBox(width: spacing),
                Expanded(child: tiles[i]),
              ],
            ],
          ),
        );
      },
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
    return Builder(
      builder: (context) => ListView.separated(
        padding: AppLayout.scrollPadding(context),
        itemCount: count,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (_, i) => skeletonCard(height: cardHeight),
      ),
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
            child: Text(label, textAlign: TextAlign.center, style: _cairo(15, FontWeight.w800, DriverTheme.onSurface)),
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
                  padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
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
                          maxLines: 2,
                          textAlign: TextAlign.center,
                          style: _cairo(
                            12,
                            isSelected ? FontWeight.w800 : FontWeight.w600,
                            isSelected ? accent : DriverTheme.onSurfaceVariant,
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
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('$count', style: _cairo(30, FontWeight.w900, color, height: 1.1)),
              Text(label, style: _cairo(14, FontWeight.w700, color)),
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
          Text(value, style: _cairo(22, FontWeight.w900, DriverTheme.onSurface, height: 1.2)),
          const SizedBox(height: 4),
          Text(label, style: _cairo(12, FontWeight.w700, DriverTheme.onSurfaceVariant)),
        ],
      ),
    );
  }

  static Widget dayOrderSummary({
    required int total,
    required int delivered,
    required int returned,
    required int notDelivered,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(DriverTheme.radiusLg),
        border: Border.all(color: DriverTheme.outline),
        boxShadow: DriverTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: DriverTheme.info.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.receipt_long_rounded, color: DriverTheme.info, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text('ملخص طلبات اليوم', style: _cairo(15, FontWeight.w800, DriverTheme.onSurface)),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text('$total', textAlign: TextAlign.center, style: _cairo(36, FontWeight.w900, DriverTheme.info, height: 1.1)),
          const SizedBox(height: 4),
          Text(
            'إجمالي الطلبات في اليوم',
            textAlign: TextAlign.center,
            style: _cairo(13, FontWeight.w600, DriverTheme.onSurfaceVariant),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
            decoration: BoxDecoration(
              color: DriverTheme.surface,
              borderRadius: BorderRadius.circular(DriverTheme.radiusMd),
            ),
            child: Row(
              children: [
                Expanded(child: _summaryPart('موصّل', delivered, DriverTheme.success)),
                Container(width: 1, height: 36, color: DriverTheme.outline),
                Expanded(child: _summaryPart('راجع', returned, DriverTheme.danger)),
                Container(width: 1, height: 36, color: DriverTheme.outline),
                Expanded(child: _summaryPart('لم يُوصَّل', notDelivered, DriverTheme.warning)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static Widget _summaryPart(String label, int value, Color color) {
    return Column(
      children: [
        Text('$value', style: _cairo(20, FontWeight.w900, color, height: 1.1)),
        const SizedBox(height: 4),
        Text(label, textAlign: TextAlign.center, style: _cairo(11, FontWeight.w700, DriverTheme.onSurfaceVariant), maxLines: 2),
      ],
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
  final Map<int, int> badges;
  final ValueChanged<int> onSelected;

  const DriverBottomNav({
    super.key,
    required this.tabs,
    required this.selectedIndex,
    required this.onSelected,
    this.badges = const {},
  });

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: DriverTheme.surface,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(10, 6, 10, 10),
          child: Container(
            constraints: const BoxConstraints(minHeight: 72),
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
                final badge = badges[i] ?? 0;
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
                        margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        decoration: BoxDecoration(
                          color: selected ? meta.accent.withValues(alpha: 0.12) : Colors.transparent,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Stack(
                              clipBehavior: Clip.none,
                              children: [
                                Icon(selected ? meta.activeIcon : meta.icon, size: 20, color: selected ? meta.accent : DriverTheme.onSurfaceVariant.withValues(alpha: 0.65)),
                                if (badge > 0)
                                  Positioned(
                                    top: -6,
                                    left: -8,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                      constraints: const BoxConstraints(minWidth: 16),
                                      decoration: BoxDecoration(
                                        color: DriverTheme.warning,
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(color: Colors.white, width: 1.5),
                                      ),
                                      child: Text(
                                        badge > 99 ? '99+' : '$badge',
                                        textAlign: TextAlign.center,
                                        style: GoogleFonts.cairo(fontSize: 9, fontWeight: FontWeight.w800, color: Colors.white, height: 1.1),
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              meta.label,
                              maxLines: 2,
                              textAlign: TextAlign.center,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.cairo(
                                fontSize: 10,
                                fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                                color: selected ? meta.accent : DriverTheme.onSurfaceVariant,
                                height: 1.15,
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
