import { get, set, del, keys, delMany, createStore } from 'idb-keyval'
import type { PolygonBar } from '~/utils/polygonSymbol'
import { createBarCache, type StorageAdapter, type CachedEntry } from '~/utils/barCache'

// Polygon free plan rate limit: 5 requests per minute.
// For data touching today, refresh interval is configurable via settings.
const getDefaultRefreshMs = (): number => {
    const userStore = useUserStore()
    const settings = userStore.settingsObject
    const minutes = settings?.polygonCacheRefreshMinutes ?? 1440
    return minutes * 60_000
}

// Use a dedicated IDB database to avoid conflicts with other libraries
// (e.g. Nuxt/unstorage) that use the default 'keyval-store' database.
const polygonStore = createStore('polygon-cache', 'bars')

// Create an idb-keyval storage adapter for the generic bar cache.
const idbAdapter: StorageAdapter<PolygonBar> = {
	get: (key: string) => get<CachedEntry<PolygonBar>>(key, polygonStore),
	set: (key: string, entry: CachedEntry<PolygonBar>) => set(key, entry, polygonStore),
	del: (key: string) => del(key, polygonStore),
}

// Delete all entries with the 'polygon:' prefix from idb-keyval.
export const clearAllPolygonCache = async (): Promise<void> => {
	const allKeys = await keys<string>(polygonStore)
	const polygonKeys = allKeys.filter(k => k.startsWith('polygon:'))
	if (polygonKeys.length > 0) {
		await delMany(polygonKeys, polygonStore)
	}
}

export const usePolygonCache = () => {
	const cache = createBarCache<PolygonBar>(idbAdapter, 'polygon', getDefaultRefreshMs())

	return {
		getCachedPeriod: cache.getCachedPeriod,
		setCachedPeriod: cache.setCachedPeriod,
		clearCachedPeriod: cache.clearCachedPeriod,
		getCachedRange: cache.getCachedRange,
	}
}
