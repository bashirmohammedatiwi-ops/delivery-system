import 'package:flutter/material.dart';
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

  const _TabMeta({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.title,
    required this.subtitle,
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
    ),
    _TabMeta(
      icon: Icons.qr_code_scanner_outlined,
      activeIcon: Icons.qr_code_scanner_rounded,
      label: 'استلام',
      title: 'استلام الطلبات',
      subtitle: 'مسح واستلام الشحنات',
    ),
    _TabMeta(
      icon: Icons.receipt_long_outlined,
      activeIcon: Icons.receipt_long_rounded,
      label: 'الطلبات',
      title: 'الطلبات',
      subtitle: 'عرض وإدارة الشحنات',
    ),
    _TabMeta(
      icon: Icons.person_outline_rounded,
      activeIcon: Icons.person_rounded,
      label: 'حسابي',
      title: 'الإعدادات',
      subtitle: 'حسابك وتفضيلاتك',
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
              child: SizedBox.expand(
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

class _EmployeeBottomNav extends StatelessWidget {
  final List<_TabMeta> tabs;
  final int selectedIndex;
  final ValueChanged<int> onSelected;

  const _EmployeeBottomNav({
    required this.tabs,
    required this.selectedIndex,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1A1625),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.18),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(8, 10, 8, 8),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final itemW = constraints.maxWidth / tabs.length;
              return Row(
                children: List.generate(tabs.length, (i) {
                  final t = tabs[i];
                  final selected = i == selectedIndex;
                  return SizedBox(
                    width: itemW,
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () => onSelected(i),
                        borderRadius: BorderRadius.circular(16),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 220),
                          curve: Curves.easeOutCubic,
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            color: selected ? EmployeeTheme.primary : Colors.transparent,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                selected ? t.activeIcon : t.icon,
                                size: 22,
                                color: selected ? Colors.white : Colors.white.withValues(alpha: 0.45),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                t.label,
                                style: GoogleFonts.cairo(
                                  fontSize: 10,
                                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                                  color: selected ? Colors.white : Colors.white.withValues(alpha: 0.45),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                }),
              );
            },
          ),
        ),
      ),
    );
  }
}
