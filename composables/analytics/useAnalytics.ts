import type { TradeExtendedType } from '~/schema/trade'
import { getHourAndWeekdayInUserTimezone } from '~/utils/date-utils'
import type { BreakdownMetrics } from '~/composables/analytics/breakdownMetrics'
import {
	groupByTicker,
} from '~/composables/analytics/useBreakdownGrouping'
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

// Settings de timezone passés aux fonctions de grouping temporel
export interface TimezoneSettings {
	timezoneDisplay: 'CURRENT' | 'LOCAL' | 'UTC'
	timezoneLocal: string
	timezoneUtcOffset: number
}

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

const calculateMetricsForGroup = (
	key: string,
	groupTrades: TradeExtendedType[],
	useNet: boolean,
	includeExcursions: boolean,
): BreakdownMetrics => {
	const pnlField = useNet ? 'netProfit' : 'profit'
	const winningTrades = groupTrades.filter(trade => (trade[pnlField] || 0) > 0)
	const losingTrades = groupTrades.filter(trade => (trade[pnlField] || 0) < 0)
	const pnl = groupTrades.reduce((sum, trade) => sum + (trade[pnlField] || 0), 0)
	const totalProfit = winningTrades.reduce((sum, trade) => sum + (trade[pnlField] || 0), 0)
	const totalLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + (trade[pnlField] || 0), 0))
	const winningTradesCount = winningTrades.length
	const losingTradesCount = losingTrades.length
	const tradesCount = groupTrades.length
	const winrate = tradesCount > 0 ? (winningTradesCount / tradesCount) * 100 : 0
	const avgWin = winningTradesCount > 0 ? totalProfit / winningTradesCount : 0
	const avgLoss = losingTradesCount > 0 ? totalLoss / losingTradesCount : 0
	const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0
	const lossRate = tradesCount > 0 ? losingTradesCount / tradesCount : 0
	const winRate = tradesCount > 0 ? winningTradesCount / tradesCount : 0
	const expectancy = (winRate * avgWin) - (lossRate * avgLoss)
	const avgDuration = groupTrades.length > 0
		? groupTrades.reduce((sum, trade) => {
			const open = new Date(trade.openDate).getTime()
			const close = new Date(trade.closeDate).getTime()
			return sum + (close - open) / (1000 * 60)
		}, 0) / groupTrades.length
		: 0
	const tradesWithMfe = includeExcursions ? groupTrades.filter(trade => trade.mfe !== null && trade.mfe !== undefined) : []
	const tradesWithMae = includeExcursions ? groupTrades.filter(trade => trade.mae !== null && trade.mae !== undefined) : []
	const avgMfe = tradesWithMfe.length > 0
		? tradesWithMfe.reduce((sum, trade) => sum + (trade.mfe || 0), 0) / tradesWithMfe.length
		: null
	const avgMae = tradesWithMae.length > 0
		? tradesWithMae.reduce((sum, trade) => sum + (trade.mae || 0), 0) / tradesWithMae.length
		: null
	const { maxDrawdown, currentDrawdown } = calculateDrawdowns(groupTrades, pnlField)

	return {
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
	}
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
		for (const key of groupFn(trade)) {
			const groupTrades = tradesByKey.get(key) || []
			groupTrades.push(trade)
			tradesByKey.set(key, groupTrades)
		}
	}
	return [...tradesByKey].map(([key, groupTrades]) => calculateMetricsForGroup(key, groupTrades, useNet, true))
		.sort((a, b) => b.pnl - a.pnl)
}

// Grouping 2D pour la heatmap : groupe par 2 dimensions et calcule les métriques pour chaque cellule
export interface HeatmapCell2D {
	keyX: string
	keyY: string
	metrics: BreakdownMetrics
}

export const calculateMetricsBy2Dimensions = (
	trades: TradeExtendedType[],
	groupFnX: GroupFn,
	groupFnY: GroupFn,
	useNet: boolean = true,
): HeatmapCell2D[] => {
	const tradesByKeys = new Map<string, { x: string, y: string, trades: TradeExtendedType[] }>()
	for (const trade of trades) {
		for (const x of groupFnX(trade)) {
			for (const y of groupFnY(trade)) {
				const cellKey = `${x}|||${y}`
				const cell = tradesByKeys.get(cellKey) || { x, y, trades: [] }
				cell.trades.push(trade)
				tradesByKeys.set(cellKey, cell)
			}
		}
	}
	return [...tradesByKeys.values()].map(({ x, y, trades: groupTrades }) => ({
		keyX: x,
		keyY: y,
		metrics: calculateMetricsForGroup(`${x}|||${y}`, groupTrades, useNet, false),
	}))
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
