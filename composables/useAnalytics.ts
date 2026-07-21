import type { TradeExtendedType } from '~/schema/trade'
import type { BreakdownDimension } from '~/type'
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
	// Métriques additionnelles pour les widgets configurables
	expectancy: number
	// Max drawdown : pire creux depuis un peak (négatif ou 0)
	drawdown: number
	// Drawdown actuel : distance entre le dernier peak et le P&L cumulé actuel (négatif ou 0)
	// Si on est à un nouveau peak, currentDrawdown = 0
	currentDrawdown: number
}

// Fonction de grouping : retourne la/les clé(s) d'un trade
// Un trade peut appartenir à plusieurs groupes (ex: multi-tags) → retourne un tableau
export type GroupFn = (trade: TradeExtendedType) => string[]

// Calcule le max drawdown et le drawdown actuel d'une série de trades (triés par date)
// dd = max(peak - cumulative) — négatif ou 0
// Retourne [maxDrawdown, currentDrawdown]
const calculateDrawdowns = (trades: TradeExtendedType[], pnlField: 'netProfit' | 'profit'): { maxDrawdown: number, currentDrawdown: number } => {
	if (trades.length === 0) return { maxDrawdown: 0, currentDrawdown: 0 }
	const sorted = [...trades].sort((a, b) => new Date(a.openDate).getTime() - new Date(b.openDate).getTime())
	let peak = 0
	let cumulative = 0
	let maxDd = 0
	for (const t of sorted) {
		cumulative += t[pnlField] || 0
		if (cumulative > peak) peak = cumulative
		const dd = cumulative - peak
		if (dd < maxDd) maxDd = dd
	}
	// currentDrawdown = distance entre le dernier peak et le cumul actuel
	const currentDrawdown = cumulative - peak
	return { maxDrawdown: maxDd, currentDrawdown }
}

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
	const pnlField = useNet ? 'netProfit' : 'profit'

	for (const [key, groupTrades] of tradesByKey) {
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

		// Expectancy = (winrate * avgWin) - (lossrate * avgLoss)
		const lossRate = tradesCount > 0 ? losingTradesCount / tradesCount : 0
		const winRate = tradesCount > 0 ? winningTradesCount / tradesCount : 0
		const expectancy = (winRate * avgWin) - (lossRate * avgLoss)

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

		const { maxDrawdown, currentDrawdown } = calculateDrawdowns(groupTrades, pnlField)

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
			expectancy,
			drawdown: maxDrawdown,
			currentDrawdown,
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

// By Month : 'YYYY-MM'
export const groupByMonth: GroupFn = (t) => {
	const d = new Date(t.openDate)
	return [`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`]
}

// By Day of Week : 'Monday', 'Tuesday'... (utilise le timezone utilisateur)
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const groupByDayOfWeek: GroupFn = (t) => {
	const { weekday } = getHourAndWeekdayInUserTimezone(new Date(t.openDate))
	return [dayNames[weekday]]
}

// By Hour : '08h', '09h'... (utilise le timezone utilisateur)
export const groupByHour: GroupFn = (t) => {
	const { hour } = getHourAndWeekdayInUserTimezone(new Date(t.openDate))
	return [`${String(hour).padStart(2, '0')}h`]
}

// By Account : nom du compte
export const groupByAccount: GroupFn = (t) => [t.account_displayName || 'Unknown']

// Map dimension → groupFn (utilisé par BreakdownWidget)
export const dimensionGroupFns: Record<BreakdownDimension, GroupFn> = {
	ticker: groupByTicker,
	tag: groupByTag,
	side: groupBySide,
	month: groupByMonth,
	dayOfWeek: groupByDayOfWeek,
	hour: groupByHour,
	account: groupByAccount,
}

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
