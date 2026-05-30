import { describe, it, expect } from 'vitest'
import {
	getPNL,
	getAPPT,
	getWinrate,
	getPLRatio,
	getProfitFactor,
	getRecoveryFactor,
	getSharpeRatio,
	getAvgTradeDuration,
	getMaxTradeDuration,
	getExpectancy,
	getStdDev,
	getTotalContracts,
	getWinningTradesMetrics,
	getLosingTradesMetrics,
	getBreakevenTradesMetrics,
	getMaxWinningStreak,
	getMaxLosingStreak,
	getMaxDrawdownWithDates,
	getMaxRunUpWithDates,
	movingAverage
} from '~/utils/tradeStats'

const mockTrades = [
	{ openDate: '2024-01-01T10:00:00Z', closeDate: '2024-01-01T11:00:00Z', profit: 100, netProfit: 95, lot: 1, commission: 5 },
	{ openDate: '2024-01-02T10:00:00Z', closeDate: '2024-01-02T10:30:00Z', profit: 50, netProfit: 45, lot: 1, commission: 5 },
	{ openDate: '2024-01-03T10:00:00Z', closeDate: '2024-01-03T12:00:00Z', profit: -80, netProfit: -85, lot: 2, commission: 5 },
	{ openDate: '2024-01-04T10:00:00Z', closeDate: '2024-01-04T11:00:00Z', profit: 200, netProfit: 190, lot: 1, commission: 10 },
	{ openDate: '2024-01-05T10:00:00Z', closeDate: '2024-01-05T10:15:00Z', profit: -30, netProfit: -35, lot: 1, commission: 5 }
]

