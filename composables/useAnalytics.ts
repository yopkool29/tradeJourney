import type { TradeExtendedType } from '~/schema/trade'
import { getHourAndWeekdayInUserTimezone } from '~/utils/date-utils'

export interface TickerMetrics {
	symbol: string
	pnl: number
	winrate: number
	tradesCount: number
	avgWin: number
	avgLoss: number
	profitFactor: number
	avgDuration: number
	avgMfe: number | null
	avgMae: number | null
	winningTradesCount: number
	losingTradesCount: number
}

// Métriques génériques pour un breakdown par dimension (ticker, tag, side, month, etc.)
// 'key' remplace 'symbol' — c'est le label du groupe (ex: 'AAPL', 'breakout', 'Long', '2024-01')
export interface BreakdownMetrics {
	key: string
	pnl: number
	winrate: number
	tradesCount: number
	avgWin: number
	avgLoss: number
	profitFactor: number
	avgDuration: number
	avgMfe: number | null
	avgMae: number | null
	winningTradesCount: number
	losingTradesCount: number
}

// Fonction de grouping : retourne la/les clé(s) d'un trade
// Un trade peut appartenir à plusieurs groupes (ex: multi-tags) → retourne un tableau
export type GroupFn = (trade: TradeExtendedType) => string[]

// Calcule les métriques pour un ensemble de trades groupés par dimension
// groupFn détermine la dimension (ticker, tag, side, month, day of week...)
export const calculateMetricsByDimension = (
	trades: TradeExtendedType[],
	groupFn: GroupFn,
	useNet: boolean = true,
): BreakdownMetrics[] => {
	const tradesByKey = new Map<string, TradeExtendedType[]>()

	for (const trade of trades) {
		const keys = groupFn(trade)
		for (const key of keys) {
			if (!tradesByKey.has(key)) {
				tradesByKey.set(key, [])
			}
			tradesByKey.get(key)!.push(trade)
		}
	}

	const metrics: BreakdownMetrics[] = []

	for (const [key, groupTrades] of tradesByKey) {
		const pnlField = useNet ? 'netProfit' : 'profit'
		const winningTrades = groupTrades.filter(t => (t[pnlField] || 0) > 0)
		const losingTrades = groupTrades.filter(t => (t[pnlField] || 0) < 0)

		const pnl = groupTrades.reduce((sum, t) => sum + (t[pnlField] || 0), 0)
		const totalProfit = winningTrades.reduce((sum, t) => sum + (t[pnlField] || 0), 0)
		const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t[pnlField] || 0), 0))

		const winningTradesCount = winningTrades.length
		const losingTradesCount = losingTrades.length
		const tradesCount = groupTrades.length

		const winrate = tradesCount > 0 ? (winningTradesCount / tradesCount) * 100 : 0

		const avgWin = winningTradesCount > 0 ? totalProfit / winningTradesCount : 0
		const avgLoss = losingTradesCount > 0 ? totalLoss / losingTradesCount : 0

		const profitFactor = totalLoss > 0
			? totalProfit / totalLoss
			: totalProfit > 0 ? Infinity : 0

		const avgDuration = groupTrades.length > 0
			? groupTrades.reduce((sum, t) => {
				const open = new Date(t.openDate).getTime()
				const close = new Date(t.closeDate).getTime()
				return sum + (close - open) / (1000 * 60)
			}, 0) / groupTrades.length
			: 0

		const tradesWithMfe = groupTrades.filter(t => t.mfe !== null && t.mfe !== undefined)
		const tradesWithMae = groupTrades.filter(t => t.mae !== null && t.mae !== undefined)

		const avgMfe = tradesWithMfe.length > 0
			? tradesWithMfe.reduce((sum, t) => sum + (t.mfe || 0), 0) / tradesWithMfe.length
			: null

		const avgMae = tradesWithMae.length > 0
			? tradesWithMae.reduce((sum, t) => sum + (t.mae || 0), 0) / tradesWithMae.length
			: null

		metrics.push({
			key,
			pnl,
			winrate,
			tradesCount,
			avgWin,
			avgLoss,
			profitFactor,
			avgDuration,
			avgMfe,
			avgMae,
			winningTradesCount,
			losingTradesCount,
		})
	}

	return metrics.sort((a, b) => b.pnl - a.pnl)
}

// Fonctions de grouping par dimension
export const groupByTicker: GroupFn = (t) => [t.symbol || 'Unknown']

// By Tag : un trade avec plusieurs tags compte dans chaque groupe (overlap)
// Un trade sans tag va dans 'untagged'
export const groupByTag: GroupFn = (t) => {
	if (!t.tags || t.tags.length === 0) return ['untagged']
	return t.tags.map(tag => tag.name)
}

