import 'package:flutter/material.dart';

/// Fire-yellow glow on hover / press.
class ThemeHoverShadow extends StatefulWidget {
  final Widget child;
  const ThemeHoverShadow({super.key, required this.child});

  @override
  State<ThemeHoverShadow> createState() => _ThemeHoverShadowState();
}

class _ThemeHoverShadowState extends State<ThemeHoverShadow> {
  bool _hovered = false;
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final active = _hovered || _pressed;
    return MouseRegion(
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: Listener(
        onPointerDown: (_) => setState(() => _pressed = true),
        onPointerUp: (_) => setState(() => _pressed = false),
        onPointerCancel: (_) => setState(() => _pressed = false),
        child: TweenAnimationBuilder<double>(
          tween: Tween<double>(begin: 0, end: active ? 1 : 0),
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOut,
          child: widget.child,
          builder: (context, amount, child) => DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                // 🔥 Outer orange fire glow
                BoxShadow(
                  color: const Color(0xFF397FC6)
                      .withValues(alpha: 0.5 * amount),
                  blurRadius: 32 * amount,
                  spreadRadius: 4 * amount,
                ),
                // 🔥 Mid amber fire glow
                BoxShadow(
                  color: const Color(0xFF5EA8F5)
                      .withValues(alpha: 0.6 * amount),
                  blurRadius: 20 * amount,
                  spreadRadius: 3 * amount,
                ),
                // 🔥 Inner bright yellow fire
                BoxShadow(
                  color: const Color(0xFF78B9FF)
                      .withValues(alpha: 0.8 * amount),
                  blurRadius: 12 * amount,
                  spreadRadius: 1 * amount,
                ),
              ],
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}