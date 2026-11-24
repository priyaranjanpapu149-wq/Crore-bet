import 'dart:math';
import 'package:flutter/material.dart';
import '../../config/colors.dart';

class LotusEmblem extends StatelessWidget {
  final double size;
  const LotusEmblem({super.key, this.size = 40});
  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _LotusPainter()),
    );
  }
}

class _LotusPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final bottom = size.height * 0.92;
    // base of lotus
    final baseY = bottom;

    // 5 petals — left to right, size decreasing outward
    final petals = [
      (-0.42, 0.70, 0.30), // x offset, scale, height factor
      (-0.22, 0.90, 0.45),
      (0.0, 1.00, 0.55),
      (0.22, 0.90, 0.45),
      (0.42, 0.70, 0.30),
    ];

    final petal = Paint()
      ..shader = const LinearGradient(
        colors: [Color(0xFFFFE9A8), AppColors.gold, Color(0xFF8B6F1F)],
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));
    final outline = Paint()
      ..color = AppColors.goldDark
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.6;

    for (final p in petals) {
      final path = Path();
      final x = cx + p.$1 * size.width;
      final h = size.height * p.$3;
      final w = size.width * p.$2 * 0.35;
      path.moveTo(x, baseY);
      path.quadraticBezierTo(x - w, baseY - h * 0.7, x, baseY - h);
      path.quadraticBezierTo(x + w, baseY - h * 0.7, x, baseY);
      path.close();
      canvas.drawPath(path, petal);
      canvas.drawPath(path, outline);
    }

    // small inner petals
    for (final p in [(-0.15, 0.6, 0.30), (0.15, 0.6, 0.30)]) {
      final path = Path();
      final x = cx + p.$1 * size.width;
      final h = size.height * p.$3;
      final w = size.width * p.$2 * 0.22;
      path.moveTo(x, baseY - size.height * 0.05);
      path.quadraticBezierTo(x - w, baseY - h * 0.6, x, baseY - h * 1.2);
      path.quadraticBezierTo(x + w, baseY - h * 0.6, x, baseY - size.height * 0.05);
      path.close();
      canvas.drawPath(path, petal);
    }

    // central dot
    canvas.drawCircle(
      Offset(cx, baseY - size.height * 0.42),
      size.width * 0.045,
      Paint()..color = const Color(0xFF25456F),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter old) => false;
}