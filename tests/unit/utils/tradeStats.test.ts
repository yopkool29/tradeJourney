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
	movingAverage,
	getSortinoRatio,
	getCalmarRatio,
	getSQN,
	getUlcerIndex
} from '~/utils/tradeStats'

// 12 trades avec des cas couvrant : streaks multiples, drawdown profond, breakeven
// Net PnL: 95+45-85+190-35+120+80+60-150-40+200-25 = 455
// Gross PnL: 100+50-80+200-30+125+85+65-145-35+210-20 = 525
// Cumulatifs net: 95,140,55,245,210,330,410,470,320,280,480,455
// Max win streak: 3 (trades 6-7-8: +120,+80,+60)
// Max loss streak: 2 (trades 9-10: -150,-40)
// Max drawdown: peak=470, trough=280, dd=190
const mockTrades = [
	{ openDate: '2024-01-01T10:00:00Z', closeDate: '2024-01-01T11:00:00Z', profit: 100, netProfit: 95, lot: 1, commission: 5 },
	{ openDate: '2024-01-02T10:00:00Z', closeDate: '2024-01-02T10:30:00Z', profit: 50, netProfit: 45, lot: 1, commission: 5 },
	{ openDate: '2024-01-03T10:00:00Z', closeDate: '2024-01-03T12:00:00Z', profit: -80, netProfit: -85, lot: 2, commission: 5 },
	{ openDate: '2024-01-04T10:00:00Z', closeDate: '2024-01-04T11:00:00Z', profit: 200, netProfit: 190, lot: 1, commission: 10 },
	{ openDate: '2024-01-05T10:00:00Z', closeDate: '2024-01-05T10:15:00Z', profit: -30, netProfit: -35, lot: 1, commission: 5 },
	{ openDate: '2024-01-06T10:00:00Z', closeDate: '2024-01-06T11:00:00Z', profit: 125, netProfit: 120, lot: 2, commission: 5 },
	{ openDate: '2024-01-07T10:00:00Z', closeDate: '2024-01-07T10:45:00Z', profit: 85, netProfit: 80, lot: 1, commission: 5 },
	{ openDate: '2024-01-08T10:00:00Z', closeDate: '2024-01-08T11:30:00Z', profit: 65, netProfit: 60, lot: 1, commission: 5 },
	{ openDate: '2024-01-09T10:00:00Z', closeDate: '2024-01-09T12:00:00Z', profit: -145, netProfit: -150, lot: 3, commission: 5 },
	{ openDate: '2024-01-10T10:00:00Z', closeDate: '2024-01-10T10:30:00Z', profit: -35, netProfit: -40, lot: 1, commission: 5 },
	{ openDate: '2024-01-11T10:00:00Z', closeDate: '2024-01-11T11:00:00Z', profit: 210, netProfit: 200, lot: 2, commission: 10 },
	{ openDate: '2024-01-12T10:00:00Z', closeDate: '2024-01-12T10:45:00Z', profit: -20, netProfit: -25, lot: 1, commission: 5 },
]

