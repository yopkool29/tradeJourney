import { describe, it, expect } from 'vitest'
import {
	calculateMetricsByDimension,
	calculateMetricsBy2Dimensions,
} from '~/composables/analytics/useAnalytics'
import {
	groupByTicker,
	groupByTag,
	groupBySide,
	groupByMonthOpen,
	groupByMonthClose,
	groupByDayOfWeekOpen,
	groupByDayOfWeekClose,
	groupByHourStart,
	groupByHourEnd,
} from '~/composables/analytics/useBreakdownGrouping'
import {
	createEmptyMetrics,
	getMetricValueForMetric,
	formatMetricValueForMetric,
	getMetricColor,
	sortMetricsByDimension,
	injectEmptyTagMetrics,
} from '~/composables/analytics/breakdownMetrics'
import type { TradeExtendedType } from '~/schema/trade'

// Trades de test avec symboles, tags et types variés
// Net PnL: 100, -50, 200, -30, 150 → total = 370
const mockTrades: TradeExtendedType[] = [
	{
		id: 1, type: 'buy', symbol: 'AAPL',
		openDate: new Date('2024-01-01T10:00:00Z'), closeDate: new Date('2024-01-01T11:00:00Z'),
		profit: 105, netProfit: 100, lot: 1, commission: 5,
		mae: -10, mfe: 20, tags: [{ id: 1, name: 'breakout', dark_fg_reverse: false }],
		account_displayName: '', uniqueId: '1',
	} as unknown as TradeExtendedType,
	{
		id: 2, type: 'sell', symbol: 'AAPL',
		openDate: new Date('2024-01-02T10:00:00Z'), closeDate: new Date('2024-01-02T10:30:00Z'),
		profit: -45, netProfit: -50, lot: 1, commission: 5,
		mae: -25, mfe: 5, tags: [{ id: 2, name: 'fomo', dark_fg_reverse: false }],
		account_displayName: '', uniqueId: '2',
	} as unknown as TradeExtendedType,
	{
		id: 3, type: 'buy', symbol: 'MSFT',
		openDate: new Date('2024-01-03T10:00:00Z'), closeDate: new Date('2024-01-03T12:00:00Z'),
		profit: 210, netProfit: 200, lot: 2, commission: 10,
		mae: -5, mfe: 50, tags: [{ id: 1, name: 'breakout', dark_fg_reverse: false }, { id: 3, name: 'A+', dark_fg_reverse: false }],
		account_displayName: '', uniqueId: '3',
	} as unknown as TradeExtendedType,
	{
		id: 4, type: 'sell', symbol: 'TSLA',
		openDate: new Date('2024-01-04T10:00:00Z'), closeDate: new Date('2024-01-04T11:00:00Z'),
		profit: -25, netProfit: -30, lot: 1, commission: 5,
		mae: -15, mfe: 8, tags: [],
		account_displayName: '', uniqueId: '4',
	} as unknown as TradeExtendedType,
	{
		id: 5, type: 'buy', symbol: 'MSFT',
		openDate: new Date('2024-01-05T10:00:00Z'), closeDate: new Date('2024-01-05T11:00:00Z'),
		profit: 160, netProfit: 150, lot: 1, commission: 10,
		mae: -8, mfe: 30, tags: [{ id: 3, name: 'A+', dark_fg_reverse: false }],
		account_displayName: '', uniqueId: '5',
	} as unknown as TradeExtendedType,
]

