import 'package:flutter/material.dart';
import '../core/api_service.dart';
import '../core/theme.dart';
import '../core/format_utils.dart';
import '../core/app_localizations.dart';

class ReturnsScreen extends StatefulWidget {
  const ReturnsScreen({super.key});
  @override
  State<ReturnsScreen> createState() => _ReturnsScreenState();
}

class _ReturnsScreenState extends State<ReturnsScreen> {
  List<dynamic> _sales = [];
  List<dynamic> _returns = [];
  dynamic _selectedSale;
  List<Map<String, dynamic>> _returnItems = [];
  bool _loading = true;
  bool _saving = false;
  int _tabIndex = 0; // 0: New Return, 1: History

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    try {
      final results = await Future.wait([
        SaleService.getAll(),
        ReturnService.getAll(),
      ]);
      if (mounted) {
        setState(() {
          _sales = results[0];
          _returns = results[1];
        });
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  void _selectSale(dynamic sale) {
    setState(() {
      _selectedSale = sale;
      _returnItems = (sale['items'] as List).map((item) {
        return {
          ...Map<String, dynamic>.from(item),
          'returnQty': 0,
          'maxQty': item['qty'] ?? item['quantity'] ?? 1,
        };
      }).toList();
    });
  }

  void _updateReturnQty(dynamic id, int delta) {
    setState(() {
      _returnItems = _returnItems.map((item) {
        if (item['id'] == id || item['productId'] == id) {
          final current = item['returnQty'] as int;
          final max = item['maxQty'] as int;
          int next = current + delta;
          if (next < 0) next = 0;
          if (next > max) next = max;
          return {...item, 'returnQty': next};
        }
        return item;
      }).toList();
    });
  }

  double get _totalReturn => _returnItems.fold(0.0, (sum, item) {
        final price = item['sellPrice'] ?? item['price'] ?? 0.0;
        return sum + (price * (item['returnQty'] as int));
      });

  Future<void> _submitReturn() async {
    final itemsToReturn =
        _returnItems.where((i) => (i['returnQty'] as int) > 0).toList();
    if (itemsToReturn.isEmpty) return;

    setState(() => _saving = true);
    try {
      await ReturnService.create({
        'saleId': _selectedSale['id'],
        'items': itemsToReturn
            .map((i) => {
                  'productId': i['productId'] ?? i['id'],
                  'quantity': i['returnQty'],
                  'name': i['name'],
                })
            .toList(),
        'total': _totalReturn,
        'date': DateTime.now().toIso8601String().split('T')[0],
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('✅ ${context.tr('returnSuccess')}'),
              backgroundColor: AppColors.success),
        );
        setState(() {
          _selectedSale = null;
          _returnItems = [];
        });
        _fetch();
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('❌ ${context.tr('returnFailed')}'),
              backgroundColor: AppColors.danger),
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
        child: Column(
          children: [
            _buildHeader(),
            _buildTabs(),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _tabIndex == 0
                      ? _buildNewReturnFlow()
                      : _buildHistoryList(),
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
                context.tr('returns'),
                style: const TextStyle(
                    color: AppColors.text,
                    fontSize: 24,
                    fontWeight: FontWeight.w900),
              ),
              Text(
                context.tr('returnSummary'),
                style: const TextStyle(color: AppColors.textLight, fontSize: 13),
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.danger.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(15),
            ),
            child: const Icon(Icons.restart_alt_rounded,
                color: AppColors.danger, size: 28),
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
            _tabItem('مرتجع جديد', 0),
            _tabItem('سجل المرتجعات', 1),
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
            color: active ? AppColors.danger : Colors.transparent,
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

  Widget _buildNewReturnFlow() {
    if (_selectedSale == null) return _buildSaleSelector();
    return _buildItemReturner();
  }

  Widget _buildSaleSelector() {
    if (_sales.isEmpty) {
      return Center(
          child: Text(context.tr('noAvailableInvoices'),
              style: const TextStyle(color: AppColors.textLight)));
    }
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      itemCount: _sales.length,
      itemBuilder: (context, index) {
        final s = _sales[index];
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppColors.border),
          ),
          child: ListTile(
            contentPadding: const EdgeInsets.all(16),
            onTap: () => _selectSale(s),
            leading: CircleAvatar(
              backgroundColor: AppColors.primary.withValues(alpha: 0.1),
              child: const Icon(Icons.receipt_long_rounded,
                  color: AppColors.primary, size: 20),
            ),
            title: Text(
                '${context.tr('invoice')} #${s['id'].toString().substring(s['id'].toString().length - 4)}',
                style: const TextStyle(
                    color: AppColors.text, fontWeight: FontWeight.bold)),
            subtitle: Text('${s['customerName'] ?? context.tr('cashCustomer')} | ${s['date']}',
                style:
                    const TextStyle(color: AppColors.textLight, fontSize: 12)),
            trailing: const Icon(Icons.arrow_forward_ios_rounded,
                size: 14, color: AppColors.textLight),
          ),
        );
      },
    );
  }

