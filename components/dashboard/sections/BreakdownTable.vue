<template>
	<div class="h-full overflow-y-auto rounded-lg">
		<div class="p-4">
			<DashboardChartsBaseSortableTable
				:data="metrics as unknown as Record<string, unknown>[]"
				:columns="tableColumns"
				:loading="props.loading"
				:page-size="12"
				:empty-state="{ icon: 'i-heroicons-document-text', label: $t(emptyStateKey) }"
				table-class="table-fixed"
			>
				<template #key-cell="{ row }">
					<span class="font-semibold">{{ formatDimensionLabel(asMetrics(row.original).key) }}</span>
				</template>
				<!-- Cellules génériques pour chaque métrique sélectionnée -->
				<template v-for="col in metricColumns" :key="col" #[`${col}-cell`]="{ row }">
					<span :style="cellStyle(col, asMetrics(row.original))">
						{{ formatMetric(col, asMetrics(row.original)) }}
					</span>
				</template>
			</DashboardChartsBaseSortableTable>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TradeExtendedType } from '~/schema/trade'
import type { BreakdownMetrics } from '~/composables/useAnalytics'
import type { BreakdownDimension, BreakdownMetric } from '~/type'
import { isTagGroupDimension, getTagGroupName } from '~/type'
import { getGroupFn, injectEmptyTagMetrics, getMetricColor, getMetricValueForMetric } from '~/composables/useAnalytics'
import type { TimezoneSettings } from '~/composables/useAnalytics'
import { defaultTableColumns, migrateDimension } from '~/composables/metrics/useBreakdownConfig'
import { chartColors } from '~/composables/useChartColors'
import { formatDurationSeconds } from '~/utils/date-utils'

const props = defineProps<{
	dimension: BreakdownDimension
	// Colonnes à afficher (métriques). Si non défini, utilise les colonnes par défaut.
	columns?: BreakdownMetric[]
	loading?: boolean
}>()

const { displayModeNet } = useNetGrossDisplay()
const { formatCurrency } = useUtils()
const { t } = useI18n()
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

// Dimension migrée (anciennes valeurs → nouvelles)
const dimMigrated = computed(() => migrateDimension(props.dimension))

const groupFn = computed(() => {
	const tagGroups = dbStateStore.tagGroups || []
	return getGroupFn(dimMigrated.value, tagGroups, timezoneSettings.value)
})

// Traduit la clé d'une dimension en label lisible (mois, jour de semaine traduits)
const formatDimensionLabel = (key: string): string => {
	const dim = dimMigrated.value
	if (dim === 'dayOfWeekOpen' || dim === 'dayOfWeekClose') {
		const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
		const idx = parseInt(key, 10)
		if (idx >= 0 && idx <= 6) return t(`common.weekdays.long.${dayKeys[idx]}`)
		return key
	}
	if (dim === 'monthOpen' || dim === 'monthClose') {
		const idx = parseInt(key, 10)
		if (idx >= 0 && idx <= 11) return t(`common.months.long.${idx}`)
		return key
	}
	if (dim === 'monthYearOpen' || dim === 'monthYearClose') {
		const [year, monthNum] = key.split('-')
		const monthIdx = parseInt(monthNum, 10) - 1
		if (monthIdx >= 0 && monthIdx <= 11) return `${t(`common.months.long.${monthIdx}`)} ${year}`
		return key
	}
	return key
}

// Cast helper pour les rows du tableau (typées Record<string, unknown> par le SortableTable)
const asMetrics = (row: Record<string, unknown>): BreakdownMetrics => row as unknown as BreakdownMetrics

const metrics = computed<BreakdownMetrics[]>(() => {
	const trades: TradeExtendedType[] = dataStore.lastTrades || []
	if (!trades.length) return []
	const result = calculateMetricsByDimension(trades, groupFn.value, displayModeNet.value)
	return injectEmptyTagMetrics(result, dimMigrated.value, dbStateStore.tagGroups || [])
})

const keyHeader = computed(() => {
	const dim = dimMigrated.value
	if (isTagGroupDimension(dim)) {
		const groupName = getTagGroupName(dim) || ''
		return `${t('components.dashboard.breakdown.dimensions.tag')}: ${groupName}`
	}
	return t(`components.dashboard.breakdown.dimensions.${dim}`)
})

// Colonnes de métriques sélectionnées par l'utilisateur (ou défaut)
const metricColumns = computed<BreakdownMetric[]>(() => props.columns ?? defaultTableColumns)

// Construit la liste des colonnes pour le SortableTable : clé + métriques sélectionnées
const tableColumns = computed(() => [
	{ accessorKey: 'key', header: keyHeader.value },
	...metricColumns.value.map(metric => ({
		accessorKey: metric,
		header: t(`components.dashboard.breakdown.metrics.${metric}`),
	})),
])

// Formate la valeur d'une métrique pour l'affichage
const formatMetric = (metric: BreakdownMetric, m: BreakdownMetrics): string => {
	// Tags à 0 trade : case vide sauf tradesCount qui affiche "0"
	if (m.tradesCount === 0) {
		return metric === 'tradesCount' ? '0' : ''
	}
	switch (metric) {
		case 'pnl':
		case 'avgWin':
		case 'expectancy':
		case 'drawdown':
		case 'currentDrawdown':
			return Math.abs(m[metric]) < 0.005 ? '' : formatCurrency(m[metric])
		case 'avgLoss':
			return Math.abs(m.avgLoss) < 0.005 ? '' : formatCurrency(-m.avgLoss)
		case 'winrate':
			return `${m.winrate.toFixed(1)}%`
		case 'profitFactor':
			return m.profitFactor === Infinity ? '∞' : m.profitFactor.toFixed(2)
		case 'avgDuration':
			return formatDurationSeconds(m.avgDuration * 60)
		case 'tradesCount':
			return String(m.tradesCount)
		default:
			return formatCurrency(m[metric])
	}
}

// Style inline selon la métrique
// tradesCount et avgDuration gardent la couleur par défaut
// Pour les autres : utilise le primary du thème pour les valeurs positives, rouge pour les négatives
const cellStyle = (metric: BreakdownMetric, m: BreakdownMetrics): Record<string, string> => {
	if (m.tradesCount === 0) return {}
	if (metric === 'tradesCount' || metric === 'avgDuration') return {}
	const val = getMetricValueForMetric(m, metric)
	if (val > 0) return { color: chartColors.profit, fontWeight: '600' }
	if (val < 0) return { color: getMetricColor(m, metric), fontWeight: '600' }
	return { color: getMetricColor(m, metric), fontWeight: '600' }
}

const emptyStateKey = computed(() => 'components.dashboard.breakdown.empty_state')
</script>
