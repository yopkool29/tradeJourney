import type { TradeExtendedType } from '~/schema/trade'
import type { BreakdownDimension, BreakdownMetric } from '~/type'
import type { BreakdownMetrics } from '~/composables/analytics/breakdownMetrics'
import { calculateMetricsByDimension } from '~/composables/analytics/useAnalytics'
import { getGroupFn } from '~/composables/analytics/useBreakdownGrouping'
import { injectEmptyTagMetrics, sortMetricsByDimension } from '~/composables/analytics/breakdownMetrics'

interface MetricsCacheKey {
	tradesHash: string
	dimension: BreakdownDimension
	useNet: boolean
	tagGroupsHash: string
}

export const useMetricsCalculation = () => {
	const dataStore = useDataStore()
	const dbStateStore = useDbStateStore()
	const userStore = useUserStore()
	const { displayModeNet } = useNetGrossDisplay()

	const cache = ref<Map<string, BreakdownMetrics[]>>(new Map())

	const getCacheKey = (params: MetricsCacheKey): string => {
		return `${params.tradesHash}_${params.dimension}_${params.useNet}_${params.tagGroupsHash}`
	}

	const getTradesHash = (trades: TradeExtendedType[]): string => {
		if (!trades || trades.length === 0) return 'empty'
		return `${trades.length}_${trades[0]?.id || 0}_${trades[trades.length - 1]?.id || 0}`
	}

	const getTagGroupsHash = (tagGroups: { id: number; name: string }[]): string => {
		if (!tagGroups || tagGroups.length === 0) return 'empty'
		return tagGroups.map(g => `${g.id}_${g.name}`).join('|')
	}

	const calculateMetrics = (
		trades: TradeExtendedType[],
		dimension: BreakdownDimension,
		metric: BreakdownMetric,
		options?: {
			useNet?: boolean
			tagGroups?: { id: number; name: string; tags: { name: string }[] }[]
			timezoneSettings?: { timezoneDisplay: 'CURRENT' | 'LOCAL' | 'UTC'; timezoneLocal: string; timezoneUtcOffset: number }
		}
	): BreakdownMetrics[] => {
		const useNet = options?.useNet ?? displayModeNet.value
		const tagGroups = options?.tagGroups || dbStateStore.tagGroups || []
		const timezoneSettings = options?.timezoneSettings

		const tradesHash = getTradesHash(trades)
		const tagGroupsHash = getTagGroupsHash(tagGroups)
		const cacheKey = getCacheKey({ tradesHash, dimension, useNet, tagGroupsHash })

		const cached = cache.value.get(cacheKey)
		if (cached) {
			return sortMetricsByDimension(cached, dimension, metric)
		}

		if (!trades || trades.length === 0) return []

		const groupFn = getGroupFn(dimension, tagGroups, timezoneSettings)
		const metrics = calculateMetricsByDimension(trades, groupFn, useNet)
		const withEmptyTags = injectEmptyTagMetrics(metrics, dimension, tagGroups)

		cache.value.set(cacheKey, withEmptyTags)

		return sortMetricsByDimension(withEmptyTags, dimension, metric)
	}

	const clearCache = () => {
		cache.value = new Map()
	}

	watch(() => dataStore.lastTrades, () => clearCache())
	watch(() => displayModeNet.value, () => clearCache())
	watch(() => dbStateStore.tagGroups, () => clearCache(), { deep: true })
	watch(() => userStore.user?.settings_object, () => clearCache(), { deep: true })

	return {
		calculateMetrics,
		clearCache,
	}
}
