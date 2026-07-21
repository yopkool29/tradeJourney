import { describe, it, expect } from 'vitest'
import {
	getRMultiple,
	getRMultiples,
	getTotalRMultiple,
	getAPPTInR,
	getProfitFactorInR,
	getPLRatioInR,
	getAvgWinLossInR,
	getLargestWinLossInR,
	getTotalProfitLossInR,
	countTradesWithStopLoss,
	getRMultipleCoverage,
	getRMultipleReliability,
} from '~/utils/rMultiple'
import type { RMultipleTrade } from '~/utils/rMultiple'

// Helper pour construire un trade rapidement
const makeTrade = (overrides: Partial<RMultipleTrade>): RMultipleTrade => ({
	profit: 0,
	netProfit: 0,
	openPrice: 100,
	closePrice: 100,
	stopLoss: 0,
	type: 'buy',
	...overrides,
})

// Long gagnant avec SL : entry=100, SL=95, close=110 → risk=5, gain=10 → R=+2
const longWinWithSL = makeTrade({ openPrice: 100, closePrice: 110, stopLoss: 95, type: 'buy', profit: 10, netProfit: 10 })
// Long perdant avec SL : entry=100, SL=95, close=93 → risk=5, perte=7 → R=-1.4
const longLossWithSL = makeTrade({ openPrice: 100, closePrice: 93, stopLoss: 95, type: 'buy', profit: -7, netProfit: -7 })
// Short gagnant avec SL : entry=100, SL=105, close=90 → risk=5, gain=10 → R=+2
const shortWinWithSL = makeTrade({ openPrice: 100, closePrice: 90, stopLoss: 105, type: 'sell', profit: 10, netProfit: 10 })
// Short perdant avec SL : entry=100, SL=105, close=108 → risk=5, perte=8 → R=-1.6
const shortLossWithSL = makeTrade({ openPrice: 100, closePrice: 108, stopLoss: 105, type: 'sell', profit: -8, netProfit: -8 })

