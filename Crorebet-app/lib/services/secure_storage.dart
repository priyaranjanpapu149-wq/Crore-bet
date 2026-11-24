import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';

class SecureStorage {
  // ═══════════════════════════════════════════════════════════
  // 🚀 Keystore-backed storage (Android)
  //    - encryptedSharedPreferences: true  → uses Android Keystore
  //      to encrypt values before writing to disk
  //    - resetOnError: true  → if decryption fails (e.g. user
  //      clears the OS key, or after an app backup restore),
  //      auto-wipe the vault instead of throwing
  //
  //    iOS uses Keychain by default — no extra options needed.
  // ═══════════════════════════════════════════════════════════
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      resetOnError: true,   // 🚀 auto-wipe on decryption failure
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock,
    ),
  );

  static const String _mobileKey = 'user_mobile';
  static const String _lastMobileKey = 'last_mobile';
  static const String _lastLoginAtKey = 'last_login_at';
  static const String _savedPasswordKey = 'saved_password';   // 🚀 NEW

  // ═══════════════════════════════════════════════════════════
  // SECURE VAULT (cleared on logout)
  // ═══════════════════════════════════════════════════════════

  static Future<void> saveToken(String t) =>
      _storage.write(key: ApiConfig.accessTokenKey, value: t);

  static Future<String?> getToken() =>
      _storage.read(key: ApiConfig.accessTokenKey);

  static Future<void> saveRefreshToken(String t) =>
      _storage.write(key: ApiConfig.refreshTokenKey, value: t);

  static Future<String?> getRefreshToken() =>
      _storage.read(key: ApiConfig.refreshTokenKey);

  static Future<void> saveUser(String j) =>
      _storage.write(key: ApiConfig.userKey, value: j);

  static Future<String?> getUser() => _storage.read(key: ApiConfig.userKey);

  static Future<void> saveMobile(String m) =>
      _storage.write(key: _mobileKey, value: m);

  static Future<String?> getMobile() => _storage.read(key: _mobileKey);

  // ═══════════════════════════════════════════════════════════
  // 🚀 SAVED PASSWORD (for biometric auto-login)
  // Stores the last successful quick-login password in the
  // secure vault. Used by QuickLoginScreen when fingerprint
  // succeeds but the user never typed the password again.
  // Cleared on full logout so next login requires re-entry.
  // ═══════════════════════════════════════════════════════════

  static Future<void> saveSavedPassword(String password) =>
      _storage.write(key: _savedPasswordKey, value: password);

  static Future<String?> getSavedPassword() =>
      _storage.read(key: _savedPasswordKey);

  static Future<void> clearSavedPassword() =>
      _storage.delete(key: _savedPasswordKey);

  // ═══════════════════════════════════════════════════════════
  // TOKEN CLEAR (partial)
  // ═══════════════════════════════════════════════════════════

  /// Clears the access token but keeps the mobile + user JSON.
  /// Used on session expiry / Quit → Quick Login pre-fills mobile.
  static Future<void> clearTokenOnly() async {
    await _storage.delete(key: ApiConfig.accessTokenKey);
  }

  /// Full logout. Wipes the secure vault including the saved password.
  /// Does NOT touch SharedPreferences, so `last_mobile` and
  /// `last_login_at` survive until explicitly cleared.
  static Future<void> clearAll() => _storage.deleteAll();

  // ═══════════════════════════════════════════════════════════
  // SHARED PREFERENCES (survive token clear)
  // ═══════════════════════════════════════════════════════════

  static Future<void> saveLastMobile(String m) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_lastMobileKey, m);
  }

  static Future<String?> getLastMobile() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_lastMobileKey);
  }

  static Future<void> clearLastMobile() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_lastMobileKey);
  }

  // ─── LAST LOGIN TIMESTAMP (drives 7-day rule) ──────────
  static Future<void> saveLastLoginAt(DateTime dt) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_lastLoginAtKey, dt.millisecondsSinceEpoch);
  }

  static Future<DateTime?> getLastLoginAt() async {
    final prefs = await SharedPreferences.getInstance();
    final ms = prefs.getInt(_lastLoginAtKey);
    if (ms == null) return null;
    return DateTime.fromMillisecondsSinceEpoch(ms);
  }

  static Future<void> clearLastLoginAt() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_lastLoginAtKey);
  }
}