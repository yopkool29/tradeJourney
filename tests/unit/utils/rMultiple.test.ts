import { describe, it, expect } from 'vitest'
import {
	extractPlannedRiskFromMetadata,
	resolvePlannedRisk,
	getRMultiple,
	getRMultiples,
	getTotalRMultiple,
	getAPPTInR,
	getProfitFactorInR,
	getPLRatioInR,
	getAvgWinLossInR,
	getLargestWinLossInR,
	getTotalProfitLossInR,
} from '~/utils/rMultiple'
import type { RMultipleTrade, RMultipleAccount } from '~/utils/rMultiple'

// 6 trades avec plannedRisk variés pour tester tous les cas
// Trade 1: +200€ / risk 100€ = +2R (winner)
// Trade 2: -100€ / risk 100€ = -1R (loser)
// Trade 3: +400€ / risk 200€ = +2R (winner)
// Trade 4: -300€ / risk 100€ = -3R (loser)
// Trade 5: +50€ / risk null = non calculable
// Trade 6: +150€ / risk 50€ = +3R (winner)
const mockTrades: RMultipleTrade[] = [
	{ profit: 200, netProfit: 200, metadata: { plannedRisk: 100 } },
	{ profit: -100, netProfit: -100, metadata: { plannedRisk: 100 } },
	{ profit: 400, netProfit: 400, metadata: { plannedRisk: 200 } },
	{ profit: -300, netProfit: -300, metadata: { plannedRisk: 100 } },
	{ profit: 50, netProfit: 50, metadata: null },
	{ profit: 150, netProfit: 150, metadata: { plannedRisk: 50 } },
]

// Compte sans defaultPlannedRisk (utilise le plannedRisk du trade)
const accountWithoutDefault: RMultipleAccount = { id: 1, metadata: null }

// Compte avec defaultPlannedRisk = 100 (override tous les trades)
const accountWithDefault: RMultipleAccount = { id: 1, metadata: { defaultPlannedRisk: 100 } }

// Helper : tous les trades appartiennent au même compte
const accountForAll = (account: RMultipleAccount | null) => () => account

