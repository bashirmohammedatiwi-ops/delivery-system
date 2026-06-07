import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../employee_theme.dart';

const _gap = 10.0;
const _radius = 14.0;

/// أرقام إنجليزية فقط — يحوّل العربية/الفارسية ويرفض أي حرف آخر
class DigitsOnlyFormatter extends TextInputFormatter {
  static const Map<String, String> _toEnglish = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  };

  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final buf = StringBuffer();
    for (final c in newValue.text.split('')) {
      final m = _toEnglish[c] ?? c;
      if (m.length == 1 && '0123456789'.contains(m)) buf.write(m);
    }
    final text = buf.toString();
    if (text == newValue.text) return newValue;
    final pos = text.length.clamp(0, text.length);
    return TextEditingValue(text: text, selection: TextSelection.collapsed(offset: pos));
  }
}

/// للتوافق مع الكود القديم
class EnglishDigitsFormatter extends DigitsOnlyFormatter {}

/// مبلغ بفواصل آلاف — أرقام إنجليزية فقط
class AmountInputFormatter extends TextInputFormatter {
  static const Map<String, String> _toEnglish = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  };

  static String extractDigits(String text) {
    final buf = StringBuffer();
    for (final c in text.split('')) {
      final m = _toEnglish[c] ?? c;
      if (m.length == 1 && '0123456789'.contains(m)) buf.write(m);
    }
    return buf.toString();
  }

  static String formatDigits(String digits) {
    if (digits.isEmpty) return '';
    final n = int.tryParse(digits);
    if (n == null) return digits;
    return NumberFormat('#,##0', 'en_US').format(n);
  }

  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final digits = extractDigits(newValue.text);
    final formatted = formatDigits(digits);
    if (formatted == newValue.text) return newValue;

    final end = newValue.selection.end.clamp(0, newValue.text.length);
    final digitsBefore = extractDigits(newValue.text.substring(0, end)).length;

    var seen = 0;
    var cursor = formatted.length;
    for (var i = 0; i < formatted.length; i++) {
      if (formatted[i] != ',') {
        seen++;
        if (seen >= digitsBefore) {
          cursor = i + 1;
          break;
        }
      }
    }

    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: cursor.clamp(0, formatted.length)),
    );
  }
}

class FreeDeliveryState {
  static const double threshold = 50000;

  bool value = false;
  bool manualOverride = false;

  void reset() {
    value = false;
    manualOverride = false;
  }

  void initFromExisting({required double amount, required bool free}) {
    if (free && amount < threshold) {
      value = true;
      manualOverride = true;
    } else if (!free && amount >= threshold) {
      value = false;
      manualOverride = true;
    } else {
      value = free;
      manualOverride = false;
    }
  }

  void syncFromAmount(double amount) {
    if (manualOverride) return;
    value = amount >= threshold;
  }

  void setManual(bool next) {
    manualOverride = true;
    value = next;
  }

  bool get isAutoApplied => !manualOverride && value;

  static double employeeDeliveryFee(double regionFee, bool free) => free ? 0 : regionFee;
}

class OrderFormUi {
  OrderFormUi._();

  static final digitsOnly = [DigitsOnlyFormatter()];
  static final amountFormatters = [AmountInputFormatter()];
  static const _numKeyboard = TextInputType.numberWithOptions(decimal: false, signed: false);
  static final _numStyle = GoogleFonts.roboto(fontSize: 17, fontWeight: FontWeight.w600, letterSpacing: 0.5);

  static String formatIQD(num n) => '${NumberFormat('#,##0', 'ar_IQ').format(n)} د.ع';

  static double parseAmount(String text) {
    final d = AmountInputFormatter.extractDigits(text);
    if (d.isEmpty) return 0;
    return double.tryParse(d) ?? 0;
  }

  static String formatAmountField(num n) {
    final v = n.toInt();
    if (v == 0) return '0';
    return AmountInputFormatter.formatDigits(v.toString());
  }

  static bool isAmountEmpty(String text) => AmountInputFormatter.extractDigits(text).isEmpty;

