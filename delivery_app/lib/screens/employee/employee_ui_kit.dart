import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../widgets/app_layout.dart';
import '../../widgets/pulse_skeleton.dart';
import 'employee_theme.dart';

/// مكوّنات واجهة مشتركة — تطبيق الموظف v2
class EmployeeUiKit {
  EmployeeUiKit._();

  static Widget pageBackground({required Widget child, Color? accent}) {
    final c = accent ?? EmployeeTheme.primary;
    return Stack(
      fit: StackFit.expand,
      children: [
        Container(color: EmployeeTheme.surface),
        Positioned(
          top: -80,
          left: -60,
          child: _blob(220, c.withValues(alpha: 0.12)),
        ),
        Positioned(
          top: 120,
          right: -90,
          child: _blob(180, EmployeeTheme.secondary.withValues(alpha: 0.08)),
        ),
        child,
      ],
    );
  }

  static Widget _blob(double size, Color color) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(shape: BoxShape.circle, color: color),
    );
  }

  static Widget heroHeader({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color accent,
    Widget? trailing,
  }) {
    return Builder(
      builder: (context) {
        final top = MediaQuery.paddingOf(context).top;
        final compact = AppLayout.isCompactHeight(context);
        final narrow = AppLayout.isNarrowWidth(context);
        return Container(
          width: double.infinity,
          decoration: BoxDecoration(
            gradient: EmployeeTheme.gradientFor(accent),
            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(EmployeeTheme.radiusXl)),
            boxShadow: EmployeeTheme.shadowFor(accent),
          ),
          child: Padding(
            padding: EdgeInsets.fromLTRB(20, top + (compact ? 6 : 10), 20, compact ? 16 : 22),
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
                        style: GoogleFonts.cairo(
                          fontSize: compact ? 19 : 22,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          height: 1.15,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        subtitle,
                        style: GoogleFonts.cairo(
                          fontSize: compact ? 12 : 13,
                          fontWeight: FontWeight.w500,
                          color: Colors.white.withValues(alpha: 0.88),
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                if (trailing != null) trailing,
              ],
            ),
          ),
        );
      },
    );
  }

  static Widget heroBadge(String text) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 120),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.28)),
      ),
      child: Text(
        text,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white),
      ),
    );
  }

  static Widget metricCard({
    required String value,
    required String label,
    required IconData icon,
    required Color color,
    String? subtitle,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(EmployeeTheme.radiusLg),
        border: Border.all(color: EmployeeTheme.outline),
        boxShadow: EmployeeTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const Spacer(),
              if (subtitle != null) statusChip(subtitle, color),
            ],
          ),
          const SizedBox(height: 14),
          Text(value, style: GoogleFonts.cairo(fontSize: 22, fontWeight: FontWeight.w900, color: EmployeeTheme.onSurface)),
          const SizedBox(height: 4),
          Text(label, style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.w700, color: EmployeeTheme.onSurfaceVariant)),
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
              Text(label, style: EmployeeTheme.labelSmall),
              Text('${(v * 100).round()}%', style: GoogleFonts.cairo(fontWeight: FontWeight.w800, color: color)),
            ],
          ),
          const SizedBox(height: 8),
        ],
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: LinearProgressIndicator(
            value: v,
            minHeight: 10,
            backgroundColor: color.withValues(alpha: 0.12),
            color: color,
          ),
        ),
      ],
    );
  }

  static Widget sectionCard({
    required IconData icon,
    required String title,
    String? badge,
    Color? accent,
    required Widget child,
  }) {
    final c = accent ?? EmployeeTheme.primary;
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(EmployeeTheme.radiusLg),
        border: Border.all(color: EmployeeTheme.outline),
        boxShadow: EmployeeTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [c.withValues(alpha: 0.15), c.withValues(alpha: 0.08)],
                    ),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(icon, size: 20, color: c),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(title, style: EmployeeTheme.titleSmall),
                ),
                if (badge != null) statusChip(badge, c),
              ],
            ),
          ),
          Divider(height: 1, color: EmployeeTheme.outline.withValues(alpha: 0.8)),
          Padding(padding: const EdgeInsets.all(16), child: child),
        ],
      ),
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
      child: Text(
        text,
        style: GoogleFonts.cairo(fontSize: 10, fontWeight: FontWeight.w800, color: color),
      ),
    );
  }

  static Widget infoBanner({
    required String message,
    required Color color,
    IconData icon = Icons.info_outline_rounded,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(EmployeeTheme.radiusMd),
        border: Border.all(color: color.withValues(alpha: 0.22)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.w600, color: color, height: 1.35),
            ),
          ),
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
    final c = accent ?? EmployeeTheme.primary;
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
                gradient: LinearGradient(colors: [c.withValues(alpha: 0.12), c.withValues(alpha: 0.04)]),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 42, color: c.withValues(alpha: 0.55)),
            ),
            const SizedBox(height: 20),
            Text(title, style: EmployeeTheme.titleMedium, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(subtitle, style: EmployeeTheme.bodyMedium, textAlign: TextAlign.center),
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
        borderRadius: BorderRadius.circular(EmployeeTheme.radiusMd),
        border: Border.all(color: EmployeeTheme.outline),
        boxShadow: [
          BoxShadow(color: color.withValues(alpha: 0.06), blurRadius: 12, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(height: 8),
          Text(
            value,
            style: GoogleFonts.cairo(fontSize: 18, fontWeight: FontWeight.w800, color: EmployeeTheme.onSurface),
          ),
          Text(label, style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.w600, color: EmployeeTheme.onSurfaceVariant)),
        ],
      ),
    );
    return expanded ? Expanded(child: tile) : tile;
  }

  static Widget statTileRow(List<Widget> tiles, {double spacing = 10}) {
    return Builder(
      builder: (context) {
        final narrow = AppLayout.isNarrowWidth(context);
        if (narrow) {
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

  static Widget workflowStep({
    required int step,
    required String title,
    required String subtitle,
    required bool active,
    required bool done,
    required Color accent,
    required Widget child,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(EmployeeTheme.radiusLg),
        border: Border.all(color: active ? accent.withValues(alpha: 0.35) : EmployeeTheme.outline),
        boxShadow: active ? EmployeeTheme.shadowFor(accent) : EmployeeTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: done ? accent : active ? accent.withValues(alpha: 0.12) : EmployeeTheme.outline.withValues(alpha: 0.5),
                    shape: BoxShape.circle,
                  ),
                  child: done
                      ? const Icon(Icons.check_rounded, color: Colors.white, size: 20)
                      : Text(
                          '$step',
                          style: GoogleFonts.cairo(
                            fontWeight: FontWeight.w800,
                            color: active ? accent : EmployeeTheme.onSurfaceVariant,
                          ),
                        ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: EmployeeTheme.titleSmall),
                      Text(subtitle, style: EmployeeTheme.bodyMedium.copyWith(fontSize: 12)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Padding(padding: const EdgeInsets.all(16), child: child),
        ],
      ),
    );
  }

  static Widget stickyBar({
    required Widget child,
    EdgeInsets padding = const EdgeInsets.fromLTRB(16, 10, 16, 12),
  }) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.94),
        border: Border(top: BorderSide(color: EmployeeTheme.outline)),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 16, offset: const Offset(0, -4)),
        ],
      ),
      child: SafeArea(top: false, child: Padding(padding: padding, child: child)),
    );
  }

  static Widget skeletonCard({double height = 132, Color accent = EmployeeTheme.primary}) {
    return PulseSkeleton(
      child: Container(
        height: height,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(EmployeeTheme.radiusLg),
          border: Border.all(color: EmployeeTheme.outline),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(EmployeeTheme.radiusLg),
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

  static Widget skeletonList({int count = 5, double cardHeight = 148}) {
    return Builder(
      builder: (context) => ListView.separated(
        padding: AppLayout.scrollPadding(context),
        itemCount: count,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (_, _) => skeletonCard(height: cardHeight),
      ),
    );
  }

  static Widget searchBar({
    required TextEditingController controller,
    required String hint,
    required ValueChanged<String> onChanged,
    VoidCallback? onClear,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(EmployeeTheme.radiusLg),
        border: Border.all(color: EmployeeTheme.outline),
        boxShadow: EmployeeTheme.cardShadow,
      ),
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: EmployeeTheme.bodyMedium.copyWith(color: EmployeeTheme.onSurfaceVariant.withValues(alpha: 0.55)),
          prefixIcon: Icon(Icons.search_rounded, color: EmployeeTheme.primary.withValues(alpha: 0.8)),
          suffixIcon: onClear != null && controller.text.isNotEmpty
              ? IconButton(icon: const Icon(Icons.close_rounded, size: 20), onPressed: onClear)
              : null,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 14),
        ),
      ),
    );
  }

  static Widget filterChip({
    required String label,
    required bool selected,
    required Color accent,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(left: 8),
      child: FilterChip(
        label: Text(label, style: GoogleFonts.cairo(fontWeight: FontWeight.w700, fontSize: 12)),
        selected: selected,
        onSelected: (_) => onTap(),
        selectedColor: accent.withValues(alpha: 0.14),
        checkmarkColor: accent,
        labelStyle: TextStyle(color: selected ? accent : EmployeeTheme.onSurfaceVariant),
        side: BorderSide(color: selected ? accent.withValues(alpha: 0.35) : EmployeeTheme.outline),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        padding: const EdgeInsets.symmetric(horizontal: 4),
      ),
    );
  }
}

