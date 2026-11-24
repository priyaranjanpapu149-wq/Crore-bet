class WalletTxn {
  final String id;
  final num amount;
  final int type; // 1 = credit, 0 = debit
  final String remark;
  final num? balanceBefore;
  final num? balanceAfter;
  final DateTime createdAt;

  WalletTxn({
    required this.id,
    required this.amount,
    required this.type,
    required this.remark,
    this.balanceBefore,
    this.balanceAfter,
    required this.createdAt,
  });

  factory WalletTxn.fromJson(Map<String, dynamic> j) {
    num parseNum(dynamic v) {
      if (v is num) return v;
      return num.tryParse('$v') ?? 0;
    }

    return WalletTxn(
      id: j['id']?.toString() ?? '',
      amount: parseNum(j['amount']),
      type: (j['type'] is int)
          ? j['type']
          : int.tryParse('${j['type']}') ?? 0,
      remark: j['remark']?.toString() ?? '',
      balanceBefore:
      j['balanceBefore'] != null ? parseNum(j['balanceBefore']) : null,
      balanceAfter:
      j['balanceAfter'] != null ? parseNum(j['balanceAfter']) : null,
      createdAt:
      DateTime.tryParse(j['createdAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }

  bool get isCredit => type == 1;

  String get signedAmount {
    final s = _fmtNum(amount);
    return isCredit ? '₹$s' : '₹-$s';
  }

  static String _fmtNum(num v) {
    final s = v.toStringAsFixed(0);
    final b = StringBuffer();
    for (int i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) b.write(',');
      b.write(s[i]);
    }
    return b.toString();
  }
}