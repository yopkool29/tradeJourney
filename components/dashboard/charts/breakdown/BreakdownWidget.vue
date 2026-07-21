<template>
	<DashboardChartsBaseEchartsCard
		:title="chartTitle"
		:enlarged-title="chartTitle + ' (enlarged)'"
		:chart-option="chartOption"
		:loading="loading"
		:hide-enlarge="chartType === 'table'"
		:modal-height-class="modalHeightClass"
	>
		<!-- Dropdowns dimension/métrique/colonnes/topN dans le header -->
		<template #header-extra>
			<div class="flex items-center gap-2 flex-wrap">
				<div class="flex items-center gap-1.5">
					<span class="text-xs text-secondary">{{ $t('components.dashboard.breakdown.dimension') }}</span>
					<USelectMenu
						v-model="selectedDimension"
						:items="dimensionItems"
						value-key="value"
						class="w-32"
						size="xs"
					/>
				</div>
				<!-- Métrique : seulement pour bar/scatter (la table affiche plusieurs colonnes) -->
				<div v-if="chartType !== 'table'" class="flex items-center gap-1.5">
					<span class="text-xs text-secondary">{{ $t('components.dashboard.breakdown.metric') }}</span>
					<USelectMenu
						v-model="selectedMetric"
						:items="metricItems"
						value-key="value"
						class="w-32"
						size="xs"
					/>
				</div>
				<!-- Filtre topN (optionnel, seulement pour bar/scatter) -->
				<div v-if="chartType !== 'table'" class="flex items-center gap-1.5">
					<span class="text-xs text-secondary">{{ $t('components.dashboard.breakdown.top') }}</span>
					<USelectMenu
						v-model="selectedTopN"
						:items="topNOptions"
						value-key="value"
						class="w-16"
						size="xs"
					/>
				</div>
				<!-- Sélecteur de colonnes : seulement pour la table -->
				<div v-if="chartType === 'table'" class="flex items-center gap-1.5">
					<span class="text-xs text-secondary">{{ $t('components.dashboard.breakdown.columns') }}</span>
					<USelectMenu
						v-model="selectedColumns"
						:items="metricItems"
						value-key="value"
						multiple
						class="w-48"
						size="xs"
					/>
				</div>
			</div>
		</template>

		<!-- Slot default : pour la table, on remplace le VChart -->
		<template v-if="chartType === 'table'" #default>
			<DashboardSectionsBreakdownTable
				:dimension="config.dimension"
				:columns="selectedColumns"
				:loading="loading"
			/>
		</template>
	</DashboardChartsBaseEchartsCard>
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import type { BreakdownDimension, BreakdownMetric } from '~/type'
import { dimensionOptions, metricOptions, defaultTableColumns } from '~/composables/metrics/useBreakdownConfig'
import { dimensionGroupFns } from '~/composables/useAnalytics'
import { buildBarColors, buildBarData, buildBarSeries, buildScatterSeries } from '~/utils/echarts-builders'
import type { EChartsFormatterParams, EChartsGridOption } from '~/utils/echarts-builders'
import { getEchartsBaseOption, getEchartsAxisColors, getEchartsTooltipColors } from '~/utils/chart-utils'

const props = defineProps<{
	itemId: string
	loading?: boolean
}>()

const { config, chartType, setDimension, setMetric, updateConfig } = useBreakdownConfig(props.itemId)
const { t } = useI18n()
const { displayModeNet } = useNetGrossDisplay()
const { formatCurrency } = useUtils()
const { profitColor, lossColor, breakevenColor } = useTypeColors()
const isDark = useIsDark()
const dataStore = useDataStore()

// Items pour les select menus (avec labels traduits)
const dimensionItems = computed(() =>
	dimensionOptions.map(d => ({ value: d.value, label: t(d.labelKey) }))
)
const metricItems = computed(() =>
	metricOptions.map(m => ({ value: m.value, label: t(m.labelKey) }))
)

