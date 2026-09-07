import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../utils/driver_order_utils.dart';
import '../../../services/driver_api.dart';
import '../driver_app.dart';
import '../driver_theme.dart';
import '../../../widgets/app_layout.dart';
import '../driver_ui_kit.dart';

enum _OrderFilter { all, active, deferred }

class DriverOrdersTab extends StatefulWidget {
  final VoidCallback? onChanged;
  final ValueChanged<int>? onDeferredCountChanged;

  const DriverOrdersTab({super.key, this.onChanged, this.onDeferredCountChanged});

  @override
  State<DriverOrdersTab> createState() => _DriverOrdersTabState();
}

class _DriverOrdersTabState extends State<DriverOrdersTab> {
  List<dynamic> _orders = [];
  bool _loading = true;
  String? _error;
  _OrderFilter _filter = _OrderFilter.active;

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
      final list = await DriverApi.getOrders();
      if (!mounted) return;
      setState(() {
        _orders = list;
        _loading = false;
      });
      widget.onDeferredCountChanged?.call(_deferredCount);
      widget.onChanged?.call();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  List<Map<String, dynamic>> get _filtered {
    return _orders
        .map((o) => o as Map<String, dynamic>)
        .where((o) {
          final deferred = isDeferredOrder(o);
          return switch (_filter) {
            _OrderFilter.all => true,
            _OrderFilter.active => !deferred,
            _OrderFilter.deferred => deferred,
          };
        })
        .toList();
  }

  int get _deferredCount => _orders.where((o) => isDeferredOrder(o as Map<String, dynamic>)).length;

  int get _activeCount => _orders.length - _deferredCount;

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return DriverUiKit.skeletonList();
    }
    if (_error != null) {
      return DriverUiKit.emptyState(
        icon: Icons.cloud_off_rounded,
        title: 'تعذّر تحميل الطلبات',
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

    final filtered = _filtered;
    final totalAmount = filtered.fold<double>(0, (sum, o) {
      final v = o['TotalIQD'] ?? o['totaliqd'] ?? 0;
      return sum + ((v is num) ? v.toDouble() : double.tryParse('$v') ?? 0);
    });

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              DriverUiKit.statTileRow([
                DriverUiKit.statTile(
                  expanded: false,
                  label: 'نشطة',
                  value: '$_activeCount',
                  icon: Icons.inventory_2_rounded,
                  color: DriverTheme.primary,
                ),
                DriverUiKit.statTile(
                  expanded: false,
                  label: 'مؤجلة',
                  value: '$_deferredCount',
                  icon: Icons.pause_circle_rounded,
                  color: DriverTheme.warning,
                ),
                DriverUiKit.statTile(
                  expanded: false,
                  label: 'المبالغ',
                  value: formatIQD(totalAmount),
                  icon: Icons.payments_rounded,
                  color: DriverTheme.success,
                ),
              ]),
              const SizedBox(height: 12),
              DriverUiKit.segmentPills<_OrderFilter>(
                options: const [
                  (_OrderFilter.active, 'نشطة', Icons.play_circle_outline_rounded),
                  (_OrderFilter.deferred, 'مؤجلة', Icons.pause_circle_outline_rounded),
                  (_OrderFilter.all, 'الكل', Icons.list_rounded),
                ],
                selected: _filter,
                onChanged: (v) => setState(() => _filter = v),
                accent: DriverTheme.primary,
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Expanded(
          child: _orders.isEmpty
              ? DriverUiKit.emptyState(
                  icon: Icons.inventory_2_outlined,
                  title: 'لا توجد طلبات معك',
                  subtitle: 'سيظهر هنا ما يُعيَّن لك من الشحنات',
                  accent: DriverTheme.primary,
                )
              : filtered.isEmpty
                  ? DriverUiKit.emptyState(
                      icon: _filter == _OrderFilter.deferred ? Icons.pause_circle_outline_rounded : Icons.filter_list_off_rounded,
                      title: _filter == _OrderFilter.deferred ? 'لا توجد طلبات مؤجلة' : 'لا توجد طلبات في هذا العرض',
                      subtitle: _filter == _OrderFilter.deferred ? 'يمكنك تأجيل الطلب من تفاصيل الشحنة' : 'جرّب عرضاً آخر',
                      accent: DriverTheme.warning,
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      color: DriverTheme.primary,
                      child: ListView.builder(
                        padding: EdgeInsets.fromLTRB(16, 0, 16, AppLayout.scrollBottomInset(context)),
                        itemCount: filtered.length,
                        itemBuilder: (context, i) => _OrderCard(
                          order: filtered[i],
                          onTap: () => _showOrderDetail(filtered[i]),
                        ),
                      ),
                    ),
        ),
      ],
    );
  }

  void _showOrderDetail(Map<String, dynamic> order) {
    showDriverOrderDetail(context, order, onAction: () {
      Navigator.pop(context);
      _load();
    });
  }
}

