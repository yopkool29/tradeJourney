import { describe, it, expect } from 'vitest'
import {
	parseDate,
	parseNTDate,
	parseMT5Date,
	parseQuantowerDate,
	parseIBKRDate,
	parseIBKRFlexQueryActivityDate,
	parseISO8601Date,
	ExportDateFormat,
	ImportMode,
	formatDuration,
	formatDurationMinutes,
	parseDateStringToTimestamp,
	toISODate,
	toTimestamp,
	formatDateToYYYYMMDD,
	formatDateToYYYYMM,
	normalizeDateToLocalString,
	normalizeDateToUTCString,
	getDatetimeLocalNow,
	toUTCMidnight
} from '~/utils/date-utils'

describe('date-utils', () => {
	describe('parseDate', () => {
		it('should parse date in LOCAL mode with timezone', () => {
			const result = parseDate('15/01/2024 10:30:00', ExportDateFormat.NT_EXECUTION, ImportMode.LOCAL, 'Europe/Paris')
			expect(result).toBeInstanceOf(Date)
			expect(result.getTime()).toBeGreaterThan(0)
		})

		it('should parse date in UTC mode', () => {
			const result = parseDate('15/01/2024 10:30:00', ExportDateFormat.NT_EXECUTION, ImportMode.UTC)
			expect(result).toBeInstanceOf(Date)
		})

		it('should throw error in LOCAL mode without timezone', () => {
			expect(() => {
				parseDate('15/01/2024 10:30:00', ExportDateFormat.NT_EXECUTION, ImportMode.LOCAL)
			}).toThrow('timezone est obligatoire en mode LOCAL')
		})
	})

	describe('parseNTDate', () => {
		it('should parse NinjaTrader date format', () => {
			const result = parseNTDate('15/01/2024 10:30:00', ImportMode.UTC)
			expect(result).toBeInstanceOf(Date)
		})
	})

	describe('parseMT5Date', () => {
		it('should parse MetaTrader5 date format', () => {
			const result = parseMT5Date('2024.01.15 10:30:00', ImportMode.UTC)
			expect(result).toBeInstanceOf(Date)
		})
	})

	describe('parseQuantowerDate', () => {
		it('should parse Quantower date format', () => {
			const result = parseQuantowerDate('15/01/2024 10:30:00', ImportMode.UTC)
			expect(result).toBeInstanceOf(Date)
		})
	})

	describe('parseIBKRDate', () => {
		it('should parse IBKR Flex Query date format', () => {
			const result = parseIBKRDate('2024-01-15, 10:30:00', ImportMode.UTC)
			expect(result).toBeInstanceOf(Date)
		})
	})

	describe('parseIBKRFlexQueryActivityDate', () => {
		it('should parse IBKR activity date format', () => {
			const result = parseIBKRFlexQueryActivityDate('20240115;103000', ImportMode.UTC)
			expect(result).toBeInstanceOf(Date)
		})

		it('should return current date for bad format', () => {
			const result = parseIBKRFlexQueryActivityDate('bad-format', ImportMode.UTC)
			expect(result).toBeInstanceOf(Date)
			expect(result.getTime()).toBeGreaterThan(0)
		})
	})

	describe('parseISO8601Date', () => {
		it('should parse ISO date in LOCAL mode', () => {
			const result = parseISO8601Date('2024-01-15T10:30:00Z', ImportMode.LOCAL, 'Europe/Paris')
			expect(result).toBeInstanceOf(Date)
		})

		it('should parse ISO date in UTC mode', () => {
			const result = parseISO8601Date('2024-01-15T10:30:00Z', ImportMode.UTC)
			expect(result).toBeInstanceOf(Date)
		})

		it('should apply offset in UTC mode', () => {
			const result = parseISO8601Date('2024-01-15T10:30:00Z', ImportMode.UTC, '1')
			expect(result).toBeInstanceOf(Date)
		})
	})

	describe('formatDuration', () => {
		it('should format duration between two dates', () => {
			const start = new Date('2024-01-15T10:00:00Z')
			const end = new Date('2024-01-15T11:30:45Z')
			const result = formatDuration(start, end)
			expect(typeof result).toBe('string')
			expect(result).toContain('h')
		})

		it('should return 0s for same dates', () => {
			const date = new Date('2024-01-15T10:00:00Z')
			const result = formatDuration(date, date)
			expect(result).toBe('0s')
		})
	})

	describe('formatDurationMinutes', () => {
		it('should format minutes only', () => {
			expect(formatDurationMinutes(45)).toBe('45min')
		})

		it('should format hours and minutes', () => {
			expect(formatDurationMinutes(150)).toBe('2h 30min')
		})

		it('should format exact hours', () => {
			expect(formatDurationMinutes(120)).toBe('2h')
		})
	})

	describe('parseDateStringToTimestamp', () => {
		it('should return undefined for invalid date', () => {
			const result = parseDateStringToTimestamp('invalid')
			expect(result).toBeUndefined()
		})
	})

	describe('toISODate', () => {
		it('should extract ISO date from Date', () => {
			const result = toISODate(new Date('2024-01-15T10:30:00Z'))
			expect(typeof result).toBe('string')
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
		})
	})

	describe('toTimestamp', () => {
		it('should convert date parts to timestamp', () => {
			const result = toTimestamp(2024, 1, 15)
			expect(typeof result).toBe('number')
			expect(result).toBeGreaterThan(0)
		})
	})

	describe('formatDateToYYYYMMDD', () => {
		it('should format date to YYYY-MM-DD', () => {
			expect(formatDateToYYYYMMDD(new Date('2024-01-15'))).toBe('2024-01-15')
		})
	})

	describe('formatDateToYYYYMM', () => {
		it('should format date to YYYY-MM', () => {
			expect(formatDateToYYYYMM(new Date('2024-01-15'))).toBe('2024-01')
		})
	})

	describe('normalizeDateToLocalString', () => {
		it('should normalize date using local time', () => {
			const result = normalizeDateToLocalString(new Date('2024-01-15T10:30:00Z'))
			expect(typeof result).toBe('string')
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
		})
	})

	describe('normalizeDateToUTCString', () => {
		it('should normalize date using UTC time', () => {
			const result = normalizeDateToUTCString(new Date('2024-01-15T10:30:00Z'))
			expect(typeof result).toBe('string')
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
		})
	})

	describe('getDatetimeLocalNow', () => {
		it('should return local datetime in ISO format', () => {
			const result = getDatetimeLocalNow()
			expect(typeof result).toBe('string')
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
		})
	})

	describe('toUTCMidnight', () => {
		it('should return same Date object', () => {
			const date = new Date('2024-01-15T10:30:00Z')
			const result = toUTCMidnight(date)
			expect(result).toBe(date)
		})

		it('should parse string to UTC midnight', () => {
			const result = toUTCMidnight('2024-01-15')
			expect(result).toBeInstanceOf(Date)
			expect(result.toISOString()).toBe('2024-01-15T00:00:00.000Z')
		})
	})
})
