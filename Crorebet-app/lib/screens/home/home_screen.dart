import '../../widgets/flame_border.dart';
import '../../widgets/flame_text.dart';
import '../../widgets/theme_hover_shadow.dart';
import '../../widgets/app_toast.dart';
import 'dart:async';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/market_provider.dart';
import '../../providers/session_provider.dart';
import '../../providers/settings_provider.dart';
import '../../services/api_service.dart';
import '../../utils/whatsapp_helper.dart';
import '../../widgets/home/app_drawer.dart';
import '../../widgets/home/market_card.dart';
import '../games/games_screen.dart';
import '../charts/chart_detail_screen.dart';
import '../wallet/deposit_screen.dart';
import '../wallet/withdraw_screen.dart';
import '../wallet/passbook_screen.dart';
import '../wallet/funds_screen.dart';
import '../bids/bid_history_screen.dart';
import '../support/support_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  int _navIndex = 2;
  Timer? _tick;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MarketProvider>().loadMarkets();
    });
    _tick = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _tick?.cancel();
    super.dispose();
  }

  Future<void> _openSupportWhatsApp() async {
    final auth = context.read<AuthProvider>();
    final settings = context.read<SettingsProvider>();
    final number = settings.whatsappNumber;

    if (number.isEmpty) {
      _snack('support_coming_soon'.tr());
      return;
    }

    final name = (auth.user?['name'] ?? 'User').toString();
    final mobile = (auth.user?['mobile'] ?? '').toString();

    final ok = await WhatsAppHelper.openSupport(
      number: number,
      name: name,
      mobile: mobile,
    );
    if (!ok && mounted) {
      _snack('could_not_open_whatsapp_short'.tr());
    }
  }

  Future<void> _openTelegram() async {
    final settings = context.read<SettingsProvider>();
    final link = settings.telegramLink;
    if (link.isEmpty) {
      _snack('telegram_coming_soon'.tr());
      return;
    }
    final uri = Uri.parse(link);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else if (mounted) {
      _snack('could_not_open_telegram'.tr());
    }
  }

  Future<bool> _confirmExit(BuildContext context) async {
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (_) => Dialog(
        backgroundColor: const Color(0xFF0A4A35),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.flameBorder, width: 1.6),
        ),
        insetPadding: const EdgeInsets.symmetric(horizontal: 32),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(22, 22, 22, 18),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              FlameText(child: Text(
                'quit'.tr(),
                style: GoogleFonts.cinzel(
                  color: const Color(0xFFF5F8FF),
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                ),
              )),
              const SizedBox(height: 18),
              const Icon(Icons.directions_run_rounded,
                  color: Color(0xFFF5F8FF), size: 56),
              const SizedBox(height: 14),
              Text(
                'are_you_sure_quit'.tr(),
                textAlign: TextAlign.center,
                style: GoogleFonts.lato(
                  color: const Color(0xFFF5F8FF),
                  fontSize: 14.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 22),
              Row(
                children: [
                  Expanded(
                    child: SizedBox(
                      height: 46,
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(context, false),
                        style: OutlinedButton.styleFrom(
                          backgroundColor: const Color(0xFF146043),
                          side: const BorderSide(
                              color: AppColors.flameBorder, width: 1.4),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        child: Text(
                          'no'.tr(),
                          style: GoogleFonts.lato(
                            color: const Color(0xFFF5F8FF),
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 2,
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
                        onPressed: () => Navigator.pop(context, true),
                        style: OutlinedButton.styleFrom(
                          backgroundColor: const Color(0xFF146043),
                          side: const BorderSide(
                              color: AppColors.flameBorder, width: 1.4),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        child: Text(
                          'yes'.tr(),
                          style: GoogleFonts.lato(
                            color: const Color(0xFFF5F8FF),
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 2,
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
    return result == true;
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final wallet = auth.user?['wallet'] ?? 0;

    return Listener(
      onPointerDown: (_) => context.read<SessionProvider>().touch(),
      child: PopScope(
        canPop: false,
        onPopInvokedWithResult: (didPop, _) async {
          if (didPop) return;
          final shouldExit = await _confirmExit(context);
          if (shouldExit && mounted) {
            SystemNavigator.pop();
          }
        },
        child: Scaffold(
          key: _scaffoldKey,
          backgroundColor: Colors.transparent,
          resizeToAvoidBottomInset: false,
          drawer: const AppDrawer(),
          body: Container(
            color: const Color(0xFFF8EBD1),
            width: double.infinity,
            height: double.infinity,
            child: Stack(
              fit: StackFit.expand,
              children: [
                SafeArea(
                  top: true,
                  bottom: false,
                  child: Column(
                    children: [
                      _header(wallet),
                      Expanded(
                        child: RefreshIndicator(
                          color: const Color(0xFFF5F8FF),
                          backgroundColor: const Color(0xFF146043),
                          onRefresh: () =>
                              context.read<MarketProvider>().loadMarkets(),
                          child: SingleChildScrollView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            child: Column(
                              children: [
                                _heroBanner(),
                                _quickActions(),
                                const SizedBox(height: 10),
                                _contactBar(),
                                const SizedBox(height: 14),
                                _markets(),
                                const SizedBox(height: 22),
                              ],
                            ),
                          ),
                        ),
                      ),
                      _bottomNav(),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ─── HEADER ─────────────────────────────────────────────
  Widget _header(num wallet) {
    return Container(
      key: const ValueKey('home_header'),
      color: const Color(0xFF063D30),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      child: Row(children: [
        IconButton(onPressed: () => _scaffoldKey.currentState?.openDrawer(), icon: const Icon(Icons.menu, color: Colors.white)),
        Expanded(child: Align(
          alignment: Alignment.centerLeft,
          child: Image.asset('assets/images/crore_bet_wordmark.png', key: const ValueKey('header_wordmark'), height: 37, fit: BoxFit.contain),
        )),
        InkWell(onTap: _openDeposit, child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
          decoration: BoxDecoration(border: Border.all(color: const Color(0xFFD6AA41)), borderRadius: BorderRadius.circular(14)),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.account_balance_wallet, color: Color(0xFFF4C95D), size: 20),
            const SizedBox(width: 6),
            Text('₹ ${_fmt(wallet)}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            const Icon(Icons.chevron_right, color: Color(0xFFF4C95D), size: 19),
          ]),
        )),
      ]),
    );
  }

  Widget _heroBanner() {
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 12, 12, 4),
      height: 136,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(color: const Color(0xFFF3DEB8), borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFE7D1A8))),
      child: Row(children: [
        Expanded(child: Padding(padding: const EdgeInsets.fromLTRB(16, 14, 0, 12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
          const Text('Namaste!', style: TextStyle(color: Color(0xFF063D30), fontFamily: 'serif', fontSize: 25, fontStyle: FontStyle.italic, fontWeight: FontWeight.bold)),
          const SizedBox(height: 5),
          const Text("Ready for today's markets?", style: TextStyle(color: Color(0xFF453D2E), fontSize: 12)),
        ]))),
        Image.asset('assets/images/crore_bet_hero.png', height: 136, width: 155, fit: BoxFit.contain),
      ]),
    );
  }

  // ─── QUICK ACTIONS ──────────────────────────────────────
  Widget _quickActions() {
    final actions = <(IconData, String, VoidCallback)>[
      (Icons.add_circle_outline, 'add_fund'.tr(), _openDeposit),
      (Icons.file_upload_outlined, 'withdraw'.tr(), _openWithdraw),
      (Icons.receipt_long_outlined, 'bid_history'.tr(), _openBidHistory),
      (Icons.chat_outlined, 'whatsapp'.tr(), _openSupportWhatsApp),
    ];
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
      child: Row(children: actions.map((action) => Expanded(child: InkWell(
        onTap: action.$3,
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 4),
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 2),
          decoration: BoxDecoration(color: const Color(0xFFFFFAEF), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFD9C08D))),
          child: Column(children: [
            Icon(action.$1, color: const Color(0xFF06503A), size: 26),
            const SizedBox(height: 5),
            Text(action.$2, textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Color(0xFF063D30), fontSize: 11, fontWeight: FontWeight.bold)),
          ]),
        ),
      ))).toList()),
    );
  }

  // ─── CONTACT BAR ────────────────────────────────────────
  Widget _contactBar() {
    final settings = context.watch<SettingsProvider>();
    final hasWa = settings.hasWhatsapp;
    final hasTg = settings.hasTelegram;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        // 🚀 Amber glow only, no black
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFD6AA41).withValues(alpha: 0.25),
            blurRadius: 16,
            spreadRadius: 1,
          ),
          BoxShadow(
            color: const Color(0xFF176C4B).withValues(alpha: 0.30),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: Stack(
          children: [
            // Base gradient
            Positioned.fill(
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF084A35), Color(0xFF176C4B)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
              ),
            ),
            // Diagonal shine ray
            Positioned(
              top: -20,
              left: -30,
              child: IgnorePointer(
                child: Transform.rotate(
                  angle: 0.5,
                  child: Container(
                    width: 260,
                    height: 20,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Colors.white.withValues(alpha: 0.0),
                          Colors.white.withValues(alpha: 0.45),
                          Colors.white.withValues(alpha: 0.0),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
            // Border
            Positioned.fill(
              child: IgnorePointer(
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                        color: const Color(0xFFD6AA41), width: 1.4),
                  ),
                ),
              ),
            ),
            // Content
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: hasWa ? _openSupportWhatsApp : null,
                    behavior: HitTestBehavior.opaque,
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: hasWa
                                ? const Color(0xFF25D366)
                                : const Color(0xFF25D366).withValues(alpha: 0.4),
                            boxShadow: hasWa
                                ? [
                              BoxShadow(
                                color: const Color(0xFF25D366)
                                    .withValues(alpha: 0.5),
                                blurRadius: 10,
                              )
                            ]
                                : [],
                          ),
                          child: const Icon(Icons.phone_rounded,
                              color: Colors.white, size: 15),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          hasWa ? settings.whatsappDisplay : 'whatsapp'.tr(),
                          style: GoogleFonts.lato(
                            color: const Color(0xFFF5F8FF),
                            fontSize: 13.5,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  const Icon(Icons.star, color: Color(0xFFB8860B), size: 10),
                  const Spacer(),
                  GestureDetector(
                    onTap: hasTg ? _openTelegram : null,
                    behavior: HitTestBehavior.opaque,
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: hasTg
                                ? const Color(0xFF2AABEE)
                                : const Color(0xFF2AABEE).withValues(alpha: 0.4),
                            boxShadow: hasTg
                                ? [
                              BoxShadow(
                                color: const Color(0xFF2AABEE)
                                    .withValues(alpha: 0.5),
                                blurRadius: 10,
                              )
                            ]
                                : [],
                          ),
                          child: const Icon(Icons.send,
                              color: Colors.white, size: 14),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          hasTg ? settings.telegramLabel : 'telegram'.tr(),
                          style: GoogleFonts.lato(
                            color: const Color(0xFFF5F8FF),
                            fontSize: 12.5,
                            fontWeight: FontWeight.w800,
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
    );
  }

  Widget _markets() {
    final mp = context.watch<MarketProvider>();
    if (mp.loading && mp.markets.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(40),
        child: CircularProgressIndicator(color: AppColors.gold),
      );
    }
    if (mp.markets.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          children: [
            const Icon(Icons.cloud_off_rounded,
                color: Color(0xFFE5D6B7), size: 50),
            const SizedBox(height: 12),
            Text(
              mp.error ?? 'no_markets_available'.tr(),
              style: GoogleFonts.lato(color: AppColors.textSecondary),
            ),
          ],
        ),
      );
    }
    return Column(
      children: mp.markets
          .map((m) => MarketCard(
        market: m,
        onPlay: () => _open(m),
        onChart: () => _openChart(m),
      ))
          .toList(),
    );
  }

  void _open(dynamic m) {
    if (m.status == 'waiting') {
      _snack('opens_at'.tr(namedArgs: {
        'market': m.name,
        'time': m.openTimeDisplay,
      }));
      return;
    }
    if (m.status == 'closed') {
      _snack('msg_market_closed'.tr(namedArgs: {'name': m.name}));
      return;
    }
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => GamesScreen(market: m),
      ),
    );
  }

  void _openChart(dynamic m) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ChartDetailScreen(market: m),
      ),
    );
  }

  void _openDeposit() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const DepositScreen()),
    );
  }

  void _openWithdraw() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const WithdrawScreen()),
    );
  }

  void _openBidHistory() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const BidHistoryScreen()),
    );
  }

  void _openPassbook() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const PassbookScreen()),
    );
  }

  void _openFunds() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const FundsScreen()),
    );
  }

  Widget _bottomNav() {
    final items = <(IconData, String, VoidCallback)>[
      (Icons.receipt_long_outlined, 'my_bids'.tr(), _openBidHistory),
      (Icons.book_outlined, 'passbook'.tr(), _openPassbook),
      (Icons.home_rounded, 'home'.tr(), () {}),
      (Icons.account_balance_wallet_outlined, 'funds'.tr(), _openFunds),
      (Icons.headset_mic_outlined, 'support'.tr(), () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SupportScreen()))),
    ];
    return Container(
      key: const ValueKey('home_bottom_navigation'),
      color: const Color(0xFF063D30),
      child: SafeArea(top: false, child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(children: List.generate(items.length, (i) {
          final item = items[i];
          final selected = i == _navIndex;
          final color = selected ? const Color(0xFFF4C95D) : Colors.white;
          return Expanded(child: InkWell(onTap: item.$3, child: SizedBox(
            height: 50,
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Icon(item.$1, color: color, size: 23),
              const SizedBox(height: 3),
              Text(item.$2, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w600)),
            ]),
          )));
        })),
      )),
    );
  }

  void _snack(String msg) {
    if (!mounted) return;
    AppToast.show(context, msg);
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
