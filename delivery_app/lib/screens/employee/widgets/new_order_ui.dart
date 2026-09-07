import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../employee_theme.dart';
import '../employee_ui_kit.dart';
import 'order_form_ui.dart';

/// واجهة صفحة «طلب جديد» — v2
class NewOrderUi {
  NewOrderUi._();

  static const _labels = ['الموظف', 'المستلم', 'التوصيل', 'المبلغ'];
  static const _fieldRadius = 14.0;

  static final _heroNumStyle = GoogleFonts.roboto(
    fontSize: 30,
    fontWeight: FontWeight.w700,
    color: EmployeeTheme.primary,
    letterSpacing: 1.2,
  );

  static int computeProgress({
    required bool hasEmpCode,
    required bool hasPhone,
    required bool hasRegion,
    required bool hasAddress,
    required bool hasAmount,
  }) {
    var n = 0;
    if (hasEmpCode) n++;
    if (hasPhone) n++;
    if (hasRegion && hasAddress) n++;
    if (hasAmount) n++;
    return n;
  }

  static Widget progressStrip(int completedSteps) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(EmployeeTheme.radiusLg),
        border: Border.all(color: EmployeeTheme.outline),
        boxShadow: EmployeeTheme.cardShadow,
      ),
      child: Row(
        children: [
          for (var i = 0; i < 4; i++) ...[
            _progressStep(i + 1, _labels[i], completedSteps),
            if (i < 3)
              Expanded(
                child: Container(
                  height: 3,
                  margin: const EdgeInsets.only(bottom: 18, left: 4, right: 4),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(2),
                    gradient: completedSteps > i + 1
                        ? EmployeeTheme.primaryGradient
                        : null,
                    color: completedSteps > i + 1 ? null : EmployeeTheme.outline,
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
        AnimatedContainer(
          duration: const Duration(milliseconds: 240),
          width: 32,
          height: 32,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            gradient: done ? EmployeeTheme.primaryGradient : null,
            color: done
                ? null
                : active
                    ? EmployeeTheme.primary.withValues(alpha: 0.12)
                    : EmployeeTheme.surface,
            shape: BoxShape.circle,
            border: Border.all(
              color: done || active ? EmployeeTheme.primary : EmployeeTheme.outline,
              width: done ? 0 : 1.5,
            ),
          ),
          child: done
              ? const Icon(Icons.check_rounded, size: 17, color: Colors.white)
              : Text(
                  '$step',
                  style: GoogleFonts.cairo(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: active ? EmployeeTheme.primary : EmployeeTheme.onSurfaceVariant,
                  ),
                ),
        ),
        const SizedBox(height: 6),
        Text(
          label,
          style: GoogleFonts.cairo(
            fontSize: 10,
            fontWeight: done || active ? FontWeight.w800 : FontWeight.w500,
            color: done || active ? EmployeeTheme.primary : EmployeeTheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  static Widget block({
    required IconData icon,
    required String title,
    String? badge,
    Color? accent,
    required Widget child,
  }) {
    return EmployeeUiKit.sectionCard(
      icon: icon,
      title: title,
      badge: badge,
      accent: accent,
      child: child,
    );
  }

  static Widget heroNumField({
    required TextEditingController controller,
    required String hint,
    String? suffix,
    ValueChanged<String>? onChanged,
    List<TextInputFormatter>? inputFormatters,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            EmployeeTheme.primary.withValues(alpha: 0.08),
            EmployeeTheme.primary.withValues(alpha: 0.03),
          ],
        ),
        borderRadius: BorderRadius.circular(_fieldRadius),
        border: Border.all(color: EmployeeTheme.primary.withValues(alpha: 0.2)),
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
                hintStyle: _heroNumStyle.copyWith(color: EmployeeTheme.primary.withValues(alpha: 0.3)),
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                contentPadding: EdgeInsets.zero,
                isDense: true,
              ),
            ),
          ),
          if (suffix != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: EmployeeTheme.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                suffix,
                style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.w800, color: EmployeeTheme.primary),
              ),
            ),
        ],
      ),
    );
  }

  static Widget adminHero(TextEditingController controller) {
    return block(
      icon: Icons.tag_rounded,
      title: 'رقم الطلب الإداري',
      badge: 'اختياري',
      accent: EmployeeTheme.info,
      child: heroNumField(controller: controller, hint: '12345'),
    );
  }

  static Widget amountHero({
    required TextEditingController controller,
    ValueChanged<String>? onChanged,
  }) {
    return block(
      icon: Icons.payments_outlined,
      title: 'مبلغ الفاتورة',
      badge: 'مطلوب',
      accent: EmployeeTheme.warning,
      child: heroNumField(
        controller: controller,
        hint: '0',
        suffix: 'د.ع',
        onChanged: onChanged,
        inputFormatters: OrderFormUi.amountFormatters,
      ),
    );
  }

  static Widget regionTile({
    required String? regionName,
    required double displayDeliveryFee,
    required bool freeDelivery,
    required bool hasSelection,
    required VoidCallback onTap,
  }) {
    return Material(
      color: hasSelection ? EmployeeTheme.secondary.withValues(alpha: 0.06) : EmployeeTheme.surface,
      borderRadius: BorderRadius.circular(_fieldRadius),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(_fieldRadius),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(_fieldRadius),
            border: Border.all(color: hasSelection ? EmployeeTheme.secondary : EmployeeTheme.outline, width: hasSelection ? 1.5 : 1),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: (hasSelection ? EmployeeTheme.secondary : EmployeeTheme.onSurfaceVariant).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.location_on_rounded,
                  color: hasSelection ? EmployeeTheme.secondary : EmployeeTheme.onSurfaceVariant,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      hasSelection ? (regionName ?? '—') : 'اختر المنطقة *',
                      style: GoogleFonts.cairo(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: hasSelection ? EmployeeTheme.onSurface : EmployeeTheme.onSurfaceVariant,
                      ),
                    ),
                    if (hasSelection) ...[
                      const SizedBox(height: 4),
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
              Icon(Icons.chevron_left_rounded, color: EmployeeTheme.secondary, size: 26),
            ],
          ),
        ),
      ),
    );
  }

  static Widget piecesRow({
    required int value,
    required int min,
    required int max,
    required ValueChanged<int> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: EmployeeTheme.surface,
        borderRadius: BorderRadius.circular(_fieldRadius),
        border: Border.all(color: EmployeeTheme.outline),
      ),
      child: Row(
        children: [
          Icon(Icons.inventory_2_outlined, size: 22, color: EmployeeTheme.primary),
          const SizedBox(width: 10),
          Text('عدد القطع', style: GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.w800)),
          const Spacer(),
          _stepBtn(Icons.remove_rounded, value > min, () => onChanged(value - 1)),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text('$value', style: GoogleFonts.roboto(fontSize: 24, fontWeight: FontWeight.w800, color: EmployeeTheme.primary)),
          ),
          _stepBtn(Icons.add_rounded, value < max, () => onChanged(value + 1)),
        ],
      ),
    );
  }

  static Widget _stepBtn(IconData icon, bool on, VoidCallback tap) {
    return SizedBox(
      width: 42,
      height: 42,
      child: Material(
        color: on ? EmployeeTheme.primary : EmployeeTheme.outline.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(13),
        child: InkWell(
          onTap: on ? tap : null,
          borderRadius: BorderRadius.circular(13),
          child: Icon(icon, color: on ? Colors.white : EmployeeTheme.onSurfaceVariant, size: 22),
        ),
      ),
    );
  }

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
        gradient: value
            ? LinearGradient(colors: [EmployeeTheme.success.withValues(alpha: 0.12), EmployeeTheme.success.withValues(alpha: 0.04)])
            : null,
        color: value ? null : EmployeeTheme.surface,
        borderRadius: BorderRadius.circular(_fieldRadius),
        border: Border.all(color: value ? EmployeeTheme.success.withValues(alpha: 0.35) : EmployeeTheme.outline),
      ),
      child: SwitchListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 12),
        title: Text('توصيل مجاني', style: GoogleFonts.cairo(fontWeight: FontWeight.w800, fontSize: 14)),
        subtitle: Text(hint, style: GoogleFonts.cairo(fontSize: 11, color: EmployeeTheme.onSurfaceVariant)),
        value: value,
        activeTrackColor: EmployeeTheme.success.withValues(alpha: 0.35),
        activeThumbColor: EmployeeTheme.success,
        onChanged: onChanged,
      ),
    );
  }

  static Widget amountSummary({
    required double deliveryFee,
    required double total,
    required bool freeDelivery,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [EmployeeTheme.primary.withValues(alpha: 0.1), EmployeeTheme.primary.withValues(alpha: 0.04)],
        ),
        borderRadius: BorderRadius.circular(_fieldRadius),
        border: Border.all(color: EmployeeTheme.primary.withValues(alpha: 0.18)),
      ),
      child: Column(
        children: [
          _summaryRow('أجرة التوصيل', OrderFormUi.formatIQD(deliveryFee)),
          const SizedBox(height: 10),
          Divider(height: 1, color: EmployeeTheme.primary.withValues(alpha: 0.12)),
          const SizedBox(height: 10),
          _summaryRow('المبلغ النهائي', OrderFormUi.formatIQD(total), bold: true),
          if (freeDelivery) ...[
            const SizedBox(height: 8),
            EmployeeUiKit.statusChip('توصيل مجاني', EmployeeTheme.success),
          ],
        ],
      ),
    );
  }

  static Widget compactTotalBar({
    required double total,
    required bool freeDelivery,
  }) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('المبلغ النهائي', style: GoogleFonts.cairo(fontSize: 12, color: EmployeeTheme.onSurfaceVariant)),
              Text(
                OrderFormUi.formatIQD(total),
                style: GoogleFonts.cairo(fontSize: 20, fontWeight: FontWeight.w800, color: EmployeeTheme.primary),
              ),
            ],
          ),
        ),
        if (freeDelivery) EmployeeUiKit.statusChip('مجاني', EmployeeTheme.success),
      ],
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
              ? GoogleFonts.cairo(fontSize: 22, fontWeight: FontWeight.w800, color: EmployeeTheme.primary)
              : GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.w700),
        ),
      ],
    );
  }

  static Widget saveButton({
    required bool loading,
    required VoidCallback? onSave,
    String label = 'حفظ الطلب',
  }) {
    return SizedBox(
      width: double.infinity,
      height: 54,
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: EmployeeTheme.primaryGradient,
          borderRadius: BorderRadius.circular(EmployeeTheme.radiusMd),
          boxShadow: EmployeeTheme.shadowFor(EmployeeTheme.primary),
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: loading ? null : onSave,
            borderRadius: BorderRadius.circular(EmployeeTheme.radiusMd),
            child: Center(
              child: loading
                  ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.check_circle_rounded, color: Colors.white, size: 22),
                        const SizedBox(width: 8),
                        Text(label, style: GoogleFonts.cairo(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white)),
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
  }

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
            margin: const EdgeInsets.only(bottom: 14),
            decoration: BoxDecoration(color: EmployeeTheme.outline, borderRadius: BorderRadius.circular(2)),
          ),
        ),
        Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
              decoration: BoxDecoration(
                gradient: EmployeeTheme.primaryGradient,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                '#$shipmentNumber',
                style: GoogleFonts.roboto(fontWeight: FontWeight.w800, color: Colors.white, fontSize: 14),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(child: Text('تعديل الطلب', style: EmployeeTheme.titleMedium)),
            IconButton(
              icon: const Icon(Icons.close_rounded),
              onPressed: onClose,
              style: IconButton.styleFrom(backgroundColor: EmployeeTheme.outline.withValues(alpha: 0.45)),
            ),
          ],
        ),
      ],
    );
  }

  static Widget printSection({
    required String shipmentNumber,
    required bool loading,
    required VoidCallback? onPrint,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        EmployeeUiKit.infoBanner(
          message: 'تم الحفظ · شحنة #$shipmentNumber',
          color: EmployeeTheme.success,
          icon: Icons.check_circle_rounded,
        ),
        const SizedBox(height: 14),
        SizedBox(
          width: double.infinity,
          height: 54,
          child: FilledButton.icon(
            onPressed: loading ? null : onPrint,
            icon: loading
                ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.print_rounded),
            label: Text('طباعة الملصق', style: GoogleFonts.cairo(fontSize: 16, fontWeight: FontWeight.w800)),
            style: FilledButton.styleFrom(
              backgroundColor: EmployeeTheme.success,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(EmployeeTheme.radiusMd)),
            ),
          ),
        ),
      ],
    );
  }
}
