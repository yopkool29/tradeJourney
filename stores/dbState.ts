import { defineStore } from 'pinia'

import type {
	TradeFilter,
	CustomInputs,
	TradeOptions,
	DashBoardFilters,
	DailyFilters,
	CalendarFilters,
	DashBoardResult,
	WorkspaceConfig,
	ChartKey,
	SectionKey,
} from '~/type'

import { formatDateToYYYYMM } from '~/utils/date-utils'
import { defaultDashboardGridLayout, defaultDashboardGridLayoutMd, defaultDashboardGridLayoutSm } from '~/utils/dashboard'

const defaultChartVisibility: Record<ChartKey, boolean> = { pnlBar: true, cumulatedPnl: true, appt: true, winrate: true, tickerPnl: false, tickerWinrate: false, hourlyHeatmap: false, hourlyWinrate: false, dayOfWeekPnl: false }
const defaultSectionVisibility: Record<SectionKey, boolean> = { allTrades: true, profitTrades: true, losingTrades: true, winLossComparison: true, tickerTable: false }
const hiddenChartVisibility: Record<ChartKey, boolean> = { pnlBar: false, cumulatedPnl: false, appt: false, winrate: false, tickerPnl: false, tickerWinrate: false, hourlyHeatmap: false, hourlyWinrate: false, dayOfWeekPnl: false }
const hiddenSectionVisibility: Record<SectionKey, boolean> = { allTrades: false, profitTrades: false, losingTrades: false, winLossComparison: false, tickerTable: false }

const buildDefaultWorkspace = (id: string, name: string, partial?: Partial<WorkspaceConfig>): WorkspaceConfig => ({
	id,
	name,
	dashboardChartVisibilityLg: { ...defaultChartVisibility },
	dashboardChartVisibilityMd: { ...defaultChartVisibility },
	dashboardChartVisibilitySm: { ...defaultChartVisibility },
	dashboardSectionVisibilityLg: { ...defaultSectionVisibility },
	dashboardSectionVisibilityMd: { ...defaultSectionVisibility },
	dashboardSectionVisibilitySm: { ...defaultSectionVisibility },
	dashboardGridLayout: defaultDashboardGridLayout.map(item => ({ ...item })),
	dashboardGridLayoutMd: defaultDashboardGridLayoutMd.map(item => ({ ...item })),
	dashboardGridLayoutSm: defaultDashboardGridLayoutSm.map(item => ({ ...item })),
	...partial,
})

