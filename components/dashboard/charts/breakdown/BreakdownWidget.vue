<template>
	<DashboardChartsBaseWidgetCard
		:title="chartTitle"
		:enlarged-title="chartTitle + ' (enlarged)'"
		:chart-option="chartOption"
		:loading="loading"
		:hide-enlarge="chartType === 'table'"
		:disable-click-enlarge="chartType === 'bar' || chartType === 'barVertical'"
		:use-default-slot="chartType === 'table'"
		:not-merge="chartType !== 'calendar'"
		:modal-height-class="modalHeightClass"
	>
		<!-- Dropdowns dimension/métrique/colonnes/topN dans le header -->
		<template #header-extra>
			<!-- Heatmap : 2 dimensions + métrique -->
			<div v-if="chartType === 'heatmap'" class="flex items-center gap-2 flex-wrap">
				<div class="flex items-center gap-1.5">
					<span class="text-xs text-secondary">X</span>
					<USelectMenu
						v-model="selectedDimension"
						:items="heatmapDimensionItems"
						value-key="value"
						class="w-48"
						size="xs"
					/>
				</div>
				<div class="flex items-center gap-1.5">
					<span class="text-xs text-secondary">Y</span>
					<USelectMenu
						v-model="selectedDimension2"
						:items="heatmapDimensionItems"
						value-key="value"
						class="w-48"
						size="xs"
					/>
				</div>
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
			</div>
			<!-- Calendar : pas de sélecteurs (P&L journalier fixe) -->
			<div v-else-if="chartType === 'calendar'" class="flex items-center gap-2">
				<span class="text-xs text-secondary">{{ $t('components.dashboard.breakdown.calendar.daily_pnl') }}</span>
			</div>
			<!-- Autres charts : dimension + métrique + topN -->
			<div v-else class="flex items-center gap-2 flex-wrap">
				<div class="flex items-center gap-1.5">
					<span class="text-xs text-secondary">{{ $t('components.dashboard.breakdown.dimension') }}</span>
					<USelectMenu
						v-model="selectedDimension"
						:items="dimensionItems"
						value-key="value"
						class="w-48"
						size="xs"
					/>
				</div>
				<!-- Métrique : seulement pour bar/scatter (la table affiche plusieurs colonnes, boxplot/radar utilisent P&L fixe) -->
				<div v-if="chartType !== 'table' && chartType !== 'boxplot' && chartType !== 'radar'" class="flex items-center gap-1.5">
					<span class="text-xs text-secondary">{{ $t('components.dashboard.breakdown.metric') }}</span>
					<USelectMenu
						v-model="selectedMetric"
						:items="metricItems"
						value-key="value"
						class="w-32"
						size="xs"
					/>
				</div>
				<!-- Filtre topN (optionnel, sauf table) -->
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

		<!-- Menu settings : métriques supplémentaires dans le tooltip (pas pour la table) -->
		<template #settings>
			<div v-if="chartType !== 'table'" class="space-y-1">
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

		<!-- Slot default : pour la table, on remplace le VChart -->
		<template #default>
			<DashboardSectionsBreakdownTable
				v-if="chartType === 'table'"
				:dimension="config.dimension"
				:columns="selectedColumns"
				:loading="loading"
			/>
			<div v-else ref="chartContainerRef" class="relative w-full flex-1 min-h-0" style="min-height: 200px;">
				<VChart :option="chartOption" autoresize style="width: 100%; height: 100%;" />
			</div>
		</template>
	</DashboardChartsBaseWidgetCard>
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import type { BreakdownConfig, BreakdownDimension, BreakdownMetric } from '~/type'
import type { BreakdownMetrics, TimezoneSettings } from '~/composables/useAnalytics'
import { dimensionOptions, metricOptions, defaultTableColumns, migrateDimension } from '~/composables/metrics/useBreakdownConfig'
import { getGroupFn, getMetricValueForMetric, formatMetricValueForMetric, injectEmptyTagMetrics, sortMetricsByDimension, getMetricColor, calculateMetricsBy2Dimensions } from '~/composables/useAnalytics'
import { isTagGroupDimension, getTagGroupName } from '~/type'
import { buildBarData, buildBarSeries, buildScatterSeries } from '~/utils/echarts-builders'
import type { EChartsFormatterParams } from '~/utils/echarts-builders'

const props = defineProps<{
	itemId: string
	loading?: boolean
}>()

const { config: rawConfig, chartType, setDimension, setMetric, updateConfig } = useBreakdownConfig(props.itemId)
// BreakdownWidget ne gère que des BreakdownConfig (les TimeSeriesConfig sont gérées par TimeSeriesWidget)
// Applique la migration des anciennes dimensions (dayOfWeek → dayOfWeekOpen, etc.)
const config = computed(() => {
	const c = rawConfig.value as BreakdownConfig
	return { ...c, dimension: migrateDimension(c.dimension), dimension2: c.dimension2 ? migrateDimension(c.dimension2) : c.dimension2 }
})
const { t } = useI18n()
const { displayModeNet } = useNetGrossDisplay()
const isDark = useIsDark()
const { getChartContext } = useEchartsChartOption()
const { profitColor, lossColor, barColor, rawMetricColor, heatmapColors } = useTypeColors('timeSeriesChart')
const dataStore = useDataStore()
const dbStateStore = useDbStateStore()
const userStore = useUserStore()

