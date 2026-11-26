import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:crorebet_app/services/fcm_service.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:crorebet_app/widgets/app_notification_banner.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test('background notification creates a channel and displays the message', () async {
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    AndroidFlutterLocalNotificationsPlugin.registerWith();
    const channel = MethodChannel('dexterous.com/flutter/local_notifications');
    final calls = <MethodCall>[];
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, (call) async {
      calls.add(call);
      if (call.method == 'initialize') return true;
      return null;
    });
    addTearDown(() {
      debugDefaultTargetPlatformOverride = null;
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, null);
    });
    await showBackgroundMessage(const RemoteMessage(messageId: 'test-message', data: {
      'title': 'Bid placed', 'body': 'Your bid was accepted',
    }), notificationsEnabled: true);
    expect(calls.any((call) => call.method == 'createNotificationChannel'), isTrue);
    final show = calls.singleWhere((call) => call.method == 'show');
    expect(show.arguments['title'], 'Bid placed');
    expect(show.arguments['body'], 'Your bid was accepted');
    expect(show.arguments['platformSpecifics']['colorRed'], 6);
    expect(show.arguments['platformSpecifics']['colorGreen'], 61);
    expect(show.arguments['platformSpecifics']['colorBlue'], 48);
    expect(show.arguments['platformSpecifics']['largeIcon'], 'notification_large_icon');
    expect(show.arguments['platformSpecifics']['styleInformation']['bigText'], 'Your bid was accepted');
    calls.clear();
    await showBackgroundMessage(const RemoteMessage(data: {'title': 'Bid placed', 'body': 'Your bid was accepted'}), notificationsEnabled: false);
    expect(calls, isEmpty);
    await showBackgroundMessage(const RemoteMessage(notification: RemoteNotification(title: 'Shown by Android'), data: {'body': 'Already shown'}), notificationsEnabled: true);
    expect(calls, isEmpty);
  });

  testWidgets('notification banner shows the message without the old image', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: AppNotificationBanner(
      title: 'Wallet credited', message: 'Points added',
    ))));
    expect(find.byType(Image), findsNothing);
    expect(find.text('WALLET CREDITED'), findsOneWidget);
    expect(find.text('Points added'), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
  });
}
