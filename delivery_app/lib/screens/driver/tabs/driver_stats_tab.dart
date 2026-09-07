import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../utils/json_helpers.dart';
import '../../../services/driver_api.dart';
import '../driver_app.dart';
import '../driver_theme.dart';
import '../../../widgets/app_layout.dart';
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
  String _todayStr = '';

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final today = await DriverApi.getToday();
    if (!mounted) return;
    setState(() {
      _date = today;
      _todayStr = today;
    });
    await _load();
  }

  String get _today => _todayStr;

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final stats = await DriverApi.getStats(_date);
      final delivered = await DriverApi.getDeliveredOrders(_date);
      final amountDue = _calcAmountDue(delivered);
      if (!mounted) return;
      setState(() {
        _stats = stats;
        _stats?['totalAmountDue'] = amountDue;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  double _calcAmountDue(List<dynamic> orders) {
    double total = 0;
    for (final o in orders) {
      final m = o as Map<String, dynamic>;
      final amt = pickDouble(m['TotalIQD'] ?? m['totaliqd']);
      final free = pickBool(m['FreeDelivery']);
      final fee = free
          ? pickDouble(m['WaivedDeliveryIQD'] ?? m['waiveddeliveryiqd'])
          : pickDouble(m['DeliveryFeeIQD'] ?? m['deliveryfeeiqd']);
      total += amt - fee;
    }
    return total;
  }

  int _num(String key) => pickFieldInt(_stats ?? {}, [key]);

  double get _successRate {
    final d = _num('delivered');
    final r = _num('returned');
    final t = d + r;
    return t > 0 ? d / t : 0;
  }

  String _dateLabel() {
    final dt = DateTime.tryParse('$_date 12:00:00') ?? DateTime.now();
    try {
      return DateFormat('EEEE، d MMMM yyyy', 'ar').format(dt);
    } catch (_) {
      return _date;
    }
  }

  String _dateShortLabel() {
    final dt = DateTime.tryParse('$_date 12:00:00') ?? DateTime.now();
    try {
      return DateFormat('yMMMd', 'ar').format(dt);
    } catch (_) {
      return _date;
    }
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

    final delivered = _num('delivered');
    final returned = _num('returned');
    final notDelivered = _num('notDelivered');
    final orderTotal = delivered + returned + notDelivered;
    final assigned = _num('assigned');
    final feesCollected = _stats?['feesCollected'] == true;
    final isToday = _date == _today;

    return RefreshIndicator(
      onRefresh: _load,
      color: DriverTheme.primary,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: AppLayout.scrollPadding(context),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DriverUiKit.dateNavigator(
              label: _dateShortLabel(),
              onPrev: () {
                setState(() => _date = DriverApi.addDays(_date, -1));
                _load();
              },
              onNext: isToday
                  ? null
                  : () {
                      setState(() => _date = DriverApi.addDays(_date, 1));
                      _load();
                    },
            ),
            const SizedBox(height: 8),
            Text(
              _dateLabel(),
              textAlign: TextAlign.center,
              style: DriverTheme.bodyMedium.copyWith(fontSize: 13, height: 1.35),
            ),
            if (isToday)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  'إحصائيات اليوم الحالي',
                  textAlign: TextAlign.center,
                  style: DriverTheme.labelSmall.copyWith(color: DriverTheme.primary),
                ),
              ),
            const SizedBox(height: 16),
            Row(
              children: [
                DriverUiKit.statTile(label: 'موصّل', value: '$delivered', icon: Icons.check_circle_rounded, color: DriverTheme.success),
                const SizedBox(width: 10),
                DriverUiKit.statTile(label: 'راجع', value: '$returned', icon: Icons.undo_rounded, color: DriverTheme.danger),
                const SizedBox(width: 10),
                DriverUiKit.statTile(label: 'لم يُوصَّل', value: '$notDelivered', icon: Icons.schedule_rounded, color: DriverTheme.warning),
              ],
            ),
            const SizedBox(height: 14),
            DriverUiKit.dayOrderSummary(
              total: orderTotal,
              delivered: delivered,
              returned: returned,
              notDelivered: notDelivered,
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
                label: 'نسبة نجاح التوصيل (موصّل ÷ موصّل + راجع)',
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: DriverUiKit.metricCard(
                    value: formatIQD(pickDouble(_stats?['totalDeliveredIQD'])),
                    label: 'إجمالي مبالغ التوصيل',
                    icon: Icons.payments_rounded,
                    color: DriverTheme.primary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DriverUiKit.metricCard(
                    value: formatIQD(pickDouble(_stats?['totalAmountDue'])),
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
            const SizedBox(height: 14),
            DriverUiKit.highlightHero(
              title: 'الطلبات المعيّنة لك الآن',
              value: '$assigned',
              icon: Icons.inventory_2_rounded,
              accent: DriverTheme.rusafa,
              subtitle: 'شحنات بحوزتك ولم تُوصَّل أو تُرجَع بعد',
            ),
          ],
        ),
      ),
    );
  }
}
