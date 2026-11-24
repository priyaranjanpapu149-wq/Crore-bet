class ApiConfig {
  // ═══════════════════════════════════════════════════════════
  // BASE URL
  // ═══════════════════════════════════════════════════════
  static const String baseUrl = 'http://10.20.30.100:5000/';


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