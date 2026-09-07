import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../../services/driver_api.dart';
import '../../../utils/json_helpers.dart';
import '../driver_app.dart';
import '../driver_theme.dart';
import '../../../widgets/app_layout.dart';
import '../driver_ui_kit.dart';

class DriverHistoryTab extends StatefulWidget {
  const DriverHistoryTab({super.key});

  @override
  State<DriverHistoryTab> createState() => _DriverHistoryTabState();
}

class _DriverHistoryTabState extends State<DriverHistoryTab> {
  List<Map<String, dynamic>> _orders = [];
  Map<String, dynamic>? _stats;
  bool _loading = true;
  String? _error;
  String _date = '';
  String _today = '';
  bool _showDelivered = true;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    _today = await DriverApi.getToday();
    if (!mounted) return;
    setState(() => _date = _today);
    await _load();
  }

  String _formatDateTime(String? d) {
    if (d == null || d.isEmpty) return '—';
    try {
      final dt = DateTime.tryParse(d.replaceFirst(' ', 'T'));
      if (dt == null) return d;
      return DateFormat('d MMM، HH:mm', 'ar').format(dt);
    } catch (_) {
      return d;
    }
  }

  String _dateLabel(String date) {
    final dt = DateTime.tryParse('$date 12:00:00') ?? DateTime.now();
    try {
      return DateFormat('yMMMd', 'ar').format(dt);
    } catch (_) {
      return date;
    }
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      if (_today.isEmpty) _today = await DriverApi.getToday();
      final list = _showDelivered
          ? await DriverApi.getDeliveredOrders(_date)
          : await DriverApi.getReturnedOrders(_date);
      final stats = await DriverApi.getStats(_date);
      if (!mounted) return;
      setState(() {
        _orders = list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        _stats = stats;
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

  @override
  Widget build(BuildContext context) {
    final dateLabel = _dateLabel(_date);

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
          child: DriverUiKit.dateNavigator(
            label: dateLabel,
            onPrev: () {
              setState(() => _date = DriverApi.addDays(_date, -1));
              _load();
            },
            onNext: _date == _today
                ? null
                : () {
                    setState(() => _date = DriverApi.addDays(_date, 1));
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
              setState(() => _showDelivered = v);
              _load();
            },
            accent: _showDelivered ? DriverTheme.success : DriverTheme.danger,
          ),
        ),
        if (pickFieldInt(_stats ?? {}, ['assigned']) > 0) ...[
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: DriverUiKit.infoBanner(
              message: 'طلبات لم تُوصَّل بعد: ${pickFieldInt(_stats!, ['assigned'])}',
              color: DriverTheme.warning,
              icon: Icons.info_outline_rounded,
            ),
          ),
        ],
        if (!_loading && _error == null && _orders.isNotEmpty) ...[
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
              : _error != null
                  ? DriverUiKit.emptyState(
                      icon: Icons.cloud_off_rounded,
                      title: 'تعذّر تحميل السجل',
                      subtitle: _error!,
                      accent: DriverTheme.danger,
                      action: FilledButton.icon(
                        onPressed: _load,
                        icon: const Icon(Icons.refresh_rounded),
                        label: const Text('إعادة المحاولة'),
                        style: FilledButton.styleFrom(backgroundColor: DriverTheme.primary),
                      ),
                    )
                  : _orders.isEmpty
                      ? DriverUiKit.emptyState(
                          icon: Icons.history_rounded,
                          title: _showDelivered ? 'لا توجد طلبات موصّلة' : 'لا توجد طلبات مرتجعة',
                          subtitle: 'السجل حسب تاريخ إنشاء الطلب · جرّب تاريخاً آخر',
                          accent: DriverTheme.info,
                        )
                      : RefreshIndicator(
                          onRefresh: _load,
                          color: DriverTheme.primary,
                          child: ListView.builder(
                            padding: EdgeInsets.fromLTRB(16, 4, 16, AppLayout.scrollBottomInset(context)),
                            itemCount: _orders.length,
                            itemBuilder: (_, i) {
                              final o = _orders[i];
                              final accent = _showDelivered ? DriverTheme.success : DriverTheme.danger;
                              final when = _showDelivered
                                  ? pickField(o, ['DeliveredDate', 'delivereddate'])
                                  : pickField(o, ['ReturnedDate', 'returneddate']);
                              final region = pickField(o, ['RegionName', 'regionname']);
                              final reason = pickField(o, ['ReturnReason', 'returnreason']);
                              return DriverUiKit.listCard(
                                accent: accent,
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
                                        if (_showDelivered)
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
                                    if (region.isNotEmpty) ...[
                                      const SizedBox(height: 6),
                                      DriverUiKit.statusChip(region, DriverTheme.secondary),
                                    ],
                                    if (!_showDelivered && reason.isNotEmpty) ...[
                                      const SizedBox(height: 10),
                                      DriverUiKit.infoBanner(message: 'سبب الإرجاع: $reason', color: DriverTheme.danger, icon: Icons.error_outline_rounded),
                                    ],
                                    const SizedBox(height: 8),
                                    Row(
                                      children: [
                                        Icon(Icons.access_time_rounded, size: 14, color: DriverTheme.onSurfaceVariant),
                                        const SizedBox(width: 6),
                                        Expanded(
                                          child: Text(
                                            _showDelivered ? 'التوصيل: ${_formatDateTime(when)}' : 'الإرجاع: ${_formatDateTime(when)}',
                                            style: GoogleFonts.cairo(fontSize: 12, color: DriverTheme.onSurfaceVariant, height: 1.3),
                                          ),
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
