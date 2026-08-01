import type { ComputedRef, Ref } from 'vue'
import type { TradeFilter } from '~/type'
import { formatDateToYYYYMMDD } from '~/utils/date-utils'
import { getPeriodDates } from '~/utils/dashboard'

type ApplyFilters = () => Promise<unknown>
type FilterChangeHandler = () => unknown

type DashboardFiltersOptions = {
	filters: ComputedRef<TradeFilter[]>
	filterLoading: Ref<boolean>
	isAutoApplyMode: ComputedRef<boolean>
	displayModeNet: Ref<boolean>
	debouncedHandleFilterChange: FilterChangeHandler
	onApplyFiltersDebounced: ApplyFilters
}

export const useDashboardFilters = ({
	filters,
	filterLoading,
	isAutoApplyMode,
	displayModeNet,
	debouncedHandleFilterChange,
	onApplyFiltersDebounced,
}: DashboardFiltersOptions) => {
	const dbStateStore = useDbStateStore()
	const startDateStr = computed({
		get: () => formatDateToYYYYMMDD(dbStateStore.dashBoardFilters.startDate),
		set: (value: string) => {
			const date = new Date(value)
			dbStateStore.dashBoardFilters.startDate = date
			dbStateStore.dashBoardFilters.customStartDate = date
			if (dbStateStore.dashBoardFilters.period !== 'custom') dbStateStore.dashBoardFilters.period = 'custom'
		},
	})
	const endDateStr = computed({
		get: () => formatDateToYYYYMMDD(dbStateStore.dashBoardFilters.endDate),
		set: (value: string) => {
			const date = new Date(value)
			dbStateStore.dashBoardFilters.endDate = date
			dbStateStore.dashBoardFilters.customEndDate = date
			if (dbStateStore.dashBoardFilters.period !== 'custom') dbStateStore.dashBoardFilters.period = 'custom'
		},
	})
	const fetchingDateRange = ref(false)
	const { fetchTradesDateRange } = useTrades()
	const setHistoryDateRange = async () => {
		fetchingDateRange.value = true
		try {
			const result = await fetchTradesDateRange(dbStateStore.dashBoardFilters.accountIds)
			if (!result.minDate || !result.maxDate) return
			const startDate = new Date(result.minDate)
			const endDate = new Date(result.maxDate)
			dbStateStore.dashBoardFilters.startDate = startDate
			dbStateStore.dashBoardFilters.endDate = endDate
			dbStateStore.dashBoardFilters.customStartDate = startDate
			dbStateStore.dashBoardFilters.customEndDate = endDate
			dbStateStore.dashBoardFilters.period = 'custom'
			await onApplyFiltersDebounced()
		} catch (error) {
			console.error('Error fetching date range:', error)
		} finally {
			fetchingDateRange.value = false
		}
	}

	let lastAccountIds: number[] = []
	watch(
		() => dbStateStore.dashBoardFilters.period,
		(period) => {
			if (period === 'custom') {
				const { customStartDate, customEndDate } = dbStateStore.dashBoardFilters
				dbStateStore.dashBoardFilters.startDate = customStartDate instanceof Date ? customStartDate : new Date(customStartDate)
				dbStateStore.dashBoardFilters.endDate = customEndDate instanceof Date ? customEndDate : new Date(customEndDate)
				return
			}
			const { start, end } = getPeriodDates(period)
			dbStateStore.dashBoardFilters.startDate = start || new Date()
			dbStateStore.dashBoardFilters.endDate = end || new Date()
		},
		{ immediate: true },
	)
	watch(
		() => dbStateStore.dashBoardFilters.accountIds,
		(newIds) => {
			const currentIds = newIds || []
			const changed = currentIds.length !== lastAccountIds.length || currentIds.some((id, index) => id !== lastAccountIds[index])
			if (!changed) return
			lastAccountIds = [...currentIds]
			debouncedHandleFilterChange()
		},
	)
	watch([startDateStr, endDateStr], () => debouncedHandleFilterChange())
	watch(
		filters,
		(newFilters, oldFilters) => {
			if (filterLoading.value) return
			if (newFilters.length > oldFilters.length) {
				const addedFilter = newFilters[newFilters.length - 1]
				if (!addedFilter.value || addedFilter.value === '') return
			}
			debouncedHandleFilterChange()
		},
		{ deep: true },
	)
	watch(displayModeNet, () => {
		if (isAutoApplyMode.value) onApplyFiltersDebounced()
	})

	return { startDateStr, endDateStr, fetchingDateRange, setHistoryDateRange }
}
