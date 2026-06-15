import { defineStore } from 'pinia'
import type { UserType } from '~/schema/user'

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

const defaultChartVisibility: Record<ChartKey, boolean> = { pnlBar: true, cumulatedPnl: true, appt: true, winrate: true, tickerPnl: true, tickerWinrate: true, hourlyHeatmap: true, hourlyWinrate: true, dayOfWeekPnl: true }
const defaultSectionVisibility: Record<SectionKey, boolean> = { allTrades: true, profitTrades: true, losingTrades: true, winLossComparison: true, tickerTable: true }

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

export const useUserStore = defineStore(
    'userStore',
    () => {
        // Get current database context
        const { currentDatabase } = useDatabase()
        const getCurrentDbName = () => currentDatabase.value?.name || 'default'

        // --- Global state (not DB-specific) ---
        const noteAssocMode = ref<'copy' | 'move'>('copy')
        const chartSettings = ref<Record<string, Record<string, unknown>>>({})

        const isLogOpen = ref(false)
        const logOpenFirstInit = ref(true)
        const logMessage = ref('')
        const logDebug1 = ref(0)
        const logDebug2 = ref(0)
        const logFix = ref(0)

        const isLoading = ref(false)
        const quickNavHistory = ref<{ path: string; lastVisit: number }[]>([])
        const lastViewedNoteIdPerDb = ref<Record<string, number | null>>({})
        const conversionType = ref<{ label: string; value: 'schwab-options' | 'tradingview' }>({ label: 'Schwab Options', value: 'schwab-options' })
        const displayModeNet = ref<boolean>(true)
        const auth = useAuth()

        // --- Auth user state (global) ---
        const user = ref<UserType | null>(null)
        const needsDataRefresh = ref<boolean>(false)

        // --- DB-specific state (internal storage per database) ---
        const customInputsPerDb = ref<Record<string, CustomInputs>>({})
        // dayTagsPerDb and tagGroupsPerDb moved to useDataStore (non-persisted)
        const recentColorsPerDb = ref<Record<string, string[]>>({})
        const recentColors2PerDb = ref<Record<string, string[]>>({})
        const tradeOptionsPerDb = ref<Record<string, TradeOptions>>({})
        const dashBoardFiltersPerDb = ref<Record<string, DashBoardFilters>>({})
        const dailyFiltersPerDb = ref<Record<string, DailyFilters>>({})
        const calendarFiltersPerDb = ref<Record<string, CalendarFilters>>({})
        const dashBoardResultPerDb = ref<Record<string, DashBoardResult>>({})
        const columnVisibilityPerDb = ref<Record<string, Record<string, boolean>>>({})
        const showDetailedNotePerDb = ref<Record<string, boolean>>({})

        const lastViewedNoteId = computed({
            get: () => {
                const dbName = getCurrentDbName()
                return lastViewedNoteIdPerDb.value[dbName] ?? null
            },
            set: (val) => {
                const dbName = getCurrentDbName()
                lastViewedNoteIdPerDb.value[dbName] = val
            }
        })

        // --- Computed wrappers for DB-specific data ---
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
            }
        })

        const getCustomInput = (name: string) =>
            customInputs.value[name] || { items: [], value: '' }

        const updateCustomInput = (name: string, items: string[], value: string) =>
            customInputs.value[name] = { items, value }

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
            }
        })

        const tagGroups = computed({
            get: () => {
                const dbName = getCurrentDbName()
                return dataStore.tagGroupsPerDb[dbName] || []
            },
            set: (val) => {
                const dbName = getCurrentDbName()
                dataStore.tagGroupsPerDb[dbName] = val
            }
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
            }
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
            }
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
                        lastFilterColumn: 'symbol'
                    }
                }
                const tradeOpts = tradeOptionsPerDb.value[dbName]
                if (!tradeOpts.lastFilterColumn) tradeOpts.lastFilterColumn = 'symbol'
                return tradeOpts
            },
            set: (val) => {
                const dbName = getCurrentDbName()
                tradeOptionsPerDb.value[dbName] = val
            }
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
                        dashboardChartVisibility: { pnlBar: true, cumulatedPnl: true, appt: true, winrate: true, tickerPnl: true, tickerWinrate: true, hourlyHeatmap: true, hourlyWinrate: true, dayOfWeekPnl: true },
                        dashboardSectionVisibility: { allTrades: true, profitTrades: true, losingTrades: true, winLossComparison: true, tickerTable: true },
                        dashboardGridLayout: defaultDashboardGridLayout.map(item => ({ ...item }))
                    }
                }

                // Ensure dates are Date objects (localStorage restores them as strings)
                const filters = dashBoardFiltersPerDb.value[dbName]
                if (!filters.lastFilterColumn) filters.lastFilterColumn = 'symbol'
                if (!filters.dashboardChartVisibility) filters.dashboardChartVisibility = { pnlBar: true, cumulatedPnl: true, appt: true, winrate: true, tickerPnl: true, tickerWinrate: true, hourlyHeatmap: true, hourlyWinrate: true, dayOfWeekPnl: true }
                if (!filters.dashboardSectionVisibility) {
                    filters.dashboardSectionVisibility = { allTrades: true, profitTrades: true, losingTrades: true, winLossComparison: true, tickerTable: true }
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

                // Init workspaces — migration transparente depuis les clés plates existantes
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
                        buildDefaultWorkspace('analytics', 'Analyse Avancée'),
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
            }
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
                        lastFilterColumn: 'symbol'
                    }
                }
                const dailyFilters = dailyFiltersPerDb.value[dbName]
                if (!dailyFilters.lastFilterColumn) dailyFilters.lastFilterColumn = 'symbol'
                return dailyFilters
            },
            set: (val) => {
                const dbName = getCurrentDbName()
                dailyFiltersPerDb.value[dbName] = val
            }
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
                        lastFilterColumn: 'symbol'
                    }
                }
                const calFilters = calendarFiltersPerDb.value[dbName]
                if (!calFilters.lastFilterColumn) calFilters.lastFilterColumn = 'symbol'
                return calFilters
            },
            set: (val) => {
                const dbName = getCurrentDbName()
                calendarFiltersPerDb.value[dbName] = val
            }
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
            }
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
                    }
                }
                return columnVisibilityPerDb.value[dbName]
            },
            set: (val) => {
                const dbName = getCurrentDbName()
                columnVisibilityPerDb.value[dbName] = val
            }
        })

        const showDetailedNote = computed({
            get: () => {
                const dbName = getCurrentDbName()
                return showDetailedNotePerDb.value[dbName] ?? true
            },
            set: (val) => {
                const dbName = getCurrentDbName()
                showDetailedNotePerDb.value[dbName] = val
            }
        })

        const getIsLogOpen = () => isLogOpen.value
        const getIsLogOpenFirstInit = () => logOpenFirstInit.value
        const getLogMessage = () => logMessage.value

        const setCookie = (key: string, val: unknown) => {
            const cookie = useCookie(key, {
                expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
            })
            cookie.value = val as string
        }

        const setLogOpen = (isOpen: boolean) => {
            isLogOpen.value = isOpen
            setCookie('showLog', isOpen)
        }

        const setLogMessage = (message: string) => {
            logMessage.value = message.length > 8192 ? message.slice(-8192) : message
        }

        const setLastViewedNoteId = (id: number | null) => {
            lastViewedNoteId.value = id
        }

        const setLogOpenFirstInit = (status: boolean) => {
            logOpenFirstInit.value = status
        }

        const addDebug1 = () => {
            logDebug1.value++
        }

        const addDebug2 = () => {
            logDebug2.value++
        }

        const addFix = () => {
            logFix.value++
        }

        function setUser(u: UserType | null) {
            user.value = u
        }

        function clearUser() {
            user.value = null
        }

        function shouldRefreshData() {
            return needsDataRefresh.value
        }

        function clearDataRefresh() {
            needsDataRefresh.value = false
        }

        function triggerDataRefresh() {
            needsDataRefresh.value = true
        }

        async function fetchUser() {
            try {
                let u: UserType | null = null
                if (import.meta.server) {
                    // On est côté serveur, il faut transmettre les cookies de la requête entrante
                    const headers = useRequestHeaders(['cookie'])
                    u = await auth.fetchUser(headers)
                } else {
                    // Côté client, le navigateur gère les cookies tout seul
                    u = await auth.fetchUser()
                }
                setUser(u)
                return u
            } catch {
                clearUser()
                return null
            }
        }

        function clearDatabaseData(dbName: string) {
            // Remove data from all *PerDb refs by creating new objects without the deleted key
            customInputsPerDb.value = Object.fromEntries(
                Object.entries(customInputsPerDb.value).filter(([key]) => key !== dbName)
            )
            // dayTags and tagGroups cleaned via dataStore
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
        }

        // Synchronise accountIds across all pages when syncAccountSelection is enabled
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
            if (user.value?.settings_object?.syncAccountSelection) syncAccountIds(ids)
        }, { deep: true })

        watch(() => dashBoardFilters.value.accountIds, (ids) => {
            if (user.value?.settings_object?.syncAccountSelection) syncAccountIds(ids)
        }, { deep: true })

        watch(() => dailyFilters.value.accountIds, (ids) => {
            if (user.value?.settings_object?.syncAccountSelection) syncAccountIds(ids)
        }, { deep: true })

        watch(() => calendarFilters.value.accountIds, (ids) => {
            if (user.value?.settings_object?.syncAccountSelection) syncAccountIds(ids)
        }, { deep: true })

        return {
            noteAssocMode,
            chartSettings,
            isLogOpen,
            logOpenFirstInit,
            logMessage,
            logDebug1,
            logDebug2,
            logFix,
            isLoading,
            quickNavHistory,
            lastViewedNoteId,
            lastViewedNoteIdPerDb,
            conversionType,
            displayModeNet,
            recentColors,
            recentColors2,
            dayTags,
            tagGroups,
            getTagById,
            tradeOptions,
            dashBoardFilters,
            dailyFilters,
            calendarFilters,
            dashBoardResult,
            columnVisibility,
            showDetailedNote,
            user,
            customInputs,
            // Expose internal refs for persistence
            customInputsPerDb,
            // dayTagsPerDb and tagGroupsPerDb are now in useDataStore (non-persisted)
            recentColorsPerDb,
            recentColors2PerDb,
            tradeOptionsPerDb,
            dashBoardFiltersPerDb,
            dailyFiltersPerDb,
            calendarFiltersPerDb,
            dashBoardResultPerDb,
            columnVisibilityPerDb,
            showDetailedNotePerDb,
            // Methods
            getCustomInput,
            updateCustomInput,
            addCustomItem,
            removeCustomItem,
            getIsLogOpen,
            getIsLogOpenFirstInit,
            getLogMessage,
            setCookie,
            setLogOpen,
            setLogMessage,
            setLogOpenFirstInit,
            setLastViewedNoteId,
            addDebug1,
            addDebug2,
            addFix,
            setUser,
            clearUser,
            shouldRefreshData,
            clearDataRefresh,
            triggerDataRefresh,
            fetchUser,
            clearDatabaseData,
        }
    },
    {
        persist: {
            storage: import.meta.client ? localStorage : undefined,
            pick: [
                'user',
                'isLogOpen',
                'logOpenFirstInit',
                'logMessage',
                'logDebug1',
                'logDebug2',
                'fixdebug',
                'needsDataRefresh',
                'conversionType',
                'displayModeNet',
                'noteAssocMode',
                'chartSettings',
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
            ],
        },
    }
)

export type UserStore = ReturnType<typeof useUserStore>