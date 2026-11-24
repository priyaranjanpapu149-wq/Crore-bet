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
        backgroundColor: const Color(0xFF1C3459),
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
                          backgroundColor: const Color(0xFF25456F),
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
                          backgroundColor: const Color(0xFF25456F),
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
                          backgroundColor: const Color(0xFF25456F),
                          onRefresh: () =>
                              context.read<MarketProvider>().loadMarkets(),
                          child: SingleChildScrollView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            child: Column(
                              children: [
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
    return Padding(
      padding: const EdgeInsets.fromLTRB(6, 8, 10, 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          GestureDetector(
            onTap: () => _scaffoldKey.currentState?.openDrawer(),
            behavior: HitTestBehavior.opaque,
            child: Padding(
              padding: const EdgeInsets.all(4),
              child: Image.asset(
                'assets/images/lotus.png',
                width: 70,
                height: 70,
                fit: BoxFit.contain,
              ),
            ),
          ),
          const SizedBox(width: 4),
          Expanded(
            child: GestureDetector(
              onTap: () => _scaffoldKey.currentState?.openDrawer(),
              behavior: HitTestBehavior.opaque,
              child: Align(
                alignment: Alignment.centerLeft,
                // 🚀 STYLISH GOLD GRADIENT TEXT 🚀
                child: ShaderMask(
                  shaderCallback: (bounds) => const LinearGradient(
                    colors: [
                      Color(0xFF78B9FF), // Bright Gold
                      Color(0xFFB8860B), // Darker Gold
                      Color(0xFF78B9FF), // Bright Gold
                    ],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ).createShader(bounds),
                  child: Text(
                    'app_name'.tr(),
                    style: GoogleFonts.cinzel(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 3,
                      shadows: [
                        Shadow(
                          color: Colors.black.withValues(alpha: 0.5),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
          // 🚀 WALLET PILL — AMBER GLOW ONLY (NO BLACK SHADOW)
          GestureDetector(
            onTap: _openDeposit,
            behavior: HitTestBehavior.opaque,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                gradient: const LinearGradient(
                  colors: [Color(0xFF14284A), Color(0xFF284D7E)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                border: Border.all(color: const Color(0xFF5EA8F5), width: 1.6),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF70B6FF).withValues(alpha: 0.45),
                    blurRadius: 14,
                    spreadRadius: 1,
                  ),
                  BoxShadow(
                    color: const Color(0xFF284D7E).withValues(alpha: 0.30),
                    blurRadius: 5,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  const Icon(Icons.account_balance_wallet,
                      color: Color(0xFFF5F8FF), size: 16),
                  const SizedBox(width: 6),
                  Text(
                    '₹ ${_fmt(wallet)}',
                    style: GoogleFonts.lato(
                      color: const Color(0xFFF5F8FF),
                      fontSize: 14,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Container(
                    width: 18,
                    height: 18,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: AppColors.goldGradient,
                      boxShadow: [
                        BoxShadow(
                          color: Color(0xFF5EA8F5),
                          blurRadius: 4,
                        ),
                      ],
                    ),
                    child: const Icon(Icons.add,
                        color: Color(0xFFF5F8FF), size: 14),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─── QUICK ACTIONS ──────────────────────────────────────
  Widget _quickActions() {
    final items = [
      {'img': 'assets/images/q_add_fund.png', 'key': 'add_fund', 'label': 'add_fund'.tr()},
      {'img': 'assets/images/q_withdraw.png', 'key': 'withdraw', 'label': 'withdraw'.tr()},
      {'img': 'assets/images/q_bid_history.png', 'key': 'bid_history', 'label': 'bid_history'.tr()},
      {'img': 'assets/images/q_whatsapp.png', 'key': 'whatsapp', 'label': 'whatsapp'.tr()},
    ];
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: items.map((a) {
          final key = a['key'] as String;
          return GestureDetector(
            onTap: () {
              if (key == 'add_fund') {
                _openDeposit();
              } else if (key == 'withdraw') {
                _openWithdraw();
              } else if (key == 'bid_history') {
                _openBidHistory();
              } else if (key == 'whatsapp') {
                _openSupportWhatsApp();
              }
            },
            child: Column(
              children: [
                // 🚀 GLOW + DIAGONAL SHINE RAY quick-action circle
                Container(
                  width: 74,
                  height: 74,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF5EA8F5).withValues(alpha: 0.20),
                        blurRadius: 20,
                        spreadRadius: 2,
                      ),
                      BoxShadow(
                        color: const Color(0xFF70B6FF).withValues(alpha: 0.35),
                        blurRadius: 10,
                        spreadRadius: 1,
                      ),
                    ],
                  ),
                  child: ClipOval(
                    child: Stack(
                      children: [
                        // Base gradient
                        Positioned.fill(
                          child: Container(
                            decoration: const BoxDecoration(
                              gradient: LinearGradient(
                                colors: [Color(0xFF14284A), Color(0xFF284D7E)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                            ),
                          ),
                        ),
                        // Diagonal shine ray
                        Positioned(
                          top: -20,
                          left: -10,
                          child: IgnorePointer(
                            child: Transform.rotate(
                              angle: 0.6,
                              child: Container(
                                width: 120,
                                height: 24,
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [
                                      Colors.white.withValues(alpha: 0.0),
                                      Colors.white.withValues(alpha: 0.55),
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
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: const Color(0xFF5EA8F5),
                                  width: 1.5,
                                ),
                              ),
                            ),
                          ),
                        ),
                        // Image
                        Padding(
                          padding: const EdgeInsets.all(10),
                          child: Image.asset(a['img'] as String, fit: BoxFit.contain),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  a['label'] as String,
                  style: GoogleFonts.lato(
                    color: const Color(0xFFF5F8FF),
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.4,
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
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
            color: const Color(0xFF5EA8F5).withValues(alpha: 0.25),
            blurRadius: 16,
            spreadRadius: 1,
          ),
          BoxShadow(
            color: const Color(0xFF284D7E).withValues(alpha: 0.30),
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
                    colors: [Color(0xFF14284A), Color(0xFF284D7E)],
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
                        color: const Color(0xFF5EA8F5), width: 1.4),
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
                color: Color(0xFFB6C9E2), size: 50),
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
    final items = [
      {'img': 'assets/images/nav_bids.png', 'label': 'my_bids'.tr()},
      {'img': 'assets/images/nav_passbook.png', 'label': 'passbook'.tr()},
      {'img': 'assets/images/nav_home.png', 'label': 'home'.tr()},
      {'img': 'assets/images/nav_funds.png', 'label': 'funds'.tr()},
      {'img': 'assets/images/nav_support.png', 'label': 'support'.tr()},
    ];
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1C3459).withValues(alpha: 0.98),
        border: Border(
          top: BorderSide(
            color: AppColors.flameBorder.withValues(alpha: 0.9),
            width: 1.5,
          ),
        ),
        // 🚀 Amber glow only — no black shadow
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF5EA8F5).withValues(alpha: 0.25),
            blurRadius: 22,
            offset: const Offset(0, -6),
          ),
          BoxShadow(
            color: const Color(0xFF284D7E).withValues(alpha: 0.30),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        bottom: true,
        left: false,
        right: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(4, 12, 4, 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(items.length, (i) {
              final item = items[i];
              final selected = i == _navIndex;
              final isCenter = i == 2;
              return GestureDetector(
                onTap: () {
                  setState(() => _navIndex = i);
                  if (i == 0) {
                    _openBidHistory();
                  } else if (i == 1) {
                    _openPassbook();
                  } else if (i == 3) {
                    _openFunds();
                  } else if (i == 4) {
                    _openSupportWhatsApp();
                  }
                },
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _NavCircle(
                      imagePath: item['img'] as String,
                      selected: selected,
                      isCenter: isCenter,
                    ),
                    const SizedBox(height: 5),
                    Text(
                      item['label'] as String,
                      style: GoogleFonts.lato(
                        color: const Color(0xFFF5F8FF),
                        fontSize: 10.5,
                        fontWeight: selected ? FontWeight.w900 : FontWeight.w700,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ],
                ),
              );
            }),
          ),
        ),
      ),
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

// ─── Nav circle ─────────────────────────────────────────────
class _NavCircle extends StatelessWidget {
  final String imagePath;
  final bool selected;
  final bool isCenter;
  const _NavCircle({
    required this.imagePath,
    required this.selected,
    required this.isCenter,
  });

  @override
  Widget build(BuildContext context) {
    final outerSize = isCenter ? 64.0 : 52.0;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 280),
      curve: Curves.easeOut,
      width: outerSize,
      height: outerSize,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        // 🚀 NO DARK BROWN — light gradient in both states
        gradient: RadialGradient(
          colors: selected
              ? [const Color(0xFF14284A), const Color(0xFF70B6FF)]
              : [const Color(0xFF14284A), const Color(0xFF284D7E)],
          center: Alignment.topLeft,
          radius: 1.3,
        ),
        // 🚀 Amber glow only
        boxShadow: [
          BoxShadow(
            color: selected
                ? const Color(0xFF70B6FF).withValues(alpha: 0.65)
                : const Color(0xFF5EA8F5).withValues(alpha: 0.30),
            blurRadius: selected ? 22 : 12,
            spreadRadius: selected ? 3 : 1,
          ),
          if (selected)
            BoxShadow(
              color: const Color(0xFF5EA8F5).withValues(alpha: 0.30),
              blurRadius: 36,
              spreadRadius: 6,
            ),
        ],
        border: Border.all(
          color: selected ? const Color(0xFF5EA8F5) : const Color(0xFFFFD54F),
          width: isCenter ? 2.2 : 1.6,
        ),
      ),
      child: Padding(
        padding: EdgeInsets.all(isCenter ? 4 : 3),
        child: Container(
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(
              color: Colors.white.withValues(alpha: selected ? 0.7 : 0.4),
              width: 1,
            ),
          ),
          child: Padding(
            padding: EdgeInsets.all(isCenter ? 6 : 5),
            child: Image.asset(imagePath, fit: BoxFit.contain),
          ),
        ),
      ),
    );
  }
}
