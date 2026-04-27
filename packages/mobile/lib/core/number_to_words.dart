class NumberToWords {
  static String convertAR(int num) {
    if (num == 0) return 'صفر';
    
    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
    const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
    const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

    String convertGroup(int n) {
      String str = '';
      int h = (n / 100).floor();
      int t = ((n % 100) / 10).floor();
      int o = n % 10;
      
      if (h > 0) {
        str += hundreds[h];
        if (t > 0 || o > 0) str += ' و ';
      }
      
      if (t == 1 && o >= 0) {
        str += teens[o];
      } else {
        if (o > 0) {
          str += ones[o];
          if (t > 0) str += ' و ';
        }
        if (t > 1) {
          str += tens[t];
        }
      }
      return str.trim();
    }

    if (num < 0) return 'سالب ${convertAR(num.abs())}';
    
    List<String> parts = [];
    
    int b = (num / 1000000000).floor();
    if (b > 0) {
      parts.add('${convertGroup(b)} ${b == 1 ? "مليار" : b == 2 ? "ملياران" : "مليارات"}');
      num %= 1000000000;
    }
    
    int m = (num / 1000000).floor();
    if (m > 0) {
      parts.add('${convertGroup(m)} ${m == 1 ? "مليون" : m == 2 ? "مليونان" : "ملايين"}');
      num %= 1000000;
    }
    
    int th = (num / 1000).floor();
    if (th > 0) {
      parts.add('${convertGroup(th)} ${th == 1 ? "ألف" : th == 2 ? "ألفان" : "آلاف"}');
      num %= 1000;
    }
    
    if (num > 0) {
      parts.add(convertGroup(num));
    }
    
    return parts.join(' و ');
  }

  static String convertFR(int num) {
    if (num == 0) return 'zéro';
    
    const ones = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
    const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
    
    String convertGroup(int n) {
      String str = '';
      int h = (n / 100).floor();
      int t = ((n % 100) / 10).floor();
      int o = n % 10;
      
      if (h > 0) {
        str += '${h == 1 ? "cent" : "${ones[h]} cent${t == 0 && o == 0 ? "s" : ""}"} ';
      }
      
      if (t == 1) {
        str += '${teens[o]} ';
      } else if (t == 7) {
        str += 'soixante-${o == 1 ? "et-onze" : teens[o]} ';
      } else if (t == 9) {
        str += 'quatre-vingt-${teens[o]} ';
      } else {
        if (t > 1) {
          str += tens[t];
          if (o > 0) {
            str += o == 1 ? '-et-${ones[o]}' : '-${ones[o]}';
          }
          str += ' ';
        } else if (o > 0) {
          str += '${ones[o]} ';
        }
      }
      return str.trim();
    }
    
    List<String> parts = [];
    int m = (num / 1000000).floor();
    if (m > 0) {
      parts.add('${convertGroup(m)} million${m > 1 ? "s" : ""}');
      num %= 1000000;
    }
    
    int th = (num / 1000).floor();
    if (th > 0) {
      if (th == 1) {
        parts.add('mille');
      } else {
        parts.add('${convertGroup(th)} mille');
      }
      num %= 1000;
    }
    
    if (num > 0) {
      parts.add(convertGroup(num));
    }
    
    return parts.join(' ').trim();
  }

  static String formatInvoiceTotal(double num, bool isRTL, [String currency = 'MRU', String type = 'SALE']) {
    int whole = num.floor();
    int fraction = ((num - whole) * 100).round();
    
    if (isRTL) {
      String res = 'فقط ${convertAR(whole)}';
      if (fraction > 0) res += ' فاصلة ${convertAR(fraction)}';
      res += ' أوقية لا غير';
      return res;
    } else {
      String docNameFR = type == 'QUOTATION' ? 'le présent devis' : 'la présente facture';
      String res = 'Arrêté $docNameFR à la somme de ${convertFR(whole)}';
      if (fraction > 0) res += ' virgule ${convertFR(fraction)}';
      res += ' Ouguiyas.';
      return res;
    }
  }
}