// Options topN
const topNOptions = [
	{ value: 0, label: t('components.dashboard.breakdown.all') },
	{ value: 5, label: '5' },
	{ value: 10, label: '10' },
	{ value: 15, label: '15' },
	{ value: 20, label: '20' },
]

// v-model wrappers qui persistent la config
const selectedDimension = computed({
	get: () => config.value.dimension,
	set: (val: BreakdownDimension) => setDimension(val),
})

const selectedMetric = computed({
	get: () => config.value.metric,
	set: (val: BreakdownMetric) => setMetric(val),
})

const selectedTopN = computed({
	get: () => config.value.filter?.topN ?? 0,
	set: (val: number) => {
		const newFilter = { ...(config.value.filter || {}), topN: val || undefined }
		updateConfig({ filter: newFilter })
	},
})

// Colonnes affichées par la table (multi-select)
const selectedColumns = computed<BreakdownMetric[]>({
	get: () => config.value.columns ?? defaultTableColumns,
	set: (val: BreakdownMetric[]) => updateConfig({ columns: val }),
})

// Titre du chart
const chartTitle = computed(() => {
	const dim = config.value?.dimension || 'ticker'
	const dimLabel = t(`components.dashboard.breakdown.dimensions.${dim}`)
	if (chartType.value === 'table') {
		return `${t('components.dashboard.breakdown.table_title')} ${dimLabel}`
	}
	const metric = config.value?.metric || 'pnl'
	const metricLabel = t(`components.dashboard.breakdown.metrics.${metric}`)
	return `${metricLabel} ${t('components.dashboard.breakdown.by')} ${dimLabel}`
})

// --- Données ---
const getMetricValue = (m: { pnl: number, winrate: number, profitFactor: number, avgWin: number, avgLoss: number, expectancy: number, avgDuration: number, drawdown: number, currentDrawdown: number, tradesCount: number }) => {
	switch (config.value.metric) {
		case 'pnl': return m.pnl
		case 'winrate': return m.winrate
		case 'profitFactor': return m.profitFactor === Infinity ? 999 : m.profitFactor
		case 'avgWin': return m.avgWin
		case 'avgLoss': return m.avgLoss
		case 'expectancy': return m.expectancy
		case 'avgDuration': return m.avgDuration
		case 'drawdown': return m.drawdown
		case 'currentDrawdown': return m.currentDrawdown
		case 'tradesCount': return m.tradesCount
		default: return m.pnl
	}
}

const formatMetricValue = (val: number): string => {
	switch (config.value.metric) {
		case 'pnl':
		case 'avgWin':
		case 'avgLoss':
		case 'expectancy':
		case 'drawdown':
		case 'currentDrawdown':
			return formatCurrency(val)
		case 'winrate':
			return `${val.toFixed(1)}%`
		case 'profitFactor':
			return val >= 999 ? '∞' : val.toFixed(2)
		case 'avgDuration':
			return `${(val / 60).toFixed(1)}h`
		case 'tradesCount':
			return String(Math.round(val))
		default:
			return formatCurrency(val)
	}
}

const allMetrics = computed(() => {
	const trades = dataStore.lastTrades || []
	if (!trades.length) return []
	const groupFn = dimensionGroupFns[config.value.dimension]
	return calculateMetricsByDimension(trades, groupFn, displayModeNet.value)
})

// Ordre logique pour les dimensions temporelles
const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const sortedMetrics = computed(() => {
	const metrics = allMetrics.value
	const dim = config.value.dimension
	if (dim === 'dayOfWeek') {
		return [...metrics].sort((a, b) => dayOrder.indexOf(a.key) - dayOrder.indexOf(b.key))
	}
	if (dim === 'month') {
		// Format 'YYYY-MM' → tri chronologique
		return [...metrics].sort((a, b) => a.key.localeCompare(b.key))
	}
	if (dim === 'hour') {
		return [...metrics].sort((a, b) => a.key.localeCompare(b.key))
	}
	// Pour les autres dimensions (ticker, tag, side, account) : tri par métrique décroissante
	return [...metrics].sort((a, b) => getMetricValue(b) - getMetricValue(a))
})

