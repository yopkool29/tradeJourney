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

export const useAnalytics = () => {
	const calculateMetricsByTicker = (trades: TradeExtendedType[], useNet: boolean = true): TickerMetrics[] => {
		const tradesByTicker = new Map<string, TradeExtendedType[]>()

		// Grouper les trades par ticker
		for (const trade of trades) {
			const symbol = trade.symbol || 'Unknown'
			if (!tradesByTicker.has(symbol)) {
				tradesByTicker.set(symbol, [])
			}
			tradesByTicker.get(symbol)!.push(trade)
		}

		// Calculer les métriques pour chaque ticker
		const metrics: TickerMetrics[] = []

		for (const [symbol, tickerTrades] of tradesByTicker) {
			const winningTrades = tickerTrades.filter(t => (t.netProfit || 0) > 0)
			const losingTrades = tickerTrades.filter(t => (t.netProfit || 0) < 0)
			const breakevenTrades = tickerTrades.filter(t => (t.netProfit || 0) === 0)

			const pnl = tickerTrades.reduce((sum, t) => sum + (t.netProfit || 0), 0)
			const totalProfit = winningTrades.reduce((sum, t) => sum + (t.netProfit || 0), 0)
			const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.netProfit || 0), 0))

			const winningTradesCount = winningTrades.length
			const losingTradesCount = losingTrades.length
			const tradesCount = tickerTrades.length

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

			const avgDuration = tickerTrades.length > 0
				? tickerTrades.reduce((sum, t) => {
					const open = new Date(t.openDate).getTime()
					const close = new Date(t.closeDate).getTime()
					const durationMinutes = (close - open) / (1000 * 60)
					return sum + durationMinutes
				}, 0) / tickerTrades.length
				: 0

			// MFE/MAE moyens (uniquement sur les trades qui ont ces valeurs)
			const tradesWithMfe = tickerTrades.filter(t => t.mfe !== null && t.mfe !== undefined)
			const tradesWithMae = tickerTrades.filter(t => t.mae !== null && t.mae !== undefined)

			const avgMfe = tradesWithMfe.length > 0
				? tradesWithMfe.reduce((sum, t) => sum + (t.mfe || 0), 0) / tradesWithMfe.length
				: null

			const avgMae = tradesWithMae.length > 0
				? tradesWithMae.reduce((sum, t) => sum + (t.mae || 0), 0) / tradesWithMae.length
				: null

			metrics.push({
				symbol,
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
				losingTradesCount
			})
		}

		// Trier par PnL décroissant
		return metrics.sort((a, b) => b.pnl - a.pnl)
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
		for (let weekday = 1; weekday <= 5; weekday++) {
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
