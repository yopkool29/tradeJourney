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
import type { BreakdownConfig } from '~/type'
import type { TimezoneSettings } from '~/composables/analytics/useAnalytics'
import { migrateDimension } from '~/composables/dashboard/useBreakdownConfig'
import { useBreakdownWidgetControls } from '~/composables/dashboard/useBreakdownWidgetControls'
import { useTooltipMetrics } from '~/composables/charts/useTooltipMetrics'
import { isTagGroupDimension, getTagGroupName } from '~/type'
import { useMetricsCalculation } from '~/composables/charts/useMetricsCalculation'
import { useBreakdownChartOptions } from '~/composables/charts/useBreakdownChartOptions'

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
const dataStore = useDataStore()
const dbStateStore = useDbStateStore()
const userStore = useUserStore()
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

const {
	dimensionItems,
	heatmapDimensionItems,
	metricItems,
	topNOptions,
	selectedDimension,
	selectedDimension2,
	selectedMetric,
	selectedMetric2,
	selectedColorMetric,
	showScrollX,
	showScrollY,
	showLabels,
	logScale,
	selectedTradePropertyX,
	selectedTradePropertyY,
	selectedTickerFilter,
	tradePropertyItems,
	tickerFilterItems,
	selectedTopN,
	selectedColumns,
} = useBreakdownWidgetControls({
	config,
	setDimension,
	setMetric,
	updateConfig,
	allTrades,
})

// Métriques supplémentaires affichées dans le tooltip (bar/scatter)
const { selectedTooltipMetrics, toggleTooltipMetric } = useTooltipMetrics(config, updateConfig)

// Titre du chart
const chartTitle = computed(() => {
	const dim = config.value?.dimension || 'ticker'
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

const allMetrics = computed(() => {
	const trades = dataStore.lastTrades || []
	if (!trades.length) return []
	return calculateMetrics(trades, config.value.dimension, config.value.metric, {
		useNet: displayModeNet.value,
		tagGroups: dbStateStore.tagGroups || [],
		timezoneSettings: timezoneSettings.value,
	})
})

const filteredMetrics = computed(() => {
	let metrics = allMetrics.value
	if (config.value.metric === 'avgLoss') {
		metrics = metrics.filter(m => m.losingTradesCount > 0)
	} else if (config.value.metric === 'avgWin') {
		metrics = metrics.filter(m => m.winningTradesCount > 0)
	}
	const topN = config.value.filter?.topN
	if (!topN || topN <= 0) return metrics
	return metrics.slice(0, topN)
})

const modalHeightClass = computed(() => {
	if (chartType.value === 'table') return undefined
	if (chartType.value === 'calendar') return 'h-[400px] sm:h-[700px]'
	return filteredMetrics.value.length > 10 ? 'h-[300px] sm:h-[700px]' : undefined
})

const { chartOption } = useBreakdownChartOptions(
	config,
	chartType,
	filteredMetrics,
	allTrades,
	timezoneSettings,
	selectedTooltipMetrics,
	logScale,
)
</script>
