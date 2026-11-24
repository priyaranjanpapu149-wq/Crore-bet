import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../config/colors.dart';

class CosmicTextField extends StatelessWidget {
  final TextEditingController controller;
  final String hint;
  final IconData icon;
  final bool obscure;
  final Widget? suffix;
  final TextInputType? keyboardType;
  final int? maxLength;
  final String? Function(String?)? validator;

  const CosmicTextField({
    super.key,
    required this.controller,
    required this.hint,
    required this.icon,
    this.obscure = false,
    this.suffix,
    this.keyboardType,
    this.maxLength,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
    final w = MediaQuery.of(context).size.width;
    // Adaptive height based on screen width
    final height = w < 360 ? 54.0 : (w < 400 ? 58.0 : 62.0);
    final iconSize = w < 360 ? 20.0 : 22.0;
    final fontSize = w < 360 ? 14.0 : 15.0;

    return SizedBox(
      height: height,
      child: TextFormField(
        controller: controller,
        obscureText: obscure,
        keyboardType: keyboardType,
        maxLength: maxLength,
        validator: validator,
        style: GoogleFonts.lato(
          color: const Color(0xFFF5F8FF),
          fontSize: fontSize,
          fontWeight: FontWeight.w500,
        ),
        decoration: InputDecoration(
          hintText: hint,
          counterText: '',
          isDense: true,
          hintStyle: GoogleFonts.lato(
            color: AppColors.hintText,
            fontSize: fontSize,
            fontWeight: FontWeight.w400,
          ),
          prefixIcon: Icon(icon, color: const Color(0xFFF5F8FF), size: iconSize),
          prefixIconConstraints: BoxConstraints(
            minWidth: iconSize + 30, minHeight: iconSize + 20,
          ),
          suffixIcon: suffix,
          filled: true,
          fillColor: AppColors.card,
          contentPadding: EdgeInsets.symmetric(
            horizontal: w < 360 ? 12 : 16,
            vertical: 0,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: AppColors.cardBorder, width: 1.3),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: const Color(0xFFF5F8FF), width: 1.8),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: AppColors.error, width: 1.3),
          ),
          focusedErrorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: AppColors.error, width: 1.8),
          ),
          errorStyle: GoogleFonts.lato(
            color: AppColors.error, fontSize: 11, height: 0.8,
          ),
        ),
      ),
    );
  }
}