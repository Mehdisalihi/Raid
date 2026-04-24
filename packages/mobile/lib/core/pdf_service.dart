import 'dart:io';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'format_utils.dart';

class PdfService {
  static Future<void> generateInvoice(Map<String, dynamic> sale) async {
    final pdf = pw.Document();

    // Load Arabic Font from Google Fonts
    final ttf = await PdfGoogleFonts.cairoRegular();

    final items = (sale['items'] as List?) ?? [];
    final customer = sale['customerName'] ?? 'عميل نقدي';
    final total = sale['finalAmount'] ?? 0.0;
    final date = sale['date'] ?? DateTime.now().toString().split(' ').first;

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        textDirection: pw.TextDirection.rtl,
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Header(
                level: 0,
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('فاتورة مبيعات',
                        style: pw.TextStyle(
                            font: ttf,
                            fontSize: 30,
                            fontWeight: pw.FontWeight.bold)),
                    pw.Text('Raid',
                        style: pw.TextStyle(
                            fontSize: 24,
                            fontWeight: pw.FontWeight.bold,
                            color: PdfColors.blue900)),
                  ],
                ),
              ),
              pw.SizedBox(height: 20),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('إلى: $customer',
                          style: pw.TextStyle(font: ttf, fontSize: 14)),
                      pw.Text('التاريخ: ${FormatUtils.formatDate(date)}',
                          style: pw.TextStyle(font: ttf, fontSize: 12)),
                    ],
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text('رقم الفاتورة: #${FormatUtils.formatNumber(sale['id'])}',
                          style: pw.TextStyle(font: ttf, fontSize: 12)),
                    ],
                  ),
                ],
              ),
              pw.SizedBox(height: 30),
              pw.Table(
                border: pw.TableBorder.all(color: PdfColors.grey300),
                children: [
                  pw.TableRow(
                    decoration:
                        const pw.BoxDecoration(color: PdfColors.grey100),
                    children: [
                      pw.Padding(
                          padding: const pw.EdgeInsets.all(8),
                          child: pw.Text('المنتج',
                              style: pw.TextStyle(
                                  font: ttf, fontWeight: pw.FontWeight.bold))),
                      pw.Padding(
                          padding: const pw.EdgeInsets.all(8),
                          child: pw.Text('الكمية',
                              style: pw.TextStyle(
                                  font: ttf, fontWeight: pw.FontWeight.bold))),
                      pw.Padding(
                          padding: const pw.EdgeInsets.all(8),
                          child: pw.Text('السعر',
                              style: pw.TextStyle(
                                  font: ttf, fontWeight: pw.FontWeight.bold))),
                      pw.Padding(
                          padding: const pw.EdgeInsets.all(8),
                          child: pw.Text('الإجمالي',
                              style: pw.TextStyle(
                                  font: ttf, fontWeight: pw.FontWeight.bold))),
                    ],
                  ),
                  ...items.map((item) {
                    final name =
                        item['product']?['name'] ?? item['name'] ?? 'منتج';
                    final qty = item['qty'] ?? item['quantity'] ?? 1;
                    final price = item['sellPrice'] ?? item['price'] ?? 0.0;
                    return pw.TableRow(
                      children: [
                        pw.Padding(
                            padding: const pw.EdgeInsets.all(8),
                            child:
                                pw.Text(name, style: pw.TextStyle(font: ttf))),
                        pw.Padding(
                            padding: const pw.EdgeInsets.all(8),
                            child: pw.Text(FormatUtils.formatQuantity(qty))),
                        pw.Padding(
                            padding: const pw.EdgeInsets.all(8),
                            child: pw.Text(FormatUtils.formatNumber(price))),
                        pw.Padding(
                            padding: const pw.EdgeInsets.all(8),
                            child: pw.Text(FormatUtils.formatNumber((qty ?? 0) * (price ?? 0), decimalPlaces: 2))),
                      ],
                    );
                  }),
                ],
              ),
              pw.SizedBox(height: 30),
              pw.Container(
                alignment: pw.Alignment.centerLeft,
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('المجموع الإجمالي: ${FormatUtils.formatCurrency(total, decimalPlaces: 2)}',
                        style: pw.TextStyle(
                            font: ttf,
                            fontSize: 18,
                            fontWeight: pw.FontWeight.bold,
                            color: PdfColors.blue800)),
                    pw.Text('الضريبة (0%)',
                        style: pw.TextStyle(
                            font: ttf, fontSize: 10, color: PdfColors.grey600)),
                  ],
                ),
              ),
              pw.Spacer(),
              pw.Divider(color: PdfColors.grey300),
              pw.Center(
                child: pw.Text('شكراً لتعاملكم مع Raid',
                    style: pw.TextStyle(
                        font: ttf, fontSize: 10, color: PdfColors.grey500)),
              ),
            ],
          );
        },
      ),
    );

    // Preview/Print
    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdf.save(),
      name: 'فاتورة_${sale['id']}.pdf',
    );
  }

  static Future<void> saveAndShare(pw.Document pdf, String fileName) async {
    final output = await getTemporaryDirectory();
    final file = File("${output.path}/$fileName");
    await file.writeAsBytes(await pdf.save());
    await Share.shareXFiles([XFile(file.path)], text: 'مشاركة الفاتورة');
  }

  static Future<void> generateStatement(String name,
      Map<String, double> summary, List<dynamic> activities) async {
    final pdf = pw.Document();
    final ttf = await PdfGoogleFonts.cairoRegular();
    final date = DateTime.now().toString().split(' ').first;

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        textDirection: pw.TextDirection.rtl,
        build: (pw.Context context) {
          return [
            pw.Header(
              level: 0,
              child: pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('كشف حساب',
                      style: pw.TextStyle(
                          font: ttf,
                          fontSize: 26,
                          fontWeight: pw.FontWeight.bold)),
                  pw.Text('Raid',
                      style: pw.TextStyle(
                          fontSize: 20,
                          fontWeight: pw.FontWeight.bold,
                          color: PdfColors.blue900)),
                ],
              ),
            ),
            pw.SizedBox(height: 20),
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('الاسم: $name',
                        style: pw.TextStyle(font: ttf, fontSize: 14)),
                    pw.Text('تاريخ الـتقرير: ${FormatUtils.formatDate(date)}',
                        style: pw.TextStyle(font: ttf, fontSize: 12)),
                  ],
                ),
              ],
            ),
            pw.SizedBox(height: 20),
            pw.Container(
              padding: const pw.EdgeInsets.all(10),
              decoration: pw.BoxDecoration(
                border: pw.Border.all(color: PdfColors.grey300),
                borderRadius: const pw.BorderRadius.all(pw.Radius.circular(8)),
              ),
              child: pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceAround,
                children: [
                  pw.Column(children: [
                    pw.Text('إجمالي مدين',
                        style: pw.TextStyle(font: ttf, fontSize: 10)),
                    pw.Text(FormatUtils.formatNumber(summary['debit'], decimalPlaces: 2),
                        style: pw.TextStyle(
                            fontWeight: pw.FontWeight.bold,
                            color: PdfColors.red)),
                  ]),
                  pw.Column(children: [
                    pw.Text('إجمالي دائن',
                        style: pw.TextStyle(font: ttf, fontSize: 10)),
                    pw.Text(FormatUtils.formatNumber(summary['credit'], decimalPlaces: 2),
                        style: pw.TextStyle(
                            fontWeight: pw.FontWeight.bold,
                            color: PdfColors.green)),
                  ]),
                  pw.Column(children: [
                    pw.Text('صافي الرصيد',
                        style: pw.TextStyle(font: ttf, fontSize: 10)),
                    pw.Text(FormatUtils.formatCurrency(summary['balance'], decimalPlaces: 2),
                        style: pw.TextStyle(
                            fontWeight: pw.FontWeight.bold,
                            color: PdfColors.blue900)),
                  ]),
                ],
              ),
            ),
            pw.SizedBox(height: 20),
            pw.Table(
              border: pw.TableBorder.all(color: PdfColors.grey300),
              children: [
                pw.TableRow(
                  decoration: const pw.BoxDecoration(color: PdfColors.grey100),
                  children: [
                    pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Text('التاريخ',
                            style: pw.TextStyle(
                                font: ttf, fontWeight: pw.FontWeight.bold))),
                    pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Text('العملية',
                            style: pw.TextStyle(
                                font: ttf, fontWeight: pw.FontWeight.bold))),
                    pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Text('المبلغ',
                            style: pw.TextStyle(
                                font: ttf, fontWeight: pw.FontWeight.bold))),
                  ],
                ),
                ...activities.map((act) {
                  return pw.TableRow(
                    children: [
                      pw.Padding(
                          padding: const pw.EdgeInsets.all(8),
                          child: pw.Text(FormatUtils.formatDate(act['date']))),
                      pw.Padding(
                          padding: const pw.EdgeInsets.all(8),
                          child: pw.Text(act['label'] ?? '',
                              style: pw.TextStyle(font: ttf))),
                      pw.Padding(
                          padding: const pw.EdgeInsets.all(8),
                          child: pw.Text(FormatUtils.formatNumber(act['amount'], decimalPlaces: 2),
                              style: pw.TextStyle(
                                  color: act['type'] == 'sale'
                                      ? PdfColors.red
                                      : PdfColors.green))),
                    ],
                  );
                }),
              ],
            ),
          ];
        },
      ),
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdf.save(),
      name: 'كشف_حساب_$name.pdf',
    );
  }
}
