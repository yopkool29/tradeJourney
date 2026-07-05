import { DateTime } from "luxon";
import { format } from "date-fns";
import type { SettingsContentType } from "~/schema/user";

// Liste des fuseaux horaires IANA pour le mode LOCAL
export const IANA_TIMEZONES = [
  'Africa/Johannesburg',
  'Africa/Cairo',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'America/Honolulu',
  'America/Toronto',
  'America/Mexico_City',
  'America/Buenos_Aires',
  'America/Sao_Paulo',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Singapore',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Perth',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Europe/Istanbul',
  'Pacific/Auckland',
  'Pacific/Fiji',
  'UTC'
]

// Liste des offsets UTC pour le mode UTC
export const UTC_OFFSETS = Array.from({ length: 27 }, (_, i) => i - 12)

/**
 * Modes d'import de dates
 */
export enum ImportMode {
  LOCAL = "local",   // Les données sont en heure locale (ex: Europe/Paris)
  UTC = "utc"        // Les données sont déjà en UTC
}

/**
 * Formats de dates supportés par les différents brokers
 */
export const ExportDateFormat = {
  NT_EXECUTION: "dd/MM/yyyy HH:mm:ss",      // NinjaTrader: 15/01/2026 16:34:35
  MT5_EXPORT: "yyyy.MM.dd HH:mm:ss",        // MetaTrader5: 2026.01.15 16:34:35
  QUANTOWER_EXECUTION: "dd/MM/yyyy HH:mm:ss", // Quantower: 15/01/2026 16:34:35
  IBKR_FLEX_QUERY: "yyyy-MM-dd, HH:mm:ss"   // IBKR Flex Query: 2026-01-15, 16:34:35
} as const

/**
 * Parse une date selon le mode d'import
 * @param dateStr Chaîne de date à parser
 * @param format Format de la date (utiliser enum ExportDateFormat)
 * @param mode Mode d'import (local ou utc)
 * @param timezone Fuseau horaire (obligatoire en mode LOCAL, ignoré en mode UTC)
 * @returns Objet Date en UTC
 */
export function parseDate(
  dateStr: string,
  format: typeof ExportDateFormat[keyof typeof ExportDateFormat],
  mode: ImportMode,
  timezone?: string
): Date {
  if (mode === ImportMode.LOCAL) {
    // Mode LOCAL : parser avec le timezone fourni
    if (!timezone) {
      throw new Error("timezone est obligatoire en mode LOCAL");
    }
    const date = DateTime.fromFormat(dateStr, format, { zone: timezone });
    return date.isValid ? date.toJSDate() : new Date();
  } else {
    // Mode UTC : parser en UTC, puis appliquer le décalage si fourni
    const date = DateTime.fromFormat(dateStr, format, { zone: "UTC" });
    if (!date.isValid) return new Date();

    // Si un timezone (décalage) est fourni en mode UTC, l'appliquer
    if (timezone) {
      const offset = parseInt(timezone, 10);
      if (!isNaN(offset)) {
        // Soustraire le décalage pour convertir vers UTC
        return date.minus({ hours: offset }).toJSDate();
      }
    }

    return date.toJSDate();
  }
}

/**
 * Parse une date NinjaTrader (format: dd/MM/yyyy HH:mm:ss)
 * @param dateStr Chaîne de date
 * @param mode Mode d'import
 * @param timezone Fuseau horaire (obligatoire en mode LOCAL)
 * @returns Objet Date en UTC
 */
export function parseNTDate(
  dateStr: string,
  mode: ImportMode,
  timezone?: string
): Date {
  return parseDate(dateStr, ExportDateFormat.NT_EXECUTION, mode, timezone);
}

/**
 * Parse une date MetaTrader5 (format: yyyy.MM.dd HH:mm:ss)
 * @param dateStr Chaîne de date
 * @param mode Mode d'import
 * @param timezone Fuseau horaire (obligatoire en mode LOCAL)
 * @returns Objet Date en UTC
 */
export function parseMT5Date(
  dateStr: string,
  mode: ImportMode,
  timezone?: string
): Date {
  return parseDate(dateStr, ExportDateFormat.MT5_EXPORT, mode, timezone);
}

/**
 * Parse une date Quantower (format: dd/MM/yyyy HH:mm:ss)
 * @param dateStr Chaîne de date
 * @param mode Mode d'import
 * @param timezone Fuseau horaire (obligatoire en mode LOCAL)
 * @returns Objet Date en UTC
 */
