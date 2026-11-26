import '../../widgets/flame_border.dart';
import '../../widgets/flame_text.dart';
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
import 'login_screen.dart';

class ResetPasswordScreen extends StatefulWidget {
  final String mobile;
  final String resetToken;

  const ResetPasswordScreen({
    super.key,
    required this.mobile,
    required this.resetToken,
  });

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _newCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _obscureNew = true;
  bool _obscureConfirm = true;

  @override
  void dispose() {
    _newCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = context.read<AuthProvider>();
    final ok = await auth.forgotResetPassword(
      mobile: widget.mobile,
      resetToken: widget.resetToken,
      newPassword: _newCtrl.text,
    );

    if (!mounted) return;

    if (ok) {
      await showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => AlertDialog(
          backgroundColor: AppColors.card,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: AppColors.flameBorder, width: 1.5),
          ),
          title: Row(
            children: [
              const Icon(Icons.check_circle_rounded,
                  color: AppColors.success, size: 28),
              const SizedBox(width: 10),
              FlameText(child: Text(
                'success'.tr(),
                style: GoogleFonts.cinzel(
                  color: const Color(0xFFF5F8FF),
                  fontWeight: FontWeight.bold,
                ),
              )),
            ],
          ),
          content: Text(
            'password_reset_success_msg'.tr(),
            style: GoogleFonts.lato(
              color: const Color(0xFFFFF8EB),
              fontSize: 13.5,
              height: 1.5,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text(
                'ok'.tr(),
                style: GoogleFonts.lato(
                  color: const Color(0xFFF5F8FF),
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
      );
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
            (_) => false,
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(auth.error ?? 'failed_to_reset_password'.tr()),
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
                              SizedBox(height: h < 700 ? 16 : 26),
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
                                    Icons.lock_person_rounded,
                                    size: iconSize,
                                    color: const Color(0xFFF5F8FF),
                                  ),
                                ),
                              ),
                              SizedBox(height: h < 700 ? 20 : 30),
                              GoldDivider(
                                text: 'new_password'.tr(),
                                fontSize: w < 360 ? 13 : 17,
                              ),
                              const SizedBox(height: 10),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 10),
                                child: Text(
                                  'create_new_password_for'.tr(namedArgs: {
                                    'mobile': widget.mobile,
                                  }),
                                  textAlign: TextAlign.center,
                                  style: GoogleFonts.lato(
                                    color: const Color(0xFFFFF8EB),
                                    fontSize: w < 360 ? 11.5 : 12.5,
                                    height: 1.55,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                              SizedBox(height: h < 700 ? 24 : 36),
                              CosmicTextField(
                                controller: _newCtrl,
                                hint: 'new_password_hint'.tr(),
                                icon: Icons.lock_outline_rounded,
                                obscure: _obscureNew,
                                suffix: IconButton(
                                  icon: Icon(
                                    _obscureNew
                                        ? Icons.visibility_off_outlined
                                        : Icons.visibility_outlined,
                                    color: const Color(0xFF063D30),
                                    size: 20,
                                  ),
                                  onPressed: () =>
                                      setState(() => _obscureNew = !_obscureNew),
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
                              SizedBox(height: h < 700 ? 12 : 16),
                              CosmicTextField(
                                controller: _confirmCtrl,
                                hint: 'confirm_password'.tr(),
                                icon: Icons.lock_person_outlined,
                                obscure: _obscureConfirm,
                                suffix: IconButton(
                                  icon: Icon(
                                    _obscureConfirm
                                        ? Icons.visibility_off_outlined
                                        : Icons.visibility_outlined,
                                    color: const Color(0xFF063D30),
                                    size: 20,
                                  ),
                                  onPressed: () => setState(
                                          () => _obscureConfirm = !_obscureConfirm),
                                ),
                                validator: (v) {
                                  if (v == null || v.isEmpty) {
                                    return 'confirm_your_password'.tr();
                                  }
                                  if (v != _newCtrl.text) {
                                    return 'passwords_do_not_match'.tr();
                                  }
                                  return null;
                                },
                              ),
                              SizedBox(height: h < 700 ? 24 : 36),
                              GoldButton(
                                label: 'reset_password'.tr(),
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
