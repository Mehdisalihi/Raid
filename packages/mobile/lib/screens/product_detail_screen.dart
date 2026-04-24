import 'package:flutter/material.dart';
import '../core/api_service.dart';
import '../core/theme.dart';
import '../core/format_utils.dart';

class ProductDetailScreen extends StatefulWidget {
  final Map<String, dynamic> product;
  const ProductDetailScreen({super.key, required this.product});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  List<dynamic> _movements = [];
  bool _loading = true;
  late Map<String, dynamic> _product;
  bool _saving = false;

  final _name = TextEditingController();
  final _barcode = TextEditingController();
  final _buyPrice = TextEditingController();
  final _sellPrice = TextEditingController();
  final _stockQty = TextEditingController();
  final _minAlert = TextEditingController();

  @override
  void initState() {
    super.initState();
    _product = Map<String, dynamic>.from(widget.product);
    _fetchMovements();
  }

  Future<void> _fetchMovements() async {
    try {
      final results = await Future.wait([
        SaleService.getAll(),
        PurchaseService.getAll(),
        ReturnService.getAll(),
      ]);

      final allSales = results[0];
      final allPurchases = results[1];
      final allReturns = results[2];

      final productId = _product['id'];
      List<dynamic> moves = [];

      for (var s in allSales) {
        final items = s['items'] as List? ?? [];
        for (var item in items) {
          if (item['productId'] == productId) {
            moves.add({
              'createdAt': s['createdAt'],
              'type': 'sale',
              'label': 'بيع - فاتورة #${FormatUtils.toLatinNumerals((s['invoiceNo'] ?? s['id']).toString())}',
              'qty': -(item['qty'] ?? item['quantity'] ?? 0),
              'color': AppColors.danger,
            });
          }
        }
      }

      for (var p in allPurchases) {
        final items = p['items'] as List? ?? [];
        for (var item in items) {
          if (item['productId'] == productId) {
            moves.add({
              'createdAt': p['createdAt'],
              'type': 'purchase',
              'label': 'شراء من مورد',
              'qty': item['qty'] ?? item['quantity'] ?? 0,
              'color': AppColors.success,
            });
          }
        }
      }

      for (var r in allReturns) {
        final items = r['items'] as List? ?? [];
        for (var item in items) {
          if (item['productId'] == productId) {
            moves.add({
              'createdAt': r['createdAt'],
              'type': 'return',
              'label': 'مرتجع مبيعات',
              'qty': item['qty'] ?? item['quantity'] ?? 0,
              'color': AppColors.warning,
            });
          }
        }
      }

      moves.sort(
          (a, b) => (b['createdAt'] ?? '').compareTo(a['createdAt'] ?? ''));

      if (mounted) {
        setState(() {
          _movements = moves;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('تفاصيل المنتج',
            style:
                TextStyle(color: AppColors.text, fontWeight: FontWeight.w900)),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: AppColors.text),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_rounded, color: AppColors.primary),
            onPressed: () {
              _openEditModal();
            },
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline_rounded, color: AppColors.danger),
            onPressed: () {
              _deleteProduct();
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            _buildProductInfo(),
            const SizedBox(height: 32),
            _buildSummaryStats(),
            const SizedBox(height: 24),
            _buildSectionTitle('سجل الحركات (المخزون)'),
            _loading
                ? const CircularProgressIndicator()
                : _buildMovementsList(),
            const SizedBox(height: 48),
          ],
        ),
      ),
    );
  }

  Widget _buildProductInfo() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            color: AppColors.surface,
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.border),
            boxShadow: [
              BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.2),
                  blurRadius: 40)
            ],
          ),
          child: const Icon(Icons.inventory_2_rounded,
              color: AppColors.primary, size: 48),
        ),
        const SizedBox(height: 24),
        Text(_product['name']?.toString() ?? '',
            style: const TextStyle(
                color: AppColors.text,
                fontSize: 24,
                fontWeight: FontWeight.w900)),
        Text(_product['barcode']?.toString() ?? 'بدون باركود',
            style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
      ],
    );
  }

  Widget _buildSummaryStats() {
    return Row(
      children: [
        _statBox('المخزون', FormatUtils.toLatinNumerals((_product['stockQty'] ?? 0).toString()),
            AppColors.secondary),
        const SizedBox(width: 16),
        _statBox('سعر البيع', '${FormatUtils.toLatinNumerals((_product['sellPrice'] ?? 0).toString())} MRU',
            AppColors.primary),
      ],
    );
  }

  Widget _statBox(String label, String val, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          children: [
            Text(label,
                style: const TextStyle(
                    color: AppColors.textLight,
                    fontSize: 11,
                    fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text(val,
                style: TextStyle(
                    color: color, fontSize: 24, fontWeight: FontWeight.w900)),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(top: 16, bottom: 12),
      child: Align(
        alignment: Alignment.centerRight,
        child: Text(title,
            style: const TextStyle(
                color: AppColors.text,
                fontSize: 16,
                fontWeight: FontWeight.w900)),
      ),
    );
  }

  String _formatDate(dynamic raw) {
    if (raw == null) return '';
    try {
      final dt = DateTime.parse(raw.toString()).toLocal();
      return FormatUtils.toLatinNumerals('${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}');
    } catch (_) {
      return raw.toString();
    }
  }

  Widget _buildMovementsList() {
    if (_movements.isEmpty) {
      return const Text('لا توجد حركات مسجلة',
          style: TextStyle(color: AppColors.textMuted));
    }
    return Column(
      children: _movements
          .map((m) => Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(m['label'],
                            style: const TextStyle(
                                color: AppColors.text,
                                fontWeight: FontWeight.bold,
                                fontSize: 13)),
                        Text(_formatDate(m['createdAt']),
                            style: const TextStyle(
                                color: AppColors.textMuted, fontSize: 10)),
                      ],
                    ),
                    Text(FormatUtils.toLatinNumerals(m['qty'] > 0 ? '+${m['qty']}' : '${m['qty']}'),
                        style: TextStyle(
                            color: m['color'],
                            fontSize: 16,
                            fontWeight: FontWeight.w900)),
                  ],
                ),
              ))
          .toList(),
    );
  }

  void _openEditModal() {
    _name.text = _product['name']?.toString() ?? '';
    _barcode.text = _product['barcode']?.toString() ?? '';
    _buyPrice.text = _product['buyPrice']?.toString() ?? '';
    _sellPrice.text = _product['sellPrice']?.toString() ?? '';
    _stockQty.text = _product['stockQty']?.toString() ?? '';
    _minAlert.text = _product['minStockAlert']?.toString() ?? '5';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _buildAddEditModal(),
    );
  }

  Future<void> _saveEdit() async {
    if (_name.text.trim().isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('يرجى إدخال اسم المنتج')));
      return;
    }
    setState(() => _saving = true);
    final body = {
      'name': _name.text,
      'barcode': _barcode.text,
      'buyPrice': double.tryParse(_buyPrice.text) ?? 0,
      'sellPrice': double.tryParse(_sellPrice.text) ?? 0,
      'stockQty': int.tryParse(_stockQty.text) ?? 0,
      'minStockAlert': int.tryParse(_minAlert.text) ?? 5,
    };
    try {
      await ProductService.update(_product['id'], body);
      setState(() {
        _product = {
          ..._product,
          ...body,
          'id': _product['id'],
        };
      });
      if (mounted) Navigator.pop(context); // Close the modal
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('❌ فشل في حفظ بيانات المنتج'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _deleteProduct() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text(
          'حذف المنتج',
          style: TextStyle(color: AppColors.text),
        ),
        content: const Text(
          'هل أنت متأكد من حذف هذا المنتج نهائياً؟',
          style: TextStyle(color: AppColors.textMuted),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('إلغاء'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('حذف', style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ProductService.delete(_product['id']);
      if (mounted) Navigator.pop(context); // Return to previous screen
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('فشل الحذف. المنتج مرتبط بفواتير.'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    }
  }

  Widget _buildAddEditModal() {
    return StatefulBuilder(
      builder: (context, setModalState) {
        return DraggableScrollableSheet(
          initialChildSize: 0.85,
          minChildSize: 0.5,
          maxChildSize: 0.95,
          builder: (_, controller) => Container(
            decoration: const BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
            ),
            padding: const EdgeInsets.all(24),
            child: ListView(
              controller: controller,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'تعديل ${_product['name'] ?? ''}',
                      style: const TextStyle(
                          color: AppColors.text,
                          fontSize: 20,
                          fontWeight: FontWeight.w900),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close_rounded, color: AppColors.text),
                    ),
                  ],
                ),
                const Divider(color: AppColors.border, height: 32),
                _inputField('اسم المنتج', _name, Icons.label_rounded),
                _inputField('كود المنتج', _barcode, Icons.qr_code_rounded),
                Row(
                  children: [
                    Expanded(
                        child: _inputField(
                            'سعر الشراء', _buyPrice, Icons.download_rounded, true)),
                    const SizedBox(width: 16),
                    Expanded(
                        child: _inputField(
                            'سعر البيع', _sellPrice, Icons.sell_rounded, true)),
                  ],
                ),
                Row(
                  children: [
                    Expanded(
                        child: _inputField(
                            'الكمية', _stockQty, Icons.inventory_rounded, true)),
                    const SizedBox(width: 16),
                    Expanded(
                        child: _inputField('الحد الأدنى', _minAlert,
                            Icons.notifications_active_rounded, true)),
                  ],
                ),
                const SizedBox(height: 32),
                _saving
                    ? const Center(child: CircularProgressIndicator())
                    : ElevatedButton(
                        onPressed: () async {
                          setModalState(() => _saving = true);
                          await _saveEdit();
                          // Modal is popped in _saveEdit upon success
                          if (mounted) setModalState(() => _saving = false);
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 18),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16)),
                          elevation: 5,
                        ),
                        child: const Text(
                          'تحديث',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ),
                const SizedBox(height: 50),
              ],
            ),
          ),
        );
      }
    );
  }

  Widget _inputField(String label, TextEditingController ctrl, IconData icon,
      [bool isNum = false]) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: const TextStyle(
                  color: AppColors.textLight,
                  fontSize: 12,
                  fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          TextField(
            controller: ctrl,
            keyboardType: isNum ? TextInputType.number : TextInputType.text,
            style: const TextStyle(color: AppColors.text),
            decoration: InputDecoration(
              prefixIcon:
                  Icon(icon, color: AppColors.primary.withValues(alpha: 0.6)),
              filled: true,
              fillColor: AppColors.bg.withValues(alpha: 0.5),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(15),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(15),
                borderSide: const BorderSide(color: AppColors.primary),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
