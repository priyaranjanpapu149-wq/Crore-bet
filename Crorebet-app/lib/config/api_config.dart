import 'package:flutter/foundation.dart' show kReleaseMode;

class ApiConfig {
  // ═══════════════════════════════════════════════════════════
  // BASE URL
  // ═══════════════════════════════════════════════════════
  static String get baseUrl {
    const configured = String.fromEnvironment('API_BASE_URL');
    if (configured.isNotEmpty) {
      return configured.endsWith('/') ? configured : '$configured/';
    }
    if (kReleaseMode) {
      throw StateError('Set API_BASE_URL with --dart-define for release builds.');
    }
    return 'http://10.20.30.100:5000/';
  }


  // ═══════════════════════════════════════════════════════════
  // TIMEOUTS
  // ═══════════════════════════════════════════════════════════
  static const Duration connectTimeout = Duration(seconds: 20);
  static const Duration receiveTimeout = Duration(seconds: 20);

  // ═══════════════════════════════════════════════════════════
  // AUTH ENDPOINTS
  // ═══════════════════════════════════════════════════════════
  static const String signupSendOtp   = 'api/auth/signup/send-otp';
  static const String signupVerifyOtp = 'api/auth/signup/verify-otp';
  static const String loginVerifyPass = 'api/auth/login/verify-password';
  static const String loginVerifyOtp  = 'api/auth/login/verify-otp';
  static const String forgotSendOtp   = 'api/auth/forgot/send-otp';
  static const String forgotResetPass = 'api/auth/forgot/reset-password';
  static const String sessionCheck    = 'api/auth/session';
  static const String refreshToken    = 'api/auth/refresh';
  static const String logout          = 'api/auth/logout';

  // ═══════════════════════════════════════════════════════════
  // STORAGE KEYS
  // ═══════════════════════════════════════════════════════════
  static const String accessTokenKey  = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userKey         = 'user_data';
}
