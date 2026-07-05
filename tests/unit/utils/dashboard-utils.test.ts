import { describe, it, expect } from 'vitest'
import {
	getWeekNumber,
	formatDateByMode,
	getPeriodDates,
	groupTradesByPeriod,
	generateIntradayPnlChartData,
	generateCumulatedPnlChartData,
	generateApptChartData,
	generatePlRatioChartData,
	generateWinrateChartData,
	periodTranslations,
	periodOptions,
	getSmartLabelAlign,
	getSmartLabelAnchor
} from '~/utils/dashboard'

const mockTrades = [
	{ closeDate: '2024-01-15T11:00:00Z', profit: 100, netProfit: 95, lot: 1, openDate: '2024-01-15T10:00:00Z' },
	{ closeDate: '2024-01-16T11:00:00Z', profit: 50, netProfit: 45, lot: 1, openDate: '2024-01-16T10:00:00Z' },
	{ closeDate: '2024-01-17T12:00:00Z', profit: -80, netProfit: -85, lot: 2, openDate: '2024-01-17T10:00:00Z' },
	{ closeDate: '2024-01-18T11:00:00Z', profit: 200, netProfit: 190, lot: 1, openDate: '2024-01-18T10:00:00Z' },
	{ closeDate: '2024-01-19T10:15:00Z', profit: -30, netProfit: -35, lot: 1, openDate: '2024-01-19T10:00:00Z' }
]

describe('dashboard utils', () => {
	describe('getWeekNumber', () => {
		it('should calculate week number for a date', () => {
			const result = getWeekNumber(new Date('2024-01-15'))
			expect(typeof result).toBe('number')
			expect(result).toBeGreaterThan(0)
		})

		it('should handle year boundary', () => {
			const result = getWeekNumber(new Date('2023-12-31'))
			expect(typeof result).toBe('number')
		})
	})

	describe('formatDateByMode', () => {
		it('should format date for day mode', () => {
			const result = formatDateByMode('2024-01-15', 'day')
			expect(typeof result).toBe('string')
			expect(result).toContain('15')
		})

		it('should format date for week mode', () => {
			const result = formatDateByMode('2024-01-15', 'week')
			expect(typeof result).toBe('string')
			expect(result).toContain('S')
		})

		it('should format date for month mode', () => {
			const result = formatDateByMode('2024-01-15', 'month')
			expect(typeof result).toBe('string')
		})

		it('should format date for year mode', () => {
			const result = formatDateByMode('2024-01-15', 'year')
			expect(result).toBe('2024')
		})

		it('should return period for unknown mode', () => {
			const result = formatDateByMode('2024-01-15', 'unknown')
			expect(result).toBe('2024-01-15')
		})
	})

	describe('periodTranslations', () => {
		it('should contain common periods', () => {
			expect(periodTranslations.this_week).toBeDefined()
			expect(periodTranslations.last_month).toBeDefined()
			expect(periodTranslations.last_three_months_until_now).toBeDefined()
		})

		it('should have includeEndDay property', () => {
			expect(typeof periodTranslations.this_week.includeEndDay).toBe('boolean')
		})
	})

	describe('periodOptions', () => {
		it('should return array of options', () => {
			const result = periodOptions('fr')
			expect(Array.isArray(result)).toBe(true)
			expect(result.length).toBeGreaterThan(0)
			expect(result[0]).toHaveProperty('label')
			expect(result[0]).toHaveProperty('value')
		})
	})

	describe('getPeriodDates', () => {
		it('should return dates for this_week', () => {
			const result = getPeriodDates('this_week')
			expect(result.start).toBeInstanceOf(Date)
			expect(result.end).toBeInstanceOf(Date)
			expect(result.includeEndDay).toBe(true)
		})

		it('should return dates for last_month', () => {
			const result = getPeriodDates('last_month')
			expect(result.start).toBeInstanceOf(Date)
			expect(result.end).toBeInstanceOf(Date)
			expect(result.includeEndDay).toBe(false)
		})

		it('should return null dates for all period', () => {
			const result = getPeriodDates('all')
			expect(result.start).toBeNull()
			expect(result.end).toBeNull()
		})
	})

	describe('groupTradesByPeriod', () => {
		it('should group trades by day', () => {
			const result = groupTradesByPeriod(mockTrades as any, 'day', null)
			expect(typeof result).toBe('object')
			expect(Object.keys(result).length).toBe(5)
		})

		it('should group trades by week', () => {
			const result = groupTradesByPeriod(mockTrades as any, 'week', null)
			expect(typeof result).toBe('object')
			expect(Object.keys(result).length).toBeGreaterThan(0)
		})

		it('should group trades by month', () => {
			const result = groupTradesByPeriod(mockTrades as any, 'month', null)
			expect(typeof result).toBe('object')
			expect(Object.keys(result).length).toBe(1)
		})

		it('should group trades by year', () => {
			const result = groupTradesByPeriod(mockTrades as any, 'year', null)
			expect(typeof result).toBe('object')
			expect(Object.keys(result).length).toBe(1)
		})
	})

	describe('generateIntradayPnlChartData', () => {
		it('should return data points for trades', () => {
			const result = generateIntradayPnlChartData(mockTrades as any) as Array<{ count: number; pnl: number; date?: Date }>
			expect(Array.isArray(result)).toBe(true)
			expect(result.length).toBe(6) // 5 trades + initial point at 0
			expect(result[0].pnl).toBe(0)
		})

		it('should return empty data for no trades', () => {
			const result = generateIntradayPnlChartData([]) as { labels: []; datasets: any[] }
			expect(result.labels.length).toBe(0)
		})
	})

	describe('generateCumulatedPnlChartData', () => {
		it('should return chart data structure', () => {
			const result = generateCumulatedPnlChartData(mockTrades as any, 'day', true, null)
			expect(result).toHaveProperty('labels')
			expect(result).toHaveProperty('datasets')
			expect(Array.isArray(result.labels)).toBe(true)
			expect(Array.isArray(result.datasets)).toBe(true)
			expect(result.datasets.length).toBe(2)
		})

		it('should return empty data for no trades', () => {
			const result = generateCumulatedPnlChartData([], 'day', true, null)
			expect(result.labels.length).toBe(0)
			expect(result.datasets[0].data.length).toBe(0)
		})
	})

	describe('generateApptChartData', () => {
		it('should return chart data structure', () => {
			const result = generateApptChartData(mockTrades as any, 'day', 3, true, null)
			expect(result).toHaveProperty('labels')
			expect(result).toHaveProperty('datasets')
			expect(Array.isArray(result.datasets)).toBe(true)
		})

		it('should return empty data for no trades', () => {
			const result = generateApptChartData([], 'day', 3, true, null)
			expect(result.labels.length).toBe(0)
		})
	})

	describe('generatePlRatioChartData', () => {
		it('should return chart data structure', () => {
			const result = generatePlRatioChartData(mockTrades as any, 'day', 3, null)
			expect(result).toHaveProperty('labels')
			expect(result).toHaveProperty('datasets')
		})

		it('should return empty data for no trades', () => {
			const result = generatePlRatioChartData([], 'day', 3, null)
			expect(result.labels.length).toBe(0)
		})
	})

	describe('generateWinrateChartData', () => {
		it('should return chart data structure', () => {
			const result = generateWinrateChartData(mockTrades as any, 'day', 3, true, null)
			expect(result).toHaveProperty('labels')
			expect(result).toHaveProperty('datasets')
		})

		it('should return empty data for no trades', () => {
			const result = generateWinrateChartData([], 'day', 3, true, null)
			expect(result.labels.length).toBe(0)
		})
	})
})
