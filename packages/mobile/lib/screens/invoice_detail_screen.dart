import 'package:flutter/material.dart';
import '../core/theme.dart';

import '../core/format_utils.dart';
import '../core/pdf_service.dart';
import '../core/app_localizations.dart';
import 'sales_screen.dart';
import 'purchases_screen.dart';

class InvoiceDetailScreen extends StatelessWidget {
  final Map<String, dynamic> sale;

  const InvoiceDetailScreen({super.key, required this.sale});

  @override
  Widget build(BuildContext context) {
    final date =
        DateTime.parse(sale['createdAt'] ?? DateTime.now().toIso8601String());
    final dateStr = FormatUtils.formatDate(date, format: 'yyyy/MM/dd HH:mm');
    final items = (sale['items'] as List?) ?? [];
    final customer = sale['customer'];

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(context.tr('invoiceDetail'),
            style:
                const TextStyle(color: AppColors.text, fontWeight: FontWeight.w900)),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: AppColors.text),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.edit_note_rounded, color: AppColors.primary),
            onPressed: () {
              if (sale['type'] == 'SALE' || sale['type'] == 'QUOTATION') {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => SalesScreen(invoiceToEdit: sale)),
                );
              } else if (sale['type'] == 'PURCHASE') {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => PurchasesScreen(invoiceToEdit: sale)),
                );
              }
            },
          ),
          IconButton(
            icon: Icon(Icons.file_download_rounded,
                color: AppColors.primary),
            onPressed: () => PdfService.generateInvoice(sale),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            // Status Badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.success.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(30),
                border:
                    Border.all(color: AppColors.success.withValues(alpha: 0.3)),
              ),
              child: Text(
                context.tr('completed'),
                style: const TextStyle(
                    color: AppColors.success,
                    fontWeight: FontWeight.w900,
                    fontSize: 12),
              ),
            ),
            const SizedBox(height: 24),

            // Header Info
            _buildInfoCard([
              _infoRow(context.tr('invoiceNumber'), '#${FormatUtils.formatNumber(sale['id'])}'),
              _infoRow(context.tr('date'), dateStr),
              _infoRow(
                  context.tr('customer'), (customer != null && customer['name'] != null) ? customer['name'] : context.tr('cashCustomer')),
              _infoRow(context.tr('paymentMethod'), sale['paymentMethod'] ?? 'cash'),
            ]),

            const SizedBox(height: 24),

            // Items List
            Align(
              alignment: Alignment.centerRight,
              child: Text(
                context.tr('soldProducts'),
                style: const TextStyle(
                    color: AppColors.text,
                    fontSize: 16,
                    fontWeight: FontWeight.w900),
              ),
            ),
            const SizedBox(height: 12),
            Container(
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: items.map((item) {
                  return Container(
                    padding: const EdgeInsets.all(16),
                    decoration: const BoxDecoration(
                      border:
                          Border(bottom: BorderSide(color: AppColors.border)),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item['product']?['name'] ?? context.tr('unknownProduct'),
                                style: const TextStyle(
                                    color: AppColors.text,
                                    fontWeight: FontWeight.w800),
                              ),
                              Text(
                                '${FormatUtils.formatQuantity(item['quantity'])} × ${FormatUtils.formatNumber(item['price'])} MRU',
                                style: const TextStyle(
                                    color: AppColors.textLight, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          FormatUtils.formatCurrency((item['quantity'] ?? 0) * (item['price'] ?? 0)),
                          style: const TextStyle(
                              color: AppColors.text,
                              fontWeight: FontWeight.w900),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),

            const SizedBox(height: 24),

            // Summary
            _buildInfoCard([
              _infoRow(context.tr('subtotal'), FormatUtils.formatCurrency(sale['totalAmount'] ?? sale['total'] ?? 0)),
              _infoRow('${context.tr('tax')} (${sale['taxRate'] ?? 0}%)', FormatUtils.formatCurrency(sale['taxAmount'] ?? 0)),
              const Divider(color: AppColors.border),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                   Text(context.tr('total'),
                      style: const TextStyle(
                          color: AppColors.text,
                          fontWeight: FontWeight.w900,
                          fontSize: 18)),
                  Text(FormatUtils.formatCurrency(sale['finalAmount'] ?? sale['totalAmount'] ?? sale['total'] ?? 0),
                      style: TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w900,
                          fontSize: 24)),
                ],
              ),
            ]),

            const SizedBox(height: 48),

            // Print Button
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton.icon(
                onPressed: () => PdfService.generateInvoice(sale),
                icon: const Icon(Icons.print_rounded, size: 20),
                label: Text(context.tr('printInvoice')),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18)),
                  elevation: 0,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoCard(List<Widget> children) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(children: children),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: const TextStyle(
                  color: AppColors.textMuted, fontWeight: FontWeight.w700)),
          Text(value,
              style: const TextStyle(
                  color: AppColors.text, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}
