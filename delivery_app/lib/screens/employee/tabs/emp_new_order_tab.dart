import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'dart:typed_data';
import 'dart:async';
import '../../../services/employee_api.dart';
import '../employee_theme.dart';
import '../../../utils/open_pdf_bytes/open_pdf_bytes.dart';

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
  final _amount = TextEditingController();
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
  Timer? _phoneStatsDebounce;
  bool _phoneStatsLoading = false;
  int _customerDeliveredCount = 0;
  int _customerReturnedCount = 0;
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
    _phoneStatsDebounce?.cancel();
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
        if (!mounted) return;
        setState(() => _phoneStatsLoading = false);
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
        // أجرة المنطقة الفعلية دائماً؛ الخادم يصفّرها عند FreeDelivery ويملأ WaivedDeliveryIQD
        'DeliveryFeeIQD': _deliveryFee,
        'FreeDelivery': _freeDelivery,
        'Notes': _notes.text.trim(),
      });
      setState(() {
        _lastOrder = order is Map<String, dynamic> ? order : null;
        _loading = false;
      });
      // لا نمسح الحقول بعد الحفظ: تبقى تفاصيل الطلب ظاهرة إلى أن يتم الطباعة
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
      setState(() => _loading = true);
      final orderId = int.tryParse('${_lastOrder!['OrderID']}') ?? 0;
      if (orderId < 1) throw Exception('معرّف الطلب غير صالح');
      final bytes = await EmployeeApi.getLabelPdf(_lastOrder!);
      // تسجيل الطباعة بعد نجاح توليد الـ PDF وقبل فتح الملف لتفادي بقاء "لم يُطبع" عند فشل فتح النافذة أو تأخر التحديث.
      await EmployeeApi.markLabelPrinted(orderId);
      widget.onCreated?.call();
      await openPdfBytes(
        Uint8List.fromList(bytes),
        filename: 'label_$orderId.pdf',
      );

      // بعد الطباعة: مسح كل الحقول لبدء طلب جديد
      if (mounted) {
        setState(() {
          _lastOrder = null;
          _loading = false;

          _empCode.clear();
          _adminOrderNo.clear();
          _customer.clear();
          _phone.clear();
          _address.clear();
          _regionSearch.clear();
          _regionId = null;
          _showRegionDropdown = false;
          _deliveryFee = 0;
          _freeDelivery = false;
          _pieces.text = '1';
          _amount.text = '';
          _notes.clear();
          _error = null;
          _phoneStatsLoading = false;
          _customerDeliveredCount = 0;
          _customerReturnedCount = 0;

          // إعادة القيم الافتراضية للمتجر (إن لم تكن مخزّنة ضمن الواجهة)
          _storeName.text = _defaults['storeName']?.toString() ?? '';
          _storePhone.text = _defaults['storePhone']?.toString() ?? '';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('فشل الطباعة: ${e.toString()}'), backgroundColor: EmployeeTheme.danger));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final contentPadding = EdgeInsets.fromLTRB(24, 24, 24, _lastOrder != null ? 120 : 24);
    return Stack(
      children: [
        SingleChildScrollView(
          padding: contentPadding,
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
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _adminOrderNo,
            decoration: EmployeeTheme.inputDecoration(label: 'رقم الطلب الإداري', hint: 'رقم الطلب عندكم'),
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
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
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            onChanged: _onCustomerPhoneChanged,
          ),
          if (_phone.text.trim().isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: EmployeeTheme.primary.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: EmployeeTheme.primary.withValues(alpha: 0.2)),
              ),
              child: _phoneStatsLoading
                  ? Row(
                      children: [
                        SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: EmployeeTheme.primary)),
                        const SizedBox(width: 10),
                        Text('جاري جلب إحصائية الزبون...', style: GoogleFonts.cairo(fontSize: 12, color: EmployeeTheme.onSurfaceVariant)),
                      ],
                    )
                  : Row(
                      children: [
                        Icon(Icons.insights_rounded, size: 16, color: EmployeeTheme.primary),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'طلبات موصلة سابقاً: $_customerDeliveredCount   |   طلبات راجعة: $_customerReturnedCount',
                            style: GoogleFonts.cairo(fontSize: 12.5, fontWeight: FontWeight.w600, color: EmployeeTheme.onSurface),
                          ),
                        ),
                      ],
                    ),
            ),
          ],
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
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _amount,
            decoration: EmployeeTheme.inputDecoration(label: 'مبلغ الفاتورة (د.ع)', hint: 'يمكن أن يكون 0'),
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
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
            title: Text(
              'توصيل مجاني (تلقائياً إذا مبلغ الفاتورة 50,000 د.ع فأكثر)\n'
              'إذا كان المبلغ أقل من 50,000 وفعّلت التوصيل المجاني يُرسل تنبيه للوحة التحكم',
              style: GoogleFonts.cairo(fontSize: 13, height: 1.35),
            ),
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
            // بعد الحفظ: نعطّل زر الحفظ مؤقتاً حتى يتم الطباعة
            onPressed: (_loading || _lastOrder != null) ? null : _submit,
            style: FilledButton.styleFrom(
              backgroundColor: EmployeeTheme.primary,
              padding: const EdgeInsets.symmetric(vertical: 18),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            child: _loading
                ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text('حفظ الطلب', style: GoogleFonts.cairo(fontSize: 16, fontWeight: FontWeight.w700)),
          ),
            ],
          ),
        ),
        if (_lastOrder != null)
          Positioned(
            left: 16,
            right: 16,
            bottom: 0,
            child: SafeArea(
              top: false,
              child: FilledButton.icon(
                onPressed: _loading ? null : _printLabel,
                icon: const Icon(Icons.print_rounded),
                label: const Text('طباعة الملصق'),
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