export const useDbStateStore = defineStore(
	'dbStateStore',
	() => {
		const { currentDatabase } = useDatabase()
		const getCurrentDbName = () => currentDatabase.value?.name || 'default'

		// --- DB-specific state (internal storage per database) ---
		const customInputsPerDb = ref<Record<string, CustomInputs>>({})
		const recentColorsPerDb = ref<Record<string, string[]>>({})
		const recentColors2PerDb = ref<Record<string, string[]>>({})
		const tradeOptionsPerDb = ref<Record<string, TradeOptions>>({})
		const dashBoardFiltersPerDb = ref<Record<string, DashBoardFilters>>({})
		const dailyFiltersPerDb = ref<Record<string, DailyFilters>>({})
		const calendarFiltersPerDb = ref<Record<string, CalendarFilters>>({})
		const dashBoardResultPerDb = ref<Record<string, DashBoardResult>>({})
		const columnVisibilityPerDb = ref<Record<string, Record<string, boolean>>>({})
		const showDetailedNotePerDb = ref<Record<string, boolean>>({})
		const lastViewedNoteIdPerDb = ref<Record<string, number | null>>({})
		const tradeChartTfPerDb = ref<Record<string, string>>({})
		const tradeChartShowAdjacentPerDb = ref<Record<string, boolean>>({})

		const lastViewedNoteId = computed({
			get: () => {
				const dbName = getCurrentDbName()
				return lastViewedNoteIdPerDb.value[dbName] ?? null
			},
			set: (val) => {
				const dbName = getCurrentDbName()
				lastViewedNoteIdPerDb.value[dbName] = val
			},
		})

		const customInputs = computed({
			get: () => {
				const dbName = getCurrentDbName()
				if (!customInputsPerDb.value[dbName]) {
					customInputsPerDb.value[dbName] = {}
				}
				return customInputsPerDb.value[dbName]
			},
			set: (val) => {
				const dbName = getCurrentDbName()
				customInputsPerDb.value[dbName] = val
			},
		})

		const getCustomInput = (name: string) =>
			customInputs.value[name] || { items: [], value: '' }

		const updateCustomInput = (name: string, items: string[], value: string) => {
			customInputs.value[name] = { items, value }
		}

		const addCustomItem = (name: string, item: string) => {
			const current = getCustomInput(name)
			const filtered = current.items.filter((i) => i !== item)
			const newItems = [item, ...filtered].slice(0, 20)
			updateCustomInput(name, newItems, item)
		}

		const removeCustomItem = (name: string, item: string) => {
			const current = getCustomInput(name)
			const newItems = current.items.filter(i => i !== item)
			updateCustomInput(name, newItems, current.value)
		}

		const dataStore = useDataStore()

		const dayTags = computed({
			get: () => {
				const dbName = getCurrentDbName()
				return dataStore.dayTagsPerDb[dbName] || []
			},
			set: (val) => {
				const dbName = getCurrentDbName()
				dataStore.dayTagsPerDb[dbName] = val
			},
		})

		const tagGroups = computed({
			get: () => {
				const dbName = getCurrentDbName()
				return dataStore.tagGroupsPerDb[dbName] || []
			},
			set: (val) => {
				const dbName = getCurrentDbName()
				dataStore.tagGroupsPerDb[dbName] = val
			},
		})

		const getTagById = (id: number) => {
			for (const group of tagGroups.value) {
				const tag = group.tags.find((t: { id: number }) => t.id === id)
				if (tag) return tag
			}
			return null
		}

		const recentColors = computed({
			get: () => {
				const dbName = getCurrentDbName()
				if (!recentColorsPerDb.value[dbName]) {
					recentColorsPerDb.value[dbName] = []
				}
				return recentColorsPerDb.value[dbName]
			},
			set: (val) => {
				const dbName = getCurrentDbName()
				recentColorsPerDb.value[dbName] = val
			},
		})

		const recentColors2 = computed({
			get: () => {
				const dbName = getCurrentDbName()
				if (!recentColors2PerDb.value[dbName]) {
					recentColors2PerDb.value[dbName] = []
				}
				return recentColors2PerDb.value[dbName]
			},
			set: (val) => {
				const dbName = getCurrentDbName()
				recentColors2PerDb.value[dbName] = val
			},
		})

		const tradeOptions = computed({
			get: () => {
				const dbName = getCurrentDbName()
				if (!tradeOptionsPerDb.value[dbName]) {
					tradeOptionsPerDb.value[dbName] = {
						accountIds: [] as number[],
						nbLines: 10,
						showInactive: false,
						showAdvancedFilters: false,
						filters: [] as TradeFilter[],
						lastFilterColumn: 'symbol',
					}
				}
				const tradeOpts = tradeOptionsPerDb.value[dbName]
				if (!tradeOpts.lastFilterColumn) tradeOpts.lastFilterColumn = 'symbol'
				return tradeOpts
			},
			set: (val) => {
				const dbName = getCurrentDbName()
				tradeOptionsPerDb.value[dbName] = val
			},
		})

		const dashBoardFilters = computed({
			get: () => {
				const dbName = getCurrentDbName()
				if (!dashBoardFiltersPerDb.value[dbName]) {
					dashBoardFiltersPerDb.value[dbName] = {
						accountIds: [] as number[],
						period: 'last_three_months_until_now',
						startDate: new Date(),
						endDate: new Date(),
						customStartDate: new Date(),
						customEndDate: new Date(),
						cumuleMode: 'week',
						showInactive: false,
						showAdvancedFilters: false,
						filters: [] as TradeFilter[],
						lastFilterColumn: 'symbol',
						dashboardChartVisibility: { ...defaultChartVisibility },
						dashboardSectionVisibility: { ...defaultSectionVisibility },
						dashboardGridLayout: defaultDashboardGridLayout.map(item => ({ ...item })),
					}
				}

				// Ensure dates are Date objects (localStorage restores them as strings)
				const filters = dashBoardFiltersPerDb.value[dbName]
				if (!filters.lastFilterColumn) filters.lastFilterColumn = 'symbol'
				if (!filters.dashboardChartVisibility) filters.dashboardChartVisibility = { ...defaultChartVisibility }
				if (!filters.dashboardSectionVisibility) {
					filters.dashboardSectionVisibility = { ...defaultSectionVisibility }
				}
				if (!filters.dashboardGridLayout || filters.dashboardGridLayout.length === 0) {
					filters.dashboardGridLayout = defaultDashboardGridLayout.map(item => ({ ...item }))
				}
				if (!filters.dashboardGridLayoutMd || filters.dashboardGridLayoutMd.length === 0) {
					filters.dashboardGridLayoutMd = defaultDashboardGridLayoutMd.map(item => ({ ...item }))
				}
				if (!filters.dashboardGridLayoutSm || filters.dashboardGridLayoutSm.length === 0) {
					filters.dashboardGridLayoutSm = defaultDashboardGridLayoutSm.map(item => ({ ...item }))
				}

				// Init workspaces
				if (!filters.workspaces || filters.workspaces.length === 0) {
					filters.workspaces = [
						buildDefaultWorkspace('summary', 'Résumé', {
							dashboardChartVisibilityLg: { ...defaultChartVisibility, ...(filters.dashboardChartVisibilityLg || {}) },
							dashboardChartVisibilityMd: { ...defaultChartVisibility, ...(filters.dashboardChartVisibilityMd || {}) },
							dashboardChartVisibilitySm: { ...defaultChartVisibility, ...(filters.dashboardChartVisibilitySm || {}) },
							dashboardSectionVisibilityLg: { ...defaultSectionVisibility, ...(filters.dashboardSectionVisibilityLg || {}) },
							dashboardSectionVisibilityMd: { ...defaultSectionVisibility, ...(filters.dashboardSectionVisibilityMd || {}) },
							dashboardSectionVisibilitySm: { ...defaultSectionVisibility, ...(filters.dashboardSectionVisibilitySm || {}) },
							dashboardGridLayout: (filters.dashboardGridLayout?.length ? filters.dashboardGridLayout : defaultDashboardGridLayout).map(item => ({ ...item })),
							dashboardGridLayoutMd: (filters.dashboardGridLayoutMd?.length ? filters.dashboardGridLayoutMd : defaultDashboardGridLayoutMd).map(item => ({ ...item })),
							dashboardGridLayoutSm: (filters.dashboardGridLayoutSm?.length ? filters.dashboardGridLayoutSm : defaultDashboardGridLayoutSm).map(item => ({ ...item })),
						}),
						buildDefaultWorkspace('analytics', 'Analyse Avancée', {
						dashboardChartVisibilityLg: { ...hiddenChartVisibility },
						dashboardChartVisibilityMd: { ...hiddenChartVisibility },
						dashboardChartVisibilitySm: { ...hiddenChartVisibility },
						dashboardSectionVisibilityLg: { ...hiddenSectionVisibility },
						dashboardSectionVisibilityMd: { ...hiddenSectionVisibility },
						dashboardSectionVisibilitySm: { ...hiddenSectionVisibility },
						dashboardGridLayout: [],
						dashboardGridLayoutMd: [],
						dashboardGridLayoutSm: [],
					}),
					]
				}
				if (!filters.activeWorkspaceId) {
					filters.activeWorkspaceId = 'summary'
				}

				filters.startDate = filters.startDate instanceof Date ? filters.startDate : new Date(filters.startDate)
				filters.endDate = filters.endDate instanceof Date ? filters.endDate : new Date(filters.endDate)
				filters.customStartDate = filters.customStartDate instanceof Date ? filters.customStartDate : new Date(filters.customStartDate)
				filters.customEndDate = filters.customEndDate instanceof Date ? filters.customEndDate : new Date(filters.customEndDate)

				return filters
			},
			set: (val) => {
				const dbName = getCurrentDbName()
				dashBoardFiltersPerDb.value[dbName] = val
			},
		})

		const dailyFilters = computed({
			get: () => {
				const dbName = getCurrentDbName()
				if (!dailyFiltersPerDb.value[dbName]) {
					dailyFiltersPerDb.value[dbName] = {
						accountIds: [] as number[],
						selectedMonth: formatDateToYYYYMM(new Date()),
						showInactive: false,
						isExpanded: false,
						showAdvancedFilters: false,
						columnVisibility: ({
							lot: true,
							openDate: true,
							closeDate: true,
							symbol: true,
							type: true,
							openPrice: true,
							closePrice: true,
							profit: true,
							grossProfit: false,
							commission: false,
							stopLoss: false,
							takeProfit: false,
						}),
						filters: [] as TradeFilter[],
						lastFilterColumn: 'symbol',
					}
				}
				const df = dailyFiltersPerDb.value[dbName]
				if (!df.lastFilterColumn) df.lastFilterColumn = 'symbol'
				return df
			},
			set: (val) => {
				const dbName = getCurrentDbName()
				dailyFiltersPerDb.value[dbName] = val
			},
		})

		const calendarFilters = computed({
			get: () => {
				const dbName = getCurrentDbName()
				if (!calendarFiltersPerDb.value[dbName]) {
					calendarFiltersPerDb.value[dbName] = {
						accountIds: [] as number[],
						selectedMonth: formatDateToYYYYMM(new Date()),
						showInactive: false,
						showAdvancedFilters: false,
						filters: [] as TradeFilter[],
						lastFilterColumn: 'symbol',
					}
				}
				const calFilters = calendarFiltersPerDb.value[dbName]
				if (!calFilters.lastFilterColumn) calFilters.lastFilterColumn = 'symbol'
				return calFilters
			},
			set: (val) => {
				const dbName = getCurrentDbName()
				calendarFiltersPerDb.value[dbName] = val
			},
		})

		const dashBoardResult = computed({
			get: () => {
				const dbName = getCurrentDbName()
				if (!dashBoardResultPerDb.value[dbName]) {
					dashBoardResultPerDb.value[dbName] = {
						pnl: 0,
						appt: 0,
						plRatio: 0,
						winrate: 0,
						profitFactor: 0,
						recoveryFactor: 0,
						sharpeRatio: 0,
						tradesCount: 0,
						grossPnl: 0,
						totalContracts: 0,
						avgTradeDuration: 0,
						maxTradeDuration: 0,
						expectancy: 0,
						totalCommission: 0,
						totalProfit: 0,
						winningTradesCount: 0,
						winningContractsCount: 0,
						largestWin: 0,
						avgWin: 0,
						stdDevWin: 0,
						avgWinDuration: 0,
						maxWinDuration: 0,
						winningTradesCommission: 0,
						maxRunUp: 0,
						maxRunUpDateFrom: null as Date | null,
						maxRunUpDateTo: null as Date | null,
						maxWinningStreak: 0,
						totalLoss: 0,
						losingTradesCount: 0,
						losingContractsCount: 0,
						largestLoss: 0,
						avgLoss: 0,
						stdDevLoss: 0,
						avgLossDuration: 0,
						maxLossDuration: 0,
						losingTradesCommission: 0,
						maxDrawdown: 0,
						maxDrawdownDateFrom: null as Date | null,
						maxDrawdownDateTo: null as Date | null,
						maxLosingStreak: 0,
						breakevenTradesCount: 0,
						breakevenContractsCount: 0,
					}
				}
				return dashBoardResultPerDb.value[dbName]
			},
			set: (val) => {
				const dbName = getCurrentDbName()
				dashBoardResultPerDb.value[dbName] = val
			},
		})

		const columnVisibility = computed({
			get: () => {
				const dbName = getCurrentDbName()
				if (!columnVisibilityPerDb.value[dbName]) {
					columnVisibilityPerDb.value[dbName] = {
						openDate: true,
						closeDate: true,
						symbol: true,
						type: true,
						lot: true,
						openPrice: true,
						closePrice: true,
						profit: true,
						grossProfit: false,
						commission: false,
						stopLoss: false,
						takeProfit: false,
                        instrumentType: false,
					}
				}
				return columnVisibilityPerDb.value[dbName]
			},
			set: (val) => {
				const dbName = getCurrentDbName()
				columnVisibilityPerDb.value[dbName] = val
			},
		})

		const showDetailedNote = computed({
			get: () => {
				const dbName = getCurrentDbName()
				return showDetailedNotePerDb.value[dbName] ?? true
			},
			set: (val) => {
				const dbName = getCurrentDbName()
				showDetailedNotePerDb.value[dbName] = val
			},
		})

		const tradeChartTf = computed({
			get: () => {
				const dbName = getCurrentDbName()
				return tradeChartTfPerDb.value[dbName] ?? '15'
			},
			set: (val) => {
				const dbName = getCurrentDbName()
				tradeChartTfPerDb.value[dbName] = val
			},
		})

		const tradeChartShowAdjacent = computed({
			get: () => {
				const dbName = getCurrentDbName()
				return tradeChartShowAdjacentPerDb.value[dbName] ?? true
			},
			set: (val) => {
				const dbName = getCurrentDbName()
				tradeChartShowAdjacentPerDb.value[dbName] = val
			},
		})

		const setLastViewedNoteId = (id: number | null) => {
			lastViewedNoteId.value = id
		}

		const userStore = useUserStore()

		const arraysEqual = (a: number[], b: number[]) =>
			a.length === b.length && a.every((v, i) => v === b[i])

		const syncAccountIds = (sourceIds: number[]) => {
			if (!arraysEqual(tradeOptions.value.accountIds, sourceIds))
				tradeOptions.value.accountIds = [...sourceIds]
			if (!arraysEqual(dashBoardFilters.value.accountIds, sourceIds))
				dashBoardFilters.value.accountIds = [...sourceIds]
			if (!arraysEqual(dailyFilters.value.accountIds, sourceIds))
				dailyFilters.value.accountIds = [...sourceIds]
			if (!arraysEqual(calendarFilters.value.accountIds, sourceIds))
				calendarFilters.value.accountIds = [...sourceIds]
		}

		watch(() => tradeOptions.value.accountIds, (ids) => {
			if (userStore.user?.settings_object?.syncAccountSelection) syncAccountIds(ids)
		}, { deep: true })

		watch(() => dashBoardFilters.value.accountIds, (ids) => {
			if (userStore.user?.settings_object?.syncAccountSelection) syncAccountIds(ids)
		}, { deep: true })

		watch(() => dailyFilters.value.accountIds, (ids) => {
			if (userStore.user?.settings_object?.syncAccountSelection) syncAccountIds(ids)
		}, { deep: true })

		watch(() => calendarFilters.value.accountIds, (ids) => {
			if (userStore.user?.settings_object?.syncAccountSelection) syncAccountIds(ids)
		}, { deep: true })

		function clearDatabaseData(dbName: string) {
			customInputsPerDb.value = Object.fromEntries(
				Object.entries(customInputsPerDb.value).filter(([key]) => key !== dbName)
			)
			Reflect.deleteProperty(dataStore.dayTagsPerDb, dbName)
			Reflect.deleteProperty(dataStore.tagGroupsPerDb, dbName)
			recentColorsPerDb.value = Object.fromEntries(
				Object.entries(recentColorsPerDb.value).filter(([key]) => key !== dbName)
			)
			recentColors2PerDb.value = Object.fromEntries(
				Object.entries(recentColors2PerDb.value).filter(([key]) => key !== dbName)
			)
			tradeOptionsPerDb.value = Object.fromEntries(
				Object.entries(tradeOptionsPerDb.value).filter(([key]) => key !== dbName)
			)
			dashBoardFiltersPerDb.value = Object.fromEntries(
				Object.entries(dashBoardFiltersPerDb.value).filter(([key]) => key !== dbName)
			)
			dailyFiltersPerDb.value = Object.fromEntries(
				Object.entries(dailyFiltersPerDb.value).filter(([key]) => key !== dbName)
			)
			calendarFiltersPerDb.value = Object.fromEntries(
				Object.entries(calendarFiltersPerDb.value).filter(([key]) => key !== dbName)
			)
			dashBoardResultPerDb.value = Object.fromEntries(
				Object.entries(dashBoardResultPerDb.value).filter(([key]) => key !== dbName)
			)
			columnVisibilityPerDb.value = Object.fromEntries(
				Object.entries(columnVisibilityPerDb.value).filter(([key]) => key !== dbName)
			)
			showDetailedNotePerDb.value = Object.fromEntries(
				Object.entries(showDetailedNotePerDb.value).filter(([key]) => key !== dbName)
			)
			lastViewedNoteIdPerDb.value = Object.fromEntries(
				Object.entries(lastViewedNoteIdPerDb.value).filter(([key]) => key !== dbName)
			)
			tradeChartTfPerDb.value = Object.fromEntries(
				Object.entries(tradeChartTfPerDb.value).filter(([key]) => key !== dbName)
			)
			tradeChartShowAdjacentPerDb.value = Object.fromEntries(
				Object.entries(tradeChartShowAdjacentPerDb.value).filter(([key]) => key !== dbName)
			)
		}

		const dashBoardLastTrades = computed(() => {
			const result = dashBoardResult.value
			return (result as any).lastTrades || []
		})

		return {
			// Raw PerDb refs (for persistence)
			customInputsPerDb,
			recentColorsPerDb,
			recentColors2PerDb,
			tradeOptionsPerDb,
			dashBoardFiltersPerDb,
			dailyFiltersPerDb,
			calendarFiltersPerDb,
			dashBoardResultPerDb,
			columnVisibilityPerDb,
			showDetailedNotePerDb,
			lastViewedNoteIdPerDb,
			tradeChartTfPerDb,
			tradeChartShowAdjacentPerDb,
			// Computed wrappers
			lastViewedNoteId,
			customInputs,
			dayTags,
			tagGroups,
			getTagById,
			recentColors,
			recentColors2,
			tradeOptions,
			dashBoardFilters,
			dailyFilters,
			calendarFilters,
			dashBoardResult,
			dashBoardLastTrades,
			columnVisibility,
			showDetailedNote,
			tradeChartTf,
			tradeChartShowAdjacent,
			// Methods
			getCustomInput,
			updateCustomInput,
			addCustomItem,
			removeCustomItem,
			setLastViewedNoteId,
			clearDatabaseData,
			syncAccountIds,
		}
	},
	{
		persist: {
			storage: import.meta.client ? localStorage : undefined,
			pick: [
				'lastViewedNoteIdPerDb',
				'customInputsPerDb',
				'recentColorsPerDb',
				'recentColors2PerDb',
				'tradeOptionsPerDb',
				'dashBoardFiltersPerDb',
				'dailyFiltersPerDb',
				'calendarFiltersPerDb',
				'dashBoardResultPerDb',
				'columnVisibilityPerDb',
				'showDetailedNotePerDb',
				'tradeChartTfPerDb',
				'tradeChartShowAdjacentPerDb',
			],
		},
	}
)