export function parseQuantowerDate(
  dateStr: string,
  mode: ImportMode,
  timezone?: string
): Date {
  return parseDate(dateStr, ExportDateFormat.QUANTOWER_EXECUTION, mode, timezone);
}

/**
 * Parse une date IBKR Flex Query (format: yyyy-MM-dd, HH:mm:ss)
 * @param dateStr Chaîne de date
 * @param mode Mode d'import
 * @param timezone Fuseau horaire (obligatoire en mode LOCAL)
 * @returns Objet Date en UTC
 */
export function parseIBKRDate(
  dateStr: string,
  mode: ImportMode,
  timezone?: string
): Date {
  return parseDate(dateStr, ExportDateFormat.IBKR_FLEX_QUERY, mode, timezone);
}

/**
 * Parse une date IBKR Flex Query Activity (format: yyyyMMdd;HHmmss)
 * @param dateStr Chaîne de date (ex: "20260121;094359")
 * @param mode Mode d'import
 * @param timezone Fuseau horaire (obligatoire en mode LOCAL)
 * @returns Objet Date en UTC
 */
export function parseIBKRFlexQueryActivityDate(
  dateStr: string,
  mode: ImportMode,
  timezone?: string
): Date {
  // Format: yyyyMMdd;HHmmss (ex: 20260121;094359)
  const parts = dateStr.split(';');
  if (parts.length !== 2) {
    return new Date();
  }

  const datePart = parts[0]; // yyyyMMdd
  const timePart = parts[1]; // HHmmss

  // Parser la date
  const year = parseInt(datePart.substring(0, 4), 10);
  const month = parseInt(datePart.substring(4, 6), 10);
  const day = parseInt(datePart.substring(6, 8), 10);

  // Parser l'heure
  const hour = parseInt(timePart.substring(0, 2), 10);
  const minute = parseInt(timePart.substring(2, 4), 10);
  const second = parseInt(timePart.substring(4, 6), 10);

  // Créer la date formatée pour Luxon
  const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}, ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;

  return parseDate(formattedDate, ExportDateFormat.IBKR_FLEX_QUERY, mode, timezone);
}

/**
 * Parse une date ISO 8601 (format: YYYY-MM-DDTHH:mm:ss.sssZ)
 * @param dateStr Chaîne de date ISO 8601
 * @param mode Mode d'import
 * @param timezone Fuseau horaire (obligatoire en mode LOCAL, offset en mode UTC)
 * @returns Objet Date en UTC
 */
export function parseISO8601Date(
  dateStr: string,
  mode: ImportMode,
  timezone?: string
): Date {
  if (mode === ImportMode.LOCAL) {
    // Mode LOCAL : parser avec le timezone fourni (interprète la date comme étant dans cette timezone)
    if (!timezone) {
      throw new Error("timezone est obligatoire en mode LOCAL");
    }

    // Vérifier si c'est un offset numérique
    const offset = parseInt(timezone, 10);
    if (!isNaN(offset)) {
      // Offset numérique : parser en UTC puis soustraire l'offset
      const date = DateTime.fromISO(dateStr, { zone: "UTC" });
      if (!date.isValid) return new Date();
      return date.minus({ hours: offset }).toJSDate();
    }

    // Timezone IANA : retirer le 'Z' pour que Luxon puisse interpréter la date dans cette timezone
    let cleanDateStr = dateStr;
    if (dateStr.endsWith('Z')) {
      cleanDateStr = dateStr.slice(0, -1);
    }

    const date = DateTime.fromISO(cleanDateStr, { zone: timezone });
    return date.isValid ? date.toJSDate() : new Date();
  } else {
    // Mode UTC : parser en UTC, puis appliquer le décalage si fourni
    const date = DateTime.fromISO(dateStr, { zone: "UTC" });
    if (!date.isValid) return new Date();

    // Si un timezone (décalage) est fourni en mode UTC, l'appliquer
    if (timezone) {
      const offset = parseInt(timezone, 10);
      if (!isNaN(offset)) {
        // Soustraire le décalage pour convertir vers UTC
        return date.minus({ hours: offset }).toJSDate();
      }
    }

    return date.toJSDate();
  }
}

