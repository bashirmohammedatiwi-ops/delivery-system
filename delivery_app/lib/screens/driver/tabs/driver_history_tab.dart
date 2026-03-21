import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../../services/driver_api.dart';
import '../driver_app.dart';
import '../driver_theme.dart';

class DriverHistoryTab extends StatefulWidget {
  const DriverHistoryTab({super.key});

  @override
  State<DriverHistoryTab> createState() => _DriverHistoryTabState();
}

class _DriverHistoryTabState extends State<DriverHistoryTab> {
  List<dynamic> _orders = [];
  Map<String, dynamic>? _stats;
  bool _loading = true;
  String _date = '';
  bool _showDelivered = true;

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

  String _formatDateTime(String? d) {
    if (d == null || d.isEmpty) return '—';
    try {
      final dt = DateTime.tryParse(d);
      if (dt == null) return d;
      return DateFormat('d MMM، HH:mm', 'ar').format(dt);
    } catch (_) {
      return d;
    }
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final list = _showDelivered
          ? await DriverApi.getDeliveredOrders(_date)
          : await DriverApi.getReturnedOrders(_date);
      final stats = await DriverApi.getStats(_date);
      setState(() {
        _orders = list is List ? list : [];
        _stats = stats;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          margin: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: DriverTheme.outline.withValues(alpha: 0.5)),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4))],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(
                onPressed: () {
                  setState(() => _date = _addDays(_date, -1));
                  _load();
                },
                icon: const Icon(Icons.chevron_right_rounded),
              ),
              Text(
                DateFormat('yMMMd', 'ar_IQ').format(DateTime.tryParse('$_date 12:00:00') ?? DateTime.now()),
                style: GoogleFonts.cairo(fontSize: 15, fontWeight: FontWeight.w800),
              ),
              IconButton(
                onPressed: _date == DateFormat('yyyy-MM-dd').format(DateTime.now())
                    ? null
                    : () {
                        setState(() => _date = _addDays(_date, 1));
                        _load();
                      },
                icon: const Icon(Icons.chevron_left_rounded),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SegmentedButton<bool>(
            segments: const [
              ButtonSegment(value: true, label: Text('الموصّل'), icon: Icon(Icons.check_circle_rounded, size: 20)),
              ButtonSegment(value: false, label: Text('المراجع'), icon: Icon(Icons.undo_rounded, size: 20)),
            ],
            selected: {_showDelivered},
            onSelectionChanged: (s) {
              setState(() {
                _showDelivered = s.first;
                _load();
              });
            },
          ),
        ),
        if (_stats?['assigned'] != null && (_stats!['assigned'] as num).toInt() > 0) ...[
          const SizedBox(height: 12),
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [DriverTheme.primary, DriverTheme.primaryDark]),
              borderRadius: BorderRadius.circular(14),
              boxShadow: [BoxShadow(color: DriverTheme.primary.withValues(alpha: 0.35), blurRadius: 12, offset: const Offset(0, 4))],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.info_outline_rounded, color: Colors.white, size: 22),
                const SizedBox(width: 10),
                Text('طلبات لم توصل: ${_stats!['assigned']}', style: GoogleFonts.cairo(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15)),
              ],
            ),
          ),
        ],
        const SizedBox(height: 12),
        Expanded(
          child: _loading
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SizedBox(width: 48, height: 48, child: CircularProgressIndicator(strokeWidth: 3, color: DriverTheme.primary)),
                      const SizedBox(height: 20),
                      Text('جاري التحميل...', style: DriverTheme.bodyMedium),
                    ],
                  ),
                )
              : _orders.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.history_rounded, size: 64, color: DriverTheme.primary.withValues(alpha: 0.4)),
                          const SizedBox(height: 16),
                          Text(_showDelivered ? 'لا توجد طلبات موصّلة' : 'لا توجد طلبات مرتجعة', style: DriverTheme.titleMedium),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      color: DriverTheme.primary,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _orders.length,
                        itemBuilder: (_, i) {
                          final o = _orders[i] as Map<String, dynamic>;
                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(18),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(color: DriverTheme.outline.withValues(alpha: 0.5)),
                              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4))],
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text('#${o['ShipmentNumber']}', style: GoogleFonts.cairo(fontWeight: FontWeight.w800, color: DriverTheme.primary, fontSize: 16)),
                                    if (_showDelivered)
                                      Text(formatIQD(o['TotalIQD'] ?? o['totaliqd']), style: GoogleFonts.cairo(fontWeight: FontWeight.w700, color: DriverTheme.success)),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(o['CustomerName'] ?? '—', style: GoogleFonts.cairo(fontSize: 15, fontWeight: FontWeight.w600)),
                                if (o['Address'] != null)
                                  Text(
                                    (o['Address'] as String).length > 80 ? '${(o['Address'] as String).substring(0, 80)}...' : (o['Address'] ?? '—'),
                                    style: GoogleFonts.cairo(fontSize: 13, color: DriverTheme.onSurfaceVariant),
                                  ),
                                if (o['RegionName'] != null)
                                  Text(o['RegionName'] ?? '', style: GoogleFonts.cairo(fontSize: 12, color: DriverTheme.onSurfaceVariant)),
                                if (!_showDelivered && o['ReturnReason'] != null)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 8),
                                    child: Row(
                                      children: [
                                        Icon(Icons.error_outline_rounded, size: 16, color: DriverTheme.danger),
                                        const SizedBox(width: 6),
                                        Expanded(
                                          child: Text('سبب الإرجاع: ${o['ReturnReason']}', style: GoogleFonts.cairo(fontSize: 13, color: DriverTheme.danger, fontWeight: FontWeight.w600)),
                                        ),
                                      ],
                                    ),
                                  ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    Icon(Icons.access_time_rounded, size: 14, color: DriverTheme.onSurfaceVariant),
                                    const SizedBox(width: 6),
                                    Text(
                                      _showDelivered ? 'التوصيل: ${_formatDateTime(o['DeliveredDate']?.toString())}' : 'الإرجاع: ${_formatDateTime(o['ReturnedDate']?.toString())}',
                                      style: GoogleFonts.cairo(fontSize: 12, color: DriverTheme.onSurfaceVariant),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
        ),
      ],
    );
  }
}
