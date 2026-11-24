import 'package:flutter/material.dart';

class AppColors {
  static const Color background   = Color(0xFF0B1933);
  static const Color surface      = Color(0xFF172F55);
  static const Color surfaceLight = Color(0xFF23406C);
  static const Color card         = Color(0xFF172F55);
  static const Color cardBorder   = Color(0xFF78B9FF);

  static const Color flameBorder  = Color(0xFF78B9FF);
  static const Color yellow        = Color(0xFF78B9FF);
  static const Color yellowLight   = Color(0xFF25456F);
  static const Color yellowDark    = Color(0xFF245D9A);
  static const Color yellowBright  = Color(0xFF85C5FF);
  static const Color yellowGlow    = Color(0xFF4C9DEB);
  static const Color boxBg   = Color(0xFF172F55);
  static const Color boxText = Color(0xFFF5F8FF);
  static const Color gold = Color(0xFFF5F8FF);
  static const Color goldLight = Color(0xFF25456F);
  static const Color goldDark  = Color(0xFF245D9A);
  static const Color goldGlow  = Color(0x665EA8F5);
  static const Color accent      = Color(0xFFA855F7);
  static const Color accentLight = Color(0xFFC084FC);
  static const Color accentDark  = Color(0xFF7C3AED);
  static const Color accentGlow  = Color(0x66A855F7);
  static const Color textPrimary   = Color(0xFFF5F8FF);
  static const Color textSecondary = Color(0xFFD4E3F8);
  static const Color textMuted     = Color(0xFFB6C9E2);
  static const Color hintText      = Color(0xFF9BB2D0);
  static const Color success = Color(0xFF22C55E);
  static const Color error   = Color(0xFFDC2626);
  static const Color warning = Color(0xFFF59E0B);
  static const LinearGradient yellowFire = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [
      Color(0xFF1C3459),
      Color(0xFF72B7FA),
      Color(0xFF5EA8F5),
      Color(0xFF397FC6),
    ],
    stops: [0.0, 0.35, 0.68, 1.0],
  );
  static const LinearGradient cardGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF25456F),
      Color(0xFF172F55),
      Color(0xFF23406C),
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
      Color(0xFF0D1B35),
      Color(0xFF0B1933),
      Color(0xFF14294B),
    ],
    stops: [0.0, 0.5, 1.0],
  );

  static const LinearGradient backgroundGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [
      Color(0xFF0D1B35),
      Color(0xFF0B1933),
      Color(0xFF14294B),
    ],
  );
}
