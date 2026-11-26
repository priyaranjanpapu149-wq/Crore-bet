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
import '../home/home_screen.dart';
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
  final _referralCtrl = TextEditingController();
  bool _obscure = true;
  bool _agree = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _mobileCtrl.dispose();
    _passwordCtrl.dispose();
    _referralCtrl.dispose();
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

    final success = await auth.register(
      name: _nameCtrl.text.trim(),
      mobile: mobile,
      password: _passwordCtrl.text,
      referCode: _referralCtrl.text.trim().toUpperCase(),
    );
    if (!mounted) return;

    if (success) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const HomeScreen()),
        (_) => false,
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
    const green = Color(0xFF063D30);
    return AuthShell(title: 'register_upper'.tr(), subtitle: 'Create your Crore Bet account', showBack: true, fixed: true,
      child: Form(key: _formKey, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        CosmicTextField(controller: _nameCtrl, hint: 'full_name'.tr(), icon: Icons.person_outline,
          validator: (v) => v == null || v.trim().length < 3 ? 'min_3_characters'.tr() : null),
        const SizedBox(height: 12),
        CosmicTextField(controller: _mobileCtrl, hint: 'mobile_number'.tr(), icon: Icons.phone_android, keyboardType: TextInputType.phone, maxLength: 10,
          validator: (v) => v == null || v.trim().length != 10 ? 'enter_10digit_mobile'.tr() : null),
        const SizedBox(height: 12),
        CosmicTextField(controller: _passwordCtrl, hint: 'password'.tr(), icon: Icons.lock_outline, obscure: _obscure,
          suffix: IconButton(icon: Icon(_obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: green), onPressed: () => setState(() => _obscure = !_obscure)),
          validator: (v) {
            if (v == null || v.isEmpty) return 'password_required'.tr();
            if (v.length < 8 || !RegExp(r'[A-Z]').hasMatch(v) || !RegExp(r'[0-9]').hasMatch(v)) {
              return 'Use at least 8 characters, one uppercase letter and one number';
            }
            return null;
          }),
        Align(alignment: Alignment.centerLeft, child: TextButton(
          onPressed: () async {
            await showDialog<void>(context: context, builder: (dialogContext) => AlertDialog(
              title: const Text('Referral code (optional)'),
              content: TextField(controller: _referralCtrl, textCapitalization: TextCapitalization.characters, decoration: const InputDecoration(labelText: 'Referral code')),
              actions: [TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Done'))],
            ));
            if (mounted) setState(() {});
          },
          child: Text(_referralCtrl.text.trim().isEmpty ? 'Have a referral code?' : 'Referral code: ${_referralCtrl.text.trim().toUpperCase()}', style: const TextStyle(color: green)),
        )),
        const SizedBox(height: 8),
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Checkbox(value: _agree, activeColor: green, onChanged: (v) => setState(() => _agree = v ?? false)),
          Expanded(child: Padding(padding: const EdgeInsets.only(top: 14), child: Wrap(children: [
            Text('i_agree_to_the'.tr(), style: const TextStyle(color: green)),
            InkWell(onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TermsScreen())), child: Text('terms_conditions'.tr(), style: const TextStyle(color: green, fontWeight: FontWeight.bold, decoration: TextDecoration.underline))),
            Text('and_label'.tr(), style: const TextStyle(color: green)),
            InkWell(onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PrivacyScreen())), child: Text('privacy_policy'.tr(), style: const TextStyle(color: green, fontWeight: FontWeight.bold, decoration: TextDecoration.underline))),
          ]))),
        ]),
        const SizedBox(height: 14),
        GoldButton(label: 'register_upper'.tr(), loading: auth.loading, onPressed: _submit),
        const SizedBox(height: 16),
        TextButton(onPressed: () => Navigator.pop(context), child: Text('already_have_account'.tr() + 'login'.tr(), style: const TextStyle(color: green))),
      ])),
    );
  }
}
