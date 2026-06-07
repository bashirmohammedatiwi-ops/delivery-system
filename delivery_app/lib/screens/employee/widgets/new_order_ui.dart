import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../employee_theme.dart';
import 'order_form_ui.dart';

/// واجهة صفحة «طلب جديد»
class NewOrderUi {
  NewOrderUi._();

  static const _labels = ['الموظف', 'المستلم', 'التوصيل', 'المبلغ'];
  static const _radius = 18.0;
  static const _fieldRadius = 14.0;

  static final _heroNumStyle = GoogleFonts.roboto(
    fontSize: 28,
    fontWeight: FontWeight.w700,
    color: EmployeeTheme.primary,
    letterSpacing: 1.5,
  );

  /// شريط التقدّم — بسيط
  static Widget progressStrip(int completedSteps) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        children: [
          for (var i = 0; i < 4; i++) ...[
            _progressStep(i + 1, _labels[i], completedSteps),
            if (i < 3)
              Expanded(
                child: Container(
                  height: 2,
                  margin: const EdgeInsets.only(bottom: 18, left: 4, right: 4),
                  decoration: BoxDecoration(
                    color: completedSteps > i + 1 ? EmployeeTheme.primary : EmployeeTheme.outline,
                    borderRadius: BorderRadius.circular(1),
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }

  static Widget _progressStep(int step, String label, int completed) {
    final done = completed >= step;
    final active = completed + 1 == step || (completed == 0 && step == 1);
    return Column(
      children: [
        Container(
          width: 30,
          height: 30,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: done ? EmployeeTheme.primary : active ? EmployeeTheme.primary.withValues(alpha: 0.12) : Colors.white,
            shape: BoxShape.circle,
            border: Border.all(color: done || active ? EmployeeTheme.primary : EmployeeTheme.outline, width: 1.5),
          ),
          child: done
              ? const Icon(Icons.check_rounded, size: 16, color: Colors.white)
              : Text(
                  '$step',
                  style: GoogleFonts.cairo(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: active ? EmployeeTheme.primary : EmployeeTheme.onSurfaceVariant,
                  ),
                ),
        ),
        const SizedBox(height: 5),
        Text(
          label,
          style: GoogleFonts.cairo(
            fontSize: 10,
            fontWeight: done || active ? FontWeight.w700 : FontWeight.w500,
            color: done || active ? EmployeeTheme.primary : EmployeeTheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  /// بطاقة قسم — أشكال محسّنة
  static Widget block({
    required IconData icon,
    required String title,
    String? badge,
    required Widget child,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(_radius),
        border: Border.all(color: EmployeeTheme.outline),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 14, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(9),
                  decoration: BoxDecoration(
                    color: EmployeeTheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, size: 20, color: EmployeeTheme.primary),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(title, style: GoogleFonts.cairo(fontSize: 15, fontWeight: FontWeight.w800, color: EmployeeTheme.onSurface)),
                ),
                if (badge != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                    decoration: BoxDecoration(
                      color: EmployeeTheme.outline.withValues(alpha: 0.45),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(badge, style: GoogleFonts.cairo(fontSize: 10, fontWeight: FontWeight.w600, color: EmployeeTheme.onSurfaceVariant)),
                  ),
              ],
            ),
          ),
          Divider(height: 1, color: EmployeeTheme.outline.withValues(alpha: 0.7)),
          Padding(padding: const EdgeInsets.all(16), child: child),
        ],
      ),
    );
  }

  /// حقل رقم بارز — مشترك بين الإداري والمبلغ
  static Widget heroNumField({
    required TextEditingController controller,
    required String hint,
    String? suffix,
    ValueChanged<String>? onChanged,
    List<TextInputFormatter>? inputFormatters,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: EmployeeTheme.primary.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(_fieldRadius),
        border: Border.all(color: EmployeeTheme.primary.withValues(alpha: 0.22)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              onChanged: onChanged,
              keyboardType: const TextInputType.numberWithOptions(decimal: false, signed: false),
              inputFormatters: inputFormatters ?? OrderFormUi.digitsOnly,
              textAlign: TextAlign.center,
              style: _heroNumStyle,
              decoration: InputDecoration(
                hintText: hint,
                hintStyle: _heroNumStyle.copyWith(color: EmployeeTheme.primary.withValues(alpha: 0.35)),
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                contentPadding: EdgeInsets.zero,
                isDense: true,
              ),
            ),
          ),
          if (suffix != null)
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: Text(
                suffix,
                style: GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.w700, color: EmployeeTheme.onSurfaceVariant),
              ),
            ),
        ],
      ),
    );
  }

  /// رقم الطلب الإداري
  static Widget adminHero(TextEditingController controller) {
    return block(
      icon: Icons.tag_rounded,
      title: 'رقم الطلب الإداري',
      badge: 'اختياري',
      child: heroNumField(controller: controller, hint: '12345'),
    );
  }

  /// مبلغ الفاتورة — نفس أسلوب الإداري
  static Widget amountHero({
    required TextEditingController controller,
    ValueChanged<String>? onChanged,
  }) {
    return block(
      icon: Icons.payments_outlined,
      title: 'مبلغ الفاتورة',
      badge: 'مطلوب',
      child: heroNumField(
        controller: controller,
        hint: '0',
        suffix: 'د.ع',
        onChanged: onChanged,
        inputFormatters: OrderFormUi.amountFormatters,
      ),
    );
  }

  /// اختيار المنطقة
  static Widget regionTile({
    required String? regionName,
    required double displayDeliveryFee,
    required bool freeDelivery,
    required bool hasSelection,
    required VoidCallback onTap,
  }) {
    return Material(
      color: hasSelection ? EmployeeTheme.primary.withValues(alpha: 0.04) : const Color(0xFFF8FAFC),
      borderRadius: BorderRadius.circular(_fieldRadius),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(_fieldRadius),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(_fieldRadius),
            border: Border.all(color: hasSelection ? EmployeeTheme.primary : EmployeeTheme.outline),
          ),
          child: Row(
            children: [
              Icon(Icons.location_on_outlined, color: hasSelection ? EmployeeTheme.primary : EmployeeTheme.onSurfaceVariant, size: 22),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      hasSelection ? (regionName ?? '—') : 'اختر المنطقة *',
                      style: GoogleFonts.cairo(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: hasSelection ? EmployeeTheme.onSurface : EmployeeTheme.onSurfaceVariant,
                      ),
                    ),
                    if (hasSelection) ...[
                      const SizedBox(height: 3),
                      Text(
                        freeDelivery ? 'أجرة التوصيل: 0 د.ع · مجاني' : 'أجرة: ${OrderFormUi.formatIQD(displayDeliveryFee)}',
                        style: GoogleFonts.cairo(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: freeDelivery ? EmployeeTheme.success : EmployeeTheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              Icon(Icons.chevron_left_rounded, color: EmployeeTheme.primary, size: 24),
            ],
          ),
        ),
      ),
    );
  }

  /// عداد القطع
  static Widget piecesRow({
    required int value,
    required int min,
    required int max,
    required ValueChanged<int> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(_fieldRadius),
        border: Border.all(color: EmployeeTheme.outline),
      ),
      child: Row(
        children: [
          Icon(Icons.inventory_2_outlined, size: 20, color: EmployeeTheme.primary),
          const SizedBox(width: 8),
          Text('عدد القطع', style: GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.w700)),
          const Spacer(),
          _stepBtn(Icons.remove_rounded, value > min, () => onChanged(value - 1)),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Text('$value', style: GoogleFonts.roboto(fontSize: 22, fontWeight: FontWeight.w800, color: EmployeeTheme.primary)),
          ),
          _stepBtn(Icons.add_rounded, value < max, () => onChanged(value + 1)),
        ],
      ),
    );
  }

  static Widget _stepBtn(IconData icon, bool on, VoidCallback tap) {
    return SizedBox(
      width: 40,
      height: 40,
      child: Material(
        color: on ? EmployeeTheme.primary : EmployeeTheme.outline.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: on ? tap : null,
          borderRadius: BorderRadius.circular(12),
          child: Icon(icon, color: on ? Colors.white : EmployeeTheme.onSurfaceVariant, size: 20),
        ),
      ),
    );
  }

  /// توصيل مجاني
  static Widget freeDeliveryCard({
    required bool value,
    required FreeDeliveryState state,
    required ValueChanged<bool> onChanged,
  }) {
    final hint = state.isAutoApplied
        ? 'مُفعّل تلقائياً (50,000+ د.ع)'
        : state.manualOverride
            ? 'تعديل يدوي'
            : 'يُفعّل تلقائياً عند 50,000 د.ع';

    return Container(
      decoration: BoxDecoration(
        color: value ? EmployeeTheme.success.withValues(alpha: 0.08) : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(_fieldRadius),
        border: Border.all(color: value ? EmployeeTheme.success.withValues(alpha: 0.4) : EmployeeTheme.outline),
      ),
      child: SwitchListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 12),
        title: Text('توصيل مجاني', style: GoogleFonts.cairo(fontWeight: FontWeight.w700, fontSize: 14)),
        subtitle: Text(hint, style: GoogleFonts.cairo(fontSize: 11, color: EmployeeTheme.onSurfaceVariant)),
        value: value,
        activeTrackColor: EmployeeTheme.success.withValues(alpha: 0.35),
        activeThumbColor: EmployeeTheme.success,
        onChanged: onChanged,
      ),
    );
  }

  /// ملخص المبلغ
  static Widget amountSummary({
    required double deliveryFee,
    required double total,
    required bool freeDelivery,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: EmployeeTheme.primary.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(_fieldRadius),
        border: Border.all(color: EmployeeTheme.primary.withValues(alpha: 0.18)),
      ),
      child: Column(
        children: [
          _summaryRow('أجرة التوصيل', OrderFormUi.formatIQD(deliveryFee)),
          const SizedBox(height: 8),
          const Divider(height: 1),
          const SizedBox(height: 8),
          _summaryRow('المبلغ النهائي', OrderFormUi.formatIQD(total), bold: true),
          if (freeDelivery) ...[
            const SizedBox(height: 6),
            Text('توصيل مجاني', style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.w700, color: EmployeeTheme.success)),
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
              ? GoogleFonts.cairo(fontSize: 20, fontWeight: FontWeight.w800, color: EmployeeTheme.primary)
              : GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }

  /// زر الحفظ — داخل المحتوى (غير ثابت)
  static Widget saveButton({
    required bool loading,
    required VoidCallback? onSave,
    String label = 'حفظ الطلب',
  }) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: FilledButton(
        onPressed: loading ? null : onSave,
        style: FilledButton.styleFrom(
          backgroundColor: EmployeeTheme.primary,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
        child: loading
            ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : Text(label, style: GoogleFonts.cairo(fontSize: 16, fontWeight: FontWeight.w800)),
      ),
    );
  }

  /// رأس نافذة التعديل
  static Widget editSheetHeader({
    required String shipmentNumber,
    required VoidCallback onClose,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Center(
          child: Container(
            width: 44,
            height: 4,
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(color: EmployeeTheme.outline, borderRadius: BorderRadius.circular(2)),
          ),
        ),
        Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: EmployeeTheme.primary,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '#$shipmentNumber',
                style: GoogleFonts.roboto(fontWeight: FontWeight.w800, color: Colors.white, fontSize: 14),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'تعديل الطلب',
                style: GoogleFonts.cairo(fontSize: 18, fontWeight: FontWeight.w800),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.close_rounded),
              onPressed: onClose,
              style: IconButton.styleFrom(backgroundColor: EmployeeTheme.outline.withValues(alpha: 0.35)),
            ),
          ],
        ),
      ],
    );
  }

  /// قسم الطباعة — بعد الحفظ
  static Widget printSection({
    required String shipmentNumber,
    required bool loading,
    required VoidCallback? onPrint,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: EmployeeTheme.success.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: EmployeeTheme.success.withValues(alpha: 0.25)),
          ),
          child: Row(
            children: [
              Icon(Icons.check_circle_rounded, color: EmployeeTheme.success, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('تم الحفظ بنجاح', style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.w700, color: EmployeeTheme.success)),
                    Text('#$shipmentNumber', style: GoogleFonts.roboto(fontSize: 16, fontWeight: FontWeight.w800, color: EmployeeTheme.onSurface)),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          height: 52,
          child: FilledButton.icon(
            onPressed: loading ? null : onPrint,
            icon: loading
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.print_rounded),
            label: Text('طباعة الملصق', style: GoogleFonts.cairo(fontSize: 16, fontWeight: FontWeight.w800)),
            style: FilledButton.styleFrom(
              backgroundColor: EmployeeTheme.success,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
        ),
      ],
    );
  }
}
