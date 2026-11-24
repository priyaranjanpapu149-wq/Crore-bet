import 'package:flutter/material.dart';
import '../config/colors.dart';

class MagicBossLogo extends StatelessWidget {
  final double size;
  const MagicBossLogo({super.key, this.size = 180});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size, height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(color: const Color(0xFFF5F8FF),
              blurRadius: 50, spreadRadius: 4),
        ],
      ),
      child: ClipOval(
        child: Image.asset(
          'assets/images/MagicBoss.webp',
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Container(
            decoration: const BoxDecoration(
                shape: BoxShape.circle, gradient: AppColors.goldGradient),
            child: const Icon(Icons.auto_awesome, size: 70, color: Colors.black),
          ),
        ),
      ),
    );
  }
}
