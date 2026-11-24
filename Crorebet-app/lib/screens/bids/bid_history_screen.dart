import '../../widgets/flame_border.dart';
import '../../widgets/flame_text.dart';
import '../../widgets/theme_hover_shadow.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/colors.dart';
import '../../models/bid.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../widgets/cosmic_background.dart';

class BidHistoryScreen extends StatefulWidget {
  const BidHistoryScreen({super.key});

  @override
  State<BidHistoryScreen> createState() => _BidHistoryScreenState();
}

class _BidHistoryScreenState extends State<BidHistoryScreen> {
  final _api = ApiService();
  bool _loading = true;
  String? _error;
  List<Bid> _bids = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await _api.getMyBids();
      final raw = res['data'] ?? res['rows'] ?? [];
      if (raw is List) {
        _bids = raw
            .map((e) => Bid.fromJson(e as Map<String, dynamic>))
            .toList();
      } else {
        _bids = [];
      }
    } catch (e) {
      _error = 'Could not load bids';
    }
    if (!mounted) return;
    setState(() => _loading = false);
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
              Expanded(child: _body()),
            ],
          ),
        ),
      ),
    );
  }

  Widget _header(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 10, 12, 12),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded,
                color: const Color(0xFFF5F8FF), size: 22),
            onPressed: () => Navigator.pop(context),
          ),
          Expanded(
            child: FlameText(child: Text(
              'BID HISTORY',
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
          IconButton(
            icon: const Icon(Icons.refresh_rounded,
                color: const Color(0xFFF5F8FF), size: 22),
            onPressed: _load,
          ),
        ],
      ),
    );
  }

  Widget _body() {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.gold),
      );
    }
    if (_error != null) {
      return _emptyState(_error!);
    }
    if (_bids.isEmpty) {
      return _emptyState('No bids placed yet');
    }
    return RefreshIndicator(
      color: const Color(0xFFF5F8FF),
      backgroundColor: const Color(0xFF25456F),
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(12, 4, 12, 20),
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount: _bids.length,
        itemBuilder: (_, i) => _BidCard(bid: _bids[i]),
      ),
    );
  }

  Widget _emptyState(String msg) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.receipt_long_rounded,
              color: const Color(0xFFB6C9E2), size: 60),
          const SizedBox(height: 14),
          FlameText(child: Text(
            msg,
            style: GoogleFonts.lato(
              color: const Color(0xFFE9F1FF),
              fontSize: 14,
            ),
          )),
        ],
      ),
    );
  }
}

// ─── Bid card ─────────────────────────────────────────────
class _BidCard extends StatelessWidget {
  final Bid bid;
  const _BidCard({required this.bid});

  Color get _statusColor {
    switch (bid.status) {
      case 'won':
        return const Color(0xFF2ECC71);
      case 'lost':
        return const Color(0xFFE74C3C);
      default:
        return const Color(0xFFFFB347); // pending
    }
  }

