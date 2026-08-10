import { computed, type Ref } from 'vue'
import { InstrumentType } from '~/type'
import type { PolygonBar } from '~/utils/polygonSymbol'
import { isFuturesSymbol } from '~/utils/polygonSymbol'
import { listPeriodsInRange, periodKeyToRange, timestampToPeriodKey } from '~/utils/barCache'

type RthSession = { open: string, close: string, timezone: string }

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

    // Convert buffer bars to calendar time.
    // Intraday bars only exist during trading hours, so we can't simply multiply
    // by barMs for instruments with limited sessions — that would underestimate
    // the calendar range needed.
    // Futures and Any use the old simple formula (bars × barMs) since futures
    // trade nearly 24/5 and the bar count maps closely to calendar time.
    // Stocks/options have ~6.5h sessions, forex/crypto ~24h.
    const useLegacyBuffer = trade.instrumentType === InstrumentType.Future
        || trade.instrumentType === InstrumentType.Any
        || !trade.instrumentType
    let bufferMs: number
    if (tfMinutes >= 1440 || useLegacyBuffer) {
        bufferMs = bufferBars * barMs
    } else {
        const tradingHoursPerDay = trade.instrumentType === InstrumentType.Stock
            || trade.instrumentType === InstrumentType.Option
            ? 6.5
            : 24 // forex, crypto
        const barsPerDay = (tradingHoursPerDay * 60) / tfMinutes
        const bufferDays = bufferBars / barsPerDay
        bufferMs = bufferDays * 24 * 60 * 60 * 1000
    }

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

// Parse a "HH:MM" time string into minutes since midnight.
const parseTimeToMinutes = (time: string): number => {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
}

// Convert a Unix timestamp (in seconds) to minutes since midnight in the given timezone.
const toMinutesInTz = (timestampSec: number, timezone: string): number => {
    const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit', minute: '2-digit', hour12: false,
    })
    const parts = fmt.formatToParts(new Date(timestampSec * 1000))
    const hour = parseInt(parts.find(p => p.type === 'hour')!.value, 10)
    const minute = parseInt(parts.find(p => p.type === 'minute')!.value, 10)
    return hour * 60 + minute
}

// Check if a bar overlaps with the given RTH session.
// A bar is included if any part of it falls within [open, close).
const barOverlapsRth = (barStartMin: number, barEndMin: number, session: RthSession): boolean => {
    const openMin = parseTimeToMinutes(session.open)
    const closeMin = parseTimeToMinutes(session.close)
    return barStartMin < closeMin && barEndMin > openMin
}

// Filter bars to RTH session using overlap logic.
// A bar is kept if any portion of it falls within the RTH window.
// Returns bars unfiltered if no session applies (e.g. forex/crypto have no RTH).
const filterBarsToRth = (bars: PolygonBar[], session: RthSession | null, tfMinutes: number): PolygonBar[] => {
    if (!session) return bars
    return bars.filter(b => {
        const barStartMin = toMinutesInTz(b.time, session.timezone)
        const barEndMin = barStartMin + tfMinutes
        return barOverlapsRth(barStartMin, barEndMin, session)
    })
}

// Fetch bars from the standard Polygon aggregates API (stocks, forex, crypto, options).
// Returns raw (unfiltered) bars — RTH filtering is applied after cache retrieval.
const fetchStandardBars = async (
    ticker: string, tf: string, fromStr: string, toStr: string, apiKey: string,
): Promise<{ bars: PolygonBar[] }> => {
    const { multiplier, timespan } = timeframeToRange(tf)
    const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${fromStr}/${toStr}?adjusted=true&sort=asc&limit=50000&apiKey=${apiKey}`

    const response = await fetchWithRateLimit(url)
    if (!response.ok) {
        throw new Error(`Polygon API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    if (!data.results || data.results.length === 0) {
        return { bars: [] }
    }

    const bars = data.results.map((bar: { t: number, o: number, h: number, l: number, c: number }): PolygonBar => ({
        time: Math.floor(bar.t / 1000),
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
    }))

    return { bars: deduplicateBars(bars) }
}

