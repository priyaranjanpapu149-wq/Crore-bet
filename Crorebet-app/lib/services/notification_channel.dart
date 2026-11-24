import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Creates the Android notification channel used by FCM.
/// IMPORTANCE_HIGH → heads-up pop-over + sound even when app is background/closed.
class NotificationChannelSetup {
  static const String channelId = 'MagicBoss_results';
  static const String channelName = 'Match Results & Alerts';
  static const String channelDesc = 'Result drops, wallet credits, wins';

  static Future<void> init() async {
    if (kIsWeb) return;
    try {
      final plugin = FlutterLocalNotificationsPlugin();

      const androidChannel = AndroidNotificationChannel(
        channelId,              // ← must match backend channelId
        channelName,
        description: channelDesc,
        importance: Importance.high,   // ← makes it pop over other apps
        playSound: true,
        enableVibration: true,
        showBadge: true,
      );

      final android = plugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();

      if (android != null) {
        await android.createNotificationChannel(androidChannel);
        debugPrint('[NotifChannel] "$channelId" created (IMPORTANCE_HIGH)');
      }
    } catch (e) {
      debugPrint('[NotifChannel] init failed: $e');
    }
  }
}