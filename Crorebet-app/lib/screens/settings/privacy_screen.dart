import '../../widgets/flame_text.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/colors.dart';
import '../../widgets/cosmic_background.dart';
import '../../widgets/ornamental_frame.dart';
import '../../widgets/gold_divider.dart';

class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: FlameText(child: Text(
          'privacy_policy'.tr(),
          style: GoogleFonts.cinzel(
            color: const Color(0xFFF5F8FF),
            fontSize: 16,
            fontWeight: FontWeight.bold,
            letterSpacing: 2,
          ),
        )),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              color: Color(0xFFF5F8FF), size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: CosmicBackground(
        child: OrnamentalFrame(
          child: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 30),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  GoldDivider(text: 'privacy'.tr(), fontSize: 16),
                  const SizedBox(height: 20),
                  _section('privacy_s1_title'.tr(), 'privacy_s1_body'.tr()),
                  _section('privacy_s2_title'.tr(), 'privacy_s2_body'.tr()),
                  _section('privacy_s3_title'.tr(), 'privacy_s3_body'.tr()),
                  _section('privacy_s4_title'.tr(), 'privacy_s4_body'.tr()),
                  _section('privacy_s5_title'.tr(), 'privacy_s5_body'.tr()),
                  _section('privacy_s6_title'.tr(), 'privacy_s6_body'.tr()),
                  _section('privacy_s7_title'.tr(), 'privacy_s7_body'.tr()),
                  _section('privacy_s8_title'.tr(), 'privacy_s8_body'.tr()),
                  _section('privacy_s9_title'.tr(), 'privacy_s9_body'.tr()),
                  _section('privacy_s10_title'.tr(), 'privacy_s10_body'.tr()),
                  const SizedBox(height: 30),
                  Center(
                    child: Text(
                      'last_updated_september_2026'.tr(),
                      style: GoogleFonts.lato(
                        color: const Color(0xFFE5D6B7),
                        fontSize: 11,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _section(String title, String body) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          FlameText(child: Text(
            title,
            style: GoogleFonts.cinzel(
              color: const Color(0xFFF5F8FF),
              fontSize: 15,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.5,
            ),
          )),
          const SizedBox(height: 8),
          Text(
            body,
            style: GoogleFonts.lato(
              color: const Color(0xFFFFF8EB),
              fontSize: 13.5,
              height: 1.6,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}