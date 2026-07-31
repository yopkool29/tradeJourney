import type { TradeFilter } from '~/type'
import { metadataHelpers } from '~/utils'
import { buildFiltersForApi } from '~/composables/data/useDashboard'
import type { SettingsContentType } from '~/schema/user'

export const useDashboardData = (
	filters: Ref<TradeFilter[]>,
	accounts: Ref<Array<{ id: number; displayName: string; metadata?: unknown }>>,
) => {
	const userStore = useUserStore()
	const dbStateStore = useDbStateStore()
	const { fetchData, dashBoardLastTrades, dashBoardResult, clearLastTrades } = useDashboard()
	const { displayModeNet } = useNetGrossDisplay()

	const accountOptions = computed(() => {
		return accounts.value.map((account) => ({
			value: account.id,
			label: account.displayName,
		}))
	})

	const startingCapital = computed(() => {
		const selectedAccountIds = dbStateStore.dashBoardFilters.accountIds
		let availableAccounts = accounts.value
		if (selectedAccountIds && selectedAccountIds.length > 0) {
			availableAccounts = accounts.value.filter((acc) => selectedAccountIds.includes(acc.id))
		}
		let totalCapital = 0
		for (const account of availableAccounts) {
			const capital = metadataHelpers.get<number>(account.metadata, 'startingCapital')
			if (capital !== null && capital !== undefined) {
				totalCapital += capital
			} else {
				return null
			}
		}
		return totalCapital
	})

	const buildDashboardFilters = (): TradeFilter[] => {
		return buildFiltersForApi(
			dbStateStore.dashBoardFilters.startDate,
			dbStateStore.dashBoardFilters.endDate,
			true,
			dbStateStore.dashBoardFilters.accountIds,
			filters.value
		)
	}

	const {
		filterDirty,
		isAutoApplyMode,
		updateTradeCount,
		debouncedHandleFilterChange,
		onExplicitApply,
	} = useFilteredPage({
		pageType: 'dashboard',
		onFetch: async () => {
			await onApplyFilters()
		},
		buildFiltersFn: buildDashboardFilters,
		debounceMs: 300,
	})

	const {
		filterLoading,
		load: onApplyFilters,
		loadDebounced: onApplyFiltersDebounced,
	} = usePageDataManager({
		fetchFn: async () => {
			filterDirty.value = false
			const trades = await fetchData(
				dbStateStore.dashBoardFilters.startDate,
				dbStateStore.dashBoardFilters.endDate,
				true,
				dbStateStore.dashBoardFilters.accountIds,
				displayModeNet.value,
				filters.value
			)
			return trades
		},
		accounts,
		getAccountIds: () => dbStateStore.dashBoardFilters.accountIds,
		setAccountIds: (ids) => {
			dbStateStore.dashBoardFilters.accountIds = ids
		},
	})

	const resetFilters = () => {
		filters.value = []
		dbStateStore.dashBoardFilters.showAdvancedFilters = false
		onApplyFiltersDebounced()
	}

	const initDashboard = () => {
		const settings = userStore.user?.settings_object as SettingsContentType
		if (settings?.autoDataSync) {
			clearLastTrades()
		}
		filterLoading.value = true
		Promise.all([updateTradeCount()]).then(() => {
			if (dashBoardLastTrades.value.length === 0 || userStore.shouldRefreshData()) {
				onApplyFilters()
				userStore.clearDataRefresh()
			} else {
				filterLoading.value = false
			}
		})
	}

	return {
		accountOptions,
		startingCapital,
		buildDashboardFilters,
		filterDirty,
		isAutoApplyMode,
		updateTradeCount,
		debouncedHandleFilterChange,
		onExplicitApply,
		filterLoading,
		onApplyFilters,
		onApplyFiltersDebounced,
		resetFilters,
		initDashboard,
		dashBoardLastTrades,
		dashBoardResult,
	}
}
