import '../../widgets/flame_border.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/colors.dart';
import '../../widgets/auth_shell.dart';
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

    final sent = await auth.forgotSendOtp(mobile);
    if (!mounted) return;

    if (sent) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => OtpScreen(
            mobile: mobile,
            mode: OtpMode.forgot,
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
    return AuthShell(title: 'forgot_password'.tr(), subtitle: 'forgot_password_instructions'.tr(), showBack: true,
      child: Form(key: _formKey, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        CosmicTextField(controller: _mobileCtrl, hint: 'mobile_number'.tr(), icon: Icons.phone_android, keyboardType: TextInputType.phone, maxLength: 10,
          validator: (v) => v == null || v.trim().length != 10 ? 'enter_10digit_mobile'.tr() : null),
        const SizedBox(height: 22),
        GoldButton(label: 'send_otp'.tr(), loading: auth.loading, onPressed: _submit),
        const SizedBox(height: 18),
        TextButton(onPressed: () => Navigator.pop(context), child: Text('login'.tr(), style: const TextStyle(color: Color(0xFF063D30), fontWeight: FontWeight.bold))),
      ])),
    );
  }
}
