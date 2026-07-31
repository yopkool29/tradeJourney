import { eachDayOfInterval, endOfMonth, endOfWeek, startOfWeek } from 'date-fns'
import type { Ref } from 'vue'
import type { TradeExtendedType } from '~/schema/trade'
import { getWinrate } from '~/utils/tradeStats'
import { formatDateLongString, formatDateToYYYYMMDD } from '~/utils/date-utils'

export type DayData = {
	dayNumber: number
	isCurrentMonth: boolean
	count: number
	pnl: number
	commission?: number
	winrate: number
	trades: TradeExtendedType[]
	screenshotCount: number
	hasDetailedNote: boolean
}

export type WeekData = {
	days: DayData[]
	total: number
}

export const useCalendarGrid = (
	displayMonth: Ref<string>,
	displayResults: Ref<TradeExtendedType[]>,
	displayModeNet: Ref<boolean>,
	accountIds: Ref<number[]>,
	selectedMonth: Ref<string>,
	locale: () => string,
) => {
	const { startLoading, stopLoading } = useGlobalLoading()

	const getDaysStats = () => {
		const trades = displayResults.value as TradeExtendedType[]
		if (!displayMonth.value) return {}
		const [year, month] = displayMonth.value.split('-').map(Number)
		const start = new Date(year, month - 1, 1)
		const end = endOfMonth(start)

		const accountIdSet = new Set(accountIds.value)
		const allAccounts = accountIds.value.length === 0 || accountIdSet.has(-1)

		const tradesByDay: Record<string, TradeExtendedType[]> = {}
		for (const trade of trades) {
			const closeDate = trade.closeDate
			if (closeDate < start || closeDate > end) continue
			if (!allAccounts && !accountIdSet.has(trade.accountId)) continue
			const key = formatDateToYYYYMMDD(closeDate)
			if (!tradesByDay[key]) tradesByDay[key] = []
			tradesByDay[key].push(trade)
		}

		const stats: { [key: string]: { count: number; pnl: number; commission: number; trades: TradeExtendedType[] } } = {}
		eachDayOfInterval({ start, end }).forEach((day) => {
			const key = formatDateToYYYYMMDD(day)
			const tradesOfDay = tradesByDay[key] || []
			const pnl = tradesOfDay.reduce((sum, t) => sum + (displayModeNet.value ? t.netProfit : t.profit), 0)
			const commission = tradesOfDay.reduce((sum, t) => sum + (t.commission || 0), 0)
			stats[key] = { count: tradesOfDay.length, pnl, commission, trades: tradesOfDay }
		})
		return stats
	}

	const dayStats = computed(() => getDaysStats())

	const filteredGroups = computed(() => Object.values(dayStats.value).filter((g) => g.count > 0))

	const calendarWeeks = computed(() => {
		if (!displayMonth.value) return []
		const [year, month] = displayMonth.value.split('-').map(Number)
		const monthStart = new Date(year, month - 1, 1)
		const monthEnd = endOfMonth(monthStart)
		const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
		const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
		const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

		const weeks: WeekData[] = []
		let currentWeek: DayData[] = []
		let weekTotal = 0

		allDays.forEach((day) => {
			const dayKey = formatDateToYYYYMMDD(day)
			const dayData = dayStats.value[dayKey]
			const isCurrentMonth = day.getMonth() === month - 1
			const trades = dayData?.trades || []
			const screenshotCount = trades.reduce((total, trade) => {
				const screenshots = trade.screenshots?.length || 0
				const hasScreenshotUrl = trade.screenshotUrl ? 1 : 0
				return total + screenshots + hasScreenshotUrl
			}, 0)
			const hasDetailedNote = trades.some((trade) => {
				const detailedNote = (trade.metadata as Record<string, unknown>)?.detailedNote as string
				return detailedNote && detailedNote.length > 0
			})

			const dayInfo: DayData = {
				dayNumber: day.getDate(),
				isCurrentMonth,
				count: dayData?.count || 0,
				pnl: dayData?.pnl || 0,
				commission: dayData?.commission || 0,
				winrate: dayData?.trades ? getWinrate(dayData.trades, 0) : 0,
				trades,
				screenshotCount,
				hasDetailedNote,
			}

			currentWeek.push(dayInfo)
			if (isCurrentMonth) weekTotal += dayInfo.pnl

			if (currentWeek.length === 7) {
				weeks.push({ days: currentWeek, total: weekTotal })
				currentWeek = []
				weekTotal = 0
			}
		})

		if (currentWeek.length > 0) weeks.push({ days: currentWeek, total: weekTotal })
		return weeks
	})

	// Modal state
	const showDayModal = ref(false)
	const selectedDay = ref<DayData | null>(null)
	const dayModalShowTable = ref(true)

	const showWeekModal = ref(false)
	const selectedWeek = ref<WeekData | null>(null)
	const weekModalShowTable = ref<Record<number, boolean>>({})

	const getDateFromDay = (day: DayData): Date => {
		if (!selectedMonth.value) return new Date()
		const [year, month] = selectedMonth.value.split('-').map(Number)
		return new Date(year, month - 1, day.dayNumber)
	}

	const selectedDayDate = computed(() => {
		if (!selectedDay.value || !selectedMonth.value) return new Date()
		const [year, month] = selectedMonth.value.split('-').map(Number)
		return new Date(year, month - 1, selectedDay.value.dayNumber)
	})

	const dayModalTitle = computed(() => {
		if (!selectedDay.value) return ''
		return formatDateLongString(selectedDayDate.value, locale() as 'fr' | 'en' | 'us', true)
	})

	const selectedWeekDays = computed(() => {
		if (!selectedWeek.value) return []
		return selectedWeek.value.days.filter((day) => day.isCurrentMonth)
	})

	const weekModalTitle = computed(() => {
		if (!selectedWeekDays.value.length) return ''
		const firstDay = selectedWeekDays.value[0]
		const lastDay = selectedWeekDays.value[selectedWeekDays.value.length - 1]
		const loc = locale() as 'fr' | 'en' | 'us'
		return `${formatDateLongString(getDateFromDay(firstDay), loc, false)} - ${formatDateLongString(getDateFromDay(lastDay), loc, false)}`
	})

	const openDayModal = async (day: DayData) => {
		if (!day.isCurrentMonth || day.count === 0) return
		startLoading()
		await new Promise<void>((resolve) =>
			setTimeout(() => {
				selectedDay.value = day
				showDayModal.value = true
				resolve()
			}, 100),
		)
		stopLoading()
	}

	const openWeekModal = async (week: WeekData) => {
		const hasTradesInWeek = week.days.some((day) => day.isCurrentMonth && day.count > 0)
		if (!hasTradesInWeek) return
		startLoading()
		await new Promise<void>((resolve) => {
			setTimeout(() => {
				selectedWeek.value = week
				weekModalShowTable.value = {}
				week.days.forEach((day) => {
					if (day.isCurrentMonth && day.count > 0) weekModalShowTable.value[day.dayNumber] = true
				})
				showWeekModal.value = true
				resolve()
			}, 100)
		})
		stopLoading()
	}

	return {
		dayStats, filteredGroups, calendarWeeks,
		showDayModal, selectedDay, dayModalShowTable,
		showWeekModal, selectedWeek, weekModalShowTable,
		selectedDayDate, dayModalTitle, selectedWeekDays, weekModalTitle,
		openDayModal, openWeekModal, getDateFromDay,
	}
}
