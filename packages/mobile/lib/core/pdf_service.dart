import 'dart:io';
import 'dart:convert';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'format_utils.dart';
import 'number_to_words.dart';

class PdfService {
  static Future<void> generateInvoice(Map<String, dynamic> sale) async {
    final pdf = pw.Document();

    // Load Arabic Font from Google Fonts
    final ttf = await PdfGoogleFonts.cairoRegular();

    final items = (sale['items'] as List?) ?? [];
    final customer = sale['customer']?['name'] ?? sale['customerName'] ?? 'عميل نقدي';
    final date = sale['createdAt'] ?? DateTime.now().toString();

    // Try to get settings from sale, or fetch from SharedPreferences
    Map<String, dynamic>? settings = sale['settings'] as Map<String, dynamic>?;
    if (settings == null) {
      try {
        final prefs = await SharedPreferences.getInstance();
        final userJson = prefs.getString('user_json');
        if (userJson != null) {
          final user = jsonDecode(userJson) as Map<String, dynamic>;
          settings = {
            'storeName': user['storeName'],
            'taxId': user['storeTaxId'],
            'address': user['storeAddress'],
            'phone': user['storePhone'],
            'email': user['storeEmail'],
          };
        }
      } catch (e) {
        // ignore: avoid_print
        print('Error fetching settings for PDF: $e');
      }
    }
    
    const emerald = PdfColor.fromInt(0xff047857);
    bool isRTL = (sale['isRTL'] as bool?) ?? true; // Dynamic assignment to prevent dead code warning

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.only(left: 32, right: 32, top: 20, bottom: 10),
        textDirection: pw.TextDirection.rtl,
        footer: (context) => pw.Column(
          children: [
            pw.SizedBox(height: 0),
            pw.Center(
              child: pw.Text(isRTL ? '${settings?['storeName'] ?? 'RAID SYSTEM'} • ${DateTime.now().year} • مشغل بواسطة RAID CORE' : '${settings?['storeName'] ?? 'RAID SYSTEM'} • ${DateTime.now().year} • PROPULSÉ PAR RAID CORE',
                  style: pw.TextStyle(font: ttf, fontSize: 6, color: PdfColors.grey400, letterSpacing: 1)),
            ),
          ],
        ),
        build: (pw.Context context) {
          final double subtotalVal = (sale['totalAmount'] ?? sale['total'] ?? 0.0).toDouble();
          final double taxAmountVal = (sale['taxAmount'] ?? 0.0).toDouble();
          final double grandTotal = (sale['finalAmount'] ?? subtotalVal).toDouble();
          final double taxRateVal = (sale['taxRate'] ?? 0.0).toDouble();
          return [
            pw.SizedBox(height: 10),
              // 1. Brand & Store Header (Statement Style)
              pw.Container(
                decoration: const pw.BoxDecoration(
                  border: pw.Border(bottom: pw.BorderSide(color: PdfColors.black, width: 1.5)),
                ),
                padding: const pw.EdgeInsets.only(bottom: 10),
                margin: const pw.EdgeInsets.only(bottom: 20),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    // Small App Branding
                    pw.Row(
                      children: [
                        pw.Text(isRTL ? 'رائد المحاسبي • Raid Comptabilité' : 'Raid Comptabilité',
                            style: pw.TextStyle(font: ttf, fontSize: 6, fontWeight: pw.FontWeight.bold, color: emerald)),
                      ],
                    ),
                    pw.SizedBox(height: 10),
                    pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        // Left: Logo and Info
                        pw.Row(
                          crossAxisAlignment: pw.CrossAxisAlignment.start,
                          children: [
                            pw.Container(
                              width: 60,
                              height: 60,
                              decoration: pw.BoxDecoration(
                                color: PdfColors.grey50,
                                border: pw.Border.all(color: PdfColors.grey200),
                                borderRadius: const pw.BorderRadius.all(pw.Radius.circular(8)),
                              ),
                              alignment: pw.Alignment.center,
                              child: pw.Text(isRTL ? 'شعار' : 'LOGO',
                                  style: pw.TextStyle(font: ttf, fontSize: 8, color: PdfColors.grey400)),
                            ),
                            pw.SizedBox(width: 15),
                            pw.Column(
                              crossAxisAlignment: pw.CrossAxisAlignment.start,
                              children: [
                                pw.Text(settings?['storeName'] ?? 'RAID SYSTEM',
                                    style: pw.TextStyle(fontSize: 20, fontWeight: pw.FontWeight.bold, color: PdfColors.black)),
                                pw.SizedBox(height: 2),
                                if (settings?['address'] != null)
                                  pw.Text('العنوان: ${settings!['address']}', style: pw.TextStyle(font: ttf, fontSize: 8, color: PdfColors.grey700)),
                                if (settings?['phone'] != null)
                                  pw.Text('الهاتف: ${settings!['phone']}', style: pw.TextStyle(font: ttf, fontSize: 8, color: PdfColors.grey700)),
                                if (settings?['email'] != null)
                                  pw.Text('الإيميل: ${settings!['email']}', style: pw.TextStyle(font: ttf, fontSize: 8, color: PdfColors.grey700)),
                                if (settings?['taxId'] != null)
                                  pw.Padding(
                                    padding: const pw.EdgeInsets.only(top: 2),
                                    child: pw.Text('الرقم الضريبي: ${settings!['taxId']}', style: pw.TextStyle(font: ttf, fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.black)),
                                  ),
                              ],
                            ),
                          ],
                        ),
                        // Right: Title
                        pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.end,
                          children: [
                            pw.Text(sale['type'] == 'QUOTATION' ? 'عرض سعر' : 'فاتورة مبيعات',
                                style: pw.TextStyle(font: ttf, fontSize: 24, fontWeight: pw.FontWeight.bold, color: emerald)),
                            pw.SizedBox(height: 5),
                            pw.Text('رقم: #${FormatUtils.formatNumber(sale['id'])}',
                                style: pw.TextStyle(font: ttf, fontSize: 12, fontWeight: pw.FontWeight.bold, color: PdfColors.black)),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // 2. Customer & Date Row
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Container(
                    width: 250,
                    decoration: pw.BoxDecoration(
                      border: pw.Border.all(color: PdfColors.grey300),
                    ),
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Container(
                          width: double.infinity,
                          color: emerald,
                          padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          child: pw.Text(isRTL ? 'العميل / المستلم' : 'Client / Destinataire', style: pw.TextStyle(font: ttf, fontSize: 9, color: PdfColors.white, fontWeight: pw.FontWeight.bold)),
                        ),
                        pw.Padding(
                          padding: const pw.EdgeInsets.all(8),
                          child: pw.Column(
                            crossAxisAlignment: pw.CrossAxisAlignment.start,
                            children: [
                              pw.Text(customer, style: pw.TextStyle(font: ttf, fontSize: 12, fontWeight: pw.FontWeight.bold)),
                              if (sale['customer']?['phone'] != null)
                                pw.Text(sale['customer']!['phone'], style: pw.TextStyle(font: ttf, fontSize: 9, color: PdfColors.grey700)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text(isRTL ? (sale['type'] == 'QUOTATION' ? 'تاريخ عرض السعر' : 'تاريخ الفاتورة') : (sale['type'] == 'QUOTATION' ? 'Date Devis' : 'Date Facture'), style: pw.TextStyle(font: ttf, fontSize: 9, color: PdfColors.grey500, fontWeight: pw.FontWeight.bold)),
                      pw.Text(FormatUtils.formatDate(date), style: pw.TextStyle(font: ttf, fontSize: 12, fontWeight: pw.FontWeight.bold)),
                    ],
                  ),
                ],
              ),
              pw.SizedBox(height: 30),

              // 3. Clean Table with Grid
              pw.Table(
                border: pw.TableBorder.all(color: PdfColors.black, width: 0.5),
                children: [
                  pw.TableRow(
                    decoration: const pw.BoxDecoration(color: PdfColors.grey50),
                    children: [
                      pw.Padding(
                          padding: const pw.EdgeInsets.all(8),
                          child: pw.Text(isRTL ? 'المنتج / البيان' : 'Description',
                              style: pw.TextStyle(font: ttf, fontWeight: pw.FontWeight.bold, fontSize: 10))),
                      pw.Padding(
                          padding: const pw.EdgeInsets.all(8),
                          child: pw.Center(child: pw.Text(isRTL ? 'الكمية' : 'Qté',
                              style: pw.TextStyle(font: ttf, fontWeight: pw.FontWeight.bold, fontSize: 10)))),
                      pw.Padding(
                          padding: const pw.EdgeInsets.all(8),
                          child: pw.Text(isRTL ? 'السعر' : 'Prix',
                              style: pw.TextStyle(font: ttf, fontWeight: pw.FontWeight.bold, fontSize: 10))),
                      pw.Padding(
                          padding: const pw.EdgeInsets.all(8),
                          child: pw.Text(isRTL ? 'الإجمالي' : 'Total',
                              style: pw.TextStyle(font: ttf, fontWeight: pw.FontWeight.bold, fontSize: 10))),
                    ],
                  ),
                  ...items.map((item) {
                    final name = item['product']?['name'] ?? item['name'] ?? 'منتج';
                    final qty = item['qty'] ?? item['quantity'] ?? 1;
                    final price = item['sellPrice'] ?? item['price'] ?? 0.0;
                    return pw.TableRow(
                      children: [
                        pw.Padding(
                            padding: const pw.EdgeInsets.all(8),
                            child: pw.Text(name, style: pw.TextStyle(font: ttf, fontSize: 10, color: PdfColors.grey800))),
                        pw.Padding(
                            padding: const pw.EdgeInsets.all(8),
                            child: pw.Center(child: pw.Text(FormatUtils.formatQuantity(qty), style: pw.TextStyle(font: ttf, fontSize: 10)))),
                        pw.Padding(
                            padding: const pw.EdgeInsets.all(8),
                            child: pw.Text(FormatUtils.formatNumber(price), style: pw.TextStyle(font: ttf, fontSize: 10))),
                        pw.Padding(
                            padding: const pw.EdgeInsets.all(8),
                            child: pw.Text(FormatUtils.formatNumber((qty ?? 0) * (price ?? 0)), style: pw.TextStyle(font: ttf, fontWeight: pw.FontWeight.bold, fontSize: 10))),
                      ],
                    );
                  }),
                ],
              ),
              pw.SizedBox(height: 15),

              // 4. Summary Row
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(NumberToWords.formatInvoiceTotal(grandTotal, isRTL, settings?['currency'] ?? 'MRU', sale['type'] ?? 'SALE'),
                        style: pw.TextStyle(font: ttf, fontSize: 10, fontWeight: pw.FontWeight.bold, color: PdfColors.grey800)),
                      pw.SizedBox(height: 20),
                      pw.Container(
                        width: 120,
                        decoration: const pw.BoxDecoration(
                          border: pw.Border(top: pw.BorderSide(color: PdfColors.grey300)),
                        ),
                        padding: const pw.EdgeInsets.only(top: 5),
                        child: pw.Text(isRTL ? 'توقيع المستلم' : 'Signature', style: pw.TextStyle(font: ttf, fontSize: 8, color: PdfColors.grey400)),
                      ),

                    ],
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Row(
                        mainAxisSize: pw.MainAxisSize.min,
                        children: [
                          pw.Text(isRTL ? 'المجموع الفرعي:' : 'Sous-total:',
                              style: pw.TextStyle(font: ttf, fontSize: 9, color: PdfColors.grey600)),
                          pw.SizedBox(width: 10),
                          pw.Text(FormatUtils.formatNumber(subtotalVal),
                              style: pw.TextStyle(font: ttf, fontSize: 9, fontWeight: pw.FontWeight.bold)),
                        ],
                      ),
                      pw.SizedBox(height: 2),
                      pw.Row(
                        mainAxisSize: pw.MainAxisSize.min,
                        children: [
                          pw.Text(isRTL ? 'الضريبة (TVA) $taxRateVal%:' : 'TVA $taxRateVal%:',
                              style: pw.TextStyle(font: ttf, fontSize: 8, color: PdfColors.grey500)),
                          pw.SizedBox(width: 10),
                          pw.Text(FormatUtils.formatNumber(taxAmountVal),
                              style: pw.TextStyle(font: ttf, fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.grey500)),
                        ],
                      ),
                      pw.SizedBox(height: 2),
                      pw.Row(
                        mainAxisSize: pw.MainAxisSize.min,
                        children: [
                          pw.Text(isRTL ? 'المجموع الإجمالي:' : 'Montant Total:',
                              style: pw.TextStyle(font: ttf, fontSize: 12, color: PdfColors.grey700)),
                          pw.SizedBox(width: 15),
                          pw.Text(FormatUtils.formatCurrency(grandTotal),
                              style: pw.TextStyle(font: ttf, fontSize: 16, fontWeight: pw.FontWeight.bold)),
                        ],
                      ),
                      pw.SizedBox(height: 5),
                      pw.Text(isRTL ? 'جميع المبالغ بالعملة المحلية (MRU)' : 'Tous les montants sont en devise locale (MRU)',
                          style: pw.TextStyle(font: ttf, fontSize: 8, color: PdfColors.grey400)),

                    ],
                  ),
                ],
              ),
          ];
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
