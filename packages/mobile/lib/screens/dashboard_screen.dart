import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/api_service.dart';
import '../core/theme.dart';
import '../core/format_utils.dart';
import '../core/app_localizations.dart';
import 'package:provider/provider.dart';
import '../core/auth_provider.dart';

class DashboardScreen extends StatefulWidget {
  final void Function(int) onNavigate;
  const DashboardScreen({super.key, required this.onNavigate});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen>
    with SingleTickerProviderStateMixin {
  Map<String, dynamic>? _stats;
  List<dynamic> _activities = [];
  bool _loading = true;
  late AnimationController _staggerController;

  @override
  void initState() {
    super.initState();
    _staggerController = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 800));
    _fetch();
  }

  @override
  void dispose() {
    _staggerController.dispose();
    super.dispose();
  }

  Future<void> _fetch() async {
    try {
      final results = await Future.wait([
        ReportService.getStats(),
        ReportService.getActivities(),
      ]).timeout(const Duration(seconds: 5));
      if (mounted) {
        setState(() {
          _stats = results[0] as Map<String, dynamic>?;
          _activities = (results[1] as List?) ?? [];
          _loading = false;
        });
        _staggerController.forward(from: 0);
      }
    } catch (e) {
      debugPrint('Dashboard fetch error: $e');
      if (mounted) {
        setState(() => _loading = false);
        _staggerController.forward(from: 0);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final locale = Localizations.localeOf(context).languageCode;
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    // Force Latin numerals for date (1, 2, 3...)
    final pattern = locale == 'ar' ? 'EEEE، d MMMM y' : 'EEEE d MMMM y';
    final dateStr = FormatUtils.toLatinNumerals(DateFormat(pattern, locale).format(now));

    if (_loading) {
      return const Center(
          child: CircularProgressIndicator(color: AppColors.primary));
    }

    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final isAdmin = user?['role'] == 'ADMIN';

    bool canAccess(String key) => isAdmin || (user?[key] == true);

    return RefreshIndicator(
      onRefresh: _fetch,
      color: AppColors.primary,
      backgroundColor: colorScheme.surface,
      child: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          children: [
            Row(
              children: [
                Text(
                  user?['storeName'] ?? context.tr('appName'), // Use dynamic store name from database
                  style: const TextStyle(
                    color: AppColors.text,
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const Spacer(),
                Text(
                  dateStr,
                  style:
                      TextStyle(color: textTheme.bodySmall?.color, fontSize: 11),
                ),
              ],
            ),
            const SizedBox(height: 24),
            _staggeredItem(0, _buildMainCard(context)),
            const SizedBox(height: 20),
            _buildSectionTitle(context.tr('businessOverview')),
            _staggeredItem(
              1,
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => widget.onNavigate(13),
                      child: _buildStatCard(
                        context,
                        Icons.inventory_2_rounded,
                        context.tr('inventory'),
                        FormatUtils.formatNumber(_stats?['products']),
                        context.tr('totalProducts'),
                        AppColors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _buildStatCard(
                      context,
                      Icons.report_problem_rounded,
                      context.tr('stockAlert'),
                      FormatUtils.formatNumber(_stats?['lowStock']),
                      context.tr('targetLevel'),
                      AppColors.warning,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            _staggeredItem(
              2,
              Column(
                children: [
                  _buildSectionTitle(context.tr('salesToday')), 
                  _buildGridSection([
                    if (canAccess('canAccessSales'))
                      _buildAction(context, Icons.shopping_cart_rounded, context.tr('sales'),
                          AppColors.primary, () => widget.onNavigate(1)),
                    if (canAccess('canCreateInvoices'))
                      _buildAction(context, Icons.receipt_long_rounded, context.tr('invoices'),
                          AppColors.accent, () => widget.onNavigate(2)),
                    if (canAccess('canManageInventory'))
                      _buildAction(context, Icons.shopping_bag_rounded, context.tr('totalPurchases'),
                          AppColors.success, () => widget.onNavigate(3)),
                    if (canAccess('canManageInventory'))
                      _buildAction(context, Icons.inventory_rounded, context.tr('inventory'),
                          AppColors.secondary, () => widget.onNavigate(13)),
                    if (canAccess('canAccessSales'))
                      _buildAction(context, Icons.assignment_return_rounded, context.tr('returns'),
                          AppColors.danger, () => widget.onNavigate(4)),
                  ]),
                ],
              ),
            ),
            const SizedBox(height: 24),
            _staggeredItem(
              3,
              Column(
                children: [
                  _buildSectionTitle(context.tr('businessOverview')),
                  _buildGridSection([
                    if (canAccess('canManageInventory'))
                      _buildAction(context, Icons.category_rounded, context.tr('products'),
                          const Color(0xFF8B5CF6), () => widget.onNavigate(8)),
                    if (canAccess('canManageCustomers'))
                      _buildAction(context, Icons.people_rounded, context.tr('customers'),
                          const Color(0xFFEC4899), () => widget.onNavigate(9)),
                    if (canAccess('canManageInventory'))
                      _buildAction(context, Icons.local_shipping_rounded, context.tr('creditors'), 
                          const Color(0xFFF59E0B), () => widget.onNavigate(10)),
                    if (canAccess('canManageExpenses'))
                      _buildAction(context, Icons.payments_rounded, context.tr('expenses'),
                          const Color(0xFF10B981), () => widget.onNavigate(11)),
                    if (canAccess('canManageInventory'))
                      _buildAction(context, Icons.warehouse_rounded, context.tr('warehouses'),
                          const Color(0xFF6366F1), () => widget.onNavigate(14)),
                  ]),
                ],
              ),
            ),
            const SizedBox(height: 24),
            _staggeredItem(
              4,
              Column(
                children: [
                  _buildSectionTitle(context.tr('accountStatement')), 
                  _buildGridSection([
                    if (canAccess('canAccessSales'))
                      _buildAction(context, Icons.money_off_rounded, context.tr('debtors'),
                          const Color(0xFFEF4444), () => widget.onNavigate(5)),
                    if (canAccess('canViewReports'))
                      _buildAction(context, Icons.description_rounded, context.tr('statement'),
                          const Color(0xFF3B82F6), () => widget.onNavigate(6)),
                    if (canAccess('canViewReports'))
                      _buildAction(context, Icons.bar_chart_rounded, context.tr('reportsSummary'), 
                          const Color(0xFF2563EB), () => widget.onNavigate(12)),
                  ]),
                ],
              ),
            ),
            const SizedBox(height: 24),
            _staggeredItem(
              5,
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildSectionTitle(context.tr('recentActivity')),
                  GestureDetector(
                    onTap: () => widget.onNavigate(2),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(context.tr('search'), // Or view all, fallback to search key
                          style: const TextStyle(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                          )),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _staggeredItem(6, _buildActivities(context)),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _staggeredItem(int index, Widget child) {
    // Temporarily removing animation to ensure visibility and troubleshoot "white screen"
    return child;
  }

  Widget _buildGridSection(List<Widget> children) {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 4,
      mainAxisSpacing: 16,
      crossAxisSpacing: 16,
      childAspectRatio: 0.8,
      children: children,
    );
  }

  Widget _buildMainCard(BuildContext context) {
    final profit = FormatUtils.formatNumber(_stats?['profit']?.toString() ?? '0');
    final txCount = FormatUtils.formatNumber(_stats?['transactions']?.toString() ?? '0');

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1E40AF), Color(0xFF6366F1)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(32),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1E40AF).withValues(alpha: 0.3),
            blurRadius: 25,
            offset: const Offset(0, 12),
          )
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -20,
            top: -20,
            child: CircleAvatar(
              radius: 60,
              backgroundColor: Colors.white.withValues(alpha: 0.05),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              children: [
                Text(context.tr('salesToday'),
                    style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 15,
                        fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                Text(FormatUtils.formatCurrency(_stats?['totalSales'] ?? 0),
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 32,
                        fontWeight: FontWeight.w900)),
                const SizedBox(height: 28),
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _miniStat(context.tr('netProfit'), profit, const Color(0xFF4ADE80)),
                      Container(width: 1, height: 20, color: Colors.white24),
                      _miniStat(context.tr('invoices'), txCount, Colors.white),
                      Container(width: 1, height: 20, color: Colors.white24),
                      _miniStat('12%+', '↑', const Color(0xFFFBBF24)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _miniStat(String label, String val, Color color) {
    return Column(
      children: [
        Text(label,
            style: const TextStyle(color: Colors.white60, fontSize: 12)),
        const SizedBox(height: 4),
        Text(val,
            style: TextStyle(
                color: color, fontSize: 16, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildStatCard(
      BuildContext context, IconData icon, String title, String val, String sub, Color color) {
    final textTheme = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(24),
        boxShadow: AppColors.premiumShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(height: 16),
          Text(val,
              style: TextStyle(
                  color: color, fontSize: 26, fontWeight: FontWeight.w900)),
          const SizedBox(height: 4),
          Text(title,
              style: const TextStyle(
                  color: AppColors.text,
                  fontSize: 14,
                  fontWeight: FontWeight.w800)),
          Text(sub,
              style: TextStyle(color: textTheme.bodySmall?.color, fontSize: 11)),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 18,
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 12),
          Text(title,
              style: const TextStyle(
                  color: AppColors.text,
                  fontSize: 18,
                  fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }

  Widget _buildAction(
      BuildContext context, IconData icon, String label, Color color, VoidCallback onTap) {
    final textTheme = Theme.of(context).textTheme;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Column(
        children: [
          Container(
            width: 68,
            height: 68,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(22),
              boxShadow: [
                BoxShadow(
                  color: color.withValues(alpha: 0.1),
                  blurRadius: 15,
                  offset: const Offset(0, 6),
                )
              ],
            ),
            child: Icon(icon, color: color, size: 32),
          ),
          const SizedBox(height: 10),
          Text(label,
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                  color: textTheme.bodyLarge?.color,
                  fontSize: 11,
                  fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }

  Widget _buildActivities(BuildContext context) {
    if (_activities.isEmpty) {
      return const Center(
          child: Padding(
              padding: EdgeInsets.all(32),
              child: Text('-', // Generic fallback
                  style: TextStyle(color: AppColors.textMuted))));
    }
    return Column(
      children: _activities.map((a) => _activityItem(context, a)).toList(),
    );
  }

  Widget _activityItem(BuildContext context, dynamic a) {
    final textTheme = Theme.of(context).textTheme;
    final pos = a['positive'] == true;
    final color = pos ? AppColors.success : AppColors.danger;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        boxShadow: AppColors.premiumShadow,
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(pos ? Icons.add_circle : Icons.remove_circle,
                color: color, size: 22),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(a['label'] ?? '',
                    style: TextStyle(
                        color: textTheme.bodyLarge?.color,
                        fontSize: 14,
                        fontWeight: FontWeight.bold)),
                Text(context.tr('justNow'),
                    style: TextStyle(
                        color: textTheme.bodySmall?.color, fontSize: 11)),
              ],
            ),
          ),
          Text(a['amount'] ?? '',
              style: TextStyle(
                  color: color, fontSize: 16, fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }
}
