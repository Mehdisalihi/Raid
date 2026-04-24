import 'package:flutter/material.dart';
import '../core/api_service.dart';
import '../core/theme.dart';
import '../core/format_utils.dart';
import '../core/app_localizations.dart';

class ExpensesScreen extends StatefulWidget {
  const ExpensesScreen({super.key});
  @override
  State<ExpensesScreen> createState() => _ExpensesScreenState();
}

class _ExpensesScreenState extends State<ExpensesScreen> {
  List<dynamic> _expenses = [];
  List<dynamic> _categories = [];
  bool _loading = true;
  bool _showModal = false;
  bool _saving = false;
  dynamic _selectedCatId;
  Map<String, dynamic>? _editing;

  final _desc = TextEditingController();
  final _amount = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    try {
      final results = await Future.wait([
        ExpenseService.getAll(),
        ExpenseService.getCategories(),
      ]);
      if (mounted) {
        setState(() {
          _expenses = results[0];
          _categories = results[1];
          if (_categories.isNotEmpty && _selectedCatId == null) {
            _selectedCatId = _categories[0]['id'];
          }
        });
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  double get _total =>
      _expenses.fold(0.0, (s, e) => s + ((e['amount'] ?? 0).toDouble()));

  void _openModal([Map<String, dynamic>? expense]) {
    _editing = expense;
    if (expense != null) {
      _desc.text = expense['description']?.toString() ?? '';
      _amount.text = expense['amount']?.toString() ?? '';
      _selectedCatId = expense['categoryId'];
    } else {
      _desc.clear();
      _amount.clear();
      if (_categories.isNotEmpty) _selectedCatId = _categories[0]['id'];
    }
    setState(() => _showModal = true);
  }

  Future<void> _save() async {
    if (_desc.text.trim().isEmpty ||
        _amount.text.isEmpty ||
        _selectedCatId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr('fillRequired'))),
      );
      return;
    }
    setState(() => _saving = true);
    final body = {
      'description': _desc.text.trim(),
      'amount': double.parse(_amount.text),
      'categoryId': _selectedCatId,
      'date': DateTime.now().toIso8601String(),
    };
    try {
      if (_editing != null) {
        await ExpenseService.update(_editing!['id'], body);
      } else {
        await ExpenseService.create(body);
      }
      setState(() => _showModal = false);
      _fetch();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(context.tr('saveFailed')),
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
        title:
            Text(context.tr('delete'), style: const TextStyle(color: AppColors.text)),
        content: Text(context.tr('confirmDelete'),
            style: const TextStyle(color: AppColors.textMuted)),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(context.tr('cancel'))),
          TextButton(
              onPressed: () => Navigator.pop(context, true),
              child:
                  Text(context.tr('delete'), style: const TextStyle(color: AppColors.danger))),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ExpenseService.delete(id);
      _fetch();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(context.tr('deleteExpenseFailed')),
              backgroundColor: AppColors.danger),
        );
      }
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
            _buildTotalCard(),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _expenses.isEmpty
                      ? _buildEmptyState()
                      : _buildExpensesList(),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openModal(),
        backgroundColor: AppColors.danger,
        child: const Icon(Icons.add_rounded, color: Colors.white, size: 32),
      ),
      bottomSheet: _showModal ? _buildModalSheet() : null,
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
                context.tr('expenses'),
                style: const TextStyle(
                    color: AppColors.text,
                    fontSize: 24,
                    fontWeight: FontWeight.w900),
              ),
              Text(
                context.tr('manageExpenses'),
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
            child: const Icon(Icons.payments_rounded,
                color: AppColors.danger, size: 28),
          ),
        ],
      ),
    );
  }

  Widget _buildTotalCard() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [AppColors.danger, AppColors.danger.withValues(alpha: 0.8)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: AppColors.danger.withValues(alpha: 0.3),
              blurRadius: 15,
              offset: const Offset(0, 8),
            )
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              context.tr('totalExpenses'),
              style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 14,
                  fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  FormatUtils.formatCurrency(_total),
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 32,
                      fontWeight: FontWeight.w900),
                ),
                const Icon(Icons.account_balance_wallet_rounded,
                    color: Colors.white30, size: 40),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.receipt_long_outlined,
              size: 80, color: AppColors.textLight.withValues(alpha: 0.2)),
          const SizedBox(height: 16),
          Text(context.tr('noExpenses'),
              style: const TextStyle(color: AppColors.textLight)),
        ],
      ),
    );
  }

  Widget _buildExpensesList() {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 100),
      itemCount: _expenses.length,
      itemBuilder: (context, index) {
        final e = _expenses[index];
        final date = DateTime.tryParse(e['date'] ?? '') ?? DateTime.now();
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppColors.border),
          ),
          child: ListTile(
            contentPadding: const EdgeInsets.all(16),
            onTap: () => _openModal(e),
            leading: CircleAvatar(
              backgroundColor: AppColors.danger.withValues(alpha: 0.1),
              child: const Icon(Icons.outbox_rounded,
                  color: AppColors.danger, size: 18),
            ),
            title: Text(
              e['description'] ?? context.tr('noDescription'),
              style: const TextStyle(
                  color: AppColors.text, fontWeight: FontWeight.w800),
            ),
            subtitle: Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                '${FormatUtils.formatDate(date)} | ${_categories.firstWhere((c) => c['id'] == e['category'], orElse: () => {
                      'name': e['category'] ?? context.tr('general')
                    })['name']}',
                style:
                    const TextStyle(color: AppColors.textLight, fontSize: 12),
              ),
            ),
            trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  FormatUtils.formatNumber(e['amount'], decimalPlaces: 2),
                  style: const TextStyle(
                      color: AppColors.danger,
                      fontWeight: FontWeight.w900,
                      fontSize: 16),
                ),
                const Text('MRU',
                    style: TextStyle(color: AppColors.textLight, fontSize: 10)),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildModalSheet() {
    return DraggableScrollableSheet(
      initialChildSize: 0.75,
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
                Text(_editing == null ? context.tr('addExpense') : context.tr('editExpense'),
                    style: const TextStyle(
                        color: AppColors.text,
                        fontSize: 20,
                        fontWeight: FontWeight.w900)),
                IconButton(
                    onPressed: () => setState(() => _showModal = false),
                    icon: const Icon(Icons.close_rounded)),
              ],
            ),
            const Divider(),
            const SizedBox(height: 16),
            _inputField(context.tr('description'), _desc, Icons.description_rounded),
            _inputField(context.tr('amount'), _amount, Icons.calculate_rounded, true),
            const SizedBox(height: 16),
            Text(context.tr('category'),
                style: const TextStyle(
                    color: AppColors.textLight,
                    fontSize: 12,
                    fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: _categories.map((cat) {
                final active = _selectedCatId == cat['id'];
                return GestureDetector(
                  onTap: () => setState(() => _selectedCatId = cat['id']),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 10),
                    decoration: BoxDecoration(
                      color: active ? AppColors.danger : AppColors.bg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                          color: active ? AppColors.danger : AppColors.border),
                    ),
                    child: Text(
                      cat['name'] ?? '',
                      style: TextStyle(
                          color: active ? Colors.white : AppColors.text,
                          fontWeight: FontWeight.bold),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 40),
            ElevatedButton(
              onPressed: _saving ? null : _save,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.danger,
                minimumSize: const Size(double.infinity, 56),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16)),
              ),
              child: _saving
                  ? const CircularProgressIndicator(color: Colors.white)
                  : Text(context.tr('save'),
                      style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 16)),
            ),
            if (_editing != null) ...[
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => _delete(_editing!['id']),
                child: Text(context.tr('delete'),
                    style: const TextStyle(
                        color: AppColors.danger, fontWeight: FontWeight.bold)),
              ),
            ],
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _inputField(String label, TextEditingController ctrl, IconData icon,
      [bool isNum = false]) {
    return Column(
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
                Icon(icon, color: AppColors.danger.withValues(alpha: 0.6)),
            filled: true,
            fillColor: AppColors.bg,
            enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(15),
                borderSide: const BorderSide(color: AppColors.border)),
            focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(15),
                borderSide: const BorderSide(color: AppColors.danger)),
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  @override
  void dispose() {
    _desc.dispose();
    _amount.dispose();
    super.dispose();
  }
}