// Settings de timezone depuis les préférences utilisateur
const timezoneSettings = computed<TimezoneSettings | undefined>(() => {
	const s = userStore.user?.settings_object
	if (!s?.timezoneDisplay) return undefined
	return {
		timezoneDisplay: s.timezoneDisplay,
		timezoneLocal: s.timezoneLocal || 'Europe/Paris',
		timezoneUtcOffset: s.timezoneUtcOffset || 0,
	}
})

// Items pour les select menus (avec labels traduits + tag groups dynamiques)
const dimensionItems = computed(() => {
	const fixed = dimensionOptions.map(d => ({ value: d.value, label: t(d.labelKey) }))
	// Ajoute dynamiquement une dimension par tag group
	const tagGroups = dbStateStore.tagGroups || []
	const tagGroupItems = tagGroups.map(g => ({
		value: `tagGroup_${g.name}`,
		label: `${t('components.dashboard.breakdown.dimensions.tag')}: ${g.name}`,
	}))
	return [...fixed, ...tagGroupItems]
})
const metricItems = computed(() =>
	metricOptions.map(m => ({ value: m.value, label: t(m.labelKey) }))
)

// Options topN (réactif aux changements de langue)
const topNOptions = computed(() => [
	{ value: 0, label: t('components.dashboard.breakdown.all') },
	{ value: 50, label: '50' },
	{ value: 40, label: '40' },
	{ value: 30, label: '30' },
	{ value: 20, label: '20' },
	{ value: 15, label: '15' },
	{ value: 10, label: '10' },
])

// v-model wrappers qui persistent la config
const selectedDimension = computed({
	get: () => config.value.dimension,
	set: (val: BreakdownDimension) => setDimension(val),
})

// Deuxième dimension pour la heatmap (axe Y)
const selectedDimension2 = computed<BreakdownDimension>({
	get: () => config.value.dimension2 ?? 'dayOfWeekOpen',
	set: (val: BreakdownDimension) => updateConfig({ dimension2: val }),
})

// Dimensions disponibles pour la heatmap
const heatmapDimensionItems = computed(() => {
	const fixed = dimensionOptions.map(d => ({ value: d.value, label: t(d.labelKey) }))
	const tagGroups = dbStateStore.tagGroups || []
	const tagGroupItems = tagGroups.map(g => ({
		value: `tagGroup_${g.name}`,
		label: `${t('components.dashboard.breakdown.dimensions.tag')}: ${g.name}`,
	}))
	return [...fixed, ...tagGroupItems]
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

// Métriques supplémentaires affichées dans le tooltip (bar/scatter)
const { selectedTooltipMetrics, toggleTooltipMetric } = useTooltipMetrics(config, updateConfig)

// Titre du chart
const chartTitle = computed(() => {
	const dim = config.value?.dimension || 'ticker'
	// Label de la dimension : traduit pour les dimensions fixes, "Tag: <group>" pour les tag groups
	let dimLabel: string
	if (isTagGroupDimension(dim)) {
		const groupName = getTagGroupName(dim) || ''
		dimLabel = `${t('components.dashboard.breakdown.dimensions.tag')}: ${groupName}`
	} else {
		dimLabel = t(`components.dashboard.breakdown.dimensions.${dim}`)
	}
	if (chartType.value === 'table') {
		return `${t('components.dashboard.breakdown.table_title')} ${dimLabel}`
	}
	const metric = config.value?.metric || 'pnl'
	const metricLabel = t(`components.dashboard.breakdown.metrics.${metric}`)
	return `${metricLabel} ${t('components.dashboard.breakdown.by')} ${dimLabel}`
})

// --- Données ---
// Raccourcis qui utilisent la métrique courante de la config
const getMetricValue = (m: BreakdownMetrics) => getMetricValueForMetric(m, config.value.metric)
const formatMetricValue = (val: number) => formatMetricValueForMetric(val, config.value.metric)

// Génère les lignes de tooltip pour les métriques supplémentaires sélectionnées
// (évite les doublons avec la métrique principale et les lignes déjà affichées)
// Si isEmpty=true, affiche les labels avec valeurs vides sauf tradesCount qui affiche 0
const buildExtraTooltipLines = (metric: BreakdownMetrics, alreadyShown: Set<BreakdownMetric>, isEmpty = false): string[] => {
	const lines: string[] = []
	for (const m of selectedTooltipMetrics.value) {
		if (alreadyShown.has(m)) continue
		const val = getMetricValueForMetric(metric, m)
		const display = isEmpty ? (m === 'tradesCount' ? '0' : '') : formatMetricValueForMetric(val, m)
		lines.push(`${t(`components.dashboard.breakdown.metrics.${m}`)}: ${display}`)
	}
	return lines
}

const allMetrics = computed(() => {
	const trades = dataStore.lastTrades || []
	if (!trades.length) return []
	const tagGroups = dbStateStore.tagGroups || []
	const dim = config.value.dimension
	const groupFn = getGroupFn(dim, tagGroups, timezoneSettings.value)
	const metrics = calculateMetricsByDimension(trades, groupFn, displayModeNet.value)
	return injectEmptyTagMetrics(metrics, dim, tagGroups)
})

// Traduit la clé d'une dimension en label lisible (mois, jour de semaine traduits)
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
		// Format 'YYYY-MM' → 'Mois Année'
		const [year, monthNum] = key.split('-')
		const monthIdx = parseInt(monthNum, 10) - 1
		if (monthIdx >= 0 && monthIdx <= 11) {
			return `${t(`common.months.long.${monthIdx}`)} ${year}`
		}
		return key
	}
	// ticker, tag, side, hourStart, hourEnd : clé brute
	return key
}

