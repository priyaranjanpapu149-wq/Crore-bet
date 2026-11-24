import 'dart:math';
import 'package:flutter/material.dart';
import '../config/colors.dart';

class ShootingStarsPainter extends CustomPainter {
  /// Animation phase 0..1 — one full star crossing.
  final double t;

  /// Changes each cycle so the star starts from a new position.
  final int cycleSeed;

  ShootingStarsPainter({required this.t, required this.cycleSeed});

  @override
  void paint(Canvas canvas, Size size) {
    final rnd = Random(cycleSeed);

    // Star starts top-right, moves down-left.
    final startX = size.width * (0.4 + rnd.nextDouble() * 0.6);
    const startY = -20.0;

    // Travel distance
    final dx = -size.width * 1.4 * t;
    final dy = size.height * 1.4 * t;

    final head = Offset(startX + dx, startY + dy);

    // Fade in/out along the trip
    final alpha = sin(t * pi).clamp(0.0, 1.0);
    if (alpha < 0.02) return;

    // Tail
    const tailLen = 70.0;
    final tail = Offset(
      head.dx + tailLen * 0.5,
      head.dy - tailLen,
    );

    // Gradient line for the tail
    final gradient = LinearGradient(
      colors: [
        Colors.white.withValues(alpha: alpha),
        AppColors.gold.withValues(alpha: alpha * 0.7),
        const Color(0xFFF5F8FF),
      ],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    );

    final linePaint = Paint()
      ..strokeWidth = 2.0
      ..strokeCap = StrokeCap.round
      ..shader = gradient.createShader(
        Rect.fromPoints(tail, head),
      );
    canvas.drawLine(tail, head, linePaint);

    // Head glow
    canvas.drawCircle(
      head,
      2.4,
      Paint()..color = Colors.white.withValues(alpha: alpha),
    );
    canvas.drawCircle(
      head,
      6.0,
      Paint()
        ..color = AppColors.gold.withValues(alpha: alpha * 0.35)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6),
    );
  }

  @override
  bool shouldRepaint(ShootingStarsPainter old) =>
      old.t != t || old.cycleSeed != cycleSeed;
}

/// Static starfield behind the shooting star.
class BannerStarfieldPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final rnd = Random(9);
    final paint = Paint();
    for (int i = 0; i < 60; i++) {
      final x = rnd.nextDouble() * size.width;
      final y = rnd.nextDouble() * size.height;
      final r = rnd.nextDouble() * 1.1 + 0.2;
      paint.color =
          Colors.white.withValues(alpha: rnd.nextDouble() * 0.7 + 0.15);
      canvas.drawCircle(Offset(x, y), r, paint);
    }
    final gold = Paint()
      ..color = const Color(0xFFF5F8FF);
    for (int i = 0; i < 6; i++) {
      canvas.drawCircle(
        Offset(rnd.nextDouble() * size.width, rnd.nextDouble() * size.height),
        1.0,
        gold,
      );
    }
  }

  @override
  bool shouldRepaint(CustomPainter old) => false;
}