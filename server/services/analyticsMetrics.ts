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
import { calculateTradePerformance, type TradePerformance } from '~/utils/tradePerformance'
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

const toAnalyticsMetrics = (performance: TradePerformance): AnalyticsMetrics => ({
	pnl: safeNumber(performance.pnl),
	trades_count: performance.tradesCount,
	winning_trades_count: performance.winning.count,
	losing_trades_count: performance.losing.count,
	breakeven_trades_count: performance.breakeven.count,
	win_rate: safeNumber(performance.winrate),
	average_trade: safeNumber(performance.appt),
	average_win: safeNumber(performance.winning.average),
	average_loss: safeNumber(performance.losing.average),
	profit_factor: safeRatio(performance.profitFactor),
	profit_loss_ratio: safeRatio(performance.plRatio),
	recovery_factor: safeRatio(performance.recoveryFactor),
	sharpe_ratio: safeRatio(performance.sharpeRatio),
	sortino_ratio: safeRatio(performance.sortinoRatio),
	calmar_ratio: safeRatio(performance.calmarRatio),
	ulcer_index: safeNumber(performance.ulcerIndex),
	expectancy: safeNumber(performance.expectancy),
	max_drawdown: safeNumber(performance.drawdown.maxDrawdown),
	max_run_up: safeNumber(performance.runUp.maxRunUp),
	average_duration_minutes: safeNumber(performance.avgTradeDuration),
	max_duration_minutes: safeNumber(performance.maxTradeDuration),
	total_contracts: safeNumber(performance.totalContracts),
	total_commission: safeNumber(performance.totalCommission),
	max_winning_streak: performance.maxWinningStreak,
	max_losing_streak: performance.maxLosingStreak,
})

const getPerformance = (trades: AnalyticsTrade[], mode: AnalyticsMode) => calculateTradePerformance(trades, {
	useNet: useNetForMode(mode),
	round: -1,
	pnlRound: -1,
})

export const calculateAnalyticsMetrics = (trades: AnalyticsTrade[], mode: AnalyticsMode): AnalyticsMetrics => {
	return toAnalyticsMetrics(getPerformance(trades, mode))
}

export const calculateAnalyticsSummary = (trades: AnalyticsTrade[], mode: AnalyticsMode): AnalyticsSummary => {
	const performance = getPerformance(trades, mode)
	const firstTrade = performance.sortedTrades[0]
	const lastTrade = performance.sortedTrades[performance.sortedTrades.length - 1]
	return {
		mode,
		...toAnalyticsMetrics(performance),
		first_trade_at: firstTrade ? new Date(firstTrade.closeDate).toISOString() : null,
		last_trade_at: lastTrade ? new Date(lastTrade.closeDate).toISOString() : null,
		max_drawdown_from: performance.drawdown.dateFrom?.toISOString() || null,
		max_drawdown_to: performance.drawdown.dateTo?.toISOString() || null,
		max_run_up_from: performance.runUp.dateFrom?.toISOString() || null,
		max_run_up_to: performance.runUp.dateTo?.toISOString() || null,
		r_multiple_coverage_percent: safeNumber(performance.r.coverage * 100),
		r_multiple_reliability: performance.r.reliability,
		trades_with_r_multiple: performance.r.tradesWithRMultiple,
		total_r: performance.r.totalR === null ? null : safeNumber(performance.r.totalR),
		average_r: performance.r.apptR === null ? null : safeNumber(performance.r.apptR),
		profit_factor_r: performance.r.profitFactorR === null ? null : safeRatio(performance.r.profitFactorR),
		profit_loss_ratio_r: performance.r.plRatioR === null ? null : safeRatio(performance.r.plRatioR),
		sqn: safeNumber(performance.r.sqn),
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
