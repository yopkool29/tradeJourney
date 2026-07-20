import { DateTime } from "luxon";
import { ExportDateFormat, ImportMode } from "./constants";

export function parseDate(
	dateStr: string,
	format: typeof ExportDateFormat[keyof typeof ExportDateFormat],
	mode: ImportMode,
	timezone?: string
): Date {
	if (mode === ImportMode.LOCAL) {
		if (!timezone) {
			throw new Error("timezone est obligatoire en mode LOCAL");
		}
		const date = DateTime.fromFormat(dateStr, format, { zone: timezone });
		return date.isValid ? date.toJSDate() : new Date();
	} else {
		const date = DateTime.fromFormat(dateStr, format, { zone: "UTC" });
		if (!date.isValid) return new Date();

		if (timezone) {
			const offset = parseInt(timezone, 10);
			if (!isNaN(offset)) {
				return date.minus({ hours: offset }).toJSDate();
			}
		}

		return date.toJSDate();
	}
}

export function parseNTDate(
	dateStr: string,
	mode: ImportMode,
	timezone?: string
): Date {
	return parseDate(dateStr, ExportDateFormat.NT_EXECUTION, mode, timezone);
}

export function parseMT5Date(
	dateStr: string,
	mode: ImportMode,
	timezone?: string
): Date {
	return parseDate(dateStr, ExportDateFormat.MT5_EXPORT, mode, timezone);
}

export function parseQuantowerDate(
	dateStr: string,
	mode: ImportMode,
	timezone?: string
): Date {
	return parseDate(dateStr, ExportDateFormat.QUANTOWER_EXECUTION, mode, timezone);
}

export function parseIBKRDate(
	dateStr: string,
	mode: ImportMode,
	timezone?: string
): Date {
	return parseDate(dateStr, ExportDateFormat.IBKR_FLEX_QUERY, mode, timezone);
}

export function parseIBKRFlexQueryActivityDate(
	dateStr: string,
	mode: ImportMode,
	timezone?: string
): Date {
	const parts = dateStr.split(';');
	if (parts.length !== 2) {
		return new Date();
	}

	const datePart = parts[0];
	const timePart = parts[1];

	const year = parseInt(datePart.substring(0, 4), 10);
	const month = parseInt(datePart.substring(4, 6), 10);
	const day = parseInt(datePart.substring(6, 8), 10);

	const hour = parseInt(timePart.substring(0, 2), 10);
	const minute = parseInt(timePart.substring(2, 4), 10);
	const second = parseInt(timePart.substring(4, 6), 10);

	const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}, ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;

	return parseDate(formattedDate, ExportDateFormat.IBKR_FLEX_QUERY, mode, timezone);
}

export function parseISO8601Date(
	dateStr: string,
	mode: ImportMode,
	timezone?: string
): Date {
	if (mode === ImportMode.LOCAL) {
		if (!timezone) {
			throw new Error("timezone est obligatoire en mode LOCAL");
		}

		const offset = parseInt(timezone, 10);
		if (!isNaN(offset)) {
			const date = DateTime.fromISO(dateStr, { zone: "UTC" });
			if (!date.isValid) return new Date();
			return date.minus({ hours: offset }).toJSDate();
		}

		let cleanDateStr = dateStr;
		if (dateStr.endsWith('Z')) {
			cleanDateStr = dateStr.slice(0, -1);
		}

		const date = DateTime.fromISO(cleanDateStr, { zone: timezone });
		return date.isValid ? date.toJSDate() : new Date();
	} else {
		const date = DateTime.fromISO(dateStr, { zone: "UTC" });
		if (!date.isValid) return new Date();

		if (timezone) {
			const offset = parseInt(timezone, 10);
			if (!isNaN(offset)) {
				return date.minus({ hours: offset }).toJSDate();
			}
		}

		return date.toJSDate();
	}
}
