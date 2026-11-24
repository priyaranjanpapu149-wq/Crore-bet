import 'package:easy_localization/easy_localization.dart';

class Market {
  final String id;
  final String name;
  final String slug;
  final String? openTime;
  final String? closeTime;
  final String? openTime12;
  final String? closeTime12;
  final String? openPanna;
  final String? openDigit;
  final String? closePanna;
  final String? closeDigit;

  // 🚀 Server-computed status
  final String status;              // 'open' | 'open_result' | 'closed'
  final bool openSessionOpen;       // can user bid on OPEN?
  final bool closeSessionOpen;      // can user bid on CLOSE?

  Market({
    required this.id,
    required this.name,
    required this.slug,
    this.openTime,
    this.closeTime,
    this.openTime12,
    this.closeTime12,
    this.openPanna,
    this.openDigit,
    this.closePanna,
    this.closeDigit,
    this.status = 'closed',
    this.openSessionOpen = false,
    this.closeSessionOpen = false,
  });

  factory Market.fromJson(Map<String, dynamic> j) {
    final openRes = j['openResult'];
    final closeRes = j['closeResult'];

    String? oPanna;
    String? oDigit;
    String? cPanna;
    String? cDigit;

    // 🚀 SAFE NULL CHECKS
    if (openRes is Map) {
      oPanna = openRes['panna']?.toString();
      oDigit = openRes['digit']?.toString();
      if (oPanna == '***') oPanna = null;
      if (oDigit == '*') oDigit = null;
    }
    if (closeRes is Map) {
      cPanna = closeRes['panna']?.toString();
      cDigit = closeRes['digit']?.toString();
      if (cPanna == '***') cPanna = null;
      if (cDigit == '*') cDigit = null;
    }

    return Market(
      id: j['id']?.toString() ?? '',
      name: j['name']?.toString() ?? '',
      slug: j['slug']?.toString() ?? '',
      openTime: j['openTime']?.toString(),
      closeTime: j['closeTime']?.toString(),
      openTime12: j['openTime12']?.toString(),
      closeTime12: j['closeTime12']?.toString(),
      openPanna: oPanna,
      openDigit: oDigit,
      closePanna: cPanna,
      closeDigit: cDigit,
      status: j['status']?.toString() ?? 'closed',
      openSessionOpen: j['openSessionOpen'] == true,
      closeSessionOpen: j['closeSessionOpen'] == true,
    );
  }

  // ─── Convenience getters (server status) ───
  bool get isFullyOpen => status == 'open';
  bool get isSemiOpen => status == 'open_result';
  bool get isClosed => status == 'closed';

  // ─── Result presence ───
  bool get hasOpenResult => openPanna != null && openDigit != null;
  bool get hasCloseResult => closePanna != null && closeDigit != null;
  bool get hasAnyResult => hasOpenResult || hasCloseResult;

  // ─── Display helpers ───
  String get openTimeDisplay => openTime12 ?? _fmt12(openTime);
  String get closeTimeDisplay => closeTime12 ?? _fmt12(closeTime);

  static String _fmt12(String? t) {
    if (t == null || t.isEmpty) return '--:--';
    final p = t.split(':');
    if (p.length < 2) return t;
    final h = int.tryParse(p[0]) ?? 0;
    final m = p[1];
    final ampm = h >= 12 ? 'pm' : 'am';
    final h12 = h % 12 == 0 ? 12 : h % 12;
    return '$h12:$m $ampm';
  }

  /// Satta Matka result format: open_panna - open_digit|close_digit - close_panna
  String get resultDisplay {
    final op = openPanna ?? '***';
    final od = openDigit ?? '*';
    final cd = closeDigit ?? '*';
    final cp = closePanna ?? '***';
    return '$op-$od$cd-$cp';
  }

  /// Status text shown on the market card (Translated)
  String get statusText {
    switch (status) {
      case 'open':
        return 'running_for_today'.tr(); // Add to en.json: "Running for today"
      case 'open_result':
        return 'open_done_play_close'.tr(); // Add to en.json: "Open done — play close"
      case 'closed':
        return 'closed_for_today'.tr(); // Add to en.json: "Closed for today"
      default:
        return '—';
    }
  }
}