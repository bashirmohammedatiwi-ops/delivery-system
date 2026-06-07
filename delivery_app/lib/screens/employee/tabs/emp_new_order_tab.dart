import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:typed_data';
import 'dart:async';
import '../../../services/employee_api.dart';
import '../employee_theme.dart';
import '../widgets/order_form_ui.dart';
import '../widgets/new_order_ui.dart';
import '../../../utils/open_pdf_bytes/open_pdf_bytes.dart';

class EmpNewOrderTab extends StatefulWidget {
  final VoidCallback? onCreated;

  const EmpNewOrderTab({super.key, this.onCreated});

  @override
  State<EmpNewOrderTab> createState() => _EmpNewOrderTabState();
}

class _EmpNewOrderTabState extends State<EmpNewOrderTab> {
  static const int _piecesMin = 1;
  static const int _piecesMax = 99;

  final _empCode = TextEditingController();
  final _adminOrderNo = TextEditingController();
  final _storeName = TextEditingController();
  final _storePhone = TextEditingController();
  final _customer = TextEditingController();
  final _phone = TextEditingController();
  final _address = TextEditingController();
  final _amount = TextEditingController();
  final _notes = TextEditingController();

  int? _regionId;
  String? _regionName;
  double _deliveryFee = 0;
  final _freeDeliveryState = FreeDeliveryState();
  List<dynamic> _regions = [];
  bool _loading = false;
  String? _error;
  Map<String, dynamic> _defaults = {};
  Map<String, dynamic>? _lastOrder;
  Timer? _phoneStatsDebounce;
  bool _phoneStatsLoading = false;
  int _customerDeliveredCount = 0;
  int _customerReturnedCount = 0;
  int _piecesCount = 1;

  @override
  void initState() {
    super.initState();
    _loadRegions();
    _loadDefaults();
  }

  Future<void> _loadRegions() async {
    try {
      final r = await EmployeeApi.getRegions();
      setState(() => _regions = r is List ? r : []);
    } catch (_) {}
  }

  Future<void> _loadDefaults() async {
    try {
      final d = await EmployeeApi.getSettingsDefaults();
      setState(() {
        _defaults = d;
        _storeName.text = d['storeName']?.toString() ?? '';
        _storePhone.text = d['storePhone']?.toString() ?? '';
      });
    } catch (_) {}
  }

