import 'package:flutter/material.dart';
import '../core/api_service.dart';
import '../core/theme.dart';
import '../core/app_localizations.dart';

class UserManagementScreen extends StatefulWidget {
  const UserManagementScreen({super.key});

  @override
  State<UserManagementScreen> createState() => _UserManagementScreenState();
}

class _UserManagementScreenState extends State<UserManagementScreen> {
  List<dynamic> _users = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    try {
      final data = await UserService.getAll();
      setState(() => _users = data);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr('userError')), backgroundColor: AppColors.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showUserForm([Map<String, dynamic>? user]) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => UserForm(
        user: user,
        onRefresh: _fetch,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr('userManagement'), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20)),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: AppColors.text,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              onRefresh: _fetch,
              child: ListView.builder(
                padding: const EdgeInsets.all(20),
                itemCount: _users.length,
                itemBuilder: (context, index) {
                  final user = _users[index];
                  return _buildUserCard(user);
                },
              ),
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showUserForm(),
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.person_add_rounded, color: Colors.white),
        label: Text(context.tr('addUser'), style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
      ),
    );
  }

  Widget _buildUserCard(Map<String, dynamic> user) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: CircleAvatar(
          backgroundColor: AppColors.primary.withValues(alpha: 0.1),
          child: Text(user['name'][0].toUpperCase(), style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
        ),
        title: Text(user['name'], style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.text)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(user['email'], style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
            const SizedBox(height: 4),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.secondary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(context.tr(user['role'].toString().toLowerCase()), style: const TextStyle(color: AppColors.secondary, fontSize: 10, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(width: 8),
                if (user['isActive'] == false)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.danger.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(context.tr('inactive'), style: const TextStyle(color: AppColors.danger, fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
              ],
            ),
          ],
        ),
        trailing: IconButton(
          icon: const Icon(Icons.edit_rounded, color: AppColors.textMuted),
          onPressed: () => _showUserForm(user),
        ),
      ),
    );
  }
}

class UserForm extends StatefulWidget {
  final Map<String, dynamic>? user;
  final VoidCallback onRefresh;

  const UserForm({super.key, this.user, required this.onRefresh});

  @override
  State<UserForm> createState() => _UserFormState();
}

