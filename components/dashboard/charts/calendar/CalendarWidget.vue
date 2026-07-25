<template>
	<DashboardChartsBaseWidgetCard
		:title="chartTitle"
		:enlarged-title="chartTitle + ' (enlarged)'"
		:chart-option="chartOption"
		:loading="loading"
		:not-merge="false"
		:modal-height-class="modalHeightClass"
		@settings-open="onSettingsOpen"
		@settings-cancel="onSettingsCancel"
		@settings-apply="onSettingsApply"
	>
		<template #header-extra>
			<div class="flex items-center gap-2 flex-wrap">
				<div class="flex items-center gap-1.5">
					<span class="text-xs text-secondary">{{ $t('components.dashboard.breakdown.metric') }}</span>
					<USelectMenu
						v-model="selectedMetric"
						:items="metricItems"
						value-key="value"
						class="w-32"
						size="xs"
					/>
				</div>
				<div v-if="availableYears.length > 1" class="flex items-center gap-1.5">
					<span class="text-xs text-secondary">{{ $t('components.dashboard.breakdown.calendar.year') }}</span>
					<USelectMenu
						v-model="selectedYear"
						:items="yearOptions"
						value-key="value"
						class="w-28"
						size="xs"
					/>
				</div>
			</div>
		</template>

		<template #settings>
			<div class="space-y-1">
				<span class="text-sm font-medium">{{ $t('components.dashboard.breakdown.tooltip_metrics') }}</span>
				<div v-for="m in metricItems" :key="m.value" class="flex items-center gap-2">
					<UCheckbox
						:model-value="selectedTooltipMetrics.includes(m.value as BreakdownMetric)"
						@update:model-value="toggleTooltipMetric(m.value as BreakdownMetric)"
					/>
					<span class="text-sm">{{ m.label }}</span>
				</div>
			</div>
		</template>
	</DashboardChartsBaseWidgetCard>
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import type { EChartsFormatterParams } from '~/utils/echarts-builders'
import type { BreakdownConfig, BreakdownMetric } from '~/type'
import type { TradeExtendedType } from '~/schema/trade'
import type { SettingsContentType } from '~/schema/user'
import type { BreakdownMetrics } from '~/composables/useAnalytics'
import { metricOptions, useBreakdownConfig } from '~/composables/metrics/useBreakdownConfig'
import { calculateMetricsByDimension, getMetricValueForMetric, formatMetricValueForMetric } from '~/composables/useAnalytics'
import { getEchartsBaseOption, getEchartsAxisColors, getEchartsTooltipColors } from '~/utils/chart-utils'
import { useTooltipMetrics, buildTooltipLines } from '~/composables/useTooltipMetrics'
import { formatDateKeyForGrouping } from '~/utils/date-utils'

const props = defineProps<{
	itemId: string
	loading?: boolean
}>()

const { t, locale } = useI18n()
const { displayModeNet } = useNetGrossDisplay()
const isDark = useIsDark()
const dataStore = useDataStore()
const userStore = useUserStore()
const { profitColor, lossColor } = useTypeColors('timeSeriesChart')

const { config, setMetric, updateConfig } = useBreakdownConfig(props.itemId)
const { selectedTooltipMetrics, toggleTooltipMetric } = useTooltipMetrics(config, updateConfig)

// Snapshot de la config pour Cancel/Apply dans le popover settings
let configSnapshot: BreakdownConfig | null = null
const onSettingsOpen = () => {
	configSnapshot = { ...config.value } as BreakdownConfig
}
const onSettingsCancel = () => {
	if (configSnapshot) updateConfig(configSnapshot)
	configSnapshot = null
}
const onSettingsApply = () => {
	configSnapshot = null
}

const metricItems = computed(() =>
	metricOptions.map(m => ({ value: m.value, label: t(m.labelKey) }))
)

const selectedMetric = computed({
	get: () => config.value.metric,
	set: (val: BreakdownMetric) => setMetric(val),
})

// Années disponibles dans les données
const availableYears = computed(() => {
	const data = calendarDataAll.value
	if (!data.length) return [] as number[]
	const years = new Set<number>()
	for (const d of data) {
		years.add(new Date(d[0]).getFullYear())
	}
	return [...years].sort()
})

// Sélecteur d'année : 'all' = toutes les années, sinon une année spécifique
const selectedYear = ref<string>('all')
const yearOptions = computed(() => [
	{ value: 'all', label: t('components.dashboard.breakdown.all') },
	...availableYears.value.map(y => ({ value: String(y), label: String(y) })),
])

const chartTitle = computed(() => {
	const metric = config.value.metric || 'pnl'
	const metricLabel = t(`components.dashboard.breakdown.metrics.${metric}`)
	return `${t('components.dashboard.charts.breakdown_calendar')} — ${metricLabel}`
})

const modalHeightClass = computed(() => 'h-[400px] sm:h-[700px]')

// groupFn qui groupe par jour calendaire (yyyy-MM-dd) selon les settings de timezone
const groupByDay = (settings: Partial<SettingsContentType> | null) => (trade: TradeExtendedType): string[] => {
	const closeDate = new Date(trade.closeDate)
	const timezoneMode = settings?.timezoneDisplay ?? 'CURRENT'
	const timezoneLocal = settings?.timezoneLocal ?? 'Europe/Paris'
	const timezoneUtcOffset = settings?.timezoneUtcOffset ?? 0
	return [formatDateKeyForGrouping(closeDate, 'day', timezoneMode, timezoneLocal, timezoneUtcOffset)]
}

