import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../config/colors.dart';

class GoldDivider extends StatelessWidget {
  final String? text;
  final double fontSize;
  const GoldDivider({super.key, this.text, this.fontSize = 20});

  @override
  Widget build(BuildContext context) {
    if (text == null || text!.isEmpty) {
      return Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Expanded(child: _line()),
          const SizedBox(width: 8),
          const Icon(Icons.star, color: const Color(0xFFF5F8FF), size: 9),
          const SizedBox(width: 8),
          Expanded(child: _line()),
        ],
      );
    }

    final w = MediaQuery.of(context).size.width;
    // Reserve ~28% of width for the two divider lines total
    final lineWidth = w < 360 ? 20.0 : (w < 400 ? 28.0 : 36.0);

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        _line(width: lineWidth),
        const SizedBox(width: 6),
        const Icon(Icons.star, color: const Color(0xFFF5F8FF), size: 9),
        const SizedBox(width: 8),

        // ─── Text: auto-shrinks to fit, never truncated ───────
        Flexible(
          child: FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.center,
            child: Text(
              text!,
              maxLines: 1,
              softWrap: false,
              style: GoogleFonts.cinzel(
                color: const Color(0xFFF5F8FF),
                fontSize: fontSize,
                fontWeight: FontWeight.bold,
                letterSpacing: 2.5,
                height: 1.1,
              ),
            ),
          ),
        ),

        const SizedBox(width: 8),
        const Icon(Icons.star, color: const Color(0xFFF5F8FF), size: 9),
        const SizedBox(width: 6),
        _line(width: lineWidth),
      ],
    );
  }

  Widget _line({double width = 40}) => Container(
    width: width,
    height: 1,
    decoration: BoxDecoration(
      gradient: LinearGradient(colors: [
        Colors.transparent,
        const Color(0xFFF5F8FF),
        Colors.transparent,
      ]),
    ),
  );
}