describe('rMultiple', () => {
	// --- getRMultiple : cas avec SL valide (R réel) ---
	it.each([
		['long gagnant', longWinWithSL, 2],
		['long perdant', longLossWithSL, -1.4],
		['short gagnant', shortWinWithSL, 2],
		['short perdant', shortLossWithSL, -1.6],
	])('calcule R réel depuis le SL pour un trade %s', (_label, trade, expected) => {
		expect(getRMultiple(trade, 0)).toBeCloseTo(expected, 5)
	})

	// --- getRMultiple : cas sans SL (hypothèse) ---
	it('retourne -1R pour un trade perdant sans SL (hypothèse SL touché)', () => {
		const trade = makeTrade({ stopLoss: 0, profit: -150, netProfit: -150 })
		expect(getRMultiple(trade, 100)).toBe(-1)
	})

	it('estime R = profit / avgLoss pour un trade gagnant sans SL', () => {
		const trade = makeTrade({ stopLoss: 0, profit: 200, netProfit: 200 })
		expect(getRMultiple(trade, 100)).toBe(2)
	})

	it('retourne null pour un trade gagnant sans SL ni avgLoss (premier trade)', () => {
		const trade = makeTrade({ stopLoss: 0, profit: 200, netProfit: 200 })
		expect(getRMultiple(trade, 0)).toBeNull()
	})

	it('retourne 0 pour un trade breakeven sans SL', () => {
		const trade = makeTrade({ stopLoss: 0, profit: 0, netProfit: 0 })
		expect(getRMultiple(trade, 100)).toBe(0)
	})

	// --- getRMultiple : SL invalide → traité comme sans SL ---
	it.each([
		['SL = 0', makeTrade({ stopLoss: 0, profit: -100, netProfit: -100 })],
		['SL = openPrice (distance nulle)', makeTrade({ openPrice: 100, closePrice: 110, stopLoss: 100, type: 'buy', profit: 10, netProfit: 10 })],
		['SL du mauvais côté (buy avec SL au-dessus)', makeTrade({ openPrice: 100, closePrice: 110, stopLoss: 105, type: 'buy', profit: -100, netProfit: -100 })],
		['SL du mauvais côté (sell avec SL en-dessous)', makeTrade({ openPrice: 100, closePrice: 90, stopLoss: 95, type: 'sell', profit: -100, netProfit: -100 })],
	])('traite un SL invalide (%s) comme sans SL', (_label, trade) => {
		// Trade perdant → hypothèse -1R
		if (trade.profit < 0) {
			expect(getRMultiple(trade, 100)).toBe(-1)
		}
		// Trade gagnant → estimation
		if (trade.profit > 0) {
			expect(getRMultiple(trade, 100)).toBe(trade.profit / 100)
		}
	})

	// --- getRMultiple : useNet vs profit brut ---
	it('utilise netProfit quand useNet=true', () => {
		const trade = makeTrade({ openPrice: 100, closePrice: 110, stopLoss: 95, type: 'buy', profit: 10, netProfit: 8 })
		// R = (110 - 100) / (100 - 95) = 2 (basé sur les prix, pas sur le P&L)
		// Le useNet n'affecte pas le calcul depuis SL car c'est un ratio de prix
		expect(getRMultiple(trade, 0, true)).toBe(2)
	})

	it('utilise netProfit pour l\'estimation quand useNet=true', () => {
		const trade = makeTrade({ stopLoss: 0, profit: 200, netProfit: 180 })
		expect(getRMultiple(trade, 100, true)).toBe(1.8)
	})

	it('utilise profit brut pour l\'estimation quand useNet=false', () => {
		const trade = makeTrade({ stopLoss: 0, profit: 200, netProfit: 180 })
		expect(getRMultiple(trade, 100, false)).toBe(2)
	})

	// --- getRMultiples (batch) ---
	it('calcule les R-multiples pour un ensemble mixte de trades', () => {
		const trades = [
			longWinWithSL,       // +2R (réel)
			longLossWithSL,      // -1.4R (réel)
			makeTrade({ stopLoss: 0, profit: -100, netProfit: -100 }), // -1R (hypothèse)
			makeTrade({ stopLoss: 0, profit: 200, netProfit: 200 }),   // estimation: 200/avgLoss
		]
		// avgLoss = (7 + 100) / 2 = 53.5 (pertes : -7 et -100)
		// R du 4e trade = 200 / 53.5 ≈ 3.738
		const result = getRMultiples(trades)
		expect(result).toHaveLength(4)
		expect(result[0]).toBeCloseTo(2, 5)
		expect(result[1]).toBeCloseTo(-1.4, 5)
		expect(result[2]).toBe(-1)
		expect(result[3]).toBeCloseTo(200 / 53.5, 5)
	})

	// --- Coverage et fiabilité ---
	it.each([
		['100% avec SL', [longWinWithSL, longLossWithSL], 1, 'reliable'],
		['80% avec SL', [
			longWinWithSL, longLossWithSL, shortWinWithSL, shortLossWithSL,
			makeTrade({ stopLoss: 0, profit: -100, netProfit: -100 }),
		], 0.8, 'reliable'],
		['50% avec SL', [
			longWinWithSL, longLossWithSL,
			makeTrade({ stopLoss: 0, profit: -100, netProfit: -100 }),
			makeTrade({ stopLoss: 0, profit: 200, netProfit: 200 }),
		], 0.5, 'partial'],
		['25% avec SL', [
			longWinWithSL,
			makeTrade({ stopLoss: 0, profit: -100, netProfit: -100 }),
			makeTrade({ stopLoss: 0, profit: 200, netProfit: 200 }),
			makeTrade({ stopLoss: 0, profit: -50, netProfit: -50 }),
		], 0.25, 'approximate'],
		['0% avec SL', [
			makeTrade({ stopLoss: 0, profit: -100, netProfit: -100 }),
			makeTrade({ stopLoss: 0, profit: 200, netProfit: 200 }),
		], 0, 'none'],
	])('coverage et fiabilité pour %s', (_label, trades, expectedCoverage, expectedReliability) => {
		expect(getRMultipleCoverage(trades)).toBeCloseTo(expectedCoverage, 5)
		expect(getRMultipleReliability(trades)).toBe(expectedReliability)
	})

	it('retourne coverage 0 et reliability "none" pour un tableau vide', () => {
		expect(getRMultipleCoverage([])).toBe(0)
		expect(getRMultipleReliability([])).toBe('none')
	})

	it('compte correctement le nombre de trades avec SL valide', () => {
		const trades = [longWinWithSL, longLossWithSL, makeTrade({ stopLoss: 0, profit: -100, netProfit: -100 })]
		expect(countTradesWithStopLoss(trades)).toBe(2)
	})

	it('coverage est cohérent avec countTradesWithStopLoss (coverage = withSl / total)', () => {
		const trades = [
			longWinWithSL, longLossWithSL,
			makeTrade({ stopLoss: 0, profit: -100, netProfit: -100 }),
			makeTrade({ stopLoss: 0, profit: 200, netProfit: 200 }),
		]
		const withSl = countTradesWithStopLoss(trades)
		const coverage = getRMultipleCoverage(trades)
		expect(coverage).toBe(withSl / trades.length)
	})

	// --- Métriques agrégées ---
	// Trades : +2R, -1.4R, -1R, +3.738R (estimé)
	const mixedTrades = [
		longWinWithSL,       // +2R
		longLossWithSL,      // -1.4R
		makeTrade({ stopLoss: 0, profit: -100, netProfit: -100 }), // -1R
		makeTrade({ stopLoss: 0, profit: 200, netProfit: 200 }),   // 200/53.5 ≈ 3.738R
	]

	it('calcule le Total R (somme)', () => {
		const total = getTotalRMultiple(mixedTrades, 2)
		// 2 + (-1.4) + (-1) + 3.738 ≈ 3.34
		expect(total).toBeCloseTo(3.34, 1)
	})

	it('calcule l\'APPT en R (R moyen)', () => {
		const appt = getAPPTInR(mixedTrades, 2)
		// 3.34 / 4 ≈ 0.83
		expect(appt).toBeCloseTo(0.83, 1)
	})

	it('calcule le Profit Factor en R', () => {
		const pf = getProfitFactorInR(mixedTrades, 2)
		// sumWin = 2 + 3.738 = 5.738, sumLoss = 1.4 + 1 = 2.4
		// PF = 5.738 / 2.4 ≈ 2.39
		expect(pf).toBeCloseTo(2.39, 1)
	})

	it('calcule le P/L Ratio en R', () => {
		const plr = getPLRatioInR(mixedTrades, 2)
		// avgWin = 5.738 / 2 = 2.869, avgLoss = 2.4 / 2 = 1.2
		// PLR = 2.869 / 1.2 ≈ 2.39
		expect(plr).toBeCloseTo(2.39, 1)
	})

	it('calcule Avg Win/Loss en R (avgLoss négatif)', () => {
		const { avgWin, avgLoss } = getAvgWinLossInR(mixedTrades, 2)
		expect(avgWin).toBeCloseTo(2.87, 1)
		expect(avgLoss).toBeCloseTo(-1.2, 1)
	})

	it('calcule Largest Win/Loss en R (largestLoss négatif)', () => {
		const { largestWin, largestLoss } = getLargestWinLossInR(mixedTrades, 2)
		expect(largestWin).toBeCloseTo(3.74, 1)
		expect(largestLoss).toBeCloseTo(-1.4, 1)
	})

	it('calcule Total Profit/Loss en R (totalLoss négatif)', () => {
		const { totalProfit, totalLoss } = getTotalProfitLossInR(mixedTrades, 2)
		expect(totalProfit).toBeCloseTo(5.74, 1)
		expect(totalLoss).toBeCloseTo(-2.4, 1)
	})
})
