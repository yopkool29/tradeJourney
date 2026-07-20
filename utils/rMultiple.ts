import { round as _round } from '~/utils'

// Trade minimal pour le calcul du R-multiple
export interface RMultipleTrade {
	profit: number
	netProfit: number
	metadata?: unknown
}

// Compte minimal pour la résolution du plannedRisk
export interface RMultipleAccount {
	id: number
	metadata?: unknown
}

// Extrait le plannedRisk d'un objet metadata (JSON libre)
// Retourne null si absent, vide, ou invalide
export const extractPlannedRiskFromMetadata = (metadata: unknown): number | null => {
	if (!metadata) return null
	const meta = (typeof metadata === 'string' ? safeParse(metadata) : metadata) as Record<string, unknown> | null
	if (!meta) return null
	const val = meta.plannedRisk
	if (val === null || val === undefined || val === '') return null
	const num = Number(val)
	return isNaN(num) ? null : num
}

// Extrait le defaultPlannedRisk d'un compte (clé différente du trade)
export const extractDefaultPlannedRiskFromAccount = (metadata: unknown): number | null => {
	if (!metadata) return null
	const meta = (typeof metadata === 'string' ? safeParse(metadata) : metadata) as Record<string, unknown> | null
	if (!meta) return null
	const val = meta.defaultPlannedRisk
	if (val === null || val === undefined || val === '') return null
	const num = Number(val)
	return isNaN(num) ? null : num
}

const safeParse = (s: string): unknown => {
	try {
		return JSON.parse(s)
	} catch {
		return null
	}
}

// Résout le plannedRisk pour un trade selon la logique :
// 1. account.defaultPlannedRisk renseigné → override (utilisé pour tous les trades du compte)
// 2. sinon trade.metadata.plannedRisk renseigné → utilisé
// 3. sinon → null (R-multiple non calculable)
export const resolvePlannedRisk = (
	trade: RMultipleTrade,
	account: RMultipleAccount | null | undefined,
): number | null => {
	// 1. Override par compte (defaultPlannedRisk)
	if (account) {
		const accountRisk = extractDefaultPlannedRiskFromAccount(account.metadata)
		if (accountRisk !== null && accountRisk > 0) return accountRisk
	}
	// 2. Trade-level plannedRisk
	const tradeRisk = extractPlannedRiskFromMetadata(trade.metadata)
	if (tradeRisk !== null && tradeRisk > 0) return tradeRisk
	// 3. Non calculable
	return null
}

// Calcule le R-multiple d'un trade : pnl / plannedRisk
// Retourne null si plannedRisk est null/0 (non calculable)
export const getRMultiple = (
	trade: RMultipleTrade,
	account: RMultipleAccount | null | undefined,
	useNet = true,
): number | null => {
	const plannedRisk = resolvePlannedRisk(trade, account)
	if (plannedRisk === null || plannedRisk === 0) return null
	const pnl = useNet ? trade.netProfit : trade.profit
	return pnl / plannedRisk
}

// Filtre les trades qui ont un R-multiple calculable
// et retourne les R-multiples
export const getRMultiples = (
	trades: RMultipleTrade[],
	accountByTradeId: (trade: RMultipleTrade, index: number) => RMultipleAccount | null | undefined,
	useNet = true,
): number[] => {
	return trades
		.map((trade, idx) => getRMultiple(trade, accountByTradeId(trade, idx), useNet))
		.filter((r): r is number => r !== null)
}

// Total P&L en R (somme des R-multiples)
export const getTotalRMultiple = (
	trades: RMultipleTrade[],
	accountByTradeId: (trade: RMultipleTrade, index: number) => RMultipleAccount | null | undefined,
	round = -1,
	useNet = true,
): number => {
	const rMultiples = getRMultiples(trades, accountByTradeId, useNet)
	const total = rMultiples.reduce((acc, r) => acc + r, 0)
	if (round < 0) return total
	return _round(total, round)
}

// APPT en R (R moyen par trade) — expectancy en R
// Attention : ne divise que par les trades qui ont un R-multiple calculable
export const getAPPTInR = (
	trades: RMultipleTrade[],
	accountByTradeId: (trade: RMultipleTrade, index: number) => RMultipleAccount | null | undefined,
	round = -1,
	useNet = true,
): number => {
	const rMultiples = getRMultiples(trades, accountByTradeId, useNet)
	if (rMultiples.length === 0) return 0
	const avg = rMultiples.reduce((acc, r) => acc + r, 0) / rMultiples.length
	if (round < 0) return avg
	return _round(avg, round)
}

// Profit Factor en R : somme des R gagnants / |somme des R perdants|
export const getProfitFactorInR = (
	trades: RMultipleTrade[],
	accountByTradeId: (trade: RMultipleTrade, index: number) => RMultipleAccount | null | undefined,
	round = -1,
	useNet = true,
): number => {
	const rMultiples = getRMultiples(trades, accountByTradeId, useNet)
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
export const getPLRatioInR = (
	trades: RMultipleTrade[],
	accountByTradeId: (trade: RMultipleTrade, index: number) => RMultipleAccount | null | undefined,
	round = -1,
	useNet = true,
): number => {
	const rMultiples = getRMultiples(trades, accountByTradeId, useNet)
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
export const getAvgWinLossInR = (
	trades: RMultipleTrade[],
	accountByTradeId: (trade: RMultipleTrade, index: number) => RMultipleAccount | null | undefined,
	round = -1,
	useNet = true,
): { avgWin: number; avgLoss: number } => {
	const rMultiples = getRMultiples(trades, accountByTradeId, useNet)
	const winningRs = rMultiples.filter(r => r > 0)
	const losingRs = rMultiples.filter(r => r < 0)
	const avgWin = winningRs.length > 0 ? winningRs.reduce((acc, r) => acc + r, 0) / winningRs.length : 0
	const avgLoss = losingRs.length > 0 ? Math.abs(losingRs.reduce((acc, r) => acc + r, 0) / losingRs.length) : 0
	if (round < 0) return { avgWin, avgLoss }
	return { avgWin: _round(avgWin, round), avgLoss: _round(avgLoss, round) }
}

// Largest Win / Loss en R
export const getLargestWinLossInR = (
	trades: RMultipleTrade[],
	accountByTradeId: (trade: RMultipleTrade, index: number) => RMultipleAccount | null | undefined,
	round = -1,
	useNet = true,
): { largestWin: number | null; largestLoss: number | null } => {
	const rMultiples = getRMultiples(trades, accountByTradeId, useNet)
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
export const getTotalProfitLossInR = (
	trades: RMultipleTrade[],
	accountByTradeId: (trade: RMultipleTrade, index: number) => RMultipleAccount | null | undefined,
	round = -1,
	useNet = true,
): { totalProfit: number; totalLoss: number } => {
	const rMultiples = getRMultiples(trades, accountByTradeId, useNet)
	const winningRs = rMultiples.filter(r => r > 0)
	const losingRs = rMultiples.filter(r => r < 0)
	const totalProfit = winningRs.reduce((acc, r) => acc + r, 0)
	const totalLoss = Math.abs(losingRs.reduce((acc, r) => acc + r, 0))
	if (round < 0) return { totalProfit, totalLoss }
	return { totalProfit: _round(totalProfit, round), totalLoss: _round(totalLoss, round) }
}
