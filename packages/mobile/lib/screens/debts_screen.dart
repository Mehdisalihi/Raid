import 'package:flutter/material.dart';
import '../core/api_service.dart';
import '../core/theme.dart';
import '../core/format_utils.dart';
import '../core/app_localizations.dart';

class DebtsScreen extends StatefulWidget {
  const DebtsScreen({super.key});
  @override
  State<DebtsScreen> createState() => _DebtsScreenState();
}

class _DebtsScreenState extends State<DebtsScreen> {
  List<dynamic> _debtors = [];
  List<dynamic> _creditors = [];
  bool _loading = true;
  int _tabIndex = 0; // 0: Debtors (Clients), 1: Creditors (Suppliers)

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    try {
      final results = await Future.wait([
        DebtService.getDebtors(),
        DebtService.getCreditors(),
      ]);
      if (mounted) {
        setState(() {
          _debtors = results[0];
          _creditors = results[1];
        });
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _pay(dynamic id, bool isDebtor) async {
    final amountController = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
        title: Text(isDebtor ? context.tr('collectPayment') : context.tr('recordPayment'),
            style: const TextStyle(
                color: AppColors.text,
                fontWeight: FontWeight.w900,
                fontSize: 20)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(context.tr('enterAmountToRecord'),
                style: const TextStyle(color: AppColors.textMuted)),
            const SizedBox(height: 20),
            TextField(
              controller: amountController,
              keyboardType: TextInputType.number,
              autofocus: true,
              style: const TextStyle(color: AppColors.text, fontSize: 18),
              textAlign: TextAlign.center,
              decoration: InputDecoration(
                prefixText: 'MRU ',
                filled: true,
                fillColor: AppColors.bg,
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(20),
                    borderSide: const BorderSide(color: AppColors.border)),
                focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(20),
                    borderSide: BorderSide(color: AppColors.primary)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(context.tr('cancel'))),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.success,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12))),
            child: Text(context.tr('confirm'),
                style: const TextStyle(
                    color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (ok == true && amountController.text.isNotEmpty) {
      final amount = double.tryParse(amountController.text) ?? 0.0;
      if (amount <= 0) return;
      try {
        await DebtService.recordPayment(id, amount);
        _fetch();
      } catch (_) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: Text(context.tr('paymentFailed')),
                backgroundColor: AppColors.danger),
          );
        }
      }
    }
  }

  double get _totalDebtors => _debtors.fold(
      0.0,
      (s, i) =>
          s +
          (double.tryParse((i['remaining'] ?? i['amount'] ?? 0).toString()) ??
              0.0));
  double get _totalCreditors => _creditors.fold(
      0.0,
      (s, i) =>
          s +
          (double.tryParse((i['remaining'] ?? i['amount'] ?? 0).toString()) ??
              0.0));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            _buildStatsRow(),
            _buildTabs(),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _buildList(),
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
                context.tr('debtsAndReceivables'),
                style: const TextStyle(
                    color: AppColors.text,
                    fontSize: 24,
                    fontWeight: FontWeight.w900),
              ),
              Text(
                context.tr('debtSummary'),
                style: const TextStyle(color: AppColors.textLight, fontSize: 13),
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.warning.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(15),
            ),
            child: const Icon(Icons.account_balance_rounded,
                color: AppColors.warning, size: 28),
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
              context.tr('usDebtors'),
              FormatUtils.formatNumber(_totalDebtors),
              'MRU',
              AppColors.warning,
              Icons.trending_up_rounded,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _statCard(
              context.tr('themCreditors'),
              FormatUtils.formatNumber(_totalCreditors),
              'MRU',
              AppColors.danger,
              Icons.trending_down_rounded,
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8)),
                child: Icon(icon, color: color, size: 16),
              ),
              const SizedBox(width: 8),
              Text(label,
                  style: const TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 10,
                      fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(val,
                  style: const TextStyle(
                      color: AppColors.text,
                      fontSize: 20,
                      fontWeight: FontWeight.w900)),
              const SizedBox(width: 4),
              Text(unit, style: TextStyle(color: color, fontSize: 10)),
            ],
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
            _tabItem(context.tr('debtorsClients'), 0),
            _tabItem(context.tr('creditorsSuppliers'), 1),
          ],
        ),
      ),
    );
  }

  Widget _tabItem(String label, int index) {
    final active = _tabIndex == index;
    final color = index == 0 ? AppColors.warning : AppColors.danger;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _tabIndex = index),
        child: Container(
          decoration: BoxDecoration(
            color: active ? color : Colors.transparent,
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

  Widget _buildList() {
    final items = _tabIndex == 0 ? _debtors : _creditors;
    if (items.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle_outline_rounded,
                size: 80, color: AppColors.success.withValues(alpha: 0.2)),
            const SizedBox(height: 16),
            Text(
                _tabIndex == 0
                    ? context.tr('noCustomerDebts')
                    : context.tr('noSupplierDebts'),
                style: const TextStyle(color: AppColors.textLight)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        final remaining = double.tryParse(
                (item['remaining'] ?? item['amount'] ?? 0).toString()) ??
            0.0;
        final color = _tabIndex == 0 ? AppColors.warning : AppColors.danger;

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppColors.border),
          ),
          child: ListTile(
            contentPadding: const EdgeInsets.all(16),
            onTap: () => _pay(item['id'], _tabIndex == 0),
            leading: CircleAvatar(
              radius: 28,
              backgroundColor: color.withValues(alpha: 0.1),
              child: Text(
                _tabIndex == 0 ? '👤' : '📦',
                style: const TextStyle(fontSize: 20),
              ),
            ),
            title: Text(
              item['customerName'] ??
                  item['supplierName'] ??
                  item['entityName'] ??
                  context.tr('unknown'),
              style: const TextStyle(
                  color: AppColors.text,
                  fontWeight: FontWeight.w900,
                  fontSize: 16),
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 4),
                Text(item['date'] ?? '',
                    style: const TextStyle(
                        color: AppColors.textLight, fontSize: 12)),
                if (item['invoiceNumber'] != null)
                  Text('${context.tr('invoice')}: #${item['invoiceNumber']}',
                      style: TextStyle(
                          color: color,
                          fontSize: 11,
                          fontWeight: FontWeight.bold)),
              ],
            ),
            trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  FormatUtils.formatNumber(remaining),
                  style: TextStyle(
                      color: color, fontWeight: FontWeight.w900, fontSize: 18),
                ),
                const Text('MRU',
                    style: TextStyle(color: AppColors.textLight, fontSize: 10)),
                const SizedBox(height: 8),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                      color: AppColors.success,
                      borderRadius: BorderRadius.circular(8)),
                  child: Text(_tabIndex == 0 ? context.tr('collect') : context.tr('pay'),
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