describe('tradeStats', () => {
	describe('getPNL', () => {
		it('should calculate total net PnL', () => {
			expect(getPNL(mockTrades, 2, true)).toBe(210)
		})

		it('should calculate total gross PnL', () => {
			expect(getPNL(mockTrades, 2, false)).toBe(240)
		})

		it('should return raw value when round is -1', () => {
			expect(getPNL(mockTrades, -1, true)).toBe(210)
		})

		it('should return 0 for empty trades', () => {
			expect(getPNL([], 2, true)).toBe(0)
		})
	})

	describe('getAPPT', () => {
		it('should calculate average profit per trade (net)', () => {
			expect(getAPPT(mockTrades, true, 2, true)).toBe(42)
		})

		it('should calculate average profit per trade (gross)', () => {
			expect(getAPPT(mockTrades, true, 2, false)).toBe(48)
		})

		it('should return 0 for empty trades with fixNanToZero', () => {
			expect(getAPPT([], true, 2, true)).toBe(0)
		})
	})

	describe('getWinrate', () => {
		it('should calculate winrate percentage', () => {
			expect(getWinrate(mockTrades, 2, true)).toBe(60)
		})

		it('should return 0 for empty trades', () => {
			expect(getWinrate([], 2, true)).toBe(0)
		})
	})

	describe('getPLRatio', () => {
		it('should calculate profit/loss ratio (net)', () => {
			const result = getPLRatio(mockTrades, 2, true)
			expect(result).toBeGreaterThan(0)
		})

		it('should handle all winning trades', () => {
			const winners = mockTrades.filter(t => t.netProfit > 0)
			expect(getPLRatio(winners, 2, true)).toBe(0)
		})
	})

	describe('getProfitFactor', () => {
		it('should calculate profit factor (net)', () => {
			const result = getProfitFactor(mockTrades, 2, true)
			expect(result).toBeGreaterThan(0)
		})

		it('should handle no losses', () => {
			const winners = mockTrades.filter(t => t.netProfit > 0)
			expect(getProfitFactor(winners, -1, true)).toBe(Infinity)
		})

		it('should return 0 for empty trades', () => {
			expect(getProfitFactor([], 2, true)).toBe(0)
		})
	})

	describe('getRecoveryFactor', () => {
		it('should calculate recovery factor', () => {
			const result = getRecoveryFactor(mockTrades, 2, true)
			expect(typeof result).toBe('number')
		})

		it('should return 0 for empty trades', () => {
			expect(getRecoveryFactor([], 2, true)).toBe(0)
		})
	})

	describe('getSharpeRatio', () => {
		it('should calculate Sharpe ratio', () => {
			const result = getSharpeRatio(mockTrades, 0, 2, true)
			expect(typeof result).toBe('number')
		})

		it('should return 0 for less than 2 trades', () => {
			expect(getSharpeRatio([mockTrades[0]], 0, 2, true)).toBe(0)
		})
	})

	describe('getAvgTradeDuration', () => {
		it('should calculate average duration in minutes', () => {
			const result = getAvgTradeDuration(mockTrades, 2)
			expect(result).toBeGreaterThan(0)
		})

		it('should return 0 for empty trades', () => {
			expect(getAvgTradeDuration([], 2)).toBe(0)
		})
	})

	describe('getMaxTradeDuration', () => {
		it('should calculate max duration in minutes', () => {
			const result = getMaxTradeDuration(mockTrades, 2)
			expect(result).toBe(120)
		})
	})

	describe('getExpectancy', () => {
		it('should calculate expectancy', () => {
			const result = getExpectancy(mockTrades, 2, true)
			expect(typeof result).toBe('number')
		})

		it('should return 0 for empty trades', () => {
			expect(getExpectancy([], 2, true)).toBe(0)
		})
	})

	describe('getStdDev', () => {
		it('should calculate standard deviation', () => {
			const result = getStdDev([1, 2, 3, 4, 5], 2)
			expect(result).toBeGreaterThan(0)
		})

		it('should return 0 for empty array', () => {
			expect(getStdDev([], 2)).toBe(0)
		})
	})

	describe('getTotalContracts', () => {
		it('should sum lots', () => {
			expect(getTotalContracts(mockTrades)).toBe(6)
		})
	})

	describe('getWinningTradesMetrics', () => {
		it('should return metrics for winning trades', () => {
			const result = getWinningTradesMetrics(mockTrades, true)
			expect(result.count).toBe(3)
			expect(result.totalProfit).toBe(330)
			expect(result.totalContracts).toBe(3)
			expect(result.largest).toBe(190)
		})

		it('should return zeros when no winners', () => {
			const losers = mockTrades.filter(t => t.netProfit < 0)
			const result = getWinningTradesMetrics(losers, true)
			expect(result.count).toBe(0)
			expect(result.totalProfit).toBe(0)
		})
	})

	describe('getLosingTradesMetrics', () => {
		it('should return metrics for losing trades', () => {
			const result = getLosingTradesMetrics(mockTrades, true)
			expect(result.count).toBe(2)
			expect(result.totalLoss).toBe(-120)
			expect(result.totalContracts).toBe(3)
		})

		it('should return zeros when no losers', () => {
			const winners = mockTrades.filter(t => t.netProfit > 0)
			const result = getLosingTradesMetrics(winners, true)
			expect(result.count).toBe(0)
			expect(result.totalLoss).toBe(0)
		})
	})

	describe('getBreakevenTradesMetrics', () => {
		it('should return metrics for breakeven trades', () => {
			const breakevens = [
				...mockTrades,
				{ profit: 0, netProfit: 0, lot: 1 }
			]
			const result = getBreakevenTradesMetrics(breakevens, true)
			expect(result.count).toBe(1)
			expect(result.totalContracts).toBe(1)
		})
	})

	describe('getMaxWinningStreak', () => {
		it('should calculate max winning streak', () => {
			expect(getMaxWinningStreak(mockTrades, true)).toBe(2)
		})

		it('should return 0 for empty trades', () => {
			expect(getMaxWinningStreak([], true)).toBe(0)
		})
	})

	describe('getMaxLosingStreak', () => {
		it('should calculate max losing streak', () => {
			expect(getMaxLosingStreak(mockTrades, true)).toBe(1)
		})

		it('should return 0 for empty trades', () => {
			expect(getMaxLosingStreak([], true)).toBe(0)
		})
	})

	describe('getMaxDrawdownWithDates', () => {
		it('should calculate max drawdown with dates', () => {
			const result = getMaxDrawdownWithDates(mockTrades, true)
			expect(result.maxDrawdown).toBeGreaterThanOrEqual(0)
			expect(result.dateFrom).toBeInstanceOf(Date)
			expect(result.dateTo).toBeInstanceOf(Date)
		})

		it('should return zeros for empty trades', () => {
			const result = getMaxDrawdownWithDates([], true)
			expect(result.maxDrawdown).toBe(0)
			expect(result.dateFrom).toBeNull()
			expect(result.dateTo).toBeNull()
		})
	})

	describe('getMaxRunUpWithDates', () => {
		it('should calculate max run-up with dates', () => {
			const result = getMaxRunUpWithDates(mockTrades, true)
			expect(result.maxRunUp).toBeGreaterThanOrEqual(0)
			expect(result.dateFrom).toBeInstanceOf(Date)
			expect(result.dateTo).toBeInstanceOf(Date)
		})

		it('should return zeros for empty trades', () => {
			const result = getMaxRunUpWithDates([], true)
			expect(result.maxRunUp).toBe(0)
			expect(result.dateFrom).toBeNull()
			expect(result.dateTo).toBeNull()
		})
	})

	describe('movingAverage', () => {
		it('should calculate moving average', () => {
			const data = [1, 2, 3, 4, 5]
			const result = movingAverage(data, 3)
			expect(result).toEqual([1, 1.5, 2, 3, 4])
		})

		it('should return original data if window <= 1', () => {
			const data = [1, 2, 3]
			expect(movingAverage(data, 1)).toEqual([1, 2, 3])
		})
	})
})