class EmployeeTabMeta {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final String title;
  final String subtitle;
  final Color accent;

  const EmployeeTabMeta({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.title,
    required this.subtitle,
    required this.accent,
  });
}

class EmployeeBottomNav extends StatelessWidget {
  final List<EmployeeTabMeta> tabs;
  final int selectedIndex;
  final ValueChanged<int> onSelected;

  const EmployeeBottomNav({
    super.key,
    required this.tabs,
    required this.selectedIndex,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: EmployeeTheme.surface,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 6, 14, 10),
          child: Container(
            height: 68,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: EmployeeTheme.outline),
              boxShadow: EmployeeTheme.cardShadow,
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
                      borderRadius: BorderRadius.circular(20),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 220),
                        margin: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: selected ? meta.accent.withValues(alpha: 0.12) : Colors.transparent,
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              selected ? meta.activeIcon : meta.icon,
                              size: 22,
                              color: selected ? meta.accent : EmployeeTheme.onSurfaceVariant.withValues(alpha: 0.65),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              meta.label,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.cairo(
                                fontSize: 10,
                                fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                                color: selected ? meta.accent : EmployeeTheme.onSurfaceVariant,
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

class EmployeeSettingsTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final Color? accent;
  final VoidCallback? onTap;
  final Widget? trailing;
  final bool danger;

  const EmployeeSettingsTile({
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
    final c = danger ? EmployeeTheme.danger : (accent ?? EmployeeTheme.primary);
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(EmployeeTheme.radiusMd),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(EmployeeTheme.radiusMd),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(EmployeeTheme.radiusMd),
            border: Border.all(color: EmployeeTheme.outline),
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: c.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: c, size: 22),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.cairo(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: danger ? EmployeeTheme.danger : EmployeeTheme.onSurface,
                      ),
                    ),
                    if (subtitle != null)
                      Text(subtitle!, style: EmployeeTheme.bodyMedium.copyWith(fontSize: 12)),
                  ],
                ),
              ),
              trailing ?? Icon(Icons.chevron_left_rounded, color: EmployeeTheme.onSurfaceVariant, size: 22),
            ],
          ),
        ),
      ),
    );
  }
}
