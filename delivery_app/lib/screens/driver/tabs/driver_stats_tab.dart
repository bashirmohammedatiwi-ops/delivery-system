import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../services/driver_api.dart';
import '../driver_app.dart';
import '../driver_theme.dart';
import '../driver_ui_kit.dart';

class DriverStatsTab extends StatefulWidget {
  const DriverStatsTab({super.key});

  @override
  State<DriverStatsTab> createState() => _DriverStatsTabState();
}

class _DriverStatsTabState extends State<DriverStatsTab> {
  Map<String, dynamic>? _stats;
  bool _loading = true;
  String? _error;
  String _date = '';

  @override
  void initState() {
    super.initState();
    _date = DateFormat('yyyy-MM-dd').format(DateTime.now());
    _load();
  }

  String get _today => DateFormat('yyyy-MM-dd').format(DateTime.now());

  String _addDays(String d, int delta) {
    final dt = DateTime.tryParse('$d 12:00:00') ?? DateTime.now();
    return DateFormat('yyyy-MM-dd').format(dt.add(Duration(days: delta)));
  }

  double _calcAmountDue(List<dynamic> orders) {
    double total = 0;
    for (final o in orders) {
      final m = o as Map<String, dynamic>;
      final amt = (m['TotalIQD'] ?? m['totaliqd'] ?? 0) as num;
      final free = m['FreeDelivery'] == 1 || m['FreeDelivery'] == '1';
      final fee = free ? (m['WaivedDeliveryIQD'] ?? m['waiveddeliveryiqd'] ?? 0) : (m['DeliveryFeeIQD'] ?? m['deliveryfeeiqd'] ?? 0);
      total += (amt - (fee as num));
    }
    return total;
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final stats = await DriverApi.getStats(_date);
      final delivered = await DriverApi.getDeliveredOrders(_date);
      final amountDue = _calcAmountDue(delivered);
      setState(() {
        _stats = stats;
        _stats?['totalAmountDue'] = amountDue;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  int _num(String key) {
    final v = _stats?[key];
    if (v is num) return v.toInt();
    return int.tryParse('$v') ?? 0;
  }

  double get _successRate {
    final d = _num('delivered');
    final r = _num('returned');
    final t = d + r;
    return t > 0 ? d / t : 0;
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return DriverUiKit.skeletonList(count: 4, cardHeight: 120);

    if (_error != null) {
      return DriverUiKit.emptyState(
        icon: Icons.cloud_off_rounded,
        title: 'تعذّر تحميل الإحصائيات',
        subtitle: _error!,
        accent: DriverTheme.danger,
        action: FilledButton.icon(
          onPressed: _load,
          icon: const Icon(Icons.refresh_rounded),
          label: const Text('إعادة المحاولة'),
          style: FilledButton.styleFrom(backgroundColor: DriverTheme.primary),
        ),
      );
    }

    final dateLabel = DateFormat('yMMMd', 'ar_IQ').format(DateTime.tryParse('$_date 12:00:00') ?? DateTime.now());
    final feesCollected = _stats?['feesCollected'] == true;

    return RefreshIndicator(
      onRefresh: _load,
      color: DriverTheme.primary,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DriverUiKit.dateNavigator(
              label: dateLabel,
              onPrev: () {
                setState(() => _date = _addDays(_date, -1));
                _load();
              },
              onNext: _date == _today
                  ? null
                  : () {
                      setState(() => _date = _addDays(_date, 1));
                      _load();
                    },
            ),
            const SizedBox(height: 14),
            DriverUiKit.highlightHero(
              title: 'الطلبات المعيّنة لك الآن',
              value: '${_num('assigned')}',
              icon: Icons.inventory_2_rounded,
              accent: DriverTheme.rusafa,
              subtitle: '$_date · ${_date == _today ? 'اليوم' : 'تاريخ محدد'}',
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                DriverUiKit.statTile(label: 'موصّل', value: '${_num('delivered')}', icon: Icons.check_circle_rounded, color: DriverTheme.success),
                const SizedBox(width: 10),
                DriverUiKit.statTile(label: 'راجع', value: '${_num('returned')}', icon: Icons.undo_rounded, color: DriverTheme.danger),
                const SizedBox(width: 10),
                DriverUiKit.statTile(label: 'لم يُوصَل', value: '${_num('notDelivered')}', icon: Icons.schedule_rounded, color: DriverTheme.warning),
              ],
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(DriverTheme.radiusLg),
                border: Border.all(color: DriverTheme.outline),
                boxShadow: DriverTheme.cardShadow,
              ),
              child: DriverUiKit.progressBar(
                value: _successRate,
                color: DriverTheme.success,
                label: 'نسبة نجاح التوصيل',
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: DriverUiKit.metricCard(
                    value: formatIQD(_stats?['totalDeliveredIQD']),
                    label: 'إجمالي المبالغ',
                    icon: Icons.payments_rounded,
                    color: DriverTheme.primary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DriverUiKit.metricCard(
                    value: formatIQD(_stats?['totalAmountDue']),
                    label: 'المبلغ المستحق',
                    icon: Icons.account_balance_wallet_rounded,
                    color: DriverTheme.secondary,
                  ),
                ),
              ],
            ),
            if (_stats?['feesCollected'] != null) ...[
              const SizedBox(height: 14),
              DriverUiKit.infoBanner(
                message: feesCollected ? 'تم تسديد المستحقات لهذا اليوم' : 'لم يُسدّد المستحقات بعد',
                color: feesCollected ? DriverTheme.success : DriverTheme.warning,
                icon: feesCollected ? Icons.verified_rounded : Icons.schedule_rounded,
              ),
            ],
            if (_stats?['orderCount'] != null) ...[
              const SizedBox(height: 14),
              DriverUiKit.metricCard(
                value: '${_num('orderCount')}',
                label: 'إجمالي الطلبات في اليوم',
                icon: Icons.receipt_long_rounded,
                color: DriverTheme.info,
                badge: 'موصّل ${_num('delivered')}',
              ),
            ],
          ],
        ),
      ),
    );
  }
}
