import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// تصميم v2 — تطبيق السائق · ديما الحياة
class DriverTheme {
  DriverTheme._();

  static const Color primary = Color(0xFF0D9488);
  static const Color primaryDark = Color(0xFF0F766E);
  static const Color primaryLight = Color(0xFF5EEAD4);
  static const Color secondary = Color(0xFF0284C7);
  static const Color success = Color(0xFF059669);
  static const Color danger = Color(0xFFE11D48);
  static const Color warning = Color(0xFFD97706);
  static const Color info = Color(0xFF6366F1);
  static const Color karkh = Color(0xFFEA580C);
  static const Color rusafa = Color(0xFF7C3AED);

  static const Color surface = Color(0xFFF1F5F9);
  static const Color surfaceVariant = Colors.white;
  static const Color onSurface = Color(0xFF0F172A);
  static const Color onSurfaceVariant = Color(0xFF64748B);
  static const Color outline = Color(0xFFE2E8F0);

  static const double radiusSm = 12;
  static const double radiusMd = 16;
  static const double radiusLg = 22;
  static const double radiusXl = 28;

  static LinearGradient get primaryGradient => const LinearGradient(
        begin: Alignment.topRight,
        end: Alignment.bottomLeft,
        colors: [primaryLight, primary, primaryDark],
      );

  static LinearGradient gradientFor(Color accent) => LinearGradient(
        begin: Alignment.topRight,
        end: Alignment.bottomLeft,
        colors: [accent.withValues(alpha: 0.85), accent, accent.withValues(alpha: 0.92)],
      );

  static List<BoxShadow> get cardShadow => [
        BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 18, offset: const Offset(0, 6)),
        BoxShadow(color: primary.withValues(alpha: 0.05), blurRadius: 24, offset: const Offset(0, 10)),
      ];

  static List<BoxShadow> shadowFor(Color accent) => [
        BoxShadow(color: accent.withValues(alpha: 0.22), blurRadius: 20, offset: const Offset(0, 8)),
        BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4)),
      ];

  static TextStyle get titleLarge => GoogleFonts.cairo(fontSize: 22, fontWeight: FontWeight.w800, color: onSurface);
  static TextStyle get titleMedium => GoogleFonts.cairo(fontSize: 17, fontWeight: FontWeight.w800, color: onSurface);
  static TextStyle get titleSmall => GoogleFonts.cairo(fontSize: 15, fontWeight: FontWeight.w700, color: onSurface);
  static TextStyle get bodyLarge => GoogleFonts.cairo(fontSize: 15, fontWeight: FontWeight.w500, color: onSurface);
  static TextStyle get bodyMedium => GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.w500, color: onSurfaceVariant);
  static TextStyle get labelSmall => GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.w700, color: onSurfaceVariant);

  static ThemeData materialTheme() => ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: primary, primary: primary, secondary: secondary, surface: surface),
        scaffoldBackgroundColor: surface,
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            backgroundColor: primary,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusMd)),
            textStyle: GoogleFonts.cairo(fontSize: 16, fontWeight: FontWeight.w800),
          ),
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
        fillColor: surfaceVariant,
        labelStyle: labelSmall,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(radiusMd), borderSide: BorderSide.none),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(radiusMd), borderSide: const BorderSide(color: outline)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(radiusMd), borderSide: const BorderSide(color: primary, width: 2)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      );
}
