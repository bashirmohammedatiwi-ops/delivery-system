import 'dart:async';
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
import '../widgets/order_form_ui.dart';
import '../widgets/new_order_ui.dart';
import 'emp_orders_cache.dart';

class EmpOrdersTab extends StatefulWidget {
  const EmpOrdersTab({super.key});

  @override
  State<EmpOrdersTab> createState() => _EmpOrdersTabState();
}

class _EmpOrdersTabState extends State<EmpOrdersTab> {
  static const _pageLimit = 200;

  List<Map<String, dynamic>> _allOrders = [];
  final _search = TextEditingController();
  String _searchQuery = '';
  Timer? _searchDebounce;
  bool _loading = true;
  bool _refreshing = false;
  String? _loadError;

  static Map<String, dynamic>? _asOrder(dynamic raw) {
    if (raw is Map<String, dynamic>) return raw;
    if (raw is Map) return Map<String, dynamic>.from(raw);
    return null;
  }

  static double _numVal(dynamic v) {
    if (v is num) return v.toDouble();
    return double.tryParse('$v') ?? 0;
  }

  List<Map<String, dynamic>> _normalizeOrders(List<dynamic> list) {
    return list.map(_asOrder).whereType<Map<String, dynamic>>().toList();
  }

  @override
  void initState() {
    super.initState();
    if (EmpOrdersCache.isFresh) {
      _allOrders = List<Map<String, dynamic>>.from(EmpOrdersCache.orders!);
      _loading = false;
      _load(showSpinner: false);
    } else {
      _load();
    }
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  static const _statusMap = {
    'New': 'جديد',
    'AssignedToDriver': 'مع السائق',
    'Delivered': 'تم التوصيل',
    'Returned': 'راجع',
  };

  String _formatIQD(num? n) {
    try {
      return '${NumberFormat('#,##0', 'ar_IQ').format(n ?? 0)} د.ع';
    } catch (_) {
      return '${n ?? 0} د.ع';
    }
  }

  bool _isFreeDelivery(Map<String, dynamic> m) =>
      m['FreeDelivery'] == true || m['FreeDelivery'] == 1 || m['FreeDelivery'] == '1';

  double _displayDeliveryFee(Map<String, dynamic> m) {
    if (_isFreeDelivery(m)) return 0;
    return _numVal(m['DeliveryFeeIQD'] ?? m['deliveryfeeiqd']);
  }

  Color _statusColor(String? status) {
    switch (status) {
      case 'Delivered':
        return EmployeeTheme.success;
      case 'Returned':
        return EmployeeTheme.warning;
      case 'AssignedToDriver':
        return EmployeeTheme.primary;
      default:
        return EmployeeTheme.onSurfaceVariant;
    }
  }

  List<Map<String, dynamic>> _applyFilter(String q, List<Map<String, dynamic>> source) {
    final s = q.trim().toLowerCase();
    final searchDigits = s.replaceAll(RegExp(r'\D'), '');
    if (s.isEmpty) return List<Map<String, dynamic>>.from(source);
    return source.where((m) {
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
  }

  List<Map<String, dynamic>> get _visibleOrders => _applyFilter(_searchQuery, _allOrders);

  bool get _isSearching => _searchQuery.trim().isNotEmpty;

  void _onSearchChanged(String value) {
    setState(() {});
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 200), () {
      if (!mounted) return;
      setState(() => _searchQuery = value);
    });
  }

  Future<void> _load({bool showSpinner = true}) async {
    final showBlockingSpinner = showSpinner && _allOrders.isEmpty;
    if (showBlockingSpinner && mounted) {
      setState(() {
        _loading = true;
        _loadError = null;
      });
    } else if (showSpinner && mounted) {
      setState(() => _refreshing = true);
    }
    try {
      final list = await EmployeeApi.getOrdersList(limit: _pageLimit);
      if (!mounted) return;
      final normalized = _normalizeOrders(list);
      setState(() {
        _allOrders = normalized;
        _loadError = null;
        _loading = false;
        _refreshing = false;
      });
      EmpOrdersCache.save(normalized);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadError = _allOrders.isEmpty ? e.toString().replaceFirst('Exception: ', '') : null;
        _loading = false;
        _refreshing = false;
      });
    }
  }

  void _patchLabelPrintedLocal(int orderId) {
    if (!mounted) return;
    setState(() {
      for (final item in _allOrders) {
        final oid = item['OrderID'];
        final same = oid == orderId || (oid is num && oid.toInt() == orderId);
        if (same) {
          item['LabelPrinted'] = 1;
          break;
        }
      }
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
    final visible = _visibleOrders;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: TextField(
            controller: _search,
            decoration: EmployeeTheme.inputDecoration(
              label: 'بحث',
              hint: 'رقم الشحنة، الاسم، الهاتف، العنوان...',
              prefixIcon: const Icon(Icons.search_rounded),
              suffixIcon: _search.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.close_rounded, size: 20),
                      onPressed: () {
                        _search.clear();
                        _searchQuery = '';
                        setState(() {});
                      },
                    )
                  : null,
            ),
            onChanged: _onSearchChanged,
          ),
        ),
        if (_refreshing)
          LinearProgressIndicator(minHeight: 2, color: EmployeeTheme.primary),
        Expanded(
          child: _buildBody(visible),
        ),
      ],
    );
  }

  Widget _buildBody(List<Map<String, dynamic>> visible) {
    if (_loading) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 48,
              height: 48,
              child: CircularProgressIndicator(strokeWidth: 3, color: EmployeeTheme.primary),
            ),
            const SizedBox(height: 20),
            Text('جاري التحميل...', style: EmployeeTheme.bodyMedium),
          ],
        ),
      );
    }

    if (_loadError != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.cloud_off_rounded, size: 48, color: EmployeeTheme.danger.withValues(alpha: 0.7)),
              const SizedBox(height: 16),
              Text('تعذّر تحميل الطلبات', style: EmployeeTheme.titleMedium),
              const SizedBox(height: 8),
              Text(_loadError!, style: EmployeeTheme.bodyMedium, textAlign: TextAlign.center),
              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: _load,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('إعادة المحاولة'),
                style: FilledButton.styleFrom(backgroundColor: EmployeeTheme.primary),
              ),
            ],
          ),
        ),
      );
    }

    if (visible.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(40),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.receipt_long_rounded, size: 64, color: EmployeeTheme.primary.withValues(alpha: 0.4)),
              const SizedBox(height: 20),
              Text('لا توجد طلبات', style: EmployeeTheme.titleMedium),
              const SizedBox(height: 6),
              Text(
                _isSearching ? 'جرّب كلمات بحث مختلفة' : 'ستظهر الطلبات هنا',
                style: EmployeeTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      color: EmployeeTheme.primary,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        cacheExtent: 400,
        itemCount: visible.length,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (_, i) => _buildOrderCard(visible[i]),
      ),
    );
  }

  Widget _buildOrderCard(Map<String, dynamic> o) {
    final status = _statusMap[o['Status']] ?? o['Status']?.toString() ?? '';
    final statusColor = _statusColor(o['Status']?.toString());
    final labelPrinted = isOrderLabelPrinted(o);
    final free = _isFreeDelivery(o);
    final deliveryFee = _displayDeliveryFee(o);
    final total = _numVal(o['TotalIQD'] ?? o['totaliqd']);
    final name = o['CustomerName']?.toString().trim();
    final phone = o['CustomerPhone']?.toString() ?? '';
    final address = o['Address']?.toString() ?? '';
    final region = o['RegionName']?.toString().trim() ?? '';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: EmployeeTheme.outline),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: [EmployeeTheme.primary, EmployeeTheme.primaryDark]),
                  borderRadius: BorderRadius.circular(9),
                ),
                child: Text(
                  '#${o['ShipmentNumber'] ?? ''}',
                  style: GoogleFonts.roboto(fontWeight: FontWeight.w800, color: Colors.white, fontSize: 13),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(status, style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.w700, color: statusColor)),
              ),
              const Spacer(),
              Text(_formatIQD(total), style: GoogleFonts.cairo(fontWeight: FontWeight.w800, fontSize: 15, color: EmployeeTheme.primary)),
            ],
          ),
          const SizedBox(height: 12),
          Text(name?.isNotEmpty == true ? name! : '—', style: GoogleFonts.cairo(fontSize: 15, fontWeight: FontWeight.w700)),
          if (phone.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(phone, style: GoogleFonts.cairo(fontSize: 12, color: EmployeeTheme.onSurfaceVariant)),
          ],
          if (region.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(region, style: GoogleFonts.cairo(fontSize: 12, color: EmployeeTheme.onSurfaceVariant)),
          ],
          if (address.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(address, style: GoogleFonts.cairo(fontSize: 12, color: EmployeeTheme.onSurfaceVariant), maxLines: 2, overflow: TextOverflow.ellipsis),
          ],
          const SizedBox(height: 8),
          Text(
            free ? 'توصيل مجاني' : 'أجرة التوصيل: ${_formatIQD(deliveryFee)}',
            style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.w600, color: free ? EmployeeTheme.success : EmployeeTheme.onSurfaceVariant),
          ),
          if (o['CreatedDate'] != null) ...[
            const SizedBox(height: 4),
            Text('${o['CreatedDate']}', style: GoogleFonts.cairo(fontSize: 11, color: EmployeeTheme.onSurfaceVariant)),
          ],
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: labelPrinted ? EmployeeTheme.success.withValues(alpha: 0.1) : EmployeeTheme.warning.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              labelPrinted ? '✓ تم الطباعة' : 'لم يُطبع',
              style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.w700, color: labelPrinted ? EmployeeTheme.success : EmployeeTheme.warning),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _showEditModal(o),
                  icon: const Icon(Icons.edit_rounded, size: 18),
                  label: const Text('تعديل'),
                  style: OutlinedButton.styleFrom(foregroundColor: EmployeeTheme.primary),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton.icon(
                  onPressed: () => _printOrder(o),
                  icon: const Icon(Icons.print_rounded, size: 18),
                  label: const Text('طباعة'),
                  style: FilledButton.styleFrom(backgroundColor: EmployeeTheme.primary),
                ),
              ),
            ],
          ),
        ],
      ),
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
  static const int _piecesMin = 1;
  static const int _piecesMax = 99;

  final _formKey = GlobalKey<FormState>();
  late TextEditingController _empCode;
  late TextEditingController _adminOrderNo;
  late TextEditingController _customerName;
  late TextEditingController _customerPhone;
  late TextEditingController _address;
  late TextEditingController _amount;
  late TextEditingController _notes;
  int? _regionId;
  String? _regionName;
  int _piecesCount = 1;
  final _freeDeliveryState = FreeDeliveryState();
  double _deliveryFee = 0;
  List<dynamic> _regions = [];
  bool _loading = false;
  String? _error;
  Map<String, dynamic> _order = {};

  @override
  void initState() {
    super.initState();
    _order = Map<String, dynamic>.from(widget.order);
    _empCode = TextEditingController();
    _adminOrderNo = TextEditingController();
    _customerName = TextEditingController();
    _customerPhone = TextEditingController();
    _address = TextEditingController();
    _amount = TextEditingController();
    _notes = TextEditingController();
    _applyOrderToFields(_order);
    _loadOrder();
    _loadRegions();
  }

  void _applyOrderToFields(Map<String, dynamic> o) {
    _adminOrderNo.text = o['AdminOrderNo']?.toString() ?? '';
    _customerName.text = o['CustomerName']?.toString() ?? '';
    _customerPhone.text = o['CustomerPhone']?.toString() ?? '';
    _address.text = o['Address']?.toString() ?? '';
    final piecesRaw = (o['Pieces'] is num) ? (o['Pieces'] as num).toInt() : int.tryParse('${o['Pieces']}') ?? _piecesMin;
    _piecesCount = piecesRaw.clamp(_piecesMin, _piecesMax);
    _amount.text = OrderFormUi.formatAmountField((o['AmountIQD'] is num) ? (o['AmountIQD'] as num) : num.tryParse('${o['AmountIQD']}') ?? 0);
    final fee = o['FreeDelivery'] == true || o['FreeDelivery'] == 1
        ? (o['WaivedDeliveryIQD'] ?? 0)
        : (o['DeliveryFeeIQD'] ?? o['deliveryfeeiqd'] ?? 0);
    _deliveryFee = (fee as num).toDouble();
    _notes.text = o['Notes']?.toString() ?? '';
    _regionId = o['RegionID'] as int?;
    _regionName = o['RegionName']?.toString();
    final amt = (o['AmountIQD'] is num) ? (o['AmountIQD'] as num).toDouble() : double.tryParse('${o['AmountIQD']}') ?? 0;
    final free = o['FreeDelivery'] == true || o['FreeDelivery'] == 1;
    _freeDeliveryState.initFromExisting(amount: amt, free: free);
  }

  Future<void> _loadOrder() async {
    if (_order['RegionName'] == null && _order['OrderID'] != null) {
      try {
        final full = await EmployeeApi.getOrderById((_order['OrderID'] ?? 0) as int);
        if (full.isNotEmpty) _order = full;
      } catch (_) {}
    }
    if (!mounted) return;
    setState(() => _applyOrderToFields(_order));
  }

  Future<void> _loadRegions() async {
    try {
      final r = await EmployeeApi.getRegions();
      setState(() => _regions = r is List ? r : []);
    } catch (_) {}
  }

  @override
  void dispose() {
    _empCode.dispose();
    _adminOrderNo.dispose();
    _customerName.dispose();
    _customerPhone.dispose();
    _address.dispose();
    _amount.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _openRegionPicker() async {
    if (_regions.isEmpty) await _loadRegions();
    if (!mounted || _regions.isEmpty) return;
    final picked = await OrderFormUi.pickRegion(context, _regions, selectedId: _regionId);
    if (picked == null || !mounted) return;
    setState(() {
      _regionId = picked['RegionID'] as int?;
      _regionName = picked['RegionName']?.toString();
      _deliveryFee = ((picked['DeliveryFeeIQD'] ?? picked['DeliveryFee'] ?? 0) as num).toDouble();
    });
  }

  double get _amountVal => OrderFormUi.parseAmount(_amount.text);

  double get _total => _freeDeliveryState.value ? _amountVal : _amountVal + _deliveryFee;

  double get _displayDeliveryFee => FreeDeliveryState.employeeDeliveryFee(_deliveryFee, _freeDeliveryState.value);

  void _onAmountChanged(String _) {
    _freeDeliveryState.syncFromAmount(_amountVal);
    setState(() {});
  }

  void _onFreeDeliveryChanged(bool v) {
    setState(() => _freeDeliveryState.setManual(v));
  }

  Future<void> _save() async {
    if (_empCode.text.trim().isEmpty) {
      setState(() => _error = 'أدخل رمز الموظف');
      return;
    }
    final phone = _customerPhone.text.replaceAll(RegExp(r'\D'), '');
    if (phone.isNotEmpty && phone.length != 11) {
      setState(() => _error = 'هاتف المستلم يجب أن يكون 11 رقماً');
      return;
    }
    if (OrderFormUi.isAmountEmpty(_amount.text)) {
      setState(() => _error = 'أدخل مبلغ الفاتورة');
      return;
    }
    final amt = _amountVal;
    if (amt < 0) {
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
          'EmployeeCode': _empCode.text.trim(),
          'AdminOrderNo': _adminOrderNo.text.trim(),
          'StoreName': _order['StoreName'],
          'StorePhone': _order['StorePhone'],
          'CustomerName': _customerName.text.trim(),
          'CustomerPhone': _customerPhone.text.trim(),
          'RegionID': _regionId,
          'Address': _address.text.trim(),
          'Pieces': _piecesCount,
          'AmountIQD': amt,
          'DeliveryFeeIQD': _deliveryFee,
          'FreeDelivery': _freeDeliveryState.value,
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
      initialChildSize: 0.94,
      expand: false,
      builder: (_, controller) => Directionality(
        textDirection: ui.TextDirection.rtl,
        child: Material(
          color: EmployeeTheme.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          child: Form(
            key: _formKey,
            child: ListView(
              controller: controller,
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              children: [
                NewOrderUi.editSheetHeader(
                  shipmentNumber: '${_order['ShipmentNumber'] ?? ''}',
                  onClose: () => Navigator.pop(context),
                ),
                const SizedBox(height: 8),

                NewOrderUi.adminHero(_adminOrderNo),

                NewOrderUi.block(
                  icon: Icons.lock_outline_rounded,
                  title: 'رمز الموظف',
                  badge: 'مطلوب',
                  child: OrderFormUi.numField(
                    controller: _empCode,
                    label: 'الرمز *',
                    hint: '••••••',
                    obscure: true,
                  ),
                ),

                NewOrderUi.block(
                  icon: Icons.person_outline_rounded,
                  title: 'المستلم',
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      OrderFormUi.numField(
                        controller: _customerPhone,
                        label: 'هاتف المستلم *',
                        hint: '07701234567',
                      ),
                      const SizedBox(height: 10),
                      OrderFormUi.textField(controller: _customerName, label: 'اسم المستلم', hint: 'اختياري'),
                    ],
                  ),
                ),

                NewOrderUi.block(
                  icon: Icons.local_shipping_outlined,
                  title: 'التوصيل',
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      NewOrderUi.regionTile(
                        regionName: _regionName,
                        displayDeliveryFee: _displayDeliveryFee,
                        freeDelivery: _freeDeliveryState.value,
                        hasSelection: _regionId != null,
                        onTap: _openRegionPicker,
                      ),
                      const SizedBox(height: 12),
                      OrderFormUi.textField(controller: _address, label: 'العنوان *', hint: 'الشارع، المبنى...', maxLines: 2),
                      const SizedBox(height: 10),
                      OrderFormUi.textField(controller: _notes, label: 'ملاحظات', hint: 'اختياري', maxLines: 2),
                      const SizedBox(height: 12),
                      NewOrderUi.piecesRow(
                        value: _piecesCount,
                        min: _piecesMin,
                        max: _piecesMax,
                        onChanged: (v) => setState(() => _piecesCount = v),
                      ),
                    ],
                  ),
                ),

                NewOrderUi.amountHero(controller: _amount, onChanged: _onAmountChanged),

                NewOrderUi.block(
                  icon: Icons.calculate_outlined,
                  title: 'الإجمالي',
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      NewOrderUi.freeDeliveryCard(
                        value: _freeDeliveryState.value,
                        state: _freeDeliveryState,
                        onChanged: _onFreeDeliveryChanged,
                      ),
                      const SizedBox(height: 12),
                      NewOrderUi.amountSummary(
                        deliveryFee: _displayDeliveryFee,
                        total: _total,
                        freeDelivery: _freeDeliveryState.value,
                      ),
                    ],
                  ),
                ),

                if (_error != null) ...[
                  const SizedBox(height: 4),
                  OrderFormUi.errorBanner(_error!),
                ],
                const SizedBox(height: 16),
                NewOrderUi.saveButton(
                  loading: _loading,
                  onSave: _save,
                  label: 'حفظ التعديلات',
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: OutlinedButton(
                    onPressed: _loading ? null : () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      side: BorderSide(color: EmployeeTheme.outline),
                    ),
                    child: Text('إلغاء', style: GoogleFonts.cairo(fontSize: 15, fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
