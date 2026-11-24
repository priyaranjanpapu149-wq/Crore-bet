class Bid {
  final String id;
  final String marketName;
  final String gameType;
  final String? session;
  final String digits;
  final num amount;
  final num payout;
  final String status;
  final DateTime bidDate;

  Bid({
    required this.id,
    required this.marketName,
    required this.gameType,
    this.session,
    required this.digits,
    required this.amount,
    required this.payout,
    required this.status,
    required this.bidDate,
  });

  factory Bid.fromJson(Map<String, dynamic> j) {
    // Backend may return { market: { name } } or { marketName }
    String mName = '';
    final mk = j['market'];
    if (mk is Map && mk['name'] != null) {
      mName = mk['name'].toString();
    } else if (j['marketName'] != null) {
      mName = j['marketName'].toString();
    }

    return Bid(
      id: j['id']?.toString() ?? '',
      marketName: mName,
      gameType: j['gameType']?.toString() ?? '',
      session: j['session']?.toString(),
      digits: j['digits']?.toString() ?? '',
      amount: (j['amount'] is num) ? j['amount'] : num.tryParse('${j['amount']}') ?? 0,
      payout: (j['payout'] is num) ? j['payout'] : num.tryParse('${j['payout']}') ?? 0,
      status: j['status']?.toString() ?? 'pending',
      bidDate: DateTime.tryParse(j['bidDate']?.toString() ?? '') ?? DateTime.now(),
    );
  }

  String get sessionLabel {
    if (session == null || session!.isEmpty) return '';
    final s = session!.toLowerCase();
    if (s == 'open') return 'OPEN';
    if (s == 'close') return 'CLOSE';
    return session!.toUpperCase();
  }

  String get gameTypeLabel {
    switch (gameType) {
      case 'single':
        return 'SingleDigit';
      case 'jodi':
        return 'Jodi';
      case 'single_panna':
        return 'SinglePanna';
      case 'double_panna':
        return 'DoublePanna';
      case 'triple_panna':
        return 'TriplePanna';
      case 'half_sangam':
        return 'HalfSangam';
      case 'full_sangam':
        return 'FullSangam';
      default:
        return gameType;
    }
  }
}