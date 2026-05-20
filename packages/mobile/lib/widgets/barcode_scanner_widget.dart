import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../core/theme.dart';
import '../core/app_localizations.dart';

class BarcodeScannerWidget extends StatefulWidget {
  final Function(String) onScan;
  final bool continuous;
  const BarcodeScannerWidget({super.key, required this.onScan, this.continuous = false});

  @override
  State<BarcodeScannerWidget> createState() => _BarcodeScannerWidgetState();
}

class _BarcodeScannerWidgetState extends State<BarcodeScannerWidget> with SingleTickerProviderStateMixin {
  bool _isFlashOn = false;
  String? _lastScanned;
  DateTime? _lastScanTime;
  bool _isPopping = false;

  late AnimationController _animController;
  late Animation<double> _animation;

  final MobileScannerController _controller = MobileScannerController(
    formats: const [BarcodeFormat.all],
    detectionSpeed: DetectionSpeed.normal,
    facing: CameraFacing.back,
  );

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    
    _animation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _animController.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _handleDetection(BarcodeCapture capture) {
    if (_isPopping) return;
    
    final List<Barcode> barcodes = capture.barcodes;
    for (final barcode in barcodes) {
      final code = barcode.rawValue;
      if (code != null) {
        final now = DateTime.now();
        // Prevent rapid duplicate scans (debounce 1.5 seconds for same code)
        if (_lastScanned == code && _lastScanTime != null && 
            now.difference(_lastScanTime!).inMilliseconds < 1500) {
          continue;
        }

        _lastScanned = code;
        _lastScanTime = now;
        
        HapticFeedback.lightImpact();
        widget.onScan(code);

        if (!widget.continuous) {
          _isPopping = true;
          Navigator.pop(context);
        }
        break;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          MobileScanner(
            controller: _controller,
            onDetect: _handleDetection,
          ),

          // Custom Overlay
          _buildOverlay(),

          // Controls
          Positioned(
            top: 50,
            left: 20,
            right: 20,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                CircleAvatar(
                  backgroundColor: Colors.black.withValues(alpha: 0.5),
                  child: IconButton(
                    icon: const Icon(Icons.close, color: Colors.white),
                    onPressed: () {
                      if (!_isPopping) {
                        _isPopping = true;
                        Navigator.pop(context);
                      }
                    },
                  ),
                ),
                Text(
                  context.tr('scanBarcode'),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    shadows: [Shadow(color: Colors.black, blurRadius: 10)],
                  ),
                ),
                CircleAvatar(
                  backgroundColor: Colors.black.withValues(alpha: 0.5),
                  child: IconButton(
                    icon: Icon(
                      _isFlashOn ? Icons.flash_on : Icons.flash_off,
                      color: Colors.white,
                    ),
                    onPressed: () {
                      setState(() => _isFlashOn = !_isFlashOn);
                      _controller.toggleTorch();
                    },
                  ),
                ),
              ],
            ),
          ),

          if (widget.continuous)
            Positioned(
              bottom: 40,
              left: 0,
              right: 0,
              child: Center(
                child: ElevatedButton.icon(
                  onPressed: () {
                    if (!_isPopping) {
                      _isPopping = true;
                      Navigator.pop(context);
                    }
                  },
                  icon: const Icon(Icons.check_circle_rounded),
                  label: Text(context.tr('done')),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.success,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 15),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                  ),
                ),
              ),
            )
          else
            Positioned(
              bottom: 60,
              left: 50,
              right: 50,
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                ),
                child: Text(
                  context.tr('placeBarcodeInsideFrame'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white70, fontSize: 13),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildOverlay() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final double scanAreaWidth = constraints.maxWidth * 0.7;
        final double scanAreaHeight = scanAreaWidth * 0.6;
        return Stack(
          children: [
            ColorFiltered(
              colorFilter: ColorFilter.mode(
                Colors.black.withValues(alpha: 0.5),
                BlendMode.srcOut,
              ),
              child: Stack(
                children: [
                  Container(decoration: const BoxDecoration(color: Colors.black)),
                  Center(
                    child: Container(
                      width: scanAreaWidth,
                      height: scanAreaHeight,
                      decoration: BoxDecoration(
                        color: Colors.red,
                        borderRadius: BorderRadius.circular(20),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Center(
              child: Container(
                width: scanAreaWidth,
                height: scanAreaHeight,
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.primary, width: 3),
                  borderRadius: BorderRadius.circular(20),
                ),
              ),
            ),
            _buildScanningLine(scanAreaWidth, scanAreaHeight),
          ],
        );
      },
    );
  }

  Widget _buildScanningLine(double width, double height) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Center(
          child: Transform.translate(
            offset: Offset(0, (_animation.value - 0.5) * height),
            child: Container(
              width: width * 0.9,
              height: 2,
              decoration: BoxDecoration(
                boxShadow: [
                  BoxShadow(color: AppColors.primary, blurRadius: 10, spreadRadius: 2),
                ],
                gradient: LinearGradient(
                  colors: [Colors.transparent, AppColors.primary, Colors.transparent],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
