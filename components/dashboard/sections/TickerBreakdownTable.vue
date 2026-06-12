<template>
	<div class="h-full overflow-y-auto bg-surface rounded-lg">
		<div class="flex items-center justify-between px-4 py-3 border-b border-default">
			<h3 class="text-base font-semibold text-primary">{{ $t('components.dashboard.ticker_table.title') }}</h3>
		</div>

		<div class="p-4">
			<DashboardChartsBaseSortableTable
				:data="tickerMetrics"
				:columns="columns"
				:loading="props.loading"
				:page-size="12"
				:empty-state="{ icon: 'i-heroicons-document-text', label: $t('components.dashboard.ticker_table.empty_state') }"
				table-class="table-fixed"
			>
				<template #symbol-cell="{ row }">
					<span class="font-semibold">{{ (row.original as any).symbol }}</span>
				</template>
				<template #pnl-cell="{ row }">
					<span :class="(row.original as any).pnl >= 0 ? 'profit-text' : 'loss-text'">
						{{ formatCurrency((row.original as any).pnl) }}
					</span>
				</template>
				<template #tradesCount-cell="{ row }">
					<span>{{ (row.original as any).tradesCount }}</span>
				</template>
				<template #winrate-cell="{ row }">
					<span>{{ (row.original as any).winrate.toFixed(1) }}%</span>
				</template>
				<template #profitFactor-cell="{ row }">
					<span>{{ (row.original as any).profitFactor === Infinity ? '∞' : (row.original as any).profitFactor.toFixed(2) }}</span>
				</template>
				<template #avgWin-cell="{ row }">
					<span class="profit-text">{{ formatCurrency((row.original as any).avgWin) }}</span>
				</template>
				<template #avgLoss-cell="{ row }">
					<span class="loss-text">{{ formatCurrency((row.original as any).avgLoss) }}</span>
				</template>
				<template #avgDuration-cell="{ row }">
					<span>{{ formatDurationSeconds((row.original as any).avgDuration * 60) }}</span>
				</template>
			</DashboardChartsBaseSortableTable>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TradeExtendedType } from '~/schema/trade'
import { formatDurationSeconds } from '~/utils/date-utils'

const props = defineProps<{
	loading?: boolean
}>()

const { displayModeNet } = useNetGrossDisplay()
const { formatCurrency } = useUtils()
const dataStore = useDataStore()
const { calculateMetricsByTicker } = useAnalytics()

const tickerMetrics = computed(() => {
	const trades: TradeExtendedType[] = dataStore.lastTrades || []
	if (!trades.length) return []
	return calculateMetricsByTicker(trades, displayModeNet.value)
})

const columns = [
	{ accessorKey: 'symbol', header: 'Symbol' },
	{ accessorKey: 'pnl', header: 'P&L' },
	{ accessorKey: 'tradesCount', header: 'Trades' },
	{ accessorKey: 'winrate', header: 'Winrate' },
	{ accessorKey: 'profitFactor', header: 'PF' },
	{ accessorKey: 'avgWin', header: 'Avg Win' },
	{ accessorKey: 'avgLoss', header: 'Avg Loss' },
	{ accessorKey: 'avgDuration', header: 'Avg Duration' },
]
</script>
