import 'package:url_launcher/url_launcher.dart';

class WhatsAppHelper {
  /// Opens a WhatsApp chat with auto-filled text:
  /// "Hi, My name {name} {mobile} Need help."
  ///
  /// Uses whatsapp:// scheme (direct app launch) — no Android share sheet,
  /// no "Copied to your connected devices" toast.
  static Future<bool> openSupport({
    required String number,
    required String name,
    required String mobile,
  }) async {
    final cleaned = number.replaceAll(RegExp(r'\D'), '');
    if (cleaned.isEmpty) return false;

    final msg = 'Hi, My name $name $mobile Need help.';
    return _launchWhatsApp(cleaned, msg);
  }

  /// Opens a WhatsApp chat with an arbitrary message.
  static Future<bool> openChat({
    required String number,
    required String message,
  }) async {
    final cleaned = number.replaceAll(RegExp(r'\D'), '');
    if (cleaned.isEmpty) return false;

    return _launchWhatsApp(cleaned, message);
  }

  /// Opens a WhatsApp chat WITHOUT any pre-filled text.
  static Future<bool> openBlank({required String number}) async {
    final cleaned = number.replaceAll(RegExp(r'\D'), '');
    if (cleaned.isEmpty) return false;

    // Try direct scheme first
    final uri = Uri.parse('whatsapp://send?phone=$cleaned');
    try {
      final launched = await launchUrl(
        uri,
        mode: LaunchMode.externalNonBrowserApplication,
      );
      if (launched) return true;
    } catch (_) {}

    // Fallback to wa.me
    final fallback = Uri.parse('https://wa.me/$cleaned');
    try {
      return await launchUrl(
        fallback,
        mode: LaunchMode.externalNonBrowserApplication,
      );
    } catch (_) {
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 🚀 Internal — try whatsapp:// scheme first, then wa.me
  //    Both use LaunchMode.externalNonBrowserApplication so
  //    Android opens the WhatsApp app directly, not the browser
  //    and NOT the system share sheet.
  // ═══════════════════════════════════════════════════════════
  static Future<bool> _launchWhatsApp(String cleaned, String message) async {
    final encoded = Uri.encodeComponent(message);

    // 🚀 Primary — direct whatsapp:// scheme (no share sheet)
    final direct = Uri.parse('whatsapp://send?phone=$cleaned&text=$encoded');
    try {
      final ok = await launchUrl(
        direct,
        mode: LaunchMode.externalNonBrowserApplication,
      );
      if (ok) return true;
    } catch (_) {}

    // 🚀 Fallback — wa.me if whatsapp:// isn't registered
    final fallback =
    Uri.parse('https://wa.me/$cleaned?text=$encoded');
    try {
      return await launchUrl(
        fallback,
        mode: LaunchMode.externalNonBrowserApplication,
      );
    } catch (_) {
      return false;
    }
  }
}