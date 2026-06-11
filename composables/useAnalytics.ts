import type { TradeExtendedType } from '~/schema/trade'

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
