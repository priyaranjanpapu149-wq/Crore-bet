import '../../widgets/flame_border.dart';
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

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});
  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _mobileCtrl = TextEditingController();

  @override
  void dispose() {
    _mobileCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = context.read<AuthProvider>();
    final mobile = _mobileCtrl.text.trim();

    // 🚀 In-app OTP: backend returns OTP directly
    final otp = await auth.forgotSendOtp(mobile);
    if (!mounted) return;

    if (otp != null && otp.isNotEmpty) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => OtpScreen(
            mobile: mobile,
            mode: OtpMode.forgot,
            prefilledOtp: otp,
          ),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(auth.error ?? 'failed_to_send_otp'.tr()),
        backgroundColor: AppColors.error,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final w = MediaQuery.of(context).size.width;
    final h = MediaQuery.of(context).size.height;
    final horizontalPadding = w < 360 ? 18.0 : (w < 400 ? 24.0 : 28.0);
    final iconPadding = w < 360 ? 18.0 : 24.0;
    final iconSize = w < 360 ? 42.0 : 50.0;

    return Scaffold(
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
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              SizedBox(height: h < 700 ? 4 : 12),
                              Align(
                                alignment: Alignment.centerLeft,
                                child: IconButton(
                                  icon: const Icon(
                                    Icons.arrow_back_ios_new_rounded,
                                    color: Color(0xFFF5F8FF),
                                    size: 20,
                                  ),
                                  onPressed: () => Navigator.pop(context),
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(),
                                ),
                              ),
                              SizedBox(height: h < 700 ? 16 : 30),
                              Center(
                                child: Container(
                                  padding: EdgeInsets.all(iconPadding),
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    border: FlameBorder(width: 2),
                                    boxShadow: [
                                      BoxShadow(
                                        color: AppColors.gold.withValues(alpha: 0.4),
                                        blurRadius: 30,
                                        spreadRadius: 4,
                                      ),
                                    ],
                                  ),
                                  child: Icon(
                                    Icons.lock_reset_rounded,
                                    size: iconSize,
                                    color: const Color(0xFFF5F8FF),
                                  ),
                                ),
                              ),
                              SizedBox(height: h < 700 ? 20 : 30),
                              GoldDivider(
                                text: 'forgot_password'.tr(),
                                fontSize: w < 360 ? 13 : 17,
                              ),
                              const SizedBox(height: 12),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 10),
                                child: Text(
                                  'forgot_password_instructions'.tr(),
                                  textAlign: TextAlign.center,
                                  style: GoogleFonts.lato(
                                    color: const Color(0xFFE9F1FF),
                                    fontSize: w < 360 ? 11.5 : 12.5,
                                    height: 1.55,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                              SizedBox(height: h < 700 ? 24 : 40),
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
                                  if (int.tryParse(v.trim()) == null) {
                                    return 'digits_only'.tr();
                                  }
                                  return null;
                                },
                              ),
                              SizedBox(height: h < 700 ? 20 : 30),
                              GoldButton(
                                label: 'send_otp'.tr(),
                                loading: auth.loading,
                                onPressed: _submit,
                              ),
                              const Spacer(),
                              const SizedBox(height: 20),
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