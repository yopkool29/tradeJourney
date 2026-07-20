import { DateTime } from "luxon";
import { format } from "date-fns";

export function toISODate(date: Date): string | null {
	const dt = DateTime.fromJSDate(date);
	return dt.toISODate();
}

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
	return new Date(year, month - 1, day).getTime()
}

export function formatDateToYYYYMMDD(date: Date | string): string {
	return format(date, 'yyyy-MM-dd')
}

export function formatDateToYYYYMM(date: Date | string): string {
	return format(date, 'yyyy-MM')
}

export function normalizeDateToUTCString(date: Date): string {
	return DateTime.fromJSDate(date).toUTC().toISODate() ?? ''
}

export function toUTCMidnight(date: string | Date): Date {
	if (date instanceof Date) {
		return date
	}
	return new Date(`${date}T00:00:00.000Z`)
}
