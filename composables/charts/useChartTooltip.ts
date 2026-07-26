import type { EChartsOption } from 'echarts'
import type { BreakdownMetric, BreakdownDimension } from '~/type'
import type { BreakdownMetrics } from '~/composables/useAnalytics'
import { formatMetricValueForMetric } from '~/composables/useAnalytics'
import { buildTooltipLines } from '~/composables/useTooltipMetrics'

export interface TooltipConfig {
	backgroundColor: string
	borderColor: string
	textColor: string
	trigger: 'axis' | 'item'
	axisPointer?: EChartsOption['tooltip']['axisPointer']
}

export const useChartTooltip = () => {
	const { t } = useI18n()
	const { getChartContext } = useEchartsChartOption()

	const buildTooltipConfig = (options?: {
		trigger?: 'axis' | 'item'
		axisPointerType?: 'line' | 'cross' | 'shadow'
	}): TooltipConfig => {
		const ctx = getChartContext()
		const trigger = options?.trigger ?? 'item'
		const axisPointerType = options?.axisPointerType ?? 'line'

		return {
			backgroundColor: ctx.backgroundColor,
			borderColor: ctx.borderColor,
			textColor: ctx.tooltipTextColor,
			trigger,
			axisPointer: trigger === 'axis' ? {
				type: axisPointerType,
				lineStyle: { type: 'dashed' },
			} : undefined,
		}
	}

	const formatDimensionLabel = (dimension: BreakdownDimension, key: string): string => {
		if (dimension === 'dayOfWeekOpen' || dimension === 'dayOfWeekClose') {
			const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
			const idx = parseInt(key, 10)
			if (idx >= 0 && idx <= 6) return t(`common.weekdays.long.${dayKeys[idx]}`)
			return key
		}
		if (dimension === 'monthOpen' || dimension === 'monthClose') {
			const idx = parseInt(key, 10)
			if (idx >= 0 && idx <= 11) return t(`common.months.long.${idx}`)
			return key
		}
		if (dimension === 'monthYearOpen' || dimension === 'monthYearClose') {
			const [year, monthNum] = key.split('-')
			const monthIdx = parseInt(monthNum, 10) - 1
			if (monthIdx >= 0 && monthIdx <= 11) {
				return `${t(`common.months.long.${monthIdx}`)} ${year}`
			}
			return key
		}
		return key
	}

	const formatBreakdownTooltip = (
		title: string,
		metric: BreakdownMetric,
		metricValue: number,
		fullMetric: BreakdownMetrics | null | undefined,
		selectedTooltipMetrics: BreakdownMetric[],
		isEmpty = false
	): string => {
		const shown = new Set<BreakdownMetric>([metric])
		const primaryLines = [
			`${t(`components.dashboard.breakdown.metrics.${metric}`)}: ${isEmpty ? (metric === 'tradesCount' ? '0' : '') : formatMetricValueForMetric(metricValue, metric)}`
		]
		return buildTooltipLines(title, primaryLines, fullMetric, shown, selectedTooltipMetrics, t, isEmpty)
	}

	const formatScatter2DTooltip = (
		title: string,
		metricX: BreakdownMetric,
		metricY: BreakdownMetric,
		colorMetric: BreakdownMetric,
		valueX: number,
		valueY: number,
		valueColor: number,
		fullMetric: BreakdownMetrics | null | undefined,
		selectedTooltipMetrics: BreakdownMetric[]
	): string => {
		const shown = new Set<BreakdownMetric>([metricX, metricY, colorMetric])
		const xAxisName = t(`components.dashboard.breakdown.metrics.${metricX}`)
		const yAxisName = t(`components.dashboard.breakdown.metrics.${metricY}`)
		const primaryLines: string[] = [`${xAxisName}: ${formatMetricValueForMetric(valueX, metricX)}`]
		if (metricY !== metricX) {
			primaryLines.push(`${yAxisName}: ${formatMetricValueForMetric(valueY, metricY)}`)
		}
		if (colorMetric !== metricX && colorMetric !== metricY) {
			primaryLines.push(`${t(`components.dashboard.breakdown.metrics.${colorMetric}`)}: ${formatMetricValueForMetric(valueColor, colorMetric)}`)
		}
		return buildTooltipLines(title, primaryLines, fullMetric, shown, selectedTooltipMetrics, t)
	}

	const sortDimensionKeys = (keys: string[], dimension: BreakdownDimension): string[] => {
		return [...keys].sort((a, b) => {
			if (dimension === 'hourStart' || dimension === 'hourEnd') return parseInt(a) - parseInt(b)
			if (dimension === 'dayOfWeekOpen' || dimension === 'dayOfWeekClose') return parseInt(a) - parseInt(b)
			if (dimension === 'monthOpen' || dimension === 'monthClose') return parseInt(a) - parseInt(b)
			return a.localeCompare(b)
		})
	}

	return {
		buildTooltipConfig,
		formatDimensionLabel,
		formatBreakdownTooltip,
		formatScatter2DTooltip,
		sortDimensionKeys,
	}
}
