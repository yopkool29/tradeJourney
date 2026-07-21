<template>
	<div class="h-full overflow-y-auto rounded-lg">
		<div class="flex items-center justify-between px-4 py-3 border-b border-default">
			<h3 class="text-base font-semibold text-primary">{{ $t(titleKey) }}</h3>
		</div>

		<div class="p-4">
			<DashboardChartsBaseSortableTable
				:data="metrics as unknown as Record<string, unknown>[]"
				:columns="columns"
				:loading="props.loading"
				:page-size="12"
				:empty-state="{ icon: 'i-heroicons-document-text', label: $t(emptyStateKey) }"
				table-class="table-fixed"
			>
				<template #key-cell="{ row }">
					<span class="font-semibold">{{ asMetrics(row.original).key }}</span>
				</template>
				<!-- Cellules génériques pour chaque métrique sélectionnée -->
				<template v-for="col in metricColumns" :key="col" #[`${col}-cell`]="{ row }">
					<span :class="cellClass(col, asMetrics(row.original))">
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
import { dimensionGroupFns } from '~/composables/useAnalytics'
import { defaultTableColumns } from '~/composables/metrics/useBreakdownConfig'
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

const groupFn = computed(() => dimensionGroupFns[props.dimension])

// Cast helper pour les rows du tableau (typées Record<string, unknown> par le SortableTable)
const asMetrics = (row: Record<string, unknown>): BreakdownMetrics => row as unknown as BreakdownMetrics

const metrics = computed<BreakdownMetrics[]>(() => {
	const trades: TradeExtendedType[] = dataStore.lastTrades || []
	if (!trades.length) return []
	return calculateMetricsByDimension(trades, groupFn.value, displayModeNet.value)
})

const keyHeader = computed(() => t(`components.dashboard.breakdown.dimensions.${props.dimension}`))

// Colonnes de métriques sélectionnées par l'utilisateur (ou défaut)
const metricColumns = computed<BreakdownMetric[]>(() => props.columns ?? defaultTableColumns)

// Construit la liste des colonnes pour le SortableTable : clé + métriques sélectionnées
const columns = computed(() => [
	{ accessorKey: 'key', header: keyHeader.value },
	...metricColumns.value.map(metric => ({
		accessorKey: metric,
		header: t(`components.dashboard.breakdown.metrics.${metric}`),
	})),
])

// Formate la valeur d'une métrique pour l'affichage
const formatMetric = (metric: BreakdownMetric, m: BreakdownMetrics): string => {
	switch (metric) {
		case 'pnl':
		case 'avgWin':
		case 'avgLoss':
		case 'expectancy':
		case 'drawdown':
		case 'currentDrawdown':
			return formatCurrency(m[metric])
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

// Classe CSS selon la métrique (profit/loss/neutre)
const cellClass = (metric: BreakdownMetric, m: BreakdownMetrics): string => {
	switch (metric) {
		case 'pnl':
		case 'expectancy':
			return m[metric] >= 0 ? 'profit-text' : 'loss-text'
		case 'avgWin':
			return 'profit-text'
		case 'avgLoss':
		case 'drawdown':
		case 'currentDrawdown':
			return 'loss-text'
		default:
			return ''
	}
}

const titleKey = computed(() => {
	const dimLabel = t(`components.dashboard.breakdown.dimensions.${props.dimension}`)
	return `${t('components.dashboard.breakdown.table_title')} ${dimLabel}`
})
const emptyStateKey = computed(() => 'components.dashboard.breakdown.empty_state')
</script>
