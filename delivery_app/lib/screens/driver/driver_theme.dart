import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// تصميم مميز لتطبيق السائق - شركة ديما الحياة
class DriverTheme {
  DriverTheme._();

  // الألوان الأساسية
  static const Color primary = Color(0xFF0D9488);
  static const Color primaryDark = Color(0xFF0F766E);
  static const Color primaryLight = Color(0xFF5EEAD4);
  static const Color success = Color(0xFF059669);
  static const Color danger = Color(0xFFE11D48);
  static const Color warning = Color(0xFFD97706);
  static const Color karkh = Color(0xFFEA580C);
  static const Color rusafa = Color(0xFF7C3AED);

  static Color get surface => const Color(0xFFF8FAFC);
  static Color get surfaceVariant => Colors.white;
  static Color get onSurface => const Color(0xFF334155);
  static Color get onSurfaceVariant => const Color(0xFF64748B);
  static Color get outline => const Color(0xFFE2E8F0);

  static TextStyle get titleLarge => GoogleFonts.cairo(
        fontSize: 20,
        fontWeight: FontWeight.w800,
        color: onSurface,
      );
  static TextStyle get titleMedium => GoogleFonts.cairo(
        fontSize: 16,
        fontWeight: FontWeight.w700,
        color: onSurface,
      );
  static TextStyle get bodyLarge => GoogleFonts.cairo(
        fontSize: 15,
        fontWeight: FontWeight.w500,
        color: onSurface,
      );
  static TextStyle get bodyMedium => GoogleFonts.cairo(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        color: onSurfaceVariant,
      );
  static TextStyle get labelSmall => GoogleFonts.cairo(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: onSurfaceVariant,
      );

  static BoxDecoration get cardDecoration => BoxDecoration(
        color: surfaceVariant,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      );

  static BoxDecoration cardWithBorder({Color? borderColor}) => BoxDecoration(
        color: surfaceVariant,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: borderColor ?? outline, width: 1),
        boxShadow: [
          BoxShadow(
            color: primary.withValues(alpha: 0.06),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      );

  static BoxDecoration get gradientHeader => BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
          colors: [
            const Color(0xFF334155),
            const Color(0xFF475569),
            primaryDark.withValues(alpha: 0.3),
          ],
        ),
      );

  static InputDecoration inputDecoration({
    required String label,
    String? hint,
    Widget? prefixIcon,
    Widget? suffixIcon,
  }) =>
      InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: prefixIcon,
        suffixIcon: suffixIcon,
        filled: true,
        fillColor: surface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: outline, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: primary, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      );
}
