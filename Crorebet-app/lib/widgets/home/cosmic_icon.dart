import 'dart:math';
import 'package:flutter/material.dart';

class CosmicIcon extends StatelessWidget {
  final String seed;
  final Color tint;
  const CosmicIcon({super.key, required this.seed, required this.tint});

  @override
  Widget build(BuildContext context) {
    final h = seed.toLowerCase().hashCode.abs();
    return CustomPaint(
      painter: _CosmicPainter(style: h % 6, tint: tint, seed: h),
    );
  }
}

class _CosmicPainter extends CustomPainter {
  final int style;
  final Color tint;
  final int seed;
  _CosmicPainter({required this.style, required this.tint, required this.seed});

  @override
  void paint(Canvas canvas, Size size) {
    final rnd = Random(seed);
    switch (style) {
      case 0: _constellation(canvas, size, rnd); break;
      case 1: _comet(canvas, size, rnd); break;
      case 2: _spiralGalaxy(canvas, size, rnd); break;
      case 3: _blackHole(canvas, size, rnd); break;
      case 4: _nebulaCluster(canvas, size, rnd); break;
      default: _starField(canvas, size, rnd);
    }
  }

  void _constellation(Canvas canvas, Size size, Random rnd) {
    // Hexagonal constellation with blue-white stars
    final cx = size.width / 2, cy = size.height / 2;
    final r = size.width * 0.38;
    final pts = <Offset>[];
    for (int i = 0; i < 6; i++) {
      final a = i * pi / 3 + 0.3;
      pts.add(Offset(cx + cos(a) * r, cy + sin(a) * r));
    }
    // inner points
    for (int i = 0; i < 3; i++) {
      pts.add(Offset(
        cx + (rnd.nextDouble() - 0.5) * r * 1.2,
        cy + (rnd.nextDouble() - 0.5) * r * 1.2,
      ));
    }
    final line = Paint()
      ..color = const Color(0xFF7CE0FF).withValues(alpha: 0.75)
      ..strokeWidth = 1.0;
    for (int i = 0; i < 5; i++) {
      canvas.drawLine(pts[i], pts[i + 1], line);
    }
    canvas.drawLine(pts[5], pts[0], line);
    canvas.drawLine(pts[2], pts[6], line);
    canvas.drawLine(pts[4], pts[7], line);
    canvas.drawLine(pts[6], pts[8], line);

    for (final p in pts) {
      // glow
      canvas.drawCircle(
        p, 4.2,
        Paint()..color = const Color(0xFF7CE0FF).withValues(alpha: 0.35),
      );
      // core
      canvas.drawCircle(p, 1.9, Paint()..color = Colors.white);
    }
  }

  void _comet(Canvas canvas, Size size, Random rnd) {
    final head = Offset(size.width * 0.68, size.height * 0.42);
    // glow halo
    canvas.drawCircle(
      head, size.width * 0.22,
      Paint()..color = const Color(0xFFFF6A00).withValues(alpha: 0.35),
    );
    canvas.drawCircle(
      head, size.width * 0.14,
      Paint()..color = const Color(0xFFFFB347).withValues(alpha: 0.6),
    );
    // tail
    for (int i = 0; i < 40; i++) {
      final t = i / 40;
      final angle = pi * 0.85 + sin(t * pi * 3) * 0.15;
      final dist = t * size.width * 0.9;
      final p = Offset(
        head.dx + cos(angle) * dist,
        head.dy + sin(angle) * dist,
      );
      final radius = (1 - t) * 4.5 + 0.3;
      final col = Color.lerp(
        const Color(0xFFFFF0A0),
        const Color(0xFFFF3D00),
        t,
      )!;
      canvas.drawCircle(p, radius, Paint()..color = col.withValues(alpha: 1 - t * 0.9));
    }
    // core
    canvas.drawCircle(head, 6.5, Paint()..color = Colors.white);
    canvas.drawCircle(head, 4, Paint()..color = const Color(0xFF146043));
  }

