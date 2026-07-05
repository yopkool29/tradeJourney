export interface Bar {
	time: number
	open: number
	high: number
	low: number
	close: number
}

export interface CachedEntry<T> {
	timestamp: number
	data: T[]
}

export interface StorageAdapter<T> {
	get: (key: string) => Promise<CachedEntry<T> | undefined>
	set: (key: string, entry: CachedEntry<T>) => Promise<void>
	del: (key: string) => Promise<void>
}

// Timeframes <= 5 minutes use weekly cache periods.
// Larger timeframes use monthly periods.
const isWeeklyTf = (tf: string): boolean => Number(tf) <= 5

// Build a cache key: prefix:{ticker}:{tf}:{periodKey}
const buildKey = (prefix: string, ticker: string, tf: string, periodKey: string): string => {
	return `${prefix}:${ticker}:${tf}:${periodKey}`
}

// --- Week helpers (ISO week: YYYY-Www) ---

const getMonday = (date: Date): Date => {
	const d = new Date(date)
	d.setUTCHours(0, 0, 0, 0)
	const day = d.getUTCDay()
	const diff = (day === 0 ? -6 : 1) - day
	d.setUTCDate(d.getUTCDate() + diff)
	return d
}

const toWeekKey = (dateStr: string): string => {
	const date = new Date(dateStr + 'T00:00:00Z')
	const monday = getMonday(date)
	const year = monday.getUTCFullYear()
	const jan1 = new Date(Date.UTC(year, 0, 1))
	const weekNum = Math.ceil(((monday.getTime() - jan1.getTime()) / 86400000 + jan1.getUTCDay() + 1) / 7)
	return `${year}-W${String(weekNum).padStart(2, '0')}`
}

const weekKeyToRange = (weekKey: string): { fromStr: string, toStr: string } => {
	const [yStr, wStr] = weekKey.split('-W')
	const y = Number(yStr)
	const w = Number(wStr)
	const jan1 = new Date(Date.UTC(y, 0, 1))
	const dayOfYear = (w - 1) * 7 + 1
	const monday = new Date(Date.UTC(y, 0, dayOfYear))
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

const listMonthsInRange = (fromStr: string, toStr: string): string[] => {
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

export const listPeriodsInRange = (tf: string, fromStr: string, toStr: string): string[] => {
	if (isWeeklyTf(tf)) {
		return listWeeksInRange(fromStr, toStr)
	}
	return listMonthsInRange(fromStr, toStr)
}

export const periodKeyToRange = (tf: string, periodKey: string): { fromStr: string, toStr: string } => {
	if (isWeeklyTf(tf)) {
		return weekKeyToRange(periodKey)
	}
	return monthKeyToRange(periodKey)
}

export const timestampToPeriodKey = (tf: string, timestamp: number): string => {
	const dateStr = new Date(timestamp * 1000).toISOString().split('T')[0]
	if (isWeeklyTf(tf)) {
		return toWeekKey(dateStr)
	}
	return dateStr.substring(0, 7)
}

const isPeriodCurrentOrFuture = (tf: string, periodKey: string): boolean => {
	if (isWeeklyTf(tf)) {
		return isWeekCurrentOrFuture(periodKey)
	}
	return isMonthCurrentOrFuture(periodKey)
}

// Create a bar cache with an injectable storage adapter.
export const createBarCache = <T extends Bar>(
	adapter: StorageAdapter<T>,
	prefix: string,
	refreshMs: number,
) => {
	const getCachedPeriod = async (ticker: string, tf: string, periodKey: string): Promise<T[] | null> => {
		const key = buildKey(prefix, ticker, tf, periodKey)
		const entry = await adapter.get(key)
		if (!entry) return null

		if (!isPeriodCurrentOrFuture(tf, periodKey)) {
			return entry.data
		}

		const age = Date.now() - entry.timestamp
		if (age < refreshMs) {
			return entry.data
		}

		return null
	}

	const setCachedPeriod = async (ticker: string, tf: string, periodKey: string, data: T[]): Promise<void> => {
		const key = buildKey(prefix, ticker, tf, periodKey)
		const entry: CachedEntry<T> = { timestamp: Date.now(), data }
		await adapter.set(key, entry)
	}

	const clearCachedPeriod = async (ticker: string, tf: string, periodKey: string): Promise<void> => {
		const key = buildKey(prefix, ticker, tf, periodKey)
		await adapter.del(key)
	}

	const getCachedRange = async (
		ticker: string, tf: string, fromStr: string, toStr: string,
	): Promise<{ bars: T[], missingPeriods: string[] }> => {
		const periods = listPeriodsInRange(tf, fromStr, toStr)
		const bars: T[] = []
		const missingPeriods: string[] = []

		for (const pk of periods) {
			const cached = await getCachedPeriod(ticker, tf, pk)
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
