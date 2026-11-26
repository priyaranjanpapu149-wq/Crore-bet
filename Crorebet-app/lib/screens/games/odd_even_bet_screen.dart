import '../../utils/bid_cart.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../widgets/flame_border.dart';
import '../../widgets/flame_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/colors.dart';
import '../../models/market.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../widgets/cosmic_background.dart';

class OddEvenBetScreen extends StatefulWidget {
  final Market market;
  final String gameType; // 'odd_even'
  final String gameLabel; // 'Odd Even'
  const OddEvenBetScreen({
    super.key,
    required this.market,
    required this.gameType,
    required this.gameLabel,
  });

  @override
  State<OddEvenBetScreen> createState() => _OddEvenBetScreenState();
}

class _OddEvenBetScreenState extends State<OddEvenBetScreen> {
  final _api = ApiService();
  final _amountCtrl = TextEditingController();

  String _pick = 'odd';
  String _session = 'open';
  bool _submitting = false;

  final List<Map<String, dynamic>> _cart = [];

  static const List<String> _oddDigits = ['1', '3', '5', '7', '9'];
  static const List<String> _evenDigits = ['0', '2', '4', '6', '8'];

  @override
  void initState() {
    super.initState();
    _amountCtrl.addListener(_refresh);

    _session = widget.market.openSessionOpen ? 'open' : 'close';
  }

