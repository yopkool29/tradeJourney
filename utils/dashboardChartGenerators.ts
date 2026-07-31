import { getPNL, getAPPT, getWinrate, movingAverage, getPLRatio as calculatePLRatio } from './tradeStats'
import type { TradeType } from '~/schema/trade'
import type { SettingsContentType } from '~/schema/user'
import { formatDateByMode, groupTradesByPeriod } from './dashboard'

// Génère les données pour un graphique d'évolution du PnL intraday
export const generateIntradayPnlChartData = (trades: TradeType[]): Array<{ count: number; pnl: number; date?: Date }> => {
	if (!trades || trades.length === 0) return []

	let cumulativePnl = 0
	let count = 0
	const dataPoints: Array<{ count: number; pnl: number; date?: Date }> = trades.map(trade => {
		cumulativePnl += trade.profit || 0
		count++
		return { count, date: trade.closeDate, pnl: parseFloat(cumulativePnl.toFixed(2)) }
	})

	if (dataPoints.length > 0) {
		dataPoints.unshift({ count: 0, date: undefined, pnl: 0 })
	}

	return dataPoints
}

// Génère les données pour le graphique de PnL cumulé
export const generateCumulatedPnlChartData = (trades: TradeType[], mode: 'day' | 'week' | 'month' | 'year', useNet: boolean, settings: Partial<SettingsContentType> | null, preGroupedTrades?: Record<string, TradeType[]>) => {
	if (!trades || trades.length === 0) {
		return {
			labels: [],
			datasets: [
				{ type: 'line' as const, label: 'Cumulé', data: [], borderColor: '', backgroundColor: '', fill: false, tension: 0.2, pointRadius: 4, pointBackgroundColor: [], pointBorderColor: [], pointBorderWidth: 2, yAxisID: 'y' },
				{ type: 'bar' as const, label: 'PnL', data: [], backgroundColor: '', borderRadius: 4, barPercentage: 0.6 },
			]
		}
	}

	const groupedTrades = preGroupedTrades ?? groupTradesByPeriod(trades, mode, settings)
	const periods = Object.keys(groupedTrades).sort()

	const periodPnl = periods.map(period => getPNL(groupedTrades[period], 2, useNet))

	const cumulatedPnl: number[] = []
	let cumulated = 0
	periodPnl.forEach(pnl => { cumulated += pnl; cumulatedPnl.push(cumulated) })

	const formattedLabels = periods.map(period => formatDateByMode(period, mode, false))

	return {
		labels: formattedLabels,
		datasets: [
			{ type: 'line' as const, label: 'Cumulé', data: cumulatedPnl, borderColor: '#facc15', backgroundColor: '#facc15', fill: false, tension: 0.2, pointRadius: 4, pointBackgroundColor: '#facc15', yAxisID: 'y' },
			{ type: 'bar' as const, label: 'PnL', data: periodPnl, backgroundColor: '#38bdf8', borderRadius: 4, barPercentage: 0.6 },
		]
	}
}

// Génère les données pour le graphique APPT
export const generateApptChartData = (trades: TradeType[], mode: 'day' | 'week' | 'month' | 'year', movingAvgWindow: number, useNet: boolean, settings: Partial<SettingsContentType> | null, preGroupedTrades?: Record<string, TradeType[]>) => {
	if (!trades || trades.length === 0) {
		return {
			labels: [],
			datasets: [
				{ type: 'line' as const, label: 'Moyenne mobile', data: [], borderColor: '#6366f1', backgroundColor: '#6366f133', fill: false, tension: 0.2, pointRadius: 3, pointBackgroundColor: '#6366f1', yAxisID: 'y' },
				{ type: 'bar' as const, label: 'APPT', data: [], backgroundColor: '', borderRadius: 4, barPercentage: 0.6 },
			]
		}
	}

	const groupedTrades = preGroupedTrades ?? groupTradesByPeriod(trades, mode, settings)
	const periods = Object.keys(groupedTrades).sort()

	const periodAppt = periods.map(period => getAPPT(groupedTrades[period], true, 2, useNet))
	const formattedLabels = periods.map(period => formatDateByMode(period, mode))
	const movingAverages = movingAverage(periodAppt, movingAvgWindow)

	return {
		labels: formattedLabels,
		datasets: [
			{ type: 'line' as const, label: `Moyenne mobile (${movingAvgWindow})`, data: movingAverages, borderColor: '#6366f1', backgroundColor: '#6366f133', fill: false, tension: 0.2, pointRadius: 3, pointBackgroundColor: '#6366f1', yAxisID: 'y' },
			{ type: 'bar' as const, label: 'APPT', data: periodAppt, backgroundColor: '#4ade80', borderRadius: 4, barPercentage: 0.6 },
		]
	}
}

