import 'package:flutter/material.dart';
import '../core/api_service.dart';
import '../core/theme.dart';
import '../core/format_utils.dart';
import '../core/app_localizations.dart';

class StaffStatementScreen extends StatefulWidget {
  final String? initialName;
  const StaffStatementScreen({super.key, this.initialName});
  @override
  State<StaffStatementScreen> createState() => _StaffStatementScreenState();
}

class _StaffStatementScreenState extends State<StaffStatementScreen> {
  List<dynamic> _staff = [];
  String? _selectedName;
  bool _loading = true;
  List<dynamic> _transactions = [];
  Map<String, double> _summary = {'paid': 0, 'earned': 0, 'balance': 0};

  @override
  void initState() {
    super.initState();
    _loadStaff().then((_) {
      if (widget.initialName != null) {
        setState(() => _selectedName = widget.initialName);
        _fetchStatement(widget.initialName!);
      }
    });
  }

  Future<void> _loadStaff() async {
    try {
      final data = await StaffService.getAll();
      if (mounted) {
        setState(() {
          _staff = data;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _fetchStatement(String name) async {
    setState(() => _loading = true);
    final member = _staff.firstWhere((s) => s['name'] == name, orElse: () => null);
    if (member == null) {
      setState(() => _loading = false);
      return;
    }

    try {
      final data = await StaffService.getStatement(member['id']);
      final List<dynamic> txs = data['transactions'] ?? [];
      double paid = 0;
      double earned = 0;

      for (var tx in txs) {
        final type = (tx['type'] ?? '').toString().toLowerCase();
        final amt = (tx['amount'] ?? 0).toDouble();
        if (type == 'salary' || type == 'advance') {
          paid += amt;
        } else if (type == 'credit') {
          earned += amt;
        }
      }

      if (mounted) {
        setState(() {
          _transactions = txs;
          _summary = {
            'paid': paid,
            'earned': earned,
            'balance': earned - paid,
          };
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
        backgroundColor: Colors.transparent, elevation: 0,
        title: Text(context.tr('staff_statement'), style: const TextStyle(color: AppColors.text, fontWeight: FontWeight.bold)),
        leading: IconButton(icon: const Icon(Icons.arrow_back_rounded, color: AppColors.text), onPressed: () => Navigator.pop(context)),
      ),
      body: SafeArea(
        child: Column(
          children: [
            _buildSelector(),
            if (_selectedName != null)
              Expanded(child: _loading ? const Center(child: CircularProgressIndicator()) : _buildContent()),
          ],
        ),
      ),
    );
  }

  Widget _buildSelector() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(20), border: Border.all(color: AppColors.border)),
        child: DropdownButtonHideUnderline(
          child: DropdownButton<String>(
            isExpanded: true, value: _selectedName, dropdownColor: AppColors.surface,
            style: const TextStyle(color: AppColors.text, fontWeight: FontWeight.bold),
            items: _staff.map((s) => DropdownMenuItem(value: s['name'] as String, child: Text(s['name'] as String))).toList(),
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
        const SizedBox(height: 24),
        Text(context.tr('operationLog'), style: const TextStyle(color: AppColors.text, fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        if (_transactions.isEmpty) Center(child: Text(context.tr('no_transactions'), style: const TextStyle(color: AppColors.textLight))),
        ..._transactions.map(_buildTxItem),
      ],
    );
  }

  Widget _buildSummaryCards() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(32), border: Border.all(color: AppColors.border), boxShadow: AppColors.premiumShadow),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _summaryItem(context.tr('total_earned'), _summary['earned']!, AppColors.success),
              _summaryItem(context.tr('total_paid'), _summary['paid']!, AppColors.secondary),
            ],
          ),
          const Divider(height: 32),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(context.tr('final_balance'), style: const TextStyle(color: AppColors.text, fontWeight: FontWeight.bold)),
              Text(FormatUtils.formatCurrency(_summary['balance']!), style: TextStyle(color: _summary['balance']! >= 0 ? AppColors.success : AppColors.danger, fontSize: 20, fontWeight: FontWeight.w900)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _summaryItem(String label, double val, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.bold)),
        Text(FormatUtils.formatCurrency(val), style: TextStyle(color: color, fontSize: 18, fontWeight: FontWeight.w900)),
      ],
    );
  }

  Widget _buildTxItem(dynamic tx) {
    final type = (tx['type'] ?? '').toString().toLowerCase();
    final isPay = type == 'salary' || type == 'advance';
    final color = isPay ? AppColors.secondary : AppColors.success;
    
    String label = tx['description'] ?? '';
    if (label.isEmpty) {
      if (type == 'salary') {
        label = context.tr('salary_payment');
      } else if (type == 'advance') {
        label = context.tr('salary_advance');
      } else if (type == 'credit') {
        label = context.tr('salary_credit');
      }
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(24), border: Border.all(color: AppColors.border)),
      child: Row(
        children: [
          Icon(isPay ? Icons.arrow_downward_rounded : Icons.arrow_upward_rounded, color: color),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(color: AppColors.text, fontWeight: FontWeight.w900)),
                Text(FormatUtils.formatDate(DateTime.parse(tx['createdAt'])), style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
              ],
            ),
          ),
          Text(FormatUtils.formatCurrency((tx['amount'] ?? 0).toDouble()), style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 16)),
        ],
      ),
    );
  }
}
