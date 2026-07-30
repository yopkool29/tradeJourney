import { round as _round } from '~/utils'

// Calcule le ratio risque/rendement depuis le TP/SL
export const calculateRiskReward = (
	type: 'buy' | 'sell',
	openPrice: number,
	stopLoss: number,
	takeProfit: number,
): number | null => {
	if (!openPrice || !stopLoss || !takeProfit) return null
	if (type === 'buy') {
		const reward = takeProfit - openPrice
		const risk = openPrice - stopLoss
		if (risk === 0) return null
		return reward / risk
	}
	const reward = openPrice - takeProfit
	const risk = stopLoss - openPrice
	if (risk === 0) return null
	return reward / risk
}

// Trade minimal pour le calcul du R-multiple
// Besoin de : P&L (numérateur), prix + SL + type (pour le ratio de prix)
export interface RMultipleTrade {
	profit: number
	netProfit: number
	openPrice: number
	closePrice: number
	stopLoss: number
	type: 'buy' | 'sell'
	metadata?: Record<string, unknown> | null
}

// Vérifie si le stopLoss est valide (du bon côté de l'entry, non nul)
const isValidStopLoss = (trade: RMultipleTrade): boolean => {
	if (trade.stopLoss <= 0) return false
	if (trade.openPrice === 0) return false
	if (trade.type === 'buy') {
		// Long : le SL doit être sous l'entry
		return trade.stopLoss < trade.openPrice
	}
	// Short : le SL doit être au-dessus de l'entry
	return trade.stopLoss > trade.openPrice
}

// Calcule le R-multiple depuis le ratio de prix (quand le SL est valide)
// Long  : R = (closePrice - openPrice) / (openPrice - stopLoss)
// Short : R = (openPrice - closePrice) / (stopLoss - openPrice)
// lot et pricePerPoint s'annulent car c'est un ratio — voir docs/dev/rr-design.md
const getRMultipleFromStopLoss = (trade: RMultipleTrade): number | null => {
	if (!isValidStopLoss(trade)) return null
	if (trade.type === 'buy') {
		const risk = trade.openPrice - trade.stopLoss
		if (risk === 0) return null
		return (trade.closePrice - trade.openPrice) / risk
	}
	const risk = trade.stopLoss - trade.openPrice
	if (risk === 0) return null
	return (trade.openPrice - trade.closePrice) / risk
}

// Calcule la perte moyenne en € (valeur positive) pour l'estimation des gagnants sans SL
// Utilise tous les trades perdants (avec ou sans SL) — voir docs/dev/rr-design.md section 4
const getAvgLossInEuros = (trades: RMultipleTrade[], useNet: boolean): number => {
	const losingTrades = trades.filter(t => {
		const pnl = useNet ? t.netProfit : t.profit
		return pnl < 0
	})
	if (losingTrades.length === 0) return 0
	const totalLoss = losingTrades.reduce((acc, t) => {
		const pnl = useNet ? t.netProfit : t.profit
		return acc + Math.abs(pnl)
	}, 0)
	return totalLoss / losingTrades.length
}

// Calcule le R-multiple d'un trade
// avgLossInEuros: perte moyenne en € (positive) — nécessaire pour estimer R des gagnants sans SL
//
// Résolution (voir docs/dev/rr-design.md section 4) :
// 1. SL valide → R réel (ratio de prix)
// 2. Trade perdant sans SL → R = -1 (hypothèse SL touché)
// 3. Trade gagnant sans SL → R = profit / avgLoss (estimation)
// 4. Breakeven → R = 0
// 5. Gagnant sans SL ni avgLoss (premier trade) → null
export const getRMultiple = (trade: RMultipleTrade, avgLossInEuros: number, useNet = true): number | null => {
	const pnl = useNet ? trade.netProfit : trade.profit

	// 0. R/R réalisé stocké manuellement dans metadata (priorité si > 0)
	const storedRR = trade.metadata?.riskReward
	if (typeof storedRR === 'number' && storedRR > 0) {
		return storedRR
	}

	// 1. SL présent et valide → R réel
	const rFromSL = getRMultipleFromStopLoss(trade)
	if (rFromSL !== null) return rFromSL

	// 2. Trade perdant sans SL → hypothèse SL touché
	if (pnl < 0) return -1

	// 3. Trade gagnant sans SL → estimation profit / avgLoss
	if (pnl > 0) {
		if (avgLossInEuros > 0) return pnl / avgLossInEuros
		return null
	}

	// 4. Breakeven
	return 0
}

// Calcule les R-multiples pour un ensemble de trades
// L'avgLoss est calculé en interne depuis les trades perdants
export const getRMultiples = (trades: RMultipleTrade[], useNet = true): number[] => {
	const avgLoss = getAvgLossInEuros(trades, useNet)
	return trades
		.map(trade => getRMultiple(trade, avgLoss, useNet))
		.filter((r): r is number => r !== null)
}

// Vérifie si un trade a un R-multiple valide (SL valide ou R/R stocké manuellement)
const hasValidRMultiple = (trade: RMultipleTrade): boolean => {
	if (isValidStopLoss(trade)) return true
	const storedRR = trade.metadata?.riskReward
	return typeof storedRR === 'number' && storedRR > 0
}

// Compte le nombre de trades avec R-multiple valide (SL valide ou R/R stocké)
export const countTradesWithStopLoss = (trades: RMultipleTrade[]): number => {
	return trades.filter(hasValidRMultiple).length
}

