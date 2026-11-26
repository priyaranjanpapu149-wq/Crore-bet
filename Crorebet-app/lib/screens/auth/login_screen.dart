import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/colors.dart';
import '../../widgets/auth_shell.dart';
import '../../providers/auth_provider.dart';
import '../../services/secure_storage.dart';
import '../../widgets/cosmic_background.dart';
import '../../widgets/ornamental_frame.dart';
import '../../widgets/gold_divider.dart';
import '../../widgets/cosmic_text_field.dart';
import '../../widgets/gold_button.dart';
import 'register_screen.dart';
import 'forgot_password_screen.dart';
import '../home/home_screen.dart';

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

    final success = await auth.loginWithPassword(mobile, password, remember: _rememberMe);
    if (!mounted) return;

    if (success) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const HomeScreen()),
        (_) => false,
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
    const green = Color(0xFF063D30);
    return AuthShell(
      title: 'welcome_back'.tr(), subtitle: 'login_to_mahalaxmi'.tr(), showHero: true, fixed: true,
      child: Form(key: _formKey, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        CosmicTextField(controller: _mobileCtrl, hint: 'mobile_number'.tr(), icon: Icons.phone_android, keyboardType: TextInputType.phone, maxLength: 10,
          validator: (v) => v == null || v.trim().length != 10 ? 'enter_10digit_mobile'.tr() : null),
        const SizedBox(height: 14),
        CosmicTextField(controller: _passwordCtrl, hint: 'password'.tr(), icon: Icons.lock_outline, obscure: _obscure,
          suffix: IconButton(icon: Icon(_obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: green), onPressed: () => setState(() => _obscure = !_obscure)),
          validator: (v) => v == null || v.isEmpty ? 'password_required'.tr() : null),
        Row(children: [
          Checkbox(value: _rememberMe, activeColor: green, onChanged: (v) => setState(() => _rememberMe = v ?? false)),
          Expanded(child: Text('remember_me'.tr(), style: const TextStyle(color: green, fontSize: 12))),
          TextButton(onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ForgotPasswordScreen())), child: Text('forgot_password_question'.tr(), style: const TextStyle(color: green, fontSize: 12, fontWeight: FontWeight.bold))),
        ]),
        GoldButton(label: 'login'.tr(), loading: auth.loading, onPressed: _submit),
        const SizedBox(height: 16),
        const Center(child: Text('OR', style: TextStyle(color: green))),
        const SizedBox(height: 12),
        OutlinedButton(onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RegisterScreen())), style: OutlinedButton.styleFrom(foregroundColor: green, side: const BorderSide(color: Color(0xFFC49B3E)), minimumSize: const Size.fromHeight(50)), child: Text('register_upper'.tr(), style: const TextStyle(fontWeight: FontWeight.bold))),
      ])),
    );
  }
}
