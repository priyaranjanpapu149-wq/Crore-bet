import 'package:flutter/material.dart';

class AppBackground extends StatelessWidget {
  final Widget child;
  const AppBackground({
    super.key,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        // 🎨 Cream base with subtle warm gradient
        const Positioned.fill(
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: RadialGradient(
                center: Alignment(0, -0.3),
                radius: 1.6,
                colors: [
                  Color(0xFF0D1B35),
                  Color(0xFF0B1933),
                  Color(0xFF14294B),
                ],
                stops: [0.0, 0.5, 1.0],
              ),
            ),
          ),
        ),

        // 🎨 Subtle diagonal accent lines (like your reference)
        Positioned.fill(
          child: IgnorePointer(
            child: CustomPaint(
              painter: _DiagonalLinesPainter(),
            ),
          ),
        ),

        // 📄 Page content
        Positioned.fill(child: child),
      ],
    );
  }
}

// Faint diagonal accent lines — adds depth
class _DiagonalLinesPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF397FC6).withValues(alpha: 0.06)
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;

    const spacing = 140.0;
    for (double i = -size.height; i < size.width + size.height; i += spacing) {
      canvas.drawLine(
        Offset(i, 0),
        Offset(i + size.height, size.height),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(CustomPainter oldDelegate) => false;
}
