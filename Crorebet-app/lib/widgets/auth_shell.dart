import 'dart:math' as math;
import 'package:flutter/material.dart';

class AuthShell extends StatelessWidget {
  final String title;
  final String subtitle;
  final Widget child;
  final bool showHero;
  final bool showBack;
  final bool fixed;

  const AuthShell({super.key, required this.title, required this.subtitle, required this.child, this.showHero = false, this.showBack = false, this.fixed = false});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF043B2A),
      resizeToAvoidBottomInset: !fixed,
      body: SafeArea(child: fixed
          ? LayoutBuilder(builder: (context, constraints) {
              final height = math.max(constraints.maxHeight, showHero ? 900.0 : 850.0);
              final scale = math.max(0.01, math.min(1.0, constraints.maxHeight / height));
              return ClipRect(child: FittedBox(
                alignment: Alignment.topCenter,
                fit: BoxFit.scaleDown,
                child: SizedBox(width: constraints.maxWidth / scale, height: height,
                  child: _page(context, height)),
              ));
            })
          : SingleChildScrollView(child: _page(context, math.max(MediaQuery.sizeOf(context).height, 700)))),
    );
  }

  Widget _page(BuildContext context, double height) {
    final heroHeight = showHero ? 245.0 : 135.0;
    final panel = Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(24, 22, 24, 18),
      decoration: const BoxDecoration(
        color: Color(0xFFF9EED9),
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
        border: Border(top: BorderSide(color: Color(0xFFD4A83A), width: 2)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
        Text(title, textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFF063D30), fontFamily: 'serif', fontSize: 27, fontWeight: FontWeight.bold)),
        const SizedBox(height: 5),
        Text(subtitle, textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFF355749), fontSize: 14)),
        const SizedBox(height: 18),
        child,
      ]),
    );
    return SizedBox(height: height, child: Column(children: [
      SizedBox(height: heroHeight, child: Stack(alignment: Alignment.center, children: [
        if (showHero) Positioned(top: 4, child: Image.asset('assets/images/crore_bet_hero.png', height: 155, fit: BoxFit.contain)),
        Positioned(bottom: 6, child: Image.asset('assets/images/crore_bet_wordmark.png', width: showHero ? 205 : 150, height: 58, fit: BoxFit.contain)),
        if (showBack) const Positioned(left: 4, top: 4, child: BackButton(color: Colors.white)),
      ])),
      Expanded(child: panel),
    ]));
  }
}