/**
 * ============================================
 * CONVERSION ENTRE FORMATS (ISO, Timestamp)
 * ============================================
 */

/**
 * Formate une Date UTC en ISO string
 * @param date Objet Date (UTC)
 * @returns ISO string (ex: "2026-01-15T15:34:35.000Z")
 */
export function toISO(date: Date): string {
  return date.toISOString();
}

/**
 * Extrait la date ISO (YYYY-MM-DD) d'un objet Date UTC
 * @param date Objet Date (UTC)
 * @returns Date ISO (ex: "2026-01-15")
 */
export function toISODate(date: Date): string | null {
  const dt = DateTime.fromJSDate(date);
  return dt.toISODate();
}

/**
 * Convert date to timestamp
 * @param year - Year
 * @param month - Month (1-12)
 * @param day - Day
 * @returns Timestamp in milliseconds
 */
export function toTimestamp(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getTime();
}

/**
 * Parse date string to timestamp based on locale
 * @param dateStr - Date string to parse
 * @returns Timestamp in milliseconds or undefined if invalid
 */
export const parseDateStringToTimestamp = (dateStr: string): number | undefined => {
  const locale = typeof navigator !== 'undefined' ? navigator.language || 'fr-FR' : 'fr-FR'
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
  if (
    typeof day !== 'number' || isNaN(day) || day < 1 || day > 31 ||
    typeof month !== 'number' || isNaN(month) || month < 1 || month > 12 ||
    typeof year !== 'number' || isNaN(year) || year < 1900 || year > 2100
  ) {
    return undefined
  }
  return toTimestamp(year, month, day)
}

/**
 * ============================================
 * NORMALISATION DE DATES
 * ============================================
 */

/**
 * Formate une date en YYYY-MM-DD (wrapper autour de format() de date-fns)
 * Utilise l'heure locale du navigateur
 * @param date - Date à formater (Date ou string)
 * @returns Chaîne au format YYYY-MM-DD (ex: "2026-01-29")
 */
export function formatDateToYYYYMMDD(date: Date | string): string {
  return format(date, 'yyyy-MM-dd')
}

export function formatDateToYYYYMM(date: Date | string): string {
  return format(date, 'yyyy-MM')
}

/**
 * Normalise une date en format YYYY-MM-DD en utilisant l'heure locale
 * @param date - Date à normaliser
 * @returns Chaîne au format YYYY-MM-DD (ex: "2026-01-29")
 */
export function normalizeDateToLocalString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Normalise une date en format YYYY-MM-DD en utilisant l'heure UTC
 * @param date - Date à normaliser
 * @returns Chaîne au format YYYY-MM-DD (ex: "2026-01-29")
 */
