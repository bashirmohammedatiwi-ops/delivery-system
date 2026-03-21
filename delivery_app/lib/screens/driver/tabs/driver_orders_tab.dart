import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../services/driver_api.dart';
import '../driver_app.dart';
import '../driver_theme.dart';

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
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 48,
              height: 48,
              child: CircularProgressIndicator(strokeWidth: 3, color: DriverTheme.primary),
            ),
            const SizedBox(height: 20),
            Text('جاري تحميل الطلبات...', style: DriverTheme.bodyMedium),
          ],
        ),
      );
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.error_outline_rounded, size: 64, color: DriverTheme.danger.withValues(alpha: 0.5)),
              const SizedBox(height: 20),
              Text(_error!, style: DriverTheme.bodyLarge.copyWith(color: DriverTheme.danger), textAlign: TextAlign.center),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: _load,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('إعادة المحاولة'),
                style: FilledButton.styleFrom(
                  backgroundColor: DriverTheme.primary,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ],
          ),
        ),
      );
    }
    if (_orders.isEmpty) {
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
                child: Icon(Icons.inventory_2_outlined, size: 64, color: DriverTheme.primary.withValues(alpha: 0.6)),
              ),
              const SizedBox(height: 24),
              Text('لا توجد طلبات معك حالياً', style: DriverTheme.titleMedium),
              const SizedBox(height: 8),
              Text('سيظهر هنا الطلبات المعينة لك', style: DriverTheme.bodyMedium),
            ],
          ),
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      color: DriverTheme.primary,
      child: ListView.builder(
        padding: const EdgeInsets.all(20),
        itemCount: _orders.length,
        itemBuilder: (context, i) {
          final o = _orders[i] as Map<String, dynamic>;
          return _OrderCard(order: o, onTap: () => _showOrderDetail(o));
        },
      ),
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
      padding: const EdgeInsets.only(bottom: 14),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        elevation: 0,
        shadowColor: Colors.black.withValues(alpha: 0.06),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(20),
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: DriverTheme.outline.withValues(alpha: 0.5)),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Colors.white,
                  DriverTheme.primary.withValues(alpha: 0.02),
                ],
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(colors: [DriverTheme.primary, DriverTheme.primaryDark]),
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(color: DriverTheme.primary.withValues(alpha: 0.3), blurRadius: 8, offset: const Offset(0, 2)),
                        ],
                      ),
                      child: Text('#${order['ShipmentNumber']}', style: GoogleFonts.cairo(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white)),
                    ),
                    const Spacer(),
                    Text(
                      formatIQD(order['TotalIQD'] ?? order['totaliqd']),
                      style: GoogleFonts.cairo(fontSize: 16, fontWeight: FontWeight.w700, color: DriverTheme.success),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  order['CustomerName'] ?? '—',
                  style: GoogleFonts.cairo(fontSize: 15, fontWeight: FontWeight.w700, color: DriverTheme.onSurface),
                ),
                if (addr.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    addr.length > 55 ? '${addr.substring(0, 55)}...' : addr,
                    style: GoogleFonts.cairo(fontSize: 13, color: DriverTheme.onSurfaceVariant, height: 1.4),
                  ),
                ],
                if (order['RegionName'] != null && (order['RegionName'] as String).isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(Icons.location_on_outlined, size: 14, color: DriverTheme.primary),
                      const SizedBox(width: 6),
                      Text(order['RegionName'] ?? '', style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.w600, color: DriverTheme.primary)),
                    ],
                  ),
                ],
              ],
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
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 24, offset: Offset(0, -8))],
        ),
        child: DraggableScrollableSheet(
          initialChildSize: 0.9,
          minChildSize: 0.5,
          expand: false,
          builder: (_, controller) => ListView(
            controller: controller,
            padding: const EdgeInsets.all(24),
            children: [
              Center(
                child: Container(width: 44, height: 4, decoration: BoxDecoration(color: DriverTheme.outline, borderRadius: BorderRadius.circular(2))),
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: [DriverTheme.primary, DriverTheme.primaryDark]),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [BoxShadow(color: DriverTheme.primary.withValues(alpha: 0.35), blurRadius: 16, offset: const Offset(0, 4))],
                ),
                child: Text('#${order['ShipmentNumber']}', style: GoogleFonts.cairo(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white)),
              ),
              const SizedBox(height: 24),
              _DetailRow(icon: Icons.store_rounded, label: 'المحل', value: order['StoreName']),
              _DetailRow(icon: Icons.person_rounded, label: 'العميل', value: order['CustomerName']),
              _PhoneRow(icon: Icons.phone_rounded, label: 'هاتف العميل', value: order['CustomerPhone']),
              _DetailRow(icon: Icons.location_on_rounded, label: 'العنوان', value: order['Address']),
              if (order['CustomerLocationLink'] != null && (order['CustomerLocationLink'] as String).isNotEmpty)
                _LinkRow(url: order['CustomerLocationLink'], linkText: 'فتح على الخريطة'),
              _DetailRow(icon: Icons.payments_rounded, label: 'المبلغ', value: formatIQD(order['TotalIQD'] ?? order['totaliqd']), valueColor: DriverTheme.success),
              if (order['Notes'] != null && (order['Notes'] as String).isNotEmpty)
                _DetailRow(icon: Icons.note_rounded, label: 'ملاحظات', value: order['Notes']),
              const SizedBox(height: 28),
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
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
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
                            title: const Text('سبب الإرجاع'),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
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
                        side: BorderSide(color: DriverTheme.danger),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
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
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      content: Text(msg),
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

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? value;
  final Color? valueColor;

  const _DetailRow({required this.icon, required this.label, required this.value, this.valueColor});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: DriverTheme.primary.withValues(alpha: 0.8)),
          const SizedBox(width: 12),
          SizedBox(width: 100, child: Text(label, style: GoogleFonts.cairo(fontWeight: FontWeight.w700, color: DriverTheme.onSurfaceVariant, fontSize: 14))),
          Expanded(child: Text(value ?? '—', style: GoogleFonts.cairo(fontSize: 15, fontWeight: FontWeight.w500, color: valueColor ?? DriverTheme.onSurface))),
        ],
      ),
    );
  }
}

