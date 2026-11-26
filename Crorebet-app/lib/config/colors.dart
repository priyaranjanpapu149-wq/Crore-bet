import 'package:flutter/material.dart';

class AppColors {
  static const Color background   = Color(0xFF043B2A);
  static const Color surface      = Color(0xFF0A5139);
  static const Color surfaceLight = Color(0xFF126144);
  static const Color card         = Color(0xFF0A5139);
  static const Color cardBorder   = Color(0xFFD4A83A);

  static const Color flameBorder  = Color(0xFFD4A83A);
  static const Color yellow        = Color(0xFFD4A83A);
  static const Color yellowLight   = Color(0xFF146043);
  static const Color yellowDark    = Color(0xFF9D761C);
  static const Color yellowBright  = Color(0xFFF1C65F);
  static const Color yellowGlow    = Color(0xFFD6A634);
  static const Color boxBg   = Color(0xFF0A5139);
  static const Color boxText = Color(0xFFF5F8FF);
  static const Color gold = Color(0xFFF5F8FF);
  static const Color goldLight = Color(0xFF146043);
  static const Color goldDark  = Color(0xFF9D761C);
  static const Color goldGlow  = Color(0x66D6AA41);
  static const Color accent      = Color(0xFFA855F7);
  static const Color accentLight = Color(0xFFC084FC);
  static const Color accentDark  = Color(0xFF7C3AED);
  static const Color accentGlow  = Color(0x66A855F7);
  static const Color textPrimary   = Color(0xFFF5F8FF);
  static const Color textSecondary = Color(0xFFF3E7D0);
  static const Color textMuted     = Color(0xFFE5D6B7);
  static const Color hintText      = Color(0xFFCEBD9B);
  static const Color success = Color(0xFF22C55E);
  static const Color error   = Color(0xFFDC2626);
  static const Color warning = Color(0xFFF59E0B);
  static const LinearGradient yellowFire = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [
      Color(0xFF0A4A35),
      Color(0xFFECCF83),
      Color(0xFFD6AA41),
      Color(0xFFB9943C),
    ],
    stops: [0.0, 0.35, 0.68, 1.0],
  );
  static const LinearGradient cardGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF146043),
      Color(0xFF0A5139),
      Color(0xFF126144),
    ],
  );
  static const LinearGradient goldGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [yellowLight, yellow, yellowDark],
    stops: [0.0, 0.5, 1.0],
  );
  static const LinearGradient purpleGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [accentLight, accent, accentDark],
  );
  static const RadialGradient cosmicRadial = RadialGradient(
    center: Alignment(0, -0.3),
    radius: 1.5,
    colors: [
      Color(0xFF043B2A),
      Color(0xFF043B2A),
      Color(0xFF07513A),
    ],
    stops: [0.0, 0.5, 1.0],
  );

  static const LinearGradient backgroundGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [
      Color(0xFF043B2A),
      Color(0xFF043B2A),
      Color(0xFF07513A),
    ],
  );
}
