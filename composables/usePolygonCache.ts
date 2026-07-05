import { get, set, del, keys, delMany } from 'idb-keyval'
import type { PolygonBar } from '~/utils/polygonSymbol'
import { createBarCache, type StorageAdapter, type CachedEntry } from '~/utils/barCache'

// Re-export helpers for use in usePolygonBars
export { listPeriodsInRange, periodKeyToRange, timestampToPeriodKey } from '~/utils/barCache'

// Polygon free plan rate limit: 5 requests per minute.
// For data touching today, we refresh at most once per minute.
const todayRefreshMs = 60_000

// Create an idb-keyval storage adapter for the generic bar cache.
const idbAdapter: StorageAdapter<PolygonBar> = {
	get: (key: string) => get<CachedEntry<PolygonBar>>(key),
	set: (key: string, entry: CachedEntry<PolygonBar>) => set(key, entry),
	del: (key: string) => del(key),
}

// Delete all entries with the 'polygon:' prefix from idb-keyval.
export const clearAllPolygonCache = async (): Promise<void> => {
	const allKeys = await keys<string>()
	const polygonKeys = allKeys.filter(k => k.startsWith('polygon:'))
	if (polygonKeys.length > 0) {
		await delMany(polygonKeys)
	}
}

export const usePolygonCache = () => {
	const cache = createBarCache<PolygonBar>(idbAdapter, 'polygon', todayRefreshMs)

	return {
		getCachedPeriod: cache.getCachedPeriod,
		setCachedPeriod: cache.setCachedPeriod,
		clearCachedPeriod: cache.clearCachedPeriod,
		getCachedRange: cache.getCachedRange,
	}
}
