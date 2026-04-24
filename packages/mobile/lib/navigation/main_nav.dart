import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../core/app_localizations.dart';
import 'package:provider/provider.dart';
import '../core/auth_provider.dart';
import '../screens/dashboard_screen.dart';
import '../screens/sales_screen.dart';
import '../screens/products_screen.dart';
import '../screens/customers_screen.dart';
import '../screens/suppliers_screen.dart';
import '../screens/expenses_screen.dart';
import '../screens/reports_screen.dart';
import '../screens/settings_screen.dart';
import '../screens/purchases_screen.dart';
import '../screens/returns_screen.dart';
import '../screens/debts_screen.dart';
import '../screens/customer_statement_screen.dart';
import '../screens/archive_screen.dart';
import '../screens/invoices_screen.dart';
import '../screens/barcode_scan_screen.dart';
import '../screens/account_screen.dart';

class MainNav extends StatefulWidget {
  const MainNav({super.key});
  @override
  State<MainNav> createState() => _MainNavState();
}

class _MainNavState extends State<MainNav> {
  int _currentTab = 0; // 0: Home, 1: Scan, 2: Account, 3: Settings
  int? _subScreenIndex;


  void _switchTab(int index) {
    if (_currentTab == index && _subScreenIndex == null) return;
    setState(() {
      _currentTab = index;
      _subScreenIndex = null;
    });
  }

  void _navigateToSubScreen(int index) {
    setState(() {
      _subScreenIndex = index;
      _currentTab = 0;
    });
  }

  void _goHome() {
    if (_currentTab == 0 && _subScreenIndex == null) return;
    setState(() {
      _currentTab = 0;
      _subScreenIndex = null;
    });
  }

  Widget _buildContent() {
    Widget content;
    if (_subScreenIndex != null) {
      content = switch (_subScreenIndex!) {
        1 => const SalesScreen(),
        2 => const InvoicesScreen(),
        3 => const PurchasesScreen(),
        4 => const ReturnsScreen(),
        5 => const DebtsScreen(),
        6 => const CustomerStatementScreen(),
        7 => const ArchiveScreen(),
        8 => const ProductsScreen(),
        9 => const CustomersScreen(),
        10 => const SuppliersScreen(),
        11 => const ExpensesScreen(),
        12 => const ReportsScreen(),
        _ => DashboardScreen(onNavigate: _navigateToSubScreen),
      };
    } else {
      content = IndexedStack(
        index: _currentTab,
        children: [
          DashboardScreen(onNavigate: _navigateToSubScreen),
          const BarcodeScanScreen(),
          const AccountScreen(),
          const SettingsScreen(),
        ],
      );
    }

    return content;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: _subScreenIndex != null
          ? AppBar(
              backgroundColor: Theme.of(context).scaffoldBackgroundColor,
              elevation: 0,
              iconTheme: IconThemeData(color: Theme.of(context).textTheme.bodyLarge?.color),
              leading: IconButton(
                icon: const Icon(Icons.arrow_back_rounded,
                    color: AppColors.primary),
                onPressed: _goHome,
              ),
            )
          : null,
      body: SafeArea(
        bottom: false,
        top: _subScreenIndex ==
            null, // AppBar handles top safe area when visible
        child: _buildContent(),
      ),
      bottomNavigationBar: _buildBottomNav(context),
      floatingActionButton: _buildCenterAction(context),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
    );
  }

  Widget _buildCenterAction(BuildContext context) {
    return Container(
      width: 64,
      height: 64,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: const LinearGradient(
          colors: [Color(0xFF6366F1), Color(0xFF4F46E5)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF6366F1).withValues(alpha: 0.4),
            blurRadius: 15,
            offset: const Offset(0, 8),
          )
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _showQuickActions(context),
          customBorder: const CircleBorder(),
          child: const Icon(Icons.add_rounded, color: Colors.white, size: 36),
        ),
      ),
    );
  }

  void _showQuickActions(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => Container(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Theme.of(context).scaffoldBackgroundColor,
          borderRadius: BorderRadius.circular(32),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.2),
              blurRadius: 30,
              offset: const Offset(0, 10),
            )
          ],
        ),
        child: Builder(
          builder: (context) {
            final auth = context.read<AuthProvider>();
            final user = auth.user;
            final isAdmin = user?['role'] == 'ADMIN';
            bool canAccess(String key) => isAdmin || (user?[key] == true);

            return Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(context.tr('quick_actions'),
                        style: const TextStyle(
                            fontSize: 20, fontWeight: FontWeight.w900)),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close_rounded),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 2,
                  mainAxisSpacing: 16,
                  crossAxisSpacing: 16,
                  childAspectRatio: 1.5,
                  children: [
                    if (canAccess('canAccessSales'))
                      _buildQuickActionItem(
                        context,
                        Icons.shopping_cart_rounded,
                        context.tr('sales'),
                        const Color(0xFF6366F1),
                        () => _handleQuickAction(1),
                      ),
                    if (canAccess('canManageInventory'))
                      _buildQuickActionItem(
                        context,
                        Icons.inventory_2_rounded,
                        context.tr('products'),
                        const Color(0xFFF59E0B),
                        () => _handleQuickAction(8),
                      ),
                    if (canAccess('canManageCustomers'))
                      _buildQuickActionItem(
                        context,
                        Icons.people_rounded,
                        context.tr('customers'),
                        const Color(0xFFEC4899),
                        () => _handleQuickAction(9),
                      ),
                    if (canAccess('canManageExpenses'))
                      _buildQuickActionItem(
                        context,
                        Icons.payments_rounded,
                        context.tr('expenses'),
                        const Color(0xFF10B981),
                        () => _handleQuickAction(11),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildQuickActionItem(BuildContext context, IconData icon, String label,
      Color color, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Row(
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                    color: color, fontSize: 13, fontWeight: FontWeight.w900),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _handleQuickAction(int index) {
    Navigator.pop(context);
    _navigateToSubScreen(index);
  }

  Widget _buildBottomNav(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).padding.bottom),
      decoration: BoxDecoration(
        color: AppColors.primary,
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.4),
            blurRadius: 20,
            offset: const Offset(0, -6),
          )
        ],
      ),
      child: SizedBox(
        height: 68,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildNavItem(0, Icons.grid_view_rounded, context.tr('dashboard')),
            _buildNavItem(1, Icons.qr_code_scanner_rounded, context.tr('barcode')),
            const SizedBox(width: 48), // Space for the floating button
            _buildNavItem(2, Icons.person_rounded, context.tr('account')),
            _buildNavItem(3, Icons.settings_rounded, context.tr('settings')),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, String label) {
    final isSelected = _currentTab == index && _subScreenIndex == null;
    return GestureDetector(
      onTap: () => _switchTab(index),
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOutCubic,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? Colors.white.withValues(alpha: 0.15)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(24),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedScale(
              scale: isSelected ? 1.1 : 1.0,
              duration: const Duration(milliseconds: 300),
              child: Icon(
                icon,
                color: Colors.white,
                size: 26,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: Colors.white,
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