  void _refresh() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    super.dispose();
  }

  int get _totalAmount {
    int sum = 0;
    for (final b in _cart) {
      sum += (b['amount'] as int);
    }
    return sum;
  }

  bool get _canAddBid {
    final a = int.tryParse(_amountCtrl.text.trim()) ?? 0;
    return a > 0;
  }

  void _addBid() {
    final amount = int.tryParse(_amountCtrl.text.trim()) ?? 0;
    if (amount <= 0) {
      _snack('enter_valid_amount'.tr());
      return;
    }

    final digits = _pick == 'odd' ? _oddDigits : _evenDigits;

    setState(() {
      for (final d in digits) {
        _cart.add({
          'digits': d,
          'amount': amount,
          'session': _session,
        });
      }
      _amountCtrl.clear();
    });
  }

  void _removeBid(int index) {
    setState(() => _cart.removeAt(index));
  }

  // ═══════════════════════════════════════════════════════════
  // 🚀 SUBMIT — batched by session (max 2 HTTP calls)
  // ═══════════════════════════════════════════════════════════
  Future<void> _onSubmit() async {
    if (_cart.isEmpty) {
      _snack('add_at_least_one_bid'.tr());
      return;
    }

    final auth = context.read<AuthProvider>();
    final wallet = (auth.user?['wallet'] ?? 0) as num;
    if (_totalAmount > wallet) {
      _snack('insufficient_balance'.tr());
      return;
    }

    final confirmed = await _showConfirmation(wallet);
    if (confirmed != true || !mounted) return;

    setState(() => _submitting = true);

    // ─── Group cart items by session ────────────────────────
    final bySession = <String, List<Map<String, dynamic>>>{};
    for (final b in _cart) {
      final s = (b['session'] as String);
      bySession.putIfAbsent(s, () => []).add({
        'digits': b['digits'],
        'amount': b['amount'],
      });
    }

    final failures = <Map<String, dynamic>>[];
    final completedGroups = <String>{};
    num? newWallet;

    // ─── One batch request per session (max 2) ──────────────
    for (final entry in bySession.entries) {
      final session = entry.key;
      final bids = entry.value;

      try {
        final res = await _api.submitBids(
          marketId: widget.market.id,
          gameType: 'single', // original behavior: spread as single bets
          session: session,
          bids: bids,
        );

        if (res['success'] == true) {
          completedGroups.add(entry.key);
          final w = res['wallet'];
          if (w is num) newWallet = w;
        } else {
          final fs = (res['failures'] as List?) ?? [];
          if (fs.isEmpty) {
            failures.add({
              'digit': bids.first['digits'].toString(),
              'message': res['message'] ?? 'Failed',
            });
          } else {
            for (final f in fs) {
              failures.add({
                'digit': f['digit'],
                'message': f['message'],
              });
            }
          }
        }
      } catch (e) {
        failures.add({
          'digit': bids.first['digits'].toString(),
          'message': e.toString(),
        });
      }
    }

    if (!mounted) return;

    if (failures.isEmpty) {
      // 🚀 FAST: update wallet locally, no extra network call
      if (newWallet != null) {
        context.read<AuthProvider>().updateWalletLocally(newWallet);
      }
      await _showSuccess();
      if (!mounted) return;
      Navigator.pop(context);
    } else {
      setState(() {
        _submitting = false;
        removePlacedBidGroups(_cart, completedGroups);
      });
      if (newWallet != null) context.read<AuthProvider>().updateWalletLocally(newWallet);
      _snack((completedGroups.isNotEmpty ? 'some_bids_placed'.tr() + ' ' : '') + 'failed_on'.tr(namedArgs: {
        'digit': failures.first['digit'].toString(),
        'message': failures.first['message'].toString(),
      }));
    }
  }

  void _snack(String msg, {bool isError = true}) {
    if (!mounted) return;
    final bg = isError ? const Color(0xFFE74C3C) : const Color(0xFF2ECC71);
    final icon = isError
        ? Icons.error_outline_rounded
        : Icons.check_circle_outline_rounded;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Row(
        children: [
          Icon(icon, color: Colors.white, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              msg,
              style: GoogleFonts.lato(
                color: Colors.white,
                fontSize: 13.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
      backgroundColor: bg,
      behavior: SnackBarBehavior.floating,
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 20),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: BorderSide(
          color: Colors.white.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      duration: const Duration(seconds: 3),
      elevation: 8,
    ));
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final wallet = auth.user?['wallet'] ?? 0;

    return Scaffold(
      backgroundColor: Colors.transparent,
      resizeToAvoidBottomInset: true,
      body: CosmicBackground(
        child: SafeArea(
          child: Column(
            children: [
              _header(wallet),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(14, 6, 14, 20),
                  physics: const BouncingScrollPhysics(),
                  child: Column(
                    children: [
                      _sessionBanner(),
                      _sessionRow(),
                      const SizedBox(height: 16),
                      _oddEvenRow(),
                      const SizedBox(height: 20),
                      _formRow(
                        label: 'enter_points'.tr(),
                        hint: 'enter_amount'.tr(),
                        controller: _amountCtrl,
                      ),
                      const SizedBox(height: 14),
                      _addBidButton(),
                      const SizedBox(height: 18),
                      _tableHeader(),
                      if (_cart.isEmpty) _emptyCart() else _cartList(),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ),
              if (_cart.isNotEmpty) _bottomBar(),
            ],
          ),
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════
  Widget _header(num wallet) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 10, 12, 10),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded,
                color: Color(0xFFF5F8FF), size: 22),
            onPressed: () => Navigator.pop(context),
          ),
          Expanded(
            child: FlameText(
              child: Text(
                '${widget.market.name.toUpperCase()}, ${widget.gameLabel.toUpperCase()}',
                style: GoogleFonts.cinzel(
                  color: const Color(0xFFF5F8FF),
                  fontSize: 15,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.2,
                  shadows: [
                    Shadow(
                      color: Colors.white.withValues(alpha: 0.7),
                      blurRadius: 6,
                      offset: const Offset(0, 1),
                    ),
                  ],
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ),
          // 🚀 Wallet chip — amber glow only
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              gradient: const LinearGradient(
                colors: [Color(0xFF084A35), Color(0xFF176C4B)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              border: Border.all(color: const Color(0xFFD6AA41), width: 1.3),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFE2BC62).withValues(alpha: 0.4),
                  blurRadius: 10,
                ),
              ],
            ),
            child: Row(
              children: [
                const Icon(Icons.account_balance_wallet,
                    color: Color(0xFFF5F8FF), size: 13),
                const SizedBox(width: 5),
                Text(
                  _fmt(wallet),
                  style: GoogleFonts.lato(
                    color: const Color(0xFFF5F8FF),
                    fontSize: 12.5,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _sessionBanner() {
    final openOk = widget.market.openSessionOpen;
    final closeOk = widget.market.closeSessionOpen;

    if (widget.market.isClosed) {
      return Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          gradient: const LinearGradient(
            colors: [Color(0xFF084A35), Color(0xFF176C4B)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          border: Border.all(color: const Color(0xFFE74C3C), width: 1.4),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFE74C3C).withValues(alpha: 0.30),
              blurRadius: 10,
            ),
          ],
        ),
        child: Row(
          children: [
            const Icon(Icons.do_not_disturb_on_rounded,
                color: Color(0xFFE74C3C), size: 18),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'market_closed'.tr(),
                style: GoogleFonts.lato(
                  color: const Color(0xFFE74C3C),
                  fontSize: 12.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),
      );
    }

    final both = openOk && closeOk;
    final onlyClose = !openOk && closeOk;

    if (both) return const SizedBox.shrink();

    final label = onlyClose
        ? 'only_close_session'.tr()
        : 'only_open_session_playable'.tr();

    final color = onlyClose
        ? const Color(0xFFB45309)
        : const Color(0xFF15803D);
    final icon = onlyClose
        ? Icons.info_outline_rounded
        : Icons.check_circle_outline_rounded;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        gradient: const LinearGradient(
          colors: [Color(0xFF084A35), Color(0xFF176C4B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(color: color.withValues(alpha: 0.7), width: 1.4),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.20),
            blurRadius: 10,
          ),
        ],
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              label,
              style: GoogleFonts.lato(
                color: color,
                fontSize: 12,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sessionRow() {
    final openOk = widget.market.openSessionOpen;
    final closeOk = widget.market.closeSessionOpen;

    return Row(
      children: [
        Expanded(
          flex: 2,
          child: Text(
            'select_game_type'.tr(),
            style: GoogleFonts.lato(
              color: const Color(0xFFF5F8FF),
              fontSize: 13.5,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        Expanded(
          flex: 3,
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFD6AA41).withValues(alpha: 0.18),
                  blurRadius: 10,
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: Stack(
                children: [
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
                  Positioned.fill(
                    child: IgnorePointer(
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(
                            color: const Color(0xFFD6AA41),
                            width: 1.3,
                          ),
                        ),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 2),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _session,
                        isExpanded: true,
                        dropdownColor: const Color(0xFF084A35),
                        icon: const Icon(Icons.keyboard_arrow_down_rounded,
                            color: Color(0xFFF5F8FF), size: 20),
                        style: GoogleFonts.lato(
                          color: const Color(0xFFF5F8FF),
                          fontSize: 13.5,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.2,
                        ),
                        alignment: Alignment.center,
                        items: [
                          if (openOk)
                            DropdownMenuItem(
                                value: 'open',
                                alignment: Alignment.center,
                                child: Text('open'.tr())),
                          if (closeOk)
                            DropdownMenuItem(
                                value: 'close',
                                alignment: Alignment.center,
                                child: Text('close'.tr())),
                        ],
                        onChanged: (v) {
                          if (v != null) setState(() => _session = v);
                        },
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _oddEvenRow() {
    return Row(
      children: [
        Expanded(child: _radio('odd'.tr(), 'odd')),
        Expanded(child: _radio('even'.tr(), 'even')),
      ],
    );
  }

  Widget _radio(String label, String value) {
    final selected = _pick == value;
    return GestureDetector(
      onTap: () => setState(() => _pick = value),
      behavior: HitTestBehavior.opaque,
      child: Row(
        children: [
          Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: const Color(0xFFF5F8FF),
                width: selected ? 7 : 1.8,
              ),
              boxShadow: selected
                  ? [
                BoxShadow(
                  color: const Color(0xFFE2BC62).withValues(alpha: 0.5),
                  blurRadius: 8,
                ),
              ]
                  : [],
            ),
          ),
          const SizedBox(width: 12),
          Text(
            label,
            style: GoogleFonts.lato(
              color: const Color(0xFFF5F8FF),
              fontSize: 16,
              fontWeight: selected ? FontWeight.w900 : FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _formRow({
    required String label,
    required String hint,
    required TextEditingController controller,
  }) {
    return Row(
      children: [
        Expanded(
          flex: 2,
          child: Text(
            label,
            style: GoogleFonts.lato(
              color: const Color(0xFFF5F8FF),
              fontSize: 14,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        Expanded(
          flex: 3,
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFD6AA41).withValues(alpha: 0.18),
                  blurRadius: 10,
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: Stack(
                children: [
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
                  Positioned.fill(
                    child: IgnorePointer(
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(
                            color: const Color(0xFFD6AA41),
                            width: 1.3,
                          ),
                        ),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 4),
                    child: TextField(
                      controller: controller,
                      keyboardType: TextInputType.number,
                      textAlign: TextAlign.center,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      style: GoogleFonts.lato(
                        color: const Color(0xFFF5F8FF),
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1,
                      ),
                      decoration: InputDecoration(
                        hintText: hint,
                        hintStyle: GoogleFonts.lato(
                          color: const Color(0xFFE5D6B7),
                          fontSize: 13.5,
                          fontWeight: FontWeight.w500,
                        ),
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding:
                        const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _addBidButton() {
    return Row(
      children: [
        const Expanded(flex: 2, child: SizedBox()),
        Expanded(
          flex: 3,
          child: SizedBox(
            height: 48,
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(10),
                boxShadow: _canAddBid
                    ? [
                  BoxShadow(
                    color: const Color(0xFFE2BC62)
                        .withValues(alpha: 0.5),
                    blurRadius: 14,
                    spreadRadius: 1,
                  ),
                ]
                    : [
                  BoxShadow(
                    color: const Color(0xFFD6AA41)
                        .withValues(alpha: 0.15),
                    blurRadius: 8,
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Stack(
                  children: [
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
                    Positioned.fill(
                      child: IgnorePointer(
                        child: Container(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: const Color(0xFFD6AA41),
                              width: 1.5,
                            ),
                          ),
                        ),
                      ),
                    ),
                    Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: _canAddBid ? _addBid : null,
                        child: Center(
                          child: Text(
                            'add_bid'.tr(),
                            style: GoogleFonts.cinzel(
                              color: const Color(0xFFF5F8FF),
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 2,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _tableHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: Color(0xFFD6AA41),
            width: 1.4,
          ),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: Text('digit'.tr(),
                textAlign: TextAlign.center,
                style: GoogleFonts.lato(
                  color: const Color(0xFFF5F8FF),
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.5,
                )),
          ),
          Container(width: 1, height: 20, color: const Color(0xFFD6AA41)),
          Expanded(
            flex: 2,
            child: Text('amount'.tr(),
                textAlign: TextAlign.center,
                style: GoogleFonts.lato(
                  color: const Color(0xFFF5F8FF),
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.5,
                )),
          ),
          Container(width: 1, height: 20, color: const Color(0xFFD6AA41)),
          Expanded(
            flex: 3,
            child: Text('type'.tr(),
                textAlign: TextAlign.center,
                style: GoogleFonts.lato(
                  color: const Color(0xFFF5F8FF),
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.5,
                )),
          ),
          const SizedBox(width: 30),
        ],
      ),
    );
  }

  Widget _emptyCart() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40),
      child: Center(
        child: Text(
          'no_bids_added'.tr(),
          style: GoogleFonts.lato(
            color: const Color(0xFFE5D6B7),
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Widget _cartList() {
    return Column(
      children: List.generate(_cart.length, (i) {
        final b = _cart[i];
        return Container(
          margin: const EdgeInsets.symmetric(vertical: 5),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFD6AA41).withValues(alpha: 0.20),
                blurRadius: 8,
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Stack(
              children: [
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
                Positioned.fill(
                  child: IgnorePointer(
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: const Color(0xFFD6AA41),
                          width: 1.2,
                        ),
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 6, vertical: 14),
                  child: Row(
                    children: [
                      Expanded(
                        flex: 2,
                        child: Text(
                          b['digits'].toString(),
                          textAlign: TextAlign.center,
                          style: GoogleFonts.cinzel(
                            color: const Color(0xFFF5F8FF),
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.2,
                          ),
                        ),
                      ),
                      Expanded(
                        flex: 2,
                        child: Text(
                          '₹${b['amount']}',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.lato(
                            color: const Color(0xFFF5F8FF),
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      Expanded(
                        flex: 3,
                        child: Text(
                          'SINGLE · ${(b['session'] as String).toUpperCase()}',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.lato(
                            color: const Color(0xFFF5F8FF),
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.6,
                          ),
                        ),
                      ),
                      SizedBox(
                        width: 26,
                        child: GestureDetector(
                          onTap: () => _removeBid(i),
                          child: const Icon(
                            Icons.close_rounded,
                            color: Color(0xFFE74C3C),
                            size: 18,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      }),
    );
  }

  Widget _bottomBar() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0A4A35).withValues(alpha: 0.98),
        border: const Border(
          top: BorderSide(
            color: Color(0xFFD6AA41),
            width: 1.4,
          ),
        ),
        // 🚀 AMBER GLOW ONLY — no black shadow
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFD6AA41).withValues(alpha: 0.30),
            blurRadius: 22,
            offset: const Offset(0, -6),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        bottom: true,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          child: Row(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'total_amount'.tr(),
                    style: GoogleFonts.lato(
                      color: const Color(0xFFFFF8EB),
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '₹ $_totalAmount',
                    style: GoogleFonts.cinzel(
                      color: const Color(0xFFF5F8FF),
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1,
                      shadows: [
                        Shadow(
                          color: Colors.white.withValues(alpha: 0.8),
                          blurRadius: 4,
                          offset: const Offset(0, 1),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const Spacer(),
              SizedBox(
                height: 50,
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFE2BC62)
                            .withValues(alpha: 0.5),
                        blurRadius: 14,
                        spreadRadius: 1,
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Stack(
                      children: [
                        Positioned.fill(
                          child: Container(
                            decoration: const BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  Color(0xFF176C4B),
                                  Color(0xFFD6AA41),
                                ],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                            ),
                          ),
                        ),
                        Positioned.fill(
                          child: IgnorePointer(
                            child: Container(
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: const Color(0xFFF5F8FF)
                                      .withValues(alpha: 0.8),
                                  width: 1.4,
                                ),
                              ),
                            ),
                          ),
                        ),
                        Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: _submitting ? null : _onSubmit,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 26),
                              child: Center(
                                child: _submitting
                                    ? const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Color(0xFFF5F8FF),
                                  ),
                                )
                                    : Text(
                                  'submit_bid'.tr(),
                                  style: GoogleFonts.cinzel(
                                    color: const Color(0xFFF5F8FF),
                                    fontSize: 15,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 2,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
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

  Future<bool?> _showConfirmation(num wallet) {
    final after = wallet - _totalAmount;
    return showDialog<bool>(
      context: context,
      barrierDismissible: true,
      builder: (_) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding:
        const EdgeInsets.symmetric(horizontal: 20, vertical: 30),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFD6AA41).withValues(alpha: 0.35),
                blurRadius: 28,
                spreadRadius: 3,
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Stack(
              children: [
                Positioned.fill(
                  child: Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Color(0xFF084A35),
                          Color(0xFF0A4A35),
                          Color(0xFF176C4B),
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                    ),
                  ),
                ),
                Positioned.fill(
                  child: IgnorePointer(
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: const Color(0xFFD6AA41),
                          width: 1.8,
                        ),
                      ),
                    ),
                  ),
                ),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          colors: [Color(0xFF176C4B), Color(0xFFD6AA41)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                      child: Text(
                        '${widget.market.name.toUpperCase()} - ${_today()}',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.cinzel(
                          color: const Color(0xFFF5F8FF),
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.2,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 6),
                      child: Row(
                        children: [
                          Expanded(
                              child: Center(
                                  child: _headerCell('digit'.tr()))),
                          Expanded(
                              child: Center(
                                  child: _headerCell('points'.tr()))),
                          Expanded(
                              child: Center(
                                  child: _headerCell('type'.tr()))),
                        ],
                      ),
                    ),
                    const SizedBox(height: 4),
                    Flexible(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Column(
                          children: [
                            ..._cart.map((b) => _bidRow(
                              b['digits'].toString(),
                              b['amount'].toString(),
                              'SINGLE · ${(b['session'] as String).toUpperCase()}',
                            )),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Row(
                        children: [
                          Expanded(
                            child: _statLine(
                                'total_bids'.tr(), _cart.length.toString()),
                          ),
                          Expanded(
                            child: _statLine(
                                'total_bid_amount'.tr(), '₹ $_totalAmount'),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 6),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Row(
                        children: [
                          Expanded(
                            child: _statLine(
                                'wallet_before'.tr(), '₹ ${_fmtNum(wallet)}'),
                          ),
                          Expanded(
                            child: _statLine(
                                'wallet_after'.tr(), '₹ ${_fmtNum(after)}'),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text(
                        'note_bid_cancelled'.tr(),
                        textAlign: TextAlign.center,
                        style: GoogleFonts.lato(
                          color: const Color(0xFFE5D6B7),
                          fontSize: 11,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                      child: Row(
                        children: [
                          Expanded(
                            child: SizedBox(
                              height: 48,
                              child: OutlinedButton(
                                onPressed: () =>
                                    Navigator.pop(context, false),
                                style: OutlinedButton.styleFrom(
                                  side: const BorderSide(
                                      color: Color(0xFFD6AA41), width: 1.6),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                ),
                                child: Text(
                                  'cancel'.tr(),
                                  style: GoogleFonts.lato(
                                    color: const Color(0xFFF5F8FF),
                                    fontSize: 14.5,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: SizedBox(
                              height: 48,
                              child: OutlinedButton(
                                onPressed: () => Navigator.pop(context, true),
                                style: OutlinedButton.styleFrom(
                                  backgroundColor: const Color(0xFF176C4B),
                                  side: const BorderSide(
                                      color: Color(0xFFD6AA41), width: 1.6),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  shadowColor: const Color(0xFFE2BC62),
                                  elevation: 2,
                                ),
                                child: Text(
                                  'submit'.tr(),
                                  style: GoogleFonts.lato(
                                    color: const Color(0xFFF5F8FF),
                                    fontSize: 14.5,
                                    fontWeight: FontWeight.w900,
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
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _headerCell(String t) => Text(
    t,
    style: GoogleFonts.lato(
      color: const Color(0xFFF5F8FF),
      fontSize: 13.5,
      fontWeight: FontWeight.w900,
      letterSpacing: 0.6,
    ),
  );

  Widget _bidRow(String digit, String points, String type) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        gradient: const LinearGradient(
          colors: [Color(0xFF084A35), Color(0xFF176C4B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(
          color: const Color(0xFFD6AA41),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Center(
              child: Text(
                digit,
                style: GoogleFonts.cinzel(
                  color: const Color(0xFFF5F8FF),
                  fontSize: 15,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ),
          Expanded(
            child: Center(
              child: Text(
                points,
                style: GoogleFonts.lato(
                  color: const Color(0xFFF5F8FF),
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
          Expanded(
            child: Center(
              child: Text(
                type,
                style: GoogleFonts.lato(
                  color: const Color(0xFFFFF8EB),
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _statLine(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.lato(
            color: const Color(0xFFFFF8EB),
            fontSize: 11,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: GoogleFonts.lato(
            color: const Color(0xFFF5F8FF),
            fontSize: 14,
            fontWeight: FontWeight.w900,
          ),
        ),
      ],
    );
  }

  Future<void> _showSuccess() {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 30),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFD6AA41).withValues(alpha: 0.35),
                blurRadius: 28,
                spreadRadius: 3,
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Stack(
              children: [
                Positioned.fill(
                  child: Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Color(0xFF084A35),
                          Color(0xFF0A4A35),
                          Color(0xFF176C4B),
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                    ),
                  ),
                ),
                Positioned.fill(
                  child: IgnorePointer(
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: const Color(0xFFD6AA41),
                          width: 1.8,
                        ),
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 88,
                        height: 88,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: Color(0xFF2ECC71),
                          boxShadow: [
                            BoxShadow(
                              color: Color(0x662ECC71),
                              blurRadius: 20,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                        child: const Icon(Icons.check_rounded,
                            color: Colors.white, size: 56),
                      ),
                      const SizedBox(height: 20),
                      Text(
                        'bid_placed_success'.tr(),
                        textAlign: TextAlign.center,
                        style: GoogleFonts.lato(
                          color: const Color(0xFFF5F8FF),
                          fontSize: 15.5,
                          fontWeight: FontWeight.w900,
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 22),
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(context),
                          style: OutlinedButton.styleFrom(
                            backgroundColor: const Color(0xFF176C4B),
                            side: const BorderSide(
                                color: Color(0xFFD6AA41), width: 1.6),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          child: Text(
                            'ok'.tr(),
                            style: GoogleFonts.cinzel(
                              color: const Color(0xFFF5F8FF),
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 2,
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

  String _today() {
    final d = DateTime.now();
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${d.day}-${months[d.month - 1]}-${d.year}';
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

  String _fmtNum(num v) => _fmt(v);
}