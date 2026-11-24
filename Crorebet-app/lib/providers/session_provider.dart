import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import '../main.dart' show appNavigatorKey;
import '../services/secure_storage.dart';
import 'auth_provider.dart';

class SessionProvider with ChangeNotifier, WidgetsBindingObserver {
  static const int idleTimeoutMinutes = 15;

  Timer? _ticker;
  DateTime _lastActivity = DateTime.now();
  bool _initialized = false;

  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;
    WidgetsBinding.instance.addObserver(this);
    _lastActivity = DateTime.now();
    _startTicker();
  }

  void touch() {
    _lastActivity = DateTime.now();
  }

  void _startTicker() {
    _ticker?.cancel();
    _ticker = Timer.periodic(const Duration(minutes: 1), (_) {
      _checkIdle();
    });
  }

  void _checkIdle() {
    final idle = DateTime.now().difference(_lastActivity);
    if (idle.inMinutes >= idleTimeoutMinutes) {
      _forceLogout('idle');
    }
  }

  Future<void> _forceLogout(String reason) async {
    _ticker?.cancel();
    await SecureStorage.clearTokenOnly();
    _lastActivity = DateTime.now();
    appNavigatorKey.currentState?.pushNamedAndRemoveUntil(
      '/quick-login',
          (_) => false,
    );
    debugPrint('[Session] forced logout: $reason');
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      final idle = DateTime.now().difference(_lastActivity);
      if (idle.inMinutes >= idleTimeoutMinutes) {
        _forceLogout('resumed after idle');
      } else {
        _lastActivity = DateTime.now();
        _refreshWalletIfLoggedIn();
      }
    }
  }

  /// 🚀 Only fire /session if the user actually has an access token.
  ///    On QuickLogin / Login / OTP screens the token is missing, and firing
  ///    /session would 401 → trigger a redirect to /login.
  Future<void> _refreshWalletIfLoggedIn() async {
    final token = await SecureStorage.getToken();
    if (token == null || token.isEmpty) return;

    AuthProvider.current?.refreshUser().catchError((e) {
      debugPrint('[Session] wallet refresh on resume failed: $e');
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }
}