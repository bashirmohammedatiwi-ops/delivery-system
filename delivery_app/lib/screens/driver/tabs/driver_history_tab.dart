import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../../services/driver_api.dart';
import '../driver_app.dart';
import '../driver_theme.dart';
import '../driver_ui_kit.dart';

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
    final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
    final dateLabel = DateFormat('yMMMd', 'ar_IQ').format(DateTime.tryParse('$_date 12:00:00') ?? DateTime.now());

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
          child: DriverUiKit.dateNavigator(
            label: dateLabel,
            onPrev: () {
              setState(() => _date = _addDays(_date, -1));
              _load();
            },
            onNext: _date == today
                ? null
                : () {
                    setState(() => _date = _addDays(_date, 1));
                    _load();
                  },
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: DriverUiKit.segmentPills<bool>(
            options: const [
              (true, 'الموصّل', Icons.check_circle_rounded),
              (false, 'المراجع', Icons.undo_rounded),
            ],
            selected: _showDelivered,
            onChanged: (v) {
              setState(() {
                _showDelivered = v;
                _load();
              });
            },
            accent: _showDelivered ? DriverTheme.success : DriverTheme.danger,
          ),
        ),
        if (_stats?['assigned'] != null && (_stats!['assigned'] as num).toInt() > 0) ...[
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: DriverUiKit.infoBanner(
              message: 'طلبات لم تُوصَّل بعد: ${_stats!['assigned']}',
              color: DriverTheme.warning,
              icon: Icons.info_outline_rounded,
            ),
          ),
        ],
        if (!_loading && _orders.isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Row(
              children: [
                DriverUiKit.statTile(
                  label: _showDelivered ? 'موصّل' : 'راجع',
                  value: '${_orders.length}',
                  icon: _showDelivered ? Icons.check_circle_rounded : Icons.undo_rounded,
                  color: _showDelivered ? DriverTheme.success : DriverTheme.danger,
                ),
                const SizedBox(width: 10),
                DriverUiKit.statTile(
                  label: 'التاريخ',
                  value: _date.split('-').reversed.take(2).join('/'),
                  icon: Icons.calendar_today_rounded,
                  color: DriverTheme.info,
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 8),
        Expanded(
          child: _loading
              ? DriverUiKit.skeletonList(count: 5)
              : _orders.isEmpty
                  ? DriverUiKit.emptyState(
                      icon: Icons.history_rounded,
                      title: _showDelivered ? 'لا توجد طلبات موصّلة' : 'لا توجد طلبات مرتجعة',
                      subtitle: 'جرّب تاريخاً آخر',
                      accent: DriverTheme.info,
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      color: DriverTheme.primary,
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                        itemCount: _orders.length,
                        itemBuilder: (_, i) {
                          final o = _orders[i] as Map<String, dynamic>;
                          final accent = _showDelivered ? DriverTheme.success : DriverTheme.danger;
                          return DriverUiKit.listCard(
                            accent: accent,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text('#${o['ShipmentNumber']}', style: GoogleFonts.cairo(fontWeight: FontWeight.w800, color: DriverTheme.primary, fontSize: 16)),
                                    ),
                                    if (_showDelivered)
                                      Text(formatIQD(o['TotalIQD'] ?? o['totaliqd']), style: GoogleFonts.cairo(fontWeight: FontWeight.w700, color: DriverTheme.success)),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(o['CustomerName'] ?? '—', style: GoogleFonts.cairo(fontSize: 15, fontWeight: FontWeight.w700)),
                                if (o['Address'] != null) ...[
                                  const SizedBox(height: 4),
                                  Text('${o['Address']}', style: GoogleFonts.cairo(fontSize: 12, color: DriverTheme.onSurfaceVariant), maxLines: 2, overflow: TextOverflow.ellipsis),
                                ],
                                if (o['RegionName'] != null) ...[
                                  const SizedBox(height: 6),
                                  DriverUiKit.statusChip('${o['RegionName']}', DriverTheme.secondary),
                                ],
                                if (!_showDelivered && o['ReturnReason'] != null) ...[
                                  const SizedBox(height: 10),
                                  DriverUiKit.infoBanner(message: 'سبب الإرجاع: ${o['ReturnReason']}', color: DriverTheme.danger, icon: Icons.error_outline_rounded),
                                ],
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
