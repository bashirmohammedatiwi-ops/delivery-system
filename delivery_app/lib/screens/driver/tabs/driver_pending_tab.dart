import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../../services/driver_api.dart';
import '../driver_app.dart';
import '../driver_theme.dart';

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
    if (_loading) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(width: 48, height: 48, child: CircularProgressIndicator(strokeWidth: 3, color: DriverTheme.primary)),
            const SizedBox(height: 20),
            Text('جاري التحميل...', style: DriverTheme.bodyMedium),
          ],
        ),
      );
    }
    if (_days.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(40),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(28),
                decoration: BoxDecoration(
                  color: DriverTheme.primary.withValues(alpha: 0.08),
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.schedule_rounded, size: 64, color: DriverTheme.primary.withValues(alpha: 0.6)),
              ),
              const SizedBox(height: 24),
              Text('لا توجد طلبات منتظرة', style: DriverTheme.titleMedium),
              const SizedBox(height: 8),
              Text('ستظهر هنا الطلبات الجاهزة للاستلام', style: DriverTheme.bodyMedium),
            ],
          ),
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      color: DriverTheme.primary,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topRight,
                end: Alignment.bottomLeft,
                colors: [DriverTheme.primary.withValues(alpha: 0.15), DriverTheme.primary.withValues(alpha: 0.05)],
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: DriverTheme.primary.withValues(alpha: 0.2)),
            ),
            child: Column(
              children: [
                Text('الطلبات المنتظرة للاستلام', style: GoogleFonts.cairo(fontSize: 20, fontWeight: FontWeight.w800, color: DriverTheme.onSurface)),
                const SizedBox(height: 6),
                Text('اضغط على الكرخ أو الرصافة لرؤية الطلبات', style: GoogleFonts.cairo(fontSize: 14, color: DriverTheme.onSurfaceVariant)),
              ],
            ),
          ),
          const SizedBox(height: 24),
          ..._days.map((d) {
            final m = d as Map<String, dynamic>;
            final orderDate = m['orderDate'] ?? '';
            final karkh = (m['countKarkh'] ?? 0) as num;
            final rusafa = (m['countRusafa'] ?? 0) as num;
            final total = karkh.toInt() + rusafa.toInt();
            return Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 16, offset: const Offset(0, 4)),
                  ],
                  border: Border.all(color: DriverTheme.outline.withValues(alpha: 0.5)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      _formatDateFull(orderDate),
                      style: GoogleFonts.cairo(fontWeight: FontWeight.w800, fontSize: 16, color: DriverTheme.onSurface),
                    ),
                    const SizedBox(height: 18),
                    Row(
                      children: [
                        Expanded(
                          child: Material(
                            color: Colors.transparent,
                            child: InkWell(
                              onTap: () => _showPendingOrdersList(context, orderDate, 'الكرخ'),
                              borderRadius: BorderRadius.circular(16),
                              child: Container(
                                padding: const EdgeInsets.all(20),
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                    colors: [DriverTheme.karkh.withValues(alpha: 0.15), DriverTheme.karkh.withValues(alpha: 0.05)],
                                  ),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: DriverTheme.karkh.withValues(alpha: 0.3)),
                                ),
                                child: Column(
                                  children: [
                                    Text('${karkh.toInt()}', style: GoogleFonts.cairo(fontSize: 28, fontWeight: FontWeight.w800, color: DriverTheme.karkh)),
                                    const SizedBox(height: 4),
                                    Text('الكرخ', style: GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.w600, color: DriverTheme.karkh)),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Material(
                            color: Colors.transparent,
                            child: InkWell(
                              onTap: () => _showPendingOrdersList(context, orderDate, 'الرصافة'),
                              borderRadius: BorderRadius.circular(16),
                              child: Container(
                                padding: const EdgeInsets.all(20),
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                    colors: [DriverTheme.rusafa.withValues(alpha: 0.15), DriverTheme.rusafa.withValues(alpha: 0.05)],
                                  ),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: DriverTheme.rusafa.withValues(alpha: 0.3)),
                                ),
                                child: Column(
                                  children: [
                                    Text('${rusafa.toInt()}', style: GoogleFonts.cairo(fontSize: 28, fontWeight: FontWeight.w800, color: DriverTheme.rusafa)),
                                    const SizedBox(height: 4),
                                    Text('الرصافة', style: GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.w600, color: DriverTheme.rusafa)),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Center(
                      child: Text('المجموع: $total طلب', style: GoogleFonts.cairo(fontSize: 13, color: DriverTheme.onSurfaceVariant, fontWeight: FontWeight.w600)),
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
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
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.7),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 24, offset: Offset(0, -8))],
      ),
      child: Column(
        children: [
          const SizedBox(height: 12),
          Container(width: 44, height: 4, decoration: BoxDecoration(color: DriverTheme.outline, borderRadius: BorderRadius.circular(2))),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('${widget.area} - ${_formatDate(widget.date)}', style: GoogleFonts.cairo(fontSize: 18, fontWeight: FontWeight.w800)),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.pop(context),
                  style: IconButton.styleFrom(backgroundColor: DriverTheme.outline.withValues(alpha: 0.5)),
                ),
              ],
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: DriverTheme.primary))
                : _orders.isEmpty
                    ? Center(child: Text('لا توجد طلبات', style: DriverTheme.bodyMedium))
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        itemCount: _orders.length,
                        itemBuilder: (_, i) {
                          final o = _orders[i] as Map<String, dynamic>;
                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: DriverTheme.surface,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: DriverTheme.outline.withValues(alpha: 0.5)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text('#${o['ShipmentNumber']}', style: GoogleFonts.cairo(fontWeight: FontWeight.w800, color: DriverTheme.primary, fontSize: 16)),
                                    Text(formatIQD(o['TotalIQD'] ?? o['totaliqd']), style: GoogleFonts.cairo(fontWeight: FontWeight.w700, color: DriverTheme.success)),
                                  ],
                                ),
                                Text(o['CustomerName'] ?? '—', style: GoogleFonts.cairo(fontSize: 14)),
                                if (o['Address'] != null) Text(o['Address'] ?? '', style: GoogleFonts.cairo(fontSize: 12, color: DriverTheme.onSurfaceVariant)),
                                if (o['RegionName'] != null) Text(o['RegionName'] ?? '', style: GoogleFonts.cairo(fontSize: 11, color: DriverTheme.onSurfaceVariant)),
                                if (o['StoreName'] != null && (o['StoreName'] as String).isNotEmpty)
                                  Text(o['StoreName'] ?? '', style: GoogleFonts.cairo(fontSize: 11, color: DriverTheme.onSurfaceVariant)),
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
