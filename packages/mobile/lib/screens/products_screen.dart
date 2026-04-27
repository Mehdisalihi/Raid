import 'package:flutter/material.dart';
import '../core/api_service.dart';
import '../core/theme.dart';
import '../core/format_utils.dart';
import '../core/app_localizations.dart';
import 'product_detail_screen.dart';
import '../widgets/barcode_scanner_widget.dart';

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key});
  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  List<dynamic> _products = [];
  bool _loading = true;
  String _search = '';
  bool _showModal = false;
  bool _saving = false;
  Map<String, dynamic>? _editing;
  List<dynamic> _warehouses = [];
  String? _warehouseFilter; // null means ALL (Global)
  String? _selectedWarehouseId; // For new product creation

  final _name = TextEditingController();
  final _barcode = TextEditingController();
  final _buyPrice = TextEditingController();
  final _sellPrice = TextEditingController();
  final _stockQty = TextEditingController();
  final _minAlert = TextEditingController(text: '5');

  double get _totalValue {
    try {
      return _products.fold(0.0, (sum, p) {
        final qty = double.tryParse(p['stockQty']?.toString() ?? '0') ?? 0.0;
        final price = double.tryParse(p['buyPrice']?.toString() ?? '0') ?? 0.0;
        return sum + (qty * price);
      });
    } catch (_) {
      return 0.0;
    }
  }

  int get _lowStockCount {
    try {
      return _products.where((p) {
        final qty = double.tryParse(p['stockQty']?.toString() ?? '0') ?? 0.0;
        final min = double.tryParse(p['minStockAlert']?.toString() ?? '5') ?? 5.0;
        return qty <= min;
      }).length;
    } catch (_) {
      return 0;
    }
  }

  @override
  void initState() {
    super.initState();
    _fetch();
    DataSync.notifier.addListener(_fetch);
  }

  Future<void> _fetch() async {
    try {
      final results = await Future.wait([
        ApiService.get('/products${_warehouseFilter != null ? '?warehouseId=$_warehouseFilter' : ''}'),
        WarehouseService.getAll(),
      ]);
      if (mounted) {
        setState(() {
          _products = results[0] as List;
          _warehouses = results[1] as List;
          if (_selectedWarehouseId == null && _warehouses.isNotEmpty) {
            _selectedWarehouseId = _warehouses[0]['id'].toString();
          }
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${context.tr('errorLoadingData')}: $e'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    }
    if (mounted) setState(() => _loading = false);
  }

  List<dynamic> get _filtered => _products.where((p) {
        final s = _search.toLowerCase();
        return (p['name'] ?? '').toString().toLowerCase().contains(s) ||
            (p['barcode'] ?? '').toString().contains(s);
      }).toList();

  void _openModal([Map<String, dynamic>? product]) {
    _editing = product;
    if (product != null) {
      _name.text = product['name']?.toString() ?? '';
      _barcode.text = product['barcode']?.toString() ?? '';
      _buyPrice.text = product['buyPrice']?.toString() ?? '';
      _sellPrice.text = product['sellPrice']?.toString() ?? '';
      _stockQty.text = product['stockQty']?.toString() ?? '';
      _minAlert.text = product['minStockAlert']?.toString() ?? '5';
    } else {
      _name.clear();
      _barcode.clear();
      _buyPrice.clear();
      _sellPrice.clear();
      _stockQty.clear();
      _minAlert.text = '5';
    }
    setState(() => _showModal = true);
  }

  Future<void> _save() async {
    if (_name.text.trim().isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('productNameRequired'))));
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
      if (_editing == null) 'warehouseId': _selectedWarehouseId,
    };
    try {
      if (_editing != null) {
        await ProductService.update(_editing!['id'], body);
      } else {
        await ProductService.create(body);
      }
      setState(() => _showModal = false);
      _fetch();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(context.tr('saveProductFailed')),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _delete(dynamic id) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text(
          context.tr('deleteProduct'),
          style: const TextStyle(color: AppColors.text),
        ),
        content: Text(
          context.tr('confirmDeleteProduct'),
          style: const TextStyle(color: AppColors.textMuted),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(context.tr('cancel')),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(context.tr('delete'), style: const TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ProductService.delete(id);
      _fetch();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(context.tr('deleteProductFailedLinked')),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    }
  }

  @override
  void dispose() {
    DataSync.notifier.removeListener(_fetch);
    _name.dispose();
    _barcode.dispose();
    _buyPrice.dispose();
    _sellPrice.dispose();
    _stockQty.dispose();
    _minAlert.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : Column(
                children: [
                   _buildHeader(),
                   _buildWarehouseFilter(),
                   _buildStatsRow(),
                   _buildSearchBar(),
                   Expanded(child: _buildProductList()),
                 ],
              ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openModal(),
        elevation: 10,
        backgroundColor: AppColors.primary,
        child: Container(
          width: 60,
          height: 60,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: AppColors.primaryGradient,
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withValues(alpha: 0.1),
                blurRadius: 12,
                offset: const Offset(0, 4),
              )
            ],
          ),
          child: const Icon(Icons.add_rounded, color: Colors.white, size: 30),
        ),
      ),
      bottomSheet: _showModal ? _buildAddEditModal() : null,
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                context.tr('products'),
                style: const TextStyle(
                    color: AppColors.text,
                    fontSize: 24,
                    fontWeight: FontWeight.w900),
              ),
              Text(
                context.tr('inventory'),
                style: const TextStyle(color: AppColors.textLight, fontSize: 13),
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(15),
            ),
            child: Icon(Icons.inventory_2_rounded,
                color: AppColors.primary, size: 28),
          ),
        ],
      ),
    );
  }

  Widget _buildWarehouseFilter() {
    return Container(
      height: 40,
      margin: const EdgeInsets.only(bottom: 10),
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        children: [
          _filterChip(null, context.tr('allWarehouses')),
          ..._warehouses.map((w) => _filterChip(w['id'].toString(), w['name'])),
        ],
      ),
    );
  }

  Widget _filterChip(String? id, String label) {
    final active = _warehouseFilter == id;
    return GestureDetector(
      onTap: () {
        setState(() {
          _warehouseFilter = id;
          _loading = true;
        });
        _fetch();
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(left: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: active ? AppColors.primary : AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: active ? AppColors.primary : AppColors.border),
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              color: active ? Colors.white : AppColors.textMuted,
              fontWeight: active ? FontWeight.bold : FontWeight.normal,
              fontSize: 12,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatsRow() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      child: Row(
        children: [
          Expanded(
            child: _statCard(
              context.tr('inventoryValue'),
              FormatUtils.formatNumber(_totalValue),
              'MRU',
              AppColors.success,
              Icons.account_balance_wallet_rounded,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _statCard(
              context.tr('stockShortage'),
              FormatUtils.formatNumber(_lowStockCount),
              context.tr('alert'),
              AppColors.danger,
              Icons.warning_amber_rounded,
            ),
          ),
        ],
      ),
    );
  }

  Widget _statCard(
      String label, String val, String unit, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 10,
                        fontWeight: FontWeight.bold)),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(val,
                        style: const TextStyle(
                            color: AppColors.text,
                            fontSize: 18,
                            fontWeight: FontWeight.w900)),
                    const SizedBox(width: 4),
                    Text(unit, style: TextStyle(color: color, fontSize: 10)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: TextField(
        onChanged: (v) => setState(() => _search = v),
        style: const TextStyle(color: AppColors.text),
        decoration: InputDecoration(
          hintText: context.tr('search'),
          hintStyle: const TextStyle(color: AppColors.textLight),
          prefixIcon:
              Icon(Icons.search_rounded, color: AppColors.primary),
          suffixIcon: IconButton(
            icon: Icon(Icons.qr_code_scanner_rounded,
                color: AppColors.primary),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => BarcodeScannerWidget(
                    onScan: (code) {
                      setState(() => _search = code);
                    },
                  ),
                ),
              );
            },
          ),
          filled: true,
          fillColor: AppColors.surface,
          contentPadding: const EdgeInsets.symmetric(vertical: 16),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(20),
            borderSide: const BorderSide(color: AppColors.border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(20),
            borderSide: BorderSide(color: AppColors.primary, width: 2),
          ),
        ),
      ),
    );
  }

  Widget _buildProductList() {
    if (_filtered.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inventory_2_outlined,
                size: 80, color: AppColors.textLight.withValues(alpha: 0.3)),
            const SizedBox(height: 16),
            Text(context.tr('noItemsFound'),
                style: const TextStyle(color: AppColors.textLight)),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _fetch,
              icon: const Icon(Icons.refresh_rounded),
              label: Text(context.tr('refresh')),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
      itemCount: _filtered.length,
      itemBuilder: (context, index) {
        final p = _filtered[index];
        final qty = double.tryParse(p['stockQty']?.toString() ?? '0') ?? 0.0;
        final min = double.tryParse(p['minStockAlert']?.toString() ?? '5') ?? 5.0;
        final isLow = qty <= min;

        return Container(
          decoration: BoxDecoration(
            color: isLow
                ? AppColors.danger.withValues(alpha: 0.05)
                : Colors.transparent,
            border: Border(
              bottom: BorderSide(
                color: AppColors.border.withValues(alpha: 0.3),
                width: 0.5,
              ),
            ),
          ),
          child: ListTile(
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            onTap: () async {
              await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => ProductDetailScreen(product: p),
                ),
              );
              _fetch();
            },
            leading: Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: isLow
                    ? AppColors.danger.withValues(alpha: 0.1)
                    : AppColors.primary.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Icon(
                isLow ? Icons.warning_rounded : Icons.inventory_2_rounded,
                color: isLow ? AppColors.danger : AppColors.primary,
              ),
            ),
            title: Text(
              p['name'] ?? context.tr('guest'),
              style: const TextStyle(
                  color: AppColors.text,
                  fontWeight: FontWeight.w800,
                  fontSize: 15),
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: 8, bottom: 8),
                  child: Row(
                    children: [
                      _miniLabel(
                        p['barcode']?.toString() ?? 'N/A',
                        AppColors.primary,
                      ),
                      const SizedBox(width: 8),
                      _miniLabel(
                        '${context.tr('stock')}: ${FormatUtils.formatQuantity(p['stockQty'])}',
                        isLow ? AppColors.danger : AppColors.success,
                      ),
                    ],
                  ),
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextButton.icon(
                      icon: const Icon(Icons.edit_rounded, size: 16),
                      label: Text(context.tr('edit'), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      style: TextButton.styleFrom(
                        foregroundColor: AppColors.primary, 
                        padding: const EdgeInsets.symmetric(horizontal: 8), 
                        minimumSize: const Size(50, 30),
                        backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: () => _openModal(p),
                    ),
                    const SizedBox(width: 8),
                    TextButton.icon(
                      icon: const Icon(Icons.delete_outline_rounded, size: 16),
                      label: Text(context.tr('delete'), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      style: TextButton.styleFrom(
                        foregroundColor: AppColors.danger, 
                        padding: const EdgeInsets.symmetric(horizontal: 8), 
                        minimumSize: const Size(50, 30),
                        backgroundColor: AppColors.danger.withValues(alpha: 0.1),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: () => _delete(p['id']),
                    ),
                  ],
                ),
              ],
            ),
            trailing: Column(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  FormatUtils.formatCurrency(p['sellPrice']),
                  style: const TextStyle(
                    color: AppColors.success,
                    fontWeight: FontWeight.w900,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 8),
                const Icon(Icons.arrow_forward_ios_rounded,
                    size: 14, color: AppColors.textLight),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _miniLabel(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        text,
        style:
            TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildAddEditModal() {
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
                  _editing == null
                      ? context.tr('addProduct')
                      : '${context.tr('edit')} ${_editing!['name'] ?? ''}',
                  style: const TextStyle(
                      color: AppColors.text,
                      fontSize: 20,
                      fontWeight: FontWeight.w900),
                ),
                IconButton(
                  onPressed: () => setState(() => _showModal = false),
                  icon: const Icon(Icons.close_rounded, color: AppColors.text),
                ),
              ],
            ),
            const Divider(color: AppColors.border, height: 32),
            _inputField(context.tr('productName'), _name, Icons.label_rounded),
            _inputField(context.tr('productCode'), _barcode, Icons.qr_code_rounded),
            Row(
              children: [
                Expanded(
                    child: _inputField(
                        context.tr('purchasePrice'), _buyPrice, Icons.download_rounded, true)),
                const SizedBox(width: 16),
                Expanded(
                    child: _inputField(
                        context.tr('sellPrice'), _sellPrice, Icons.sell_rounded, true)),
              ],
            ),
            Row(
              children: [
                Expanded(
                    child: _inputField(
                        context.tr('availableQty'), _stockQty, Icons.inventory_rounded, true)),
                const SizedBox(width: 16),
                Expanded(
                    child: _inputField(context.tr('minAlert'), _minAlert,
                        Icons.notifications_active_rounded, true)),
              ],
            ),
            if (_editing == null) ...[
              const SizedBox(height: 16),
              Text(context.tr('initialStockDeposit'),
                  style: const TextStyle(
                      color: AppColors.textLight,
                      fontSize: 12,
                      fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: AppColors.bg.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(15),
                  border: Border.all(color: AppColors.border),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedWarehouseId,
                    isExpanded: true,
                    items: _warehouses.map((w) => DropdownMenuItem(
                      value: w['id'].toString(),
                      child: Text(w['name']),
                    )).toList(),
                    onChanged: (v) => setState(() => _selectedWarehouseId = v),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 32),
            _saving
                ? const Center(child: CircularProgressIndicator())
                : ElevatedButton(
                    onPressed: _save,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 18),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16)),
                      elevation: 5,
                    ),
                    child: Text(
                      context.tr('save'),
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ),
            const SizedBox(height: 50),
          ],
        ),
      ),
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
                borderSide: BorderSide(color: AppColors.primary),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
