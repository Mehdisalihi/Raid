import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'dart:convert';
import '../core/auth_provider.dart';
import '../core/theme.dart';
import '../core/locale_provider.dart';
import '../core/theme_provider.dart';
import '../core/app_localizations.dart';
import '../core/format_utils.dart';
import '../core/api_service.dart';
import 'user_management_screen.dart';


class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _isSyncing = false;
  bool _isSaving = false;
  final _storeNameController = TextEditingController();
  final _storeTaxIdController = TextEditingController();
  final _storeAddressController = TextEditingController();
  final _storePhoneController = TextEditingController();
  final _storeEmailController = TextEditingController();
  String? _logoBase64;
  String? _lastSyncTime;

  @override
  void initState() {
    super.initState();
    _loadSyncTime();
    _loadStoreData();
  }

  void _loadStoreData() {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final user = auth.user;
    if (user != null) {
      _storeNameController.text = (user['storeName'] ?? '').toString();
      _storeTaxIdController.text = (user['storeTaxId'] ?? '').toString();
      _storeAddressController.text = (user['storeAddress'] ?? '').toString();
      _storePhoneController.text = (user['storePhone'] ?? '').toString();
      _storeEmailController.text = (user['storeEmail'] ?? '').toString();
      _logoBase64 = user['storeLogo']?.toString();
    }
  }

  Future<void> _pickImage() async {
    try {
      final picker = ImagePicker();
      final XFile? image = await picker.pickImage(source: ImageSource.gallery, maxWidth: 800, maxHeight: 800, imageQuality: 70);
      if (image != null) {
        final bytes = await File(image.path).readAsBytes();
        setState(() {
          _logoBase64 = 'data:image/png;base64,${base64Encode(bytes)}';
        });
      }
    } catch (e) {
      debugPrint('Error picking image: $e');
    }
  }

  Future<void> _saveSettings() async {
    setState(() => _isSaving = true);
    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final data = {
        'storeName': _storeNameController.text,
        'storeTaxId': _storeTaxIdController.text,
        'storeAddress': _storeAddressController.text,
        'storePhone': _storePhoneController.text,
        'storeEmail': _storeEmailController.text,
        'storeLogo': _logoBase64,
      };
      
      // Update locally first for immediate feedback
      final updatedUser = Map<String, dynamic>.from(auth.user ?? {});
      updatedUser.addAll(data);
      await auth.updateUser(updatedUser);

      // Save to server
      await AuthService.updateSettings(data);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: const Text('تم حفظ الإعدادات بنجاح'), backgroundColor: AppColors.primary),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('فشل حفظ الإعدادات'), backgroundColor: AppColors.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  void dispose() {
    _storeNameController.dispose();
    _storeTaxIdController.dispose();
    _storeAddressController.dispose();
    _storePhoneController.dispose();
    _storeEmailController.dispose();
    super.dispose();
  }

  Future<void> _loadSyncTime() async {
    final time = await DataSync.getLastSync();
    if (mounted) {
      setState(() {
        if (time != null) {
          final dt = DateTime.parse(time);
          _lastSyncTime = '${dt.hour}:${dt.minute.toString().padLeft(2, '0')}';
        }
      });
    }
  }

  Future<void> _handleSync() async {
    setState(() => _isSyncing = true);
    try {
      await DataSync.syncAll();
      await _loadSyncTime();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr('syncSuccess'))),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr('syncFailed'))),
        );
      }
    } finally {
      if (mounted) setState(() => _isSyncing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final localeProvider = context.watch<LocaleProvider>();
    final themeProvider = context.watch<ThemeProvider>();
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          _buildHeader(context),
          const SizedBox(height: 28),
          _buildProfileCard(context, user),
          const SizedBox(height: 28),
          _buildSectionTitle(context, context.watch<LocaleProvider>().isRTL ? 'هوية المتجر' : 'Identité du magasin', Icons.business_rounded),
          _buildStoreSettingsCard(context),
          const SizedBox(height: 28),
          _buildSectionTitle(context, context.tr('dataSync'), Icons.sync_rounded),
          _buildSyncItem(context),
          const SizedBox(height: 24),
          _buildSectionTitle(context, context.tr('appSettings'), Icons.tune_rounded),
          _buildSettingItem(
            context,
            icon: Icons.palette_rounded,
            iconColor: AppColors.accent,
            title: context.tr('appearance'),
            subtitle: _getThemeName(context, themeProvider),
            onTap: () => _showAppearanceDialog(context, themeProvider),
          ),
          _buildSettingItem(
            context,
            icon: Icons.color_lens_rounded,
            iconColor: themeProvider.primaryColor,
            title: context.tr('primaryColor'),
            subtitle: context.tr('customizeIdentity'),
            onTap: () => _showColorDialog(context, themeProvider),
          ),
          _buildSettingItem(
            context,
            icon: Icons.language_rounded,
            iconColor: AppColors.primary,
            title: context.tr('language'),
            subtitle: localeProvider.isRTL ? context.tr('arabic') : context.tr('french'),
            onTap: () => _showLanguageDialog(context, localeProvider),
          ),
          if (user?['role'] == 'ADMIN') ...[
            const SizedBox(height: 24),
            _buildSectionTitle(context, context.tr('userManagement'), Icons.people_alt_rounded),
            _buildSettingItem(
              context,
              icon: Icons.manage_accounts_rounded,
              iconColor: AppColors.secondary,
              title: context.tr('userManagement'),
              subtitle: context.tr('userPermissionsMgmt'),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const UserManagementScreen()),
                );
              },
            ),
          ],
          const SizedBox(height: 24),
          _buildSectionTitle(context, context.tr('systemInfo'), Icons.settings_rounded),
          _buildSettingItem(
            context,
            icon: Icons.info_outline_rounded,
            iconColor: AppColors.secondary,
            title: context.tr('systemInfo'),
            subtitle: '${context.tr('appName')} v${FormatUtils.toLatinNumerals('1.0.0')}',
            onTap: () {},
          ),
          const SizedBox(height: 40),
          _buildLogoutButton(context, auth),
          const SizedBox(height: 32),
          _buildFooter(context),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildSyncItem(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.1)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: _isSyncing 
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
              : Icon(Icons.cloud_sync_rounded, color: AppColors.primary),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(context.tr('syncNow'), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                Text('${context.tr('lastSync')}: ${_lastSyncTime ?? context.tr('never')}', 
                  style: TextStyle(color: textTheme.bodySmall?.color, fontSize: 12)),
              ],
            ),
          ),
          IconButton(
            onPressed: _isSyncing ? null : _handleSync,
            icon: Icon(Icons.refresh_rounded, color: AppColors.primary),
            tooltip: context.tr('syncNow'),
          ),
        ],
      ),
    );
  }

  void _showAppearanceDialog(BuildContext context, ThemeProvider themeProvider) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(context.tr('appearance')),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildThemeOption(context, themeProvider, ThemeMode.system, 'system_theme', ctx),
            _buildThemeOption(context, themeProvider, ThemeMode.light, 'light', ctx),
            _buildThemeOption(context, themeProvider, ThemeMode.dark, 'dark', ctx),
          ],
        ),
      ),
    );
  }

  Widget _buildThemeOption(BuildContext context, ThemeProvider themeProvider, ThemeMode mode, String labelKey, BuildContext dialogCtx) {
    final isSelected = themeProvider.themeMode == mode;
    return ListTile(
      title: Text(context.tr(labelKey)),
      trailing: isSelected ? Icon(Icons.check_circle, color: AppColors.primary) : null,
      onTap: () {
        themeProvider.setThemeMode(mode);
        Navigator.pop(dialogCtx);
      },
    );
  }

  void _showColorDialog(BuildContext context, ThemeProvider themeProvider) {
    final colors = [
      const Color(0xFF1E40AF), // Blue
      const Color(0xFF4F46E5), // Indigo
      const Color(0xFF059669), // Emerald
      const Color(0xFFDC2626), // Red
      const Color(0xFFD97706), // Amber
      const Color(0xFF7C3AED), // Violet
      const Color(0xFFEC4899), // Pink
      const Color(0xFF334155), // Slate
    ];

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(context.tr('appearance')),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        content: SizedBox(
          width: double.maxFinite,
          child: GridView.builder(
            shrinkWrap: true,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 4,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
            ),
            itemCount: colors.length,
            itemBuilder: (context, index) {
              final color = colors[index];
              final isSelected = themeProvider.primaryColor.toARGB32() == color.toARGB32();
              return GestureDetector(
                onTap: () {
                  themeProvider.setPrimaryColor(color);
                  Navigator.pop(ctx);
                },
                child: Container(
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                    border: isSelected 
                      ? Border.all(color: Colors.white, width: 3)
                      : null,
                    boxShadow: [
                      BoxShadow(
                        color: color.withValues(alpha: 0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 4),
                      )
                    ],
                  ),
                  child: isSelected 
                    ? const Icon(Icons.check, color: Colors.white, size: 20)
                    : null,
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  String _getThemeName(BuildContext context, ThemeProvider themeProvider) {
    switch (themeProvider.themeMode) {
      case ThemeMode.system:
        return context.tr('system_theme');
      case ThemeMode.light:
        return context.tr('light');
      case ThemeMode.dark:
        return context.tr('dark');
    }
  }

  void _showLanguageDialog(BuildContext context, LocaleProvider localeProvider) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(context.tr('language')),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: const Text('العربية 🇸🇦'),
              trailing: localeProvider.locale.languageCode == 'ar' 
                  ? Icon(Icons.check_circle, color: AppColors.primary) 
                  : null,
              onTap: () {
                localeProvider.changeLanguage('ar');
                Navigator.pop(ctx);
              },
            ),
            ListTile(
              title: const Text('Français 🇫🇷'),
              trailing: localeProvider.locale.languageCode == 'fr' 
                  ? Icon(Icons.check_circle, color: AppColors.primary) 
                  : null,
              onTap: () {
                localeProvider.changeLanguage('fr');
                Navigator.pop(ctx);
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Row(
      children: [
        Builder(
          builder: (ctx) => IconButton(
            icon: Icon(Icons.menu_rounded,
                color: AppColors.primary, size: 28),
            onPressed: () => Scaffold.of(ctx).openDrawer(),
          ),
        ),
        const SizedBox(width: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(context.tr('settings'),
                style: TextStyle(
                    color: textTheme.bodyLarge?.color,
                    fontSize: 24,
                    fontWeight: FontWeight.w900)),
            Text(context.tr('appSettings'),
                style: TextStyle(color: textTheme.bodySmall?.color, fontSize: 13)),
          ],
        ),
      ],
    );
  }

  Widget _buildProfileCard(BuildContext context, Map<String, dynamic>? user) {
    final textTheme = Theme.of(context).textTheme;
    final name = user?['name']?.toString() ?? 'User';
    final email = user?['email']?.toString() ?? 'Admin';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: Row(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
                gradient: AppColors.primaryGradient,
                borderRadius: BorderRadius.circular(20)),
            child: Center(
              child: Text(name.isNotEmpty ? name[0].toUpperCase() : 'U',
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.bold)),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name,
                    style: TextStyle(
                        color: textTheme.bodyLarge?.color,
                        fontSize: 18,
                        fontWeight: FontWeight.bold)),
                Text(email,
                    style: TextStyle(
                        color: textTheme.bodySmall?.color, fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(BuildContext context, String title, IconData icon) {
    final textTheme = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12, right: 4, left: 4),
      child: Row(
        children: [
          Icon(icon, color: textTheme.bodySmall?.color, size: 16),
          const SizedBox(width: 8),
          Text(title,
              style: const TextStyle(
                  color: AppColors.text,
                  fontSize: 16,
                  fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }

  Widget _buildSettingItem(
    BuildContext context, {
    required IconData icon,
    Color? iconColor,
    required String title,
    String? subtitle,
    required VoidCallback onTap,
  }) {
    final textTheme = Theme.of(context).textTheme;
    final color = iconColor ?? AppColors.primary;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
      ),
      child: ListTile(
        onTap: onTap,
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12)),
          child: Icon(icon, color: color, size: 20),
        ),
        title: Text(title,
            style: TextStyle(
                color: textTheme.bodyLarge?.color,
                fontSize: 14,
                fontWeight: FontWeight.bold)),
        subtitle: subtitle != null
            ? Text(subtitle,
                style:
                    TextStyle(color: textTheme.bodySmall?.color, fontSize: 11))
            : null,
      ),
    );
  }

  Widget _buildLogoutButton(BuildContext context, AuthProvider auth) {
    return ElevatedButton(
      onPressed: () async {
        final ok = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: Text(context.tr('logout')),
            content: Text(context.tr('confirmDeleteAction')),
            actions: [
              TextButton(
                  onPressed: () => Navigator.pop(ctx, false),
                  child: Text(context.tr('cancel'))),
              TextButton(
                  onPressed: () => Navigator.pop(ctx, true),
                  child: Text(context.tr('logout'))),
            ],
          ),
        );
        if (ok == true) auth.logout();
      },
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.danger.withValues(alpha: 0.1),
        foregroundColor: AppColors.danger,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
        minimumSize: const Size(double.infinity, 54),
      ),
      child: Text(context.tr('logout'),
          style: const TextStyle(fontWeight: FontWeight.bold)),
    );
  }

  Widget _buildFooter(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final locale = context.watch<LocaleProvider>().locale.languageCode;
    final now = DateTime.now();
    final pattern = locale == 'ar' ? 'EEEE، d MMMM y' : 'EEEE d MMMM y';
    final dateStr = FormatUtils.formatDate(now, format: pattern);
    return Center(
      child: Column(
        children: [
          Text('${context.tr('appName')} v${FormatUtils.toLatinNumerals('1.0.0')}',
              style: TextStyle(color: textTheme.bodySmall?.color, fontSize: 11)),
          const SizedBox(height: 4),
          Text(dateStr,
              style: TextStyle(color: textTheme.bodySmall?.color, fontSize: 10)),
        ],
      ),
    );
  }
  Widget _buildStoreSettingsCard(BuildContext context) {
    final isRTL = context.watch<LocaleProvider>().isRTL;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              GestureDetector(
                onTap: _pickImage,
                child: Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                  ),
                  child: _logoBase64 != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(20),
                        child: Image.memory(base64Decode(_logoBase64!.split(',').last), fit: BoxFit.cover),
                      )
                    : Icon(Icons.add_a_photo_rounded, color: AppColors.primary, size: 30),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(isRTL ? 'شعار المؤسسة' : 'Logo de l\'entreprise', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    Text(isRTL ? 'انقر لتغيير الشعار' : 'Cliquez pour changer', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          _buildTextField(_storeNameController, isRTL ? 'اسم المؤسسة' : 'Nom du magasin', Icons.store_rounded),
          _buildTextField(_storeTaxIdController, isRTL ? 'الرقم الضريبي' : 'ID Fiscal', Icons.badge_rounded),
          _buildTextField(_storeAddressController, isRTL ? 'العنوان' : 'Adresse', Icons.location_on_rounded),
          _buildTextField(_storePhoneController, isRTL ? 'الهاتف' : 'Téléphone', Icons.phone_rounded),
          _buildTextField(_storeEmailController, isRTL ? 'البريد الإلكتروني' : 'Email', Icons.email_rounded),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _isSaving ? null : _saveSettings,
              icon: _isSaving ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.save_rounded),
              label: Text(isRTL ? 'حفظ المعلومات' : 'Enregistrer'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField(TextEditingController controller, String label, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: controller,
        style: const TextStyle(fontSize: 14),
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon, size: 20),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(15)),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
      ),
    );
  }
}
