import '../../widgets/flame_border.dart';
import 'dart:async';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/colors.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/cosmic_background.dart';
import '../../widgets/ornamental_frame.dart';
import '../../widgets/gold_divider.dart';
import '../../widgets/gold_button.dart';
import '../home/home_screen.dart';
import 'reset_password_screen.dart';

enum OtpMode { login, signup, forgot }

class OtpScreen extends StatefulWidget {
  final String mobile;
  final OtpMode mode;
  final String? pendingName;
  final String? pendingPassword;
  final String? prefilledOtp;

  const OtpScreen({
    super.key,
    required this.mobile,
    required this.mode,
    this.pendingName,
    this.pendingPassword,
    this.prefilledOtp,
  });

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  static const int _length = 6;
  final List<TextEditingController> _ctrls =
  List.generate(_length, (_) => TextEditingController());
  final List<FocusNode> _focusNodes =
  List.generate(_length, (_) => FocusNode());

  String _otp = '';
  int _resendSeconds = 30;
  Timer? _timer;
  bool _canResend = false;
  bool _autoSubmitted = false;

  @override
  void initState() {
    super.initState();
    _startResendTimer();
    if (widget.prefilledOtp != null && widget.prefilledOtp!.length == _length) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _autoFillOtp(widget.prefilledOtp!);
      });
    }
  }

  void _autoFillOtp(String otp) {
    if (!mounted || _autoSubmitted) return;
    for (int i = 0; i < _length && i < otp.length; i++) {
      _ctrls[i].text = otp[i];
    }
    _otp = otp;
    setState(() {});
    Future.delayed(const Duration(milliseconds: 600), () {
      if (mounted && _otp.length == _length && !_autoSubmitted) {
        _autoSubmitted = true;
        _verify();
      }
    });
  }

  void _clearAll() {
    for (final c in _ctrls) { c.clear(); }
    setState(() { _otp = ''; _autoSubmitted = false; });
  }

  void _startResendTimer() {
    _resendSeconds = 30;
    _canResend = false;
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return;
      setState(() {
        _resendSeconds--;
        if (_resendSeconds <= 0) {
          _canResend = true;
          t.cancel();
        }
      });
    });
  }

  void _onChanged(int i, String v) {
    if (v.length > 1) {
      final digits = v.replaceAll(RegExp(r'\D'), '');
      for (int k = 0; k < _length && k < digits.length; k++) {
        _ctrls[k].text = digits[k];
      }
      _otp = _ctrls.map((c) => c.text).join();
      setState(() {});
      if (_otp.length == _length) _verify();
      return;
    }
    if (v.isNotEmpty && i < _length - 1) {
      _focusNodes[i + 1].requestFocus();
    } else if (v.isEmpty && i > 0) {
      _focusNodes[i - 1].requestFocus();
    }
    _otp = _ctrls.map((c) => c.text).join();
    setState(() {});
    if (_otp.length == _length) _verify();
  }

  Future<void> _verify() async {
    final auth = context.read<AuthProvider>();
    if (auth.loading) return;
    if (_otp.length != _length) {
      _showSnack('enter_all_6_digits'.tr(), isError: true);
      return;
    }
    FocusScope.of(context).unfocus();

    if (widget.mode == OtpMode.forgot) {
      final resetToken = await auth.forgotVerifyOtp(widget.mobile, _otp);
      if (!mounted) return;
      if (resetToken != null && resetToken.isNotEmpty) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => ResetPasswordScreen(
              mobile: widget.mobile,
              resetToken: resetToken,
            ),
          ),
        );
      } else {
        _showSnack(auth.error ?? 'invalid_otp'.tr(), isError: true);
        _clearAll();
        _focusNodes[0].requestFocus();
      }
      return;
    }

    bool ok = false;
    if (widget.mode == OtpMode.login) {
      ok = await auth.verifyLoginOtp(widget.mobile, _otp);
    } else if (widget.mode == OtpMode.signup) {
      ok = await auth.verifySignupOtp(
        mobile: widget.mobile,
        code: _otp,
        name: widget.pendingName ?? '',
        password: widget.pendingPassword ?? '',
      );
    }
    if (!mounted) return;
    if (ok) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const HomeScreen()),
            (_) => false,
      );
    } else {
      _showSnack(auth.error ?? 'invalid_otp'.tr(), isError: true);
      _clearAll();
      _focusNodes[0].requestFocus();
    }
  }

  Future<void> _resend() async {
    if (!_canResend) return;
    final auth = context.read<AuthProvider>();
    String? newOtp;
    if (widget.mode == OtpMode.signup) {
      newOtp = await auth.sendSignupOtp(widget.mobile);
    } else if (widget.mode == OtpMode.forgot) {
      newOtp = await auth.forgotSendOtp(widget.mobile);
    } else if (widget.mode == OtpMode.login) {
      if (widget.pendingPassword == null || widget.pendingPassword!.isEmpty) {
        _showSnack('resend_requires_password'.tr(), isError: true);
        return;
      }
      newOtp = await auth.loginSendOtp(widget.mobile, widget.pendingPassword!);
    }
    if (!mounted) return;
    if (newOtp != null && newOtp.isNotEmpty) {
      _clearAll();
      _autoFillOtp(newOtp);
      _startResendTimer();
      _showSnack(
        'otp_resent_to'.tr(namedArgs: {'mobile': widget.mobile}),
        isError: false,
      );
    } else {
      _showSnack(auth.error ?? 'failed_to_resend_otp'.tr(), isError: true);
    }
  }

  void _showSnack(String msg, {required bool isError}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: isError ? AppColors.error : AppColors.success,
      behavior: SnackBarBehavior.floating,
    ));
  }

  @override
  void dispose() {
    _timer?.cancel();
    for (final c in _ctrls) { c.dispose(); }
    for (final f in _focusNodes) { f.dispose(); }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final size = MediaQuery.of(context).size;
    final w = size.width;
    final h = size.height;

    final horizontalPadding = w < 360 ? 16.0 : (w < 400 ? 22.0 : 28.0);
    final boxSize = w < 360 ? 42.0 : (w < 400 ? 48.0 : 54.0);
    final dividerFontSize = w < 360 ? 14.0 : 18.0;
    final topSpace = h < 700 ? 12.0 : 30.0;

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
                    child: Padding(
                      padding: EdgeInsets.symmetric(
                        horizontal: horizontalPadding,
                        vertical: 16,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          SizedBox(height: topSpace),
                          Center(
                            child: Container(
                              padding: EdgeInsets.all(w < 360 ? 18 : 22),
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: FlameBorder(width: 2),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors.gold.withValues(alpha: 0.4),
                                    blurRadius: 30,
                                    spreadRadius: 3,
                                  ),
                                ],
                              ),
                              child: Icon(
                                Icons.sms_outlined,
                                size: w < 360 ? 40 : 50,
                                color: const Color(0xFFF5F8FF),
                              ),
                            ),
                          ),
                          SizedBox(height: h < 700 ? 20 : 30),
                          GoldDivider(
                            text: 'verify_otp'.tr(),
                            fontSize: dividerFontSize,
                          ),
                          const SizedBox(height: 10),
                          Center(
                            child: Text(
                              'enter_6digit_code_sent_to'.tr(),
                              style: GoogleFonts.lato(
                                color: const Color(0xFFE9F1FF),
                                fontSize: w < 360 ? 11 : 12.5,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Center(
                            child: Text(
                              '+91 ${widget.mobile}',
                              style: GoogleFonts.lato(
                                color: const Color(0xFFF5F8FF),
                                fontSize: w < 360 ? 16 : 18,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 1.5,
                              ),
                            ),
                          ),
                          SizedBox(height: h < 700 ? 24 : 40),
                          LayoutBuilder(
                            builder: (context, constraints) {
                              const gap = 6.0;
                              final availableSize =
                                  (constraints.maxWidth - gap * (_length - 1)) / _length;
                              final fittedSize =
                              availableSize.clamp(0.0, boxSize).toDouble();
                              return Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: List.generate(_length, (i) {
                                  return Padding(
                                    padding: EdgeInsets.only(
                                      right: i < _length - 1 ? gap : 0,
                                    ),
                                    child: _buildBox(i, fittedSize),
                                  );
                                }),
                              );
                            },
                          ),
                          SizedBox(height: h < 700 ? 24 : 40),
                          GoldButton(
                            label: 'verify'.tr(),
                            loading: auth.loading,
                            onPressed: _verify,
                          ),
                          SizedBox(height: h < 700 ? 12 : 20),
                          Center(
                            child: _canResend
                                ? TextButton(
                              onPressed: _resend,
                              style: TextButton.styleFrom(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 6),
                                minimumSize: Size.zero,
                                tapTargetSize:
                                MaterialTapTargetSize.shrinkWrap,
                              ),
                              child: Text(
                                'resend_otp'.tr(),
                                style: GoogleFonts.lato(
                                  color: const Color(0xFFF5F8FF),
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  decoration: TextDecoration.underline,
                                  decorationColor: const Color(0xFFF5F8FF),
                                ),
                              ),
                            )
                                : Text(
                              'resend_in'.tr(namedArgs: {
                                'seconds': '$_resendSeconds',
                              }),
                              style: GoogleFonts.lato(
                                color: const Color(0xFFB6C9E2),
                                fontSize: 12.5,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),
                          Center(
                            child: TextButton.icon(
                              onPressed: () => Navigator.pop(context),
                              icon: const Icon(
                                Icons.arrow_back_ios_new_rounded,
                                size: 14,
                                color: Color(0xFFF5F8FF),
                              ),
                              label: Text(
                                'change_number'.tr(),
                                style: GoogleFonts.lato(
                                  color: const Color(0xFFF5F8FF),
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              style: TextButton.styleFrom(
                                padding: EdgeInsets.zero,
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                            ),
                          ),
                          const SizedBox(height: 20),
                        ],
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

  Widget _buildBox(int i, double size) {
    final filled = _ctrls[i].text.isNotEmpty;
    return SizedBox(
      width: size,
      height: size,
      child: TextField(
        controller: _ctrls[i],
        focusNode: _focusNodes[i],
        autofocus: i == 0 && widget.prefilledOtp == null,
        textAlign: TextAlign.center,
        keyboardType: TextInputType.number,
        maxLength: 1,
        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        style: GoogleFonts.lato(
          color: const Color(0xFFF5F8FF),
          fontSize: size * 0.45,
          fontWeight: FontWeight.bold,
        ),
        decoration: InputDecoration(
          counterText: '',
          filled: true,
          fillColor: AppColors.card,
          contentPadding: EdgeInsets.zero,
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(
              color: filled ? AppColors.gold : const Color(0xFFF5F8FF),
              width: filled ? 1.8 : 1.3,
            ),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.flameBorder, width: 2),
          ),
        ),
        onChanged: (v) => _onChanged(i, v),
      ),
    );
  }
}