const filteredMetrics = computed(() => {
	const metrics = sortedMetrics.value
	const topN = config.value.filter?.topN
	if (!topN || topN <= 0) return metrics
	// TopN prend les N premiers après le tri (pas de re-tri)
	return metrics.slice(0, topN)
})

const modalHeightClass = computed(() => {
	if (chartType.value === 'table') return undefined
	return filteredMetrics.value.length > 10 ? 'h-[300px] sm:h-[700px]' : undefined
})

// --- Bar chart option ---
const barChartOption = computed<EChartsOption>(() => {
	const categories = filteredMetrics.value.map(m => m.key)
	const values = filteredMetrics.value.map(m => getMetricValue(m))
	const colors = (() => {
		const metric = config.value.metric
		if (metric === 'winrate' || metric === 'profitFactor' || metric === 'tradesCount' || metric === 'avgDuration') {
			return values.map(() => profitColor.value)
		}
		return buildBarColors(values, profitColor.value, lossColor.value, breakevenColor.value)
	})()
	const data = buildBarData(values, colors, v => v >= 0 ? [0, 3, 3, 0] : [3, 0, 0, 3])
	const series = buildBarSeries({ data, barMaxWidth: 24, emphasis: { disabled: true } })

	const base = getEchartsBaseOption()
	const { axisColor, textColor } = getEchartsAxisColors(isDark.value)
	const { backgroundColor, borderColor, textColor: tooltipTextColor } = getEchartsTooltipColors()

	const grid: EChartsGridOption = { left: 80, right: 80, top: 12, bottom: 28 }

	return {
		...base,
		tooltip: {
			backgroundColor,
			borderColor,
			textStyle: { color: tooltipTextColor, fontSize: 13 },
			appendTo: 'parent',
			className: 'echarts-custom-tooltip',
			trigger: 'axis',
			axisPointer: { type: 'shadow' },
			formatter: (params: EChartsFormatterParams | EChartsFormatterParams[]) => {
				const p = Array.isArray(params) ? params[0] : params
				const metric = filteredMetrics.value[p.dataIndex]
				if (!metric) return ''
				const lines = [
					`<strong>${metric.key}</strong>`,
					`${t(`components.dashboard.breakdown.metrics.${config.value.metric}`)}: ${formatMetricValue(getMetricValue(metric))}`,
					`${t('components.dashboard.breakdown.metrics.tradesCount')}: ${metric.tradesCount}`,
				]
				// N'affiche P&L que si la métrique courante n'est pas déjà 'pnl'
				if (config.value.metric !== 'pnl') {
					lines.push(`${t('components.dashboard.breakdown.metrics.pnl')}: ${formatCurrency(metric.pnl)}`)
				}
				lines.push(`${t('components.dashboard.breakdown.metrics.winrate')}: ${metric.winrate.toFixed(1)}%`)
				return lines.join('<br/>')
			},
		},
		grid,
		xAxis: {
			type: 'value',
			axisLine: { lineStyle: { color: axisColor } },
			axisTick: { show: false },
			axisLabel: { color: textColor, fontSize: 11, formatter: (v: number) => formatMetricValue(v) },
			splitLine: { lineStyle: { color: axisColor } },
		},
		yAxis: {
			type: 'category',
			data: categories,
			inverse: true, // Première catégorie en bas (ordre naturel de lecture)
			axisLine: { lineStyle: { color: axisColor } },
			axisTick: { show: false },
			axisLabel: { color: textColor, fontSize: 11 },
			splitLine: { show: false },
		},
		series,
	}
})

// --- Scatter chart option ---
// Axe X = catégories de la dimension (ex: Lun, Mar, Mer...)
// Jitter vertical léger pour éviter le chevauchement des points d'une même catégorie
const scatterCategories = computed(() => filteredMetrics.value.map(m => m.key))

