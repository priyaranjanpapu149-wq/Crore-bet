import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart'; // 🚀 ADDED
import '../services/api_service.dart';
import '../services/secure_storage.dart';
import '../providers/auth_provider.dart';
import 'notification_service.dart';
import 'notification_channel.dart';

class FcmService {
  static bool _initialized = false;
  static bool _listenersRegistered = false;

  /// Safe to call multiple times — only the first call does work.
  /// Should be invoked AFTER a confirmed login (Home load), never at
  /// app boot.
  static Future<void> init() async {
    debugPrint('[FCM] init() called');

    if (kIsWeb) {
      debugPrint('[FCM] skipped — web platform');
      return;
    }

    if (_initialized) {
      debugPrint('[FCM] already initialized');
      return;
    }

    // Extra safety: don't fire the register call without a JWT.
    final token = await SecureStorage.getToken();
    debugPrint('[FCM] access token: ${token == null ? "null" : "${token.length} chars"}');
    if (token == null || token.isEmpty) {
      debugPrint('[FCM] skipped — no access token');
      return;
    }
    _initialized = true;

    try {
      final messaging = FirebaseMessaging.instance;
      debugPrint('[FCM] messaging instance ready');
      await NotificationChannelSetup.init();
      await messaging.requestPermission();

      if (!_listenersRegistered) {
      FirebaseMessaging.onMessage.listen((RemoteMessage msg) async {
        // 🚀 CHECK IF NOTIFICATIONS ARE ENABLED
        final prefs = await SharedPreferences.getInstance();
        final notificationsEnabled = prefs.getBool('notifications_enabled') ?? true;

        if (!notificationsEnabled) {
          debugPrint('[FCM] ⬅️ onMessage received but notifications are DISABLED. Skipping UI.');
          return; // Stop here, don't show the in-app banner
        }

        final n = msg.notification;
        final data = msg.data;
        debugPrint('[FCM] ⬅️ onMessage: title=${n?.title} body=${n?.body} data=$data');
        if (n == null && data.isEmpty) return;

        AppNotificationService.show(
          title: n?.title ?? data['title']?.toString() ?? 'Crorebet',
          message: n?.body ??
              data['body']?.toString() ??
              data['message']?.toString() ??
              '',
          subtitle: 'now',
          onTap: () {},
        );

        // 🚀 Refresh wallet + user data immediately when FCM arrives
        try {
          await AuthProvider.current?.refreshUser();
          debugPrint('[FCM] ✅ wallet refreshed after push');
        } catch (e) {
          debugPrint('[FCM] ⚠️ wallet refresh failed: $e');
        }
      });

      FirebaseMessaging.onMessageOpenedApp.listen((msg) async {
        debugPrint('[FCM] opened from background: ${msg.data}');

        // 🚀 Refresh wallet when user taps the notification
        try {
          await AuthProvider.current?.refreshUser();
          debugPrint('[FCM] ✅ wallet refreshed (opened from background)');
        } catch (e) {
          debugPrint('[FCM] ⚠️ wallet refresh failed: $e');
        }
      });
      messaging.onTokenRefresh.listen((t) async {
        final prefs = await SharedPreferences.getInstance();
        if (!(prefs.getBool('notifications_enabled') ?? true)) return;
        final accessToken = await SecureStorage.getToken();
        if (accessToken == null || accessToken.isEmpty) return;
        try {
          await _registerToken(t);
        } catch (_) {
          _initialized = false;
        }
      });
      _listenersRegistered = true;
      }

      final initial = await messaging.getInitialMessage();
      if (initial != null) {
        debugPrint('[FCM] cold start from: ${initial.data}');

        // 🚀 Refresh wallet on cold-start from notification
        try {
          await AuthProvider.current?.refreshUser();
        } catch (_) {}
      }

      // 🚀 CHECK IF NOTIFICATIONS ARE ENABLED BEFORE GETTING TOKEN
      final prefs = await SharedPreferences.getInstance();
      final notificationsEnabled = prefs.getBool('notifications_enabled') ?? true;

      if (notificationsEnabled) {
        debugPrint('[FCM] requesting FCM token...');
        final fcmToken = await messaging.getToken();
        debugPrint('[FCM] getToken() returned: ${fcmToken == null ? "NULL" : "${fcmToken.length} chars"}');

        if (fcmToken != null && fcmToken.isNotEmpty) {
          await _registerToken(fcmToken);
        } else {
          _initialized = false;
          debugPrint('[FCM] ❌ getToken returned null');
          debugPrint('[FCM]    Possible causes:');
          debugPrint('[FCM]    1. Emulator lacks Google Play Services');
          debugPrint('[FCM]    2. google-services.json missing or mismatched');
          debugPrint('[FCM]    3. Firebase project not initialized');
        }
      } else {
        debugPrint('[FCM] skipped token registration — notifications disabled by user');
      }

    } catch (e, st) {
      _initialized = false;
      debugPrint('[FCM] init failed: $e');
      debugPrint('[FCM] stack: $st');
    }
  }

  static Future<void> _registerToken(String token) async {
    try {
      await ApiService().registerFcmToken(token);
      debugPrint('[FCM] token registered');
    } catch (e) {
      debugPrint('[FCM] ❌ token register failed: $e');
      rethrow;
    }
  }

  static Future<void> unregister() async {
    if (kIsWeb) return;
    try {
      final messaging = FirebaseMessaging.instance;
      final token = await messaging.getToken();
      if (token != null && token.isNotEmpty) {
        try {
          await ApiService().removeFcmToken(token);
        } catch (e) {
          debugPrint('[FCM] token removal failed: $e');
        }
      }
      await messaging.deleteToken();
    } catch (e) {
      debugPrint('[FCM] unregister failed: $e');
    } finally {
      reset();
    }
  }

  /// Call this on logout so the next login re-inits for the new user.
  static void reset() {
    _initialized = false;
    debugPrint('[FCM] reset');
  }
}

// 🚀 BACKGROUND HANDLER (Must be registered in main.dart)
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();

  // 🚀 CHECK IF NOTIFICATIONS ARE ENABLED
  final prefs = await SharedPreferences.getInstance();
  final notificationsEnabled = prefs.getBool('notifications_enabled') ?? true;

  await showBackgroundMessage(message, notificationsEnabled: notificationsEnabled);
}

@visibleForTesting
Future<void> showBackgroundMessage(RemoteMessage message, {required bool notificationsEnabled}) async {
  if (!notificationsEnabled) return;
  if (message.notification == null) {
    final title = message.data['title']?.toString() ?? 'Crorebet';
    final body = message.data['body']?.toString() ?? message.data['message']?.toString() ?? '';
    if (body.isNotEmpty) {
      await NotificationChannelSetup.show(
        id: (message.messageId ?? DateTime.now().microsecondsSinceEpoch.toString()).hashCode & 0x7fffffff,
        title: title,
        body: body,
      );
    }
  }
}
