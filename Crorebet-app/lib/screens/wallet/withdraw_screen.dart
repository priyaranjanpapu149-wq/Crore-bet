import 'package:dio/dio.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../widgets/flame_border.dart';
import '../../widgets/flame_text.dart';
import '../../widgets/theme_hover_shadow.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/settings_provider.dart';
import '../../services/api_service.dart';
import '../../utils/whatsapp_helper.dart';
import '../../widgets/cosmic_background.dart';

class WithdrawScreen extends StatefulWidget {
  const WithdrawScreen({super.key});

  @override
  State<WithdrawScreen> createState() => _WithdrawScreenState();
}

class _WithdrawScreenState extends State<WithdrawScreen> {
  final _api = ApiService();
  bool _submitting = false;

  static const int _minWithdraw = 500;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _showTerms());
  }

  // ═══════════════════════════════════════════════════════════
  // T&C DIALOG
  // ═══════════════════════════════════════════════════════════
  void _showTerms() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(20),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF5EA8F5).withValues(alpha: 0.35),
                blurRadius: 30,
                spreadRadius: 3,
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Stack(
              children: [
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
                // Shine ray
                Positioned(
                  top: -60,
                  left: -80,
                  child: IgnorePointer(
                    child: Transform.rotate(
                      angle: 0.55,
                      child: Container(
                        width: 340,
                        height: 60,
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
                Positioned.fill(
                  child: IgnorePointer(
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: const Color(0xFF5EA8F5),
                          width: 1.8,
                        ),
                      ),
                    ),
                  ),
                ),
                Positioned.fill(
                  child: IgnorePointer(
                    child: Padding(
                      padding: const EdgeInsets.all(3.5),
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(17),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.55),
                            width: 1,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 22, 20, 18),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      FlameText(
                        child: Text(
                          'terms_and_conditions_upper'.tr(),
                          textAlign: TextAlign.center,
                          style: GoogleFonts.cinzel(
                            color: const Color(0xFFF5F8FF),
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 2,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Container(
                        height: 1,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(colors: [
                            Colors.transparent,
                            const Color(0xFFF5F8FF).withValues(alpha: 0.4),
                            Colors.transparent,
                          ]),
                        ),
                      ),
                      const SizedBox(height: 16),
                      _bullet('withdraw_terms_1'.tr(namedArgs: {
                        'amount': _minWithdraw.toString(),
                      })),
                      _bullet('withdraw_terms_2'.tr()),
                      _bullet('withdraw_terms_3'.tr()),
                      _bullet('withdraw_terms_4'.tr()),
                      _bullet('withdraw_terms_5'.tr()),
                      _bullet('withdraw_terms_6'.tr()),
                      const SizedBox(height: 22),
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(context),
                          style: OutlinedButton.styleFrom(
                            backgroundColor: const Color(0xFF284D7E),
                            side: const BorderSide(
                                color: Color(0xFF5EA8F5), width: 1.6),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            shadowColor: const Color(0xFF70B6FF),
                            elevation: 2,
                          ),
                          child: Text(
                            'accept'.tr(),
                            style: GoogleFonts.lato(
                              color: const Color(0xFFF5F8FF),
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 3,
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

  Widget _bullet(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 7, right: 8),
            child: Container(
              width: 6,
              height: 6,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: Color(0xFF5EA8F5),
              ),
            ),
          ),
          Expanded(
            child: Text(
              text,
              style: GoogleFonts.lato(
                color: const Color(0xFFF5F8FF).withValues(alpha: 0.85),
                fontSize: 12.5,
                height: 1.5,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─── Dio error parser ──────────────────────────────────
  String _extractError(dynamic e) {
    if (e is DioException) {
      final data = e.response?.data;
      if (data is Map && data['message'] is String) {
        final msg = data['message'] as String;
        if (msg.isNotEmpty) return msg;
      }
      switch (e.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.receiveTimeout:
        case DioExceptionType.sendTimeout:
          return 'connection_timeout'.tr();
        case DioExceptionType.connectionError:
          return 'cannot_reach_server'.tr();
        default:
          return 'something_went_wrong'.tr();
      }
    }
    return 'something_went_wrong'.tr();
  }

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: const Color(0xFF25456F),
      behavior: SnackBarBehavior.floating,
      duration: const Duration(seconds: 3),
    ));
  }

  // ═══════════════════════════════════════════════════════════
  // ERROR DIALOG
  // ═══════════════════════════════════════════════════════════
  Future<void> _showErrorDialog(String message) {
    if (!mounted) return Future.value();
    return showDialog<void>(
      context: context,
      barrierDismissible: true,
      builder: (_) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 30),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFE74C3C).withValues(alpha: 0.30),
                blurRadius: 26,
                spreadRadius: 2,
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Stack(
              children: [
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
                      ),
                    ),
                  ),
                ),
                Positioned.fill(
                  child: IgnorePointer(
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: const Color(0xFFE74C3C),
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
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: const Color(0xFFE74C3C).withValues(alpha: 0.15),
                          border: Border.all(
                            color: const Color(0xFFE74C3C),
                            width: 1.8,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFE74C3C)
                                  .withValues(alpha: 0.35),
                              blurRadius: 16,
                            ),
                          ],
                        ),
                        child: const Icon(Icons.error_outline_rounded,
                            color: Color(0xFFE74C3C), size: 44),
                      ),
                      const SizedBox(height: 18),
                      FlameText(
                        child: Text(
                          'cannot_submit_request'.tr(),
                          textAlign: TextAlign.center,
                          style: GoogleFonts.cinzel(
                            color: const Color(0xFFF5F8FF),
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.5,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        message,
                        textAlign: TextAlign.center,
                        style: GoogleFonts.lato(
                          color: const Color(0xFFE9F1FF),
                          fontSize: 13,
                          height: 1.5,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 22),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(context),
                          style: OutlinedButton.styleFrom(
                            backgroundColor: const Color(0xFF284D7E),
                            side: const BorderSide(
                                color: Color(0xFF5EA8F5), width: 1.6),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          child: Text(
                            'ok'.tr(),
                            style: GoogleFonts.cinzel(
                              color: const Color(0xFFF5F8FF),
                              fontSize: 15,
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

  // ─── SUPPORT TAP ───────────────────────────────────────
  Future<void> _callSupport() async {
    final auth = context.read<AuthProvider>();
    final settings = context.read<SettingsProvider>();
    final number = settings.whatsappNumber;

    if (number.isEmpty) {
      _snack('support_number_not_available'.tr());
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

  // ═══════════════════════════════════════════════════════════
  // WITHDRAW BOTTOM SHEET
  // ═══════════════════════════════════════════════════════════
  Future<void> _openWithdrawSheet() async {
    final auth = context.read<AuthProvider>();
    final wallet = (auth.user?['wallet'] ?? 0) as num;

    final amountCtrl = TextEditingController();
    String method = 'bank';

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => SafeArea(
          child: Container(
            margin: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF5EA8F5).withValues(alpha: 0.35),
                  blurRadius: 24,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: Stack(
                children: [
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
                  // Shine ray
                  Positioned(
                    top: -30,
                    left: -40,
                    child: IgnorePointer(
                      child: Transform.rotate(
                        angle: 0.5,
                        child: Container(
                          width: 280,
                          height: 22,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                Colors.white.withValues(alpha: 0.0),
                                Colors.white.withValues(alpha: 0.5),
                                Colors.white.withValues(alpha: 0.0),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  Positioned.fill(
                    child: IgnorePointer(
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: const Color(0xFF5EA8F5),
                            width: 1.8,
                          ),
                        ),
                      ),
                    ),
                  ),
                  Padding(
                    padding: EdgeInsets.only(
                      bottom: MediaQuery.of(ctx).viewInsets.bottom,
                    ),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Center(
                            child: Container(
                              width: 42,
                              height: 4,
                              decoration: BoxDecoration(
                                color: const Color(0xFFF5F8FF)
                                    .withValues(alpha: 0.4),
                                borderRadius: BorderRadius.circular(2),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          FlameText(
                            child: Text(
                              'send_withdraw_request'.tr(),
                              textAlign: TextAlign.center,
                              style: GoogleFonts.cinzel(
                                color: const Color(0xFFF5F8FF),
                                fontSize: 15,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 2,
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'balance_colon_amount'.tr(namedArgs: {
                              'amount': _fmt(wallet),
                            }),
                            textAlign: TextAlign.center,
                            style: GoogleFonts.lato(
                              color: const Color(0xFFE9F1FF),
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 18),

                          // Amount field
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 4),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(12),
                              color: const Color(0xFF14284A),
                              border: Border.all(
                                  color: const Color(0xFF5EA8F5), width: 1.4),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF5EA8F5)
                                      .withValues(alpha: 0.20),
                                  blurRadius: 12,
                                ),
                              ],
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    gradient: const LinearGradient(
                                      colors: [
                                        Color(0xFF14284A),
                                        Color(0xFF1C3459)
                                      ],
                                    ),
                                    border: Border.all(
                                      color: const Color(0xFF5EA8F5),
                                      width: 1,
                                    ),
                                  ),
                                  child: Text(
                                    '₹',
                                    style: GoogleFonts.lato(
                                      color: const Color(0xFFF5F8FF),
                                      fontSize: 15,
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: TextField(
                                    controller: amountCtrl,
                                    keyboardType: TextInputType.number,
                                    inputFormatters: [
                                      FilteringTextInputFormatter.digitsOnly
                                    ],
                                    autofocus: true,
                                    style: GoogleFonts.lato(
                                      color: const Color(0xFFF5F8FF),
                                      fontSize: 17,
                                      fontWeight: FontWeight.w900,
                                    ),
                                    decoration: InputDecoration(
                                      hintText: 'enter_amount'.tr(),
                                      hintStyle: GoogleFonts.lato(
                                        color: const Color(0xFFB6C9E2),
                                        fontSize: 15,
                                      ),
                                      border: InputBorder.none,
                                      isDense: true,
                                      contentPadding:
                                      const EdgeInsets.symmetric(
                                          vertical: 16),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 18),

                          Text(
                            'select_withdrawal_method'.tr(),
                            style: GoogleFonts.lato(
                              color: const Color(0xFFF5F8FF),
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 10),

                          Row(
                            children: [
                              Expanded(
                                child: _radioTile(
                                  label: 'bank_account'.tr(),
                                  value: 'bank',
                                  group: method,
                                  onChanged: (v) => setSheet(() => method = v),
                                ),
                              ),
                              Expanded(
                                child: _radioTile(
                                  label: 'upi_googlepay'.tr(),
                                  value: 'upi',
                                  group: method,
                                  onChanged: (v) => setSheet(() => method = v),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 22),

                          Row(
                            children: [
                              Expanded(
                                child: SizedBox(
                                  height: 52,
                                  child: OutlinedButton(
                                    onPressed: () => Navigator.pop(ctx),
                                    style: OutlinedButton.styleFrom(
                                      backgroundColor: Colors.transparent,
                                      side: const BorderSide(
                                          color: Color(0xFF5EA8F5), width: 1.6),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                    ),
                                    child: Text(
                                      'cancel_upper'.tr(),
                                      style: GoogleFonts.lato(
                                        color: const Color(0xFFF5F8FF),
                                        fontSize: 14,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: 2,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: SizedBox(
                                  height: 52,
                                  child: OutlinedButton(
                                    onPressed: () async {
                                      final amt =
                                          int.tryParse(amountCtrl.text.trim()) ??
                                              0;

                                      if (amt < _minWithdraw) {
                                        await _showErrorDialog(
                                          'min_withdrawal_is'.tr(namedArgs: {
                                            'amount': _minWithdraw.toString(),
                                          }),
                                        );
                                        return;
                                      }
                                      if (amt > wallet) {
                                        await _showErrorDialog(
                                          'insufficient_balance_you_have'.tr(
                                            namedArgs: {
                                              'amount': _fmt(wallet)
                                            },
                                          ),
                                        );
                                        return;
                                      }

                                      if (!ctx.mounted) return;
                                      Navigator.pop(ctx);
                                      await _submitRequest(amt, method);
                                    },
                                    style: OutlinedButton.styleFrom(
                                      backgroundColor: const Color(0xFF284D7E),
                                      side: const BorderSide(
                                          color: Color(0xFF5EA8F5), width: 1.6),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      shadowColor: const Color(0xFF70B6FF),
                                      elevation: 2,
                                    ),
                                    child: Text(
                                      'submit_upper'.tr(),
                                      style: GoogleFonts.lato(
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
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _radioTile({
    required String label,
    required String value,
    required String group,
    required ValueChanged<String> onChanged,
  }) {
    final selected = value == group;
    return GestureDetector(
      onTap: () => onChanged(value),
      behavior: HitTestBehavior.opaque,
      child: Row(
        children: [
          Container(
            width: 20,
            height: 20,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: const Color(0xFF5EA8F5),
                width: selected ? 5 : 1.4,
              ),
              boxShadow: selected
                  ? [
                BoxShadow(
                  color: const Color(0xFF70B6FF).withValues(alpha: 0.5),
                  blurRadius: 8,
                ),
              ]
                  : [],
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: GoogleFonts.lato(
                color: const Color(0xFFF5F8FF),
                fontSize: 12.5,
                fontWeight: selected ? FontWeight.w900 : FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _submitRequest(int amount, String method) async {
    if (!mounted) return;
    setState(() => _submitting = true);

    try {
      final res = await _api.submitWithdrawalRequest(
        amount: amount,
        method: method,
      );

      if (!mounted) return;

      if (res['success'] == true) {
        context.read<AuthProvider>().refreshUser();
        if (!mounted) return;
        setState(() => _submitting = false);
        await _showSuccess(amount);
        if (!mounted) return;
        Navigator.pop(context);
        return;
      }

      setState(() => _submitting = false);
      await _showErrorDialog(
        res['message']?.toString() ?? 'could_not_submit_request'.tr(),
      );
      return;
    } catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      await _showErrorDialog(_extractError(e));
      return;
    }
  }

  Future<void> _showSuccess(int amount) {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 30),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF5EA8F5).withValues(alpha: 0.35),
                blurRadius: 28,
                spreadRadius: 3,
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Stack(
              children: [
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
                      ),
                    ),
                  ),
                ),
                Positioned.fill(
                  child: IgnorePointer(
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: const Color(0xFF5EA8F5),
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
                        'withdrawal_request_submitted'.tr(),
                        textAlign: TextAlign.center,
                        style: GoogleFonts.lato(
                          color: const Color(0xFFF5F8FF),
                          fontSize: 15.5,
                          fontWeight: FontWeight.w900,
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'withdrawal_success_msg'.tr(namedArgs: {
                          'amount': amount.toString(),
                        }),
                        textAlign: TextAlign.center,
                        style: GoogleFonts.lato(
                          color: const Color(0xFFE9F1FF),
                          fontSize: 12.5,
                          height: 1.5,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 22),
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(context),
                          style: OutlinedButton.styleFrom(
                            backgroundColor: const Color(0xFF284D7E),
                            side: const BorderSide(
                                color: Color(0xFF5EA8F5), width: 1.6),
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
              _header(context),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(16, 6, 16, 24),
                  child: Column(
                    children: [
                      _balanceCard(wallet),
                      const SizedBox(height: 16),
                      _contactRow(),
                      const SizedBox(height: 16),
                      _termsBox(),
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

  // ═══════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════
  Widget _header(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 10, 12, 12),
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
                'withdraw_fund_upper'.tr(),
                style: GoogleFonts.cinzel(
                  color: const Color(0xFFF5F8FF),
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 3,
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
  // 🚀 BALANCE CARD — shine ray + amber glow only
  // ═══════════════════════════════════════════════════════════
  Widget _balanceCard(num wallet) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF5EA8F5).withValues(alpha: 0.22),
            blurRadius: 26,
            spreadRadius: 2,
          ),
          BoxShadow(
            color: const Color(0xFF70B6FF).withValues(alpha: 0.35),
            blurRadius: 12,
            spreadRadius: 1,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: Stack(
          children: [
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
            // Shine ray
            Positioned(
              top: -50,
              left: -60,
              child: IgnorePointer(
                child: Transform.rotate(
                  angle: 0.55,
                  child: Container(
                    width: 320,
                    height: 60,
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
            Positioned.fill(
              child: IgnorePointer(
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(
                      color: const Color(0xFF5EA8F5),
                      width: 1.8,
                    ),
                  ),
                ),
              ),
            ),
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
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 22),
              child: Column(
                children: [
                  Text(
                    'available_balance'.tr(),
                    style: GoogleFonts.lato(
                      color: const Color(0xFFF5F8FF).withValues(alpha: 0.65),
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      const Icon(Icons.currency_rupee_rounded,
                          color: Color(0xFFF5F8FF), size: 26),
                      const SizedBox(width: 4),
                      Text(
                        _fmt(wallet),
                        style: GoogleFonts.cinzel(
                          color: const Color(0xFFF5F8FF),
                          fontSize: 36,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.5,
                          shadows: [
                            Shadow(
                              color: Colors.white.withValues(alpha: 0.9),
                              blurRadius: 4,
                              offset: const Offset(0, 1),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  GestureDetector(
                    onTap: _submitting ? null : _openWithdrawSheet,
                    child: Opacity(
                      opacity: _submitting ? 0.55 : 1.0,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 26, vertical: 12),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(30),
                          gradient: const LinearGradient(
                            colors: [Color(0xFF284D7E), Color(0xFF5EA8F5)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          border: Border.all(
                            color: const Color(0xFFF5F8FF).withValues(alpha: 0.8),
                            width: 1.2,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF70B6FF)
                                  .withValues(alpha: 0.55),
                              blurRadius: 16,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (_submitting)
                              const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Color(0xFFF5F8FF),
                                ),
                              )
                            else
                              const Icon(
                                Icons.south_east_rounded,
                                color: Color(0xFFF5F8FF),
                                size: 18,
                              ),
                            const SizedBox(width: 8),
                            Text(
                              _submitting
                                  ? 'please_wait'.tr()
                                  : 'withdraw_fund'.tr(),
                              style: GoogleFonts.lato(
                                color: const Color(0xFFF5F8FF),
                                fontSize: 15,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.5,
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
          ],
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 🚀 CONTACT ROW — WhatsApp support number
  // ═══════════════════════════════════════════════════════════
  Widget _contactRow() {
    final settings = context.watch<SettingsProvider>();
    final hasNumber = settings.hasWhatsapp;

    return GestureDetector(
      onTap: hasNumber ? _callSupport : null,
      child: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF5EA8F5).withValues(alpha: 0.18),
              blurRadius: 18,
              spreadRadius: 1,
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
                      colors: [Color(0xFF14284A), Color(0xFF284D7E)],
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
                        color: const Color(0xFF5EA8F5),
                        width: 1.4,
                      ),
                    ),
                  ),
                ),
              ),
              Padding(
                padding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                child: Column(
                  children: [
                    Text(
                      'withdraw_queries_whatsapp_call'.tr(),
                      textAlign: TextAlign.center,
                      style: GoogleFonts.lato(
                        color: const Color(0xFFE9F1FF),
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      hasNumber
                          ? settings.whatsappDisplay
                          : 'support_not_available'.tr(),
                      style: GoogleFonts.lato(
                        color: hasNumber
                            ? const Color(0xFF15803D)
                            : const Color(0xFFB6C9E2),
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.2,
                        shadows: hasNumber
                            ? [
                          Shadow(
                            color: const Color(0xFF25D366)
                                .withValues(alpha: 0.4),
                            blurRadius: 10,
                          ),
                        ]
                            : null,
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

  // ═══════════════════════════════════════════════════════════
  // 🚀 TERMS BOX
  // ═══════════════════════════════════════════════════════════
  Widget _termsBox() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF5EA8F5).withValues(alpha: 0.18),
            blurRadius: 18,
            spreadRadius: 1,
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
                    colors: [Color(0xFF14284A), Color(0xFF284D7E)],
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
                      color: const Color(0xFF5EA8F5),
                      width: 1.4,
                    ),
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 18, 18, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'withdraw_query_call_whatsapp'.tr(),
                    style: GoogleFonts.lato(
                      color: const Color(0xFFF5F8FF),
                      fontSize: 13,
                      fontWeight: FontWeight.w900,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'withdraw_hours'.tr(),
                    style: GoogleFonts.lato(
                      color: const Color(0xFFE9F1FF),
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 14),
                  Container(
                    height: 1,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(colors: [
                        Colors.transparent,
                        const Color(0xFFF5F8FF).withValues(alpha: 0.4),
                        Colors.transparent,
                      ]),
                    ),
                  ),
                  const SizedBox(height: 14),
                  _bullet('withdraw_terms_1'.tr(namedArgs: {
                    'amount': _minWithdraw.toString(),
                  })),
                  _bullet('withdraw_terms_2'.tr()),
                  _bullet('withdraw_terms_3'.tr()),
                  _bullet('withdraw_terms_4'.tr()),
                  _bullet('withdraw_terms_5'.tr()),
                  _bullet('withdraw_terms_6'.tr()),
                ],
              ),
            ),
          ],
        ),
      ),
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