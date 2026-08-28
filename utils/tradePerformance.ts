import type { TradeExtendedType } from '~/schema/trade'
import { KnownTradeMetadataSchema } from '~/schema/tradeMetadata'
import {
	getAPPT,
	getAvgTradeDuration,
	getBreakevenTradesMetrics,
	getCalmarRatio,
	getExpectancy,
	getLosingTradesMetrics,
	getMaxDrawdownWithDates,
	getMaxLosingStreak,
	getMaxRunUpWithDates,
	getMaxTradeDuration,
	getMaxWinningStreak,
	getPLRatio,
	getPNL,
	getProfitFactor,
	getRecoveryFactor,
	getSharpeRatio,
	getSortinoRatio,
	getSQN,
	getTotalContracts,
	getUlcerIndex,
	getWinningTradesMetrics,
	getWinrate,
	sortTradesByCloseDate,
} from '~/utils/tradeStats'
import {
	countTradesWithStopLoss,
	getAPPTInR,
	getAvgWinLossInR,
	getLargestWinLossInR,
	getPLRatioInR,
	getProfitFactorInR,
	getRMultipleCoverage,
	getRMultipleReliability,
	getRMultiples,
	getTotalProfitLossInR,
	getTotalRMultiple,
	type RMultipleReliability,
	type RMultipleTrade,
} from '~/utils/rMultiple'

export type TradePerformanceOptions = {
	useNet: boolean
	round: number
	pnlRound: number
}

export type RPerformance = {
	coverage: number
	reliability: RMultipleReliability
	tradesWithStopLoss: number
	tradesWithRMultiple: number
	totalR: number | null
	apptR: number | null
	profitFactorR: number | null
	plRatioR: number | null
	avgWinR: number | null
	avgLossR: number | null
	largestWinR: number | null
	largestLossR: number | null
	totalProfitR: number | null
	totalLossR: number | null
	sqn: number
}

export type TradePerformance = {
	sortedTrades: TradeExtendedType[]
	pnl: number
	appt: number
	plRatio: number
	winrate: number
	profitFactor: number
	recoveryFactor: number
	sharpeRatio: number
	sortinoRatio: number
	calmarRatio: number
	ulcerIndex: number
	tradesCount: number
	grossPnl: number
	totalContracts: number
	avgTradeDuration: number
	maxTradeDuration: number
	expectancy: number
	totalCommission: number
	winning: ReturnType<typeof getWinningTradesMetrics>
	losing: ReturnType<typeof getLosingTradesMetrics>
	breakeven: ReturnType<typeof getBreakevenTradesMetrics>
	runUp: ReturnType<typeof getMaxRunUpWithDates>
	drawdown: ReturnType<typeof getMaxDrawdownWithDates>
	maxWinningStreak: number
	maxLosingStreak: number
	r: RPerformance
}

const getRMultipleMetadata = (metadata: unknown): Record<string, unknown> | null => {
	let parsedMetadata = metadata
	if (typeof metadata === 'string') {
		try {
			parsedMetadata = JSON.parse(metadata) as unknown
		} catch {
			return null
		}
	}
	const parsed = KnownTradeMetadataSchema.safeParse(parsedMetadata)
	return parsed.success ? parsed.data : null
}

const toRMultipleTrades = (trades: TradeExtendedType[]): RMultipleTrade[] => trades.map(trade => ({
	profit: trade.profit,
	netProfit: trade.netProfit,
	openPrice: trade.openPrice,
	closePrice: trade.closePrice,
	stopLoss: trade.stopLoss || 0,
	type: trade.type,
	metadata: getRMultipleMetadata(trade.metadata),
}))

