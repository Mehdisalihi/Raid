import 'package:flutter/material.dart';
import 'package:webview_windows/webview_windows.dart';
import '../core/app_localizations.dart';

/// Full-screen WebView that loads the Next.js web app on Windows.
/// This makes the Flutter Windows build identical to the Electron version.
class WindowsWebviewScreen extends StatefulWidget {
  const WindowsWebviewScreen({super.key});

  @override
  State<WindowsWebviewScreen> createState() => _WindowsWebviewScreenState();
}

class _WindowsWebviewScreenState extends State<WindowsWebviewScreen> {
  final _controller = WebviewController();
  bool _isReady = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _initWebView();
  }

  Future<void> _initWebView() async {
    try {
      // Check if WebView2 runtime is available
      final version = await WebviewController.getWebViewVersion();
      if (version == null) {
        setState(() {
          _error = context.tr('webviewMissing');
        });
        return;
      }

      await _controller.initialize();

      // Set background color to match the app's dark theme
      await _controller.setBackgroundColor(const Color(0xFF0f172a));

      // DevTools automatically disabled for a cleaner experience

      // Load the same URL that Electron loads
      await _controller.loadUrl('http://localhost:3000');

      if (mounted) {
        setState(() => _isReady = true);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error = '${context.tr('webviewError')}:\n$e');
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Error state
    if (_error != null) {
      return Scaffold(
        backgroundColor: const Color(0xFF0f172a),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, color: Colors.redAccent, size: 64),
              const SizedBox(height: 24),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 32),
              ElevatedButton.icon(
                onPressed: () {
                  setState(() {
                    _error = null;
                    _isReady = false;
                  });
                  _initWebView();
                },
                icon: const Icon(Icons.refresh),
                label: Text(context.tr('retry')),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6366f1),
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
        ),
      );
    }

    // Loading state
    if (!_isReady) {
      return Scaffold(
        backgroundColor: const Color(0xFF0f172a),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // App logo / branding
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  gradient: const LinearGradient(
                    colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: const Icon(
                  Icons.account_balance_wallet,
                  color: Colors.white,
                  size: 48,
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'RAID',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 32,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 4,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                context.tr('manageMoneySmart'),
                style: const TextStyle(
                  color: Colors.white54,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 48),
              const SizedBox(
                width: 32,
                height: 32,
                child: CircularProgressIndicator(
                  color: Color(0xFF6366f1),
                  strokeWidth: 3,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                context.tr('loadingApp'),
                style: const TextStyle(color: Colors.white38, fontSize: 12),
              ),
            ],
          ),
        ),
      );
    }

    // WebView ready — fill the entire window
    return Webview(_controller);
  }
}
