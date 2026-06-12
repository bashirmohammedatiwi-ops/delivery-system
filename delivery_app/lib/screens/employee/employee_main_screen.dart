import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'employee_theme.dart';
import 'tabs/emp_new_order_tab.dart';
import 'tabs/emp_receive_tab.dart';
import 'tabs/emp_orders_tab.dart';
import 'tabs/emp_orders_cache.dart';
import 'tabs/emp_settings_tab.dart';

class _TabMeta {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final String title;
  final String subtitle;
  final Color accent;
  final Color accentLight;

  const _TabMeta({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.title,
    required this.subtitle,
    this.accent = EmployeeTheme.primary,
    this.accentLight = EmployeeTheme.primaryLight,
  });
}

class EmployeeMainScreen extends StatefulWidget {
  final VoidCallback onLogout;

  const EmployeeMainScreen({super.key, required this.onLogout});

  @override
  State<EmployeeMainScreen> createState() => _EmployeeMainScreenState();
}

class _EmployeeMainScreenState extends State<EmployeeMainScreen> {
  int _index = 0;
  int _ordersTabVersion = 0;

  static const _tabs = [
    _TabMeta(
      icon: Icons.add_rounded,
      activeIcon: Icons.add_circle_rounded,
      label: 'جديد',
      title: 'طلب جديد',
      subtitle: 'إنشاء شحنة جديدة',
      accent: EmployeeTheme.primary,
      accentLight: EmployeeTheme.primaryLight,
    ),
    _TabMeta(
      icon: Icons.qr_code_scanner_outlined,
      activeIcon: Icons.qr_code_scanner_rounded,
      label: 'استلام',
      title: 'استلام الطلبات',
      subtitle: 'مسح واستلام الشحنات',
      accent: Color(0xFF0D9488),
      accentLight: Color(0xFF5EEAD4),
    ),
    _TabMeta(
      icon: Icons.receipt_long_outlined,
      activeIcon: Icons.receipt_long_rounded,
      label: 'الطلبات',
      title: 'الطلبات',
      subtitle: 'عرض وإدارة الشحنات',
      accent: Color(0xFF4F46E5),
      accentLight: Color(0xFFA5B4FC),
    ),
    _TabMeta(
      icon: Icons.person_outline_rounded,
      activeIcon: Icons.person_rounded,
      label: 'حسابي',
      title: 'الإعدادات',
      subtitle: 'حسابك وتفضيلاتك',
      accent: Color(0xFFDB2777),
      accentLight: Color(0xFFF9A8D4),
    ),
  ];

  Widget _buildTab() {
    switch (_index) {
      case 0:
        return EmpNewOrderTab(
          onCreated: () {
            EmpOrdersCache.clear();
            setState(() => _ordersTabVersion++);
          },
        );
      case 1:
        return const EmpReceiveTab();
      case 2:
        return EmpOrdersTab(key: ValueKey('orders_$_ordersTabVersion'));
      case 3:
        return EmpSettingsTab(onLogout: widget.onLogout);
      default:
        return EmpNewOrderTab(
          onCreated: () {
            EmpOrdersCache.clear();
            setState(() => _ordersTabVersion++);
          },
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final tab = _tabs[_index];

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: EmployeeTheme.surface,
        body: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _EmployeePageHeader(
              title: tab.title,
              subtitle: tab.subtitle,
              icon: tab.activeIcon,
            ),
            Expanded(
              child: ColoredBox(
                color: EmployeeTheme.surface,
                child: _buildTab(),
              ),
            ),
          ],
        ),
        bottomNavigationBar: _EmployeeBottomNav(
          tabs: _tabs,
          selectedIndex: _index,
          onSelected: (i) => setState(() => _index = i),
        ),
      ),
    );
  }
}

