import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/colors.dart';
import '../../models/market.dart';
import '../../widgets/cosmic_background.dart';
import 'single_bet_screen.dart';
import 'jodi_bet_screen.dart';
import 'single_panna_bet_screen.dart';
import 'double_panna_bet_screen.dart';
import 'triple_panna_bet_screen.dart';
import 'family_panna_bet_screen.dart';
import 'cycle_patti_bet_screen.dart';
import 'group_jodi_bet_screen.dart';
import 'sp_dp_tp_bet_screen.dart';
import 'sp_motor_bet_screen.dart';
import 'dp_motor_bet_screen.dart';
import 'odd_even_bet_screen.dart';
import 'red_bracket_bet_screen.dart';
import 'half_sangam_bet_screen.dart';
import 'full_sangam_bet_screen.dart';

class GamesScreen extends StatefulWidget {
  final Market market;
  const GamesScreen({super.key, required this.market});

  @override
  State<GamesScreen> createState() => _GamesScreenState();
}

class _GamesScreenState extends State<GamesScreen> {
  static const List<Map<String, String>> _games = [
    {'key': 'single', 'name': 'SINGLE'},
    {'key': 'jodi', 'name': 'JODI'},
    {'key': 'single_panna', 'name': 'SINGLE PANNA'},
    {'key': 'double_panna', 'name': 'DOUBLE PANNA'},
    {'key': 'triple_panna', 'name': 'TRIPLE PANNA'},
    {'key': 'family_panna', 'name': 'FAMILY PANNA'},
    {'key': 'cycle_patti', 'name': 'CYCLE PATTI'},
    {'key': 'group_jodi', 'name': 'GROUP JODI'},
    {'key': 'sp_dp_tp', 'name': 'SP DP TP'},
    {'key': 'sp_motor', 'name': 'SP MOTOR'},
    {'key': 'dp_motor', 'name': 'DP MOTOR'},
    {'key': 'odd_even', 'name': 'ODD EVEN'},
    {'key': 'red_bracket', 'name': 'RED BRACKET'},
    {'key': 'half_sangam_a', 'name': 'HALF SANGAM A'},
    {'key': 'half_sangam_b', 'name': 'HALF SANGAM B'},
    {'key': 'full_sangam', 'name': 'FULL SANGAM'},
  ];