const calculateRPerformance = (trades: TradeExtendedType[], options: TradePerformanceOptions): RPerformance => {
	const rTrades = toRMultipleTrades(trades)
	const reliability = getRMultipleReliability(rTrades)
	const rMultiples = reliability === 'none' ? [] : getRMultiples(rTrades, options.useNet)
	const hasRMultiples = rMultiples.length > 0
	const avgWinLoss = hasRMultiples ? getAvgWinLossInR(rTrades, options.round, options.useNet) : null
	const largestWinLoss = hasRMultiples ? getLargestWinLossInR(rTrades, options.round, options.useNet) : null
	const totalProfitLoss = hasRMultiples ? getTotalProfitLossInR(rTrades, options.round, options.useNet) : null
	return {
		coverage: getRMultipleCoverage(rTrades),
		reliability,
		tradesWithStopLoss: countTradesWithStopLoss(rTrades),
		tradesWithRMultiple: rMultiples.length,
		totalR: hasRMultiples ? getTotalRMultiple(rTrades, options.round, options.useNet) : null,
		apptR: hasRMultiples ? getAPPTInR(rTrades, options.round, options.useNet) : null,
		profitFactorR: hasRMultiples ? getProfitFactorInR(rTrades, options.round, options.useNet) : null,
		plRatioR: hasRMultiples ? getPLRatioInR(rTrades, options.round, options.useNet) : null,
		avgWinR: avgWinLoss?.avgWin ?? null,
		avgLossR: avgWinLoss?.avgLoss ?? null,
		largestWinR: largestWinLoss?.largestWin ?? null,
		largestLossR: largestWinLoss?.largestLoss ?? null,
		totalProfitR: totalProfitLoss?.totalProfit ?? null,
		totalLossR: totalProfitLoss?.totalLoss ?? null,
		sqn: hasRMultiples ? getSQN(rMultiples, options.round) : 0,
	}
}

export const calculateTradePerformance = (trades: TradeExtendedType[], options: TradePerformanceOptions): TradePerformance => {
	const sortedTrades = sortTradesByCloseDate(trades)
	return {
		sortedTrades,
		pnl: getPNL(sortedTrades, options.pnlRound, options.useNet),
		appt: getAPPT(sortedTrades, true, options.round, options.useNet),
		plRatio: getPLRatio(sortedTrades, options.round, options.useNet),
		winrate: getWinrate(sortedTrades, options.round, options.useNet),
		profitFactor: getProfitFactor(sortedTrades, options.round, options.useNet),
		recoveryFactor: getRecoveryFactor(sortedTrades, options.round, options.useNet),
		sharpeRatio: getSharpeRatio(sortedTrades, 0, options.round, options.useNet),
		sortinoRatio: getSortinoRatio(sortedTrades, 0, options.round, options.useNet),
		calmarRatio: getCalmarRatio(sortedTrades, options.round, options.useNet),
		ulcerIndex: getUlcerIndex(sortedTrades, options.round, options.useNet),
		tradesCount: sortedTrades.length,
		grossPnl: getPNL(sortedTrades, options.round, options.useNet),
		totalContracts: getTotalContracts(sortedTrades),
		avgTradeDuration: getAvgTradeDuration(sortedTrades, options.round),
		maxTradeDuration: getMaxTradeDuration(sortedTrades, options.round),
		expectancy: getExpectancy(sortedTrades, options.round, options.useNet),
		totalCommission: sortedTrades.reduce((sum, trade) => sum + (trade.commission || 0), 0),
		winning: getWinningTradesMetrics(sortedTrades, options.useNet),
		losing: getLosingTradesMetrics(sortedTrades, options.useNet),
		breakeven: getBreakevenTradesMetrics(sortedTrades, options.useNet),
		runUp: getMaxRunUpWithDates(sortedTrades, options.useNet),
		drawdown: getMaxDrawdownWithDates(sortedTrades, options.useNet),
		maxWinningStreak: getMaxWinningStreak(sortedTrades, options.useNet),
		maxLosingStreak: getMaxLosingStreak(sortedTrades, options.useNet),
		r: calculateRPerformance(sortedTrades, options),
	}
}
