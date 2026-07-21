import { describe, it, expect } from 'vitest'
import { calculateMetricsByDimension, groupByTicker, groupByTag, groupBySide } from '~/composables/useAnalytics'
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
})
