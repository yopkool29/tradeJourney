import type { TradeType } from '~/schema/trade'
import { OPERATOR_EQUAL } from '~/utils'
import { transformAdvancedFilters } from '~/utils/filter-utils'

export const useTradeTableFilters = () => {
	const dbStateStore = useDbStateStore()
	const { trades, fetchTrades, deleteTrade, unDeleteTrade } = useTrades()

	const pageSize = computed(() => dbStateStore.tradeOptions.nbLines)
	const page = ref(1)

	const sortBy = ref<keyof TradeType | ''>('')
	const sortDesc = ref(false)

	const tableIsLoading = ref(false)
	const filterLoading = ref(false)

	const filters = computed({
		get: () => dbStateStore.tradeOptions.filters || [{ column: 'symbol', operator: OPERATOR_EQUAL, value: '' }],
		set: (val) => dbStateStore.tradeOptions.filters = val
	})

	const sortedTrades = computed(() => {
		if (!sortBy.value) return trades.value
		return [...trades.value].sort((a, b) => {
			let valA = a[sortBy.value as keyof TradeType]
			let valB = b[sortBy.value as keyof TradeType]
			if (sortBy.value === 'openDate' || sortBy.value === 'closeDate') {
				valA = new Date(valA as string | Date).getTime()
				valB = new Date(valB as string | Date).getTime()
			}
			if (typeof valA === 'string' && typeof valB === 'string') {
				return sortDesc.value ? (valB as string).localeCompare(valA as string) : (valA as string).localeCompare(valB as string)
			}
			if (valA == null) return 1
			if (valB == null) return -1
			if (valA === valB) return 0
			if (sortDesc.value) {
				return valA < valB ? 1 : -1
			} else {
				return valA > valB ? 1 : -1
			}
		})
	})

	const pageCount = computed(() => Math.max(1, Math.ceil(sortedTrades.value.length / pageSize.value)))

	const paginatedTrades = computed(() => {
		const start = (page.value - 1) * pageSize.value
		const end = page.value * pageSize.value
		return sortedTrades.value.slice(start, end)
	})

	// Protéger contre une page hors limite
	watch([page, pageCount], () => {
		if (page.value > pageCount.value) {
			page.value = pageCount.value
		}
	})

	const onSort = ({ column, direction }: { column: { accessorKey: string }; direction: string }) => {
		sortBy.value = column.accessorKey as keyof TradeType
		sortDesc.value = direction === 'desc'
		page.value = 1
	}

	const resetFilters = (onApplyFiltersDebounced: () => void) => {
		sortBy.value = ''
		sortDesc.value = false
		page.value = 1
		filters.value = []
		dbStateStore.tradeOptions.showAdvancedFilters = false
		onApplyFiltersDebounced()
	}

	const onApplyFilters = async () => {
		tableIsLoading.value = true
		filterLoading.value = true
		try {
			let filtersForApi = [...filters.value]
			filtersForApi = filtersForApi.filter((f) => f.column !== 'accountId')
			if (dbStateStore.tradeOptions.accountIds?.length > 0) {
				filtersForApi.push({
					column: 'accountId',
					operator: 'in',
					value: dbStateStore.tradeOptions.accountIds,
				})
			}
			filtersForApi = transformAdvancedFilters(filtersForApi)
			filtersForApi = filtersForApi.filter((val) => {
				if (val.column === 'accountId' && Array.isArray(val.value)) {
					return val.value.length > 0
				}
				return val.value != undefined && val.value !== ''
			})
			await fetchTrades(filtersForApi, 1000, dbStateStore.tradeOptions.showInactive)
			page.value = 1
		} finally {
			tableIsLoading.value = false
			filterLoading.value = false
		}
	}

	const confirmBulkActivate = async () => {
		const inactiveTrades = paginatedTrades.value.filter(trade => trade.active === false)
		const tradeIds = inactiveTrades.map(t => t.id!)
		await Promise.all(tradeIds.map(id => unDeleteTrade(id)))
		tradeIds.forEach(id => {
			const tradeInList = trades.value.find(t => t.id === id)
			if (tradeInList) tradeInList.active = true
		})
	}

	const confirmBulkDeactivate = async () => {
		const activeTrades = paginatedTrades.value.filter(trade => trade.active !== false)
		const tradeIds = activeTrades.map(t => t.id!)
		await Promise.all(tradeIds.map(id => deleteTrade(id)))
		tradeIds.forEach(id => {
			const tradeInList = trades.value.find(t => t.id === id)
			if (tradeInList) tradeInList.active = false
		})
	}

	const onUndelete = async (rowid: number, emit: (event: 'delete', rowid: number) => void) => {
		await unDeleteTrade(rowid)
		const trade = trades.value.find(t => t.id === rowid)
		if (trade) trade.active = true
		emit('delete', rowid)
	}

	const onDelete = async (rowid: number, emit: (event: 'delete', rowid: number) => void) => {
		await deleteTrade(rowid)
		const trade = trades.value.find(t => t.id === rowid)
		if (trade) trade.active = false
		emit('delete', rowid)
	}

	return {
		page, pageSize, sortBy, sortDesc,
		tableIsLoading, filterLoading,
		filters, sortedTrades, pageCount, paginatedTrades,
		onSort, resetFilters, onApplyFilters,
		confirmBulkActivate, confirmBulkDeactivate,
		onUndelete, onDelete,
	}
}
