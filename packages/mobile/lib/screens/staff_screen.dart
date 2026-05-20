import 'package:flutter/material.dart';
import '../core/api_service.dart';
import '../core/theme.dart';
import '../core/format_utils.dart';
import '../core/app_localizations.dart';
import 'staff_statement_screen.dart';

class StaffScreen extends StatefulWidget {
  const StaffScreen({super.key});
  @override
  State<StaffScreen> createState() => _StaffScreenState();
}

class _StaffScreenState extends State<StaffScreen> {
  List<dynamic> _staff = [];
  bool _loading = true;
  String _search = '';
  bool _showModal = false;
  bool _saving = false;
  Map<String, dynamic>? _editing;

  final _nameCtrl = TextEditingController();
  final _roleCtrl = TextEditingController();
  final _salaryCtrl = TextEditingController();

  // Payment Modal controllers
  bool _showPayModal = false;
  Map<String, dynamic>? _payingStaff;
  final _payAmountCtrl = TextEditingController();
  String _payType = 'salary'; // salary, advance

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    try {
      final data = await StaffService.getAll();
      if (mounted) setState(() => _staff = data);
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  List<dynamic> get _filtered => _staff.where((s) {
        final search = _search.toLowerCase();
        return (s['name'] ?? '').toLowerCase().contains(search) ||
            (s['role'] ?? '').toLowerCase().contains(search);
      }).toList();

  void _openModal([Map<String, dynamic>? member]) {
    _editing = member;
    if (member != null) {
      _nameCtrl.text = member['name']?.toString() ?? '';
      _roleCtrl.text = member['role']?.toString() ?? '';
      _salaryCtrl.text = member['baseSalary']?.toString() ?? '0';
    } else {
      _nameCtrl.clear();
      _roleCtrl.clear();
      _salaryCtrl.text = '0';
    }
    setState(() => _showModal = true);
  }

  Future<void> _save() async {
    if (_nameCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('fillRequired'))));
      return;
    }
    setState(() => _saving = true);
    final body = {
      'name': _nameCtrl.text.trim(),
      'role': _roleCtrl.text.trim(),
      'baseSalary': double.tryParse(_salaryCtrl.text) ?? 0.0,
    };
    try {
      if (_editing != null) {
        await StaffService.update(_editing!['id'], body);
      } else {
        await StaffService.create(body);
      }
      setState(() => _showModal = false);
      _fetch();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(context.tr('userError')),
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
        title: Text(context.tr('delete'), style: const TextStyle(color: AppColors.text)),
        content: Text(context.tr('confirmDelete'), style: const TextStyle(color: AppColors.textMuted)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(context.tr('cancel'))),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(context.tr('delete'), style: const TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await StaffService.delete(id);
      _fetch();
      setState(() => _showModal = false);
    } catch (_) {}
  }

  void _openPayModal(Map<String, dynamic> staff) {
    _payingStaff = staff;
    _payAmountCtrl.clear();
    _payType = 'salary';
    setState(() => _showPayModal = true);
  }

  Future<void> _submitPayment() async {
    final amt = double.tryParse(_payAmountCtrl.text) ?? 0.0;
    if (amt <= 0) return;

    setState(() => _saving = true);
    try {
      await StaffService.pay(_payingStaff!['id'], {
        'amount': amt,
        'type': _payType.toUpperCase(),
        'date': DateTime.now().toIso8601String(),
      });
      setState(() => _showPayModal = false);
      _fetch();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr('salary_payment_success')), backgroundColor: AppColors.success),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr('salary_payment_failed')), backgroundColor: AppColors.danger),
      );
    } finally {
      setState(() => _saving = false);
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
                  _buildSearchBar(),
                  Expanded(child: _buildStaffList()),
                ],
              ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openModal(),
        backgroundColor: AppColors.primary,
        child: Container(
          width: 60, height: 60,
          decoration: BoxDecoration(shape: BoxShape.circle, gradient: AppColors.primaryGradient),
          child: const Icon(Icons.person_add_rounded, color: Colors.white),
        ),
      ),
      bottomSheet: _showModal ? _buildAddEditModal() : (_showPayModal ? _buildPayModal() : null),
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
              Text(context.tr('staff'), style: const TextStyle(color: AppColors.text, fontSize: 24, fontWeight: FontWeight.w900)),
              Text(context.tr('staff_mgmt'), style: const TextStyle(color: AppColors.textLight, fontSize: 13)),
            ],
          ),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(15)),
            child: Icon(Icons.badge_rounded, color: AppColors.primary, size: 28),
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
          Expanded(child: _statCard(context.tr('staff'), _staff.length.toString(), context.tr('user'), AppColors.primary, Icons.group_rounded)),
          const SizedBox(width: 12),
          Expanded(child: _statCard(context.tr('total_paid'), FormatUtils.formatNumber(_staff.fold(0.0, (s, e) => s + (double.tryParse(e['balance']?.toString() ?? '0') ?? 0).abs())), context.tr('currency'), AppColors.secondary, Icons.payments_rounded)),
        ],
      ),
    );
  }

  Widget _statCard(String label, String val, String unit, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(24), border: Border.all(color: AppColors.border)),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(14)),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.bold)),
                FittedBox(child: Text(val, style: const TextStyle(color: AppColors.text, fontSize: 18, fontWeight: FontWeight.w900))),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: TextField(
        onChanged: (v) => setState(() => _search = v),
        style: const TextStyle(color: AppColors.text),
        decoration: InputDecoration(
          hintText: context.tr('search'),
          prefixIcon: Icon(Icons.search_rounded, color: AppColors.primary),
          filled: true, fillColor: AppColors.surface,
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: const BorderSide(color: AppColors.border)),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide(color: AppColors.primary, width: 2)),
        ),
      ),
    );
  }

  Widget _buildStaffList() {
    if (_filtered.isEmpty) return Center(child: Text(context.tr('noResults'), style: const TextStyle(color: AppColors.textLight)));
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
      itemCount: _filtered.length,
      itemBuilder: (context, index) {
        final s = _filtered[index];
        final balance = double.tryParse(s['balance']?.toString() ?? '0') ?? 0;

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(24), border: Border.all(color: AppColors.border)),
          child: ListTile(
            contentPadding: const EdgeInsets.all(16),
            onTap: () => _openModal(s),
            leading: CircleAvatar(
              radius: 28, backgroundColor: AppColors.primary.withValues(alpha: 0.1),
              child: Text((s['name']?[0] ?? '?').toUpperCase(), style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
            ),
            title: Text(s['name'] ?? '', style: const TextStyle(color: AppColors.text, fontWeight: FontWeight.w800)),
            subtitle: Text(s['role'] ?? '', style: const TextStyle(color: AppColors.textLight, fontSize: 13)),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(FormatUtils.formatCurrency(balance.abs()), style: TextStyle(color: balance >= 0 ? AppColors.success : AppColors.danger, fontWeight: FontWeight.w900)),
                    Text(context.tr('balanceLabel'), style: const TextStyle(color: AppColors.textLight, fontSize: 10)),
                  ],
                ),
                const SizedBox(width: 8),
                IconButton(icon: const Icon(Icons.payment_rounded), color: AppColors.secondary, onPressed: () => _openPayModal(s)),
                IconButton(
                  icon: const Icon(Icons.description_rounded), color: AppColors.primary,
                  onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => StaffStatementScreen(initialName: s['name']))),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildAddEditModal() {
    return DraggableScrollableSheet(
      initialChildSize: 0.8, minChildSize: 0.5, maxChildSize: 0.95,
      builder: (_, controller) => Container(
        decoration: const BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.vertical(top: Radius.circular(30))),
        padding: const EdgeInsets.all(24),
        child: ListView(
          controller: controller,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(_editing == null ? context.tr('add_staff') : context.tr('edit'), style: const TextStyle(color: AppColors.text, fontSize: 20, fontWeight: FontWeight.w900)),
                IconButton(onPressed: () => setState(() => _showModal = false), icon: const Icon(Icons.close_rounded)),
              ],
            ),
            const Divider(),
            _inputField(context.tr('staff_name'), _nameCtrl, Icons.person_rounded),
            _inputField(context.tr('staff_role'), _roleCtrl, Icons.work_rounded),
            _inputField(context.tr('base_salary'), _salaryCtrl, Icons.money_rounded, true),
            const SizedBox(height: 20),
            _saving ? const Center(child: CircularProgressIndicator()) : ElevatedButton(
              onPressed: _save,
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 18), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
              child: Text(context.tr('save')),
            ),
            if (_editing != null) ...[
              const SizedBox(height: 12),
              TextButton(onPressed: () => _delete(_editing!['id']), child: Text(context.tr('delete'), style: const TextStyle(color: AppColors.danger))),
            ]
          ],
        ),
      ),
    );
  }

  Widget _buildPayModal() {
    return DraggableScrollableSheet(
      initialChildSize: 0.6, minChildSize: 0.4, maxChildSize: 0.8,
      builder: (_, controller) => Container(
        decoration: const BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.vertical(top: Radius.circular(30))),
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(context.tr('pay_salary'), style: const TextStyle(color: AppColors.text, fontSize: 20, fontWeight: FontWeight.w900)),
                IconButton(onPressed: () => setState(() => _showPayModal = false), icon: const Icon(Icons.close_rounded)),
              ],
            ),
            const SizedBox(height: 20),
            Text(_payingStaff?['name'] ?? '', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 18)),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(child: _payTypeTile('salary', context.tr('salary_payment'), Icons.payments_rounded)),
                const SizedBox(width: 12),
                Expanded(child: _payTypeTile('advance', context.tr('salary_advance'), Icons.history_edu_rounded)),
              ],
            ),
            const SizedBox(height: 20),
            _inputField(context.tr('amount'), _payAmountCtrl, Icons.money_rounded, true),
            const Spacer(),
            _saving ? const Center(child: CircularProgressIndicator()) : SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _submitPayment,
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.secondary, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 18), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                child: Text(context.tr('confirm')),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _payTypeTile(String type, String label, IconData icon) {
    final active = _payType == type;
    return GestureDetector(
      onTap: () => setState(() => _payType = type),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: active ? AppColors.secondary.withValues(alpha: 0.1) : AppColors.bg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: active ? AppColors.secondary : AppColors.border),
        ),
        child: Column(
          children: [
            Icon(icon, color: active ? AppColors.secondary : AppColors.textLight),
            const SizedBox(height: 8),
            Text(label, style: TextStyle(color: active ? AppColors.secondary : AppColors.textLight, fontWeight: FontWeight.bold, fontSize: 12)),
          ],
        ),
      ),
    );
  }

  Widget _inputField(String label, TextEditingController ctrl, IconData icon, [bool isNum = false]) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextField(
        controller: ctrl, keyboardType: isNum ? TextInputType.number : TextInputType.text,
        style: const TextStyle(color: AppColors.text),
        decoration: InputDecoration(
          labelText: label, prefixIcon: Icon(icon, color: AppColors.primary),
          filled: true, fillColor: AppColors.bg.withValues(alpha: 0.5),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: const BorderSide(color: AppColors.border)),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: BorderSide(color: AppColors.primary)),
        ),
      ),
    );
  }
}
