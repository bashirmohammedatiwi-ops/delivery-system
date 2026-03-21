import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:open_file/open_file.dart';
import 'package:path_provider/path_provider.dart';
import '../../../services/employee_api.dart';
import '../employee_theme.dart';

class EmpNewOrderTab extends StatefulWidget {
  final VoidCallback? onCreated;

  const EmpNewOrderTab({super.key, this.onCreated});

  @override
  State<EmpNewOrderTab> createState() => _EmpNewOrderTabState();
}

class _EmpNewOrderTabState extends State<EmpNewOrderTab> {
  final _empCode = TextEditingController();
  final _adminOrderNo = TextEditingController();
  final _storeName = TextEditingController();
  final _storePhone = TextEditingController();
  final _customer = TextEditingController();
  final _phone = TextEditingController();
  final _address = TextEditingController();
  final _regionSearch = TextEditingController();
  final _pieces = TextEditingController(text: '1');
  final _amount = TextEditingController(text: '0');
  final _notes = TextEditingController();
  int? _regionId;
  double _deliveryFee = 0;
  bool _freeDelivery = false;
  List<dynamic> _regions = [];
  List<dynamic> _filteredRegions = [];
  bool _showRegionDropdown = false;
  bool _loading = false;
  String? _error;
  Map<String, dynamic> _defaults = {};
  Map<String, dynamic>? _lastOrder;
  static const _freeThreshold = 50000.0;

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
    _empCode.dispose();
    _adminOrderNo.dispose();
    _storeName.dispose();
    _storePhone.dispose();
    _customer.dispose();
    _phone.dispose();
    _address.dispose();
    _regionSearch.dispose();
    _pieces.dispose();
    _amount.dispose();
    _notes.dispose();
    super.dispose();
  }

  void _filterRegions(String q) {
    final qn = (q.trim()).toLowerCase();
    if (qn.isEmpty) {
      setState(() => _filteredRegions = List.from(_regions));
    } else {
      setState(() {
        _filteredRegions = _regions.where((r) {
          final m = r as Map<String, dynamic>;
          final name = (m['RegionName'] ?? '').toString().toLowerCase();
          final area = (m['RegionArea'] ?? '').toString().toLowerCase();
          return name.contains(qn) || name.startsWith(qn) || area.contains(qn) || area.startsWith(qn);
        }).toList();
      });
    }
  }

  void _selectRegion(dynamic r) {
    final m = r as Map<String, dynamic>;
    setState(() {
      _regionId = m['RegionID'] as int?;
      _deliveryFee = ((m['DeliveryFeeIQD'] ?? m['DeliveryFee'] ?? 0) as num).toDouble();
      _regionSearch.text = '${m['RegionName']} (${_formatIQD(_deliveryFee)})';
      _showRegionDropdown = false;
      _updateAmountDisplay();
    });
  }

  String _formatIQD(num n) => '${NumberFormat('#,##0', 'ar_IQ').format(n)} د.ع';

  double get _amountVal => (double.tryParse(_amount.text) ?? 0).clamp(0, double.infinity);
  double get _total => _freeDelivery ? _amountVal : _amountVal + _deliveryFee;
  double get _amountDue => _freeDelivery ? (_amountVal - _deliveryFee) : _amountVal;

  void _updateAmountDisplay() => setState(() {});

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
    final amt = _amountVal;
    if (amt < 0) {
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
        'Pieces': int.tryParse(_pieces.text) ?? 1,
        'AmountIQD': amt,
        'DeliveryFeeIQD': _freeDelivery ? 0 : _deliveryFee,
        'FreeDelivery': _freeDelivery,
        'Notes': _notes.text.trim(),
      });
      setState(() {
        _lastOrder = order is Map<String, dynamic> ? order : null;
        _loading = false;
      });
      _empCode.clear();
      _adminOrderNo.clear();
      _customer.clear();
      _phone.clear();
      _address.clear();
      _regionSearch.clear();
      _regionId = null;
      _deliveryFee = 0;
      _pieces.text = '1';
      _amount.text = '0';
      _notes.clear();
      _storeName.text = _defaults['storeName']?.toString() ?? '';
      _storePhone.text = _defaults['storePhone']?.toString() ?? '';
      widget.onCreated?.call();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('تم الحفظ! رقم الشحنة: ${order['ShipmentNumber'] ?? ''}'),
            backgroundColor: EmployeeTheme.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
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
      final bytes = await EmployeeApi.getLabelPdf(_lastOrder!);
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/label_${_lastOrder!['OrderID'] ?? DateTime.now().millisecondsSinceEpoch}.pdf');
      await file.writeAsBytes(bytes);
      await OpenFile.open(file.path);
      await EmployeeApi.markLabelPrinted((_lastOrder!['OrderID'] ?? 0) as int);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('فشل الطباعة: ${e.toString()}'), backgroundColor: EmployeeTheme.danger));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topRight,
                end: Alignment.bottomLeft,
                colors: [EmployeeTheme.primary.withValues(alpha: 0.15), EmployeeTheme.primary.withValues(alpha: 0.05)],
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: EmployeeTheme.primary.withValues(alpha: 0.2)),
            ),
            child: Row(
              children: [
                Icon(Icons.add_circle_rounded, size: 32, color: EmployeeTheme.primary),
                const SizedBox(width: 14),
                Text('طلب جديد', style: GoogleFonts.cairo(fontSize: 22, fontWeight: FontWeight.w800, color: EmployeeTheme.onSurface)),
              ],
            ),
          ),
          const SizedBox(height: 24),
          TextField(
            controller: _empCode,
            decoration: EmployeeTheme.inputDecoration(label: 'رمز الموظف *', hint: 'يُدخل في كل طلب'),
            obscureText: true,
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _adminOrderNo,
            decoration: EmployeeTheme.inputDecoration(label: 'رقم الطلب الإداري', hint: 'رقم الطلب عندكم'),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _customer,
            decoration: EmployeeTheme.inputDecoration(label: 'اسم المستلم', hint: 'اسم المستلم'),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _phone,
            decoration: EmployeeTheme.inputDecoration(label: 'هاتف المستلم *', hint: '07701234567'),
            keyboardType: TextInputType.phone,
          ),
          const SizedBox(height: 16),
          Stack(
            children: [
              TextField(
                controller: _regionSearch,
                decoration: EmployeeTheme.inputDecoration(label: 'المنطقة *', hint: 'ابحث باسم المنطقة...'),
                onChanged: (v) {
                  setState(() {
                    _regionId = null;
                    _deliveryFee = 0;
                  });
                  _filterRegions(v);
                  setState(() => _showRegionDropdown = true);
                },
                onTap: () {
                  if (_regionId == null) _filterRegions(_regionSearch.text);
                  setState(() => _showRegionDropdown = true);
                },
              ),
              if (_showRegionDropdown && _filteredRegions.isNotEmpty)
                Container(
                  margin: const EdgeInsets.only(top: 56),
                  constraints: const BoxConstraints(maxHeight: 200),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: EmployeeTheme.outline),
                    boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 12)],
                  ),
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: _filteredRegions.length,
                    itemBuilder: (_, i) {
                      final r = _filteredRegions[i] as Map<String, dynamic>;
                      return ListTile(
                        title: Text('${r['RegionName']} (${_formatIQD((r['DeliveryFeeIQD'] ?? r['DeliveryFee'] ?? 0) as num)})'),
                        onTap: () => _selectRegion(r),
                      );
                    },
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _address,
            decoration: EmployeeTheme.inputDecoration(label: 'العنوان *', hint: 'العنوان الكامل'),
            maxLines: 2,
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _pieces,
            decoration: EmployeeTheme.inputDecoration(label: 'عدد القطع', hint: '1'),
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _amount,
            decoration: EmployeeTheme.inputDecoration(label: 'مبلغ الفاتورة (د.ع)', hint: 'يمكن أن يكون 0'),
            keyboardType: TextInputType.number,
            onChanged: (_) {
              final amt = _amountVal;
              if (amt >= _freeThreshold && !_freeDelivery) setState(() => _freeDelivery = true);
              _updateAmountDisplay();
            },
          ),
          const SizedBox(height: 12),
          InputDecorator(
            decoration: EmployeeTheme.inputDecoration(label: 'أجرة التوصيل (د.ع)', hint: 'ثابتة حسب المنطقة'),
            child: Text(_deliveryFee.toStringAsFixed(0)),
          ),
          const SizedBox(height: 12),
          CheckboxListTile(
            title: Text('توصيل مجاني (تلقائي عند 50,000 د.ع أو أكثر)', style: GoogleFonts.cairo(fontSize: 14)),
            value: _freeDelivery,
            onChanged: (v) => setState(() => _freeDelivery = v ?? false),
            activeColor: EmployeeTheme.primary,
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topRight,
                end: Alignment.bottomLeft,
                colors: [EmployeeTheme.primary.withValues(alpha: 0.1), EmployeeTheme.primary.withValues(alpha: 0.05)],
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: EmployeeTheme.primary.withValues(alpha: 0.2)),
            ),
            child: Column(
              children: [
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text('المبلغ النهائي:', style: EmployeeTheme.bodyMedium), Text(_formatIQD(_total), style: GoogleFonts.cairo(fontWeight: FontWeight.w800, color: EmployeeTheme.primary))]),
                const SizedBox(height: 8),
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text('المبلغ المستحق:', style: EmployeeTheme.bodyMedium), Text(_formatIQD(_amountDue), style: GoogleFonts.cairo(fontWeight: FontWeight.w800, color: EmployeeTheme.success))]),
              ],
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _notes,
            decoration: EmployeeTheme.inputDecoration(label: 'ملاحظات', hint: 'ملاحظات إضافية'),
            maxLines: 2,
          ),
          if (_error != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: EmployeeTheme.danger.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12), border: Border.all(color: EmployeeTheme.danger.withValues(alpha: 0.3))),
              child: Row(children: [Icon(Icons.error_outline, color: EmployeeTheme.danger), const SizedBox(width: 12), Expanded(child: Text(_error!, style: TextStyle(color: EmployeeTheme.danger, fontWeight: FontWeight.w600)))]),
            ),
          ],
          const SizedBox(height: 28),
          FilledButton(
            onPressed: _loading ? null : _submit,
            style: FilledButton.styleFrom(
              backgroundColor: EmployeeTheme.primary,
              padding: const EdgeInsets.symmetric(vertical: 18),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            child: _loading
                ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text('حفظ الطلب', style: GoogleFonts.cairo(fontSize: 16, fontWeight: FontWeight.w700)),
          ),
          if (_lastOrder != null) ...[
            const SizedBox(height: 14),
            OutlinedButton.icon(
              onPressed: _printLabel,
              icon: const Icon(Icons.print_rounded),
              label: const Text('طباعة الملصق'),
              style: OutlinedButton.styleFrom(
                foregroundColor: EmployeeTheme.primary,
                side: BorderSide(color: EmployeeTheme.primary),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
