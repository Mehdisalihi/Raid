import 'package:flutter/material.dart';
import '../core/api_service.dart';
import '../core/theme.dart';
import '../core/format_utils.dart';
import '../core/app_localizations.dart';

class PurchasesScreen extends StatefulWidget {
  const PurchasesScreen({super.key});
  @override
  State<PurchasesScreen> createState() => _PurchasesScreenState();
}

class _PurchasesScreenState extends State<PurchasesScreen> {
  List<dynamic> _products = [];
  List<dynamic> _suppliers = [];
  List<dynamic> _purchases = [];
  List<Map<String, dynamic>> _cart = [];
  String _search = '';
  String? _supplierName;
  String _supplierId = '';
  bool _loading = true;
  bool _saving = false;
  bool _showCart = false;
  int _tabIndex = 0; // 0: Buy, 1: History

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    try {
      final results = await Future.wait([
        PurchaseService.getAll(),
        ProductService.getAll(),
        SupplierService.getAll(),
      ]);
      if (mounted) {
        setState(() {
          _purchases = results[0];
          _products = results[1];
          _suppliers = results[2];
        });
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  List<dynamic> get _filtered => _products.where((p) {
        final name = (p['name'] ?? '').toLowerCase();
        final barcode = (p['barcode'] ?? '');
        return name.contains(_search.toLowerCase()) ||
            barcode.contains(_search);
      }).toList();

  void _addToCart(Map<String, dynamic> product) {
    setState(() {
      final idx = _cart.indexWhere((i) => i['id'] == product['id']);
      if (idx >= 0) {
        _cart[idx] = {..._cart[idx], 'qty': _cart[idx]['qty'] + 1};
      } else {
        _cart.add({
          ...product,
          'qty': 1,
          'purchasePrice': product['buyPrice'] ?? 0.0,
        });
      }
    });
  }

  void _updateQty(dynamic id, int delta) {
    setState(() {
      _cart = _cart.map((i) {
        if (i['id'] == id) {
          final newQty = (i['qty'] as int) + delta;
          return {...i, 'qty': newQty < 1 ? 1 : newQty};
        }
        return i;
      }).toList();
    });
  }

  void _removeItem(dynamic id) =>
      setState(() => _cart.removeWhere((i) => i['id'] == id));

  double get _total =>
      _cart.fold(0.0, (s, i) => s + (i['buyPrice'] ?? 0) * (i['qty'] as int));

  Future<void> _savePurchase() async {
    if (_cart.isEmpty) return;
    setState(() => _saving = true);
    try {
      await PurchaseService.create({
        'supplierId': _supplierId.isEmpty ? null : _supplierId,
        'supplierName': _supplierName,
        'items': _cart,
        'total': _total,
        'date': DateTime.now().toIso8601String().split('T')[0],
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✅ ${context.tr('purchaseSuccess')}'),
            backgroundColor: AppColors.success,
          ),
        );
        setState(() {
          _cart.clear();
          _showCart = false;
        });
        _fetch();
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ ${context.tr('purchaseFailed')}'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
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
                  _buildStatsRow(),
                  _buildTabs(),
                  Expanded(
                    child: _tabIndex == 0 ? _buildBuyTab() : _buildHistoryTab(),
                  ),
                ],
              ),
      ),
      floatingActionButton: _tabIndex == 0 && _cart.isNotEmpty
          ? FloatingActionButton.extended(
              onPressed: () => setState(() => _showCart = true),
              label: Text('${context.tr('purchasesCart')} (${_cart.length})'),
              icon: const Icon(Icons.shopping_basket_rounded),
              backgroundColor: AppColors.secondary,
            )
          : null,
      bottomSheet: _showCart ? _buildCartSheet() : null,
    );
  }

  void _openSupplierPicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
      ),
      builder: (_) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Text(
              context.tr('selectSupplier'),
              style: const TextStyle(
                  color: AppColors.text,
                  fontSize: 20,
                  fontWeight: FontWeight.bold),
            ),
            const Divider(),
            ListTile(
              leading: const CircleAvatar(child: Icon(Icons.business_outlined)),
              title: Text(context.tr('generalSupplier'),
                  style: const TextStyle(color: AppColors.text)),
              onTap: () {
                setState(() {
                  _supplierName = context.tr('generalSupplier');
                  _supplierId = '';
                });
                Navigator.pop(context);
              },
            ),
            Expanded(
              child: ListView.builder(
                itemCount: _suppliers.length,
                itemBuilder: (context, index) {
                  final s = _suppliers[index];
                  return ListTile(
                    leading:
                        const CircleAvatar(child: Icon(Icons.store_rounded)),
                    title: Text(s['name'] ?? '',
                        style: const TextStyle(color: AppColors.text)),
                    onTap: () {
                      setState(() {
                        _supplierName = s['name'];
                        _supplierId = s['id'].toString();
                      });
                      Navigator.pop(context);
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
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
                _tabIndex == 0 ? context.tr('newPurchase') : context.tr('purchaseHistory'),
                style: const TextStyle(
                    color: AppColors.text,
                    fontSize: 24,
                    fontWeight: FontWeight.w900),
              ),
              Text(
                _tabIndex == 0
                    ? context.tr('addItemsToStock')
                    : context.tr('reviewPastPurchases'),
                style:
                    const TextStyle(color: AppColors.textLight, fontSize: 13),
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.secondary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(15),
            ),
            child: Icon(
                _tabIndex == 0
                    ? Icons.add_shopping_cart_rounded
                    : Icons.history_rounded,
                color: AppColors.secondary,
                size: 28),
          ),
        ],
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
              context.tr('totalPurchases'),
              FormatUtils.formatNumber(_purchases.fold(
                      0.0,
                      (sum, p) =>
                          sum +
                          (double.tryParse(p['total']?.toString() ?? '0') ??
                              0))),
              'MRU',
              AppColors.secondary,
              Icons.trending_up_rounded,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _statCard(
              context.tr('suppliers'),
              FormatUtils.formatNumber(_suppliers.length),
              context.tr('supplierUnit'),
              AppColors.success,
              Icons.business_rounded,
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

  Widget _buildTabs() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      child: Container(
        height: 50,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(15),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            _tabItem(context.tr('purchase'), 0),
            _tabItem(context.tr('archive'), 1),
          ],
        ),
      ),
    );
  }

  Widget _tabItem(String label, int index) {
    final active = _tabIndex == index;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _tabIndex = index),
        child: Container(
          decoration: BoxDecoration(
            color: active ? AppColors.secondary : Colors.transparent,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                color: active ? Colors.white : AppColors.textLight,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBuyTab() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 5),
          child: InkWell(
            onTap: _openSupplierPicker,
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.secondary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(15),
                border: Border.all(
                    color: AppColors.secondary.withValues(alpha: 0.2)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.business_center_rounded,
                      color: AppColors.secondary),
                  const SizedBox(width: 10),
                  Text(
                    '${context.tr('supplier')}: ${_supplierName ?? context.tr('generalSupplier')}',
                    style: const TextStyle(
                        color: AppColors.secondary,
                        fontWeight: FontWeight.bold),
                  ),
                  const Spacer(),
                  const Icon(Icons.arrow_drop_down, color: AppColors.secondary),
                ],
              ),
            ),
          ),
        ),
        _buildSearchBar(),
        Expanded(child: _buildProductGrid()),
      ],
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: TextField(
        onChanged: (v) => setState(() => _search = v),
        style: const TextStyle(color: AppColors.text),
        decoration: InputDecoration(
          hintText: context.tr('purchaseSearchHint'),
          prefixIcon:
              const Icon(Icons.search_rounded, color: AppColors.secondary),
          filled: true,
          fillColor: AppColors.surface,
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(20),
            borderSide: const BorderSide(color: AppColors.border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(20),
            borderSide: const BorderSide(color: AppColors.secondary),
          ),
        ),
      ),
    );
  }

  Widget _buildProductGrid() {
    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: _filtered.length,
      itemBuilder: (context, index) {
        final p = _filtered[index];
        final inCart = _cart.any((i) => i['id'] == p['id']);
        return Container(
          decoration: BoxDecoration(
            color: inCart
                ? AppColors.secondary.withValues(alpha: 0.05)
                : Colors.transparent,
            border: Border(
                bottom: BorderSide(
                    color: AppColors.border.withValues(alpha: 0.5), width: 1)),
          ),
          child: ListTile(
            contentPadding: const EdgeInsets.all(16),
            onTap: () => _addToCart(p),
            leading: Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                color: AppColors.secondary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(15),
              ),
              child: const Icon(Icons.add_business_rounded,
                  color: AppColors.secondary),
            ),
            title: Text(p['name'] ?? '',
                style: const TextStyle(
                    color: AppColors.text, fontWeight: FontWeight.bold)),
            subtitle: Text(
                '${context.tr('purchasePrice')}: ${FormatUtils.formatNumber(p['buyPrice'])} MRU | ${context.tr('current')}: ${FormatUtils.formatQuantity(p['stockQty'])}',
                style:
                    const TextStyle(color: AppColors.textLight, fontSize: 13)),
            trailing: Icon(
                inCart
                    ? Icons.check_circle_rounded
                    : Icons.add_circle_outline_rounded,
                color: inCart ? AppColors.success : AppColors.secondary),
          ),
        );
      },
    );
  }

  Widget _buildHistoryTab() {
    if (_purchases.isEmpty) {
      return Center(
          child: Text(context.tr('noPurchaseHistory'),
              style: const TextStyle(color: AppColors.textLight)));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: _purchases.length,
      itemBuilder: (context, index) {
        final p = _purchases[index];
        return Container(
          decoration: BoxDecoration(
            border: Border(
                bottom: BorderSide(
                    color: AppColors.border.withValues(alpha: 0.5), width: 1)),
          ),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: AppColors.secondary.withValues(alpha: 0.1),
              child: const Icon(Icons.receipt_long_rounded,
                  color: AppColors.secondary, size: 20),
            ),
            title: Text(p['supplierName'] ?? context.tr('generalSupplier'),
                style: const TextStyle(
                    color: AppColors.text, fontWeight: FontWeight.bold)),
            subtitle: Text('${context.tr('value')}: ${FormatUtils.formatCurrency(p['total'])} | ${FormatUtils.formatDate(p['date'])}',
                style:
                    const TextStyle(color: AppColors.textLight, fontSize: 13)),
            trailing: const Icon(Icons.info_outline_rounded,
                size: 20, color: AppColors.textLight),
          ),
        );
      },
    );
  }

  Widget _buildCartSheet() {
    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      builder: (_, controller) => Container(
        decoration: const BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(context.tr('depositPurchases'),
                    style: const TextStyle(
                        color: AppColors.text,
                        fontSize: 20,
                        fontWeight: FontWeight.w900)),
                IconButton(
                    onPressed: () => setState(() => _showCart = false),
                    icon: const Icon(Icons.close_rounded)),
              ],
            ),
            const Divider(),
            Expanded(
              child: ListView.builder(
                controller: controller,
                itemCount: _cart.length,
                itemBuilder: (context, index) {
                  final i = _cart[index];
                  return ListTile(
                    title: Text(i['name'] ?? '',
                        style: const TextStyle(
                            color: AppColors.text,
                            fontWeight: FontWeight.bold)),
                    subtitle: Text('${context.tr('purchasePrice')}: ${FormatUtils.formatCurrency(i['buyPrice'])}'),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _qtyBtn(Icons.remove_rounded,
                            () => _updateQty(i['id'], -1)),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          child: Text(FormatUtils.formatQuantity(i['qty']),
                              style: const TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 16)),
                        ),
                        _qtyBtn(
                            Icons.add_rounded, () => _updateQty(i['id'], 1)),
                        const SizedBox(width: 8),
                        IconButton(
                            icon: const Icon(Icons.delete_outline_rounded,
                                color: AppColors.danger),
                            onPressed: () => _removeItem(i['id'])),
                      ],
                    ),
                  );
                },
              ),
            ),
            const Divider(),
            _buildCheckoutSection(),
          ],
        ),
      ),
    );
  }

  Widget _qtyBtn(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: AppColors.bg,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.border),
        ),
        child: Icon(icon, size: 18, color: AppColors.secondary),
      ),
    );
  }

  Widget _buildCheckoutSection() {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(context.tr('totalDue'),
                style: const TextStyle(color: AppColors.textMuted)),
            Text(FormatUtils.formatCurrency(_total),
                style: const TextStyle(
                    color: AppColors.text,
                    fontWeight: FontWeight.w900,
                    fontSize: 20)),
          ],
        ),
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: _saving ? null : _savePurchase,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.secondary,
            minimumSize: const Size(double.infinity, 56),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            elevation: 8,
            shadowColor: AppColors.secondary.withValues(alpha: 0.3),
          ),
          child: _saving
              ? const CircularProgressIndicator(color: Colors.white)
              : Text(context.tr('confirmDeposit'),
                  style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16)),
        ),
      ],
    );
  }
}
