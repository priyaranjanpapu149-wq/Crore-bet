import 'package:flutter/material.dart';

class AppBackground extends StatelessWidget {
  final Widget child;
  const AppBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) => ColoredBox(
    color: const Color(0xFF063D30),
    child: child,
  );
}
