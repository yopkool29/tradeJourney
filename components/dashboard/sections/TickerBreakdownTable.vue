<template>
	<div class="h-full overflow-y-auto bg-surface rounded-lg">
		<div class="flex items-center justify-between px-4 py-3 border-b border-default">
			<h3 class="text-base font-semibold text-primary">{{ $t('components.dashboard.ticker_table.title') }}</h3>
		</div>

		<div class="p-4">
			<UTable
				:data="paginatedMetrics"
				:columns="columns"
				:loading="props.loading"
				:empty-state="{ icon: 'i-heroicons-document-text', label: $t('components.dashboard.ticker_table.empty_state') }"
				:ui="{ td: 'p-2' }"
				class="table-fixed"
				@sort="onSort"
			>
				<template #symbol-cell="{ row }">
					<span class="font-semibold">{{ row.original.symbol }}</span>
				</template>
				<template #pnl-cell="{ row }">
					<span :class="row.original.pnl >= 0 ? 'profit-text' : 'loss-text'">
						{{ formatCurrency(row.original.pnl) }}
					</span>
				</template>
				<template #tradesCount-cell="{ row }">
					<span>{{ row.original.tradesCount }}</span>
				</template>
				<template #winrate-cell="{ row }">
					<span>{{ row.original.winrate.toFixed(1) }}%</span>
				</template>
				<template #profitFactor-cell="{ row }">
					<span>{{ row.original.profitFactor === Infinity ? '∞' : row.original.profitFactor.toFixed(2) }}</span>
				</template>
				<template #avgWin-cell="{ row }">
					<span class="profit-text">{{ formatCurrency(row.original.avgWin) }}</span>
				</template>
				<template #avgLoss-cell="{ row }">
					<span class="loss-text">{{ formatCurrency(row.original.avgLoss) }}</span>
				</template>
				<template #avgDuration-cell="{ row }">
					<span>{{ formatDurationSeconds(row.original.avgDuration * 60) }}</span>
				</template>
			</UTable>
		</div>

		<div v-if="sortedMetrics.length > pageSize" class="flex justify-center pt-4 pb-2">
			<UPagination
				v-model:page="page"
				:page-count="Math.ceil(sortedMetrics.length / pageSize)"
				:total="sortedMetrics.length"
				:items-per-page="pageSize"
				:ui="{
					root: '',
					item: 'min-w-[32px] mx-[5px] !rounded-full justify-center',
				}"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TradeExtendedType } from '~/schema/trade'
import type { TickerMetrics } from '~/composables/useAnalytics'
import { formatDurationSeconds } from '~/utils/date-utils'
import { UIcon } from '#components'

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

const sortBy = ref<keyof TickerMetrics | ''>('')
const sortDesc = ref(false)

const createSortHeader = (key: keyof TickerMetrics, label: string) => {
	return () => h('button', {
		class: 'flex items-center gap-1 select-none',
		onClick: () =>
			onSort({
				column: { accessorKey: key as string },
				direction: sortBy.value === key && !sortDesc.value ? 'desc' : 'asc',
			}),
	}, [
		label,
		h(UIcon, {
			name:
				sortBy.value === key
					? sortDesc.value
						? 'i-lucide-arrow-down-wide-narrow'
						: 'i-lucide-arrow-up-narrow-wide'
					: 'i-lucide-arrow-up-down',
			class: 'w-4 h-4 ml-1',
		}),
	])
}

const columns = [
	{
		accessorKey: 'symbol',
		header: () => createSortHeader('symbol', 'Symbol')(),
		sortable: true,
	},
	{
		accessorKey: 'pnl',
		header: () => createSortHeader('pnl', 'P&L')(),
		sortable: true,
	},
	{
		accessorKey: 'tradesCount',
		header: () => createSortHeader('tradesCount', 'Trades')(),
		sortable: true,
	},
	{
		accessorKey: 'winrate',
		header: () => createSortHeader('winrate', 'Winrate')(),
		sortable: true,
	},
	{
		accessorKey: 'profitFactor',
		header: () => createSortHeader('profitFactor', 'PF')(),
		sortable: true,
	},
	{
		accessorKey: 'avgWin',
		header: () => createSortHeader('avgWin', 'Avg Win')(),
		sortable: true,
	},
	{
		accessorKey: 'avgLoss',
		header: () => createSortHeader('avgLoss', 'Avg Loss')(),
		sortable: true,
	},
	{
		accessorKey: 'avgDuration',
		header: () => createSortHeader('avgDuration', 'Avg Duration')(),
		sortable: true,
	},
]

function onSort({ column, direction }: { column: { accessorKey: string }; direction: string }) {
	const col = columns.find((c) => c.accessorKey === column.accessorKey)
	if (col && col.sortable === false) return
	sortBy.value = column.accessorKey as keyof TickerMetrics
	sortDesc.value = direction === 'desc'
	page.value = 1
}

const sortedMetrics = computed(() => {
	if (!sortBy.value) return tickerMetrics.value
	return [...tickerMetrics.value].sort((a: TickerMetrics, b: TickerMetrics) => {
		const valA = a[sortBy.value as keyof TickerMetrics]
		const valB = b[sortBy.value as keyof TickerMetrics]
		if (valA == null) return 1
		if (valB == null) return -1
		if (valA === valB) return 0
		if (typeof valA === 'string' && typeof valB === 'string') {
			return sortDesc.value ? valB.localeCompare(valA) : valA.localeCompare(valB)
		}
		if (sortDesc.value) {
			return (valA as number) < (valB as number) ? 1 : -1
		}
		return (valA as number) > (valB as number) ? 1 : -1
	})
})

const page = ref(1)
const pageSize = 12

const paginatedMetrics = computed(() => {
	const start = (page.value - 1) * pageSize
	const end = start + pageSize
	return sortedMetrics.value.slice(start, end)
})

</script>
