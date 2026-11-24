import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../config/api_config.dart';
import '../main.dart' show appNavigatorKey;
import 'secure_storage.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  static bool _sessionExpiredShown = false;
  static bool _refreshing = false;
  static bool _suppressRedirects = false;
  static String? _cachedDeviceId;

  static void resetSessionFlag() {
    _sessionExpiredShown = false;
  }

  static void suppressRedirects(bool v) => _suppressRedirects = v;

  late final Dio _dio = _createDio();

  // ═══════════════════════════════════════════════════════════
  // 🚀 Public paths — 401 from these does NOT trigger full logout.
  // ═══════════════════════════════════════════════════════════
  static const List<String> _publicPrefixes = [
    'api/public/',
    'api/auth/signup',
    'api/auth/login',
    'api/auth/forgot',
    'api/auth/refresh',
  ];

  static bool _isPublicPath(String path) {
    return _publicPrefixes.any((p) => path.startsWith(p));
  }

  // ═══════════════════════════════════════════════════════════
  // 🚀 NO-REDIRECT paths
  // ═══════════════════════════════════════════════════════════
  static const List<String> _noRedirectPrefixes = [
    'api/user/location',
  ];

  static bool _isNoRedirectPath(String path) {
    return _noRedirectPrefixes.any((p) => path.startsWith(p));
  }

  Dio _createDio() {
    final dio = Dio(BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: ApiConfig.connectTimeout,
      receiveTimeout: ApiConfig.receiveTimeout,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    ));

    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        try {
          final deviceId = await _getDeviceId();
          if (deviceId.isNotEmpty) {
            options.headers['X-Device-Id'] = deviceId;
          }
        } catch (_) {}

        final path = options.path;
        final isPublic = _isPublicPath(path);

        if (!isPublic) {
          final t = await SecureStorage.getToken();
          if (kDebugMode) {
            debugPrint(
                '[ApiService] ${options.method} $path → token=${t == null ? "NULL" : "${t.length} chars"}');
          }
          if (t != null && t.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $t';
          }
        }
        handler.next(options);
      },

      onError: (err, handler) async {
        final path = err.requestOptions.path;

        if (_isPublicPath(path)) {
          handler.next(err);
          return;
        }

        final code = err.response?.statusCode;
        final isNetworkAuthFail = code == 401;
        final isBodyAuthFail = _isTokenErrorInBody(err.response?.data);

        if (isNetworkAuthFail || isBodyAuthFail) {
          final recovered = await _tryRefresh(err.requestOptions);
          if (recovered != null) {
            handler.resolve(recovered);
            return;
          }

          if (!_isNoRedirectPath(path)) {
            _redirectToLogin();
          }
        }
        handler.next(err);
      },

      onResponse: (response, handler) async {
        final path = response.requestOptions.path;

        if (_isPublicPath(path)) {
          handler.next(response);
          return;
        }

        if (_isTokenErrorInBody(response.data)) {
          final recovered = await _tryRefresh(response.requestOptions);
          if (recovered != null) {
            handler.resolve(recovered);
            return;
          }

          if (!_isNoRedirectPath(path)) {
            _redirectToLogin();
          }
        }
        handler.next(response);
      },
    ));

    if (kDebugMode) {
      dio.interceptors.add(LogInterceptor(
        requestBody: true,
        responseBody: true,
        requestHeader: false,
        responseHeader: false,
        logPrint: (obj) {
          final line = obj.toString();
          final redacted = line.replaceAll(
            RegExp(r'Bearer\s+[A-Za-z0-9\-_\.]+'),
            'Bearer ***REDACTED***',
          );
          debugPrint(redacted);
        },
      ));
    }

    return dio;
  }

  Future<String> _getDeviceId() async {
    if (_cachedDeviceId != null) return _cachedDeviceId!;
    try {
      final info = DeviceInfoPlugin();
      if (Platform.isAndroid) {
        final a = await info.androidInfo;
        _cachedDeviceId = 'android_${a.id}';
      } else if (Platform.isIOS) {
        final i = await info.iosInfo;
        _cachedDeviceId = 'ios_${i.identifierForVendor ?? ''}';
      } else {
        _cachedDeviceId = '';
      }
    } catch (_) {
      _cachedDeviceId = '';
    }
    return _cachedDeviceId!;
  }

  bool _isTokenErrorInBody(dynamic data) {
    if (data is! Map) return false;
    if (data['success'] == true) return false;

    final msg = data['message']?.toString().toLowerCase() ?? '';

    if (msg.contains('otp')) return false;
    if (msg.contains('password')) return false;
    if (msg.contains('credentials')) return false;
    if (msg.contains('mobile')) return false;
    if (msg.contains('too many')) return false;
    if (msg.contains('invalid')) return false;
    if (msg.contains('minimum')) return false;
    if (msg.contains('maximum')) return false;
    if (msg.contains('insufficient')) return false;
    if (msg.contains('closed')) return false;
    if (msg.contains('not open')) return false;
    if (msg.contains('paused')) return false;
    if (msg.contains('not active')) return false;
    if (msg.contains('not found')) return false;
    if (msg.contains('already')) return false;
    if (msg.contains('locked')) return false;
    if (msg.contains('bid time')) return false;
    if (msg.contains('only close session')) return false;

    return msg.contains('token expired') ||
        msg.contains('token invalid') ||
        msg.contains('invalid token') ||
        msg.contains('unauthorized') ||
        msg.contains('session expired') ||
        msg.contains('jwt') ||
        msg.contains('not authenticated') ||
        msg.contains('please login');
  }

  Future<Response?> _tryRefresh(RequestOptions originalRequest) async {
    if (_refreshing) return null;
    _refreshing = true;
    try {
      final refresh = await SecureStorage.getRefreshToken();
      if (refresh == null || refresh.isEmpty) return null;

      final bareDio = Dio(BaseOptions(
        baseUrl: ApiConfig.baseUrl,
        connectTimeout: ApiConfig.connectTimeout,
        receiveTimeout: ApiConfig.receiveTimeout,
      ));
      final res = await bareDio.post('api/auth/refresh', data: {
        'refreshToken': refresh,
      });

      final data = res.data;
      if (data is Map && data['success'] == true) {
        final newToken = data['data']?['accessToken']?.toString();
        final newRefresh = data['data']?['refreshToken']?.toString();
        if (newToken != null && newToken.isNotEmpty) {
          await SecureStorage.saveToken(newToken);
          if (newRefresh != null && newRefresh.isNotEmpty) {
            await SecureStorage.saveRefreshToken(newRefresh);
          }

          originalRequest.headers['Authorization'] = 'Bearer $newToken';
          final retryDio = Dio(BaseOptions(
            baseUrl: ApiConfig.baseUrl,
            connectTimeout: ApiConfig.connectTimeout,
            receiveTimeout: ApiConfig.receiveTimeout,
          ));
          final retried = await retryDio.fetch(originalRequest);
          return retried;
        }
      }
      return null;
    } catch (e) {
      if (kDebugMode) {
        final type = e is DioException ? e.type.name : e.runtimeType.toString();
        debugPrint('[ApiService] refresh failed: $type');
      }
      return null;
    } finally {
      _refreshing = false;
    }
  }

  void _redirectToLogin() {
    if (_suppressRedirects) return;
    if (_sessionExpiredShown) return;
    _sessionExpiredShown = true;
    SecureStorage.clearAll().then((_) {
      appNavigatorKey.currentState?.pushNamedAndRemoveUntil(
        '/login',
            (_) => false,
      );
    });
  }

  // ═══════════════════════════════════════════════════════════
  // ✨ DIRECT SIGNUP / LOGIN
  // ═══════════════════════════════════════════════════════════
  Future<Map<String, dynamic>> signupDirect({
    required String name,
    required String mobile,
    required String password,
    String? referCode,
  }) async {
    final r = await _dio.post('api/auth/signup/direct', data: {
      'name': name,
      'mobile': mobile,
      'password': password,
      if (referCode != null && referCode.isNotEmpty) 'referCode': referCode,
    });
    return r.data;
  }

  Future<Map<String, dynamic>> loginDirect({
    required String mobile,
    required String password,
  }) async {
    final r = await _dio.post('api/auth/login/direct', data: {
      'mobile': mobile,
      'password': password,
    });
    return r.data;
  }

  // ═══════════════════════════════════════════════════════════
  // SIGNUP
  // ═══════════════════════════════════════════════════════════
  Future<Map<String, dynamic>> signupSendOtp(String mobile) async {
    final r = await _dio.post(
      ApiConfig.signupSendOtp,
      data: {'mobile': mobile},
    );
    return r.data;
  }

  Future<Map<String, dynamic>> signupVerifyOtp({
    required String mobile,
    required String code,
    required String name,
    required String password,
    String? referCode,
  }) async {
    final r = await _dio.post(ApiConfig.signupVerifyOtp, data: {
      'mobile': mobile,
      'code': code,
      'name': name,
      'password': password,
      if (referCode != null && referCode.isNotEmpty) 'referCode': referCode,
    });
    return r.data;
  }

  // ═══════════════════════════════════════════════════════════
  // HOME
  // ═══════════════════════════════════════════════════════════
  Future<Map<String, dynamic>> getHome() async {
    final r = await _dio.get('api/public/home');
    return r.data;
  }

  // ═══════════════════════════════════════════════════════════
  // LOGIN
  // ═══════════════════════════════════════════════════════════
  Future<Map<String, dynamic>> loginVerifyPassword(
      String mobile,
      String password,
      ) async {
    final r = await _dio.post(
      ApiConfig.loginVerifyPass,
      data: {'mobile': mobile, 'password': password},
    );
    return r.data;
  }

  Future<Map<String, dynamic>> loginVerifyOtp(
      String mobile,
      String code,
      ) async {
    final r = await _dio.post(
      ApiConfig.loginVerifyOtp,
      data: {'mobile': mobile, 'code': code},
    );
    return r.data;
  }

  Future<Map<String, dynamic>> quickLoginPassword(
      String mobile,
      String password,
      ) async {
    final r = await _dio.post(
      'api/auth/login/password',
      data: {'mobile': mobile, 'password': password},
    );
    return r.data;
  }

  // ═══════════════════════════════════════════════════════════
  // FORGOT PASSWORD
  // ═══════════════════════════════════════════════════════════
  Future<Map<String, dynamic>> forgotSendOtp(String mobile) async {
    final r = await _dio.post(
      ApiConfig.forgotSendOtp,
      data: {'mobile': mobile},
    );
    return r.data;
  }

  Future<Map<String, dynamic>> forgotVerifyOtp({
    required String mobile,
    required String code,
  }) async {
    final r = await _dio.post('api/auth/forgot/verify-otp', data: {
      'mobile': mobile,
      'code': code,
    });
    return r.data;
  }

  Future<Map<String, dynamic>> forgotResetPassword({
    required String mobile,
    required String resetToken,
    required String newPassword,
  }) async {
    final r = await _dio.post(ApiConfig.forgotResetPass, data: {
      'mobile': mobile,
      'resetToken': resetToken,
      'newPassword': newPassword,
    });
    return r.data;
  }

  // ═══════════════════════════════════════════════════════════
  // MY BIDS
  // ═══════════════════════════════════════════════════════════
  Future<Map<String, dynamic>> getMyBids() async {
    final r = await _dio.get('api/games/bid-history');
    return r.data;
  }

  // ═══════════════════════════════════════════════════════════
  // PASSBOOK
  // ═══════════════════════════════════════════════════════════
  Future<Map<String, dynamic>> getPassbook() async {
    final r = await _dio.get('api/user/passbook');
    return r.data;
  }

  // ═══════════════════════════════════════════════════════════
  // WITHDRAWAL
  // ═══════════════════════════════════════════════════════════
  Future<Map<String, dynamic>> submitWithdrawalRequest({
    required int amount,
    String method = 'bank',
  }) async {
    final r = await _dio.post('api/wallet/withdraw-request', data: {
      'amount': amount,
      'method': method,
    });
    return r.data;
  }

  Future<Map<String, dynamic>> getWithdrawalHistory() async {
    final r = await _dio.get('api/wallet/withdrawals');
    return r.data;
  }

  // ═══════════════════════════════════════════════════════════
  // BANK / UPI DETAILS
  // ═══════════════════════════════════════════════════════════
  Future<Map<String, dynamic>> getBankDetails() async {
    final r = await _dio.get('api/user/bank');
    return r.data;
  }

  Future<Map<String, dynamic>> saveBankDetails(
      Map<String, dynamic> body) async {
    final r = await _dio.post('api/user/bank', data: body);
    return r.data;
  }

  Future<void> deleteBankDetails(String id) async {
    try {
      await _dio.delete('api/user/bank/$id');
    } catch (_) {}
  }

  // ═══════════════════════════════════════════════════════════
  // CHARTS
  // ═══════════════════════════════════════════════════════════
  Future<Map<String, dynamic>> getCharts() async {
    final r = await _dio.get('api/public/charts');
    return r.data;
  }

  Future<Map<String, dynamic>> getJodiChart(String market) async {
    final r = await _dio.get('api/public/charts/$market/jodi');
    return r.data;
  }

  Future<Map<String, dynamic>> getPanaChart(String market) async {
    final r = await _dio.get('api/public/charts/$market/pana');
    return r.data;
  }

  // ═══════════════════════════════════════════════════════════
  // REFERRAL
  // ═══════════════════════════════════════════════════════════
  Future<Map<String, dynamic>> getReferral() async {
    final r = await _dio.get('api/referral/my');
    return r.data;
  }

  // ═══════════════════════════════════════════════════════════
  // VIDEOS
  // ═══════════════════════════════════════════════════════════
  Future<Map<String, dynamic>> getVideos() async {
    final r = await _dio.get('api/public/videos');
    return r.data;
  }

  // ═══════════════════════════════════════════════════════════
  // GAME OPTIONS
  // ═══════════════════════════════════════════════════════════
  Future<Map<String, dynamic>> getGameOptions(String gameType) async {
    final r = await _dio.get('api/public/game-options/$gameType');
    return r.data;
  }

  // ═══════════════════════════════════════════════════════════
  // 🚀 SUBMIT BIDS — BATCH (1 request instead of N)
  //
  // Old behavior: for-loop → 10 requests × ~400ms = ~4 seconds
  // New behavior: 1 batch request   → ~500ms total
  //
  // Return shape (backward-compatible):
  //   {
  //     success:    bool,             // all bids placed
  //     succeeded:  int,              // how many bids placed
  //     total:      int,              // how many bids requested
  //     failures:   List<Map>,        // per-bid failures (empty on success)
  //     wallet:     num?,             // NEW: updated wallet balance
  //     bidIds:     List<String>?,    // NEW: created bid IDs
  //   }
  // ═══════════════════════════════════════════════════════════
  Future<Map<String, dynamic>> submitBids({
    required String marketId,
    required String gameType,
    required String session,
    required List<Map<String, dynamic>> bids,
  }) async {
    // Empty batch — nothing to do
    if (bids.isEmpty) {
      return {
        'success': true,
        'succeeded': 0,
        'total': 0,
        'failures': <Map<String, dynamic>>[],
      };
    }

    try {
      final r = await _dio.post('api/games/bid/batch', data: {
        'marketId': marketId,
        'gameType': gameType,
        'session': session,
        'bids': bids.map((b) => {
          'digits': b['digits'].toString(),
          'amount': b['amount'],
        }).toList(),
      });

      final data = r.data;
      if (data is Map && data['success'] == true) {
        final inner = data['data'];
        return {
          'success': true,
          'succeeded': bids.length,
          'total': bids.length,
          'failures': <Map<String, dynamic>>[],
          'wallet': inner is Map ? inner['wallet'] : null,
          'bidIds': inner is Map ? inner['bidIds'] : null,
        };
      }

      // Server responded but success=false — treat all as failed
      final msg = data is Map ? (data['message']?.toString() ?? 'Failed') : 'Failed';
      return {
        'success': false,
        'succeeded': 0,
        'total': bids.length,
        'failures': bids
            .map((b) => {'digit': b['digits'], 'message': msg})
            .toList(),
      };
    } on DioException catch (e) {
      String errorMessage = 'Failed to place bid';
      if (e.response != null && e.response!.data is Map) {
        errorMessage =
            e.response!.data['message']?.toString() ?? 'Bad request';
      } else {
        errorMessage = e.message ?? 'Network error. Please try again.';
      }
      return {
        'success': false,
        'succeeded': 0,
        'total': bids.length,
        'failures': bids
            .map((b) => {'digit': b['digits'], 'message': errorMessage})
            .toList(),
      };
    } catch (e) {
      return {
        'success': false,
        'succeeded': 0,
        'total': bids.length,
        'failures': bids
            .map((b) => {'digit': b['digits'], 'message': e.toString()})
            .toList(),
      };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 🚀 SUBMIT SINGLE BID — one bid, one request
  //
  // Same return shape as submitBids, plus wallet.
  // Use this when the user only picked one digit.
  // ═══════════════════════════════════════════════════════════
  Future<Map<String, dynamic>> submitSingleBid({
    required String marketId,
    required String gameType,
    required String session,
    required String digits,
    required num amount,
  }) async {
    try {
      final r = await _dio.post('api/games/bid', data: {
        'marketId': marketId,
        'gameType': gameType,
        'session': session,
        'digits': digits,
        'amount': amount,
      });

      final data = r.data;
      if (data is Map && data['success'] == true) {
        final inner = data['data'];
        return {
          'success': true,
          'succeeded': 1,
          'total': 1,
          'failures': <Map<String, dynamic>>[],
          'wallet': inner is Map ? inner['wallet'] : null,
          'bidId': inner is Map ? inner['id'] : null,
        };
      }

      final msg = data is Map ? (data['message']?.toString() ?? 'Failed') : 'Failed';
      return {
        'success': false,
        'succeeded': 0,
        'total': 1,
        'failures': [{'digit': digits, 'message': msg}],
      };
    } on DioException catch (e) {
      String errorMessage = 'Failed to place bid';
      if (e.response != null && e.response!.data is Map) {
        errorMessage =
            e.response!.data['message']?.toString() ?? 'Bad request';
      } else {
        errorMessage = e.message ?? 'Network error. Please try again.';
      }
      return {
        'success': false,
        'succeeded': 0,
        'total': 1,
        'failures': [{'digit': digits, 'message': errorMessage}],
      };
    } catch (e) {
      return {
        'success': false,
        'succeeded': 0,
        'total': 1,
        'failures': [{'digit': digits, 'message': e.toString()}],
      };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // FCM TOKEN
  // ═══════════════════════════════════════════════════════════
  Future<void> registerFcmToken(String token) async {
    try {
      await _dio.post('api/user/fcm-token', data: {
        'token': token,
        'platform': 'android',
        'topics': <String>[],
      });
    } catch (_) {}
  }

  // ═══════════════════════════════════════════════════════════
  // 🚀 LOCATION
  // ═══════════════════════════════════════════════════════════
  Future<void> updateLocation(double lat, double lng) async {
    try {
      final r = await _dio.post('api/user/location', data: {
        'lat': lat,
        'lng': lng,
      });
      if (kDebugMode) {
        debugPrint('[updateLocation] ✅ $lat, $lng → ${r.statusCode}');
      }
    } on DioException catch (e) {
      if (kDebugMode) {
        debugPrint(
            '[updateLocation] ❌ ${e.response?.statusCode} — ${e.response?.data ?? e.message}');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[updateLocation] ❌ $e');
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // SESSION / LOGOUT
  // ═══════════════════════════════════════════════════════════
  Future<Map<String, dynamic>> refreshSession(String refreshToken) async {
    final r = await _dio.post('api/auth/refresh', data: {
      'refreshToken': refreshToken,
    });
    return r.data;
  }

  Future<Map<String, dynamic>> getSession() async {
    final r = await _dio.get(ApiConfig.sessionCheck);
    return r.data;
  }

  Future<void> logout() async {
    try {
      await _dio.post(ApiConfig.logout);
    } catch (_) {}
    await SecureStorage.clearAll();
    _sessionExpiredShown = false;
  }
}