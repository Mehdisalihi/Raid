import 'package:flutter/material.dart';
import '../core/api_service.dart';
import '../core/theme.dart';
import '../core/format_utils.dart';
import '../core/app_localizations.dart';
import '../widgets/barcode_scanner_widget.dart';

class SalesScreen extends StatefulWidget {
  final Map<String, dynamic>? invoiceToEdit;
  const SalesScreen({super.key, this.invoiceToEdit});
  @override
  State<SalesScreen> createState() => _SalesScreenState();
}

class _SalesScreenState extends State<SalesScreen> {
  List<dynamic> _products = [];
  List<dynamic> _customers = [];
  List<dynamic> _sales = [];
  List<Map<String, dynamic>> _cart = [];
  String _search = '';
  String? _customerName;
  bool _loading = true;
  bool _saving = false;
  bool _showCart = false;
  bool _isDebt = false;
  double _taxRate = 16.0;
  String _paymentMethod = 'cash';
  List<dynamic> _warehouses = [];
  String? _selectedWarehouseId;
  final _discountCtrl = TextEditingController(text: '0');
  int _tabIndex = 0; // 0: POS, 1: History
  String? _editingInvoiceId;
  String _filterDate = DateTime.now().toIso8601String().split('T')[0];
  String _filterPayment = 'all';

  @override
  void initState() {
    super.initState();
    if (widget.invoiceToEdit != null) {
      _loadInvoiceForEdit(widget.invoiceToEdit!);
    }
    _fetch();
    DataSync.notifier.addListener(_fetch);
  }

  void _loadInvoiceForEdit(Map<String, dynamic> inv) {
    _editingInvoiceId = inv['id'];
    _customerName = inv['customer']?['name'];
    _isDebt = inv['isDebt'] ?? false;
    _taxRate = (inv['taxRate'] ?? 16.0).toDouble();
    _paymentMethod = inv['paymentMethod'] ?? 'cash';
    _selectedWarehouseId = inv['warehouseId'];
    
    _cart = ((inv['items'] as List?) ?? []).map((item) {
      return {
        'id': item['productId'],
        'name': item['product']?['name'] ?? '',
        'sellPrice': (item['price'] ?? 0.0).toDouble(),
        'qty': item['qty'] ?? 1,
      };
    }).toList();
  }

