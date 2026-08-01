import type { Ref } from 'vue'
import type { BreakdownMetric, TradeTooltipField } from '~/type'
import type { BreakdownMetrics } from '~/composables/analytics/breakdownMetrics'
import type { TradeExtendedType } from '~/schema/trade'
import { getMetricValueForMetric, formatMetricValueForMetric } from '~/composables/analytics/breakdownMetrics'
import { metricOptions, tradeTooltipOptions } from '~/composables/dashboard/useBreakdownConfig'
import { formatCurrency } from '~/utils'

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

// Formate une propriété de trade pour le tooltip du scatterTrades
export const formatTradeTooltipField = (
	tr: TradeExtendedType,
	field: TradeTooltipField,
	t: (key: string) => string,
	durationMin?: number,
): string => {
	const tradeFields: TradeTooltipField[] = ['lot', 'openPrice', 'closePrice', 'commission', 'mfe', 'mae', 'side', 'duration', 'pnl']
	if (!tradeFields.includes(field)) return '' // Métriques agrégées — pas applicables à un trade unique
	const label = t(`components.dashboard.breakdown.trade_property.${field}`)
	switch (field) {
		case 'lot': return `${label}: ${tr.lot}`
		case 'openPrice': return `${label}: ${tr.openPrice}`
		case 'closePrice': return `${label}: ${tr.closePrice}`
		case 'commission': return tr.commission ? `${label}: ${formatCurrency(tr.commission)}` : ''
		case 'mfe': return `${label}: ${tr.mfe != null ? tr.mfe : '-'}`
		case 'mae': return `${label}: ${tr.mae != null ? tr.mae : '-'}`
		case 'side': return `${label}: ${tr.type}`
		case 'duration': {
			const min = durationMin ?? 0
			if (min < 60) return `${label}: ${min.toFixed(0)}m`
			if (min < 1440) return `${label}: ${(min / 60).toFixed(1)}h`
			return `${label}: ${(min / 1440).toFixed(1)}d`
		}
		case 'pnl': return `${label}: ${formatCurrency(tr.profit)}`
		default: return ''
	}
}

// Gestion des métriques supplémentaires dans le tooltip (partagé entre BreakdownWidget et TimeSeriesWidget)
export const useTooltipMetrics = (
	config: Ref<{ tooltipMetrics?: TradeTooltipField[] }>,
	updateConfig: (partial: { tooltipMetrics?: TradeTooltipField[] }) => void,
) => {
	const { t } = useI18n()

	const selectedTooltipMetrics = computed<TradeTooltipField[]>(() => {
		const selected = config.value.tooltipMetrics ?? []
		const order = [...metricOptions.map(m => m.value), ...tradeTooltipOptions.map(m => m.value)]
		return [...selected].sort((a, b) => order.indexOf(a) - order.indexOf(b))
	})

	const toggleTooltipMetric = (metric: TradeTooltipField) => {
		const current = selectedTooltipMetrics.value
		const newVal = current.includes(metric)
			? current.filter(m => m !== metric)
			: [...current, metric]
		updateConfig({ tooltipMetrics: newVal })
	}

	const buildExtraTooltipLines = (metrics: BreakdownMetrics, alreadyShown: Set<BreakdownMetric>, isEmpty = false): string[] => {
		const lines: string[] = []
		for (const m of selectedTooltipMetrics.value) {
			if (alreadyShown.has(m as BreakdownMetric)) continue
			const val = getMetricValueForMetric(metrics, m as BreakdownMetric)
			const display = isEmpty ? (m === 'tradesCount' ? '0' : '') : formatMetricValueForMetric(val, m as BreakdownMetric)
			lines.push(`${t(`components.dashboard.breakdown.metrics.${m}`)}: ${display}`)
		}
		return lines
	}

	// Construit les lignes extras pour un trade individuel (scatterTrades)
	const buildTradeTooltipLines = (tr: TradeExtendedType, alreadyShown: Set<TradeTooltipField>): string[] => {
		const lines: string[] = []
		for (const field of selectedTooltipMetrics.value) {
			if (alreadyShown.has(field)) continue
			const line = formatTradeTooltipField(tr, field)
			if (line) lines.push(line)
		}
		return lines
	}

	return { selectedTooltipMetrics, toggleTooltipMetric, buildExtraTooltipLines, buildTradeTooltipLines }
}
