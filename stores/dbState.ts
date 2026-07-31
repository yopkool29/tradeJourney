import { defineStore } from 'pinia'

import type {
	TradeFilter,
	CustomInputs,
	TradeOptions,
	DashBoardFilters,
	DailyFilters,
	CalendarFilters,
	DashBoardResult,
} from '~/type'

import { formatDateToYYYYMM } from '~/utils/date-utils'
import {
	defaultChartVisibility,
	defaultSectionVisibility,
	hiddenChartVisibility,
	hiddenSectionVisibility,
	buildDefaultWorkspace,
	defaultDashBoardResult,
	defaultColumnVisibility,
	defaultDailyColumnVisibility,
} from '~/stores/dbStateDefaults'

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
		const tradeChartShowAdjacentLinesPerDb = ref<Record<string, boolean>>({})
		const chartSettingsPerDb = ref<Record<string, Record<string, Record<string, unknown>>>>({})

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
						columnVisibility: { ...defaultDailyColumnVisibility },
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
					dashBoardResultPerDb.value[dbName] = { ...defaultDashBoardResult }
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
					columnVisibilityPerDb.value[dbName] = { ...defaultColumnVisibility }
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

		const tradeChartShowAdjacentLines = computed({
			get: () => {
				const dbName = getCurrentDbName()
				return tradeChartShowAdjacentLinesPerDb.value[dbName] ?? true
			},
			set: (val) => {
				const dbName = getCurrentDbName()
				tradeChartShowAdjacentLinesPerDb.value[dbName] = val
			},
		})

		const chartSettings = computed({
			get: () => {
				const dbName = getCurrentDbName()
				if (!chartSettingsPerDb.value[dbName]) {
					chartSettingsPerDb.value[dbName] = {}
				}
				return chartSettingsPerDb.value[dbName]
			},
			set: (val) => {
				const dbName = getCurrentDbName()
				chartSettingsPerDb.value[dbName] = val
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
			const perDbRefs = [
				customInputsPerDb, recentColorsPerDb, recentColors2PerDb,
				tradeOptionsPerDb, dashBoardFiltersPerDb, dailyFiltersPerDb,
				calendarFiltersPerDb, dashBoardResultPerDb, columnVisibilityPerDb,
				showDetailedNotePerDb, lastViewedNoteIdPerDb, tradeChartTfPerDb,
				tradeChartShowAdjacentPerDb, tradeChartShowAdjacentLinesPerDb,
				chartSettingsPerDb,
			]
			for (const ref of perDbRefs) {
				ref.value = Object.fromEntries(
					Object.entries(ref.value).filter(([key]) => key !== dbName)
				)
			}
			Reflect.deleteProperty(dataStore.dayTagsPerDb, dbName)
			Reflect.deleteProperty(dataStore.tagGroupsPerDb, dbName)
		}

		const dashBoardLastTrades = computed(() => {
			const result = dashBoardResult.value as DashBoardResult & { lastTrades?: unknown[] }
			return result.lastTrades || []
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
			tradeChartShowAdjacentLinesPerDb,
			chartSettingsPerDb,
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
			tradeChartShowAdjacentLines,
			chartSettings,
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
				'tradeChartShowAdjacentLinesPerDb',
				'chartSettingsPerDb',
			],
		},
	}
)
