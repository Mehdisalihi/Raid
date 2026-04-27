import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/api_service.dart';
import '../core/theme.dart';
import '../core/pdf_service.dart';
import '../core/format_utils.dart';
import '../core/app_localizations.dart';
import '../core/locale_provider.dart';


class CustomerStatementScreen extends StatefulWidget {
  final String? initialName;
  const CustomerStatementScreen({super.key, this.initialName});
  @override
  State<CustomerStatementScreen> createState() =>
      _CustomerStatementScreenState();
}

class _CustomerStatementScreenState extends State<CustomerStatementScreen> {
  List<dynamic> _customers = [];
  List<dynamic> _suppliers = [];
  String? _selectedName;
  bool _loading = true;
  List<dynamic> _activities = [];
  List<dynamic> _outstandingItems = [];
  Map<String, double> _summary = {'debit': 0, 'credit': 0, 'balance': 0};

  @override
  void initState() {
    super.initState();
    _loadEntities().then((_) {
      if (widget.initialName != null) {
        setState(() => _selectedName = widget.initialName);
        _fetchStatement(widget.initialName!);
      }
    });
  }

  Future<void> _loadEntities() async {
    try {
      final results = await Future.wait([
        CustomerService.getAll(),
        SupplierService.getAll(),
      ]);
      if (mounted) {
        setState(() {
          _customers = results[0];
          _suppliers = results[1];
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _fetchStatement(String name) async {
    setState(() => _loading = true);

    final customer = _customers.firstWhere((c) => c['name'] == name, orElse: () => null);
    final supplier = _suppliers.firstWhere((s) => s['name'] == name, orElse: () => null);

    try {
      List<dynamic> combinedInvoices = [];
      double totalDebit = 0;
      double totalCredit = 0;

      final results = await Future.wait([
        if (customer != null) CustomerService.getStatement(customer['id']),
        if (supplier != null) SupplierService.getStatement(supplier['id']),
      ]);

      int idx = 0;
      if (customer != null) {
        final data = results[idx++];
        final List<dynamic> invoices = data['Invoices'] ?? [];
        for (var inv in invoices) {
          final type = (inv['type'] ?? 'SALE').toString().toLowerCase();
          final amt = (inv['finalAmount'] ?? inv['totalAmount'] ?? 0).toDouble();
          
          bool isDebit = type == 'sale' || type == 'invoice' || type == 'debt';
          bool isCredit = type == 'payment' || type == 'return';
          bool isNeutral = type == 'sale' && inv['isDebt'] == false;

          if (!isNeutral) {
            if (isDebit) totalDebit += amt;
            if (isCredit) totalCredit += amt;
          }

          String description = _getLabel(type, inv['isDebt'] == true, false);
          final items = inv['items'] as List<dynamic>?;
          if (items != null && items.isNotEmpty) {
            final itemStrings = items.map((it) {
              final name = (it['product']?['name'] ?? it['name'] ?? it['productName'] ?? '').toString();
              final qty = it['qty'] ?? it['Quantity'] ?? 0;
              return name.isNotEmpty ? '$name x $qty' : '';
            }).where((n) => n.isNotEmpty).join(', ');
            if (itemStrings.isNotEmpty) description += '\n($itemStrings)';
          }

          combinedInvoices.add({
            'createdAt': inv['createdAt'],
            'type': type,
            'label': description,
            'amount': amt,
            'isDebit': isDebit,
            'isNeutral': isNeutral,
            'source': 'customer'
          });
        }
      }

      if (supplier != null) {
        final data = results[idx++];
        final List<dynamic> invoices = data['Invoices'] ?? [];
        for (var inv in invoices) {
          final type = (inv['type'] ?? 'PURCHASE').toString().toLowerCase();
          final amt = (inv['finalAmount'] ?? inv['totalAmount'] ?? 0).toDouble();
          
          bool isDebit = type == 'payment' || type == 'return';
          bool isCredit = type == 'purchase' || type == 'debt';

          if (isDebit) totalDebit += amt;
          if (isCredit) totalCredit += amt;

          String description = _getLabel(type, inv['isDebt'] == true, true);
          final items = inv['items'] as List<dynamic>?;
          if (items != null && items.isNotEmpty) {
            final itemStrings = items.map((it) {
              final name = (it['product']?['name'] ?? it['name'] ?? it['productName'] ?? '').toString();
              final qty = it['qty'] ?? it['Quantity'] ?? 0;
              return name.isNotEmpty ? '$name x $qty' : '';
            }).where((n) => n.isNotEmpty).join(', ');
            if (itemStrings.isNotEmpty) description += '\n($itemStrings)';
          }

          combinedInvoices.add({
            'createdAt': inv['createdAt'],
            'type': type,
            'label': description,
            'amount': amt,
            'isDebit': isDebit,
            'isNeutral': false,
            'source': 'supplier'
          });
        }
      }

      combinedInvoices.sort((a, b) => (b['createdAt'] ?? '').compareTo(a['createdAt'] ?? ''));

      // Re-calculate unified balance
      double currentBalance = totalDebit - totalCredit;

      if (mounted) {
        setState(() {
          _activities = combinedInvoices;
          _outstandingItems = []; // FIFO breakdown is harder for unified, let's clear it for now or just skip
          _summary = {
            'debit': totalDebit,
            'credit': totalCredit,
            'balance': currentBalance,
          };
          _loading = false;
        });
      }
    } catch (e) {
      debugPrint('Error fetching statement: $e');
      if (mounted) setState(() => _loading = false);
    }
  }

  String _getLabel(String type, bool isDebt, bool isSupplier) {
    if (isSupplier) {
      if (type == 'purchase') return context.tr('purchaseInvoice');
      if (type == 'payment') return context.tr('paymentToSupplier');
      if (type == 'return') return context.tr('purchaseReturn');
      return type;
    } else {
      if (type == 'sale') return isDebt ? context.tr('debtInvoice') : context.tr('cashSale');
      if (type == 'payment') return context.tr('paymentCollection');
      if (type == 'return') return context.tr('saleReturn');
      return type;
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          _buildHeader(),
          _buildSelector(),
          if (_selectedName != null)
            Expanded(
                child: _loading
                    ? const Center(child: CircularProgressIndicator())
                    : _buildContent()),
          if (_selectedName == null && !_loading)
            Expanded(
                child: Center(
                    child: Text(context.tr('selectEntityToViewStatement'),
                        style: const TextStyle(color: AppColors.textMuted)))),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          IconButton(
            icon: Icon(Icons.menu_rounded,
                color: AppColors.primary, size: 28),
            onPressed: () => Scaffold.of(context).openDrawer(),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(context.tr('statement'),
                    style: const TextStyle(
                        color: AppColors.text,
                        fontSize: 24,
                        fontWeight: FontWeight.w900)),
                Text(context.tr('statementSummary'),
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
              ],
            ),
          ),
          IconButton(
            onPressed: () {
              if (_selectedName != null && _activities.isNotEmpty) {
                PdfService.generateStatement(
                    _selectedName!, _summary, _activities);
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(context.tr('noDataToPrint'))),
                );
              }
            },
            icon: Icon(Icons.print_rounded, color: AppColors.primary),
            style: IconButton.styleFrom(
                backgroundColor: AppColors.surface,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12))),
          ),
        ],
      ),
    );
  }

  Widget _buildSelector() {
    final names = {
      ..._customers.map((e) => e['name'] as String),
      ..._suppliers.map((e) => e['name'] as String)
    }.toList();
    names.sort();
    
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.border),
        ),
        child: DropdownButtonHideUnderline(
          child: DropdownButton<String>(
            isExpanded: true,
            hint: Text(context.tr('selectEntity'),
                style: const TextStyle(color: AppColors.textMuted)),
            value: _selectedName,
            dropdownColor: AppColors.surface,
            style: const TextStyle(
                color: AppColors.text, fontWeight: FontWeight.bold),
            items: names.map((n) {
              final isCust = _customers.any((c) => c['name'] == n);
              final isSupp = _suppliers.any((s) => s['name'] == n);
              String suffix = '';
              if (isCust && isSupp) {
                suffix = context.watch<LocaleProvider>().isRTL ? ' (عميل ومورد)' : ' (Double)';
              } else if (isCust) {
                suffix = context.watch<LocaleProvider>().isRTL ? ' (عميل)' : ' (Client)';
              } else {
                suffix = context.watch<LocaleProvider>().isRTL ? ' (مورد)' : ' (Fourn.)';
              }
              
              return DropdownMenuItem(value: n, child: Text('$n$suffix'));
            }).toList(),
            onChanged: (v) {
              if (v != null) {
                setState(() => _selectedName = v);
                _fetchStatement(v);
              }
            },
          ),
        ),
      ),
    );
  }

  Widget _buildContent() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildSummaryCards(),
        if (_outstandingItems.isNotEmpty) ...[
          const SizedBox(height: 24),
          _buildDebtBreakdown(),
        ],
        const SizedBox(height: 24),
        Text(context.tr('operationLog'),
            style: const TextStyle(
                color: AppColors.text,
                fontSize: 18,
                fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        ..._activities.map(_buildActivityItem),
      ],
    );
  }

  Widget _buildDebtBreakdown() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: AppColors.border),
        boxShadow: AppColors.premiumShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.analytics_rounded, color: AppColors.primary, size: 20),
              const SizedBox(width: 8),
              Text(context.tr('debtBreakdown'),
                  style: const TextStyle(
                      color: AppColors.text,
                      fontSize: 15,
                      fontWeight: FontWeight.w900)),
            ],
          ),
          const SizedBox(height: 16),
          Table(
            columnWidths: const {
              0: FlexColumnWidth(1.2),
              1: FlexColumnWidth(2),
              2: FlexColumnWidth(1.2),
            },
            children: [
              TableRow(
                children: [
                  _th(context.tr('date')),
                  _th(context.tr('invoice')),
                  _th(context.tr('amount')),
                ],
              ),
              ..._outstandingItems.map((item) => TableRow(
                children: [
                  _td(_formatDate(item['date'])),
                  _td(item['label']),
                  _td('${FormatUtils.toLatinNumerals(item['amount'].toStringAsFixed(0))} MRU', isBold: true),
                ],
              )),
            ],
          ),
        ],
      ),
    );
  }

  Widget _th(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Text(text, style: const TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
    );
  }

  Widget _td(String text, {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Text(text, style: TextStyle(color: AppColors.text, fontSize: 11, fontWeight: isBold ? FontWeight.w900 : FontWeight.bold)),
    );
  }

  Widget _buildSummaryCards() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(32),
            boxShadow: AppColors.premiumShadow,
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _comparisonItem(context.tr('debit'), _summary['debit']!,
                      AppColors.danger, Icons.trending_up),
                  Container(
                    width: 1,
                    height: 40,
                    color: AppColors.border,
                  ),
                  _comparisonItem(context.tr('credit'), _summary['credit']!,
                      AppColors.success, Icons.trending_down),
                ],
              ),
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 20),
                child: Divider(),
              ),
              _buildNetBalanceRow(),
            ],
          ),
        ),
      ],
    );
  }

  Widget _comparisonItem(
      String label, double value, Color color, IconData icon) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, color: color, size: 14),
            const SizedBox(width: 6),
            Text(label,
                style: const TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 11,
                    fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          '${FormatUtils.toLatinNumerals(value.toStringAsFixed(0))} MRU',
          style: TextStyle(
              color: color, fontSize: 20, fontWeight: FontWeight.w900),
        ),
      ],
    );
  }

  Widget _buildNetBalanceRow() {
    final balance = _summary['balance']!;
    final isNegative = balance < 0; // We owe them (له)
    final isPositive = balance > 0; // They owe us (عليه)
    final color = isPositive
        ? AppColors.danger
        : (isNegative ? AppColors.success : AppColors.textLight);
    final label = isPositive
        ? context.tr('requiredPayment')
        : (isNegative ? context.tr('owedAmounts') : context.tr('balancedAccount'));

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(context.tr('financialPosition'),
                style: const TextStyle(
                    color: AppColors.text,
                    fontWeight: FontWeight.bold,
                    fontSize: 13)),
            Text(label,
                style: TextStyle(
                    color: color, fontSize: 11, fontWeight: FontWeight.w600)),
          ],
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: color.withValues(alpha: 0.2)),
          ),
          child: Text(
            '${FormatUtils.toLatinNumerals(balance.abs().toStringAsFixed(0))} MRU',
            style: TextStyle(
                color: color, fontSize: 18, fontWeight: FontWeight.w900),
          ),
        ),
      ],
    );
  }

  String _formatDate(dynamic raw) {
    if (raw == null) return '';
    try {
      final dt = DateTime.parse(raw.toString()).toLocal();
      return FormatUtils.formatDate(dt, format: 'dd/MM/yyyy');
    } catch (_) {
      return raw.toString();
    }
  }

  Widget _buildActivityItem(dynamic act) {
    final color = act['isNeutral'] == true
        ? AppColors.textMuted
        : (act['isDebit'] == true ? AppColors.danger : AppColors.success);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
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
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              act['isDebit'] == true
                  ? Icons.arrow_upward_rounded
                  : Icons.arrow_downward_rounded,
              color: color,
              size: 20,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(act['label'],
                    style: const TextStyle(
                        color: AppColors.text,
                        fontWeight: FontWeight.w900,
                        fontSize: 15)),
                Text(_formatDate(act['createdAt']),
                    style: const TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 11,
                        fontWeight: FontWeight.bold)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('${FormatUtils.toLatinNumerals(act['amount'].toStringAsFixed(0))} MRU',
                  style: TextStyle(
                      color: color, fontSize: 16, fontWeight: FontWeight.w900)),
              if (act['isNeutral'] == true)
                Text(context.tr('paidCash'),
                    style: const TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 9,
                        fontWeight: FontWeight.bold)),
            ],
          ),
        ],
      ),
    );
  }
}
