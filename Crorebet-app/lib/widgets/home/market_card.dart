import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/colors.dart';
import '../../models/market.dart';

class MarketCard extends StatelessWidget {
  final Market market;
  final VoidCallback onPlay;
  final VoidCallback onChart;

  const MarketCard({
    super.key,
    required this.market,
    required this.onPlay,
    required this.onChart,
  });

  @override
  Widget build(BuildContext context) {
    final canBet = !market.isClosed;
    final screenWidth = MediaQuery.of(context).size.width;
    final isSmall = screenWidth < 360;

    final chartSize = isSmall ? 75.0 : 95.0;
    final playSize = isSmall ? 55.0 : 70.0;
    final titleSize = isSmall ? 13.0 : 16.0;
    final resultSize = isSmall ? 12.0 : 14.0;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF5EA8F5).withValues(alpha: 0.20),
            blurRadius: 26,
            spreadRadius: 3,
          ),
          BoxShadow(
            color: const Color(0xFF70B6FF).withValues(alpha: 0.30),
            blurRadius: 14,
            spreadRadius: 1,
          ),
          BoxShadow(
            color: const Color(0xFF284D7E).withValues(alpha: 0.25),
            blurRadius: 5,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      // 🚀 FIX: RepaintBoundary isolates the card from parent rebuilds
      child: RepaintBoundary(
        child: ClipRRect(
          borderRadius: BorderRadius.circular(18),
          child: Stack(
            children: [
              // ─── Layer 1: Base gradient ─────────────────
              Positioned.fill(
                child: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        Color(0xFF14284A),
                        Color(0xFF1C3459),
                        Color(0xFF284D7E),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      stops: [0.0, 0.5, 1.0],
                    ),
                  ),
                ),
              ),

              // ─── Layer 2: Diagonal shine ray ────────────
              Positioned(
                top: -60,
                left: -80,
                child: IgnorePointer(
                  child: Transform.rotate(
                    angle: 0.55,
                    child: Container(
                      width: 360,
                      height: 70,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            Colors.white.withValues(alpha: 0.0),
                            Colors.white.withValues(alpha: 0.55),
                            Colors.white.withValues(alpha: 0.0),
                          ],
                          stops: const [0.0, 0.5, 1.0],
                        ),
                      ),
                    ),
                  ),
                ),
              ),

              // ─── Layer 3: A second thin secondary ray ───
              Positioned(
                top: -100,
                left: 40,
                child: IgnorePointer(
                  child: Transform.rotate(
                    angle: 0.55,
                    child: Container(
                      width: 300,
                      height: 18,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            Colors.white.withValues(alpha: 0.0),
                            Colors.white.withValues(alpha: 0.30),
                            Colors.white.withValues(alpha: 0.0),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),

              // ─── Layer 4: Outer glow border ─────────────
              Positioned.fill(
                child: IgnorePointer(
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: const Color(0xFF5EA8F5),
                        width: 1.8,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF70B6FF).withValues(alpha: 0.4),
                          blurRadius: 6,
                          spreadRadius: -1,
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              // ─── Layer 5: Inner white highlight border ──
              Positioned.fill(
                child: IgnorePointer(
                  child: Padding(
                    padding: const EdgeInsets.all(3.5),
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(15),
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.55),
                          width: 1,
                        ),
                      ),
                    ),
                  ),
                ),
              ),

              // ─── Layer 6: Content ────────────────────────
              Padding(
                padding: EdgeInsets.fromLTRB(
                  isSmall ? 8 : 10,
                  12,
                  isSmall ? 8 : 10,
                  12,
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // LEFT: Chart Button
                    GestureDetector(
                      onTap: onChart,
                      behavior: HitTestBehavior.opaque,
                      child: Container(
                        width: chartSize,
                        height: chartSize,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF70B6FF).withValues(alpha: 0.25),
                              blurRadius: 14,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                        child: Image.asset(
                          'assets/images/cosmic_chart.png',
                          fit: BoxFit.contain,
                        ),
                      ),
                    ),
                    const SizedBox(width: 4),

                    // MIDDLE: Info
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          // 🚀 FIX: Market name — removed white shadow,
                          //    reduced weight w900 → w700, isolated render
                          RepaintBoundary(
                            child: Text(
                              market.name.toUpperCase(),
                              textAlign: TextAlign.center,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.cinzel(
                                color: const Color(0xFFD4E3F8),
                                fontSize: titleSize,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 1.5,
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),

                          // Result Box — changed near-black border to dark amber
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(8),
                              gradient: const LinearGradient(
                                colors: [Color(0xFFFFF8E1), Color(0xFFFFCA28)],
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                              ),
                              border: Border.all(
                                // 🚀 FIX: was 0xFFF5F8FF (near-black) → dark amber
                                color: const Color(0xFF8B6914),
                                width: 1.2,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF5EA8F5).withValues(alpha: 0.35),
                                  blurRadius: 8,
                                  offset: const Offset(0, 3),
                                ),
                              ],
                            ),
                            child: FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Text(
                                market.resultDisplay,
                                style: GoogleFonts.lato(
                                  color: const Color(0xFFD4E3F8),
                                  fontSize: resultSize,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 2,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),

                          // Status Text
                          FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text(
                              _statusLabel(market),
                              textAlign: TextAlign.center,
                              style: GoogleFonts.lato(
                                color: _statusColor(market),
                                fontSize: isSmall ? 10.0 : 11.5,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),

                          // Open & Close Times
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Expanded(
                                child: _timeCol(
                                  'open_time'.tr(),
                                  market.openTimeDisplay,
                                  isSmall,
                                ),
                              ),
                              Container(
                                margin: const EdgeInsets.symmetric(horizontal: 6),
                                width: 1,
                                height: 26,
                                color: const Color(0xFFF5F8FF).withValues(alpha: 0.2),
                              ),
                              Expanded(
                                child: _timeCol(
                                  'close_time'.tr(),
                                  market.closeTimeDisplay,
                                  isSmall,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 4),

                    // RIGHT: Play Button — glow ring only when active
                    GestureDetector(
                      onTap: canBet ? onPlay : () => _showStatusDialog(context, market),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              boxShadow: canBet
                                  ? [
                                BoxShadow(
                                  color: const Color(0xFF70B6FF).withValues(alpha: 0.55),
                                  blurRadius: 18,
                                  spreadRadius: 3,
                                ),
                                BoxShadow(
                                  color: const Color(0xFF5EA8F5).withValues(alpha: 0.3),
                                  blurRadius: 30,
                                  spreadRadius: 6,
                                ),
                              ]
                                  : [],
                            ),
                            child: Opacity(
                              opacity: canBet ? 1.0 : 0.35,
                              child: SizedBox(
                                width: playSize,
                                height: playSize,
                                child: Image.asset(
                                  'assets/images/cosmic_play.png',
                                  fit: BoxFit.contain,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 4),
                          FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text(
                              canBet
                                  ? (market.isSemiOpen
                                  ? 'play_close'.tr()
                                  : 'play_game'.tr())
                                  : 'locked'.tr(),
                              style: GoogleFonts.lato(
                                color: canBet
                                    ? const Color(0xFFF5F8FF)
                                    : const Color(0xFFB6C9E2),
                                fontSize: isSmall ? 9.0 : 10.5,
                                fontWeight: FontWeight.w800,
                              ),
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
    );
  }

  String _statusLabel(Market m) {
    if (m.isFullyOpen) return 'running_for_today'.tr();
    if (m.isSemiOpen) return 'open_done_play_close'.tr();
    return _closedLabel(m);
  }

  Color _statusColor(Market m) {
    if (m.isFullyOpen) return const Color(0xFF15803D);
    if (m.isSemiOpen) return const Color(0xFFB45309);
    return const Color(0xFFB91C1C);
  }

  String _closedLabel(Market m) {
    final openTime = m.openTime;
    if (openTime != null && openTime.contains(':')) {
      final parts = openTime.split(':');
      final h = int.tryParse(parts[0]) ?? 0;
      final min = int.tryParse(parts[1]) ?? 0;
      final now = DateTime.now();
      final openToday = DateTime(now.year, now.month, now.day, h, min);
      if (now.isBefore(openToday)) {
        return 'opens_at'.tr(namedArgs: {'time': m.openTimeDisplay});
      }
    }
    return 'closed_for_today'.tr();
  }

  Widget _timeCol(String label, String value, bool isSmall) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          textAlign: TextAlign.center,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: GoogleFonts.lato(
            color: const Color(0xFFF5F8FF).withValues(alpha: 0.6),
            fontSize: isSmall ? 8.5 : 10,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 2),
        FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            value,
            textAlign: TextAlign.center,
            style: GoogleFonts.lato(
              color: const Color(0xFFF5F8FF),
              fontSize: isSmall ? 11.5 : 13,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
      ],
    );
  }

  void _showStatusDialog(BuildContext context, Market m) {
    final isSemi = m.isSemiOpen;
    final isWaiting = m.status == 'waiting';
    final isBeforeOpen = _closedLabel(m).startsWith('Opens at');

    final title = isSemi
        ? 'close_only'.tr()
        : isWaiting || isBeforeOpen
        ? 'market_not_open'.tr()
        : 'market_closed_title'.tr();

    final message = isSemi
        ? 'msg_close_only'.tr(namedArgs: {'name': m.name})
        : isWaiting || isBeforeOpen
        ? 'msg_not_open_yet'
        .tr(namedArgs: {'name': m.name, 'time': m.openTimeDisplay})
        : 'msg_market_closed'.tr(namedArgs: {'name': m.name});

    final icon = isSemi
        ? Icons.info_outline_rounded
        : isWaiting || isBeforeOpen
        ? Icons.schedule_rounded
        : Icons.do_not_disturb_on_rounded;

    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (_) => Dialog(
        backgroundColor: const Color(0xFF1C3459),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(color: AppColors.yellow, width: 2),
        ),
        insetPadding: const EdgeInsets.symmetric(horizontal: 24),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                title,
                textAlign: TextAlign.center,
                style: GoogleFonts.cinzel(
                  color: const Color(0xFFF5F8FF),
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF1C3459),
                  border: Border.all(color: AppColors.yellow, width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.yellow.withValues(alpha: 0.35),
                      blurRadius: 18,
                    ),
                  ],
                ),
                child: Icon(icon, color: const Color(0xFFF5F8FF), size: 44),
              ),
              const SizedBox(height: 16),
              Text(
                m.name.toUpperCase(),
                textAlign: TextAlign.center,
                style: GoogleFonts.lato(
                  color: const Color(0xFFF5F8FF),
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.5,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                message,
                textAlign: TextAlign.center,
                style: GoogleFonts.lato(
                  color: const Color(0xFFD4E3F8),
                  fontSize: 13.5,
                  height: 1.5,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 44,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.yellow,
                    foregroundColor: const Color(0xFFF5F8FF),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    elevation: 0,
                    shadowColor: Colors.transparent,
                  ),
                  child: Text(
                    'ok'.tr(),
                    style: GoogleFonts.lato(
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
}