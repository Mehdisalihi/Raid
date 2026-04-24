import 'package:intl/intl.dart';

class FormatUtils {
  static String formatDate(dynamic date,
      {String format = 'yyyy/MM/dd', String locale = 'ar'}) {
    if (date == null) return '';
    DateTime? dt;
    if (date is DateTime) {
      dt = date;
    } else if (date is String) {
      dt = DateTime.tryParse(date);
    }
    if (dt == null) return toLatinNumerals(date.toString());
    final result = DateFormat(format, locale).format(dt);
    return toLatinNumerals(result);
  }

  static String toLatinNumerals(String input) {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const latinDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

    String output = input;
    for (int i = 0; i < 10; i++) {
      output = output.replaceAll(arabicDigits[i], latinDigits[i]);
    }
    return output;
  }

  static String formatNumber(dynamic value, {int decimalPlaces = 0}) {
    if (value == null) return '0';
    double numValue = 0.0;
    if (value is num) {
      numValue = value.toDouble();
    } else if (value is String) {
      numValue = double.tryParse(toLatinNumerals(value)) ?? 0.0;
    }
    
    final formatted = numValue.toStringAsFixed(decimalPlaces);
    return toLatinNumerals(formatted);
  }

  static String formatCurrency(dynamic value, {int decimalPlaces = 0}) {
    return '${formatNumber(value, decimalPlaces: decimalPlaces)} MRU';
  }

  static String formatQuantity(dynamic value) {
    if (value == null) return '0';
    double numValue = 0.0;
    if (value is num) {
      numValue = value.toDouble();
    } else if (value is String) {
      numValue = double.tryParse(toLatinNumerals(value)) ?? 0.0;
    }
    
    // If it's a whole number, don't show decimal places
    if (numValue == numValue.roundToDouble()) {
      return toLatinNumerals(numValue.round().toString());
    }
    return formatNumber(value, decimalPlaces: 2);
  }
}
