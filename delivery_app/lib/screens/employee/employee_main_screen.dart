import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../services/employee_api.dart';
import 'employee_theme.dart';
import 'tabs/emp_new_order_tab.dart';
import 'tabs/emp_receive_tab.dart';
import 'tabs/emp_orders_tab.dart';
import 'tabs/emp_settings_tab.dart';

class EmployeeMainScreen extends StatefulWidget {
  final VoidCallback onLogout;

  const EmployeeMainScreen({super.key, required this.onLogout});

  @override
  State<EmployeeMainScreen> createState() => _EmployeeMainScreenState();
}

class _EmployeeMainScreenState extends State<EmployeeMainScreen> {
  int _index = 0;
  Map<String, dynamic>? _user;
  int _ordersTabVersion = 0;

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    try {
      final u = await EmployeeApi.me();
      setState(() => _user = u);
    } catch (_) {}
  }

  static const _tabs = [
    (icon: Icons.add_circle_outline_rounded, label: 'طلب جديد'),
    (icon: Icons.inventory_2_outlined, label: 'استلام'),
    (icon: Icons.receipt_long_rounded, label: 'الطلبات'),
    (icon: Icons.settings_rounded, label: 'إعدادات'),
  ];

  Widget _buildTab() {
    switch (_index) {
      case 0:
        return EmpNewOrderTab(
          onCreated: () => setState(() {
            // تغيير نسخة التبويب يساعد على إعادة تحميل حالة الطلبات بعد الطباعة.
            _ordersTabVersion++;
          }),
        );
      case 1:
        return const EmpReceiveTab();
      case 2:
        return EmpOrdersTab(key: ValueKey('orders_$_ordersTabVersion'));
      case 3:
        return EmpSettingsTab(onLogout: widget.onLogout);
      default:
        return EmpNewOrderTab(
          onCreated: () => setState(() {
            _ordersTabVersion++;
          }),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = _user?['DisplayName'] ?? _user?['Username'] ?? 'موظف';
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: EmployeeTheme.surface,
        appBar: AppBar(
          elevation: 0,
          scrolledUnderElevation: 0,
          backgroundColor: Colors.transparent,
          titleSpacing: 0,
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: EmployeeTheme.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.description_rounded, color: EmployeeTheme.primary, size: 22),
              ),
              const SizedBox(width: 12),
              Flexible(
                child: Text(
                  'تطبيق الموظفين',
                  style: GoogleFonts.cairo(fontSize: 18, fontWeight: FontWeight.w800, color: EmployeeTheme.onSurface),
                  overflow: TextOverflow.ellipsis,
                  maxLines: 1,
                ),
              ),
            ],
          ),
          actions: [
            Padding(
              padding: const EdgeInsets.only(left: 8),
              child: Center(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircleAvatar(
                      radius: 14,
                      backgroundColor: EmployeeTheme.primary.withValues(alpha: 0.3),
                      child: Text(
                        name.toString().substring(0, 1).toUpperCase(),
                        style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.w700, color: EmployeeTheme.primary),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        name,
                        style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.w700, color: EmployeeTheme.onSurface),
                        overflow: TextOverflow.ellipsis,
                        maxLines: 1,
                      ),
                    ),
                  ],
                ),
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
          color: isSelected ? EmployeeTheme.primary.withValues(alpha: 0.12) : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 24, color: isSelected ? EmployeeTheme.primary : EmployeeTheme.onSurfaceVariant),
            const SizedBox(height: 4),
            Text(
              label,
              style: GoogleFonts.cairo(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected ? EmployeeTheme.primary : EmployeeTheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
