import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart' show Color;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Creates the Android notification channel used by FCM.
/// IMPORTANCE_HIGH → heads-up pop-over + sound even when app is background/closed.
class NotificationChannelSetup {
  static const String channelId = 'MagicBoss_results';
  static const String channelName = 'Match Results & Alerts';
  static const String channelDesc = 'Result drops, wallet credits, wins';

  static Future<void> show({required int id, required String title, required String body}) async {
    final plugin = FlutterLocalNotificationsPlugin();
    await plugin.initialize(settings: const InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      iOS: DarwinInitializationSettings(),
    ));
    await init();
    await plugin.show(
      id: id,
      title: title,
      body: body,
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          channelId, channelName,
          channelDescription: channelDesc,
          importance: Importance.high,
          priority: Priority.high,
          color: Color(0xFF063D30),
          largeIcon: const DrawableResourceAndroidBitmap('notification_large_icon'),
          styleInformation: BigTextStyleInformation(body),
        ),
        iOS: const DarwinNotificationDetails(),
      ),
    );
  }

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