  @override
  void dispose() {
    _phoneStatsDebounce?.cancel();
    _empCode.dispose();
    _adminOrderNo.dispose();
    _storeName.dispose();
    _storePhone.dispose();
    _customer.dispose();
    _phone.dispose();
    _address.dispose();
    _amount.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _openRegionPicker() async {
    if (_regions.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('جاري تحميل المناطق...'), behavior: SnackBarBehavior.floating),
        );
      }
      await _loadRegions();
      if (_regions.isEmpty) return;
    }
    if (!mounted) return;
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

  void _onCustomerPhoneChanged(String value) {
    final digits = value.replaceAll(RegExp(r'\D'), '');
    _phoneStatsDebounce?.cancel();
    if (digits.length < 11) {
      if (mounted) {
        setState(() {
          _phoneStatsLoading = false;
          _customerDeliveredCount = 0;
          _customerReturnedCount = 0;
        });
      }
      return;
    }
    _phoneStatsDebounce = Timer(const Duration(milliseconds: 350), () async {
      if (!mounted) return;
      setState(() => _phoneStatsLoading = true);
      try {
        final stats = await EmployeeApi.getCustomerStatsByPhone(digits);
        if (!mounted) return;
        setState(() {
          _customerDeliveredCount = (stats['deliveredCount'] is num) ? (stats['deliveredCount'] as num).toInt() : 0;
          _customerReturnedCount = (stats['returnedCount'] is num) ? (stats['returnedCount'] as num).toInt() : 0;
          _phoneStatsLoading = false;
        });
      } catch (_) {
        if (mounted) setState(() => _phoneStatsLoading = false);
      }
    });
  }

  Future<void> _submit() async {
    if (_empCode.text.trim().isEmpty) {
      setState(() => _error = 'أدخل رمز الموظف');
      return;
    }
    if (_regionId == null) {
      setState(() => _error = 'اختر المنطقة');
      return;
    }
    final phone = _phone.text.trim().replaceAll(RegExp(r'\D'), '');
    if (phone.isEmpty) {
      setState(() => _error = 'أدخل هاتف المستلم');
      return;
    }
    if (phone.length != 11) {
      setState(() => _error = 'هاتف المستلم يجب أن يكون 11 رقماً');
      return;
    }
    if (_address.text.trim().isEmpty) {
      setState(() => _error = 'أدخل العنوان');
      return;
    }
    if (OrderFormUi.isAmountEmpty(_amount.text)) {
      setState(() => _error = 'أدخل مبلغ الفاتورة');
      return;
    }
    if (_amountVal < 0) {
      setState(() => _error = 'مبلغ الفاتورة لا يمكن أن يكون سالباً');
      return;
    }
    setState(() {
      _error = null;
      _loading = true;
      _lastOrder = null;
    });
    try {
      final storeName = _storeName.text.trim().isEmpty ? (_defaults['storeName']?.toString() ?? '') : _storeName.text.trim();
      final storePhone = _storePhone.text.trim().isEmpty ? (_defaults['storePhone']?.toString() ?? '') : _storePhone.text.trim();
      final order = await EmployeeApi.createOrder({
        'EmployeeCode': _empCode.text.trim(),
        'AdminOrderNo': _adminOrderNo.text.trim(),
        'StoreName': storeName,
        'StorePhone': storePhone,
        'CustomerName': _customer.text.trim(),
        'CustomerPhone': _phone.text.trim(),
        'RegionID': _regionId,
        'Address': _address.text.trim(),
        'Pieces': _piecesCount,
        'AmountIQD': _amountVal,
        'DeliveryFeeIQD': _deliveryFee,
        'FreeDelivery': _freeDeliveryState.value,
        'Notes': _notes.text.trim(),
      });
      setState(() {
        _lastOrder = order is Map<String, dynamic> ? order : null;
        _loading = false;
      });
      widget.onCreated?.call();
    } catch (e) {
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  Future<void> _printLabel() async {
    if (_lastOrder == null) return;
    try {
      setState(() => _loading = true);
      final orderId = int.tryParse('${_lastOrder!['OrderID']}') ?? 0;
      if (orderId < 1) throw Exception('معرّف الطلب غير صالح');
      final bytes = await EmployeeApi.getLabelPdf(_lastOrder!);
      await EmployeeApi.markLabelPrinted(orderId);
      widget.onCreated?.call();
      await openPdfBytes(Uint8List.fromList(bytes), filename: 'label_$orderId.pdf');
      if (mounted) {
        setState(() {
          _lastOrder = null;
          _loading = false;
          _empCode.clear();
          _adminOrderNo.clear();
          _customer.clear();
          _phone.clear();
          _address.clear();
          _regionId = null;
          _regionName = null;
          _deliveryFee = 0;
          _freeDeliveryState.reset();
          _piecesCount = 1;
          _amount.clear();
          _notes.clear();
          _error = null;
          _phoneStatsLoading = false;
          _customerDeliveredCount = 0;
          _customerReturnedCount = 0;
          _storeName.text = _defaults['storeName']?.toString() ?? '';
          _storePhone.text = _defaults['storePhone']?.toString() ?? '';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('فشل الطباعة: $e'), backgroundColor: EmployeeTheme.danger));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final saved = _lastOrder != null;
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          NewOrderUi.adminHero(_adminOrderNo),

          NewOrderUi.block(
            icon: Icons.lock_outline_rounded,
            title: 'رمز الموظف',
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
                  controller: _phone,
                  label: 'هاتف المستلم *',
                  hint: '07701234567',
                  onChanged: _onCustomerPhoneChanged,
                ),
                if (_phone.text.trim().isNotEmpty) ...[
                  const SizedBox(height: 10),
                  OrderFormUi.phoneStats(
                    loading: _phoneStatsLoading,
                    delivered: _customerDeliveredCount,
                    returned: _customerReturnedCount,
                  ),
                ],
                const SizedBox(height: 10),
                OrderFormUi.textField(controller: _customer, label: 'اسم المستلم', hint: 'اختياري'),
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
                  onChanged: (v) => setState(() => _freeDeliveryState.setManual(v)),
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
          if (saved)
            NewOrderUi.printSection(
              shipmentNumber: '${_lastOrder!['ShipmentNumber'] ?? ''}',
              loading: _loading,
              onPrint: _printLabel,
            )
          else
            NewOrderUi.saveButton(
              loading: _loading,
              onSave: _submit,
            ),
        ],
      ),
    );
  }
}
