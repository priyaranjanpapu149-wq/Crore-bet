import 'dart:convert';
import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/secure_storage.dart';
import '../services/fcm_service.dart';

class AuthProvider with ChangeNotifier {
  static AuthProvider? current;

  final _api = ApiService();

  bool _loading = false;
  String? _error;
  Map<String, dynamic>? _user;
  bool _isLoggedIn = false;

  AuthProvider() { current = this; }

  @override
  void dispose() {
    if (current == this) current = null;
    super.dispose();
  }

  bool get loading => _loading;
  String? get error => _error;
  Map<String, dynamic>? get user => _user;
  bool get isLoggedIn => _isLoggedIn;

  void _setLoading(bool v) { _loading = v; notifyListeners(); }
  void _setError(String? e) { _error = e; notifyListeners(); }

  Future<void> _persistSession({
    required String? token,
    required String? refreshToken,
    required Map<String, dynamic>? user,
    required String mobile,
  }) async {
    if (token != null && token.isNotEmpty) await SecureStorage.saveToken(token);
    if (refreshToken != null && refreshToken.isNotEmpty) {
      await SecureStorage.saveRefreshToken(refreshToken);
    }
    if (user != null) {
      await SecureStorage.saveUser(jsonEncode(user));
      _user = user;
    }
    if (mobile.isNotEmpty) await SecureStorage.saveMobile(mobile);
    _isLoggedIn = true;
    FcmService.reset();
    unawaited(FcmService.init());
  }

  // ═══════════════════════════════════════════════════════════
  // 🚀 NEW: Local wallet update — no network call
  //
  // Used by every bet screen after a successful batch submit.
  // The batch response includes `wallet` — we just cache it
  // locally and notify listeners. Saves ~400ms vs refreshUser().
  // ═══════════════════════════════════════════════════════════
  void updateWalletLocally(num newBalance) {
    if (_user == null) return;
    _user = Map<String, dynamic>.from(_user!)..['wallet'] = newBalance;
    SecureStorage.saveUser(jsonEncode(_user)); // fire-and-forget
    notifyListeners();
  }

  Future<String?> sendSignupOtp(String mobile) async {
    _setLoading(true);
    _setError(null);
    try {
      final res = await _api.signupSendOtp(mobile);
      _setLoading(false);
      if (res['success'] == true) return res['data']?['otp']?.toString();
      _setError(res['message']?.toString() ?? 'Could not send OTP');
      return null;
    } catch (e) {
      _setError(_parseError(e));
      _setLoading(false);
      return null;
    }
  }

  Future<bool> verifySignupOtp({
    required String mobile,
    required String code,
    required String name,
    required String password,
  }) async {
    _setLoading(true);
    _setError(null);
    try {
      final res = await _api.signupVerifyOtp(
        mobile: mobile, code: code, name: name, password: password,
      );
      if (res['success'] == true) {
        await _persistSession(
          token: res['data']?['accessToken'],
          refreshToken: res['data']?['refreshToken'],
          user: res['data']?['user'],
          mobile: mobile,
        );
        await SecureStorage.saveLastMobile(mobile);
        ApiService.resetSessionFlag();
      }
      _setLoading(false);
      return res['success'] == true;
    } catch (e) {
      _setError(_parseError(e));
      _setLoading(false);
      return false;
    }
  }

  Future<String?> loginSendOtp(String mobile, String password) async {
    _setLoading(true);
    _setError(null);
    try {
      final res = await _api.loginVerifyPassword(mobile, password);
      _setLoading(false);
      if (res['success'] == true) return res['data']?['otp']?.toString();
      _setError(res['message']?.toString() ?? 'Invalid mobile or password');
      return null;
    } catch (e) {
      _setError(_parseError(e));
      _setLoading(false);
      return null;
    }
  }

  Future<bool> verifyPassword(String mobile, String password, {bool remember = true}) async {
    return loginWithPassword(mobile, password, remember: remember);
  }

