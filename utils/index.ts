import { enUS, fr, es, de, it } from 'date-fns/locale';
import type { ErrorMessage } from "~/type"
import { extractErrorData } from "~/server/utils/errors"

export const OPERATOR_EQUAL = '='
export const OPERATOR_NOT_EQUAL = '!='
export const OPERATOR_GREATER_THAN = '>'
export const OPERATOR_GREATER_THAN_OR_EQUAL = '>='
export const OPERATOR_LESS_THAN = '<'
export const OPERATOR_LESS_THAN_OR_EQUAL = '<='
export const OPERATOR_IN = 'in'

export const getDateFnsLocale = (_locale: 'fr' | 'en' | 'es' | 'de' | 'it' = 'fr') => {
    // const localeMap = { fr, en: enUS, enUS, es, de, it };
    // return localeMap[_locale] || fr
    return enUS
}

export const getImagePath = (src: string): string => {
    return `/api/image?path=/${src}`
}

/**
 * Extracts the error data from the received error object.
 * If the error has a 'data' property which contains an object,
 * then the object is returned, otherwise an empty object is returned.
 * @param error the error object
 * @returns The error data object
 */

export const getDetailedError = (error: ErrorMessage) => {
    let message = error.message ?? null
    // Récupérer le message d'erreur spécifique du serveur
    if (error && typeof error === 'object' && 'data' in error) {
        const errorData = error.data as { message?: string }
        message = errorData.message ? errorData.message : ''
    }
    return message
}

/**
 * Returns an object with keys 'tag' and 'message' based on the received error
 * If the error has a 'data' property which contains a 'tag' property,
 * then the 'tag' key is defined with this value,
 * otherwise the 'tag' key is undefined.
 * If the error has a 'message' property, then the 'message' key is defined with this value,
 * otherwise the 'message' key is defined with the server specific error message
 * (using the `getDetailedError` function).
 * If the `t` function is defined, then if the 'tag' key is defined,
 * the 'message' key is defined with the result of calling `t(tag)`,
 * otherwise the 'message' key is defined with the result of calling `t` with the value of the 'message' key of the error.
 */

export const catchTagMessage = (err: unknown, t?: (key: string) => string) => {
    let tag: string | undefined = undefined
    const message = getDetailedError(err as ErrorMessage)
    const data = extractErrorData(err)
    if (data && data.tag) {
        tag = data.tag as string
    }
    if (t) {
        if (tag) {
            if (tag != t(tag))
                return { tag: tag, message: t(tag) as string }
            else
                return { tag: tag, message: message }
        }
        return { tag: undefined, message }
    }
    return { tag, message }
}

/**
  * Truncates a string to a specified length.
  * @param str - The string to truncate.
  * @param len - The maximum length of the truncated string. Default is 60.
  * @returns The truncated string.
  */
export const truncate = (str: string, len: number = 60) => {
    return str.substring(0, len)
}

export const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)

/**
 * Replaces special HTML characters with their corresponding HTML entities.
 * @param tag - The HTML character to replace.
 * @returns The replaced HTML character.
 */
export const replaceTag = (tag: string): string => {
    const tagsToReplace: { [key: string]: string } = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
    }

    return tagsToReplace[tag] || tag
}

export const toMillion = (number: number): string => {
    const inMillions = number / 1000000
    if (inMillions < 1000) {
        return `${inMillions.toFixed(2)}M`
    } else {
        const inBillions = number / 1000000000
        return `${inBillions.toFixed(2)}B`
    }
}

/**
 * Rounds a number to a specified precision.
 * @param number - The number to round.
 * @param precision - The number of decimal places to round to. Default is 2.
 * @returns The rounded number.
 */
export const round = (number: number, precision: number = 0): number => {
    return Math.round(number * Math.pow(10, precision)) / Math.pow(10, precision)
}

/**
 * Replaces special HTML characters in a string with their corresponding HTML entities.
 * @param str - The string to replace the HTML characters in.
 * @returns The string with replaced HTML characters.
 */
export const safeTagsReplace = (str: string): string => {
    return str.replace(/[&<>]/g, replaceTag)
}

