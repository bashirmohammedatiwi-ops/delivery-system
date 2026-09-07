import 'package:flutter/material.dart';
import '../../../services/employee_api.dart';
import 'employee_theme.dart';
import 'employee_ui_kit.dart';
import 'tabs/emp_new_order_tab.dart';
import 'tabs/emp_receive_tab.dart';
import 'tabs/emp_orders_tab.dart';
import 'tabs/emp_orders_cache.dart';
import 'tabs/emp_settings_tab.dart';

class EmployeeMainScreen extends StatefulWidget {
  final VoidCallback onLogout;

  const EmployeeMainScreen({super.key, required this.onLogout});

  @override
  State<EmployeeMainScreen> createState() => _EmployeeMainScreenState();
}

class _EmployeeMainScreenState extends State<EmployeeMainScreen> {
  int _index = 0;
  int _ordersTabVersion = 0;
  String? _userName;

  static const _tabs = [
    EmployeeTabMeta(
      icon: Icons.add_rounded,
      activeIcon: Icons.add_circle_rounded,
      label: 'جديد',
      title: 'طلب جديد',
      subtitle: 'إنشاء شحنة وطباعة الملصق',
      accent: EmployeeTheme.primary,
    ),
    EmployeeTabMeta(
      icon: Icons.qr_code_scanner_outlined,
      activeIcon: Icons.qr_code_scanner_rounded,
      label: 'استلام',
      title: 'استلام الطلبات',
      subtitle: 'تعيين الشحنات للسائق',
      accent: EmployeeTheme.secondary,
    ),
    EmployeeTabMeta(
      icon: Icons.receipt_long_outlined,
      activeIcon: Icons.receipt_long_rounded,
      label: 'الطلبات',
      title: 'الطلبات',
      subtitle: 'بحث · تعديل · طباعة',
      accent: Color(0xFF4F46E5),
    ),
    EmployeeTabMeta(
      icon: Icons.person_outline_rounded,
      activeIcon: Icons.person_rounded,
      label: 'حسابي',
      title: 'حسابي',
      subtitle: 'الإعدادات وتسجيل الخروج',
      accent: Color(0xFFDB2777),
    ),
  ];

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    try {
      final user = await EmployeeApi.me();
      if (!mounted) return;
      setState(() => _userName = user['DisplayName']?.toString() ?? user['Username']?.toString());
    } catch (_) {}
  }

  void _onOrderCreated() {
    EmpOrdersCache.clear();
    setState(() => _ordersTabVersion++);
  }

  Widget _buildTab() {
    switch (_index) {
      case 0:
        return EmpNewOrderTab(onCreated: _onOrderCreated);
      case 1:
        return const EmpReceiveTab();
      case 2:
        return EmpOrdersTab(key: ValueKey('orders_$_ordersTabVersion'));
      case 3:
        return EmpSettingsTab(onLogout: widget.onLogout);
      default:
        return EmpNewOrderTab(onCreated: _onOrderCreated);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tab = _tabs[_index];

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: EmployeeTheme.surface,
        body: EmployeeUiKit.pageBackground(
          accent: tab.accent,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              EmployeeUiKit.heroHeader(
                title: tab.title,
                subtitle: tab.subtitle,
                icon: tab.activeIcon,
                accent: tab.accent,
                trailing: _userName != null ? EmployeeUiKit.heroBadge(_userName!) : null,
              ),
              Expanded(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 280),
                  switchInCurve: Curves.easeOutCubic,
                  switchOutCurve: Curves.easeInCubic,
                  child: KeyedSubtree(
                    key: ValueKey(_index),
                    child: _buildTab(),
                  ),
                ),
              ),
            ],
          ),
        ),
        bottomNavigationBar: EmployeeBottomNav(
          tabs: _tabs,
          selectedIndex: _index,
          onSelected: (i) => setState(() => _index = i),
        ),
      ),
    );
  }
}
