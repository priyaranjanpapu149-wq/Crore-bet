import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../config/colors.dart';
import 'shooting_stars_painter.dart'; // Ensure this path is correct

class AppNotificationBanner extends StatefulWidget {
  final String title;
  final String message;
  final String? subtitle;
  final VoidCallback? onTap;
  final VoidCallback? onDismiss;

  const AppNotificationBanner({
    super.key,
    required this.title,
    required this.message,
    this.subtitle,
    this.onTap,
    this.onDismiss,
  });

  @override
  State<AppNotificationBanner> createState() =>
      _AppNotificationBannerState();
}

class _AppNotificationBannerState extends State<AppNotificationBanner>
    with SingleTickerProviderStateMixin {
  late final AnimationController _shootingCtrl;
  int _cycleSeed = 42;
  Timer? _cycleTimer;

  @override
  void initState() {
    super.initState();
    _shootingCtrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();

    _cycleTimer = Timer.periodic(const Duration(seconds: 2), (_) {
      if (mounted) setState(() => _cycleSeed = _cycleSeed * 31 + 17);
    });
  }

  @override
  void dispose() {
    _shootingCtrl.dispose();
    _cycleTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
      child: Material(
        color: Colors.transparent,
        child: GestureDetector(
          onTap: () {
            widget.onDismiss?.call();
            widget.onTap?.call();
          },
          onVerticalDragEnd: (details) {
            if ((details.primaryVelocity ?? 0) < -50) {
              widget.onDismiss?.call();
            }
          },
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              gradient: const LinearGradient(
                colors: [Color(0xFF1C3459), Color(0xFF1C3459)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              border: Border.all(color: const Color(0xFFF5F8FF), width: 1.6),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFF5F8FF),
                  blurRadius: 22,
                  spreadRadius: 1,
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(15),
              child: Stack(
                children: [
                  // Static starfield
                  Positioned.fill(
                    child: IgnorePointer(
                      child: CustomPaint(
                        painter: BannerStarfieldPainter(),
                      ),
                    ),
                  ),
                  // Shooting star
                  Positioned.fill(
                    child: IgnorePointer(
                      child: AnimatedBuilder(
                        animation: _shootingCtrl,
                        builder: (_, __) => CustomPaint(
                          painter: ShootingStarsPainter(
                            t: _shootingCtrl.value,
                            cycleSeed: _cycleSeed,
                          ),
                        ),
                      ),
                    ),
                  ),

                  // 🚀 ADDED: Close (X) Button for better UX
                  Positioned(
                    top: 6,
                    right: 6,
                    child: GestureDetector(
                      onTap: widget.onDismiss,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.black.withValues(alpha: 0.1),
                        ),
                        child: const Icon(
                          Icons.close_rounded,
                          color: Color(0xFFF5F8FF),
                          size: 16,
                        ),
                      ),
                    ),
                  ),

                  // Content
                  Padding(
                    padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Lotus emblem
                        Container(
                          width: 62,
                          height: 62,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: const Color(0xFF25456F),
                            border: Border.all(
                              color: const Color(0xFFF5F8FF),
                              width: 1.6,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.gold.withValues(alpha: 0.4),
                                blurRadius: 14,
                              ),
                            ],
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(10),
                            child: Image.asset(
                              'assets/images/lotus.png',
                              fit: BoxFit.contain,
                              errorBuilder: (_, __, ___) => const Icon(
                                Icons.spa_rounded,
                                color: Color(0xFFF5F8FF),
                                size: 28,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 14),

                        // Text column
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              // 🚀 IMPROVED: Title (Full width, no truncation from subtitle)
                              Text(
                                widget.title.toUpperCase(),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.cinzel(
                                  color: const Color(0xFFF5F8FF),
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 1.6,
                                  shadows: [
                                    Shadow(
                                      color: AppColors.gold.withValues(alpha: 0.6),
                                      blurRadius: 8,
                                    ),
                                  ],
                                ),
                              ),

                              // 🚀 IMPROVED: Subtitle now sits nicely below the title
                              if (widget.subtitle != null) ...[
                                const SizedBox(height: 2),
                                Text(
                                  widget.subtitle!,
                                  style: GoogleFonts.lato(
                                    color: const Color(0xFFB6C9E2),
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],

                              const SizedBox(height: 6),
                              Text(
                                widget.message,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.cinzel(
                                  color: const Color(0xFFF5F8FF),
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 1.4,
                                  shadows: [
                                    Shadow(
                                      color: AppColors.gold.withValues(alpha: 0.6),
                                      blurRadius: 10,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}