/**
 * Formats a price based on the currency.
 * @param amount - The price amount.
 * @param symbol - The currency symbol.
 * @returns The formatted price.
 */
export const formatPrice = (amount: number, symbol: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        currencyDisplay: 'symbol',
        maximumFractionDigits: 3,
    })
    return formatter.format(amount).replace('$', symbol)
}

/**
 * Delays the execution of a function by a specified number of milliseconds.
 * @param milliseconds - The number of milliseconds to delay the execution by.
 * @returns A promise that resolves after the specified number of milliseconds.
 */
export const delay = (milliseconds: number) => {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds)
    })
}

export const formatToReadableSize = (size: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    if (size < 1) return '0 ' + sizes[0];
    const i = Math.floor(Math.log(size) / Math.log(1024));
    return Math.round(size / Math.pow(1024, i)) + ' ' + sizes[i];
}

/**
 * Format a number as a dollar amount
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted dollar string (e.g. "$1,234.56")
 */
export function formatCurrency(value: number | string, decimals: number = 2): string {
    if (typeof value === 'string') {
        value = Number(value.replace(',', '.'))
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
}

export function getContrastYIQ(hexcolor: string | undefined) {
    if (!hexcolor)
        return '#fff'
    hexcolor = hexcolor.replace('#', '');
    if (hexcolor.length === 3) {
        hexcolor = hexcolor.split('').map(x => x + x).join('');
    }
    const r = parseInt(hexcolor.substr(0, 2), 16) / 255;
    const g = parseInt(hexcolor.substr(2, 2), 16) / 255;
    const b = parseInt(hexcolor.substr(4, 2), 16) / 255;

    const [R, G, B] = [r, g, b].map(c =>
        c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );
    const luminance = 0.2126 * R + 0.7152 * G + 0.0722 * B;
    return luminance > 0.179 ? '#000' : '#fff';
}


export const getDatetimeLocalNow = (_now = new Date()) => {
    const now = new Date(_now)
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const day = now.getDate()
    const hour = now.getHours()
    const minute = now.getMinutes()
    const localDatetime =
        year +
        '-' +
        (month < 10 ? '0' + month.toString() : month) +
        '-' +
        (day < 10 ? '0' + day.toString() : day) +
        'T' +
        (hour < 10 ? '0' + hour.toString() : hour) +
        ':' +
        (minute < 10 ? '0' + minute.toString() : minute)
    return localDatetime
}

export const formatDate = (dateString: string | Date, widthHour: boolean = false, _locale: 'fr' | 'en' | 'us' = 'fr') => {
    try {
        const date = new Date(dateString);
        const localeMap = { fr: 'fr-FR', en: 'en-GB', us: 'en-US' };
        const Intl_locale = localeMap[_locale] || 'fr-FR';

        // Vérifier si la date est valide
        if (isNaN(date.getTime())) {
            // console.error('Date invalide:', dateString);
            return 'Date invalide';
        }

        return new Intl.DateTimeFormat(Intl_locale, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            ...(widthHour ? { hour: '2-digit', minute: '2-digit' } : {})
        }).format(date);
    } catch {
        return 'Date invalide';
    }
}