class _OrderCard extends StatelessWidget {
  final Map<String, dynamic> order;
  final VoidCallback onTap;

  const _OrderCard({required this.order, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final addr = order['Address']?.toString() ?? '';
    final deferred = isDeferredOrder(order);
    final accent = deferred ? DriverTheme.warning : DriverTheme.primary;
    final reason = order['DeferredReason']?.toString() ?? order['deferredreason']?.toString() ?? '';

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(DriverTheme.radiusLg),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(DriverTheme.radiusLg),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(DriverTheme.radiusLg),
              border: Border.all(color: deferred ? DriverTheme.warning.withValues(alpha: 0.45) : DriverTheme.outline),
              boxShadow: DriverTheme.cardShadow,
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(DriverTheme.radiusLg),
              child: IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Container(width: 5, color: accent),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  decoration: BoxDecoration(
                                    gradient: deferred ? null : DriverTheme.primaryGradient,
                                    color: deferred ? DriverTheme.warning.withValues(alpha: 0.15) : null,
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Text(
                                    '#${order['ShipmentNumber']}',
                                    style: GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.w800, color: deferred ? DriverTheme.warning : Colors.white),
                                  ),
                                ),
                                if (deferred) ...[
                                  const SizedBox(width: 8),
                                  DriverUiKit.statusChip('مؤجل', DriverTheme.warning),
                                ],
                                const Spacer(),
                                Text(formatIQD(order['TotalIQD'] ?? order['totaliqd']), style: GoogleFonts.cairo(fontSize: 15, fontWeight: FontWeight.w800, color: DriverTheme.success)),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Text(order['CustomerName'] ?? '—', style: GoogleFonts.cairo(fontSize: 16, fontWeight: FontWeight.w800)),
                            if (addr.isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Text(addr, style: GoogleFonts.cairo(fontSize: 12, color: DriverTheme.onSurfaceVariant), maxLines: 2, overflow: TextOverflow.ellipsis),
                            ],
                            if (deferred && reason.isNotEmpty) ...[
                              const SizedBox(height: 8),
                              Text('⏸ $reason', style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.w700, color: DriverTheme.warning)),
                            ],
                            if (order['RegionName'] != null && (order['RegionName'] as String).isNotEmpty) ...[
                              const SizedBox(height: 8),
                              DriverUiKit.statusChip(order['RegionName'] ?? '', DriverTheme.secondary),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

void showDriverOrderDetail(BuildContext context, Map<String, dynamic> order, {VoidCallback? onAction}) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => _OrderDetailSheet(order: order, onAction: onAction ?? () => Navigator.pop(ctx)),
  );
}

class _OrderDetailSheet extends StatelessWidget {
  final Map<String, dynamic> order;
  final VoidCallback onAction;

  const _OrderDetailSheet({required this.order, required this.onAction});

