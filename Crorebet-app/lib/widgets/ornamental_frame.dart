import 'package:flutter/material.dart';
import '../config/colors.dart';

class OrnamentalFrame extends StatelessWidget {
  final Widget child;
  const OrnamentalFrame({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Positioned.fill(
          child: Container(
            margin: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              border: Border.all(color: const Color(0xFFF5F8FF), width: 1.5),
              borderRadius: BorderRadius.circular(6),
            ),
          ),
        ),
        Positioned.fill(
          child: Container(
            margin: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              border: Border.all(color: const Color(0xFFF5F8FF), width: 0.6),
              borderRadius: BorderRadius.circular(4),
            ),
          ),
        ),
        const Positioned(top: 2, left: 2, child: _Corner()),
        const Positioned(top: 2, right: 2, child: _Corner(flipX: true)),
        const Positioned(bottom: 2, left: 2, child: _Corner(flipY: true)),
        const Positioned(bottom: 2, right: 2, child: _Corner(flipX: true, flipY: true)),
        child,
      ],
    );
  }
}

class _Corner extends StatelessWidget {
  final bool flipX, flipY;
  const _Corner({this.flipX = false, this.flipY = false});
  @override
  Widget build(BuildContext context) {
    return Transform.scale(
      scaleX: flipX ? -1 : 1, scaleY: flipY ? -1 : 1,
      child: const SizedBox(width: 26, height: 26, child: CustomPaint(painter: _CornerPainter())),
    );
  }
}

class _CornerPainter extends CustomPainter {
  const _CornerPainter();
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.gold
      ..strokeWidth = 1.2
      ..style = PaintingStyle.stroke;
    final path = Path()
      ..moveTo(0, size.height)
      ..lineTo(0, 6)
      ..quadraticBezierTo(0, 0, 6, 0)
      ..lineTo(size.width, 0);
    canvas.drawPath(path, paint);
    final d = Path()
      ..moveTo(4, 4)..lineTo(9, 9)..lineTo(4, 14)..lineTo(0, 9)..close();
    canvas.drawPath(d, paint..strokeWidth = 0.8);
  }
  @override
  bool shouldRepaint(_) => false;
}