// Fetch bars from the Polygon futures API (/futures/v1/aggs/{ticker}).
// The futures API uses a different URL structure, resolution format, and nanosecond timestamps.
// Returns raw (unfiltered) bars — RTH filtering is applied after cache retrieval.
const fetchFuturesBars = async (
    ticker: string, tf: string, fromStr: string, toStr: string, apiKey: string,
): Promise<{ bars: PolygonBar[] }> => {
    const resolution = timeframeToFuturesResolution(tf)
    const url = `https://api.polygon.io/futures/v1/aggs/${ticker}?resolution=${resolution}&window_start.gte=${fromStr}&window_start.lte=${toStr}&sort=window_start.asc&limit=50000&apiKey=${apiKey}`

    const response = await fetchWithRateLimit(url)
    if (!response.ok) {
        throw new Error(`Polygon API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    if (!data.results || data.results.length === 0) {
        return { bars: [] }
    }

    const bars = data.results.map((bar: { window_start: number, open: number, high: number, low: number, close: number }): PolygonBar => ({
        // Futures API returns nanosecond timestamps; convert to seconds.
        time: Math.floor(bar.window_start / 1_000_000_000),
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
    }))

    return { bars: deduplicateBars(bars) }
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

// Check if the contract has already expired before the trade date.
// The expiration is the last day of the expiration month.
const isExpired = (ticker: string, tradeDate: Date): boolean => {
	const exp = getExpirationFromTicker(ticker)
	if (!exp) return false
	const expirationDate = new Date(Date.UTC(exp.year, exp.month + 1, 0)) // last day of expiration month
	return tradeDate > expirationDate
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
        // Use plain fetch — contract resolution is a lightweight lookup, not subject to bar data rate limits.
        const response = await fetch(url)
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
    forcedInstrumentType: Ref<InstrumentType | null>,
    rth: Ref<boolean>,
) => {
    const { getCachedRange, setCachedPeriod, clearCachedPeriod } = usePolygonCache()

    const isFutures = computed(() => {
        // spgn prefix override takes priority
        if (forcedInstrumentType.value === InstrumentType.Future) return true
        if (forcedInstrumentType.value !== null) return false

        if (trade.instrumentType === InstrumentType.Future) return true
        if (trade.instrumentType && trade.instrumentType !== InstrumentType.Any) return false
        return polygonSymbol.value !== null && isFuturesSymbol(polygonSymbol.value)
    })

    // Resolve the Polygon API key from user settings. The key is no longer
    // read from runtimeConfig / env files; it must be provided by the user.
    const getApiKey = (): string => {
        const userStore = useUserStore()
        const settingsKey = userStore.user?.settings_object?.polygonApiKey as string | undefined
        if (settingsKey && settingsKey.trim()) return settingsKey.trim()
        throw new Error('MISSING_POLYGON_API_KEY')
    }

    // Resolve the RTH session for the current trade's instrument type.
    // Returns null for forex/crypto (no RTH) or if settings are missing.
    const getRthSession = (): RthSession | null => {
        const userStore = useUserStore()
        const sessions = userStore.user?.settings_object?.rthSessions as Record<string, RthSession> | undefined
        if (!sessions) return null

        // Determine the effective instrument type.
        let effectiveType: string
        if (forcedInstrumentType.value !== null) {
            effectiveType = forcedInstrumentType.value
        } else if (trade.instrumentType && trade.instrumentType !== InstrumentType.Any) {
            effectiveType = trade.instrumentType
        } else if (isFutures.value) {
            effectiveType = InstrumentType.Future
        } else {
            effectiveType = InstrumentType.Any
        }

        return sessions[effectiveType] ?? sessions[InstrumentType.Any] ?? null
    }

    // Apply RTH filtering to bars retrieved from cache or freshly fetched.
    // Only intraday bars are affected; daily/session bars are kept as-is.
    const applyRthFilter = (bars: PolygonBar[], tf: string): PolygonBar[] => {
        const tfMinutes = Number(tf)
        if (!rth.value || tfMinutes >= 1440) return bars
        return filterBarsToRth(bars, getRthSession(), tfMinutes)
    }

    // Resolve the effective ticker to use for fetching bars.
    // For futures, resolve the ticker to avoid degraded data in the expiration month.
    // If the symbol has no expiration code (e.g. MGC), query the contracts API for the front month.
    // If the symbol already has an expiration code (e.g. MGCM6) but the trade falls in that
    // contract's expiration month, or the contract has already expired, roll to the next
    // viable contract via the contracts API.
    const resolveTicker = async (apiKey: string): Promise<string | null> => {
        if (!polygonSymbol.value) return null

        if (isFutures.value) {
            const tradeDate = new Date(trade.closeDate)
            if (hasExpirationCode(polygonSymbol.value) && !isInExpirationMonth(polygonSymbol.value, tradeDate) && !isExpired(polygonSymbol.value, tradeDate)) {
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

        // Cache raw (unfiltered) bars under the ticker key only.
        // RTH filtering is applied after cache retrieval so the same cached data
        // serves both RTH and ETH modes without duplicate API calls or storage.
        const cacheTicker = ticker

        // List all periods covering the range.
        const allPeriods = listPeriodsInRange(tf, fromStr, toStr)

        // Check which periods are missing from cache.
        const { bars: cachedBars, missingPeriods } = await getCachedRange(cacheTicker, tf, fromStr, toStr)

        // If everything is cached, return (with RTH filter applied) directly.
        if (missingPeriods.length === 0) {
            return applyRthFilter(filterBarsToDateRange(deduplicateBars(cachedBars), fromStr, toStr), tf)
        }

        // Clamp the fetch range to the exact period boundaries (first period start → last period end).
        // This ensures the fetched data aligns exactly with cache period keys.
        const { fromStr: fetchFrom } = periodKeyToRange(tf, allPeriods[0])
        const { toStr: fetchTo } = periodKeyToRange(tf, allPeriods[allPeriods.length - 1])

        const { bars: fetchedBars } = isFutures.value
            ? await fetchFuturesBars(ticker, tf, fetchFrom, fetchTo, apiKey)
            : await fetchStandardBars(ticker, tf, fetchFrom, fetchTo, apiKey)

        // Split the fetched bars by period and overwrite all periods in cache.
        // Since the fetch range is clamped to period boundaries, we consider all
        // periods fully covered by this single request.
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

        await Promise.all(allPeriods.map(pk => setCachedPeriod(cacheTicker, tf, pk, barsByPeriod.get(pk) || [])))

        return applyRthFilter(filterBarsToDateRange(deduplicateBars(fetchedBars), fromStr, toStr), tf)
    }

    const refetchBars = async (tf: string): Promise<PolygonBar[]> => {
        if (!polygonSymbol.value) return []

        clearFuturesTickerCache()
        const apiKey = getApiKey()
        const ticker = await resolveTicker(apiKey)
        if (!ticker) return []

        const { fromStr, toStr } = computeDateRange(tf, trade)

        // Clear all periods covering the full range (including buffer) to force a complete re-fetch.
        // Use the same unsuffixed key as fetchBars so the right cache entries are cleared.
        const cacheTicker = ticker
        const allPeriods = listPeriodsInRange(tf, fromStr, toStr)
        for (const pk of allPeriods) {
            await clearCachedPeriod(cacheTicker, tf, pk)
        }

        return fetchBars(tf)
    }

    return { fetchBars, refetchBars }
}
