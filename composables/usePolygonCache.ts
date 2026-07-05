import { get, set, del } from 'idb-keyval'
import type { PolygonBar } from '~/utils/polygonSymbol'

interface CachedEntry {
	timestamp: number
	data: PolygonBar[]
}

// Polygon free plan rate limit: 5 requests per minute.
// For data touching today, we refresh at most once per minute.
const todayRefreshMs = 60_000

// Timeframes <= 5 minutes use weekly cache periods (a month of 1min bars
// on 24h markets like forex/crypto approaches Polygon's 50000 bar limit).
// Larger timeframes use monthly periods.
const isWeeklyTf = (tf: string): boolean => Number(tf) <= 5

// Build a cache key: polygon:{ticker}:{tf}:{periodKey}
const buildKey = (polygonSymbol: string, tf: string, periodKey: string): string => {
	return `polygon:${polygonSymbol}:${tf}:${periodKey}`
}

// --- Week helpers (ISO week: YYYY-Www) ---

// Get the Monday of the week containing the given date.
const getMonday = (date: Date): Date => {
	const d = new Date(date)
	d.setUTCHours(0, 0, 0, 0)
	const day = d.getUTCDay()
	const diff = (day === 0 ? -6 : 1) - day // Sunday=0 -> Monday of that week
	d.setUTCDate(d.getUTCDate() + diff)
	return d
}

// Convert a date string (YYYY-MM-DD) to an ISO week key (YYYY-Www).
const toWeekKey = (dateStr: string): string => {
	const date = new Date(dateStr + 'T00:00:00Z')
	const monday = getMonday(date)
	const year = monday.getUTCFullYear()
	const jan1 = new Date(Date.UTC(year, 0, 1))
	const weekNum = Math.ceil(((monday.getTime() - jan1.getTime()) / 86400000 + jan1.getUTCDay() + 1) / 7)
	return `${year}-W${String(weekNum).padStart(2, '0')}`
}

// Convert a week key (YYYY-Www) to a date range [Monday, Sunday].
const weekKeyToRange = (weekKey: string): { fromStr: string, toStr: string } => {
	const [yStr, wStr] = weekKey.split('-W')
	const y = Number(yStr)
	const w = Number(wStr)
	const jan1 = new Date(Date.UTC(y, 0, 1))
	const dayOfYear = (w - 1) * 7 + 1
	const monday = new Date(Date.UTC(y, 0, dayOfYear))
	// Adjust to the actual Monday of that ISO week.
	const jan1Day = jan1.getUTCDay()
	const offset = (jan1Day === 0 ? -6 : 1) - jan1Day
	monday.setUTCDate(monday.getUTCDate() + offset)
	const sunday = new Date(monday)
	sunday.setUTCDate(sunday.getUTCDate() + 6)
	return {
		fromStr: monday.toISOString().split('T')[0],
		toStr: sunday.toISOString().split('T')[0],
	}
}

// List all week keys between fromStr and toStr (inclusive).
const listWeeksInRange = (fromStr: string, toStr: string): string[] => {
	const weeks: string[] = []
	const from = getMonday(new Date(fromStr + 'T00:00:00Z'))
	const to = getMonday(new Date(toStr + 'T00:00:00Z'))
	const cursor = new Date(from)
	while (cursor <= to) {
		weeks.push(toWeekKey(cursor.toISOString().split('T')[0]))
		cursor.setUTCDate(cursor.getUTCDate() + 7)
	}
	return weeks
}

// Check if a week key is the current week or in the future.
const isWeekCurrentOrFuture = (weekKey: string): boolean => {
	const currentWeek = toWeekKey(new Date().toISOString().split('T')[0])
	return weekKey >= currentWeek
}

// --- Month helpers (YYYY-MM) ---

const monthKeyToRange = (monthKey: string): { fromStr: string, toStr: string } => {
	const [y, m] = monthKey.split('-').map(Number)
	const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
	return {
		fromStr: `${monthKey}-01`,
		toStr: `${monthKey}-${String(lastDay).padStart(2, '0')}`,
	}
}

