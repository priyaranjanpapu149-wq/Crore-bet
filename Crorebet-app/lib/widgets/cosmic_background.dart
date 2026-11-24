import 'package:flutter/material.dart';

/// Content wrapper: the app-wide fire background is supplied by main.dart.
class CosmicBackground extends StatelessWidget {
  final Widget child;
  const CosmicBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) => SizedBox.expand(child: child);
}
