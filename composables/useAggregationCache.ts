import { groupTradesByPeriod } from '~/utils/dashboard'
import type { TradeType } from '~/schema/trade'

type GroupedTrades = Record<string, TradeType[]>
type AggregationMode = 'day' | 'week' | 'month' | 'year'

export const useAggregationCache = () => {
	const dataStore = useDataStore()
	const userStore = useUserStore()
	const { displayModeNet } = useNetGrossDisplay()

	const cache = ref<Map<string, GroupedTrades>>(new Map())

	const getCacheKey = (mode: AggregationMode) => mode

	const getGroupedTrades = (mode: AggregationMode): GroupedTrades => {
		const key = getCacheKey(mode)
		const cached = cache.value.get(key)
		if (cached) {
            console.log("getGroupedTrades: cache hit", key)
            return cached
        } 

		const trades = dataStore.lastTrades as TradeType[]
		if (!trades || trades.length === 0) return {}

		const settings = userStore.settingsObject
		const grouped = groupTradesByPeriod(trades, mode, settings)
		cache.value.set(key, grouped)
		return grouped
	}

	const clearCache = () => {
		cache.value = new Map()
	}

	watch(() => dataStore.lastTrades, () => clearCache())
	watch(() => displayModeNet.value, () => clearCache())
	watch(() => userStore.settingsObject, () => clearCache(), { deep: true })

	return {
		getGroupedTrades,
		clearCache,
	}
}
