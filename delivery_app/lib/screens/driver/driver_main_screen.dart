import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../services/driver_api.dart';
import 'driver_theme.dart';
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
  Map<String, dynamic>? _driver;

  @override
  void initState() {
    super.initState();
    _loadDriver();
  }

  Future<void> _loadDriver() async {
    final d = await DriverApi.getDriver();
    setState(() => _driver = d);
  }

  static const _tabs = [
    (icon: Icons.inventory_2_rounded, label: 'طلباتي'),
    (icon: Icons.add_circle_outline_rounded, label: 'استلام'),
    (icon: Icons.schedule_rounded, label: 'منتظرة'),
    (icon: Icons.analytics_rounded, label: 'إحصائيات'),
    (icon: Icons.history_rounded, label: 'السجل'),
    (icon: Icons.settings_rounded, label: 'إعدادات'),
  ];

  Widget _buildTab() {
    switch (_index) {
      case 0:
        return const DriverOrdersTab();
      case 1:
        return DriverReceiveTab(
          onReceived: _loadDriver,
          onShowOrderDetail: (order) => showDriverOrderDetail(context, order),
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
        return const DriverOrdersTab();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: DriverTheme.surface,
        appBar: AppBar(
          elevation: 0,
          scrolledUnderElevation: 0,
          backgroundColor: Colors.transparent,
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: DriverTheme.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.local_shipping_rounded, color: DriverTheme.primary, size: 22),
              ),
              const SizedBox(width: 12),
              Text(
                'تطبيق السائق',
                style: GoogleFonts.cairo(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: DriverTheme.onSurface,
                ),
              ),
            ],
          ),
          actions: [
            Container(
              margin: const EdgeInsets.only(left: 16),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: DriverTheme.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: DriverTheme.primary.withValues(alpha: 0.2)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(color: DriverTheme.success, shape: BoxShape.circle),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _driver?['DriverName'] ?? '—',
                    style: GoogleFonts.cairo(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: DriverTheme.onSurface,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        body: _buildTab(),
        bottomNavigationBar: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.06),
                blurRadius: 20,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: List.generate(
                  _tabs.length,
                  (i) => _NavItem(
                    icon: _tabs[i].icon,
                    label: _tabs[i].label,
                    isSelected: _index == i,
                    onTap: () => setState(() => _index = i),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _NavItem({required this.icon, required this.label, required this.isSelected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? DriverTheme.primary.withValues(alpha: 0.12) : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 24,
              color: isSelected ? DriverTheme.primary : DriverTheme.onSurfaceVariant,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: GoogleFonts.cairo(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected ? DriverTheme.primary : DriverTheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
