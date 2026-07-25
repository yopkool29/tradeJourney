<template>
	<DashboardChartsBaseWidgetCard
		:title="chartTitle"
		:enlarged-title="chartTitle + ' (enlarged)'"
		:chart-option="chartOption"
		:loading="loading"
		:hide-enlarge="chartType === 'table'"
		:disable-click-enlarge="false"
		:use-default-slot="chartType === 'table'"
		:not-merge="chartType !== 'calendar'"
		:modal-height-class="modalHeightClass"
		@settings-open="onSettingsOpen"
		@settings-cancel="onSettingsCancel"
		@settings-apply="onSettingsApply"
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
			<!-- Scatter 2D : dimension + métrique X + métrique Y + couleur + topN -->
			<div v-else-if="chartType === 'scatter2D'" class="flex flex-col gap-1 w-full">
				<!-- 1re ligne : dimension + X + Y + couleur + top -->
				<div class="flex items-center gap-2 flex-wrap">
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
					<div class="flex items-center gap-1.5">
						<span class="text-xs text-secondary">X</span>
						<USelectMenu
							v-model="selectedMetric"
							:items="metricItems"
							value-key="value"
							class="w-32"
							size="xs"
						/>
					</div>
					<div class="flex items-center gap-1.5">
						<span class="text-xs text-secondary">Y</span>
						<USelectMenu
							v-model="selectedMetric2"
							:items="metricItems"
							value-key="value"
							class="w-32"
							size="xs"
						/>
					</div>
					<div class="flex items-center gap-1.5">
						<span class="text-xs text-secondary">{{ $t('components.dashboard.breakdown.color') }}</span>
						<USelectMenu
							v-model="selectedColorMetric"
							:items="metricItems"
							value-key="value"
							class="w-32"
							size="xs"
						/>
					</div>
					<div class="flex items-center gap-1.5">
						<span class="text-xs text-secondary">{{ $t('components.dashboard.breakdown.top') }}</span>
						<USelectMenu
							v-model="selectedTopN"
							:items="topNOptions"
							value-key="value"
							class="w-16"
							size="xs"
						/>
					</div>
				</div>
				<!-- 2e ligne : scrollbars X/Y + labels -->
				<div class="flex items-center gap-1.5 flex-wrap">
					<div class="flex items-center gap-1.5">
						<span class="text-xs text-secondary">{{ $t('components.dashboard.breakdown.scroll_x') }}</span>
						<USwitch v-model="showScrollX" size="xs" />
					</div>
					<div class="flex items-center gap-1.5">
						<span class="text-xs text-secondary">{{ $t('components.dashboard.breakdown.scroll_y') }}</span>
						<USwitch v-model="showScrollY" size="xs" />
					</div>
					<div class="flex items-center gap-1.5">
						<span class="text-xs text-secondary">{{ $t('components.dashboard.breakdown.show_labels') }}</span>
						<USwitch v-model="showLabels" size="xs" />
					</div>
					<div class="flex items-center gap-1.5">
						<span class="text-xs text-secondary">{{ $t('components.dashboard.breakdown.log_scale') }}</span>
						<USwitch v-model="logScale" size="xs" />
					</div>
				</div>
			</div>
			<!-- Scatter Trades : 1 point par trade (durée vs P&L, etc.) -->
			<div v-else-if="chartType === 'scatterTrades'" class="flex flex-col gap-1 w-full">
				<!-- 1re ligne : X + Y + filtre ticker -->
				<div class="flex items-center gap-2 flex-wrap">
					<div class="flex items-center gap-1.5">
						<span class="text-xs text-secondary">X</span>
						<USelectMenu
							v-model="selectedTradePropertyX"
							:items="tradePropertyItems"
							value-key="value"
							class="w-32"
							size="xs"
						/>
					</div>
					<div class="flex items-center gap-1.5">
						<span class="text-xs text-secondary">Y</span>
						<USelectMenu
							v-model="selectedTradePropertyY"
							:items="tradePropertyItems"
							value-key="value"
							class="w-32"
							size="xs"
						/>
					</div>
					<div class="flex items-center gap-1.5">
						<span class="text-xs text-secondary">{{ $t('components.dashboard.breakdown.ticker_filter') }}</span>
						<USelectMenu
							v-model="selectedTickerFilter"
							:items="tickerFilterItems"
							value-key="value"
							class="w-32"
							size="xs"
						/>
					</div>
				</div>
				<!-- 2e ligne : scrollbars X/Y + log scale -->
				<div class="flex items-center gap-1.5 flex-wrap">
					<div class="flex items-center gap-1.5">
						<span class="text-xs text-secondary">{{ $t('components.dashboard.breakdown.scroll_x') }}</span>
						<USwitch v-model="showScrollX" size="xs" />
					</div>
					<div class="flex items-center gap-1.5">
						<span class="text-xs text-secondary">{{ $t('components.dashboard.breakdown.scroll_y') }}</span>
						<USwitch v-model="showScrollY" size="xs" />
					</div>
					<div class="flex items-center gap-1.5">
						<span class="text-xs text-secondary">{{ $t('components.dashboard.breakdown.log_scale') }}</span>
						<USwitch v-model="logScale" size="xs" />
					</div>
				</div>
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
				<!-- Switch Log : pour bar et barVertical -->
				<div v-if="chartType === 'bar' || chartType === 'barVertical'" class="flex items-center gap-1.5">
					<span class="text-xs text-secondary">{{ $t('components.dashboard.breakdown.log_scale') }}</span>
					<USwitch v-model="logScale" size="xs" />
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
import type { BreakdownConfig, BreakdownDimension, BreakdownMetric, TradeProperty } from '~/type'
import type { BreakdownMetrics, TimezoneSettings } from '~/composables/useAnalytics'
import { dimensionOptions, metricOptions, defaultTableColumns, migrateDimension } from '~/composables/metrics/useBreakdownConfig'
import { getGroupFn, getMetricValueForMetric, formatMetricValueForMetric, injectEmptyTagMetrics, sortMetricsByDimension, getMetricColor, calculateMetricsBy2Dimensions } from '~/composables/useAnalytics'
import { buildTooltipLines, useTooltipMetrics } from '~/composables/useTooltipMetrics'
import { computeAxisBounds as computeAxisBoundsShared, scaleValue as scaleValueShared, makeAxisLabel } from '~/composables/useAxisScale'
import { isTagGroupDimension, getTagGroupName } from '~/type'
import { buildBarData, buildBarSeries, buildScatterSeries } from '~/utils/echarts-builders'
import type { EChartsFormatterParams } from '~/utils/echarts-builders'

