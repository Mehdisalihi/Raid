/**
 * formatNumber / formatDate helpers
 * Always returns Latin (Western Arabic) digits: 0 1 2 3 4 5 6 7 8 9
 * regardless of the system or app locale.
 */

const LATIN_LOCALE = 'en-US'; // guarantees Latin digits

/**
 * Format a number with thousands separator, Latin digits.
 * @param {number|string} value
 * @param {number} [decimals] optional fixed decimal places
 */
export function fNum(value, decimals) {
    const num = Number(value);
    if (isNaN(num)) return '0';
    if (decimals !== undefined) {
        return num.toLocaleString(LATIN_LOCALE, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    }
    return num.toLocaleString(LATIN_LOCALE);
}

/**
 * Format a date string or Date object to a locale date string using Latin digits.
 * @param {string|Date} date
 * @param {string} [appLanguage] 'ar' | 'fr' - used for month/weekday names only
 * @param {object} [options] Intl.DateTimeFormat options
 */
export function fDate(date, appLanguage = 'fr', options = {}) {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return String(date);
    // Use fr-FR for Arabic language too — gives Latin digits with French month names
    // or use 'ar-u-nu-latn' which explicitly requests Latin numerals in Arabic locale
    const locale = appLanguage === 'ar' ? 'ar-u-nu-latn' : 'fr-FR';
    return d.toLocaleDateString(locale, options);
}

/**
 * Format a time string or Date object using Latin digits.
 */
export function fTime(date, appLanguage = 'fr') {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return String(date);
    const locale = appLanguage === 'ar' ? 'ar-u-nu-latn' : 'fr-FR';
    return d.toLocaleTimeString(locale);
}

/**
 * Format a datetime using Latin digits.
 */
export function fDateTime(date, appLanguage = 'fr') {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return String(date);
    const locale = appLanguage === 'ar' ? 'ar-u-nu-latn' : 'fr-FR';
    return d.toLocaleString(locale);
}
