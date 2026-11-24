import '../../widgets/flame_border.dart';
import '../../widgets/flame_text.dart';
import '../../widgets/theme_hover_shadow.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/colors.dart';
import '../../models/market.dart';
import '../../providers/market_provider.dart';
import '../../widgets/cosmic_background.dart';
import 'package:provider/provider.dart';
import 'chart_detail_screen.dart';

class ChartsScreen extends StatefulWidget {
  const ChartsScreen({super.key});

  @override
  State<ChartsScreen> createState() => _ChartsScreenState();
}

class _ChartsScreenState extends State<ChartsScreen> {
  final _searchCtrl = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final mp = context.watch<MarketProvider>();
    final all = mp.markets;
    final filtered = _query.isEmpty
        ? all
        : all
        .where((m) =>
        m.name.toLowerCase().contains(_query.toLowerCase()))
        .toList();

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: CosmicBackground(
        child: SafeArea(
          child: Column(
            children: [
              _header(context),
              _searchBox(),
              const SizedBox(height: 12),
              Expanded(
                child: all.isEmpty && mp.loading
                    ? const Center(
                    child: CircularProgressIndicator(
                        color: AppColors.gold))
                    : filtered.isEmpty
                    ? _empty()
                    : GridView.builder(
                  padding:
                  const EdgeInsets.fromLTRB(14, 4, 14, 22),
                  physics: const BouncingScrollPhysics(),
                  gridDelegate:
                  const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 14,
                    mainAxisSpacing: 14,
                    childAspectRatio: 1.35,
                  ),
                  itemCount: filtered.length,
                  itemBuilder: (_, i) => _ChartCard(
                    market: filtered[i],
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ChartDetailScreen(
                            market: filtered[i]),
                      ),
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

  Widget _header(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 10, 12, 8),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded,
                color: const Color(0xFFF5F8FF), size: 22),
            onPressed: () => Navigator.pop(context),
          ),
          Expanded(
            child: FlameText(child: Text(
              'CHARTS',
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
        ],
      ),
    );
  }

  Widget _searchBox() {
    return ThemeHoverShadow(child: Container(
      margin: const EdgeInsets.symmetric(horizontal: 14),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        color: const Color(0xFF1C3459),
        border: FlameBorder(width: 1.3),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFF5F8FF),
            blurRadius: 10,
          ),
        ],
      ),
      child: Row(
        children: [
          const Icon(Icons.search_rounded,
              color: const Color(0xFFF5F8FF), size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: _searchCtrl,
              onChanged: (v) => setState(() => _query = v.trim()),
              style: GoogleFonts.lato(
                color: const Color(0xFFF5F8FF),
                fontSize: 15,
                fontWeight: FontWeight.w600,
              ),
              decoration: InputDecoration(
                hintText: 'Search chart',
                hintStyle: GoogleFonts.lato(
                  color: const Color(0xFFB6C9E2),
                  fontSize: 14,
                ),
                border: InputBorder.none,
                isDense: true,
                contentPadding:
                const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
          if (_query.isNotEmpty)
            GestureDetector(
              onTap: () {
                _searchCtrl.clear();
                setState(() => _query = '');
              },
              child: const Icon(Icons.close_rounded,
                  color: const Color(0xFFF5F8FF), size: 20),
            ),
        ],
      ),
    ));
  }

  Widget _empty() {
    return Center(
      child: Text(
        'No charts found',
        style: GoogleFonts.lato(
          color: const Color(0xFFE9F1FF),
          fontSize: 14,
        ),
      ),
    );
  }
}

// ─── Chart market card ────────────────────────────────────
class _ChartCard extends StatelessWidget {
  final Market market;
  final VoidCallback onTap;
  const _ChartCard({required this.market, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: ThemeHoverShadow(child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          gradient: const LinearGradient(
            colors: [Color(0xFF1C3459), Color(0xFF1C3459)],
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
        child: Stack(
          children: [
            // corner diamonds
            Positioned.fill(
              child: IgnorePointer(
                child: CustomPaint(painter: _CardCornerPainter()),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // chart icon (PNG) — white bg knocked out
                  SizedBox(
                    height: 52,
                    width: 52,
                    child: Image.asset(
                      'assets/images/cosmic_chart.png',
                      fit: BoxFit.contain,
                      errorBuilder: (_, __, ___) => const Icon(
                        Icons.bar_chart_rounded,
                        color: const Color(0xFFF5F8FF),
                        size: 40,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Expanded(
                    child: Center(
                      child: FlameText(child: Text(
                        market.name.toUpperCase(),
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.cinzel(
                          color: const Color(0xFFF5F8FF),
                          fontSize: 12.5,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1,
                          shadows: [
                            Shadow(
                              color: AppColors.gold
                                  .withValues(alpha: 0.5),
                              blurRadius: 6,
                            ),
                          ],
                        ),
                      )),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      )),
    );
  }
}

class _CardCornerPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = AppColors.gold
      ..strokeWidth = 1.2
      ..style = PaintingStyle.stroke;

    void diamond(Offset c) {
      final d = Path()
        ..moveTo(c.dx, c.dy - 4)
        ..lineTo(c.dx + 4, c.dy)
        ..lineTo(c.dx, c.dy + 4)
        ..lineTo(c.dx - 4, c.dy)
        ..close();
      canvas.drawPath(d, p);
    }

    diamond(const Offset(7, 7));
    diamond(Offset(size.width - 7, 7));
    diamond(Offset(7, size.height - 7));
    diamond(Offset(size.width - 7, size.height - 7));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
