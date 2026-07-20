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

export const UTC_OFFSETS = Array.from({ length: 27 }, (_, i) => i - 12)

export enum ImportMode {
	LOCAL = "local",
	UTC = "utc"
}

export const ExportDateFormat = {
	NT_EXECUTION: "dd/MM/yyyy HH:mm:ss",
	MT5_EXPORT: "yyyy.MM.dd HH:mm:ss",
	QUANTOWER_EXECUTION: "dd/MM/yyyy HH:mm:ss",
	IBKR_FLEX_QUERY: "yyyy-MM-dd, HH:mm:ss"
} as const