  static InputDecoration field(String label, {String? hint}) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      filled: true,
      fillColor: const Color(0xFFF8FAFC),
      isDense: true,
      labelStyle: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.w600, color: EmployeeTheme.onSurfaceVariant),
      hintStyle: GoogleFonts.cairo(fontSize: 13, color: EmployeeTheme.onSurfaceVariant.withValues(alpha: 0.4)),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(_radius), borderSide: BorderSide(color: EmployeeTheme.outline)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(_radius), borderSide: BorderSide(color: EmployeeTheme.outline)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(_radius), borderSide: const BorderSide(color: EmployeeTheme.primary, width: 1.5)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
    );
  }

  /// حقل نص عادي
  static Widget textField({
    required TextEditingController controller,
    required String label,
    String? hint,
    int maxLines = 1,
    ValueChanged<String>? onChanged,
  }) {
    return TextField(
      controller: controller,
      decoration: field(label, hint: hint),
      maxLines: maxLines,
      onChanged: onChanged,
      style: GoogleFonts.cairo(fontSize: 15),
    );
  }

  /// حقل أرقام — إنجليزية فقط
  static Widget numField({
    required TextEditingController controller,
    required String label,
    String? hint,
    bool obscure = false,
    TextAlign textAlign = TextAlign.start,
    TextStyle? style,
    ValueChanged<String>? onChanged,
  }) {
    return TextField(
      controller: controller,
      decoration: field(label, hint: hint),
      keyboardType: _numKeyboard,
      inputFormatters: digitsOnly,
      obscureText: obscure,
      textAlign: textAlign,
      style: style ?? _numStyle,
      onChanged: onChanged,
    );
  }

  /// حقل أرقام داخل Form
  static Widget numFormField({
    required TextEditingController controller,
    required String label,
    String? hint,
    bool obscure = false,
    TextAlign textAlign = TextAlign.start,
    TextStyle? style,
    ValueChanged<String>? onChanged,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      decoration: field(label, hint: hint),
      keyboardType: _numKeyboard,
      inputFormatters: digitsOnly,
      obscureText: obscure,
      textAlign: textAlign,
      style: style ?? _numStyle,
      onChanged: onChanged,
      validator: validator,
    );
  }

  /// رقم الطلب الإداري
  static Widget adminOrderField(TextEditingController controller, {bool form = false}) {
    final field = form
        ? numFormField(
            controller: controller,
            label: 'رقم الطلب الإداري',
            hint: 'اختياري',
            textAlign: TextAlign.center,
            style: GoogleFonts.roboto(fontSize: 18, fontWeight: FontWeight.w700, color: EmployeeTheme.primary),
          )
        : numField(
            controller: controller,
            label: 'رقم الطلب الإداري',
            hint: 'اختياري',
            textAlign: TextAlign.center,
            style: GoogleFonts.roboto(fontSize: 18, fontWeight: FontWeight.w700, color: EmployeeTheme.primary),
          );
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: EmployeeTheme.primary.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(_radius),
      ),
      child: field,
    );
  }

  /// بطاقة النموذج
  static Widget formCard({required List<Widget> children}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: EmployeeTheme.outline),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: children,
      ),
    );
  }

  static Widget sectionDivider() => Padding(
        padding: const EdgeInsets.symmetric(vertical: 14),
        child: Divider(height: 1, color: EmployeeTheme.outline.withValues(alpha: 0.8)),
      );

  /// قسم — عنوان + حقول
  static Widget section({required String title, required List<Widget> children}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(title, style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.w700, color: EmployeeTheme.onSurfaceVariant)),
        const SizedBox(height: 10),
        ..._withGaps(children),
      ],
    );
  }

  static List<Widget> _withGaps(List<Widget> children) {
    if (children.isEmpty) return [];
    final out = <Widget>[children.first];
    for (var i = 1; i < children.length; i++) {
      out.add(gap());
      out.add(children[i]);
    }
    return out;
  }

  static Widget gap() => const SizedBox(height: _gap);

  static Widget regionField({
    required String? regionName,
    required double displayDeliveryFee,
    required bool freeDelivery,
    required bool hasSelection,
    required VoidCallback onTap,
    bool embedded = false,
  }) {
    final content = Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                hasSelection ? (regionName ?? '—') : 'المنطقة *',
                style: GoogleFonts.cairo(fontSize: 15, fontWeight: FontWeight.w600, color: EmployeeTheme.onSurface),
              ),
              if (hasSelection) ...[
                const SizedBox(height: 2),
                Text(
                  freeDelivery ? 'أجرة التوصيل: 0 د.ع (مجاني)' : 'أجرة التوصيل: ${formatIQD(displayDeliveryFee)}',
                  style: GoogleFonts.cairo(fontSize: 12, color: freeDelivery ? EmployeeTheme.success : EmployeeTheme.onSurfaceVariant),
                ),
              ],
            ],
          ),
        ),
        Icon(Icons.expand_more_rounded, color: EmployeeTheme.onSurfaceVariant),
      ],
    );

    if (embedded) {
      return InkWell(onTap: onTap, borderRadius: BorderRadius.circular(8), child: Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: content));
    }

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(_radius),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(_radius),
          border: Border.all(color: hasSelection ? EmployeeTheme.primary : EmployeeTheme.outline),
        ),
        child: content,
      ),
    );
  }

  static Future<Map<String, dynamic>?> pickRegion(BuildContext context, List<dynamic> regions, {int? selectedId}) {
    return showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _RegionPickerSheet(regions: regions, selectedId: selectedId),
    );
  }

  static Widget piecesCounter({
    required int value,
    required int min,
    required int max,
    required ValueChanged<int> onChanged,
  }) {
    return Row(
      children: [
        Text('عدد القطع', style: GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.w600)),
        const Spacer(),
        _counterBtn(Icons.remove, value > min, () => onChanged(value - 1)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Text('$value', style: GoogleFonts.roboto(fontSize: 20, fontWeight: FontWeight.w700, color: EmployeeTheme.primary)),
        ),
        _counterBtn(Icons.add, value < max, () => onChanged(value + 1)),
      ],
    );
  }

  static Widget _counterBtn(IconData icon, bool enabled, VoidCallback onTap) {
    return SizedBox(
      width: 36,
      height: 36,
      child: Material(
        color: enabled ? EmployeeTheme.primary : EmployeeTheme.outline,
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          onTap: enabled ? onTap : null,
          borderRadius: BorderRadius.circular(8),
          child: Icon(icon, size: 20, color: enabled ? Colors.white : EmployeeTheme.onSurfaceVariant),
        ),
      ),
    );
  }

  static Widget phoneStats({required bool loading, required int delivered, required int returned}) {
    if (loading) {
      return Row(
        children: [
          SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: EmployeeTheme.primary)),
          const SizedBox(width: 8),
          Text('جاري التحقق...', style: GoogleFonts.cairo(fontSize: 12, color: EmployeeTheme.onSurfaceVariant)),
        ],
      );
    }
    return Wrap(
      spacing: 8,
      runSpacing: 6,
      children: [
        _statChip('موصّل $delivered', EmployeeTheme.success),
        _statChip('راجع $returned', EmployeeTheme.warning),
      ],
    );
  }

  static Widget _statChip(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(text, style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.w700, color: color)),
    );
  }

  static Widget freeDeliveryTile({
    required bool value,
    required FreeDeliveryState state,
    required double amount,
    required ValueChanged<bool> onChanged,
  }) {
    final hint = state.isAutoApplied
        ? 'تلقائي (50,000+ د.ع)'
        : state.manualOverride
            ? 'تغيير يدوي'
            : 'يُفعّل عند 50,000 د.ع';

    return SwitchListTile(
      contentPadding: EdgeInsets.zero,
      title: Text('توصيل مجاني', style: GoogleFonts.cairo(fontWeight: FontWeight.w600, fontSize: 14)),
      subtitle: Text(hint, style: GoogleFonts.cairo(fontSize: 11, color: EmployeeTheme.onSurfaceVariant)),
      value: value,
      activeThumbColor: EmployeeTheme.success,
      activeTrackColor: EmployeeTheme.success.withValues(alpha: 0.35),
      onChanged: onChanged,
    );
  }

  static Widget paymentSummary({
    required double deliveryFee,
    required double total,
    required bool freeDelivery,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: EmployeeTheme.primary.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(_radius),
        border: Border.all(color: EmployeeTheme.primary.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          _summaryRow('أجرة التوصيل', formatIQD(deliveryFee)),
          const SizedBox(height: 8),
          _summaryRow('المبلغ النهائي', formatIQD(total), bold: true),
          if (freeDelivery) ...[
            const SizedBox(height: 6),
            Text('توصيل مجاني', style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.w600, color: EmployeeTheme.success)),
          ],
        ],
      ),
    );
  }

  static Widget _summaryRow(String label, String value, {bool bold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: GoogleFonts.cairo(fontSize: 13, color: EmployeeTheme.onSurfaceVariant)),
        Text(
          value,
          style: bold
              ? GoogleFonts.cairo(fontSize: 18, fontWeight: FontWeight.w800, color: EmployeeTheme.primary)
              : GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }

  static Widget errorBanner(String message) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: EmployeeTheme.danger.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(_radius),
        border: Border.all(color: EmployeeTheme.danger.withValues(alpha: 0.25)),
      ),
      child: Text(message, style: GoogleFonts.cairo(color: EmployeeTheme.danger, fontWeight: FontWeight.w600, fontSize: 13)),
    );
  }

  static Widget saveButton({required String label, required bool loading, required VoidCallback? onPressed}) {
    return FilledButton(
      onPressed: loading ? null : onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: EmployeeTheme.primary,
        minimumSize: const Size.fromHeight(50),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(_radius)),
      ),
      child: loading
          ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
          : Text(label, style: GoogleFonts.cairo(fontSize: 16, fontWeight: FontWeight.w700)),
    );
  }
}

