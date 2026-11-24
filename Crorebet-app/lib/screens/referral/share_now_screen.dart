import '../../widgets/flame_border.dart';
import '../../widgets/flame_text.dart';
import '../../widgets/theme_hover_shadow.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/colors.dart';
import '../../services/api_service.dart';
import '../../widgets/cosmic_background.dart';

class ShareNowScreen extends StatefulWidget {
  const ShareNowScreen({super.key});

  @override
  State<ShareNowScreen> createState() => _ShareNowScreenState();
}

class _ShareNowScreenState extends State<ShareNowScreen> {
  final _api = ApiService();

  bool _loading = true;
  bool _notConfigured = false;
  String? _error;

  String _code = '';
  String _message = '';
  String _link = '';
  num _totalReferred = 0;
  num _totalEarned = 0;
  List<Map<String, dynamic>> _referred = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
      _notConfigured = false;
    });

    Map<String, dynamic>? payload;
    bool endpointMissing = false;

    try {
      final res = await _api.getReferral();
      debugPrint('[ShareNow] referral raw: $res');
      payload = _extractReferralData(res);
    } on Exception catch (e) {
      debugPrint('[ShareNow] referral failed: $e');
      endpointMissing = true;
    }

    if (payload == null) {
      try {
        final res = await _api.getSession();
        final user = res['data']?['user'] ?? res['data'];
        if (user is Map) {
          payload = Map<String, dynamic>.from(user);
        }
      } catch (e) {
        debugPrint('[ShareNow] session failed: $e');
      }
    }

    if (payload != null) {
      _applyPayload(payload);
    }

    if (_code.isEmpty && endpointMissing) {
      _notConfigured = true;
    } else if (_code.isEmpty) {
      _notConfigured = true;
    }

    if (!mounted) return;
    setState(() => _loading = false);
  }

  Map<String, dynamic>? _extractReferralData(Map<String, dynamic> res) {
    final d = res['data'];
    if (d is Map) {
      final nested = d['referral'];
      if (nested is Map) return Map<String, dynamic>.from(nested);
      return Map<String, dynamic>.from(d);
    }
    if (res['code'] != null ||
        res['referralCode'] != null ||
        res['referCode'] != null) {
      return Map<String, dynamic>.from(res);
    }
    return null;
  }

  void _applyPayload(Map<String, dynamic> p) {
    _code = (p['code'] ??
        p['myCode'] ??
        p['referralCode'] ??
        p['referCode'] ??
        p['referral_code'] ??
        '')
        .toString();
    _message = (p['message'] ??
        p['referralMessage'] ??
        p['shareMessage'] ??
        p['text'] ??
        '')
        .toString();
    _link = (p['link'] ??
        p['referralLink'] ??
        p['shareLink'] ??
        (_code.isNotEmpty
            ? 'https://magicbossapp.com/register?ref=$_code'
            : ''))
        .toString();
    _totalReferred = _num(p['totalReferred'] ??
        p['referredCount'] ??
        p['totalReferrals'] ??
        p['totalCount'] ??
        p['referred'] ??
        0);
    _totalEarned = _num(p['totalEarned'] ??
        p['earnings'] ??
        p['commission'] ??
        p['earned'] ??
        0);

    final referredRaw = p['referredUsers'] ??
        p['referredList'] ??
        p['users'] ??
        p['list'] ??
        p['referrals'] ??
        (p['referred'] is List ? p['referred'] : null);

    if (referredRaw is List) {
      _referred = referredRaw
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
      if (_totalReferred == 0) _totalReferred = _referred.length;
    } else {
      _referred = [];
    }
  }

  num _num(dynamic v) {
    if (v is num) return v;
    if (v is String) return num.tryParse(v) ?? 0;
    return 0;
  }

  Future<void> _copy(String text, [String? msg]) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg ?? 'copied'.tr()),
      backgroundColor: const Color(0xFF25456F),
      behavior: SnackBarBehavior.floating,
    ));
  }

  String get _shareText {
    if (_message.isNotEmpty) return _message;
    return 'share_msg_short'.tr(namedArgs: {
      'code': _code,
      'link': _link,
    });
  }

  Future<void> _shareWhatsApp() async {
    final msg = _shareText;
    final uri = Uri.parse('https://wa.me/?text=${Uri.encodeComponent(msg)}');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      _copy(msg, 'copied_paste_whatsapp_telegram'.tr());
    }
  }

  Future<void> _shareTelegram() async {
    final telegramText = 'share_msg_telegram'.tr(namedArgs: {'code': _code});
    final uri = Uri.parse(
      'https://t.me/share/url?url=${Uri.encodeComponent(_link)}'
          '&text=${Uri.encodeComponent(telegramText)}',
    );
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      _copy(_link, 'copied_paste_whatsapp_telegram'.tr());
    }
  }

  Future<void> _shareGeneric() async {
    _copy(_shareText, 'copied_paste_whatsapp_telegram'.tr());
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

  Widget _body() {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.gold),
      );
    }
    if (_notConfigured) {
      return _comingSoonView();
    }
    if (_error != null) {
      return _errorView();
    }
    return RefreshIndicator(
      color: const Color(0xFFF5F8FF),
      backgroundColor: const Color(0xFF25456F),
      onRefresh: _load,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(14, 6, 14, 24),
        child: Column(
          children: [
            _heroCard(),
            const SizedBox(height: 14),
            _shareButtons(),
            const SizedBox(height: 20),
            _statsRow(),
            const SizedBox(height: 20),
            if (_referred.isNotEmpty) _referredList(),
            const SizedBox(height: 20),
            _howItWorks(),
          ],
        ),
      ),
    );
  }

  Widget _header(BuildContext context) {
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
            child: FlameText(child: Text(
              'refer_and_earn'.tr(),
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
                color: Color(0xFFF5F8FF), size: 22),
            onPressed: _load,
          ),
        ],
      ),
    );
  }

  Widget _comingSoonView() {
    return Padding(
      padding: const EdgeInsets.all(30),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFF1C3459),
              border: FlameBorder(width: 1.6),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFF5F8FF),
                  blurRadius: 24,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: const Icon(Icons.card_giftcard_rounded,
                color: Color(0xFFF5F8FF), size: 60),
          ),
          const SizedBox(height: 24),
          FlameText(child: Text(
            'refer_and_earn'.tr(),
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
          const SizedBox(height: 12),
          Text(
            'referral_coming_soon'.tr(),
            textAlign: TextAlign.center,
            style: GoogleFonts.lato(
              color: const Color(0xFFE9F1FF),
              fontSize: 13.5,
              height: 1.6,
            ),
          ),
          const SizedBox(height: 28),
          OutlinedButton(
            onPressed: _load,
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: AppColors.flameBorder, width: 1.4),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
            ),
            child: Text(
              'retry_upper'.tr(),
              style: GoogleFonts.lato(
                color: const Color(0xFFF5F8FF),
                fontSize: 14,
                fontWeight: FontWeight.bold,
                letterSpacing: 2.5,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _errorView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(30),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline_rounded,
                color: Color(0xFFB6C9E2), size: 50),
            const SizedBox(height: 12),
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: GoogleFonts.lato(
                  color: const Color(0xFFE9F1FF), fontSize: 14),
            ),
            const SizedBox(height: 20),
            OutlinedButton(
              onPressed: _load,
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppColors.flameBorder, width: 1.3),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                padding:
                const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
              child: Text(
                'retry_upper'.tr(),
                style: GoogleFonts.lato(
                  color: const Color(0xFFF5F8FF),
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _heroCard() {
    return ThemeHoverShadow(child: Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 22),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: const LinearGradient(
          colors: [Color(0xFF1C3459), Color(0xFF1C3459)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: FlameBorder(width: 1.4),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFF5F8FF),
            blurRadius: 16,
          ),
        ],
      ),
      child: Column(
        children: [
          Text(
            'your_referral_code'.tr(),
            style: GoogleFonts.lato(
              color: const Color(0xFFE9F1FF),
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 10),
          GestureDetector(
            onTap: () => _copy(_code, 'code_copied'.tr()),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(10),
                color: const Color(0xFF25456F),
                border: FlameBorder(width: 1.3),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  FlameText(child: Text(
                    _code,
                    style: GoogleFonts.cinzel(
                      color: const Color(0xFFF5F8FF),
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 4,
                      shadows: [
                        Shadow(
                          color: const Color(0xFFF5F8FF),
                          blurRadius: 12,
                        ),
                      ],
                    ),
                  )),
                  const SizedBox(width: 12),
                  const Icon(Icons.copy_rounded,
                      color: Color(0xFFF5F8FF), size: 20),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            _message.isNotEmpty ? _message : 'share_code_earn_text'.tr(),
            textAlign: TextAlign.center,
            style: GoogleFonts.lato(
              color: const Color(0xFFE9F1FF),
              fontSize: 12,
              height: 1.4,
            ),
          ),
        ],
      ),
    ));
  }

  Widget _shareButtons() {
    return Row(
      children: [
        Expanded(
          child: _shareBtn(
            icon: Icons.chat_rounded,
            label: 'whatsapp'.tr(),
            color: const Color(0xFF25D366),
            onTap: _shareWhatsApp,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _shareBtn(
            icon: Icons.send_rounded,
            label: 'telegram'.tr(),
            color: const Color(0xFF2AABEE),
            onTap: _shareTelegram,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _shareBtn(
            icon: Icons.share_rounded,
            label: 'share_now'.tr(),
            color: const Color(0xFFFF4ECD),
            onTap: _shareGeneric,
          ),
        ),
      ],
    );
  }

  Widget _shareBtn({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: ThemeHoverShadow(child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          gradient: const LinearGradient(
            colors: [Color(0xFF1C3459), Color(0xFF1C3459)],
          ),
          border: FlameBorder(width: 1.2),
        ),
        child: Column(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF25456F),
                border: Border.all(color: color, width: 1.3),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: GoogleFonts.lato(
                color: const Color(0xFFF5F8FF),
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      )),
    );
  }

  Widget _statsRow() {
    return Row(
      children: [
        Expanded(
          child: _statCard(
            icon: Icons.people_alt_rounded,
            label: 'total_referred'.tr(),
            value: _fmtNum(_totalReferred),
            color: const Color(0xFF7CE0FF),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _statCard(
            icon: Icons.currency_rupee_rounded,
            label: 'total_earned'.tr(),
            value: '₹ ${_fmtNum(_totalEarned)}',
            color: const Color(0xFF2ECC71),
          ),
        ),
      ],
    );
  }

  Widget _statCard({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return ThemeHoverShadow(child: Container(
      padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        gradient: const LinearGradient(
          colors: [Color(0xFF1C3459), Color(0xFF1C3459)],
        ),
        border: FlameBorder(width: 1.2),
      ),
      child: Column(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFF25456F),
              border: Border.all(color: color, width: 1.3),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: 10),
          Text(
            label,
            style: GoogleFonts.lato(
              color: const Color(0xFFE9F1FF),
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 4),
          FlameText(child: Text(
            value,
            style: GoogleFonts.cinzel(
              color: const Color(0xFFF5F8FF),
              fontSize: 20,
              fontWeight: FontWeight.bold,
              letterSpacing: 1,
              shadows: [
                Shadow(
                  color: const Color(0xFFF5F8FF),
                  blurRadius: 8,
                ),
              ],
            ),
          )),
        ],
      ),
    ));
  }

  Widget _referredList() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 10),
          child: FlameText(child: Text(
            'referred_users'.tr(),
            style: GoogleFonts.cinzel(
              color: const Color(0xFFF5F8FF),
              fontSize: 13,
              fontWeight: FontWeight.bold,
              letterSpacing: 2,
            ),
          )),
        ),
        ..._referred.map(_referredRow),
      ],
    );
  }

  Widget _referredRow(Map<String, dynamic> r) {
    final name = (r['name'] ?? r['refereeName'] ?? 'user_default'.tr()).toString();
    final mobile = (r['mobile'] ?? r['refereeMobile'] ?? '').toString();
    final joinedAt = (r['joinedAt'] ?? r['createdAt'] ?? '').toString();
    final earned = _num(r['earned'] ?? r['commission'] ?? r['cashbackAmount'] ?? 0);

    return ThemeHoverShadow(child: Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        gradient: const LinearGradient(
          colors: [Color(0xFF1C3459), Color(0xFF1C3459)],
        ),
        border: FlameBorder(width: 1),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFF25456F),
              border: FlameBorder(width: 1.1),
            ),
            child: const Icon(Icons.person_rounded,
                color: Color(0xFFF5F8FF), size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: GoogleFonts.lato(
                    color: const Color(0xFFF5F8FF),
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (mobile.isNotEmpty)
                  Text(
                    _maskMobile(mobile),
                    style: GoogleFonts.lato(
                      color: const Color(0xFFE9F1FF),
                      fontSize: 11.5,
                    ),
                  ),
              ],
            ),
          ),
          if (joinedAt.isNotEmpty)
            Text(
              _shortDate(joinedAt),
              style: GoogleFonts.lato(
                color: const Color(0xFFB6C9E2),
                fontSize: 11,
              ),
            ),
          if (earned > 0) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                color: const Color(0xFF2ECC71).withValues(alpha: 0.15),
                border: Border.all(color: const Color(0xFF2ECC71), width: 1),
              ),
              child: Text(
                '₹${_fmtNum(earned)}',
                style: GoogleFonts.lato(
                  color: const Color(0xFF2ECC71),
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ],
      ),
    ));
  }

  Widget _howItWorks() {
    return ThemeHoverShadow(child: Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        gradient: const LinearGradient(
          colors: [Color(0xFF1C3459), Color(0xFF1C3459)],
        ),
        border: FlameBorder(width: 1.2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          FlameText(child: Text(
            'how_it_works'.tr(),
            style: GoogleFonts.cinzel(
              color: const Color(0xFFF5F8FF),
              fontSize: 13,
              fontWeight: FontWeight.bold,
              letterSpacing: 2,
            ),
          )),
          const SizedBox(height: 12),
          _step('1', 'how_step_1'.tr()),
          _step('2', 'how_step_2'.tr()),
          _step('3', 'how_step_3'.tr()),
        ],
      ),
    ));
  }

  Widget _step(String n, String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 22,
            height: 22,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: AppColors.goldGradient,
            ),
            child: Center(
              child: Text(
                n,
                style: GoogleFonts.lato(
                  color: Colors.black,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: GoogleFonts.lato(
                color: const Color(0xFFE9F1FF),
                fontSize: 12.5,
                height: 1.5,
              ),
            ),
          ),
        ],
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

  String _maskMobile(String m) {
    if (m.length < 4) return m;
    return '••••${m.substring(m.length - 4)}';
  }

  String _shortDate(String iso) {
    final d = DateTime.tryParse(iso);
    if (d == null) return '';
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${d.day} ${months[d.month - 1]}';
  }
}