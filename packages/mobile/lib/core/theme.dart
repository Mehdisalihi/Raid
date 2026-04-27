import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  // Sophisticated Premium Palette (Default is Deep Blue)
  static Color primary = const Color(0xFF1E40AF); 
  static const secondary = Color(0xFF3B82F6); // Bright Blue
  static const accent = Color(0xFF60A5FA); // Light Blue
  static const success = Color(0xFF059669); // Emerald Green
  static const warning = Color(0xFFD97706); // Amber
  static const danger = Color(0xFFDC2626); // Red

  // Light Premium Backgrounds
  static const bg = Color(0xFFF8FAFC); // Slate 50
  static const surface = Color(0xFFFFFFFF); // Pure White
  static const surfaceLight = Color(0xFFF1F5F9); // Slate 100
  static const border = Color(0xFFE2E8F0); // Subtle Gray Border

  // Crisp Typography Colors for Light Theme
  static const text = Color(0xFF0F172A); // Slate 900
  static const textMuted = Color(0xFF475569); // Slate 600
  static const textLight = Color(0xFF94A3B8); // Slate 400
  
  // Dark Premium Backgrounds
  static const darkBg = Color(0xFF0F172A); // Slate 900
  static const darkSurface = Color(0xFF1E293B); // Slate 800
  static const darkBorder = Color(0xFF334155); // Slate 700
  
  // High Contrast Typography for Dark Theme
  static const darkText = Color(0xFFF8FAFC); // Slate 50
  static const darkTextMuted = Color(0xFF94A3B8); // Slate 400

  // Reusable Premium Gradients (Dynamic)
  static Gradient get primaryGradient => LinearGradient(
    colors: [primary, secondary],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static Gradient get accentGradient => const LinearGradient(
    colors: [accent, secondary],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Global Shadow Utility
  static List<BoxShadow> get premiumShadow => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.04),
          blurRadius: 20,
          spreadRadius: 0,
          offset: const Offset(0, 4),
        ),
        BoxShadow(
          color: primary.withValues(alpha: 0.05),
          blurRadius: 10,
          spreadRadius: -2,
          offset: const Offset(0, 2),
        ),
      ];
}

class AppTheme {
  static ThemeData light(Color primary) {
    AppColors.primary = primary;
    final secondary = Color.lerp(primary, Colors.white, 0.2)!;

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: AppColors.bg,
      colorScheme: ColorScheme.light(
        primary: primary,
        secondary: secondary,
        surface: AppColors.surface,
        error: AppColors.danger,
      ),
      fontFamily: GoogleFonts.cairo().fontFamily,
      textTheme: GoogleFonts.cairoTextTheme(),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.surface,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: GoogleFonts.cairo(
          color: AppColors.text,
          fontSize: 17,
          fontWeight: FontWeight.w900,
          letterSpacing: 0.4,
        ),
        iconTheme: const IconThemeData(color: AppColors.text, size: 22),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        color: AppColors.surface,
        clipBehavior: Clip.antiAlias,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.danger, width: 1.5),
        ),
        hintStyle: GoogleFonts.cairo(color: AppColors.textLight, fontSize: 13),
        labelStyle: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 13),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          elevation: 4,
          shadowColor: primary.withValues(alpha: 0.3),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 32),
          textStyle: GoogleFonts.cairo(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.5,
          ),
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: AppColors.surface,
        selectedItemColor: primary,
        unselectedItemColor: AppColors.textLight,
        showSelectedLabels: true,
        showUnselectedLabels: true,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
    );
  }

  static ThemeData dark(Color primary) {
    AppColors.primary = primary;
    final secondary = Color.lerp(primary, Colors.black, 0.2)!;

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.darkBg,
      colorScheme: ColorScheme.dark(
        primary: primary,
        secondary: secondary,
        surface: AppColors.darkSurface,
        error: AppColors.danger,
        onSurface: AppColors.darkText,
      ),
      fontFamily: GoogleFonts.cairo().fontFamily,
      textTheme:
          GoogleFonts.cairoTextTheme(ThemeData.dark().textTheme).copyWith(
        bodyLarge: GoogleFonts.cairo(color: AppColors.darkText),
        bodyMedium: GoogleFonts.cairo(color: AppColors.darkText),
        titleLarge: GoogleFonts.cairo(
            color: AppColors.darkText, fontWeight: FontWeight.bold),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.darkSurface,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: GoogleFonts.cairo(
          color: AppColors.darkText,
          fontSize: 17,
          fontWeight: FontWeight.w900,
          letterSpacing: 0.4,
        ),
        iconTheme: const IconThemeData(color: AppColors.darkText, size: 22),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        color: AppColors.darkSurface,
        clipBehavior: Clip.antiAlias,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.darkSurface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.darkBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.darkBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.danger, width: 1.5),
        ),
        hintStyle:
            GoogleFonts.cairo(color: AppColors.darkTextMuted, fontSize: 13),
        labelStyle:
            GoogleFonts.cairo(color: AppColors.darkTextMuted, fontSize: 13),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          elevation: 4,
          shadowColor: Colors.black.withValues(alpha: 0.5),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 32),
          textStyle: GoogleFonts.cairo(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.5,
          ),
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: AppColors.darkSurface,
        selectedItemColor: primary,
        unselectedItemColor: AppColors.darkTextMuted,
        showSelectedLabels: true,
        showUnselectedLabels: true,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
    );
  }
}
