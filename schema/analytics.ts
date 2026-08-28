import { z } from 'zod'

export const AnalyticsModeSchema = z.enum(['net', 'gross'])
export const AnalyticsDimensionSchema = z.enum(['symbol', 'account', 'side', 'tag', 'month', 'weekday', 'open_hour'])
export const AnalyticsIntervalSchema = z.enum(['day', 'week', 'month', 'year'])
export const RMultipleReliabilitySchema = z.enum(['reliable', 'partial', 'approximate', 'none'])

export const AnalyticsMetricsSchema = z.object({
	pnl: z.number().finite(),
	trades_count: z.number().int().nonnegative(),
	winning_trades_count: z.number().int().nonnegative(),
	losing_trades_count: z.number().int().nonnegative(),
	breakeven_trades_count: z.number().int().nonnegative(),
	win_rate: z.number().finite(),
	average_trade: z.number().finite(),
	average_win: z.number().finite(),
	average_loss: z.number().finite(),
	profit_factor: z.number().finite().nullable(),
	profit_loss_ratio: z.number().finite().nullable(),
	recovery_factor: z.number().finite().nullable(),
	sharpe_ratio: z.number().finite().nullable(),
	sortino_ratio: z.number().finite().nullable(),
	calmar_ratio: z.number().finite().nullable(),
	ulcer_index: z.number().finite(),
	expectancy: z.number().finite(),
	max_drawdown: z.number().finite(),
	max_run_up: z.number().finite(),
	average_duration_minutes: z.number().finite(),
	max_duration_minutes: z.number().finite(),
	total_contracts: z.number().finite(),
	total_commission: z.number().finite(),
	max_winning_streak: z.number().int().nonnegative(),
	max_losing_streak: z.number().int().nonnegative(),
})

export const AnalyticsSummarySchema = AnalyticsMetricsSchema.extend({
	mode: AnalyticsModeSchema,
	first_trade_at: z.string().datetime().nullable(),
	last_trade_at: z.string().datetime().nullable(),
	max_drawdown_from: z.string().datetime().nullable(),
	max_drawdown_to: z.string().datetime().nullable(),
	max_run_up_from: z.string().datetime().nullable(),
	max_run_up_to: z.string().datetime().nullable(),
	r_multiple_coverage_percent: z.number().finite().min(0).max(100),
	r_multiple_reliability: RMultipleReliabilitySchema,
	trades_with_r_multiple: z.number().int().nonnegative(),
	total_r: z.number().finite().nullable(),
	average_r: z.number().finite().nullable(),
	profit_factor_r: z.number().finite().nullable(),
	profit_loss_ratio_r: z.number().finite().nullable(),
	sqn: z.number().finite(),
})

export const AnalyticsBreakdownGroupSchema = AnalyticsMetricsSchema.extend({ key: z.string() })

export const AnalyticsBreakdownSchema = z.object({
	mode: AnalyticsModeSchema,
	dimension: AnalyticsDimensionSchema,
	groups: z.array(AnalyticsBreakdownGroupSchema),
})

export const PnlTimeseriesPointSchema = AnalyticsMetricsSchema.extend({
	date: z.string().datetime(),
	cumulative_pnl: z.number().finite(),
})

export const PnlTimeseriesSchema = z.object({
	mode: AnalyticsModeSchema,
	interval: AnalyticsIntervalSchema,
	points: z.array(PnlTimeseriesPointSchema),
})

export type AnalyticsMode = z.output<typeof AnalyticsModeSchema>
export type AnalyticsDimension = z.output<typeof AnalyticsDimensionSchema>
export type AnalyticsInterval = z.output<typeof AnalyticsIntervalSchema>
export type AnalyticsMetrics = z.output<typeof AnalyticsMetricsSchema>
export type AnalyticsSummary = z.output<typeof AnalyticsSummarySchema>
export type AnalyticsBreakdownGroup = z.output<typeof AnalyticsBreakdownGroupSchema>
export type AnalyticsBreakdown = z.output<typeof AnalyticsBreakdownSchema>
export type PnlTimeseriesPoint = z.output<typeof PnlTimeseriesPointSchema>
export type PnlTimeseries = z.output<typeof PnlTimeseriesSchema>
