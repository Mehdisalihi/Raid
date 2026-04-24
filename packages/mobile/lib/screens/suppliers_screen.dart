import 'package:flutter/material.dart';
import '../core/api_service.dart';
import '../core/theme.dart';
import '../core/format_utils.dart';
import '../core/app_localizations.dart';
import 'customer_statement_screen.dart';

class SuppliersScreen extends StatefulWidget {
  const SuppliersScreen({super.key});
  @override
  State<SuppliersScreen> createState() => _SuppliersScreenState();
}

class _SuppliersScreenState extends State<SuppliersScreen> {
  List<dynamic> _suppliers = [];
  bool _loading = true;
  String _search = '';
  bool _showModal = false;
  bool _saving = false;
  Map<String, dynamic>? _editing;

  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _contact = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    try {
      final data = await SupplierService.getAll();
      if (mounted) setState(() => _suppliers = data);
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  List<dynamic> get _filtered => _suppliers.where((s) {
        final q = _search.toLowerCase();
        return (s['name'] ?? '').toLowerCase().contains(q) ||
            (s['phone'] ?? '').contains(q);
      }).toList();

  void _openModal([Map<String, dynamic>? supplier]) {
    _editing = supplier;
    if (supplier != null) {
      _name.text = supplier['name']?.toString() ?? '';
      _phone.text = supplier['phone']?.toString() ?? '';
      _contact.text = supplier['contactPerson']?.toString() ?? '';
    } else {
      _name.clear();
      _phone.clear();
      _contact.clear();
    }
    setState(() => _showModal = true);
  }

  Future<void> _save() async {
    if (_name.text.trim().isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('supplierNameRequired'))));
      return;
    }
    setState(() => _saving = true);
    final body = {
      'name': _name.text.trim(),
      'phone': _phone.text.trim(),
      'contactPerson': _contact.text.trim(),
    };
    try {
      if (_editing != null) {
        await SupplierService.update(_editing!['id'], body);
      } else {
        await SupplierService.create(body);
      }
      setState(() => _showModal = false);
      _fetch();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(context.tr('saveSupplierFailed')),
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
             Text(context.tr('deleteSupplierTitle'), style: const TextStyle(color: AppColors.text)),
        content:  Text(
          context.tr('deleteSupplierConfirm'),
          style: const TextStyle(color: AppColors.textMuted),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child:  Text(context.tr('cancel')),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child:  Text(context.tr('delete'), style: const TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await SupplierService.delete(id);
      _fetch();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(context.tr('deleteSupplierFailed')),
            backgroundColor: AppColors.danger,
          ),
        );
      }
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
                  Expanded(child: _buildSupplierList()),
                ],
              ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openModal(),
        elevation: 10,
        backgroundColor: AppColors.secondary,
        child: Container(
          width: 60,
          height: 60,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: AppColors.accentGradient,
            boxShadow: [
              BoxShadow(
                color: AppColors.secondary.withValues(alpha: 0.4),
                blurRadius: 12,
                offset: const Offset(0, 4),
              )
            ],
          ),
          child: const Icon(Icons.person_add_rounded,
              color: Colors.white, size: 28),
        ),
      ),
      bottomSheet: _showModal ? _buildAddEditModal() : null,
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
                context.tr('suppliers'),
                style: const TextStyle(
                    color: AppColors.text,
                    fontSize: 24,
                    fontWeight: FontWeight.w900),
              ),
              Text(
                context.tr('manageSuppliers'),
                style: const TextStyle(color: AppColors.textLight, fontSize: 13),
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.secondary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(15),
            ),
            child: const Icon(Icons.local_shipping_rounded,
                color: AppColors.secondary, size: 28),
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
              context.tr('totalSuppliersCount'),
              FormatUtils.formatNumber(_suppliers.length),
              context.tr('supplierUnit'),
              AppColors.secondary,
              Icons.business_rounded,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _statCard(
              context.tr('supplierBalances'),
              FormatUtils.formatNumber(_suppliers.fold(
                      0.0,
                      (sum, s) =>
                          sum +
                          (double.tryParse(s['balance']?.toString() ?? '0') ??
                              0))),
              'MRU',
              AppColors.success,
              Icons.account_balance_wallet_rounded,
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
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 10,
                        fontWeight: FontWeight.bold)),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(val,
                        style: const TextStyle(
                            color: AppColors.text,
                            fontSize: 18,
                            fontWeight: FontWeight.w900)),
                    const SizedBox(width: 4),
                    Text(unit, style: TextStyle(color: color, fontSize: 10)),
                  ],
                ),
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
          hintStyle: const TextStyle(color: AppColors.textLight),
          prefixIcon:
              const Icon(Icons.search_rounded, color: AppColors.secondary),
          filled: true,
          fillColor: AppColors.surface,
          contentPadding: const EdgeInsets.symmetric(vertical: 16),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(20),
            borderSide: const BorderSide(color: AppColors.border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(20),
            borderSide: const BorderSide(color: AppColors.secondary, width: 2),
          ),
        ),
      ),
    );
  }

  Widget _buildSupplierList() {
    if (_filtered.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.business_center_outlined,
                size: 80, color: AppColors.textLight.withValues(alpha: 0.3)),
            const SizedBox(height: 16),
             Text(context.tr('noSuppliersFound'),
                style: const TextStyle(color: AppColors.textLight)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
      itemCount: _filtered.length,
      itemBuilder: (context, index) {
        final s = _filtered[index];
        final balance = double.tryParse(s['balance']?.toString() ?? '0') ?? 0;

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppColors.border),
          ),
          child: ListTile(
            contentPadding: const EdgeInsets.all(16),
            onTap: () => _openModal(s),
            leading: CircleAvatar(
              radius: 28,
              backgroundColor: AppColors.secondary.withValues(alpha: 0.1),
              child: Text(
                (s['name']?[0] ?? '?').toUpperCase(),
                style: const TextStyle(
                    color: AppColors.secondary,
                    fontWeight: FontWeight.bold,
                    fontSize: 18),
              ),
            ),
            title: Text(
              s['name'] ?? '',
              style: const TextStyle(
                  color: AppColors.text,
                  fontWeight: FontWeight.w800,
                  fontSize: 16),
            ),
            subtitle: Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Row(
                children: [
                  const Icon(Icons.phone_rounded,
                      size: 14, color: AppColors.textLight),
                  const SizedBox(width: 4),
                  Text(s['phone'] ?? context.tr('noPhone'),
                      style: const TextStyle(
                          color: AppColors.textLight, fontSize: 13)),
                ],
              ),
            ),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      FormatUtils.formatCurrency(balance),
                      style: const TextStyle(
                        color: AppColors.success,
                        fontWeight: FontWeight.w900,
                        fontSize: 15,
                      ),
                    ),
                     Text(context.tr('balanceLabel'),
                        style: const TextStyle(
                            color: AppColors.textLight, fontSize: 10)),
                  ],
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) =>
                          CustomerStatementScreen(initialName: s['name']),
                    ),
                  ),
                  icon: const Icon(Icons.description_rounded,
                      color: AppColors.secondary),
                  tooltip: context.tr('statementTooltip'),
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
                Text(
                  _editing == null ? context.tr('addNewSupplier') : context.tr('editSupplier'),
                  style: const TextStyle(
                      color: AppColors.text,
                      fontSize: 20,
                      fontWeight: FontWeight.w900),
                ),
                IconButton(
                  onPressed: () => setState(() => _showModal = false),
                  icon: const Icon(Icons.close_rounded, color: AppColors.text),
                ),
              ],
            ),
            const Divider(color: AppColors.border, height: 32),
            _inputField(context.tr('name'), _name, Icons.business_rounded),
            _inputField(context.tr('phone'), _phone, Icons.phone_rounded, true),
            _inputField(context.tr('contactPerson'), _contact, Icons.person_rounded),
            const SizedBox(height: 32),
            _saving
                ? const Center(child: CircularProgressIndicator())
                : ElevatedButton(
                    onPressed: _save,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.secondary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 18),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16)),
                      elevation: 5,
                    ),
                    child: Text(
                      context.tr('save'),
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.bold),
                    ),
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
            const SizedBox(height: 50),
          ],
        ),
      ),
    );
  }

  Widget _inputField(String label, TextEditingController ctrl, IconData icon,
      [bool isNum = false]) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
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
            keyboardType: isNum ? TextInputType.phone : TextInputType.text,
            style: const TextStyle(color: AppColors.text),
            decoration: InputDecoration(
              prefixIcon:
                  Icon(icon, color: AppColors.secondary.withValues(alpha: 0.6)),
              filled: true,
              fillColor: AppColors.bg.withValues(alpha: 0.5),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(15),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(15),
                borderSide: const BorderSide(color: AppColors.secondary),
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _contact.dispose();
    super.dispose();
  }
}
