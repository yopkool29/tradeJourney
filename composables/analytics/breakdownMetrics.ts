import type { BreakdownDimension, BreakdownMetric } from '~/type'
import { getTagGroupName, isTagGroupDimension } from '~/type'
import { formatDurationMinutes } from '~/utils/date-utils'
import { formatCurrency } from '~/utils'
import { isMonetaryMetric, profitFactorColor } from '~/utils/dashboard'

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
	expectancy: number
	drawdown: number
	currentDrawdown: number
}

export const createEmptyMetrics = (key: string): BreakdownMetrics => ({
	key,
	pnl: 0,
	winrate: 0,
	tradesCount: 0,
	avgWin: 0,
	avgLoss: 0,
	profitFactor: 0,
	avgDuration: 0,
	avgMfe: null,
	avgMae: null,
	winningTradesCount: 0,
	losingTradesCount: 0,
	expectancy: 0,
	drawdown: 0,
	currentDrawdown: 0,
})

export const getMetricValueForMetric = (metrics: BreakdownMetrics, metric: BreakdownMetric): number => {
	if (metric !== 'tradesCount' && metrics.tradesCount === 0) return NaN
	switch (metric) {
		case 'pnl': return metrics.pnl
		case 'winrate': return metrics.winrate
		case 'profitFactor': return metrics.profitFactor === Infinity ? Number.MAX_SAFE_INTEGER : metrics.profitFactor
		case 'avgWin': return metrics.avgWin
		case 'avgLoss': return -metrics.avgLoss
		case 'expectancy': return metrics.expectancy
		case 'avgDuration': return metrics.avgDuration
		case 'drawdown': return metrics.drawdown
		case 'currentDrawdown': return metrics.currentDrawdown
		case 'tradesCount': return metrics.tradesCount
		case 'appt': return metrics.tradesCount > 0 ? metrics.pnl / metrics.tradesCount : NaN
		default: return metrics.pnl
	}
}

export const formatMetricValueForMetric = (value: number, metric: BreakdownMetric): string => {
	if (isMonetaryMetric(metric) && Math.abs(value) < 0.005) return ''
	switch (metric) {
		case 'pnl':
		case 'avgWin':
		case 'avgLoss':
		case 'expectancy':
		case 'drawdown':
		case 'currentDrawdown':
		case 'appt':
			return formatCurrency(value)
		case 'winrate':
			return `${value.toFixed(1)}%`
		case 'profitFactor':
			return value >= 999 ? '∞' : value.toFixed(2)
		case 'avgDuration':
			return formatDurationMinutes(value)
		case 'tradesCount':
			return String(Math.round(value))
		default:
			return formatCurrency(value)
	}
}

type MetricColors = {
	profit?: string
	loss?: string
	bar?: string
	rawMetric?: string
}

export const getMetricColor = (metrics: BreakdownMetrics, metric: BreakdownMetric, colors: MetricColors = {}): string => {
	if (metric === 'profitFactor') return profitFactorColor(metrics.profitFactor)
	if (metric === 'winrate') return colors.bar || '#fbbf24'
	if (metric === 'avgDuration' || metric === 'tradesCount') return colors.rawMetric || '#3b82f6'
	const value = getMetricValueForMetric(metrics, metric)
	if (value > 0) return colors.profit || '#22c55e'
	if (value < 0) return colors.loss || '#ef4444'
	return colors.bar || '#fbbf24'
}

export const sortMetricsByDimension = (
	metrics: BreakdownMetrics[],
	dimension: BreakdownDimension,
	metric: BreakdownMetric,
): BreakdownMetrics[] => {
	if (dimension === 'dayOfWeekOpen' || dimension === 'dayOfWeekClose' || dimension === 'monthOpen' || dimension === 'monthClose') {
		return [...metrics].sort((a, b) => parseInt(a.key, 10) - parseInt(b.key, 10))
	}
	if (dimension === 'monthYearOpen' || dimension === 'monthYearClose' || dimension === 'hourStart' || dimension === 'hourEnd') {
		return [...metrics].sort((a, b) => a.key.localeCompare(b.key))
	}
	const compare = (a: BreakdownMetrics, b: BreakdownMetrics): number => {
		const valueA = getMetricValueForMetric(a, metric)
		const valueB = getMetricValueForMetric(b, metric)
		if (isNaN(valueA) && isNaN(valueB)) return 0
		if (isNaN(valueA)) return 1
		if (isNaN(valueB)) return -1
		const ascending = metric === 'avgLoss'
		return ascending ? valueA - valueB : valueB - valueA
	}
	return [...metrics].sort(compare)
}

export const injectEmptyTagMetrics = (
	metrics: BreakdownMetrics[],
	dimension: string,
	tagGroups: { id: number; name: string; tags: { name: string }[] }[],
): BreakdownMetrics[] => {
	if (!isTagGroupDimension(dimension)) return metrics
	const groupName = getTagGroupName(dimension)
	const group = tagGroups.find(group => group.name === groupName)
	if (!group) return metrics
	const existingKeys = new Set(metrics.map(metrics => metrics.key))
	const result = [...metrics]
	for (const tag of group.tags) {
		if (!existingKeys.has(tag.name)) result.push(createEmptyMetrics(tag.name))
	}
	return result
}
