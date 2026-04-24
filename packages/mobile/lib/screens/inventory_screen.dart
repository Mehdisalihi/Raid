import 'package:flutter/material.dart';
import '../core/api_service.dart';
import '../core/theme.dart';
import '../core/format_utils.dart';
import '../core/app_localizations.dart';

class InventoryScreen extends StatefulWidget {
  const InventoryScreen({super.key});
  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen>
    with SingleTickerProviderStateMixin {
  List<dynamic> _warehouses = [];
  List<dynamic> _movements = [];
  List<dynamic> _inventory = [];
  bool _loading = true;
  int _activeWarehouseIndex = 0;
  late TabController _tabController;
  int _mainTabIndex = 0; // 0: Stock, 1: Movements

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      setState(() => _mainTabIndex = _tabController.index);
    });
    _fetchInitial();
  }

  Future<void> _fetchInitial() async {
    try {
      final whs = await WarehouseService.getAll();
      setState(() {
        _warehouses = whs;
      });
      if (whs.isNotEmpty) {
        _fetchWarehouseInventory(whs[0]['id']);
      }
      _fetchMovements();
    } catch (_) {}
    setState(() => _loading = false);
  }

  Future<void> _fetchWarehouseInventory(dynamic whId) async {
    setState(() => _loading = true);
    try {
      final data = await InventoryService.getByWarehouse(whId);
      setState(() => _inventory = data);
    } catch (_) {}
    setState(() => _loading = false);
  }

  Future<void> _fetchMovements() async {
    try {
      final data = await InventoryService.getMovements();
      setState(() => _movements = data);
    } catch (_) {}
  }

  @override
  void dispose() {
    _tabController.dispose();
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
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildStockTab(),
                  _buildMovementsTab(),
                ],
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: _mainTabIndex == 0
          ? FloatingActionButton.extended(
              onPressed: _openTransferModal,
              backgroundColor: AppColors.secondary,
              icon: const Icon(Icons.compare_arrows_rounded, color: Colors.white),
              label: Text(context.tr('transferStock'),
                  style: const TextStyle(
                      color: Colors.white, fontWeight: FontWeight.bold)),
            )
          : null,
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                context.tr('inventory'),
                style: const TextStyle(
                    color: AppColors.text,
                    fontSize: 28,
                    fontWeight: FontWeight.w900),
              ),
              Text(
                context.tr('manageWarehouses'),
                style: const TextStyle(color: AppColors.textLight, fontSize: 13),
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.secondary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(18),
            ),
            child: const Icon(Icons.inventory_rounded,
                color: AppColors.secondary, size: 28),
          ),
        ],
      ),
    );
  }

  Widget _buildTabs() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
      ),
      child: TabBar(
        controller: _tabController,
        indicator: BoxDecoration(
          color: AppColors.secondary,
          borderRadius: BorderRadius.circular(16),
        ),
        indicatorSize: TabBarIndicatorSize.tab,
        labelColor: Colors.white,
        unselectedLabelColor: AppColors.textMuted,
        dividerColor: Colors.transparent,
        tabs: [
          Tab(text: context.tr('inventory')),
          Tab(text: context.tr('inventoryMovements')),
        ],
      ),
    );
  }

  Widget _buildStockTab() {
    return Column(
      children: [
        if (_warehouses.isNotEmpty) _buildWarehouseSelector(),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _buildInventoryList(),
        ),
      ],
    );
  }

  Widget _buildWarehouseSelector() {
    return Container(
      height: 60,
      margin: const EdgeInsets.only(top: 16),
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        scrollDirection: Axis.horizontal,
        itemCount: _warehouses.length,
        itemBuilder: (context, index) {
          final w = _warehouses[index];
          final active = _activeWarehouseIndex == index;
          return GestureDetector(
            onTap: () {
              setState(() => _activeWarehouseIndex = index);
              _fetchWarehouseInventory(w['id']);
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.only(right: 12),
              padding: const EdgeInsets.symmetric(horizontal: 20),
              decoration: BoxDecoration(
                color: active
                    ? AppColors.secondary.withValues(alpha: 0.1)
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(15),
                border: Border.all(
                    color: active ? AppColors.secondary : AppColors.border),
              ),
              child: Center(
                child: Text(
                  w['name'],
                  style: TextStyle(
                    color: active ? AppColors.secondary : AppColors.textMuted,
                    fontWeight: active ? FontWeight.bold : FontWeight.normal,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildInventoryList() {
    if (_inventory.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inventory_2_outlined,
                size: 64, color: AppColors.textLight.withValues(alpha: 0.3)),
            const SizedBox(height: 16),
            Text(context.tr('noData'),
                style: const TextStyle(color: AppColors.textMuted)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 100),
      itemCount: _inventory.length,
      itemBuilder: (context, index) {
        final item = _inventory[index];
        final p = item['product'];
        final qty = item['qty'] ?? 0;
        final minAlert = p['minStockAlert'] ?? 0;
        
        Color statusColor = AppColors.success;
        if (qty <= 0) {
          statusColor = AppColors.danger;
        } else if (qty <= minAlert) {
          statusColor = AppColors.warning;
        }

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.border),
          ),
          child: ListTile(
            contentPadding: const EdgeInsets.all(16),
            leading: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: statusColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(Icons.shopping_bag_rounded, color: statusColor),
            ),
            title: Text(
              p['name'] ?? '',
              style: const TextStyle(
                  color: AppColors.text,
                  fontWeight: FontWeight.bold,
                  fontSize: 16),
            ),
            subtitle: Text(
              '${context.tr('barcode')}: ${p['barcode'] ?? '-'}',
              style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
            ),
            trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  FormatUtils.formatNumber(qty),
                  style: TextStyle(
                      color: statusColor,
                      fontSize: 18,
                      fontWeight: FontWeight.w900),
                ),
                Text(context.tr('availableQty'),
                    style: const TextStyle(
                        color: AppColors.textLight, fontSize: 10)),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildMovementsTab() {
    if (_movements.isEmpty) {
      return Center(
          child: Text(context.tr('noData'),
              style: const TextStyle(color: AppColors.textMuted)));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: _movements.length,
      itemBuilder: (context, index) {
        final m = _movements[index];
        final p = m['product'];
        final type = m['type'];
        
        IconData icon = Icons.swap_horiz_rounded;
        Color color = Colors.blue;
        if (type == 'ADD') {
          icon = Icons.add_circle_outline_rounded;
          color = AppColors.success;
        } else if (type == 'SUBTRACT') {
          icon = Icons.remove_circle_outline_rounded;
          color = AppColors.danger;
        }

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(p?['name'] ?? '',
                        style: const TextStyle(
                            color: AppColors.text,
                            fontWeight: FontWeight.bold,
                            fontSize: 14)),
                    Text(
                      '${m['source']?['name'] ?? ''} ➔ ${m['destination']?['name'] ?? ''}',
                      style: const TextStyle(
                          color: AppColors.textMuted, fontSize: 11),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${type == 'ADD' ? '+' : '-'}${m['qty']}',
                    style: TextStyle(
                        color: color,
                        fontWeight: FontWeight.w900,
                        fontSize: 16),
                  ),
                  Text(
                    FormatUtils.toLatinNumerals(
                        m['createdAt']?.toString().split('T')[0] ?? ''),
                    style: const TextStyle(
                        color: AppColors.textLight, fontSize: 10),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  void _openTransferModal() {
    // Basic transfer modal implementation
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _TransferStockModal(
        warehouses: _warehouses,
        onSuccess: () {
          _fetchWarehouseInventory(_warehouses[_activeWarehouseIndex]['id']);
          _fetchMovements();
        },
      ),
    );
  }
}

class _TransferStockModal extends StatefulWidget {
  final List<dynamic> warehouses;
  final VoidCallback onSuccess;
  const _TransferStockModal({required this.warehouses, required this.onSuccess});

  @override
  State<_TransferStockModal> createState() => _TransferStockModalState();
}

class _TransferStockModalState extends State<_TransferStockModal> {
  dynamic _fromWhId;
  dynamic _toWhId;
  dynamic _selectedProductId;
  final _qtyCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  List<dynamic> _products = [];
  bool _loadingProducts = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _fetchProducts();
    if (widget.warehouses.isNotEmpty) {
      _fromWhId = widget.warehouses[0]['id'];
      if (widget.warehouses.length > 1) {
        _toWhId = widget.warehouses[1]['id'];
      }
    }
  }

  Future<void> _fetchProducts() async {
    try {
      final data = await ProductService.getAll();
      setState(() => _products = data);
    } catch (_) {}
    setState(() => _loadingProducts = false);
  }

  Future<void> _submit() async {
    if (_selectedProductId == null || _fromWhId == null || _toWhId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr('fillRequiredFields'))));
      return;
    }
    final qty = double.tryParse(_qtyCtrl.text) ?? 0;
    if (qty <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr('qtyPositive'))));
      return;
    }

    setState(() => _saving = true);
    try {
      await InventoryService.transfer({
        'productId': _selectedProductId,
        'fromWarehouseId': _fromWhId,
        'toWarehouseId': _toWhId,
        'qty': qty,
        'notes': _notesCtrl.text,
      });
      if (!mounted) return;
      widget.onSuccess();
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr('transferSuccess')), backgroundColor: AppColors.success));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${context.tr('transferFailed')}: $e'), backgroundColor: AppColors.danger));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
      ),
      padding: EdgeInsets.fromLTRB(
          24, 24, 24, MediaQuery.of(context).viewInsets.bottom + 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(context.tr('transferStock'),
              style: const TextStyle(
                  color: AppColors.text,
                  fontSize: 20,
                  fontWeight: FontWeight.bold)),
          const Divider(height: 32),
          
          _loadingProducts 
            ? const LinearProgressIndicator()
            : DropdownButtonFormField<dynamic>(
                initialValue: _selectedProductId,
                decoration: InputDecoration(labelText: context.tr('productName')),
                items: _products.map((p) {
                  return DropdownMenuItem(
                    value: p['id'],
                    child: Text(p['name'] ?? ''),
                  );
                }).toList(),
                onChanged: (v) => setState(() => _selectedProductId = v),
              ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<dynamic>(
                  initialValue: _fromWhId,
                  decoration: InputDecoration(labelText: context.tr('sourceWarehouse')),
                  items: widget.warehouses.map((w) {
                    return DropdownMenuItem(
                      value: w['id'],
                      child: Text(w['name']),
                    );
                  }).toList(),
                  onChanged: (v) => setState(() => _fromWhId = v),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: DropdownButtonFormField<dynamic>(
                  initialValue: _toWhId,
                  decoration: InputDecoration(labelText: context.tr('destinationWarehouse')),
                  items: widget.warehouses.map((w) {
                    return DropdownMenuItem(
                      value: w['id'],
                      child: Text(w['name']),
                    );
                  }).toList(),
                  onChanged: (v) => setState(() => _toWhId = v),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _qtyCtrl,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(labelText: context.tr('qtyToTransfer')),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _notesCtrl,
            decoration: InputDecoration(labelText: context.tr('notes')),
          ),
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _saving ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.secondary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _saving 
                ? const CircularProgressIndicator(color: Colors.white)
                : Text(context.tr('confirm'), style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }
}
