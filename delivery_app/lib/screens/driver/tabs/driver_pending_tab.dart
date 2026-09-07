import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../../services/driver_api.dart';
import '../driver_app.dart';
import '../driver_theme.dart';
import '../driver_ui_kit.dart';

class DriverPendingTab extends StatefulWidget {
  const DriverPendingTab({super.key});

  @override
  State<DriverPendingTab> createState() => _DriverPendingTabState();
}

class _DriverPendingTabState extends State<DriverPendingTab> {
  List<dynamic> _days = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  String _addDays(String d, int delta) {
    final dt = DateTime.tryParse('$d 12:00:00') ?? DateTime.now();
    return DateFormat('yyyy-MM-dd').format(dt.add(Duration(days: delta)));
  }

  String _getLocalDateStr([DateTime? d]) {
    d ??= DateTime.now();
    return DateFormat('yyyy-MM-dd').format(d);
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final today = _getLocalDateStr();
      final weekAgo = DateTime.now().subtract(const Duration(days: 6));
      final dateFrom = _getLocalDateStr(weekAgo);
      final list = await DriverApi.getPendingOrders(dateFrom, today);
      final filtered = (list is List ? list : []).where((d) {
        final m = d as Map<String, dynamic>;
        final k = (m['countKarkh'] ?? 0) as num;
        final r = (m['countRusafa'] ?? 0) as num;
        return (k.toInt() + r.toInt()) > 0;
      }).toList();
      setState(() {
        _days = filtered;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  String _formatDateFull(String d) {
    final dt = DateTime.tryParse('$d 12:00:00') ?? DateTime.now();
    return DateFormat('EEEE، d MMMM yyyy', 'ar').format(dt);
  }

  void _showPendingOrdersList(BuildContext context, String date, String area) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _PendingOrdersListSheet(date: date, area: area),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return DriverUiKit.skeletonList(count: 4, cardHeight: 160);
    if (_days.isEmpty) {
      return DriverUiKit.emptyState(
        icon: Icons.schedule_rounded,
        title: 'لا توجد طلبات منتظرة',
        subtitle: 'ستظهر هنا الطلبات الجاهزة للاستلام خلال آخر 7 أيام',
        accent: DriverTheme.warning,
      );
    }

    final totalPending = _days.fold<int>(0, (sum, d) {
      final m = d as Map<String, dynamic>;
      return sum + ((m['countKarkh'] ?? 0) as num).toInt() + ((m['countRusafa'] ?? 0) as num).toInt();
    });

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
          child: Row(
            children: [
              DriverUiKit.statTile(label: 'الأيام', value: '${_days.length}', icon: Icons.calendar_month_rounded, color: DriverTheme.warning),
              const SizedBox(width: 10),
              DriverUiKit.statTile(label: 'إجمالي المنتظر', value: '$totalPending', icon: Icons.inventory_2_outlined, color: DriverTheme.primary),
            ],
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _load,
            color: DriverTheme.primary,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              children: [
                DriverUiKit.infoBanner(
                  message: 'اضغط على الكرخ أو الرصافة لعرض تفاصيل الطلبات',
                  color: DriverTheme.secondary,
                  icon: Icons.touch_app_outlined,
                ),
                const SizedBox(height: 14),
                ..._days.map((d) {
                  final m = d as Map<String, dynamic>;
                  final orderDate = m['orderDate'] ?? '';
                  final karkh = (m['countKarkh'] ?? 0) as num;
                  final rusafa = (m['countRusafa'] ?? 0) as num;
                  final total = karkh.toInt() + rusafa.toInt();
                  return DriverUiKit.listCard(
                    accent: DriverTheme.warning,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(_formatDateFull(orderDate), style: GoogleFonts.cairo(fontWeight: FontWeight.w800, fontSize: 16)),
                            ),
                            DriverUiKit.statusChip('$total طلب', DriverTheme.warning),
                          ],
                        ),
                        const SizedBox(height: 14),
                        Row(
                          children: [
                            Expanded(
                              child: DriverUiKit.areaCountTile(
                                label: 'الكرخ',
                                count: karkh.toInt(),
                                color: DriverTheme.karkh,
                                onTap: () => _showPendingOrdersList(context, orderDate, 'الكرخ'),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: DriverUiKit.areaCountTile(
                                label: 'الرصافة',
                                count: rusafa.toInt(),
                                color: DriverTheme.rusafa,
                                onTap: () => _showPendingOrdersList(context, orderDate, 'الرصافة'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _PendingOrdersListSheet extends StatefulWidget {
  final String date;
  final String area;

  const _PendingOrdersListSheet({required this.date, required this.area});

  @override
  State<_PendingOrdersListSheet> createState() => _PendingOrdersListSheetState();
}

class _PendingOrdersListSheetState extends State<_PendingOrdersListSheet> {
  List<dynamic> _orders = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final list = await DriverApi.getPendingOrdersList(widget.date, widget.area);
      setState(() {
        _orders = list is List ? list : [];
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  String _formatDate(String d) {
    final dt = DateTime.tryParse('$d 12:00:00') ?? DateTime.now();
    return DateFormat('EEEE، d MMMM', 'ar').format(dt);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.72),
      decoration: BoxDecoration(
        color: DriverTheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(DriverTheme.radiusXl)),
      ),
      child: Column(
        children: [
          DriverUiKit.bottomSheetHeader(
            title: '${widget.area} · ${_formatDate(widget.date)}',
            onClose: () => Navigator.pop(context),
          ),
          Expanded(
            child: _loading
                ? DriverUiKit.skeletonList(count: 4, cardHeight: 110)
                : _orders.isEmpty
                    ? DriverUiKit.emptyState(
                        icon: Icons.inbox_outlined,
                        title: 'لا توجد طلبات',
                        subtitle: 'لا توجد شحنات في هذه المنطقة لهذا اليوم',
                        accent: DriverTheme.primary,
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
                        itemCount: _orders.length,
                        itemBuilder: (_, i) {
                          final o = _orders[i] as Map<String, dynamic>;
                          return DriverUiKit.listCard(
                            accent: widget.area == 'الكرخ' ? DriverTheme.karkh : DriverTheme.rusafa,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text('#${o['ShipmentNumber']}', style: GoogleFonts.cairo(fontWeight: FontWeight.w800, color: DriverTheme.primary, fontSize: 16)),
                                    ),
                                    Text(formatIQD(o['TotalIQD'] ?? o['totaliqd']), style: GoogleFonts.cairo(fontWeight: FontWeight.w700, color: DriverTheme.success)),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(o['CustomerName'] ?? '—', style: GoogleFonts.cairo(fontSize: 15, fontWeight: FontWeight.w700)),
                                if (o['Address'] != null) ...[
                                  const SizedBox(height: 4),
                                  Text('${o['Address']}', style: GoogleFonts.cairo(fontSize: 12, color: DriverTheme.onSurfaceVariant), maxLines: 2, overflow: TextOverflow.ellipsis),
                                ],
                                if (o['StoreName'] != null && '${o['StoreName']}'.isNotEmpty) ...[
                                  const SizedBox(height: 6),
                                  DriverUiKit.statusChip('${o['StoreName']}', DriverTheme.secondary),
                                ],
                              ],
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
