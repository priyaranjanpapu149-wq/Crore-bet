import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/colors.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/cosmic_background.dart';
import '../../widgets/ornamental_frame.dart';
import '../../widgets/gold_divider.dart';
import '../../widgets/cosmic_text_field.dart';
import '../../widgets/gold_button.dart';
import 'otp_screen.dart';
import '../settings/terms_screen.dart';
import '../settings/privacy_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _mobileCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _obscure = true;
  bool _agree = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _mobileCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_agree) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('please_accept_terms'.tr()),
        backgroundColor: AppColors.error,
      ));
      return;
    }

    final auth = context.read<AuthProvider>();
    final mobile = _mobileCtrl.text.trim();

    // 🚀 In-app OTP: backend returns OTP directly
    final otp = await auth.sendSignupOtp(mobile);
    if (!mounted) return;

    if (otp != null && otp.isNotEmpty) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => OtpScreen(
            mobile: mobile,
            mode: OtpMode.signup,
            pendingName: _nameCtrl.text.trim(),
            pendingPassword: _passwordCtrl.text,
            prefilledOtp: otp,
          ),
        ),
      );
    } else {
      // Existing-user check surfaces here: "Mobile number already registered..."
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
    final logoSize = w < 360 ? 120.0 : (w < 400 ? 150.0 : 175.0);
    final topSpace = h < 700 ? 8.0 : 16.0;
    final bottomSpace = h < 700 ? 20.0 : 40.0;
    final dividerFontSize = w < 360 ? 14.0 : 18.0;
    final gapSmall = h < 700 ? 10.0 : 14.0;
    final gapMed = h < 700 ? 14.0 : 20.0;

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
                          vertical: 12,
                        ),
                        child: Form(
                          key: _formKey,
                          child: Column(
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

                              SizedBox(height: gapMed),
                              GoldDivider(
                                text: 'create_account'.tr(),
                                fontSize: dividerFontSize,
                              ),
                              const SizedBox(height: 6),
                              Center(
                                child: Text(
                                  'join_now_tagline'.tr(),
                                  textAlign: TextAlign.center,
                                  style: GoogleFonts.lato(
                                    color: const Color(0xFFE9F1FF),
                                    fontSize: w < 360 ? 10 : 11,
                                    fontWeight: FontWeight.w500,
                                    letterSpacing: 1.5,
                                  ),
                                ),
                              ),
                              SizedBox(height: gapMed),
                              CosmicTextField(
                                controller: _nameCtrl,
                                hint: 'full_name'.tr(),
                                icon: Icons.person_outline_rounded,
                                validator: (v) {
                                  if (v == null || v.trim().isEmpty) {
                                    return 'name_required'.tr();
                                  }
                                  if (v.trim().length < 3) {
                                    return 'min_3_characters'.tr();
                                  }
                                  return null;
                                },
                              ),
                              SizedBox(height: gapSmall),
                              CosmicTextField(
                                controller: _mobileCtrl,
                                hint: 'mobile_number'.tr(),
                                icon: Icons.phone_android_rounded,
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
                              SizedBox(height: gapSmall),
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
                                  // 🚀 LOOSENED: Minimum 4 characters, no special chars needed
                                  if (v.length < 4) {
                                    return 'min_4_characters'.tr();
                                  }
                                  return null;
                                },
                              ),
                              SizedBox(height: gapSmall),
                              GestureDetector(
                                onTap: () => setState(() => _agree = !_agree),
                                behavior: HitTestBehavior.opaque,
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 4),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      SizedBox(
                                        width: 22,
                                        height: 22,
                                        child: Checkbox(
                                          value: _agree,
                                          activeColor: const Color(0xFFF5F8FF),
                                          checkColor: Colors.black,
                                          side: const BorderSide(
                                            color: AppColors.flameBorder,
                                            width: 1.4,
                                          ),
                                          materialTapTargetSize:
                                          MaterialTapTargetSize.shrinkWrap,
                                          onChanged: (v) => setState(
                                                  () => _agree = v ?? false),
                                        ),
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Padding(
                                          padding: const EdgeInsets.only(top: 2),
                                          child: Wrap(
                                            crossAxisAlignment:
                                            WrapCrossAlignment.center,
                                            children: [
                                              Text(
                                                'i_agree_to_the'.tr(),
                                                style: GoogleFonts.lato(
                                                  color: const Color(0xFFE9F1FF),
                                                  fontSize: w < 360 ? 11 : 12,
                                                  height: 1.4,
                                                  fontWeight: FontWeight.w500,
                                                ),
                                              ),
                                              GestureDetector(
                                                onTap: () => Navigator.push(
                                                  context,
                                                  MaterialPageRoute(
                                                    builder: (_) =>
                                                    const TermsScreen(),
                                                  ),
                                                ),
                                                child: Text(
                                                  'terms_conditions'.tr(),
                                                  style: GoogleFonts.lato(
                                                    color: const Color(0xFFF5F8FF),
                                                    fontSize: w < 360 ? 11 : 12,
                                                    height: 1.4,
                                                    fontWeight: FontWeight.bold,
                                                    decoration:
                                                    TextDecoration.underline,
                                                    decorationColor:
                                                    const Color(0xFFF5F8FF),
                                                  ),
                                                ),
                                              ),
                                              Text(
                                                'and_label'.tr(),
                                                style: GoogleFonts.lato(
                                                  color: const Color(0xFFE9F1FF),
                                                  fontSize: w < 360 ? 11 : 12,
                                                  height: 1.4,
                                                  fontWeight: FontWeight.w500,
                                                ),
                                              ),
                                              GestureDetector(
                                                onTap: () => Navigator.push(
                                                  context,
                                                  MaterialPageRoute(
                                                    builder: (_) =>
                                                    const PrivacyScreen(),
                                                  ),
                                                ),
                                                child: Text(
                                                  'privacy_policy'.tr(),
                                                  style: GoogleFonts.lato(
                                                    color: const Color(0xFFF5F8FF),
                                                    fontSize: w < 360 ? 11 : 12,
                                                    height: 1.4,
                                                    fontWeight: FontWeight.bold,
                                                    decoration:
                                                    TextDecoration.underline,
                                                    decorationColor:
                                                    const Color(0xFFF5F8FF),
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              SizedBox(height: gapMed),
                              GoldButton(
                                label: 'register_upper'.tr(),
                                loading: auth.loading,
                                onPressed: _submit,
                              ),
                              SizedBox(height: gapMed),
                              const GoldDivider(),
                              SizedBox(height: gapSmall),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Flexible(
                                    child: Text(
                                      'already_have_account'.tr(),
                                      style: GoogleFonts.lato(
                                        color: const Color(0xFFE9F1FF),
                                        fontSize: 12,
                                        fontWeight: FontWeight.w500,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  TextButton(
                                    onPressed: () => Navigator.pop(context),
                                    style: TextButton.styleFrom(
                                      padding: EdgeInsets.zero,
                                      minimumSize: Size.zero,
                                      tapTargetSize:
                                      MaterialTapTargetSize.shrinkWrap,
                                    ),
                                    child: Text(
                                      'login'.tr(),
                                      style: GoogleFonts.lato(
                                        color: const Color(0xFFF5F8FF),
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.bold,
                                        decoration: TextDecoration.underline,
                                        decorationColor: const Color(0xFFF5F8FF),
                                      ),
                                    ),
                                  ),
                                ],
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