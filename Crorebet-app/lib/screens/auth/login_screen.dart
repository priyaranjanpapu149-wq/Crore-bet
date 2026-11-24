import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/colors.dart';
import '../../providers/auth_provider.dart';
import '../../services/secure_storage.dart';
import '../../widgets/cosmic_background.dart';
import '../../widgets/ornamental_frame.dart';
import '../../widgets/gold_divider.dart';
import '../../widgets/cosmic_text_field.dart';
import '../../widgets/gold_button.dart';
import 'register_screen.dart';
import 'forgot_password_screen.dart';
import 'otp_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _mobileCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _obscure = true;
  bool _rememberMe = false;

  @override
  void initState() {
    super.initState();
    _loadRememberedMobile();
  }

  Future<void> _loadRememberedMobile() async {
    final m = await SecureStorage.getLastMobile();
    if (m == null || m.isEmpty || !mounted) return;
    setState(() {
      _mobileCtrl.text = m;
      _rememberMe = true;
    });
  }

  @override
  void dispose() {
    _mobileCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = context.read<AuthProvider>();
    final mobile = _mobileCtrl.text.trim();
    final password = _passwordCtrl.text;

    // 🚀 Step 1: verify password + get OTP (no session yet)
    final otp = await auth.loginSendOtp(mobile, password);
    if (!mounted) return;

    if (otp != null && otp.isNotEmpty) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => OtpScreen(
            mobile: mobile,
            mode: OtpMode.login,
            pendingPassword: password,
            prefilledOtp: otp,
          ),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(auth.error ?? 'login_failed'.tr()),
        backgroundColor: AppColors.error,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final size = MediaQuery.of(context).size;
    final w = size.width;
    final h = size.height;

    final horizontalPadding = w < 360 ? 18.0 : (w < 400 ? 24.0 : 28.0);
    final logoSize = w < 360 ? 130.0 : (w < 400 ? 160.0 : 190.0);
    final topSpace = h < 700 ? 10.0 : 20.0;
    final bottomSpace = h < 700 ? 20.0 : 40.0;
    final dividerFontSize = w < 360 ? 16.0 : 20.0;

    return Scaffold(
      resizeToAvoidBottomInset: true,
      body: CosmicBackground(
        child: OrnamentalFrame(
          child: SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) {
                return SingleChildScrollView(
                  physics: const ClampingScrollPhysics(),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(minHeight: constraints.maxHeight),
                    child: IntrinsicHeight(
                      child: Padding(
                        padding: EdgeInsets.symmetric(
                          horizontal: horizontalPadding,
                          vertical: 16,
                        ),
                        child: Form(
                          key: _formKey,
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              SizedBox(height: topSpace),

                              // 🚀 REPLACED MAGICBOSS LOGO WIDGET WITH IMAGE ASSET
                              Center(
                                child: Image.asset(
                                  'assets/images/MagicBoss.webp',
                                  width: logoSize,
                                  height: logoSize,
                                  fit: BoxFit.contain,
                                  // Fallback if image fails to load
                                  errorBuilder: (context, error, stackTrace) {
                                    return Icon(
                                      Icons.image_not_supported_outlined,
                                      size: logoSize,
                                      color: AppColors.gold,
                                    );
                                  },
                                ),
                              ),

                              SizedBox(height: h < 700 ? 18 : 30),
                              GoldDivider(
                                text: 'welcome_back'.tr(),
                                fontSize: dividerFontSize,
                              ),
                              const SizedBox(height: 6),
                              Center(
                                child: Text(
                                  'play_smart_win_big'.tr(),
                                  style: GoogleFonts.lato(
                                    color: const Color(0xFFE9F1FF),
                                    fontSize: w < 360 ? 10 : 11,
                                    fontWeight: FontWeight.w600,
                                    letterSpacing: 2,
                                  ),
                                ),
                              ),
                              SizedBox(height: h < 700 ? 20 : 32),
                              CosmicTextField(
                                controller: _mobileCtrl,
                                hint: 'mobile_number'.tr(),
                                icon: Icons.person_outline_rounded,
                                keyboardType: TextInputType.phone,
                                maxLength: 10,
                                validator: (v) {
                                  if (v == null || v.trim().isEmpty) {
                                    return 'mobile_required'.tr();
                                  }
                                  if (v.trim().length != 10) {
                                    return 'enter_10digit_mobile'.tr();
                                  }
                                  return null;
                                },
                              ),
                              SizedBox(height: h < 700 ? 12 : 16),
                              CosmicTextField(
                                controller: _passwordCtrl,
                                hint: 'password'.tr(),
                                icon: Icons.lock_outline_rounded,
                                obscure: _obscure,
                                suffix: IconButton(
                                  icon: Icon(
                                    _obscure
                                        ? Icons.visibility_off_outlined
                                        : Icons.visibility_outlined,
                                    color: const Color(0xFFF5F8FF),
                                    size: 20,
                                  ),
                                  onPressed: () =>
                                      setState(() => _obscure = !_obscure),
                                ),
                                validator: (v) {
                                  if (v == null || v.isEmpty) {
                                    return 'password_required'.tr();
                                  }
                                  // 🚀 LOOSENED: Minimum 4 characters
                                  if (v.length < 4) {
                                    return 'min_4_characters'.tr();
                                  }
                                  return null;
                                },
                              ),
                              SizedBox(height: h < 700 ? 8 : 14),
                              Row(
                                children: [
                                  SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: Checkbox(
                                      value: _rememberMe,
                                      activeColor: const Color(0xFFF5F8FF),
                                      checkColor: Colors.black,
                                      side: const BorderSide(
                                        color: AppColors.flameBorder,
                                        width: 1.4,
                                      ),
                                      materialTapTargetSize:
                                      MaterialTapTargetSize.shrinkWrap,
                                      onChanged: (v) =>
                                          setState(() => _rememberMe = v ?? false),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    'remember_me'.tr(),
                                    style: GoogleFonts.lato(
                                      color: const Color(0xFFE9F1FF),
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const Spacer(),
                                  TextButton(
                                    onPressed: () => Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) =>
                                        const ForgotPasswordScreen(),
                                      ),
                                    ),
                                    style: TextButton.styleFrom(
                                      padding: EdgeInsets.zero,
                                      minimumSize: Size.zero,
                                      tapTargetSize:
                                      MaterialTapTargetSize.shrinkWrap,
                                    ),
                                    child: Text(
                                      'forgot_password_question'.tr(),
                                      style: GoogleFonts.lato(
                                        color: const Color(0xFFF5F8FF),
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              SizedBox(height: h < 700 ? 16 : 24),
                              GoldButton(
                                label: 'login'.tr(),
                                loading: auth.loading,
                                onPressed: _submit,
                              ),
                              SizedBox(height: h < 700 ? 18 : 28),

                              // 🚀 UPDATED DIVIDER TO SHOW "OR"
                              GoldDivider(text: 'or'.tr(), fontSize: 14),

                              SizedBox(height: h < 700 ? 16 : 22),

                              // 🚀 NEW REGISTER BUTTON MATCHING THE IMAGE
                              GestureDetector(
                                onTap: () => Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => const RegisterScreen(),
                                  ),
                                ),
                                child: Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.symmetric(vertical: 14),
                                  decoration: BoxDecoration(
                                    color: Colors.transparent,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: AppColors.gold,
                                      width: 1.5,
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        Icons.person_add_alt_1_rounded,
                                        color: AppColors.gold,
                                        size: 20,
                                      ),
                                      const SizedBox(width: 10),
                                      Text(
                                        'register'.tr(),
                                        style: GoogleFonts.lato(
                                          color: AppColors.gold,
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                          letterSpacing: 2,
                                        ),
                                      ),
                                      const SizedBox(width: 10),
                                      Icon(
                                        Icons.arrow_forward_rounded,
                                        color: AppColors.gold,
                                        size: 20,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              SizedBox(height: bottomSpace),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}