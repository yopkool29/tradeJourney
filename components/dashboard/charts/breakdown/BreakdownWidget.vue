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
				<!-- 1re ligne : ticker + X + Y -->
				<div class="flex items-center gap-2 flex-wrap">
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
import type { BreakdownConfig, BreakdownDimension, BreakdownMetric } from '~/type'
import type { TimezoneSettings } from '~/composables/useAnalytics'
import { dimensionOptions, metricOptions, defaultTableColumns, migrateDimension } from '~/composables/metrics/useBreakdownConfig'
import { getGroupFn, calculateMetricsBy2Dimensions } from '~/composables/useAnalytics'
import { useTooltipMetrics } from '~/composables/useTooltipMetrics'
import { isTagGroupDimension, getTagGroupName } from '~/type'
import { useChartBuilder } from '~/composables/charts/useChartBuilder'
import { useMetricsCalculation } from '~/composables/charts/useMetricsCalculation'

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
const { profitColor, lossColor, barColor, rawMetricColor, heatmapColors, scatter2DColors } = useTypeColors('timeSeriesChart')
const dataStore = useDataStore()
const dbStateStore = useDbStateStore()
const userStore = useUserStore()
const { buildBarChartOption, buildScatterChartOption, buildScatter2DChartOption, buildScatterTradesChartOption, buildHeatmapChartOption, buildBoxplotChartOption, buildRadarChartOption } = useChartBuilder()
const { calculateMetrics } = useMetricsCalculation()

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
	{ label: t('components.dashboard.breakdown.trade_property.mfe'), value: 'mfe' },
	{ label: t('components.dashboard.breakdown.trade_property.mae'), value: 'mae' },
]

// scatterTrades : items pour le filtre ticker (tous + 1 par ticker unique)
const tickerFilterItems = computed(() => {
	const tickers = new Set<string>()
	for (const tr of allTrades.value) {
		if (tr.symbol) tickers.add(tr.symbol)
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

// Génère les lignes de tooltip pour les métriques supplémentaires sélectionnées
// (évite les doublons avec la métrique principale et les lignes déjà affichées)
// Si isEmpty=true, affiche les labels avec valeurs vides sauf tradesCount qui affiche 0
const allMetrics = computed(() => {
	const trades = dataStore.lastTrades || []
	if (!trades.length) return []
	return calculateMetrics(trades, config.value.dimension, config.value.metric, {
		useNet: displayModeNet.value,
		tagGroups: dbStateStore.tagGroups || [],
		timezoneSettings: timezoneSettings.value,
	})
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

const filteredMetrics = computed(() => {
	let metrics = allMetrics.value
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

const barChartOption = computed<EChartsOption>(() => {
	return buildBarChartOption({
		metrics: filteredMetrics.value,
		dimension: config.value.dimension,
		metric: config.value.metric,
		logScale: logScale.value,
		selectedTooltipMetrics: selectedTooltipMetrics.value,
		orientation: 'horizontal',
		colors: {
			profit: profitColor.value,
			loss: lossColor.value,
			bar: barColor.value,
			rawMetric: rawMetricColor.value,
		},
	})
})

const barVerticalChartOption = computed<EChartsOption>(() => {
	return buildBarChartOption({
		metrics: filteredMetrics.value,
		dimension: config.value.dimension,
		metric: config.value.metric,
		logScale: logScale.value,
		selectedTooltipMetrics: selectedTooltipMetrics.value,
		orientation: 'vertical',
		colors: {
			profit: profitColor.value,
			loss: lossColor.value,
			bar: barColor.value,
			rawMetric: rawMetricColor.value,
		},
	})
})

const scatterChartOption = computed<EChartsOption>(() => {
	return buildScatterChartOption({
		metrics: filteredMetrics.value,
		dimension: config.value.dimension,
		metric: config.value.metric,
		selectedTooltipMetrics: selectedTooltipMetrics.value,
		colors: {
			profit: profitColor.value,
			loss: lossColor.value,
			bar: barColor.value,
			rawMetric: rawMetricColor.value,
		},
		isDark: isDark.value,
	})
})

const scatter2DChartOption = computed<EChartsOption>(() => {
	return buildScatter2DChartOption({
		metrics: filteredMetrics.value,
		dimension: config.value.dimension,
		metricX: config.value.metric,
		metricY: config.value.metric2 ?? 'profitFactor',
		colorMetric: config.value.colorMetric ?? 'tradesCount',
		logScale: logScale.value,
		selectedTooltipMetrics: selectedTooltipMetrics.value,
		showScrollX: config.value.showScrollX ?? true,
		showScrollY: config.value.showScrollY ?? true,
		showLabels: config.value.showLabels ?? true,
		scatter2DColors: scatter2DColors.value,
		isDark: isDark.value,
	})
})

const scatterTradesChartOption = computed<EChartsOption>(() => {
	const tickerFilter = config.value.tickerFilter ?? null
	const trades = tickerFilter
		? allTrades.value.filter(tr => tr.symbol === tickerFilter)
		: allTrades.value

	return buildScatterTradesChartOption({
		trades,
		propX: config.value.tradePropertyX ?? 'duration',
		propY: config.value.tradePropertyY ?? 'pnl',
		logScale: logScale.value,
		showScrollX: config.value.showScrollX ?? false,
		showScrollY: config.value.showScrollY ?? false,
		profitColor: profitColor.value,
		lossColor: lossColor.value,
		displayModeNet: displayModeNet.value,
	})
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

const heatmapChartOption = computed<EChartsOption>(() => {
	return buildHeatmapChartOption({
		cells: heatmap2DCells.value,
		dimensionX: config.value.dimension,
		dimensionY: config.value.dimension2 ?? 'dayOfWeekOpen',
		metric: config.value.metric,
		selectedTooltipMetrics: selectedTooltipMetrics.value,
		heatmapColors: heatmapColors.value,
		isDark: isDark.value,
	})
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
	const { categories, data, rawTrades } = boxplotData.value
	return buildBoxplotChartOption({
		categories,
		data,
		rawTrades,
		barColor: barColor.value,
		isDark: isDark.value,
	})
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
	const { indicators, values, names } = radarMetrics.value
	return buildRadarChartOption({
		indicators,
		values,
		names,
		isDark: isDark.value,
	})
})

// Chart option finale selon le type
const chartOption = computed<EChartsOption | undefined>(() => {
	if (chartType.value === 'bar') return barChartOption.value
	if (chartType.value === 'barVertical') return barVerticalChartOption.value
	if (chartType.value === 'scatter') return scatterChartOption.value
	if (chartType.value === 'scatter2D') return scatter2DChartOption.value
	if (chartType.value === 'scatterTrades') return scatterTradesChartOption.value
	if (chartType.value === 'heatmap') return heatmapChartOption.value
	if (chartType.value === 'boxplot') return boxplotChartOption.value
	if (chartType.value === 'radar') return radarChartOption.value
	return undefined
})
</script>
