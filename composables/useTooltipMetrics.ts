import type { Ref } from 'vue'
import type { BreakdownMetric } from '~/type'
import type { BreakdownMetrics } from '~/composables/useAnalytics'
import { getMetricValueForMetric, formatMetricValueForMetric } from '~/composables/useAnalytics'
import { metricOptions } from '~/composables/metrics/useBreakdownConfig'

// Gestion des métriques supplémentaires dans le tooltip (partagé entre BreakdownWidget et TimeSeriesWidget)
export const useTooltipMetrics = (
	config: Ref<{ tooltipMetrics?: BreakdownMetric[] }>,
	updateConfig: (partial: { tooltipMetrics?: BreakdownMetric[] }) => void,
) => {
	const { t } = useI18n()

	const selectedTooltipMetrics = computed<BreakdownMetric[]>(() => {
		const selected = config.value.tooltipMetrics ?? []
		const order = metricOptions.map(m => m.value)
		return [...selected].sort((a, b) => order.indexOf(a) - order.indexOf(b))
	})

	const toggleTooltipMetric = (metric: BreakdownMetric) => {
		const current = selectedTooltipMetrics.value
		const newVal = current.includes(metric)
			? current.filter(m => m !== metric)
			: [...current, metric]
		updateConfig({ tooltipMetrics: newVal })
	}

	const buildExtraTooltipLines = (metrics: BreakdownMetrics, alreadyShown: Set<BreakdownMetric>): string[] => {
		const lines: string[] = []
		for (const m of selectedTooltipMetrics.value) {
			if (alreadyShown.has(m)) continue
			const val = getMetricValueForMetric(metrics, m)
			lines.push(`${t(`components.dashboard.breakdown.metrics.${m}`)}: ${formatMetricValueForMetric(val, m)}`)
		}
		return lines
	}

	return { selectedTooltipMetrics, toggleTooltipMetric, buildExtraTooltipLines }
}