describe('rMultiple', () => {
	describe('extractPlannedRiskFromMetadata', () => {
		it('should extract plannedRisk from object metadata', () => {
			expect(extractPlannedRiskFromMetadata({ plannedRisk: 200 })).toBe(200)
		})

		it('should extract plannedRisk from string metadata', () => {
			expect(extractPlannedRiskFromMetadata('{"plannedRisk": 150}')).toBe(150)
		})

		it('should return null for null/undefined metadata', () => {
			expect(extractPlannedRiskFromMetadata(null)).toBeNull()
			expect(extractPlannedRiskFromMetadata(undefined)).toBeNull()
		})

		it('should return null for metadata without plannedRisk', () => {
			expect(extractPlannedRiskFromMetadata({ otherKey: 'value' })).toBeNull()
		})

		it('should return null for invalid plannedRisk values', () => {
			expect(extractPlannedRiskFromMetadata({ plannedRisk: null })).toBeNull()
			expect(extractPlannedRiskFromMetadata({ plannedRisk: '' })).toBeNull()
			expect(extractPlannedRiskFromMetadata({ plannedRisk: 'abc' })).toBeNull()
		})

		it('should handle invalid JSON string', () => {
			expect(extractPlannedRiskFromMetadata('not json')).toBeNull()
		})
	})

	describe('resolvePlannedRisk', () => {
		it('should use account defaultPlannedRisk when set (override trade)', () => {
			const trade: RMultipleTrade = { profit: 100, netProfit: 100, metadata: { plannedRisk: 50 } }
			expect(resolvePlannedRisk(trade, accountWithDefault)).toBe(100)
		})

		it('should use trade plannedRisk when account has no default', () => {
			const trade: RMultipleTrade = { profit: 100, netProfit: 100, metadata: { plannedRisk: 50 } }
			expect(resolvePlannedRisk(trade, accountWithoutDefault)).toBe(50)
		})

		it('should return null when neither account nor trade has plannedRisk', () => {
			const trade: RMultipleTrade = { profit: 100, netProfit: 100, metadata: null }
			expect(resolvePlannedRisk(trade, accountWithoutDefault)).toBeNull()
		})

		it('should return null when account is null and trade has no plannedRisk', () => {
			const trade: RMultipleTrade = { profit: 100, netProfit: 100, metadata: null }
			expect(resolvePlannedRisk(trade, null)).toBeNull()
		})

		it('should ignore account defaultPlannedRisk if zero or negative', () => {
			const account: RMultipleAccount = { id: 1, metadata: { defaultPlannedRisk: 0 } }
			const trade: RMultipleTrade = { profit: 100, netProfit: 100, metadata: { plannedRisk: 50 } }
			expect(resolvePlannedRisk(trade, account)).toBe(50)
		})
	})

	describe('getRMultiple', () => {
		it('should calculate R-multiple for a trade with plannedRisk', () => {
			const trade: RMultipleTrade = { profit: 400, netProfit: 400, metadata: { plannedRisk: 200 } }
			expect(getRMultiple(trade, accountWithoutDefault)).toBe(2)
		})

		it('should return null when plannedRisk is not available', () => {
			const trade: RMultipleTrade = { profit: 100, netProfit: 100, metadata: null }
			expect(getRMultiple(trade, accountWithoutDefault)).toBeNull()
		})

		it('should return null when plannedRisk is zero', () => {
			const trade: RMultipleTrade = { profit: 100, netProfit: 100, metadata: { plannedRisk: 0 } }
			expect(getRMultiple(trade, accountWithoutDefault)).toBeNull()
		})

		it('should use account override when set', () => {
			const trade: RMultipleTrade = { profit: 200, netProfit: 200, metadata: { plannedRisk: 50 } }
			// Account default = 100, so R = 200/100 = 2 (not 200/50 = 4)
			expect(getRMultiple(trade, accountWithDefault)).toBe(2)
		})

		it('should use net profit by default', () => {
			const trade: RMultipleTrade = { profit: 200, netProfit: 180, metadata: { plannedRisk: 100 } }
			expect(getRMultiple(trade, accountWithoutDefault, true)).toBe(1.8)
		})

		it('should use gross profit when useNet=false', () => {
			const trade: RMultipleTrade = { profit: 200, netProfit: 180, metadata: { plannedRisk: 100 } }
			expect(getRMultiple(trade, accountWithoutDefault, false)).toBe(2)
		})
	})

	describe('getRMultiples', () => {
		it('should return R-multiples only for trades with calculable plannedRisk', () => {
			const result = getRMultiples(mockTrades, accountForAll(accountWithoutDefault))
			// Trade 5 (no plannedRisk) is excluded
			expect(result).toHaveLength(5)
			expect(result).toEqual([2, -1, 2, -3, 3])
		})

		it('should return empty array when no trades have plannedRisk', () => {
			const trades: RMultipleTrade[] = [
				{ profit: 100, netProfit: 100, metadata: null },
				{ profit: -50, netProfit: -50, metadata: null },
			]
			expect(getRMultiples(trades, accountForAll(accountWithoutDefault))).toEqual([])
		})

		it('should apply account override to all trades', () => {
			// Account default = 100, so:
			// Trade 1: 200/100 = 2R
			// Trade 2: -100/100 = -1R
			// Trade 3: 400/100 = 4R (was 2R with trade-level risk)
			// Trade 4: -300/100 = -3R
			// Trade 5: 50/100 = 0.5R (was non-calculable, now calculable via account override)
			// Trade 6: 150/100 = 1.5R (was 3R with trade-level risk)
			const result = getRMultiples(mockTrades, accountForAll(accountWithDefault))
			expect(result).toHaveLength(6)
			expect(result).toEqual([2, -1, 4, -3, 0.5, 1.5])
		})
	})

	describe('getTotalRMultiple', () => {
		it('should sum all R-multiples', () => {
			// 2 + (-1) + 2 + (-3) + 3 = 3
			expect(getTotalRMultiple(mockTrades, accountForAll(accountWithoutDefault))).toBe(3)
		})

		it('should return 0 when no trades have plannedRisk', () => {
			expect(getTotalRMultiple([], accountForAll(accountWithoutDefault))).toBe(0)
		})

		it('should round when round >= 0', () => {
			const trades: RMultipleTrade[] = [
				{ profit: 100, netProfit: 100, metadata: { plannedRisk: 3 } },
			]
			// 100/3 = 33.333...
			expect(getTotalRMultiple(trades, accountForAll(accountWithoutDefault), 2)).toBe(33.33)
		})
	})

	describe('getAPPTInR', () => {
		it('should calculate average R per trade', () => {
			// 5 R-multiples: [2, -1, 2, -3, 3], sum = 3, avg = 3/5 = 0.6
			expect(getAPPTInR(mockTrades, accountForAll(accountWithoutDefault))).toBe(0.6)
		})

		it('should return 0 when no trades have plannedRisk', () => {
			expect(getAPPTInR([], accountForAll(accountWithoutDefault))).toBe(0)
		})
	})

	describe('getProfitFactorInR', () => {
		it('should calculate profit factor in R', () => {
			// Winning R: [2, 2, 3] = 7
			// Losing R: [-1, -3] = -4, |sum| = 4
			// PF = 7/4 = 1.75
			expect(getProfitFactorInR(mockTrades, accountForAll(accountWithoutDefault))).toBe(1.75)
		})

		it('should return 0 when no losing trades', () => {
			const trades: RMultipleTrade[] = [
				{ profit: 100, netProfit: 100, metadata: { plannedRisk: 50 } },
				{ profit: 200, netProfit: 200, metadata: { plannedRisk: 100 } },
			]
			expect(getProfitFactorInR(trades, accountForAll(accountWithoutDefault))).toBe(0)
		})
	})

	describe('getPLRatioInR', () => {
		it('should calculate P/L ratio in R', () => {
			// Winning R: [2, 2, 3], avg = 7/3 ≈ 2.333
			// Losing R: [-1, -3], avg = |-4|/2 = 2
			// Ratio = 2.333/2 = 1.1666...
			expect(getPLRatioInR(mockTrades, accountForAll(accountWithoutDefault), 4)).toBe(1.1667)
		})

		it('should return 0 when no losing trades', () => {
			const trades: RMultipleTrade[] = [
				{ profit: 100, netProfit: 100, metadata: { plannedRisk: 50 } },
			]
			expect(getPLRatioInR(trades, accountForAll(accountWithoutDefault))).toBe(0)
		})
	})

	describe('getAvgWinLossInR', () => {
		it('should calculate average win and loss in R', () => {
			// Winning R: [2, 2, 3], avg = 7/3 ≈ 2.333
			// Losing R: [-1, -3], avg = |-4|/2 = 2
			const result = getAvgWinLossInR(mockTrades, accountForAll(accountWithoutDefault), 4)
			expect(result.avgWin).toBe(2.3333)
			expect(result.avgLoss).toBe(2)
		})

		it('should return 0 for avgWin when no winning trades', () => {
			const trades: RMultipleTrade[] = [
				{ profit: -100, netProfit: -100, metadata: { plannedRisk: 50 } },
			]
			const result = getAvgWinLossInR(trades, accountForAll(accountWithoutDefault))
			expect(result.avgWin).toBe(0)
			expect(result.avgLoss).toBe(2)
		})
	})

	describe('getLargestWinLossInR', () => {
		it('should find largest win and loss in R', () => {
			// Winning R: [2, 2, 3], largest = 3
			// Losing R: [-1, -3], largest (most negative) = -3
			const result = getLargestWinLossInR(mockTrades, accountForAll(accountWithoutDefault))
			expect(result.largestWin).toBe(3)
			expect(result.largestLoss).toBe(-3)
		})

		it('should return null when no winning or losing trades', () => {
			const trades: RMultipleTrade[] = [
				{ profit: 0, netProfit: 0, metadata: { plannedRisk: 50 } },
			]
			const result = getLargestWinLossInR(trades, accountForAll(accountWithoutDefault))
			expect(result.largestWin).toBeNull()
			expect(result.largestLoss).toBeNull()
		})
	})

	describe('getTotalProfitLossInR', () => {
		it('should sum winning and losing R separately', () => {
			// Winning R: [2, 2, 3] = 7
			// Losing R: [-1, -3] = -4, |sum| = 4
			const result = getTotalProfitLossInR(mockTrades, accountForAll(accountWithoutDefault))
			expect(result.totalProfit).toBe(7)
			expect(result.totalLoss).toBe(4)
		})

		it('should return 0/0 when no trades with plannedRisk', () => {
			const result = getTotalProfitLossInR([], accountForAll(accountWithoutDefault))
			expect(result.totalProfit).toBe(0)
			expect(result.totalLoss).toBe(0)
		})
	})
})
