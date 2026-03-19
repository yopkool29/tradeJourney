import { enUS } from 'date-fns/locale';
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


export const getImagePath = (src: string, userId?: number, dbName?: string): string => {
    if (userId && dbName) {
        // Use the same path construction as getUploadPath: ./upload/user_{userId}_data/{dbName}/screenshots
        const uploadPath = `user_${userId}_data/${dbName}/screenshots`
        return `/api/image?path=${encodeURIComponent(uploadPath)}/${src}`
    }
    return ""
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
        message = errorData?.message ?? message
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
export function formatCurrency(value: number | string, decimals: number = 2, currency: string = 'USD'): string {
    if (typeof value === 'string') {
        value = Number(value.replace(',', '.'))
    }
    if (currency == "USD") {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(value);
    } else {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(value);
    }
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


export const getDatePlaceholderFormat = () => {
    // Utilise la locale du navigateur pour afficher un exemple de date
    const locale = typeof navigator !== 'undefined' ? navigator.language || 'fr-FR' : 'fr-FR'
    const example = new Date(2025, 4, 27) // 27 mai 2025
    return "ex: " + example.toLocaleDateString(locale)
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

/**
 * Format timezone display for accounts
 * @param useTimezone - Whether the account uses timezone
 * @param timezone - The timezone value (IANA timezone or UTC offset)
 * @param timezoneMode - The timezone mode ('local' or 'utc')
 * @param t - i18n translation function
 * @returns Formatted timezone string
 */
export function formatTimezone(
    useTimezone: boolean,
    timezone: string | null | undefined,
    timezoneMode: 'local' | 'utc' | null | undefined,
    t: (key: string) => string
): string {
    if (!useTimezone || !timezone) {
        return t('zodI18n.types.undefined')
    }

    if (timezoneMode === 'utc') {
        const offset = parseInt(timezone)
        if (offset === 0) {
            return 'UTC±0'
        }
        return `UTC${offset > 0 ? '+' : ''}${offset}`
    }

    // Local timezone - display as is
    return timezone
}

/**
 * Gère les metadata de manière sécurisée
 */
export const metadataHelpers = {
    /**
     * Fusionne les metadata existantes avec de nouvelles données
     * @param existing Les metadata existantes (peut être null ou undefined)
     * @param updates Les nouvelles données à fusionner
     * @returns Les metadata fusionnées, ou null si vides
     */
    merge: (existing: Record<string, any> | null | undefined, updates: Record<string, any>): Record<string, any> | null => {
        // Reconstruire le JSON en ne prenant que les clés non-undefined
        const merged: Record<string, any> = {}
        
        // Ajouter les clés existantes (sauf undefined/null)
        if (existing && typeof existing === 'object') {
            try {
                const entries = Array.isArray(existing) ? [] : Object.entries(existing)
                entries.forEach(([key, value]: [string, any]) => {
                    if (value !== undefined && value !== null) {
                        merged[key] = value
                    }
                })
            } catch (e) {
                // Ignorer les erreurs de conversion
            }
        }
        
        // Appliquer les updates : ajouter si valide, supprimer si undefined/null
        if (updates && typeof updates === 'object') {
            Object.entries(updates).forEach(([key, value]) => {
                if (value === undefined || value === null) {
                    // Supprimer la clé si elle existe
                    delete merged[key]
                } else {
                    // Ajouter/mettre à jour la clé
                    merged[key] = value
                }
            })
        }
        
        return Object.keys(merged).length > 0 ? merged : null
    },

    /**
     * Extrait une valeur spécifique des metadata
     * @param metadata Les metadata
     * @param key La clé à extraire
     * @param defaultValue La valeur par défaut si la clé n'existe pas
     * @returns La valeur extraite ou la valeur par défaut
     */
    get: <T = any>(metadata: Record<string, any> | null | undefined, key: string, defaultValue?: T): T | undefined => {
        if (!metadata) return defaultValue
        return (metadata[key] ?? defaultValue) as T
    },

    /**
     * Définit une valeur dans les metadata
     * @param metadata Les metadata existantes
     * @param key La clé à définir
     * @param value La valeur à définir
     * @returns Les metadata mises à jour (objet avec la clé définie, ou null si vide)
     */
    set: (metadata: Record<string, any> | null | undefined, key: string, value: any): Record<string, any> | null => {
        // Reconstruire l'objet en ne prenant que les clés valides
        const result: Record<string, any> = {}
        
        // Copier les clés existantes (sauf undefined/null)
        if (metadata && typeof metadata === 'object') {
            Object.entries(metadata).forEach(([k, v]) => {
                if (v !== undefined && v !== null) {
                    result[k] = v
                }
            })
        }
        
        // Ajouter/mettre à jour la nouvelle clé (sauf si undefined/null)
        if (value !== undefined && value !== null) {
            result[key] = value
        }
        
        // Retourner l'objet ou null si vide
        return Object.keys(result).length > 0 ? result : null
    },

    /**
     * Supprime une clé des metadata
     * @param metadata Les metadata existantes
     * @param key La clé à supprimer
     * @returns Les metadata mises à jour
     */
    remove: (metadata: Record<string, any> | null | undefined, key: string): Record<string, any> | null => {
        if (!metadata) return null
        const { [key]: _, ...rest } = metadata
        return Object.keys(rest).length > 0 ? rest : null
    },

    /**
     * Vérifie si une clé existe dans les metadata
     * @param metadata Les metadata
     * @param key La clé à vérifier
     * @returns true si la clé existe, false sinon
     */
    has: (metadata: Record<string, any> | null | undefined, key: string): boolean => {
        return metadata ? key in metadata : false
    }
}
