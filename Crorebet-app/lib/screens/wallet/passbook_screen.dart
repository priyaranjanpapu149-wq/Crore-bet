import 'package:easy_localization/easy_localization.dart';
import '../../widgets/flame_border.dart';
import '../../widgets/flame_text.dart';
import '../../widgets/theme_hover_shadow.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/colors.dart';
import '../../models/transaction.dart';
import '../../services/api_service.dart';
import '../../widgets/cosmic_background.dart';

class PassbookScreen extends StatefulWidget {
  const PassbookScreen({super.key});
  @override
  State<PassbookScreen> createState() => _PassbookScreenState();
}

class _PassbookScreenState extends State<PassbookScreen> {
  final _api = ApiService();
  bool _loading = true;
  String? _error;
  List<WalletTxn> _rows = [];

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
      final res = await _api.getPassbook();
      final data = res['data'] ?? res['rows'];
      List<dynamic> raw = [];
      if (data is List) {
        raw = data;
      } else if (data is Map) {
        final items = data['items'] ?? data['transactions'] ??
            data['rows'] ?? data['list'];
        if (items is List) raw = items;
      }
      final rows = raw.whereType<Map>()
          .map((e) => WalletTxn.fromJson(Map<String, dynamic>.from(e)))
          .toList();
      if (!mounted) return;
      _rows = rows;
    } catch (e) {
      if (!mounted) return;
      _error = 'could_not_load_passbook'.tr();
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
      child: Row(children: [
        IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              color: Color(0xFFF5F8FF), size: 22),
          onPressed: () => Navigator.pop(context),
        ),
        Expanded(
          child: FlameText(child: Text(
            'passbook_upper'.tr(),
            style: GoogleFonts.cinzel(
              color: const Color(0xFFF5F8FF),
              fontSize: 22,
              fontWeight: FontWeight.bold,
              letterSpacing: 3,
              shadows: [Shadow(
                color: const Color(0xFFF5F8FF), blurRadius: 10,
              )],
            ),
          )),
        ),
        IconButton(
          icon: const Icon(Icons.refresh_rounded,
              color: Color(0xFFF5F8FF), size: 22),
          onPressed: _load,
        ),
      ]),
    );
  }

  Widget _body() {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.gold),
      );
    }
    if (_error != null) return _empty(_error!);
    if (_rows.isEmpty) return _empty('no_transactions_yet'.tr());
    return RefreshIndicator(
      color: const Color(0xFFF5F8FF),
      backgroundColor: const Color(0xFF0A4A35),
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(12, 4, 12, 20),
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount: _rows.length,
        itemBuilder: (_, i) => _TxnCard(txn: _rows[i]),
      ),
    );
  }

  Widget _empty(String message) {
    return Center(child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.menu_book_rounded,
            color: Color(0xFFE5D6B7), size: 60),
        const SizedBox(height: 14),
        FlameText(child: Text(message, style: GoogleFonts.lato(
          color: const Color(0xFFFFF8EB), fontSize: 14,
        ))),
      ],
    ));
  }
}

class _TxnCard extends StatelessWidget {
  final WalletTxn txn;
  const _TxnCard({required this.txn});

  @override
  Widget build(BuildContext context) {
    final color = txn.isCredit
        ? const Color(0xFF2ECC71) : const Color(0xFFE74C3C);
    return ThemeHoverShadow(child: Container(
      margin: const EdgeInsets.symmetric(vertical: 6),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF0A4A35).withValues(alpha: 0.92),
            const Color(0xFF0A4A35).withValues(alpha: 0.94),
          ],
        ),
        border: FlameBorder(width: 1.3),
        boxShadow: [BoxShadow(
          color: const Color(0xFFFF762E).withValues(alpha: 0.12),
          blurRadius: 10,
        )],
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Expanded(child: FlameText(child: Text(_fmtDateTime(txn.createdAt),
                style: GoogleFonts.lato(
                  color: const Color(0xFFFFF8EB),
                  fontSize: 12.5, fontWeight: FontWeight.w600,
                ),
              ))),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  color: color.withValues(alpha: 0.15),
                  border: Border.all(color: color, width: 1),
                ),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.check_circle_rounded, color: color, size: 14),
                  const SizedBox(width: 4),
                  FlameText(child: Text(
                    'success_status'.tr(),
                    style: GoogleFonts.lato(
                      color: color, fontSize: 11.5,
                      fontWeight: FontWeight.bold, letterSpacing: 0.3,
                    ),
                  )),
                ]),
              ),
            ]),
            const SizedBox(height: 10),
            FlameText(child: Text(txn.signedAmount, style: GoogleFonts.cinzel(
              color: color, fontSize: 24,
              fontWeight: FontWeight.bold, letterSpacing: 1,
              shadows: [Shadow(
                color: color.withValues(alpha: 0.4), blurRadius: 10,
              )],
            ))),
            const SizedBox(height: 12),
            Container(height: 1, decoration: BoxDecoration(
              gradient: LinearGradient(colors: [
                Colors.transparent,
                const Color(0xFFF5F8FF),
                Colors.transparent,
              ]),
            )),
            const SizedBox(height: 10),
            FlameText(child: Text(
              'request_details'.tr(),
              style: GoogleFonts.lato(
                color: const Color(0xFFF3E7D0),
                fontSize: 11.5, fontWeight: FontWeight.w600, letterSpacing: 0.5,
              ),
            )),
            const SizedBox(height: 3),
            FlameText(child: Text(txn.remark.isEmpty ? '—' : txn.remark,
              style: GoogleFonts.lato(
                color: const Color(0xFFF5F8FF), fontSize: 13.5,
                fontWeight: FontWeight.w700, height: 1.4,
              ),
            )),
            if (txn.balanceAfter != null) ...[
              const SizedBox(height: 6),
              FlameText(child: Text(
                'balance_colon_amount'.tr(namedArgs: {
                  'amount': _fmtNum(txn.balanceAfter!),
                }),
                style: GoogleFonts.lato(
                  color: const Color(0xFFE5D6B7),
                  fontSize: 11, fontWeight: FontWeight.w500,
                ),
              )),
            ],
          ],
        ),
      ),
    ));
  }

  String _fmtNum(num value) {
    final s = value.toStringAsFixed(0);
    final b = StringBuffer();
    for (int i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) b.write(',');
      b.write(s[i]);
    }
    return b.toString();
  }

  String _fmtDateTime(DateTime d) {
    final dd = d.day.toString().padLeft(2, '0');
    final mm = d.month.toString().padLeft(2, '0');
    final yy = d.year;
    int h = d.hour;
    final ampm = h >= 12 ? 'PM' : 'AM';
    if (h == 0) {
      h = 12;
    } else if (h > 12) {
      h -= 12;
    }
    final hh = h.toString().padLeft(2, '0');
    final mi = d.minute.toString().padLeft(2, '0');
    final ss = d.second.toString().padLeft(2, '0');
    return '$dd/$mm/$yy $hh:$mi:$ss $ampm';
  }
}