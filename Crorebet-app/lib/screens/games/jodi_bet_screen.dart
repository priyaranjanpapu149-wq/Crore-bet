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

class JodiBetScreen extends StatefulWidget {
  final Market market;
  final String gameType;
  final String gameLabel;
  const JodiBetScreen({
    super.key,
    required this.market,
    required this.gameType,
    required this.gameLabel,
  });

  @override
  State<JodiBetScreen> createState() => _JodiBetScreenState();
}

class _JodiBetScreenState extends State<JodiBetScreen> {
  final _api = ApiService();

  int _filterDigit = 0;

  final Map<int, TextEditingController> _controllers = {
    for (int i = 0; i < 10; i++) i: TextEditingController(),
  };

  final Map<String, int> _cartAmounts = {};

  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    for (final c in _controllers.values) {
      c.addListener(() {
        if (mounted) setState(() {});
      });
    }
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  String _pairFor(int index) => '$_filterDigit$index';

  Map<String, int> _effectiveAmounts() {
    final m = Map<String, int>.from(_cartAmounts);

    _controllers.forEach((index, ctrl) {
      final amt = int.tryParse(ctrl.text.trim()) ?? 0;
      final key = '$_filterDigit$index';
      if (amt > 0) {
        m[key] = amt;
      } else {
        m.remove(key);
      }
    });
    return m;
  }

  int get _totalAmount =>
      _effectiveAmounts().values.fold(0, (s, v) => s + v);

  int get _totalBids => _effectiveAmounts().length;

  int _cartCountForGroup(int digit) {
    int n = 0;
    _cartAmounts.forEach((key, amt) {
      if (amt > 0 && key.length == 2 && key[0] == '$digit') {
        if (digit != _filterDigit) n++;
      }
    });
    if (digit == _filterDigit) {
      for (final c in _controllers.values) {
        if ((int.tryParse(c.text.trim()) ?? 0) > 0) n++;
      }
    }
    return n;
  }

  List<Map<String, dynamic>> _collectBids() {
    return _effectiveAmounts()
        .entries
        .map((e) => {'digits': e.key, 'amount': e.value})
        .toList();
  }

  void _switchFilter(int digit) {
    if (digit == _filterDigit) return;

    _controllers.forEach((index, ctrl) {
      final amt = int.tryParse(ctrl.text.trim()) ?? 0;
      final key = '$_filterDigit$index';
      if (amt > 0) {
        _cartAmounts[key] = amt;
      } else {
        _cartAmounts.remove(key);
      }
    });

    for (final c in _controllers.values) {
      c.clear();
    }

    _filterDigit = digit;

    _controllers.forEach((index, ctrl) {
      final key = '$_filterDigit$index';
      final amt = _cartAmounts[key] ?? 0;
      if (amt > 0) {
        ctrl.text = amt.toString();
      }
    });

    setState(() {});
  }

