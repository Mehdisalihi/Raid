import 'package:flutter/material.dart';
import '../core/api_service.dart';
import '../core/theme.dart';
import '../core/format_utils.dart';
import '../core/app_localizations.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});
  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen>
    with TickerProviderStateMixin {
  Map<String, dynamic>? _stats;
  List<dynamic> _chartData = [];
  List<dynamic> _topProducts = [];
  bool _loading = true;
  String _period = 'monthly';

  late AnimationController _chartCtrl;
  late Animation<double> _chartAnim;

  @override
  void initState() {
    super.initState();
    _chartCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 900));
    _chartAnim =
        CurvedAnimation(parent: _chartCtrl, curve: Curves.easeOutCubic);
    _fetch();
  }

  @override
  void dispose() {
    _chartCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    _chartCtrl.reset();
    try {
      final results = await Future.wait([
        ReportService.getStats(),
        ReportService.getCharts(),
        ReportService.getTopProducts(),
      ]);
      if (mounted) {
        setState(() {
          _stats = results[0] as Map<String, dynamic>?;
          _chartData = results[1] as List<dynamic>;
          _topProducts = results[2] as List<dynamic>;
        });
        _chartCtrl.forward();
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Container(
        color: AppColors.bg,
        child: Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );
    }

    final totalSales = (_stats?['totalSales'] ?? 0).toDouble();
    final totalExpenses = (_stats?['totalExpenses'] ?? 0).toDouble();
    final netProfit = totalSales - totalExpenses;

    return RefreshIndicator(
      color: AppColors.primary,
      backgroundColor: AppColors.surface,
      onRefresh: () async {
        await _fetch();
      },
      child: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Header
            Row(
              children: [
                Builder(
                    builder: (ctx) => IconButton(
                          icon: Icon(Icons.menu_rounded,
                              color: AppColors.primary, size: 28),
                          onPressed: () => Scaffold.of(ctx).openDrawer(),
                        )),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        context.tr('reports'),
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.primary,
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      Text(
                        context.tr('reportsSummary'),
                        style:
                            const TextStyle(color: AppColors.textLight, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Period switcher
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: Colors.black.withValues(alpha: 0.05),
                ),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x0A000000),
                    blurRadius: 8,
                    offset: Offset(0, 4),
                  )
                ],
              ),
              child: Row(
                children: [
                  for (final p in ['weekly', 'monthly', 'yearly'])
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          setState(() => _period = p);
                          _fetch();
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            gradient: _period == p
                                ? LinearGradient(colors: [
                                    Theme.of(context).colorScheme.primary,
                                    Theme.of(context).colorScheme.secondary
                                  ])
                                : null,
                            borderRadius: BorderRadius.circular(15),
                            boxShadow: _period == p
                                ? [
                                    BoxShadow(
                                      color: AppColors.primary
                                          .withValues(alpha: 0.3),
                                      blurRadius: 8,
                                      offset: const Offset(0, 4),
                                    )
                                  ]
                                : [],
                          ),
                          child: Center(
                            child: Text(
                              p == 'weekly'
                                  ? context.tr('weekly')
                                  : p == 'monthly'
                                      ? context.tr('monthly')
                                      : context.tr('yearly'),
                              style: TextStyle(
                                color: _period == p
                                    ? Colors.white
                                    : AppColors.textMuted,
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // KPIs
            _buildKpiCard(
              Icons.payments_rounded,
              context.tr('totalSales'),
              FormatUtils.formatCurrency(totalSales),
              '+12% ${context.tr('fromPrev')}',
              AppColors.success,
            ),
            const SizedBox(height: 12),
            _buildKpiCard(
              Icons.money_off_rounded,
              context.tr('totalExpenses'),
              FormatUtils.formatCurrency(totalExpenses),
              context.tr('underControl'),
              AppColors.danger,
            ),
            const SizedBox(height: 12),
            _buildKpiCard(
              Icons.trending_up_rounded,
              context.tr('netProfit'),
              FormatUtils.formatCurrency(netProfit),
              context.tr('excellentPerformance'),
              AppColors.primary,
            ),
            const SizedBox(height: 24),

            // Animated Bar Chart
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(32),
                border: Border.all(
                  color: Colors.black.withValues(alpha: 0.05),
                ),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x0A000000),
                    blurRadius: 10,
                    offset: Offset(0, 4),
                  )
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        context.tr('salesAnalysis'),
                        style: const TextStyle(
                          color: AppColors.text,
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          gradient: AppColors.primaryGradient,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          context.tr('live'),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  AnimatedBuilder(
                    animation: _chartAnim,
                    builder: (context, _) {
                      return SizedBox(
                        height: 180,
                        child: _chartData.isEmpty
                            ? Center(
                                child: Text(
                                  context.tr('noData'),
                                  style: const TextStyle(color: AppColors.textMuted),
                                ),
                              )
                            : Row(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children:
                                    _chartData.asMap().entries.map((entry) {
                                  final i = entry.key;
                                  final d = entry.value;
                                  final maxVal = _chartData
                                      .map((x) => (x['value'] ?? 0).toDouble())
                                      .reduce((a, b) => a > b ? a : b);
                                  final targetH = maxVal > 0
                                      ? ((d['value'] ?? 0).toDouble() /
                                              maxVal) *
                                          150
                                      : 5.0;
                                  final h = (targetH < 8 ? 8 : targetH) *
                                      _chartAnim.value;
                                  final isLast = i == _chartData.length - 1;
                                  return Expanded(
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 3,
                                      ),
                                      child: Column(
                                        mainAxisAlignment:
                                            MainAxisAlignment.end,
                                        children: [
                                          if (isLast)
                                            Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                      horizontal: 4,
                                                      vertical: 2),
                                              margin: const EdgeInsets.only(
                                                  bottom: 4),
                                              decoration: BoxDecoration(
                                                color: AppColors.primary
                                                    .withValues(alpha: 0.1),
                                                borderRadius:
                                                    BorderRadius.circular(6),
                                              ),
                                              child: Text(
                                                FormatUtils.formatNumber(d['value']),
                                                style: TextStyle(
                                                    color: AppColors.primary
                                                        .withValues(alpha: 0.3),
                                                    fontSize: 9,
                                                    fontWeight:
                                                        FontWeight.bold),
                                              ),
                                            ),
                                          Container(
                                            height: h,
                                            decoration: BoxDecoration(
                                              gradient: isLast
                                                  ? AppColors.primaryGradient
                                                  : LinearGradient(
                                                      begin:
                                                          Alignment.topCenter,
                                                      end: Alignment
                                                          .bottomCenter,
                                                      colors: [
                                                        AppColors.primary
                                                            .withValues(
                                                                alpha: 0.1),
                                                        AppColors.primary
                                                            .withValues(
                                                                alpha: 0.02),
                                                      ],
                                                    ),
                                              borderRadius:
                                                  const BorderRadius.vertical(
                                                top: Radius.circular(8),
                                                bottom: Radius.circular(4),
                                              ),
                                              boxShadow: isLast
                                                  ? [
                                                      BoxShadow(
                                                        color: AppColors.primary
                                                            .withValues(
                                                                alpha: 0.4),
                                                        blurRadius: 12,
                                                        offset:
                                                            const Offset(0, 4),
                                                      )
                                                    ]
                                                  : [],
                                            ),
                                          ),
                                          const SizedBox(height: 10),
                                          Text(
                                            d['day']?.toString() ?? '',
                                            style: TextStyle(
                                              color: isLast
                                                  ? AppColors.primary
                                                  : AppColors.textMuted,
                                              fontSize: 10,
                                              fontWeight: isLast
                                                  ? FontWeight.w800
                                                  : FontWeight.normal,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                }).toList(),
                              ),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),

            // Top products
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.emoji_events_rounded,
                        color: Color(0xFFFBBF24), size: 20),
                    const SizedBox(width: 8),
                    Text(
                      context.tr('topArticles'),
                      style: const TextStyle(
                        color: AppColors.text,
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    context.tr('viewAll'),
                    style: TextStyle(
                      color: AppColors.primary,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: Colors.black.withValues(alpha: 0.05)),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x0A000000),
                    blurRadius: 10,
                    offset: Offset(0, 4),
                  )
                ],
              ),
              child: _topProducts.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Text(context.tr('noData'),
                            style: const TextStyle(color: AppColors.textMuted)),
                      ),
                    )
                  : Column(
                      children: _topProducts.asMap().entries.map((entry) {
                        final item = entry.value;

                        // Parse numbers safely
                        final revStr = (item['rev'] ?? '0')
                            .toString()
                            .replaceAll(RegExp(r'[^0-9.]'), '');
                        final rev = double.tryParse(revStr) ?? 0.0;

                        final maxRev = _topProducts.map((p) {
                          final s = (p['rev'] ?? '0')
                              .toString()
                              .replaceAll(RegExp(r'[^0-9.]'), '');
                          return double.tryParse(s) ?? 0.0;
                        }).reduce((a, b) => a > b ? a : b);

                        final ratio = maxRev > 0 ? (rev / maxRev) : 0.0;

                        return Padding(
                          padding: const EdgeInsets.only(bottom: 20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      item['name'] ?? '',
                                      style: const TextStyle(
                                          color: AppColors.text,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 13),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  Text(
                                    FormatUtils.formatNumber(item['rev']),
                                    style: const TextStyle(
                                        color: AppColors.success,
                                        fontWeight: FontWeight.w900,
                                        fontSize: 12),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Stack(
                                children: [
                                  Container(
                                    height: 8,
                                    width: double.infinity,
                                    decoration: BoxDecoration(
                                      color: AppColors.bg,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                  ),
                                  AnimatedBuilder(
                                    animation: _chartAnim,
                                    builder: (context, _) =>
                                        FractionallySizedBox(
                                      widthFactor: ratio * _chartAnim.value,
                                      child: Container(
                                        height: 8,
                                        decoration: BoxDecoration(
                                          gradient: LinearGradient(
                                            colors: [
                                              AppColors.success,
                                              AppColors.success
                                                  .withValues(alpha: 0.6)
                                            ],
                                          ),
                                          borderRadius:
                                              BorderRadius.circular(4),
                                          boxShadow: [
                                            BoxShadow(
                                              color: AppColors.success
                                                  .withValues(alpha: 0.2),
                                              blurRadius: 4,
                                              offset: const Offset(0, 2),
                                            )
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildKpiCard(
    IconData icon,
    String title,
    String value,
    String sub,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: color.withValues(alpha: 0.15),
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A000000),
            blurRadius: 8,
            offset: Offset(0, 4),
          )
        ],
        gradient: LinearGradient(
          colors: [
            color.withValues(alpha: 0.04),
            Colors.white,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: color.withValues(alpha: 0.2)),
            ),
            child: Center(
              child: Icon(icon, color: color, size: 26),
            ),
          ),
          const SizedBox(width: 18),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    color: AppColors.text,
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    Icon(
                      sub.contains('+')
                          ? Icons.trending_up
                          : Icons.trending_flat,
                      size: 12,
                      color: color,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      sub,
                      style: TextStyle(
                        color: color,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