const props = defineProps<{
	itemId: string
	loading?: boolean
}>()

const { config: rawConfig, chartType, setDimension, setMetric, updateConfig } = useBreakdownConfig(props.itemId)

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
const { profitColor, lossColor, barColor, rawMetricColor, heatmapColors, scatter2DColors } = useTypeColors('timeSeriesChart')
const dataStore = useDataStore()
const dbStateStore = useDbStateStore()
const userStore = useUserStore()

// Tous les trades (pour scatterTrades)
const allTrades = computed(() => dataStore.lastTrades || [])

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

// Scatter 2D : métrique axe Y
const selectedMetric2 = computed({
	get: () => config.value.metric2 ?? 'profitFactor',
	set: (val: BreakdownMetric) => updateConfig({ metric2: val }),
})

// Scatter 2D : métrique couleur (visualMap)
const selectedColorMetric = computed({
	get: () => config.value.colorMetric ?? 'tradesCount',
	set: (val: BreakdownMetric) => updateConfig({ colorMetric: val }),
})

// Scatter 2D : affichage des scrollbars X et Y
const showScrollX = computed({
	get: () => config.value.showScrollX ?? true,
	set: (val: boolean) => updateConfig({ showScrollX: val }),
})
const showScrollY = computed({
	get: () => config.value.showScrollY ?? true,
	set: (val: boolean) => updateConfig({ showScrollY: val }),
})
// Scatter 2D : afficher le label de la dimension au-dessus de chaque point
const showLabels = computed({
	get: () => config.value.showLabels ?? true,
	set: (val: boolean) => updateConfig({ showLabels: val }),
})

// Scatter 2D : échelle logarithmique (true) ou linéaire (false)
const logScale = computed({
	get: () => config.value.logScale ?? false,
	set: (val: boolean) => updateConfig({ logScale: val }),
})