// Génère les données pour le graphique de P/L Ratio
export const generatePlRatioChartData = (trades: TradeType[], mode: 'day' | 'week' | 'month' | 'year', movingAvgWindow: number, settings: Partial<SettingsContentType> | null) => {
	if (!trades || trades.length === 0) {
		return {
			labels: [],
			datasets: [
				{ type: 'line' as const, label: 'Moyenne mobile', data: [], borderColor: '#6366f1', backgroundColor: '#6366f133', fill: false, tension: 0.2, pointRadius: 3, pointBackgroundColor: '#6366f1', yAxisID: 'y' },
				{ type: 'bar' as const, label: 'P/L Ratio', data: [], backgroundColor: '#f59e0b', borderRadius: 4, barPercentage: 0.6 },
			]
		}
	}

	const groupedTrades = groupTradesByPeriod(trades, mode, settings)
	const periods = Object.keys(groupedTrades).sort()

	const periodPlRatio = periods.map(period => calculatePLRatio(groupedTrades[period], 2))
	const formattedLabels = periods.map(period => formatDateByMode(period, mode))
	const movingAverages = movingAverage(periodPlRatio, movingAvgWindow)

	return {
		labels: formattedLabels,
		datasets: [
			{ type: 'line' as const, label: `Moyenne mobile (${movingAvgWindow})`, data: movingAverages, borderColor: '#6366f1', backgroundColor: '#6366f133', fill: false, tension: 0.2, pointRadius: 3, pointBackgroundColor: '#6366f1', yAxisID: 'y' },
			{ type: 'bar' as const, label: 'P/L Ratio', data: periodPlRatio, backgroundColor: '#f59e0b', borderRadius: 4, barPercentage: 0.6 },
		]
	}
}

// Génère les données pour le graphique Winrate
export const generateWinrateChartData = (trades: TradeType[], mode: 'day' | 'week' | 'month' | 'year', movingAvgWindow: number, useNet: boolean, settings: Partial<SettingsContentType> | null, preGroupedTrades?: Record<string, TradeType[]>) => {
	if (!trades || trades.length === 0) {
		return {
			labels: [],
			datasets: [
				{ type: 'bar' as const, label: 'Winrate', data: [], backgroundColor: '', borderRadius: 4, barPercentage: 0.6 },
			]
		}
	}

	const groupedTrades = preGroupedTrades ?? groupTradesByPeriod(trades, mode, settings)
	const periods = Object.keys(groupedTrades).sort()

	const periodWinrate = periods.map(period => getWinrate(groupedTrades[period], 2, useNet))
	const formattedLabels = periods.map(period => formatDateByMode(period, mode))
	const winrateMovingAvg = movingAverage(periodWinrate, movingAvgWindow)

	return {
		labels: formattedLabels,
		datasets: [
			{ type: 'line' as const, label: `Moyenne mobile (${movingAvgWindow})`, data: winrateMovingAvg, borderColor: '#6366f1', backgroundColor: '#6366f133', fill: false, tension: 0.2, pointRadius: 3, pointBackgroundColor: '#6366f1', yAxisID: 'y' },
			{ type: 'bar' as const, label: 'Winrate', data: periodWinrate, backgroundColor: '#f472b6', borderRadius: 4, barPercentage: 0.6 },
		]
	}
}
