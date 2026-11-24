import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import '../services/api_service.dart';

class SettingsProvider with ChangeNotifier {
  final _api = ApiService();
  Map<String, dynamic> _settings = {};
  Map<String, dynamic> _rates = {};
  bool _loaded = false;

  // ─── NEW: Notification State ───
  bool _notificationsEnabled = true;

  bool get loaded => _loaded;
  Map<String, dynamic> get rates => _rates;
  bool get notificationsEnabled => _notificationsEnabled;

  Future<void> load() async {
    try {
      // 1. Load Notification preference from local storage
      final prefs = await SharedPreferences.getInstance();
      _notificationsEnabled = prefs.getBool('notifications_enabled') ?? true;

      // 2. Load API data
      final res = await _api.getHome();
      final data = res['data'];

      final rawSettings = data?['settings'];
      if (rawSettings is Map) {
        _settings = Map<String, dynamic>.from(rawSettings);
      }

      final rawRates = data?['rates'];
      if (rawRates is Map) {
        _rates = Map<String, dynamic>.from(rawRates);
      }
    } catch (e) {
      debugPrint('Settings load failed: $e');
    }
    _loaded = true;
    notifyListeners();
  }

  // ─── NEW: Toggle Notification Logic ───
  Future<void> toggleNotifications(bool value) async {
    if (_notificationsEnabled == value) return;

    _notificationsEnabled = value;
    notifyListeners();

    // Save to local storage
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('notifications_enabled', value);

    // Handle FCM Token for Background Notifications
    try {
      if (value) {
        // User turned it ON: Generate/Retrieve FCM token so server can send notifications
        await FirebaseMessaging.instance.getToken();
      } else {
        // User turned it OFF: Delete token so server can no longer send background notifications
        await FirebaseMessaging.instance.deleteToken();
      }
    } catch (e) {
      debugPrint('Error handling FCM token: $e');
    }
  }

  // ─── WhatsApp ───
  // Returns empty string if backend hasn't provided it yet.
  String get whatsappNumber {
    final raw = _settings['whatsappNumber']?.toString() ??
        _settings['whatsapp']?.toString() ??
        _settings['supportNumber']?.toString() ??
        _settings['supportWhatsapp']?.toString() ??
        _settings['contactNumber']?.toString() ??
        _settings['phone']?.toString() ??
        '';
    return raw.replaceAll(RegExp(r'\D'), '');
  }

  bool get hasWhatsapp => whatsappNumber.isNotEmpty;

  String get whatsappDisplay {
    final raw = whatsappNumber;
    if (raw.length < 10) return '';
    final cc = raw.length > 10 ? raw.substring(0, raw.length - 10) : '';
    final rest = raw.substring(raw.length - 10);
    final p1 = rest.substring(0, 5);
    final p2 = rest.substring(5);
    return cc.isEmpty ? '$p1 $p2' : '+$cc $p1 $p2';
  }

  // ─── Telegram ───
  String get telegramLink {
    final raw = _settings['telegramLink']?.toString() ??
        _settings['telegram']?.toString() ??
        _settings['telegramChannel']?.toString() ??
        '';
    if (raw.isEmpty) return '';
    if (raw.startsWith('http')) return raw;
    if (raw.startsWith('@')) return 'https://t.me/${raw.substring(1)}';
    return 'https://t.me/$raw';
  }

  bool get hasTelegram => telegramLink.isNotEmpty;

  String get telegramLabel {
    return _settings['telegramLabel']?.toString() ?? 'Telegram';
  }

  // ─── Referral message override ───
  String get referralMessageTemplate {
    return _settings['referralMessage']?.toString() ??
        _settings['shareMessage']?.toString() ??
        '';
  }
}