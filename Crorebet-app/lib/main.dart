import 'package:easy_localization/easy_localization.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart'; // 🚀 ADDED
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'config/theme.dart';
import 'providers/auth_provider.dart';
import 'providers/market_provider.dart';
import 'providers/session_provider.dart';
import 'providers/settings_provider.dart';
import 'screens/splash_screen.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/quick_login_screen.dart';
import 'screens/permissions/permissions_screen.dart';
import 'services/fcm_service.dart';
import 'widgets/app_background.dart';

/// Used by ApiService's 401 interceptor to open quick login.
final GlobalKey<NavigatorState> appNavigatorKey = GlobalKey<NavigatorState>();

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 🚀 1. Initialize EasyLocalization
  await EasyLocalization.ensureInitialized();

  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      statusBarBrightness: Brightness.dark,
      systemNavigationBarColor: Color(0xFF043B2A),
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  try {
    await Firebase.initializeApp();

    // 🚀 Register the background message handler (MUST be before runApp)
    // This handles notifications when the app is killed / in background
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

    await FcmService.init();
  } catch (e) {
    debugPrint('[main] Firebase init failed: $e');
  }

  // 🚀 2. Wrap the app in EasyLocalization
  runApp(
    EasyLocalization(
      supportedLocales: const [
        Locale('en'),
        Locale('hi'),
        Locale('mr'),
        Locale('kn'),
        Locale('te'),
      ],
      path: 'assets/translations',
      fallbackLocale: const Locale('en'),
      child: const CrorebetApp(),
    ),
  );
}

class CrorebetApp extends StatelessWidget {
  const CrorebetApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => MarketProvider()),
        ChangeNotifierProvider(create: (_) => SettingsProvider()..load()),
        ChangeNotifierProvider(create: (_) => SessionProvider()..init()),
      ],
      child: MaterialApp(
        title: 'Crorebet',
        debugShowCheckedModeBanner: false,
        debugShowMaterialGrid: false,
        showPerformanceOverlay: false,

        // 🚀 3. Add the localization delegates to MaterialApp
        localizationsDelegates: context.localizationDelegates,
        supportedLocales: context.supportedLocales,
        locale: context.locale,

        theme: AppTheme.dark.copyWith(
          scaffoldBackgroundColor: Colors.transparent,
          canvasColor: const Color(0xFF043B2A),
          cardColor: const Color(0xFF0A5139),
          appBarTheme: AppTheme.dark.appBarTheme.copyWith(
            backgroundColor: Colors.transparent,
            surfaceTintColor: Colors.transparent,
            systemOverlayStyle: const SystemUiOverlayStyle(
              statusBarColor: Colors.transparent,
              statusBarIconBrightness: Brightness.light,
              statusBarBrightness: Brightness.dark,
            ),
          ),
          snackBarTheme: const SnackBarThemeData(
            backgroundColor: Color(0xFFB71C1C),
            contentTextStyle: TextStyle(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
            actionTextColor: Colors.white,
            behavior: SnackBarBehavior.floating,
            elevation: 8,
          ),
        ),
        navigatorKey: appNavigatorKey,
        builder: (context, child) {
          return AppBackground(
            child: child ?? const SizedBox.shrink(),
          );
        },
        initialRoute: '/',
        routes: {
          '/': (_) => const SplashScreen(),
          '/permissions': (_) => const PermissionsScreen(),
          '/login': (_) => const LoginScreen(),
          '/quick-login': (_) => const QuickLoginScreen(),
        },
      ),
    );
  }
}
