import { describe, it, expect, beforeEach } from 'vitest'
import { createBarCache, type StorageAdapter, type CachedEntry, type Bar, listPeriodsInRange, periodKeyToRange, timestampToPeriodKey } from '~/utils/barCache'

type TestBar = Bar

// In-memory storage adapter for testing
const createMemoryAdapter = (): StorageAdapter<TestBar> => {
	const store = new Map<string, CachedEntry<TestBar>>()
	return {
		get: async (key: string) => store.get(key),
		set: async (key: string, entry: CachedEntry<TestBar>) => { store.set(key, entry) },
		del: async (key: string) => { store.delete(key) },
	}
}

describe('barCache', () => {
	describe('Period helpers', () => {
		it('should list weekly periods for tf <= 5', () => {
			const periods = listPeriodsInRange('1', '2026-01-01', '2026-01-14')
			expect(periods.length).toBeGreaterThan(0)
			expect(periods[0]).toMatch(/^\d{4}-W\d{2}$/)
		})

		it('should list monthly periods for tf > 5', () => {
			const periods = listPeriodsInRange('60', '2026-01-01', '2026-03-31')
			expect(periods).toEqual(['2026-01', '2026-02', '2026-03'])
		})

		it('should convert period key to date range (month)', () => {
			const range = periodKeyToRange('60', '2026-02')
			expect(range.fromStr).toBe('2026-02-01')
			expect(range.toStr).toBe('2026-02-28')
		})

		it('should convert timestamp to period key (week)', () => {
			const ts = new Date('2026-01-15T12:00:00Z').getTime() / 1000
			const pk = timestampToPeriodKey('1', ts)
			expect(pk).toMatch(/^\d{4}-W\d{2}$/)
		})

		it('should convert timestamp to period key (month)', () => {
			const ts = new Date('2026-02-15T12:00:00Z').getTime() / 1000
			const pk = timestampToPeriodKey('60', ts)
			expect(pk).toBe('2026-02')
		})
	})

	describe('Cache operations', () => {
		let adapter: StorageAdapter<TestBar>
		let cache: ReturnType<typeof createBarCache<TestBar>>

		beforeEach(() => {
			adapter = createMemoryAdapter()
			cache = createBarCache<TestBar>(adapter, 'test', 60_000)
		})

		it('should return null for missing period', async () => {
			const result = await cache.getCachedPeriod('AAPL', '60', '2026-01')
			expect(result).toBeNull()
		})

		it('should cache and retrieve bars for a period', async () => {
			const bars: TestBar[] = [
				{ time: 1000, open: 100, high: 110, low: 90, close: 105 },
				{ time: 2000, open: 105, high: 115, low: 95, close: 110 },
			]
			await cache.setCachedPeriod('AAPL', '60', '2026-01', bars)
			const result = await cache.getCachedPeriod('AAPL', '60', '2026-01')
			expect(result).toEqual(bars)
		})

		it('should clear cached period', async () => {
			const bars: TestBar[] = [{ time: 1000, open: 100, high: 110, low: 90, close: 105 }]
			await cache.setCachedPeriod('AAPL', '60', '2026-01', bars)
			await cache.clearCachedPeriod('AAPL', '60', '2026-01')
			const result = await cache.getCachedPeriod('AAPL', '60', '2026-01')
			expect(result).toBeNull()
		})

		it('should return stale data as null for current period after refresh window', async () => {
			const now = new Date()
			const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
			const bars: TestBar[] = [{ time: 1000, open: 100, high: 110, low: 90, close: 105 }]

			// Create a cache with 0ms refresh window to force staleness
			const shortCache = createBarCache<TestBar>(adapter, 'test', 0)
			await shortCache.setCachedPeriod('AAPL', '60', currentMonth, bars)

			// Wait 1ms to ensure staleness
			await new Promise(resolve => setTimeout(resolve, 1))

			const result = await shortCache.getCachedPeriod('AAPL', '60', currentMonth)
			expect(result).toBeNull()
		})

		it('should return historical period data indefinitely', async () => {
			const bars: TestBar[] = [{ time: 1000, open: 100, high: 110, low: 90, close: 105 }]
			const shortCache = createBarCache<TestBar>(adapter, 'test', 0)
			await shortCache.setCachedPeriod('AAPL', '60', '2020-01', bars)

			await new Promise(resolve => setTimeout(resolve, 1))

			const result = await shortCache.getCachedPeriod('AAPL', '60', '2020-01')
			expect(result).toEqual(bars)
		})

		it('should retrieve cached range with partial cache', async () => {
			const bars1: TestBar[] = [{ time: 1000, open: 100, high: 110, low: 90, close: 105 }]
			const bars2: TestBar[] = [{ time: 3000, open: 110, high: 120, low: 100, close: 115 }]

			await cache.setCachedPeriod('AAPL', '60', '2026-01', bars1)
			await cache.setCachedPeriod('AAPL', '60', '2026-03', bars2)

			const result = await cache.getCachedRange('AAPL', '60', '2026-01-01', '2026-03-31')

			expect(result.bars).toEqual([...bars1, ...bars2])
			expect(result.missingPeriods).toEqual(['2026-02'])
		})

		it('should return all periods as missing when cache is empty', async () => {
			const result = await cache.getCachedRange('AAPL', '60', '2026-01-01', '2026-03-31')
			expect(result.bars).toEqual([])
			expect(result.missingPeriods).toEqual(['2026-01', '2026-02', '2026-03'])
		})

		it('should cache empty periods to avoid redundant API calls', async () => {
			const emptyBars: TestBar[] = []
			await cache.setCachedPeriod('AAPL', '60', '2026-02', emptyBars)

			const result = await cache.getCachedPeriod('AAPL', '60', '2026-02')
			expect(result).toEqual([])
		})

		it('should not re-fetch empty historical periods', async () => {
			await cache.setCachedPeriod('AAPL', '60', '2020-02', [])

			const result = await cache.getCachedRange('AAPL', '60', '2020-01-01', '2020-03-31')
			expect(result.missingPeriods).toEqual(['2020-01', '2020-03'])
			expect(result.bars).toEqual([])
		})

		it('should handle gaps in data correctly', async () => {
			const bars1: TestBar[] = [{ time: 1000, open: 100, high: 110, low: 90, close: 105 }]
			const bars3: TestBar[] = [{ time: 3000, open: 110, high: 120, low: 100, close: 115 }]

			await cache.setCachedPeriod('AAPL', '60', '2026-01', bars1)
			await cache.setCachedPeriod('AAPL', '60', '2026-02', [])
			await cache.setCachedPeriod('AAPL', '60', '2026-03', bars3)

			const result = await cache.getCachedRange('AAPL', '60', '2026-01-01', '2026-03-31')
			expect(result.bars).toEqual([...bars1, ...bars3])
			expect(result.missingPeriods).toEqual([])
		})

		// Simulates the fetchBars flow: when any period is missing, fetch the full clamped range
		// and overwrite all periods (including previously cached ones).
		it('should overwrite all periods when re-fetching the full clamped range', async () => {
			const oldBars: TestBar[] = [{ time: 1000, open: 100, high: 110, low: 90, close: 105 }]
			const newBars: TestBar[] = [
				{ time: 1000, open: 200, high: 210, low: 190, close: 205 },
				{ time: 2000, open: 205, high: 215, low: 195, close: 210 },
			]

			// Jan is already cached with old data
			await cache.setCachedPeriod('AAPL', '60', '2026-01', oldBars)

			// Feb is missing → triggers a full fetch of Jan-Mar
			// Simulate overwriting all periods with fresh data
			const allPeriods = listPeriodsInRange('60', '2026-01-01', '2026-03-31')
			for (const pk of allPeriods) {
				await cache.setCachedPeriod('AAPL', '60', pk, pk === '2026-01' ? newBars : [])
			}

			const result = await cache.getCachedRange('AAPL', '60', '2026-01-01', '2026-03-31')
			expect(result.missingPeriods).toEqual([])
			// Old data is overwritten
			expect(result.bars).toEqual(newBars)
		})

		it('should clamp period range boundaries correctly', () => {
			// TF 1min (weekly): period boundaries should be Mon-Sun
			const periods = listPeriodsInRange('1', '2026-01-14', '2026-01-20')
			expect(periods.length).toBeGreaterThan(0)
			const { fromStr, toStr } = periodKeyToRange('1', periods[0])
			// fromStr should be a Monday (day 1)
			expect(new Date(fromStr + 'T00:00:00Z').getUTCDay()).toBe(1)
			// toStr should be a Sunday (day 0)
			expect(new Date(toStr + 'T00:00:00Z').getUTCDay()).toBe(0)
		})

		it('should clamp monthly period range boundaries correctly', () => {
			const periods = listPeriodsInRange('60', '2026-01-14', '2026-03-20')
			expect(periods).toEqual(['2026-01', '2026-02', '2026-03'])
			const { fromStr } = periodKeyToRange('60', periods[0])
			const { toStr } = periodKeyToRange('60', periods[periods.length - 1])
			expect(fromStr).toBe('2026-01-01')
			expect(toStr).toBe('2026-03-31')
		})
	})
})
