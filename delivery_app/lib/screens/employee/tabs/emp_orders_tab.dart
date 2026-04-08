import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'dart:typed_data';
import '../../../services/employee_api.dart';
import '../employee_theme.dart';
import '../../../utils/open_pdf_bytes/open_pdf_bytes.dart';
import '../../../utils/order_label_printed.dart';

class EmpOrdersTab extends StatefulWidget {
  const EmpOrdersTab({super.key});

  @override
  State<EmpOrdersTab> createState() => _EmpOrdersTabState();
}

class _EmpOrdersTabState extends State<EmpOrdersTab> {
  List<dynamic> _allOrders = [];
  List<dynamic> _filteredOrders = [];
  final _search = TextEditingController();
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  static const _statusMap = {
    'New': 'جديد',
    'AssignedToDriver': 'مع السائق',
    'Delivered': 'تم التوصيل',
    'Returned': 'راجع',
  };

  String _formatIQD(num? n) => '${NumberFormat('#,##0', 'ar_IQ').format(n ?? 0)} د.ع';

  double _getAmountDue(dynamic o) {
    final m = o as Map<String, dynamic>;
    final total = (m['TotalIQD'] ?? m['totaliqd'] ?? 0) as num;
    final free = m['FreeDelivery'] == true || m['FreeDelivery'] == 1 || m['FreeDelivery'] == '1';
    final deliveryAmt = free ? ((m['WaivedDeliveryIQD'] ?? m['waiveddeliveryiqd'] ?? 0) as num) : ((m['DeliveryFeeIQD'] ?? m['deliveryfeeiqd'] ?? 0) as num);
    return (total - deliveryAmt).toDouble();
  }

  void _filter(String q) {
    final s = q.trim().toLowerCase();
    final searchDigits = s.replaceAll(RegExp(r'\D'), '');
    if (s.isEmpty) {
      setState(() => _filteredOrders = List.from(_allOrders));
      return;
    }
    setState(() {
      _filteredOrders = _allOrders.where((o) {
        final m = o as Map<String, dynamic>;
        final sn = (m['ShipmentNumber'] ?? '').toString().toLowerCase();
        final snDigits = (m['ShipmentNumber'] ?? '').toString().replaceAll(RegExp(r'\D'), '');
        final cn = (m['CustomerName'] ?? '').toString().toLowerCase();
        final cp = (m['CustomerPhone'] ?? '').toString().replaceAll(RegExp(r'\D'), '');
        final addr = (m['Address'] ?? '').toString().toLowerCase();
        final store = (m['StoreName'] ?? '').toString().toLowerCase();
        final admin = (m['AdminOrderNo'] ?? '').toString().toLowerCase();
        final matchShipment = sn.contains(s) || (searchDigits.isNotEmpty && (snDigits.contains(searchDigits) || snDigits.endsWith(searchDigits)));
        return matchShipment ||
            cn.contains(s) ||
            addr.contains(s) ||
            store.contains(s) ||
            admin.contains(s) ||
            (searchDigits.isNotEmpty && cp.contains(searchDigits));
      }).toList();
    });
  }

