  import 'package:easy_localization/easy_localization.dart';
  import '../../widgets/flame_border.dart';
  import '../../widgets/flame_text.dart';
  import '../../widgets/theme_hover_shadow.dart';
  import 'package:flutter/material.dart';
  import 'package:google_fonts/google_fonts.dart';
  import 'package:provider/provider.dart';
  import '../../config/colors.dart';
  import '../../providers/auth_provider.dart';
  import '../../widgets/cosmic_background.dart';
  import 'bank_details_screen.dart';
  import 'deposit_screen.dart';
  import 'withdraw_screen.dart';

  class FundsScreen extends StatelessWidget {
    const FundsScreen({super.key});

    @override
    Widget build(BuildContext context) {
      final auth = context.watch<AuthProvider>();
      final wallet = auth.user?['wallet'] ?? 0;

      return Scaffold(
        backgroundColor: Colors.transparent,
        body: CosmicBackground(
          child: SafeArea(
            child: Column(
              children: [
                _header(context, wallet),
                const SizedBox(height: 6),
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(14, 4, 14, 22),
                    physics: const BouncingScrollPhysics(),
                    child: Column(
                      children: [
                        _card(
                          context,
                          iconAsset: 'assets/images/q_add_fund.png',
                          title: 'add_fund'.tr(),
                          subtitle: 'add_fund_subtitle'.tr(),
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => const DepositScreen()),
                          ),
                        ),
                        const SizedBox(height: 12),
                        _card(
                          context,
                          iconAsset: 'assets/images/q_withdraw.png',
                          title: 'withdraw_fund'.tr(),
                          subtitle: 'withdraw_subtitle'.tr(),
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => const WithdrawScreen()),
                          ),
                        ),
                        const SizedBox(height: 12),
                        _card(
                          context,
                          iconAsset: 'assets/images/nav_passbook.png',
                          title: 'add_bank_details'.tr(),
                          subtitle: 'add_bank_details_subtitle'.tr(),
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => const BankDetailsScreen()),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    Widget _header(BuildContext context, num wallet) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(4, 10, 14, 10),
        child: Row(
          children: [
            IconButton(
              icon: const Icon(Icons.arrow_back_ios_new_rounded,
                  color: Color(0xFFF5F8FF), size: 22),
              onPressed: () => Navigator.pop(context),
            ),
            Expanded(
              child: FlameText(child: Text(
                'funds_upper'.tr(),
                style: GoogleFonts.cinzel(
                  color: const Color(0xFFF5F8FF),
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 3,
                  shadows: [
                    Shadow(
                      color: const Color(0xFFF5F8FF),
                      blurRadius: 10,
                    ),
                  ],
                ),
              )),
            ),
            // wallet chip
            Container(
              padding:
              const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                gradient: const LinearGradient(
                  colors: [Color(0xFF146043), Color(0xFF0A4A35)],
                ),
                border: FlameBorder(width: 1.3),
              ),
              child: Row(
                children: [
                  const Icon(Icons.account_balance_wallet,
                      color: Color(0xFFF5F8FF), size: 15),
                  const SizedBox(width: 5),
                  FlameText(child: Text(
                    '₹ ${_fmt(wallet)}',
                    style: GoogleFonts.lato(
                      color: const Color(0xFFF5F8FF),
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                    ),
                  )),
                ],
              ),
            ),
          ],
        ),
      );
    }

    Widget _card(
        BuildContext context, {
          required String iconAsset,
          required String title,
          required String subtitle,
          required VoidCallback onTap,
        }) {
      return GestureDetector(
        onTap: onTap,
        child: ThemeHoverShadow(child: Container(
          padding: const EdgeInsets.fromLTRB(14, 14, 12, 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            gradient: const LinearGradient(
              colors: [Color(0xFF0A4A35), Color(0xFF0A4A35)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            border: FlameBorder(width: 1.3),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFF5F8FF),
                blurRadius: 12,
              ),
            ],
          ),
          child: Row(
            children: [
              SizedBox(
                width: 56,
                height: 56,
                child: Image.asset(
                  iconAsset,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => const Icon(
                    Icons.account_balance_wallet,
                    color: Color(0xFFF5F8FF),
                    size: 40,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    FlameText(child: Text(
                      title,
                      style: GoogleFonts.lato(
                        color: const Color(0xFFF5F8FF),
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.4,
                      ),
                    )),
                    const SizedBox(height: 3),
                    FlameText(child: Text(
                      subtitle,
                      style: GoogleFonts.lato(
                        color: const Color(0xFFFFF8EB),
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        height: 1.4,
                      ),
                    )),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF146043),
                  border: FlameBorder(width: 1.1),
                ),
                child: const Icon(Icons.chevron_right_rounded,
                    color: Color(0xFFF5F8FF), size: 22),
              ),
            ],
          ),
        )),
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