const getJitter = (str: string): number => {
	let hash = 0
	for (let i = 0; i < str.length; i++) {
		hash = ((hash << 5) - hash) + str.charCodeAt(i)
		hash |= 0
	}
	return ((Math.abs(hash) % 1000) / 1000 - 0.5)
}

const scatterChartOption = computed<EChartsOption>(() => {
	// data : [categoryIndex, metricValue + jitter, pnl, key, tradesCount]
	const data = filteredMetrics.value.map((m, idx) => {
		const jitterY = getJitter(m.key) * (Math.abs(getMetricValue(m)) * 0.02 + 1)
		return {
			value: [
				idx,
				getMetricValue(m) + jitterY,
				m.pnl,
				m.key,
				m.tradesCount,
			] as unknown as number[],
			itemStyle: {
				color: m.pnl > 0 ? profitColor.value : m.pnl < 0 ? lossColor.value : '#9ca3af',
				borderColor: isDark.value ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.2)',
				borderWidth: 1,
				borderType: 'solid' as const,
			},
		}
	})

	const base = getEchartsBaseOption()
	const { axisColor, textColor } = getEchartsAxisColors(isDark.value)
	const { backgroundColor, borderColor, textColor: tooltipTextColor } = getEchartsTooltipColors()
	const grid: EChartsGridOption = { left: 60, right: 16, top: 24, bottom: 40 }

	const yAxisName = t(`components.dashboard.breakdown.metrics.${config.value.metric}`)
	const yAxisMin = config.value.metric === 'winrate' ? 0 : undefined
	const yAxisMax = config.value.metric === 'winrate' ? 100 : undefined

	return {
		...base,
		tooltip: {
			backgroundColor,
			borderColor,
			textStyle: { color: tooltipTextColor, fontSize: 13 },
			appendTo: 'parent',
			className: 'echarts-custom-tooltip',
			trigger: 'item',
			formatter: (params: EChartsFormatterParams<number | number[]> | EChartsFormatterParams<number | number[]>[]) => {
				const p = Array.isArray(params) ? params[0] : params
				const v = p.value as number[]
				const metricValue = v[1]
				const pnl = v[2]
				const key = v[3]
				const tradesCount = v[4]
				const lines = [
					`<strong>${key}</strong>`,
					`${t(`components.dashboard.breakdown.metrics.${config.value.metric}`)}: ${formatMetricValue(metricValue)}`,
					`${t('components.dashboard.breakdown.metrics.tradesCount')}: ${tradesCount}`,
				]
				// N'affiche P&L que si la métrique courante n'est pas déjà 'pnl'
				if (config.value.metric !== 'pnl') {
					lines.push(`${t('components.dashboard.breakdown.metrics.pnl')}: ${formatCurrency(pnl)}`)
				}
				return lines.join('<br/>')
			},
		},
		grid,
		// Axe X : catégories de la dimension (ex: Lun, Mar, Mer...)
		xAxis: {
			type: 'category',
			data: scatterCategories.value,
			axisLine: { lineStyle: { color: axisColor } },
			axisTick: { show: false },
			axisLabel: { color: textColor, fontSize: 11, rotate: scatterCategories.value.length > 6 ? 30 : 0 },
			splitLine: { show: false },
		},
		yAxis: {
			type: 'value',
			name: yAxisName,
			min: yAxisMin,
			max: yAxisMax,
			axisLine: { show: false },
			axisTick: { show: false },
			axisLabel: { color: textColor, fontSize: 11 },
			splitLine: { lineStyle: { color: axisColor } },
			nameTextStyle: { color: textColor, fontSize: 11 },
		},
		series: buildScatterSeries({
			data,
			symbolSize: (d: unknown[]) => {
				const pnl = Math.abs(d[2] as number)
				const baseSize = Math.min(18, Math.max(10, Math.sqrt(pnl) / 10))
				return baseSize
			},
		}),
	}
})

// Chart option finale selon le type
const chartOption = computed<EChartsOption | undefined>(() => {
	if (chartType.value === 'bar') return barChartOption.value
	if (chartType.value === 'scatter') return scatterChartOption.value
	return undefined
})
</script>