  static const Set<String> _blockedAfterOpen = {
    'jodi',
    'group_jodi',
    'red_bracket',
    'half_sangam_a',
    'half_sangam_b',
    'full_sangam',
  };

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // 🚀 PRE-CACHE GIFS so they play smoothly when scrolling
    for (final game in _games) {
      precacheImage(AssetImage('assets/games/${game['key']}.gif'), context);
    }
  }

  String? _blockReason(String gameKey) {
    if (widget.market.isClosed) {
      return '${widget.market.name} is closed for today';
    }
    final openDeclared = widget.market.hasOpenResult;
    final openTimePassed = !widget.market.openSessionOpen;

    if ((openDeclared || openTimePassed) && _blockedAfterOpen.contains(gameKey)) {
      final label = _games.firstWhere(
            (g) => g['key'] == gameKey,
        orElse: () => {'name': gameKey},
      )['name']!;
      return '${widget.market.name}: open result declared — $label not available';
    }

    return null;
  }

  void _onGameTap(String gameKey, String gameLabel) {
    final reason = _blockReason(gameKey);
    if (reason != null) {
      _showBlockedDialog(reason);
      return;
    }

    Widget? screen;
    switch (gameKey) {
      case 'single':
        screen = SingleBetScreen(market: widget.market, gameType: 'single', gameLabel: gameLabel);
        break;
      case 'jodi':
        screen = JodiBetScreen(market: widget.market, gameType: 'jodi', gameLabel: gameLabel);
        break;
      case 'single_panna':
        screen = SinglePannaBetScreen(market: widget.market, gameType: 'single_panna', gameLabel: gameLabel);
        break;
      case 'double_panna':
        screen = DoublePannaBetScreen(market: widget.market, gameType: 'double_panna', gameLabel: gameLabel);
        break;
      case 'triple_panna':
        screen = TriplePannaBetScreen(market: widget.market, gameType: 'triple_panna', gameLabel: gameLabel);
        break;
      case 'family_panna':
        screen = FamilyPannaBetScreen(market: widget.market, gameType: 'family_panna', gameLabel: gameLabel);
        break;
      case 'cycle_patti':
        screen = CyclePattiBetScreen(market: widget.market, gameType: 'cycle_patti', gameLabel: gameLabel);
        break;
      case 'group_jodi':
        screen = GroupJodiBetScreen(market: widget.market, gameType: 'group_jodi', gameLabel: gameLabel);
        break;
      case 'sp_dp_tp':
        screen = SpDpTpBetScreen(market: widget.market, gameType: 'sp_dp_tp', gameLabel: gameLabel);
        break;
      case 'sp_motor':
        screen = SpMotorBetScreen(market: widget.market, gameType: 'sp_motor', gameLabel: gameLabel);
        break;
      case 'dp_motor':
        screen = DpMotorBetScreen(market: widget.market, gameType: 'dp_motor', gameLabel: gameLabel);
        break;
      case 'odd_even':
        screen = OddEvenBetScreen(market: widget.market, gameType: 'odd_even', gameLabel: gameLabel);
        break;
      case 'red_bracket':
        screen = RedBracketBetScreen(market: widget.market, gameType: 'red_bracket', gameLabel: gameLabel);
        break;
      case 'half_sangam_a':
        screen = HalfSangamBetScreen(market: widget.market, gameType: 'half_sangam_a', gameLabel: 'Half Sangam A');
        break;
      case 'half_sangam_b':
        screen = HalfSangamBetScreen(market: widget.market, gameType: 'half_sangam_b', gameLabel: 'Half Sangam B');
        break;
      case 'full_sangam':
        screen = FullSangamBetScreen(market: widget.market, gameType: 'full_sangam', gameLabel: 'Full Sangam');
        break;
    }

    if (screen != null) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => screen!));
    }
  }

  void _showBlockedDialog(String reason) {
    showDialog<void>(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: const Color(0xFF0A4A35),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: const Color(0xFFF5F8FF), width: 1.4),
        ),
        insetPadding: const EdgeInsets.symmetric(horizontal: 28, vertical: 30),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(22, 24, 22, 18),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 76,
                height: 76,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF0A4A35),
                  border: Border.all(color: const Color(0xFFE74C3C), width: 1.6),
                ),
                child: const Icon(Icons.lock_clock_rounded, color: Color(0xFFE74C3C), size: 38),
              ),
              const SizedBox(height: 18),
              Text(
                'MARKET CLOSED',
                textAlign: TextAlign.center,
                style: GoogleFonts.cinzel(
                  color: const Color(0xFFF5F8FF),
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                reason,
                textAlign: TextAlign.center,
                style: GoogleFonts.lato(
                  color: const Color(0xFFFFF8EB),
                  fontSize: 13.5,
                  height: 1.45,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 22),
              SizedBox(
                width: double.infinity,
                height: 46,
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  style: OutlinedButton.styleFrom(
                    backgroundColor: const Color(0xFF0A4A35),
                    side: const BorderSide(color: const Color(0xFFF5F8FF), width: 1.4),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: Text(
                    'OK',
                    style: GoogleFonts.cinzel(
                      color: const Color(0xFFF5F8FF),
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 2,
                    ),
                  ),
                ),
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
              _header(context),
              _sessionBanner(),
              Expanded(
                child: GridView.builder(
                  padding: const EdgeInsets.fromLTRB(14, 8, 14, 22),
                  physics: const BouncingScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 14,
                    mainAxisSpacing: 14,
                    childAspectRatio: 0.92,
                  ),
                  itemCount: _games.length,
                  itemBuilder: (_, i) {
                    final key = _games[i]['key']!;
                    final label = _games[i]['name']!;
                    return _GameCard(
                      gifKey: key,
                      label: label,
                      enabled: _blockReason(key) == null,
                      onTap: () => _onGameTap(key, label),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _sessionBanner() {
    final openOk = widget.market.openSessionOpen;
    final closeOk = widget.market.closeSessionOpen;

    if (widget.market.isClosed) {
      return Container(
        margin: const EdgeInsets.fromLTRB(14, 0, 14, 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          color: const Color(0xFF0A4A35),
          border: Border.all(color: const Color(0xFFE74C3C), width: 1.2),
        ),
        child: Row(
          children: [
            const Icon(Icons.do_not_disturb_on_rounded, color: Color(0xFFE74C3C), size: 18),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'Market closed for today',
                style: GoogleFonts.lato(color: const Color(0xFFE74C3C), fontSize: 12.5, fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
      );
    }

    final bothOpen = openOk && closeOk;
    final onlyClose = !openOk && closeOk;
    final onlyOpen = openOk && !closeOk;

    final label = bothOpen
        ? 'Open & Close both playable'
        : onlyClose
        ? 'Open result declared — only CLOSE session is playable'
        : onlyOpen
        ? 'Only OPEN session is playable'
        : 'Session unavailable';

    final color = bothOpen
        ? const Color(0xFF2ECC71)
        : onlyClose
        ? const Color(0xFFFFB347)
        : const Color(0xFFE74C3C);

    final icon = bothOpen
        ? Icons.check_circle_outline_rounded
        : onlyClose
        ? Icons.info_outline_rounded
        : Icons.warning_amber_rounded;

    return Container(
      margin: const EdgeInsets.fromLTRB(14, 0, 14, 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        color: color.withValues(alpha: 0.1),
        border: Border.all(color: color.withValues(alpha: 0.7), width: 1.2),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              label,
              style: GoogleFonts.lato(color: color, fontSize: 12, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  Widget _header(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 10, 12, 10),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFFF5F8FF), size: 22),
            onPressed: () => Navigator.pop(context),
          ),
          Expanded(
            child: Center(
              child: RepaintBoundary( // 🚀 Prevents header text from blinking
                child: Text(
                  widget.market.name.toUpperCase(),
                  style: GoogleFonts.cinzel(
                    color: const Color(0xFFF3E7D0), // Darker brown, no harsh contrast
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 3,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 46),
        ],
      ),
    );
  }
}

// ─── Ornate game card ─────────────────────────────────────
class _GameCard extends StatelessWidget {
  final String gifKey;
  final String label;
  final bool enabled;
  final VoidCallback onTap;
  const _GameCard({
    required this.gifKey,
    required this.label,
    required this.onTap,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    // 🚀 RepaintBoundary stops the whole card from rebuilding when scrolling
    return RepaintBoundary(
      child: GestureDetector(
        onTap: onTap,
        child: Opacity(
          opacity: enabled ? 1.0 : 0.45,
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              gradient: const LinearGradient(
                colors: [Color(0xFF084A35), Color(0xFF176C4B)], // Yellow gradient
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              border: Border.all(
                color: enabled ? const Color(0xFFD6AA41) : const Color(0xFF8B6914), // Amber border
                width: 1.4,
              ),
              // 🚀 NO BLACK SHADOW — Only amber glow
              boxShadow: enabled
                  ? [
                BoxShadow(
                  color: const Color(0xFFD6AA41).withValues(alpha: 0.25),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ]
                  : null,
            ),
            child: Stack(
              children: [
                // Inner subtle radial glow
                Positioned.fill(
                  child: IgnorePointer(
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        gradient: RadialGradient(
                          colors: [
                            const Color(0xFFE2BC62).withValues(alpha: 0.15),
                            Colors.transparent,
                          ],
                          radius: 0.9,
                        ),
                      ),
                    ),
                  ),
                ),
                // Corner ornaments
                Positioned.fill(
                  child: IgnorePointer(
                    child: CustomPaint(painter: _CornerOrnamentPainter()),
                  ),
                ),
                // Lock badge
                if (!enabled)
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.all(5),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFF0A4A35),
                        border: Border.all(color: const Color(0xFFE74C3C), width: 1.2),
                      ),
                      child: const Icon(Icons.lock_rounded, color: Color(0xFFE74C3C), size: 14),
                    ),
                  ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(10, 14, 10, 12),
                  child: Column(
                    children: [
                      const SizedBox(height: 8),
                      SizedBox(
                        width: 110,
                        height: 110,
                        child: Image.asset(
                          'assets/games/$gifKey.gif',
                          fit: BoxFit.contain,
                          cacheWidth: 110,
                          cacheHeight: 110,
                          gaplessPlayback: true, // 🚀 Stops GIF from resetting
                          errorBuilder: (_, __, ___) => const Icon(
                            Icons.auto_awesome,
                            color: Color(0xFFF5F8FF),
                            size: 46,
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Expanded(
                        child: Center(
                          // 🚀 Extra RepaintBoundary for text
                          child: RepaintBoundary(
                            child: Text(
                              label,
                              textAlign: TextAlign.center,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.cinzel(
                                color: const Color(0xFFF3E7D0), // Deep warm brown
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 1.4,
                                // 🚀 REMOVED the yellow shadow that was causing the blink
                              ),
                            ),
                          ),
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
    );
  }
}

// ─── Ornate corner + side flourishes ──────────────────────
class _CornerOrnamentPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = const Color(0xFFD6AA41) // Amber corners to match theme
      ..strokeWidth = 1.3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    void corner(Offset o, bool fx, bool fy) {
      final sx = fx ? -1.0 : 1.0;
      final sy = fy ? -1.0 : 1.0;
      final path = Path()
        ..moveTo(o.dx + 12 * sx, o.dy)
        ..lineTo(o.dx + 4 * sx, o.dy)
        ..quadraticBezierTo(o.dx, o.dy, o.dx, o.dy + 4 * sy)
        ..lineTo(o.dx, o.dy + 12 * sy);
      canvas.drawPath(path, p);

      final d = Path()
        ..moveTo(o.dx, o.dy - 4 * sy)
        ..lineTo(o.dx + 4 * sx, o.dy)
        ..lineTo(o.dx, o.dy + 4 * sy)
        ..lineTo(o.dx - 4 * sx, o.dy)
        ..close();
      canvas.drawPath(d, p..strokeWidth = 0.9);
    }

    const pad = 4.0;
    corner(const Offset(pad, pad), false, false);
    corner(Offset(size.width - pad, pad), true, false);
    corner(Offset(pad, size.height - pad), false, true);
    corner(Offset(size.width - pad, size.height - pad), true, true);

    final dot = Paint()..color = const Color(0xFF8B6914); // Dark amber dots
    canvas.drawCircle(Offset(size.width / 2, 4), 1.4, dot);
    canvas.drawCircle(Offset(size.width / 2, size.height - 4), 1.4, dot);
    canvas.drawCircle(Offset(4, size.height / 2), 1.4, dot);
    canvas.drawCircle(Offset(size.width - 4, size.height / 2), 1.4, dot);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}