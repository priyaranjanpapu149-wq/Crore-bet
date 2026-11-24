import 'package:flutter/material.dart';

/// Passes the child through unchanged.
/// Text inside chooses its own color.
class FlameText extends StatelessWidget {
  final Widget child;
  const FlameText({super.key, required this.child});

  @override
  Widget build(BuildContext context) => child;
}