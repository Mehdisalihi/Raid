import 'package:flutter/material.dart';
import '../core/api_service.dart';
import '../core/theme.dart';
import '../core/format_utils.dart';
import '../core/app_localizations.dart';
import 'invoice_detail_screen.dart';
import '../widgets/barcode_scanner_widget.dart';

class SalesScreen extends StatefulWidget {
  const SalesScreen({super.key});
  @override
  State<SalesScreen> createState() => _SalesScreenState();
}

class _SalesScreenState extends State<SalesScreen> {
  List<dynamic> _products = [];
  List<dynamic> _customers = [];
  List<dynamic> _sales = [];
  List<Map<String, dynamic>> _cart = [];
  String _search = '';
  String? _customerName; // Default value will be set in initState or tr()
  bool _loading = true;
  bool _saving = false;
  bool _showCart = false;
  bool _isDebt = false;
  String _paymentMethod = 'cash';
  double _discount = 0;
  final _discountCtrl = TextEditingController(text: '0');
  int _tabIndex = 0; // 0: POS, 1: History

  @override
  void initState() {
    super.initState();
    _fetch();
    DataSync.notifier.addListener(_fetch);
  }

  Future<void> _fetch() async {
    try {
      final results = await Future.wait([
        SaleService.getAll(),
        ProductService.getAll(),
        CustomerService.getAll(),
      ]);
      if (mounted) {
        setState(() {
          _sales = results[0];
          _products = results[1];
          _customers = results[2];
        });
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  void _openScanner() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => BarcodeScannerWidget(
          onScan: (code) {
            final p = _products.firstWhere(
              (p) => p['barcode'] == code,
              orElse: () => null,
            );
            if (p != null) {
              _addToCart(p);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('${context.tr('addedToCart')}: ${p['name']}'),
                  backgroundColor: AppColors.success,
                  duration: const Duration(seconds: 1),
                ),
              );
            } else {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(context.tr('productNotFound')),
                  backgroundColor: AppColors.danger,
                ),
              );
            }
          },
        ),
      ),
    );
  }

  Future<void> _delete(dynamic id) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surface,
        title:
            Text(context.tr('delete'), style: const TextStyle(color: AppColors.text)),
        content: Text(
          context.tr('confirmDelete'),
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
      await SaleService.delete(id);
      _fetch();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(context.tr('deleteFailed')),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    }
  }

  List<dynamic> get _filtered {
    if (_search.trim().isEmpty) return [];
    return _products.where((p) {
      final name = (p['name'] ?? '').toLowerCase();
      final barcode = (p['barcode'] ?? '');
      return name.contains(_search.toLowerCase()) || barcode.contains(_search);
    }).toList();
  }

  void _addToCart(Map<String, dynamic> product) {
    setState(() {
      final idx = _cart.indexWhere((i) => i['id'] == product['id']);
      if (idx >= 0) {
        _cart[idx] = {..._cart[idx], 'qty': _cart[idx]['qty'] + 1};
      } else {
        _cart.add({...product, 'qty': 1});
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
      _cart.fold(0.0, (s, i) => s + (i['sellPrice'] ?? 0) * (i['qty'] as int));

  Future<void> _saveSale() async {
    if (_cart.isEmpty) return;
    setState(() => _saving = true);
    try {
      await SaleService.create({
        'customerName': _customerName,
        'cart': _cart,
        'totalAmount': _total,
        'discount': _discount,
        'finalAmount': _total - _discount,
        'paymentMethod': _paymentMethod,
        'isDebt': _isDebt,
        'date': DateTime.now().toIso8601String().split('T')[0],
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✅ ${context.tr('saleSuccess')}'),
            backgroundColor: AppColors.success,
          ),
        );
        setState(() {
          _cart.clear();
          _showCart = false;
          _discount = 0;
          _discountCtrl.text = '0';
          _paymentMethod = 'cash';
          _isDebt = false;
        });
        _fetch();
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ ${context.tr('saleFailed')}'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  void dispose() {
    DataSync.notifier.removeListener(_fetch);
    _discountCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            _buildTabs(),
            if (_loading)
              const Expanded(child: Center(child: CircularProgressIndicator()))
            else
              Expanded(child: _tabIndex == 0 ? _buildPOS() : _buildHistory()),
          ],
        ),
      ),
      bottomSheet: _showCart ? _buildCartSheet() : null,
    );
  }

  void _openCustomerPicker() {
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
              context.tr('selectCustomer'),
              style: const TextStyle(
                  color: AppColors.text,
                  fontSize: 20,
                  fontWeight: FontWeight.bold),
            ),
            const Divider(),
            ListTile(
              leading: const CircleAvatar(child: Icon(Icons.person_outline)),
              title: Text(context.tr('cashCustomer'),
                  style: const TextStyle(color: AppColors.text)),
              onTap: () {
                setState(() => _customerName = context.tr('cashCustomer'));
                Navigator.pop(context);
              },
            ),
            Expanded(
              child: ListView.builder(
                itemCount: _customers.length,
                itemBuilder: (context, index) {
                  final c = _customers[index];
                  return ListTile(
                    leading: const CircleAvatar(child: Icon(Icons.person)),
                    title: Text(c['name'] ?? '',
                        style: const TextStyle(color: AppColors.text)),
                    onTap: () {
                      setState(() => _customerName = c['name']);
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
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 32, 24, 20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(32)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 20,
            offset: const Offset(0, 10),
          )
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _tabIndex == 0 ? context.tr('pos') : context.tr('invoiceHistory'),
                    style: const TextStyle(
                        color: AppColors.text,
                        fontSize: 28,
                        fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      _tabIndex == 0 ? context.tr('quickSales') : context.tr('financialArchive'),
                      style: const TextStyle(
                          color: AppColors.primary,
                          fontSize: 11,
                          fontWeight: FontWeight.w800),
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(18),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.3),
                      blurRadius: 12,
                      offset: const Offset(0, 6),
                    )
                  ],
                ),
                child: Icon(
                    _tabIndex == 0
                        ? Icons.point_of_sale_rounded
                        : Icons.history_rounded,
                    color: Colors.white,
                    size: 26),
              ),
            ],
          ),
          const SizedBox(height: 24),
          _buildSearchBar(),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Row(
      children: [
        Expanded(
          child: Container(
            decoration: BoxDecoration(
              color: AppColors.bg,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.border),
            ),
            child: TextField(
              onChanged: (v) => setState(() => _search = v),
              style: const TextStyle(color: AppColors.text, fontSize: 14),
              decoration: InputDecoration(
                hintText: context.tr('searchHint'),
                hintStyle: const TextStyle(color: AppColors.textMuted),
                prefixIcon:
                    const Icon(Icons.search_rounded, color: AppColors.primary),
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        GestureDetector(
          onTap: _openScanner,
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(Icons.qr_code_scanner_rounded,
                color: Colors.white, size: 24),
          ),
        ),
      ],
    );
  }

  Widget _buildTabs() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
      child: Row(
        children: [
          _tabItem(context.tr('newSale'), 0, Icons.add_shopping_cart_rounded),
          const SizedBox(width: 12),
          _tabItem(context.tr('operationLog'), 1, Icons.receipt_long_rounded),
        ],
      ),
    );
  }

  Widget _tabItem(String label, int index, IconData icon) {
    final active = _tabIndex == index;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _tabIndex = index),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: active ? AppColors.primary : AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            boxShadow: active
                ? [
                    BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.2),
                        blurRadius: 10,
                        offset: const Offset(0, 4))
                  ]
                : [],
            border: Border.all(
                color: active ? AppColors.primary : AppColors.border),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon,
                  color: active ? Colors.white : AppColors.textMuted, size: 18),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  color: active ? Colors.white : AppColors.textMuted,
                  fontSize: 13,
                  fontWeight: active ? FontWeight.bold : FontWeight.normal,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPOS() {
    return Column(
      children: [
        if (_cart.isNotEmpty) _buildDockedInvoiceSummary(),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          child: _buildSearchBar(),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          child: InkWell(
            onTap: _openCustomerPicker,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.person_rounded,
                        color: AppColors.primary, size: 18),
                  ),
                  const SizedBox(width: 12),
                   Text(
                    '${context.tr('customer')}: ${_customerName ?? context.tr('cashCustomer')}',
                    style: const TextStyle(
                        color: AppColors.text, fontWeight: FontWeight.w700),
                  ),
                  const Spacer(),
                  const Icon(Icons.keyboard_arrow_down_rounded,
                      color: AppColors.textMuted),
                ],
              ),
            ),
          ),
        ),
        Expanded(child: _buildPOSList()),
      ],
    );
  }

  Widget _buildDockedInvoiceSummary() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 20,
            offset: const Offset(0, 10),
          )
        ],
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(context.tr('totalInvoice'),
                      style: const TextStyle(
                          color: AppColors.textMuted,
                          fontSize: 10,
                          fontWeight: FontWeight.bold)),
                  Text(FormatUtils.formatCurrency(_total),
                      style: const TextStyle(
                          color: AppColors.primary,
                          fontSize: 18,
                          fontWeight: FontWeight.w900)),
                ],
              ),
              _qtyBtn(Icons.shopping_cart_rounded,
                  () => setState(() => _showCart = true)),
            ],
          ),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: _saving ? null : _saveSale,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.success,
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 44),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
              elevation: 0,
            ),
            child: _saving
                ? const SizedBox(
                    height: 18,
                    width: 18,
                    child: CircularProgressIndicator(
                        color: Colors.white, strokeWidth: 2))
                : Text(context.tr('confirmSale'),
                    style:
                        const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildPOSList() {
    if (_filtered.isEmpty) {
      return Center(
          child: Text(context.tr('noResults'),
              style: const TextStyle(color: AppColors.textMuted)));
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 100),
      itemCount: _filtered.length,
      itemBuilder: (context, index) {
        final p = _filtered[index];
        final inCart = _cart.any((i) => i['id'] == p['id']);
        return GestureDetector(
          onTap: () => _addToCart(p),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            decoration: BoxDecoration(
              color: inCart
                  ? AppColors.primary.withValues(alpha: 0.05)
                  : Colors.transparent,
              border: Border(
                bottom: BorderSide(
                  color: AppColors.border.withValues(alpha: 0.3),
                  width: 0.5,
                ),
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Center(
                    child: Icon(Icons.inventory_2_rounded,
                        color: inCart ? AppColors.primary : AppColors.border,
                        size: 30),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        p['name'] ?? '',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            color: AppColors.text,
                            fontWeight: FontWeight.w900,
                            fontSize: 15),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            FormatUtils.formatCurrency(p['sellPrice']),
                            style: const TextStyle(
                                color: AppColors.primary,
                                fontWeight: FontWeight.bold,
                                fontSize: 13),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.textMuted.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '${context.tr('qty')}: ${FormatUtils.formatNumber(p['stockQty'])}',
                              style: const TextStyle(
                                  color: AppColors.textMuted,
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildHistory() {
    if (_sales.isEmpty) {
      return Center(
          child: Text(context.tr('noSales'),
              style: const TextStyle(color: AppColors.textLight)));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: _sales.length,
      itemBuilder: (context, index) {
        final s = _sales[index];
        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(24),
            boxShadow: AppColors.premiumShadow,
          ),
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 12),
            onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) => InvoiceDetailScreen(sale: s))),
            leading: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.receipt_long_rounded,
                  color: AppColors.primary, size: 22),
            ),
            title: Text(s['customerName'] ?? context.tr('cashCustomer'),
                style: const TextStyle(
                    color: AppColors.text,
                    fontWeight: FontWeight.w900,
                    fontSize: 15)),
            subtitle: Text('${FormatUtils.toLatinNumerals(s['date']?.toString() ?? '')} | ${s['paymentMethod']}',
                style:
                    const TextStyle(color: AppColors.textMuted, fontSize: 12)),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(FormatUtils.formatCurrency(s['finalAmount']),
                        style: const TextStyle(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w800,
                            fontSize: 16)),
                    const Icon(Icons.chevron_left_rounded,
                        color: AppColors.textLight, size: 16),
                  ],
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.delete_outline_rounded,
                      color: AppColors.danger, size: 20),
                  onPressed: () => _delete(s['id']),
                ),
              ],
            ),
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
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(36)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 30,
              offset: const Offset(0, -10),
            )
          ],
        ),
        padding: const EdgeInsets.fromLTRB(28, 16, 28, 28),
        child: Column(
          children: [
            Container(
              width: 50,
              height: 5,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(context.tr('cart'),
                    style: const TextStyle(
                        color: AppColors.text,
                        fontSize: 24,
                        fontWeight: FontWeight.w900)),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text('${_cart.length} ${context.tr('items')}',
                      style: const TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w800,
                          fontSize: 12)),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Expanded(
              child: ListView.builder(
                controller: controller,
                itemCount: _cart.length,
                itemBuilder: (context, index) {
                  final i = _cart[index];
                  return Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.bg,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 50,
                          height: 50,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.shopping_bag_outlined,
                              color: AppColors.primary),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(i['name'],
                                  style: const TextStyle(
                                      color: AppColors.text,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15)),
                              Text(FormatUtils.formatCurrency(i['sellPrice']),
                                  style: const TextStyle(
                                      color: AppColors.primary,
                                      fontWeight: FontWeight.w800)),
                            ],
                          ),
                        ),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            _qtyBtn(Icons.remove_rounded,
                                () => _updateQty(i['id'], -1)),
                            Container(
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 8),
                              child: Text(FormatUtils.formatQuantity(i['qty']),
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w900,
                                      fontSize: 16)),
                            ),
                            _qtyBtn(Icons.add_rounded,
                                () => _updateQty(i['id'], 1)),
                            const SizedBox(width: 8),
                            IconButton(
                                icon: const Icon(Icons.delete_outline_rounded,
                                    color: AppColors.danger, size: 22),
                                onPressed: () => _removeItem(i['id'])),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 16),
            _buildCheckoutSection(),
          ],
        ),
      ),
    );
  }

  Widget _qtyBtn(IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.border),
        ),
        child: Icon(icon, size: 16, color: AppColors.text),
      ),
    );
  }

  Widget _buildCheckoutSection() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(28),
        boxShadow: AppColors.premiumShadow,
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('إجمالي الفاتورة',
                  style: TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 16,
                      fontWeight: FontWeight.w700)),
              Text(FormatUtils.formatCurrency(_total),
                  style: const TextStyle(
                      color: AppColors.primary,
                      fontSize: 22,
                      fontWeight: FontWeight.w900)),
            ],
          ),
          const SizedBox(height: 24),
          if (_customerName != 'عميل نقدي')
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: AppColors.bg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: _isDebt ? AppColors.warning : AppColors.border,
                ),
              ),
              child: SwitchListTile(
                title: const Text('بيع آجل (دين)',
                    style: TextStyle(
                        color: AppColors.text,
                        fontWeight: FontWeight.bold,
                        fontSize: 15)),
                subtitle: const Text('سيتم إضافة المبلغ لحساب العميل',
                    style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
                value: _isDebt,
                activeThumbColor: AppColors.warning,
                onChanged: (v) => setState(() => _isDebt = v),
                secondary: Icon(Icons.money_off_rounded,
                    color: _isDebt ? AppColors.warning : AppColors.textMuted),
              ),
            ),

          // Payment Method Selector
          if (!_isDebt) ...[
            const Align(
              alignment: Alignment.centerRight,
              child: Text('طريقة الدفع',
                  style: TextStyle(
                      color: AppColors.text,
                      fontWeight: FontWeight.bold,
                      fontSize: 15)),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 100,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  _paymentMethodItem('نقدية', 'cash', Icons.money_rounded),
                  _paymentMethodItem('Bankily', 'bankily',
                      Icons.account_balance_wallet_rounded),
                  _paymentMethodItem(
                      'Masrvi', 'masrvi', Icons.account_balance_rounded),
                  _paymentMethodItem('سداد', 'sedad', Icons.payments_rounded),
                  _paymentMethodItem(
                      'Bimbank', 'bimbank', Icons.account_balance_rounded),
                  _paymentMethodItem('Click', 'click', Icons.ads_click_rounded),
                  _paymentMethodItem(
                      'Amanty', 'amanty', Icons.security_rounded),
                  _paymentMethodItem(
                      'Gimtel', 'gimtel', Icons.account_tree_rounded),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],
          ElevatedButton(
            onPressed: _saving ? null : _saveSale,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 64),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20)),
              elevation: 8,
              shadowColor: AppColors.primary.withValues(alpha: 0.4),
            ),
            child: _saving
                ? const SizedBox(
                    height: 24,
                    width: 24,
                    child: CircularProgressIndicator(
                        color: Colors.white, strokeWidth: 2))
                : const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.check_circle_rounded),
                      SizedBox(width: 12),
                      Text('تأكيد وإتمام البيع',
                          style: TextStyle(
                              fontSize: 18, fontWeight: FontWeight.w900)),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _paymentMethodItem(String label, String value, IconData icon) {
    final active = _paymentMethod == value;
    return GestureDetector(
      onTap: () => setState(() => _paymentMethod = value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 80,
        margin: const EdgeInsets.only(left: 12),
        decoration: BoxDecoration(
          color:
              active ? AppColors.primary.withValues(alpha: 0.1) : AppColors.bg,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
              color: active ? AppColors.primary : AppColors.border,
              width: active ? 2 : 1),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon,
                color: active ? AppColors.primary : AppColors.textMuted,
                size: 28),
            const SizedBox(height: 8),
            Text(label,
                style: TextStyle(
                    color: active ? AppColors.primary : AppColors.textMuted,
                    fontSize: 11,
                    fontWeight: active ? FontWeight.bold : FontWeight.normal)),
          ],
        ),
      ),
    );
  }
}
