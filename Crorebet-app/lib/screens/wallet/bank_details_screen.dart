import 'package:easy_localization/easy_localization.dart';
import '../../widgets/flame_border.dart';
import '../../widgets/flame_text.dart';
import '../../widgets/theme_hover_shadow.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/colors.dart';
import '../../services/api_service.dart';
import '../../widgets/cosmic_background.dart';

class BankDetailsScreen extends StatefulWidget {
  const BankDetailsScreen({super.key});

  @override
  State<BankDetailsScreen> createState() => _BankDetailsScreenState();
}

class _BankDetailsScreenState extends State<BankDetailsScreen> {
  final _api = ApiService();

  final _holderCtrl = TextEditingController();
  final _accountCtrl = TextEditingController();
  final _ifscCtrl = TextEditingController();
  final _upiCtrl = TextEditingController();
  final _phonepeCtrl = TextEditingController();
  final _gpayCtrl = TextEditingController();
  final _paytmCtrl = TextEditingController();

  bool _loading = true;
  bool _saving = false;
  String _tab = 'bank';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _holderCtrl.dispose();
    _accountCtrl.dispose();
    _ifscCtrl.dispose();
    _upiCtrl.dispose();
    _phonepeCtrl.dispose();
    _gpayCtrl.dispose();
    _paytmCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (!mounted) return;
    setState(() => _loading = true);
    try {
      final res = await _api.getBankDetails();
      final data = res['data'];
      if (data is Map && data.isNotEmpty) {
        _holderCtrl.text = (data['holderName'] ?? '').toString();
        _accountCtrl.text = (data['accountNo'] ?? '').toString();
        _ifscCtrl.text = (data['ifsc'] ?? '').toString();
        _upiCtrl.text = (data['upi'] ?? '').toString();
        _phonepeCtrl.text = (data['phonepe'] ?? '').toString();
        _gpayCtrl.text = (data['gpay'] ?? '').toString();
        _paytmCtrl.text = (data['paytm'] ?? '').toString();
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _save() async {
    FocusScope.of(context).unfocus();

    if (_tab == 'bank') {
      if (_holderCtrl.text.trim().isEmpty) {
        _snack('enter_holder_name'.tr());
        return;
      }
      if (_accountCtrl.text.trim().length < 8) {
        _snack('enter_valid_account'.tr());
        return;
      }
      if (_ifscCtrl.text.trim().length != 11) {
        _snack('enter_valid_ifsc'.tr());
        return;
      }
    } else if (_tab == 'upi') {
      final upi = _upiCtrl.text.trim();
      if (upi.isEmpty || !upi.contains('@')) {
        _snack('enter_valid_upi'.tr());
        return;
      }
    } else if (_tab == 'phonepe') {
      if (!RegExp(r'^\d{10}$').hasMatch(_phonepeCtrl.text.trim())) {
        _snack('enter_valid_phonepe'.tr());
        return;
      }
    } else if (_tab == 'gpay') {
      if (!RegExp(r'^\d{10}$').hasMatch(_gpayCtrl.text.trim())) {
        _snack('enter_valid_gpay'.tr());
        return;
      }
    } else if (_tab == 'paytm') {
      if (!RegExp(r'^\d{10}$').hasMatch(_paytmCtrl.text.trim())) {
        _snack('enter_valid_paytm'.tr());
        return;
      }
    }

    setState(() => _saving = true);

    final body = {
      'holderName': _holderCtrl.text.trim(),
      'accountNo': _accountCtrl.text.trim(),
      'ifsc': _ifscCtrl.text.trim().toUpperCase(),
      'upi': _upiCtrl.text.trim(),
      'phonepe': _phonepeCtrl.text.trim(),
      'gpay': _gpayCtrl.text.trim(),
      'paytm': _paytmCtrl.text.trim(),
    };

    try {
      final res = await _api.saveBankDetails(body);
      if (!mounted) return;

      if (res['success'] == true) {
        await _load();
        if (!mounted) return;
        _snack('details_saved'.tr());
      } else {
        _snack(res['message']?.toString() ?? 'save_failed'.tr());
      }
    } catch (e) {
      _snack('network_error_try_again'.tr());
    }

    if (mounted) setState(() => _saving = false);
  }

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: const Color(0xFF146043),
      behavior: SnackBarBehavior.floating,
      duration: const Duration(seconds: 3),
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: CosmicBackground(
        child: SafeArea(
          child: Column(
            children: [
              _header(),
              _tabRow(),
              Expanded(
                child: _loading
                    ? const Center(
                  child: CircularProgressIndicator(
                      color: Color(0xFFD6AA41)),
                )
                    : SingleChildScrollView(
                  padding:
                  const EdgeInsets.fromLTRB(14, 6, 14, 24),
                  physics: const BouncingScrollPhysics(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 8),
                      ..._fieldsForTab(),
                      const SizedBox(height: 20),
                      _saveButton(),
                      const SizedBox(height: 16),
                      if (_hasSavedData()) _savedSummary(),
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
          FlameText(
            child: Text(
              'bank_details_upper'.tr(),
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
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 🚀 TAB ROW — yellow gradient chips with amber glow
  // ═══════════════════════════════════════════════════════════
  Widget _tabRow() {
    final tabs = [
      {'key': 'bank', 'label': 'bank_label'.tr()},
      {'key': 'upi', 'label': 'upi_label'.tr()},
      {'key': 'phonepe', 'label': 'phonepe_label'.tr()},
      {'key': 'gpay', 'label': 'gpay_label'.tr()},
      {'key': 'paytm', 'label': 'paytm_label'.tr()},
    ];

    return SizedBox(
      height: 46,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        itemCount: tabs.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final t = tabs[i];
          final selected = t['key'] == _tab;
          return GestureDetector(
            onTap: () => setState(() => _tab = t['key']!),
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(22),
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
                    blurRadius: 6,
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(22),
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
                            borderRadius: BorderRadius.circular(22),
                            border: Border.all(
                              color: const Color(0xFFD6AA41),
                              width: selected ? 1.8 : 1.2,
                            ),
                          ),
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 20, vertical: 8),
                      child: Center(
                        child: Text(
                          t['label']!,
                          style: GoogleFonts.lato(
                            color: const Color(0xFFF5F8FF),
                            fontSize: 13.5,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  List<Widget> _fieldsForTab() {
    switch (_tab) {
      case 'bank':
        return [
          _field(
            label: 'account_holder_name'.tr(),
            hint: 'as_per_bank_records'.tr(),
            controller: _holderCtrl,
          ),
          const SizedBox(height: 14),
          _field(
            label: 'account_number'.tr(),
            hint: 'bank_account_number'.tr(),
            controller: _accountCtrl,
            keyboard: TextInputType.number,
            formatters: [FilteringTextInputFormatter.digitsOnly],
          ),
          const SizedBox(height: 14),
          _field(
            label: 'ifsc_code'.tr(),
            hint: 'ifsc_hint'.tr(),
            controller: _ifscCtrl,
            formatters: [
              FilteringTextInputFormatter.allow(RegExp(r'[A-Za-z0-9]')),
              LengthLimitingTextInputFormatter(11),
              _UpperFormatter(),
            ],
          ),
        ];
      case 'upi':
        return [
          _field(
            label: 'upi_id'.tr(),
            hint: 'upi_id_hint'.tr(),
            controller: _upiCtrl,
          ),
        ];
      case 'phonepe':
        return [
          _field(
            label: 'phonepe_number'.tr(),
            hint: 'phonepe_hint'.tr(),
            controller: _phonepeCtrl,
            keyboard: TextInputType.phone,
            formatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(10),
            ],
          ),
        ];
      case 'gpay':
        return [
          _field(
            label: 'gpay_number'.tr(),
            hint: 'gpay_hint'.tr(),
            controller: _gpayCtrl,
            keyboard: TextInputType.phone,
            formatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(10),
            ],
          ),
        ];
      case 'paytm':
        return [
          _field(
            label: 'paytm_number'.tr(),
            hint: 'paytm_hint'.tr(),
            controller: _paytmCtrl,
            keyboard: TextInputType.phone,
            formatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(10),
            ],
          ),
        ];
      default:
        return [];
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 🚀 FIELD — yellow gradient input with amber glow
  // ═══════════════════════════════════════════════════════════
  Widget _field({
    required String label,
    required String hint,
    required TextEditingController controller,
    TextInputType? keyboard,
    List<TextInputFormatter>? formatters,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 6, bottom: 6),
          child: Text(
            label,
            style: GoogleFonts.lato(
              color: const Color(0xFFF5F8FF).withValues(alpha: 0.75),
              fontSize: 12,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.1,
            ),
          ),
        ),
        Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFD6AA41).withValues(alpha: 0.18),
                blurRadius: 12,
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
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: const Color(0xFFD6AA41),
                          width: 1.4,
                        ),
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                  child: TextField(
                    controller: controller,
                    keyboardType: keyboard,
                    inputFormatters: formatters,
                    style: GoogleFonts.lato(
                      color: const Color(0xFFF5F8FF),
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
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
                      const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 🚀 SAVE BUTTON — glowing amber
  // ═══════════════════════════════════════════════════════════
  Widget _saveButton() {
    return SizedBox(
      height: 52,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFE2BC62).withValues(alpha: 0.55),
              blurRadius: 18,
              spreadRadius: 2,
            ),
            BoxShadow(
              color: const Color(0xFFD6AA41).withValues(alpha: 0.25),
              blurRadius: 28,
              spreadRadius: 4,
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: Stack(
            children: [
              Positioned.fill(
                child: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Color(0xFF176C4B), Color(0xFFD6AA41)],
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
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: const Color(0xFFF5F8FF).withValues(alpha: 0.8),
                        width: 1.4,
                      ),
                    ),
                  ),
                ),
              ),
              Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: _saving ? null : _save,
                  child: Center(
                    child: _saving
                        ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Color(0xFFF5F8FF),
                      ),
                    )
                        : FlameText(
                      child: Text(
                        'save_details_upper'.tr(),
                        style: GoogleFonts.cinzel(
                          color: const Color(0xFFF5F8FF),
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 3,
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
    );
  }

  bool _hasSavedData() {
    return _holderCtrl.text.isNotEmpty ||
        _accountCtrl.text.isNotEmpty ||
        _ifscCtrl.text.isNotEmpty ||
        _upiCtrl.text.isNotEmpty ||
        _phonepeCtrl.text.isNotEmpty ||
        _gpayCtrl.text.isNotEmpty ||
        _paytmCtrl.text.isNotEmpty;
  }

  // ═══════════════════════════════════════════════════════════
  // 🚀 SAVED SUMMARY — green tinted on yellow gradient
  // ═══════════════════════════════════════════════════════════
  Widget _savedSummary() {
    final rows = <MapEntry<String, String>>[];
    if (_holderCtrl.text.isNotEmpty) {
      rows.add(MapEntry('holder_label'.tr(), _holderCtrl.text));
    }
    if (_accountCtrl.text.isNotEmpty) {
      rows.add(MapEntry('account_label'.tr(), _maskAcc(_accountCtrl.text)));
    }
    if (_ifscCtrl.text.isNotEmpty) {
      rows.add(MapEntry('ifsc_label'.tr(), _ifscCtrl.text));
    }
    if (_upiCtrl.text.isNotEmpty) {
      rows.add(MapEntry('upi_label'.tr(), _upiCtrl.text));
    }
    if (_phonepeCtrl.text.isNotEmpty) {
      rows.add(MapEntry('phonepe_label'.tr(), _phonepeCtrl.text));
    }
    if (_gpayCtrl.text.isNotEmpty) {
      rows.add(MapEntry('gpay_label'.tr(), _gpayCtrl.text));
    }
    if (_paytmCtrl.text.isNotEmpty) {
      rows.add(MapEntry('paytm_label'.tr(), _paytmCtrl.text));
    }
    if (rows.isEmpty) return const SizedBox.shrink();

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF15803D).withValues(alpha: 0.22),
            blurRadius: 16,
            spreadRadius: 1,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
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
            // Green tint overlay for success feel
            Positioned.fill(
              child: Container(
                color: const Color(0xFF15803D).withValues(alpha: 0.04),
              ),
            ),
            Positioned.fill(
              child: IgnorePointer(
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: const Color(0xFF15803D).withValues(alpha: 0.7),
                      width: 1.4,
                    ),
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: const Color(0xFF15803D)
                              .withValues(alpha: 0.15),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF15803D)
                                  .withValues(alpha: 0.3),
                              blurRadius: 8,
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.check_circle_rounded,
                          color: Color(0xFF15803D),
                          size: 16,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'saved_details_upper'.tr(),
                        style: GoogleFonts.lato(
                          color: const Color(0xFF15803D),
                          fontSize: 12.5,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ...rows.map((r) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 3),
                    child: Row(
                      children: [
                        SizedBox(
                          width: 80,
                          child: Text(
                            r.key,
                            style: GoogleFonts.lato(
                              color: const Color(0xFFFFF8EB),
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        Expanded(
                          child: Text(
                            r.value,
                            style: GoogleFonts.lato(
                              color: const Color(0xFFF5F8FF),
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ),
                  )),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _maskAcc(String acc) {
    if (acc.length <= 4) return acc;
    return '${'•' * (acc.length - 4)}${acc.substring(acc.length - 4)}';
  }
}

class _UpperFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
      TextEditingValue oldValue, TextEditingValue newValue) {
    return newValue.copyWith(text: newValue.text.toUpperCase());
  }
}