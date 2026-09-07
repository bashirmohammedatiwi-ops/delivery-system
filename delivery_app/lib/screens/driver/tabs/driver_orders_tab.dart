import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../services/driver_api.dart';
import '../driver_app.dart';
import '../driver_theme.dart';
import '../driver_ui_kit.dart';

class DriverOrdersTab extends StatefulWidget {
  const DriverOrdersTab({super.key});

  @override
  State<DriverOrdersTab> createState() => _DriverOrdersTabState();
}

class _DriverOrdersTabState extends State<DriverOrdersTab> {
  List<dynamic> _orders = [];
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
      final list = await DriverApi.getOrders();
      setState(() {
        _orders = list is List ? list : [];
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

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
    if (_orders.isEmpty) {
      return DriverUiKit.emptyState(
        icon: Icons.inventory_2_outlined,
        title: 'لا توجد طلبات معك',
        subtitle: 'سيظهر هنا ما يُعيَّن لك من الشحنات',
        accent: DriverTheme.primary,
      );
    }

    final totalAmount = _orders.fold<double>(0, (sum, o) {
      final m = o as Map<String, dynamic>;
      final v = m['TotalIQD'] ?? m['totaliqd'] ?? 0;
      return sum + ((v is num) ? v.toDouble() : double.tryParse('$v') ?? 0);
    });

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
          child: Row(
            children: [
              DriverUiKit.statTile(
                label: 'الطلبات',
                value: '${_orders.length}',
                icon: Icons.inventory_2_rounded,
                color: DriverTheme.primary,
              ),
              const SizedBox(width: 10),
              DriverUiKit.statTile(
                label: 'إجمالي المبالغ',
                value: formatIQD(totalAmount),
                icon: Icons.payments_rounded,
                color: DriverTheme.success,
              ),
            ],
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _load,
            color: DriverTheme.primary,
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              itemCount: _orders.length,
              itemBuilder: (context, i) {
                final o = _orders[i] as Map<String, dynamic>;
                return _OrderCard(order: o, onTap: () => _showOrderDetail(o));
              },
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
              border: Border.all(color: DriverTheme.outline),
              boxShadow: DriverTheme.cardShadow,
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(DriverTheme.radiusLg),
              child: IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Container(width: 5, color: DriverTheme.primary),
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
                                    gradient: DriverTheme.primaryGradient,
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Text('#${order['ShipmentNumber']}', style: GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white)),
                                ),
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
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                decoration: BoxDecoration(
                  gradient: DriverTheme.primaryGradient,
                  borderRadius: BorderRadius.circular(DriverTheme.radiusMd),
                  boxShadow: DriverTheme.shadowFor(DriverTheme.primary),
                ),
                child: Text('#${order['ShipmentNumber']}', style: GoogleFonts.cairo(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white), textAlign: TextAlign.center),
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
              Row(
                children: [
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () async {
                        if (!context.mounted) return;
                        if (!await _confirm(context, 'هل تم توصيل الطلب؟')) return;
                        try {
                          await DriverApi.deliverOrder((order['OrderID'] ?? order['orderid']).toInt());
                          onAction();
                        } catch (e) {
                          if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
                        }
                      },
                      icon: const Icon(Icons.check_circle_rounded, size: 22),
                      label: const Text('تم التوصيل'),
                      style: FilledButton.styleFrom(
                        backgroundColor: DriverTheme.success,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(DriverTheme.radiusMd)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () async {
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
                          await DriverApi.returnOrder((order['OrderID'] ?? order['orderid']).toInt(), reason);
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
  ) ?? false;
}