  void _spiralGalaxy(Canvas canvas, Size size, Random rnd) {
    final cx = size.width / 2, cy = size.height / 2;
    for (int arm = 0; arm < 2; arm++) {
      for (int i = 0; i < 55; i++) {
        final t = i / 55;
        final angle = t * 4.2 + arm * pi;
        final r = t * size.width * 0.42;
        final p = Offset(cx + cos(angle) * r, cy + sin(angle) * r);
        final alpha = (1 - t) * 0.95 + 0.05;
        final radius = (1 - t) * 2.8 + 0.4;
        canvas.drawCircle(
          p, radius,
          Paint()..color = const Color(0xFF77BAFA).withValues(alpha: alpha),
        );
        // extra glow on outer
        if (i % 3 == 0) {
          canvas.drawCircle(
            p, radius * 1.8,
            Paint()..color = const Color(0xFF77BAFA).withValues(alpha: alpha * 0.3),
          );
        }
      }
    }
    // bright core
    canvas.drawCircle(cx > 0 ? Offset(cx, cy) : Offset.zero, 7,
        Paint()..color = Colors.white);
    canvas.drawCircle(Offset(cx, cy), 4,
        Paint()..color = const Color(0xFFFFE9A8));
  }

  void _blackHole(Canvas canvas, Size size, Random rnd) {
    final cx = size.width / 2, cy = size.height / 2;
    // swirling purple rings
    for (int ring = 0; ring < 8; ring++) {
      for (int i = 0; i < 30; i++) {
        final t = i / 30;
        final angle = t * 2 * pi + ring * 0.55 + rnd.nextDouble() * 0.05;
        final rx = (ring + 1) * size.width * 0.055;
        final ry = rx * 0.35;
        final p = Offset(cx + cos(angle) * rx, cy + sin(angle) * ry);
        final alpha = 0.9 - ring * 0.1;
        canvas.drawCircle(
          p, 1.8 - ring * 0.1,
          Paint()..color = const Color(0xFFB388FF).withValues(alpha: alpha),
        );
      }
    }
    // event horizon
    canvas.drawCircle(Offset(cx, cy), size.width * 0.13,
        Paint()..color = Colors.black);
    canvas.drawCircle(
      Offset(cx, cy), size.width * 0.14,
      Paint()
        ..color = const Color(0xFFB388FF)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.8,
    );
  }

  void _nebulaCluster(Canvas canvas, Size size, Random rnd) {
    for (int i = 0; i < 55; i++) {
      final p = Offset(
        rnd.nextDouble() * size.width,
        rnd.nextDouble() * size.height,
      );
      canvas.drawCircle(
        p,
        rnd.nextDouble() * 5 + 1,
        Paint()..color = const Color(0xFFFF6EC7).withValues(alpha: rnd.nextDouble() * 0.45 + 0.15),
      );
    }
    for (int i = 0; i < 12; i++) {
      canvas.drawCircle(
        Offset(rnd.nextDouble() * size.width, rnd.nextDouble() * size.height),
        1.6,
        Paint()..color = Colors.white,
      );
    }
  }

  void _starField(Canvas canvas, Size size, Random rnd) {
    for (int i = 0; i < 50; i++) {
      canvas.drawCircle(
        Offset(rnd.nextDouble() * size.width, rnd.nextDouble() * size.height),
        rnd.nextDouble() * 1.5 + 0.3,
        Paint()..color = Colors.white.withValues(alpha: rnd.nextDouble() * 0.85 + 0.15),
      );
    }
    for (int i = 0; i < 8; i++) {
      canvas.drawCircle(
        Offset(rnd.nextDouble() * size.width, rnd.nextDouble() * size.height),
        1.5,
        Paint()..color = const Color(0xFF77BAFA),
      );
    }
  }

  @override
  bool shouldRepaint(covariant _CosmicPainter old) =>
      old.seed != seed || old.tint != tint || old.style != style;
}