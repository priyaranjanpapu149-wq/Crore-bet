import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'colors.dart';

class AppTheme {
  static ThemeData get dark => ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: Colors.transparent,
    primaryColor: const Color(0xFFF5F8FF),
    fontFamily: GoogleFonts.lato().fontFamily,
    textTheme: ThemeData.dark().textTheme.apply(
      fontFamily: GoogleFonts.lato().fontFamily,
      bodyColor: const Color(0xFFF5F8FF),
      displayColor: const Color(0xFFF5F8FF),
    ),
    colorScheme: const ColorScheme.dark(
      primary: AppColors.gold,
      secondary: AppColors.goldLight,
      surface: AppColors.surface,
      error: AppColors.error,
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: Colors.transparent,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: GoogleFonts.cinzel(
        color: const Color(0xFFF5F8FF),
        fontSize: 20,
        fontWeight: FontWeight.bold,
        letterSpacing: 3,
      ),
      iconTheme: const IconThemeData(color: AppColors.gold),
    ),
  );
}