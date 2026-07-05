import { computed, type Ref } from 'vue'
import { InstrumentType } from '~/type'
import type { PolygonBar } from '~/utils/polygonSymbol'
import { isFuturesSymbol } from '~/utils/polygonSymbol'
import { listPeriodsInRange, periodKeyToRange, timestampToPeriodKey } from '~/composables/usePolygonCache'

// Use the futures API when instrument type is Future, or when it's Any/undefined
// and the symbol looks like a futures ticker.

interface TradeDateRange {
    openDate: Date
    closeDate: Date
    instrumentType?: InstrumentType
}

// Map a timeframe code (1, 5, 15, 60, 240, 1440) to Polygon range path segments.
// Hours and days are expressed with their native timespans to match Polygon's accepted values.
const timeframeToRange = (tf: string): { multiplier: number, timespan: string } => {
    const tfNum = Number(tf)
    if (tfNum === 1440) return { multiplier: 1, timespan: 'day' }
    if (tfNum % 60 === 0) return { multiplier: tfNum / 60, timespan: 'hour' }
    return { multiplier: tfNum, timespan: 'minute' }
}

// Map a timeframe code to the futures API resolution format (e.g. "1min", "1hour", "1session").
const timeframeToFuturesResolution = (tf: string): string => {
    const tfNum = Number(tf)
    if (tfNum === 1440) return '1session'
    if (tfNum % 60 === 0) return `${tfNum / 60}hour`
    return `${tfNum}min`
}

// Compute the date range with a buffer of bars before entry and after exit.
// The buffer is adaptive: smaller timeframes get more bars to provide enough context
// (since intraday bars only exist during market hours, a small bar count covers very little time).
const computeDateRange = (tf: string, trade: TradeDateRange): { fromStr: string, toStr: string } => {
    const tfMinutes = Number(tf)
    const barMs = tfMinutes * 60 * 1000

    // Adaptive buffer: more bars for smaller timeframes
    let bufferBars: number
    if (tfMinutes <= 1) bufferBars = 1500       // 1min:  ~25h of bars
    else if (tfMinutes <= 5) bufferBars = 1000  // 5min:  ~83h of bars
    else if (tfMinutes <= 15) bufferBars = 800  // 15min: ~200h of bars
    else if (tfMinutes <= 60) bufferBars = 500  // 1h:    ~500h of bars
    else if (tfMinutes <= 240) bufferBars = 400 // 4h:    ~1600h of bars
    else bufferBars = 250                        // daily: ~250 days

    const bufferMs = bufferBars * barMs

    const openDate = new Date(trade.openDate)
    const closeDate = new Date(trade.closeDate)

    const from = new Date(openDate.getTime() - bufferMs)
    const to = new Date(closeDate.getTime() + bufferMs)

    return {
        fromStr: from.toISOString().split('T')[0],
        toStr: to.toISOString().split('T')[0],
    }
}

// Remove duplicate bars (same timestamp) keeping the last occurrence.
// Polygon can return bars that collapse to the same second after timestamp conversion
// (e.g. futures nanosecond timestamps truncated to seconds, or session bars on the same day).
const deduplicateBars = (bars: PolygonBar[]): PolygonBar[] => {
    const seen = new Map<number, PolygonBar>()
    for (const bar of bars) {
        seen.set(bar.time, bar)
    }
    return Array.from(seen.values()).sort((a, b) => a.time - b.time)
}

// Sleep for ms milliseconds.
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Polygon free plan: 5 requests per minute. We space out calls by 12s
// and retry with exponential backoff on 429.
const minDelayBetweenRequestsMs = 12_000
const maxRetries = 3
let lastRequestTime = 0

