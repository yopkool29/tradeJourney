<template>
	<div class="space-y-4">
		<div v-if="loading" class="flex justify-center py-6">
			<UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-primary" />
		</div>

		<div v-else-if="error" class="text-red-500 text-sm">
			{{ error }}
		</div>

		<template v-else>
			<div class="grid grid-cols-2 gap-3">
				<UCard>
					<div class="text-center">
						<p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Trades</p>
						<p class="text-2xl font-bold mt-1">{{ stats.total }}</p>
					</div>
				</UCard>
				<UCard>
					<div class="text-center">
						<p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Win Rate</p>
						<p class="text-2xl font-bold mt-1" :class="stats.winRate >= 50 ? 'text-green-500' : 'text-red-500'">
							{{ stats.winRate }}%
						</p>
					</div>
				</UCard>
				<UCard>
					<div class="text-center">
						<p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Profit net</p>
						<p class="text-2xl font-bold mt-1" :class="stats.netProfit >= 0 ? 'text-green-500' : 'text-red-500'">
							{{ stats.netProfit >= 0 ? '+' : '' }}{{ stats.netProfit.toFixed(2) }}
						</p>
					</div>
				</UCard>
				<UCard>
					<div class="text-center">
						<p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Profit Factor</p>
						<p class="text-2xl font-bold mt-1" :class="stats.profitFactor >= 1 ? 'text-green-500' : 'text-red-500'">
							{{ stats.profitFactor.toFixed(2) }}
						</p>
					</div>
				</UCard>
			</div>

			<UDivider />

			<div>
				<p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Derniers trades</p>
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
import type { TJPluginSdk } from '../type/plugin'

type Trade = {
	id: number
	symbol: string
	netProfit: number
	isWin: number
}

const props = defineProps<{ sdk: TJPluginSdk }>()

const trades = ref<Trade[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const stats = computed(() => {
	const total = trades.value.length
	if (total === 0) return { total: 0, winRate: 0, netProfit: 0, profitFactor: 0 }

	const wins = trades.value.filter(t => t.isWin === 1)
	const winRate = Math.round((wins.length / total) * 100)
	const netProfit = trades.value.reduce((acc, t) => acc + (t.netProfit ?? 0), 0)
	const grossProfit = trades.value.filter(t => t.netProfit > 0).reduce((acc, t) => acc + t.netProfit, 0)
	const grossLoss = Math.abs(trades.value.filter(t => t.netProfit < 0).reduce((acc, t) => acc + t.netProfit, 0))
	const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss

	return { total, winRate, netProfit, profitFactor }
})

const recentTrades = computed(() => trades.value.slice(0, 5))

onMounted(async () => {
	try {
		const result = await props.sdk.api.get<Trade[]>('/api/trades?limit=50')
		trades.value = result
	} catch {
		error.value = 'Impossible de charger les trades'
	} finally {
		loading.value = false
	}
})
</script>