  Widget _buildItemReturner() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          child: Row(
            children: [
              IconButton(
                  icon: const Icon(Icons.close_rounded, color: AppColors.text),
                  onPressed: () => setState(() => _selectedSale = null)),
               Text(context.tr('selectSaleItems'),
                  style: const TextStyle(
                      color: AppColors.text, fontWeight: FontWeight.bold)),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            itemCount: _returnItems.length,
            itemBuilder: (context, index) {
              final item = _returnItems[index];
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item['name'] ?? '',
                              style: const TextStyle(
                                  color: AppColors.text,
                                  fontWeight: FontWeight.bold)),
                          Text('${context.tr('sold')}: ${FormatUtils.formatQuantity(item['maxQty'])}',
                              style: const TextStyle(
                                  color: AppColors.textLight, fontSize: 12)),
                        ],
                      ),
                    ),
                    _qtyController(item),
                  ],
                ),
              );
            },
          ),
        ),
        _buildBottomBar(),
      ],
    );
  }

  Widget _qtyController(Map<String, dynamic> item) {
    return Row(
      children: [
        _qtyBtn(Icons.remove_rounded,
            () => _updateReturnQty(item['id'] ?? item['productId'], -1)),
        Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Text(FormatUtils.formatQuantity(item['returnQty']),
                style: const TextStyle(
                    fontWeight: FontWeight.bold, fontSize: 16))),
        _qtyBtn(Icons.add_rounded,
            () => _updateReturnQty(item['id'] ?? item['productId'], 1)),
      ],
    );
  }

  Widget _qtyBtn(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
            color: AppColors.bg,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.border)),
        child: Icon(icon, size: 18, color: AppColors.primary),
      ),
    );
  }

  Widget _buildBottomBar() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(30)),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, -5))
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
               Text(context.tr('totalReturn'),
                  style: const TextStyle(
                      color: AppColors.text, fontWeight: FontWeight.bold)),
              Text(FormatUtils.formatCurrency(_totalReturn),
                  style: const TextStyle(
                      color: AppColors.danger,
                      fontSize: 24,
                      fontWeight: FontWeight.w900)),
            ],
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: (_totalReturn <= 0 || _saving) ? null : _submitReturn,
            style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.danger,
                minimumSize: const Size(double.infinity, 56),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16))),
            child: _saving
                ? const CircularProgressIndicator(color: Colors.white)
                : Text(context.tr('completeReturn'),
                    style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 16)),
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryList() {
    if (_returns.isEmpty) {
      return Center(
          child: Text(context.tr('emptyReturnHistory'),
              style: const TextStyle(color: AppColors.textLight)));
    }
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      itemCount: _returns.length,
      itemBuilder: (context, index) {
        final r = _returns[index];
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppColors.border),
          ),
          child: ListTile(
            contentPadding: const EdgeInsets.all(16),
            leading: CircleAvatar(
                backgroundColor: AppColors.danger.withValues(alpha: 0.1),
                child: const Icon(Icons.history_rounded,
                    color: AppColors.danger, size: 20)),
            title: Text(
                '${context.tr('return')} #${r['id'].toString().substring(r['id'].toString().length - 4)}',
                style: const TextStyle(
                    color: AppColors.text, fontWeight: FontWeight.bold)),
            subtitle: Text(r['date'] ?? '',
                style:
                    const TextStyle(color: AppColors.textLight, fontSize: 12)),
            trailing: Text(FormatUtils.formatCurrency(r['total']),
                style: const TextStyle(
                    color: AppColors.danger,
                    fontWeight: FontWeight.w900,
                    fontSize: 16)),
          ),
        );
      },
    );
  }
}
