import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../../services/driver_api.dart';
import '../../../utils/json_helpers.dart';
import '../driver_app.dart';
import '../driver_theme.dart';
import '../../../widgets/app_layout.dart';
import '../driver_ui_kit.dart';

class DriverPendingTab extends StatefulWidget {
  const DriverPendingTab({super.key});

  @override
  State<DriverPendingTab> createState() => _DriverPendingTabState();
}

class _DriverPendingTabState extends State<DriverPendingTab> {
  List<Map<String, dynamic>> _days = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final today = await DriverApi.getToday();
      final dateFrom = DriverApi.addDays(today, -29);
      final list = await DriverApi.getPendingOrders(dateFrom, today);
      final filtered = list.map((e) => Map<String, dynamic>.from(e as Map)).where((m) {
        final k = pickFieldInt(m, ['countKarkh', 'countkarkh']);
        final r = pickFieldInt(m, ['countRusafa', 'countrusafa']);
        return k + r > 0;
      }).toList();
      if (!mounted) return;
      setState(() {
        _days = filtered;
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

  String _formatDateFull(String d) {
    final dt = DateTime.tryParse('$d 12:00:00') ?? DateTime.now();
    try {
      return DateFormat('EEEE، d MMMM yyyy', 'ar').format(dt);
    } catch (_) {
      return d;
    }
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
    if (_error != null) {
      return DriverUiKit.emptyState(
        icon: Icons.cloud_off_rounded,
        title: 'تعذّر تحميل الطلبات المنتظرة',
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
    if (_days.isEmpty) {
      return DriverUiKit.emptyState(
        icon: Icons.schedule_rounded,
        title: 'لا توجد طلبات منتظرة',
        subtitle: 'الطلبات الجديدة غير المعيّنة لسائق تظهر هنا للاستلام',
        accent: DriverTheme.warning,
        action: OutlinedButton.icon(
          onPressed: _load,
          icon: const Icon(Icons.refresh_rounded),
          label: const Text('تحديث'),
        ),
      );
    }

    final totalPending = _days.fold<int>(0, (sum, m) {
      return sum +
          pickFieldInt(m, ['countKarkh', 'countkarkh']) +
          pickFieldInt(m, ['countRusafa', 'countrusafa']);
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
              padding: EdgeInsets.fromLTRB(16, 12, 16, AppLayout.scrollBottomInset(context)),
              children: [
                DriverUiKit.infoBanner(
                  message: 'اضغط على الكرخ أو الرصافة لعرض تفاصيل الطلبات',
                  color: DriverTheme.secondary,
                  icon: Icons.touch_app_outlined,
                ),
                const SizedBox(height: 14),
                ..._days.map((m) {
                  final orderDate = pickField(m, ['orderDate', 'OrderDate']);
                  final karkh = pickFieldInt(m, ['countKarkh', 'countkarkh']);
                  final rusafa = pickFieldInt(m, ['countRusafa', 'countrusafa']);
                  final total = karkh + rusafa;
                  return DriverUiKit.listCard(
                    accent: DriverTheme.warning,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(_formatDateFull(orderDate), style: GoogleFonts.cairo(fontWeight: FontWeight.w800, fontSize: 16, height: 1.3)),
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
                                count: karkh,
                                color: DriverTheme.karkh,
                                onTap: () => _showPendingOrdersList(context, orderDate, 'الكرخ'),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: DriverUiKit.areaCountTile(
                                label: 'الرصافة',
                                count: rusafa,
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
  List<Map<String, dynamic>> _orders = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await DriverApi.getPendingOrdersList(widget.date, widget.area);
      if (!mounted) return;
      setState(() {
        _orders = list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
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

  String _formatDate(String d) {
    final dt = DateTime.tryParse('$d 12:00:00') ?? DateTime.now();
    try {
      return DateFormat('EEEE، d MMMM', 'ar').format(dt);
    } catch (_) {
      return d;
    }
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
                : _error != null
                    ? DriverUiKit.emptyState(
                        icon: Icons.cloud_off_rounded,
                        title: 'تعذّر التحميل',
                        subtitle: _error!,
                        accent: DriverTheme.danger,
                        action: FilledButton(onPressed: _load, child: const Text('إعادة المحاولة')),
                      )
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
                              final o = _orders[i];
                              final store = pickField(o, ['StoreName', 'storename']);
                              return DriverUiKit.listCard(
                                accent: widget.area == 'الكرخ' ? DriverTheme.karkh : DriverTheme.rusafa,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            '#${pickField(o, ['ShipmentNumber', 'shipmentnumber'])}',
                                            style: GoogleFonts.cairo(fontWeight: FontWeight.w800, color: DriverTheme.primary, fontSize: 16, height: 1.3),
                                          ),
                                        ),
                                        Text(
                                          formatIQD(pickFieldInt(o, ['TotalIQD', 'totaliqd'])),
                                          style: GoogleFonts.cairo(fontWeight: FontWeight.w700, color: DriverTheme.success, height: 1.3),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Text(pickField(o, ['CustomerName', 'customername'], '—'), style: GoogleFonts.cairo(fontSize: 15, fontWeight: FontWeight.w700, height: 1.3)),
                                    if (pickField(o, ['Address', 'address']).isNotEmpty) ...[
                                      const SizedBox(height: 4),
                                      Text(pickField(o, ['Address', 'address']), style: GoogleFonts.cairo(fontSize: 12, color: DriverTheme.onSurfaceVariant, height: 1.35), maxLines: 2, overflow: TextOverflow.ellipsis),
                                    ],
                                    if (store.isNotEmpty) ...[
                                      const SizedBox(height: 6),
                                      DriverUiKit.statusChip(store, DriverTheme.secondary),
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