  // ═══════════════════════════════════════════════════════════
  // 🚀 SUBMIT — ONE batch request (jodi is sessionless)
  // ═══════════════════════════════════════════════════════════
  Future<void> _onSubmit() async {
    final bids = _collectBids();
    if (bids.isEmpty) {
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
    try {
      final res = await _api.submitBids(
        marketId: widget.market.id,
        gameType: widget.gameType,
        session: '', // backend normalizes to null for jodi
        bids: bids,
      );
      if (!mounted) return;

      if (res['success'] == true) {
        // 🚀 FAST: use returned wallet, no extra network call
        final newWallet = res['wallet'];
        if (newWallet is num) {
          context.read<AuthProvider>().updateWalletLocally(newWallet);
        }
        await _showSuccess();
        if (!mounted) return;
        Navigator.pop(context);
      } else {
        final failures = res['failures'];
        if (failures is List && failures.isNotEmpty) {
          final first = failures.first;
          _snack('failed_on'.tr(namedArgs: {
            'digit': first['digit'].toString(),
            'message': first['message'].toString(),
          }));
        } else {
          _snack('submit_failed_try_again'.tr());
        }
      }
    } catch (e) {
      _snack('network_error_try_again'.tr());
    }
    if (!mounted) return;
    setState(() => _submitting = false);
  }

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Row(
        children: [
          const Icon(Icons.error_outline_rounded,
              color: Colors.white, size: 20),
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
      backgroundColor: const Color(0xFFE74C3C),
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
    return Scaffold(
      backgroundColor: Colors.transparent,
      resizeToAvoidBottomInset: true,
      body: CosmicBackground(
        child: SafeArea(
          child: Column(
            children: [
              _header(),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(14, 6, 14, 24),
                  physics: const BouncingScrollPhysics(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _sessionBanner(),
                      const SizedBox(height: 12),
                      _filterRow(),
                      const SizedBox(height: 14),
                      _jodiGrid(),
                      const SizedBox(height: 18),
                    ],
                  ),
                ),
              ),
              _bottomBar(),
            ],
          ),
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════
  Widget _header() {
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
                '${widget.market.name.toUpperCase()} ( ${widget.gameLabel} )',
                style: GoogleFonts.cinzel(
                  color: const Color(0xFFF5F8FF),
                  fontSize: 17,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.5,
                  shadows: [
                    Shadow(
                      color: Colors.white.withValues(alpha: 0.7),
                      blurRadius: 6,
                      offset: const Offset(0, 1),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════
  // SESSION BANNER
  // ═══════════════════════════════════════════════════════════
  Widget _sessionBanner() {
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

    final openOk = widget.market.openSessionOpen;
    if (!openOk) {
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
          border: Border.all(color: const Color(0xFFB45309), width: 1.4),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFB45309).withValues(alpha: 0.25),
              blurRadius: 10,
            ),
          ],
        ),
        child: Row(
          children: [
            const Icon(Icons.info_outline_rounded,
                color: Color(0xFFB45309), size: 18),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'open_result_declared_jodi'.tr(),
                style: GoogleFonts.lato(
                  color: const Color(0xFFB45309),
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),
      );
    }

    return const SizedBox.shrink();
  }

  // ═══════════════════════════════════════════════════════════
  // FILTER ROW — digit chips with amber glow
  // ═══════════════════════════════════════════════════════════
  Widget _filterRow() {
    return SizedBox(
      height: 52,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        itemCount: 10,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final selected = i == _filterDigit;
          final count = _cartCountForGroup(i);

          return GestureDetector(
            onTap: () => _switchFilter(i),
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: selected
                        ? [
                      BoxShadow(
                        color: const Color(0xFFE2BC62)
                            .withValues(alpha: 0.55),
                        blurRadius: 14,
                        spreadRadius: 1,
                      ),
                    ]
                        : [
                      BoxShadow(
                        color: const Color(0xFFD6AA41)
                            .withValues(alpha: 0.18),
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
                            decoration: BoxDecoration(
                              gradient: selected
                                  ? const LinearGradient(
                                colors: [
                                  Color(0xFF176C4B),
                                  Color(0xFFD6AA41),
                                ],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              )
                                  : const LinearGradient(
                                colors: [
                                  Color(0xFF084A35),
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
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: const Color(0xFFD6AA41),
                                  width: selected ? 1.8 : 1.2,
                                ),
                              ),
                            ),
                          ),
                        ),
                        Center(
                          child: Text(
                            '$i',
                            style: GoogleFonts.cinzel(
                              color: const Color(0xFFF5F8FF),
                              fontSize: 20,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                if (count > 0)
                  Positioned(
                    top: -4,
                    right: -4,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE74C3C),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.white, width: 1),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFFE74C3C)
                                .withValues(alpha: 0.5),
                            blurRadius: 6,
                          ),
                        ],
                      ),
                      child: Text(
                        '$count',
                        style: GoogleFonts.lato(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _jodiGrid() {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      childAspectRatio: 2.9,
      children: List.generate(10, (i) => _jodiRow(i)),
    );
  }

  Widget _jodiRow(int index) {
    final ctrl = _controllers[index]!;
    final pair = _pairFor(index);
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFD6AA41).withValues(alpha: 0.18),
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
            Row(
              children: [
                // Left: pair label
                Container(
                  width: 56,
                  height: double.infinity,
                  decoration: const BoxDecoration(
                    borderRadius:
                    BorderRadius.horizontal(left: Radius.circular(9)),
                    gradient: LinearGradient(
                      colors: [Color(0xFF176C4B), Color(0xFFD6AA41)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      pair,
                      style: GoogleFonts.cinzel(
                        color: const Color(0xFFF5F8FF),
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: TextField(
                    controller: ctrl,
                    keyboardType: TextInputType.number,
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly
                    ],
                    textAlign: TextAlign.center,
                    style: GoogleFonts.lato(
                      color: const Color(0xFFF5F8FF),
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                    ),
                    decoration: InputDecoration(
                      hintText: 'amount'.tr(),
                      hintStyle: GoogleFonts.lato(
                        color: const Color(0xFFE5D6B7),
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                      border: InputBorder.none,
                      isDense: true,
                      contentPadding:
                      const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
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
    final bids = _collectBids();
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
                                  child: _headerCell('jodi'.tr()))),
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
                            ...bids.map((b) => _bidRow(
                              b['digits'].toString(),
                              b['amount'].toString(),
                              'JODI',
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
                                'total_bids'.tr(), _totalBids.toString()),
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

  String _fmtNum(num v) {
    final s = v.toStringAsFixed(0);
    final b = StringBuffer();
    for (int i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) b.write(',');
      b.write(s[i]);
    }
    return b.toString();
  }
}