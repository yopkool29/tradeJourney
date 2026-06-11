<template>
	<div class="h-full overflow-y-auto bg-surface rounded-lg">
		<div class="flex items-center justify-between px-4 py-3 border-b border-default">
			<h3 class="text-base font-semibold text-primary">{{ $t('components.dashboard.ticker_table.title') }}</h3>
			<div class="flex items-center gap-2">
				<span class="text-sm text-secondary">{{ $t('components.dashboard.ticker_table.sort_by') }}:</span>
				<USelect
					v-model="sortBy"
					:items="sortOptions"
					size="xs"
					class="w-32"
				/>
			</div>
		</div>

		<div class="p-4 overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-default">
						<th class="text-left py-2 px-2 font-medium text-secondary">{{ $t('components.dashboard.ticker_table.symbol') }}</th>
						<th class="text-right py-2 px-2 font-medium text-secondary">{{ $t('components.dashboard.ticker_table.pnl') }}</th>
						<th class="text-right py-2 px-2 font-medium text-secondary">{{ $t('components.dashboard.ticker_table.trades') }}</th>
						<th class="text-right py-2 px-2 font-medium text-secondary">{{ $t('components.dashboard.ticker_table.winrate') }}</th>
						<th class="text-right py-2 px-2 font-medium text-secondary">{{ $t('components.dashboard.ticker_table.profit_factor') }}</th>
						<th class="text-right py-2 px-2 font-medium text-secondary">{{ $t('components.dashboard.ticker_table.avg_win') }}</th>
						<th class="text-right py-2 px-2 font-medium text-secondary">{{ $t('components.dashboard.ticker_table.avg_loss') }}</th>
						<th class="text-right py-2 px-2 font-medium text-secondary">{{ $t('components.dashboard.ticker_table.avg_duration') }}</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="metric in paginatedMetrics"
						:key="metric.symbol"
						class="border-b border-default/50 hover:bg-elevated/50"
					>
						<td class="py-2 px-2 font-medium">{{ metric.symbol }}</td>
						<td class="py-2 px-2 text-right" :style="{ color: metric.pnl > 0 ? profitColor : metric.pnl < 0 ? lossColor : undefined }">
							{{ formatCurrency(metric.pnl) }}
						</td>
						<td class="py-2 px-2 text-right">{{ metric.tradesCount }}</td>
						<td class="py-2 px-2 text-right">{{ metric.winrate.toFixed(1) }}%</td>
						<td class="py-2 px-2 text-right">{{ metric.profitFactor === Infinity ? '∞' : metric.profitFactor.toFixed(2) }}</td>
						<td class="py-2 px-2 text-right" :style="{ color: profitColor }">{{ formatCurrency(metric.avgWin) }}</td>
						<td class="py-2 px-2 text-right" :style="{ color: lossColor }">{{ formatCurrency(metric.avgLoss) }}</td>
						<td class="py-2 px-2 text-right">{{ formatDuration(metric.avgDuration) }}</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- Pagination -->
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

const props = defineProps<{
	loading?: boolean
}>()

const { displayModeNet } = useNetGrossDisplay()
const { formatCurrency } = useUtils()
const dataStore = useDataStore()
const { calculateMetricsByTicker } = useAnalytics()
const { profitColor, lossColor } = useTypeColors()

const tickerMetrics = computed(() => {
	const trades: TradeExtendedType[] = dataStore.lastTrades || []
	if (!trades.length) return []
	return calculateMetricsByTicker(trades, displayModeNet.value)
})

const sortBy = ref<'pnl' | 'tradesCount' | 'winrate' | 'profitFactor'>('pnl')

const sortOptions = computed(() => [
	{ label: 'P&L', value: 'pnl' },
	{ label: 'Trades', value: 'tradesCount' },
	{ label: 'Winrate', value: 'winrate' },
	{ label: 'Profit Factor', value: 'profitFactor' },
])

const sortedMetrics = computed(() => {
	const sorted = [...tickerMetrics.value]
	sorted.sort((a, b) => {
		switch (sortBy.value) {
			case 'pnl':
				return b.pnl - a.pnl
			case 'tradesCount':
				return b.tradesCount - a.tradesCount
			case 'winrate':
				return b.winrate - a.winrate
			case 'profitFactor':
				return b.profitFactor - a.profitFactor
			default:
				return 0
			}
		})
		return sorted
})

// Pagination
const page = ref(1)
const pageSize = 12

const paginatedMetrics = computed(() => {
	const start = (page.value - 1) * pageSize
	const end = start + pageSize
	return sortedMetrics.value.slice(start, end)
})

const formatDuration = (minutes: number): string => {
	if (minutes < 60) {
		return `${Math.round(minutes)}m`
	}
	const hours = Math.floor(minutes / 60)
	const mins = Math.round(minutes % 60)
	return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`
}
</script>
