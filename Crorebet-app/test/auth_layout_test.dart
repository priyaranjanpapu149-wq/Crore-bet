import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:crorebet_app/providers/auth_provider.dart';
import 'package:crorebet_app/screens/auth/login_screen.dart';
import 'package:crorebet_app/screens/auth/register_screen.dart';
import 'package:crorebet_app/models/market.dart';
import 'package:crorebet_app/widgets/home/market_card.dart';
import 'package:crorebet_app/screens/home/home_screen.dart';
import 'package:crorebet_app/providers/market_provider.dart';
import 'package:crorebet_app/providers/settings_provider.dart';
import 'package:crorebet_app/providers/session_provider.dart';

class TestMarketProvider extends MarketProvider {
  @override
  Future<void> loadMarkets() async {}
}

class TestTranslations extends AssetLoader {
  const TestTranslations();
  @override
  Future<Map<String, dynamic>> load(String path, Locale locale) async => {
    'welcome_back': 'Welcome back', 'login_to_mahalaxmi': 'Log in to Crore Bet',
    'full_name': 'Full name', 'mobile_number': 'Mobile number',
    'password': 'Password', 'remember_me': 'Remember me',
    'forgot_password_question': 'Forgot password?', 'login': 'Log in',
    'register_upper': 'Register', 'i_agree_to_the': 'I agree to the ',
    'terms_conditions': 'Terms', 'and_label': ' and ',
    'privacy_policy': 'Privacy Policy', 'already_have_account': 'Already have an account? ',
  };
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  SharedPreferences.setMockInitialValues({});

  for (final isLogin in [true, false]) {
    testWidgets('${isLogin ? 'Login' : 'Registration'} stays fixed and fits with keyboard', (tester) async {
      tester.view.physicalSize = const Size(1080, 2340);
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetViewInsets);
      await tester.pumpWidget(EasyLocalization(
        supportedLocales: const [Locale('en')], path: 'assets/translations',
        assetLoader: const TestTranslations(),
        fallbackLocale: const Locale('en'), startLocale: const Locale('en'),
        child: ChangeNotifierProvider(create: (_) => AuthProvider(), child: Builder(builder: (context) => MaterialApp(
          locale: context.locale, supportedLocales: context.supportedLocales,
          localizationsDelegates: context.localizationDelegates,
          home: isLogin ? const LoginScreen() : const RegisterScreen(),
        ))),
      ));
      await tester.pumpAndSettle();
      expect(find.byType(SingleChildScrollView), findsNothing);
      expect(tester.takeException(), isNull);
      tester.view.physicalSize = const Size(960, 1920);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      final field = find.byType(TextFormField).first;
      final beforeKeyboard = tester.getRect(field);
      tester.view.viewInsets = FakeViewPadding(bottom: 900);
      await tester.pumpAndSettle();
      expect(find.byType(SingleChildScrollView), findsNothing);
      expect(tester.getRect(field), beforeKeyboard);
      expect(tester.getRect(find.byType(TextFormField).last).bottom, lessThanOrEqualTo(340));
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('market card shows real result and both actions work', (tester) async {
    var played = false;
    var chartOpened = false;
    final market = Market(id: '1', name: 'Main Bazar', slug: 'main', status: 'open',
      openPanna: '279', openDigit: '4', closeDigit: '6', closePanna: '123');
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: MarketCard(
      market: market, onPlay: () => played = true, onChart: () => chartOpened = true,
    ))));
    expect(find.text('279 - 46 - 123'), findsOneWidget);
    await tester.tap(find.text('Main Bazar'));
    await tester.tap(find.byType(ElevatedButton));
    expect(chartOpened, isTrue);
    expect(played, isTrue);
    expect(tester.takeException(), isNull);
  });

  testWidgets('home header and bottom navigation show requested icons', (tester) async {
    await tester.pumpWidget(MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider<MarketProvider>(create: (_) => TestMarketProvider()),
        ChangeNotifierProvider(create: (_) => SettingsProvider()),
        ChangeNotifierProvider(create: (_) => SessionProvider()),
      ],
      child: const MaterialApp(home: HomeScreen()),
    ));
    await tester.pump();
    final header = find.byKey(const ValueKey('home_header'));
    final headerImages = find.descendant(of: header, matching: find.byType(Image));
    expect(headerImages, findsOneWidget);
    final menu = find.descendant(of: header, matching: find.byIcon(Icons.menu));
    final wordmark = find.byKey(const ValueKey('header_wordmark'));
    expect(tester.getTopLeft(wordmark).dx - tester.getTopRight(menu).dx, lessThan(30));

    final nav = find.byKey(const ValueKey('home_bottom_navigation'));
    for (final icon in [Icons.receipt_long_outlined, Icons.book_outlined, Icons.home_rounded, Icons.account_balance_wallet_outlined, Icons.headset_mic_outlined]) {
      expect(find.descendant(of: nav, matching: find.byIcon(icon)), findsOneWidget);
    }
    await tester.pumpWidget(const SizedBox.shrink());
  });
}
