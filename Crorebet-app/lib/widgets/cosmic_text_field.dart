import 'package:flutter/material.dart';
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
  const CosmicTextField({super.key, required this.controller, required this.hint, required this.icon, this.obscure = false, this.suffix, this.keyboardType, this.maxLength, this.validator});

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller, obscureText: obscure, keyboardType: keyboardType,
      maxLength: maxLength, validator: validator,
      style: const TextStyle(color: Color(0xFF063D30), fontSize: 16),
      decoration: InputDecoration(
        hintText: hint, counterText: '', filled: true, fillColor: const Color(0xFFFFFAEF),
        hintStyle: const TextStyle(color: Color(0xFF758079)),
        prefixIcon: Icon(icon, color: const Color(0xFF063D30)),
        suffixIcon: suffix == null ? null : IconTheme(data: const IconThemeData(color: Color(0xFF063D30)), child: suffix!),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 15),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFB7A577))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF063D30), width: 1.5)),
        errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.error)),
        focusedErrorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.error)),
      ),
    );
  }
}