describe('tradeStats', () => {
	describe('getPNL', () => {
		it('should calculate total net PnL', () => {
			// 95+45-85+190-35+120+80+60-150-40+200-25 = 455
			expect(getPNL(mockTrades, 2, true)).toBe(455)
		})

		it('should calculate total gross PnL', () => {
			// 100+50-80+200-30+125+85+65-145-35+210-20 = 525
			expect(getPNL(mockTrades, 2, false)).toBe(525)
		})

		it('should return raw value when round is -1', () => {
			expect(getPNL(mockTrades, -1, true)).toBe(455)
		})

		it('should return 0 for empty trades', () => {
			expect(getPNL([], 2, true)).toBe(0)
		})
	})

	describe('getAPPT', () => {
		it('should calculate average profit per trade (net)', () => {
			// 455 / 12 ≈ 37.92
			expect(getAPPT(mockTrades, true, 2, true)).toBe(37.92)
		})

		it('should calculate average profit per trade (gross)', () => {
			// 525 / 12 = 43.75
			expect(getAPPT(mockTrades, true, 2, false)).toBe(43.75)
		})

		it('should return 0 for empty trades with fixNanToZero', () => {
			expect(getAPPT([], true, 2, true)).toBe(0)
		})
	})

	describe('getWinrate', () => {
		it('should calculate winrate percentage', () => {
			// 7 winners sur 12 trades = 58.33%
			expect(getWinrate(mockTrades, 2, true)).toBe(58.33)
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
			// Gains: 95+45+190+120+80+60+200=790, Pertes: 85+35+150+40+25=335 → PF = 790/335 ≈ 2.36
			expect(getProfitFactor(mockTrades, 2, true)).toBe(2.36)
		})

		it('should calculate profit factor (gross)', () => {
			// Gains: 100+50+200+125+85+65+210=835, Pertes: 80+30+145+35+20=310 → PF = 835/310 ≈ 2.69
			expect(getProfitFactor(mockTrades, 2, false)).toBe(2.69)
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
		it('should calculate recovery factor as PnL / maxDrawdown', () => {
			// PnL net = 210, maxDrawdown = 85 (après 190 le trade -35) → RF = 210/85 ≈ 2.47
			const result = getRecoveryFactor(mockTrades, 2, true)
			expect(result).toBeGreaterThan(0)
		})

		it('should return 0 for empty trades', () => {
			expect(getRecoveryFactor([], 2, true)).toBe(0)
		})

		it('should return 0 when PnL is 0', () => {
			const zeroPnl = [
				{ profit: 100, netProfit: 100, lot: 1, openDate: '2024-01-01T10:00:00Z', closeDate: '2024-01-01T11:00:00Z', commission: 0 },
				{ profit: -100, netProfit: -100, lot: 1, openDate: '2024-01-02T10:00:00Z', closeDate: '2024-01-02T11:00:00Z', commission: 0 },
			]
			expect(getRecoveryFactor(zeroPnl, 2, true)).toBe(0)
		})
	})

	describe('getSharpeRatio', () => {
		it('should calculate Sharpe ratio as mean/stdDev', () => {
			// returns: [95, 45, -85, 190, -35], mean=42, stdDev calculée sur population
			const result = getSharpeRatio(mockTrades, 0, 4, true)
			expect(result).toBeGreaterThan(0)
		})

		it('should return lower ratio with risk-free rate', () => {
			const withoutRf = getSharpeRatio(mockTrades, 0, -1, true)
			const withRf = getSharpeRatio(mockTrades, 10, -1, true)
			expect(withRf).toBeLessThan(withoutRf)
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
			// lots: 1+1+2+1+1+2+1+1+3+1+2+1 = 17
			expect(getTotalContracts(mockTrades)).toBe(17)
		})
	})

	describe('getWinningTradesMetrics', () => {
		it('should return metrics for winning trades', () => {
			// 7 winners: 95+45+190+120+80+60+200 = 790 (net), largest=200
			const result = getWinningTradesMetrics(mockTrades, true)
			expect(result.count).toBe(7)
			expect(result.totalProfit).toBe(790)
			expect(result.largest).toBe(200)
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
			// 5 losers: -85-35-150-40-25 = -335 (net), lots: 2+1+3+1+1=8
			const result = getLosingTradesMetrics(mockTrades, true)
			expect(result.count).toBe(5)
			expect(result.totalLoss).toBe(-335)
			expect(result.totalContracts).toBe(8)
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
			// sequence: +95,+45,-85,+190,-35,+120,+80,+60,-150,-40,+200,-25 → max win streak = 3
			expect(getMaxWinningStreak(mockTrades, true)).toBe(3)
		})

		it('should detect streak of 3', () => {
			const trades = [
				{ profit: 10, netProfit: 10 },
				{ profit: 20, netProfit: 20 },
				{ profit: 30, netProfit: 30 },
				{ profit: -5, netProfit: -5 },
			]
			expect(getMaxWinningStreak(trades, true)).toBe(3)
		})

		it('should return 0 for empty trades', () => {
			expect(getMaxWinningStreak([], true)).toBe(0)
		})
	})

	describe('getMaxLosingStreak', () => {
		it('should calculate max losing streak', () => {
			// sequence: +95,+45,-85,+190,-35,+120,+80,+60,-150,-40,+200,-25 → max losing streak = 2
			expect(getMaxLosingStreak(mockTrades, true)).toBe(2)
		})

		it('should detect streak of 2 consecutive losses', () => {
			const trades = [
				{ profit: 10, netProfit: 10 },
				{ profit: -5, netProfit: -5 },
				{ profit: -10, netProfit: -10 },
				{ profit: 20, netProfit: 20 },
			]
			expect(getMaxLosingStreak(trades, true)).toBe(2)
		})

		it('should return 0 for empty trades', () => {
			expect(getMaxLosingStreak([], true)).toBe(0)
		})
	})

	describe('getMaxDrawdownWithDates', () => {
		it('should calculate max drawdown with dates', () => {
			// cumulative: 95,140,55,245,210,330,410,470,320,280,480,455 → peak=470, trough=280, dd=190
			const result = getMaxDrawdownWithDates(mockTrades, true)
			expect(result.maxDrawdown).toBe(190)
			expect(result.dateFrom).toBeInstanceOf(Date)
			expect(result.dateTo).toBeInstanceOf(Date)
		})

		it('should detect larger drawdown in known sequence', () => {
			const trades = [
				{ profit: 100, netProfit: 100, closeDate: '2024-01-01T11:00:00Z' },
				{ profit: -60, netProfit: -60, closeDate: '2024-01-02T11:00:00Z' },
				{ profit: -20, netProfit: -20, closeDate: '2024-01-03T11:00:00Z' },
				{ profit: 50, netProfit: 50, closeDate: '2024-01-04T11:00:00Z' },
			]
			// cumulative: 100, 40, 20, 70 → peak=100, trough=20, dd=80
			const result = getMaxDrawdownWithDates(trades, true)
			expect(result.maxDrawdown).toBe(80)
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

	describe('getSortinoRatio', () => {
		it('should return 0 for less than 2 trades', () => {
			expect(getSortinoRatio([mockTrades[0]])).toBe(0)
		})

		it('should return 0 when all trades are positive (no downside)', () => {
			const allWinners = mockTrades.filter(t => t.netProfit > 0)
			expect(getSortinoRatio(allWinners, 0, 2)).toBe(0)
		})

		it('should calculate a positive Sortino for profitable trades with losses', () => {
			const result = getSortinoRatio(mockTrades, 0, 2)
			expect(result).toBeGreaterThan(0)
		})

		it('should be >= Sharpe when there are positive outliers (gains not penalized)', () => {
			const sharpe = getSharpeRatio(mockTrades, 0, 2)
			const sortino = getSortinoRatio(mockTrades, 0, 2)
			// Sortino penalise uniquement la downside → devrait être >= Sharpe
			expect(sortino).toBeGreaterThanOrEqual(sharpe)
		})
	})

	describe('getSQN', () => {
		it('should return 0 for less than 30 trades', () => {
			const rMultiples = [1, -1, 2, -1, 0.5]
			expect(getSQN(rMultiples)).toBe(0)
		})

		it('should return 0 when all R are identical (stdDev=0)', () => {
			const rMultiples = Array(50).fill(1)
			expect(getSQN(rMultiples)).toBe(0)
		})

		it('should calculate a positive SQN for a profitable system', () => {
			// 50 trades : 30 gagnants à +1.5R, 20 perdants à -1R
			const rMultiples = [
				...Array(30).fill(1.5),
				...Array(20).fill(-1),
			]
			const result = getSQN(rMultiples, 2)
			expect(result).toBeGreaterThan(0)
			// meanR = (30*1.5 + 20*(-1)) / 50 = 25/50 = 0.5
			// SQN = √50 × 0.5 / stdDev → devrait être > 2 (bon système)
			expect(result).toBeGreaterThan(2)
		})

		it('should return negative SQN for a losing system', () => {
			// 50 trades : 20 gagnants à +1R, 30 perdants à -1.5R
			const rMultiples = [
				...Array(20).fill(1),
				...Array(30).fill(-1.5),
			]
			const result = getSQN(rMultiples, 2)
			expect(result).toBeLessThan(0)
		})
	})

	describe('getCalmarRatio', () => {
		it('should return 0 for less than 2 trades', () => {
			expect(getCalmarRatio([mockTrades[0]])).toBe(0)
		})

		it('should return 0 when max drawdown is 0', () => {
			const allWinners = mockTrades.filter(t => t.netProfit > 0)
			expect(getCalmarRatio(allWinners, 2)).toBe(0)
		})

		it('should calculate a positive Calmar for profitable trades with drawdown', () => {
			const result = getCalmarRatio(mockTrades, 2)
			expect(result).toBeGreaterThan(0)
		})
	})

	describe('getUlcerIndex', () => {
		it('should return 0 for empty trades', () => {
			expect(getUlcerIndex([])).toBe(0)
		})

		it('should return 0 when all trades are positive (no drawdown)', () => {
			const allWinners = mockTrades.filter(t => t.netProfit > 0)
			expect(getUlcerIndex(allWinners, 2)).toBe(0)
		})

		it('should return a positive value when there are drawdowns', () => {
			const result = getUlcerIndex(mockTrades, 2)
			expect(result).toBeGreaterThan(0)
		})

		it('should be higher for deeper drawdowns', () => {
			// Trades avec un gros drawdown
			const deepDd = [
				{ profit: 100, netProfit: 100 },
				{ profit: -200, netProfit: -200 },
				{ profit: 50, netProfit: 50 },
			]
			// Trades avec un petit drawdown
			const shallowDd = [
				{ profit: 100, netProfit: 100 },
				{ profit: -10, netProfit: -10 },
				{ profit: 50, netProfit: 50 },
			]
			expect(getUlcerIndex(deepDd, 2)).toBeGreaterThan(getUlcerIndex(shallowDd, 2))
		})
	})
})
