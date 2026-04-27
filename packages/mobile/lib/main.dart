import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'core/auth_provider.dart';
import 'core/theme.dart';
import 'core/theme_provider.dart';
import 'core/locale_provider.dart';
import 'core/app_localizations.dart';
import 'navigation/main_nav.dart';
import 'screens/login_screen.dart';
import 'screens/windows_webview_screen.dart';

/// Returns true when running on Windows desktop (not web).
bool get _isWindowsDesktop => !kIsWeb && Platform.isWindows;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('ar', null);
  await initializeDateFormatting('fr', null);
  await initializeDateFormatting('en', null);

  // Force portrait orientation only on mobile (not on Windows desktop)
  if (!_isWindowsDesktop) {
    await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  }

  // Status bar style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ),
  );

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => LocaleProvider()),
      ],
      child: const RaidApp(),
    ),
  );
}

class RaidApp extends StatelessWidget {
  const RaidApp({super.key});

  @override
  Widget build(BuildContext context) {
    // ─── Windows Desktop: load the web UI via WebView (identical to Electron) ──
    if (_isWindowsDesktop) {
      return MaterialApp(
        title: 'RAID - إدارة أموالك بذكاء',
        debugShowCheckedModeBanner: false,
        theme: ThemeData.dark().copyWith(
          scaffoldBackgroundColor: const Color(0xFF0f172a),
        ),
        home: const WindowsWebviewScreen(),
      );
    }

    // ─── Mobile: use the original native Flutter UI (unchanged) ───────────────
    final localeProvider = context.watch<LocaleProvider>();
    final themeProvider = context.watch<ThemeProvider>();

    if (localeProvider.isLoading || themeProvider.isLoading) {
      return const MaterialApp(
        debugShowCheckedModeBanner: false,
        home: Scaffold(backgroundColor: AppColors.bg),
      );
    }

    return MaterialApp(
      onGenerateTitle: (context) => context.tr('appName'),
      theme: AppTheme.light(themeProvider.primaryColor),
      darkTheme: AppTheme.dark(themeProvider.primaryColor),
      themeMode: themeProvider.themeMode,
      debugShowCheckedModeBanner: false,
      locale: localeProvider.locale,
      supportedLocales: const [Locale('ar'), Locale('fr'), Locale('en')],
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      builder: (context, child) {
        return Directionality(
          textDirection: localeProvider.isRTL ? TextDirection.rtl : TextDirection.ltr,
          child: child!,
        );
      },
      home: const _RootNavigator(),
    );
  }
}

class _RootNavigator extends StatelessWidget {
  const _RootNavigator();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    // Show splash/loading until session is restored
    if (auth.loading) {
      return Scaffold(
        backgroundColor: AppColors.bg,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('📔', style: TextStyle(fontSize: 60)),
              const SizedBox(height: 16),
              Text(
                context.tr('appName'),
                style: const TextStyle(
                  color: AppColors.text,
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 32),
              CircularProgressIndicator(color: AppColors.primary),
            ],
          ),
        ),
      );
    }

    // ignore: prefer_const_constructors
    return auth.isLoggedIn ? MainNav() : LoginScreen();
  }
}
