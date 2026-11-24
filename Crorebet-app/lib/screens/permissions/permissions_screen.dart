import '../../widgets/flame_border.dart';
import '../../widgets/flame_text.dart';
import '../../widgets/theme_hover_shadow.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../config/colors.dart';
import '../../widgets/cosmic_background.dart';

class PermissionsScreen extends StatefulWidget {
  const PermissionsScreen({super.key});

  @override
  State<PermissionsScreen> createState() => _PermissionsScreenState();
}

class _PermissionsScreenState extends State<PermissionsScreen> {
  bool _notificationGranted = false;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _checkExistingPermissions();
  }

  Future<void> _checkExistingPermissions() async {
    final notif = await Permission.notification.isGranted;
    if (!mounted) return;
    setState(() {
      _notificationGranted = notif;
    });
  }

  Future<void> _requestAll() async {
    setState(() => _busy = true);

    // 1. Notification ONLY
    final notifResult = await Permission.notification.request();
    final notifOk = notifResult.isGranted;
    if (mounted) setState(() => _notificationGranted = notifOk);

    if (!mounted) return;
    setState(() => _busy = false);

    if (notifOk) {
      Navigator.of(context).pushNamedAndRemoveUntil(
        '/login',
            (_) => false,
      );
    } else {
      _showDeniedDialog();
    }
  }

  void _showDeniedDialog() {
    final message = 'permissions_required_single'.tr(namedArgs: {'missing': 'notifications'.tr()});

    showDialog<void>(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: const Color(0xFF1C3459),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.flameBorder, width: 1.4),
        ),
        insetPadding: const EdgeInsets.symmetric(horizontal: 30),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(22, 22, 22, 18),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.shield_outlined,
                  color: Color(0xFFF5F8FF), size: 46),
              const SizedBox(height: 12),
              FlameText(child: Text(
                'permissions_required_title'.tr(),
                textAlign: TextAlign.center,
                style: GoogleFonts.cinzel(
                  color: const Color(0xFFF5F8FF),
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.5,
                ),
              )),
              const SizedBox(height: 12),
              Text(
                message,
                textAlign: TextAlign.center,
                style: GoogleFonts.lato(
                  color: const Color(0xFFE9F1FF),
                  fontSize: 13,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 22),
              Row(
                children: [
                  Expanded(
                    child: SizedBox(
                      height: 46,
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(context),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(
                              color: AppColors.flameBorder, width: 1.3),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        child: Text(
                          'later'.tr(),
                          style: GoogleFonts.lato(
                            color: const Color(0xFFF5F8FF),
                            fontSize: 13.5,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.5,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: SizedBox(
                      height: 46,
                      child: OutlinedButton(
                        onPressed: () {
                          Navigator.pop(context);
                          openAppSettings();
                        },
                        style: OutlinedButton.styleFrom(
                          backgroundColor: const Color(0xFF25456F),
                          side: const BorderSide(
                              color: AppColors.flameBorder, width: 1.5),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        child: Text(
                          'settings'.tr(),
                          style: GoogleFonts.lato(
                            color: const Color(0xFFF5F8FF),
                            fontSize: 13.5,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.5,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: CosmicBackground(
        child: SafeArea(
          child: Column(
            children: [
              const Spacer(flex: 2),

              // ─── LOTUS LOGO ─────────────────────────────
              Center(
                child: Container(
                  width: 140,
                  height: 140,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: const Color(0xFF25456F),
                    border: FlameBorder(width: 2),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFF5F8FF),
                        blurRadius: 32,
                        spreadRadius: 4,
                      ),
                    ],
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Image.asset(
                      'assets/images/lotus.png',
                      fit: BoxFit.contain,
                      errorBuilder: (_, __, ___) => const Icon(
                        Icons.spa_rounded,
                        color: Color(0xFFF5F8FF),
                        size: 70,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // ─── TITLE ──────────────────────────────────
              FlameText(child: Text(
                'permissions'.tr(),
                style: GoogleFonts.cinzel(
                  color: const Color(0xFFF5F8FF),
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 3,
                  shadows: [
                    Shadow(
                      color: const Color(0xFFF5F8FF),
                      blurRadius: 12,
                    ),
                  ],
                ),
              )),
              const SizedBox(height: 6),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Text(
                  'grant_following_to_continue'.tr(),
                  textAlign: TextAlign.center,
                  style: GoogleFonts.lato(
                    color: const Color(0xFFE9F1FF),
                    fontSize: 12.5,
                  ),
                ),
              ),

              const Spacer(flex: 2),

              // ─── PERMISSION ROWS ────────────────────────
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  children: [
                    _permissionRow(
                      iconBg: const Color(0xFFE8546B),
                      icon: Icons.notifications_active_rounded,
                      title: 'notification'.tr(),
                      description: 'notification_permission_desc'.tr(),
                      granted: _notificationGranted,
                    ),
                  ],
                ),
              ),

              const Spacer(flex: 3),

              // ─── ALLOW ALL ACCESS BUTTON ────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 26),
                child: SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: OutlinedButton(
                    onPressed: _busy ? null : _requestAll,
                    style: OutlinedButton.styleFrom(
                      backgroundColor: const Color(0xFF25456F),
                      side: const BorderSide(
                          color: AppColors.flameBorder, width: 1.8),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      shadowColor: const Color(0xFFF5F8FF),
                      elevation: 6,
                    ),
                    child: _busy
                        ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Color(0xFFF5F8FF),
                      ),
                    )
                        : FlameText(child: Text(
                      'allow_all_access'.tr(),
                      style: GoogleFonts.cinzel(
                        color: const Color(0xFFF5F8FF),
                        fontSize: 15.5,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 2,
                      ),
                    )),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _permissionRow({
    required Color iconBg,
    required IconData icon,
    required String title,
    required String description,
    required bool granted,
  }) {
    return ThemeHoverShadow(child: Container(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        gradient: const LinearGradient(
          colors: [Color(0xFF1C3459), Color(0xFF1C3459)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(
          color: granted
              ? AppColors.gold
              : const Color(0xFFF5F8FF),
          width: granted ? 1.6 : 1.2,
        ),
        boxShadow: granted
            ? [
          BoxShadow(
            color: const Color(0xFFF5F8FF),
            blurRadius: 14,
          ),
        ]
            : null,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: iconBg,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: iconBg.withValues(alpha: 0.45),
                  blurRadius: 10,
                ),
              ],
            ),
            child: Icon(icon, color: Colors.white, size: 28),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                FlameText(child: Text(
                  title,
                  style: GoogleFonts.cinzel(
                    color: const Color(0xFFF5F8FF),
                    fontSize: 15.5,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.2,
                    shadows: [
                      Shadow(
                        color: const Color(0xFFF5F8FF),
                        blurRadius: 6,
                      ),
                    ],
                  ),
                )),
                const SizedBox(height: 6),
                Text(
                  description,
                  style: GoogleFonts.lato(
                    color: const Color(0xFFE9F1FF),
                    fontSize: 12.5,
                    height: 1.45,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 220),
              width: 26,
              height: 26,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: granted
                      ? AppColors.gold
                      : const Color(0xFFF5F8FF),
                  width: 2.5,
                ),
              ),
              child: granted
                  ? Center(
                child: Container(
                  width: 14,
                  height: 14,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: AppColors.goldGradient,
                  ),
                ),
              )
                  : null,
            ),
          ),
        ],
      ),
    ));
  }
}