import 'package:flutter/material.dart';
import '../widgets/barcode_scanner_widget.dart';
import '../core/theme.dart';
import '../core/app_localizations.dart';

class BarcodeScanScreen extends StatelessWidget {
  const BarcodeScanScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black, // Dark for camera contrast
      body: Stack(
        children: [
          // The Scanner Widget
          BarcodeScannerWidget(
            onScan: (barcode) {
              // Handle scanned barcode
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('${context.tr('scanned')}: $barcode',
                      style: const TextStyle(fontWeight: FontWeight.bold)),
                  backgroundColor: AppColors.success,
                  behavior: SnackBarBehavior.floating,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(15)),
                  margin:
                      const EdgeInsets.only(bottom: 110, left: 20, right: 20),
                ),
              );
            },
          ),

          // Header Overlay
          Positioned(
            top: 60,
            left: 24,
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
              ),
              child: const Icon(Icons.qr_code_2_rounded,
                  color: Colors.white, size: 30),
            ),
          ),

          // Instructions Overlay (Top)
          Positioned(
            top: 75,
            left: 0,
            right: 0,
            child: Center(
              child: Text(
                context.tr('smartScanner'),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                  shadows: [Shadow(color: Colors.black45, blurRadius: 10)],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