describe('useAnalytics — calculateMetricsByDimension', () => {
	describe('groupByTicker', () => {
		it('should group trades by symbol', () => {
			const metrics = calculateMetricsByDimension(mockTrades, groupByTicker)
			const symbols = metrics.map(m => m.key)
			expect(symbols).toContain('AAPL')
			expect(symbols).toContain('MSFT')
			expect(symbols).toContain('TSLA')
		})

		it('should calculate correct PnL per ticker', () => {
			const metrics = calculateMetricsByDimension(mockTrades, groupByTicker)
			const aapl = metrics.find(m => m.key === 'AAPL')!
			// AAPL: 100 + (-50) = 50
			expect(aapl.pnl).toBe(50)
			expect(aapl.tradesCount).toBe(2)
		})

		it('should sort by PnL descending', () => {
			const metrics = calculateMetricsByDimension(mockTrades, groupByTicker)
			expect(metrics[0].pnl).toBeGreaterThanOrEqual(metrics[metrics.length - 1].pnl)
		})
	})

	describe('groupByTag', () => {
		it('should group trades by tag with overlap (multi-tag trades count in each)', () => {
			const metrics = calculateMetricsByDimension(mockTrades, groupByTag)
			const breakout = metrics.find(m => m.key === 'breakout')
			// Trade 1 (breakout) + Trade 3 (breakout + A+)
			expect(breakout).toBeDefined()
			expect(breakout!.tradesCount).toBe(2)
		})

		it('should put trades without tags in "untagged"', () => {
			const metrics = calculateMetricsByDimension(mockTrades, groupByTag)
			const untagged = metrics.find(m => m.key === 'untagged')
			// Trade 4 has no tags
			expect(untagged).toBeDefined()
			expect(untagged!.tradesCount).toBe(1)
		})

		it('should count A+ tag trades correctly', () => {
			const metrics = calculateMetricsByDimension(mockTrades, groupByTag)
			const aPlus = metrics.find(m => m.key === 'A+')
			// Trade 3 (A+) + Trade 5 (A+)
			expect(aPlus).toBeDefined()
			expect(aPlus!.tradesCount).toBe(2)
		})
	})

	describe('groupBySide', () => {
		it('should group trades into Long and Short', () => {
			const metrics = calculateMetricsByDimension(mockTrades, groupBySide)
			const keys = metrics.map(m => m.key)
			expect(keys).toContain('Long')
			expect(keys).toContain('Short')
		})

		it('should count Long trades correctly (buy)', () => {
			const metrics = calculateMetricsByDimension(mockTrades, groupBySide)
			const long = metrics.find(m => m.key === 'Long')!
			// Trades 1, 3, 5 are buy
			expect(long.tradesCount).toBe(3)
		})

		it('should count Short trades correctly (sell)', () => {
			const metrics = calculateMetricsByDimension(mockTrades, groupBySide)
			const short = metrics.find(m => m.key === 'Short')!
			// Trades 2, 4 are sell
			expect(short.tradesCount).toBe(2)
		})
	})

	describe('edge cases', () => {
		it('should return empty array for empty trades', () => {
			expect(calculateMetricsByDimension([], groupByTicker)).toEqual([])
		})

		it('should calculate winrate correctly', () => {
			const metrics = calculateMetricsByDimension(mockTrades, groupByTicker)
			const msft = metrics.find(m => m.key === 'MSFT')!
			// MSFT: 2 trades, both winning (200, 150) → 100% winrate
			expect(msft.winrate).toBe(100)
			expect(msft.winningTradesCount).toBe(2)
			expect(msft.losingTradesCount).toBe(0)
		})

		it('should calculate profitFactor correctly', () => {
			const metrics = calculateMetricsByDimension(mockTrades, groupByTicker)
			const aapl = metrics.find(m => m.key === 'AAPL')!
			// AAPL: win=100, loss=50 → PF = 100/50 = 2
			expect(aapl.profitFactor).toBe(2)
		})

		it('should return Infinity profitFactor when no losses', () => {
			const metrics = calculateMetricsByDimension(mockTrades, groupByTicker)
			const msft = metrics.find(m => m.key === 'MSFT')!
			// MSFT: no losses → PF = Infinity
			expect(msft.profitFactor).toBe(Infinity)
		})

		it('should calculate avgMfe and avgMae', () => {
			const metrics = calculateMetricsByDimension(mockTrades, groupByTicker)
			const aapl = metrics.find(m => m.key === 'AAPL')!
			// AAPL: mfe = [20, 5] → avg = 12.5 ; mae = [-10, -25] → avg = -17.5
			expect(aapl.avgMfe).toBe(12.5)
			expect(aapl.avgMae).toBe(-17.5)
		})
	})

	describe('getMetricValueForMetric', () => {
		it('should return pnl for pnl metric', () => {
			const m = calculateMetricsByDimension(mockTrades, groupByTicker).find(m => m.key === 'AAPL')!
			expect(getMetricValueForMetric(m, 'pnl')).toBe(50)
		})

		it('should return winrate for winrate metric', () => {
			const m = calculateMetricsByDimension(mockTrades, groupByTicker).find(m => m.key === 'MSFT')!
			expect(getMetricValueForMetric(m, 'winrate')).toBe(100)
		})

		it('should return Number.MAX_SAFE_INTEGER for Infinity profitFactor', () => {
			const m = calculateMetricsByDimension(mockTrades, groupByTicker).find(m => m.key === 'MSFT')!
			expect(getMetricValueForMetric(m, 'profitFactor')).toBe(Number.MAX_SAFE_INTEGER)
		})

		it('should return negated avgLoss', () => {
			const m = calculateMetricsByDimension(mockTrades, groupByTicker).find(m => m.key === 'AAPL')!
			// AAPL: avgLoss = 50 (positive in storage), returned as -50
			expect(getMetricValueForMetric(m, 'avgLoss')).toBe(-50)
		})

		it('should calculate appt as pnl/tradesCount', () => {
			const m = calculateMetricsByDimension(mockTrades, groupByTicker).find(m => m.key === 'AAPL')!
			// AAPL: pnl=50, trades=2 → appt=25
			expect(getMetricValueForMetric(m, 'appt')).toBe(25)
		})

		it('should return NaN appt for 0 trades', () => {
			const empty = createEmptyMetrics('test')
			expect(getMetricValueForMetric(empty, 'appt')).toBeNaN()
		})

		it('should return tradesCount', () => {
			const m = calculateMetricsByDimension(mockTrades, groupByTicker).find(m => m.key === 'AAPL')!
			expect(getMetricValueForMetric(m, 'tradesCount')).toBe(2)
		})

		it('should return avgDuration', () => {
			const m = calculateMetricsByDimension(mockTrades, groupByTicker).find(m => m.key === 'AAPL')!
			// AAPL: trade 1 = 60min, trade 2 = 30min → avg = 45
			expect(getMetricValueForMetric(m, 'avgDuration')).toBe(45)
		})
	})

	describe('formatMetricValueForMetric', () => {
		it('should format monetary metrics as currency', () => {
			expect(formatMetricValueForMetric(100, 'pnl')).toContain('100')
			expect(formatMetricValueForMetric(50.5, 'avgWin')).toContain('50')
		})

		it('should return empty string for near-zero monetary values', () => {
			expect(formatMetricValueForMetric(0.001, 'pnl')).toBe('')
			expect(formatMetricValueForMetric(0.004, 'avgWin')).toBe('')
		})

		it('should format winrate as percentage', () => {
			const result = formatMetricValueForMetric(58.33, 'winrate')
			expect(result).toBe('58.3%')
		})

		it('should format profitFactor with infinity symbol', () => {
			expect(formatMetricValueForMetric(999, 'profitFactor')).toBe('∞')
			expect(formatMetricValueForMetric(2.5, 'profitFactor')).toBe('2.50')
		})

		it('should format tradesCount as integer', () => {
			expect(formatMetricValueForMetric(3, 'tradesCount')).toBe('3')
			expect(formatMetricValueForMetric(3.7, 'tradesCount')).toBe('4')
		})

		it('should format avgDuration as duration', () => {
			const result = formatMetricValueForMetric(90, 'avgDuration')
			expect(result).toContain('1h')
			expect(result).toContain('30')
		})
	})

	describe('getMetricColor', () => {
		const colors = { profit: '#22c55e', loss: '#ef4444', bar: '#fbbf24', rawMetric: '#3b82f6' }
		const metrics = calculateMetricsByDimension(mockTrades, groupByTicker)
		const aapl = metrics.find(m => m.key === 'AAPL')! // pnl=50 (positive)
		const tsla = metrics.find(m => m.key === 'TSLA')! // pnl=-30 (negative)

		it('should return profit color for positive monetary metric', () => {
			expect(getMetricColor(aapl, 'pnl', colors)).toBe('#22c55e')
		})

		it('should return loss color for negative monetary metric', () => {
			expect(getMetricColor(tsla, 'pnl', colors)).toBe('#ef4444')
		})

		it('should return bar color for winrate', () => {
			expect(getMetricColor(aapl, 'winrate', colors)).toBe('#fbbf24')
		})

		it('should return rawMetric color for avgDuration', () => {
			expect(getMetricColor(aapl, 'avgDuration', colors)).toBe('#3b82f6')
		})

		it('should return rawMetric color for tradesCount', () => {
			expect(getMetricColor(aapl, 'tradesCount', colors)).toBe('#3b82f6')
		})

		it('should use default colors when not provided', () => {
			expect(getMetricColor(aapl, 'winrate')).toBe('#fbbf24')
			expect(getMetricColor(aapl, 'avgDuration')).toBe('#3b82f6')
		})
	})

	describe('sortMetricsByDimension', () => {
		const metrics = calculateMetricsByDimension(mockTrades, groupByDayOfWeekOpen())

		it('should sort dayOfWeek chronologically', () => {
			const sorted = sortMetricsByDimension(metrics, 'dayOfWeekOpen', 'pnl')
			// Keys should be in ascending numeric order (1=Monday, 2=Tuesday, ...)
			const keys = sorted.map(m => parseInt(m.key, 10))
			for (let i = 1; i < keys.length; i++) {
				expect(keys[i]).toBeGreaterThanOrEqual(keys[i - 1])
			}
		})

		it('should sort month chronologically', () => {
			const monthMetrics = calculateMetricsByDimension(mockTrades, groupByMonthOpen())
			const sorted = sortMetricsByDimension(monthMetrics, 'monthOpen', 'pnl')
			const keys = sorted.map(m => parseInt(m.key, 10))
			for (let i = 1; i < keys.length; i++) {
				expect(keys[i]).toBeGreaterThanOrEqual(keys[i - 1])
			}
		})

		it('should sort ticker by metric value descending', () => {
			const tickerMetrics = calculateMetricsByDimension(mockTrades, groupByTicker)
			const sorted = sortMetricsByDimension(tickerMetrics, 'ticker', 'pnl')
			// First should have highest pnl
			expect(sorted[0].pnl).toBeGreaterThanOrEqual(sorted[sorted.length - 1].pnl)
		})
	})

	describe('calculateMetricsBy2Dimensions (heatmap)', () => {
		it('should group trades by 2 dimensions', () => {
			const cells = calculateMetricsBy2Dimensions(mockTrades, groupByTicker, groupBySide)
			expect(cells.length).toBeGreaterThan(0)
			// AAPL has buy and sell → 2 cells
			const aaplCells = cells.filter(c => c.keyX === 'AAPL')
			expect(aaplCells.length).toBe(2)
		})

		it('should calculate correct PnL per cell', () => {
			const cells = calculateMetricsBy2Dimensions(mockTrades, groupByTicker, groupBySide)
			const aaplLong = cells.find(c => c.keyX === 'AAPL' && c.keyY === 'Long')
			// AAPL Long: trade 1 (netProfit=100)
			expect(aaplLong).toBeDefined()
			expect(aaplLong!.metrics.pnl).toBe(100)
			expect(aaplLong!.metrics.tradesCount).toBe(1)
		})

		it('should return empty array for empty trades', () => {
			expect(calculateMetricsBy2Dimensions([], groupByTicker, groupBySide)).toEqual([])
		})

		it('should calculate winrate per cell', () => {
			const cells = calculateMetricsBy2Dimensions(mockTrades, groupByTicker, groupBySide)
			const aaplShort = cells.find(c => c.keyX === 'AAPL' && c.keyY === 'Short')
			// AAPL Short: trade 2 (netProfit=-50) → 0% winrate
			expect(aaplShort!.metrics.winrate).toBe(0)
			expect(aaplShort!.metrics.losingTradesCount).toBe(1)
		})
	})

	describe('groupBy open/close dimensions', () => {
		it('should group by month open', () => {
			const metrics = calculateMetricsByDimension(mockTrades, groupByMonthOpen())
			// All trades in January 2024 → 1 group
			expect(metrics.length).toBe(1)
			expect(metrics[0].tradesCount).toBe(5)
		})

		it('should group by month close', () => {
			const metrics = calculateMetricsByDimension(mockTrades, groupByMonthClose())
			expect(metrics.length).toBe(1)
			expect(metrics[0].tradesCount).toBe(5)
		})

		it('should group by day of week open', () => {
			const metrics = calculateMetricsByDimension(mockTrades, groupByDayOfWeekOpen())
			// Trades opened on Mon(1), Tue(2), Wed(3), Thu(4), Fri(5)
			expect(metrics.length).toBe(5)
		})

		it('should group by day of week close', () => {
			const metrics = calculateMetricsByDimension(mockTrades, groupByDayOfWeekClose())
			expect(metrics.length).toBe(5)
		})

		it('should group by hour start', () => {
			const metrics = calculateMetricsByDimension(mockTrades, groupByHourStart())
			// All trades open at 10:00 UTC
			expect(metrics.length).toBe(1)
		})

		it('should group by hour end', () => {
			const metrics = calculateMetricsByDimension(mockTrades, groupByHourEnd())
			// Trades close at different hours
			expect(metrics.length).toBeGreaterThan(1)
		})
	})

	describe('injectEmptyTagMetrics', () => {
		it('should not modify metrics for non-tag-group dimension', () => {
			const metrics = calculateMetricsByDimension(mockTrades, groupByTicker)
			const result = injectEmptyTagMetrics(metrics, 'ticker', [])
			expect(result).toBe(metrics)
		})

		it('should inject empty metrics for missing tags', () => {
			const tagGroups = [
				{ id: 1, name: 'strategy', tags: [{ name: 'breakout' }, { name: 'reversal' }, { name: 'fomo' }] },
			]
			const metrics = calculateMetricsByDimension(mockTrades, groupByTag)
			const result = injectEmptyTagMetrics(metrics, 'tagGroup_strategy', tagGroups)
			// 'reversal' tag has no trades → should be injected
			const reversal = result.find(m => m.key === 'reversal')
			expect(reversal).toBeDefined()
			expect(reversal!.tradesCount).toBe(0)
		})
	})

	describe('createEmptyMetrics', () => {
		it('should create metrics with zero values', () => {
			const empty = createEmptyMetrics('test')
			expect(empty.key).toBe('test')
			expect(empty.pnl).toBe(0)
			expect(empty.tradesCount).toBe(0)
			expect(empty.winrate).toBe(0)
			expect(empty.avgWin).toBe(0)
			expect(empty.avgLoss).toBe(0)
			expect(empty.profitFactor).toBe(0)
			expect(empty.winningTradesCount).toBe(0)
			expect(empty.losingTradesCount).toBe(0)
		})
	})
})
