<template>
	<div class="h-full overflow-y-auto bg-surface rounded-lg">
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
					<span class="font-semibold">{{ (row.original as BreakdownMetrics).key }}</span>
				</template>
				<template #pnl-cell="{ row }">
					<span :class="(row.original as BreakdownMetrics).pnl >= 0 ? 'profit-text' : 'loss-text'">
						{{ formatCurrency((row.original as BreakdownMetrics).pnl) }}
					</span>
				</template>
				<template #tradesCount-cell="{ row }">
					<span>{{ (row.original as BreakdownMetrics).tradesCount }}</span>
				</template>
				<template #winrate-cell="{ row }">
					<span>{{ (row.original as BreakdownMetrics).winrate.toFixed(1) }}%</span>
				</template>
				<template #profitFactor-cell="{ row }">
					<span>{{ (row.original as BreakdownMetrics).profitFactor === Infinity ? '∞' : (row.original as BreakdownMetrics).profitFactor.toFixed(2) }}</span>
				</template>
				<template #avgWin-cell="{ row }">
					<span class="profit-text">{{ formatCurrency((row.original as BreakdownMetrics).avgWin) }}</span>
				</template>
				<template #avgLoss-cell="{ row }">
					<span class="loss-text">{{ formatCurrency((row.original as BreakdownMetrics).avgLoss) }}</span>
				</template>
				<template #avgDuration-cell="{ row }">
					<span>{{ formatDurationSeconds((row.original as BreakdownMetrics).avgDuration * 60) }}</span>
				</template>
			</DashboardChartsBaseSortableTable>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TradeExtendedType } from '~/schema/trade'
import type { BreakdownMetrics, GroupFn } from '~/composables/useAnalytics'
import { formatDurationSeconds } from '~/utils/date-utils'

type Dimension = 'ticker' | 'tag' | 'side'

const props = defineProps<{
	dimension: Dimension
	loading?: boolean
}>()

const { displayModeNet } = useNetGrossDisplay()
const { formatCurrency } = useUtils()
const dataStore = useDataStore()

// Mapping dimension → groupFn + clés i18n
const dimensionConfig: Record<Dimension, { groupFn: GroupFn; titleKey: string; emptyStateKey: string; keyHeader: string }> = {
	ticker: {
		groupFn: groupByTicker,
		titleKey: 'components.dashboard.ticker_table.title',
		emptyStateKey: 'components.dashboard.ticker_table.empty_state',
		keyHeader: 'Symbol',
	},
	tag: {
		groupFn: groupByTag,
		titleKey: 'components.dashboard.tag_table.title',
		emptyStateKey: 'components.dashboard.tag_table.empty_state',
		keyHeader: 'Tag',
	},
	side: {
		groupFn: groupBySide,
		titleKey: 'components.dashboard.side_table.title',
		emptyStateKey: 'components.dashboard.side_table.empty_state',
		keyHeader: 'Side',
	},
}

const config = computed(() => dimensionConfig[props.dimension])

const metrics = computed<BreakdownMetrics[]>(() => {
	const trades: TradeExtendedType[] = dataStore.lastTrades || []
	if (!trades.length) return []
	return calculateMetricsByDimension(trades, config.value.groupFn, displayModeNet.value)
})

const columns = computed(() => [
	{ accessorKey: 'key', header: config.value.keyHeader },
	{ accessorKey: 'pnl', header: 'P&L' },
	{ accessorKey: 'tradesCount', header: 'Trades' },
	{ accessorKey: 'winrate', header: 'Winrate' },
	{ accessorKey: 'profitFactor', header: 'PF' },
	{ accessorKey: 'avgWin', header: 'Avg Win' },
	{ accessorKey: 'avgLoss', header: 'Avg Loss' },
	{ accessorKey: 'avgDuration', header: 'Avg Duration' },
])

const titleKey = computed(() => config.value.titleKey)
const emptyStateKey = computed(() => config.value.emptyStateKey)
</script>