  Future<void> _load({bool showSpinner = true}) async {
    if (showSpinner) setState(() => _loading = true);
    try {
      final list = await EmployeeApi.getOrders(limit: 500);
      if (!mounted) return;
      setState(() {
        _allOrders = list is List ? list : [];
        if (showSpinner) _loading = false;
      });
      _filter(_search.text);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        if (showSpinner) _loading = false;
      });
      _filter(_search.text);
    }
  }

  void _patchLabelPrintedLocal(int orderId) {
    if (!mounted) return;
    setState(() {
      for (final item in _allOrders) {
        final m = item as Map<String, dynamic>;
        final oid = m['OrderID'];
        final same = oid == orderId || (oid is num && oid.toInt() == orderId);
        if (same) {
          m['LabelPrinted'] = 1;
          break;
        }
      }
      _filter(_search.text);
    });
  }

  Future<void> _printOrder(Map<String, dynamic> order) async {
    try {
      dynamic fullOrder = order;
      if (order['RegionName'] == null && order['OrderID'] != null) {
        fullOrder = await EmployeeApi.getOrderById((order['OrderID'] ?? 0) as int);
      }
      final orderMap = fullOrder is Map<String, dynamic> ? fullOrder : order;
      final bytes = await EmployeeApi.getLabelPdf(orderMap);
      final id = int.tryParse('${order['OrderID']}') ?? 0;
      if (id < 1) throw Exception('معرّف الطلب غير صالح');
      // تسجيل الطباعة على الخادم بعد نجاح توليد الـ PDF وقبل فتح الملف، حتى لا يبقى "لم يُطبع" إذا فشل فتح النافذة أو تأخر التحديث.
      await EmployeeApi.markLabelPrinted(id);
      if (mounted) _patchLabelPrintedLocal(id);
      await openPdfBytes(
        Uint8List.fromList(bytes),
        filename: 'label_$id.pdf',
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تم فتح الملصق')));
      }
      await _load(showSpinner: false);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('فشل الطباعة: ${e.toString()}')));
      }
    }
  }

  void _showEditModal(Map<String, dynamic> order) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => _EditOrderSheet(order: order, onSaved: () {
        Navigator.pop(ctx);
        _load();
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(20),
          child: TextField(
            controller: _search,
            decoration: EmployeeTheme.inputDecoration(
              label: 'بحث',
              hint: 'رقم الشحنة، الاسم، الهاتف، العنوان...',
              suffixIcon: IconButton(icon: const Icon(Icons.search_rounded), onPressed: () => _filter(_search.text)),
            ),
            onChanged: _filter,
          ),
        ),
        Expanded(
          child: _loading
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SizedBox(width: 48, height: 48, child: CircularProgressIndicator(strokeWidth: 3, color: EmployeeTheme.primary)),
                      const SizedBox(height: 20),
                      Text('جاري التحميل...', style: EmployeeTheme.bodyMedium),
                    ],
                  ),
                )
              : _filteredOrders.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(40),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.receipt_long_rounded, size: 64, color: EmployeeTheme.primary.withValues(alpha: 0.4)),
                            const SizedBox(height: 20),
                            Text('لا توجد طلبات', style: EmployeeTheme.titleMedium),
                            if (_allOrders.isEmpty) Text('أو لا توجد نتائج للبحث', style: EmployeeTheme.bodyMedium),
                          ],
                        ),
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      color: EmployeeTheme.primary,
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        itemCount: _filteredOrders.length,
                        itemBuilder: (_, i) {
                          final o = _filteredOrders[i] as Map<String, dynamic>;
                          final status = _statusMap[o['Status']] ?? o['Status'];
                          final labelPrinted = isOrderLabelPrinted(o);
                          return Container(
                            margin: const EdgeInsets.only(bottom: 14),
                            padding: const EdgeInsets.all(18),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: EmployeeTheme.outline.withValues(alpha: 0.5)),
                              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4))],
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                      decoration: BoxDecoration(
                                        gradient: LinearGradient(colors: [EmployeeTheme.primary, EmployeeTheme.primaryDark]),
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Text('#${o['ShipmentNumber']}', style: GoogleFonts.cairo(fontWeight: FontWeight.w800, color: Colors.white, fontSize: 14)),
                                    ),
                                    const Spacer(),
                                    Text(_formatIQD(o['TotalIQD'] ?? o['totaliqd']), style: GoogleFonts.cairo(fontWeight: FontWeight.w700, color: EmployeeTheme.success)),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Text(o['CustomerName'] ?? '—', style: GoogleFonts.cairo(fontSize: 15, fontWeight: FontWeight.w600)),
                                if (o['Address'] != null && (o['Address'] as String).isNotEmpty)
                                  Text(o['Address'] ?? '', style: GoogleFonts.cairo(fontSize: 12, color: EmployeeTheme.onSurfaceVariant)),
                                const SizedBox(height: 8),
                                Text('$status · ${o['CreatedDate'] ?? ''}', style: GoogleFonts.cairo(fontSize: 12, color: EmployeeTheme.onSurfaceVariant)),
                                Text('المستحق: ${_formatIQD(_getAmountDue(o))}', style: GoogleFonts.cairo(fontSize: 12, color: EmployeeTheme.onSurfaceVariant)),
                                Container(
                                  margin: const EdgeInsets.only(top: 8),
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: labelPrinted ? EmployeeTheme.success.withValues(alpha: 0.15) : EmployeeTheme.warning.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: labelPrinted ? EmployeeTheme.success.withValues(alpha: 0.3) : EmployeeTheme.warning.withValues(alpha: 0.3)),
                                  ),
                                  child: Text(labelPrinted ? 'تم الطباعة' : 'لم يُطبع', style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.w600, color: labelPrinted ? EmployeeTheme.success : EmployeeTheme.warning)),
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.end,
                                  children: [
                                    TextButton.icon(
                                      onPressed: () => _showEditModal(o),
                                      icon: const Icon(Icons.edit_rounded, size: 18),
                                      label: const Text('تعديل'),
                                      style: TextButton.styleFrom(foregroundColor: EmployeeTheme.primary),
                                    ),
                                    TextButton.icon(
                                      onPressed: () => _printOrder(o),
                                      icon: const Icon(Icons.print_rounded, size: 18),
                                      label: const Text('طباعة'),
                                      style: TextButton.styleFrom(foregroundColor: EmployeeTheme.primary),
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

class _EditOrderSheet extends StatefulWidget {
  final Map<String, dynamic> order;
  final VoidCallback onSaved;

  const _EditOrderSheet({required this.order, required this.onSaved});

  @override
  State<_EditOrderSheet> createState() => _EditOrderSheetState();
}

class _EditOrderSheetState extends State<_EditOrderSheet> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _adminOrderNo;
  late TextEditingController _customerName;
  late TextEditingController _customerPhone;
  late TextEditingController _address;
  late TextEditingController _amount;
  late TextEditingController _deliveryFee;
  late TextEditingController _notes;
  int? _regionId;
  bool _freeDelivery = false;
  List<dynamic> _regions = [];
  bool _loading = false;
  String? _error;
  Map<String, dynamic> _order = {};

  @override
  void initState() {
    super.initState();
    _loadOrder();
    _loadRegions();
  }

  Future<void> _loadOrder() async {
    _order = Map<String, dynamic>.from(widget.order);
    if (_order['RegionName'] == null && _order['OrderID'] != null) {
      try {
        _order = await EmployeeApi.getOrderById((_order['OrderID'] ?? 0) as int);
      } catch (_) {}
    }
    setState(() {
      _adminOrderNo = TextEditingController(text: _order['AdminOrderNo']?.toString() ?? '');
      _customerName = TextEditingController(text: _order['CustomerName']?.toString() ?? '');
      _customerPhone = TextEditingController(text: _order['CustomerPhone']?.toString() ?? '');
      _address = TextEditingController(text: _order['Address']?.toString() ?? '');
      _amount = TextEditingController(text: (_order['AmountIQD'] ?? 0).toString());
      final fee = _order['FreeDelivery'] == true || _order['FreeDelivery'] == 1
          ? (_order['WaivedDeliveryIQD'] ?? 0)
          : (_order['DeliveryFeeIQD'] ?? _order['deliveryfeeiqd'] ?? 0);
      _deliveryFee = TextEditingController(text: (fee as num).toString());
      _notes = TextEditingController(text: _order['Notes']?.toString() ?? '');
      _regionId = _order['RegionID'] as int?;
      _freeDelivery = _order['FreeDelivery'] == true || _order['FreeDelivery'] == 1;
    });
  }

  Future<void> _loadRegions() async {
    try {
      final r = await EmployeeApi.getRegions();
      setState(() => _regions = r is List ? r : []);
    } catch (_) {}
  }

  @override
  void dispose() {
    _adminOrderNo.dispose();
    _customerName.dispose();
    _customerPhone.dispose();
    _address.dispose();
    _amount.dispose();
    _deliveryFee.dispose();
    _notes.dispose();
    super.dispose();
  }

  /// القيمة المعروضة في القائمة المنسدلة — تُستخدم فقط إذا وُجد عنصر واحد مطابق
  int? get _safeRegionDropdownValue {
    if (_regionId == null) return null;
    final count = _regionDropdownItems.where((i) => i.value == _regionId).length;
    return count == 1 ? _regionId : null;
  }

  /// عناصر القائمة المنسدلة للمناطق — بدون تكرار، مع إضافة المنطقة الحالية إن لم تكن في القائمة
  List<DropdownMenuItem<int>> get _regionDropdownItems {
    final items = <DropdownMenuItem<int>>[
      const DropdownMenuItem(value: null, child: Text('—')),
    ];
    final seenIds = <int>{};
    for (final r in _regions) {
      final m = r as Map<String, dynamic>;
      final id = m['RegionID'] as int?;
      if (id != null && seenIds.add(id)) {
        items.add(DropdownMenuItem(
          value: id,
          child: Text('${m['RegionName']} (${m['DeliveryFeeIQD'] ?? 0})'),
        ));
      }
    }
    if (_regionId != null && !seenIds.contains(_regionId)) {
      items.add(DropdownMenuItem(
        value: _regionId,
        child: Text('${_order['RegionName'] ?? 'المنطقة $_regionId'} (من الطلب)'),
      ));
    }
    return items;
  }

  double get _total {
    final amt = double.tryParse(_amount.text) ?? 0;
    final fee = double.tryParse(_deliveryFee.text) ?? 0;
    return _freeDelivery ? amt : amt + fee;
  }

  double get _due {
    final amt = double.tryParse(_amount.text) ?? 0;
    final fee = double.tryParse(_deliveryFee.text) ?? 0;
    return _freeDelivery ? amt - fee : amt;
  }

  String _formatIQD(num n) => '${NumberFormat('#,##0', 'ar_IQ').format(n)} د.ع';

  Future<void> _save() async {
    final phone = _customerPhone.text.replaceAll(RegExp(r'\D'), '');
    if (phone.isNotEmpty && phone.length != 11) {
      setState(() => _error = 'هاتف المستلم يجب أن يكون 11 رقماً');
      return;
    }
    final amt = double.tryParse(_amount.text);
    if (amt != null && amt < 0) {
      setState(() => _error = 'مبلغ الفاتورة لا يمكن أن يكون سالباً');
      return;
    }
    setState(() {
      _error = null;
      _loading = true;
    });
    try {
      await EmployeeApi.updateOrder(
        (_order['OrderID'] ?? 0) as int,
        {
          'AdminOrderNo': _adminOrderNo.text.trim(),
          'StoreName': _order['StoreName'],
          'StorePhone': _order['StorePhone'],
          'CustomerName': _customerName.text.trim(),
          'CustomerPhone': _customerPhone.text.trim(),
          'RegionID': _regionId,
          'Address': _address.text.trim(),
          'AmountIQD': double.tryParse(_amount.text) ?? 0,
          'DeliveryFeeIQD': double.tryParse(_deliveryFee.text) ?? 0,
          'FreeDelivery': _freeDelivery,
          'Notes': _notes.text.trim(),
        },
      );
      widget.onSaved();
    } catch (e) {
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      expand: false,
        builder: (_, controller) => Directionality(
        textDirection: ui.TextDirection.rtl,
        child: Form(
          key: _formKey,
          child: ListView(
            controller: controller,
            padding: const EdgeInsets.all(24),
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('تعديل الطلب ${_order['ShipmentNumber'] ?? ''}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
                ],
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _adminOrderNo,
                decoration: const InputDecoration(labelText: 'رقم الطلب الإداري', border: OutlineInputBorder()),
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _customerName,
                decoration: const InputDecoration(labelText: 'اسم المستلم', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _customerPhone,
                decoration: const InputDecoration(labelText: 'هاتف المستلم', border: OutlineInputBorder()),
                keyboardType: TextInputType.phone,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<int>(
                value: _safeRegionDropdownValue,
                decoration: const InputDecoration(labelText: 'المنطقة', border: OutlineInputBorder()),
                items: _regionDropdownItems,
                onChanged: (v) {
                  setState(() {
                    _regionId = v;
                    if (v != null) {
                      final r = _regions.cast<Map<String, dynamic>>().firstWhere((x) => x['RegionID'] == v, orElse: () => {});
                      _deliveryFee.text = ((r['DeliveryFeeIQD'] ?? 0) as num).toString();
                    }
                  });
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _address,
                decoration: const InputDecoration(labelText: 'العنوان', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _amount,
                decoration: const InputDecoration(labelText: 'مبلغ الفاتورة (د.ع)', border: OutlineInputBorder()),
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _deliveryFee,
                readOnly: true,
                decoration: const InputDecoration(labelText: 'أجرة التوصيل (ثابتة حسب المنطقة)', border: OutlineInputBorder()),
              ),
              CheckboxListTile(
                title: const Text('توصيل مجاني'),
                value: _freeDelivery,
                onChanged: (v) => setState(() => _freeDelivery = v ?? false),
              ),
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(color: Colors.grey.shade200, borderRadius: BorderRadius.circular(8)),
                child: Column(
                  children: [
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [const Text('المبلغ النهائي:'), Text(_formatIQD(_total), style: const TextStyle(fontWeight: FontWeight.bold))]),
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [const Text('المبلغ المستحق:'), Text(_formatIQD(_due), style: const TextStyle(fontWeight: FontWeight.bold))]),
                  ],
                ),
              ),
              TextFormField(
                controller: _notes,
                decoration: const InputDecoration(labelText: 'ملاحظات', border: OutlineInputBorder()),
                maxLines: 2,
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: const TextStyle(color: Colors.red)),
              ],
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _loading ? null : _save,
                      child: _loading ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('حفظ'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('إلغاء'),
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
