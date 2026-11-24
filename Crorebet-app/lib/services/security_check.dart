import 'package:flutter/foundation.dart';
import 'package:safe_device/safe_device.dart';

class SecurityCheck {
  static Future<String?> run() async {
    // Skip on web (iOS PWA / browser) — safe_device is Android/iOS only.
    if (kIsWeb) {
      debugPrint('[SecurityCheck] skipped (web)');
      return null;
    }

    // Skip in debug so devs can test on emulators.
    // Remove this block in the release build to enforce on all devices.
    if (kDebugMode) {
      debugPrint('[SecurityCheck] skipped (debug mode)');
      return null;
    }

    try {
      // 1. Root / Jailbreak detection (safe_device covers both)
      final jailbroken = await SafeDevice.isJailBroken;
      if (jailbroken) {
        return 'This device appears to be rooted. Rooted devices are not allowed to protect your account.';
      }

      // 2. Emulator detection
      final isRealDevice = await SafeDevice.isRealDevice;
      if (!isRealDevice) {
        return 'This app cannot run on an emulator. Please use a real Android device.';
      }

      // 3. Mock location (fake GPS)
      final isMock = await SafeDevice.isMockLocation;
      if (isMock) {
        return 'Mock location detected. Please turn off fake GPS apps and try again.';
      }

      // 4. Developer mode (optional — uncomment if you want to block it)
      // final devMode = await SafeDevice.isDevelopmentModeEnable;
      // if (devMode) {
      //   return 'Developer mode is enabled. Please turn it off.';
      // }

      return null;
    } catch (e) {
      // Fail open — don't lock out real users on a plugin error.
      debugPrint('[SecurityCheck] failed: $e');
      return null;
    }
  }
}