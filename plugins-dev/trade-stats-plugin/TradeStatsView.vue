<template>
	<div class="space-y-4">
		<div v-if="loading" class="flex justify-center py-6">
			<div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
		</div>

		<div v-else-if="error" class="text-red-500 text-sm">
			{{ error }}
		</div>

		<template v-else>
			<div class="grid grid-cols-2 gap-3">
				<div class="rounded-lg border border-default bg-elevated p-3">
					<div class="text-center">
						<p class="text-xs text-muted uppercase tracking-wide">Trades</p>
						<p class="text-2xl font-bold mt-1">{{ stats.total }}</p>
					</div>
				</div>
				<div class="rounded-lg border border-default bg-elevated p-3">
					<div class="text-center">
						<p class="text-xs text-muted uppercase tracking-wide">Win Rate</p>
						<p class="text-2xl font-bold mt-1" :class="stats.winRate >= 50 ? 'text-green-500' : 'text-red-500'">
							{{ stats.winRate }}%
						</p>
					</div>
				</div>
				<div class="rounded-lg border border-default bg-elevated p-3">
					<div class="text-center">
						<p class="text-xs text-muted uppercase tracking-wide">Profit net</p>
						<p class="text-2xl font-bold mt-1" :class="stats.netProfit >= 0 ? 'text-green-500' : 'text-red-500'">
							{{ stats.netProfit >= 0 ? '+' : '' }}{{ stats.netProfit.toFixed(2) }}
						</p>
					</div>
				</div>
				<div class="rounded-lg border border-default bg-elevated p-3">
					<div class="text-center">
						<p class="text-xs text-muted uppercase tracking-wide">Profit Factor</p>
						<p class="text-2xl font-bold mt-1" :class="stats.profitFactor >= 1 ? 'text-green-500' : 'text-red-500'">
							{{ stats.profitFactor.toFixed(2) }}
						</p>
					</div>
				</div>
			</div>

			<hr class="border-default" />

			<div>
				<p class="text-xs text-muted uppercase tracking-wide mb-2">Derniers trades</p>
				<div class="space-y-1">
					<div v-for="trade in recentTrades" :key="trade.id"
						class="flex items-center justify-between text-sm py-1 px-2 rounded"
						:class="trade.netProfit >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'">
						<span class="font-medium">{{ trade.symbol }}</span>
						<span :class="trade.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
							{{ trade.netProfit >= 0 ? '+' : '' }}{{ trade.netProfit.toFixed(2) }}
						</span>
					</div>
				</div>
			</div>
		</template>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useSdk } from '../ui/useSdk'

type Trade = {
	id: number
	symbol: string
	netProfit: number
	profit: number
	isWin: number
}

const sdk = useSdk()

const trades = ref<Trade[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const stats = computed(() => {
	const total = trades.value.length
	if (total === 0) return { total: 0, winRate: 0, netProfit: 0, profitFactor: 0 }

	const { utils } = sdk
	const winRate = utils.getWinrate(trades.value, 0, true)
	const netProfit = utils.getPNL(trades.value, -1, true)
	const profitFactor = utils.getProfitFactor(trades.value, 0, true)

	return { total, winRate, netProfit, profitFactor }
})

const recentTrades = computed(() => trades.value.slice(0, 5))

onMounted(async () => {
	try {
		const result = await sdk.api.get<Trade[]>('/api/trades?limit=50')
		trades.value = result
	} catch {
		error.value = 'Impossible de charger les trades'
	} finally {
		loading.value = false
	}
})
</script>
