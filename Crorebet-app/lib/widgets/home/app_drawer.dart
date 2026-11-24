import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../flame_border.dart';
import '../flame_text.dart';
import '../theme_hover_shadow.dart';
import '../../config/colors.dart';
import '../app_background.dart';
import '../../providers/auth_provider.dart';
import '../../providers/settings_provider.dart'; // 🚀 ADDED IMPORT
import '../../screens/bids/bid_history_screen.dart';
import '../../screens/charts/charts_screen.dart';
import '../../screens/game_rates/game_rates_screen.dart';
import '../../screens/referral/share_now_screen.dart';
import '../../screens/wallet/deposit_screen.dart';
import '../../screens/wallet/passbook_screen.dart';
import '../../screens/wallet/withdraw_screen.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final name = user?['name'] ?? 'User';
    final mobile = user?['mobile'] ?? '--------';
    final wallet = user?['wallet'] ?? 0;

    return Drawer(
      backgroundColor: Colors.transparent,
      width: MediaQuery.of(context).size.width * 0.88,
      shape: const RoundedRectangleBorder(),
      child: Stack(
        children: [
          const Positioned.fill(
            child: IgnorePointer(
              child: AppBackground(
                child: SizedBox.shrink(),
              ),
            ),
          ),
          // Ornate double frame
          Positioned.fill(
            child: IgnorePointer(
              child: Container(
                margin: const EdgeInsets.all(5),
                decoration: BoxDecoration(
                  border: FlameBorder(width: 1.1),
                ),
              ),
            ),
          ),
          Positioned.fill(
            child: IgnorePointer(
              child: Container(
                margin: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  border: FlameBorder(width: 0.6),
                ),
              ),
            ),
          ),
          // Content
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 14),
              child: Column(
                children: [
                  _avatar(),
                  const SizedBox(height: 12),
                  FlameText(
                    child: Text(
                      name,
                      style: GoogleFonts.cinzel(
                        color: const Color(0xFFF5F8FF),
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.5,
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    mobile,
                    style: GoogleFonts.lato(
                      color: const Color(0xFFF5F8FF),
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 18),
                  _walletCard(wallet),
                  const SizedBox(height: 8),
                  Text(
                    'total_balance'.tr(),
                    style: GoogleFonts.lato(
                      color: const Color(0xFFE9F1FF),
                      fontSize: 10,
                      letterSpacing: 3,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Expanded(
                    child: SingleChildScrollView(
                      physics: const BouncingScrollPhysics(),
                      child: Column(
                        children: [
                          // ─── HOME ─────────────────────────
                          _item(
                            Icons.cottage_rounded,
                            const Color(0xFFF5F8FF),
                            'home'.tr(),
                                () => Navigator.pop(context),
                          ),

                          // ─── MY BIDS ──────────────────────
                          _item(
                            Icons.gavel_rounded,
                            const Color(0xFFF5F8FF),
                            'my_bids'.tr(),
                                () {
                              Navigator.pop(context);
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => const BidHistoryScreen(),
                                ),
                              );
                            },
                          ),

                          // ─── PASSBOOK ─────────────────────
                          _item(
                            Icons.menu_book_rounded,
                            const Color(0xFFF5F8FF),
                            'passbook'.tr(),
                                () {
                              Navigator.pop(context);
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => const PassbookScreen(),
                                ),
                              );
                            },
                          ),

                          // ─── FUNDS → Deposit ──────────────
                          _item(
                            Icons.savings_rounded,
                            const Color(0xFFF5F8FF),
                            'funds'.tr(),
                                () {
                              Navigator.pop(context);
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => const DepositScreen(),
                                ),
                              );
                            },
                          ),

                          // ─── GAME RATE ────────────────────
                          _item(
                            Icons.monetization_on_rounded,
                            const Color(0xFFF5F8FF),
                            'game_rate'.tr(),
                                () {
                              Navigator.pop(context);
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => const GameRatesScreen(),
                                ),
                              );
                            },
                          ),

                          // ─── CHARTS ───────────────────────
                          _item(
                            Icons.bar_chart_rounded,
                            const Color(0xFFF5F8FF),
                            'charts'.tr(),
                                () {
                              Navigator.pop(context);
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => const ChartsScreen(),
                                ),
                              );
                            },
                          ),

                          // ─── SHARE NOW → Refer & Earn ─────
                          _item(
                            Icons.share_rounded,
                            const Color(0xFFF5F8FF),
                            'share_now'.tr(),
                                () {
                              Navigator.pop(context);
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => const ShareNowScreen(),
                                ),
                              );
                            },
                          ),

                          // 🚀 NEW: NOTIFICATION TOGGLE ──────
                          _notificationToggle(context),

                          // ─── CHANGE LANGUAGE ──────────────
                          _item(
                            Icons.language_rounded,
                            const Color(0xFFF5F8FF),
                            'change_language'.tr(),
                                () {
                              _showLanguagePicker(context);
                            },
                          ),

                          // ─── LOGOUT ───────────────────────
                          _item(
                            Icons.power_settings_new_rounded,
                            const Color(0xFFB71C1C),
                            'logout_account'.tr(),
                                () async {
                              Navigator.pop(context);
                              await auth.logout();
                              if (context.mounted) {
                                Navigator.of(context).pushNamedAndRemoveUntil(
                                  '/login',
                                      (_) => false,
                                );
                              }
                            },
                          ),

                          const SizedBox(height: 16),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // 🚀 NEW: NOTIFICATION TOGGLE WIDGET
  Widget _notificationToggle(BuildContext context) {
    final settings = context.watch<SettingsProvider>();

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: ThemeHoverShadow(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            color: const Color(0xFF1C3459).withValues(alpha: 0.55),
            border: FlameBorder(width: 1.0),
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF25456F),
                  border: FlameBorder(width: 1.2),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFF5F8FF),
                      blurRadius: 8,
                    ),
                  ],
                ),
                child: Icon(
                  settings.notificationsEnabled
                      ? Icons.notifications_active_rounded
                      : Icons.notifications_off_rounded,
                  color: const Color(0xFFF5F8FF),
                  size: 22,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Text(
                  'notifications'.tr(),
                  style: GoogleFonts.lato(
                    color: const Color(0xFFF5F8FF),
                    fontSize: 15.5,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.4,
                  ),
                ),
              ),
              Switch(
                value: settings.notificationsEnabled,
                activeColor: const Color(0xFFF5F8FF),
                activeTrackColor: const Color(0xFF25456F),
                inactiveThumbColor: const Color(0xFFE9F1FF),
                inactiveTrackColor: const Color(0xFF1C3459),
                onChanged: (bool value) async {
                  await settings.toggleNotifications(value);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  // 🚀 LANGUAGE PICKER BOTTOM SHEET
  void _showLanguagePicker(BuildContext drawerContext) {
    final languages = [
      {'code': 'en', 'native': 'English'},
      {'code': 'hi', 'native': 'हिन्दी'},
      {'code': 'mr', 'native': 'मराठी'},
      {'code': 'kn', 'native': 'ಕನ್ನಡ'},
      {'code': 'te', 'native': 'తెలుగు'},
    ];

    showModalBottomSheet(
      context: drawerContext,
      backgroundColor: const Color(0xFF1C3459), // Light yellow background
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        side: BorderSide(color: Color(0xFFF5F8FF), width: 1.4), // Black border
      ),
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFF5F8FF).withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              FlameText(
                child: Text(
                  'choose_language'.tr(),
                  style: GoogleFonts.cinzel(
                    color: const Color(0xFFF5F8FF),
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 2,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Divider(color: Color(0xFFF5F8FF), height: 1),
              const SizedBox(height: 8),
              ...languages.map((lang) {
                final selected =
                    sheetContext.locale.languageCode == lang['code'];
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () async {
                      await sheetContext.setLocale(Locale(lang['code']!));
                      if (sheetContext.mounted) {
                        Navigator.pop(sheetContext);
                      }
                      if (drawerContext.mounted) {
                        Navigator.pop(drawerContext);
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 12,
                      ),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        color: selected
                            ? const Color(0xFFF5F8FF).withValues(alpha: 0.1)
                            : const Color(0xFF1C3459),
                        border: Border.all(
                          color: selected
                              ? const Color(0xFFF5F8FF)
                              : const Color(0xFFF5F8FF).withValues(alpha: 0.3),
                          width: selected ? 1.5 : 1.0,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            selected
                                ? Icons.radio_button_checked
                                : Icons.radio_button_unchecked,
                            color: const Color(0xFFF5F8FF),
                            size: 22,
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Text(
                              lang['native']!,
                              style: GoogleFonts.lato(
                                color: const Color(0xFFF5F8FF),
                                fontSize: 15.5,
                                fontWeight: selected
                                    ? FontWeight.bold
                                    : FontWeight.w500,
                              ),
                            ),
                          ),
                          if (selected)
                            const Icon(
                              Icons.check_circle,
                              color: Color(0xFFF5F8FF),
                              size: 20,
                            ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  // ─── AVATAR with profile.png ────────────────────────────
  Widget _avatar() {
    return SizedBox(
      width: 148,
      height: 148,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: 128,
            height: 128,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFF5F8FF),
                  blurRadius: 34,
                  spreadRadius: 3,
                ),
              ],
            ),
          ),
          Container(
            width: 116,
            height: 116,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: FlameBorder(width: 2.8),
              color: const Color(0xFF25456F),
            ),
            child: ClipOval(
              child: Image.asset(
                'assets/images/profile.png',
                width: 116,
                height: 116,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  color: const Color(0xFFE8546B),
                  child: const Icon(
                    Icons.person,
                    size: 86,
                    color: Color(0xFFFFE9D6),
                  ),
                ),
              ),
            ),
          ),
          const Positioned(top: 0, child: _StarPoint()),
          const Positioned(bottom: 0, child: _StarPoint()),
          const Positioned(left: 0, child: _StarPoint()),
          const Positioned(right: 0, child: _StarPoint()),
          Positioned(top: 15, left: 15, child: const _StarPoint(small: true)),
          Positioned(top: 15, right: 15, child: const _StarPoint(small: true)),
          Positioned(bottom: 15, left: 15, child: const _StarPoint(small: true)),
          Positioned(bottom: 15, right: 15, child: const _StarPoint(small: true)),
          Positioned(
            top: 8,
            right: 4,
            child: ThemeHoverShadow(
              child: Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: const Color(0xFF25456F),
                  borderRadius: BorderRadius.circular(8),
                  border: FlameBorder(width: 1.3),
                ),
                child: const Icon(
                  Icons.edit,
                  color: Color(0xFFF5F8FF),
                  size: 15,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─── WALLET CARD ─────────────────────────────────────────
  Widget _walletCard(num wallet) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(Icons.star, color: Color(0xFFF5F8FF), size: 10),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 11),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(6),
            color: const Color(0xFF25456F).withValues(alpha: 0.7),
            border: FlameBorder(width: 1.3),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.account_balance_wallet_rounded,
                color: Color(0xFFF5F8FF),
                size: 18,
              ),
              const SizedBox(width: 8),
              Text(
                _fmt(wallet),
                style: GoogleFonts.lato(
                  color: const Color(0xFFF5F8FF),
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        const Icon(Icons.star, color: Color(0xFFF5F8FF), size: 10),
      ],
    );
  }

  // ─── MENU ITEM ────────────────────────────────────────────
  Widget _item(
      IconData icon,
      Color iconColor,
      String label,
      VoidCallback onTap,
      ) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: ThemeHoverShadow(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              color: const Color(0xFF1C3459).withValues(alpha: 0.55),
              border: FlameBorder(width: 1.0),
            ),
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: const Color(0xFF25456F),
                    border: FlameBorder(width: 1.2),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFF5F8FF),
                        blurRadius: 8,
                      ),
                    ],
                  ),
                  child: Icon(icon, color: iconColor, size: 22),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Text(
                    label,
                    style: GoogleFonts.lato(
                      color: const Color(0xFFF5F8FF),
                      fontSize: 15.5,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.4,
                    ),
                  ),
                ),
                const Icon(
                  Icons.chevron_right_rounded,
                  color: Color(0xFFF5F8FF),
                  size: 22,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _fmt(num v) {
    final s = v.toStringAsFixed(0);
    final b = StringBuffer();
    for (int i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) b.write(',');
      b.write(s[i]);
    }
    return b.toString();
  }
}

// ─── Star point widget ─────────────────────────────────────
class _StarPoint extends StatelessWidget {
  final bool small;
  const _StarPoint({this.small = false});
  @override
  Widget build(BuildContext context) {
    final s = small ? 10.0 : 15.0;
    return Container(
      width: s,
      height: s,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: const Color(0xFF1C3459),
        border: FlameBorder(width: 1),
      ),
      child: Icon(
        Icons.star,
        color: const Color(0xFFF5F8FF),
        size: small ? 6 : 9,
      ),
    );
  }
}
