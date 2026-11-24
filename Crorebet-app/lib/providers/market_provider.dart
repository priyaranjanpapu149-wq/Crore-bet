import 'package:flutter/material.dart';
import '../models/market.dart';
import '../services/api_service.dart';

class MarketProvider with ChangeNotifier {
  final _api = ApiService();

  List<Market> _markets = [];
  bool _loading = false;
  String? _error;
  String? _date;

  List<Market> get markets => _markets;
  bool get loading => _loading;
  String? get error => _error;
  String? get date => _date;

  Future<void> loadMarkets() async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await _api.getHome();
      final data = res['data'];

      if (data is Map && data['markets'] is List) {
        _date = data['date']?.toString();
        _markets = (data['markets'] as List)
            .map((e) => Market.fromJson(e as Map<String, dynamic>))
            .toList();
      } else {
        _error = 'No markets returned from server';
        _markets = [];
      }
    } catch (e) {
      _error = 'Failed to load markets';
      _markets = [];
    }

    _loading = false;
    notifyListeners();
  }
}