import { DateTime, FixedOffsetZone } from "luxon";
import type { SettingsContentType } from "~/schema/user";

const localeMap = { fr: 'fr-FR', en: 'en-GB', us: 'en-US' } as const;
type Locale = 'fr' | 'en' | 'us';

const formatWithIntl = (
	dateString: string | Date,
	locale: Locale,
	options: Intl.DateTimeFormatOptions,
	timezoneMode: 'CURRENT' | 'LOCAL' | 'UTC' = 'CURRENT',
	timezoneLocal: string = 'Europe/Paris',
	timezoneUtcOffset: number = 0
): string => {
	try {
		const date = new Date(dateString);
		if (isNaN(date.getTime())) {
			return 'Date invalide';
		}
		const intlLocale = localeMap[locale] || 'fr-FR';
		const timeZone = getTimeZoneFromSettings(timezoneMode, timezoneLocal, timezoneUtcOffset);
		return new Intl.DateTimeFormat(intlLocale, {
			...options,
			...(timeZone ? { timeZone } : {})
		}).format(date);
	} catch {
		return 'Date invalide';
	}
}

export const getTimeZoneFromSettings = (
	timezoneMode: 'CURRENT' | 'LOCAL' | 'UTC',
	timezoneLocal: string = 'Europe/Paris',
	timezoneUtcOffset: number = 0
): string => {
	if (timezoneMode === 'UTC') {
		return FixedOffsetZone.instance(timezoneUtcOffset * 60).name
	}
	if (timezoneMode === 'LOCAL') {
		return timezoneLocal
	}
	return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export const formatDateString = (
	dateString: string | Date,
	widthHour: boolean = false,
	locale: Locale = 'fr',
	timezoneMode: 'CURRENT' | 'LOCAL' | 'UTC' = 'CURRENT',
	timezoneLocal: string = 'Europe/Paris',
	timezoneUtcOffset: number = 0
) => {
	return formatWithIntl(dateString, locale, {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		...(widthHour ? { hour: '2-digit', minute: '2-digit' } : {})
	}, timezoneMode, timezoneLocal, timezoneUtcOffset)
}

export const formatDateWithUserTimezone = (
	date: string | Date,
	userSettings: Partial<SettingsContentType> | null | undefined,
	withHour: boolean = false,
	locale: Locale = 'fr'
): string => {
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

export const formatDateLongString = (dateString: string | Date, locale: Locale = 'fr', isWeekDay: boolean = false) => {
	try {
		const date = new Date(dateString);
		if (isNaN(date.getTime())) {
			return 'Date invalide';
		}
		const intlLocale = localeMap[locale] || 'fr-FR';
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

export const formatHourString = (
	dateString: string | Date,
	widthSecond: boolean = false,
	locale: Locale = 'fr',
	timezoneMode: 'CURRENT' | 'LOCAL' | 'UTC' = 'CURRENT',
	timezoneLocal: string = 'Europe/Paris',
	timezoneUtcOffset: number = 0
) => {
	return formatWithIntl(dateString, locale, {
		hour: '2-digit',
		minute: '2-digit',
		...(widthSecond ? { second: '2-digit' } : {})
	}, timezoneMode, timezoneLocal, timezoneUtcOffset)
}

export const getHourAndWeekdayInUserTimezone = (
	dateString: string | Date,
	timezoneMode: 'CURRENT' | 'LOCAL' | 'UTC' = 'CURRENT',
	timezoneLocal: string = 'Europe/Paris',
	timezoneUtcOffset: number = 0
): { hour: number; weekday: number } => {
	const timeZone = getTimeZoneFromSettings(timezoneMode, timezoneLocal, timezoneUtcOffset)
	const localDt = DateTime.fromJSDate(new Date(dateString), { zone: 'utc' }).setZone(timeZone)
	return {
		hour: localDt.hour,
		weekday: localDt.weekday % 7
	}
}

export const formatDateKeyForGrouping = (
	date: Date,
	mode: 'day' | 'month',
	timezoneMode: 'CURRENT' | 'LOCAL' | 'UTC' = 'CURRENT',
	timezoneLocal: string = 'Europe/Paris',
	timezoneUtcOffset: number = 0
): string => {
	const timeZone = getTimeZoneFromSettings(timezoneMode, timezoneLocal, timezoneUtcOffset)
	const dt = DateTime.fromJSDate(date).setZone(timeZone)
	if (mode === 'month') {
		return dt.toFormat('yyyy-MM')
	}
	return dt.toFormat('yyyy-MM-dd')
}
