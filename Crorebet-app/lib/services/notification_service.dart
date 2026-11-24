import 'dart:async';
import 'package:flutter/material.dart';
import '../main.dart' show appNavigatorKey;
import '../widgets/app_notification_banner.dart';

class AppNotificationService {
  static OverlayEntry? _current;
  static Timer? _dismissTimer;

  /// Show a cosmic banner at the top of the app.
  static void show({
    required String title,
    required String message,
    String? subtitle,
    VoidCallback? onTap,
    Duration duration = const Duration(seconds: 6),
  }) {
    final overlay = appNavigatorKey.currentState?.overlay;
    if (overlay == null) return;

    _dismissCurrent();

    _current = OverlayEntry(
      builder: (context) => Positioned(
        top: MediaQuery.of(context).padding.top + 6,
        left: 0,
        right: 0,
        child: AppNotificationBanner(
          title: title,
          message: message,
          subtitle: subtitle,
          onTap: onTap,
          onDismiss: _dismissCurrent,
        ),
      ),
    );

    overlay.insert(_current!);
    _dismissTimer = Timer(duration, _dismissCurrent);
  }

  static void _dismissCurrent() {
    _dismissTimer?.cancel();
    _dismissTimer = null;
    try {
      _current?.remove();
    } catch (_) {}
    _current = null;
  }
}