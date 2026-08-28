import { describe, expect, it } from 'vitest'
import { calculateTradePerformance } from '~/utils/tradePerformance'

// 3 trades chronologiques couvrant wins, loss, et metadata R-multiple
// Net: 100 - 50 + 20 = 70 ; Gross: 110 - 40 + 30 = 100
// Win streak max: 1 (trade 1 seul avant la perte, puis trade 3 seul)
// R-multiple disponible sur trade 1 (riskReward=2)
const mockTrades = [
	{ openDate: '2026-01-01T10:00:00Z', closeDate: '2026-01-01T11:00:00Z', profit: 110, netProfit: 100, lot: 1, commission: 10, openPrice: 100, closePrice: 101, stopLoss: 99, type: 'buy' as const, metadata: { riskReward: 2 } },
	{ openDate: '2026-01-02T10:00:00Z', closeDate: '2026-01-02T11:00:00Z', profit: -40, netProfit: -50, lot: 1, commission: 10, openPrice: 100, closePrice: 99, stopLoss: 0, type: 'buy' as const, metadata: null },
	{ openDate: '2026-01-03T10:00:00Z', closeDate: '2026-01-03T11:00:00Z', profit: 30, netProfit: 20, lot: 1, commission: 10, openPrice: 100, closePrice: 100.5, stopLoss: 0, type: 'buy' as const, metadata: null },
]

describe('tradePerformance', () => {
	it('calcule les métriques dashboard partagées avec arrondi', () => {
		const performance = calculateTradePerformance(mockTrades, { useNet: true, round: 2, pnlRound: 0 })
		expect(performance.pnl).toBe(70)
		expect(performance.appt).toBe(23.33)
		expect(performance.winrate).toBe(66.67)
		expect(performance.tradesCount).toBe(3)
		expect(performance.winning.count).toBe(2)
		expect(performance.losing.count).toBe(1)
		expect(performance.maxWinningStreak).toBe(1)
		expect(performance.maxLosingStreak).toBe(1)
	})

	it('garde les métriques ordre-sensitives identiques pour un input inversé', () => {
		const options = { useNet: true, round: -1, pnlRound: -1 }
		const chronological = calculateTradePerformance(mockTrades, options)
		const reversed = calculateTradePerformance([...mockTrades].reverse(), options)
		expect(reversed.recoveryFactor).toBe(chronological.recoveryFactor)
		expect(reversed.calmarRatio).toBe(chronological.calmarRatio)
		expect(reversed.ulcerIndex).toBe(chronological.ulcerIndex)
		expect(reversed.drawdown).toEqual(chronological.drawdown)
		expect(reversed.runUp).toEqual(chronological.runUp)
		expect(reversed.maxWinningStreak).toBe(chronological.maxWinningStreak)
		expect(reversed.maxLosingStreak).toBe(chronological.maxLosingStreak)
	})

	it('calcule les métriques R depuis les metadata connues', () => {
		const performance = calculateTradePerformance([mockTrades[0]], { useNet: true, round: 2, pnlRound: 0 })
		expect(performance.r.coverage).toBe(1)
		expect(performance.r.reliability).toBe('reliable')
		expect(performance.r.tradesWithStopLoss).toBe(1)
		expect(performance.r.tradesWithRMultiple).toBe(1)
		expect(performance.r.totalR).toBe(2)
		expect(performance.r.apptR).toBe(2)
	})

	it('retourne des métriques R nulles quand aucune metadata R', () => {
		const performance = calculateTradePerformance([mockTrades[1]], { useNet: true, round: 2, pnlRound: 0 })
		expect(performance.r.coverage).toBe(0)
		expect(performance.r.reliability).toBe('none')
		expect(performance.r.totalR).toBeNull()
		expect(performance.r.apptR).toBeNull()
	})

	it('retourne des valeurs sûres pour un ensemble vide', () => {
		const performance = calculateTradePerformance([], { useNet: true, round: 2, pnlRound: 0 })
		expect(performance.pnl).toBe(0)
		expect(performance.tradesCount).toBe(0)
		expect(performance.winning.count).toBe(0)
		expect(performance.losing.count).toBe(0)
		expect(performance.r.reliability).toBe('none')
		expect(performance.r.sqn).toBe(0)
	})
})