export function normalizeDateToUTCString(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * ============================================
 * FORMATAGE DE DATES (Locale-aware)
 * ============================================
 */

/**
 * Formate une Date UTC en format complet lisible (date + heure)
 * @param date Objet Date (UTC)
 * @param timezone Fuseau horaire pour l'affichage
 * @param format Format personnalisé (défaut: "dd/MM/yyyy HH:mm:ss")
 * @returns Chaîne formatée
 */
export function formatDate(
  date: Date,
  timezone: string,
  format: string = "dd/MM/yyyy HH:mm:ss"
): string {
  const dt = DateTime.fromJSDate(date).setZone(timezone);
  return dt.toFormat(format);
}

export const getTimeZoneFromSettings = (
  timezoneMode: 'CURRENT' | 'LOCAL' | 'UTC',
  timezoneLocal: string = 'Europe/Paris',
  timezoneUtcOffset: number = 0
): string => {
  if (timezoneMode === 'UTC') {
    const sign = timezoneUtcOffset >= 0 ? '+' : '-'
    const hours = String(Math.abs(Math.floor(timezoneUtcOffset))).padStart(2, '0')
    const minutes = String(Math.abs((timezoneUtcOffset % 1) * 60)).padStart(2, '0')
    return `UTC${sign}${hours}:${minutes}`
  }
  if (timezoneMode === 'LOCAL') {
    return timezoneLocal
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * Format date with timezone support: 25/10/2025 or 25/10/2025 14:30
 * @param dateString - Date string or Date object (UTC)
 * @param widthHour - Include time in format
 * @param locale - Locale for formatting ('fr', 'en', 'us')
 * @param timezoneMode - Timezone display mode: 'CURRENT' (auto-detect), 'LOCAL' (IANA), 'UTC' (offset)
 * @param timezoneLocal - IANA timezone for LOCAL mode (e.g., 'Europe/Paris')
 * @param timezoneUtcOffset - UTC offset in hours for UTC mode (e.g., 1 for UTC+1)
 * @returns Formatted date string
 */
export const formatDateString = (
  dateString: string | Date,
  widthHour: boolean = false,
  locale: 'fr' | 'en' | 'us' = 'fr',
  timezoneMode: 'CURRENT' | 'LOCAL' | 'UTC' = 'CURRENT',
  timezoneLocal: string = 'Europe/Paris',
  timezoneUtcOffset: number = 0
) => {
  try {

    const date = new Date(dateString);
    const localeMap = { fr: 'fr-FR', en: 'en-GB', us: 'en-US' };
    const intlLocale = localeMap[locale] || 'fr-FR';

    if (isNaN(date.getTime())) {
      return 'Date invalide';
    }

    const timeZone = getTimeZoneFromSettings(timezoneMode, timezoneLocal, timezoneUtcOffset)

    return new Intl.DateTimeFormat(intlLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...(widthHour ? { hour: '2-digit', minute: '2-digit' } : {}),
      ...(timeZone ? { timeZone } : {})
    }).format(date);
  } catch {
    return 'Date invalide';
  }
}

/**
 * Helper function to format dates with user timezone settings
 * @param date - Date to format
 * @param userSettings - User settings object with timezone configuration
 * @param withHour - Include time in format
 * @param locale - Locale for formatting
 * @returns Formatted date string
 */
export const formatDateWithUserTimezone = (
  date: string | Date,
  userSettings: Partial<SettingsContentType> | null | undefined,
  withHour: boolean = false,
  locale: 'fr' | 'en' | 'us' = 'fr'
): string => {
  // Fallback to defaults if userSettings is undefined
  if (!userSettings) {
    return formatDateString(
      date,
      withHour,
      locale,
      'CURRENT',
      'Europe/Paris',
      0
    )
  }

  return formatDateString(
    date,
    withHour,
    locale,
    userSettings.timezoneDisplay || 'CURRENT',
    userSettings.timezoneLocal || 'Europe/Paris',
    userSettings.timezoneUtcOffset ?? 0
  )
}

/**
 * Format long date: 25 October 2025
 * @param dateString - Date string or Date object
 * @param locale - Locale for formatting
 * @param isWeekDay - Include weekday in format
 * @returns Formatted date string
 */
export const formatDateLongString = (dateString: string | Date, locale: 'fr' | 'en' | 'us' = 'fr', isWeekDay: boolean = false) => {
  try {
    const date = new Date(dateString);
    const localeMap = { fr: 'fr-FR', en: 'en-GB', us: 'en-US' };
    const intlLocale = localeMap[locale] || 'fr-FR';

    if (isNaN(date.getTime())) {
      return 'Date invalide';
    }

    return new Intl.DateTimeFormat(intlLocale, {
      weekday: isWeekDay ? 'long' : undefined,
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  } catch {
    return 'Date invalide';
  }
}

/**
 * Format hour string: 14:30 or 14:30:45
 * @param dateString - Date à formater (string ou objet Date)
 * @param widthSecond - Inclure les secondes (défaut: false)
 * @param locale - Locale pour le formatage ('fr', 'en', 'us')
 * @param timezoneMode - Timezone display mode: 'CURRENT' (auto-detect), 'LOCAL' (IANA), 'UTC' (offset)
 * @param timezoneLocal - IANA timezone for LOCAL mode (e.g., 'Europe/Paris')
 * @param timezoneUtcOffset - UTC offset in hours for UTC mode (e.g., 1 for UTC+1)
 * @returns Chaîne formatée (ex: "14:30" ou "14:30:45")
 */
export const formatHourString = (
  dateString: string | Date,
  widthSecond: boolean = false,
  locale: 'fr' | 'en' | 'us' = 'fr',
  timezoneMode: 'CURRENT' | 'LOCAL' | 'UTC' = 'CURRENT',
  timezoneLocal: string = 'Europe/Paris',
  timezoneUtcOffset: number = 0
) => {
  try {
    const date = new Date(dateString);
    const localeMap = { fr: 'fr-FR', en: 'en-GB', us: 'en-US' };
    const intlLocale = localeMap[locale] || 'fr-FR';

    if (isNaN(date.getTime())) {
      return 'Date invalide';
    }

    const timeZone = getTimeZoneFromSettings(timezoneMode, timezoneLocal, timezoneUtcOffset)

    return new Intl.DateTimeFormat(intlLocale, {
      hour: '2-digit',
      minute: '2-digit',
      ...(widthSecond ? { second: '2-digit' } : {}),
      ...(timeZone ? { timeZone } : {})
    }).format(date);
  } catch {
    return 'Invalid date';
  }
}

/**
 * Extract numeric hour and weekday using the same timezone logic as formatHourString
 * Uses Luxon for reliable timezone conversion
 * @param dateString - Date to parse (string or Date object)
 * @param timezoneMode - Timezone display mode
 * @param timezoneLocal - IANA timezone for LOCAL mode
 * @param timezoneUtcOffset - UTC offset for UTC mode
 * @returns Object with hour (0-23) and weekday (0=Sunday..6=Saturday)
 */
export const getHourAndWeekdayInUserTimezone = (
  dateString: string | Date,
  timezoneMode: 'CURRENT' | 'LOCAL' | 'UTC' = 'CURRENT',
  timezoneLocal: string = 'Europe/Paris',
  timezoneUtcOffset: number = 0
): { hour: number; weekday: number } => {
  const dt = DateTime.fromJSDate(new Date(dateString), { zone: 'utc' })

  let targetZone: string
  if (timezoneMode === 'CURRENT') {
    targetZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  } else if (timezoneMode === 'LOCAL') {
    targetZone = timezoneLocal
  } else {
    const sign = timezoneUtcOffset >= 0 ? '+' : '-'
    const hours = String(Math.abs(Math.floor(timezoneUtcOffset))).padStart(2, '0')
    const minutes = String(Math.abs((timezoneUtcOffset % 1) * 60)).padStart(2, '0')
    targetZone = `UTC${sign}${hours}:${minutes}`
  }

  const localDt = dt.setZone(targetZone)
  // Luxon weekday: 1=Monday..7=Sunday
  // Convert to JS getDay(): 0=Sunday..6=Saturday
  return {
    hour: localDt.hour,
    weekday: localDt.weekday % 7
  }
}

/**
 * ============================================
 * FORMATAGE SPÉCIALISÉ (Durée, Fichiers)
 * ============================================
 */

/**
 * Calcule la durée entre deux dates en format lisible
 * @param startDate Date de début (UTC)
 * @param endDate Date de fin (UTC)
 * @returns Chaîne formatée (ex: "1h 30m 45s")
 */
export function formatDuration(startDate: Date, endDate: Date): string {
  const start = DateTime.fromJSDate(startDate);
  const end = DateTime.fromJSDate(endDate);
  const duration = end.diff(start, ["hours", "minutes", "seconds"]);

  const parts: string[] = [];
  if (duration.hours) parts.push(`${Math.floor(duration.hours)}h`);
  if (duration.minutes) parts.push(`${Math.floor(duration.minutes)}m`);
  if (duration.seconds) parts.push(`${Math.floor(duration.seconds)}s`);

  return parts.length > 0 ? parts.join(" ") : "0s";
}

/**
 * Format duration in minutes to readable string (45min, 2h 30min, 5h)
 * @param minutes - Duration in minutes
 * @returns Formatted duration string
 */
export const formatDurationMinutes = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.round(minutes)}min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
}

/**
 * Format duration from seconds (e.g. "1h 30m 45s" or "90s")
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 */
export const formatDurationSeconds = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  }
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.round(seconds % 60)
  if (hours > 0) {
    return secs > 0 ? `${hours}h ${mins}m ${secs}s` : `${hours}h ${mins}m`
  }
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

/**
 * Format date as YYYY-MM-DD-HH-MM for use in filenames
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

/**
 * Get local datetime in ISO format (YYYY-MM-DDTHH:MM)
 * @param now - Date to format (defaults to current date)
 * @returns ISO datetime string
 */
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

/**
 * Convertit une date (string YYYY-MM-DD ou Date) en DateTime UTC à minuit
 * Utilisé pour normaliser les dates de DayTag
 */
export function toUTCMidnight(date: string | Date): Date {
  if (date instanceof Date) {
    return date
  }
  return new Date(`${date}T00:00:00.000Z`)
}