// Calcule le coverage (% de trades avec SL valide, entre 0 et 1)
export const getRMultipleCoverage = (trades: RMultipleTrade[]): number => {
	if (trades.length === 0) return 0
	return countTradesWithStopLoss(trades) / trades.length
}

// Label de fiabilité basé sur le coverage
// 'reliable'   : ≥ 80% des trades ont un SL
// 'partial'    : 50-79%
// 'approximate': 1-49%
// 'none'       : 0% (aucun SL — on masque les métriques R)
export type RMultipleReliability = 'reliable' | 'partial' | 'approximate' | 'none'

export const getRMultipleReliability = (trades: RMultipleTrade[]): RMultipleReliability => {
	if (trades.length === 0) return 'none'
	const coverage = getRMultipleCoverage(trades)
	if (coverage >= 0.8) return 'reliable'
	if (coverage >= 0.5) return 'partial'
	if (coverage > 0) return 'approximate'
	return 'none'
}

// Total P&L en R (somme des R-multiples)
export const getTotalRMultiple = (trades: RMultipleTrade[], round = -1, useNet = true): number => {
	const rMultiples = getRMultiples(trades, useNet)
	const total = rMultiples.reduce((acc, r) => acc + r, 0)
	if (round < 0) return total
	return _round(total, round)
}

// APPT en R (R moyen par trade) — expectancy en R
export const getAPPTInR = (trades: RMultipleTrade[], round = -1, useNet = true): number => {
	const rMultiples = getRMultiples(trades, useNet)
	if (rMultiples.length === 0) return 0
	const avg = rMultiples.reduce((acc, r) => acc + r, 0) / rMultiples.length
	if (round < 0) return avg
	return _round(avg, round)
}

// Profit Factor en R : somme des R gagnants / |somme des R perdants|
export const getProfitFactorInR = (trades: RMultipleTrade[], round = -1, useNet = true): number => {
	const rMultiples = getRMultiples(trades, useNet)
	const winningRs = rMultiples.filter(r => r > 0)
	const losingRs = rMultiples.filter(r => r < 0)
	const sumWin = winningRs.reduce((acc, r) => acc + r, 0)
	const sumLoss = Math.abs(losingRs.reduce((acc, r) => acc + r, 0))
	if (sumLoss === 0) return 0
	const result = sumWin / sumLoss
	if (round < 0) return result
	return _round(result, round)
}

// P/L Ratio en R : R moyen gagnant / |R moyen perdant|
export const getPLRatioInR = (trades: RMultipleTrade[], round = -1, useNet = true): number => {
	const rMultiples = getRMultiples(trades, useNet)
	const winningRs = rMultiples.filter(r => r > 0)
	const losingRs = rMultiples.filter(r => r < 0)
	const avgWin = winningRs.length > 0 ? winningRs.reduce((acc, r) => acc + r, 0) / winningRs.length : 0
	const avgLoss = losingRs.length > 0 ? Math.abs(losingRs.reduce((acc, r) => acc + r, 0) / losingRs.length) : 0
	if (avgLoss === 0) return 0
	const result = avgWin / avgLoss
	if (round < 0) return result
	return _round(result, round)
}

// Average Win / Loss en R
// avgLoss est retourné en valeur négative (pertes = R négatifs)
export const getAvgWinLossInR = (
	trades: RMultipleTrade[],
	round = -1,
	useNet = true,
): { avgWin: number; avgLoss: number } => {
	const rMultiples = getRMultiples(trades, useNet)
	const winningRs = rMultiples.filter(r => r > 0)
	const losingRs = rMultiples.filter(r => r < 0)
	const avgWin = winningRs.length > 0 ? winningRs.reduce((acc, r) => acc + r, 0) / winningRs.length : 0
	const avgLoss = losingRs.length > 0 ? losingRs.reduce((acc, r) => acc + r, 0) / losingRs.length : 0
	if (round < 0) return { avgWin, avgLoss }
	return { avgWin: _round(avgWin, round), avgLoss: _round(avgLoss, round) }
}

// Largest Win / Loss en R
export const getLargestWinLossInR = (
	trades: RMultipleTrade[],
	round = -1,
	useNet = true,
): { largestWin: number | null; largestLoss: number | null } => {
	const rMultiples = getRMultiples(trades, useNet)
	const winningRs = rMultiples.filter(r => r > 0)
	const losingRs = rMultiples.filter(r => r < 0)
	const largestWin = winningRs.length > 0 ? Math.max(...winningRs) : null
	const largestLoss = losingRs.length > 0 ? Math.min(...losingRs) : null
	if (round < 0) return { largestWin, largestLoss }
	return {
		largestWin: largestWin === null ? null : _round(largestWin, round),
		largestLoss: largestLoss === null ? null : _round(largestLoss, round),
	}
}

// Total Profit / Loss en R
// totalLoss est retourné en valeur négative (pertes = R négatifs)
export const getTotalProfitLossInR = (
	trades: RMultipleTrade[],
	round = -1,
	useNet = true,
): { totalProfit: number; totalLoss: number } => {
	const rMultiples = getRMultiples(trades, useNet)
	const winningRs = rMultiples.filter(r => r > 0)
	const losingRs = rMultiples.filter(r => r < 0)
	const totalProfit = winningRs.reduce((acc, r) => acc + r, 0)
	const totalLoss = losingRs.reduce((acc, r) => acc + r, 0)
	if (round < 0) return { totalProfit, totalLoss }
	return { totalProfit: _round(totalProfit, round), totalLoss: _round(totalLoss, round) }
}