class _UserFormState extends State<UserForm> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameCtrl;
  late TextEditingController _emailCtrl;
  late TextEditingController _phoneCtrl;
  late TextEditingController _passCtrl;
  String _role = 'USER';
  bool _isActive = true;
  bool _saving = false;

  // Permissions
  bool _canSales = true;
  bool _canInvoices = true;
  bool _canInventory = true;
  bool _canReports = false;
  bool _canCustomers = true;
  bool _canExpenses = false;
  bool _canSettings = false;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.user?['name']);
    _emailCtrl = TextEditingController(text: widget.user?['email']);
    _phoneCtrl = TextEditingController(text: widget.user?['phone']);
    _passCtrl = TextEditingController();
    if (widget.user != null) {
      _role = widget.user!['role'];
      _isActive = widget.user!['isActive'] ?? true;
      _canSales = widget.user!['canAccessSales'] ?? true;
      _canInvoices = widget.user!['canCreateInvoices'] ?? true;
      _canInventory = widget.user!['canManageInventory'] ?? true;
      _canReports = widget.user!['canViewReports'] ?? false;
      _canCustomers = widget.user!['canManageCustomers'] ?? true;
      _canExpenses = widget.user!['canManageExpenses'] ?? false;
      _canSettings = widget.user!['canAccessSettings'] ?? false;
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _saving = true);
    final data = {
      'name': _nameCtrl.text,
      'email': _emailCtrl.text,
      'phone': _phoneCtrl.text,
      'role': _role,
      'isActive': _isActive,
      'canAccessSales': _canSales,
      'canCreateInvoices': _canInvoices,
      'canManageInventory': _canInventory,
      'canViewReports': _canReports,
      'canManageCustomers': _canCustomers,
      'canManageExpenses': _canExpenses,
      'canAccessSettings': _canSettings,
    };
    if (_passCtrl.text.isNotEmpty) data['password'] = _passCtrl.text;

    try {
      if (widget.user == null) {
        await UserService.create(data);
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.tr('userAddedSuccess')), backgroundColor: AppColors.success));
      } else {
        await UserService.update(widget.user!['id'], data);
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.tr('userUpdatedSuccess')), backgroundColor: AppColors.success));
      }
      widget.onRefresh();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.tr('userError')), backgroundColor: AppColors.danger));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.9,
      decoration: const BoxDecoration(
        color: Color(0xFF1E2128),
        borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
      ),
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Form(
        key: _formKey,
        child: Column(
          children: [
            Container(
              margin: const EdgeInsets.only(top: 8, bottom: 20),
              width: 40,
              height: 4,
              decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(2)),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  Text(widget.user == null ? context.tr('addUser') : context.tr('editUser'),
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white)),
                  const SizedBox(height: 24),
                  _buildInput(_nameCtrl, context.tr('usernameLabel'), Icons.person_rounded),
                  const SizedBox(height: 16),
                  _buildInput(_emailCtrl, context.tr('email'), Icons.email_rounded, keyboard: TextInputType.emailAddress),
                  const SizedBox(height: 16),
                  _buildInput(_phoneCtrl, context.tr('phone'), Icons.phone_rounded, keyboard: TextInputType.phone),
                  const SizedBox(height: 16),
                  _buildInput(_passCtrl, context.tr('passwordLabel'), Icons.lock_rounded, secure: true),
                  const SizedBox(height: 24),
                  _buildSectionTitle(context.tr('role')),
                  Wrap(
                    spacing: 8,
                    children: [
                      _buildRoleOption('ADMIN', context.tr('admin')),
                      _buildRoleOption('SALES', context.tr('salesEmployee')),
                      _buildRoleOption('STOCK', context.tr('stockEmployee')),
                      _buildRoleOption('ACCOUNTANT', context.tr('accountant')),
                    ],
                  ),
                  const SizedBox(height: 32),
                  _buildSectionTitle(context.tr('userPermissions')),
                  _buildPermissionToggle(context.tr('permissionSales'), _canSales, (v) => setState(() => _canSales = v)),
                  _buildPermissionToggle(context.tr('permissionInvoices'), _canInvoices, (v) => setState(() => _canInvoices = v)),
                  _buildPermissionToggle(context.tr('permissionInventory'), _canInventory, (v) => setState(() => _canInventory = v)),
                  _buildPermissionToggle(context.tr('permissionReports'), _canReports, (v) => setState(() => _canReports = v)),
                  _buildPermissionToggle(context.tr('permissionCustomers'), _canCustomers, (v) => setState(() => _canCustomers = v)),
                  _buildPermissionToggle(context.tr('permissionExpenses'), _canExpenses, (v) => setState(() => _canExpenses = v)),
                  _buildPermissionToggle(context.tr('permissionSettings'), _canSettings, (v) => setState(() => _canSettings = v)),
                  const SizedBox(height: 40),
                  ElevatedButton(
                    onPressed: _saving ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      minimumSize: const Size(double.infinity, 56),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: _saving ? const CircularProgressIndicator(color: Colors.white) : Text(context.tr('save'), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                  const SizedBox(height: 12),
                  if (widget.user != null)
                    TextButton(
                      onPressed: () async {
                        setState(() => _isActive = !_isActive);
                        await _submit();
                      },
                      child: Text(_isActive ? context.tr('inactive') : context.tr('active'), style: TextStyle(color: _isActive ? AppColors.danger : AppColors.success)),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(title, style: const TextStyle(color: AppColors.textMuted, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
    );
  }

  Widget _buildInput(TextEditingController ctrl, String label, IconData icon, {bool secure = false, TextInputType keyboard = TextInputType.text}) {
    return TextFormField(
      controller: ctrl,
      obscureText: secure,
      keyboardType: keyboard,
      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: AppColors.textMuted, fontSize: 13),
        prefixIcon: Icon(icon, color: AppColors.primary, size: 20),
        filled: true,
        fillColor: Colors.white.withValues(alpha: 0.03),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: BorderSide.none),
      ),
      validator: (v) => v!.isEmpty && widget.user == null ? 'Veuillez remplir ce champ' : null,
    );
  }

  Widget _buildRoleOption(String value, String label) {
    final active = _role == value;
    return ChoiceChip(
      label: Text(label),
      selected: active,
      onSelected: (s) => setState(() => _role = value),
      selectedColor: AppColors.primary,
      labelStyle: TextStyle(color: active ? Colors.white : AppColors.textMuted, fontWeight: FontWeight.bold, fontSize: 12),
      backgroundColor: Colors.white.withValues(alpha: 0.05),
    );
  }

  Widget _buildPermissionToggle(String label, bool value, Function(bool) onChanged) {
    return SwitchListTile(
      title: Text(label, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600)),
      value: value,
      onChanged: onChanged,
      activeThumbColor: AppColors.primary,
      contentPadding: EdgeInsets.zero,
    );
  }
}
