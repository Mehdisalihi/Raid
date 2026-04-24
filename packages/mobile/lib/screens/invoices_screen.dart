import 'package:flutter/material.dart';
import '../core/api_service.dart';
import '../core/theme.dart';
import '../core/format_utils.dart';
import '../core/app_localizations.dart';
import 'package:intl/intl.dart';

class InvoicesScreen extends StatefulWidget {
  const InvoicesScreen({super.key});
  @override
  State<InvoicesScreen> createState() => _InvoicesScreenState();
}

class _InvoicesScreenState extends State<InvoicesScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  List<dynamic> _products = [];
  List<dynamic> _customers = [];
  List<dynamic> _suppliers = [];
  List<dynamic> _warehouses = [];
  bool _loading = true;
  bool _saving = false;
  String? _selectedWarehouseId;

  // Cart for Sales (Daily/Debt)
  List<Map<String, dynamic>> _salesCart = [];
  // Cart for Product Input (Purchases)
  List<Map<String, dynamic>> _purchaseCart = [];

  String _selectedCustomerId = '';
  String _selectedCustomerName = '';
  String _selectedSupplierId = '';
  String _search = '';
  String _paymentMethod = 'cash';
  final List<String> _paymentMethods = [
    'cash',
    'bankily',
    'masrvi',
    'sedad',
    'amanty',
    'click',
    'bimbank',
    'gimtel'
  ];
  final _manualNameCtrl = TextEditingController();
  final _manualQtyCtrl = TextEditingController();
  final _manualPriceCtrl = TextEditingController();
  DateTime _manualDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
    _fetch();
    DataSync.notifier.addListener(_fetch);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    _manualNameCtrl.dispose();
    _manualQtyCtrl.dispose();
    _manualPriceCtrl.dispose();
    DataSync.notifier.removeListener(_fetch);
    super.dispose();
  }

  Future<void> _fetch() async {
    try {
      final results = await Future.wait([
        ProductService.getAll(),
        CustomerService.getAll(),
        SupplierService.getAll(),
        WarehouseService.getAll(),
      ]);
      if (mounted) {
        setState(() {
          _products = results[0];
          _customers = results[1];
          _suppliers = results[2];
          _warehouses = results[3];
          if (_selectedWarehouseId == null && _warehouses.isNotEmpty) {
            _selectedWarehouseId = _warehouses[0]['id'].toString();
          }
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<dynamic> get _filteredProducts => _products.where((p) {
        final name = (p['name'] ?? '').toLowerCase();
        final barcode = (p['barcode'] ?? '');
        return name.contains(_search.toLowerCase()) ||
            barcode.contains(_search);
      }).toList();

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
          backgroundColor: AppColors.bg,
          body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(context.tr('invoices'),
            style:
                const TextStyle(color: AppColors.text, fontWeight: FontWeight.w900)),
        bottom: TabBar(
          controller: _tabCtrl,
          indicatorColor: AppColors.primary,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textMuted,
          tabs: [
            Tab(text: context.tr('quotation')),
            Tab(text: context.tr('debtInvoice')),
            Tab(text: context.tr('creditInvoice')),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: [
          _buildSalesTab(isDebt: false),
          _buildSalesTab(isDebt: true),
          _buildPurchaseTab(),
        ],
      ),
    );
  }

  // ─── Sales Tab (Daily & Debt) ──────────────────────────────────────────────

  Widget _buildSalesTab({required bool isDebt}) {
    final cart = _salesCart;
    final total = cart.fold<double>(
        0.0, (s, i) => s + (i['sellPrice'] ?? 0) * (i['qty'] as int));

    return Column(
      children: [
        _buildCustomerSelector(isOptional: !isDebt),
        _buildWarehouseSelector(),
        if (!isDebt) _buildPaymentSelector(),
        _buildSearchBar(),
        if (cart.isNotEmpty) _buildCartGraph(cart, isPurchase: false),
        Expanded(
          child:
              _buildProductList(onAdd: (p) => _addToCart(p, isPurchase: false)),
        ),
        if (cart.isNotEmpty)
          _buildSummaryBar(total, () => _saveSale(isDebt), context.tr('confirmSale'), () {
            setState(() => _salesCart.clear());
          }),
      ],
    );
  }

  // ─── Purchase Tab ──────────────────────────────────────────────────────────

  Widget _buildPurchaseTab() {
    final cart = _purchaseCart;
    final total = cart.fold<double>(
        0.0, (s, i) => s + (i['purchasePrice'] ?? 0) * (i['qty'] as int));

    return Column(
      children: [
        _buildSupplierSelector(),
        _buildWarehouseSelector(),
        _buildManualEntryForm(),
        _buildSearchBar(),
        if (cart.isNotEmpty) _buildCartGraph(cart, isPurchase: true),
        Expanded(
          child:
              _buildProductList(onAdd: (p) => _addToCart(p, isPurchase: true)),
        ),
        if (cart.isNotEmpty)
          _buildSummaryBar(total, _savePurchase, context.tr('confirmInput'), () {
            setState(() => _purchaseCart.clear());
          }),
      ],
    );
  }

  // ─── Shared Components ─────────────────────────────────────────────────────

  Widget _buildCustomerSelector({bool isOptional = false}) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(15),
          border: Border.all(color: AppColors.border)),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: (_selectedCustomerId.isNotEmpty &&
                  _customers
                      .any((c) => c['id'].toString() == _selectedCustomerId))
              ? _selectedCustomerId
              : null,
          hint: Text(
              isOptional
                  ? '${context.tr('selectCustomer')} (${context.tr('optional')})'
                  : '${context.tr('selectCustomer')} (${context.tr('required')})',
              style: const TextStyle(color: AppColors.textMuted)),
          isExpanded: true,
          items: _customers.fold<List<DropdownMenuItem<String>>>([], (acc, c) {
            final id = c['id'].toString();
            if (!acc.any((item) => item.value == id)) {
              acc.add(DropdownMenuItem(
                  value: id, child: Text(c['name'] ?? context.tr('noName'))));
            }
            return acc;
          }),
          onChanged: (v) {
            final cust = _customers.firstWhere((c) => c['id'].toString() == v);
            setState(() {
              _selectedCustomerId = v!;
              _selectedCustomerName = cust['name'];
            });
          },
        ),
      ),
    );
  }

  Widget _buildSupplierSelector() {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(15),
          border: Border.all(color: AppColors.border)),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: (_selectedSupplierId.isNotEmpty &&
                  _suppliers
                      .any((s) => s['id'].toString() == _selectedSupplierId))
              ? _selectedSupplierId
              : null,
          hint: Text('${context.tr('selectSupplier')} (${context.tr('required')})',
              style: const TextStyle(color: AppColors.textMuted)),
          isExpanded: true,
          items: _suppliers.fold<List<DropdownMenuItem<String>>>([], (acc, s) {
            final id = s['id'].toString();
            if (!acc.any((item) => item.value == id)) {
              acc.add(DropdownMenuItem(
                  value: id, child: Text(s['name'] ?? context.tr('noName'))));
            }
            return acc;
          }),
          onChanged: (v) {
            setState(() {
              _selectedSupplierId = v!;
            });
          },
        ),
      ),
    );
  }

  Widget _buildPaymentSelector() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(15),
          border: Border.all(color: AppColors.border)),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: _paymentMethod,
          isExpanded: true,
          items: _paymentMethods
              .map((p) => DropdownMenuItem(value: p, child: Text(context.tr(p))))
              .toList(),
          onChanged: (v) {
            if (v != null) {
              setState(() => _paymentMethod = v);
            }
          },
        ),
      ),
    );
  }
  
  Widget _buildWarehouseSelector() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(15),
          border: Border.all(color: AppColors.border)),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: _selectedWarehouseId,
          isExpanded: true,
          hint: Text(context.tr('selectWarehouse')),
          items: _warehouses.map((w) => DropdownMenuItem(
            value: w['id'].toString(),
            child: Text(w['name']),
          )).toList(),
          onChanged: (v) {
            if (v != null) {
              setState(() => _selectedWarehouseId = v);
            }
          },
        ),
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: TextField(
        onChanged: (v) => setState(() => _search = v),
        decoration: InputDecoration(
          hintText: context.tr('search'),
          prefixIcon: const Icon(Icons.search),
          filled: true,
          fillColor: AppColors.surface,
          border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(15),
              borderSide: BorderSide.none),
        ),
      ),
    );
  }

  Widget _buildManualEntryForm() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10)
        ],
      ),
      child: Column(
        children: [
          TextField(
            controller: _manualNameCtrl,
            decoration:
                InputDecoration(hintText: context.tr('productName')),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _manualQtyCtrl,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(hintText: context.tr('quantity')),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _manualPriceCtrl,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(hintText: context.tr('purchasePrice')),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: _manualDate,
                      firstDate: DateTime(2000),
                      lastDate: DateTime(2100),
                    );
                    if (picked != null) setState(() => _manualDate = picked);
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      border: Border.all(color: AppColors.border),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                        child:
                            Text(FormatUtils.toLatinNumerals(DateFormat('yyyy-MM-dd').format(_manualDate)))),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: _addManualToCart,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.secondary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: Text(context.tr('add')),
              ),
            ],
          ),
          if (_purchaseCart.isNotEmpty) ...[
            const Divider(height: 32),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(context.tr('total'),
                        style: const TextStyle(
                            color: AppColors.textMuted, fontSize: 12)),
                    Text(
                        FormatUtils.formatCurrency(_purchaseCart.fold<double>(0.0, (s, i) => s + (i['purchasePrice'] ?? 0) * (i['qty'] as int))),
                        style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                            color: AppColors.primary)),
                  ],
                ),
                ElevatedButton.icon(
                  onPressed: _saving ? null : _savePurchase,
                  icon: _saving
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.check_circle_outline),
                  label: Text(context.tr('confirmInvoice')),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.success,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  String _normalizeNumbers(String input) {
    const arabic = '٠١٢٣٤٥٦٧٨٩';
    const english = '0123456789';
    String normalized = input.replaceAll(',', '.');
    for (int i = 0; i < arabic.length; i++) {
      normalized = normalized.replaceAll(arabic[i], english[i]);
    }
    return normalized;
  }

  void _addManualToCart() {
    if (_manualNameCtrl.text.trim().isEmpty ||
        _manualQtyCtrl.text.trim().isEmpty ||
        _manualPriceCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
           SnackBar(content: Text(context.tr('fillRequiredFields'))));
      return;
    }

    final name = _manualNameCtrl.text.trim();
    final qtyStr = _normalizeNumbers(_manualQtyCtrl.text.trim());
    final priceStr = _normalizeNumbers(_manualPriceCtrl.text.trim());

    final qty = int.tryParse(qtyStr) ?? 0;
    final price = double.tryParse(priceStr) ?? 0.0;

    if (qty <= 0 || price <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
           SnackBar(content: Text(context.tr('invalidQtyPrice'))));
      return;
    }

    // Check if product exists to get its ID, otherwise it's a new product
    final existing = _products.firstWhere(
        (p) => p['name'].toString().toLowerCase() == name.toLowerCase(),
        orElse: () => null);

    setState(() {
      final item = {
        'id': existing?['id'], // May be null if new
        'name': name,
        'qty': qty,
        'purchasePrice': price,
        'isManual': true,
        'date': _manualDate.toIso8601String().split('T')[0],
      };

      // Check if already in cart
      final idx = _purchaseCart.indexWhere((i) => i['name'] == name);
      if (idx >= 0) {
        _purchaseCart[idx]['qty'] += qty;
        _purchaseCart[idx]['purchasePrice'] = price; // Update to latest price
      } else {
        _purchaseCart.add(item);
      }

      _manualNameCtrl.clear();
      _manualQtyCtrl.clear();
      _manualPriceCtrl.clear();
    });
  }

  Widget _buildProductList({required Function(Map<String, dynamic>) onAdd}) {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: _filteredProducts.length,
      itemBuilder: (_, i) {
        final p = _filteredProducts[i];
        final stock = p['stockQty'] ?? 0;
        final isLowStock = stock <= 5;
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border.withValues(alpha: 0.5)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.03),
                blurRadius: 8,
                offset: const Offset(0, 2),
              )
            ],
          ),
          child: ListTile(
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            onTap: () => onAdd(Map<String, dynamic>.from(p)),
            title: Text(p['name'] ?? '',
                style: const TextStyle(
                    color: AppColors.text, fontWeight: FontWeight.w900, fontSize: 14),
                maxLines: 1,
                overflow: TextOverflow.ellipsis),
            subtitle: Padding(
              padding: const EdgeInsets.only(top: 4.0),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: isLowStock ? AppColors.danger.withValues(alpha: 0.1) : AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text('${context.tr('inventory')}: ${FormatUtils.formatNumber(stock)}',
                        style: TextStyle(color: isLowStock ? AppColors.danger : AppColors.primary, fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
            trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(FormatUtils.formatCurrency(p['sellPrice']),
                    style: const TextStyle(
                        color: AppColors.success,
                        fontWeight: FontWeight.w900,
                        fontSize: 16)),
                const Text('MRU', style: TextStyle(color: AppColors.textMuted, fontSize: 9, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildCartGraph(List<Map<String, dynamic>> cart,
      {required bool isPurchase}) {
    return SizedBox(
      height: 70,
      child: Center(
        child: ListView.builder(
          shrinkWrap: true,
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          itemCount: cart.length,
          itemBuilder: (context, index) {
            final item = cart[index];
            return Container(
              margin: const EdgeInsets.only(left: 8),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border:
                    Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    item['name'] ?? '',
                    style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        color: AppColors.primary),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.all(Radius.circular(8)),
                      boxShadow: [
                        BoxShadow(color: Colors.black12, blurRadius: 2)
                      ],
                    ),
                    child: Row(
                      children: [
                        InkWell(
                          onTap: () {
                            setState(() {
                              if (item['qty'] > 1) {
                                item['qty']--;
                              } else {
                                cart.removeAt(index);
                              }
                            });
                          },
                          child: const Padding(
                            padding: EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            child: Icon(Icons.remove,
                                size: 16, color: AppColors.danger),
                          ),
                        ),
                        Text(FormatUtils.formatQuantity(item['qty']),
                            style:
                                const TextStyle(fontWeight: FontWeight.bold)),
                        InkWell(
                          onTap: () {
                            setState(() {
                              item['qty']++;
                            });
                          },
                          child: const Padding(
                            padding: EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            child: Icon(Icons.add,
                                size: 16, color: AppColors.success),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildSummaryBar(
      double total, VoidCallback action, String label, VoidCallback onCancel) {
    return Container(
      padding: EdgeInsets.only(
        left: 20, 
        right: 20, 
        top: 16, 
        bottom: MediaQuery.of(context).padding.bottom + 16
      ),
      decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.1), 
              blurRadius: 20,
              offset: const Offset(0, -5)
            )
          ]),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start, 
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(context.tr('total').toUpperCase(),
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1.2)),
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(FormatUtils.formatCurrency(total),
                      style: const TextStyle(
                          color: AppColors.text,
                          fontSize: 24,
                          fontWeight: FontWeight.w900)),
                  const SizedBox(width: 4),
                  const Text('MRU', style: TextStyle(color: AppColors.textMuted, fontSize: 12, fontWeight: FontWeight.bold)),
                ],
              ),
          ]),
          Row(
            children: [
              Container(
                decoration: BoxDecoration(
                  color: AppColors.danger.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: IconButton(
                  onPressed: _saving ? null : onCancel,
                  icon: const Icon(Icons.delete_outline_rounded, color: AppColors.danger, size: 20),
                  tooltip: context.tr('cancel'),
                ),
              ),
              const SizedBox(width: 12),
              ElevatedButton(
                onPressed: _saving || total == 0 ? null : action,
                style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    minimumSize: const Size(120, 48),
                    padding:
                        const EdgeInsets.symmetric(horizontal: 24, vertical: 0),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16))),
                child: _saving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 3))
                    : Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.check_circle_outline_rounded, size: 18),
                          const SizedBox(width: 8),
                          Text(label,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w900, fontSize: 14)),
                        ],
                      ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ─── Logic ─────────────────────────────────────────────────────────────────

  void _addToCart(Map<String, dynamic> p, {required bool isPurchase}) {
    setState(() {
      final cart = isPurchase ? _purchaseCart : _salesCart;
      final idx = cart.indexWhere((i) => i['id'] == p['id']);
      if (idx >= 0) {
        cart[idx]['qty']++;
      } else {
        final item = {...p, 'qty': 1};
        if (isPurchase) {
          // Ensure purchasePrice is set for products added from the list
          item['purchasePrice'] = p['buyPrice'] ?? 0.0;
        }
        cart.add(item);
      }
    });
  }

  Future<void> _saveSale(bool isDebt) async {
    if (isDebt && _selectedCustomerId.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar( SnackBar(content: Text(context.tr('selectCustomerRequired'))));
      return;
    }
    setState(() => _saving = true);
    try {
      final total = _salesCart.fold<double>(
          0.0, (s, i) => s + (i['sellPrice'] ?? 0) * (i['qty'] as int));
      await SaleService.create({
        'customerName':
            _selectedCustomerName.isEmpty ? context.tr('cashCustomer') : _selectedCustomerName,
        'isDebt': isDebt,
        'totalAmount': total,
        'finalAmount': total,
        'discount': 0,
        'paymentMethod': isDebt ? 'debt' : _paymentMethod,
        'cart': _salesCart,
        'warehouseId': _selectedWarehouseId,
        'date': DateTime.now().toIso8601String().split('T')[0],
        'type': isDebt ? 'SALE' : 'QUOTATION',
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('✅ ${context.tr('invoiceSaved')}'),
            backgroundColor: AppColors.success));
        setState(() {
          _salesCart = [];
          _saving = false;
        });
        _fetch();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('❌ ${context.tr('saveFailed')}: $e'),
            backgroundColor: AppColors.danger));
      }
    }
  }

  Future<void> _savePurchase() async {
    if (_selectedSupplierId.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('selectSupplier'))));
      return;
    }
    setState(() => _saving = true);
    try {
      final total = _purchaseCart.fold<double>(
          0.0, (s, i) => s + (i['purchasePrice'] ?? 0) * (i['qty'] as int));
      await PurchaseService.create({
        'supplierId': _selectedSupplierId,
        'items': _purchaseCart,
        'total': total,
        'warehouseId': _selectedWarehouseId,
        'date': _manualDate.toIso8601String().split('T')[0],
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('✅ ${context.tr('invoiceSaved')}'),
            backgroundColor: AppColors.success));
        setState(() {
          _purchaseCart = [];
          _manualDate = DateTime.now();
          _selectedSupplierId = '';
          _saving = false;
        });
        _fetch();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('❌ ${context.tr('saveFailed')}: $e'),
            backgroundColor: AppColors.danger));
      }
    }
  }
}
