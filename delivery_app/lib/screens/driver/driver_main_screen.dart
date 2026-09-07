import 'package:flutter/material.dart';
import 'driver_theme.dart';
import 'driver_ui_kit.dart';
import '../../services/driver_api.dart';
import 'tabs/driver_orders_tab.dart' show DriverOrdersTab, showDriverOrderDetail;
import 'tabs/driver_receive_tab.dart';
import 'tabs/driver_pending_tab.dart';
import 'tabs/driver_stats_tab.dart';
import 'tabs/driver_history_tab.dart';
import 'tabs/driver_settings_tab.dart';

class DriverMainScreen extends StatefulWidget {
  final VoidCallback onLogout;

  const DriverMainScreen({super.key, required this.onLogout});

  @override
  State<DriverMainScreen> createState() => _DriverMainScreenState();
}

class _DriverMainScreenState extends State<DriverMainScreen> {
  int _index = 0;
  int _ordersTabVersion = 0;
  Map<String, dynamic>? _driver;
  int _deferredCount = 0;

  static const _tabs = [
    DriverTabMeta(
      icon: Icons.inventory_2_outlined,
      activeIcon: Icons.inventory_2_rounded,
      label: 'طلباتي',
      title: 'طلباتي',
      subtitle: 'الشحنات المعينة لك · نشطة ومؤجلة',
      accent: DriverTheme.primary,
    ),
    DriverTabMeta(
      icon: Icons.add_circle_outline_rounded,
      activeIcon: Icons.add_circle_rounded,
      label: 'استلام',
      title: 'استلام',
      subtitle: 'مسح واستلام شحنات جديدة',
      accent: DriverTheme.secondary,
    ),
    DriverTabMeta(
      icon: Icons.schedule_outlined,
      activeIcon: Icons.schedule_rounded,
      label: 'منتظرة',
      title: 'المنتظرة',
      subtitle: 'طلبات بانتظار التوصيل',
      accent: DriverTheme.warning,
    ),
    DriverTabMeta(
      icon: Icons.analytics_outlined,
      activeIcon: Icons.analytics_rounded,
      label: 'إحصائيات',
      title: 'الإحصائيات',
      subtitle: 'أداؤك اليومي والمبالغ',
      accent: DriverTheme.rusafa,
    ),
    DriverTabMeta(
      icon: Icons.history_outlined,
      activeIcon: Icons.history_rounded,
      label: 'السجل',
      title: 'السجل',
      subtitle: 'توصيل · راجع · ملغي',
      accent: DriverTheme.info,
    ),
    DriverTabMeta(
      icon: Icons.settings_outlined,
      activeIcon: Icons.settings_rounded,
      label: 'إعدادات',
      title: 'الإعدادات',
      subtitle: 'حسابك وتسجيل الخروج',
      accent: Color(0xFFDB2777),
    ),
  ];

  @override
  void initState() {
    super.initState();
    _loadDriver();
  }

  Future<void> _loadDriver() async {
    final d = await DriverApi.getDriver();
    if (mounted) setState(() => _driver = d);
  }

  void _onDeferredCountChanged(int count) {
    if (mounted) setState(() => _deferredCount = count);
  }

  void _onOrdersChanged() {}

  Widget _buildTab() {
    switch (_index) {
      case 0:
        return DriverOrdersTab(
          key: ValueKey('orders_$_ordersTabVersion'),
          onChanged: _onOrdersChanged,
          onDeferredCountChanged: _onDeferredCountChanged,
        );
      case 1:
        return DriverReceiveTab(
          onReceived: () {
            _loadDriver();
            setState(() => _ordersTabVersion++);
          },
          onShowOrderDetail: (order) => showDriverOrderDetail(context, order, onAction: () {
            Navigator.pop(context);
            _onOrdersChanged();
          }),
        );
      case 2:
        return const DriverPendingTab();
      case 3:
        return const DriverStatsTab();
      case 4:
        return const DriverHistoryTab();
      case 5:
        return DriverSettingsTab(onLogout: widget.onLogout);
      default:
        return DriverOrdersTab(
          key: ValueKey('orders_$_ordersTabVersion'),
          onChanged: _onOrdersChanged,
          onDeferredCountChanged: _onDeferredCountChanged,
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final tab = _tabs[_index];
    final driverName = _driver?['DriverName']?.toString();

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: DriverTheme.surface,
        body: DriverUiKit.pageBackground(
          accent: tab.accent,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              DriverUiKit.heroHeader(
                title: tab.title,
                subtitle: tab.subtitle,
                icon: tab.activeIcon,
                accent: tab.accent,
                badge: driverName,
              ),
              Expanded(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 280),
                  switchInCurve: Curves.easeOutCubic,
                  child: KeyedSubtree(key: ValueKey(_index), child: _buildTab()),
                ),
              ),
            ],
          ),
        ),
        bottomNavigationBar: DriverBottomNav(
          tabs: _tabs,
          selectedIndex: _index,
          badges: {0: _deferredCount},
          onSelected: (i) => setState(() => _index = i),
        ),
      ),
    );
  }
}