  Future<void> _fetch() async {
    try {
      final results = await Future.wait([
        SaleService.getAll(date: _filterDate, paymentMethod: _filterPayment),
        ProductService.getAll(),
        CustomerService.getAll(),
        WarehouseService.getAll(),
      ]);
      if (mounted) {
        setState(() {
          _sales = results[0];
          _products = results[1];
          _customers = results[2];
          _warehouses = results[3];
          if (_selectedWarehouseId == null && _warehouses.isNotEmpty) {
            _selectedWarehouseId = _warehouses[0]['id'].toString();
          }
          _customerName ??= context.tr('cashCustomer');
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
      final taxAmt = _total * (_taxRate / 100);
      final discount = double.tryParse(_discountCtrl.text) ?? 0.0;
      final finalAmt = _total + taxAmt - discount;

      final payload = {
        'customerName': _customerName ?? context.tr('cashCustomer'),
        'cart': _cart,
        'totalAmount': _total,
        'taxRate': _taxRate,
        'taxAmount': taxAmt,
        'discount': discount,
        'finalAmount': finalAmt,
        'isDebt': _isDebt,
        'paymentMethod': _paymentMethod,
        'type': 'SALE',
        'warehouseId': _selectedWarehouseId,
        'date': DateTime.now().toIso8601String().split('T')[0],
      };

      if (_editingInvoiceId != null) {
        await SaleService.update(_editingInvoiceId, payload);
      } else {
        await SaleService.create(payload);
      }
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('✅ ${context.tr(_editingInvoiceId != null ? 'invoiceUpdated' : 'invoiceSaved')}'),
            backgroundColor: AppColors.success));
        setState(() {
          _cart = [];
          _saving = false;
          _editingInvoiceId = null;
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
                      style: TextStyle(
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
                    Icon(Icons.search_rounded, color: AppColors.primary),
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
          child: Row(
            children: [
              Expanded(
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
                          child: Icon(Icons.person_rounded,
                              color: AppColors.primary, size: 18),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            '${context.tr('customer')}: ${_customerName ?? context.tr('cashCustomer')}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                color: AppColors.text, fontWeight: FontWeight.w700),
                          ),
                        ),
                        const Icon(Icons.keyboard_arrow_down_rounded,
                            color: AppColors.textMuted),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _selectedWarehouseId,
                      isExpanded: true,
                      icon: Icon(Icons.warehouse_rounded, color: AppColors.primary, size: 18),
                      items: _warehouses.map((w) => DropdownMenuItem(
                        value: w['id'].toString(),
                        child: Text(w['name'], style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                      )).toList(),
                      onChanged: (v) => setState(() => _selectedWarehouseId = v),
                    ),
                  ),
                ),
              ),
            ],
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
                      style: TextStyle(
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
                            style: TextStyle(
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

  Widget _buildHistoryFilters() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 10),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () async {
                final d = await showDatePicker(
                  context: context,
                  initialDate: DateTime.parse(_filterDate),
                  firstDate: DateTime(2020),
                  lastDate: DateTime.now(),
                );
                if (d != null) {
                  setState(() => _filterDate = d.toIso8601String().split('T')[0]);
                  _fetch();
                }
              },
              icon: const Icon(Icons.calendar_today, size: 16),
              label: Text(FormatUtils.toLatinNumerals(_filterDate)),
              style: OutlinedButton.styleFrom(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _filterPayment,
                  isExpanded: true,
                  onChanged: (v) {
                    setState(() => _filterPayment = v!);
                    _fetch();
                  },
                  items: ['all', 'cash', 'bankily', 'masrvi'].map((m) => DropdownMenuItem(
                    value: m,
                    child: Text(context.tr(m), style: const TextStyle(fontSize: 12)),
                  )).toList(),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentSummary() {
    final Map<String, double> totals = {'cash': 0, 'bankily': 0, 'masrvi': 0};
    double grandTotal = 0;
    for (var s in _sales) {
      final amt = (s['finalAmount'] ?? 0).toDouble();
      grandTotal += amt;
      final m = s['paymentMethod'] ?? 'cash';
      if (totals.containsKey(m)) totals[m] = totals[m]! + amt;
    }

    return Container(
      height: 80,
      margin: const EdgeInsets.only(bottom: 10),
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        children: [
          _summaryCard(context.tr('total'), grandTotal, AppColors.primary),
          _summaryCard(context.tr('cash'), totals['cash']!, AppColors.success),
          _summaryCard('Bankily', totals['bankily']!, Colors.amber),
          _summaryCard('Masrvi', totals['masrvi']!, Colors.indigo),
        ],
      ),
    );
  }

  Widget _summaryCard(String title, double amount, Color color) {
    return Container(
      width: 120,
      margin: const EdgeInsets.only(right: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(title, style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          FittedBox(
            child: Text(FormatUtils.formatCurrency(amount),
                style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 15)),
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryItem(dynamic s) {
    final items = (s['items'] as List?) ?? [];
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        boxShadow: AppColors.premiumShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(s['customerName'] ?? context.tr('cashCustomer'),
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
              Text(FormatUtils.formatCurrency(s['finalAmount']),
                  style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w900)),
            ],
          ),
          const SizedBox(height: 12),
          ...items.map((it) => Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Row(
              children: [
                Icon(Icons.circle, size: 6, color: AppColors.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text('${it['product']?['name'] ?? it['productName'] ?? ''}',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                ),
                Text('× ${it['qty']}', style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
              ],
            ),
          )),
          const Divider(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('${FormatUtils.toLatinNumerals(s['createdAt']?.toString().split('T')[0] ?? '')} | ${s['paymentMethod']}',
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
              Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.edit_note_rounded, color: Colors.blue, size: 24),
                    onPressed: () {
                      setState(() {
                        _tabIndex = 0;
                        _loadInvoiceForEdit(s);
                      });
                    },
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_outline_rounded, color: AppColors.danger, size: 24),
                    onPressed: () => _delete(s['id']),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHistory() {
    return Column(
      children: [
        _buildHistoryFilters(),
        _buildPaymentSummary(),
        Expanded(
          child: _sales.isEmpty
              ? Center(child: Text(context.tr('noSales'), style: const TextStyle(color: AppColors.textLight)))
              : RefreshIndicator(
                  onRefresh: _fetch,
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                    itemCount: _sales.length,
                    itemBuilder: (context, index) {
                      return _buildHistoryItem(_sales[index]);
                    },
                  ),
                ),
        ),
      ],
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
                      style: TextStyle(
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
                          child: Icon(Icons.shopping_bag_outlined,
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
                                  style: TextStyle(
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
              Text(context.tr('subtotal'),
                  style: const TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 16,
                      fontWeight: FontWeight.w700)),
              Text(FormatUtils.formatCurrency(_total),
                  style: const TextStyle(
                      color: AppColors.text,
                      fontSize: 16,
                      fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(context.tr('taxRate'),
                  style: const TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 14,
                      fontWeight: FontWeight.w700)),
              SizedBox(
                width: 60,
                child: TextField(
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.end,
                  decoration: const InputDecoration(
                      suffixText: '%', border: InputBorder.none, isDense: true),
                  style: TextStyle(
                      fontWeight: FontWeight.w900,
                      color: AppColors.primary,
                      fontSize: 16),
                  onChanged: (v) {
                    setState(() => _taxRate = double.tryParse(v) ?? 0);
                  },
                  controller:
                      TextEditingController(text: _taxRate.toStringAsFixed(0)),
                ),
              ),
            ],
          ),
          const Divider(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(context.tr('total'),
                  style: const TextStyle(
                      color: AppColors.text,
                      fontSize: 18,
                      fontWeight: FontWeight.w900)),
              Text(FormatUtils.formatCurrency(_total * (1 + _taxRate / 100)),
                  style: TextStyle(
                      color: AppColors.primary,
                      fontSize: 26,
                      fontWeight: FontWeight.w900)),
            ],
          ),
          const SizedBox(height: 24),
          if (_customerName != context.tr('cashCustomer'))
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
                title: Text(context.tr('debtMethod'),
                    style: const TextStyle(
                        color: AppColors.text,
                        fontWeight: FontWeight.bold,
                        fontSize: 15)),
                subtitle: Text(context.tr('amountAddedToCustomer'),
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
                value: _isDebt,
                activeThumbColor: AppColors.warning,
                onChanged: (v) => setState(() => _isDebt = v),
                secondary: Icon(Icons.money_off_rounded,
                    color: _isDebt ? AppColors.warning : AppColors.textMuted),
              ),
            ),

          // Payment Method Selector
          if (!_isDebt) ...[
            Align(
              alignment: Alignment.centerRight,
              child: Text(context.tr('paymentMethod'),
                  style: const TextStyle(
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
                  _paymentMethodItem(context.tr('cash'), 'cash', Icons.money_rounded),
                  _paymentMethodItem('Bankily', 'bankily',
                      Icons.account_balance_wallet_rounded),
                  _paymentMethodItem(
                      'Masrvi', 'masrvi', Icons.account_balance_rounded),
                  _paymentMethodItem(context.tr('sedad'), 'sedad', Icons.payments_rounded),
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
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.check_circle_rounded),
                      const SizedBox(width: 12),
                      Text(context.tr('confirmSaleComplete'),
                          style: const TextStyle(
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
