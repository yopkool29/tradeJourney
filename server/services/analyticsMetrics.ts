import {
	groupByDayOfWeekOpen,
	groupByHourStart,
	groupByMonthYearOpen,
	groupBySide,
	groupByTag,
	groupByTicker,
} from '~/composables/analytics/useBreakdownGrouping'
import type { GroupFn } from '~/composables/analytics/useBreakdownGrouping'
import type { TimezoneSettings } from '~/composables/analytics/useAnalytics'
import { KnownTradeMetadataSchema } from '~/schema/tradeMetadata'
import {
	getAPPT,
	getAvgTradeDuration,
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
	getAPPTInR,
	getPLRatioInR,
	getProfitFactorInR,
	getRMultipleCoverage,
	getRMultipleReliability,
	getRMultiples,
	getTotalRMultiple,
	type RMultipleTrade,
} from '~/utils/rMultiple'
import type {
	AnalyticsBreakdown,
	AnalyticsBreakdownGroup,
	AnalyticsDimension,
	AnalyticsInterval,
	AnalyticsMetrics,
	AnalyticsMode,
	AnalyticsSummary,
	AnalyticsTrade,
	PnlTimeseries,
} from './analyticsTypes'

const safeNumber = (value: number) => Number.isFinite(value) ? value : 0
const safeRatio = (value: number) => Number.isFinite(value) ? value : null
const useNetForMode = (mode: AnalyticsMode) => mode === 'net'
const utcTimezoneSettings: TimezoneSettings = {
	timezoneDisplay: 'UTC',
	timezoneLocal: 'UTC',
	timezoneUtcOffset: 0,
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

const toRMultipleTrades = (trades: AnalyticsTrade[]): RMultipleTrade[] => trades.map(trade => ({
	profit: trade.profit,
	netProfit: trade.netProfit,
	openPrice: trade.openPrice,
	closePrice: trade.closePrice,
	stopLoss: trade.stopLoss || 0,
	type: trade.type,
	metadata: getRMultipleMetadata(trade.metadata),
}))

export const calculateAnalyticsMetrics = (trades: AnalyticsTrade[], mode: AnalyticsMode): AnalyticsMetrics => {
	const useNet = useNetForMode(mode)
	const sortedTrades = sortTradesByCloseDate(trades)
	const winning = getWinningTradesMetrics(sortedTrades, useNet)
	const losing = getLosingTradesMetrics(sortedTrades, useNet)
	return {
		pnl: safeNumber(getPNL(sortedTrades, -1, useNet)),
		trades_count: sortedTrades.length,
		winning_trades_count: winning.count,
		losing_trades_count: losing.count,
		breakeven_trades_count: sortedTrades.length - winning.count - losing.count,
		win_rate: safeNumber(getWinrate(sortedTrades, -1, useNet)),
		average_trade: safeNumber(getAPPT(sortedTrades, true, -1, useNet)),
		average_win: safeNumber(winning.average),
		average_loss: safeNumber(losing.average),
		profit_factor: safeRatio(getProfitFactor(sortedTrades, -1, useNet)),
		profit_loss_ratio: safeRatio(getPLRatio(sortedTrades, -1, useNet)),
		recovery_factor: safeRatio(getRecoveryFactor(sortedTrades, -1, useNet)),
		sharpe_ratio: safeRatio(getSharpeRatio(sortedTrades, 0, -1, useNet)),
		sortino_ratio: safeRatio(getSortinoRatio(sortedTrades, 0, -1, useNet)),
		calmar_ratio: safeRatio(getCalmarRatio(sortedTrades, -1, useNet)),
		ulcer_index: safeNumber(getUlcerIndex(sortedTrades, -1, useNet)),
		expectancy: safeNumber(getExpectancy(sortedTrades, -1, useNet)),
		max_drawdown: safeNumber(getMaxDrawdownWithDates(sortedTrades, useNet).maxDrawdown),
		max_run_up: safeNumber(getMaxRunUpWithDates(sortedTrades, useNet).maxRunUp),
		average_duration_minutes: safeNumber(getAvgTradeDuration(sortedTrades, -1)),
		max_duration_minutes: safeNumber(getMaxTradeDuration(sortedTrades, -1)),
		total_contracts: safeNumber(getTotalContracts(sortedTrades)),
		total_commission: safeNumber(sortedTrades.reduce((sum, trade) => sum + (trade.commission || 0), 0)),
		max_winning_streak: getMaxWinningStreak(sortedTrades, useNet),
		max_losing_streak: getMaxLosingStreak(sortedTrades, useNet),
	}
}

export const calculateAnalyticsSummary = (trades: AnalyticsTrade[], mode: AnalyticsMode): AnalyticsSummary => {
	const sortedTrades = sortTradesByCloseDate(trades)
	const useNet = useNetForMode(mode)
	const drawdown = getMaxDrawdownWithDates(sortedTrades, useNet)
	const runUp = getMaxRunUpWithDates(sortedTrades, useNet)
	const rTrades = toRMultipleTrades(sortedTrades)
	const rMultipleReliability = getRMultipleReliability(rTrades)
	const rMultiples = rMultipleReliability === 'none' ? [] : getRMultiples(rTrades, useNet)
	const hasRMultiples = rMultiples.length > 0
	return {
		mode,
		...calculateAnalyticsMetrics(sortedTrades, mode),
		first_trade_at: sortedTrades.length > 0 ? new Date(sortedTrades[0].closeDate).toISOString() : null,
		last_trade_at: sortedTrades.length > 0 ? new Date(sortedTrades[sortedTrades.length - 1].closeDate).toISOString() : null,
		max_drawdown_from: drawdown.dateFrom?.toISOString() || null,
		max_drawdown_to: drawdown.dateTo?.toISOString() || null,
		max_run_up_from: runUp.dateFrom?.toISOString() || null,
		max_run_up_to: runUp.dateTo?.toISOString() || null,
		r_multiple_coverage_percent: safeNumber(getRMultipleCoverage(rTrades) * 100),
		r_multiple_reliability: rMultipleReliability,
		trades_with_r_multiple: rMultiples.length,
		total_r: hasRMultiples ? safeNumber(getTotalRMultiple(rTrades, -1, useNet)) : null,
		average_r: hasRMultiples ? safeNumber(getAPPTInR(rTrades, -1, useNet)) : null,
		profit_factor_r: hasRMultiples ? safeRatio(getProfitFactorInR(rTrades, -1, useNet)) : null,
		profit_loss_ratio_r: hasRMultiples ? safeRatio(getPLRatioInR(rTrades, -1, useNet)) : null,
		sqn: hasRMultiples ? safeNumber(getSQN(rMultiples, -1)) : 0,
	}
}

const groupByAccount: GroupFn = trade => [trade.account_displayName || String(trade.accountId)]

const getDimensionGroup = (dimension: AnalyticsDimension): GroupFn => {
	const groups: Record<AnalyticsDimension, GroupFn> = {
		symbol: groupByTicker,
		account: groupByAccount,
		side: groupBySide,
		tag: groupByTag,
		month: groupByMonthYearOpen(utcTimezoneSettings),
		weekday: groupByDayOfWeekOpen(utcTimezoneSettings),
		open_hour: groupByHourStart(utcTimezoneSettings),
	}
	return groups[dimension]
}

export const calculateAnalyticsBreakdown = (trades: AnalyticsTrade[], mode: AnalyticsMode, dimension: AnalyticsDimension): AnalyticsBreakdown => {
	const groupedTrades = new Map<string, AnalyticsTrade[]>()
	const group = getDimensionGroup(dimension)
	for (const trade of trades) {
		for (const key of group(trade)) {
			const values = groupedTrades.get(key) || []
			values.push(trade)
			groupedTrades.set(key, values)
		}
	}
	const groups: AnalyticsBreakdownGroup[] = [...groupedTrades]
		.map(([key, values]) => ({ key, ...calculateAnalyticsMetrics(values, mode) }))
		.sort((left, right) => right.pnl - left.pnl || left.key.localeCompare(right.key))
	return { mode, dimension, groups }
}

const getIntervalStart = (dateValue: Date | string, interval: AnalyticsInterval) => {
	const date = new Date(dateValue)
	const year = date.getUTCFullYear()
	const month = date.getUTCMonth()
	const day = date.getUTCDate()
	if (interval === 'year') return new Date(Date.UTC(year, 0, 1))
	if (interval === 'month') return new Date(Date.UTC(year, month, 1))
	const start = new Date(Date.UTC(year, month, day))
	if (interval === 'week') {
		const daysSinceMonday = (start.getUTCDay() + 6) % 7
		start.setUTCDate(start.getUTCDate() - daysSinceMonday)
	}
	return start
}

export const calculatePnlTimeseries = (trades: AnalyticsTrade[], mode: AnalyticsMode, interval: AnalyticsInterval): PnlTimeseries => {
	const buckets = new Map<string, AnalyticsTrade[]>()
	for (const trade of trades) {
		const date = getIntervalStart(trade.closeDate, interval).toISOString()
		const values = buckets.get(date) || []
		values.push(trade)
		buckets.set(date, values)
	}
	let cumulativePnl = 0
	const points = [...buckets]
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([date, values]) => {
			const metrics = calculateAnalyticsMetrics(values, mode)
			cumulativePnl = safeNumber(cumulativePnl + metrics.pnl)
			return { date, cumulative_pnl: cumulativePnl, ...metrics }
		})
	return { mode, interval, points }
}