export const formatDateLong = (dateString: string | Date, _locale: 'fr' | 'en' | 'us' = 'fr') => {
    try {
        const date = new Date(dateString);
        const localeMap = { fr: 'fr-FR', en: 'en-GB', us: 'en-US' };
        const Intl_locale = localeMap[_locale] || 'fr-FR';

        // Vérifier si la date est valide
        if (isNaN(date.getTime())) {
            return 'Date invalide';
        }

        return new Intl.DateTimeFormat(Intl_locale, {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(date);
    } catch {
        return 'Date invalide';
    }
}

export const formatHour = (dateString: string | Date, widthSecond: boolean = false, _locale: 'fr' | 'en' | 'us' = 'fr') => {
    try {
        const date = new Date(dateString);
        const localeMap = { fr: 'fr-FR', en: 'en-GB', us: 'en-US' };
        const Intl_locale = localeMap[_locale] || 'fr-FR';

        // Vérifier si la date est valide
        if (isNaN(date.getTime())) {
            // console.error('Date invalide:', dateString);
            return 'Date invalide';
        }

        return new Intl.DateTimeFormat(Intl_locale, {
            hour: '2-digit', minute: '2-digit', ...(widthSecond ? { second: '2-digit' } : {})
        }).format(date);
    } catch {
        return 'Date invalide';
    }
}


/**
 * Format a date as YYYY-MM-DD-HH-MM for use in filenames
 * @param date - Date to format (defaults to current date)
 * @returns Formatted date string (e.g. "2023-06-27-14-30")
 */
export function formatDateForFilename(date: Date = new Date()): string {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
        String(date.getHours()).padStart(2, '0'),
        String(date.getMinutes()).padStart(2, '0')
    ].join('-')
}

export const getDatePlaceholderFormat = () => {
    // Utilise la locale du navigateur pour afficher un exemple de date
    const locale = navigator.language || 'fr-FR'
    const example = new Date(2025, 4, 27) // 27 mai 2025
    return "ex: " + example.toLocaleDateString(locale)
}

export function toTimestamp(year: number, month: number, day: number): number {
    return new Date(year, month - 1, day).getTime();
}

export const parseDateStringToTimestamp = (dateStr: string): number | undefined => {
    // Déduit l'ordre des parties selon la locale, puis mappe sur [jour, mois, année]
    const locale = navigator.language || 'fr-FR'
    const example = new Date(2025, 4, 27)
    const parts = new Intl.DateTimeFormat(locale).formatToParts(example)
    const order = parts.filter(p => ['day', 'month', 'year'].includes(p.type)).map(p => p.type)
    const sep = dateStr.includes('-') ? '-' : dateStr.includes('/') ? '/' : '.'
    const values = dateStr.split(sep).map(Number)
    let day, month, year
    order.forEach((type, idx) => {
        if (type === 'day')
            day = values[idx]
        if (type === 'month')
            month = values[idx]
        if (type === 'year') {
            year = values[idx]
            if (year == undefined)
                year = new Date().getFullYear()
            if (year < 100)
                year = Number(`20${year}`)
        }
    })
    // Si parsing KO, retourne la string d'origine
    if (
        typeof day !== 'number' || isNaN(day) || day < 1 || day > 31 ||
        typeof month !== 'number' || isNaN(month) || month < 1 || month > 12 ||
        typeof year !== 'number' || isNaN(year) || year < 1900 || year > 2100
    ) {
        return undefined
    }
    return toTimestamp(year, month, day)
}

// Tableau de conversion des points en dollars pour les contrats futures
export const symbolPricePerPoint = {
    // Contrats standards
    'ES': 50,    // S&P 500
    'NQ': 20,    // NASDAQ
    'YM': 5,     // Dow Jones
    'RTY': 5,    // Russell 2000
    'CL': 1000,  // Crude Oil
    'GC': 100,   // Gold
    'SI': 5000,  // Silver

    // Mini contrats
    'MES': 5,    // Micro E-mini S&P 500 (1/10 de ES)
    'MNQ': 2,    // Micro E-mini NASDAQ (1/10 de NQ)
    'MYM': 0.5,  // Micro E-mini Dow Jones (1/10 de YM)
    'M2K': 0.5,  // Micro E-mini Russell 2000 (1/10 de RTY)
    'MCL': 100,  // Micro Crude Oil (1/10 de CL)
    'MGC': 10,   // Micro Gold (1/10 de GC)
    'SIL': 500,  // Micro Silver (1/10 de SI)

    // E-mini contrats
    'EMD': 100,  // E-mini S&P MidCap 400
    'QM': 500,   // E-mini Crude Oil (1/2 de CL)

    // Autres contrats populaires
    'ZB': 1000,  // 30-Year U.S. Treasury Bond
    'ZN': 1000,  // 10-Year U.S. Treasury Note
    'ZF': 1000,  // 5-Year U.S. Treasury Note
    '6E': 125000, // Euro FX
    '6J': 12500,  // Japanese Yen
    '6B': 62500,  // British Pound
    '6C': 100000, // Canadian Dollar
    '6A': 100000, // Australian Dollar
};