// Wrap a fetch call with rate limiting and 429 retry logic.
const fetchWithRateLimit = async (url: string): Promise<Response> => {
    const elapsed = Date.now() - lastRequestTime
    if (elapsed < minDelayBetweenRequestsMs) {
        await sleep(minDelayBetweenRequestsMs - elapsed)
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        lastRequestTime = Date.now()
        const response = await fetch(url)
        if (response.status !== 429) return response

        if (attempt === maxRetries) {
            throw new Error(`Polygon API rate limit (429) after ${maxRetries + 1} attempts`)
        }

        // Exponential backoff: 12s, 24s, 48s
        const backoffMs = minDelayBetweenRequestsMs * Math.pow(2, attempt)
        await sleep(backoffMs)
    }

    throw new Error('Polygon API: unexpected state')
}

// Fetch bars from the standard Polygon aggregates API (stocks, forex, crypto, options).
const fetchStandardBars = async (
    ticker: string, tf: string, fromStr: string, toStr: string, apiKey: string,
): Promise<PolygonBar[]> => {
    const { multiplier, timespan } = timeframeToRange(tf)
    const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${fromStr}/${toStr}?adjusted=true&sort=asc&limit=50000&apiKey=${apiKey}`

    const response = await fetchWithRateLimit(url)
    if (!response.ok) {
        throw new Error(`Polygon API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    if (!data.results || data.results.length === 0) {
        return []
    }

    const bars = data.results.map((bar: { t: number, o: number, h: number, l: number, c: number }): PolygonBar => ({
        time: Math.floor(bar.t / 1000),
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
    }))

    return deduplicateBars(bars)
}