// List all YYYY-MM strings between fromStr and toStr (inclusive).
export const listMonthsInRange = (fromStr: string, toStr: string): string[] => {
	const months: string[] = []
	const [fromY, fromM] = fromStr.split('-').map(Number)
	const [toY, toM] = toStr.split('-').map(Number)
	let y = fromY
	let m = fromM
	while (y < toY || (y === toY && m <= toM)) {
		months.push(`${y}-${String(m).padStart(2, '0')}`)
		m++
		if (m > 12) { m = 1; y++ }
	}
	return months
}

const isMonthCurrentOrFuture = (monthKey: string): boolean => {
	const now = new Date()
	const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
	return monthKey >= currentMonth
}

// --- Adaptive period selection ---

// List all period keys in the range, using weeks or months depending on tf.
export const listPeriodsInRange = (tf: string, fromStr: string, toStr: string): string[] => {
	if (isWeeklyTf(tf)) {
		return listWeeksInRange(fromStr, toStr)
	}
	return listMonthsInRange(fromStr, toStr)
}

// Convert a period key to a date range.
export const periodKeyToRange = (tf: string, periodKey: string): { fromStr: string, toStr: string } => {
	if (isWeeklyTf(tf)) {
		return weekKeyToRange(periodKey)
	}
	return monthKeyToRange(periodKey)
}

// Get the period key for a given timestamp (seconds).
export const timestampToPeriodKey = (tf: string, timestamp: number): string => {
	const dateStr = new Date(timestamp * 1000).toISOString().split('T')[0]
	if (isWeeklyTf(tf)) {
		return toWeekKey(dateStr)
	}
	return dateStr.substring(0, 7)
}

// Check if a period is the current period or in the future.
const isPeriodCurrentOrFuture = (tf: string, periodKey: string): boolean => {
	if (isWeeklyTf(tf)) {
		return isWeekCurrentOrFuture(periodKey)
	}
	return isMonthCurrentOrFuture(periodKey)
}

export const usePolygonCache = () => {
	// Retrieve cached bars for a single period. Returns null if stale or missing.
	const getCachedPeriod = async (polygonSymbol: string, tf: string, periodKey: string): Promise<PolygonBar[] | null> => {
		const key = buildKey(polygonSymbol, tf, periodKey)
		const entry = await get<CachedEntry>(key)
		if (!entry) return null

		// Historical periods are immutable: cache indefinitely.
		if (!isPeriodCurrentOrFuture(tf, periodKey)) {
			return entry.data
		}

		// Current period: respect the 1-minute refresh window.
		const age = Date.now() - entry.timestamp
		if (age < todayRefreshMs) {
			return entry.data
		}

		return null
	}

	const setCachedPeriod = async (polygonSymbol: string, tf: string, periodKey: string, data: PolygonBar[]): Promise<void> => {
		const key = buildKey(polygonSymbol, tf, periodKey)
		const entry: CachedEntry = { timestamp: Date.now(), data }
		await set(key, entry)
	}

	const clearCachedPeriod = async (polygonSymbol: string, tf: string, periodKey: string): Promise<void> => {
		const key = buildKey(polygonSymbol, tf, periodKey)
		await del(key)
	}

	// Retrieve cached bars for a full date range by combining period caches.
	// Returns { bars, missingPeriods } where missingPeriods need to be fetched.
	const getCachedRange = async (
		polygonSymbol: string, tf: string, fromStr: string, toStr: string,
	): Promise<{ bars: PolygonBar[], missingPeriods: string[] }> => {
		const periods = listPeriodsInRange(tf, fromStr, toStr)
		const bars: PolygonBar[] = []
		const missingPeriods: string[] = []

		for (const pk of periods) {
			const cached = await getCachedPeriod(polygonSymbol, tf, pk)
			if (cached) {
				bars.push(...cached)
			} else {
				missingPeriods.push(pk)
			}
		}

		return { bars, missingPeriods }
	}

	return {
		getCachedPeriod,
		setCachedPeriod,
		clearCachedPeriod,
		getCachedRange,
	}
}
