import 'package:flutter/material.dart';

class GoldButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  const GoldButton({
    super.key,
    required this.label,
    this.onPressed,
    this.loading = false,
  });

  @override
  Widget build(BuildContext context) {
    final w = MediaQuery.of(context).size.width;
    final height = w < 360 ? 54.0 : 58.0;
    final fontSize = w < 360 ? 15.0 : 17.0;

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: const Color(0x66000000),
            blurRadius: 20,
            spreadRadius: 0,
          ),
        ],
      ),
      child: SizedBox(
        width: double.infinity,
        height: height,
        child: OutlinedButton(
          onPressed: loading ? null : onPressed,
          style: OutlinedButton.styleFrom(
            backgroundColor: const Color(0xFF0A4A35),
            side: const BorderSide(color: Color(0xFFD6AA41), width: 1.5),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
            foregroundColor: const Color(0xFFF5F8FF),
            padding: EdgeInsets.zero,
          ),
          child: loading
              ? const SizedBox(
            width: 22, height: 22,
            child: CircularProgressIndicator(
              strokeWidth: 2, color: const Color(0xFFF5F8FF),
            ),
          )
              : Text(
            label,
            style: TextStyle(
              fontFamily: 'serif',
              fontSize: fontSize,
              fontWeight: FontWeight.bold,
              color: const Color(0xFFF5F8FF),
              letterSpacing: 0.5,
            ),
          ),
        ),
      ),
    );
  }
}
