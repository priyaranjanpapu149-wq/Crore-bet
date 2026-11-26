import 'package:flutter/material.dart';

/// Fire-style border — yellow flame gradient with strong glow.
class FlameBorder extends Border {
  final double flameWidth;
  FlameBorder({double width = 1.8})
      : flameWidth = width,
        super(
        top: BorderSide(width: width, color: Colors.transparent),
        right: BorderSide(width: width, color: Colors.transparent),
        bottom: BorderSide(width: width, color: Colors.transparent),
        left: BorderSide(width: width, color: Colors.transparent),
      );

  @override
  void paint(Canvas canvas, Rect rect, {
    TextDirection? textDirection,
    BoxShape shape = BoxShape.rectangle,
    BorderRadius? borderRadius,
  }) {
    if (flameWidth <= 0 || rect.isEmpty) return;

    // 🔥 Step 1: outer glow (soft amber aura)
    final glowPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = flameWidth * 3
      ..color = const Color(0xFFD6A634).withValues(alpha: 0.25)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6);

    // 🔥 Step 2: bright yellow border with fire gradient
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = flameWidth
      ..shader = const LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          Color(0xFF0A4A35),
          Color(0xFFECCF83),
          Color(0xFFD6AA41),
          Color(0xFFB9943C),
        ],
        stops: [0.0, 0.35, 0.68, 1.0],
      ).createShader(rect);

    if (shape == BoxShape.circle) {
      final center = rect.center;
      final radius = (rect.shortestSide - flameWidth) / 2;
      canvas.drawCircle(center, radius, glowPaint);
      canvas.drawCircle(center, radius, paint);
    } else {
      final rounded = (borderRadius ?? BorderRadius.zero).toRRect(rect)
          .deflate(flameWidth / 2);
      canvas.drawRRect(rounded, glowPaint);
      canvas.drawRRect(rounded, paint);
    }
  }
}