class _RegionPickerSheet extends StatefulWidget {
  final List<dynamic> regions;
  final int? selectedId;

  const _RegionPickerSheet({required this.regions, this.selectedId});

  @override
  State<_RegionPickerSheet> createState() => _RegionPickerSheetState();
}

class _RegionPickerSheetState extends State<_RegionPickerSheet> {
  final _search = TextEditingController();
  List<dynamic> _filtered = [];

  @override
  void initState() {
    super.initState();
    _filtered = List.from(widget.regions);
    _search.addListener(_applyFilter);
  }

  @override
  void dispose() {
    _search.removeListener(_applyFilter);
    _search.dispose();
    super.dispose();
  }

  void _applyFilter() {
    final q = _search.text.trim().toLowerCase();
    setState(() {
      if (q.isEmpty) {
        _filtered = List.from(widget.regions);
      } else {
        _filtered = widget.regions.where((r) {
          final m = r as Map<String, dynamic>;
          final name = (m['RegionName'] ?? '').toString().toLowerCase();
          final area = (m['RegionArea'] ?? '').toString().toLowerCase();
          return name.contains(q) || area.contains(q);
        }).toList();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final h = MediaQuery.of(context).size.height * 0.7;
    return Container(
      height: h,
      decoration: BoxDecoration(
        color: EmployeeTheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: Column(
        children: [
          const SizedBox(height: 8),
          Container(width: 36, height: 4, decoration: BoxDecoration(color: EmployeeTheme.outline, borderRadius: BorderRadius.circular(2))),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
            child: Text('اختر المنطقة', style: GoogleFonts.cairo(fontSize: 17, fontWeight: FontWeight.w700)),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: TextField(
              controller: _search,
              decoration: OrderFormUi.field('بحث', hint: 'اسم المنطقة'),
              style: GoogleFonts.cairo(fontSize: 15),
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: _filtered.isEmpty
                ? Center(child: Text('لا توجد مناطق', style: GoogleFonts.cairo(color: EmployeeTheme.onSurfaceVariant)))
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
                    itemCount: _filtered.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 6),
                    itemBuilder: (_, i) {
                      final m = _filtered[i] as Map<String, dynamic>;
                      final id = m['RegionID'] as int?;
                      final name = m['RegionName']?.toString() ?? '';
                      final fee = (m['DeliveryFeeIQD'] ?? m['DeliveryFee'] ?? 0) as num;
                      final selected = id != null && id == widget.selectedId;
                      return ListTile(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(_radius),
                          side: BorderSide(color: selected ? EmployeeTheme.primary : EmployeeTheme.outline),
                        ),
                        tileColor: selected ? EmployeeTheme.primary.withValues(alpha: 0.06) : Colors.white,
                        title: Text(name, style: GoogleFonts.cairo(fontWeight: FontWeight.w600)),
                        trailing: Text(OrderFormUi.formatIQD(fee), style: GoogleFonts.cairo(fontSize: 12, color: EmployeeTheme.onSurfaceVariant)),
                        onTap: () => Navigator.pop(context, m),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