// Fetch bars from the Polygon futures API (/futures/v1/aggs/{ticker}).
// The futures API uses a different URL structure, resolution format, and nanosecond timestamps.
const fetchFuturesBars = async (
    ticker: string, tf: string, fromStr: string, toStr: string, apiKey: string,
): Promise<PolygonBar[]> => {
    const resolution = timeframeToFuturesResolution(tf)
    const url = `https://api.polygon.io/futures/v1/aggs/${ticker}?resolution=${resolution}&window_start.gte=${fromStr}&window_start.lte=${toStr}&sort=window_start.asc&limit=50000&apiKey=${apiKey}`

    const response = await fetchWithRateLimit(url)
    if (!response.ok) {
        throw new Error(`Polygon API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    if (!data.results || data.results.length === 0) {
        return []
    }

    const bars = data.results.map((bar: { window_start: number, open: number, high: number, low: number, close: number }): PolygonBar => ({
        // Futures API returns nanosecond timestamps; convert to seconds.
        time: Math.floor(bar.window_start / 1_000_000_000),
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
    }))

    return deduplicateBars(bars)
}

// In-memory cache for futures ticker resolution: {baseSymbol}_{date} -> fullTicker
const futuresTickerCache = new Map<string, string>()

const clearFuturesTickerCache = () => {
	futuresTickerCache.clear()
}

// Check if a futures symbol already includes an expiration code (e.g. MGCZ5, ESZ25).
// Polygon futures tickers end with a month letter + year digit(s).
const hasExpirationCode = (symbol: string): boolean => /[A-Z]\d$/.test(symbol)

// Futures month codes: F=Jan, G=Feb, H=Mar, J=Apr, K=May, M=Jun, N=Jul, Q=Aug, U=Sep, V=Oct, X=Nov, Z=Dec
const futuresMonthCodes: Record<string, number> = {
	F: 0, G: 1, H: 2, J: 3, K: 4, M: 5, N: 6, Q: 7, U: 8, V: 9, X: 10, Z: 11,
}

// Extract the expiration month and year from a futures ticker (e.g. MGCM6 -> { month: 5, year: 2026 }).
const getExpirationFromTicker = (ticker: string): { month: number, year: number } | null => {
	const match = ticker.match(/([FGHJKMNQUVXZ])(\d{1,2})$/)
	if (!match) return null
	const month = futuresMonthCodes[match[1]]
	if (month === undefined) return null
	const year = parseInt(match[2], 10)
	return { month, year: year < 10 ? 2020 + year : 2000 + year }
}

// Check if the trade date falls in the same month/year as the contract's expiration.
// If so, the contract is in its delivery month and data is degraded (low volume, erratic prices).
const isInExpirationMonth = (ticker: string, tradeDate: Date): boolean => {
	const exp = getExpirationFromTicker(ticker)
	if (!exp) return false
	return tradeDate.getMonth() === exp.month && tradeDate.getFullYear() === exp.year
}

// Resolve a base futures symbol (e.g. MGC) to a full contract ticker (e.g. MGCG6)
// by querying the Polygon /futures/v1/contracts API for the front-month contract
// that was active on the trade's open date.
// Contracts whose expiration month matches the trade date are skipped to avoid
// degraded data during the delivery/expiration month.
const resolveFuturesTicker = async (
    baseSymbol: string, tradeDate: Date, apiKey: string,
): Promise<string | null> => {
    const upper = baseSymbol.toUpperCase()
    const dateStr = tradeDate.toISOString().split('T')[0]
    const cacheKey = `${upper}_${dateStr}`

    const cached = futuresTickerCache.get(cacheKey)
    if (cached) return cached

    const url = `https://api.polygon.io/futures/v1/contracts?product_code=${upper}&date=${dateStr}&active=true&limit=100&apiKey=${apiKey}`

    try {
        const response = await fetchWithRateLimit(url)
        if (!response.ok) return null

        const data = await response.json()
        if (!data.results || data.results.length === 0) return null

        // Filter out combo contracts (tickers containing '-').
        const singleContracts = data.results.filter(
            (r: { ticker: string }) => !r.ticker.includes('-'),
        )
        if (singleContracts.length === 0) return null

        // Sort by last_trade_date ascending to pick the front month (nearest expiration).
        // The API doesn't support sorting by last_trade_date, so we do it client-side.
        singleContracts.sort((a: { last_trade_date: string }, b: { last_trade_date: string }) =>
            new Date(a.last_trade_date).getTime() - new Date(b.last_trade_date).getTime(),
        )

        // Skip contracts whose expiration month matches the trade date (degraded data in delivery month).
        const viable = singleContracts.filter(
            (c: { ticker: string }) => !isInExpirationMonth(c.ticker, tradeDate),
        )

        // Fallback to the first contract if all are in their expiration month.
        const fullTicker = (viable.length > 0 ? viable : singleContracts)[0].ticker as string
        futuresTickerCache.set(cacheKey, fullTicker)
        return fullTicker
    } catch {
        return null
    }
}

// Filter bars to a date range [fromStr, toStr] (inclusive, by day).
const filterBarsToDateRange = (bars: PolygonBar[], fromStr: string, toStr: string): PolygonBar[] => {
    const fromMs = new Date(fromStr + 'T00:00:00Z').getTime() / 1000
    // End of the toStr day.
    const toMs = new Date(toStr + 'T23:59:59Z').getTime() / 1000
    return bars.filter(b => b.time >= fromMs && b.time <= toMs)
}

export const usePolygonBars = (
    polygonSymbol: Ref<string | null>,
    trade: TradeDateRange,
) => {
    const { getCachedRange, setCachedPeriod, clearCachedPeriod } = usePolygonCache()

    const isFutures = computed(() => {
        if (trade.instrumentType === InstrumentType.Future) return true
        if (trade.instrumentType && trade.instrumentType !== InstrumentType.Any) return false
        return polygonSymbol.value !== null && isFuturesSymbol(polygonSymbol.value)
    })

    // Resolve the Polygon API key: prefer user settings, fallback to runtimeConfig (.env)
    const getApiKey = (): string => {
        const userStore = useUserStore()
        const settingsKey = userStore.user?.settings_object?.polygonApiKey as string | undefined
        if (settingsKey && settingsKey.trim()) return settingsKey.trim()
        const config = useRuntimeConfig()
        return config.public.polygonApiKey
    }

    // Resolve the effective ticker to use for fetching bars.
    // For futures, resolve the ticker to avoid degraded data in the expiration month.
    // If the symbol has no expiration code (e.g. MGC), query the contracts API for the front month.
    // If the symbol already has an expiration code (e.g. MGCM6) but the trade falls in that
    // contract's expiration month, roll to the next viable contract via the contracts API.
    const resolveTicker = async (apiKey: string): Promise<string | null> => {
        if (!polygonSymbol.value) return null

        if (isFutures.value) {
            const tradeDate = new Date(trade.closeDate)
            if (hasExpirationCode(polygonSymbol.value) && !isInExpirationMonth(polygonSymbol.value, tradeDate)) {
                return polygonSymbol.value
            }
            const baseSymbol = hasExpirationCode(polygonSymbol.value)
                ? polygonSymbol.value.replace(/[A-Z]\d{1,2}$/, '')
                : polygonSymbol.value
            const resolved = await resolveFuturesTicker(baseSymbol, tradeDate, apiKey)
            return resolved || polygonSymbol.value
        }

        return polygonSymbol.value
    }

    const fetchBars = async (tf: string): Promise<PolygonBar[]> => {
        if (!polygonSymbol.value) return []

        const apiKey = getApiKey()
        const ticker = await resolveTicker(apiKey)
        if (!ticker) return []

        const { fromStr, toStr } = computeDateRange(tf, trade)

        // Check which periods are already cached.
        const { bars: cachedBars, missingPeriods } = await getCachedRange(ticker, tf, fromStr, toStr)

        // If everything is cached, return directly.
        if (missingPeriods.length === 0) {
            return filterBarsToDateRange(deduplicateBars(cachedBars), fromStr, toStr)
        }

        // Fetch the entire trade range in a single API call.
        // We always fetch fromStr → toStr (not just missing periods) to ensure
        // the trade itself is always covered, even if Polygon truncates results.
        const tfMinutes = Number(tf)
        const fetchDays = (new Date(toStr).getTime() - new Date(fromStr).getTime()) / 86_400_000
        const estimatedBars = Math.ceil(fetchDays * 24 * 60 / tfMinutes)
        if (estimatedBars > 40_000) {
            throw new Error('RANGE_TOO_LARGE')
        }

        const fetchedBars = isFutures.value
            ? await fetchFuturesBars(ticker, tf, fromStr, toStr, apiKey)
            : await fetchStandardBars(ticker, tf, fromStr, toStr, apiKey)

        // Split the fetched bars by period and cache each one.
        const barsByPeriod = new Map<string, PolygonBar[]>()
        for (const bar of fetchedBars) {
            const pk = timestampToPeriodKey(tf, bar.time)
            const arr = barsByPeriod.get(pk)
            if (arr) {
                arr.push(bar)
            } else {
                barsByPeriod.set(pk, [bar])
            }
        }
        for (const [pk, bars] of barsByPeriod) {
            await setCachedPeriod(ticker, tf, pk, bars)
        }

        // Merge cached + fetched, deduplicate, filter to exact range.
        const allBars = [...cachedBars, ...fetchedBars]
        const deduped = deduplicateBars(allBars)
        return filterBarsToDateRange(deduped, fromStr, toStr)
    }

    const refetchBars = async (tf: string): Promise<PolygonBar[]> => {
        if (!polygonSymbol.value) return []

        clearFuturesTickerCache()
        const apiKey = getApiKey()
        const ticker = await resolveTicker(apiKey)
        if (!ticker) return []

        const { fromStr, toStr } = computeDateRange(tf, trade)

        // Clear only the periods covering the trade itself (not the full buffer range)
        // to force a re-fetch from the API while keeping the buffer periods cached.
        const tradeFromStr = new Date(trade.openDate).toISOString().split('T')[0]
        const tradeToStr = new Date(trade.closeDate).toISOString().split('T')[0]
        const tradePeriods = listPeriodsInRange(tf, tradeFromStr, tradeToStr)
        for (const pk of tradePeriods) {
            await clearCachedPeriod(ticker, tf, pk)
        }

        return fetchBars(tf)
    }

    return { fetchBars, refetchBars }
}