// scatterTrades : propriété du trade sur l'axe X
const selectedTradePropertyX = computed({
	get: () => config.value.tradePropertyX ?? 'duration',
	set: (val: TradeProperty) => updateConfig({ tradePropertyX: val }),
})

// scatterTrades : propriété du trade sur l'axe Y
const selectedTradePropertyY = computed({
	get: () => config.value.tradePropertyY ?? 'pnl',
	set: (val: TradeProperty) => updateConfig({ tradePropertyY: val }),
})

// scatterTrades : filtre par ticker (null = tous)
const selectedTickerFilter = computed({
	get: () => config.value.tickerFilter ?? null,
	set: (val: string | null) => updateConfig({ tickerFilter: val }),
})

// scatterTrades : items pour le sélecteur de propriétés de trade
const tradePropertyItems = [
	{ label: t('components.dashboard.breakdown.trade_property.duration'), value: 'duration' },
	{ label: t('components.dashboard.breakdown.trade_property.pnl'), value: 'pnl' },
	{ label: t('components.dashboard.breakdown.trade_property.profit'), value: 'profit' },
	{ label: t('components.dashboard.breakdown.trade_property.netProfit'), value: 'netProfit' },
]

// scatterTrades : items pour le filtre ticker (tous + 1 par ticker unique)
const tickerFilterItems = computed(() => {
	const tickers = new Set<string>()
	for (const tr of allTrades.value) {
		if (tr.ticker) tickers.add(tr.ticker)
	}
	return [
		{ label: t('components.dashboard.breakdown.all_tickers'), value: null },
		...[...tickers].sort().map(tk => ({ label: tk, value: tk })),
	]
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
// Helper partagé pour construire les tooltips (titre + lignes + extras)
const { t: tt } = useI18n()
const makeTooltip = (title: string, primaryLines: string[], fullMetric: BreakdownMetrics | null | undefined, shown: Set<BreakdownMetric>, isEmpty = false) =>
	buildTooltipLines(title, primaryLines, fullMetric, shown, selectedTooltipMetrics.value, tt, isEmpty)

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
	const currentMetric = config.value.metric
	const useLogScale = logScale.value // accès réactif explicite
	const categories = filteredMetrics.value.map(m => formatDimensionLabel(dim, m.key))
	// Récupère les valeurs brutes (sans conversion 999) pour détecter Infinity
	const rawValues = filteredMetrics.value.map(m => getRawMetricValue(m, currentMetric))
	// Scaler les valeurs pour l'affichage (0% = 0/NaN, 10% = min, 90% = max, 100% = infini)
	const xFinite = rawValues.filter(v => Number.isFinite(v))
	const xBounds = currentMetric === 'winrate' ? { axisMin: 0, axisMax: 100, minVal: 0, maxVal: 100, step: 12.5, logMin: 0, logMinNeg: 0 } : computeAxisBoundsShared(xFinite)
	const xAxisMin = xBounds.axisMin
	const xAxisMax = xBounds.axisMax
	const scaledValues = rawValues.map(v => scaleValueShared(v, xBounds, useLogScale))
	// Couleurs basées sur les valeurs réelles (pas scalées)
	const colors = filteredMetrics.value.map(m => getScatterColor(m))
	const data = buildBarData(scaledValues, colors, v => v >= 0 ? [0, 3, 3, 0] : [3, 0, 0, 3])
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
				const shown = new Set<BreakdownMetric>([currentMetric])
				const isEmpty = metric.tradesCount === 0
				const primaryLines = [`${t(`components.dashboard.breakdown.metrics.${currentMetric}`)}: ${isEmpty ? (currentMetric === 'tradesCount' ? '0' : '') : formatMetricValue(getMetricValue(metric))}`]
				return makeTooltip(formatDimensionLabel(config.value.dimension, metric.key), primaryLines, metric, shown, isEmpty)
			},
		},
		grid: { ...grid, right: hasZoom ? 100 : 80 },
		dataZoom: hasZoom ? [
			{ type: 'slider', yAxisIndex: 0, start: 0, end: zoomEnd, width: 20, right: 5, filterMode: 'filter' },
			{ type: 'inside', yAxisIndex: 0, start: 0, end: zoomEnd, filterMode: 'filter', moveOnMouseWheel: 'shift', zoomOnMouseWheel: false },
		] : undefined,
		xAxis: {
			type: 'value',
			min: xAxisMin,
			max: xAxisMax,
			axisLine: { lineStyle: { color: axisColor } },
			axisTick: { show: false },
			axisLabel: { color: textColor, fontSize: 11, formatter: makeAxisLabel(xBounds, useLogScale, v => formatMetricValueForMetric(v, currentMetric)) },
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
	const currentMetric = config.value.metric
	const useLogScale = logScale.value // accès réactif explicite
	const categories = filteredMetrics.value.map(m => formatDimensionLabel(dim, m.key))
	// Récupère les valeurs brutes (sans conversion 999) pour détecter Infinity
	const rawValues = filteredMetrics.value.map(m => getRawMetricValue(m, currentMetric))
	// Scaler les valeurs pour l'affichage (0% = 0/NaN, 10% = min, 90% = max, 100% = infini)
	const yFinite = rawValues.filter(v => Number.isFinite(v))
	const yBounds = currentMetric === 'winrate' ? { axisMin: 0, axisMax: 100, minVal: 0, maxVal: 100, step: 12.5, logMin: 0, logMinNeg: 0 } : computeAxisBoundsShared(yFinite)
	const yAxisMin = yBounds.axisMin
	const yAxisMax = yBounds.axisMax
	const scaledValues = rawValues.map(v => scaleValueShared(v, yBounds, useLogScale))
	// Couleurs basées sur les valeurs réelles (pas scalées)
	const colors = filteredMetrics.value.map(m => getScatterColor(m))
	const data = buildBarData(scaledValues, colors, v => v >= 0 ? [3, 3, 0, 0] : [0, 0, 3, 3])
	const series = buildBarSeries({ data, barMaxWidth: 20, barCategoryGap: '10%', emphasis: { disabled: true } })

	const ctx = getChartContext({ left: 60, right: 16, top: 12, bottom: 60 })
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
				const shown = new Set<BreakdownMetric>([currentMetric])
				const isEmpty = metric.tradesCount === 0
				const primaryLines = [`${t(`components.dashboard.breakdown.metrics.${currentMetric}`)}: ${isEmpty ? (currentMetric === 'tradesCount' ? '0' : '') : formatMetricValue(getMetricValue(metric))}`]
				return makeTooltip(formatDimensionLabel(config.value.dimension, metric.key), primaryLines, metric, shown, isEmpty)
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
			axisLabel: { color: textColor, fontSize: 11, formatter: makeAxisLabel(yBounds, useLogScale, v => formatMetricValueForMetric(v, currentMetric)) },
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


const scatterChartOption = computed<EChartsOption>(() => {
	// data : [categoryIndex, metricValue, pnl, key, tradesCount]
	const data = filteredMetrics.value.map((m, idx) => {
		return {
			value: [
				idx,
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
				const currentMetric = config.value.metric
				const shown = new Set<BreakdownMetric>([currentMetric])
				const fullMetric = filteredMetrics.value[idx]
				const isEmpty = fullMetric?.tradesCount === 0
				const primaryLines = [`${t(`components.dashboard.breakdown.metrics.${currentMetric}`)}: ${isEmpty ? (currentMetric === 'tradesCount' ? '0' : '') : formatMetricValue(metricValue)}`]
				return makeTooltip(formatDimensionLabel(config.value.dimension, key), primaryLines, fullMetric, shown, isEmpty)
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

// --- Scatter 2D chart option (corrélation entre 2 métriques, couleur = 3ème métrique) ---
// Chaque point = un groupe (ticker, tag, jour...), positionné par metric (X) et metric2 (Y),
// coloré par colorMetric via visualMap.
// dataZoom sur X et Y permet de zoomer pour exclure les extremes et rescaler automatiquement.
// Récupère la valeur brute d'une métrique (sans conversion 999 pour Infinity)
// Nécessaire pour détecter correctement les valeurs infinies (ex: profitFactor)
// Si tradesCount = 0 (groupe vide), retourne NaN pour placer le point à 0% (zone "vide")
const getRawMetricValue = (m: BreakdownMetrics, metric: BreakdownMetric): number => {
	if (metric !== 'tradesCount' && m.tradesCount === 0) return NaN
	switch (metric) {
		case 'pnl': return m.pnl
		case 'winrate': return m.winrate
		case 'profitFactor': return m.profitFactor
		case 'avgWin': return m.avgWin
		case 'avgLoss': return -m.avgLoss
		case 'expectancy': return m.expectancy
		case 'avgDuration': return m.avgDuration
		case 'drawdown': return m.drawdown
		case 'currentDrawdown': return m.currentDrawdown
		case 'tradesCount': return m.tradesCount
		// appt = Average Profit Per Trade = pnl / tradesCount (calculé à la volée)
		case 'appt': return m.tradesCount > 0 ? m.pnl / m.tradesCount : NaN
		default: return 0
	}
}

const scatter2DChartOption = computed<EChartsOption>(() => {
	const metricX = config.value.metric
	const metricY = config.value.metric2 ?? 'profitFactor'
	const colorMetric = config.value.colorMetric ?? 'tradesCount'
	const useLogScale = logScale.value // accès réactif explicite

	// Données : [valueX, valueY, key, colorValue, realVx, realVy]
	// On garde TOUS les points, y compris ceux avec valeurs infinies (ex: profitFactor infini).
	// Les valeurs finies sont distribuées sur 90% de l'axe, les infinies/NaN à 100% (le bord).
	const rawPoints = filteredMetrics.value.map(m => {
		const vx = getRawMetricValue(m, metricX)
		const vy = getRawMetricValue(m, metricY)
		const vc = getRawMetricValue(m, colorMetric)
		return { vx, vy, vc, key: m.key }
	})

	const ctx = getChartContext({ left: 70, right: 40, top: 85, bottom: 40 })
	const { base, axisColor, textColor, backgroundColor, borderColor, tooltipTextColor, grid } = ctx

	const xAxisName = t(`components.dashboard.breakdown.metrics.${metricX}`)
	const yAxisName = t(`components.dashboard.breakdown.metrics.${metricY}`)

	// Échelle : 0% = 0/NaN, 10% = min, 90% = max, 100% = infini
	// step = (max - min) / 8 constant entre 10% et 90%
	// Voir useAxisScale.ts pour le détail
	const xFinite = rawPoints.filter(p => Number.isFinite(p.vx)).map(p => p.vx)
	const yFinite = rawPoints.filter(p => Number.isFinite(p.vy)).map(p => p.vy)
	const xBounds = metricX === 'winrate' ? { axisMin: 0, axisMax: 100, minVal: 0, maxVal: 100, step: 12.5, logMin: 0, logMinNeg: 0 } : computeAxisBoundsShared(xFinite)
	const yBounds = metricY === 'winrate' ? { axisMin: 0, axisMax: 100, minVal: 0, maxVal: 100, step: 12.5, logMin: 0, logMinNeg: 0 } : computeAxisBoundsShared(yFinite)
	const xAxisMin = xBounds.axisMin
	const xAxisMax = xBounds.axisMax
	const yAxisMin = yBounds.axisMin
	const yAxisMax = yBounds.axisMax

	const data = rawPoints
		.filter(p => Number.isFinite(p.vc))
		.map(p => ({
			value: [
				scaleValueShared(p.vx, xBounds, useLogScale),
				scaleValueShared(p.vy, yBounds, useLogScale),
				p.key,
				p.vc,
				p.vx,  // vraie valeur X pour le tooltip
				p.vy,  // vraie valeur Y pour le tooltip
			] as unknown as number[],
		}))

	// visualMap : couleur par colorMetric
	const colorValues = data.map(d => d.value[3] as number)
	const colorMin = Math.min(...colorValues, 0)
	const colorMax = Math.max(...colorValues, 1)
	// Palette : du gris (peu de trades) au vert (beaucoup de trades)
	// Palette depuis les settings utilisateur (3 couleurs : min, mid, max)
	// ECharts interpole automatiquement entre ces 3 couleurs
	const colorPalette = [scatter2DColors.value.min, scatter2DColors.value.mid, scatter2DColors.value.max]

	// dataZoom : inside (molette) toujours actif, sliders X/Y affichables selon les settings
	const scrollXOn = config.value.showScrollX ?? true
	const scrollYOn = config.value.showScrollY ?? true
	const zoomArr: NonNullable<EChartsOption['dataZoom']> = [
		{ type: 'inside', xAxisIndex: 0, filterMode: 'none', moveOnMouseWheel: 'shift', zoomOnMouseWheel: true },
		{ type: 'inside', yAxisIndex: 0, filterMode: 'none', moveOnMouseWheel: 'shift', zoomOnMouseWheel: true },
	]
	if (scrollXOn) zoomArr.push({ type: 'slider', xAxisIndex: 0, filterMode: 'none', height: 18, bottom: 5, start: 0, end: 100 })
	if (scrollYOn) zoomArr.push({ type: 'slider', yAxisIndex: 0, filterMode: 'none', width: 18, right: 5, start: 0, end: 100 })

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
				const realVx = v[4] as number
				const realVy = v[5] as number
				const key = String(v[2])
				const fullMetric = filteredMetrics.value.find(m => m.key === key)
				// Dé-duplication : éviter d'afficher la même métrique plusieurs fois
				const shown = new Set<BreakdownMetric>([metricX, metricY, colorMetric])
				const primaryLines: string[] = [`${xAxisName}: ${formatMetricValueForMetric(realVx, metricX)}`]
				if (metricY !== metricX) primaryLines.push(`${yAxisName}: ${formatMetricValueForMetric(realVy, metricY)}`)
				if (colorMetric !== metricX && colorMetric !== metricY) primaryLines.push(`${t(`components.dashboard.breakdown.metrics.${colorMetric}`)}: ${formatMetricValueForMetric(v[3] as number, colorMetric)}`)
				return makeTooltip(formatDimensionLabel(config.value.dimension, key), primaryLines, fullMetric, shown)
			},
		},
		grid,
		// visualMap (dégradé) : au-dessus du chart, aligné à gauche
		// dimension: 3 = index de vc (colorValue) dans le tableau [vx, vy, key, vc, vxReal, vyReal]
		visualMap: {
			min: colorMin,
			max: colorMax,
			dimension: 3,
			calculable: true,
			orient: 'horizontal',
			left: 70,
			top: 10,
			textStyle: { color: textColor, fontSize: 10 },
			inRange: { color: colorPalette },
			show: true,
		},
		dataZoom: zoomArr,
		xAxis: {
			min: xAxisMin,
			max: xAxisMax,
			axisLine: { lineStyle: { color: axisColor } },
			axisTick: { show: false },
			axisLabel: { color: textColor, fontSize: 11, formatter: makeAxisLabel(xBounds, useLogScale, v => formatMetricValueForMetric(v, metricX)) },
			splitLine: { lineStyle: { color: axisColor } },
			name: xAxisName,
			nameLocation: 'middle',
			nameGap: 30,
			nameTextStyle: { color: textColor, fontSize: 12, fontWeight: 'bold' },
		},
		yAxis: {
			type: 'value',
			name: yAxisName,
			min: yAxisMin,
			max: yAxisMax,
			axisLine: { show: false },
			axisTick: { show: false },
			axisLabel: { color: textColor, fontSize: 11, formatter: makeAxisLabel(yBounds, useLogScale, v => formatMetricValueForMetric(v, metricY)) },
			splitLine: { lineStyle: { color: axisColor } },
			nameLocation: 'middle',
			nameGap: 50,
			nameTextStyle: { color: textColor, fontSize: 12, fontWeight: 'bold' },
		},
		series: [{
			type: 'scatter',
			data,
			symbolSize: 10,
			emphasis: {
				scale: 1.4,
				itemStyle: { borderColor: isDark.value ? '#fff' : '#1f2937', borderWidth: 2 },
			},
			label: {
				show: config.value.showLabels ?? true,
				position: 'top',
				formatter: (p: { value: number[] }) => {
					const key = String(p.value[2])
					return formatDimensionLabel(config.value.dimension, key)
				},
				color: textColor,
				fontSize: 10,
			},
		}],
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
				const val = (p.value as unknown as [number, number, number])[2]
				const primaryLines = [`${t(`components.dashboard.breakdown.metrics.${metric}`)}: ${formatMetricValueForMetric(val, metric)}`]
				return makeTooltip(`${yLabel} × ${xLabel}`, primaryLines, cell?.metrics, new Set([metric]))
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
	if (chartType.value === 'scatter2D') return scatter2DChartOption.value
	if (chartType.value === 'heatmap') return heatmapChartOption.value
	if (chartType.value === 'boxplot') return boxplotChartOption.value
	if (chartType.value === 'radar') return radarChartOption.value
	return undefined
})
</script>