class _EmployeePageHeader extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;

  const _EmployeePageHeader({
    required this.title,
    required this.subtitle,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.of(context).padding.top;
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: EmployeeTheme.primary.withValues(alpha: 0.08),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: EdgeInsets.fromLTRB(20, top + 12, 20, 14),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topRight,
                  end: Alignment.bottomLeft,
                  colors: [EmployeeTheme.primary, EmployeeTheme.primaryDark],
                ),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: Colors.white, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.cairo(
                      fontSize: 19,
                      fontWeight: FontWeight.w800,
                      color: EmployeeTheme.onSurface,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: GoogleFonts.cairo(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: EmployeeTheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmployeeBottomNav extends StatefulWidget {
  final List<_TabMeta> tabs;
  final int selectedIndex;
  final ValueChanged<int> onSelected;

  const _EmployeeBottomNav({
    required this.tabs,
    required this.selectedIndex,
    required this.onSelected,
  });

  @override
  State<_EmployeeBottomNav> createState() => _EmployeeBottomNavState();
}

class _EmployeeBottomNavState extends State<_EmployeeBottomNav>
    with SingleTickerProviderStateMixin {
  static const _barHeight = 64.0;
  static const _orbSize = 54.0;
  static const _slideDuration = Duration(milliseconds: 520);

  late AnimationController _slideController;
  late Animation<double> _indexAnim;
  double _fromIndex = 0;
  double _toIndex = 0;

  @override
  void initState() {
    super.initState();
    _toIndex = widget.selectedIndex.toDouble();
    _slideController = AnimationController(vsync: this, duration: _slideDuration);
    _indexAnim = AlwaysStoppedAnimation(_toIndex);
    _slideController.addListener(() => setState(() {}));
  }

  @override
  void didUpdateWidget(covariant _EmployeeBottomNav oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.selectedIndex != widget.selectedIndex) {
      _fromIndex = _toIndex;
      _toIndex = widget.selectedIndex.toDouble();
      _indexAnim = Tween<double>(begin: _fromIndex, end: _toIndex).animate(
        CurvedAnimation(parent: _slideController, curve: Curves.easeOutBack),
      );
      _slideController.forward(from: 0);
      HapticFeedback.lightImpact();
    }
  }

  @override
  void dispose() {
    _slideController.dispose();
    super.dispose();
  }

  double get _animatedIndex =>
      _slideController.isAnimating ? _indexAnim.value : _toIndex;

  double _orbCenterX(double index, double width, int count) {
    return width - (index + 0.5) * (width / count);
  }

  @override
  Widget build(BuildContext context) {
    final active = widget.tabs[widget.selectedIndex];

    return ColoredBox(
      color: EmployeeTheme.surface,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 6, 16, 8),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final w = constraints.maxWidth;
              if (!w.isFinite || w <= 0) {
                return const SizedBox(height: _barHeight);
              }

              final itemW = w / widget.tabs.length;
              final orbX = _orbCenterX(_animatedIndex, w, widget.tabs.length);
              const stackH = _barHeight + 22.0;
              const orbBottom = _barHeight - 18.0;

              return SizedBox(
                height: stackH,
                width: w,
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Positioned(
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: _barHeight,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(28),
                          border: Border.all(
                            color: active.accent.withValues(alpha: 0.14),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: active.accent.withValues(alpha: 0.1),
                              blurRadius: 20,
                              offset: const Offset(0, 8),
                            ),
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.05),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: List.generate(widget.tabs.length, (i) {
                            return _BottomNavSlot(
                              width: itemW,
                              meta: widget.tabs[i],
                              selected: i == widget.selectedIndex,
                              onTap: () {
                                if (i == widget.selectedIndex) return;
                                widget.onSelected(i);
                              },
                            );
                          }),
                        ),
                      ),
                    ),
                    Positioned(
                      left: orbX - _orbSize / 2,
                      bottom: orbBottom,
                      child: _ActiveNavOrb(meta: active),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _ActiveNavOrb extends StatelessWidget {
  final _TabMeta meta;

  const _ActiveNavOrb({required this.meta});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 54,
      height: 54,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
          colors: [meta.accentLight, meta.accent, meta.accent.withValues(alpha: 0.85)],
        ),
        boxShadow: [
          BoxShadow(
            color: meta.accent.withValues(alpha: 0.45),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
        border: Border.all(color: Colors.white, width: 2.5),
      ),
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 240),
        switchInCurve: Curves.easeOutBack,
        child: Icon(
          meta.activeIcon,
          key: ValueKey(meta.label),
          color: Colors.white,
          size: 26,
        ),
      ),
    );
  }
}

class _BottomNavSlot extends StatelessWidget {
  final double width;
  final _TabMeta meta;
  final bool selected;
  final VoidCallback onTap;

  const _BottomNavSlot({
    required this.width,
    required this.meta,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(20),
          splashColor: meta.accent.withValues(alpha: 0.08),
          child: Padding(
            padding: EdgeInsets.only(top: selected ? 22 : 18, bottom: 8),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.end,
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  height: selected ? 0 : 20,
                  child: AnimatedOpacity(
                    duration: const Duration(milliseconds: 200),
                    opacity: selected ? 0 : 1,
                    child: Icon(
                      meta.icon,
                      size: 20,
                      color: EmployeeTheme.onSurfaceVariant.withValues(alpha: 0.5),
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  meta.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.cairo(
                    fontSize: selected ? 11 : 10,
                    fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                    color: selected ? meta.accent : EmployeeTheme.onSurfaceVariant,
                    height: 1.0,
                  ),
                ),
                const SizedBox(height: 4),
                AnimatedContainer(
                  duration: const Duration(milliseconds: 280),
                  width: selected ? 14 : 0,
                  height: 2,
                  decoration: BoxDecoration(
                    color: selected ? meta.accent : Colors.transparent,
                    borderRadius: BorderRadius.circular(1),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
