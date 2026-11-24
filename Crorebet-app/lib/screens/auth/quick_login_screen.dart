import '../../widgets/flame_border.dart';
import '../../widgets/flame_text.dart';
import '../../widgets/theme_hover_shadow.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/colors.dart';
import '../../providers/auth_provider.dart';
import '../../services/secure_storage.dart';
import '../../widgets/cosmic_background.dart';
import 'forgot_password_screen.dart';

class QuickLoginScreen extends StatefulWidget {
  const QuickLoginScreen({super.key});

  @override
  State<QuickLoginScreen> createState() => _QuickLoginScreenState();
}

class _QuickLoginScreenState extends State<QuickLoginScreen> {
  final _passCtrl = TextEditingController();
  bool _busy = false;
  bool _obscure = true;
  String _mobile = '';

  @override
  void initState() {
    super.initState();
    _loadMobile();
  }

  Future<void> _loadMobile() async {
    final m = await SecureStorage.getMobile() ?? '';
    if (!mounted) return;
    setState(() => _mobile = m);
  }

  @override
  void dispose() {
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final pass = _passCtrl.text.trim();
    if (pass.isEmpty) {
      _snack('Enter your password');
      return;
    }
    if (_mobile.isEmpty) {
      _snack('Session lost. Please login again.');
      Navigator.of(context).pushNamedAndRemoveUntil('/login', (_) => false);
      return;
    }
    setState(() => _busy = true);
    final auth = context.read<AuthProvider>();

    // ── CHANGED: use quickLoginWithPassword instead of loginWithPassword
    //    password-only endpoint → returns tokens immediately, no OTP step
    final ok = await auth.quickLoginWithPassword(_mobile, pass);

    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) {
      Navigator.of(context).pushNamedAndRemoveUntil('/', (_) => false);
    } else {
      _snack('Wrong password. Tap Forgot Password if you forgot.');
    }
  }

  void _snack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: const Color(0xFF25456F),
      behavior: SnackBarBehavior.floating,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: CosmicBackground(
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 60, 24, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // ─── APP LOGO ────────────────────────────
                Center(
                  child: Container(
                    width: 130,
                    height: 130,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFF25456F),
                      border: FlameBorder(width: 2),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFFF5F8FF),
                          blurRadius: 32,
                          spreadRadius: 4,
                        ),
                      ],
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(18),
                      child: Image.asset(
                        'assets/images/MagicBoss.webp',
                        fit: BoxFit.contain,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 26),

                // ─── TITLE ──────────────────────────────
                Center(
                  child: FlameText(child: Text(
                    'WELCOME BACK',
                    style: GoogleFonts.cinzel(
                      color: const Color(0xFFF5F8FF),
                      fontSize: 26,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 3,
                      shadows: [
                        Shadow(
                          color: const Color(0xFFF5F8FF),
                          blurRadius: 12,
                        ),
                      ],
                    ),
                  )),
                ),
                const SizedBox(height: 8),
                Center(
                  child: Text(
                    'Session expired — enter password to continue',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.lato(
                      color: const Color(0xFFE9F1FF),
                      fontSize: 12.5,
                    ),
                  ),
                ),
                const SizedBox(height: 40),

                // ─── PASSWORD FIELD ─────────────────────
                _field(
                  label: 'Password',
                  child: Row(
                    children: [
                      const Icon(Icons.lock_rounded,
                          color: const Color(0xFFF5F8FF), size: 18),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextField(
                          controller: _passCtrl,
                          obscureText: _obscure,
                          autofocus: true,
                          onSubmitted: (_) => _submit(),
                          style: GoogleFonts.lato(
                            color: const Color(0xFFF5F8FF),
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 1,
                          ),
                          decoration: InputDecoration(
                            hintText: 'Enter password',
                            hintStyle: GoogleFonts.lato(
                              color: const Color(0xFFB6C9E2),
                              fontSize: 14,
                            ),
                            border: InputBorder.none,
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(
                                vertical: 14),
                          ),
                        ),
                      ),
                      GestureDetector(
                        onTap: () => setState(() => _obscure = !_obscure),
                        child: Icon(
                          _obscure
                              ? Icons.visibility_off_rounded
                              : Icons.visibility_rounded,
                          color: const Color(0xFFF5F8FF),
                          size: 20,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 12),

                // ─── FORGOT PASSWORD ────────────────────
                Align(
                  alignment: Alignment.centerRight,
                  child: GestureDetector(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const ForgotPasswordScreen(),
                        ),
                      );
                    },
                    child: Text(
                      'Forgot Password?',
                      style: GoogleFonts.lato(
                        color: const Color(0xFF7CE0FF),
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        decoration: TextDecoration.underline,
                        decorationColor: const Color(0xFF7CE0FF),
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 28),

                // ─── LOGIN BUTTON ───────────────────────
                SizedBox(
                  height: 56,
                  child: OutlinedButton(
                    onPressed: _busy ? null : _submit,
                    style: OutlinedButton.styleFrom(
                      backgroundColor: const Color(0xFF25456F),
                      side: const BorderSide(
                          color: AppColors.flameBorder, width: 1.6),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: _busy
                        ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: const Color(0xFFF5F8FF),
                      ),
                    )
                        : FlameText(child: Text(
                      'LOGIN',
                      style: GoogleFonts.cinzel(
                        color: const Color(0xFFF5F8FF),
                        fontSize: 17,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 3,
                      ),
                    )),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _field({required String label, required Widget child}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 6, bottom: 6),
          child: Text(
            label,
            style: GoogleFonts.lato(
              color: const Color(0xFFD4E3F8),
              fontSize: 11.5,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.2,
            ),
          ),
        ),
        ThemeHoverShadow(child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            gradient: const LinearGradient(
              colors: [Color(0xFF1C3459), Color(0xFF1C3459)],
            ),
            border: FlameBorder(width: 1.3),
          ),
          child: child,
        )),
      ],
    );
  }
}