import 'package:flutter/material.dart';
import '../../config/colors.dart';

class ScreenFrame extends StatelessWidget {
  final Widget child;
  const ScreenFrame({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        child,
        // Outer thick border
        Positioned.fill(
          child: IgnorePointer(
            child: Container(
              margin: const EdgeInsets.fromLTRB(8, 8, 8, 8),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(6),
                border: Border.all(
                  color: const Color(0xFFF5F8FF),
                  width: 1.6,
                ),
              ),
            ),
          ),
        ),
        // Inner thin border
        Positioned.fill(
          child: IgnorePointer(
            child: Container(
              margin: const EdgeInsets.fromLTRB(13, 13, 13, 13),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(4),
                border: Border.all(
                  color: const Color(0xFFF5F8FF),
                  width: 0.7,
                ),
              ),
            ),
          ),
        ),
        // Corner flourishes
        const Positioned(top: 6, left: 6, child: _CornerFlourish()),
        const Positioned(top: 6, right: 6, child: _CornerFlourish(flipX: true)),
        const Positioned(bottom: 6, left: 6, child: _CornerFlourish(flipY: true)),
        const Positioned(
          bottom: 6, right: 6,
          child: _CornerFlourish(flipX: true, flipY: true),
        ),
      ],
    );
  }
}

class _CornerFlourish extends StatelessWidget {
  final bool flipX, flipY;
  const _CornerFlourish({this.flipX = false, this.flipY = false});

  @override
  Widget build(BuildContext context) {
    return Transform.scale(
      scaleX: flipX ? -1 : 1,
      scaleY: flipY ? -1 : 1,
      child: SizedBox(
        width: 34,
        height: 34,
        child: CustomPaint(painter: _FlourishPainter()),
      ),
    );
  }
}

class _FlourishPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = AppColors.gold
      ..strokeWidth = 1.8
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    // L-shape curve
    final path = Path()
      ..moveTo(0, size.height * 0.75)
      ..lineTo(0, 10)
      ..quadraticBezierTo(0, 0, 10, 0)
      ..lineTo(size.width * 0.75, 0);
    canvas.drawPath(path, p);

    // Diamond
    final d = Path()
      ..moveTo(6, 6)
      ..lineTo(12, 12)
      ..lineTo(6, 18)
      ..lineTo(0, 12)
      ..close();
    canvas.drawPath(
      d,
      p
        ..strokeWidth = 1.4
        ..color = AppColors.goldLight,
    );

    // Small dot
    canvas.drawCircle(
      Offset(20, 6),
      1.4,
      Paint()..color = AppColors.gold,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}