  Future<bool> register({required String name, required String mobile, required String password, String? referCode}) async {
    _setLoading(true);
    _setError(null);
    try {
      final res = await _api.signupDirect(name: name, mobile: mobile, password: password, referCode: referCode);
      if (res['success'] != true) {
        _setError(res['message']?.toString() ?? 'Registration failed');
        return false;
      }
      await _persistSession(
        token: res['data']?['accessToken'],
        refreshToken: res['data']?['refreshToken'],
        user: res['data']?['user'],
        mobile: mobile,
      );
      await SecureStorage.saveLastMobile(mobile);
      ApiService.resetSessionFlag();
      return true;
    } catch (e) {
      _setError(_parseError(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> loginWithPassword(String mobile, String password, {bool remember = true}) async {
    _setLoading(true);
    _setError(null);
    try {
      final res = await _api.quickLoginPassword(mobile, password);
      if (res['success'] == true) {
        await _persistSession(
          token: res['data']?['accessToken'],
          refreshToken: res['data']?['refreshToken'],
          user: res['data']?['user'],
          mobile: mobile,
        );
        if (remember) await SecureStorage.saveLastMobile(mobile);
        else await SecureStorage.clearLastMobile();
        ApiService.resetSessionFlag();
        _setLoading(false);
        return true;
      }
      _setError(res['message'] ?? 'Invalid mobile or password');
      _setLoading(false);
      return false;
    } catch (e) {
      _setError(_parseError(e));
      _setLoading(false);
      return false;
    }
  }

  Future<bool> quickLoginWithPassword(String mobile, String password) async {
    _setLoading(true);
    _setError(null);
    try {
      final res = await _api.quickLoginPassword(mobile, password);
      if (res['success'] == true) {
        await _persistSession(
          token: res['data']?['accessToken'],
          refreshToken: res['data']?['refreshToken'],
          user: res['data']?['user'],
          mobile: mobile,
        );
        ApiService.resetSessionFlag();
        _setLoading(false);
        return true;
      }
      _setError(res['message'] ?? 'Invalid password');
      _setLoading(false);
      return false;
    } catch (e) {
      _setError(_parseError(e));
      _setLoading(false);
      return false;
    }
  }

  Future<bool> verifyLoginOtp(String mobile, String code) async {
    _setLoading(true);
    _setError(null);
    try {
      final res = await _api.loginVerifyOtp(mobile, code);
      if (res['success'] == true) {
        await _persistSession(
          token: res['data']?['accessToken'],
          refreshToken: res['data']?['refreshToken'],
          user: res['data']?['user'],
          mobile: mobile,
        );
        ApiService.resetSessionFlag();
        _setLoading(false);
        return true;
      }
      _setError(res['message'] ?? 'Invalid OTP');
      _setLoading(false);
      return false;
    } catch (e) {
      _setError(_parseError(e));
      _setLoading(false);
      return false;
    }
  }

  Future<bool> forgotSendOtp(String mobile) async {
    _setLoading(true);
    _setError(null);
    try {
      final res = await _api.forgotSendOtp(mobile);
      _setLoading(false);
      if (res['success'] == true) return true;
      _setError(res['message']?.toString() ?? 'Could not send OTP');
      return false;
    } catch (e) {
      _setError(_parseError(e));
      _setLoading(false);
      return false;
    }
  }

  Future<String?> forgotVerifyOtp(String mobile, String code) async {
    _setLoading(true);
    _setError(null);
    try {
      final res = await _api.forgotVerifyOtp(mobile: mobile, code: code);
      if (res['success'] == true) {
        final token = res['data']?['resetToken']?.toString();
        _setLoading(false);
        if (token == null || token.isEmpty) {
          _setError('Invalid reset session. Please try again.');
          return null;
        }
        return token;
      }
      _setError(res['message']?.toString() ?? 'Invalid OTP');
      _setLoading(false);
      return null;
    } catch (e) {
      _setError(_parseError(e));
      _setLoading(false);
      return null;
    }
  }

  Future<bool> forgotResetPassword({
    required String mobile, required String resetToken, required String newPassword,
  }) async {
    _setLoading(true);
    _setError(null);
    try {
      final res = await _api.forgotResetPassword(
        mobile: mobile, resetToken: resetToken, newPassword: newPassword,
      );
      _setLoading(false);
      return res['success'] == true;
    } catch (e) {
      _setError(_parseError(e));
      _setLoading(false);
      return false;
    }
  }

  Future<bool> checkSession() async {
    final token = await SecureStorage.getToken();
    if (token == null || token.isEmpty) { _isLoggedIn = false; return false; }
    try {
      final res = await _api.getSession();
      if (res['success'] == true) {
        final u = res['data']?['user'] ?? res['data'];
        if (u is Map) {
          _user = Map<String, dynamic>.from(u);
          await SecureStorage.saveUser(jsonEncode(_user));
        }
        _isLoggedIn = true;
        notifyListeners();
        return true;
      }
    } catch (_) {
      final cached = await SecureStorage.getUser();
      if (cached != null && cached.isNotEmpty) {
        try {
          _user = jsonDecode(cached) as Map<String, dynamic>;
          _isLoggedIn = true;
          notifyListeners();
          return true;
        } catch (_) {}
      }
    }
    _isLoggedIn = false;
    return false;
  }

  Future<void> refreshUser() async {
    try {
      final res = await _api.getSession();
      if (res['success'] == true) {
        final u = res['data']?['user'] ?? res['data'];
        if (u is Map) {
          _user = Map<String, dynamic>.from(u);
          await SecureStorage.saveUser(jsonEncode(_user));
          notifyListeners();
        }
      }
    } catch (_) {}
  }

  Future<void> logout() async {
    await FcmService.unregister();
    await _api.logout();
    _user = null;
    _isLoggedIn = false;
    notifyListeners();
  }

  String _parseError(dynamic e) {
    if (e is DioException) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.sendTimeout) {
        return 'Connection timed out. Check your internet.';
      }
      final msg = e.response?.data?['message'];
      if (msg is String && msg.isNotEmpty) return msg;
      if (e.type == DioExceptionType.connectionError) {
        return 'Cannot reach server. Check your internet.';
      }
      return 'Network error. Try again.';
    }
    return 'Something went wrong. Try again.';
  }
}