class _PhoneRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? value;

  const _PhoneRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final phone = value?.replaceAll(RegExp(r'\D'), '') ?? '';
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: DriverTheme.primary.withValues(alpha: 0.8)),
          const SizedBox(width: 12),
          SizedBox(width: 100, child: Text(label, style: GoogleFonts.cairo(fontWeight: FontWeight.w700, color: DriverTheme.onSurfaceVariant, fontSize: 14))),
          Expanded(
            child: phone.isNotEmpty
                ? InkWell(
                    onTap: () => launchUrl(Uri.parse('tel:$phone')),
                    child: Text(value ?? '—', style: GoogleFonts.cairo(fontSize: 15, fontWeight: FontWeight.w600, color: DriverTheme.primary, decoration: TextDecoration.underline)),
                  )
                : Text(value ?? '—', style: GoogleFonts.cairo(fontSize: 15, color: DriverTheme.onSurface)),
          ),
        ],
      ),
    );
  }
}

class _LinkRow extends StatelessWidget {
  final String? url;
  final String linkText;

  const _LinkRow({required this.url, required this.linkText});

  @override
  Widget build(BuildContext context) {
    if (url == null || url!.isEmpty) return const SizedBox();
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        children: [
          Icon(Icons.map_rounded, size: 20, color: DriverTheme.primary.withValues(alpha: 0.8)),
          const SizedBox(width: 12),
          InkWell(
            onTap: () => launchUrl(Uri.parse(url!)),
            child: Text(linkText, style: GoogleFonts.cairo(fontSize: 15, fontWeight: FontWeight.w600, color: DriverTheme.primary, decoration: TextDecoration.underline)),
          ),
        ],
      ),
    );
  }
}