// Groupe les trades par jour calendaire et calcule toutes les métriques
const dailyMetrics = computed(() => {
	const trades = dataStore.lastTrades as TradeExtendedType[]
	if (!trades || !trades.length) return [] as { date: string, metrics: BreakdownMetrics }[]
	const settings = userStore.settingsObject
	const metrics = calculateMetricsByDimension(trades, groupByDay(settings), displayModeNet.value)
	return metrics
		.map(m => ({ date: m.key, metrics: m }))
		.sort((a, b) => a.date.localeCompare(b.date))
})

// Données pour le calendar : [date, valeurMétrique]
// Données brutes (toutes années)
const calendarDataAll = computed(() => {
	const metric = config.value.metric || 'pnl'
	return dailyMetrics.value.map(d => [d.date, getMetricValueForMetric(d.metrics, metric)] as [string, number])
})

// Données filtrées par année sélectionnée
const calendarData = computed(() => {
	const all = calendarDataAll.value
	if (selectedYear.value === 'all') return all
	const year = parseInt(selectedYear.value)
	return all.filter(d => new Date(d[0]).getFullYear() === year)
})

const calendarRange = computed(() => {
	const data = calendarData.value
	if (!data.length) return '' as string | string[]
	const dates = data.map(d => d[0]).sort()
	// Si une seule année sélectionnée, utiliser le format 'YYYY' (plus propre pour ECharts)
	if (selectedYear.value !== 'all') {
		const year = new Date(dates[0]).getFullYear()
		if (new Date(dates[dates.length - 1]).getFullYear() === year) {
			return String(year)
		}
	}
	// Mode "toutes" : étendre du 1er janvier de la première année au 31 décembre de la dernière
	const startYear = new Date(dates[0]).getFullYear()
	const endYear = new Date(dates[dates.length - 1]).getFullYear()
	return [`${startYear}-01-01`, `${endYear}-12-31`] as [string, string]
})

const chartOption = computed<EChartsOption>(() => {
	const base = getEchartsBaseOption()
	const { textColor } = getEchartsAxisColors(isDark.value)
	const { backgroundColor, borderColor, textColor: tooltipTextColor } = getEchartsTooltipColors()
	const dark = isDark.value
	const data = calendarData.value
	const range = calendarRange.value
	if (!data.length || !range) return { ...base }
	const metric = config.value.metric || 'pnl'

	// Palette selon la métrique
	// P&L / avgWin / avgLoss / expectancy / drawdown : divergent (négatif/zero/positif)
	// winrate : 0-100% (gradient gris→vert)
	// tradesCount / profitFactor / appt : gradient gris→vert
	let visualMin = -Math.max(...data.map(d => Math.abs(d[1])), 1)
	let visualMax = Math.max(...data.map(d => Math.abs(d[1])), 1)
	let visualColors = [lossColor.value, dark ? '#1f2937' : '#e5e7eb', profitColor.value]

	if (metric === 'winrate') {
		visualMin = 0
		visualMax = 100
		visualColors = [dark ? '#1f2937' : '#f3f4f6', profitColor.value]
	} else if (metric === 'tradesCount' || metric === 'profitFactor' || metric === 'appt') {
		visualMin = 0
		visualMax = Math.max(...data.map(d => d[1]), 1)
		visualColors = [dark ? '#1f2937' : '#f3f4f6', profitColor.value]
	}

	const isMultiYear = Array.isArray(range) && new Date(range[0]).getFullYear() !== new Date(range[1]).getFullYear()
	const metricsByDate = new Map(dailyMetrics.value.map(d => [d.date, d.metrics]))

	return {
		...base,
		// Nettoyer les options d'un éventuel chart précédent (notMerge: false)
		xAxis: undefined,
		yAxis: undefined,
		grid: undefined,
		dataZoom: undefined,
		radar: undefined,
		tooltip: {
			backgroundColor, borderColor,
			textStyle: { color: tooltipTextColor, fontSize: 13 },
			appendTo: document.body,
			className: 'echarts-custom-tooltip',
			formatter: (params: EChartsFormatterParams | EChartsFormatterParams[]) => {
				const p = Array.isArray(params) ? params[0] : params
				const v = p.value as unknown as [string, number]
				if (!v) return ''
				const date = v[0]
				const val = v[1]
				const dateLabel = new Date(date).toLocaleDateString(locale.value, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
				const dayMetrics = metricsByDate.get(date)
				const primaryLines = [`${t(`components.dashboard.breakdown.metrics.${metric}`)}: ${formatMetricValueForMetric(val, metric)}`]
				return buildTooltipLines(dateLabel, primaryLines, dayMetrics, new Set([metric]), selectedTooltipMetrics.value, t)
			},
		},
		visualMap: {
			min: visualMin,
			max: visualMax,
			calculable: false,
			orient: 'horizontal',
			left: 'center',
			bottom: 10,
			textStyle: { color: textColor, fontSize: 10 },
			inRange: { color: visualColors },
			show: true,
		},
		calendar: {
			range,
			left: 40,
			right: 16,
			top: 60,
			bottom: 40,
			cellSize: 20,
			orient: 'horizontal',
			dayLabel: { color: textColor, fontSize: 10, nameFormat: 'narrow' },
			monthLabel: { color: textColor, fontSize: 10, nameFormat: 'short' },
			yearLabel: { show: isMultiYear, color: textColor, fontSize: 12 },
			itemStyle: { color: dark ? '#1f2937' : '#f3f4f6', borderColor: dark ? '#111827' : '#fff', borderWidth: 1 },
			splitLine: { show: false },
		},
		series: [{
			type: 'heatmap',
			coordinateSystem: 'calendar',
			data,
			itemStyle: { borderRadius: 2 },
		}],
	}
})
</script>
