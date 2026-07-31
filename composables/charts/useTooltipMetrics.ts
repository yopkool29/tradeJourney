import type { Ref } from 'vue'
import type { BreakdownMetric } from '~/type'
import type { BreakdownMetrics } from '~/composables/useAnalytics'
import { getMetricValueForMetric, formatMetricValueForMetric } from '~/composables/useAnalytics'
import { metricOptions } from '~/composables/metrics/useBreakdownConfig'

// Construit les lignes d'un tooltip ECharts : titre (en gras) + lignes principales + extras.
// - title : affiché en gras en 1re ligne (peut être vide)
// - primaryLines : lignes déjà formatées (ex: "Winrate: 65%")
// - fullMetric : métrique complète pour récupérer les extras (peut être null)
// - alreadyShown : métriques déjà affichées dans primaryLines (pour éviter les doublons)
// - extraMetrics : liste des métriques supplémentaires à afficher (triée par metricOptions)
// - t : fonction de traduction i18n
// - isEmpty : si true, les extras affichent 0 pour tradesCount et vide pour les autres
export const buildTooltipLines = (
	title: string,
	primaryLines: string[],
	fullMetric: BreakdownMetrics | null | undefined,
	alreadyShown: Set<BreakdownMetric>,
	extraMetrics: BreakdownMetric[],
	t: (key: string) => string,
	isEmpty = false,
): string => {
	const lines: string[] = []
	if (title) lines.push(`<strong>${title}</strong>`)
	lines.push(...primaryLines)
	if (fullMetric) {
		for (const m of extraMetrics) {
			if (alreadyShown.has(m)) continue
			const val = getMetricValueForMetric(fullMetric, m)
			const display = isEmpty ? (m === 'tradesCount' ? '0' : '') : formatMetricValueForMetric(val, m)
			lines.push(`${t(`components.dashboard.breakdown.metrics.${m}`)}: ${display}`)
		}
	}
	return lines.join('<br/>')
}

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

	const buildExtraTooltipLines = (metrics: BreakdownMetrics, alreadyShown: Set<BreakdownMetric>, isEmpty = false): string[] => {
		const lines: string[] = []
		for (const m of selectedTooltipMetrics.value) {
			if (alreadyShown.has(m)) continue
			const val = getMetricValueForMetric(metrics, m)
			const display = isEmpty ? (m === 'tradesCount' ? '0' : '') : formatMetricValueForMetric(val, m)
			lines.push(`${t(`components.dashboard.breakdown.metrics.${m}`)}: ${display}`)
		}
		return lines
	}

	return { selectedTooltipMetrics, toggleTooltipMetric, buildExtraTooltipLines }
}