// Tri logique selon la dimension
const sortedMetrics = computed(() =>
	sortMetricsByDimension(allMetrics.value, config.value.dimension, config.value.metric)
)

const filteredMetrics = computed(() => {
	let metrics = sortedMetrics.value
	// avgLoss/avgWin : masquer les groupes sans trade correspondant (valeur 0 n'a pas de sens)
	if (config.value.metric === 'avgLoss') {
		metrics = metrics.filter(m => m.losingTradesCount > 0)
	} else if (config.value.metric === 'avgWin') {
		metrics = metrics.filter(m => m.winningTradesCount > 0)
	}
	const topN = config.value.filter?.topN
	if (!topN || topN <= 0) return metrics
	// TopN prend les N premiers après le tri (pas de re-tri)
	return metrics.slice(0, topN)
})

const modalHeightClass = computed(() => {
	if (chartType.value === 'table') return undefined
	if (chartType.value === 'calendar') return 'h-[400px] sm:h-[700px]'
	return filteredMetrics.value.length > 10 ? 'h-[300px] sm:h-[700px]' : undefined
})

// --- Bar chart option ---
const barChartOption = computed<EChartsOption>(() => {
	const dim = config.value.dimension
	const categories = filteredMetrics.value.map(m => formatDimensionLabel(dim, m.key))
	const values = filteredMetrics.value.map(m => getMetricValue(m))
	// Même logique de couleur que le scatter chart
	const colors = filteredMetrics.value.map(m => getScatterColor(m))
	const data = buildBarData(values, colors, v => v >= 0 ? [0, 3, 3, 0] : [3, 0, 0, 3])
	const series = buildBarSeries({ data, barMaxWidth: 16, barCategoryGap: '10%', emphasis: { disabled: true } })

	const ctx = getChartContext({ left: 80, right: 80, top: 12, bottom: 28 })
	const { base, axisColor, textColor, backgroundColor, borderColor, tooltipTextColor, grid } = ctx

	const hasZoom = categories.length > 20
	const zoomEnd = hasZoom ? Math.min(100, (20 / categories.length) * 100) : 100

	return {
		...base,
		tooltip: {
			backgroundColor,
			borderColor,
			textStyle: { color: tooltipTextColor, fontSize: 13 },
			appendTo: document.body,
			className: 'echarts-custom-tooltip',
			trigger: 'axis',
			axisPointer: { type: 'line', lineStyle: { type: 'dashed' } },
			formatter: (params: EChartsFormatterParams | EChartsFormatterParams[]) => {
				const p = Array.isArray(params) ? params[0] : params
				const metric = filteredMetrics.value[p.dataIndex]
				if (!metric) return ''
				const dim = config.value.dimension
				const currentMetric = config.value.metric
				const shown = new Set<BreakdownMetric>([currentMetric])
				const isEmpty = metric.tradesCount === 0
				const lines = [
					`<strong>${formatDimensionLabel(dim, metric.key)}</strong>`,
					`${t(`components.dashboard.breakdown.metrics.${currentMetric}`)}: ${isEmpty ? (currentMetric === 'tradesCount' ? '0' : '') : formatMetricValue(getMetricValue(metric))}`,
				]
				lines.push(...buildExtraTooltipLines(metric, shown, isEmpty))
				return lines.join('<br/>')
			},
		},
		grid: { ...grid, right: hasZoom ? 100 : 80 },
		dataZoom: hasZoom ? [
			{ type: 'slider', yAxisIndex: 0, start: 0, end: zoomEnd, width: 20, right: 5, filterMode: 'filter' },
			{ type: 'inside', yAxisIndex: 0, start: 0, end: zoomEnd, filterMode: 'filter', moveOnMouseWheel: 'shift', zoomOnMouseWheel: false },
		] : undefined,
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

// --- Bar vertical chart option ---
// Même logique que barChartOption mais avec axes inversés :
// catégories sur axe X (horizontal), valeurs sur axe Y (vertical)
const barVerticalChartOption = computed<EChartsOption>(() => {
	const dim = config.value.dimension
	const categories = filteredMetrics.value.map(m => formatDimensionLabel(dim, m.key))
	const values = filteredMetrics.value.map(m => getMetricValue(m))
	const colors = filteredMetrics.value.map(m => getScatterColor(m))
	const data = buildBarData(values, colors, v => v >= 0 ? [3, 3, 0, 0] : [0, 0, 3, 3])
	const series = buildBarSeries({ data, barMaxWidth: 20, barCategoryGap: '10%', emphasis: { disabled: true } })

	const ctx = getChartContext({ left: 60, right: 16, top: 12, bottom: 60 })
	const { base, axisColor, textColor, backgroundColor, borderColor, tooltipTextColor, grid } = ctx

	// Y axis min/max selon la métrique (winrate : 0-100)
	const yAxisMin = config.value.metric === 'winrate' ? 0 : undefined
	const yAxisMax = config.value.metric === 'winrate' ? 100 : undefined

	const hasZoom = categories.length > 20
	const zoomEnd = hasZoom ? Math.min(100, (20 / categories.length) * 100) : 100

	return {
		...base,
		tooltip: {
			backgroundColor,
			borderColor,
			textStyle: { color: tooltipTextColor, fontSize: 13 },
			appendTo: document.body,
			className: 'echarts-custom-tooltip',
			trigger: 'axis',
			axisPointer: { type: 'line', lineStyle: { type: 'dashed' } },
			formatter: (params: EChartsFormatterParams | EChartsFormatterParams[]) => {
				const p = Array.isArray(params) ? params[0] : params
				const metric = filteredMetrics.value[p.dataIndex]
				if (!metric) return ''
				const dim = config.value.dimension
				const currentMetric = config.value.metric
				const shown = new Set<BreakdownMetric>([currentMetric])
				const isEmpty = metric.tradesCount === 0
				const lines = [
					`<strong>${formatDimensionLabel(dim, metric.key)}</strong>`,
					`${t(`components.dashboard.breakdown.metrics.${currentMetric}`)}: ${isEmpty ? (currentMetric === 'tradesCount' ? '0' : '') : formatMetricValue(getMetricValue(metric))}`,
				]
				lines.push(...buildExtraTooltipLines(metric, shown, isEmpty))
				return lines.join('<br/>')
			},
		},
		grid,
		dataZoom: hasZoom ? [
			{ type: 'slider', xAxisIndex: 0, start: 0, end: zoomEnd, height: 20, bottom: 5, filterMode: 'filter' },
			{ type: 'inside', xAxisIndex: 0, start: 0, end: zoomEnd, filterMode: 'filter', moveOnMouseWheel: 'shift', zoomOnMouseWheel: false },
		] : undefined,
		xAxis: {
			type: 'category',
			data: categories,
			axisLine: { lineStyle: { color: axisColor } },
			axisTick: { show: false },
			axisLabel: { color: textColor, fontSize: 11, interval: 0, rotate: categories.length > 6 ? 30 : 0 },
			splitLine: { show: false },
		},
		yAxis: {
			type: 'value',
			min: yAxisMin,
			max: yAxisMax,
			axisLine: { lineStyle: { color: axisColor } },
			axisTick: { show: false },
			axisLabel: { color: textColor, fontSize: 11, formatter: (v: number) => formatMetricValue(v) },
			splitLine: { lineStyle: { color: axisColor } },
		},
		series,
	}
})

// --- Scatter chart option ---
// Axe X = catégories de la dimension (ex: Lun, Mar, Mer...)
// Jitter vertical léger pour éviter le chevauchement des points d'une même catégorie
const scatterCategories = computed(() => {
	const dim = config.value.dimension
	return filteredMetrics.value.map(m => formatDimensionLabel(dim, m.key))
})

// Couleur du point/barre selon la métrique sélectionnée (logique centralisée dans useAnalytics)
const getScatterColor = (m: BreakdownMetrics): string => getMetricColor(m, config.value.metric, {
	profit: profitColor.value,
	loss: lossColor.value,
	bar: barColor.value,
	rawMetric: rawMetricColor.value,
})

const getJitter = (str: string): number => {
	let hash = 0
	for (let i = 0; i < str.length; i++) {
		hash = ((hash << 5) - hash) + str.charCodeAt(i)
		hash |= 0
	}
	return ((Math.abs(hash) % 1000) / 1000 - 0.5)
}

const scatterChartOption = computed<EChartsOption>(() => {
	// data : [categoryIndex + jitterX, metricValue, pnl, key, tradesCount]
	// Jitter sur X uniquement pour éviter la superposition de points à la même valeur Y
	// (ex: plusieurs jours à winrate=100%), sans corrompre la valeur réelle sur Y
	const data = filteredMetrics.value.map((m, idx) => {
		const jitterX = getJitter(m.key) * 0.15
		return {
			value: [
				idx + jitterX,
				getMetricValue(m),
				m.pnl,
				m.key,
				m.tradesCount,
			] as unknown as number[],
			itemStyle: {
				color: getScatterColor(m),
				borderColor: isDark.value ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.2)',
				borderWidth: 1,
				borderType: 'solid' as const,
			},
		}
	})

	const ctx = getChartContext({ left: 60, right: 16, top: 24, bottom: scatterCategories.value.length > 20 ? 60 : 40 })
	const { base, axisColor, textColor, backgroundColor, borderColor, tooltipTextColor, grid } = ctx

	const yAxisName = t(`components.dashboard.breakdown.metrics.${config.value.metric}`)
	const yAxisMin = config.value.metric === 'winrate' ? 0 : undefined
	const yAxisMax = config.value.metric === 'winrate' ? 100 : undefined

	const hasZoom = scatterCategories.value.length > 25
	const zoomEnd = hasZoom ? Math.min(100, (25 / scatterCategories.value.length) * 100) : 100

	return {
		...base,
		tooltip: {
			backgroundColor,
			borderColor,
			textStyle: { color: tooltipTextColor, fontSize: 13 },
			appendTo: document.body,
			className: 'echarts-custom-tooltip',
			trigger: 'item',
			formatter: (params: EChartsFormatterParams<number | number[]> | EChartsFormatterParams<number | number[]>[]) => {
				const p = Array.isArray(params) ? params[0] : params
				const v = p.value as number[]
				const idx = v[0]
				const metricValue = v[1]
				const key = String(v[3])
				const dim = config.value.dimension
				const currentMetric = config.value.metric
				const shown = new Set<BreakdownMetric>([currentMetric])
				const fullMetric = filteredMetrics.value[idx]
				const isEmpty = fullMetric?.tradesCount === 0
				const lines = [
					`<strong>${formatDimensionLabel(dim, key)}</strong>`,
					`${t(`components.dashboard.breakdown.metrics.${currentMetric}`)}: ${isEmpty ? (currentMetric === 'tradesCount' ? '0' : '') : formatMetricValue(metricValue)}`,
				]
				// Métriques supplémentaires depuis le metric complet
				if (fullMetric) {
					lines.push(...buildExtraTooltipLines(fullMetric, shown, isEmpty))
				}
				return lines.join('<br/>')
			},
		},
		grid,
		dataZoom: hasZoom ? [
			{ type: 'slider', xAxisIndex: 0, start: 0, end: zoomEnd, height: 20, bottom: 5, filterMode: 'filter' },
			{ type: 'inside', xAxisIndex: 0, start: 0, end: zoomEnd, filterMode: 'filter', moveOnMouseWheel: 'shift', zoomOnMouseWheel: false },
		] : undefined,
		// Axe X : catégories de la dimension (ex: Lun, Mar, Mer...)
		xAxis: {
			type: 'category',
			data: scatterCategories.value,
			axisLine: { lineStyle: { color: axisColor } },
			axisTick: { show: false },
			axisLabel: { color: textColor, fontSize: 11, interval: 0, rotate: scatterCategories.value.length > 6 ? 30 : 0 },
			splitLine: { show: false },
		},
		yAxis: {
			type: 'value',
			name: yAxisName,
			min: yAxisMin,
			max: yAxisMax,
			axisLine: { show: false },
			axisTick: { show: false },
			axisLabel: { color: textColor, fontSize: 11, formatter: (v: number) => formatMetricValue(v) },
			splitLine: { lineStyle: { color: axisColor } },
			nameTextStyle: { color: textColor, fontSize: 11 },
		},
		series: buildScatterSeries({
			data,
			symbolSize: (d: unknown[]) => {
				const pnl = Math.abs(d[2] as number)
				const baseSize = Math.min(12, Math.max(8, Math.sqrt(pnl) / 12))
				return baseSize
			},
		}),
	}
})

// --- Heatmap chart option (2D générique : dimension X × dimension Y) ---
const heatmap2DCells = computed(() => {
	if (chartType.value !== 'heatmap') return []
	const trades = dataStore.lastTrades || []
	if (!trades.length) return []
	const tagGroups = dbStateStore.tagGroups || []
	const tz = timezoneSettings.value
	const dimX = config.value.dimension
	const dimY = config.value.dimension2 ?? 'dayOfWeekOpen'
	const groupFnX = getGroupFn(dimX, tagGroups, tz)
	const groupFnY = getGroupFn(dimY, tagGroups, tz)
	return calculateMetricsBy2Dimensions(trades, groupFnX, groupFnY, displayModeNet.value)
})

// Labels uniques pour les axes X et Y (triés logiquement)
const heatmapXLabels = computed(() => {
	const dim = config.value.dimension
	const keys = Array.from(new Set(heatmap2DCells.value.map(c => c.keyX)))
	// Tri logique selon la dimension
	const sorted = [...keys].sort((a, b) => {
		if (dim === 'hourStart' || dim === 'hourEnd') return parseInt(a) - parseInt(b)
		if (dim === 'dayOfWeekOpen' || dim === 'dayOfWeekClose') return parseInt(a) - parseInt(b)
		if (dim === 'monthOpen' || dim === 'monthClose') return parseInt(a) - parseInt(b)
		return a.localeCompare(b)
	})
	return sorted.map(k => formatDimensionLabel(dim, k))
})

const heatmapYLabels = computed(() => {
	const dim = config.value.dimension2 ?? 'dayOfWeekOpen'
	const keys = Array.from(new Set(heatmap2DCells.value.map(c => c.keyY)))
	const sorted = [...keys].sort((a, b) => {
		if (dim === 'hourStart' || dim === 'hourEnd') return parseInt(a) - parseInt(b)
		if (dim === 'dayOfWeekOpen' || dim === 'dayOfWeekClose') return parseInt(a) - parseInt(b)
		if (dim === 'monthOpen' || dim === 'monthClose') return parseInt(a) - parseInt(b)
		return a.localeCompare(b)
	})
	return sorted.map(k => formatDimensionLabel(dim, k))
})

// Données pour ECharts : [indexX, indexY, valeur]
const heatmapDataItems = computed(() => {
	const dim = config.value.dimension
	const dim2 = config.value.dimension2 ?? 'dayOfWeekOpen'
	// Construit les maps à partir des labels triés (cohérent avec heatmapXLabels/heatmapYLabels)
	const xKeys = Array.from(new Set(heatmap2DCells.value.map(c => c.keyX))).sort((a, b) => {
		if (dim === 'hourStart' || dim === 'hourEnd') return parseInt(a) - parseInt(b)
		if (dim === 'dayOfWeekOpen' || dim === 'dayOfWeekClose') return parseInt(a) - parseInt(b)
		if (dim === 'monthOpen' || dim === 'monthClose') return parseInt(a) - parseInt(b)
		return a.localeCompare(b)
	})
	const yKeys = Array.from(new Set(heatmap2DCells.value.map(c => c.keyY))).sort((a, b) => {
		if (dim2 === 'hourStart' || dim2 === 'hourEnd') return parseInt(a) - parseInt(b)
		if (dim2 === 'dayOfWeekOpen' || dim2 === 'dayOfWeekClose') return parseInt(a) - parseInt(b)
		if (dim2 === 'monthOpen' || dim2 === 'monthClose') return parseInt(a) - parseInt(b)
		return a.localeCompare(b)
	})
	const xLabelMap = new Map<string, number>(xKeys.map((k, i) => [k, i]))
	const yLabelMap = new Map<string, number>(yKeys.map((k, i) => [k, i]))
	return heatmap2DCells.value.map(c => {
		const xi = xLabelMap.get(c.keyX) ?? 0
		const yi = yLabelMap.get(c.keyY) ?? 0
		const val = getMetricValueForMetric(c.metrics, config.value.metric)
		return [xi, yi, val] as [number, number, number]
	})
})

// Valeur max absolue pour le visualMap
const heatmapMaxAbs = computed(() =>
	Math.max(...heatmapDataItems.value.map(d => Math.abs(d[2])), 1)
)

const heatmapChartOption = computed<EChartsOption>(() => {
	const ctx = getChartContext()
	const { base, axisColor, textColor, backgroundColor, borderColor, tooltipTextColor } = ctx
	const xLabels = heatmapXLabels.value
	const yLabels = heatmapYLabels.value
	const data = heatmapDataItems.value
	const maxAbs = heatmapMaxAbs.value
	const metric = config.value.metric
	const dimX = config.value.dimension
	const dimY = config.value.dimension2 ?? 'dayOfWeekOpen'
	const tooltipMetrics = selectedTooltipMetrics.value

	// Map pour retrouver les cells par index (cohérent avec les labels triés)
	const xKeys = Array.from(new Set(heatmap2DCells.value.map(c => c.keyX))).sort((a, b) => {
		if (dimX === 'hourStart' || dimX === 'hourEnd') return parseInt(a) - parseInt(b)
		if (dimX === 'dayOfWeekOpen' || dimX === 'dayOfWeekClose') return parseInt(a) - parseInt(b)
		if (dimX === 'monthOpen' || dimX === 'monthClose') return parseInt(a) - parseInt(b)
		return a.localeCompare(b)
	})
	const yKeys = Array.from(new Set(heatmap2DCells.value.map(c => c.keyY))).sort((a, b) => {
		if (dimY === 'hourStart' || dimY === 'hourEnd') return parseInt(a) - parseInt(b)
		if (dimY === 'dayOfWeekOpen' || dimY === 'dayOfWeekClose') return parseInt(a) - parseInt(b)
		if (dimY === 'monthOpen' || dimY === 'monthClose') return parseInt(a) - parseInt(b)
		return a.localeCompare(b)
	})
	const xLabelMap = new Map<string, number>(xKeys.map((k, i) => [k, i]))
	const yLabelMap = new Map<string, number>(yKeys.map((k, i) => [k, i]))

	return {
		...base,
		tooltip: {
			backgroundColor, borderColor,
			textStyle: { color: tooltipTextColor, fontSize: 13 },
			appendTo: document.body,
			className: 'echarts-custom-tooltip',
			formatter: (params: EChartsFormatterParams | EChartsFormatterParams[]) => {
				const p = Array.isArray(params) ? params[0] : params
				const [xi, yi] = p.value as unknown as [number, number, number]
				const xLabel = xLabels[xi] ?? ''
				const yLabel = yLabels[yi] ?? ''
				// Retrouve la cell pour les tooltip metrics
				const cell = heatmap2DCells.value.find(c => xLabelMap.get(c.keyX) === xi && yLabelMap.get(c.keyY) === yi)
				const lines = [`<strong>${yLabel} × ${xLabel}</strong>`]
				// Métrique principale
				const val = (p.value as unknown as [number, number, number])[2]
				lines.push(`${t(`components.dashboard.breakdown.metrics.${metric}`)}: ${formatMetricValueForMetric(val, metric)}`)
				// Tooltip metrics supplémentaires
				if (cell) {
					for (const tm of tooltipMetrics) {
						if (tm === metric) continue
						const tmVal = getMetricValueForMetric(cell.metrics, tm)
						lines.push(`${t(`components.dashboard.breakdown.metrics.${tm}`)}: ${formatMetricValueForMetric(tmVal, tm)}`)
					}
				}
				return lines.join('<br/>')
			},
		},
		grid: { left: 60, right: 16, top: 12, bottom: 28 },
		xAxis: {
			type: 'category',
			data: xLabels,
			splitArea: { show: true },
			axisLine: { lineStyle: { color: axisColor } },
			axisTick: { show: false },
			axisLabel: { color: textColor, fontSize: 10 },
			axisPointer: { show: false },
			splitLine: { show: false },
		},
		yAxis: {
			type: 'category',
			data: yLabels,
			inverse: true,
			splitArea: { show: true },
			axisLine: { lineStyle: { color: axisColor } },
			axisTick: { show: false },
			axisLabel: { color: textColor, fontSize: 13 },
			splitLine: { show: false },
		},
		visualMap: {
			min: -maxAbs,
			max: maxAbs,
			calculable: true,
			orient: 'horizontal',
			left: 'center',
			bottom: 0,
			textStyle: { color: textColor, fontSize: 10 },
			inRange: {
				color: [heatmapColors.value.min, heatmapColors.value.max],
			},
			outOfRange: {
				color: isDark.value ? '#111827' : '#f3f4f6',
			},
			show: false,
		},
		series: [{
			type: 'heatmap',
			data,
			label: { show: false },
			emphasis: {
				itemStyle: {
					borderColor: isDark.value ? '#ffffff' : '#1f2937',
					borderWidth: 2,
				},
			},
		}],
	}
})

// --- Boxplot chart option (distribution de la métrique par dimension) ---
// Affiche la distribution des valeurs individuelles (P&L par trade) pour chaque groupe
const boxplotData = computed(() => {
	const trades = dataStore.lastTrades || []
	if (!trades.length) return { categories: [] as string[], data: [] as number[][], rawTrades: [] as number[][] }
	const tagGroups = dbStateStore.tagGroups || []
	const dim = config.value.dimension
	const groupFn = getGroupFn(dim, tagGroups, timezoneSettings.value)
	// Grouper les trades bruts par dimension
	const groups = new Map<string, number[]>()
	for (const trade of trades) {
		const key = groupFn(trade)
		if (key === null || key === undefined) continue
		const val = displayModeNet.value ? trade.netProfit : trade.profit
		// Pour les métriques non-PnL, on garde le PnL comme valeur de distribution
		// (le boxplot montre la distribution des trades, pas la métrique agrégée)
		if (!groups.has(key)) groups.set(key, [])
		groups.get(key)!.push(val)
	}
	// Trier les groupes selon la même logique que sortedMetrics
	const sortedKeys = [...groups.keys()].sort((a, b) => {
		const sa = String(a), sb = String(b)
		if (dim === 'hourStart' || dim === 'hourEnd') return parseInt(sa) - parseInt(sb)
		if (dim === 'dayOfWeekOpen' || dim === 'dayOfWeekClose') return parseInt(sa) - parseInt(sb)
		if (dim === 'monthOpen' || dim === 'monthClose') return parseInt(sa) - parseInt(sb)
		return sa.localeCompare(sb)
	})
	// Appliquer le topN
	const topN = config.value.filter?.topN
	const limitedKeys = (!topN || topN <= 0) ? sortedKeys : sortedKeys.slice(0, topN)
	const categories = limitedKeys.map(k => formatDimensionLabel(dim, String(k)))
	const data = limitedKeys.map(k => {
		const vals = groups.get(k) || []
		if (!vals.length) return [0, 0, 0, 0, 0]
		const sorted = [...vals].sort((a, b) => a - b)
		const q = (p: number) => {
			const idx = p * (sorted.length - 1)
			const lo = Math.floor(idx)
			const hi = Math.ceil(idx)
			if (lo === hi) return sorted[lo]
			return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
		}
		return [sorted[0], q(0.25), q(0.5), q(0.75), sorted[sorted.length - 1]]
	})
	const rawTrades = limitedKeys.map(k => groups.get(k) || [])
	return { categories, data, rawTrades }
})

const boxplotChartOption = computed<EChartsOption>(() => {
	const ctx = getChartContext({ left: 60, right: 16, top: 12, bottom: 60 })
	const { base, axisColor, textColor, backgroundColor, borderColor, tooltipTextColor, grid } = ctx
	const { categories, data, rawTrades } = boxplotData.value

	return {
		...base,
		tooltip: {
			backgroundColor, borderColor,
			textStyle: { color: tooltipTextColor, fontSize: 13 },
			appendTo: document.body,
			className: 'echarts-custom-tooltip',
			trigger: 'item',
			formatter: (params: EChartsFormatterParams | EChartsFormatterParams[]) => {
				const p = Array.isArray(params) ? params[0] : params
				const idx = p.dataIndex
				const cat = categories[idx] ?? ''
				const d = data[idx]
				if (!d) return ''
				const raw = rawTrades[idx] || []
				const lines = [
					`<strong>${cat}</strong>`,
					`${t('components.dashboard.breakdown.boxplot.min')}: ${formatMetricValueForMetric(d[0], 'pnl')}`,
					`${t('components.dashboard.breakdown.boxplot.q1')}: ${formatMetricValueForMetric(d[1], 'pnl')}`,
					`${t('components.dashboard.breakdown.boxplot.median')}: ${formatMetricValueForMetric(d[2], 'pnl')}`,
					`${t('components.dashboard.breakdown.boxplot.q3')}: ${formatMetricValueForMetric(d[3], 'pnl')}`,
					`${t('components.dashboard.breakdown.boxplot.max')}: ${formatMetricValueForMetric(d[4], 'pnl')}`,
					`${t('components.dashboard.breakdown.metrics.tradesCount')}: ${raw.length}`,
				]
				return lines.join('<br/>')
			},
		},
		grid,
		xAxis: {
			type: 'category',
			data: categories,
			axisLine: { lineStyle: { color: axisColor } },
			axisTick: { show: false },
			axisLabel: { color: textColor, fontSize: 11, interval: 0, rotate: categories.length > 6 ? 30 : 0 },
			splitLine: { show: false },
		},
		yAxis: {
			type: 'value',
			name: t('components.dashboard.breakdown.metrics.pnl'),
			axisLine: { show: false },
			axisTick: { show: false },
			axisLabel: { color: textColor, fontSize: 11, formatter: (v: number) => formatMetricValueForMetric(v, 'pnl') },
			splitLine: { lineStyle: { color: axisColor } },
			nameTextStyle: { color: textColor, fontSize: 11 },
		},
		series: [{
			type: 'boxplot',
			data,
			itemStyle: {
				color: isDark.value ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.25)',
				borderColor: barColor.value,
				borderWidth: 1.5,
			},
		}],
	}
})

// --- Radar chart option (profil de performance multi-axes) ---
// Compare plusieurs dimensions sur des axes normalisés (0-100)
const radarMetrics = computed(() => {
	const metrics = filteredMetrics.value
	if (!metrics.length) return { indicators: [] as { name: string, max: number }[], values: [] as number[][], names: [] as string[] }
	const dim = config.value.dimension
	// Pour chaque groupe, on calcule un profil normalisé sur plusieurs métriques
	// Axes : Winrate, Profit Factor, Expectancy, P&L, Trades Count
	const maxPF = Math.max(...metrics.map(m => m.profitFactor || 0), 1)
	const maxExp = Math.max(...metrics.map(m => Math.abs(m.appt || 0)), 1)
	const maxPnl = Math.max(...metrics.map(m => Math.abs(m.pnl || 0)), 1)
	const maxCount = Math.max(...metrics.map(m => m.tradesCount || 0), 1)
	// Top 8 pour la lisibilité du radar
	const limited = metrics.slice(0, 8)
	const names = limited.map(m => formatDimensionLabel(dim, m.key))
	const indicators = [
		{ name: t('components.dashboard.breakdown.metrics.winrate'), max: 100 },
		{ name: t('components.dashboard.breakdown.metrics.profitFactor'), max: maxPF },
		{ name: t('components.dashboard.breakdown.metrics.expectancy'), max: maxExp },
		{ name: t('components.dashboard.breakdown.metrics.pnl'), max: maxPnl },
		{ name: t('components.dashboard.breakdown.metrics.tradesCount'), max: maxCount },
	]
	const values = limited.map(m => [
		m.winrate || 0,
		m.profitFactor || 0,
		m.appt || 0,
		m.pnl || 0,
		m.tradesCount || 0,
	])
	return { indicators, values, names }
})

const radarChartOption = computed<EChartsOption>(() => {
	const ctx = getChartContext()
	const { base, textColor, backgroundColor, borderColor, tooltipTextColor, isDark: dark } = ctx
	const { indicators, values, names } = radarMetrics.value
	if (!indicators.length) return { ...base }

	// Palette de couleurs pour les différentes séries
	const palette = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

	return {
		...base,
		tooltip: {
			backgroundColor, borderColor,
			textStyle: { color: tooltipTextColor, fontSize: 13 },
			appendTo: document.body,
			className: 'echarts-custom-tooltip',
			trigger: 'item',
			formatter: (params: EChartsFormatterParams | EChartsFormatterParams[]) => {
				const p = Array.isArray(params) ? params[0] : params
				const idx = p.dataIndex
				const name = names[idx] ?? ''
				const vals = values[idx] || []
				const lines = [`<strong>${name}</strong>`]
				indicators.forEach((ind, i) => {
					const val = vals[i] ?? 0
					const metricKey = ['winrate', 'profitFactor', 'expectancy', 'pnl', 'tradesCount'][i]
					lines.push(`${ind.name}: ${formatMetricValueForMetric(val, metricKey as BreakdownMetric)}`)
				})
				return lines.join('<br/>')
			},
		},
		legend: {
			data: names,
			bottom: 0,
			textStyle: { color: textColor, fontSize: 10 },
			type: 'scroll',
		},
		radar: {
			indicator: indicators,
			center: ['50%', '50%'],
			radius: '60%',
			axisName: { color: textColor, fontSize: 10 },
			splitArea: { areaStyle: { color: dark ? ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.05)'] : ['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.04)'] } },
			splitLine: { lineStyle: { color: dark ? '#374151' : '#d1d5db' } },
			axisLine: { lineStyle: { color: dark ? '#374151' : '#d1d5db' } },
		},
		series: [{
			type: 'radar',
			data: values.map((v, i) => ({
				value: v,
				name: names[i],
				areaStyle: { opacity: 0.1 },
				lineStyle: { color: palette[i % palette.length], width: 2 },
				itemStyle: { color: palette[i % palette.length] },
			})),
		}],
	}
})

// Chart option finale selon le type
const chartOption = computed<EChartsOption | undefined>(() => {
	if (chartType.value === 'bar') return barChartOption.value
	if (chartType.value === 'barVertical') return barVerticalChartOption.value
	if (chartType.value === 'scatter') return scatterChartOption.value
	if (chartType.value === 'heatmap') return heatmapChartOption.value
	if (chartType.value === 'boxplot') return boxplotChartOption.value
	if (chartType.value === 'radar') return radarChartOption.value
	return undefined
})
</script>