  IconData get _statusIcon {
    switch (bid.status) {
      case 'won':
        return Icons.emoji_events_rounded;
      case 'lost':
        return Icons.cancel_rounded;
      default:
        return Icons.hourglass_top_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final marketLine = [
      bid.marketName.toUpperCase(),
      bid.sessionLabel,
      bid.gameTypeLabel,
    ].where((s) => s.isNotEmpty).join(' ');

    final timeStr = _fmtDateTime(bid.bidDate);
    final dateStr = _fmtDate(bid.bidDate);

    return ThemeHoverShadow(child: Container(
      margin: const EdgeInsets.symmetric(vertical: 6),
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
      child: Column(
        children: [
          // ─── Header bar ─────────────────────────────
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              borderRadius:
              const BorderRadius.vertical(top: Radius.circular(11)),
              gradient: const LinearGradient(
                colors: [Color(0xFF1C3459), Color(0xFF25456F)],
              ),
              border: Border(
                bottom: BorderSide(
                  color: AppColors.flameBorder.withValues(alpha: 0.7),
                  width: 1,
                ),
              ),
            ),
            child: FlameText(child: Text(
              marketLine,
              textAlign: TextAlign.center,
              style: GoogleFonts.cinzel(
                color: const Color(0xFFF5F8FF),
                fontSize: 14,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.5,
                shadows: [
                  Shadow(
                    color: const Color(0xFFF5F8FF),
                    blurRadius: 6,
                  ),
                ],
              ),
            )),
          ),

          // ─── Row 1: Game Type | Digit | Point ────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            child: Row(
              children: [
                Expanded(
                  child: _kv('Game Type', bid.gameType),
                ),
                Expanded(
                  child: _kv('Digit', bid.digits),
                ),
                Expanded(
                  child: _kv('Point', _fmtNum(bid.amount)),
                ),
              ],
            ),
          ),

          _divider(),

          // ─── Row 2: Bid Id | Bid Date ────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: _kv('Bid Id', bid.id.length > 12
                      ? bid.id.substring(0, 12)
                      : bid.id),
                ),
                Expanded(
                  flex: 2,
                  child: _kv('Bid Date', dateStr),
                ),
              ],
            ),
          ),

          _divider(),

          // ─── Row 3: Transaction Time ─────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                FlameText(child: Text(
                  'Transaction Time:  ',
                  style: GoogleFonts.lato(
                    color: const Color(0xFFE9F1FF),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                )),
                FlameText(child: Text(
                  timeStr,
                  style: GoogleFonts.lato(
                    color: const Color(0xFFF5F8FF),
                    fontSize: 12.5,
                    fontWeight: FontWeight.bold,
                  ),
                )),
              ],
            ),
          ),

          // ─── Status icon footer ──────────────────────
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFF1C3459),
              borderRadius:
              const BorderRadius.vertical(bottom: Radius.circular(11)),
              border: Border(
                top: BorderSide(
                  color: AppColors.flameBorder.withValues(alpha: 0.5),
                  width: 0.8,
                ),
              ),
            ),
            child: Column(
              children: [
                Icon(_statusIcon, color: _statusColor, size: 26),
                const SizedBox(height: 4),
                FlameText(child: Text(
                  bid.status.toUpperCase(),
                  style: GoogleFonts.lato(
                    color: _statusColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.5,
                  ),
                )),
                if (bid.payout > 0 && bid.status == 'won') ...[
                  const SizedBox(height: 4),
                  FlameText(child: Text(
                    'Won ₹${_fmtNum(bid.payout)}',
                    style: GoogleFonts.lato(
                      color: const Color(0xFF2ECC71),
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  )),
                ],
              ],
            ),
          ),
        ],
      ),
    ));
  }

  Widget _kv(String label, String value) {
    return Column(
      children: [
        FlameText(child: Text(
          label,
          style: GoogleFonts.lato(
            color: const Color(0xFFE9F1FF),
            fontSize: 11,
            fontWeight: FontWeight.w600,
          ),
        )),
        const SizedBox(height: 3),
        FlameText(child: Text(
          value,
          textAlign: TextAlign.center,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: GoogleFonts.lato(
            color: const Color(0xFFF5F8FF),
            fontSize: 13.5,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.4,
          ),
        )),
      ],
    );
  }

  Widget _divider() {
    return Container(
      height: 1,
      margin: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [
          Colors.transparent,
          const Color(0xFFF5F8FF),
          Colors.transparent,
        ]),
      ),
    );
  }

  String _fmtNum(num v) {
    final s = v.toStringAsFixed(0);
    final b = StringBuffer();
    for (int i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) b.write(',');
      b.write(s[i]);
    }
    return b.toString();
  }

  String _fmtDate(DateTime d) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${d.day} ${months[d.month - 1]} ${d.year}';
  }

  String _fmtDateTime(DateTime d) {
    final dd = d.day.toString().padLeft(2, '0');
    final mm = d.month.toString().padLeft(2, '0');
    final yy = d.year;
    int h = d.hour;
    final ampm = h >= 12 ? 'AM' : 'PM';
    // handle 0 as 12 AM
    if (h == 0) {
      h = 12;
    } else if (h > 12) {
      h = h - 12;
    }
    final hh = h.toString().padLeft(2, '0');
    final mi = d.minute.toString().padLeft(2, '0');
    final ss = d.second.toString().padLeft(2, '0');
    return '$dd/$mm/$yy $hh:$mi:$ss $ampm';
  }
}