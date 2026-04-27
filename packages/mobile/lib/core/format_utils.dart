import 'package:intl/intl.dart';

class FormatUtils {
  static String formatDate(dynamic date,
      {String format = 'yyyy/MM/dd'}) {
    if (date == null) return '';
    DateTime? dt;
    if (date is DateTime) {
      dt = date;
    } else if (date is String) {
      dt = DateTime.tryParse(date);
    }
    if (dt == null) return toLatinNumerals(date.toString());
    
    // Use default locale but force Latin numerals via toLatinNumerals
    final result = DateFormat(format).format(dt);
    return toLatinNumerals(result);
  }

  static String toLatinNumerals(String input) {
    const Map<String, String> digitsMap = {
      // Arabic digits
      '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
      '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
      // Persian/Urdu digits
      '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
      '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
    };

    String output = input;
    digitsMap.forEach((nonLat, lat) {
      output = output.replaceAll(nonLat, lat);
    });
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
