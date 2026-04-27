export function numberToWordsAR(num) {
    if (num === 0) return 'صفر';
    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
    const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
    const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

    function convertGroup(n) {
        let str = '';
        let h = Math.floor(n / 100);
        let t = Math.floor((n % 100) / 10);
        let o = n % 10;
        
        if (h > 0) {
            str += hundreds[h];
            if (t > 0 || o > 0) str += ' و ';
        }
        
        if (t === 1 && o >= 0) {
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

    if (num < 0) return 'سالب ' + numberToWordsAR(Math.abs(num));
    
    let parts = [];
    
    let b = Math.floor(num / 1000000000);
    if (b > 0) {
        parts.push(convertGroup(b) + (b === 1 ? ' مليار' : b === 2 ? ' ملياران' : ' مليارات'));
        num %= 1000000000;
    }
    
    let m = Math.floor(num / 1000000);
    if (m > 0) {
        parts.push(convertGroup(m) + (m === 1 ? ' مليون' : m === 2 ? ' مليونان' : ' ملايين'));
        num %= 1000000;
    }
    
    let t = Math.floor(num / 1000);
    if (t > 0) {
        parts.push(convertGroup(t) + (t === 1 ? ' ألف' : t === 2 ? ' ألفان' : ' آلاف'));
        num %= 1000;
    }
    
    if (num > 0) {
        parts.push(convertGroup(num));
    }
    
    return parts.join(' و ');
}

export function numberToWordsFR(num) {
    if (num === 0) return 'zéro';
    
    const ones = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
    const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
    
    function convertGroup(n) {
        let str = '';
        let h = Math.floor(n / 100);
        let t = Math.floor((n % 100) / 10);
        let o = n % 10;
        
        if (h > 0) {
            str += (h === 1 ? 'cent' : ones[h] + ' cent' + (t === 0 && o === 0 ? 's' : '')) + ' ';
        }
        
        if (t === 1) {
            str += teens[o] + ' ';
        } else if (t === 7) {
            str += 'soixante-' + (o === 1 ? 'et-onze' : teens[o]) + ' ';
        } else if (t === 9) {
            str += 'quatre-vingt-' + teens[o] + ' ';
        } else {
            if (t > 1) {
                str += tens[t];
                if (o > 0) {
                    str += (o === 1 ? '-et-' : '-') + ones[o];
                }
                str += ' ';
            } else if (o > 0) {
                str += ones[o] + ' ';
            }
        }
        return str.trim();
    }
    
    let parts = [];
    let m = Math.floor(num / 1000000);
    if (m > 0) {
        parts.push(convertGroup(m) + ' million' + (m > 1 ? 's' : ''));
        num %= 1000000;
    }
    
    let th = Math.floor(num / 1000);
    if (th > 0) {
        if (th === 1) parts.push('mille');
        else parts.push(convertGroup(th) + ' mille');
        num %= 1000;
    }
    
    if (num > 0) {
        parts.push(convertGroup(num));
    }
    
    return parts.join(' ').trim();
}

export function formatInvoiceTotalWords(num, isRTL, currency = 'MRU', type = 'SALE') {
    const whole = Math.floor(num);
    const fraction = Math.round((num - whole) * 100);
    
    if (isRTL) {
        let res = `فقط ${numberToWordsAR(whole)}`;
        if (fraction > 0) res += ` فاصلة ${numberToWordsAR(fraction)}`;
        res += ` أوقية لا غير`;
        return res;
    } else {
        const docNameFR = type === 'QUOTATION' ? 'le présent devis' : 'la présente facture';
        let res = `Arrêté ${docNameFR} à la somme de ${numberToWordsFR(whole)}`;
        if (fraction > 0) res += ` virgule ${numberToWordsFR(fraction)}`;
        res += ` Ouguiyas.`;
        return res;
    }
}