  @override
  Widget build(BuildContext context) {
    final deferred = isDeferredOrder(order);
    final reason = order['DeferredReason']?.toString() ?? order['deferredreason']?.toString() ?? '';

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Container(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.85),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(DriverTheme.radiusXl)),
          boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 24, offset: Offset(0, -8))],
        ),
        child: DraggableScrollableSheet(
          initialChildSize: 0.9,
          minChildSize: 0.5,
          expand: false,
          builder: (_, controller) => ListView(
            controller: controller,
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
            children: [
              DriverUiKit.bottomSheetHeader(title: 'تفاصيل الشحنة', onClose: () => Navigator.pop(context)),
              if (deferred) ...[
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: DriverTheme.warning.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(DriverTheme.radiusMd),
                    border: Border.all(color: DriverTheme.warning.withValues(alpha: 0.35)),
                  ),
                  child: Text(
                    '⏸ طلب مؤجل${reason.isNotEmpty ? ' — $reason' : ''}',
                    style: GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.w800, color: DriverTheme.warning),
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                decoration: BoxDecoration(
                  gradient: deferred ? null : DriverTheme.primaryGradient,
                  color: deferred ? DriverTheme.warning.withValues(alpha: 0.12) : null,
                  borderRadius: BorderRadius.circular(DriverTheme.radiusMd),
                  boxShadow: deferred ? null : DriverTheme.shadowFor(DriverTheme.primary),
                  border: deferred ? Border.all(color: DriverTheme.warning.withValues(alpha: 0.35)) : null,
                ),
                child: Text(
                  '#${order['ShipmentNumber']}',
                  style: GoogleFonts.cairo(fontSize: 22, fontWeight: FontWeight.w800, color: deferred ? DriverTheme.warning : Colors.white),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 20),
              DriverUiKit.detailRow(icon: Icons.store_rounded, label: 'المحل', value: order['StoreName']?.toString()),
              DriverUiKit.detailRow(icon: Icons.person_rounded, label: 'العميل', value: order['CustomerName']?.toString()),
              DriverUiKit.detailRow(
                icon: Icons.phone_rounded,
                label: 'هاتف العميل',
                value: order['CustomerPhone']?.toString(),
                valueColor: DriverTheme.primary,
                onTap: () {
                  final phone = order['CustomerPhone']?.toString().replaceAll(RegExp(r'\D'), '') ?? '';
                  if (phone.isNotEmpty) launchUrl(Uri.parse('tel:$phone'));
                },
              ),
              DriverUiKit.detailRow(icon: Icons.location_on_rounded, label: 'العنوان', value: order['Address']?.toString()),
              if (order['CustomerLocationLink'] != null && (order['CustomerLocationLink'] as String).isNotEmpty)
                DriverUiKit.detailRow(
                  icon: Icons.map_rounded,
                  label: 'الموقع',
                  value: 'فتح على الخريطة',
                  valueColor: DriverTheme.secondary,
                  onTap: () => launchUrl(Uri.parse(order['CustomerLocationLink'])),
                ),
              DriverUiKit.detailRow(
                icon: Icons.payments_rounded,
                label: 'المبلغ',
                value: formatIQD(order['TotalIQD'] ?? order['totaliqd']),
                valueColor: DriverTheme.success,
              ),
              if (order['Notes'] != null && (order['Notes'] as String).isNotEmpty)
                DriverUiKit.detailRow(icon: Icons.note_rounded, label: 'ملاحظات', value: order['Notes']?.toString()),
              const SizedBox(height: 12),
              if (deferred)
                FilledButton.icon(
                  onPressed: () async {
                    if (!context.mounted) return;
                    if (!await _confirm(context, 'هل تريد إعادة الطلب للتوصيل الآن؟')) return;
                    try {
                      await DriverApi.resumeDeferredOrder(orderIdOf(order));
                      onAction();
                    } catch (e) {
                      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
                    }
                  },
                  icon: const Icon(Icons.play_circle_rounded, size: 22),
                  label: const Text('إلغاء التأجيل — متابعة التوصيل'),
                  style: FilledButton.styleFrom(
                    backgroundColor: DriverTheme.warning,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(DriverTheme.radiusMd)),
                  ),
                )
              else
                OutlinedButton.icon(
                  onPressed: () async {
                    final reason = await _askDeferReason(context);
                    if (reason == null || reason.trim().isEmpty) return;
                    try {
                      await DriverApi.deferOrder(orderIdOf(order), reason.trim());
                      onAction();
                    } catch (e) {
                      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
                    }
                  },
                  icon: const Icon(Icons.pause_circle_rounded, size: 22),
                  label: const Text('تأجيل الطلب'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: DriverTheme.warning,
                    side: BorderSide(color: DriverTheme.warning.withValues(alpha: 0.6)),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(DriverTheme.radiusMd)),
                  ),
                ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: deferred
                          ? null
                          : () async {
                              if (!context.mounted) return;
                              if (!await _confirm(context, 'هل تم توصيل الطلب؟')) return;
                              try {
                                await DriverApi.deliverOrder(orderIdOf(order));
                                onAction();
                              } catch (e) {
                                if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
                              }
                            },
                      icon: const Icon(Icons.check_circle_rounded, size: 22),
                      label: const Text('تم التوصيل'),
                      style: FilledButton.styleFrom(
                        backgroundColor: DriverTheme.success,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(DriverTheme.radiusMd)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: deferred
                          ? null
                          : () async {
                              final reason = await showDialog<String>(
                                context: context,
                                builder: (ctx) => SimpleDialog(
                                  title: Text('سبب الإرجاع', style: DriverTheme.titleMedium),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(DriverTheme.radiusLg)),
                                  children: ['غير متوفر', 'رفض الاستلام', 'عنوان خاطئ', 'المحل مغلق', 'أخرى']
                                      .map((r) => ListTile(title: Text(r), onTap: () => Navigator.pop(ctx, r)))
                                      .toList(),
                                ),
                              );
                              if (reason == null) return;
                              try {
                                await DriverApi.returnOrder(orderIdOf(order), reason);
                                onAction();
                              } catch (e) {
                                if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
                              }
                            },
                      icon: const Icon(Icons.undo_rounded, size: 22),
                      label: const Text('إرجاع'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: DriverTheme.danger,
                        side: const BorderSide(color: DriverTheme.danger),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(DriverTheme.radiusMd)),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

Future<String?> _askDeferReason(BuildContext context) async {
  final controller = TextEditingController();
  return showDialog<String>(
    context: context,
    builder: (ctx) => AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(DriverTheme.radiusLg)),
      title: Text('سبب التأجيل', style: DriverTheme.titleMedium),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('اكتب سبب تأجيل الطلب', style: DriverTheme.bodyLarge),
          const SizedBox(height: 12),
          TextField(
            controller: controller,
            autofocus: true,
            maxLines: 2,
            decoration: InputDecoration(
              hintText: 'مثال: العميل غير متوفر',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(DriverTheme.radiusMd)),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء')),
        FilledButton(
          onPressed: () => Navigator.pop(ctx, controller.text.trim()),
          style: FilledButton.styleFrom(backgroundColor: DriverTheme.warning),
          child: const Text('تأجيل'),
        ),
      ],
    ),
  );
}

Future<bool> _confirm(BuildContext context, String msg) async {
  return await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(DriverTheme.radiusLg)),
          title: Text('تأكيد', style: DriverTheme.titleMedium),
          content: Text(msg, style: DriverTheme.bodyLarge),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('إلغاء')),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: FilledButton.styleFrom(backgroundColor: DriverTheme.primary),
              child: const Text('نعم'),
            ),
          ],
        ),
      ) ??
      false;
}
