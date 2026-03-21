import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../../services/driver_api.dart';
import '../driver_app.dart';
import '../driver_theme.dart';

class DriverStatsTab extends StatefulWidget {
  const DriverStatsTab({super.key});

  @override
  State<DriverStatsTab> createState() => _DriverStatsTabState();
}

class _DriverStatsTabState extends State<DriverStatsTab> {
  Map<String, dynamic>? _stats;
  bool _loading = true;
  String _date = '';

  @override
  void initState() {
    super.initState();
    _date = DateFormat('yyyy-MM-dd').format(DateTime.now());
    _load();
  }

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
    setState(() => _loading = true);
    try {
      final stats = await DriverApi.getStats(_date);
      final delivered = await DriverApi.getDeliveredOrders(_date);
      final amountDue = _calcAmountDue(delivered);
      setState(() {
        _stats = stats;
        _stats?['totalAmountDue'] = amountDue;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(width: 48, height: 48, child: CircularProgressIndicator(strokeWidth: 3, color: DriverTheme.primary)),
            const SizedBox(height: 20),
            Text('جاري تحميل الإحصائيات...', style: DriverTheme.bodyMedium),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      color: DriverTheme.primary,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: DriverTheme.outline.withValues(alpha: 0.5)),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4))],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton.filled(
                    onPressed: () {
                      setState(() => _date = _addDays(_date, -1));
                      _load();
                    },
                    icon: const Icon(Icons.chevron_right_rounded),
                    style: IconButton.styleFrom(backgroundColor: DriverTheme.primary.withValues(alpha: 0.15), foregroundColor: DriverTheme.primary),
                  ),
                  Text(
                    DateFormat('yMMMd', 'ar_IQ').format(DateTime.tryParse('$_date 12:00:00') ?? DateTime.now()),
                    style: GoogleFonts.cairo(fontSize: 16, fontWeight: FontWeight.w800, color: DriverTheme.onSurface),
                  ),
                  IconButton.filled(
                    onPressed: _date == DateFormat('yyyy-MM-dd').format(DateTime.now())
                        ? null
                        : () {
                            setState(() => _date = _addDays(_date, 1));
                            _load();
                          },
                    icon: const Icon(Icons.chevron_left_rounded),
                    style: IconButton.styleFrom(backgroundColor: DriverTheme.primary.withValues(alpha: 0.15), foregroundColor: DriverTheme.primary),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(child: _StatCard(value: '${_stats?['delivered'] ?? 0}', label: 'تم التوصيل', color: DriverTheme.success, icon: Icons.check_circle_rounded)),
                const SizedBox(width: 14),
                Expanded(child: _StatCard(value: '${_stats?['returned'] ?? 0}', label: 'تم الإرجاع', color: DriverTheme.danger, icon: Icons.undo_rounded)),
              ],
            ),
            if (_stats?['orderCount'] != null) ...[
              const SizedBox(height: 14),
              _StatCard(
                value: '${_stats?['orderCount'] ?? 0}',
                label: 'عدد الطلبات',
                color: Colors.blueGrey,
                icon: Icons.receipt_long_rounded,
                subtitle: 'موصّل: ${_stats?['delivered'] ?? 0} | راجع: ${_stats?['returned'] ?? 0} | لم يوصل: ${_stats?['notDelivered'] ?? 0}',
              ),
            ],
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(child: _StatCard(value: formatIQD(_stats?['totalDeliveredIQD']), label: 'المبلغ الكلي', color: DriverTheme.primary, icon: Icons.payments_rounded)),
                const SizedBox(width: 14),
                Expanded(child: _StatCard(value: formatIQD(_stats?['totalAmountDue']), label: 'المبلغ المستحق', color: DriverTheme.primary, icon: Icons.account_balance_wallet_rounded)),
              ],
            ),
            if (_stats?['feesCollected'] != null) ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: (_stats!['feesCollected'] == true ? DriverTheme.success : DriverTheme.warning).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: (_stats!['feesCollected'] == true ? DriverTheme.success : DriverTheme.warning).withValues(alpha: 0.4)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      _stats!['feesCollected'] == true ? Icons.check_circle_rounded : Icons.schedule_rounded,
                      size: 24,
                      color: _stats!['feesCollected'] == true ? DriverTheme.success : DriverTheme.warning,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      _stats!['feesCollected'] == true ? 'تم تسديد المستحقات' : 'لم يُسدّد المستحقات بعد',
                      style: GoogleFonts.cairo(fontWeight: FontWeight.w700, color: _stats!['feesCollected'] == true ? DriverTheme.success : DriverTheme.warning),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    const Color(0xFF475569),
                    const Color(0xFF64748B),
                    DriverTheme.primaryDark.withValues(alpha: 0.4),
                  ],
                ),
                borderRadius: BorderRadius.circular(22),
                boxShadow: [
                  BoxShadow(color: Colors.black.withValues(alpha: 0.15), blurRadius: 20, offset: const Offset(0, 8)),
                ],
              ),
              child: Column(
                children: [
                  Text('العدد الكلي المعك حالياً', style: GoogleFonts.cairo(fontSize: 15, color: Colors.white.withValues(alpha: 0.95), fontWeight: FontWeight.w600)),
                  const SizedBox(height: 10),
                  Text(
                    '${_stats?['assigned'] ?? 0}',
                    style: GoogleFonts.cairo(fontSize: 42, fontWeight: FontWeight.w900, color: Colors.white, height: 1),
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

class _StatCard extends StatelessWidget {
  final String value;
  final String label;
  final Color color;
  final IconData? icon;
  final String? subtitle;

  const _StatCard({required this.value, required this.label, required this.color, this.icon, this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: color.withValues(alpha: 0.25)),
        boxShadow: [BoxShadow(color: color.withValues(alpha: 0.08), blurRadius: 12, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (icon != null) ...[
            Icon(icon!, size: 22, color: color.withValues(alpha: 0.8)),
            const SizedBox(height: 10),
          ],
          Text(value, style: GoogleFonts.cairo(fontSize: 20, fontWeight: FontWeight.w800, color: color)),
          const SizedBox(height: 4),
          Text(label, style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.w600, color: color.withValues(alpha: 0.9))),
          if (subtitle != null) ...[
            const SizedBox(height: 10),
            Text(subtitle!, style: GoogleFonts.cairo(fontSize: 11, color: color.withValues(alpha: 0.75))),
          ],
        ],
      ),
    );
  }
}
