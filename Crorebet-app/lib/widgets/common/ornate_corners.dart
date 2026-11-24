import 'package:flutter/material.dart';
import '../../config/colors.dart';

class OrnateCorners extends StatelessWidget {
  final Widget child;
  final Color color;
  const OrnateCorners({super.key, required this.child, this.color = AppColors.gold});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        child,
        Positioned(top: 0, left: 0, child: _Corner(color: color)),
        Positioned(top: 0, right: 0, child: _Corner(color: color, flipX: true)),
        Positioned(bottom: 0, left: 0, child: _Corner(color: color, flipY: true)),
        Positioned(
          bottom: 0,
          right: 0,
          child: _Corner(color: color, flipX: true, flipY: true),
        ),
      ],
    );
  }
}

class _Corner extends StatelessWidget {
  final Color color;
  final bool flipX, flipY;
  const _Corner({required this.color, this.flipX = false, this.flipY = false});

  @override
  Widget build(BuildContext context) {
    return Transform.scale(
      scaleX: flipX ? -1 : 1,
      scaleY: flipY ? -1 : 1,
      child: SizedBox(
        width: 22,
        height: 22,
        child: CustomPaint(painter: _CornerPainter(color)),
      ),
    );
  }
}

class _CornerPainter extends CustomPainter {
  final Color color;
  _CornerPainter(this.color);

  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = color
      ..strokeWidth = 1.6
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final path = Path()
      ..moveTo(0, size.height * 0.7)
      ..lineTo(0, 6)
      ..quadraticBezierTo(0, 0, 6, 0)
      ..lineTo(size.width * 0.7, 0);
    canvas.drawPath(path, p);

    // small diamond
    final d = Path()
      ..moveTo(3, 3)
      ..lineTo(7, 7)
      ..lineTo(3, 11)
      ..lineTo(-1, 7)
      ..close();
    canvas.drawPath(d, p..strokeWidth = 1.1);
  }

  @override
  bool shouldRepaint(covariant _CornerPainter old) => old.color != color;
}