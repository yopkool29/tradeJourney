import { describe, expect, it } from 'vitest'
import {
	calculateAnalyticsBreakdown,
	calculateAnalyticsSummary,
	calculatePnlTimeseries,
} from '~/server/services/analyticsMetrics'
import { AnalyticsSummarySchema } from '~/schema/analytics'
import type { AnalyticsTrade } from '~/server/services/analyticsTypes'

type TradeInput = {
	id: number
	openDate: string
	closeDate: string
	profit: number
	netProfit: number
	symbol: string
	type: 'buy' | 'sell'
	accountId?: number
	accountName?: string
	tags?: string[]
	riskReward?: number
}

const makeTrade = (input: TradeInput): AnalyticsTrade => ({
	id: input.id,
	openDate: new Date(input.openDate),
	closeDate: new Date(input.closeDate),
	profit: input.profit,
	netProfit: input.netProfit,
	symbol: input.symbol,
	type: input.type,
	accountId: input.accountId || 1,
	account_displayName: input.accountName || 'Main',
	lot: 1,
	commission: input.profit - input.netProfit,
	metadata: input.riskReward === undefined ? null : { riskReward: input.riskReward },
	tags: (input.tags || []).map((name, index) => ({ id: index + 1, name, dark_fg_reverse: false })),
} as unknown as AnalyticsTrade)

const trades = [
	makeTrade({ id: 1, openDate: '2024-01-01T10:00:00Z', closeDate: '2024-01-01T11:00:00Z', profit: 110, netProfit: 100, symbol: 'AAPL', type: 'buy', tags: ['breakout', 'A+'] }),
	makeTrade({ id: 2, openDate: '2024-01-02T15:00:00Z', closeDate: '2024-01-02T16:00:00Z', profit: -40, netProfit: -50, symbol: 'AAPL', type: 'sell', tags: ['A+'] }),
	makeTrade({ id: 3, openDate: '2024-02-05T10:00:00Z', closeDate: '2024-02-05T11:30:00Z', profit: 30, netProfit: 20, symbol: 'MSFT', type: 'buy' }),
]

describe('analyticsMetrics', () => {
	it('calculates net and gross summaries with ISO dates', () => {
		const net = calculateAnalyticsSummary(trades, 'net')
		const gross = calculateAnalyticsSummary(trades, 'gross')
		expect(net).toMatchObject({ pnl: 70, trades_count: 3, winning_trades_count: 2, losing_trades_count: 1 })
		expect(gross.pnl).toBe(100)
		expect(net.first_trade_at).toBe('2024-01-01T11:00:00.000Z')
		expect(net.last_trade_at).toBe('2024-02-05T11:30:00.000Z')
		expect(AnalyticsSummarySchema.parse(net)).toEqual(net)
	})

	it('keeps order-sensitive metrics stable for reversed input', () => {
		const chronological = calculateAnalyticsSummary(trades, 'net')
		const reversed = calculateAnalyticsSummary([...trades].reverse(), 'net')
		expect(reversed).toMatchObject({
			recovery_factor: chronological.recovery_factor,
			calmar_ratio: chronological.calmar_ratio,
			ulcer_index: chronological.ulcer_index,
			max_drawdown: chronological.max_drawdown,
			max_run_up: chronological.max_run_up,
		})
	})

	it('keeps metric output JSON-safe when a group has no losses', () => {
		const summary = calculateAnalyticsSummary([trades[0]], 'net')
		expect(summary.profit_factor).toBeNull()
		expect(JSON.stringify(summary)).not.toMatch(/Infinity|NaN/)
	})

	it('uses allowlisted riskReward metadata for R-multiple metrics', () => {
		const summary = calculateAnalyticsSummary([
			makeTrade({ id: 4, openDate: '2024-03-01T10:00:00Z', closeDate: '2024-03-01T11:00:00Z', profit: 100, netProfit: 95, symbol: 'ES', type: 'buy', riskReward: 2 }),
		], 'net')
		expect(summary).toMatchObject({
			r_multiple_coverage_percent: 100,
			r_multiple_reliability: 'reliable',
			trades_with_r_multiple: 1,
			total_r: 2,
			average_r: 2,
		})
	})

	it('uses existing dimensions and preserves overlapping tag groups', () => {
		const tags = calculateAnalyticsBreakdown(trades, 'net', 'tag')
		const aPlus = tags.groups.find(group => group.key === 'A+')
		const untagged = tags.groups.find(group => group.key === 'untagged')
		expect(aPlus).toMatchObject({ trades_count: 2, pnl: 50 })
		expect(untagged).toMatchObject({ trades_count: 1, pnl: 20 })
		expect(calculateAnalyticsBreakdown(trades, 'net', 'month').groups.map(group => group.key).sort()).toEqual(['2024-01', '2024-02'])
	})

	it('aggregates realized PnL into UTC intervals and accumulates chronologically', () => {
		const series = calculatePnlTimeseries(trades, 'net', 'week')
		expect(series.points.map(point => ({ date: point.date, pnl: point.pnl, cumulative: point.cumulative_pnl }))).toEqual([
			{ date: '2024-01-01T00:00:00.000Z', pnl: 50, cumulative: 50 },
			{ date: '2024-02-05T00:00:00.000Z', pnl: 20, cumulative: 70 },
		])
	})
})
