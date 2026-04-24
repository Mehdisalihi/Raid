import 'package:flutter/material.dart';
import '../core/api_service.dart';
import '../core/theme.dart';
import '../core/format_utils.dart';
import '../core/app_localizations.dart';

class ArchiveScreen extends StatefulWidget {
  const ArchiveScreen({super.key});
  @override
  State<ArchiveScreen> createState() => _ArchiveScreenState();
}

class _ArchiveScreenState extends State<ArchiveScreen> {
  int _tabIndex = 0; // 0: Sales, 1: Expenses, 2: Returns
  List<dynamic> _items = [];
  bool _loading = true;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    try {
      dynamic data;
      if (_tabIndex == 0) {
        data = await SaleService.getAll();
      } else if (_tabIndex == 1) {
        data = await ExpenseService.getAll();
      } else {
        data = await ReturnService.getAll();
      }

      if (mounted) {
        setState(() {
          _items = data as List;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<dynamic> get _filtered {
    if (_search.isEmpty) return _items;
    final q = _search.toLowerCase();
    return _items.where((i) {
      final name = (i['customerName'] ??
              i['title'] ??
              i['description'] ??
              i['invoiceNumber'] ??
              '')
          .toString()
          .toLowerCase();
      return name.contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            _buildTabs(),
            _buildSearch(),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _buildList(),
            ),
          ],
        ),
      ),
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
                context.tr('archive'),
                style: TextStyle(
                    color: Theme.of(context).colorScheme.primary,
                    fontSize: 24,
                    fontWeight: FontWeight.w900),
              ),
              Text(
                context.tr('archiveSummary'),
                style: const TextStyle(color: AppColors.textLight, fontSize: 13),
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(15),
            ),
            child: const Icon(Icons.inventory_2_rounded,
                color: AppColors.primary, size: 28),
          ),
        ],
      ),
    );
  }

  Widget _buildTabs() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Container(
        height: 50,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(15),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            _tab(0, context.tr('sales')),
            _tab(1, context.tr('expenses')),
            _tab(2, context.tr('returns')),
          ],
        ),
      ),
    );
  }

  Widget _tab(int idx, String label) {
    final active = _tabIndex == idx;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() => _tabIndex = idx);
          _fetch();
        },
        child: Container(
          decoration: BoxDecoration(
            color: active ? Theme.of(context).colorScheme.primary : Colors.transparent,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                color: active ? Colors.white : AppColors.textLight,
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSearch() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: TextField(
        onChanged: (v) => setState(() => _search = v),
        style: const TextStyle(color: AppColors.text),
        decoration: InputDecoration(
          hintText: context.tr('archiveSearchHint'), // Need to add this key
          prefixIcon:
              const Icon(Icons.search_rounded, color: AppColors.primary),
          filled: true,
          fillColor: AppColors.surface,
          enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(20),
              borderSide: const BorderSide(color: AppColors.border)),
          focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(20),
              borderSide: BorderSide(color: Theme.of(context).colorScheme.primary)),
        ),
      ),
    );
  }

  Widget _buildList() {
    if (_filtered.isEmpty) {
      return Center(
          child: Text(context.tr('noResults'),
              style: const TextStyle(color: AppColors.textLight)));
    }
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      itemCount: _filtered.length,
      itemBuilder: (context, index) {
        final item = _filtered[index];
        final amount =
            (item['finalAmount'] ?? item['total'] ?? item['amount'] ?? 0)
                .toDouble();

        Color color = AppColors.primary;
        IconData icon = Icons.receipt_long_rounded;

        if (_tabIndex == 1) {
          color = AppColors.danger;
          icon = Icons.payments_rounded;
        } else if (_tabIndex == 2) {
          color = AppColors.warning;
          icon = Icons.assignment_return_rounded;
        }

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppColors.border),
          ),
          child: ListTile(
            contentPadding: const EdgeInsets.all(16),
            leading: CircleAvatar(
              backgroundColor: color.withValues(alpha: 0.1),
              child: Icon(icon, color: color, size: 18),
            ),
            title: Text(
              item['customerName'] ??
                  item['description'] ??
                  item['title'] ??
                  context.tr('unknownOperation'), // Need to add this key
              style: const TextStyle(
                  color: AppColors.text, fontWeight: FontWeight.bold),
            ),
            subtitle: Text(FormatUtils.formatDate(item['date']),
                style:
                    const TextStyle(color: AppColors.textLight, fontSize: 12)),
            trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  FormatUtils.formatNumber(amount, decimalPlaces: 2),
                  style: TextStyle(
                      color: color, fontWeight: FontWeight.w900, fontSize: 16),
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
}
