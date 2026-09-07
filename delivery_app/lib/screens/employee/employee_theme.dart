import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// تصميم v2 — تطبيق الموظفين · ديما الحياة
class EmployeeTheme {
  EmployeeTheme._();

  static const Color primary = Color(0xFF6366F1);
  static const Color primaryDark = Color(0xFF4F46E5);
  static const Color primaryLight = Color(0xFFA5B4FC);
  static const Color secondary = Color(0xFF0D9488);
  static const Color secondaryLight = Color(0xFF5EEAD4);
  static const Color success = Color(0xFF059669);
  static const Color danger = Color(0xFFE11D48);
  static const Color warning = Color(0xFFD97706);
  static const Color info = Color(0xFF0284C7);

  static const Color surface = Color(0xFFF1F5F9);
  static const Color surfaceVariant = Colors.white;
  static const Color onSurface = Color(0xFF0F172A);
  static const Color onSurfaceVariant = Color(0xFF64748B);
  static const Color outline = Color(0xFFE2E8F0);
  static const Color outlineStrong = Color(0xFFCBD5E1);

  static const double radiusSm = 12;
  static const double radiusMd = 16;
  static const double radiusLg = 22;
  static const double radiusXl = 28;

  static LinearGradient get primaryGradient => const LinearGradient(
        begin: Alignment.topRight,
        end: Alignment.bottomLeft,
        colors: [primary, primaryDark, Color(0xFF4338CA)],
      );

  static LinearGradient gradientFor(Color accent) => LinearGradient(
        begin: Alignment.topRight,
        end: Alignment.bottomLeft,
        colors: [accent.withValues(alpha: 0.85), accent, accent.withValues(alpha: 0.92)],
      );

  static List<BoxShadow> get cardShadow => [
        BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 18, offset: const Offset(0, 6)),
        BoxShadow(color: primary.withValues(alpha: 0.04), blurRadius: 24, offset: const Offset(0, 10)),
      ];

  static List<BoxShadow> shadowFor(Color accent) => [
        BoxShadow(color: accent.withValues(alpha: 0.22), blurRadius: 20, offset: const Offset(0, 8)),
        BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4)),
      ];

  static TextStyle get titleLarge => _cairo(22, FontWeight.w800, onSurface);
  static TextStyle get titleMedium => _cairo(17, FontWeight.w800, onSurface);
  static TextStyle get titleSmall => _cairo(15, FontWeight.w700, onSurface);
  static TextStyle get bodyLarge => _cairo(15, FontWeight.w500, onSurface);
  static TextStyle get bodyMedium => _cairo(14, FontWeight.w500, onSurfaceVariant);
  static TextStyle get labelSmall => _cairo(12, FontWeight.w700, onSurfaceVariant);

  static TextStyle _cairo(double size, FontWeight weight, Color color, {double height = 1.35}) =>
      GoogleFonts.cairo(fontSize: size, fontWeight: weight, color: color, height: height);

  static ThemeData materialTheme() {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primary,
        primary: primary,
        secondary: secondary,
        surface: surface,
        error: danger,
      ),
      scaffoldBackgroundColor: surface,
      textTheme: GoogleFonts.cairoTextTheme().apply(
        bodyColor: onSurface,
        displayColor: onSurface,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: titleMedium,
        iconTheme: const IconThemeData(color: onSurface),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          minimumSize: const Size(0, 48),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusMd)),
          textStyle: _cairo(16, FontWeight.w800, Colors.white),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(0, 48),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusMd)),
          textStyle: _cairo(15, FontWeight.w700, primary),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          minimumSize: const Size(0, 44),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          textStyle: _cairo(15, FontWeight.w700, primary),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceVariant,
        labelStyle: labelSmall,
        hintStyle: bodyMedium.copyWith(color: onSurfaceVariant.withValues(alpha: 0.55)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(radiusMd), borderSide: BorderSide.none),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: outline, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: primary, width: 2),
        ),
      ),
    );
  }

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
        hintStyle: bodyMedium.copyWith(color: onSurfaceVariant.withValues(alpha: 0.55)),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(radiusMd), borderSide: BorderSide.none),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: outline),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: primary, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      );
}
