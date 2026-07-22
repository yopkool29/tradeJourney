<template>
	<DashboardChartsBaseEchartsCard
		:title="chartTitle"
		:enlarged-title="chartTitle + ' (enlarged)'"
		:chart-option="chartOption"
		:loading="loading"
		:hide-enlarge="chartType === 'table'"
		:use-default-slot="chartType === 'table'"
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

		<!-- Menu settings : métriques supplémentaires dans le tooltip (bar/scatter seulement) -->
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
	</DashboardChartsBaseEchartsCard>
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import type { BreakdownDimension, BreakdownMetric } from '~/type'
import type { BreakdownMetrics } from '~/composables/useAnalytics'
import { dimensionOptions, metricOptions, defaultTableColumns } from '~/composables/metrics/useBreakdownConfig'
import { getGroupFn, getMetricValueForMetric, formatMetricValueForMetric, injectEmptyTagMetrics, sortMetricsByDimension } from '~/composables/useAnalytics'
import { isTagGroupDimension, getTagGroupName } from '~/type'
import { buildBarData, buildBarSeries, buildScatterSeries } from '~/utils/echarts-builders'
import type { EChartsFormatterParams, EChartsGridOption } from '~/utils/echarts-builders'
import { getEchartsBaseOption, getEchartsAxisColors, getEchartsTooltipColors } from '~/utils/chart-utils'

const props = defineProps<{
	itemId: string
	loading?: boolean
}>()

const { config, chartType, setDimension, setMetric, updateConfig } = useBreakdownConfig(props.itemId)
const { t } = useI18n()
const { displayModeNet } = useNetGrossDisplay()
const { profitColor } = useTypeColors()
const isDark = useIsDark()
const dataStore = useDataStore()
const dbStateStore = useDbStateStore()

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
	{ value: 5, label: '5' },
	{ value: 10, label: '10' },
	{ value: 15, label: '15' },
	{ value: 20, label: '20' },
])

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

// Métriques supplémentaires affichées dans le tooltip (bar/scatter)
// Triées selon l'ordre de metricOptions pour un affichage cohérent
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
	const groupFn = getGroupFn(dim, tagGroups)
	const metrics = calculateMetricsByDimension(trades, groupFn, displayModeNet.value)
	return injectEmptyTagMetrics(metrics, dim, tagGroups)
})

// Traduit la clé d'une dimension en label lisible (mois, jour de semaine traduits)
const formatDimensionLabel = (dimension: BreakdownDimension, key: string): string => {
	if (dimension === 'dayOfWeek') {
		const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
		const idx = parseInt(key, 10)
		if (idx >= 0 && idx <= 6) return t(`common.weekdays.long.${dayKeys[idx]}`)
		return key
	}
	if (dimension === 'month') {
		const idx = parseInt(key, 10)
		if (idx >= 0 && idx <= 11) return t(`common.months.long.${idx}`)
		return key
	}
	if (dimension === 'monthYear') {
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
	const dim = config.value.dimension
	const categories = filteredMetrics.value.map(m => formatDimensionLabel(dim, m.key))
	const values = filteredMetrics.value.map(m => getMetricValue(m))
	// Même logique de couleur que le scatter chart
	const colors = filteredMetrics.value.map(m => getScatterColor(m))
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
			appendTo: document.body,
			className: 'echarts-custom-tooltip',
			trigger: 'axis',
			axisPointer: { type: 'shadow' },
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
const scatterCategories = computed(() => {
	const dim = config.value.dimension
	return filteredMetrics.value.map(m => formatDimensionLabel(dim, m.key))
})

// Couleur du point scatter selon la métrique sélectionnée
// - winrate : dégradé smooth (rouge < 25% → orange 25-60% → vert > 60%)
// - profitFactor : orange < 1 → dégradé orange→vert 1-3 → vert > 3
// - autres : basé sur le P&L (vert > 1$ / rouge < -1$ / gris autour de 0)
const getScatterColor = (m: BreakdownMetrics): string => {
	if (config.value.metric === 'winrate') {
		const wr = m.winrate
		let hue: number
		if (wr <= 25) {
			hue = 0
		} else if (wr <= 60) {
			hue = ((wr - 25) / 35) * 30
		} else {
			hue = 30 + ((wr - 60) / 40) * 90
		}
		return `hsl(${hue}, 45%, 55%)`
	}
	if (config.value.metric === 'profitFactor') {
		const pf = m.profitFactor === Infinity ? 999 : m.profitFactor
		let hue: number
		if (pf < 1) {
			hue = 30
		} else if (pf <= 3) {
			// 1→3 : hue 30→120 (orange→vert)
			hue = 30 + ((pf - 1) / 2) * 90
		} else {
			hue = 120
		}
		return `hsl(${hue}, 45%, 55%)`
	}
	// avgWin, avgLoss : dégradé smooth basé sur la valeur
	// rouge < -3$ → orange autour de 0 → vert > 3$
	const metric = config.value.metric
	if (metric === 'avgWin' || metric === 'avgLoss') {
		const val = getMetricValueForMetric(m, metric)
		let hue: number
		if (val <= -3) {
			hue = 0
		} else if (val <= 0) {
			hue = ((val + 3) / 3) * 30
		} else if (val <= 3) {
			hue = 30 + (val / 3) * 90
		} else {
			hue = 120
		}
		return `hsl(${hue}, 45%, 55%)`
	}
	// avgDuration : bleu (pas de logique vert/rouge)
	if (metric === 'avgDuration') {
		return '#3b82f6'
	}
	// tradesCount : couleur unique
	if (metric === 'tradesCount') {
		return profitColor.value
	}
	// pnl, expectancy, drawdown, currentDrawdown : dégradé smooth basé sur la valeur
	const val = metric === 'expectancy' ? m.expectancy
		: metric === 'drawdown' ? m.drawdown
		: metric === 'currentDrawdown' ? m.currentDrawdown
		: m.pnl
	let hue: number
	if (val <= -3) {
		hue = 0
	} else if (val <= 0) {
		hue = ((val + 3) / 3) * 30
	} else if (val <= 3) {
		hue = 30 + (val / 3) * 90
	} else {
		hue = 120
	}
	return `hsl(${hue}, 45%, 55%)`
}

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
				color: getScatterColor(m),
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