// By Side : Long (buy) / Short (sell)
export const groupBySide: GroupFn = (t) => [t.type === 'buy' ? 'Long' : 'Short']

export const useAnalytics = () => {
	// calculateMetricsByTicker délègue au générique calculateMetricsByDimension
	// (compatibilité avec l'existant — TickerBreakdownTable utilise encore TickerMetrics)
	const calculateMetricsByTicker = (trades: TradeExtendedType[], useNet: boolean = true): TickerMetrics[] => {
		return calculateMetricsByDimension(trades, groupByTicker, useNet)
			.map(m => ({ ...m, symbol: m.key }))
	}

	return {
		calculateMetricsByTicker
	}
}

export interface HourlyMetrics {
	hour: number
	pnl: number
	winrate: number
	tradesCount: number
	avgWin: number
	avgLoss: number
	profitFactor: number
	winningTradesCount: number
	losingTradesCount: number
}

export interface HourlyHeatmapCell {
	hour: number
	weekday: number
	pnl: number
	tradesCount: number
	winrate: number
}

export const calculateMetricsByHour = (
	trades: TradeExtendedType[],
	useNet: boolean = true,
	timezoneMode: 'CURRENT' | 'LOCAL' | 'UTC' = 'CURRENT',
	timezoneLocal: string = 'Europe/Paris',
	timezoneUtcOffset: number = 0
): HourlyMetrics[] => {
	const tradesByHour = new Map<number, TradeExtendedType[]>()

	for (const trade of trades) {
		const { hour } = getHourAndWeekdayInUserTimezone(trade.openDate, timezoneMode, timezoneLocal, timezoneUtcOffset)
		if (!tradesByHour.has(hour)) {
			tradesByHour.set(hour, [])
		}
		tradesByHour.get(hour)!.push(trade)
	}

	const metrics: HourlyMetrics[] = []

	for (let hour = 0; hour < 24; hour++) {
		const hourTrades = tradesByHour.get(hour) || []

		const winningTrades = hourTrades.filter(t => (t.netProfit || 0) > 0)
		const losingTrades = hourTrades.filter(t => (t.netProfit || 0) < 0)

		const pnl = hourTrades.reduce((sum, t) => sum + (t.netProfit || 0), 0)
		const totalProfit = winningTrades.reduce((sum, t) => sum + (t.netProfit || 0), 0)
		const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.netProfit || 0), 0))

		const winningTradesCount = winningTrades.length
		const losingTradesCount = losingTrades.length
		const tradesCount = hourTrades.length

		const winrate = tradesCount > 0 ? (winningTradesCount / tradesCount) * 100 : 0

		const avgWin = winningTradesCount > 0
			? totalProfit / winningTradesCount
			: 0

		const avgLoss = losingTradesCount > 0
			? totalLoss / losingTradesCount
			: 0

		const profitFactor = totalLoss > 0
			? totalProfit / totalLoss
			: totalProfit > 0 ? Infinity : 0

		metrics.push({
			hour,
			pnl,
			winrate,
			tradesCount,
			avgWin,
			avgLoss,
			profitFactor,
			winningTradesCount,
			losingTradesCount
		})
	}

	return metrics
}

export const calculateHourlyHeatmapData = (
	trades: TradeExtendedType[],
	timezoneMode: 'CURRENT' | 'LOCAL' | 'UTC' = 'CURRENT',
	timezoneLocal: string = 'Europe/Paris',
	timezoneUtcOffset: number = 0
): HourlyHeatmapCell[] => {
	const tradesByHourDay = new Map<string, TradeExtendedType[]>()

	for (const trade of trades) {
		const { hour, weekday } = getHourAndWeekdayInUserTimezone(trade.openDate, timezoneMode, timezoneLocal, timezoneUtcOffset)
		const key = `${hour}-${weekday}`
		if (!tradesByHourDay.has(key)) {
			tradesByHourDay.set(key, [])
		}
		tradesByHourDay.get(key)!.push(trade)
	}

	const cells: HourlyHeatmapCell[] = []

	for (let hour = 0; hour < 24; hour++) {
		for (let weekday = 1; weekday <= 7; weekday++) {
			const key = `${hour}-${weekday}`
			const cellTrades = tradesByHourDay.get(key) || []

			const winningTrades = cellTrades.filter(t => (t.netProfit || 0) > 0)
			const tradesCount = cellTrades.length
			const winrate = tradesCount > 0 ? (winningTrades.length / tradesCount) * 100 : 0
			const pnl = cellTrades.length > 0
				? cellTrades.reduce((sum, t) => sum + (t.netProfit || 0), 0) / cellTrades.length
				: 0

			cells.push({
				hour,
				weekday,
				pnl,
				tradesCount,
				winrate
			})
		}
	}

	return cells
}
